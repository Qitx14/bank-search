import type { SheetType } from '../types';

/** 题型文案（答案卡片、练习页共用） */
export const TYPE_LABELS: Record<SheetType, string> = {
  single: '单选题',
  multiple: '多选题',
  judge: '判断题',
  case: '案例分析',
};

/** 题型主题色（答案卡片、练习页共用） */
export const TYPE_COLORS: Record<SheetType, string> = {
  single: '#1976D2',
  multiple: '#F59E0B',
  judge: '#10B981',
  case: '#8B5CF6',
};

/** 多选题型（选项多选交互）：多选 + 案例分析 */
export function isMultiPickType(sheetType: SheetType): boolean {
  return sheetType === 'multiple' || sheetType === 'case';
}

/** 答案字母 → options 数组索引 */
export function letterToIndex(letter: string): number {
  return letter.toUpperCase().charCodeAt(0) - 'A'.charCodeAt(0);
}

/** 拆分多选题答案，如 "ABD" → ['A','B','D'] */
export function splitAnswer(answer: string): string[] {
  return answer.replace(/[^A-Za-z]/g, '').split('');
}
