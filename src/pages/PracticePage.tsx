import { useEffect, useState } from 'react';
import { NavLink } from 'react-router-dom';
import { getBankMeta, getQuestionCounts } from '../services/db';
import { pickPracticeQuestions, judgeAnswer, PRACTICE_SIZE } from '../services/practice';
import { isMultiPickType } from '../utils/question-types';
import PracticeQuestionCard from '../components/PracticeQuestionCard';
import type { Question, QuestionCounts, SheetType } from '../types';

type Phase = 'idle' | 'answering' | 'finished';

/** 单题作答记录（成绩页统计用） */
interface SessionRecord {
  question: Question;
  userAnswer: string;
  correct: boolean;
}

/** 一次练习会话（仅存内存，退出即丢弃） */
interface Session {
  questions: Question[];
  index: number;
  selected: string[];
  submitted: boolean;
  correct: boolean | null;
  records: SessionRecord[];
}

const FILTERS: { value: SheetType; label: string }[] = [
  { value: 'single', label: '单选题' },
  { value: 'multiple', label: '多选题' },
  { value: 'judge', label: '判断题' },
  { value: 'case', label: '案例分析' },
];

export default function PracticePage() {
  const [phase, setPhase] = useState<Phase>('idle');
  const [counts, setCounts] = useState<QuestionCounts | null>(null);
  const [fileName, setFileName] = useState<string>('');
  const [activeTypes, setActiveTypes] = useState<Set<SheetType>>(
    () => new Set(FILTERS.map(f => f.value)),
  );
  const [session, setSession] = useState<Session | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadBankInfo();
  }, []);

  async function loadBankInfo() {
    const meta = await getBankMeta();
    if (meta) setFileName(meta.fileName);
    const c = await getQuestionCounts();
    setCounts(c);
  }

  const hasBank = counts !== null && counts.single + counts.multiple + counts.judge + counts.case > 0;
  const poolTotal = counts
    ? FILTERS.filter(f => activeTypes.has(f.value)).reduce((sum, f) => sum + counts[f.value], 0)
    : 0;

  function toggleType(type: SheetType) {
    setActiveTypes(prev => {
      const next = new Set(prev);
      if (next.has(type)) {
        if (next.size > 1) next.delete(type); // 至少保留一种题型
      } else {
        next.add(type);
      }
      return next;
    });
  }

  /** 开始一组练习：过滤 → 洗牌 → 抽题 */
  async function startPractice() {
    const types = FILTERS.filter(f => activeTypes.has(f.value)).map(f => f.value);
    try {
      const questions = await pickPracticeQuestions(types);
      if (questions.length === 0) {
        setError('所选题型暂无题目');
        return;
      }
      setError(null);
      setSession({ questions, index: 0, selected: [], submitted: false, correct: null, records: [] });
      setPhase('answering');
    } catch (err) {
      setError(err instanceof Error ? err.message : '抽题失败');
    }
  }

  function handleSelect(value: string) {
    if (!session || session.submitted) return;
    const q = session.questions[session.index];
    let selected: string[];
    if (isMultiPickType(q.sheetType)) {
      selected = session.selected.includes(value)
        ? session.selected.filter(v => v !== value)
        : [...session.selected, value];
      selected.sort();
    } else {
      selected = [value];
    }
    setSession({ ...session, selected });
  }

  function handleSubmit() {
    if (!session || session.submitted || session.selected.length === 0) return;
    const q = session.questions[session.index];
    const userAnswer = q.sheetType === 'judge' ? session.selected[0] : session.selected.join('');
    const correct = judgeAnswer(q, userAnswer);
    setSession({
      ...session,
      submitted: true,
      correct,
      records: [...session.records, { question: q, userAnswer, correct }],
    });
  }

  function handleNext() {
    if (!session) return;
    if (session.index + 1 >= session.questions.length) {
      setPhase('finished');
      return;
    }
    setSession({ ...session, index: session.index + 1, selected: [], submitted: false, correct: null });
  }

  function handleAgain() {
    void startPractice();
  }

  function handleBackToStart() {
    setPhase('idle');
    setSession(null);
  }

  // ===== 答题中 =====
  if (phase === 'answering' && session) {
    const q = session.questions[session.index];
    return (
      <div className="page">
        <div className="page-header" style={{ paddingBottom: 'var(--space-md)' }}>
          <h1 className="page-title">练习</h1>
        </div>
        <PracticeQuestionCard
          question={q}
          index={session.index}
          total={session.questions.length}
          selectedLetters={session.selected}
          submitted={session.submitted}
          correct={session.correct}
          onSelect={handleSelect}
          onSubmit={handleSubmit}
          onNext={handleNext}
          isLast={session.index + 1 >= session.questions.length}
        />
      </div>
    );
  }

  // ===== 成绩页 =====
  if (phase === 'finished' && session) {
    const score = session.records.filter(r => r.correct).length;
    const total = session.records.length;
    const percent = total > 0 ? Math.round((score / total) * 100) : 0;
    const pass = percent >= 60;
    return (
      <div className="page">
        <div className="page-header" style={{ paddingBottom: 'var(--space-md)' }}>
          <h1 className="page-title">练习</h1>
        </div>

        <div style={{
          background: 'var(--color-surface)',
          borderRadius: 'var(--radius-md)',
          boxShadow: 'var(--shadow-card)',
          padding: 'var(--space-2xl) var(--space-lg)',
          textAlign: 'center',
        }}>
          <div style={{ font: 'var(--font-caption)', color: 'var(--color-text-secondary)' }}>
            本次得分
          </div>
          <div style={{
            font: '700 48px/1.2 var(--font-family)',
            color: pass ? 'var(--color-success)' : 'var(--color-error)',
            marginTop: 'var(--space-sm)',
          }}>
            {score}<span style={{ font: 'var(--font-h2)', color: 'var(--color-text-secondary)' }}> / {total}</span>
          </div>
          <div style={{ font: 'var(--font-body)', color: pass ? 'var(--color-success)' : 'var(--color-error)', marginTop: 'var(--space-xs)' }}>
            {pass ? '及格，继续保持！' : '再接再厉！'}（正确率 {percent}%）
          </div>
        </div>

        <div style={{ display: 'flex', gap: 'var(--space-sm)', marginTop: 'var(--space-xl)' }}>
          <button
            onClick={handleAgain}
            style={{
              flex: 1,
              height: 48,
              borderRadius: 'var(--radius-md)',
              background: 'var(--color-primary)',
              color: '#fff',
              font: '600 16px/48px var(--font-family)',
            }}
          >
            再来一组
          </button>
          <button
            onClick={handleBackToStart}
            style={{
              flex: 1,
              height: 48,
              borderRadius: 'var(--radius-md)',
              background: 'var(--color-surface)',
              color: 'var(--color-primary)',
              font: '600 16px/48px var(--font-family)',
              border: '1px solid var(--color-primary)',
            }}
          >
            返回
          </button>
        </div>
      </div>
    );
  }

  // ===== 开始页 / 空状态 =====
  return (
    <div className="page">
      <div className="page-header">
        <h1 className="page-title">练习</h1>
        <p className="page-subtitle">
          {hasBank ? '每组随机 10 题，提交后立即显示正确答案' : '导入题库后即可开始练习'}
        </p>
      </div>

      {error && (
        <div style={{
          background: '#FEF3C7',
          color: '#92400E',
          font: 'var(--font-caption)',
          padding: 'var(--space-sm) var(--space-md)',
          borderRadius: 'var(--radius-sm)',
          marginBottom: 'var(--space-md)',
        }}>
          {error}
        </div>
      )}

      {counts === null ? (
        <p style={{ font: 'var(--font-body)', color: 'var(--color-text-secondary)' }}>加载中...</p>
      ) : !hasBank ? (
        <div style={{
          background: 'var(--color-surface)',
          borderRadius: 'var(--radius-md)',
          boxShadow: 'var(--shadow-card)',
          padding: 'var(--space-2xl) var(--space-lg)',
          textAlign: 'center',
        }}>
          <div style={{ font: 'var(--font-body)', color: 'var(--color-text-secondary)', lineHeight: 1.7 }}>
            还没有题库
          </div>
          <div style={{ font: 'var(--font-caption)', color: 'var(--color-text-secondary)', marginTop: 'var(--space-xs)' }}>
            先到「题库」页导入 .xlsx 或 .docx 题库文件
          </div>
          <NavLink to="/library">
            <button style={{
              marginTop: 'var(--space-lg)',
              height: 48,
              padding: '0 var(--space-2xl)',
              borderRadius: 'var(--radius-md)',
              background: 'var(--color-primary)',
              color: '#fff',
              font: '600 16px/48px var(--font-family)',
            }}>
              去导入题库
            </button>
          </NavLink>
        </div>
      ) : (
        <>
          {/* 题型过滤 */}
          <div style={{
            font: 'var(--font-small)',
            color: 'var(--color-text-secondary)',
            marginBottom: 'var(--space-sm)',
          }}>
            题型范围（共 {poolTotal} 题可选）
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--space-sm)', marginBottom: 'var(--space-lg)' }}>
            {FILTERS.map(f => {
              const active = activeTypes.has(f.value);
              const n = counts[f.value];
              return (
                <button
                  key={f.value}
                  onClick={() => toggleType(f.value)}
                  style={{
                    padding: 'var(--space-sm) var(--space-md)',
                    borderRadius: 'var(--radius-full)',
                    font: 'var(--font-small)',
                    background: active ? '#E3F2FD' : 'var(--color-surface)',
                    border: active ? '1.5px solid var(--color-primary)' : '1px solid var(--color-divider)',
                    color: active ? 'var(--color-primary)' : 'var(--color-text-secondary)',
                    transition: 'all 0.15s ease',
                  }}
                >
                  {f.label} · {n}
                </button>
              );
            })}
          </div>

          {/* 开始按钮 */}
          <button
            onClick={() => void startPractice()}
            disabled={poolTotal === 0}
            style={{
              display: 'block',
              width: '100%',
              maxWidth: 360,
              margin: '0 auto',
              height: 48,
              borderRadius: 'var(--radius-md)',
              background: poolTotal === 0 ? '#93C5FD' : 'var(--color-primary)',
              color: '#fff',
              font: '600 16px/48px var(--font-family)',
              cursor: poolTotal === 0 ? 'not-allowed' : 'pointer',
              transition: 'background 0.15s ease',
            }}
          >
            开始练习（{Math.min(poolTotal, PRACTICE_SIZE)} 题）
          </button>

          {poolTotal > 0 && poolTotal < PRACTICE_SIZE && (
            <p style={{
              font: 'var(--font-caption)',
              color: 'var(--color-text-secondary)',
              textAlign: 'center',
              marginTop: 'var(--space-sm)',
            }}>
              所选范围不足 {PRACTICE_SIZE} 题，将全部练习
            </p>
          )}

          {fileName && (
            <p style={{
              font: 'var(--font-caption)',
              color: 'var(--color-text-secondary)',
              textAlign: 'center',
              marginTop: 'var(--space-xl)',
            }}>
              当前题库：{fileName}
            </p>
          )}
        </>
      )}
    </div>
  );
}
