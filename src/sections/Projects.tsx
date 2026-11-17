import { useCallback, useEffect, useRef, useState, type KeyboardEvent, type MouseEvent } from 'react';
import { useEditor } from '../editor/EditorContext';
import { Editable } from '../components/Editable';
import { EditableImage } from '../components/EditableImage';
import { Chips, EdBtn, EditableList } from '../components/EditControls';
import { LinkButton } from '../components/LinkButton';
import { SectionHead, Sheet } from '../components/Layout';
import { asset } from '../lib/links';
import type { Detail, LinkItem, Project, StackRow } from '../types';

const newProject = (): Project => ({
  title: '새 프로젝트', subtitle: '', team: '', period: '', role: '', badge: '', thumbnail: '',
  links: [], summary: '프로젝트 소개', stack: [{ label: '', items: [] }], details: [],
});

/** 프로젝트 상세 (모달 · A4 페이지 공용, 편집 가능) */
function ProjectDetail({ index }: { index: number }) {
  const { data } = useEditor();
  const p = data.projects[index];
  const path = `projects.${index}`;
  if (!p) return null;

  return (
    <article className="project">
      <div className="project__top">
        <EditableImage path={`${path}.thumbnail`} className="project__thumb" alt={`${p.title} 썸네일`} />
        <div className="project__meta">
          <Editable as="p" path={`${path}.badge`} className="project__badge" optional placeholder="배지(선택)" />
          <h3 className="project__title"><Editable path={`${path}.title`} placeholder="프로젝트명" /></h3>
          <Editable as="p" path={`${path}.subtitle`} className="project__subtitle" optional placeholder="한 줄 설명" />
          <dl className="project__facts">
            <div><dt>기간</dt><Editable as="dd" path={`${path}.period`} placeholder="기간" /></div>
            <div><dt>인원</dt><Editable as="dd" path={`${path}.team`} placeholder="구성" /></div>
            <div><dt>역할</dt><Editable as="dd" path={`${path}.role`} placeholder="역할" /></div>
          </dl>
          <EditableList<LinkItem> path={`${path}.links`} className="project__links" addLabel="링크"
            makeNew={() => ({ label: '링크', url: 'https://' })}>
            {(_, lp, __, x) => <li><LinkButton path={lp} className="pill" />{x}</li>}
          </EditableList>
        </div>
      </div>

      <div className="project__body">
        <p className="project__summary"><Editable path={`${path}.summary`} rich placeholder="프로젝트 소개" /></p>
        <div className="project__stack">
          <h4 className="mini-title">Tech Stack</h4>
          <EditableList<StackRow> path={`${path}.stack`} as="div" addLabel="스택 줄" makeNew={() => ({ label: '', items: [] })}>
            {(_, sp, __, x) => (
              <div className="stack-row">
                <Editable path={`${sp}.label`} className="stack-label" optional placeholder="분류" />
                <Chips path={`${sp}.items`} chipClass="chip--sm" />
                {x}
              </div>
            )}
          </EditableList>
        </div>
        <div className="project__details-wrap">
          <h4 className="mini-title">개발 내용</h4>
          <EditableList<Detail> path={`${path}.details`} as="div" className="project__details" addLabel="개발 내용"
            makeNew={() => ({ title: '새 항목', text: '설명' })}>
            {(_, dp, __, x) => (
              <div className="detail">
                <Editable as="h5" path={`${dp}.title`} placeholder="핵심 내용" />
                <Editable as="p" path={`${dp}.text`} rich placeholder="설명" />
                {x}
              </div>
            )}
          </EditableList>
        </div>
      </div>
    </article>
  );
}

/** 웹 목록용 카드 (큰 썸네일 + 요약). 클릭하면 상세 모달 */
function ProjectTile({ index, onOpen }: { index: number; onOpen: () => void }) {
  const { data, edit, mutate } = useEditor();
  const p = data.projects[index];
  const last = data.projects.length - 1;
  const chips = p.stack.flatMap((s) => s.items);
  const shown = chips.slice(0, 5);

  const move = (to: number) => mutate((d) => { d.projects.splice(to, 0, d.projects.splice(index, 1)[0]); });
  const stop = (e: MouseEvent) => e.stopPropagation();
  const onKey = (e: KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onOpen(); }
  };

  return (
    <article
      className={`tile${p.hidden ? ' is-hidden' : ''}`}
      role="button"
      tabIndex={0}
      aria-label={`${p.title} 자세히 보기`}
      onClick={onOpen}
      onKeyDown={onKey}
    >
      <div className="tile__thumb">
        {p.thumbnail ? <img src={asset(p.thumbnail)} alt="" loading="lazy" decoding="async" /> : <div className="img-empty">이미지 없음</div>}
        <span className="tile__more">자세히 보기</span>
      </div>
      <div className="tile__body">
        {p.badge && <p className="tile__badge">{p.badge}</p>}
        <h3 className="tile__title">{p.title}</h3>
        {p.subtitle && <p className="tile__subtitle">{p.subtitle}</p>}
        <p className="tile__meta">
          <span>{p.period}</span>
          {p.team && <span>{p.team}</span>}
        </p>
        <ul className="chips tile__chips">
          {shown.map((c) => <li key={c} className="chip chip--sm">{c}</li>)}
          {chips.length > shown.length && <li className="chip chip--sm chip--more">+{chips.length - shown.length}</li>}
        </ul>
      </div>
      {edit && (
        <div className="ed-ctl project__tools" onClick={stop}>
          <EdBtn onClick={() => mutate((d) => { d.projects[index].hidden = !p.hidden; })}>{p.hidden ? '보이기' : '숨기기'}</EdBtn>
          <EdBtn onClick={() => index > 0 && move(index - 1)}>←</EdBtn>
          <EdBtn onClick={() => index < last && move(index + 1)}>→</EdBtn>
          <EdBtn className="ed-danger" onClick={() => {
            if (confirm(`'${p.title}' 프로젝트를 삭제할까요?`)) mutate((d) => { d.projects.splice(index, 1); });
          }}>삭제</EdBtn>
        </div>
      )}
    </article>
  );
}

