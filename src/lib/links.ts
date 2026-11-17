export type LinkKind = 'github' | 'youtube' | 'velog' | 'web' | 'mail' | 'tel';

export const isUrl = (u: string | undefined): u is string => /^(https?:|mailto:|tel:)/i.test(u ?? '');

export function linkKind(url: string | undefined): LinkKind {
  const u = (url ?? '').toLowerCase();
  if (u.startsWith('mailto:')) return 'mail';
  if (u.startsWith('tel:')) return 'tel';
  if (u.includes('github.com')) return 'github';
  if (u.includes('youtube.com') || u.includes('youtu.be')) return 'youtube';
  if (u.includes('velog.io')) return 'velog';
  return 'web';
}

/** public/ 기준 상대경로를 배포 경로(base)에 맞게 변환. data URL·외부 URL은 그대로 */
export function asset(src: string): string {
  if (!src || /^(data:|https?:|blob:)/.test(src)) return src;
  return import.meta.env.BASE_URL + src.replace(/^\.?\//, '');
}
