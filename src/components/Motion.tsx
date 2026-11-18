import { useEffect, useLayoutEffect, useRef, type RefObject } from 'react';

/** 상단 읽기 진행 바 (스크롤 비율만큼 주황 선이 참) */
export function ScrollProgress() {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    let raf = 0;
    const update = () => {
      raf = 0;
      const el = document.documentElement;
      const max = el.scrollHeight - el.clientHeight;
      ref.current?.style.setProperty('--progress', String(max > 0 ? Math.min(1, el.scrollTop / max) : 0));
    };
    const onScroll = () => { if (!raf) raf = requestAnimationFrame(update); };
    update();
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);
    return () => { window.removeEventListener('scroll', onScroll); window.removeEventListener('resize', onScroll); cancelAnimationFrame(raf); };
  }, []);
  return <div ref={ref} className="scroll-progress no-print" aria-hidden="true" />;
}

/** 스크롤 등장 효과 대상 (히어로는 제외 · 처음부터 보이는 건 바로 표시) */
const REVEAL = '.sec-head, .about-card, .mot-heading, .mot-body, .skill-row, .job, .tile, .edu-group';

/**
 * 화면에 들어올 때 살짝 떠오르며 나타남 (한 번만).
 * React가 관리하지 않는 data-reveal 속성을 써서 리렌더에도 상태가 지워지지 않음.
 * 편집 모드·A4 모드·'동작 줄이기'에서는 꺼짐.
 */
export function useReveal(root: RefObject<HTMLElement | null>, enabled: boolean) {
  const io = useRef<IntersectionObserver | null>(null);

  const scan = () => {
    const obs = io.current;
    if (!obs || !root.current) return;
    root.current.querySelectorAll<HTMLElement>(REVEAL).forEach((el) => {
      if (el.dataset.reveal === 'in') return;
      el.dataset.reveal = 'wait';
      obs.observe(el);   // 같은 요소를 다시 observe해도 안전 (중복 등록 안 됨)
    });
  };

  useEffect(() => {
    const on = enabled && !matchMedia('(prefers-reduced-motion: reduce)').matches && 'IntersectionObserver' in window;
    document.documentElement.classList.toggle('reveal-on', on);
    if (!on) { io.current?.disconnect(); io.current = null; return; }
    io.current = new IntersectionObserver((entries) => {
      entries.forEach((e) => {
        if (!e.isIntersecting) return;
        (e.target as HTMLElement).dataset.reveal = 'in';
        io.current?.unobserve(e.target);
      });
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0.08 });
    scan();
    // 꺼질 때(편집·A4 전환)는 html.reveal-on 이 빠지면서 CSS상 모두 보임
    return () => { io.current?.disconnect(); io.current = null; };
  }, [enabled]);

  // 렌더될 때마다 새로 생긴 요소도 관찰 (프로젝트 추가 등)
  useLayoutEffect(scan);
}
