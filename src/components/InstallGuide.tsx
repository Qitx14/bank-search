import { useState, useEffect } from 'react';

const STORAGE_KEY = 'bank-search-install-guide-dismissed';

/**
 * 检测是否为 iOS Safari（唯一支持「添加到主屏幕」的 iOS 浏览器）
 */
function isIosSafari(): boolean {
  const ua = navigator.userAgent;
  // iOS 设备
  const isIos = /iPhone|iPad|iPod/.test(ua);
  // Safari（排除 Chrome/Firefox/Edge/QQ/WeChat 等）
  const isSafari = ua.includes('Safari') && !ua.includes('CriOS') && !ua.includes('FxiOS') && !ua.includes('EdgiOS') && !ua.includes('QQ/') && !ua.includes('MicroMessenger');
  return isIos && isSafari;
}

/**
 * 检测是否已经处于 standalone 模式（已添加到主屏幕）
 */
function isStandalone(): boolean {
  return window.matchMedia('(display-mode: standalone)').matches
    || (navigator as any).standalone === true;
}

export default function InstallGuide() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    // 非 iOS Safari 或已在 standalone 模式：不显示引导
    if (!isIosSafari() || isStandalone()) return;
    // 用户之前已关闭：不再显示
    if (localStorage.getItem(STORAGE_KEY) === '1') return;

    // 延迟显示，等页面加载完
    const timer = setTimeout(() => setVisible(true), 1500);
    return () => clearTimeout(timer);
  }, []);

  function handleDismiss() {
    setVisible(false);
    localStorage.setItem(STORAGE_KEY, '1');
  }

  if (!visible) return null;

  return (
    <>
      {/* 遮罩层 */}
      <div
        onClick={handleDismiss}
        style={{
          position: 'fixed',
          inset: 0,
          zIndex: 1000,
          background: 'rgba(0,0,0,0.5)',
          display: 'flex',
          alignItems: 'flex-end',
          justifyContent: 'center',
          padding: 'var(--space-lg)',
        }}
      >
        {/* 底部弹出卡片 */}
        <div
          onClick={e => e.stopPropagation()}
          style={{
            background: 'var(--color-surface)',
            borderRadius: 'var(--radius-md)',
            padding: 'var(--space-xl)',
            width: '100%',
            maxWidth: 400,
            boxShadow: '0 -4px 20px rgba(0,0,0,0.15)',
          }}
        >
          {/* 标题 */}
          <h3 style={{
            font: 'var(--font-h3)',
            color: 'var(--color-text-primary)',
            textAlign: 'center',
            marginBottom: 'var(--space-md)',
          }}>
            添加到主屏幕
          </h3>
          <p style={{
            font: 'var(--font-caption)',
            color: 'var(--color-text-secondary)',
            textAlign: 'center',
            marginBottom: 'var(--space-lg)',
          }}>
            像 App 一样使用，无需每次打开浏览器
          </p>

          {/* 步骤 */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: 'var(--space-md)',
            marginBottom: 'var(--space-md)',
          }}>
            {/* 步骤 1 */}
            <div style={{
              display: 'flex',
              gap: 'var(--space-md)',
              alignItems: 'center',
              flex: 1,
            }}>
              <div style={{
                width: 40,
                height: 40,
                borderRadius: 'var(--radius-full)',
                background: '#E3F2FD',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}>
                {/* 分享图标 */}
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#1976D2"
                  strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="2" y="3" width="18" height="14" rx="2" ry="2"/>
                  <line x1="2" y1="20" x2="22" y2="20"/>
                </svg>
              </div>
              <div>
                <div style={{ font: 'var(--font-body)', color: 'var(--color-text-primary)' }}>
                  点击底部 <strong>分享</strong> 按钮
                </div>
                <div style={{ font: 'var(--font-small)', color: 'var(--color-text-secondary)' }}>
                  Safari 工具栏中间的 ↑ 图标
                </div>
              </div>
            </div>
          </div>

          {/* 箭头 */}
          <div style={{
            textAlign: 'center',
            color: 'var(--color-primary)',
            marginBottom: 'var(--space-md)',
          }}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor"
              strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="12" y1="5" x2="12" y2="19"/>
              <polyline points="19 12 12 19 5 12"/>
            </svg>
          </div>

          {/* 步骤 2 */}
          <div style={{
            display: 'flex',
            gap: 'var(--space-md)',
            alignItems: 'center',
            marginBottom: 'var(--space-xl)',
          }}>
            <div style={{
              width: 40,
              height: 40,
              borderRadius: 'var(--radius-full)',
              background: '#E3F2FD',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}>
              {/* 添加到主屏幕图标 */}
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#1976D2"
                strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 5v14M5 12h14"/>
                <rect x="3" y="3" width="18" height="18" rx="3" ry="3"/>
              </svg>
            </div>
            <div>
              <div style={{ font: 'var(--font-body)', color: 'var(--color-text-primary)' }}>
                选择 <strong>「添加到主屏幕」</strong>
              </div>
              <div style={{ font: 'var(--font-small)', color: 'var(--color-text-secondary)' }}>
                在弹出的菜单中找到此选项
              </div>
            </div>
          </div>

          {/* 关闭按钮 */}
          <button
            onClick={handleDismiss}
            style={{
              display: 'block',
              width: '100%',
              height: 44,
              borderRadius: 'var(--radius-md)',
              background: 'var(--color-primary)',
              color: '#fff',
              font: '600 15px/44px var(--font-family)',
              border: 'none',
            }}
          >
            我知道了
          </button>
        </div>
      </div>
    </>
  );
}
