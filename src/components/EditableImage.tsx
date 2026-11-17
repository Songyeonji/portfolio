import { useRef } from 'react';
import { useEditor } from '../editor/EditorContext';
import { compressImage } from '../lib/image';
import { asset } from '../lib/links';
import { EdBtn } from './EditControls';

interface Props {
  path: string;
  className: string;
  alt: string;
  /** 업로드 시 최대 가로 px */
  maxWidth?: number;
}

/** 편집 모드에서 '이미지 변경'으로 교체 가능한 이미지 (브라우저에서 리사이즈·압축) */
export function EditableImage({ path, className, alt, maxWidth = 1600 }: Props) {
  const { edit, get, update, toast } = useEditor();
  const src = get<string | undefined>(path);
  const input = useRef<HTMLInputElement>(null);

  const onFile = async (file: File | undefined) => {
    if (!file) return;
    try {
      update(path, await compressImage(file, maxWidth));
      toast('이미지를 바꿨어요');
    } catch {
      toast('이미지를 읽지 못했어요');
    }
  };

  return (
    <div className={className}>
      {src ? <img src={asset(src)} alt={alt} decoding="async" /> : <div className="img-empty">이미지 없음</div>}
      {edit && (
        <>
          <EdBtn className="ed-img" onClick={() => input.current?.click()}>이미지 변경</EdBtn>
          <input
            ref={input}
            type="file"
            accept="image/*"
            hidden
            onChange={(e) => { void onFile(e.target.files?.[0]); e.target.value = ''; }}
          />
        </>
      )}
    </div>
  );
}
