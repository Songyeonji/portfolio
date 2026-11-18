import type { Motivation, PortfolioData } from '../types';

/** 예전 형식(지원동기 1개짜리 `motivation`)의 임시저장·불러오기 파일을 현재 형식으로 변환 */
export function normalize(raw: unknown): PortfolioData {
  const d = { ...(raw as Record<string, unknown>) } as Record<string, unknown> & Partial<PortfolioData>;
  const legacy = d.motivation as { heading: string; paragraphs: string[] } | undefined;
  if (!Array.isArray(d.motivations)) {
    d.motivations = legacy ? [{ id: 'default', company: '기본', ...legacy }] : [];
  }
  delete d.motivation;
  if (!d.motivations.length) {
    d.motivations.push({ id: 'default', company: '기본', heading: '', paragraphs: [] });
  }
  if (!d.motivations.some((m) => m.id === d.defaultMotivation)) {
    d.defaultMotivation = d.motivations[0].id;
  }
  return d as PortfolioData;
}

export const SLUG = /^[a-z0-9][a-z0-9-]{0,30}$/;

/** URL ?m= 값 */
export function motivationFromUrl(): string | null {
  return new URLSearchParams(location.search).get('m');
}

/** 주소창의 ?m= 를 바꿈 (기본 버전이면 깔끔하게 제거) */
export function syncMotivationUrl(id: string, defaultId: string) {
  const url = new URL(location.href);
  if (id === defaultId) url.searchParams.delete('m');
  else url.searchParams.set('m', id);
  history.replaceState(null, '', url);
}

export function motivationLink(id: string, defaultId: string): string {
  const url = new URL(location.href);
  url.hash = '';
  url.searchParams.delete('paper');
  if (id === defaultId) url.searchParams.delete('m');
  else url.searchParams.set('m', id);
  return url.toString();
}

export function pickMotivation(list: Motivation[], id: string | null, fallback: string): Motivation {
  return list.find((m) => m.id === id) ?? list.find((m) => m.id === fallback) ?? list[0];
}
