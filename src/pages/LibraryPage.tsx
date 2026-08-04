import { useEffect, useState } from 'react';
import { getBankMeta, clearBank } from '../services/db';
import ImportButton from '../components/ImportButton';
import StatsPanel from '../components/StatsPanel';
import type { BankStats } from '../types';

export default function LibraryPage() {
  const [stats, setStats] = useState<BankStats | null>(null);
  const [error, setError] = useState<string | null>(null);

  // 页面加载时检查是否已有题库
  useEffect(() => {
    loadStats();
  }, []);

  async function loadStats() {
    const meta = await getBankMeta();
    if (meta) {
      setStats({
        hasBank: true,
        fileName: meta.fileName,
        importedAt: meta.importedAt,
        questionCount: meta.questionCount,
        total: meta.questionCount.single + meta.questionCount.multiple + meta.questionCount.judge,
      });
    }
  }

  function handleImported(newStats: BankStats) {
    setStats(newStats);
    setError(null);
  }

  function handleError(msg: string) {
    setError(msg);
    // 3 秒后自动清除错误提示
    setTimeout(() => setError(null), 5000);
  }

  async function handleClear() {
    if (!confirm('确定要清空题库吗？此操作不可撤销。')) return;
    await clearBank();
    setStats(null);
  }

  return (
    <div className="page">
      <div className="page-header">
        <h1 className="page-title">题库</h1>
        <p className="page-subtitle">
          {stats ? '题库已就绪，可以开始搜题' : '导入题库文件，开始搜题'}
        </p>
      </div>

      {/* 错误提示 */}
      {error && (
        <div
          style={{
            background: '#FEF3C7',
            color: '#92400E',
            font: 'var(--font-caption)',
            padding: 'var(--space-sm) var(--space-md)',
            borderRadius: 'var(--radius-sm)',
            marginBottom: 'var(--space-md)',
            whiteSpace: 'pre-line',
          }}
        >
          {error}
        </div>
      )}

      {/* 导入按钮 */}
      <div style={{ marginBottom: 'var(--space-xl)' }}>
        <ImportButton onImported={handleImported} onError={handleError} />
      </div>

      {/* 统计面板 */}
      {stats && <StatsPanel stats={stats} />}

      {/* 清空按钮 */}
      {stats && (
        <div style={{ marginTop: 'var(--space-xl)', textAlign: 'center' }}>
          <button
            onClick={handleClear}
            style={{
              font: 'var(--font-caption)',
              color: 'var(--color-error)',
              padding: 'var(--space-sm) var(--space-md)',
              background: 'none',
              border: '1px solid var(--color-error)',
              borderRadius: 'var(--radius-sm)',
            }}
          >
            清空题库
          </button>
        </div>
      )}
    </div>
  );
}
