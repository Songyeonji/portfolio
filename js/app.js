/* 포트폴리오 렌더러 + 편집 모드 + A4 PDF 출력 */
(function () {
  'use strict';

  /* ───────── 설정 ───────── */
  // 편집 비밀번호의 SHA-256 해시 (비밀번호 자체는 코드에 남기지 않음)
  // 비밀번호 변경: README.md 참고
  const EDIT_PASSWORD_SHA256 = '9fcfb2aa8d0a227a1663cf38df1541ae7686143ce36f19371844dfd0d6366685';
  const LS_DRAFT = 'portfolio:draft';
  const LS_GH = 'portfolio:github';
  const SS_AUTH = 'portfolio:auth';

  /* ───────── SHA-256 (외부 의존성 없음 · file://에서도 동작) ───────── */
  const K = (() => { const k = []; let n = 2; while (k.length < 64) { let p = true; for (let i = 2; i * i <= n; i++) if (n % i === 0) { p = false; break; } if (p) k.push((Math.cbrt(n) % 1) * 4294967296 | 0); n++; } return k; })();
  const ror = (x, n) => (x >>> n) | (x << (32 - n));
  function sha256(str) {
    const bytes = new TextEncoder().encode(str);
    const H = [0x6a09e667, 0xbb67ae85, 0x3c6ef372, 0xa54ff53a, 0x510e527f, 0x9b05688c, 0x1f83d9ab, 0x5be0cd19];
    const l = bytes.length, total = ((l + 9 + 63) >> 6) << 6;
    const m = new Uint8Array(total); m.set(bytes); m[l] = 0x80;
    const dv = new DataView(m.buffer);
    dv.setUint32(total - 4, (l * 8) >>> 0); dv.setUint32(total - 8, Math.floor(l / 536870912));
    const w = new Int32Array(64);
    for (let o = 0; o < total; o += 64) {
      for (let i = 0; i < 16; i++) w[i] = dv.getUint32(o + i * 4);
      for (let i = 16; i < 64; i++) {
        const a = w[i - 15], b = w[i - 2];
        w[i] = (w[i - 16] + (ror(a, 7) ^ ror(a, 18) ^ (a >>> 3)) + w[i - 7] + (ror(b, 17) ^ ror(b, 19) ^ (b >>> 10))) | 0;
      }
      let [a, b, c, d, e, f, g, h] = H;
      for (let i = 0; i < 64; i++) {
        const t1 = (h + (ror(e, 6) ^ ror(e, 11) ^ ror(e, 25)) + ((e & f) ^ (~e & g)) + K[i] + w[i]) | 0;
        const t2 = ((ror(a, 2) ^ ror(a, 13) ^ ror(a, 22)) + ((a & b) ^ (a & c) ^ (b & c))) | 0;
        h = g; g = f; f = e; e = (d + t1) | 0; d = c; c = b; b = a; a = (t1 + t2) | 0;
      }
      H[0] = (H[0] + a) | 0; H[1] = (H[1] + b) | 0; H[2] = (H[2] + c) | 0; H[3] = (H[3] + d) | 0;
      H[4] = (H[4] + e) | 0; H[5] = (H[5] + f) | 0; H[6] = (H[6] + g) | 0; H[7] = (H[7] + h) | 0;
    }
    return H.map(x => (x >>> 0).toString(16).padStart(8, '0')).join('');
  }
  window.__sha256 = sha256;

  /* ───────── 상태 ───────── */
  const ORIGINAL = window.PORTFOLIO_DATA;
  const BASE_HASH = sha256(JSON.stringify(ORIGINAL));
  const clone = o => JSON.parse(JSON.stringify(o));
  const state = { data: clone(ORIGINAL), edit: false, paper: false, staleDraft: null };

  const store = {
    get(k, s = localStorage) { try { return s.getItem(k); } catch (e) { return null; } },
    set(k, v, s = localStorage) { try { s.setItem(k, v); return true; } catch (e) { return false; } },
    del(k, s = localStorage) { try { s.removeItem(k); } catch (e) { /* noop */ } }
  };

  // 이 브라우저에 남은 임시저장(편집 내용) 적용 — 사이트 원본이 바뀐 뒤의 오래된 임시저장은 자동 적용하지 않음
  (function loadDraft() {
    const raw = store.get(LS_DRAFT); if (!raw) return;
    try {
      const d = JSON.parse(raw);
      if (d.base === BASE_HASH) state.data = d.data; else state.staleDraft = d;
    } catch (e) { /* 손상된 임시저장 무시 */ }
  })();

  /* ───────── 경로 헬퍼 ───────── */
  const parts = p => p.split('.').map(k => (/^\d+$/.test(k) ? +k : k));
  function get(path) { return parts(path).reduce((o, k) => (o == null ? undefined : o[k]), state.data); }
  function set(path, val) {
    const ks = parts(path); let o = state.data;
    for (let i = 0; i < ks.length - 1; i++) { if (o[ks[i]] == null) o[ks[i]] = typeof ks[i + 1] === 'number' ? [] : {}; o = o[ks[i]]; }
    o[ks[ks.length - 1]] = val;
  }

  /* ───────── 안전한 서식(굵게/링크/줄바꿈만 허용) ───────── */
  const ALLOWED = { B: 1, STRONG: 1, I: 1, EM: 1, BR: 1, A: 1, CODE: 1, U: 1 };
  function sanitize(html) {
    const t = document.createElement('template'); t.innerHTML = String(html || '');
    (function walk(node) {
      [...node.childNodes].forEach(n => {
        if (n.nodeType === 1) {
          walk(n);
          if (!ALLOWED[n.tagName]) {
            if (n.tagName === 'DIV' || n.tagName === 'P') n.before(document.createElement('br'));
            n.replaceWith(...n.childNodes);
          } else {
            [...n.attributes].forEach(a => { if (!(n.tagName === 'A' && a.name === 'href')) n.removeAttribute(a.name); });
            if (n.tagName === 'A') {
              if (!/^(https?:|mailto:|tel:)/i.test(n.getAttribute('href') || '')) n.removeAttribute('href');
              n.setAttribute('target', '_blank'); n.setAttribute('rel', 'noopener');
            }
          }
        } else if (n.nodeType !== 3) n.remove();
      });
    })(t.content);
    return t.innerHTML.replace(/^(<br>)+|(<br>)+$/g, '');
  }

  /* ───────── DOM 헬퍼 ───────── */
  function h(tag, props, ...kids) {
    const el = document.createElement(tag);
    if (props) for (const [k, v] of Object.entries(props)) {
      if (v == null || v === false) continue;
      if (k === 'class') el.className = v;
      else if (k.startsWith('on')) el.addEventListener(k.slice(2), v);
      else if (k === 'html') el.innerHTML = v;
      else el.setAttribute(k, v === true ? '' : v);
    }
    kids.flat(9).forEach(c => { if (c != null && c !== false) el.append(c instanceof Node ? c : document.createTextNode(c)); });
    return el;
  }
  const isUrl = u => /^(https?:|mailto:|tel:)/i.test(u || '');

  // 편집 가능한 텍스트
  function T(tag, path, cls, opt = {}) {
    const v = get(path);
    if (!state.edit && opt.optional && !v) return null;
    const el = h(tag, { class: cls || null });
    if (opt.rich) el.innerHTML = sanitize(v); else el.textContent = v == null ? '' : v;
    el.dataset.path = path;
    if (opt.rich) el.dataset.rich = '1';
    el.dataset.ph = opt.ph || '내용 입력';
    if (state.edit) {
      if (opt.rich) el.contentEditable = 'true';
      else { try { el.contentEditable = 'plaintext-only'; } catch (e) { el.contentEditable = 'true'; } if (el.contentEditable !== 'plaintext-only') el.contentEditable = 'true'; }
      el.spellcheck = false;
    }
    return el;
  }

  const ctl = (label, onclick, extra = '') => h('button', { type: 'button', class: 'ed-ctl ed-btn ' + extra, onclick }, label);

  // 편집 가능한 목록 (편집 모드에서만 추가/삭제 버튼)
  function L(path, renderItem, makeNew, o = {}) {
    if (!Array.isArray(get(path))) set(path, []);
    const arr = get(path);
    const wrap = h(o.tag || 'ul', { class: o.cls || null });
    arr.forEach((it, i) => {
      const el = renderItem(it, `${path}.${i}`, i);
      if (!el) return;
      if (state.edit) {
        el.classList.add('ed-item');
        el.append(ctl('×', () => { arr.splice(i, 1); commit(); }, 'ed-x'));
      }
      wrap.append(el);
    });
    if (state.edit && makeNew) {
      wrap.append(h(o.addTag || (o.tag === 'ul' || !o.tag ? 'li' : 'div'), { class: 'ed-ctl ed-add' },
        ctl('+ ' + (o.addLabel || '추가'), () => { arr.push(makeNew()); commit(); })));
    }
    return wrap;
  }

  // 링크 종류별 아이콘 (URL로 자동 판별)
  const ICON = {
    github: '<svg viewBox="0 0 24 24"><path fill="currentColor" d="M12 .3a12 12 0 0 0-3.8 23.4c.6.1.8-.3.8-.6v-2c-3.3.7-4-1.6-4-1.6-.6-1.4-1.4-1.8-1.4-1.8-1-.7.1-.7.1-.7 1.2.1 1.8 1.2 1.8 1.2 1 1.8 2.8 1.3 3.5 1 0-.8.4-1.3.7-1.6-2.7-.3-5.5-1.3-5.5-5.9 0-1.3.5-2.4 1.2-3.2 0-.3-.5-1.5.2-3.2 0 0 1-.3 3.3 1.2a11.5 11.5 0 0 1 6 0C17.3 4.7 18.3 5 18.3 5c.7 1.7.2 2.9.1 3.2.8.8 1.2 1.9 1.2 3.2 0 4.6-2.8 5.6-5.5 5.9.4.4.8 1.1.8 2.2v3.3c0 .3.2.7.8.6A12 12 0 0 0 12 .3"/></svg>',
    youtube: '<svg viewBox="0 0 24 24"><rect x="1" y="4.5" width="22" height="15" rx="4.5" fill="#ff0033"/><path d="M9.8 8.6v6.8l5.9-3.4z" fill="#fff"/></svg>',
    velog: '<svg viewBox="0 0 24 24"><rect x="1" y="1" width="22" height="22" rx="5" fill="#20c997"/><path d="M6.6 7h3l1.6 6.6L15 7h2.7l-5.6 10h-2.6z" fill="#fff"/></svg>',
    web: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="12" r="9.5"/><path d="M2.5 12h19M12 2.5c2.6 2.8 3.8 6 3.8 9.5s-1.2 6.7-3.8 9.5c-2.6-2.8-3.8-6-3.8-9.5s1.2-6.7 3.8-9.5z"/></svg>',
    mail: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"><rect x="2.5" y="4.5" width="19" height="15" rx="2.5"/><path d="m3.5 6.5 8.5 6.5 8.5-6.5"/></svg>',
    tel: '<svg viewBox="0 0 24 24"><path fill="currentColor" d="M6.6 10.8a15.2 15.2 0 0 0 6.6 6.6l2.2-2.2a1 1 0 0 1 1-.25 11.4 11.4 0 0 0 3.6.57 1 1 0 0 1 1 1V20a1 1 0 0 1-1 1A17 17 0 0 1 3 4a1 1 0 0 1 1-1h3.5a1 1 0 0 1 1 1c0 1.25.2 2.45.57 3.57a1 1 0 0 1-.25 1z"/></svg>'
  };
  function linkKind(url) {
    url = (url || '').toLowerCase();
    if (url.startsWith('mailto:')) return 'mail';
    if (url.startsWith('tel:')) return 'tel';
    if (url.includes('github.com')) return 'github';
    if (url.includes('youtube.com') || url.includes('youtu.be')) return 'youtube';
    if (url.includes('velog.io')) return 'velog';
    return 'web';
  }

  // 링크 (아이콘 자동 · 편집 모드: 라벨 수정 + URL 버튼)
  function A(path, cls, labelKey = 'label') {
    const url = get(path + '.url');
    const kind = linkKind(url);
    const a = h('a', { class: `${cls} lk lk--${kind}`, href: isUrl(url) ? url : null, target: '_blank', rel: 'noopener', title: isUrl(url) ? url : null },
      h('span', { class: 'lk__ic', 'aria-hidden': 'true', html: ICON[kind] }),
      T('span', `${path}.${labelKey}`, 'lk__label', { ph: '링크 이름' }));
    if (state.edit) a.append(ctl('URL', () => {
      const v = prompt('링크 주소(URL)를 입력하세요', get(path + '.url') || 'https://');
      if (v != null) { set(path + '.url', v.trim()); commit(); }
    }, 'ed-url'));
    return a;
  }

  // 이미지 (편집 모드: 교체 버튼)
  function IMG(path, cls, alt) {
    const src = get(path);
    const wrap = h('div', { class: cls });
    if (src) wrap.append(h('img', { src, alt: alt || '', decoding: 'async' }));
    else wrap.append(h('div', { class: 'img-empty' }, '이미지 없음'));
    if (state.edit) wrap.append(ctl('이미지 변경', () => pickImage(path), 'ed-img'));
    return wrap;
  }

  const chips = (path, cls) => L(path, (_, p) => h('li', { class: 'chip ' + (cls || '') }, T('span', p, null, { ph: '기술' })), () => '새 항목', { cls: 'chips', addLabel: '' });

  /* ───────── 섹션 표시/숨김 ───────── */
  const isHidden = key => !!(state.data.hidden && state.data.hidden[key]);
  function secHead(title, key, id) {
    return h('div', { class: 'sec-head' },
      h('h2', { class: 'sec-title', id: id || null }, title),
      state.edit && key ? ctl(isHidden(key) ? '보이기' : '숨기기', () => {
        state.data.hidden = state.data.hidden || {}; state.data.hidden[key] = !isHidden(key); commit();
      }, 'ed-toggle') : null);
  }
  const block = (key, ...kids) => (isHidden(key) && !state.edit) ? null : h('div', { class: 'block' + (isHidden(key) ? ' is-hidden' : ''), 'data-block': key }, kids);

  /* ───────── 페이지(시트) 구성 ───────── */
  function sheet(id, cls, ...kids) {
    kids = kids.flat().filter(Boolean);
    if (!kids.length) return null;
    const allHidden = kids.every(k => k.classList && k.classList.contains('is-hidden'));
    return h('section', { class: 'sheet ' + (cls || '') + (allHidden ? ' is-hidden' : ''), id },
      h('div', { class: 'sheet__body' }, kids),
      h('footer', { class: 'sheet__footer' }, h('span', null, state.data.meta.footer || ''), h('span', { class: 'sheet__num' })));
  }

  function renderCover() {
    const d = state.data;
    const hero = h('div', { class: 'hero' },
      IMG('profile.photo', 'hero__photo', d.profile.name + ' 프로필 사진'),
      h('div', { class: 'hero__text' },
        T('p', 'profile.role', 'hero__role', { ph: '직무' }),
        h('h1', { class: 'hero__title' },
          T('span', 'profile.name', 'hero__name', { ph: '이름' }),
          T('span', 'profile.headline', 'hero__headline', { rich: true, ph: '한 줄 소개' })),
        h('div', { class: 'hero__contacts' },
          h('div', { class: 'contact-group' }, h('h3', null, 'Contact.'),
            L('profile.contact', (_, p) => h('li', null, T('span', p + '.label', 'c-label'), A(p, 'c-link', 'text')), () => ({ label: '라벨', text: '내용', url: '' }), { cls: 'contact-list' })),
          h('div', { class: 'contact-group' }, h('h3', null, 'Channel.'),
            L('profile.channels', (_, p) => h('li', null, T('span', p + '.label', 'c-label'), A(p, 'c-link', 'text')), () => ({ label: '채널', text: '주소', url: 'https://' }), { cls: 'contact-list' })))));

    const about = block('about', secHead('About ME.', 'about', 'about'),
      L('about', (_, p, i) => h('article', { class: 'about-card' },
        h('div', { class: 'about-card__head' },
          h('span', { class: 'about-num' }, String(i + 1).padStart(2, '0')),
          T('h3', p + '.heading', null, { ph: '소제목' })),
        L(p + '.paragraphs', (_, pp) => h('p', null, T('span', pp, null, { rich: true })), () => '새 문단', { tag: 'div', cls: 'about-card__body', addLabel: '문단' })),
        () => ({ heading: '새 소제목', paragraphs: ['내용'] }), { tag: 'div', cls: 'about-grid', addLabel: '강점 추가' }));

    return sheet('top', 'sheet--cover', h('div', { class: 'block' }, hero), about);
  }

  function renderMotivationSkills() {
    const mot = block('motivation', secHead('Motivation for Application.', 'motivation', 'motivation'),
      T('h3', 'motivation.heading', 'mot-heading', { ph: '지원동기 제목' }),
      L('motivation.paragraphs', (_, p) => h('p', null, T('span', p, null, { rich: true })), () => '새 문단', { tag: 'div', cls: 'mot-body', addLabel: '문단' }));

    const skills = block('skills', secHead('Skill.', 'skills', 'skills'),
      L('skills', (s, p, i) => h('div', { class: 'skill-row' },
        h('div', { class: 'skill-row__head' },
          T('strong', p + '.level', 'skill-level lv' + i), T('span', p + '.desc', 'skill-desc', { optional: true })),
        chips(p + '.items', i === 0 ? 'chip--accent' : '')), () => ({ level: 'Level', desc: '', items: [] }), { tag: 'div', cls: 'skills', addLabel: '레벨' }));

    return sheet('motivation-skills', 'sheet--motivation', mot, skills);
  }

  function renderWork() {
    return sheet('work', 'sheet--work', block('work', secHead('Work Experience.', 'work'),
      L('work', (_, p) => h('article', { class: 'job' },
        h('div', { class: 'job__side' },
          T('h3', p + '.company', 'job__company', { ph: '회사명' }),
          T('p', p + '.role', 'job__role', { ph: '직무' }),
          T('p', p + '.period', 'job__period', { ph: '기간' }),
          chips(p + '.stack', 'chip--sm')),
        L(p + '.groups', (_, gp) => h('div', { class: 'job__group' },
          T('h4', gp + '.title', null, { ph: '업무 영역' }),
          L(gp + '.bullets', (_, bp) => h('li', null, T('span', bp, null, { rich: true })), () => '내용', { cls: 'bullets' })),
          () => ({ title: '업무 영역', bullets: ['내용'] }), { tag: 'div', cls: 'job__groups', addLabel: '업무 영역' })),
        () => ({ company: '회사명', role: '직무', period: '기간', stack: [], groups: [] }), { tag: 'div', cls: 'jobs', addLabel: '경력 추가' })));
  }

  function renderProject(p, i, isFirst) {
    const d = state.data, path = 'projects.' + i;
    const hidden = !!p.hidden;
    if (hidden && !state.edit) return null;

    const tools = state.edit ? h('div', { class: 'ed-ctl project__tools' },
      ctl(hidden ? '보이기' : '숨기기', () => { p.hidden = !hidden; commit(); }),
      ctl('↑', () => { if (i > 0) { d.projects.splice(i - 1, 0, d.projects.splice(i, 1)[0]); commit(); } }),
      ctl('↓', () => { if (i < d.projects.length - 1) { d.projects.splice(i + 1, 0, d.projects.splice(i, 1)[0]); commit(); } }),
      ctl('삭제', () => { if (confirm(`'${p.title}' 프로젝트를 삭제할까요?`)) { d.projects.splice(i, 1); commit(); } }, 'ed-danger')) : null;

    const card = h('article', { class: 'project' },
      tools,
      h('div', { class: 'project__top' },
        IMG(path + '.thumbnail', 'project__thumb', p.title + ' 썸네일'),
        h('div', { class: 'project__meta' },
          T('p', path + '.badge', 'project__badge', { optional: true, ph: '배지(선택)' }),
          h('h3', { class: 'project__title' }, T('span', path + '.title', null, { ph: '프로젝트명' })),
          T('p', path + '.subtitle', 'project__subtitle', { optional: true, ph: '한 줄 설명' }),
          h('dl', { class: 'project__facts' },
            h('div', null, h('dt', null, '기간'), T('dd', path + '.period', null, { ph: '기간' })),
            h('div', null, h('dt', null, '인원'), T('dd', path + '.team', null, { ph: '구성' })),
            h('div', null, h('dt', null, '역할'), T('dd', path + '.role', null, { ph: '역할' }))),
          L(path + '.links', (_, lp) => h('li', null, A(lp, 'pill')), () => ({ label: '링크', url: 'https://' }), { cls: 'project__links', addLabel: '링크' }))),
      h('div', { class: 'project__body' },
        h('p', { class: 'project__summary' }, T('span', path + '.summary', null, { rich: true, ph: '프로젝트 소개' })),
        h('div', { class: 'project__stack' },
          h('h4', { class: 'mini-title' }, 'Tech Stack'),
          L(path + '.stack', (_, sp) => h('div', { class: 'stack-row' },
            T('span', sp + '.label', 'stack-label', { optional: true, ph: '분류' }), chips(sp + '.items', 'chip--sm')),
            () => ({ label: '', items: [] }), { tag: 'div', addLabel: '스택 줄' })),
        h('div', { class: 'project__details-wrap' },
          h('h4', { class: 'mini-title' }, '개발 내용'),
          L(path + '.details', (_, dp) => h('div', { class: 'detail' },
            T('h5', dp + '.title', null, { ph: '핵심 내용' }),
            T('p', dp + '.text', null, { rich: true, ph: '설명' })),
            () => ({ title: '새 항목', text: '설명' }), { tag: 'div', cls: 'project__details', addLabel: '개발 내용' }))));

    const kids = [];
    if (isFirst) kids.push(h('div', { class: 'block', id: 'projects' }, secHead('Project Experience.', 'projects')));
    kids.push(h('div', { class: 'block' + (hidden ? ' is-hidden' : '') }, card));
    return sheet('project-' + i, 'sheet--project', kids);
  }

  function renderEducation() {
    const list = path => L(path, (_, p) => h('li', null, T('span', p + '.date', 'tl-date', { ph: '날짜' }), T('span', p + '.text', 'tl-text', { ph: '내용' })), () => ({ date: '', text: '' }), { cls: 'timeline' });
    const groups = [['Education', 'education'], ['IT - Education', 'itEducation'], ['Certificate', 'certificates'], ['Award', 'awards']];
    return sheet('education', 'sheet--edu', block('education', secHead('Education & More.', 'education'),
      h('div', { class: 'edu-list' }, groups.map(([title, key]) =>
        h('div', { class: 'edu-group' }, h('h3', { class: 'edu-title' }, title), list(key))))));
  }

  /* ───────── 렌더 ───────── */
  const app = document.getElementById('app');
  function render() {
    const d = state.data;
    const y = window.scrollY;
    document.title = d.meta.siteTitle || document.title;
    document.body.classList.toggle('editing', state.edit);
    app.innerHTML = '';
    const sheets = [renderCover(), renderMotivationSkills(), renderWork()];
    if (!isHidden('projects') || state.edit) {
      let first = true;
      d.projects.forEach((p, i) => { const s = renderProject(p, i, first); if (s) { sheets.push(s); first = false; } });
      if (state.edit) sheets.push(h('div', { class: 'ed-ctl ed-add ed-add--project' },
        ctl('+ 프로젝트 추가', () => {
          d.projects.push({ title: '새 프로젝트', subtitle: '', team: '', period: '', role: '', badge: '', thumbnail: '', links: [], summary: '프로젝트 소개', stack: [{ label: '', items: [] }], details: [] });
          commit();
        })));
      if (isHidden('projects') && state.edit) sheets.forEach(s => s && s.classList.contains('sheet--project') && s.classList.add('is-hidden'));
    }
    sheets.push(renderEducation());
    sheets.filter(Boolean).forEach(s => app.append(s));
    numberPages();
    renderNav();
    if (state.paper) requestAnimationFrame(fitSheets);
    window.scrollTo(0, y);
  }

  function numberPages() {
    let n = 0, last = null;
    app.querySelectorAll('.sheet').forEach(s => {
      const num = s.querySelector('.sheet__num');
      s.classList.remove('is-last');
      if (s.classList.contains('is-hidden')) { num.textContent = ''; return; }
      num.textContent = ++n; last = s;
    });
    if (last) last.classList.add('is-last');   // 마지막 페이지 뒤 빈 페이지 방지
  }

  function renderNav() {
    const nav = document.getElementById('nav'); nav.innerHTML = '';
    const items = [['About', 'about', 'about'], ['Experience', 'work', 'work'], ['Projects', 'projects', 'projects'], ['Education', 'education', 'education']];
    items.forEach(([label, key, id]) => { if (!isHidden(key) && document.getElementById(id)) nav.append(h('a', { href: '#' + id }, label)); });
  }

  /* ───────── A4 맞춤: 넘치면 글자/썸네일을 조금씩 줄여서 한 페이지에 맞춤 ───────── */
  function fitSheets() {
    app.querySelectorAll('.sheet').forEach(s => {
      const body = s.querySelector('.sheet__body');
      let f = 1, t = 1;
      const apply = () => { s.style.setProperty('--fit', f.toFixed(3)); s.style.setProperty('--thumb', t.toFixed(3)); };
      const over = () => body.scrollHeight > body.clientHeight + 1;
      apply(); s.classList.remove('overflow');
      while (over() && f > 0.9) { f -= 0.02; apply(); }
      while (over() && t > 0.72) { t -= 0.04; apply(); }
      while (over() && f > 0.8) { f -= 0.02; apply(); }
      if (over()) s.classList.add('overflow');
    });
    const bad = app.querySelectorAll('.sheet.overflow:not(.is-hidden)').length;
    if (bad && state.edit) toast(`${bad}개 페이지의 내용이 A4 한 장을 넘어요 (빨간 테두리). 내용을 조금 줄여주세요.`, 5000);
  }

  function setPaper(on) {
    state.paper = on;
    document.body.classList.toggle('paper', on);
    const b = document.getElementById('btnPaper'); if (b) b.textContent = on ? '웹 보기' : 'A4 미리보기';
    if (on) fitSheets();
    else app.querySelectorAll('.sheet').forEach(s => { s.style.removeProperty('--fit'); s.style.removeProperty('--thumb'); s.classList.remove('overflow'); });
  }

  // 인쇄(PDF) 창이 닫히면 원래 보던 화면(웹/A4 미리보기)으로 복귀
  let printing = false, paperBeforePrint = false, titleBeforePrint = '';
  function beforePrint() {
    if (printing) { fitSheets(); return; }   // PDF 버튼 → window.print()의 beforeprint 중복 호출 방지
    printing = true;
    if (document.activeElement && document.activeElement.blur) document.activeElement.blur();
    paperBeforePrint = state.paper;
    titleBeforePrint = document.title;
    document.title = state.data.meta.pdfFileName || '포트폴리오';
    if (!state.paper) setPaper(true); else fitSheets();
  }
  function afterPrint() {
    if (!printing) return;
    printing = false;
    document.title = titleBeforePrint || document.title;
    if (!paperBeforePrint) setPaper(false);
  }
  window.addEventListener('beforeprint', beforePrint);
  window.addEventListener('afterprint', afterPrint);

  async function downloadPdf() {
    // 이미지 로딩이 끝난 뒤 인쇄(→ 'PDF로 저장') — 텍스트·링크가 살아있는 벡터 PDF
    await Promise.all([...app.querySelectorAll('img')].map(img => img.complete ? 0 : new Promise(r => { img.onload = img.onerror = r; })));
    if (document.fonts && document.fonts.ready) await document.fonts.ready;
    beforePrint();
    toast('인쇄 창에서 대상을 ‘PDF로 저장’으로 선택하세요', 3500);
    setTimeout(() => { window.print(); afterPrint(); }, 60);   // print()는 창이 닫힐 때까지 대기 → 닫히면 즉시 복귀
  }

  /* ───────── 편집 입력 처리 ───────── */
  let draftTimer = 0, fitTimer = 0;
  function saveDraft() {
    const ok = store.set(LS_DRAFT, JSON.stringify({ base: BASE_HASH, savedAt: Date.now(), data: state.data }));
    if (!ok) toast('브라우저 임시저장 용량을 넘었어요. data.js 내보내기 또는 GitHub 저장을 해주세요.', 5000);
  }
  function commit() { saveDraft(); render(); }

  app.addEventListener('input', e => {
    const el = e.target.closest('[data-path]');
    if (!el || !state.edit) return;
    set(el.dataset.path, el.dataset.rich ? sanitize(el.innerHTML) : el.innerText.replace(/\n+$/, ''));
    clearTimeout(draftTimer); draftTimer = setTimeout(saveDraft, 400);
    if (state.paper) { clearTimeout(fitTimer); fitTimer = setTimeout(fitSheets, 500); }
  });
  app.addEventListener('keydown', e => {
    const el = e.target.closest('[data-path]');
    if (!el || e.key !== 'Enter') return;
    e.preventDefault();
    if (e.shiftKey && el.dataset.rich) document.execCommand('insertLineBreak');
    else el.blur();
  });
  app.addEventListener('paste', e => {
    const el = e.target.closest('[data-path]');
    if (!el) return;
    e.preventDefault();
    const text = (e.clipboardData || window.clipboardData).getData('text/plain').replace(/\s*\n\s*/g, ' ');
    document.execCommand('insertText', false, text);
  });
  app.addEventListener('click', e => {
    if (!state.edit) return;
    const a = e.target.closest('a[href]');
    if (a && !e.target.closest('.ed-btn')) e.preventDefault();   // 편집 중엔 링크 이동 대신 글자 수정
  });
  app.addEventListener('focusout', e => {
    const el = e.target.closest && e.target.closest('[data-rich]');
    if (el && state.edit) el.innerHTML = sanitize(el.innerHTML);
  });

  /* ───────── 이미지 교체 (브라우저에서 리사이즈·압축) ───────── */
  let imagePath = null;
  const fileImage = document.getElementById('fileImage');
  function pickImage(path) { imagePath = path; fileImage.value = ''; fileImage.click(); }
  fileImage.addEventListener('change', async () => {
    const f = fileImage.files[0]; if (!f || !imagePath) return;
    try {
      const url = await compressImage(f, imagePath.endsWith('photo') ? 800 : 1600);
      set(imagePath, url); commit(); toast('이미지를 바꿨어요');
    } catch (e) { toast('이미지를 읽지 못했어요'); }
  });
  function compressImage(file, maxW) {
    return new Promise((resolve, reject) => {
      const img = new Image(), fr = new FileReader();
      fr.onload = () => { img.src = fr.result; };
      fr.onerror = reject;
      img.onerror = reject;
      img.onload = () => {
        const scale = Math.min(1, maxW / img.naturalWidth);
        const c = document.createElement('canvas');
        c.width = Math.round(img.naturalWidth * scale); c.height = Math.round(img.naturalHeight * scale);
        const ctx = c.getContext('2d'); ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, c.width, c.height);
        ctx.drawImage(img, 0, 0, c.width, c.height);
        resolve(c.toDataURL('image/jpeg', 0.86));
      };
      fr.readAsDataURL(file);
    });
  }

  /* ───────── 편집 모드 진입/종료 ───────── */
  const dlgLogin = document.getElementById('dlgLogin');
  document.querySelectorAll('dialog [data-close]').forEach(b => b.addEventListener('click', () => b.closest('dialog').close('cancel')));
  function setEdit(on) {
    state.edit = on;
    document.getElementById('editbar').hidden = !on;
    document.getElementById('btnLock').classList.toggle('is-on', on);
    render();
    if (on && state.staleDraft) {
      const d = state.staleDraft; state.staleDraft = null;
      const when = new Date(d.savedAt || 0).toLocaleString('ko-KR');
      if (confirm(`이전 버전 사이트 기준으로 임시저장된 수정 내용이 있어요 (${when}).\n불러올까요? (취소하면 현재 사이트 내용으로 편집합니다)`)) { state.data = d.data; commit(); }
    }
  }
  document.getElementById('btnLock').addEventListener('click', () => {
    if (state.edit) { setEdit(false); return; }
    if (store.get(SS_AUTH, sessionStorage) === '1') { setEdit(true); return; }
    document.getElementById('pwError').hidden = true;
    document.getElementById('inpPw').value = '';
    dlgLogin.showModal();
  });
  document.getElementById('formLogin').addEventListener('submit', e => {
    e.preventDefault();   // 틀리면 창을 닫지 않고 오류만 표시
    const inp = document.getElementById('inpPw');
    if (sha256(inp.value) === EDIT_PASSWORD_SHA256) {
      dlgLogin.close('ok');
      store.set(SS_AUTH, '1', sessionStorage); setEdit(true); toast('편집 모드가 켜졌어요');
    } else {
      document.getElementById('pwError').hidden = false; inp.select();
    }
  });
  document.getElementById('btnLockOut').addEventListener('click', () => { store.del(SS_AUTH, sessionStorage); setEdit(false); toast('편집을 종료했어요'); });
  document.getElementById('btnPaper').addEventListener('click', () => setPaper(!state.paper));
  document.getElementById('btnPdf').addEventListener('click', downloadPdf);
  document.getElementById('btnReset').addEventListener('click', () => {
    if (!confirm('이 브라우저에 임시저장된 수정 내용을 지우고 사이트 원본으로 되돌릴까요?')) return;
    store.del(LS_DRAFT); state.data = clone(ORIGINAL); render(); toast('원본으로 되돌렸어요');
  });

  /* ───────── data.js 내보내기 / 불러오기 ───────── */
  function dataJs(data) {
    return '/* 포트폴리오 콘텐츠 데이터 — 편집 모드에서 저장됨 (' + new Date().toISOString().slice(0, 10) + ') */\n' +
      'window.PORTFOLIO_DATA = ' + JSON.stringify(data, null, 2) + ';\n';
  }
  document.getElementById('btnExport').addEventListener('click', () => {
    const blob = new Blob([dataJs(state.data)], { type: 'text/javascript' });
    const a = h('a', { href: URL.createObjectURL(blob), download: 'data.js' }); document.body.append(a); a.click(); a.remove();
    toast('data.js를 저장했어요. 저장소의 js/data.js를 이 파일로 바꾸면 사이트에 반영돼요.', 4500);
  });
  const fileImport = document.getElementById('fileImport');
  document.getElementById('btnImport').addEventListener('click', () => { fileImport.value = ''; fileImport.click(); });
  fileImport.addEventListener('change', async () => {
    const f = fileImport.files[0]; if (!f) return;
    try {
      const txt = await f.text();
      const json = txt.slice(txt.indexOf('{'), txt.lastIndexOf('}') + 1);
      state.data = JSON.parse(json); commit(); toast('불러왔어요');
    } catch (e) { toast('파일 형식을 읽지 못했어요'); }
  });

  /* ───────── GitHub에 저장 (사용자 본인 토큰으로 커밋) ───────── */
  const dlgGh = document.getElementById('dlgGithub');
  const ghStatus = document.getElementById('ghStatus');
  document.getElementById('btnGithub').addEventListener('click', () => {
    let cfg = {}; try { cfg = JSON.parse(store.get(LS_GH) || '{}'); } catch (e) { /* noop */ }
    document.getElementById('ghRepo').value = cfg.repo || 'Songyeonji/portfolio';
    document.getElementById('ghBranch').value = cfg.branch || 'main';
    document.getElementById('ghToken').value = cfg.token || '';
    ghStatus.textContent = '';
    dlgGh.showModal();
  });
  document.getElementById('formGithub').addEventListener('submit', async e => {
    e.preventDefault();
    const repo = document.getElementById('ghRepo').value.trim().replace(/^https:\/\/github\.com\//, '').replace(/\.git$/, '');
    const branch = document.getElementById('ghBranch').value.trim();
    const token = document.getElementById('ghToken').value.trim();
    store.set(LS_GH, JSON.stringify({ repo, branch, token }));
    const btn = document.getElementById('ghSubmit'); btn.disabled = true;
    try {
      await commitToGithub(repo, branch, token, msg => { ghStatus.textContent = msg; });
      ghStatus.textContent = '완료! GitHub Pages 반영까지 1~2분 정도 걸려요.';
      store.del(LS_DRAFT);
      toast('GitHub에 저장했어요');
    } catch (err) {
      ghStatus.textContent = '실패: ' + (err.message || err);
    } finally { btn.disabled = false; }
  });

  const b64utf8 = s => { const bytes = new TextEncoder().encode(s); let bin = ''; for (let i = 0; i < bytes.length; i += 0x8000) bin += String.fromCharCode.apply(null, bytes.subarray(i, i + 0x8000)); return btoa(bin); };
  async function gh(token, method, url, body) {
    const r = await fetch('https://api.github.com' + url, {
      method, headers: { Authorization: 'Bearer ' + token, Accept: 'application/vnd.github+json', 'X-GitHub-Api-Version': '2022-11-28' },
      body: body ? JSON.stringify(body) : undefined
    });
    if (r.status === 404 && method === 'GET') return null;
    const j = await r.json().catch(() => ({}));
    if (!r.ok) throw new Error(`${r.status} ${j.message || ''}`);
    return j;
  }
  async function putFile(token, repo, branch, path, base64, message) {
    const enc = path.split('/').map(encodeURIComponent).join('/');
    const cur = await gh(token, 'GET', `/repos/${repo}/contents/${enc}?ref=${encodeURIComponent(branch)}`);
    return gh(token, 'PUT', `/repos/${repo}/contents/${enc}`, { message, content: base64, branch, sha: cur && cur.sha });
  }
  async function commitToGithub(repo, branch, token, log) {
    const out = clone(state.data);
    // 1) 새로 올린 이미지(data URL)를 assets/uploads/ 에 파일로 업로드하고 경로로 치환
    const uploads = [];
    (function scan(o) {
      for (const k in o) {
        if (typeof o[k] === 'string' && o[k].startsWith('data:image/')) uploads.push([o, k]);
        else if (o[k] && typeof o[k] === 'object') scan(o[k]);
      }
    })(out);
    for (let i = 0; i < uploads.length; i++) {
      const [o, k] = uploads[i];
      const m = o[k].match(/^data:image\/(\w+);base64,(.*)$/);
      if (!m) continue;
      const ext = m[1] === 'jpeg' ? 'jpg' : m[1];
      const path = `assets/uploads/${sha256(m[2]).slice(0, 12)}.${ext}`;
      log(`이미지 업로드 중… (${i + 1}/${uploads.length})`);
      await putFile(token, repo, branch, path, m[2], 'chore: 포트폴리오 이미지 업로드');
      o[k] = path;
    }
    // 2) data.js 커밋
    log('내용 저장 중…');
    await putFile(token, repo, branch, 'js/data.js', b64utf8(dataJs(out)), 'docs: 포트폴리오 내용 수정 (편집 모드)');
  }

  /* ───────── 토스트 ───────── */
  let toastTimer = 0;
  function toast(msg, ms = 2400) {
    const t = document.getElementById('toast');
    t.textContent = msg; t.classList.add('show');
    clearTimeout(toastTimer); toastTimer = setTimeout(() => t.classList.remove('show'), ms);
  }

  /* ───────── 시작 ───────── */
  render();
  if (/[?&]paper\b/.test(location.search)) setPaper(true);   // ?paper → A4 미리보기로 열기
})();
