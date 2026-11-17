import { useRef } from 'react';
import { useEditor } from '../editor/EditorContext';
import { downloadText } from '../lib/image';
import { DownloadIcon, LockIcon } from './Icons';
import type { PortfolioData, SectionKey } from '../types';

const NAV: [string, SectionKey, string][] = [
  ['About', 'about', 'about'],
  ['Experience', 'work', 'work'],
  ['Projects', 'projects', 'projects'],
  ['Education', 'education', 'education'],
];

export function TopBar({ onPdf, onLock }: { onPdf: () => void; onLock: () => void }) {
  const { edit, isHidden } = useEditor();
  return (
    <header className="topbar no-print">
      <div className="topbar__inner">
        <a className="topbar__brand" href="#top">송연지</a>
        <nav className="topbar__nav">
          {NAV.filter(([, key]) => !isHidden(key)).map(([label, , id]) => <a key={id} href={`#${id}`}>{label}</a>)}
        </nav>
        <div className="topbar__actions">
          <button className="btn btn--primary" type="button" title="PDF로 저장 (A4 · 페이지 단위)" onClick={onPdf}>
            <DownloadIcon /><span>PDF 다운로드</span>
          </button>
          <button className={`btn btn--icon${edit ? ' is-on' : ''}`} type="button" title="편집 모드" aria-label="편집 모드" onClick={onLock}>
            <LockIcon />
          </button>
        </div>
      </div>
    </header>
  );
}

export function EditBar({ onGithub, onExit }: { onGithub: () => void; onExit: () => void }) {
  const { data, paper, setPaper, replaceData, resetToOriginal, toast } = useEditor();
  const importInput = useRef<HTMLInputElement>(null);

  const onImport = async (file: File | undefined) => {
    if (!file) return;
    try {
      const txt = await file.text();
      replaceData(JSON.parse(txt.slice(txt.indexOf('{'), txt.lastIndexOf('}') + 1)) as PortfolioData);
      toast('불러왔어요');
    } catch {
      toast('파일 형식을 읽지 못했어요');
    }
  };

  return (
    <div className="editbar no-print">
      <div className="editbar__inner">
        <strong className="editbar__title">편집 모드</strong>
        <span className="editbar__hint">글자를 클릭해 바로 수정 · 이미지 위 버튼으로 교체 · 수정 내용은 이 브라우저에 자동 임시저장</span>
        <div className="editbar__actions">
          <button className="btn btn--sm" type="button" onClick={() => setPaper(!paper)}>{paper ? '웹 보기' : 'A4 미리보기'}</button>
          <button className="btn btn--sm" type="button" onClick={() => {
            downloadText('portfolio.json', JSON.stringify(data, null, 2) + '\n');
            toast('portfolio.json을 저장했어요. src/data/portfolio.json을 이 파일로 바꾸면 반영돼요.', 4500);
          }}>JSON 내보내기</button>
          <button className="btn btn--sm" type="button" onClick={() => importInput.current?.click()}>불러오기</button>
          <button className="btn btn--sm btn--primary" type="button" onClick={onGithub}>GitHub에 저장</button>
          <button className="btn btn--sm btn--ghost" type="button" onClick={() => {
            if (confirm('이 브라우저에 임시저장된 수정 내용을 지우고 사이트 원본으로 되돌릴까요?')) { resetToOriginal(); toast('원본으로 되돌렸어요'); }
          }}>임시저장 삭제</button>
          <button className="btn btn--sm btn--ghost" type="button" onClick={onExit}>편집 종료</button>
          <input ref={importInput} type="file" accept=".json,.js" hidden
            onChange={(e) => { void onImport(e.target.files?.[0]); e.target.value = ''; }} />
        </div>
      </div>
    </div>
  );
}

export function Toast() {
  const { toastMsg } = useEditor();
  return <div className={`toast${toastMsg ? ' show' : ''}`} role="status" aria-live="polite">{toastMsg?.text}</div>;
}
