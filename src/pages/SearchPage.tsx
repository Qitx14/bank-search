import { useEffect, useState } from 'react';
import { getBankMeta } from '../services/db';
import { getApiKey } from '../services/openai-ocr';
import { batchRecognize, MAX_QUESTIONS_PER_IMAGE, type OcrProgress, type OcrItemResult } from '../services/openai-ocr';
import { searchQuestions, matchOptionLabel } from '../services/search';
import ImagePicker from '../components/ImagePicker';
import ImagePreview from '../components/ImagePreview';
import OcrProgressBar from '../components/OcrProgress';
import QuestionPager from '../components/QuestionPager';
import type { SearchResult, MatchItem, OcrParsedResult } from '../types';

type Phase = 'select' | 'recognizing' | 'results';

const MAX_IMAGES = 10;

export default function SearchPage() {
  const [images, setImages] = useState<string[]>([]);
  const [hasBank, setHasBank] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // 流程状态
  const [phase, setPhase] = useState<Phase>('select');
  const [ocrProgress, setOcrProgress] = useState<OcrProgress>({ current: 0, total: 0, status: '' });
  const [results, setResults] = useState<SearchResult[]>([]);

  useEffect(() => {
    getBankMeta().then(meta => setHasBank(!!meta));
  }, []);

  function handleImagesSelected(dataUrls: string[]) {
    const newImages = [...images, ...dataUrls].slice(0, MAX_IMAGES);
    setImages(newImages);
    setError(null);
  }

  function handleRemoveImage(index: number) {
    setImages(prev => prev.filter((_, i) => i !== index));
  }

  function handleError(msg: string) {
    setError(msg);
    setTimeout(() => setError(null), 5000);
  }

  /** 开始搜题：AI OCR → 搜索 */
  async function handleStartSearch() {
    if (!hasBank || images.length === 0) return;

    const apiKey = getApiKey();
    if (!apiKey) {
      handleError('请先到「设置」页配置 OpenRouter API Key');
      return;
    }

    setPhase('recognizing');
    setError(null);

    try {
      // Step 1: AI OCR 识别（每张图拆出最多 5 道题）
      const ocrResults: OcrItemResult[] = await batchRecognize(images, apiKey, setOcrProgress);

      // Step 2: 展开题目，逐题搜索（每题保留匹配度最高的结果）
      const searchResults: SearchResult[] = [];
      for (let i = 0; i < ocrResults.length; i++) {
        const ocr = ocrResults[i];
        console.log(`[SearchPage] ===== 第 ${i + 1} 张图片 =====`);
        if (ocr.error) {
          console.warn(`[SearchPage] OCR 错误: ${ocr.error}`);
        }

        // 识别失败：整张图记为一道错误题
        if (ocr.error) {
          searchResults.push({
            imageIndex: i,
            questionIndex: 0,
            imageDataUrl: images[i],
            extractedText: '',
            matches: [],
            error: ocr.error,
          });
          continue;
        }

        // 该图拆出的题目；AI 未结构化时回退为原始文字单题
        const rawQuestions: OcrParsedResult[] =
          ocr.parsed && ocr.parsed.questions.length > 0
            ? ocr.parsed.questions
            : [{ stem: ocr.text, options: [] }];
        console.log(`[SearchPage] 拆出 ${rawQuestions.length} 道题`);

        for (let qi = 0; qi < rawQuestions.length; qi++) {
          const q = rawQuestions[qi];
          setOcrProgress({
            current: qi + 1,
            total: rawQuestions.length,
            status: `正在匹配题库 第 ${qi + 1}/${rawQuestions.length} 题...`,
          });

          const searchText = (q.stem || '').trim();
          let matches: MatchItem[] = [];
          let examAnswer: string | undefined;
          let examAnswerContent: string | undefined;

          if (searchText) {
            try {
              matches = await searchQuestions(searchText);
              console.log(`[SearchPage] 第 ${i + 1} 张·第 ${qi + 1} 题 匹配到 ${matches.length} 条`);

              // 选项映射：找考试时应选哪个字母（基于匹配度最高的那条）
              if (matches.length > 0 && q.options.length > 0) {
                const examInfo = matchOptionLabel(matches[0].question, q.options);
                if (examInfo) {
                  examAnswer = examInfo.label;
                  examAnswerContent = examInfo.content;
                }
              }
            } catch (searchErr) {
              console.error(`[SearchPage] 第 ${i + 1} 张·第 ${qi + 1} 题搜索异常:`, searchErr);
            }
          }

          if (searchText && matches.length === 0) {
            console.warn(`[SearchPage] ⚠️ 第 ${i + 1} 张·第 ${qi + 1} 题未匹配到任何题目！`);
          }

          searchResults.push({
            imageIndex: i,
            questionIndex: qi,
            imageDataUrl: images[i],
            extractedText: searchText,
            matches,
            examAnswer,
            examAnswerContent,
          });
        }
      }

      console.log(`[SearchPage] 共 ${searchResults.length} 道题，搜索完成`);
      setResults(searchResults);
      setPhase('results');
    } catch (err) {
      console.error('[SearchPage] 搜题失败:', err);
      const msg = err instanceof Error ? err.message : String(err);
      handleError(`搜题失败: ${msg}`);
      setPhase('select');
    }
  }

  /** 重新开始 */
  function handleReset() {
    setPhase('select');
    setImages([]);
    setResults([]);
    setOcrProgress({ current: 0, total: 0, status: '' });
  }

  // ===== 结果页 =====
  if (phase === 'results') {
    const matchedCount = results.filter(r => !r.error && r.matches.length > 0).length;

    // 答案汇总：每 5 题一行
    const answers = results.map((r) => {
      if (r.error || r.matches.length === 0) return '?';
      return r.examAnswer || r.matches[0].question.answer;
    });
    const rows: { range: string; answers: string[] }[] = [];
    for (let i = 0; i < answers.length; i += 5) {
      const chunk = answers.slice(i, i + 5);
      const start = i + 1;
      const end = i + chunk.length;
      rows.push({
        range: start === end ? `${start}` : `${start}-${end}`,
        answers: chunk,
      });
    }

    return (
      <div className="page results-page">
        <div className="page-header">
          <h1 className="page-title">搜题结果</h1>
          <p className="page-subtitle">共 {results.length} 题，{matchedCount} 题匹配到答案</p>
        </div>

        {/* 答案汇总 */}
        {rows.length > 0 && (
          <div className="results-summary">
            <div className="results-summary__label">答案汇总</div>
            {rows.map((row) => (
              <div key={row.range} className="results-summary__row">
                <span className="results-summary__range">{row.range}:</span>
                <span className="results-summary__answers">{row.answers.join('  ')}</span>
              </div>
            ))}
          </div>
        )}

        {/* 分页滑动区：左右滑动看每道题 */}
        <QuestionPager results={results} />

        {/* 操作按钮 */}
        <div className="results-actions">
          <button
            onClick={handleReset}
            style={{
              width: '100%',
              height: 48,
              borderRadius: 'var(--radius-md)',
              background: 'var(--color-surface)',
              color: 'var(--color-primary)',
              font: '600 16px/48px var(--font-family)',
              border: '1px solid var(--color-primary)',
            }}
          >
            重新搜题
          </button>
        </div>
      </div>
    );
  }

  // ===== 识别中 =====
  if (phase === 'recognizing') {
    return (
      <div className="page">
        <div className="page-header">
          <h1 className="page-title">识别中...</h1>
          <p className="page-subtitle">请勿关闭页面，正在识别题目并匹配答案</p>
        </div>
        <OcrProgressBar progress={ocrProgress} />
        <div style={{ height: 'var(--space-2xl)' }} />
      </div>
    );
  }

  // ===== 选择图片 =====
  return (
    <div className="page">
      <div className="page-header">
        <h1 className="page-title">搜题</h1>
        <p className="page-subtitle">拍一张可含多道题的试卷照片，自动拆题并匹配答案</p>
      </div>

      {/* 题库未导入提示 */}
      {!hasBank && (
        <div style={{
          background: '#FEF3C7',
          color: '#92400E',
          font: 'var(--font-caption)',
          padding: 'var(--space-sm) var(--space-md)',
          borderRadius: 'var(--radius-sm)',
          marginBottom: 'var(--space-md)',
        }}>
          尚未导入题库，请先到「题库」页导入 .xlsx 文件
        </div>
      )}

      {/* 错误提示 */}
      {error && (
        <div style={{
          background: '#FEF3C7',
          color: '#92400E',
          font: 'var(--font-caption)',
          padding: 'var(--space-sm) var(--space-md)',
          borderRadius: 'var(--radius-sm)',
          marginBottom: 'var(--space-md)',
        }}>
          {error}
        </div>
      )}

      {images.length === 0 ? (
        <div style={{
          background: 'var(--color-surface)',
          borderRadius: 'var(--radius-md)',
          padding: 'var(--space-2xl) var(--space-lg)',
          textAlign: 'center',
          boxShadow: 'var(--shadow-card)',
          marginBottom: 'var(--space-lg)',
        }}>
          <div style={{
            width: 64,
            height: 64,
            borderRadius: 'var(--radius-full)',
            background: '#E3F2FD',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto var(--space-lg)',
            color: 'var(--color-primary)',
          }}>
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor"
              strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3z"/>
              <circle cx="12" cy="13" r="3"/>
            </svg>
          </div>
          <p style={{
            font: 'var(--font-body)',
            color: 'var(--color-text-secondary)',
            marginBottom: 'var(--space-lg)',
          }}>
            一次最多拍摄 {MAX_IMAGES} 张，每张最多识别 {MAX_QUESTIONS_PER_IMAGE} 道题
          </p>
          <ImagePicker
            currentCount={0}
            maxCount={MAX_IMAGES}
            onImagesSelected={handleImagesSelected}
            onError={handleError}
          />
        </div>
      ) : (
        <>
          <ImagePreview
            images={images}
            maxCount={MAX_IMAGES}
            onRemove={handleRemoveImage}
          />

          {images.length < MAX_IMAGES && (
            <div style={{ marginTop: 'var(--space-md)' }}>
              <ImagePicker
                currentCount={images.length}
                maxCount={MAX_IMAGES}
                onImagesSelected={handleImagesSelected}
                onError={handleError}
              />
            </div>
          )}

          <button
            onClick={handleStartSearch}
            disabled={!hasBank}
            style={{
              display: 'block',
              width: '100%',
              maxWidth: 360,
              margin: 'var(--space-xl) auto 0',
              height: 48,
              borderRadius: 'var(--radius-md)',
              background: hasBank ? 'var(--color-primary)' : '#93C5FD',
              color: '#fff',
              font: '600 16px/48px var(--font-family)',
              border: 'none',
              cursor: hasBank ? 'pointer' : 'not-allowed',
              opacity: hasBank ? 1 : 0.6,
            }}
          >
            {hasBank ? `开始搜题（${images.length} 张）` : '请先导入题库'}
          </button>
        </>
      )}
    </div>
  );
}
