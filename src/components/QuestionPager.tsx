import { useEffect, useRef, useState } from 'react';
import type { SearchResult } from '../types';
import AnswerCard from './AnswerCard';

interface QuestionPagerProps {
  results: SearchResult[];
}

/**
 * 搜题结果分页组件
 * 左右滑动切换题目（CSS scroll-snap 原生滑动），底部数字导航跳页
 * 每页一道题：题干 + 正确答案选项
 */
export default function QuestionPager({ results }: QuestionPagerProps) {
  const slidesRef = useRef<HTMLDivElement>(null);
  const navRef = useRef<HTMLDivElement>(null);
  const [activeIndex, setActiveIndex] = useState(0);

  const total = results.length;

  /** 滑动时计算当前页（接近吸附点才更新，避免动画过程中频繁跳号） */
  function handleScroll() {
    const el = slidesRef.current;
    if (!el) return;
    const raw = el.scrollLeft / el.clientWidth;
    if (Math.abs(raw - Math.round(raw)) < 0.15) {
      const idx = Math.min(total - 1, Math.max(0, Math.round(raw)));
      setActiveIndex(idx);
    }
  }

  /** 点击数字导航跳页 */
  function goTo(index: number) {
    const el = slidesRef.current;
    if (!el) return;
    el.scrollTo({ left: index * el.clientWidth, behavior: 'smooth' });
    setActiveIndex(index);
  }

  // 当前页数字自动滚入视野
  useEffect(() => {
    const nav = navRef.current;
    if (!nav) return;
    const btn = nav.children[activeIndex] as HTMLElement | undefined;
    btn?.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
  }, [activeIndex]);

  return (
    <div className="question-pager">
      <div className="question-pager__slides" ref={slidesRef} onScroll={handleScroll}>
        {results.map((item, idx) => (
          <section
            className="question-pager__slide"
            key={`${item.imageIndex}-${item.questionIndex}`}
          >
            {/* 题头：题号 + 来源照片 */}
            <div className="question-pager__head">
              <span className="question-pager__badge">第 {idx + 1} / {total} 题</span>
              <span className="question-pager__source">第 {item.imageIndex + 1} 张照片</span>
            </div>

            {item.error ? (
              <div className="question-pager__empty">
                <div className="question-pager__empty-title">识别失败</div>
                <div className="question-pager__empty-text">{item.error}</div>
              </div>
            ) : item.matches.length > 0 ? (
              <AnswerCard
                question={item.matches[0].question}
                score={item.matches[0].score}
                examAnswer={item.examAnswer}
                examAnswerContent={item.examAnswerContent}
                fullStem
              />
            ) : (
              <div className="question-pager__empty">
                <div className="question-pager__empty-title">未匹配到题目</div>
                <div className="question-pager__empty-text">
                  {item.extractedText || '(未识别到文字)'}
                </div>
              </div>
            )}
          </section>
        ))}
      </div>

      {/* 数字导航 */}
      <div className="question-pager__nav" ref={navRef}>
        {results.map((_, i) => (
          <button
            key={i}
            className={`question-pager__num${i === activeIndex ? ' question-pager__num--active' : ''}`}
            onClick={() => goTo(i)}
            aria-label={`第 ${i + 1} 题`}
          >
            {i + 1}
          </button>
        ))}
      </div>
    </div>
  );
}
