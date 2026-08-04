import Dexie, { type Table } from 'dexie';
import type { Question, BankMeta, SearchRecord } from '../types';

/** 题库搜题 App 本地数据库 */
class BankDB extends Dexie {
  questions!: Table<Question, string>;
  bankMeta!: Table<BankMeta, string>;
  searchRecords!: Table<SearchRecord, string>;

  constructor() {
    super('BankSearchDB');

    this.version(1).stores({
      questions: 'id, sheetType, questionNumber',
      bankMeta: 'id',
      searchRecords: 'id, searchedAt',
    });
  }
}

export const db = new BankDB();

// ===== 题库操作 =====

/** 批量导入题目（替换旧数据） */
export async function importQuestions(questions: Question[]): Promise<void> {
  await db.transaction('rw', db.questions, async () => {
    await db.questions.clear();
    await db.questions.bulkPut(questions);
  });
}

/** 获取所有题目 */
export async function getAllQuestions(): Promise<Question[]> {
  return db.questions.toArray();
}

/** 按题型获取题目数量 */
export async function getQuestionCounts() {
  const single = await db.questions.where('sheetType').equals('single').count();
  const multiple = await db.questions.where('sheetType').equals('multiple').count();
  const judge = await db.questions.where('sheetType').equals('judge').count();
  return { single, multiple, judge };
}

/** 获取题目总数 */
export async function getTotalCount(): Promise<number> {
  return db.questions.count();
}

/** 清空题库 */
export async function clearAllQuestions(): Promise<void> {
  await db.questions.clear();
}

// ===== 元数据操作 =====

/** 保存/更新题库元数据 */
export async function saveBankMeta(meta: BankMeta): Promise<void> {
  await db.bankMeta.put(meta);
}

/** 获取题库元数据 */
export async function getBankMeta(): Promise<BankMeta | undefined> {
  return db.bankMeta.get('current');
}

/** 清空题库（含元数据） */
export async function clearBank(): Promise<void> {
  await db.transaction('rw', db.questions, db.bankMeta, async () => {
    await db.questions.clear();
    await db.bankMeta.clear();
  });
}

// ===== 搜索记录操作 =====

/** 保存搜索记录 */
export async function saveSearchRecord(record: SearchRecord): Promise<void> {
  await db.searchRecords.put(record);
}

/** 按时间倒序获取搜索记录 */
export async function getSearchRecords(limit = 50): Promise<SearchRecord[]> {
  return db.searchRecords
    .orderBy('searchedAt')
    .reverse()
    .limit(limit)
    .toArray();
}

/** 删除指定搜索记录 */
export async function deleteSearchRecord(id: string): Promise<void> {
  await db.searchRecords.delete(id);
}

/** 清空所有搜索记录 */
export async function clearSearchRecords(): Promise<void> {
  await db.searchRecords.clear();
}
