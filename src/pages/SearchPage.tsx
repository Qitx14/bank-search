import { useEffect, useState } from 'react';
import { getBankMeta, saveSearchRecord } from '../services/db';
import { getApiKey } from '../services/openai-ocr';
import { batchRecognize, type OcrProgress, type OcrItemResult } from '../services/openai-ocr';
import { searchQuestions, matchOptionLabel } from '../services/search';
import { generateId } from '../utils/uuid';
import ImagePicker from '../components/ImagePicker';
import ImagePreview from '../components/ImagePreview';
import OcrProgressBar from '../components/OcrProgress';
import AnswerCard from '../components/AnswerCard';
import type { SearchResult, MatchItem } from '../types';

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
      // Step 1: AI OCR 识别
      const ocrResults: OcrItemResult[] = await batchRecognize(images, apiKey, setOcrProgress);

      // Step 2: 逐条搜索
      const searchResults: SearchResult[] = [];
      for (let i = 0; i < ocrResults.length; i++) {
        const ocr = ocrResults[i];
        let matches: MatchItem[] = [];

        console.log(`[SearchPage] ===== 第 ${i + 1} 张图片 =====`);
        console.log(`[SearchPage] OCR 提取文字 (${ocr.text.length} 字):`);
        console.log(`[SearchPage] "${ocr.text}"`);
        if (ocr.parsed) {
          console.log(`[SearchPage] 结构化解析: stem="${ocr.parsed.stem}", ${ocr.parsed.options.length} 个选项`);
        }
        if (ocr.error) {
          console.warn(`[SearchPage] OCR 错误: ${ocr.error}`);
        }

        // 搜索用题干：优先用 parsed.stem（更干净），回退到原始 text
        const searchText = ocr.parsed?.stem || ocr.text;

        if (!ocr.error && searchText) {
          try {
            matches = await searchQuestions(searchText);
            console.log(`[SearchPage] 匹配到 ${matches.length} 条结果`);

            // 选项映射：找考试时应选哪个字母
            if (matches.length > 0 && ocr.parsed?.options?.length) {
              const examInfo = matchOptionLabel(matches[0].question, ocr.parsed.options);
              if (examInfo) {
                searchResults.push({
                  imageIndex: i,
                  imageDataUrl: images[i],
                  extractedText: ocr.parsed.stem,
                  matches,
                  examAnswer: examInfo.label,
                  examAnswerContent: examInfo.content,
                });
                continue; // 已 push，跳过下面的 push
              }
            }
          } catch (searchErr) {
            console.error(`[SearchPage] 搜索异常:`, searchErr);
          }
        }

        if (!ocr.error && ocr.text && matches.length === 0) {
          console.warn(`[SearchPage] ⚠️ 第 ${i + 1} 张图片未匹配到任何题目！`);
          console.warn(`[SearchPage] OCR 文字: "${ocr.text}"`);
        }

        searchResults.push({
          imageIndex: i,
          imageDataUrl: images[i],
          extractedText: ocr.text,
          matches,
          error: ocr.error,
        });
      }

      setResults(searchResults);
      setPhase('results');

      // 保存搜索记录
      saveSearchRecord({
        id: generateId(),
        imageDataUrls: images,
        results: searchResults,
        searchedAt: Date.now(),
      }).catch(() => {});
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
    const successCount = results.filter(r => !r.error).length;
    const matchedCount = results.filter(r => r.matches.length > 0).length;

    return (
      <div className="page">
        <div className="page-header">
          <h1 className="page-title">搜题结果</h1>
          <p className="page-subtitle">
            {successCount}/{results.length} 张识别成功，{matchedCount} 张匹配到题目
          </p>
        </div>

        {/* 答案汇总 */}
        {(() => {
          // 收集每道题的答案
          const answers = results.map((r) => {
            if (r.error || r.matches.length === 0) return '?';
            return r.examAnswer || r.matches[0].question.answer;
          });

          // 每 5 个一组
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

          if (rows.length === 0) return null;

          return (
            <div style={{
              background: 'var(--color-surface)',
              borderRadius: 'var(--radius-md)',
              boxShadow: 'var(--shadow-card)',
              padding: 'var(--space-md)',
              marginBottom: 'var(--space-lg)',
            }}>
              <div style={{
                font: 'var(--font-small)',
                color: 'var(--color-text-secondary)',
                marginBottom: 'var(--space-sm)',
              }}>
                答案汇总
              </div>
              {rows.map((row) => (
                <div key={row.range} style={{
                  display: 'flex',
                  gap: 'var(--space-sm)',
                  padding: 'var(--space-xs) 0',
                  font: 'var(--font-body)',
                  alignItems: 'baseline',
                }}>
                  <span style={{
                    color: 'var(--color-text-secondary)',
                    font: 'var(--font-caption)',
                    whiteSpace: 'nowrap',
                    minWidth: 48,
                  }}>
                    {row.range}:
                  </span>
                  <span style={{
                    color: 'var(--color-success)',
                    fontWeight: 700,
                    letterSpacing: 2,
                    wordBreak: 'break-all',
                  }}>
                    {row.answers.join('  ')}
                  </span>
                </div>
              ))}
            </div>
          );
        })()}

        {results.map((item) => (
          <div key={item.imageIndex} style={{ marginBottom: 'var(--space-lg)' }}>
            {/* 图片缩略图 + OCR 文字 */}
            <div style={{
              display: 'flex',
              gap: 'var(--space-md)',
              marginBottom: 'var(--space-sm)',
              alignItems: 'flex-start',
            }}>
              <img
                src={item.imageDataUrl}
                alt={`第 ${item.imageIndex + 1} 张`}
                style={{
                  width: 64,
                  height: 85,
                  objectFit: 'cover',
                  borderRadius: 'var(--radius-sm)',
                  flexShrink: 0,
                }}
              />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{
                  font: 'var(--font-small)',
                  color: 'var(--color-primary)',
                  marginBottom: 'var(--space-xs)',
                }}>
                  第 {item.imageIndex + 1} 张
                </div>
                {item.error ? (
                  <div style={{
                    font: 'var(--font-caption)',
                    color: 'var(--color-error)',
                  }}>
                    {item.error}
                  </div>
                ) : (
                  <div style={{
                    font: 'var(--font-caption)',
                    color: 'var(--color-text-secondary)',
                    background: '#F8FAFC',
                    borderRadius: 'var(--radius-sm)',
                    padding: 'var(--space-xs) var(--space-sm)',
                    maxHeight: 80,
                    overflow: 'hidden',
                    whiteSpace: 'pre-wrap',
                    wordBreak: 'break-word',
                  }}>
                    {item.extractedText || '(未识别到文字)'}
                  </div>
                )}
              </div>
            </div>

            {/* 匹配结果 */}
            {!item.error && item.matches.length > 0 ? (
              item.matches.slice(0, 2).map((match, mIdx) => (
                <div key={mIdx} style={{ marginTop: 'var(--space-sm)' }}>
                  <AnswerCard
                    question={match.question}
                    score={match.score}
                    examAnswer={item.examAnswer}
                    examAnswerContent={item.examAnswerContent}
                  />
                </div>
              ))
            ) : !item.error ? (
              <div style={{
                textAlign: 'center',
                padding: 'var(--space-lg)',
                background: 'var(--color-surface)',
                borderRadius: 'var(--radius-md)',
                color: 'var(--color-text-secondary)',
                font: 'var(--font-caption)',
              }}>
                未匹配到题目
              </div>
            ) : null}
          </div>
        ))}

        {/* 操作按钮 */}
        <div style={{ display: 'flex', gap: 'var(--space-md)', marginTop: 'var(--space-md)' }}>
          <button
            onClick={handleReset}
            style={{
              flex: 1,
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
        <div style={{ height: 'var(--space-2xl)' }} />
      </div>
    );
  }

  // ===== 识别中 =====
  if (phase === 'recognizing') {
    return (
      <div className="page">
        <div className="page-header">
          <h1 className="page-title">识别中...</h1>
          <p className="page-subtitle">请勿关闭页面，正在识别题目文字</p>
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
        <p className="page-subtitle">拍照或从相册选择题目图片，自动匹配答案</p>
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
            一次最多拍摄 {MAX_IMAGES} 张题目图片
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
