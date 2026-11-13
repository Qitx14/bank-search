import type { Question, SheetType } from '../types';
import { getAllQuestions } from './db';

/** 每组练习的题目数量 */
export const PRACTICE_SIZE = 10;

/** Fisher-Yates 洗牌（返回新数组，不修改原数组） */
function shuffle<T>(items: T[]): T[] {
  const arr = [...items];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

/**
 * 按题型过滤后随机抽取练习题目
 * @param types 参与练习的题型
 * @param count 抽取数量，默认 10
 * @returns 随机题目列表（可用题不足 count 时返回全部可用题）
 */
export async function pickPracticeQuestions(
  types: SheetType[],
  count = PRACTICE_SIZE,
): Promise<Question[]> {
  const all = await getAllQuestions();
  const pool = all.filter(q => types.includes(q.sheetType));
  return shuffle(pool).slice(0, count);
}

/**
 * 提取答案中的字母集合
 * "B,D"、"b、a"、"ABC" → {A,B,C}；判断类答案（正确/错误）保持原样
 */
export function answerLetterSet(answer: string): Set<string> {
  return new Set(
    answer
      .toUpperCase()
      .replace(/[^A-H]/g, '')
      .split('')
      .filter(Boolean),
  );
}

/**
 * 判断用户作答是否正确
 * - 单选：字母相等
 * - 多选/案例分析：字母集合相等（顺序无关）
 * - 判断：直接比较（正确/错误）
 */
export function judgeAnswer(question: Question, userAnswer: string): boolean {
  if (question.sheetType === 'judge') {
    return userAnswer.trim() === question.answer;
  }
  const expected = answerLetterSet(question.answer);
  const actual = answerLetterSet(userAnswer);
  if (expected.size === 0 || expected.size !== actual.size) return false;
  for (const letter of expected) {
    if (!actual.has(letter)) return false;
  }
  return true;
}
