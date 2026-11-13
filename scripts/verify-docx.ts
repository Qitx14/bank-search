/**
 * docx 题库解析验证脚本（开发工具，不参与打包）
 * 用法: npx tsx scripts/verify-docx.ts "/path/to/file.docx"
 *
 * Node 环境没有 DOMParser，这里用正则抽取 <p> 段落文本（与浏览器版
 * extractParagraphLines 等价），再调用同一个 parseDocxLines 状态机。
 */
import { readFileSync } from 'node:fs';
import mammoth from 'mammoth';
import { parseDocxLines } from '../src/services/docx-parser';

const filePath = process.argv[2];
if (!filePath) {
  console.error('用法: npx tsx scripts/verify-docx.ts <docx文件路径>');
  process.exit(1);
}

const buffer = readFileSync(filePath);
const { value: html, messages } = await mammoth.convertToHtml({ buffer });
console.log('mammoth 警告数:', messages.length);
messages.forEach((m: { type: string; message: string }) => console.log('  -', m.type, m.message.slice(0, 120)));

const decodeEntities = (s: string) =>
  s.replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"').replace(/&#39;|&apos;/g, "'").replace(/&nbsp;/g, ' ');

// 注意顺序：先剥 HTML 标签、再解码实体，与浏览器版 extractParagraphLines
// （DOMParser textContent）行为一致；顺序颠倒会把垃圾段落里的 XML 文本
// 误当成标签剥掉，残留文字拼进选项。
// 先去掉 <table> 整块（与生产代码排除表格内段落保持一致）。
const withoutTables = html.replace(/<table[\s>][\s\S]*?<\/table>/gi, '');
const lines = [...withoutTables.matchAll(/<p[^>]*>([\s\S]*?)<\/p>/gi)]
  .map(m => m[1])
  .map(t => t.replace(/<[^>]+>/g, ''))
  .map(decodeEntities)
  .map(t => t.trim())
  .filter(Boolean);

console.log('非空段落数:', lines.length);

const result = parseDocxLines(lines);
console.log('\n===== 解析结果 =====');
console.log('题目总数:', result.questions.length);
console.log('题型统计:', JSON.stringify(result.stats));
console.log('解析错误数:', result.errors.length);
if (result.errors.length > 0) {
  console.log('错误样例:');
  result.errors.slice(0, 10).forEach(e => console.log('  -', e));
}

// 抽样检查各题型
const byType = {
  single: result.questions.filter(q => q.sheetType === 'single'),
  multiple: result.questions.filter(q => q.sheetType === 'multiple'),
  judge: result.questions.filter(q => q.sheetType === 'judge'),
  case: result.questions.filter(q => q.sheetType === 'case'),
};
for (const [type, list] of Object.entries(byType)) {
  const q = list[0];
  if (!q) continue;
  console.log(`\n--- ${type} 抽样 (题号 ${q.questionNumber}) ---`);
  console.log('题干:', q.stem.slice(0, 60));
  console.log('选项:', q.options.map(o => o.slice(0, 20)));
  console.log('答案:', q.answer);
}

// 检查原 1082 题（垃圾段落）的选项是否被污染
const q1082 = result.questions.find(q => q.questionNumber === 1082);
console.log('\n--- 1082 题（原垃圾段落处）选项 ---');
console.log(q1082 ? JSON.stringify(q1082.options) : '未找到!');

// 检查案例分析（独立题型，题号 >= 1121）
const caseQs = result.questions.filter(q => q.questionNumber >= 1121);
const caseTypeCount: Record<string, number> = {};
for (const q of caseQs) caseTypeCount[q.sheetType] = (caseTypeCount[q.sheetType] || 0) + 1;
console.log('\n--- 案例分析 (题号≥1121) ---');
console.log('题目数:', caseQs.length, '题型分布:', caseTypeCount);
const caseSample = caseQs.find(q => q.answer.length > 1);
if (caseSample) {
  console.log('案例分析多答案抽样: 题号', caseSample.questionNumber, '答案:', caseSample.answer, '选项数:', caseSample.options.length);
}

// 千分位题号检查
const thousands = result.questions.filter(q => q.questionNumber >= 1000);
console.log('\n题号≥1000 的题目数:', thousands.length, '(应=163)');
console.log('题号最大值:', Math.max(...result.questions.map(q => q.questionNumber)));
