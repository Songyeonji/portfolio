import { useEditor } from '../editor/EditorContext';
import { Editable } from '../components/Editable';
import { EditableImage } from '../components/EditableImage';
import { Chips, EdBtn, EditableList } from '../components/EditControls';
import { LinkButton } from '../components/LinkButton';
import { SectionHead, Sheet } from '../components/Layout';
import type { Detail, LinkItem, Project, StackRow } from '../types';

const newProject = (): Project => ({
  title: '새 프로젝트', subtitle: '', team: '', period: '', role: '', badge: '', thumbnail: '',
  links: [], summary: '프로젝트 소개', stack: [{ label: '', items: [] }], details: [],
});

function ProjectCard({ index }: { index: number }) {
  const { data, edit, mutate } = useEditor();
  const p = data.projects[index];
  const path = `projects.${index}`;
  const last = data.projects.length - 1;

  const move = (to: number) => mutate((d) => { d.projects.splice(to, 0, d.projects.splice(index, 1)[0]); });

  return (
    <article className="project">
      {edit && (
        <div className="ed-ctl project__tools">
          <EdBtn onClick={() => mutate((d) => { d.projects[index].hidden = !p.hidden; })}>{p.hidden ? '보이기' : '숨기기'}</EdBtn>
          <EdBtn onClick={() => index > 0 && move(index - 1)}>↑</EdBtn>
          <EdBtn onClick={() => index < last && move(index + 1)}>↓</EdBtn>
          <EdBtn className="ed-danger" onClick={() => {
            if (confirm(`'${p.title}' 프로젝트를 삭제할까요?`)) mutate((d) => { d.projects.splice(index, 1); });
          }}>삭제</EdBtn>
        </div>
      )}

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

/** 프로젝트 1개 = A4 1장 (큰 썸네일) */
export function Projects() {
  const { data, edit, isHidden, mutate } = useEditor();
  const sectionHidden = isHidden('projects');
  if (sectionHidden && !edit) return null;

  const visible = data.projects.map((p, i) => ({ p, i })).filter(({ p }) => edit || !p.hidden);
  return (
    <>
      {visible.map(({ p, i }, n) => (
        <Sheet key={i} id={`project-${i}`} className="sheet--project" hidden={sectionHidden || !!p.hidden}>
          {n === 0 && (
            <div className="block" id="projects">
              <SectionHead title="Project Experience." section="projects" />
            </div>
          )}
          <div className={`block${p.hidden ? ' is-hidden' : ''}`}>
            <ProjectCard index={i} />
          </div>
        </Sheet>
      ))}
      {edit && (
        <div className="ed-ctl ed-add ed-add--project">
          <EdBtn onClick={() => mutate((d) => { d.projects.push(newProject()); })}>+ 프로젝트 추가</EdBtn>
        </div>
      )}
    </>
  );
}
