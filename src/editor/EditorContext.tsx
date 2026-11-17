import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import original from '../data/portfolio.json';
import type { PortfolioData, SectionKey } from '../types';
import { getIn, setIn } from '../lib/path';
import { sha256 } from '../lib/sha256';
import { KEYS, store } from '../lib/storage';

const ORIGINAL = original as PortfolioData;
/** 사이트 원본(portfolio.json)이 바뀌면 이전 임시저장은 자동 적용하지 않기 위한 기준값 */
export const BASE_HASH = sha256(JSON.stringify(ORIGINAL));

interface Draft {
  base: string;
  savedAt: number;
  data: PortfolioData;
}

function loadDraft(): Draft | null {
  const raw = store.get(KEYS.draft);
  if (!raw) return null;
  try { return JSON.parse(raw) as Draft; } catch { return null; }
}

export interface EditorApi {
  data: PortfolioData;
  edit: boolean;
  paper: boolean;
  setEdit: (on: boolean) => void;
  setPaper: (on: boolean) => void;
  get: <T = unknown>(path: string) => T;
  /** 한 필드 갱신 (입력 중 사용) */
  update: (path: string, value: unknown) => void;
  /** 구조 변경(추가/삭제/순서) — 복제본을 직접 수정 */
  mutate: (fn: (draft: PortfolioData) => void) => void;
  replaceData: (data: PortfolioData) => void;
  resetToOriginal: () => void;
  isHidden: (key: SectionKey) => boolean;
  toggleHidden: (key: SectionKey) => void;
  /** 이전 버전 기준 임시저장 (편집 진입 시 불러올지 물어봄) */
  takeStaleDraft: () => Draft | null;
  clearDraft: () => void;
  toast: (msg: string, ms?: number) => void;
  toastMsg: { text: string; id: number } | null;
}

const Ctx = createContext<EditorApi | null>(null);

export function useEditor(): EditorApi {
  const v = useContext(Ctx);
  if (!v) throw new Error('useEditor must be used inside <EditorProvider>');
  return v;
}

export function EditorProvider({ children }: { children: ReactNode }) {
  const stale = useRef<Draft | null>(null);
  const [data, setData] = useState<PortfolioData>(() => {
    const d = loadDraft();
    if (d && d.base === BASE_HASH) return d.data;
    if (d) stale.current = d;
    return ORIGINAL;
  });
  const [edit, setEdit] = useState(false);
  const [paper, setPaper] = useState(() => new URLSearchParams(location.search).has('paper'));
  const [toastMsg, setToastMsg] = useState<{ text: string; id: number } | null>(null);
  const dirty = useRef(false);

  const toast = useCallback((text: string, ms = 2400) => {
    const id = Date.now();
    setToastMsg({ text, id });
    setTimeout(() => setToastMsg((t) => (t?.id === id ? null : t)), ms);
  }, []);

  // 수정 내용은 이 브라우저에 자동 임시저장 (바로 PDF로 뽑을 수 있게)
  useEffect(() => {
    if (!dirty.current) return;
    const t = setTimeout(() => {
      const ok = store.set(KEYS.draft, JSON.stringify({ base: BASE_HASH, savedAt: Date.now(), data } satisfies Draft));
      if (!ok) toast('브라우저 임시저장 용량을 넘었어요. 내보내기 또는 GitHub 저장을 해주세요.', 5000);
    }, 400);
    return () => clearTimeout(t);
  }, [data, toast]);

  const update = useCallback((path: string, value: unknown) => {
    dirty.current = true;
    setData((d) => setIn(d, path, value));
  }, []);

  const mutate = useCallback((fn: (draft: PortfolioData) => void) => {
    dirty.current = true;
    setData((d) => { const c = structuredClone(d); fn(c); return c; });
  }, []);

  const api = useMemo<EditorApi>(() => ({
    data, edit, paper, setEdit, setPaper, toastMsg, toast, update, mutate,
    get: <T,>(path: string) => getIn(data, path) as T,
    replaceData: (d) => { dirty.current = true; setData(d); },
    resetToOriginal: () => { store.del(KEYS.draft); dirty.current = false; setData(ORIGINAL); },
    isHidden: (key) => !!data.hidden?.[key],
    toggleHidden: (key) => mutate((d) => { d.hidden = { ...d.hidden, [key]: !d.hidden?.[key] }; }),
    takeStaleDraft: () => { const s = stale.current; stale.current = null; return s; },
    clearDraft: () => store.del(KEYS.draft),
  }), [data, edit, paper, toastMsg, toast, update, mutate]);

  return <Ctx.Provider value={api}>{children}</Ctx.Provider>;
}
