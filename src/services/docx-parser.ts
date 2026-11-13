import type { Question, SheetType } from '../types';
import type { ParseResult } from './xlsx-parser';
import { generateId } from '../utils/uuid';

/**
 * docx 题库解析器
 *
 * 支持的排版格式（段落文本，非表格）：
 *   1.单选:题干……
 *   A. 选项一
 *   B. 选项二
 *   正确答案: D
 *
 * 已适配的真实文件特征：
 *   - 题号可能带千分位逗号（如 "1,121.案例分析:……"）
 *   - 题型：单选 / 多选 / 判断 / 案例分析（四种独立题型）
 *   - 判断答案归一化：A/正确/√/对 → "正确"；B/错误/×/错 → "错误"
 *   - 多选/案例分析答案可能是 "ABC"、"B,D"、"B、D" 等，统一提取字母并排序
 *   - 长题干/长选项可能折行，续行自动拼接到题干或末选项
 *   - 正文中混入的 XML 源码文本（文件损坏段落）直接跳过
 */

/** 题型文案 → 标准题型 */
const TYPE_MAP: Record<string, SheetType> = {
  '单选': 'single',
  '多选': 'multiple',
  '判断': 'judge',
  '案例分析': 'case',
};

/** 题头行：1.单选:题干 / 1,121.案例分析:题干（题号可带千分位逗号） */
const HEADER_RE = /^(\d[\d,]*)\s*[.、．]?\s*(单选|多选|判断|案例分析)\s*[:：]\s*(.*)$/;

/** 选项行：A. xxx / B、xxx / C：xxx（支持全角标点，A-H 共 8 个） */
const OPTION_RE = /^([A-Ha-h])\s*[.、．:：)）]\s*(.*)$/;

/** 答案行：正确答案: D / 参考答案：A、B */
const ANSWER_RE = /^(正确答案|参考答案|标准答案|答案)\s*[:：]\s*(.*)$/;

/** 判断答案正向写法 */
const JUDGE_TRUE = ['A', '正确', '√', '对', 'T', 'TRUE', '是'];
/** 判断答案负向写法 */
const JUDGE_FALSE = ['B', '错误', '×', 'X', '错', 'F', 'FALSE', '否'];

/** 是否为混入正文的 XML 源码（文件损坏产生的垃圾段落） */
function isXmlJunk(line: string): boolean {
  return line.startsWith('<') || line.includes('w:rPr');
}

/** 提取答案中的字母并排序，如 "B,D" → "BD"、"b、a" → "AB" */
function normalizeAnswerLetters(raw: string): string {
  return raw
    .toUpperCase()
    .replace(/[^A-H]/g, '')
    .split('')
    .sort()
    .join('');
}

/** 判断题答案归一化为「正确」/「错误」，无法识别时保留原文 */
function normalizeJudgeAnswer(raw: string): string {
  const t = raw.trim().toUpperCase();
  if (JUDGE_TRUE.includes(t)) return '正确';
  if (JUDGE_FALSE.includes(t)) return '错误';
  return raw.trim();
}

/** 解析过程中的待定题目 */
interface PendingQuestion {
  type: string;              // 题头行中的题型文案（单选/多选/判断/案例分析）
  questionNumber: number;
  stem: string;
  options: string[];
  rawAnswer: string;
}

