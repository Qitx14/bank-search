import type { OcrProgress } from '../services/ocr';

interface OcrProgressProps {
  progress: OcrProgress;
}

export default function OcrProgress({ progress }: OcrProgressProps) {
  const { current, total, status } = progress;
  const percent = Math.round((current / total) * 100);

  return (
    <div style={{
      background: 'var(--color-surface)',
      borderRadius: 'var(--radius-md)',
      padding: 'var(--space-xl) var(--space-lg)',
      boxShadow: 'var(--shadow-card)',
    }}>
      {/* 状态文字 */}
      <div style={{
        font: 'var(--font-body)',
        color: 'var(--color-text-primary)',
        textAlign: 'center',
        marginBottom: 'var(--space-md)',
      }}>
        {status}
      </div>

      {/* 进度条 */}
      <div style={{
        height: 8,
        borderRadius: 4,
        background: '#E3F2FD',
        overflow: 'hidden',
        marginBottom: 'var(--space-sm)',
      }}>
        <div style={{
          height: '100%',
          width: `${percent}%`,
          borderRadius: 4,
          background: 'var(--color-primary)',
          transition: 'width 0.3s ease',
        }} />
      </div>

      {/* 进度数字 */}
      <div style={{
        font: 'var(--font-caption)',
        color: 'var(--color-text-secondary)',
        textAlign: 'center',
      }}>
        {current}/{total} 张 — {percent}%
      </div>

      {/* 每张图片状态列表 */}
      <div style={{
        display: 'flex',
        gap: 'var(--space-xs)',
        marginTop: 'var(--space-md)',
        justifyContent: 'center',
        flexWrap: 'wrap',
      }}>
        {Array.from({ length: total }, (_, i) => {
          const idx = i + 1;

          if (idx < current) {
            // 已完成
            return (
              <span key={i} style={{
                width: 28,
                height: 28,
                borderRadius: 'var(--radius-full)',
                background: '#E8F5E9',
                color: 'var(--color-success)',
                font: 'var(--font-small)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}>
                ✓
              </span>
            );
          }
          if (idx === current) {
            // 正在处理
            return (
              <span key={i} style={{
                width: 28,
                height: 28,
                borderRadius: 'var(--radius-full)',
                background: '#E3F2FD',
                color: 'var(--color-primary)',
                font: 'var(--font-small)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                animation: 'pulse 1.5s ease-in-out infinite',
              }}>
                {idx}
              </span>
            );
          }
          // 等待中
          return (
            <span key={i} style={{
              width: 28,
              height: 28,
              borderRadius: 'var(--radius-full)',
              background: '#F3F4F6',
              color: 'var(--color-text-secondary)',
              font: 'var(--font-small)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}>
              {idx}
            </span>
          );
        })}
      </div>
    </div>
  );
}
