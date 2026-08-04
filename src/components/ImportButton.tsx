import { useRef, useState } from 'react';
import { parseExcelFile } from '../services/xlsx-parser';
import { importQuestions, saveBankMeta, clearBank } from '../services/db';
import { clearSearchCache } from '../services/search';
import type { BankStats } from '../types';

interface ImportButtonProps {
  onImported: (stats: BankStats) => void;
  onError: (msg: string) => void;
}

export default function ImportButton({ onImported, onError }: ImportButtonProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [loading, setLoading] = useState(false);

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setLoading(true);
    try {
      const result = await parseExcelFile(file);

      // 先清空旧题库，再写入新数据
      await clearBank();
      clearSearchCache();
      await importQuestions(result.questions);
      await saveBankMeta({
        id: 'current',
        fileName: file.name,
        importedAt: Date.now(),
        questionCount: result.stats,
      });

      const total = result.stats.single + result.stats.multiple + result.stats.judge;

      // 如果有部分错误，提示用户
      if (result.errors.length > 0) {
        onError(`导入完成！成功 ${total} 题，但有 ${result.errors.length} 个问题：\n${result.errors.slice(0, 3).join('\n')}`);
      }

      onImported({
        hasBank: true,
        fileName: file.name,
        importedAt: Date.now(),
        questionCount: result.stats,
        total,
      });
    } catch (err) {
      onError(err instanceof Error ? err.message : '导入失败');
    } finally {
      setLoading(false);
      // 重置 input，允许重复选择同一文件
      if (inputRef.current) inputRef.current.value = '';
    }
  };

  return (
    <>
      <input
        ref={inputRef}
        type="file"
        accept=".xlsx,.xls"
        onChange={handleFile}
        style={{ display: 'none' }}
      />
      <button
        onClick={() => inputRef.current?.click()}
        disabled={loading}
        style={{
          display: 'block',
          width: '100%',
          maxWidth: 360,
          margin: '0 auto',
          height: 48,
          borderRadius: 'var(--radius-md)',
          background: loading ? '#93C5FD' : 'var(--color-primary)',
          color: '#fff',
          font: '600 16px/48px var(--font-family)',
          border: 'none',
          cursor: loading ? 'not-allowed' : 'pointer',
          transition: 'background 0.15s ease',
        }}
      >
        {loading ? '正在导入...' : '选择题库文件 (.xlsx)'}
      </button>
    </>
  );
}
