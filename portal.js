'use strict';
(function () {
  const app = document.getElementById('app');
  const params = new URLSearchParams(location.search);
  const PREVIEW = params.get('preview') === '1';
  // Caminhos relativos: funcionam na raiz do servidor e também em subpasta (ex.: GitHub Pages).
  const CH = (n) => `p-${n}.png`;
  // Versão estática (site exportado): os dados vêm de arquivos .json em vez da API.
  const STATIC = !!document.querySelector('meta[name="jgc-static"]');
  const SVG_NS = 'http://www.w3.org/2000/svg';

  // ---------- utilidades ----------
  function h(tag, attrs, ...kids) {
    const el = document.createElement(tag);
    for (const [k, v] of Object.entries(attrs || {})) {
      if (v === false || v == null) continue;
      if (k === 'class') el.className = v;
      else if (k.startsWith('on')) el.addEventListener(k.slice(2), v);
      else el.setAttribute(k, v === true ? '' : v);
    }
    for (const kid of kids.flat()) if (kid != null && kid !== false) el.append(kid.nodeType ? kid : document.createTextNode(kid));
    return el;
  }
  function icon(path, viewBox = '0 0 24 24') {
    const s = document.createElementNS(SVG_NS, 'svg');
    s.setAttribute('viewBox', viewBox); s.setAttribute('aria-hidden', 'true'); s.setAttribute('fill', 'currentColor');
    const p = document.createElementNS(SVG_NS, 'path'); p.setAttribute('d', path); s.append(p);
    return s;
  }
  const ICONS = {
    speaker: 'M3 9v6h4l5 5V4L7 9H3zm13.5 3A4.5 4.5 0 0 0 14 7.97v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z',
    pause: 'M6 5h4v14H6zM14 5h4v14h-4z',
    play: 'M8 5v14l11-7z',
    replay: 'M12 5V1L7 6l5 5V7c3.31 0 6 2.69 6 6s-2.69 6-6 6-6-2.69-6-6H4c0 4.42 3.58 8 8 8s8-3.58 8-8-3.58-8-8-8z',
  };
  async function api(path) {
    if (STATIC) path = path.replace(/^\/api\/farms$/, 'farms.json').replace(/^\/api\/farms\/([^/?]+)\/benefits.*$/, 'data-$1.json');
    const res = await fetch(path, { credentials: 'same-origin' });
    if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || 'Não foi possível carregar.');
    return res.json();
  }
  const norm = (s) => String(s).normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
  const fmtDate = (iso) => new Date(iso).toLocaleDateString('pt-BR');

  // Ícones de linha (24x24), todos no mesmo estilo; cor herdada do texto (currentColor).
  const GLYPHS = {
    farm: '<path d="M3 21V10l9-6 9 6v11"/><path d="M9 21v-6h6v6"/><path d="M2 21h20"/><path d="M12 10v.01"/>',
    food: '<path d="M7 3v7M4.5 3v5a2.5 2.5 0 0 0 5 0V3"/><path d="M7 10v11"/><path d="M17 21V3c-2.2 1.6-3 4-3 7h3"/>',
    health: '<rect x="4" y="4" width="16" height="16" rx="4"/><path d="M12 8v8M8 12h8"/>',
    transport: '<rect x="4" y="4" width="16" height="13" rx="2.5"/><path d="M4 11h16M7 17v3M17 17v3M8 14h.01M16 14h.01"/>',
    home: '<path d="M3 11l9-8 9 8"/><path d="M5 9.5V21h14V9.5"/><path d="M10 21v-6h4v6"/>',
    school: '<path d="M12 6C10 4.7 7 4 4 4v14c3 0 6 .7 8 2 2-1.3 5-2 8-2V4c-3 0-6 .7-8 2z"/><path d="M12 6v14"/>',
    family: '<circle cx="9" cy="8" r="3"/><circle cx="17" cy="9" r="2.5"/><path d="M3 20c0-3.5 2.5-6 6-6s6 2.5 6 6"/><path d="M15.5 14.2c3 0 5.5 1.6 5.5 4.8"/>',
    leisure: '<circle cx="12" cy="12" r="9"/><path d="M5 6c4 3 10 3 14 0M5 18c4-3 10-3 14 0M12 3v18"/>',
    shield: '<path d="M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6z"/><path d="M9 12l2 2 4-4"/>',
    money: '<circle cx="12" cy="12" r="9"/><path d="M12 6.5v11M9.3 9.6c0-1.1 1.2-1.9 2.7-1.9s2.7.8 2.7 1.9-1.2 1.6-2.7 2-2.7.9-2.7 2 1.2 1.9 2.7 1.9 2.7-.8 2.7-1.9"/>',
    shirt: '<path d="M8 3L3 7l3 3 2-1.2V21h8V8.8L18 10l3-3-5-4c-.8 1.7-2 2.5-4 2.5S8.8 4.7 8 3z"/>',
    calendar: '<rect x="3" y="5" width="18" height="16" rx="2.5"/><path d="M3 10h18M8 3v4M16 3v4"/>',
    leaf: '<path d="M5 19C5 10 10 5 20 4c0 10-5 15-15 15z"/><path d="M5 19c3-5 6-8 10-10"/>',
    list: '<path d="M8 6h12M8 12h12M8 18h12M4 6h.01M4 12h.01M4 18h.01"/>',
    info: '<circle cx="12" cy="12" r="9"/><path d="M12 11v6M12 7.5v.01"/>',
    gift: '<rect x="3" y="8" width="18" height="4" rx="1"/><path d="M5 12v9h14v-9M12 8v13"/><path d="M12 8C10 8 8 7 8 5.5S9.5 3 12 8zM12 8c2 0 4-1 4-2.5S14.5 3 12 8z"/>',
    steps: '<circle cx="6" cy="6" r="2"/><circle cx="18" cy="12" r="2"/><circle cx="6" cy="18" r="2"/><path d="M8 6h4a3 3 0 0 1 3 3v1M16 13v1a3 3 0 0 1-3 3H8"/>',
    touch: '<path d="M9 11V5a2 2 0 0 1 4 0v5l5 1.5a2 2 0 0 1 1.4 2.2L18.6 20H9.4L5 14.5a1.8 1.8 0 0 1 2.7-2.3L9 13.5"/>',
    alert: '<path d="M12 3L2 20h20z"/><path d="M12 10v5M12 17.5v.01"/>',
    help: '<circle cx="12" cy="12" r="9"/><path d="M9.5 9.5a2.5 2.5 0 1 1 3.6 2.2c-.7.4-1.1 1-1.1 1.8M12 17v.01"/>',
    mute: '<path d="M3 9v6h4l5 5V4L7 9z"/><path d="M17 9l5 6M22 9l-5 6"/>',
    arrow: '<path d="M5 12h14M13 6l6 6-6 6"/>',
    plus: '<path d="M12 5v14M5 12h14"/>',
  };
  function glyph(name, cls) {
    const s = document.createElementNS(SVG_NS, 'svg');
    s.setAttribute('viewBox', '0 0 24 24'); s.setAttribute('aria-hidden', 'true'); s.setAttribute('focusable', 'false');
    s.setAttribute('class', 'gl' + (cls ? ' ' + cls : ''));
    s.innerHTML = GLYPHS[name] || GLYPHS.leaf; // textos fixos do código, nunca dados de usuário
    return s;
  }
  const CAT_ICONS = [
    [/aliment|refei|cesta|marmit|mercad|cafe/, 'food'], [/saude|medic|odont|dent|plano|farmac|clinic|exame/, 'health'],
    [/transport|onibus|veicul|combust|carona|vale/, 'transport'], [/moradia|casa|aloj|habita|alug/, 'home'],
    [/educa|estudo|curso|escola|bolsa|treina|capacit/, 'school'], [/famil|filho|crianc|creche|dependent/, 'family'],
    [/lazer|esporte|festa|cultur|evento|confrat/, 'leisure'], [/segur|vida|previd|aposent/, 'shield'],
    [/financ|dinheiro|adiant|emprest|premi|bonus|participa|salari|reembols/, 'money'], [/uniforme|epi|vestu|roupa/, 'shirt'],
    [/folga|descanso|ferias|licenca|abono|ausenc/, 'calendar'],
  ];
  function catGlyph(name, cls) {
    const n = norm(name);
    for (const [re, g] of CAT_ICONS) if (re.test(n)) return glyph(g, cls);
    return glyph('leaf', cls);
  }
  const FACT_ICONS = { 'O que é': 'info', 'O que oferece': 'gift', 'Como funciona': 'steps', 'Como usar': 'touch', 'Atenção': 'alert' };

  // ---------- logo ----------
  const brand = document.getElementById('brand');
  (function buildLogo() {
    const fallback = () => {
      const svg = document.createElementNS(SVG_NS, 'svg');
      svg.setAttribute('viewBox', '0 0 64 64'); svg.setAttribute('aria-hidden', 'true');
      const a = document.createElementNS(SVG_NS, 'path'); a.setAttribute('d', 'M32 6c-10 0-18 12-18 26 0 12 8 24 18 24s18-12 18-24C50 18 42 6 32 6z'); a.setAttribute('fill', '#8fb339');
      const c = document.createElementNS(SVG_NS, 'circle'); c.setAttribute('cx', 32); c.setAttribute('cy', 38); c.setAttribute('r', 10); c.setAttribute('fill', '#6b4a2f');
      svg.append(a, c);
      brand.replaceChildren(svg, h('span', null, 'Jaguacy'));
    };
    fallback();
    // Para usar o logotipo oficial, salve-o em public/assets/logo.png (ele substitui o texto automaticamente).
    const img = new Image();
    img.alt = 'Jaguacy';
    img.onload = () => brand.replaceChildren(img);
    let triedSvg = false;
    img.onerror = () => { if (!triedSvg) { triedSvg = true; img.src = 'logo.svg'; } };
    img.src = 'logo.png';
  })();

  // ---------- acessibilidade: tamanho da letra ----------
  const root = document.documentElement;
  let fs = 0;
  try { fs = Number(localStorage.getItem('jgc-fs')) || 0; } catch { /* sem armazenamento */ }
  const fsBtn = document.getElementById('fontsize');
  function applyFs() {
    root.classList.remove('fs-1', 'fs-2');
    if (fs) root.classList.add('fs-' + fs);
    fsBtn.textContent = ['A+ Letras', 'A++ Letras', 'A Letras'][fs];
    fsBtn.setAttribute('aria-label', ['Aumentar o tamanho das letras', 'Aumentar mais o tamanho das letras', 'Voltar ao tamanho normal das letras'][fs]);
  }
  fsBtn.addEventListener('click', () => { fs = (fs + 1) % 3; try { localStorage.setItem('jgc-fs', fs); } catch { /* ok */ } applyFs(); });
  applyFs();
  if (PREVIEW) document.getElementById('preview-banner').hidden = false;

  const backBtn = document.getElementById('back');
  backBtn.addEventListener('click', () => history.length > 1 ? history.back() : (location.hash = '#/'));

  // ---------- audio: um unico player por vez, nunca automatico ----------
  let current = null; // { audio, reset }
  // Velocidade de reprodução (lembrada neste aparelho). Padrão um pouco mais rápido que o normal.
  const RATES = [1, 1.15, 1.3, 1.5];
  let rateIdx = 1;
  try { const r = Number(localStorage.getItem('jgc-rate')); if (RATES.includes(r)) rateIdx = RATES.indexOf(r); } catch { /* ok */ }
  const rateLabel = () => `${String(RATES[rateIdx]).replace('.', ',')}x`;
  function stopCurrent() { if (current) { current.audio.pause(); current.reset(); current = null; } }

  function mmss(s) { s = Math.floor(s || 0); return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`; }

  function audioPlayer(b) {
    const audio = new Audio();
    audio.preload = 'none';
    audio.src = b.audio_url;
    const status = h('div', { class: 'status', role: 'status' });
    const bar = h('div');
    const progress = h('div', { class: 'progress', hidden: true, 'aria-hidden': 'true' }, bar);
    const label = h('span');
    const ico = h('span');
    const eq = h('span', { class: 'eq', 'aria-hidden': 'true' }, h('i'), h('i'), h('i'));
    const main = h('button', { class: 'btn listen', type: 'button' }, ico, label, eq);
    const again = h('button', { class: 'btn secondary', type: 'button', hidden: true }, icon(ICONS.replay), 'Repetir');
    const speed = h('button', { class: 'btn secondary', type: 'button' });
    const showRate = () => { speed.textContent = rateLabel(); speed.setAttribute('aria-label', `Velocidade do áudio: ${rateLabel()}. Toque para mudar.`); };
    showRate();
    speed.addEventListener('click', () => {
      rateIdx = (rateIdx + 1) % RATES.length;
      try { localStorage.setItem('jgc-rate', RATES[rateIdx]); } catch { /* ok */ }
      audio.playbackRate = RATES[rateIdx]; showRate();
    });
    const wrap = h('div', { class: 'player' }, main, progress, h('div', { class: 'row' }, again, speed), status);
    // Botão de áudio ao lado do nome do benefício (para quem não lê): usa o mesmo áudio do botão grande.
    const miniIco = h('span');
    const miniLbl = h('span');
    const mini = h('button', { class: 'mini', type: 'button' }, miniIco, miniLbl);
    mini.addEventListener('click', () => main.click());
    wrap.mini = mini;

    function view(state) {
      wrap.classList.toggle('playing', state === 'playing');
      const map = {
        idle: [ICONS.speaker, 'OUVIR EXPLICAÇÃO', `Ouvir explicação de ${b.name}`],
        playing: [ICONS.pause, 'PAUSAR', `Pausar explicação de ${b.name}`],
        paused: [ICONS.play, 'CONTINUAR', `Continuar explicação de ${b.name}`],
        ended: [ICONS.replay, 'OUVIR DE NOVO', `Ouvir de novo a explicação de ${b.name}`],
        loading: [ICONS.speaker, 'CARREGANDO…', 'Carregando áudio'],
      };
      const [p, t, aria] = map[state];
      ico.replaceChildren(icon(p));
      label.textContent = t;
      main.setAttribute('aria-label', aria);
      miniIco.replaceChildren(icon(p));
      miniLbl.textContent = { playing: 'Pausar', paused: 'Continuar', ended: 'Ouvir', loading: '...', idle: 'Ouvir' }[state];
      mini.setAttribute('aria-label', aria);
      mini.classList.toggle('on', state === 'playing');
      again.hidden = !(state === 'paused' || state === 'playing');
      progress.hidden = state === 'idle';
      status.className = 'status';
      status.textContent = { playing: 'Tocando…', paused: 'Em pausa', ended: 'Terminou', idle: '', loading: 'Carregando…' }[state];
    }
    view('idle');
    const self = { audio, reset: () => { bar.style.width = '0'; view('idle'); } };

    main.addEventListener('click', () => {
      if (!audio.paused && !audio.ended) { audio.pause(); return; }
      if (current && current !== self) stopCurrent();
      current = self;
      if (audio.ended) audio.currentTime = 0;
      view('loading');
      audio.play().catch(() => {
        view('idle'); status.className = 'status err';
        status.textContent = 'Não foi possível tocar o áudio. Verifique o volume e a internet e tente de novo.';
      });
    });
    again.addEventListener('click', () => {
      if (current && current !== self) stopCurrent();
      current = self; audio.currentTime = 0; audio.play().catch(() => view('idle'));
    });
    audio.addEventListener('playing', () => { audio.playbackRate = RATES[rateIdx]; showRate(); view('playing'); });
    audio.addEventListener('pause', () => { if (!audio.ended) view('paused'); });
    audio.addEventListener('ended', () => { view('ended'); bar.style.width = '100%'; });
    audio.addEventListener('timeupdate', () => {
      if (audio.duration) bar.style.width = `${(audio.currentTime / audio.duration) * 100}%`;
      if (!audio.paused) status.textContent = `Tocando… ${mmss(audio.currentTime)} / ${mmss(audio.duration)}`;
    });
    audio.addEventListener('error', () => {
      view('idle'); status.className = 'status err';
      status.textContent = 'O áudio não está disponível agora. Peça ajuda ao RH.';
    });
    return wrap;
  }

  // ---------- componentes ----------
  // Cada localidade é recebida por um personagem diferente (só decoração; troque à vontade).
  const FARM_CHAR = {
    arealva: 'campo-infraestrutura', avai: 'packing', bauru: 'administrativo', fartura: 'fabrica',
    'rocas-sales': 'oficina', timburi: 'laboratorio', tejupa: 'modelo-de-gestao', box: 'encarregado-de-pessoal',
  };
  function guide(img, title, text, tag = 'h2', extra = '') {
    return h('div', { class: 'guide ' + extra },
      Array.isArray(img)
        ? h('div', { class: 'crew', 'aria-hidden': 'true' }, img.map((n) => h('img', { src: CH(n), alt: '', height: 120 })))
        : h('img', { src: CH(img), alt: '', width: 120, height: 240 }),
      h('div', { class: 'bubble' }, h(tag, null, title), text ? h('p', null, text) : null));
  }

  function benefitCard(b) {
    const facts = b.simple_text.split('\n').map((l) => l.trim()).filter(Boolean).map((l) => {
      const i = l.indexOf(':');
      return i > 0 ? [l.slice(0, i).trim(), l.slice(i + 1).trim()] : ['', l];
    });
    const more = [];
    more.push(h('h4', null, 'Texto oficial'), h('p', null, b.official_description));
    if (b.usage_rules) more.push(h('h4', null, 'Regras de uso'), h('p', null, b.usage_rules));
    if (b.conditions) more.push(h('h4', null, 'Condições e observações'), h('p', null, b.conditions));
    const player = b.audio_url ? audioPlayer(b) : null;
    const pic = h('div', { class: 'pic' }, b.image_url ? h('img', { src: b.image_url, alt: '', loading: 'lazy' }) : catGlyph(b.category, 'big'));
    return h('article', { class: 'card', 'aria-label': b.name },
      pic,
      h('div', { class: 'body' },
        b.status && b.status !== 'published' ? h('span', { class: 'badge draft' }, `NÃO PUBLICADO · ${({ draft: 'Rascunho', review: 'Em revisão', rejected: 'Rejeitado' })[b.status] || b.status}`) : null,
        h('div', { class: 'titlerow' }, h('div', null, h('div', { class: 'cat-tag' }, catGlyph(b.category), b.category), h('h3', null, b.name)), player ? player.mini : null),
        facts.length ? h('ul', { class: 'facts' }, facts.map(([k, v]) => h('li', null, h('span', { class: 'fi' }, glyph(FACT_ICONS[k] || 'info')), h('span', null, k ? h('b', null, k + ': ') : null, v)))) : null,
        player || h('div', { class: 'missing' }, glyph('mute'), h('span', null, 'O áudio deste benefício ainda não está disponível.')),
        h('details', { class: 'more' }, h('summary', null, glyph('plus'), 'Mais informações e texto oficial'), more, h('p', { class: 'upd' }, `Atualizado em ${fmtDate(b.updated_at)}`))));
  }

  function emptyState(title, text) {
    return h('div', { class: 'empty' }, guide('estou-de-olho', title, text), h('a', { class: 'btn', href: '#/' }, '← Escolher outra localidade'));
  }

  // Botão "Ouvir" curto (nome da localidade, boas-vindas). Só aparece no site publicado, que tem esses áudios.
  function voiceButton(url, aria) {
    const audio = new Audio();
    audio.preload = 'none';
    audio.src = url;
    const ico = h('span');
    const lbl = h('span');
    const btn = h('button', { class: 'mini', type: 'button', 'aria-label': aria }, ico, lbl);
    const set = (on) => { ico.replaceChildren(icon(on ? ICONS.pause : ICONS.speaker)); lbl.textContent = on ? 'Parar' : 'Ouvir'; btn.classList.toggle('on', on); };
    set(false);
    const self = { audio, reset: () => { audio.currentTime = 0; set(false); } };
    btn.addEventListener('click', () => {
      if (!audio.paused) { audio.pause(); self.reset(); if (current === self) current = null; return; }
      if (current && current !== self) stopCurrent();
      current = self;
      audio.play().then(() => set(true)).catch(() => set(false));
    });
    audio.addEventListener('ended', () => set(false));
    return btn;
  }

  // ---------- telas ----------
  async function viewHome() {
    backBtn.hidden = true;
    app.replaceChildren(h('div', { class: 'loading' }, 'Carregando…'));
    const farms = await api('/api/farms');
    const hero = guide(['campo-infraestrutura', 'administrativo', 'coordenador', 'fabrica', 'reducando', 'packing'], 'Benefícios Jaguacy', 'Escolha a sua localidade para ver os benefícios.', 'h1', 'hero');
    const welcome = farms[0] && farms[0].welcome_audio;
    if (welcome) hero.append(voiceButton(welcome, 'Ouvir as boas-vindas'));
    app.replaceChildren(
      hero,
      h('div', { class: 'farm-grid', role: 'list' }, farms.map((f) =>
        h('div', { class: 'tilewrap', role: 'listitem' },
          h('a', { class: 'tile farm', href: `#/f/${f.slug}`, 'aria-label': `${f.name}. ${f.total ? f.total + ' benefícios' : 'Em breve'}` },
            h('span', { class: 'ico' }, glyph('farm')),
            h('span', { class: 'tname' }, f.city),
            h('span', { class: 'tsub' }, f.unit_name || (f.name_confirmed ? '' : 'Nome a confirmar')),
            h('span', { class: 'tfoot' },
              f.total ? h('span', { class: 'badge' }, `${f.total} ${f.total === 1 ? 'benefício' : 'benefícios'}`) : h('span', { class: 'badge soon' }, 'Em breve'),
              h('span', { class: 'go', 'aria-hidden': 'true' }, glyph('arrow')))),
          f.voice ? voiceButton(f.voice, `Ouvir o nome: ${f.name}`) : null))));
  }

  // rota: #/f/<slug>            -> grupos (categorias)
  //       #/f/<slug>/c/<grupo>  -> benefícios do grupo ("*" = todos)
  async function viewFarm(slug, cat) {
    backBtn.hidden = false;
    app.replaceChildren(h('div', { class: 'loading' }, 'Carregando…'));
    const { farm, categories, benefits } = await api(`/api/farms/${encodeURIComponent(slug)}/benefits${PREVIEW ? '?preview=1' : ''}`);
    document.title = `${farm.name} · Benefícios Jaguacy`;
    if (!benefits.length) {
      app.replaceChildren(emptyState(`Ainda não há benefícios em ${farm.name}`, 'Os benefícios desta localidade serão publicados em breve. Pergunte ao RH da sua localidade.'));
      return;
    }
    const base = `#/f/${slug}`;
    const inList = cat !== null;
    const group = cat === '*' ? null : cat; // null = todos os grupos
    const results = h('div');
    const input = h('input', { type: 'search', placeholder: 'Procurar um benefício…', autocomplete: 'off', 'aria-label': 'Procurar benefício pelo nome' });
    const countMsg = h('div', { class: 'status', role: 'status' });

    function render() {
      const term = norm(input.value.trim());
      let list = group ? benefits.filter((b) => b.category === group) : benefits;
      if (term) list = list.filter((b) => norm([b.name, b.category, b.simple_text, b.official_description].join(' ')).includes(term));
      if (!inList && !term) {
        countMsg.textContent = '';
        results.replaceChildren(h('div', { class: 'cat-grid', role: 'list' }, [
          ...categories.map((c) => h('a', { class: 'tile', role: 'listitem', href: `${base}/c/${encodeURIComponent(c.name)}` },
            h('span', { class: 'ico' }, catGlyph(c.name)), h('span', { class: 'tname' }, c.name),
            h('span', { class: 'tfoot' }, h('span', { class: 'badge' }, `${c.count} ${c.count === 1 ? 'benefício' : 'benefícios'}`), h('span', { class: 'go', 'aria-hidden': 'true' }, glyph('arrow'))))),
          categories.length > 1 ? h('a', { class: 'tile', role: 'listitem', href: `${base}/c/${encodeURIComponent('*')}` },
            h('span', { class: 'ico' }, glyph('list')), h('span', { class: 'tname' }, 'Ver todos'),
            h('span', { class: 'tfoot' }, h('span', { class: 'badge' }, `${benefits.length} no total`), h('span', { class: 'go', 'aria-hidden': 'true' }, glyph('arrow')))) : null]));
        return;
      }
      countMsg.textContent = term ? `${list.length} ${list.length === 1 ? 'resultado' : 'resultados'}` : '';
      results.replaceChildren(list.length ? h('div', { class: 'list' }, list.map(benefitCard))
        : h('div', { class: 'empty' }, guide('posso-ajudar', 'Não achei nenhum benefício', 'Tente outra palavra ou volte e escolha um grupo.'),
          h('button', { class: 'btn secondary', type: 'button', onclick: () => { input.value = ''; render(); input.focus(); } }, 'Limpar a busca')));
    }
    input.addEventListener('input', () => { stopCurrent(); render(); });

    const chips = inList ? h('div', { class: 'chips', role: 'group', 'aria-label': 'Filtrar por grupo' }, [
      h('a', { class: 'chip' + (!group ? ' on' : ''), href: `${base}/c/${encodeURIComponent('*')}`, 'aria-current': !group ? 'page' : false }, 'Todos'),
      ...categories.map((c) => h('a', { class: 'chip' + (group === c.name ? ' on' : ''), href: `${base}/c/${encodeURIComponent(c.name)}`, 'aria-current': group === c.name ? 'page' : false }, catGlyph(c.name), c.name))]) : null;

    app.replaceChildren(
      guide(FARM_CHAR[farm.slug] || 'posso-ajudar', farm.name, inList ? '' : 'Escolha um grupo de benefícios ou procure pelo nome.'),
      h('div', { class: 'searchbar' }, input), countMsg, chips || '', results);
    render();
  }

  // ---------- rotas ----------
  async function route() {
    stopCurrent();
    const hash = decodeURIComponent(location.hash.replace(/^#/, '') || '/');
    const m = /^\/f\/([\w-]+)(?:\/c\/(.*))?$/.exec(hash);
    document.title = 'Benefícios Jaguacy';
    try {
      if (m) await viewFarm(m[1], m[2] === undefined ? null : m[2], '');
      else await viewHome();
    } catch (e) {
      app.replaceChildren(h('div', { class: 'error', role: 'alert' }, e.message), h('a', { class: 'btn', href: '#/' }, 'Voltar ao início'));
    }
    window.scrollTo(0, 0);
    app.focus({ preventScroll: true });
  }
  window.addEventListener('hashchange', route);
  route();
})();
