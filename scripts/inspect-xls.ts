/**
 * 检查 .xls/.xlsx 题库文件结构并运行真实解析器（开发工具，不参与打包）
 * 用法：npx tsx scripts/inspect-xls.ts <文件路径>
 * 输出：Sheet 列表、题型识别、表头列、前几行数据、真实解析结果
 */
import * as XLSX from 'xlsx';
import { readFileSync } from 'node:fs';
import { parseExcelBuffer } from '../src/services/xlsx-parser';

const filePath = process.argv[2];
if (!filePath) {
  console.error('用法: npx tsx scripts/inspect-xls.ts <文件路径>');
  process.exit(1);
}

const buf = readFileSync(filePath);
const workbook = XLSX.read(buf, { type: 'buffer' });

console.log(`文件: ${filePath}`);
console.log(`Sheet 数量: ${workbook.SheetNames.length}\n`);

for (const sheetName of workbook.SheetNames) {
  const sheet = workbook.Sheets[sheetName];
  const data = XLSX.utils.sheet_to_json<string[]>(sheet, { header: 1 }) as string[][];

  console.log(`===== Sheet「${sheetName}」=====`);
  console.log(`范围: ${sheet['!ref'] ?? '(无)'}  数据行数(含表头): ${data.length}`);

  // 前 3 行
  data.slice(0, 3).forEach((row, i) => {
    console.log(`  第${i + 1}行: [${row.map(c => String(c ?? '')).join(' | ').slice(0, 200)}]`);
  });
  console.log('');
}

console.log('===== 运行真实解析器 =====');
try {
  const result = parseExcelBuffer(buf);
  console.log(`✅ 解析成功: 单选 ${result.stats.single} / 多选 ${result.stats.multiple} / 判断 ${result.stats.judge} / 案例 ${result.stats.case}（共 ${result.questions.length} 题）`);
  if (result.errors.length > 0) {
    console.log(`⚠️ 警告 ${result.errors.length} 条（前 5 条）:`);
    result.errors.slice(0, 5).forEach(e => console.log(`  - ${e}`));
  }
  // 打印各题型第一题
  for (const t of ['single', 'multiple', 'judge'] as const) {
    const q = result.questions.find(x => x.sheetType === t);
    if (q) console.log(`\n样例(${t}): 题号${q.questionNumber} "${q.stem.slice(0, 50)}" 答案="${q.answer}" 选项[${q.options.map(o => o.slice(0, 20)).join(' | ')}]`);
  }
} catch (err) {
  console.error(`❌ 解析失败:`, err instanceof Error ? err.message : err);
}

