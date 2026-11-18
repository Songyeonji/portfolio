import { useEffect, useRef } from 'react';

/**
 * 첫 화면(히어로) 뒤 부드러운 빛 번짐.
 * - 연한 주황·복숭아빛 원 두 개가 아주 천천히 떠다님 (CSS 애니메이션, transform만 사용)
 * - 아래로 갈수록 마스크로 사라져 본문 가독성에 영향 없음
 * - 화면 밖이면 애니메이션 정지 · '동작 줄이기'면 정지(CSS) · PDF/A4 모드에서는 렌더하지 않음
 * (마우스를 따라오는 빛은 페이지 전체용 CursorGlow가 담당)
 */
export function HeroBackground({ targetSelector = '.hero' }: { targetSelector?: string }) {
  const wrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const wrap = wrapRef.current;
    if (!wrap) return;

    const resize = () => {
      const hero = document.querySelector<HTMLElement>(targetSelector);
      const bottom = hero ? hero.getBoundingClientRect().bottom + window.scrollY : 700;
      wrap.style.height = `${Math.round(bottom + 200)}px`;
    };
    const io = new IntersectionObserver(([entry]) => wrap.classList.toggle('is-paused', !entry.isIntersecting));
    io.observe(wrap);
    const ro = new ResizeObserver(resize);
    const hero = document.querySelector(targetSelector);
    if (hero) ro.observe(hero);
    window.addEventListener('resize', resize);
    resize();
    return () => { io.disconnect(); ro.disconnect(); window.removeEventListener('resize', resize); };
  }, [targetSelector]);

  return (
    <div ref={wrapRef} className="hero-bg no-print" aria-hidden="true">
      <div className="hero-glow hero-glow--a" />
      <div className="hero-glow hero-glow--b" />
    </div>
  );
}
