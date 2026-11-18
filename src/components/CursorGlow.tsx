import { useEffect, useRef } from 'react';

/**
 * 페이지 어디서나 마우스를 느리게 따라오는 은은한 주황빛.
 * - 화면에 고정된 레이어(본문 뒤)라 스크롤해도 커서 위치에 그대로 있음
 * - 마우스가 멈추면 계산 중단 · 창 밖으로 나가면 서서히 꺼짐 · transform/opacity만 사용(GPU)
 * - 마우스 없는 기기(터치)·'동작 줄이기'에서는 렌더하지 않음 / PDF·A4 모드에서도 숨김
 */
const SIZE = 560;

export function CursorGlow() {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const enabled = matchMedia('(hover: hover) and (pointer: fine)').matches
      && !matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (!enabled) { el.style.display = 'none'; return; }

    const target = { x: 0, y: 0, power: 0 };
    const cur = { x: 0, y: 0, power: 0 };
    let raf = 0;

    const paint = () => {
      el.style.transform = `translate3d(${cur.x - SIZE / 2}px, ${cur.y - SIZE / 2}px, 0)`;
      el.style.opacity = cur.power.toFixed(3);
    };
    const tick = () => {
      raf = 0;
      cur.x += (target.x - cur.x) * 0.08;
      cur.y += (target.y - cur.y) * 0.08;
      cur.power += (target.power - cur.power) * 0.06;
      paint();
      const settled = Math.abs(target.x - cur.x) < 0.5 && Math.abs(target.y - cur.y) < 0.5 && Math.abs(target.power - cur.power) < 0.004;
      if (!settled && !document.hidden) raf = requestAnimationFrame(tick);
    };
    const kick = () => { if (!raf && !document.hidden) raf = requestAnimationFrame(tick); };

    const onMove = (e: PointerEvent) => {
      if (e.pointerType !== 'mouse') return;
      if (cur.power < 0.02) { cur.x = e.clientX; cur.y = e.clientY; }   // 처음엔 그 자리에서 서서히 켜짐
      target.x = e.clientX; target.y = e.clientY; target.power = 1;
      kick();
    };
    const onLeave = () => { target.power = 0; kick(); };

    window.addEventListener('pointermove', onMove, { passive: true });
    document.documentElement.addEventListener('pointerleave', onLeave);
    window.addEventListener('blur', onLeave);
    paint();
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('pointermove', onMove);
      document.documentElement.removeEventListener('pointerleave', onLeave);
      window.removeEventListener('blur', onLeave);
    };
  }, []);

  return <div ref={ref} className="cursor-glow no-print" aria-hidden="true" />;
}