/** 把一道待定题转为标准 Question 并入库；数据不完整则记录错误并跳过 */
function finalizeQuestion(
  pending: PendingQuestion,
  questions: Question[],
  errors: string[],
): void {
  let { stem, options, rawAnswer } = pending;
  stem = stem.trim();
  options = options.map(o => o.trim()).filter(Boolean);
  rawAnswer = rawAnswer.trim();

  if (!stem) {
    errors.push(`第 ${pending.questionNumber} 题（${pending.type}）：题干为空，跳过`);
    return;
  }
  if (!rawAnswer) {
    errors.push(`第 ${pending.questionNumber} 题（${pending.type}）：未找到答案，跳过`);
    return;
  }

  // 判断题：归一化为 正确/错误
  let sheetType = TYPE_MAP[pending.type];
  let answer: string;
  if (pending.type === '判断') {
    answer = normalizeJudgeAnswer(rawAnswer);
  } else {
    answer = normalizeAnswerLetters(rawAnswer);
    if (!answer) {
      errors.push(`第 ${pending.questionNumber} 题（${pending.type}）：答案无法解析（"${rawAnswer}"），跳过`);
      return;
    }
    // 数据容错：单选题答案出现多字母时按多选处理
    if (sheetType === 'single' && answer.length > 1) {
      sheetType = 'multiple';
    }
  }

  questions.push({
    id: generateId(),
    sheetType,
    questionNumber: pending.questionNumber,
    stem,
    options,
    answer,
  });
}

/** 核心状态机：把 docx 段落文本行解析为题目列表 */
export function parseDocxLines(lines: string[]): ParseResult {
  const questions: Question[] = [];
  const errors: string[] = [];

  let pending: PendingQuestion | null = null;

  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line || isXmlJunk(line)) continue;

    // 1. 新题头行：先收尾上一题，再开新题
    const header = line.match(HEADER_RE);
    if (header) {
      if (pending) {
        finalizeQuestion(pending, questions, errors);
        pending = null;
      }
      pending = {
        type: header[2],
        questionNumber: parseInt(header[1].replace(/,/g, ''), 10),
        stem: header[3],
        options: [],
        rawAnswer: '',
      };
      continue;
    }

    if (!pending) continue; // 题块之外的内容（标题、章节名等）忽略

    // 2. 答案行
    const answer = line.match(ANSWER_RE);
    if (answer) {
      pending.rawAnswer = answer[2];
      continue;
    }

    // 3. 选项行（去掉 "A." 前缀，与 xlsx 解析器保持一致只存内容）
    const option = line.match(OPTION_RE);
    if (option) {
      pending.options.push(option[2]);
      continue;
    }

    // 4. 其他内容：题干续行 / 选项续行
    if (pending.options.length === 0) {
      pending.stem += line;
    } else {
      pending.options[pending.options.length - 1] += line;
    }
  }

  // 收尾最后一道题
  if (pending) {
    finalizeQuestion(pending, questions, errors);
  }

  const stats = { single: 0, multiple: 0, judge: 0, case: 0 };
  for (const q of questions) {
    stats[q.sheetType]++;
  }

  return { questions, errors, stats };
}

/** 从 HTML 中提取段落文本（忽略空段落；表格内的段落不参与解析——本题库为段落排版，表格多为文本框等排版附件，见 tech-spec） */
function extractParagraphLines(html: string): string[] {
  const doc = new DOMParser().parseFromString(html, 'text/html');
  return Array.from(doc.querySelectorAll('p'))
    .filter(p => !p.closest('table'))
    .map(p => (p.textContent ?? '').trim())
    .filter(Boolean);
}

/** 主解析函数：读取 .docx 文件，返回所有题目 */
export async function parseDocxFile(file: File): Promise<ParseResult> {
  let html: string;
  try {
    // 动态导入：mammoth 体积较大，仅在真正解析 docx 时才加载
    const { convertToHtml } = await import('mammoth/mammoth.browser.js');
    const arrayBuffer = await file.arrayBuffer();
    const result = await convertToHtml({ arrayBuffer });
    html = result.value;
    if (result.messages.length > 0) {
      console.warn('[docx-parser] mammoth 转换警告:', result.messages);
    }
  } catch (err) {
    throw new Error(`docx 文件解析失败：${err instanceof Error ? err.message : '未知错误'}`);
  }

  const lines = extractParagraphLines(html);
  if (lines.length === 0) {
    throw new Error('未能从文件中解析到任何文本内容');
  }

  const result = parseDocxLines(lines);
  if (result.questions.length === 0) {
    throw new Error(result.errors.join('\n') || '未能从文件中解析到任何题目');
  }
  return result;
}
