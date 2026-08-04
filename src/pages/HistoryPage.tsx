import { useEffect, useState } from 'react';
import { getSearchRecords, deleteSearchRecord, clearSearchRecords } from '../services/db';
import AnswerCard from '../components/AnswerCard';
import type { SearchRecord } from '../types';

export default function HistoryPage() {
  const [records, setRecords] = useState<SearchRecord[]>([]);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  useEffect(() => {
    loadRecords();
  }, []);

  async function loadRecords() {
    const list = await getSearchRecords(50);
    setRecords(list);
  }

  async function handleDelete(id: string) {
    await deleteSearchRecord(id);
    setRecords(prev => prev.filter(r => r.id !== id));
    if (expandedId === id) setExpandedId(null);
  }

  async function handleClearAll() {
    if (!confirm('确定要清空所有搜索记录吗？此操作不可撤销。')) return;
    await clearSearchRecords();
    setRecords([]);
    setExpandedId(null);
  }

  function toggleExpand(id: string) {
    setExpandedId(prev => prev === id ? null : id);
  }

  // 空状态
  if (records.length === 0) {
    return (
      <div className="page">
        <div className="page-header">
          <h1 className="page-title">历史</h1>
          <p className="page-subtitle">查看过往的搜题记录</p>
        </div>
        <div style={{
          background: 'var(--color-surface)',
          borderRadius: 'var(--radius-md)',
          padding: 'var(--space-2xl) var(--space-lg)',
          textAlign: 'center',
          boxShadow: 'var(--shadow-card)',
        }}>
          <div style={{
            width: 64,
            height: 64,
            borderRadius: 'var(--radius-full)',
            background: '#E3F2FD',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto var(--space-lg)',
            color: 'var(--color-text-secondary)',
          }}>
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor"
              strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10" />
              <path d="M12 6v6l4 2" />
            </svg>
          </div>
          <p style={{ font: 'var(--font-body)', color: 'var(--color-text-secondary)' }}>
            暂无搜索记录
          </p>
          <p style={{ font: 'var(--font-caption)', color: 'var(--color-text-secondary)', marginTop: 'var(--space-xs)' }}>
            完成搜索后会自动保存在这里
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="page">
      <div className="page-header" style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
      }}>
        <div>
          <h1 className="page-title">历史</h1>
          <p className="page-subtitle">共 {records.length} 条搜题记录</p>
        </div>
        <button
          onClick={handleClearAll}
          style={{
            font: 'var(--font-caption)',
            color: 'var(--color-error)',
            background: 'none',
            border: '1px solid var(--color-error)',
            borderRadius: 'var(--radius-sm)',
            padding: '4px 12px',
            marginTop: 'var(--space-lg)',
            whiteSpace: 'nowrap',
          }}
        >
          清空全部
        </button>
      </div>

      {records.map(record => {
        const matchedCount = record.results.filter(r => r.matches.length > 0).length;
        const isExpanded = expandedId === record.id;

        return (
          <div key={record.id} style={{
            background: 'var(--color-surface)',
            borderRadius: 'var(--radius-md)',
            boxShadow: 'var(--shadow-card)',
            marginBottom: 'var(--space-md)',
            overflow: 'hidden',
          }}>
            {/* 记录摘要 */}
            <button
              onClick={() => toggleExpand(record.id)}
              style={{
                width: '100%',
                display: 'flex',
                alignItems: 'center',
                gap: 'var(--space-md)',
                padding: 'var(--space-md)',
                background: 'none',
                border: 'none',
                textAlign: 'left',
              }}
            >
              {/* 第一张缩略图 */}
              {record.imageDataUrls[0] && (
                <img
                  src={record.imageDataUrls[0]}
                  alt=""
                  style={{
                    width: 48,
                    height: 64,
                    objectFit: 'cover',
                    borderRadius: 'var(--radius-sm)',
                    flexShrink: 0,
                  }}
                />
              )}

              {/* 信息 */}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{
                  font: 'var(--font-caption)',
                  color: 'var(--color-text-secondary)',
                }}>
                  {new Date(record.searchedAt).toLocaleString('zh-CN')}
                </div>
                <div style={{
                  font: 'var(--font-body)',
                  color: 'var(--color-text-primary)',
                  marginTop: 'var(--space-xs)',
                }}>
                  {record.results.length} 张图片
                  <span style={{ color: 'var(--color-success)', marginLeft: 'var(--space-sm)' }}>
                    {matchedCount} 张匹配
                  </span>
                </div>
              </div>

              {/* 展开箭头 */}
              <svg
                width="20" height="20" viewBox="0 0 24 24"
                fill="none" stroke="var(--color-text-secondary)" strokeWidth="2"
                strokeLinecap="round" strokeLinejoin="round"
                style={{
                  flexShrink: 0,
                  transform: isExpanded ? 'rotate(180deg)' : 'rotate(0deg)',
                  transition: 'transform 0.2s ease',
                }}
              >
                <polyline points="6 9 12 15 18 9" />
              </svg>
            </button>

            {/* 展开详情 */}
            {isExpanded && (
              <div style={{
                borderTop: '1px solid var(--color-divider)',
                padding: 'var(--space-md)',
              }}>
                {record.results.map((item) => (
                  <div key={item.imageIndex} style={{
                    marginBottom: 'var(--space-md)',
                  }}>
                    {/* 缩略图 + OCR 文字 */}
                    <div style={{
                      display: 'flex',
                      gap: 'var(--space-md)',
                      marginBottom: 'var(--space-sm)',
                      alignItems: 'flex-start',
                    }}>
                      <img
                        src={item.imageDataUrl}
                        alt=""
                        style={{
                          width: 48,
                          height: 64,
                          objectFit: 'cover',
                          borderRadius: 'var(--radius-sm)',
                          flexShrink: 0,
                        }}
                      />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{
                          font: 'var(--font-small)',
                          color: 'var(--color-primary)',
                          marginBottom: 'var(--space-xs)',
                        }}>
                          第 {item.imageIndex + 1} 张
                        </div>
                        {item.error ? (
                          <div style={{
                            font: 'var(--font-caption)',
                            color: 'var(--color-error)',
                          }}>
                            {item.error}
                          </div>
                        ) : (
                          <div style={{
                            font: 'var(--font-caption)',
                            color: 'var(--color-text-secondary)',
                            background: '#F8FAFC',
                            borderRadius: 'var(--radius-sm)',
                            padding: 'var(--space-xs) var(--space-sm)',
                            maxHeight: 60,
                            overflow: 'hidden',
                          }}>
                            {item.extractedText || '(未识别到文字)'}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* 答案卡片 */}
                    {!item.error && item.matches.length > 0 ? (
                      item.matches.slice(0, 1).map((match, mIdx) => (
                        <AnswerCard key={mIdx} question={match.question} score={match.score} />
                      ))
                    ) : !item.error ? (
                      <div style={{
                        textAlign: 'center',
                        padding: 'var(--space-sm)',
                        font: 'var(--font-caption)',
                        color: 'var(--color-text-secondary)',
                      }}>
                        未匹配到题目
                      </div>
                    ) : null}
                  </div>
                ))}

                {/* 删除按钮 */}
                <button
                  onClick={() => handleDelete(record.id)}
                  style={{
                    display: 'block',
                    width: '100%',
                    height: 36,
                    marginTop: 'var(--space-sm)',
                    background: 'none',
                    border: '1px solid var(--color-error)',
                    borderRadius: 'var(--radius-sm)',
                    color: 'var(--color-error)',
                    font: 'var(--font-caption)',
                  }}
                >
                  删除此记录
                </button>
              </div>
            )}
          </div>
        );
      })}

      <div style={{ height: 'var(--space-2xl)' }} />
    </div>
  );
}
