import { useEffect, useRef, useState, type FormEvent } from 'react';
import { useEditor } from '../editor/EditorContext';
import { commitToGithub, type GithubConfig } from '../lib/github';
import { sha256 } from '../lib/sha256';
import { KEYS, store } from '../lib/storage';

/** 편집 비밀번호의 SHA-256 해시 (비밀번호 자체는 코드에 두지 않음 · 변경 방법은 README) */
export const EDIT_PASSWORD_SHA256 = '9fcfb2aa8d0a227a1663cf38df1541ae7686143ce36f19371844dfd0d6366685';

function useModal(open: boolean) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (open && !d.open) d.showModal();
    if (!open && d.open) d.close();
  }, [open]);
  return ref;
}

export function LoginDialog({ open, onClose, onSuccess }: { open: boolean; onClose: () => void; onSuccess: () => void }) {
  const ref = useModal(open);
  const [pw, setPw] = useState('');
  const [error, setError] = useState(false);
  useEffect(() => { if (open) { setPw(''); setError(false); } }, [open]);

  const submit = (e: FormEvent) => {
    e.preventDefault();   // 틀리면 창을 닫지 않고 오류만 표시
    if (sha256(pw) === EDIT_PASSWORD_SHA256) onSuccess();
    else setError(true);
  };

  return (
    <dialog ref={ref} className="dialog" onClose={onClose} onCancel={onClose}>
      <form onSubmit={submit}>
        <h3>편집 모드</h3>
        <p className="dialog__desc">비밀번호를 입력하면 내용과 이미지를 수정할 수 있어요.</p>
        <input type="password" autoComplete="current-password" placeholder="비밀번호" required autoFocus
          value={pw} onChange={(e) => { setPw(e.target.value); setError(false); }} />
        {error && <p className="dialog__error">비밀번호가 맞지 않아요.</p>}
        <div className="dialog__actions">
          <button className="btn" type="button" onClick={onClose}>취소</button>
          <button className="btn btn--primary" type="submit">확인</button>
        </div>
      </form>
    </dialog>
  );
}

function loadGithubConfig(): GithubConfig {
  try {
    const c = JSON.parse(store.get(KEYS.github) ?? '{}') as Partial<GithubConfig>;
    return { repo: c.repo || 'Songyeonji/portfolio', branch: c.branch || 'main', token: c.token || '' };
  } catch {
    return { repo: 'Songyeonji/portfolio', branch: 'main', token: '' };
  }
}

export function GithubDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const ref = useModal(open);
  const { data, clearDraft, toast } = useEditor();
  const [cfg, setCfg] = useState<GithubConfig>(loadGithubConfig);
  const [status, setStatus] = useState('');
  const [busy, setBusy] = useState(false);
  useEffect(() => { if (open) { setCfg(loadGithubConfig()); setStatus(''); } }, [open]);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    const c = { ...cfg, repo: cfg.repo.trim().replace(/^https:\/\/github\.com\//, '').replace(/\.git$/, '') };
    store.set(KEYS.github, JSON.stringify(c));
    setBusy(true);
    try {
      await commitToGithub(data, c, setStatus);
      setStatus('완료! GitHub Actions가 다시 배포해요 (1~2분).');
      clearDraft();
      toast('GitHub에 저장했어요');
    } catch (err) {
      setStatus('실패: ' + (err instanceof Error ? err.message : String(err)));
    } finally {
      setBusy(false);
    }
  };

  const field = (key: keyof GithubConfig) => ({
    value: cfg[key],
    onChange: (e: { target: { value: string } }) => setCfg({ ...cfg, [key]: e.target.value }),
    required: true,
  });

  return (
    <dialog ref={ref} className="dialog dialog--wide" onClose={onClose} onCancel={onClose}>
      <form onSubmit={submit}>
        <h3>GitHub에 저장</h3>
        <p className="dialog__desc">
          수정한 내용(<code>src/data/portfolio.json</code>)과 새로 올린 이미지를 저장소에 커밋합니다. 커밋되면 GitHub Pages가 자동으로 다시 배포돼요.
          토큰은 <a href="https://github.com/settings/personal-access-tokens/new" target="_blank" rel="noopener">Fine-grained token</a>
          (해당 저장소 · Contents: Read and write)으로 만들고, 이 브라우저에만 저장됩니다.
        </p>
        <label>저장소 <input placeholder="Songyeonji/portfolio" {...field('repo')} /></label>
        <label>브랜치 <input placeholder="main" {...field('branch')} /></label>
        <label>토큰 <input type="password" autoComplete="off" placeholder="github_pat_..." {...field('token')} /></label>
        <p className="dialog__status">{status}</p>
        <div className="dialog__actions">
          <button className="btn" type="button" onClick={onClose}>닫기</button>
          <button className="btn btn--primary" type="submit" disabled={busy}>커밋하기</button>
        </div>
      </form>
    </dialog>
  );
}
