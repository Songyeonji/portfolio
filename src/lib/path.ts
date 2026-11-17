/** "projects.0.details.2.text" 같은 점 경로로 중첩 데이터 읽기/쓰기 (불변 업데이트) */
type Key = string | number;

const parts = (path: string): Key[] =>
  path.split('.').map((k) => (/^\d+$/.test(k) ? Number(k) : k));

export function getIn(obj: unknown, path: string): unknown {
  return parts(path).reduce<unknown>(
    (o, k) => (o == null ? undefined : (o as Record<Key, unknown>)[k]),
    obj,
  );
}

export function setIn<T>(obj: T, path: string, value: unknown): T {
  const keys = parts(path);
  const rec = (node: unknown, i: number): unknown => {
    const k = keys[i];
    const base = node ?? (typeof k === 'number' ? [] : {});
    const copy = (Array.isArray(base) ? base.slice() : { ...(base as object) }) as Record<Key, unknown>;
    copy[k] = i === keys.length - 1 ? value : rec((base as Record<Key, unknown>)[k], i + 1);
    return copy;
  };
  return rec(obj, 0) as T;
}
