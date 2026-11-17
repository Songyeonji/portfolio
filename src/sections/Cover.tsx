import { useEditor } from '../editor/EditorContext';
import { Editable } from '../components/Editable';
import { EditableImage } from '../components/EditableImage';
import { EditableList } from '../components/EditControls';
import { LinkButton } from '../components/LinkButton';
import { Block, SectionHead, Sheet } from '../components/Layout';
import type { AboutItem, ContactItem } from '../types';

function ContactList({ path, makeNew }: { path: string; makeNew: () => ContactItem }) {
  return (
    <EditableList<ContactItem> path={path} className="contact-list" makeNew={makeNew}>
      {(_, p, __, x) => (
        <li>
          <Editable path={`${p}.label`} className="c-label" />
          <LinkButton path={p} className="c-link" labelKey="text" />
          {x}
        </li>
      )}
    </EditableList>
  );
}

/** 1페이지: 프로필 + About ME */
export function Cover() {
  const { data, edit, isHidden } = useEditor();
  return (
    <Sheet id="top" className="sheet--cover">
      <div className="block">
        <div className="hero">
          <EditableImage path="profile.photo" className="hero__photo" alt={`${data.profile.name} 프로필 사진`} maxWidth={800} />
          <div className="hero__text">
            <Editable as="p" path="profile.role" className="hero__role" placeholder="직무" />
            <h1 className="hero__title">
              <Editable path="profile.name" className="hero__name" placeholder="이름" />
              <Editable path="profile.headline" className="hero__headline" rich placeholder="한 줄 소개" />
            </h1>
            <div className="hero__contacts">
              <div className="contact-group">
                <h3>Contact.</h3>
                <ContactList path="profile.contact" makeNew={() => ({ label: '라벨', text: '내용', url: '' })} />
              </div>
              <div className="contact-group">
                <h3>Channel.</h3>
                <ContactList path="profile.channels" makeNew={() => ({ label: '채널', text: '주소', url: 'https://' })} />
              </div>
            </div>
          </div>
        </div>
      </div>

      {(!isHidden('about') || edit) && (
        <Block section="about">
          <SectionHead title="About ME." section="about" id="about" />
          <EditableList<AboutItem> path="about" as="div" className="about-grid" addLabel="강점 추가"
            makeNew={() => ({ heading: '새 소제목', paragraphs: ['내용'] })}>
            {(_, p, i, x) => (
              <article className="about-card">
                <div className="about-card__head">
                  <span className="about-num">{String(i + 1).padStart(2, '0')}</span>
                  <Editable as="h3" path={`${p}.heading`} placeholder="소제목" />
                </div>
                <EditableList<string> path={`${p}.paragraphs`} as="div" className="about-card__body" addLabel="문단" makeNew={() => '새 문단'}>
                  {(_, pp, __, xx) => <p><Editable path={pp} rich />{xx}</p>}
                </EditableList>
                {x}
              </article>
            )}
          </EditableList>
        </Block>
      )}
    </Sheet>
  );
}
