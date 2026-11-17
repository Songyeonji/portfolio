import type { PortfolioData } from '../types';
import { sha256 } from './sha256';

/** 편집 모드 → GitHub 저장: 새 이미지는 public/uploads/ 로, 내용은 src/data/portfolio.json 으로 커밋.
 *  main에 커밋되면 GitHub Actions가 다시 빌드·배포합니다. */
export const DATA_FILE = 'src/data/portfolio.json';

export interface GithubConfig {
  repo: string;   // owner/name
  branch: string;
  token: string;  // Fine-grained token (Contents: Read and write)
}

const b64utf8 = (s: string) => {
  const bytes = new TextEncoder().encode(s);
  let bin = '';
  for (let i = 0; i < bytes.length; i += 0x8000) bin += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return btoa(bin);
};

async function gh<T>(token: string, method: string, url: string, body?: unknown): Promise<T | null> {
  const r = await fetch('https://api.github.com' + url, {
    method,
    headers: {
      Authorization: 'Bearer ' + token,
      Accept: 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28',
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  if (r.status === 404 && method === 'GET') return null;
  const j = (await r.json().catch(() => ({}))) as { message?: string };
  if (!r.ok) throw new Error(`${r.status} ${j.message ?? ''}`);
  return j as T;
}

async function putFile(cfg: GithubConfig, path: string, base64: string, message: string) {
  const enc = path.split('/').map(encodeURIComponent).join('/');
  const cur = await gh<{ sha: string }>(cfg.token, 'GET', `/repos/${cfg.repo}/contents/${enc}?ref=${encodeURIComponent(cfg.branch)}`);
  await gh(cfg.token, 'PUT', `/repos/${cfg.repo}/contents/${enc}`, {
    message, content: base64, branch: cfg.branch, sha: cur?.sha,
  });
}

/** 커밋 후 경로로 치환된 데이터를 돌려줌 */
export async function commitToGithub(
  data: PortfolioData,
  cfg: GithubConfig,
  log: (msg: string) => void,
): Promise<PortfolioData> {
  const out = structuredClone(data);
  const uploads: [Record<string, unknown>, string][] = [];
  const scan = (o: unknown) => {
    if (!o || typeof o !== 'object') return;
    for (const [k, v] of Object.entries(o)) {
      if (typeof v === 'string' && v.startsWith('data:image/')) uploads.push([o as Record<string, unknown>, k]);
      else scan(v);
    }
  };
  scan(out);

  for (let i = 0; i < uploads.length; i++) {
    const [obj, key] = uploads[i];
    const m = String(obj[key]).match(/^data:image\/(\w+);base64,(.*)$/);
    if (!m) continue;
    const ext = m[1] === 'jpeg' ? 'jpg' : m[1];
    const rel = `uploads/${sha256(m[2]).slice(0, 12)}.${ext}`;
    log(`이미지 업로드 중… (${i + 1}/${uploads.length})`);
    await putFile(cfg, `public/${rel}`, m[2], 'chore: 포트폴리오 이미지 업로드');
    obj[key] = rel;
  }

  log('내용 저장 중…');
  await putFile(cfg, DATA_FILE, b64utf8(JSON.stringify(out, null, 2) + '\n'), 'docs: 포트폴리오 내용 수정 (편집 모드)');
  return out;
}
