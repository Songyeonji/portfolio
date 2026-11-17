import type { ReactNode } from 'react';
import { useEditor } from '../editor/EditorContext';
import type { SectionKey } from '../types';
import { EdBtn } from './EditControls';

/** A4 한 장 단위. 웹에서는 일반 섹션, A4/인쇄에서는 고정 크기 페이지 + 바닥글 */
export function Sheet({ id, className = '', hidden = false, children }: { id: string; className?: string; hidden?: boolean; children: ReactNode }) {
  const { data } = useEditor();
  return (
    <section id={id} className={`sheet ${className}${hidden ? ' is-hidden' : ''}`}>
      <div className="sheet__body">{children}</div>
      <footer className="sheet__footer">
        <span>{data.meta.footer}</span>
        <span className="sheet__num" />
      </footer>
    </section>
  );
}

/** 섹션 제목 + (편집 모드) 숨기기/보이기 */
export function SectionHead({ title, section, id }: { title: string; section?: SectionKey; id?: string }) {
  const { edit, isHidden, toggleHidden } = useEditor();
  return (
    <div className="sec-head">
      <h2 className="sec-title" id={id}>{title}</h2>
      {edit && section && (
        <EdBtn className="ed-toggle" onClick={() => toggleHidden(section)}>
          {isHidden(section) ? '보이기' : '숨기기'}
        </EdBtn>
      )}
    </div>
  );
}

/** 숨김 처리 가능한 블록: 보기 모드에서는 렌더하지 않고, 편집 모드에서는 흐리게 */
export function Block({ section, children, id }: { section?: SectionKey; children: ReactNode; id?: string }) {
  const { edit, isHidden } = useEditor();
  const hidden = section ? isHidden(section) : false;
  if (hidden && !edit) return null;
  return <div id={id} className={`block${hidden ? ' is-hidden' : ''}`}>{children}</div>;
}
