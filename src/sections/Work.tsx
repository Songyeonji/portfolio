import { useEditor } from '../editor/EditorContext';
import { Editable } from '../components/Editable';
import { Chips, EditableList } from '../components/EditControls';
import { Block, SectionHead, Sheet } from '../components/Layout';
import type { WorkGroup, WorkItem } from '../types';

/** 3페이지: 경력 */
export function Work() {
  const { edit, isHidden } = useEditor();
  if (isHidden('work') && !edit) return null;

  return (
    <Sheet id="work" className="sheet--work" hidden={isHidden('work')}>
      <Block section="work">
        <SectionHead title="Work Experience." section="work" />
        <EditableList<WorkItem> path="work" as="div" className="jobs" addLabel="경력 추가"
          makeNew={() => ({ company: '회사명', role: '직무', period: '기간', stack: [], groups: [] })}>
          {(_, p, __, x) => (
            <article className="job">
              <div className="job__side">
                <Editable as="h3" path={`${p}.company`} className="job__company" placeholder="회사명" />
                <Editable as="p" path={`${p}.role`} className="job__role" placeholder="직무" />
                <Editable as="p" path={`${p}.period`} className="job__period" placeholder="기간" />
                <Chips path={`${p}.stack`} chipClass="chip--sm" />
              </div>
              <EditableList<WorkGroup> path={`${p}.groups`} as="div" className="job__groups" addLabel="업무 영역"
                makeNew={() => ({ title: '업무 영역', bullets: ['내용'] })}>
                {(_, gp, __, gx) => (
                  <div className="job__group">
                    <Editable as="h4" path={`${gp}.title`} placeholder="업무 영역" />
                    <EditableList<string> path={`${gp}.bullets`} className="bullets" makeNew={() => '내용'}>
                      {(_, bp, __, bx) => <li><Editable path={bp} rich />{bx}</li>}
                    </EditableList>
                    {gx}
                  </div>
                )}
              </EditableList>
              {x}
            </article>
          )}
        </EditableList>
      </Block>
    </Sheet>
  );
}
