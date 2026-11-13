import { TYPE_LABELS, TYPE_COLORS, isMultiPickType } from '../utils/question-types';
import { answerLetterSet } from '../services/practice';
import type { Question } from '../types';

interface PracticeQuestionCardProps {
  question: Question;
  /** 当前第几题（0 起） */
  index: number;
  /** 本组总题数 */
  total: number;
  /** 已选内容：选择题为字母数组（如 ['A','B']），判断题为 ['正确'] 或 ['错误'] */
  selectedLetters: string[];
  submitted: boolean;
  /** 提交后的判分结果，未提交为 null */
  correct: boolean | null;
  onSelect: (value: string) => void;
  onSubmit: () => void;
  onNext: () => void;
  isLast: boolean;
}

const CHOICE_LETTERS = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'];

export default function PracticeQuestionCard({
  question,
  index,
  total,
  selectedLetters,
  submitted,
  correct,
  onSelect,
  onSubmit,
  onNext,
  isLast,
}: PracticeQuestionCardProps) {
  const { sheetType, stem, options, answer } = question;
  const accent = TYPE_COLORS[sheetType];
  const isJudge = sheetType === 'judge';
  const answerSet = answerLetterSet(answer);
  const multiPick = isMultiPickType(sheetType);

  /** 计算选项行的样式状态 */
  function optionState(value: string): { bg: string; border: string; color: string; mark: string | null } {
    const isSelected = selectedLetters.includes(value);
    const isAnswer = isJudge ? answer === value : answerSet.has(value);
    if (submitted) {
      if (isAnswer) {
        return { bg: '#E8F5E9', border: '1.5px solid var(--color-success)', color: 'var(--color-text-primary)', mark: '✓' };
      }
      if (isSelected) {
        return { bg: '#FEE2E2', border: '1.5px solid var(--color-error)', color: 'var(--color-text-primary)', mark: '✗' };
      }
      return { bg: 'var(--color-surface)', border: '1px solid var(--color-divider)', color: 'var(--color-text-secondary)', mark: null };
    }
    if (isSelected) {
      return { bg: '#E3F2FD', border: '1.5px solid var(--color-primary)', color: 'var(--color-text-primary)', mark: null };
    }
    return { bg: 'var(--color-surface)', border: '1px solid var(--color-divider)', color: 'var(--color-text-primary)', mark: null };
  }

  /** 选项按钮（共用样式） */
  function optionButton(value: string, content: string) {
    const s = optionState(value);
    const markColor = s.mark === '✓' ? 'var(--color-success)' : 'var(--color-error)';
    return (
      <button
        key={value}
        onClick={() => onSelect(value)}
        disabled={submitted}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 'var(--space-sm)',
          width: '100%',
          textAlign: 'left',
          background: s.bg,
          border: s.border,
          borderRadius: 'var(--radius-sm)',
          padding: 'var(--space-md)',
          marginBottom: 'var(--space-sm)',
          color: s.color,
          font: 'var(--font-body)',
          lineHeight: 1.5,
          transition: 'all 0.15s ease',
          cursor: submitted ? 'default' : 'pointer',
        }}
      >
        <span style={{
          flexShrink: 0,
          width: 24,
          height: 24,
          borderRadius: 'var(--radius-full)',
          border: '1px solid var(--color-divider)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          font: 'var(--font-small)',
          fontWeight: 600,
          background: submitted && s.mark
            ? (s.mark === '✓' ? 'var(--color-success)' : 'var(--color-error)')
            : 'transparent',
          color: submitted && s.mark ? '#fff' : 'var(--color-text-primary)',
        }}>
          {value}
        </span>
        <span style={{ flex: 1 }}>{content}</span>
        {s.mark && (
          <span style={{ font: 'var(--font-h3)', color: markColor, flexShrink: 0 }}>{s.mark}</span>
        )}
      </button>
    );
  }

  return (
    <div>
      {/* 题型标签 + 原题号 + 进度 */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 'var(--space-sm)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-sm)' }}>
          <span style={{
            font: 'var(--font-small)',
            color: '#fff',
            background: accent,
            padding: '2px 10px',
            borderRadius: 'var(--radius-full)',
          }}>
            {TYPE_LABELS[sheetType]}
          </span>
          <span style={{ font: 'var(--font-caption)', color: 'var(--color-text-secondary)' }}>
            题号 {question.questionNumber}
          </span>
        </div>
        <span style={{ font: 'var(--font-small)', color: 'var(--color-text-secondary)' }}>
          第 {index + 1}/{total} 题
        </span>
      </div>

      {/* 进度条 */}
      <div style={{
        height: 4,
        background: '#E2E8F0',
        borderRadius: 'var(--radius-full)',
        marginBottom: 'var(--space-lg)',
        overflow: 'hidden',
      }}>
        <div style={{
          width: `${((index + 1) / total) * 100}%`,
          height: '100%',
          background: accent,
          borderRadius: 'var(--radius-full)',
          transition: 'width 0.25s ease',
        }} />
      </div>

      {/* 题干 */}
      <div style={{
        background: 'var(--color-surface)',
        borderRadius: 'var(--radius-md)',
        boxShadow: 'var(--shadow-card)',
        padding: 'var(--space-md)',
        marginBottom: 'var(--space-md)',
      }}>
        <div style={{ font: 'var(--font-body)', color: 'var(--color-text-primary)', lineHeight: 1.7 }}>
          {stem}
        </div>
      </div>

      {/* 选项 */}
      {isJudge ? (
        <div style={{ display: 'flex', gap: 'var(--space-sm)' }}>
          <div style={{ flex: 1 }}>{optionButton('正确', '正确')}</div>
          <div style={{ flex: 1 }}>{optionButton('错误', '错误')}</div>
        </div>
      ) : (
        <div>
          {multiPick && (
            <div style={{
              font: 'var(--font-caption)',
              color: 'var(--color-text-secondary)',
              marginBottom: 'var(--space-sm)',
            }}>
              {TYPE_LABELS[sheetType]}：可选多个选项
            </div>
          )}
          {options.map((opt, i) => optionButton(CHOICE_LETTERS[i], opt))}
        </div>
      )}

      {/* 判分反馈 + 正确答案 */}
      {submitted && (
        <div style={{
          marginTop: 'var(--space-md)',
          background: correct ? '#E8F5E9' : '#FEE2E2',
          borderRadius: 'var(--radius-sm)',
          padding: 'var(--space-md)',
        }}>
          <div style={{
            font: 'var(--font-h3)',
            color: correct ? 'var(--color-success)' : 'var(--color-error)',
          }}>
            {correct ? '✓ 回答正确' : '✗ 回答错误'}
          </div>
          <div style={{
            font: 'var(--font-caption)',
            color: 'var(--color-text-secondary)',
            margin: 'var(--space-xs) 0',
          }}>
            正确答案
          </div>
          {isJudge ? (
            <div style={{ font: '600 18px var(--font-family)', color: 'var(--color-success)' }}>
              {answer}
            </div>
          ) : (
            [...answerSet].sort().map(letter => {
              const idx = CHOICE_LETTERS.indexOf(letter);
              return (
                <div key={letter} style={{
                  font: 'var(--font-body)',
                  color: 'var(--color-text-primary)',
                  lineHeight: 1.6,
                  padding: '2px 0',
                }}>
                  <span style={{ fontWeight: 700, color: 'var(--color-success)' }}>{letter}</span>
                  <span>：{options[idx] ?? '（无内容）'}</span>
                </div>
              );
            })
          )}
        </div>
      )}

      {/* 操作按钮 */}
      {!submitted ? (
        <button
          onClick={onSubmit}
          disabled={selectedLetters.length === 0}
          style={{
            display: 'block',
            width: '100%',
            marginTop: 'var(--space-lg)',
            height: 48,
            borderRadius: 'var(--radius-md)',
            background: selectedLetters.length === 0 ? '#93C5FD' : 'var(--color-primary)',
            color: '#fff',
            font: '600 16px/48px var(--font-family)',
            cursor: selectedLetters.length === 0 ? 'not-allowed' : 'pointer',
            transition: 'background 0.15s ease',
          }}
        >
          提交答案
        </button>
      ) : (
        <button
          onClick={onNext}
          style={{
            display: 'block',
            width: '100%',
            marginTop: 'var(--space-lg)',
            height: 48,
            borderRadius: 'var(--radius-md)',
            background: 'var(--color-primary)',
            color: '#fff',
            font: '600 16px/48px var(--font-family)',
            cursor: 'pointer',
            transition: 'background 0.15s ease',
          }}
        >
          {isLast ? '查看成绩' : '下一题'}
        </button>
      )}
    </div>
  );
}