/** 프로젝트 상세 모달: ESC/바깥 클릭으로 닫기, ←/→ 로 이전·다음 프로젝트 */
function ProjectModal({ order, current, onChange }: { order: number[]; current: number | null; onChange: (i: number | null) => void }) {
  const ref = useRef<HTMLDialogElement>(null);
  const { data } = useEditor();
  const pos = current == null ? -1 : order.indexOf(current);
  const open = current != null && pos >= 0;

  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (open && !d.open) d.showModal();
    if (!open && d.open) d.close();
    document.body.classList.toggle('modal-open', open);
  }, [open]);

  // 다른 프로젝트로 넘어가면 맨 위부터
  useEffect(() => { ref.current?.scrollTo({ top: 0 }); }, [current]);

  const go = useCallback((delta: number) => {
    if (pos < 0) return;
    onChange(order[(pos + delta + order.length) % order.length]);
  }, [order, pos, onChange]);

  const onKeyDown = (e: KeyboardEvent<HTMLDialogElement>) => {
    const editing = (e.target as HTMLElement).closest('[contenteditable]');
    if (editing) return;
    if (e.key === 'ArrowLeft') go(-1);
    if (e.key === 'ArrowRight') go(1);
  };

  return (
    <dialog
      ref={ref}
      className="pmodal"
      aria-label={open ? data.projects[current!]?.title : undefined}
      onClose={() => onChange(null)}
      onCancel={() => onChange(null)}
      onKeyDown={onKeyDown}
      onClick={(e) => { if (e.target === e.currentTarget) onChange(null); }}
    >
      {open && (
        <div className="pmodal__panel">
          <div className="pmodal__bar">
            <span className="pmodal__count">{pos + 1} / {order.length}</span>
            <div className="pmodal__nav">
              <button type="button" className="btn btn--sm" onClick={() => go(-1)} aria-label="이전 프로젝트">←</button>
              <button type="button" className="btn btn--sm" onClick={() => go(1)} aria-label="다음 프로젝트">→</button>
              <button type="button" className="btn btn--sm btn--close" onClick={() => onChange(null)} aria-label="닫기">✕</button>
            </div>
          </div>
          <ProjectDetail index={current!} />
        </div>
      )}
    </dialog>
  );
}

/** 웹: 카드 그리드 + 상세 모달 / A4·PDF: 프로젝트 1개 = 1페이지 (큰 썸네일) */
export function Projects() {
  const { data, edit, paper, isHidden, mutate } = useEditor();
  const [openIdx, setOpenIdx] = useState<number | null>(null);
  const sectionHidden = isHidden('projects');

  // 인쇄/A4 미리보기로 바뀌면 모달은 닫음
  useEffect(() => { if (paper) setOpenIdx(null); }, [paper]);

  if (sectionHidden && !edit) return null;
  const visible = data.projects.map((p, i) => ({ p, i })).filter(({ p }) => edit || !p.hidden);
  const order = visible.map(({ i }) => i);

  return (
    <>
      {/* 웹 전용: 카드 그리드 */}
      <Sheet id="projects-web" className="sheet--projects web-only" hidden={sectionHidden}>
        <div className="block" id="projects">
          <SectionHead title="Project Experience." section="projects" />
          <p className="sec-desc">카드를 누르면 상세 내용을 볼 수 있어요.</p>
        </div>
        <div className="project-grid">
          {visible.map(({ i }) => <ProjectTile key={i} index={i} onOpen={() => setOpenIdx(i)} />)}
          {edit && (
            <button type="button" className="ed-ctl tile tile--add" onClick={() => mutate((d) => { d.projects.push(newProject()); })}>
              + 프로젝트 추가
            </button>
          )}
        </div>
      </Sheet>

      {/* A4·PDF 전용: 프로젝트별 1페이지 */}
      {visible.map(({ p, i }, n) => (
        <Sheet key={i} id={`project-${i}`} className="sheet--project paper-only" hidden={sectionHidden || !!p.hidden}>
          {n === 0 && (
            <div className="block">
              <SectionHead title="Project Experience." />
            </div>
          )}
          <div className={`block${p.hidden ? ' is-hidden' : ''}`}>
            <ProjectDetail index={i} />
          </div>
        </Sheet>
      ))}

      <ProjectModal order={order} current={openIdx} onChange={setOpenIdx} />
    </>
  );
}
