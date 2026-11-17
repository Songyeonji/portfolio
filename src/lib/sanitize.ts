/** 편집 가능한 서식 텍스트에서 굵게/기울임/링크/줄바꿈만 남기고 나머지 태그·속성 제거 */
const ALLOWED = new Set(['B', 'STRONG', 'I', 'EM', 'BR', 'A', 'CODE', 'U']);

export function sanitize(html: string | undefined): string {
  const t = document.createElement('template');
  t.innerHTML = String(html ?? '');
  const walk = (node: ParentNode) => {
    for (const n of Array.from(node.childNodes)) {
      if (n instanceof Element) {
        walk(n);
        if (!ALLOWED.has(n.tagName)) {
          if (n.tagName === 'DIV' || n.tagName === 'P') n.before(document.createElement('br'));
          n.replaceWith(...Array.from(n.childNodes));
          continue;
        }
        for (const a of Array.from(n.attributes)) {
          if (!(n.tagName === 'A' && a.name === 'href')) n.removeAttribute(a.name);
        }
        if (n.tagName === 'A') {
          if (!/^(https?:|mailto:|tel:)/i.test(n.getAttribute('href') ?? '')) n.removeAttribute('href');
          n.setAttribute('target', '_blank');
          n.setAttribute('rel', 'noopener');
        }
      } else if (n.nodeType !== Node.TEXT_NODE) {
        n.remove();
      }
    }
  };
  walk(t.content);
  return t.innerHTML.replace(/^(<br>)+|(<br>)+$/g, '');
}
