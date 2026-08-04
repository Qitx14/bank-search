import type { BankStats } from '../types';

interface StatsPanelProps {
  stats: BankStats;
}

function StatCard({ label, count, color }: { label: string; count: number; color: string }) {
  return (
    <div
      style={{
        background: 'var(--color-surface)',
        borderRadius: 'var(--radius-sm)',
        padding: 'var(--space-md)',
        textAlign: 'center',
        boxShadow: 'var(--shadow-card)',
        flex: 1,
      }}
    >
      <div style={{ font: 'var(--font-h3)', color }}>{count}</div>
      <div style={{ font: 'var(--font-small)', color: 'var(--color-text-secondary)', marginTop: 'var(--space-xs)' }}>
        {label}
      </div>
    </div>
  );
}

export default function StatsPanel({ stats }: StatsPanelProps) {
  return (
    <div>
      {/* 文件信息 */}
      <div
        style={{
          background: 'var(--color-surface)',
          borderRadius: 'var(--radius-md)',
          padding: 'var(--space-md) var(--space-lg)',
          boxShadow: 'var(--shadow-card)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: 'var(--space-md)',
        }}
      >
        <div>
          <div style={{ font: 'var(--font-body)', wordBreak: 'break-all' }}>{stats.fileName}</div>
          <div style={{ font: 'var(--font-caption)', color: 'var(--color-text-secondary)', marginTop: 'var(--space-xs)' }}>
            导入于 {new Date(stats.importedAt).toLocaleString('zh-CN')}
          </div>
        </div>
        <div
          style={{
            background: '#E8F5E9',
            color: 'var(--color-success)',
            font: 'var(--font-h3)',
            padding: '4px 12px',
            borderRadius: 'var(--radius-full)',
          }}
        >
          {stats.total} 题
        </div>
      </div>

      {/* 题型分布 */}
      <div style={{ display: 'flex', gap: 'var(--space-sm)' }}>
        <StatCard label="单选题" count={stats.questionCount.single} color="#1976D2" />
        <StatCard label="多选题" count={stats.questionCount.multiple} color="#F59E0B" />
        <StatCard label="判断题" count={stats.questionCount.judge} color="#10B981" />
      </div>
    </div>
  );
}
