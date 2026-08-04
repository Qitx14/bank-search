import { useRef, useState } from 'react';

interface ImagePickerProps {
  currentCount: number;
  maxCount: number;
  onImagesSelected: (dataUrls: string[]) => void;
  onError: (msg: string) => void;
}

/** 将 File 转为 base64 Data URL */
function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(new Error('文件读取失败'));
    reader.readAsDataURL(file);
  });
}

export default function ImagePicker({ currentCount, maxCount, onImagesSelected, onError }: ImagePickerProps) {
  const cameraRef = useRef<HTMLInputElement>(null);
  const albumRef = useRef<HTMLInputElement>(null);
  const [loading, setLoading] = useState(false);

  const remaining = maxCount - currentCount;

  async function handleFiles(fileList: FileList | null) {
    if (!fileList || fileList.length === 0) return;

    const files = Array.from(fileList);

    if (files.length > remaining) {
      onError(`最多还能添加 ${remaining} 张图片（最多 ${maxCount} 张）`);
      return;
    }

    setLoading(true);
    try {
      const dataUrls = await Promise.all(files.map(fileToDataUrl));
      onImagesSelected(dataUrls);
    } catch {
      onError('图片读取失败，请重试');
    } finally {
      setLoading(false);
      // 重置 input，允许重复选同一文件
      if (cameraRef.current) cameraRef.current.value = '';
      if (albumRef.current) albumRef.current.value = '';
    }
  }

  if (currentCount >= maxCount) return null;

  return (
    <>
      {/* 拍照：capture="environment" 调起后置摄像头 */}
      <input
        ref={cameraRef}
        type="file"
        accept="image/*"
        capture="environment"
        onChange={(e) => handleFiles(e.target.files)}
        style={{ display: 'none' }}
      />

      {/* 相册多选 */}
      <input
        ref={albumRef}
        type="file"
        accept="image/*"
        multiple
        onChange={(e) => handleFiles(e.target.files)}
        style={{ display: 'none' }}
      />

      <div style={{ display: 'flex', gap: 'var(--space-md)' }}>
        <button
          onClick={() => cameraRef.current?.click()}
          disabled={loading}
          style={{
            flex: 1,
            height: 48,
            borderRadius: 'var(--radius-md)',
            background: loading ? '#93C5FD' : 'var(--color-primary)',
            color: '#fff',
            font: '600 16px/48px var(--font-family)',
            border: 'none',
            cursor: loading ? 'not-allowed' : 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 'var(--space-xs)',
          }}
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor"
            strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3z"/>
            <circle cx="12" cy="13" r="3"/>
          </svg>
          拍照
        </button>

        <button
          onClick={() => albumRef.current?.click()}
          disabled={loading}
          style={{
            flex: 1,
            height: 48,
            borderRadius: 'var(--radius-md)',
            background: loading ? '#93C5FD' : '#42A5F5',
            color: '#fff',
            font: '600 16px/48px var(--font-family)',
            border: 'none',
            cursor: loading ? 'not-allowed' : 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 'var(--space-xs)',
          }}
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor"
            strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
            <circle cx="8.5" cy="8.5" r="1.5"/>
            <polyline points="21 15 16 10 5 21"/>
          </svg>
          相册
        </button>

        {remaining < maxCount && (
          <div style={{
            font: 'var(--font-caption)',
            color: 'var(--color-text-secondary)',
            display: 'flex',
            alignItems: 'center',
            whiteSpace: 'nowrap',
          }}>
            还可 {remaining} 张
          </div>
        )}
      </div>
    </>
  );
}
