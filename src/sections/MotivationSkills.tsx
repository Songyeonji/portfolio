import { useEditor } from '../editor/EditorContext';
import { Editable } from '../components/Editable';
import { Chips, EdBtn, EditableList } from '../components/EditControls';
import { Block, SectionHead, Sheet } from '../components/Layout';
import { SLUG, motivationLink } from '../lib/migrate';
import type { Motivation, SkillLevel } from '../types';

/**
 * 지원동기 버전 관리 (편집 모드 전용 · 화면/PDF에는 안 보임)
 * 회사마다 버전을 따로 두고, 보기 링크(?m=id)로 골라서 보여줌 → 서로 덮어쓰지 않음
 */
function MotivationSwitcher() {
  const { data, motivation, setMotivationId, mutate, toast } = useEditor();
  const list = data.motivations;
  const isDefault = motivation.id === data.defaultMotivation;

  const askSlug = (suggest: string): string | null => {
    for (;;) {
      const v = prompt('링크에 쓸 영문 이름 (소문자·숫자·-)\n예: kakao → 사이트주소?m=kakao', suggest);
      if (v == null) return null;
      const s = v.trim().toLowerCase();
      if (!SLUG.test(s)) { alert('영문 소문자·숫자·- 만 쓸 수 있어요.'); continue; }
      if (list.some((m) => m.id === s)) { alert('이미 있는 이름이에요.'); continue; }
      return s;
    }
  };

  const add = () => {
    const company = prompt('어느 회사용 지원동기인가요? (현재 버전을 복사해서 시작해요)', '');
    if (!company?.trim()) return;
    const id = askSlug(`v${list.length + 1}`);
    if (!id) return;
    const copy: Motivation = { ...structuredClone(motivation), id, company: company.trim() };
    mutate((d) => { d.motivations.push(copy); });
    setMotivationId(id);
    toast(`'${copy.company}' 버전을 만들었어요. 이제 이 버전만 수정돼요.`, 3500);
  };

  const rename = () => {
    const company = prompt('회사명', motivation.company);
    if (!company?.trim()) return;
    mutate((d) => { d.motivations.find((m) => m.id === motivation.id)!.company = company.trim(); });
  };

  const setDefault = () => {
    mutate((d) => { d.defaultMotivation = motivation.id; });
    setMotivationId(motivation.id);
    toast(`기본 버전을 '${motivation.company}'(으)로 바꿨어요. 링크 없이 접속하면 이 버전이 보여요.`, 3500);
  };

  const remove = () => {
    if (list.length <= 1) { toast('버전이 하나뿐이라 지울 수 없어요.'); return; }
    if (!confirm(`'${motivation.company}' 지원동기를 삭제할까요?`)) return;
    const rest = list.filter((m) => m.id !== motivation.id);
    const nextDefault = isDefault ? rest[0].id : data.defaultMotivation;
    mutate((d) => {
      d.motivations = d.motivations.filter((m) => m.id !== motivation.id);
      d.defaultMotivation = nextDefault;
    });
    setMotivationId(nextDefault);
  };

  const copyLink = async () => {
    const url = motivationLink(motivation.id, data.defaultMotivation);
    try { await navigator.clipboard.writeText(url); toast(`'${motivation.company}'용 링크를 복사했어요`); }
    catch { prompt('이 링크를 복사하세요', url); }
  };

  return (
    <div className="ed-ctl mot-switch">
      <label className="mot-switch__label">
        지원동기 버전
        <select value={motivation.id} onChange={(e) => setMotivationId(e.target.value)}>
          {list.map((m) => (
            <option key={m.id} value={m.id}>
              {m.company}{m.id === data.defaultMotivation ? ' (기본)' : ''} · ?m={m.id}
            </option>
          ))}
        </select>
      </label>
      <EdBtn onClick={add}>+ 새 버전</EdBtn>
      <EdBtn onClick={rename}>회사명 변경</EdBtn>
      {!isDefault && <EdBtn onClick={setDefault}>기본으로</EdBtn>}
      <EdBtn onClick={() => void copyLink()}>링크 복사</EdBtn>
      <EdBtn className="ed-danger" onClick={remove}>삭제</EdBtn>
    </div>
  );
}

/** 2페이지: 지원동기 + 스킬 */
export function MotivationSkills() {
  const { edit, isHidden, motivationIndex } = useEditor();
  const allHidden = isHidden('motivation') && isHidden('skills');
  if (allHidden && !edit) return null;
  const mp = `motivations.${motivationIndex}`;

  return (
    <Sheet id="motivation-skills" className="sheet--motivation" hidden={allHidden}>
      <Block section="motivation">
        <SectionHead title="Motivation for Application." section="motivation" id="motivation" />
        {edit && <MotivationSwitcher />}
        {/* key: 버전을 바꾸면 편집 칸을 새로 그려 내용이 섞이지 않게 */}
        <div key={mp}>
          <Editable as="h3" path={`${mp}.heading`} className="mot-heading" placeholder="지원동기 제목" />
          <EditableList<string> path={`${mp}.paragraphs`} as="div" className="mot-body" addLabel="문단" makeNew={() => '새 문단'}>
            {(_, p, __, x) => <p><Editable path={p} rich />{x}</p>}
          </EditableList>
        </div>
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
