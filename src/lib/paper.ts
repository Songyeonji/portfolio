/** A4/PDF에 실제로 찍히는 시트 (웹 전용 프로젝트 그리드는 제외) */
const PAPER_SHEETS = '.sheet:not(.web-only)';

/** A4 맞춤: 시트 내용이 넘치면 그 시트만 글자(--fit) → 썸네일(--thumb) 순으로 조금씩 줄여 한 장에 맞춤.
 *  끝까지 넘치면 .overflow 표시(편집 모드에서 빨간 테두리). 넘친 시트 수를 반환. */
export function fitSheets(root: HTMLElement): number {
  let overflowCount = 0;
  root.querySelectorAll<HTMLElement>(PAPER_SHEETS).forEach((sheet) => {
    const body = sheet.querySelector<HTMLElement>('.sheet__body');
    if (!body) return;
    let fit = 1;
    let thumb = 1;
    const apply = () => {
      sheet.style.setProperty('--fit', fit.toFixed(3));
      sheet.style.setProperty('--thumb', thumb.toFixed(3));
    };
    const over = () => body.scrollHeight > body.clientHeight + 1;
    apply();
    sheet.classList.remove('overflow');
    while (over() && fit > 0.9) { fit -= 0.02; apply(); }
    while (over() && thumb > 0.72) { thumb -= 0.04; apply(); }
    while (over() && fit > 0.8) { fit -= 0.02; apply(); }
    if (over()) {
      sheet.classList.add('overflow');
      if (!sheet.classList.contains('is-hidden')) overflowCount++;
    }
  });
  return overflowCount;
}

export function clearFit(root: HTMLElement) {
  root.querySelectorAll<HTMLElement>('.sheet').forEach((s) => {
    s.style.removeProperty('--fit');
    s.style.removeProperty('--thumb');
    s.classList.remove('overflow');
  });
}

/** 숨김 아닌 시트에 쪽번호, 마지막 시트에 is-last(뒤 빈 페이지 방지) */
export function numberPages(root: HTMLElement) {
  let n = 0;
  let last: HTMLElement | null = null;
  root.querySelectorAll<HTMLElement>(PAPER_SHEETS).forEach((s) => {
    const num = s.querySelector('.sheet__num');
    s.classList.remove('is-last');
    if (s.classList.contains('is-hidden')) { if (num) num.textContent = ''; return; }
    n += 1;
    if (num) num.textContent = String(n);
    last = s;
  });
  (last as HTMLElement | null)?.classList.add('is-last');
}
