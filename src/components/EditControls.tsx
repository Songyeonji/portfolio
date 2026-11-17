import { Fragment, createElement, type ReactNode } from 'react';
import { useEditor } from '../editor/EditorContext';
import { getIn, setIn } from '../lib/path';
import type { PortfolioData } from '../types';
import { Editable } from './Editable';

/** 편집 모드 전용 작은 버튼 (보기 모드·인쇄에서는 숨김) */
export function EdBtn({ children, onClick, className = '' }: { children: ReactNode; onClick: () => void; className?: string }) {
  return (
    <button type="button" className={`ed-ctl ed-btn ${className}`} onClick={onClick}>
      {children}
    </button>
  );
}

interface ListProps<T> {
  path: string;
  as?: 'ul' | 'div';
  className?: string;
  addLabel?: string;
  /** 없으면 추가 버튼을 표시하지 않음 */
  makeNew?: () => T;
  /** remove: 편집 모드에서 항목 안에 넣을 삭제(×) 버튼 */
  children: (item: T, path: string, index: number, remove: ReactNode) => ReactNode;
}

/** 편집 모드에서 항목 추가(+)·삭제(×)가 가능한 목록 */
export function EditableList<T>({ path, as = 'ul', className, addLabel = '추가', makeNew, children }: ListProps<T>) {
  const { edit, get, mutate } = useEditor();
  const items = get<T[] | undefined>(path) ?? [];

  const remove = (i: number) => mutate((d) => { (getIn(d, path) as T[]).splice(i, 1); });
  const add = () => mutate((d) => {
    const arr = getIn(d, path);
    if (Array.isArray(arr)) arr.push(makeNew!());
    else Object.assign(d, setIn<PortfolioData>(d, path, [makeNew!()]));
  });

  return createElement(
    as,
    { className },
    items.map((item, i) => (
      <Fragment key={i}>
        {children(item, `${path}.${i}`, i, edit ? <EdBtn className="ed-x" onClick={() => remove(i)}>×</EdBtn> : null)}
      </Fragment>
    )),
    edit && makeNew
      ? createElement(as === 'ul' ? 'li' : 'div', { className: 'ed-ctl ed-add', key: '__add' },
          <EdBtn onClick={add}>+ {addLabel}</EdBtn>)
      : null,
  );
}

/** 기술 스택 칩 목록 */
export function Chips({ path, chipClass = '' }: { path: string; chipClass?: string }) {
  return (
    <EditableList<string> path={path} className="chips" addLabel="" makeNew={() => '새 항목'}>
      {(_, p, __, x) => (
        <li className={`chip ${chipClass}`}>
          <Editable path={p} placeholder="기술" />
          {x}
        </li>
      )}
    </EditableList>
  );
}
