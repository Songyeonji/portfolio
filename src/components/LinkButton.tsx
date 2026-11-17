import type { MouseEvent } from 'react';
import { useEditor } from '../editor/EditorContext';
import { isUrl, linkKind } from '../lib/links';
import { Editable } from './Editable';
import { EdBtn } from './EditControls';
import { LinkIcon } from './Icons';

interface Props {
  /** { url, [labelKey] } 객체의 경로 */
  path: string;
  className: string;
  labelKey?: 'label' | 'text';
}

/** 서비스 아이콘이 붙은 링크. 편집 모드에서는 이름 수정 + URL 버튼, 클릭해도 이동하지 않음 */
export function LinkButton({ path, className, labelKey = 'label' }: Props) {
  const { edit, get, update } = useEditor();
  const url = get<string | undefined>(`${path}.url`);
  const kind = linkKind(url);

  const onClick = (e: MouseEvent) => {
    if (edit && !(e.target as HTMLElement).closest('.ed-btn')) e.preventDefault();
  };
  const editUrl = () => {
    const v = prompt('링크 주소(URL)를 입력하세요', url || 'https://');
    if (v != null) update(`${path}.url`, v.trim());
  };

  return (
    <a
      className={`${className} lk lk--${kind}`}
      href={isUrl(url) ? url : undefined}
      target="_blank"
      rel="noopener"
      title={isUrl(url) ? url : undefined}
      onClick={onClick}
    >
      <span className="lk__ic" aria-hidden="true"><LinkIcon kind={kind} /></span>
      <Editable path={`${path}.${labelKey}`} className="lk__label" placeholder="링크 이름" />
      {edit && <EdBtn className="ed-url" onClick={editUrl}>URL</EdBtn>}
    </a>
  );
}
