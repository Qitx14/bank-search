import Fuse from 'fuse.js';
import { getAllQuestions } from './db';
import type { Question, MatchItem } from '../types';

let fuse: Fuse<Question> | null = null;

async function getFuse(): Promise<Fuse<Question>> {
  if (!fuse) {
    const questions = await getAllQuestions();
    console.log(`[Search] Fuse.js 索引已构建，共 ${questions.length} 道题`);
    fuse = new Fuse(questions, {
      keys: ['stem'],
      threshold: 0.4,
      includeScore: true,
      minMatchCharLength: 2,
    });
  }
  return fuse;
}

/**
 * 模糊搜索题库
 * @param text OCR 提取的文字（用作搜索关键词）
 * @param limit 最多返回几条匹配
 * @returns 按相似度降序排列的匹配结果，score 1=完全匹配
 */
export async function searchQuestions(text: string, limit = 3): Promise<MatchItem[]> {
  if (!text.trim()) {
    console.warn('[Search] 搜索文本为空，跳过');
    return [];
  }

  const searchText = text.trim();
  console.log(`[Search] ===== 开始搜索 =====`);
  console.log(`[Search] 搜索文本 (${searchText.length} 字): "${searchText}"`);

  const f = await getFuse();

  // Fuse.js score: 0 = 完全匹配, 1 = 完全不匹配
  // 我们转换为：1 = 完全匹配, 0 = 完全不匹配
  const results = f.search(searchText, { limit });

  console.log(`[Search] Fuse.js 匹配结果数: ${results.length}`);
  results.forEach((r, i) => {
    const score = r.score !== undefined ? Math.max(0, 1 - r.score) : 1;
    console.log(`[Search]   #${i + 1} score=${score.toFixed(3)} stem="${r.item.stem.slice(0, 80)}..." (题号${r.item.questionNumber}, ${r.item.sheetType})`);
  });

  // 如果 Fuse.js 匹配到了，直接返回
  if (results.length > 0) {
    return results.map(r => ({
      question: r.item,
      score: r.score !== undefined ? Math.max(0, 1 - r.score) : 1,
    }));
  }

  // === 回退：bigram 字符级匹配 ===
  // Fuse.js 在 OCR 文字错字较多时匹配不到，用 bigram 作为补充策略
  console.log(`[Search] ⚠️ Fuse.js 未匹配到，启用 bigram 回退匹配...`);
  const allQuestions = await getAllQuestions();

  const FALLBACK_THRESHOLD = 0.35; // bigram 分数阈值，低于此分数的不返回

  const ranked = allQuestions
    .map(q => {
      const stemLower = q.stem.toLowerCase();
      const textLower = searchText.toLowerCase();

      // 完全包含：直接高分
      if (stemLower.includes(textLower) || textLower.includes(stemLower)) {
        const lenRatio = Math.min(stemLower.length, textLower.length) /
          Math.max(stemLower.length, textLower.length);
        return { question: q, score: 0.6 + lenRatio * 0.4 };  // 0.6 ~ 1.0
      }

      // Bigram 重叠率
      let overlap = 0;
      for (let i = 0; i < textLower.length - 1; i++) {
        const bigram = textLower.slice(i, i + 2);
        if (stemLower.includes(bigram)) overlap++;
      }
      const maxBigrams = Math.max(1, textLower.length - 1);
      const bigramScore = overlap / maxBigrams;

      return { question: q, score: bigramScore };
    })
    .filter(r => r.score >= FALLBACK_THRESHOLD)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);

  console.log(`[Search] Bigram 回退匹配 Top ${ranked.length}:`);
  ranked.forEach((r, i) => {
    console.log(`[Search]   #${i + 1} bigramScore=${r.score.toFixed(3)} stem="${r.question.stem.slice(0, 100)}" (题号${r.question.questionNumber}, ${r.question.sheetType})`);
  });

  return ranked.map(r => ({
    question: r.question,
    score: r.score,
  }));
}

/**
 * 清洗选项文字：去除前缀 "A." "A、" "A " 等
 */
function cleanOptionText(text: string): string {
  return text.replace(/^[A-H][.、)\s]\s*/, '').trim();
}

