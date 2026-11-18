import { useCallback, useEffect, useLayoutEffect, useRef, useState, type MouseEvent } from 'react';
import { flushSync } from 'react-dom';
import { EditorProvider, useEditor } from './editor/EditorContext';
import { EditBar, TopBar, Toast } from './components/Bars';
import { GithubDialog, LoginDialog } from './components/Dialogs';
import { clearFit, fitSheets, numberPages } from './lib/paper';
import { KEYS, store } from './lib/storage';
import { Cover } from './sections/Cover';
import { MotivationSkills } from './sections/MotivationSkills';
import { Work } from './sections/Work';
import { Projects } from './sections/Projects';
import { Education } from './sections/Education';

function Portfolio() {
  const editor = useEditor();
  const { data, edit, paper, setEdit, setPaper, toast } = editor;
  const docRef = useRef<HTMLElement>(null);
  const [loginOpen, setLoginOpen] = useState(false);
  const [githubOpen, setGithubOpen] = useState(false);

  useEffect(() => { document.title = data.meta.siteTitle; }, [data.meta.siteTitle]);

  // body 클래스는 레이아웃 단계에서 동기 반영 (인쇄 직전 flushSync와 함께 즉시 적용되도록)
  useLayoutEffect(() => {
    document.body.classList.toggle('paper', paper);
    document.body.classList.toggle('editing', edit);
  }, [paper, edit]);

  // 쪽번호 + A4 맞춤 (내용이 바뀔 때마다)
  useLayoutEffect(() => {
    const root = docRef.current;
    if (!root) return;
    numberPages(root);
    if (paper) fitSheets(root);
    else clearFit(root);
  });

  // 편집 중 A4 미리보기에서 넘치는 페이지 안내
  useEffect(() => {
    if (!paper || !edit || !docRef.current) return;
    const t = setTimeout(() => {
      const bad = docRef.current ? fitSheets(docRef.current) : 0;
      if (bad) toast(`${bad}개 페이지의 내용이 A4 한 장을 넘어요 (빨간 테두리). 내용을 조금 줄여주세요.`, 5000);
    }, 600);
    return () => clearTimeout(t);
  }, [paper, edit, data, toast]);

  /* ───── PDF: 인쇄 창(→ PDF로 저장)이 닫히면 원래 화면으로 복귀 ───── */
  const printState = useRef({ printing: false, paperBefore: false, titleBefore: '' });
  const paperRef = useRef(paper);
  paperRef.current = paper;

  const beforePrint = useCallback(() => {
    const s = printState.current;
    if (docRef.current && s.printing) { fitSheets(docRef.current); return; }
    s.printing = true;
    (document.activeElement as HTMLElement | null)?.blur?.();
    s.paperBefore = paperRef.current;
    s.titleBefore = document.title;
    // PDF 파일명: 송연지_포트폴리오_회사명 (지원동기 버전별로 구분)
    const company = editor.isHidden('motivation') ? '' : editor.motivation.company;
    document.title = [data.meta.pdfFileName || '포트폴리오', company].filter(Boolean).join('_');
    flushSync(() => setPaper(true));
    if (docRef.current) fitSheets(docRef.current);
  }, [data.meta.pdfFileName, setPaper, editor]);

  const afterPrint = useCallback(() => {
    const s = printState.current;
    if (!s.printing) return;
    s.printing = false;
    document.title = s.titleBefore || document.title;
    if (!s.paperBefore) setPaper(false);
  }, [setPaper]);

  useEffect(() => {
    window.addEventListener('beforeprint', beforePrint);
    window.addEventListener('afterprint', afterPrint);
    return () => {
      window.removeEventListener('beforeprint', beforePrint);
      window.removeEventListener('afterprint', afterPrint);
    };
  }, [beforePrint, afterPrint]);

  const downloadPdf = async () => {
    // PDF에 들어가는 이미지만 기다림 (웹 카드의 lazy 이미지는 화면에 안 보이면 영영 로드되지 않으므로 제외) + 최대 3초
    const imgs = Array.from(docRef.current?.querySelectorAll<HTMLImageElement>('.sheet:not(.web-only) img') ?? []);
    const loaded = Promise.all(imgs.map((img) => (img.complete ? 0 : new Promise((r) => {
      img.addEventListener('load', r, { once: true });
      img.addEventListener('error', r, { once: true });
    }))));
    await Promise.race([Promise.all([loaded, document.fonts?.ready]), new Promise((r) => setTimeout(r, 3000))]);
    beforePrint();
    toast('인쇄 창에서 대상을 ‘PDF로 저장’으로 선택하세요', 3500);
    setTimeout(() => { window.print(); afterPrint(); }, 60);   // print()는 창이 닫힐 때까지 대기
  };

  /* ───── 편집 모드 ───── */
  const enterEdit = () => {
    setEdit(true);
    const stale = editor.takeStaleDraft();
    if (stale) {
      const when = new Date(stale.savedAt || 0).toLocaleString('ko-KR');
      if (confirm(`이전 버전 사이트 기준으로 임시저장된 수정 내용이 있어요 (${when}).\n불러올까요? (취소하면 현재 사이트 내용으로 편집합니다)`)) {
        editor.replaceData(stale.data);
      }
    }
  };
  const onLock = () => {
    if (edit) { setEdit(false); return; }
    if (store.get(KEYS.auth, sessionStorage) === '1') enterEdit();
    else setLoginOpen(true);
  };

  // 편집 중엔 링크를 눌러도 이동하지 않음 (본문 안 링크 포함)
  const onDocClick = (e: MouseEvent) => {
    if (!edit) return;
    const t = e.target as HTMLElement;
    if (t.closest('a[href]') && !t.closest('.ed-btn')) e.preventDefault();
  };

  return (
    <>
      <TopBar onPdf={() => void downloadPdf()} onLock={onLock} />
      {edit && (
        <EditBar
          onGithub={() => setGithubOpen(true)}
          onExit={() => { store.del(KEYS.auth, sessionStorage); setEdit(false); toast('편집을 종료했어요'); }}
        />
      )}
      <main ref={docRef} className="doc" onClick={onDocClick}>
        <Cover />
        <MotivationSkills />
        <Work />
        <Projects />
        <Education />
      </main>
      <LoginDialog
        open={loginOpen}
        onClose={() => setLoginOpen(false)}
        onSuccess={() => {
          setLoginOpen(false);
          store.set(KEYS.auth, '1', sessionStorage);
          enterEdit();
          toast('편집 모드가 켜졌어요');
        }}
      />
      <GithubDialog open={githubOpen} onClose={() => setGithubOpen(false)} />
      <Toast />
    </>
  );
}

export default function App() {
  return (
    <EditorProvider>
      <Portfolio />
    </EditorProvider>
  );
}
