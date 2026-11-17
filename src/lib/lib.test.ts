import { createHash } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import data from '../data/portfolio.json';
import { EDIT_PASSWORD_SHA256 } from '../components/Dialogs';
import { linkKind } from './links';
import { getIn, setIn } from './path';
import { sha256 } from './sha256';

describe('sha256', () => {
  it.each(['', 'abc', '한글 테스트', 'x'.repeat(1000), 'y'.repeat(55), 'z'.repeat(64)])('Node crypto와 같은 결과 (%#)', (s) => {
    expect(sha256(s)).toBe(createHash('sha256').update(s).digest('hex'));
  });
  it('편집 비밀번호 해시가 64자리 16진수', () => {
    expect(EDIT_PASSWORD_SHA256).toMatch(/^[0-9a-f]{64}$/);
  });
});

describe('getIn / setIn', () => {
  const obj = { a: [{ b: 'x' }, { b: 'y' }], c: { d: 1 } };
  it('점 경로로 읽기', () => {
    expect(getIn(obj, 'a.1.b')).toBe('y');
    expect(getIn(obj, 'c.d')).toBe(1);
    expect(getIn(obj, 'a.5.b')).toBeUndefined();
  });
  it('원본을 바꾸지 않고 새 객체 반환 (불변)', () => {
    const next = setIn(obj, 'a.0.b', 'z');
    expect(next.a[0].b).toBe('z');
    expect(obj.a[0].b).toBe('x');
    expect(next.c).toBe(obj.c);          // 바뀌지 않은 가지는 공유
    expect(Array.isArray(next.a)).toBe(true);
  });
});

describe('linkKind', () => {
  it.each([
    ['https://github.com/Songyeonji', 'github'],
    ['https://www.youtube.com/watch?v=abc', 'youtube'],
    ['https://velog.io/@songyeonji_/posts', 'velog'],
    ['mailto:a@b.c', 'mail'],
    ['tel:010', 'tel'],
    ['https://moon-kkkok.vercel.app/', 'web'],
  ])('%s → %s', (url, kind) => expect(linkKind(url)).toBe(kind));
});

describe('portfolio.json', () => {
  it('모든 프로젝트에 제목·썸네일·개발 내용이 있음', () => {
    for (const p of data.projects) {
      expect(p.title).toBeTruthy();
      expect(p.thumbnail).toMatch(/^images\//);
      expect(p.details.length).toBeGreaterThan(0);
    }
  });
});
