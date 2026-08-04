import { useState } from 'react';
import { getApiKey, saveApiKey, clearApiKey } from '../services/openai-ocr';

export default function SettingsPage() {
  const [apiKey, setApiKey] = useState(() => getApiKey() || '');
  const [saved, setSaved] = useState(!!getApiKey());
  const [message, setMessage] = useState('');

  function handleSave() {
    if (!apiKey.trim()) {
      setMessage('请输入 API Key');
      return;
    }
    saveApiKey(apiKey);
    setSaved(true);
    setMessage('API Key 已保存');
    setTimeout(() => setMessage(''), 3000);
  }

  function handleClear() {
    clearApiKey();
    setApiKey('');
    setSaved(false);
    setMessage('API Key 已清除');
    setTimeout(() => setMessage(''), 3000);
  }

  return (
    <div className="page">
      <div className="page-header">
        <h1 className="page-title">设置</h1>
        <p className="page-subtitle">配置 OpenRouter API Key，调用 GPT-4o-mini</p>
      </div>

      {/* 状态卡片 */}
      <div style={{
        background: saved ? '#E8F5E9' : '#FFF3E0',
        borderRadius: 'var(--radius-md)',
        padding: 'var(--space-md) var(--space-lg)',
        marginBottom: 'var(--space-lg)',
        display: 'flex',
        alignItems: 'center',
        gap: 'var(--space-sm)',
        font: 'var(--font-body)',
      }}>
        <span>{saved ? '✅' : '⚠️'}</span>
        <span style={{ color: saved ? '#2E7D32' : '#E65100' }}>
          {saved ? 'API Key 已配置，可以正常搜题' : '尚未配置 API Key，搜题功能不可用'}
        </span>
      </div>

      {/* API Key 输入 */}
      <div style={{
        background: 'var(--color-surface)',
        borderRadius: 'var(--radius-md)',
        padding: 'var(--space-lg)',
        boxShadow: 'var(--shadow-card)',
      }}>
        <label style={{
          display: 'block',
          font: 'var(--font-body)',
          color: 'var(--color-text-primary)',
          marginBottom: 'var(--space-sm)',
        }}>
          OpenRouter API Key
        </label>
        <input
          type="password"
          value={apiKey}
          onChange={e => setApiKey(e.target.value)}
          placeholder="sk-..."
          style={{
            width: '100%',
            height: 44,
            padding: '0 var(--space-md)',
            border: '1px solid var(--color-divider)',
            borderRadius: 'var(--radius-sm)',
            font: 'var(--font-body)',
            outline: 'none',
            boxSizing: 'border-box',
          }}
        />

        {/* 操作按钮 */}
        <div style={{
          display: 'flex',
          gap: 'var(--space-md)',
          marginTop: 'var(--space-md)',
        }}>
          <button
            onClick={handleSave}
            style={{
              flex: 1,
              height: 44,
              borderRadius: 'var(--radius-md)',
              background: 'var(--color-primary)',
              color: '#fff',
              font: '600 15px/44px var(--font-family)',
              border: 'none',
            }}
          >
            保存
          </button>
          {saved && (
            <button
              onClick={handleClear}
              style={{
                height: 44,
                padding: '0 var(--space-md)',
                borderRadius: 'var(--radius-md)',
                background: 'none',
                color: 'var(--color-error)',
                font: 'var(--font-body)',
                border: '1px solid var(--color-error)',
              }}
            >
              清除
            </button>
          )}
        </div>

        {/* 消息 */}
        {message && (
          <div style={{
            marginTop: 'var(--space-sm)',
            font: 'var(--font-caption)',
            color: 'var(--color-text-secondary)',
          }}>
            {message}
          </div>
        )}
      </div>

      {/* 获取 Key 的指引 */}
      <div style={{
        marginTop: 'var(--space-xl)',
        padding: 'var(--space-lg)',
      }}>
        <h3 style={{ font: 'var(--font-h3)', marginBottom: 'var(--space-sm)' }}>如何获取 API Key？</h3>
        <ol style={{
          font: 'var(--font-caption)',
          color: 'var(--color-text-secondary)',
          paddingLeft: 'var(--space-lg)',
          lineHeight: 2,
        }}>
          <li>访问 <a href="https://openrouter.ai/keys" style={{ color: 'var(--color-primary)' }}>openrouter.ai/keys</a> 注册并充值</li>
          <li>进入「Keys」页面，点击「Create Key」</li>
          <li>复制生成的 Key（以 sk-or-v1- 开头）</li>
          <li>粘贴到上方输入框并保存</li>
        </ol>
      </div>
    </div>
  );
}
