interface ImagePreviewProps {
  images: string[];
  maxCount: number;
  onRemove: (index: number) => void;
}

export default function ImagePreview({ images, maxCount, onRemove }: ImagePreviewProps) {
  return (
    <div>
      {/* 已选数量 */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 'var(--space-md)',
      }}>
        <span style={{
          font: 'var(--font-caption)',
          color: 'var(--color-text-secondary)',
        }}>
          已选 {images.length}/{maxCount} 张
        </span>
        {images.length > 0 && (
          <button
            onClick={() => images.forEach((_, i) => onRemove(i))}
            style={{
              font: 'var(--font-caption)',
              color: 'var(--color-error)',
              background: 'none',
              border: 'none',
              padding: 'var(--space-xs)',
            }}
          >
            清空全部
          </button>
        )}
      </div>

      {/* 缩略图网格：3列 */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(3, 1fr)',
        gap: 'var(--space-sm)',
      }}>
        {images.map((dataUrl, index) => (
          <div
            key={index}
            style={{
              position: 'relative',
              aspectRatio: '3 / 4',
              borderRadius: 'var(--radius-sm)',
              overflow: 'hidden',
              background: '#E5E7EB',
              boxShadow: 'var(--shadow-card)',
            }}
          >
            <img
              src={dataUrl}
              alt={`题目 ${index + 1}`}
              style={{
                width: '100%',
                height: '100%',
                objectFit: 'cover',
                display: 'block',
              }}
            />

            {/* 序号 */}
            <span style={{
              position: 'absolute',
              top: 4,
              left: 4,
              width: 20,
              height: 20,
              borderRadius: 'var(--radius-full)',
              background: 'rgba(0,0,0,0.5)',
              color: '#fff',
              font: 'var(--font-small)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}>
              {index + 1}
            </span>

            {/* 删除按钮 */}
            <button
              onClick={() => onRemove(index)}
              style={{
                position: 'absolute',
                top: 4,
                right: 4,
                width: 24,
                height: 24,
                borderRadius: 'var(--radius-full)',
                background: 'rgba(0,0,0,0.5)',
                color: '#fff',
                font: '14px/24px var(--font-family)',
                border: 'none',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: 0,
                lineHeight: '24px',
              }}
              aria-label={`删除第 ${index + 1} 张`}
            >
              ✕
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
