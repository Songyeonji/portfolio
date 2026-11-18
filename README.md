# 송연지 포트폴리오

업무의 구조를 이해하고, 기술로 효율을 설계하는 개발자 — 웹 포트폴리오 + A4 PDF 동시 지원.

**React 19 · TypeScript · Vite** / GitHub Actions → GitHub Pages 자동 배포

- **웹**: 반응형 단일 페이지 (데스크톱·태블릿·모바일). 프로젝트는 큰 썸네일 카드 그리드 → 클릭하면 상세 모달 (←/→ 이동, ESC 닫기, 모바일은 전체 화면). 링크는 서비스 아이콘 버튼
- **PDF**: 우측 상단 `PDF 다운로드` → 인쇄 창에서 **대상: PDF로 저장** → 창을 닫으면 원래 화면으로 복귀
  - A4 한 장 = 한 섹션(표지·About / 지원동기·스킬 / 경력 / 프로젝트별 1장 / 학력·수상) → **페이지가 중간에 끊기지 않음**
  - 내용이 넘치면 그 페이지만 글자·썸네일을 자동으로 살짝 줄여 한 장에 맞춤
  - 텍스트가 살아있는 벡터 PDF → GitHub·YouTube·Velog **링크가 PDF에서 바로 클릭됨**

## 편집 모드

1. 우측 상단 🔒 → 비밀번호 입력 (비밀번호 없이 들어오면 보기만 가능)
2. 글자를 클릭해 바로 수정 (Ctrl+B 굵게, Shift+Enter 줄바꿈) · 이미지 위 `이미지 변경` · 목록마다 `+ 추가` / `×`
3. 섹션·프로젝트별 `숨기기`, 프로젝트 순서 `↑ ↓`
4. `A4 미리보기`로 PDF 페이지 확인 (넘치는 페이지는 빨간 테두리)
5. 저장
   - 수정 내용은 **이 브라우저에 자동 임시저장** → 바로 PDF 다운로드 가능
   - 사이트 반영: `GitHub에 저장` (본인 Fine-grained 토큰, Contents 읽기/쓰기) → `src/data/portfolio.json` 커밋 → Actions가 자동 재배포
   - 또는 `JSON 내보내기` 후 `src/data/portfolio.json` 교체

### 지원동기 회사별 버전

지원할 때마다 지원동기를 따로 관리하고, 서로 덮어쓰지 않습니다.

- 편집 모드 → Motivation 섹션의 **지원동기 버전** 바: `+ 새 버전`(현재 버전 복사 → 회사명·링크 이름 입력) · `회사명 변경` · `기본으로` · `링크 복사` · `삭제`
- 선택한 버전만 수정됨 · 다른 버전은 그대로
- 회사별 링크: `https://songyeonji.github.io/portfolio/?m=suresoft` → 그 회사 버전으로 표시 (링크 없이 열면 **기본** 버전)
- PDF 파일명에 회사명이 자동으로 붙음: `송연지_포트폴리오_슈어소프트테크.pdf`
- 회사명·버전 목록은 화면/PDF에 나오지 않음 (단, 공개 사이트 코드에는 모든 버전이 포함돼요)

> 정적 사이트라 비밀번호는 해시로만 들어있고 서버 검증은 없습니다. 방문자가 편집해도 그 사람 브라우저에만 남고, 사이트 원본을 바꾸려면 저장소 쓰기 권한(토큰)이 필요합니다.

### 비밀번호 바꾸기

```bash
node -e "console.log(require('crypto').createHash('sha256').update('새비밀번호').digest('hex'))"
```

출력값을 `src/components/Dialogs.tsx`의 `EDIT_PASSWORD_SHA256`에 넣으면 됩니다.

## 개발

```bash
npm install
npm run dev        # http://localhost:5173
npm test           # 유닛 테스트 (Vitest)
npm run build      # 타입 체크 + 프로덕션 빌드 → dist/
```

`http://localhost:5173/?paper` 로 열면 A4 미리보기 상태로 시작합니다.

## 구조

```
src/
  data/portfolio.json     모든 내용 (편집 모드가 이 파일을 저장)
  types.ts                데이터 타입
  editor/EditorContext    편집 상태 · 임시저장 · 토스트
  components/             Editable(글자) · EditableList · EditableImage · LinkButton · 대화상자 · 상단 바
  sections/               Cover · MotivationSkills · Work · Projects · Education  (= A4 페이지 단위)
  lib/                    sha256 · 경로 업데이트 · A4 맞춤 · GitHub 커밋 · 이미지 압축
  styles.css              웹 + A4(인쇄) 스타일
public/images/            프로필 · 프로젝트 썸네일
public/uploads/           편집 모드에서 올린 이미지 (GitHub 저장 시 자동 생성)
```

## 배포 (GitHub Pages)

저장소 **Settings → Pages → Build and deployment → Source: GitHub Actions** 로 한 번만 설정하면,
`main`에 푸시할 때마다 `.github/workflows/deploy.yml`이 테스트·빌드 후 `https://songyeonji.github.io/portfolio/` 에 배포합니다.
(`vite.config.ts`의 `base: './'` 덕분에 Vercel 등 루트 경로 배포에서도 그대로 동작)
