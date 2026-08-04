import * as XLSX from 'xlsx';
import type { Question, SheetType } from '../types';
import { generateId } from '../utils/uuid';

/** 列名映射：把常见的列名变体统一到标准字段 */
const COLUMN_ALIASES: Record<string, string[]> = {
  questionNumber: ['题号', '序号', '编号', '类型编号', '题目编号', 'id', 'ID', 'No', 'no', 'number'],
  stem: ['题目', '题干', '题目内容', '问题', '试题', 'question', 'stem', 'title'],
  answer: ['答案', '正确答案', '标准答案', '客观题答案', 'answer', '结果'],
};

/** 选项列前缀 */
const OPTION_PREFIXES = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'];

/** Sheet 名到题型的映射 */
const SHEET_TYPE_MAP: Record<string, SheetType> = {
  '单选题': 'single',
  '单选': 'single',
  '选择题': 'single',
  '多选题': 'multiple',
  '多选': 'multiple',
  '判断题': 'judge',
  '判断': 'judge',
};

/**
 * 在表头行中找到与目标字段匹配的列索引
 * 优先精确匹配，回退到包含匹配
 */
function findColumn(headers: string[], target: string): number {
  const aliases = COLUMN_ALIASES[target] || [target];
  for (const alias of aliases) {
    // 精确匹配
    const exact = headers.findIndex(h => h.trim() === alias);
    if (exact >= 0) return exact;
  }
  for (const alias of aliases) {
    // 包含匹配
    const partial = headers.findIndex(h => h.trim().includes(alias));
    if (partial >= 0) return partial;
  }
  return -1;
}

/** 找到所有选项列（如 A、B、C、D 或 选项A、选项B 等） */
function findOptionColumns(headers: string[]): number[] {
  const indices: number[] = [];
  for (const prefix of OPTION_PREFIXES) {
    const idx = headers.findIndex(h => {
      const t = h.trim();
      return t === prefix || t.startsWith(`选项${prefix}`) || t === `选项 ${prefix}`;
    });
    if (idx >= 0) indices.push(idx);
  }
  return indices;
}

/** 检测 sheet 对应的题型 */
function detectSheetType(sheetName: string): SheetType | null {
  const trimmed = sheetName.trim();
  for (const [key, value] of Object.entries(SHEET_TYPE_MAP)) {
    if (trimmed.includes(key)) return value;
  }
  return null;
}


/** 解析单个 Sheet 为题目列表 */
function parseSheet(workbook: XLSX.WorkBook, sheetName: string): { questions: Question[]; errors: string[] } {
  const questions: Question[] = [];
  const errors: string[] = [];

  const sheetType = detectSheetType(sheetName);
  if (!sheetType) {
    errors.push(`Sheet「${sheetName}」：无法识别题型，跳过。请确保 Sheet 名包含「单选题」「多选题」或「判断题」`);
    return { questions, errors };
  }

  const sheet = workbook.Sheets[sheetName];
  const data = XLSX.utils.sheet_to_json<string[]>(sheet, { header: 1 }) as string[][];

  if (data.length < 2) {
    errors.push(`Sheet「${sheetName}」：数据不足，至少需要表头和一行数据`);
    return { questions, errors };
  }

  // 第一行是表头
  const headers = data[0].map(h => String(h ?? ''));

  const qNumIdx = findColumn(headers, 'questionNumber');
  const stemIdx = findColumn(headers, 'stem');
  const answerIdx = findColumn(headers, 'answer');
  const optionIndices = findOptionColumns(headers);

  if (stemIdx < 0) {
    errors.push(`Sheet「${sheetName}」：未找到「题干」列，跳过`);
    return { questions, errors };
  }
  if (answerIdx < 0) {
    errors.push(`Sheet「${sheetName}」：未找到「答案」列，跳过`);
    return { questions, errors };
  }

  // 逐行解析
  for (let rowIdx = 1; rowIdx < data.length; rowIdx++) {
    const row = data[rowIdx];
    const stem = String(row[stemIdx] ?? '').trim();
    if (!stem) continue; // 跳过空行

    const questionNumber = qNumIdx >= 0 ? parseInt(String(row[qNumIdx] ?? ''), 10) || rowIdx : rowIdx;
    const answer = String(row[answerIdx] ?? '').trim();
    const options = optionIndices.map(i => String(row[i] ?? '').trim()).filter(Boolean);

    if (!answer) {
      errors.push(`Sheet「${sheetName}」第 ${rowIdx + 1} 行：答案为空，跳过`);
      continue;
    }

    questions.push({
      id: generateId(),
      sheetType,
      questionNumber,
      stem,
      options,
      answer,
    });
  }

  return { questions, errors };
}

/** 解析结果 */
export interface ParseResult {
  questions: Question[];
  errors: string[];
  stats: {
    single: number;
    multiple: number;
    judge: number;
  };
}

/** 主解析函数：读取 .xlsx 文件，返回所有题目 */
export function parseExcelFile(file: File): Promise<ParseResult> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target!.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });

        const allQuestions: Question[] = [];
        const allErrors: string[] = [];
        const stats = { single: 0, multiple: 0, judge: 0 };

        for (const sheetName of workbook.SheetNames) {
          const { questions, errors } = parseSheet(workbook, sheetName);
          allQuestions.push(...questions);
          allErrors.push(...errors);
        }

        for (const q of allQuestions) {
          stats[q.sheetType]++;
        }

        if (allQuestions.length === 0) {
          reject(new Error(allErrors.join('\n') || '未能从文件中解析到任何题目'));
          return;
        }

        resolve({ questions: allQuestions, errors: allErrors, stats });
      } catch (err) {
        reject(new Error(`文件解析失败：${err instanceof Error ? err.message : '未知错误'}`));
      }
    };

    reader.onerror = () => reject(new Error('文件读取失败'));
    reader.readAsArrayBuffer(file);
  });
}
