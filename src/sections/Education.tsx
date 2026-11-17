import { useEditor } from '../editor/EditorContext';
import { Editable } from '../components/Editable';
import { EditableList } from '../components/EditControls';
import { Block, SectionHead, Sheet } from '../components/Layout';
import type { DatedItem, PortfolioData } from '../types';

const GROUPS: [string, keyof Pick<PortfolioData, 'education' | 'itEducation' | 'certificates' | 'awards'>][] = [
  ['Education', 'education'],
  ['IT - Education', 'itEducation'],
  ['Certificate', 'certificates'],
  ['Award', 'awards'],
];

/** 마지막 페이지: 학력·교육·자격증·수상 (한 줄 정렬 목록) */
export function Education() {
  const { edit, isHidden } = useEditor();
  if (isHidden('education') && !edit) return null;

  return (
    <Sheet id="education" className="sheet--edu" hidden={isHidden('education')}>
      <Block section="education">
        <SectionHead title="Education & More." section="education" />
        <div className="edu-list">
          {GROUPS.map(([title, key]) => (
            <div className="edu-group" key={key}>
              <h3 className="edu-title">{title}</h3>
              <EditableList<DatedItem> path={key} className="timeline" makeNew={() => ({ date: '', text: '' })}>
                {(_, p, __, x) => (
                  <li>
                    <Editable path={`${p}.date`} className="tl-date" placeholder="날짜" />
                    <Editable path={`${p}.text`} className="tl-text" placeholder="내용" />
                    {x}
                  </li>
                )}
              </EditableList>
            </div>
          ))}
        </div>
      </Block>
    </Sheet>
  );
}
