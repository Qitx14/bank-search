import type { Question } from '../types';
import { TYPE_LABELS, TYPE_COLORS, isMultiPickType, letterToIndex, splitAnswer } from '../utils/question-types';

interface AnswerCardProps {
  question: Question;
  score: number;
  /** 考试时应选的选项字母（图片中正确选项的标签） */
  examAnswer?: string;
  /** 正确选项的文字内容 */
  examAnswerContent?: string;
  /** 展示完整题干（默认截短 120 字） */
  fullStem?: boolean;
}

export default function AnswerCard({ question, score, examAnswer, examAnswerContent, fullStem }: AnswerCardProps) {
  const { sheetType, stem, answer, options } = question;
  const typeLabel = TYPE_LABELS[sheetType];
  const accentColor = TYPE_COLORS[sheetType];
  const scorePercent = Math.round(score * 100);

  /** 获取某个选项字母对应的完整内容 */
  function getOptionContent(letter: string): string {
    const idx = letterToIndex(letter);
    return options[idx] ?? '';
  }

  // ===== 考试导向模式：有 examAnswer 时显示简洁答案 =====
  if (examAnswer && examAnswerContent) {
    return (
      <div style={{
        background: 'var(--color-surface)',
        borderRadius: 'var(--radius-md)',
        boxShadow: 'var(--shadow-card)',
        overflow: 'hidden',
      }}>
        {/* 头部 */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: 'var(--space-sm) var(--space-md)',
          borderBottom: '1px solid var(--color-divider)',
        }}>
          <span style={{
            font: 'var(--font-small)',
            color: '#fff',
            background: accentColor,
            padding: '2px 10px',
            borderRadius: 'var(--radius-full)',
          }}>
            {typeLabel}
          </span>
          <span style={{
            font: 'var(--font-caption)',
            color: score >= 0.7 ? 'var(--color-success)' : score >= 0.4 ? 'var(--color-warning)' : 'var(--color-error)',
          }}>
            匹配度 {scorePercent}%
          </span>
        </div>

        {/* 题干（截短显示） */}
        <div style={{ padding: 'var(--space-md)' }}>
          <div style={{
            font: 'var(--font-caption)',
            color: 'var(--color-text-secondary)',
            marginBottom: 'var(--space-xs)',
          }}>
            题目
          </div>
          <div style={{
            font: 'var(--font-body)',
            color: 'var(--color-text-primary)',
            lineHeight: 1.6,
          }}>
            {fullStem ? stem : stem.length > 120 ? stem.slice(0, 120) + '...' : stem}
          </div>
        </div>

        {/* 考试答案 */}
        <div style={{
          margin: '0 var(--space-md) var(--space-md)',
          background: '#E8F5E9',
          borderRadius: 'var(--radius-sm)',
          padding: 'var(--space-md)',
          textAlign: sheetType === 'multiple' ? 'left' : 'center',
        }}>
          <div style={{
            font: 'var(--font-caption)',
            color: 'var(--color-success)',
            marginBottom: 'var(--space-sm)',
          }}>
            应选
          </div>

          {/* 多选题/案例分析：逐条显示 A：xxx / C：xxx */}
          {isMultiPickType(sheetType) ? (() => {
            const labels = examAnswer.split('');
            const contents = examAnswerContent.split('；');
            return labels.map((label, i) => (
              <div key={label} style={{
                font: 'var(--font-body)',
                color: 'var(--color-text-primary)',
                lineHeight: 1.6,
                padding: '2px 0',
              }}>
                <span style={{ fontWeight: 700, color: 'var(--color-success)' }}>{label}</span>
                <span>：{contents[i] || ''}</span>
              </div>
            ));
          })() : (
            <>
              <div style={{
                font: '700 32px var(--font-family)',
                color: 'var(--color-success)',
                marginBottom: 'var(--space-sm)',
              }}>
                {examAnswer}
              </div>
              {/* 判断题「正确」即内容，避免重复显示 */}
              {examAnswerContent && examAnswerContent !== examAnswer && (
                <div style={{
                  font: 'var(--font-body)',
                  color: 'var(--color-text-primary)',
                  lineHeight: 1.5,
                }}>
                  {examAnswerContent}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    );
  }

  // ===== 回退模式：完整展示（题库导向，无 examAnswer 时） =====
  return (
    <div style={{
      background: 'var(--color-surface)',
      borderRadius: 'var(--radius-md)',
      boxShadow: 'var(--shadow-card)',
      overflow: 'hidden',
    }}>
      {/* 头部：题型标签 + 匹配度 */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 'var(--space-sm) var(--space-md)',
        borderBottom: '1px solid var(--color-divider)',
      }}>
        <span style={{
          font: 'var(--font-small)',
          color: '#fff',
          background: accentColor,
          padding: '2px 10px',
          borderRadius: 'var(--radius-full)',
        }}>
          {typeLabel}
        </span>
        <span style={{
          font: 'var(--font-caption)',
          color: score >= 0.7 ? 'var(--color-success)' : score >= 0.4 ? 'var(--color-warning)' : 'var(--color-error)',
        }}>
          匹配度 {scorePercent}%
        </span>
      </div>

      {/* 题干 */}
      <div style={{ padding: 'var(--space-md)' }}>
        <div style={{
          font: 'var(--font-caption)',
          color: 'var(--color-text-secondary)',
          marginBottom: 'var(--space-xs)',
        }}>
          题目
        </div>
        <div style={{
          font: 'var(--font-body)',
          color: 'var(--color-text-primary)',
          lineHeight: 1.6,
        }}>
          {stem}
        </div>
      </div>

      {/* 答案区域 */}
      <div style={{
        margin: '0 var(--space-md) var(--space-md)',
        background: '#E8F5E9',
        borderRadius: 'var(--radius-sm)',
        padding: 'var(--space-md)',
      }}>
        <div style={{
          font: 'var(--font-small)',
          color: 'var(--color-success)',
          marginBottom: 'var(--space-sm)',
        }}>
          正确答案
        </div>

        {/* 判断题 */}
        {sheetType === 'judge' && (
          <div style={{
            font: '600 18px var(--font-family)',
            color: answer === '正确' ? 'var(--color-success)' : 'var(--color-error)',
          }}>
            {answer}
          </div>
        )}

        {/* 单选题 */}
        {sheetType === 'single' && (
          <div style={{ font: 'var(--font-body)', color: 'var(--color-text-primary)' }}>
            <span style={{ fontWeight: 600, color: 'var(--color-success)' }}>{answer}</span>
            {getOptionContent(answer) && (
              <span>. {getOptionContent(answer)}</span>
            )}
          </div>
        )}

        {/* 多选题 / 案例分析 */}
        {isMultiPickType(sheetType) && (
          <div>
            <div style={{
              font: 'var(--font-body)',
              fontWeight: 600,
              color: 'var(--color-success)',
              marginBottom: 'var(--space-xs)',
            }}>
              {answer}
            </div>
            {splitAnswer(answer).map(letter => (
              <div key={letter} style={{
                font: 'var(--font-body)',
                color: 'var(--color-text-primary)',
                marginTop: 2,
              }}>
                {letter}. {getOptionContent(letter) || '（无内容）'}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 全部选项参考（仅单选/多选显示） */}
      {sheetType !== 'judge' && options.length > 0 && (
        <div style={{
          padding: '0 var(--space-md) var(--space-md)',
        }}>
          <div style={{
            font: 'var(--font-caption)',
            color: 'var(--color-text-secondary)',
            marginBottom: 'var(--space-xs)',
          }}>
            全部选项
          </div>
          {options.map((opt, i) => {
            const letter = String.fromCharCode(65 + i);
            const isAnswer = isMultiPickType(sheetType)
              ? splitAnswer(answer).includes(letter)
              : answer === letter;

            return (
              <div key={i} style={{
                font: 'var(--font-small)',
                color: isAnswer ? 'var(--color-success)' : 'var(--color-text-secondary)',
                padding: 'var(--space-xs) 0',
                fontWeight: isAnswer ? 600 : 400,
              }}>
                {letter}. {opt}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