/**
 * 在 OCR 提取的选项中，找到与题库正确答案内容最匹配的选项标签
 *
 * @param bankQuestion 题库中匹配到的题目
 * @param ocrOptions  OCR 从图片中提取的选项列表
 * @returns 考试应选的标签和正确内容，匹配失败返回 null
 */
export function matchOptionLabel(
  bankQuestion: Question,
  ocrOptions: { label: string; text: string }[],
): { label: string; content: string } | null {
  const { sheetType, answer, options: bankOptions } = bankQuestion;

  // 判断题：直接返回答案（正确/错误）
  if (sheetType === 'judge') {
    return { label: answer, content: answer };
  }

  // 选择题：需要找到正确选项的内容
  if (!ocrOptions || ocrOptions.length === 0) {
    console.warn('[Search] OCR 未提取到选项，无法映射');
    return null;
  }

  if (!bankOptions || bankOptions.length === 0) {
    console.warn('[Search] 题库题目无选项');
    return null;
  }

  // 解析答案字母（如 "C" → ["C"]，"AB" → ["A", "B"]）
  const answerLetters = answer.replace(/[^A-Za-z]/g, '').split('').filter(Boolean);

  if (answerLetters.length === 0) {
    console.warn('[Search] 无法解析答案字母:', answer);
    return null;
  }

  // 从题库选项中获取正确选项的内容
  const correctContents: string[] = [];
  for (const letter of answerLetters) {
    const idx = letter.toUpperCase().charCodeAt(0) - 65; // A=0, B=1, ...
    if (idx >= 0 && idx < bankOptions.length) {
      const cleaned = cleanOptionText(bankOptions[idx]);
      correctContents.push(cleaned);
    }
  }

  if (correctContents.length === 0) {
    console.warn('[Search] 无法从题库选项中提取正确选项内容');
    return null;
  }

  const targetContent = correctContents.join('；');
  console.log(`[Search] 题库正确答案: ${answer} → 内容: "${targetContent}"`);

  // 对 OCR 选项用 bigram 匹配，找到与目标内容最相似的
  const ocrCleaned = ocrOptions.map(o => ({
    label: o.label,
    text: cleanOptionText(o.text),
  }));

  console.log(`[Search] OCR 选项:`, ocrCleaned.map(o => `${o.label}: ${o.text.slice(0, 30)}`).join(', '));

  // 对每个 OCR 选项计算 bigram 相似度
  const scored = ocrCleaned.map(o => {
    const textLower = o.text.toLowerCase();
    const targetLower = targetContent.toLowerCase();

    // 完全包含：高分
    if (textLower === targetLower) return { ...o, score: 1.0 };
    if (textLower.includes(targetLower) || targetLower.includes(textLower)) {
      const lenRatio = Math.min(textLower.length, targetLower.length) /
        Math.max(textLower.length, targetLower.length);
      return { ...o, score: 0.7 + lenRatio * 0.3 };
    }

    // Bigram 重叠率
    let overlap = 0;
    for (let i = 0; i < targetLower.length - 1; i++) {
      const bigram = targetLower.slice(i, i + 2);
      if (textLower.includes(bigram)) overlap++;
    }
    const maxBigrams = Math.max(1, targetLower.length - 1);
    return { ...o, score: overlap / maxBigrams };
  });

  scored.sort((a, b) => b.score - a.score);

  console.log(`[Search] 选项匹配分数:`, scored.map(s => `${s.label}: ${s.score.toFixed(3)}`).join(', '));

  const best = scored[0];
  const MATCH_THRESHOLD = 0.4;

  if (!best || best.score < MATCH_THRESHOLD) {
    console.warn(`[Search] 最佳匹配 "${best?.label}" 分数 ${best?.score.toFixed(3)} < ${MATCH_THRESHOLD}，返回 null`);
    return null;
  }

  console.log(`[Search] ✅ 选项映射成功: 题库${answer} → 考试选 ${best.label}，内容: "${best.text}"`);
  return { label: best.label, content: best.text };
}

/** 题库更新后清除缓存，强制重建索引 */
export function clearSearchCache(): void {
  fuse = null;
}
