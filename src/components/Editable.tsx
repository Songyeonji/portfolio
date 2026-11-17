import { createElement, useLayoutEffect, useRef, type ClipboardEvent, type FormEvent, type KeyboardEvent } from 'react';
import { useEditor } from '../editor/EditorContext';
import { sanitize } from '../lib/sanitize';

type Tag = 'span' | 'p' | 'h3' | 'h4' | 'h5' | 'strong' | 'dd';

interface Props {
  path: string;
  as?: Tag;
  className?: string;
  /** <b> 굵게·줄바꿈 허용 (Ctrl+B, Shift+Enter) */
  rich?: boolean;
  /** 비어 있으면 보기 모드에서 숨김 */
  optional?: boolean;
  placeholder?: string;
}

/**
 * 편집 모드에서만 contentEditable이 되는 텍스트.
 * 입력 중 커서가 튀지 않도록 DOM 내용은 직접 관리(비제어)하고, 값만 상태에 반영합니다.
 */
export function Editable({ path, as = 'span', className, rich, optional, placeholder = '내용 입력' }: Props) {
  const { edit, get, update } = useEditor();
  const value = get<string | undefined>(path) ?? '';
  const ref = useRef<HTMLElement>(null);

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el || document.activeElement === el) return;
    if (rich) {
      const html = sanitize(value);
      if (el.innerHTML !== html) el.innerHTML = html;
    } else if (el.textContent !== value) {
      el.textContent = value;
    }
  });

  if (!edit && optional && !value) return null;

  const onInput = (e: FormEvent<HTMLElement>) => {
    const el = e.currentTarget;
    update(path, rich ? sanitize(el.innerHTML) : el.innerText.replace(/\n+$/, ''));
  };
  const onKeyDown = (e: KeyboardEvent<HTMLElement>) => {
    if (e.key !== 'Enter') return;
    e.preventDefault();
    if (e.shiftKey && rich) document.execCommand('insertLineBreak');
    else e.currentTarget.blur();
  };
  const onPaste = (e: ClipboardEvent<HTMLElement>) => {
    e.preventDefault();
    const text = e.clipboardData.getData('text/plain').replace(/\s*\n\s*/g, ' ');
    document.execCommand('insertText', false, text);
  };
  const onBlur = () => {
    const el = ref.current;
    if (el && rich) el.innerHTML = sanitize(el.innerHTML);
  };

  return createElement(as, {
    ref,
    className,
    'data-path': path,
    'data-ph': placeholder,
    ...(edit
      ? {
          contentEditable: rich ? true : 'plaintext-only',
          suppressContentEditableWarning: true,
          spellCheck: false,
          onInput, onKeyDown, onPaste, onBlur,
        }
      : {}),
  });
}
