/** localStorage/sessionStorage는 사생활 보호 모드 등에서 예외가 날 수 있어 항상 감싸서 사용 */
export const store = {
  get(key: string, s: Storage = localStorage): string | null {
    try { return s.getItem(key); } catch { return null; }
  },
  set(key: string, value: string, s: Storage = localStorage): boolean {
    try { s.setItem(key, value); return true; } catch { return false; }
  },
  del(key: string, s: Storage = localStorage): void {
    try { s.removeItem(key); } catch { /* noop */ }
  },
};

export const KEYS = {
  draft: 'portfolio:draft',
  github: 'portfolio:github',
  auth: 'portfolio:auth',
} as const;
