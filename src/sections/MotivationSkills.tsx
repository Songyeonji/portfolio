import { useEditor } from '../editor/EditorContext';
import { Editable } from '../components/Editable';
import { Chips, EditableList } from '../components/EditControls';
import { Block, SectionHead, Sheet } from '../components/Layout';
import type { SkillLevel } from '../types';

/** 2페이지: 지원동기 + 스킬 */
export function MotivationSkills() {
  const { edit, isHidden } = useEditor();
  const allHidden = isHidden('motivation') && isHidden('skills');
  if (allHidden && !edit) return null;

  return (
    <Sheet id="motivation-skills" className="sheet--motivation" hidden={allHidden}>
      <Block section="motivation">
        <SectionHead title="Motivation for Application." section="motivation" id="motivation" />
        <Editable as="h3" path="motivation.heading" className="mot-heading" placeholder="지원동기 제목" />
        <EditableList<string> path="motivation.paragraphs" as="div" className="mot-body" addLabel="문단" makeNew={() => '새 문단'}>
          {(_, p, __, x) => <p><Editable path={p} rich />{x}</p>}
        </EditableList>
      </Block>

      <Block section="skills">
        <SectionHead title="Skill." section="skills" id="skills" />
        <EditableList<SkillLevel> path="skills" as="div" className="skills" addLabel="레벨"
          makeNew={() => ({ level: 'Level', desc: '', items: [] })}>
          {(_, p, i, x) => (
            <div className="skill-row">
              <div className="skill-row__head">
                <Editable as="strong" path={`${p}.level`} className={`skill-level lv${i}`} />
                <Editable path={`${p}.desc`} className="skill-desc" optional />
              </div>
              <Chips path={`${p}.items`} chipClass={i === 0 ? 'chip--accent' : ''} />
              {x}
            </div>
          )}
        </EditableList>
      </Block>
    </Sheet>
  );
}
