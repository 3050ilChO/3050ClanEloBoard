// --- cmp undefined fix ---
if (typeof cmp !== 'function') {
  function cmp(a, b) {
    if (a == null) return -1;
    if (b == null) return 1;
    if (typeof a === 'number' && typeof b === 'number') return a - b;
    return String(a).localeCompare(String(b), 'ko', { numeric: true });
  }
}
let recent5Chart = null;
let tierTrendChart = null;
let eloChart = null;

// ==============================
// Global caches (safe defaults)
// Some builds reference these before first load; keep them defined to avoid
// ReferenceError that can stop subsequent async loaders.
// ==============================
let RANK_SRC = [];
let MATCH_SRC = [];
// Older parts of the codebase may still reference this name.
let MATCH_SRCH_SRC = [];
let SCHED_CACHE = [];
let ALL_CACHE = [];
let MEMBERS_CACHE = [];

// ==============================
// Table renderer (AS-IS compatible)
// Several pages call renderTable(); keep a single canonical implementation.
// ==============================
function renderTable(tableEl, data){
  try{
    if(!tableEl) return;
    const rows = Array.isArray(data) ? data : [];
    if(!rows.length){
      const thead = tableEl.querySelector('thead') || tableEl.createTHead();
      const tbody = tableEl.querySelector('tbody') || tableEl.createTBody();
      thead.innerHTML='';
      tbody.innerHTML='';
      return;
    }

    const header = rows[0] || [];
    const bodyRows = rows.slice(1);
    const thead = tableEl.querySelector('thead') || tableEl.createTHead();
    const tbody = tableEl.querySelector('tbody') || tableEl.createTBody();
    thead.innerHTML='';
    tbody.innerHTML='';

    const trh = document.createElement('tr');
    header.forEach(h=>{
      const th=document.createElement('th');
      th.textContent = (h ?? '');
      trh.appendChild(th);
    });
    thead.appendChild(trh);

    bodyRows.forEach(r=>{
      const tr=document.createElement('tr');
      (r||[]).forEach(v=>{
        const td=document.createElement('td');
        td.textContent = (v ?? '');
        tr.appendChild(td);
      });
      tbody.appendChild(tr);
    });
  }catch(e){
    console.error('renderTable error', e);
  }
}
// ---- Logo path helper (for local assets after repo cleanup) ----

// Normalize team logo filename coming from Google Sheets:
// - trims, takes basename, lowercases
// - converts .jpg/.jpeg to .png
// - if no extension, assumes .png
function normalizeLogoFilename(input) {
  if (!input) return "";
  let s = String(input).trim();
  if (!s) return "";
  // If it's a URL, keep as-is (logo candidates will normalize extension/casing)
  if (/^https?:\/\//i.test(s)) return s;
  // basename
  s = s.split(/[\\/]/).pop();
  s = s.replace(/\s+/g, "");
  const lower = s.toLowerCase();
  // convert common extensions to .png for consistency with repo assets
  if (lower.endsWith(".jpg") || lower.endsWith(".jpeg")) return lower.replace(/\.jpe?g$/i, ".png");
  if (lower.endsWith(".png") || lower.endsWith(".webp") || lower.endsWith(".gif") || lower.endsWith(".svg")) return lower;
  // if it's like "jd" or "JD.", strip trailing dots
  const cleaned = lower.replace(/\.+$/g, "");
  return cleaned + ".png";
}

// Team logo helper:
// - normalizes filenames (JD.png -> jd.png)
// - tries both folder casings (s10team / s10Team) to avoid case-sensitive hosting issues
function setLogoImgSrcWithFallback(img, logoValue, folder) {
  const primary = folder || "s10team";
  const candidates = buildLogoCandidates(logoValue, primary);
  if (!candidates.length) return;

  let i = 0;
  img.src = candidates[i];

  img.onerror = () => {
    i += 1;
    if (i >= candidates.length) return;
    img.src = candidates[i];
  };
}

function buildLogoCandidates(logoValue, folder) {
  const primary = folder || "s10team";
  const altFolder = (primary === "s10team") ? "s10Team" : (primary === "s10Team" ? "s10team" : primary);
  const raw = (logoValue ?? "").toString().trim();
  if (!raw) return [];

  const unique = new Set();
  const push = (u) => {
    if (!u) return;
    const s = String(u);
    if (!unique.has(s)) unique.add(s);
  };

  const isUrl = /^https?:\/\//i.test(raw);
  if (isUrl) {
    push(raw);
    push(raw.replace(/\/s10team\//g, "/s10Team/").replace(/\/s10Team\//g, "/s10team/"));

    const png1 = raw.replace(/\.jpe?g(\?.*)?$/i, ".png$1");
    push(png1);
    push(png1.replace(/\/s10team\//g, "/s10Team/").replace(/\/s10Team\//g, "/s10team/"));

    try {
      const u = new URL(raw);
      const parts = u.pathname.split("/");
      const base = parts.pop() || "";
      const lowerBase = base.toLowerCase().replace(/\.jpe?g$/i, ".png");
      parts.push(lowerBase);
      u.pathname = parts.join("/");
      push(u.toString());
      push(u.toString().replace(/\/s10team\//g, "/s10Team/").replace(/\/s10Team\//g, "/s10team/"));
    } catch (e) {}

    return Array.from(unique);
  }

  if (raw.includes("/")) {
    const normalizedRel = raw.replace(/\.jpe?g$/i, ".png");
    push(normalizedRel);
    push(normalizedRel.replace(/^s10team\//i, "s10Team/").replace(/^s10Team\//i, "s10team/"));
    return Array.from(unique);
  }

  const normalized = normalizeLogoFilename(raw);
  push(resolveLogoPath(normalized, primary));
  push(resolveLogoPath(normalized, altFolder));

  const jpg = normalized.replace(/\.png$/i, ".jpg");
  if (jpg !== normalized) {
    push(resolveLogoPath(jpg, primary));
    push(resolveLogoPath(jpg, altFolder));
  }

  return Array.from(unique);
}

function resolveLogoPath(raw, defaultFolder) {
  const s = (raw ?? "").toString().trim();
  if (!s) return "";
  // keep full URLs and data URIs as-is
  if (/^(https?:)?\/\//i.test(s) || /^data:image\//i.test(s)) return s;
  // if already a relative path like "hof/xxx.png", keep it
  if (s.includes("/")) return s;
  // otherwise assume it's a filename and prepend folder (e.g., "jd.png" -> "s10team/jd.png")
  return defaultFolder ? `${defaultFolder.replace(/\/$/,"")}/${s}` : s;
}


/* v9_107 datalabels */
try{
  if (typeof Chart !== 'undefined' && typeof ChartDataLabels !== 'undefined'){
    Chart.register(ChartDataLabels);
    Chart.defaults.set('plugins.datalabels', {
      display: true,
      color: '#000',
      anchor: 'end',
      align: 'start',
      font: {weight:'bold', size:14},
      formatter: v => v
    });
  }
}catch(e){}


// === v9_113 TierMap: 갓(1)~히든(7) & label only ===
const TIER_TO_NUM = {'갓':1,'킹':2,'퀸':3,'잭':4,'스페이드':5,'조커':6,'히든':7};
const NUM_TO_TIER = {1:'갓',2:'킹',3:'퀸',4:'잭',5:'스페이드',6:'조커',7:'히든'};

// === Global ID normalizer (whitespace/NBSP/zero-width/case-insensitive) ===
// NOTE: Must be in global scope because openPlayer/search/h2h/etc. run outside IIFEs.
if (typeof window !== 'undefined' && typeof window.normalizeId !== 'function') {
  window.normalizeId = function normalizeId(v){
    return String(v ?? '')
      .replace(/\u00A0/g,' ')              // NBSP
      .replace(/[\u200B-\u200D\uFEFF]/g,'') // zero-width
      .replace(/\s+/g,'')                 // all whitespace
      .toLowerCase();
  };
}

// Local alias (keeps existing calls like normalizeId(x) working)
const normalizeId = (typeof window !== 'undefined' && window.normalizeId) ? window.normalizeId : (v)=>String(v??'').toLowerCase();


// === Hall of Fame popup links (configurable) ===
const HOF_LINKS = {
  pro: "https://docs.google.com/spreadsheets/d/1llp7MXLWxOgCUMdmvy3wnTGaf3uAfZam0TMXKGTy5ic/edit?gid=1658280214#gid=1658280214",
  tst: "https://docs.google.com/spreadsheets/d/1llp7MXLWxOgCUMdmvy3wnTGaf3uAfZam0TMXKGTy5ic/edit?gid=381201435#gid=381201435",
  tsl: "https://docs.google.com/spreadsheets/d/1llp7MXLWxOgCUMdmvy3wnTGaf3uAfZam0TMXKGTy5ic/edit?gid=2130451924#gid=2130451924",
  // New HOF menus
  tpl: "https://docs.google.com/spreadsheets/d/1llp7MXLWxOgCUMdmvy3wnTGaf3uAfZam0TMXKGTy5ic/edit?sheet=TPL",
  // New HOF menus (sheet-name based; works even if gid changes)
  msl: "https://docs.google.com/spreadsheets/d/1llp7MXLWxOgCUMdmvy3wnTGaf3uAfZam0TMXKGTy5ic/edit?sheet=MSL",
  tcl: "https://docs.google.com/spreadsheets/d/1llp7MXLWxOgCUMdmvy3wnTGaf3uAfZam0TMXKGTy5ic/edit?sheet=TCL",
  race: "https://docs.google.com/spreadsheets/d/1llp7MXLWxOgCUMdmvy3wnTGaf3uAfZam0TMXKGTy5ic/edit?sheet=종족최강전"
};

function initHOFButtons(){
  const proBtn = document.getElementById('hofViewPro');
  const tstBtn = document.getElementById('hofViewTST');
  const tslBtn = document.getElementById('hofViewTSL');
  const frame  = document.getElementById('hofFrame');
  const openA  = document.getElementById('hofOpenNew');
  const loading= document.getElementById('hofLoading');

  // If HOF panel isn't on this build, silently ignore.
  if(!frame || (!proBtn && !tstBtn && !tslBtn)) return;

  function parseSheet(url){
    try{
      const u = new URL(url);
      const parts = u.pathname.split('/').filter(Boolean);
      const dIdx = parts.indexOf('d');
      const id = (dIdx>=0 && parts[dIdx+1]) ? parts[dIdx+1] : null;
      const gid = u.searchParams.get('gid') || (u.hash.match(/gid=(\d+)/)?.[1]) || '0';
      return {id, gid};
    }catch(e){ return {id:null, gid:'0'}; }
  }
  function toEmbed(url){
    const {id, gid} = parseSheet(url);
    if(!id) return url;
    // NOTE: pubhtml works best if the sheet is published to web. If not, user can use "새창으로 열기".
    return `https://docs.google.com/spreadsheets/d/${id}/gviz/tq?gid=${gid}&tqx=out:html`;
  }

  function setActive(which){
    const map = {
      pro: {btn: proBtn, label: '프로리그'},
      tst: {btn: tstBtn, label: 'TST'},
      tsl: {btn: tslBtn, label: 'TSL'}
    };

    [proBtn, tstBtn, tslBtn].forEach(b=>{
      if(!b) return;
      b.classList.remove('active');
      b.setAttribute('aria-pressed','false');
    });

    const picked = map[which] || map.pro;
    if(picked?.btn){
      picked.btn.classList.add('active');
      picked.btn.setAttribute('aria-pressed','true');
    }
    if(titleEl) titleEl.textContent = picked?.label || '프로리그';
  }

  function load(which){
    const url = (which==='pro') ? HOF_LINKS.pro : (which==='tst') ? HOF_LINKS.tst : HOF_LINKS.tsl;
    if(openA) openA.href = url || '#';
    if(!url) return;

    setActive(which);
    if(loading){ loading.style.display='block'; loading.textContent='불러오는 중…'; }
    frame.src = toEmbed(url);
  }

  frame.addEventListener('load', ()=>{ if(loading) loading.style.display='none'; });

  proBtn && proBtn.addEventListener('click', ()=>load('pro'));
  tstBtn && tstBtn.addEventListener('click', ()=>load('tst'));
  tslBtn && tslBtn.addEventListener('click', ()=>load('tsl'));

  // default
  load('pro');
}




/* 3050ClanEloBoard — v9_75_Final_FixAll
   - Keep data bindings in index.html (SHEETS) exactly as-is.
   - Fixes:
     * Player detail: show "주종" block, then OFF-race blocks per race that exists (Z/P/T except current)
     * H2H: enter-to-search; table renders; uses existing ELOboard A:Z
     * Schedule/ProRank: render sheet values AS-IS (no sort/format change) using formatted cell c.f if provided
     * Rank: A:J only, enter-to-search
     * Members: highlight rows by column B value (클랜마스터=연한노랑, 클랜 부마스터=연한파랑, 운영진=연한초록)
*/

function $(id){
  return document.getElementById(id) || null;
}
const lc = s => String(s ?? '').toLowerCase();
const normalize = (s) => String(s || '').trim().toLowerCase();


// Use formatted values from GViz (c.f) to keep sheet formatting AS-IS
function gvizURL({id, sheet, range, select}){
  const p = new URLSearchParams({ tqx: 'out:json' });
  if (sheet) p.set('sheet', sheet);
  if (range) p.set('range', range);
  if (select) p.set('tq', String(select));
  const base = `https://docs.google.com/spreadsheets/d/${id}/gviz/tq?${p.toString()}`;
  return (window.USE_PROXY ? window.PROXY_URL : '') + base;
}
async function fetchGVIZ(cfg){
  try{
    const res = await fetch(gvizURL(cfg), { cache: 'no-store' });
    const txt = await res.text();
    const json = JSON.parse(txt.replace(/^[^{]+/, '').replace(/\);?\s*$/, ''));
    // Parse rows
    const rows = (json.table.rows||[]).map(r => (r.c||[]).map(c => {
      if (!c) return '';
      // Keep formatted strings (e.g., percentages) if provided
      return (c.f != null ? c.f : (c.v != null ? c.v : ''));
    }));
    // Prefer GVIZ-provided column labels
    let headers = (json.table.cols||[]).map(c => c.label || '');
// If column labels are empty or look wrong, try to detect header from the first row
const firstRow = rows[0] || [];
// Heuristic A: if GViz labels are ALL empty, treat first row as headers
const allEmpty = headers.every(h => !String(h||'').trim());
if (allEmpty && firstRow.length){
  headers = firstRow;
  rows.shift();
}else{
  // Heuristic B: known ELOboard-style headers
  const headerHints = ['경기일자','승자','패자','맵','리그명','승자티어','패자티어','승자종족','패자종족','티어차이'];
  const hit = firstRow.join('|').includes('경기일자') || headerHints.some(h => firstRow.join('|').includes(h));
  if (hit) { headers = firstRow; rows.shift(); }
}
return [headers, ...rows];
  }catch(e){
    console.error('GVIZ error:', e);
    return [];
  }
}


async function fetchGVIZMatrix(cfg){
  try{
    const p = new URLSearchParams({ tqx: 'out:json', headers: '0' });
    if (cfg.sheet) p.set('sheet', cfg.sheet);
    if (cfg.range) p.set('range', cfg.range);
    if (cfg.select) p.set('tq', String(cfg.select));
    const base = `https://docs.google.com/spreadsheets/d/${cfg.id}/gviz/tq?${p.toString()}`;
    const url = (window.USE_PROXY ? window.PROXY_URL : '') + base;

    const res = await fetch(url, { cache: 'no-store' });
    const txt = await res.text();
    const json = JSON.parse(txt.replace(/^[^{]+/, '').replace(/\);?\s*$/, ''));
    const rows = (json.table.rows||[]).map(r => (r.c||[]).map(c => {
      if (!c) return '';
      return (c.f != null ? c.f : (c.v != null ? c.v : ''));
    }));
    // Trim trailing empty rows
    while(rows.length && rows[rows.length-1].every(v => !String(v||'').trim())) rows.pop();
    return rows;
  }catch(e){
    console.error('GVIZ matrix error:', e);
    return [];
  }
}

function nl2br(s){
  return String(s||'').replace(/\r\n|\n|\r/g, '<br>');
}



// --- TierBoard search helpers ---
function normalizeTierboardPlayerKey(v){
  return String(v||'')
    .replace(/ /g,' ')
    .trim()
    .toLowerCase()
    .replace(/\s+/g,'');
}

function setupTierboardSearch(playerNames){
  const input = document.getElementById('tierboardSearch');
  const btn   = document.getElementById('tierboardSearchBtn');
  const dl    = document.getElementById('tierboardDatalist');
  const status= document.getElementById('tierboardStatus');
  if(!input || !btn) return;

  // populate datalist (autocomplete)
  if(dl){
    const uniq = Array.from(new Set((playerNames||[]).map(s=>String(s||'').trim()).filter(Boolean)));
    uniq.sort((a,b)=>a.localeCompare(b,'ko',{numeric:true,sensitivity:'base'}));
    dl.innerHTML = '';
    for(const name of uniq){
      const opt = document.createElement('option');
      opt.value = name;
      dl.appendChild(opt);
    }
  }

  if(input.dataset.bound === '1') return;
  input.dataset.bound = '1';

  const cssEscape = (s)=> (window.CSS && typeof CSS.escape==='function') ? CSS.escape(s) : String(s).replace(/[^a-zA-Z0-9_\-]/g,'\$&');

  const flashStatus = (msg)=>{
    if(!status) return;
    const prev = status.textContent;
    status.textContent = msg;
    setTimeout(()=>{ if(status.textContent===msg) status.textContent = prev || ''; }, 1500);
  };

  const go = ()=>{
    const qRaw = String(input.value||'').trim();
    if(!qRaw){ flashStatus('선수 이름을 입력하세요.'); return; }
    const key = normalizeTierboardPlayerKey(qRaw);
    const wrap = document.getElementById('tierboardWrap');
    if(!wrap){ flashStatus('티어표가 아직 로드되지 않았습니다.'); return; }

    let el = null;
    // exact match by normalized key
    try{
      el = wrap.querySelector(`.tb-chip[data-player-key="${cssEscape(key)}"]`);
    }catch(_){
      // ignore
    }

    // fallback: scan
    if(!el){
      const chips = wrap.querySelectorAll('.tb-chip');
      for(const c of chips){
        const ck = c.getAttribute('data-player-key') || normalizeTierboardPlayerKey(c.textContent);
        if(ck == key){ el = c; break; }
      }
    }

    // fuzzy contains
    if(!el && key){
      const chips = wrap.querySelectorAll('.tb-chip');
      for(const c of chips){
        const ck = c.getAttribute('data-player-key') || normalizeTierboardPlayerKey(c.textContent);
        if(ck.includes(key) || normalizeTierboardPlayerKey(c.textContent).includes(key)) { el = c; break; }
      }
    }

    if(!el){ flashStatus('해당 선수를 찾지 못했습니다.'); return; }

    el.scrollIntoView({ behavior:'smooth', block:'center' });
    el.classList.remove('tb-chip-hit');
    // reflow for restarting animation
    void el.offsetWidth;
    el.classList.add('tb-chip-hit');
    setTimeout(()=>el.classList.remove('tb-chip-hit'), 1600);
  };

  btn.addEventListener('click', (e)=>{ e.preventDefault(); go(); });
  input.addEventListener('keydown', (e)=>{
    if(e.key === 'Enter'){
      e.preventDefault();
      go();
    }
  });
};

async function loadTierBoard(){
  const wrap = document.getElementById('tierboardWrap');
  const status = document.getElementById('tierboardStatus');
  if(!wrap) return;

  wrap.innerHTML = '';
  if(status) status.textContent = '불러오는 중…';

  // Use ClanMembers (C:ID, D:Tier, E:Race) as the single source of truth
  const rows = await fetchGVIZ(SHEETS.members);
  if(!rows || !rows.length){
    if(status) status.textContent = '데이터가 없습니다. (ClanMembers 탭 공유/범위를 확인)';
    return;
  }

  // Expect header at row 1, data from row 2
  const body = rows.slice(1);

  const tierKeys = ['갓','킹','퀸','잭','스페이드','조커','히든'];
  const tierLetter = { '갓':'G','킹':'K','퀸':'Q','잭':'J','스페이드':'S','조커':'JO','히든':'H' };

  const normTier = (v)=>{
    const s = String(v||'').trim();
    if(!s) return '';
    // remove spaces, parentheses, and "티어" suffix
    const x = s.replace(/\s+/g,'').replace(/[()]/g,'').replace(/티어$/,'');
    // handle english-ish variants if any
    if(x === 'G' || /갓/.test(x)) return '갓';
    if(x === 'K' || /킹/.test(x)) return '킹';
    if(x === 'Q' || /퀸/.test(x)) return '퀸';
    if(x === 'J' || /잭/.test(x)) return '잭';
    if(x === 'S' || /스페이드/.test(x)) return '스페이드';
    if(x === 'JO' || /조커/.test(x)) return '조커';
    if(x === 'H' || /히든/.test(x)) return '히든';
    return s; // fallback
  };

  const normRace = (v)=>{
    const s = String(v||'').trim().toUpperCase();
    if(!s) return '';
    if(s === 'T' || /테란/.test(s)) return 'T';
    if(s === 'Z' || /저그/.test(s)) return 'Z';
    if(s === 'P' || /프로토스|프토/.test(s)) return 'P';
    // sometimes stored as full words in Korean
    const k = String(v||'').trim();
    if(/테란/.test(k)) return 'T';
    if(/저그/.test(k)) return 'Z';
    if(/프로토스|프토/.test(k)) return 'P';
    return '';
  };

  const cleanId = (v)=>{
    // keep original display but match ignoring whitespace
    return String(v||'').replace(/\u00A0/g,' ').trim();
  };

  // Build Tier -> Race -> Players
  const tierData = tierKeys.map(k=>({
    key:k,
    label: `${k}티어(${tierLetter[k]||''})`,
    races: { T: [], Z: [], P: [] }
  }));

  const tierIndex = new Map(tierData.map((t,i)=>[t.key,i]));

  for(const r of body){
    // A:F range => C=2, D=3, E=4
    const id = cleanId(r[2]);
    const tier = normTier(r[3]);
    const race = normRace(r[4]);

    if(!id) continue;
    if(!tierIndex.has(tier)) continue;
    if(!race) continue;

    tierData[tierIndex.get(tier)].races[race].push(id);
  }

  // Sort ids (locale aware)
  tierData.forEach(t=>{
    ['T','Z','P'].forEach(rk=>{
      t.races[rk].sort((a,b)=>String(a).localeCompare(String(b),'ko',{numeric:true,sensitivity:'base'}));
    });
    const total = t.races.T.length + t.races.Z.length + t.races.P.length;
    t.label = `${t.key}티어(${tierLetter[t.key]||''}) ${total}명`;
  });

  // Total unique members
  const allSet = new Set();
  tierData.forEach(t=>{
    ['T','Z','P'].forEach(rk=>t.races[rk].forEach(n=>allSet.add(String(n).toLowerCase())));
  });
  const totalEl = document.getElementById('tierboardTotal');
  if(totalEl){
    totalEl.textContent = `총:${allSet.size}명`;
  }

  // --- render cards ---

  const gridEl = document.createElement('div');
  gridEl.className = 'tb-card-grid';

  const raceMeta = {
    T: { label:'테란', cls:'tb-race-terran', icon:'t.png' },
    Z: { label:'저그', cls:'tb-race-zerg', icon:'z.png' },
    P: { label:'프로토스', cls:'tb-race-protoss', icon:'p.png' },
  };

  tierData.forEach(t=>{
    const card = document.createElement('section');
    card.className = `tb-tier-card tb-tier-${t.key}`;

    const h = document.createElement('header');
    h.className = 'tb-tier-head';

    const title = document.createElement('div');
    title.className = 'tb-tier-title';
    title.textContent = t.label;

    const meta = document.createElement('div');
    meta.className = 'tb-tier-meta';
    const cT = t.races.T.length, cZ = t.races.Z.length, cP = t.races.P.length;
    meta.innerHTML = `<span class="tb-meta-pill tb-meta-terran">T ${cT}</span>
                      <span class="tb-meta-pill tb-meta-zerg">Z ${cZ}</span>
                      <span class="tb-meta-pill tb-meta-protoss">P ${cP}</span>`;

    h.appendChild(title);
    h.appendChild(meta);
    card.appendChild(h);

    const cols = document.createElement('div');
    cols.className = 'tb-race-cols';

    ['T','Z','P'].forEach(rk=>{
      const col = document.createElement('div');
      col.className = `tb-race-col ${raceMeta[rk].cls}`;

      const rh = document.createElement('div');
      rh.className = 'tb-race-head';
      rh.innerHTML = `<span class="tb-race-icon"><img src="${raceMeta[rk].icon}" alt="${raceMeta[rk].label}"></span>
                      <span class="tb-race-label">${raceMeta[rk].label}</span>
                      <span class="tb-race-count">${t.races[rk].length}명</span>`;
      col.appendChild(rh);

      const list = document.createElement('div');
      list.className = 'tb-chip-list';

      t.races[rk].forEach(name=>{
        const chip = document.createElement('span');
        chip.className = 'tb-chip';
        chip.textContent = name;
        chip.setAttribute('data-player-key', normalizeTierboardPlayerKey(name));
        list.appendChild(chip);
      });

      col.appendChild(list);
      cols.appendChild(col);
    });

    card.appendChild(cols);
    gridEl.appendChild(card);
  });

  wrap.appendChild(gridEl);
  if(status) status.textContent = '';

  // Wire search UI (autocomplete + scroll-to-player)
  try{
    const allNames = [];
    tierData.forEach(t=>{['T','Z','P'].forEach(rk=>t.races[rk].forEach(n=>allNames.push(n)));});
    setupTierboardSearch(allNames);
  }catch(e){ console.warn('tierboard search setup failed', e); }

}

// TierBoard reload button
$('tierboardReloadBtn')?.addEventListener('click', ()=> loadTierBoard());

async function buildRaceWinrate(){
  try{
    const data = MATCH_SRC.length ? MATCH_SRC : await fetchGVIZ(SHEETS.matches);
    if(!data.length) return;
    const H=data[0]||[];
    const rows=data.slice(1);
    const iWr=H.indexOf('승자종족');
    const iLr=H.indexOf('패자종족');
    if(iWr<0||iLr<0){console.warn('승자종족/패자종족 열을 찾지 못했습니다');return;}
    const races=['Z','P','T'];
    const stat={Z:{Z:{w:0,l:0},P:{w:0,l:0},T:{w:0,l:0}},
                P:{Z:{w:0,l:0},P:{w:0,l:0},T:{w:0,l:0}},
                T:{Z:{w:0,l:0},P:{w:0,l:0},T:{w:0,l:0}}};
    let mirrors={ZZ:0,PP:0,TT:0};
    rows.forEach(r=>{
      const wr=String(r[iWr]||'').trim().toUpperCase();
      const lr=String(r[iLr]||'').trim().toUpperCase();
      if(!['Z','P','T'].includes(wr)||!['Z','P','T'].includes(lr))return;
      if(wr===lr){
        if(wr==='Z')mirrors.ZZ++;
        if(wr==='P')mirrors.PP++;
        if(wr==='T')mirrors.TT++;
      }
      stat[wr][lr].w++;stat[lr][wr].l++;
    });
    const tbody=document.querySelector('#raceTable tbody');
    if(!tbody)return;
    tbody.innerHTML='';
    const fmt=o=>{const t=o.w+o.l;return `${t}전 ${o.w}승 ${o.l}패 (${t?Math.round(o.w*1000/t)/10:0}%)`;};
    races.forEach(R=>{
      const row=document.createElement('tr');
      const th=document.createElement('td');th.textContent=R;row.appendChild(th);
      let w=0,l=0;
      races.forEach(C=>{
        const td=document.createElement('td');
        const c=stat[R][C];
        if(R===C){const m=(R==='Z'?mirrors.ZZ:(R==='P'?mirrors.PP:mirrors.TT));td.textContent=`${m}전`;}
        else{td.textContent=fmt(c);w+=c.w;l+=c.l;}
        row.appendChild(td);
      });
      const sum=document.createElement('td');const t=w+l;
      sum.textContent=`${t}전 ${w}승 ${l}패 (${t?Math.round(w*1000/t)/10:0}%)`;row.appendChild(sum);
      tbody.appendChild(row);
    });
  }catch(e){console.error('buildRaceWinrate error',e);}
}






async function loadRanking(){
  if(rankStatus) rankStatus.textContent='시트에서 데이터를 불러오는 중…';
  [RANK_SRC, MATCH_SRC] = await Promise.all([ fetchGVIZ(SHEETS.rank), fetchGVIZ(SHEETS.matches) ]);
  // Backward compatibility: some functions expect MATCH_SRCH_SRC
  MATCH_SRCH_SRC = MATCH_SRC;
  if(!RANK_SRC.length){ if(rankStatus) rankStatus.textContent='불러오기 실패(권한/네트워크/CORS 확인)'; return; }
  drawRankRows(RANK_SRC.slice(1));
  const dl=$('playerList'); if(dl){ dl.innerHTML=''; RANK_SRC.slice(1).forEach(r=>{ const id=String(r[1]||'').split('/')[0].trim(); if(!id) return; const opt=document.createElement('option'); opt.value=id; dl.appendChild(opt); }); }
  if(rankStatus) rankStatus.textContent=`불러오기 완료 • ${RANK_SRC.length-1}행`;
}
$('rankRefresh')?.addEventListener('click', loadRanking);
$('rankSearchBtn')?.addEventListener('click', ()=>{
  const q = lc($('rankSearch').value || '').trim();
  if (!q) { drawRankRows(RANK_SRC.slice(1)); return; }

  // 정확 일치 결과만
  const rows = (RANK_SRC.slice(1) || []).filter(r => {
    const id = lc(String(r[1] || '').split('/')[0].trim());
    return id === q;
  });

  if (rows.length) {
    drawRankRows(rows);
  } else {
    // 없으면 추천 (시작문자 일치)만 보여줌
    const suggest = (RANK_SRC.slice(1) || []).filter(r => {
      const id = lc(String(r[1] || '').split('/')[0].trim());
      return id === q; // 수정: 정확히 일치할 때만 이동 (자동이동 버그 수정)
    });
    drawRankRows(suggest);
  }
});
$('rankSearch')?.addEventListener('keydown', e=>{
  if (e.key === 'Enter') {
    e.preventDefault(); // datalist 자동완성 방지 (JE 검색 시 jelka로 자동선택되지 않게)
    const q = lc($('rankSearch').value || '').trim();
    if (!q) return;
    // 정확 일치 우선 이동
    const matchRow = (RANK_SRC.slice(1) || []).find(r => {
      const id = lc(String(r[1] || '').split('/')[0].trim());
      return id === q; // exact match only
    });
    if (matchRow) {
      openPlayer(matchRow[1]);
      return;
    }
    // 일치 없으면 추천(시작문자 일치) 목록만 표로 표시
    const suggest = (RANK_SRC.slice(1) || []).filter(r => {
      const id = lc(String(r[1] || '').split('/')[0].trim());
      return id === q; // 수정: 정확히 일치할 때만 이동 (자동이동 버그 수정)
    });
    drawRankRows(suggest);
  }
});

// ===== Player Detail =====
function findIdx(header, regex){ return header.findIndex(h=> regex.test(String(h))); }
function computeRaceFromRow(H, row, you){
  const iWn = findIdx(H, /승자\s*선수|winner/i);
  const iLn = findIdx(H, /패자\s*선수|loser/i);
  const iWr = findIdx(H, /승자\s*종족|winner\s*race/i);
  const iLr = findIdx(H, /패자\s*종족|loser\s*race/i);
  const w = lc(row[iWn]||''), l = lc(row[iLn]||'');
  if(w===you) return String(row[iWr]||'').trim().toUpperCase();
  if(l===you) return String(row[iLr]||'').trim().toUpperCase();
  return '';
}
function computeOpponentRaceFromRow(H,row,you){
  const iWn = findIdx(H, /승자\s*선수|winner/i);
  const iLn = findIdx(H, /패자\s*선수|loser/i);
  const iWr = findIdx(H, /승자\s*종족|winner\s*race/i);
  const iLr = findIdx(H, /패자\s*종족|loser\s*race/i);
  const w = lc(row[iWn]||''), l = lc(row[iLn]||'');
  if(w===you) return String(row[iLr]||'').trim().toUpperCase();
  if(l===you) return String(row[iWr]||'').trim().toUpperCase();
  return '';
}
function computeResultForYou(H,row,you){
  const iWn = findIdx(H, /승자\s*선수|winner/i);
  const w = lc(row[iWn]||''); 
  return (w===you)? 'W':'L';
}
function fmtCell(obj){ const t=obj.w+obj.l; return `${t}전 ${obj.w}승 ${obj.l}패 (${t? Math.round(obj.w*1000/t)/10 : 0}%)`; }

async function openPlayer(bCellValue){
  if (window.__openingPlayer) return;
  window.__openingPlayer = true;
  try{

  const id = String(bCellValue||'').split('/')[0].trim();
  const body=$('playerBody'); const title=$('playerTitle'); if(title) title.textContent=id; if(body) body.innerHTML='';
  if(!RANK_SRC.length) await loadRanking();
  const header = RANK_SRC[0]||[]; const rows = RANK_SRC.slice(1);
  const row = rows.find(r=> normalizeId(String(r[1]||'').split('/')[0].trim())===normalizeId(id));
  if(!row){ if(body) body.innerHTML='<div class="err">선수를 찾을 수 없습니다.</div>'; activate('player'); return; }

  const COL = { B:1, C:2, D:3, J:9, L:11 };
  const playerName = String(row[COL.B]||'').split('/')[0].trim();
  const currentRace = String(row[COL.C]||'').trim().toUpperCase();
  const tier = String(row[COL.D]||'').trim();
  const eloText = String(row[9] || '-').trim();
  const tierRankText = String(row[5] || '-').trim();
  const overallRankText = String(row[6] || '-').trim(); // J
  const IDX_NAME = 1; // B
  const me = String(playerRow[IDX_NAME]||'').split('/')[0].trim().toLowerCase();
  const all = [...allRows];
  all.sort((a,b)=> parseEloText(b[IDX_ELO]) - parseEloText(a[IDX_ELO]));
  const pos = all.findIndex(r=> String(r[IDX_NAME]||'').split('/')[0].trim().toLowerCase() === me) + 1;
  return {overallRank: pos>0?pos:null, total: all.length};
}


(function enhanceTierButtons_v980(){
  const host = document.getElementById('tierFilters');
  if(!host) return;
  if(!host.dataset.enhanced){
    host.dataset.enhanced = '1';
    host.addEventListener('click', (e)=>{
      const btn = e.target.closest('.tier-btn');
      if(!btn) return;
      host.querySelectorAll('.tier-btn').forEach(b=> b.classList.remove('active'));
      btn.classList.add('active');
      const name = btn.dataset.tier;
      (async ()=>{
        if(!RANK_SRC.length) await loadRanking();
        const H = RANK_SRC[0]||[]; const rows = RANK_SRC.slice(1);
        const IDX_ELO = 9, IDX_TIER=3;
        let out = [];
        if(name === '전체'){
          out = [...rows].sort((a,b)=> parseEloText(b[IDX_ELO]) - parseEloText(a[IDX_ELO]));
          out.forEach((r,i)=> r[0]=i+1);
        }else{
          out = rows.filter(r=> String(r[IDX_TIER]||'').trim()===name)
                    .sort((a,b)=> parseEloText(b[IDX_ELO]) - parseEloText(a[IDX_ELO]));
          out.forEach((r,i)=> r[0]=i+1);
        }
        drawRankRows(out);
        const st = document.getElementById('rankStatus');
        if(st) st.textContent = `${name} • ${out.length}명`;
      })();
    });
  }
})();







// === v9_63_patch: Enter-only & exact-match search, disable auto navigation ===
(function(){
  function lc(s){ try { return String(s||'').toLowerCase(); } catch(e){ return ''; } }
  function getIdOnly(x){ return String(x||'').split('/')[0].trim(); }

  function waitForRankData(cb, tries=0){
    if (typeof RANK_SRC !== 'undefined' && Array.isArray(RANK_SRC) && RANK_SRC.length > 1){
      return cb();
    }
    if (tries > 20) return; // ~10s
    setTimeout(function(){ waitForRankData(cb, tries+1); }, 500);
  }

  function attachSearch(id){
    var el = document.getElementById(id);
    if(!el) return;

    // kill inline auto triggers if any
    el.removeAttribute('oninput');
    el.removeAttribute('onchange');
    el.removeAttribute('onkeyup');

    // do not navigate while typing
    el.addEventListener('input', function(e){ /* no auto move while typing */ });

    // Enter -> exact match only
    el.addEventListener('keydown', function(e){
      if(e.key === 'Enter'){
        e.preventDefault();
        var q = lc(el.value).trim();
        if(!q) return;
        var row = (RANK_SRC.slice(1)||[]).find(function(r){
          var idv = lc(getIdOnly(r[1]));
          return idv === q; // exact match only
        });
        if(row){ openPlayer(row[1]); }
      }
    });

    // datalist / manual change -> exact match only
    el.addEventListener('change', function(){
      var q = lc(el.value).trim();
      if(!q) return;
      var row = (RANK_SRC.slice(1)||[]).find(function(r){
        var idv = lc(getIdOnly(r[1]));
        return idv === q;
      });
      if(row){ openPlayer(row[1]); }
    });
  }

  function populatePlayerList(){
    var list = document.getElementById('playerList');
    if(!list) return;
    list.innerHTML='';
    var seen = {};
    (RANK_SRC.slice(1)||[]).forEach(function(r){
      var id = getIdOnly(r[1]);
      var key = lc(id);
      if(!key || seen[key]) return;
      seen[key]=1;
      var opt = document.createElement('option');
      opt.value = id;    // browser h&&les case-insensitive suggestion visually
      list.appendChild(opt);
    });
  }

  function init(){
    try{
      // neutralize legacy globals that may auto-navigate
      window.searchPlayer = function(){};
      window.openPlayerByInput = function(){};
    }catch(e){}

    attachSearch('globalSearch');
    attachSearch('rankSearch');
    attachSearch('h2hSearch');
    attachSearch('leagueSearch');

    if (typeof RANK_SRC !== 'undefined'){
      populatePlayerList();
    } else {
      waitForRankData(function(){
        populatePlayerList();
      });
    }
  }

  if(document.readyState === 'loading'){
    document.addEventListener('DOMContentLoaded', init);
  }else{
    init();
  }
})();


// === HOF Popup v13 (프로리그/TST/TSL) ===
(function(){
  // 기존 프로젝트에서 사용하던(연동되던) HOF_LINKS URL을 그대로 사용
  const cfg={
    pro:{ url: (typeof HOF_LINKS!=='undefined'? HOF_LINKS.pro : ''), title:"프로리그 PROLEAGUE" },
    tst:{ url: (typeof HOF_LINKS!=='undefined'? HOF_LINKS.tst : ''), title:"TST 3050토너먼트" },
    tpl:{ url: (typeof HOF_LINKS!=='undefined'? HOF_LINKS.tpl : ''), title:"TPL 갓/킹리그" },
    tsl:{ url: (typeof HOF_LINKS!=='undefined'? HOF_LINKS.tsl : ''), title:"TSL 3050스타리그" },
    msl:{ url: (typeof HOF_LINKS!=='undefined'? HOF_LINKS.msl : ''), title:"MSL 퀸.잭 리그" },
    tcl:{ url: (typeof HOF_LINKS!=='undefined'? HOF_LINKS.tcl : ''), title:"TCL(스페/조커/히든)" },
};

  const isHofCardLeague = (k)=> (k==='tst' || k==='tsl' || k==='tpl' || k==='msl' || k==='tcl');

  const $ = (id)=>document.getElementById(id);

  function openPopup(){ const el=$("hofPopup"); if(el) el.setAttribute('aria-hidden','false'); }
  function closePopup(){ const el=$("hofPopup"); if(el) el.setAttribute('aria-hidden','true'); }

  function normData(data){
    if(!Array.isArray(data) || !data.length) return [];
    const clean = (v)=> String(v??'')
      .replace(/[\u200B-\u200D\uFEFF]/g,'')
      .replace(/\u00A0/g,' ')
      .trim();
    const isBlank = (v)=> {
      const s = clean(v);
      // Treat common "invisible" placeholders as empty
      return s==='' || s==='-' || s==='—' || s==='–';
    };

    let maxCols = 0;
    for(const r of data){ maxCols = Math.max(maxCols, (r||[]).length); }

    // detect last useful col (ignore trailing empty/nbsp/zero-width cells)
    let last = maxCols - 1;
    while(last>=0){
      let allEmpty = true;
      for(const r of data){
        const v = (r||[])[last];
        if(!isBlank(v)){ allEmpty=false; break; }
      }
      if(!allEmpty) break;
      last -= 1;
    }
    if(last < 0) return [];

    // also trim leading fully-empty columns (some sheets have padding columns)
    let first = 0;
    while(first<=last){
      let allEmpty = true;
      for(const r of data){
        const v = (r||[])[first];
        if(!isBlank(v)){ allEmpty=false; break; }
      }
      if(!allEmpty) break;
      first += 1;
    }
    return data.map(r => (r||[]).slice(first, last+1));
  }


  function isImageUrlText(s){
    if(!s) return false;
    const t = String(s).trim();
    // basic http(s) image URL detection
    return /^https?:\/\/\S+\.(png|jpe?g|webp|gif)(\?\S*)?$/i.test(t);
  }

  function convertImageUrlCells(tableEl){
    if(!tableEl) return;
    // Only touch body cells
    const tds = tableEl.querySelectorAll('tbody td');
    tds.forEach(td=>{
      const raw = (td.textContent || '').trim();
      if(!raw) return;
      if(!isImageUrlText(raw)) return;
      td.classList.add('hof-logo-cell');
      td.textContent = '';
      const img = document.createElement('img');
      img.className = 'hof-logo-img';
      img.loading = 'lazy';
      img.decoding = 'async';
      img.referrerPolicy = 'no-referrer';
      img.src = raw;
      img.alt = 'logo';
      td.appendChild(img);
    });
  }

  function markHofTitleCells(tableEl){
    if(!tableEl) return;
    const rows = Array.from(tableEl.querySelectorAll('tbody tr'));
    rows.forEach(tr=>{
      const cells = Array.from(tr.children || []);
      const txt = (tr.textContent||'').replace(/\s+/g,' ').trim();
      if(!txt) return;
      if(/명예의전당/.test(txt)){
        // Mark all non-empty cells in this row as title cells
        cells.forEach(td=>{
          const t = (td.textContent||'').trim();
          if(t && /명예의전당/.test(t)) td.classList.add('hof-table-title-cell');
        });
        tr.classList.add('hof-title-row');
      }
    });
  }


  // Decorate rows that represent champions / runner-up.
  // Many HOF sheets use a simple structure like:
  //  [우승 | TEAM] or [준우승 | TEAM] (sometimes TEAM cell contains an image).
  // This function upgrades that into a roster-like chip with a crown.
  function decorateHofPlacements(tableEl, leagueKey){
    if(!tableEl) return;
    const tbody = (tableEl.tBodies && tableEl.tBodies.length) ? tableEl.tBodies[0] : null;
    if(!tbody) return;
    const rows = Array.from(tbody.querySelectorAll('tr'));
    const norm = (s)=> String(s||'').replace(/\s+/g,' ').trim();
    // league key (needed for TPL/TCL special parsing)
    let k = String(leagueKey||'').toLowerCase();
    if(!k){
      try{
        if(tableEl.classList.contains('hof-league-tpl')) k='tpl';
        else if(tableEl.classList.contains('hof-league-tcl')) k='tcl';
        else if(tableEl.classList.contains('hof-league-msl')) k='msl';
        else if(tableEl.classList.contains('hof-league-tsl')) k='tsl';
        else if(tableEl.classList.contains('hof-league-tst')) k='tst';
      }catch(_){ }
    }
    if(!k){
      try{ k = String(window.HOF_INLINE_CURRENT||'').toLowerCase(); }catch(_){ }
    }

    // Simple key/value HOF tables (TPL/TCL): build a single stage card from the rendered table
    // Some sheets are 2-column (label/value) and don't include stage labels in the matrix, so matrix parsing fails.
    if((k==='tpl' || k==='tcl') && typeof mountSimpleKeyValueHofCardFromRenderedTable === 'function'){
      try{ if(mountSimpleKeyValueHofCardFromRenderedTable(tableEl, k)) return; }catch(_){}
    }



    // If there is a separate season row under the title, fold it into the title and remove the season row.
    try{
      let titleIdx=-1, seasonIdx=-1;
      for(let i=0;i<Math.min(6, rows.length); i++){
        const t = norm(rows[i].textContent);
        if(titleIdx<0 && /명예의전당/.test(t)) titleIdx=i;
        if(seasonIdx<0 && /(\(\s*시즌\s*\d+\s*\))/.test(t) && !/명예의전당/.test(t)) seasonIdx=i;
      }
      if(titleIdx>=0 && seasonIdx>=0 && seasonIdx>titleIdx){
        const titleRow = rows[titleIdx];
        const seasonRow = rows[seasonIdx];
        const seasonTxt = norm(seasonRow.textContent);
        const titleCell = (titleRow.children && titleRow.children.length) ? titleRow.children[0] : null;
        if(titleCell && seasonTxt){
          // Append season to the title (left aligned)
          const base = norm(titleCell.textContent);
          if(base && base.indexOf(seasonTxt)===-1){
            titleCell.textContent = base + '  ' + seasonTxt;
          }
        }
        // remove season row entirely
        seasonRow.remove();
        // refresh rows array (used later)
        // eslint-disable-next-line no-unused-vars
        rows.splice(seasonIdx,1);
      }
    }catch(_){}


    const makeBadge = (type)=>{
      const wrap = document.createElement('div');
      const t = (type==='win' || type==='runner' || type==='third') ? type : 'runner';
      wrap.className = 'hof-place-badge ' + t;

      const img = document.createElement('img');
      img.className = 'hof-place-crown';
      img.alt = (t==='win') ? '우승' : (t==='runner') ? '준우승' : '3위';
      img.src = (t==='win') ? './crown_gold.png' : (t==='runner') ? './crown_silver.png' : './crown_bronze.png';

      const label = document.createElement('div');
      label.className = 'hof-place-label';
      label.textContent = (t==='win') ? '우승' : (t==='runner') ? '준우승' : '3위';

      wrap.appendChild(img);
      wrap.appendChild(label);
      return wrap;
    };

    const upgradeTeamCell = (td)=>{
      if(!td) return;
      // If already upgraded, skip.
      if(td.querySelector('.hof-team-chip')) return;

      const imgs = Array.from(td.querySelectorAll('img'));
      const text = norm(td.textContent);

      const chip = document.createElement('div');
      chip.className = 'hof-team-chip';

      // icon
      const icon = document.createElement('div');
      icon.className = 'hof-team-icon';
      if(imgs.length){
        const pic = imgs[0];
        pic.classList.add('hof-team-img');
        icon.appendChild(pic);
      }else{
        icon.textContent = '';
      }

      // text block
      const tbox = document.createElement('div');
      tbox.className = 'hof-team-text';
      const name = document.createElement('div');
      name.className = 'hof-team-name';
      name.textContent = text || '-';
      tbox.appendChild(name);

      chip.appendChild(icon);
      chip.appendChild(tbox);

      // Clear && re-add
      td.innerHTML = '';
      td.appendChild(chip);
    };


    // Ensure league key is resolved (avoid redeclaring `k` in this scope)
    k = k || String(leagueKey || HOF_INLINE_CURRENT || 'pro').toLowerCase();
    const wantChip = (k === 'pro');

rows.forEach(tr=>{
      const tds = Array.from(tr.children||[]);
      if(!tds.length) return;

      // Find placement cell anywhere in row (some sheets put 우승/준우승 in col 2+)
      let placeIdx = -1;
      let placeType = '';
      for(let i=0;i<tds.length;i++){
        const txt = norm(tds[i].textContent);
        if(/(^|\s)3\s*위($|\s)/.test(txt) || /(^|\s)삼\s*위($|\s)/.test(txt) || /(^|\s)3rd($|\s)/i.test(txt)){ placeIdx = i; placeType='third'; break; }
        if(/준\s*우\s*승/.test(txt)){ placeIdx = i; placeType='runner'; break; }
        if(/(^|\s)우\s*승($|\s)/.test(txt) && !/준\s*우\s*승/.test(txt)){ placeIdx = i; placeType='win'; break; }
      }
      if(placeIdx < 0) return;

      tr.classList.add('hof-place-row');
      tr.classList.add(placeType==='win' ? 'win' : (placeType==='third' ? 'third' : 'runner'));

      // Replace the placement cell with crown badge
      tds[placeIdx].innerHTML = '';
      tds[placeIdx].appendChild(makeBadge(placeType));

      // Upgrade the adjacent team cell (next non-empty cell to the right, fallback to next index)
      let teamTd = null;
      for(let j=placeIdx+1;j<tds.length;j++){
        const hasImg = !!tds[j].querySelector('img');
        const txt = norm(tds[j].textContent);
        if(hasImg || txt){ teamTd = tds[j]; break; }
      }
      if(!teamTd && tds[placeIdx+1]) teamTd = tds[placeIdx+1];
      if(teamTd && wantChip) upgradeTeamCell(teamTd);
    });
  }

  
  // PRO: transform the raw table into a 2-column podium layout (match desired roster-style card)
  function renderProPodiumFromBlock(tableEl, blockData){
    // Render PROLEAGUE as 2-column podium cards (우승/준우승) like the screenshot.
    // We render into the existing <table> by placing a single <td colspan="N"> cell.
    if(!tableEl) return;
    const thead = tableEl.querySelector('thead');
    const tbody = tableEl.querySelector('tbody');
    if(!thead || !tbody) return;
    thead.innerHTML = '';
    tbody.innerHTML = '';

    const norm = (s)=> String(s||'').replace(/[\u200B-\u200D\uFEFF]/g,'').replace(/\u00A0/g,' ').replace(/\s+/g,' ').trim();
    const isUrl = (v)=> /^https?:\/\//i.test(String(v||'').trim());
    const isImgish = (v)=> isUrl(v) || /\.(png|jpe?g|gif|webp)(\?|$)/i.test(String(v||'').trim());
    const cleanVal = (v)=>{
      const s = norm(v);
      if(!s) return '';
      if(s==='-' || s==='—' || s==='–') return '-';
      return s;
    };

    // Find header row that contains 우승 and 준우승 (2-column matrix style)
// or detect the legacy "vertical" layout where 우승/준우승 are in the first column.
    let headerR=-1, cWin=-1, cRun=-1;
    for(let r=0;r<(blockData||[]).length;r++){
      const row = blockData[r] || [];
      for(let c=0;c<row.length;c++){
        const t = norm(row[c]);
        if(/^우\s*승$/.test(t)) cWin=c;
        if(/^준\s*우\s*승$/.test(t)) cRun=c;
      }
      if(cWin>=0 && cRun>=0){ headerR=r; break; }
      cWin=-1; cRun=-1;
    }

    // --- Legacy vertical layout fallback (most common old proleague sheets) ---
    // Example rows:
    // 우승 | (logo) | 팀명 | 감독 | ... | 부감독 | ...
    // 준우승 | (logo) | 팀명 | 감독 | ... | 부감독 | ...
    if(headerR < 0){
      // Legacy vertical layouts vary a lot across early seasons (S1~S4 especially).
      // Some sheets don't keep 우승/준우승 in the first column, so we scan the whole row.
      const findRowByAnyCell = (re)=>{
        for(let r=0;r<(blockData||[]).length;r++){
          const row = blockData[r] || [];
          for(let c=0;c<row.length;c++){
            const t = norm(row[c]);
            if(re.test(t)) return r;
          }
        }
        return -1;
      };
      const rWinV = findRowByAnyCell(/(^|\s)우\s*승($|\s)/);
      const rRunV = findRowByAnyCell(/준\s*우\s*승/);

      if(rWinV >= 0){
        const colCount = Math.max(...(blockData||[]).map(r=> (r||[]).length), 1);

        const pickValue = (row, labels)=>{
          // labels: array of regex to match within the row
          const cells = (row||[]).map(norm);
          // If the row is like: [우승, logo, team, 감독, name, 부감독, name]
          // Use heuristics: team name is first non-url, non-empty after logo.
          const isUrl = (v)=> /^https?:\/\//i.test(String(v||'').trim());
          const isImgish = (v)=> isUrl(v) || /\.(png|jpe?g|gif|webp)(\?|$)/i.test(String(v||'').trim());
          const cleanVal = (v)=>{
            const s = norm(v);
            if(!s) return '';
            if(s==='-' || s==='—' || s==='–') return '-';
            return s;
          };

          // Try explicit labels first (e.g. "팀명", "감독", "부감독")
          for(let i=0;i<cells.length;i++){
            const t = cells[i];
            if(!t) continue;
            if(labels.some(rx=>rx.test(t))){
              // take the next meaningful cell(s)
              for(let j=i+1;j<cells.length;j++){
                const v = cleanVal(cells[j]);
                if(v && !isUrl(v) && !isImgish(v)) return v;
              }
            }
          }

          // Heuristic fallback:
          // logo is usually at index 1; team name around index 2.
          for(let j=1;j<cells.length;j++){
            const v = cleanVal(cells[j]);
            if(!v) continue;
            if(isImgish(v)) continue;
            if(isUrl(v)) continue;
            return v;
          }
          const __isVice = Array.isArray(labels) && labels.some(rx=>{ try{return /부감독/.test(rx.source||'') || /부감독/.test(String(rx));}catch(_){return false;} });
            return __isVice ? '-' : '';
          };

        const pickLogo = (row)=>{
          const cells = (row||[]).map(norm);
          const isUrl = (v)=> /^https?:\/\//i.test(String(v||'').trim());
          const isImgish = (v)=> isUrl(v) || /\.(png|jpe?g|gif|webp)(\?|$)/i.test(String(v||'').trim());
          for(let j=1;j<cells.length;j++){
            const v=cells[j];
            if(v && isImgish(v)) return v;
          }
          return '';
        };

        const winLogo = pickLogo(blockData[rWinV]||[]);
        const runLogo = pickLogo(blockData[rRunV]||[]);

        // Team name / coach / subcoach
        const winName  = pickValue(blockData[rWinV]||[], [/^팀\s*명$/]);
        const runName  = pickValue(blockData[rRunV]||[], [/^팀\s*명$/]);

        const winCoach = pickValue(blockData[rWinV]||[], [/^감\s*독$/]);
        const runCoach = pickValue(blockData[rRunV]||[], [/^감\s*독$/]);

        const winSub   = pickValue(blockData[rWinV]||[], [/^부\s*감\s*독$/]);
        const runSub   = pickValue(blockData[rRunV]||[], [/^부\s*감\s*독$/]);

        // Organizer row (if present)
        let organizer = '';
        for(let r=0;r<(blockData||[]).length;r++){
          const row = blockData[r] || [];
          let labelIdx = -1;
          for(let c=0;c<row.length;c++){
            const t = norm(row[c]);
            if(/^(대회\s*진행자|대회진행자|진행자|운영진|운영팀)$/.test(t)) { labelIdx = c; break; }
          }
          if(labelIdx >= 0){
            organizer = row.slice(labelIdx+1).map(norm).filter(x=>x && !/^https?:\/\//i.test(x)).join(' ').trim();
            break;
          }
        }

        const makeCard = (place, logo, name, coach, sub)=>{
          const isWin = (place==='우승');
          const card = document.createElement('div');
          card.className = 'hof-pro-card ' + (isWin?'win':'runner');

          const badge = document.createElement('div');
          badge.className = 'hof-pro-badge';
          const crownImg = document.createElement('img');
          crownImg.className = 'hof-pro-crown';
          crownImg.alt = place;
          crownImg.src = isWin ? './crown_gold.png' : './crown_silver.png';
          const lbl = document.createElement('div');
          lbl.className = 'hof-pro-place';
          lbl.textContent = place;
          badge.appendChild(crownImg);
          badge.appendChild(lbl);

          const body = document.createElement('div');
          body.className = 'hof-pro-body';

          const iconWrap = document.createElement('div');
          iconWrap.className = 'hof-pro-iconwrap';

          const icon = document.createElement('div');
          icon.className = 'hof-pro-icon';
          if(logo){
            const img = document.createElement('img');
            setLogoImgSrcWithFallback(img, logo, 's10team');
            img.alt = '';
            img.loading = 'lazy';
            img.decoding = 'async';
            img.referrerPolicy = 'no-referrer';
            icon.appendChild(img);
          }
          iconWrap.appendChild(badge);
          iconWrap.appendChild(icon);

          const txt = document.createElement('div');
          txt.className = 'hof-pro-text';
          const nm = document.createElement('div');
          nm.className = 'hof-pro-name';
          nm.textContent = name || '';
          txt.appendChild(nm);

          const subline = [];
          if(coach) subline.push('감독 : ' + coach);
          if(sub) subline.push('부감독 : ' + sub);
          if(subline.length){
            const st = document.createElement('div');
            st.className = 'hof-pro-sub';
            st.textContent = subline.join(' / ');
            txt.appendChild(st);
          }

          body.appendChild(iconWrap);
          body.appendChild(txt);

          card.appendChild(body);
          return card;
        };

        const podium = document.createElement('div');
        podium.className = 'hof-pro-podium';
        podium.appendChild(makeCard('우승', winLogo, winName, winCoach, winSub));
        if(rRunV >= 0){ podium.appendChild(makeCard('준우승', runLogo, runName, runCoach, runSub)); }

        const wrap = document.createElement('div');
        wrap.className = 'hof-pro-wrap';
        wrap.appendChild(podium);

        if(organizer){
          const org = document.createElement('div');
          org.className = 'hof-pro-organizer';
          org.textContent = '대회진행자 : ' + organizer;
          wrap.appendChild(org);
        }

        const tr = document.createElement('tr');
        const td = document.createElement('td');
        td.colSpan = colCount;
        td.className = 'hof-pro-podium-cell';
        td.appendChild(wrap);
        tr.appendChild(td);
        tbody.appendChild(tr);
        return;
      }

      // If even vertical fallback fails, keep default table render
      renderTable(tableEl, blockData||[]);
      try{convertImageUrlCells(tableEl);}catch(_){}
      return;
    }

    const colCount = Math.max(...(blockData||[]).map(r=> (r||[]).length), 1);

    // try to find logo row shortly after header
    let logoR=-1;
    for(let r=headerR+1; r<Math.min(headerR+6, blockData.length); r++){
      const row = blockData[r]||[];
      if(isImgish(row[cWin]) || isImgish(row[cRun])) { logoR=r; break; }
    }
    const winLogo = (logoR>=0 && cleanVal((blockData[logoR]||[])[cWin]) && isImgish((blockData[logoR]||[])[cWin])) ? norm((blockData[logoR]||[])[cWin]) : '';
    const runLogo = (logoR>=0 && cleanVal((blockData[logoR]||[])[cRun]) && isImgish((blockData[logoR]||[])[cRun])) ? norm((blockData[logoR]||[])[cRun]) : '';

    // Extract key/value rows
    const details = { win:{}, runner:{} };
    let organizer = '';
    const wanted = ['팀명','감독','부감독'];
    for(let r=headerR+1; r<(blockData||[]).length; r++){
      const row = blockData[r] || [];
      const rowTxt = norm(row.join(' '));
      // organizer row: label anywhere in row
      const first = norm(row[0]);
      if(!organizer && /^(대회\s*진행자|대회진행자|진행자|운영진|운영팀)$/.test(first)){
        // join remaining cells (skip urls and dashes)
        const rest = row.slice(1).map(cleanVal).filter(x=> x && !isUrl(x)).join(' ').trim();
        if(rest) organizer = rest;
        continue;
      }
      // Find label cell
      let label='';
      for(let c=0;c<row.length;c++){
        const t = norm(row[c]);
        if(wanted.includes(t)) { label=t; break; }
      }
      if(!label) continue;
      const wv = cleanVal(row[cWin]);
      const rv = cleanVal(row[cRun]);
      if(wv && !isUrl(wv)) details.win[label]=wv;
      if(rv && !isUrl(rv)) details.runner[label]=rv;
    }

    const winName = cleanVal(details.win['팀명']);
    const runName = cleanVal(details.runner['팀명']);
    const winCoach = cleanVal(details.win['감독']);
    const winSub = cleanVal(details.win['부감독']);
    const runCoach = cleanVal(details.runner['감독']);
    const runSub = cleanVal(details.runner['부감독']);

    const makeCard = (place, logo, name, coach, sub)=>{
      const isWin = (place==='우승');
      const card = document.createElement('div');
      card.className = 'hof-pro-card ' + (isWin?'win':'runner');

      // Badge (우승/준우승 + 왕관) sits *above* the team logo.
      const badge = document.createElement('div');
      badge.className = 'hof-pro-badge';
      const crownImg = document.createElement('img');
      crownImg.className = 'hof-pro-crown';
      crownImg.alt = place;
      crownImg.src = isWin ? './crown_gold.png' : './crown_silver.png';
      const lbl = document.createElement('div');
      lbl.className = 'hof-pro-place';
      lbl.textContent = place;
      badge.appendChild(crownImg);
      badge.appendChild(lbl);

      const body = document.createElement('div');
      body.className = 'hof-pro-body';

      // Logo box (bigger) with the badge pinned above it.
      const iconWrap = document.createElement('div');
      iconWrap.className = 'hof-pro-iconwrap';

      const icon = document.createElement('div');
      icon.className = 'hof-pro-icon';
      if(logo){
        const img = document.createElement('img');
        setLogoImgSrcWithFallback(img, logo, 's10team');
        img.alt = '';
        img.loading = 'lazy';
        img.decoding = 'async';
        img.referrerPolicy = 'no-referrer';
        icon.appendChild(img);
      }
      iconWrap.appendChild(badge);
      iconWrap.appendChild(icon);

      const txt = document.createElement('div');
      txt.className = 'hof-pro-text';
      const nm = document.createElement('div');
      nm.className = 'hof-pro-name';
      nm.textContent = name || '';
      txt.appendChild(nm);

      const subline = [];
      if(coach) subline.push('감독 ' + coach);
      if(sub) subline.push('부감독 ' + sub);
      if(subline.length){
        const st = document.createElement('div');
        st.className = 'hof-pro-sub';
        st.textContent = subline.join('   ');
        txt.appendChild(st);
      }

      body.appendChild(iconWrap);
      body.appendChild(txt);

      card.appendChild(body);
      return card;
    };

    const podium = document.createElement('div');
    podium.className = 'hof-pro-podium';
    podium.appendChild(makeCard('우승', winLogo, winName, winCoach, winSub));
    if(rRunV >= 0){ podium.appendChild(makeCard('준우승', runLogo, runName, runCoach, runSub)); }

    const wrap = document.createElement('div');
    wrap.className = 'hof-pro-wrap';
    wrap.appendChild(podium);

    if(organizer){
      const org = document.createElement('div');
      org.className = 'hof-pro-organizer';
      org.textContent = '대회진행 : ' + organizer;
      wrap.appendChild(org);
    }

    const tr = document.createElement('tr');
    const td = document.createElement('td');
    td.colSpan = colCount;
    td.className = 'hof-pro-podium-cell';
    td.appendChild(wrap);
    tr.appendChild(td);
    tbody.appendChild(tr);
  }


  // TST/TSL: merge title/season/organizer rows to match the intended "single merged left-aligned cell" style.
  function mergeTstTslHeaderRows(tableEl, leagueKey){
    const k = String(leagueKey||'').toLowerCase();
    if(!tableEl || (k!=='tst' && k!=='tsl')) return;
    const tbody = (tableEl.tBodies && tableEl.tBodies.length) ? tableEl.tBodies[0] : null;
    if(!tbody) return;

    const rows = Array.from(tbody.querySelectorAll('tr'));
    const norm = (s)=> String(s||'').replace(/\s+/g,' ').trim();

    // If there is a separate season row under the title, fold it into the title and remove the season row.
    try{
      let titleIdx=-1, seasonIdx=-1;
      for(let i=0;i<Math.min(6, rows.length); i++){
        const t = norm(rows[i].textContent);
        if(titleIdx<0 && /명예의전당/.test(t)) titleIdx=i;
        if(seasonIdx<0 && /(\(\s*시즌\s*\d+\s*\))/.test(t) && !/명예의전당/.test(t)) seasonIdx=i;
      }
      if(titleIdx>=0 && seasonIdx>=0 && seasonIdx>titleIdx){
        const titleRow = rows[titleIdx];
        const seasonRow = rows[seasonIdx];
        const seasonTxt = norm(seasonRow.textContent);
        const titleCell = (titleRow.children && titleRow.children.length) ? titleRow.children[0] : null;
        if(titleCell && seasonTxt){
          // Append season to the title (left aligned)
          const base = norm(titleCell.textContent);
          if(base && base.indexOf(seasonTxt)===-1){
            titleCell.textContent = base + '  ' + seasonTxt;
          }
        }
        // remove season row entirely
        seasonRow.remove();
        // refresh rows array (used later)
        // eslint-disable-next-line no-unused-vars
        rows.splice(seasonIdx,1);
      }
    }catch(_){}


    const mergeRowAll = (tr, cls)=>{
      const tds = Array.from(tr.children||[]);
      if(tds.length<=1) { if(cls) tr.classList.add(cls); return; }
      const first = tds[0];
      first.colSpan = tds.length;
      for(let i=tds.length-1;i>=1;i--) tds[i].remove();
      first.classList.add('hof-merged-cell');
      if(cls) first.classList.add(cls);
      first.style.textAlign = 'left';
      first.style.paddingLeft = '14px';
      tr.classList.add('hof-merged-row');
    };

    // 1) Title row containing "명예의전당" or league title
    for(const tr of rows){
      const txt = norm(tr.textContent);
      if(/명예의전당/.test(txt)){
        mergeRowAll(tr, 'hof-title-merged');
        break;
      }
    }

    // 2) Season name row (contains 시즌#)
    for(const tr of rows){
      const txt = norm(tr.textContent);
      if(/시즌\s*\d+/.test(txt) || /(S|시즌)\s*\d+/.test(txt)){
        mergeRowAll(tr, 'hof-season-merged');
        break;
      }
    }

    // 3) Organizer row: merge cells to the right of label and add green star right before names
    for(const tr of rows){
      const tds = Array.from(tr.children||[]);
      if(tds.length<2) continue;
      const label = norm(tds[0].textContent);
      if(!/^(대회\s*진행자|대회\s*진행|진행자|운영팀)$/.test(label)) continue;

      // Merge all remaining cells into the 2nd cell
      const second = tds[1];
      if(tds.length>2){
        let extra = '';
        for(let i=2;i<tds.length;i++){
          const t = norm(tds[i].textContent);
          if(t) extra += (extra? ' ' : '') + t;
          tds[i].remove();
        }
        if(extra){
          second.textContent = norm(second.textContent) + (norm(second.textContent)? ' ' : '') + extra;
        }
        second.colSpan = 999; // enough to take remaining columns visually
      }

      // add star at the very beginning (left side)
      if(!second.querySelector('.hof-organizer-star')){
        const star = document.createElement('span');
        star.className = 'hof-organizer-star';
        star.textContent = '*';
        // keep existing text
        const old = second.textContent;
        second.textContent = '';
        second.appendChild(star);
        second.appendChild(document.createTextNode(' ' + old));
      }

      second.classList.add('hof-organizers-merged');
      second.style.textAlign = 'left';
      second.style.paddingLeft = '12px';
      break;
    }
  }


// TST/TSL: merge tier label (갓/킹/...) into winner/runner name cells for mobile "갓 DayDream" style." label (갓/킹/...) into winner/runner name cells for mobile "갓 DayDream" style.
  function mergeTierIntoNameCells(tableEl, leagueKey){
    const k = String(leagueKey||'').toLowerCase();
    if(!tableEl || (k!=='tst' && k!=='tsl')) return;
    const tbody = (tableEl.tBodies && tableEl.tBodies.length) ? tableEl.tBodies[0] : null;
    if(!tbody) return;
    const tierSet = new Set(['갓','킹','퀸','잭','스페이드','조커','히든']);
    const norm = (s)=> String(s||'').replace(/\s+/g,' ').trim();

    // If there is a separate season row under the title, fold it into the title and remove the season row.
    try{
      let titleIdx=-1, seasonIdx=-1;
      for(let i=0;i<Math.min(6, rows.length); i++){
        const t = norm(rows[i].textContent);
        if(titleIdx<0 && /명예의전당/.test(t)) titleIdx=i;
        if(seasonIdx<0 && /(\(\s*시즌\s*\d+\s*\))/.test(t) && !/명예의전당/.test(t)) seasonIdx=i;
      }
      if(titleIdx>=0 && seasonIdx>=0 && seasonIdx>titleIdx){
        const titleRow = rows[titleIdx];
        const seasonRow = rows[seasonIdx];
        const seasonTxt = norm(seasonRow.textContent);
        const titleCell = (titleRow.children && titleRow.children.length) ? titleRow.children[0] : null;
        if(titleCell && seasonTxt){
          // Append season to the title (left aligned)
          const base = norm(titleCell.textContent);
          if(base && base.indexOf(seasonTxt)===-1){
            titleCell.textContent = base + '  ' + seasonTxt;
          }
        }
        // remove season row entirely
        seasonRow.remove();
        // refresh rows array (used later)
        // eslint-disable-next-line no-unused-vars
        rows.splice(seasonIdx,1);
      }
    }catch(_){}

    Array.from(tbody.querySelectorAll('tr')).forEach(tr=>{
      const tds = Array.from(tr.children||[]);
      if(tds.length < 3) return;
      const tierTxt = norm(tds[0].textContent);
      if(!tierSet.has(tierTxt)) return;
      tr.classList.add('hof-tier-row');
      for(let i=1;i<tds.length;i++){
        const td = tds[i];
        // skip placement cell (contains 우승/준우승 badge)
        if(td.querySelector('.hof-place-badge')) continue;
        // skip image-only cells
        if(td.querySelector('img') && !norm(td.textContent)) continue;
        const nameTxt = norm(td.textContent);
        if(!nameTxt || nameTxt==='-' || nameTxt==='—') continue;
        // Already merged?
        if(td.querySelector('.hof-tier-inline')) continue;
        td.innerHTML = '';
        const tierSpan = document.createElement('span');
        tierSpan.className = 'hof-tier-inline';
        tierSpan.textContent = tierTxt;
        const nameSpan = document.createElement('span');
        nameSpan.className = 'hof-name-inline';
        nameSpan.textContent = nameTxt;
        td.appendChild(tierSpan);
        td.appendChild(nameSpan);
      }
    });
  }


  // Per-league inline HOF cache to prevent table/season state leaking across PRO/TST/TSL
  // html: pristine table html (legacy row-filter mode)
  // seasons: list of season labels
  // meta: per-row season metadata (legacy row-filter mode)
  // blocks: { byLabel: Map<label, {label, num, data:[][]}>, order:[label...] } (grid/block mode)
  var HOF_INLINE_CACHE = (window.HOF_INLINE_CACHE && typeof window.HOF_INLINE_CACHE==='object') ? window.HOF_INLINE_CACHE : { pro: null, tst: null, tsl: null };
window.HOF_INLINE_CACHE = HOF_INLINE_CACHE;
var HOF_INLINE_CURRENT = window.HOF_INLINE_CURRENT || 'pro';
window.HOF_INLINE_CURRENT = HOF_INLINE_CURRENT;
var HOF_INLINE_REQ_TOKEN = window.HOF_INLINE_REQ_TOKEN || 0;
window.HOF_INLINE_REQ_TOKEN = HOF_INLINE_REQ_TOKEN;

  // --- HOF season extraction (grid/block style sheets) ---
  const SEASON_CELL_PAT = /(S|시즌)\s*0*\d+\b/i;
  const normalizeCellText = (s)=> _normSeasonText(String(s||''));

  function detectSeasonCellsFromData(data){
    const out = [];
    const isUrl = (v)=> /^https?:\/\//i.test(String(v||'').trim());
    for(let r=0;r<data.length;r++){
      const row = data[r] || [];
      for(let c=0;c<row.length;c++){
        const raw = row[c];
        const rawStr = String(raw||'').trim();
        if(isUrl(rawStr)) continue;
        if(/\.(png|jpe?g|gif|webp)(\?|$)/i.test(rawStr)) continue;
        const txt = normalizeCellText(raw);
        if(!txt) continue;
        if(!SEASON_CELL_PAT.test(txt)) continue;
        const num = extractSeasonNum(txt);
        if(!num) continue;
        out.push({ r, c, label: txt, num });
      }
    }
    return out;
  }

  function sliceAndTrim(data, r0, c0, r1, c1){
    // slice inclusive bounds then trim empty outer rows/cols
    const rows = [];
    for(let r=r0; r<=r1; r++){
      const src = data[r] || [];
      rows.push(src.slice(c0, c1+1));
    }
    // trim empty bottom
    const isRowEmpty = (arr)=> arr.every(v=> !normalizeCellText(v));
    while(rows.length && isRowEmpty(rows[rows.length-1])) rows.pop();
    // trim empty top
    while(rows.length && isRowEmpty(rows[0])) rows.shift();
    if(!rows.length) return [];
    // trim empty right/left
    const colCount = Math.max(...rows.map(r=>r.length));
    const isColEmpty = (idx)=> rows.every(r=> !normalizeCellText(r[idx]));
    let left=0, right=colCount-1;
    while(left<=right && isColEmpty(left)) left++;
    while(right>=left && isColEmpty(right)) right--;
    const trimmed = rows.map(r=> r.slice(left, right+1));
    return trimmed;
  }

  function buildSeasonBlocksFromData(data){
    const seasonCells = detectSeasonCellsFromData(data);
    if(!seasonCells.length) return null;

    // Heuristic: block-mode if we have at least 2 season cells (grid OR vertical blocks)
    const rowCounts = {};
    seasonCells.forEach(s=>{ rowCounts[s.r] = (rowCounts[s.r]||0) + 1; });
    const looksGrid = Object.values(rowCounts).some(n=>n>=2);
    // If not grid, we still support vertical blocks, so only bail when we have <2 seasons
    if(seasonCells.length < 2) return null;

    // For each season cell, exp&& a block around it.
    // We'll exp&& right/down until we hit another season cell "boundary" or empty space.
    const maxR = data.length-1;
    const maxC = Math.max(...data.map(r=> (r||[]).length)) - 1;

    // index season cells for fast boundary detection
    const seasonAt = new Set(seasonCells.map(s=> `${s.r},${s.c}`));

    const byLabel = {};
    const pickBestLabel = (labels)=>{
      // prefer the most descriptive label (longer) when duplicates exist
      return labels.sort((a,b)=> b.length - a.length)[0];
    };

    // group by season number first
    const byNum = {};
    seasonCells.forEach(s=>{
      if(!byNum[s.num]) byNum[s.num]=[];
      byNum[s.num].push(s);
    });

    Object.keys(byNum).forEach(numStr=>{
      const num = parseInt(numStr,10);
      const cells = byNum[num];
      const label = pickBestLabel(cells.map(x=>x.label));
      // pick the top-most, left-most occurrence as anchor
      cells.sort((a,b)=> (a.r-b.r) || (a.c-b.c));
      const anchor = cells[0];

      // Exp&& width
      let c1 = Math.min(anchor.c + 24, maxC); // cap width (wider to include 준우승 column)
      for(let c=anchor.c+1; c<=Math.min(anchor.c+40, maxC); c++){
        // stop if we meet another season cell on the same header row
        if(seasonAt.has(`${anchor.r},${c}`)) { c1 = c-1; break; }
        // If next 2 cols are all empty in first 12 rows, stop early
        let hasAny=false;
        for(let r=anchor.r; r<=Math.min(anchor.r+26, maxR); r++){
          const v = normalizeCellText((data[r]||[])[c]);
          if(v){ hasAny=true; break; }
        }
        if(!hasAny){ c1 = c-1; break; }
        c1 = c;
      }

      // Exp&& height
      let r1 = Math.min(anchor.r + 70, maxR);
      for(let r=anchor.r+1; r<=Math.min(anchor.r+140, maxR); r++){
        // boundary if we encounter another season cell within the same column range
        let hit=false;
        for(let c=anchor.c; c<=c1; c++){
          if(seasonAt.has(`${r},${c}`)) { hit=true; break; }
        }
        if(hit){ r1 = r-1; break; }
        // stop if we get 2 consecutive empty rows across the range
        const row = data[r]||[];
        const has = (colFrom,colTo)=>{
          for(let c=colFrom;c<=colTo;c++) if(normalizeCellText(row[c])) return true;
          return false;
        };
        if(!has(anchor.c,c1) && !has(anchor.c,c1)){
          // check next row too
          const row2 = data[r+1]||[];
          let has2=false;
          for(let c=anchor.c;c<=c1;c++) if(normalizeCellText(row2[c])) { has2=true; break; }
          if(!has2){ r1 = r-1; break; }
        }
        r1 = r;
      }

      const block = sliceAndTrim(data, anchor.r, anchor.c, r1, c1);
      byLabel[label] = { label, num, data: block };
    });

    const order = Object.values(byLabel)
      .sort((a,b)=> (b.num-a.num) || String(b.label).localeCompare(String(a.label),'ko',{numeric:true}))
      .map(x=>x.label);

    return { byLabel, order };
  }

  function renderBlockTable(tableEl, block, leagueKey){
    if(!tableEl) return;
    const k = String(leagueKey||'').toLowerCase();

    // Tag current league on the inline table for responsive CSS hooks
    try{
      tableEl.classList.remove('hof-league-pro','hof-league-tst','hof-league-tsl','hof-league-tpl','hof-league-msl','hof-league-tcl');
      if(k==='pro') tableEl.classList.add('hof-league-pro');
      if(k==='tst') tableEl.classList.add('hof-league-tst');
      if(k==='tsl') tableEl.classList.add('hof-league-tsl');
      if(k==='tpl') tableEl.classList.add('hof-league-tpl');
      if(k==='msl') tableEl.classList.add('hof-league-msl');
      if(k==='tcl') tableEl.classList.add('hof-league-tcl');

      // Also tag the container so CSS can reliably scope mobile/resize behavior
      const inline = document.getElementById('hofInline');
      if(inline){
        inline.classList.remove('hof-league-pro','hof-league-tst','hof-league-tsl','hof-league-tpl','hof-league-msl','hof-league-tcl');
        if(k==='pro') inline.classList.add('hof-league-pro');
        if(k==='tst') inline.classList.add('hof-league-tst');
        if(k==='tsl') inline.classList.add('hof-league-tsl');
        if(k==='tpl') inline.classList.add('hof-league-tpl');
        if(k==='msl') inline.classList.add('hof-league-msl');
        if(k==='tcl') inline.classList.add('hof-league-tcl');
      }
}catch(_){}

    let data = (block && block.data) ? block.data : [];
    // Normalize: some old TST blocks include a standalone title row like "TST명예의전당"
    // (often split with line breaks: "TST\n명예의전\n당"). Remove it reliably.
    try{
      if(String(leagueKey||'').toLowerCase()==='tst' && Array.isArray(data)){
        const _norm=(s)=>String(s||'')
          .replace(/[\u200b-\u200d\ufeff]/g,'')
          .replace(/\xa0/g,' ')
          .replace(/\s+/g,' ')
          .trim();
        const _tight=(s)=>_norm(s).replace(/\s+/g,'');
        data = data.filter(row=>{
          const r = Array.isArray(row)? row : [];
          const joined = _tight(r.join(' '));
          // kill pure title rows
          if(joined.includes('TST명예의전당')) return false;
          // also remove any non-season header row that contains "명예의전당" (even if spaced)
          if(joined.includes('명예의전당') && !/\(시즌\d+\)/.test(joined) && !/시즌\d+/.test(joined)) return false;
          return true;
        });
      }
    }catch(_){ }


    // Cache last rendered block per league for responsive rebuilds (e.g., stage cards on resize)
    try{
      window.__HOF_LAST_BLOCK = window.__HOF_LAST_BLOCK || {};
      window.__HOF_LAST_BLOCK[k] = { data: Array.isArray(data) ? data : [], ts: Date.now() };
    }catch(_){ }

    // TST/TSL: prevent flash by keeping the table invisible while we build stage cards.
    // (We still render into the real table DOM because some parsers rely on it.)
    let __restoreVis = false;
    try{
      if(isHofCardLeague(k) && tableEl){
        __restoreVis = (tableEl.style.visibility !== 'hidden');
        tableEl.style.visibility = 'hidden';
      }
    }catch(_){ }

    // Always render as a normal table first
    renderTable(tableEl, data);

    // Final guard: remove the first title row 'TST 명예의전당' if it survived (DOM-level cleanup)
    try{
      if(k==='tst' && tableEl){
        const rows = tableEl.querySelectorAll('tr');
        const tight = (s)=>String(s||'').replace(/[\u200b-\u200d\ufeff]/g,'').replace(/\xa0/g,' ').replace(/\s+/g,'');
        rows.forEach(tr=>{
          const t = tight(tr.textContent);
          if(t.includes('TST명예의전당')) tr.remove();
        });
      }
    }catch(_){ }


    // PRO: render as podium cards (우승/준우승) like the Proleague screenshot
    if(k==='pro'){
      try{ renderProPodiumFromBlock(tableEl, data); }catch(_){ renderTable(tableEl, data); }
      return;
    }
    try{ if (isHofCardLeague(k)) { trimEmptyTstTslHeaderStub(tableEl); } }catch(_){ }

    try{ markHofTitleCells(tableEl); }catch(_){ }
    try{ convertImageUrlCells(tableEl); }catch(_){ }
    try{ applyTableDataLabels(tableEl); }catch(_){ }

    // 공통: "대회진행자/운영팀" 같이 여러 칸으로 퍼지는 행을 1칸으로 병합(모바일/축소에서 빈칸처럼 보이는 현상 방지)
    try{ mergeOrganizerRowAnyLeague(tableEl, k); }catch(_){ }

    // PROLEAGUE: the sheet is laid out as a 2-column podium (우승/준우승) matrix.
    // Convert the matrix into the premium podium cards (우승 위 / 준우승 아래).
    // PROLEAGUE: render as table so 우승/준우승 2열 구조가 그대로 보이도록 유지

    // TST/TSL (table mode)
    try{ decorateHofPlacements(tableEl, k); }catch(_){ }
    try{ mergeTierIntoNameCells(tableEl, k); }catch(_){ }
    try{ normalizeOrganizerCells(tableEl, k); }catch(_){ }
    try{ mergeTstTslHeaderAndOrganizer(tableEl, k); }catch(_){ }
    

// Build mobile stage-cards for TST/TSL (TSL-style cards on small screens)
try{
  // Ensure any lingering HOF stage cards/flags are cleared before rebuilding (prevents TST->TSL blank on mobile)
  const inline = document.getElementById('hofInline');
  if(inline) inline.classList.remove('hof-has-stagecards','hof-inline-tst','hof-inline-tsl','hof-inline-tpl','hof-inline-msl','hof-inline-tcl');
  // Remove any previously mounted card containers (both inside inline and next to table)
  if(tableEl && tableEl.parentElement){
    tableEl.parentElement.querySelectorAll('.hof-stage-cards').forEach(n=>n.remove());
  }
  const box = document.querySelector('#hofInline .hof-stage-cards');
  if(box) box.remove();
}catch(_){}

try{ removeTstHallOfFameHeaderRows(tableEl, k); }catch(_){}

try{ renderStageCardsForMobile(tableEl, data, k); }catch(_){ }

    // If cards were built, renderStageCardsForMobile hides the table.
    // If not, restore visibility so the table can be seen.
    try{
      if(isHofCardLeague(k) && tableEl){
        const parent = tableEl.parentElement;
        const built = parent ? parent.querySelectorAll('.hof-stage-card').length : 0;
        if(built <= 0){
          tableEl.style.visibility = '';
        }
      }
    }catch(_){ }

    // v1067 HARD FORCE: If stage-cards were mounted but flags/styles didn't flip, force them.
    try{
      const inline=document.getElementById('hofInline');
      const hasCard=(inline && inline.querySelector('.hof-stage-card')) || (tableEl && tableEl.parentElement && tableEl.parentElement.querySelector('.hof-stage-card'));
      if(isHofCardLeague(k) && hasCard){
        if(inline) inline.classList.add('hof-has-stagecards');
        try{ tableEl.style.display='none'; }catch(_){ }
      }
    }catch(_){ }

  }

  
  // TST/TSL: some sheet layouts produce an empty first header cell (stub column) that looks like
  // a useless blank column when the viewport is narrow. Hide that *header stub only*.
  function trimEmptyTstTslHeaderStub(tableEl){
    const norm = (s)=> String(s||'').replace(/[\u200b-\u200d\ufeff]/g,'').replace(/\xa0/g,' ').replace(/\s+/g,' ').trim();
    const thead = tableEl.tHead;
    if(!thead) return;
    Array.from(thead.querySelectorAll('tr')).forEach(tr=>{
      const cells = Array.from(tr.children||[]);
      if(!cells.length) return;
      const first = cells[0];
      if(first && !norm(first.textContent)){
        first.style.display='none';
      }
    });
  }

// ALL LEAGUES: merge organizer value cells into a single cell so it never looks like
  // there's a useless empty column when the viewport is small.
  function mergeOrganizerRowAnyLeague(tableEl, leagueKey){
    if(!tableEl) return;
    const tbody = (tableEl.tBodies && tableEl.tBodies.length) ? tableEl.tBodies[0] : null;
    if(!tbody) return;
    const norm = (s)=> String(s||'').replace(/\s+/g,' ').trim();

    // If there is a separate season row under the title, fold it into the title and remove the season row.
    try{
      let titleIdx=-1, seasonIdx=-1;
      for(let i=0;i<Math.min(6, rows.length); i++){
        const t = norm(rows[i].textContent);
        if(titleIdx<0 && /명예의전당/.test(t)) titleIdx=i;
        if(seasonIdx<0 && /(\(\s*시즌\s*\d+\s*\))/.test(t) && !/명예의전당/.test(t)) seasonIdx=i;
      }
      if(titleIdx>=0 && seasonIdx>=0 && seasonIdx>titleIdx){
        const titleRow = rows[titleIdx];
        const seasonRow = rows[seasonIdx];
        const seasonTxt = norm(seasonRow.textContent);
        const titleCell = (titleRow.children && titleRow.children.length) ? titleRow.children[0] : null;
        if(titleCell && seasonTxt){
          // Append season to the title (left aligned)
          const base = norm(titleCell.textContent);
          if(base && base.indexOf(seasonTxt)===-1){
            titleCell.textContent = base + '  ' + seasonTxt;
          }
        }
        // remove season row entirely
        seasonRow.remove();
        // refresh rows array (used later)
        // eslint-disable-next-line no-unused-vars
        rows.splice(seasonIdx,1);
      }
    }catch(_){}

    const isLabel = (t)=> /^(대회\s*진행자|대회진행자|진행자|운영진|운영팀)$/.test(t);

    Array.from(tbody.querySelectorAll('tr')).forEach(tr=>{
      const tds = Array.from(tr.children||[]);
      if(tds.length < 3) return;
      const label = norm(tds[0].textContent);
      if(!isLabel(label)) return;

      // Find the first value cell (could be empty due to sheet layout)
      let firstVal = tds[1];
      let startIdx = 1;
      if(!norm(firstVal.textContent)){
        // if second cell is empty but later cells have content, start merging from the first non-empty
        for(let i=2;i<tds.length;i++){
          if(norm(tds[i].textContent)) { firstVal = tds[i]; startIdx = i; break; }
        }
      }

      const rest = tds.slice(startIdx+1);
      const merged = norm([firstVal.innerText||firstVal.textContent||'', ...rest.map(td=> td.innerText||td.textContent||'')].join(' '));
      firstVal.textContent = merged;

      // Merge into one cell spanning to the end
      firstVal.colSpan = tds.length - startIdx;
      firstVal.style.textAlign = 'left';
      firstVal.classList.add('hof-organizers-merged');
      rest.forEach(td=> td.remove());

      // If we started at idx>1, remove any empty cells between label and firstVal
      for(let i=1;i<startIdx;i++){
        try{ tds[i].remove(); }catch(_){ }
      }

      // Add green star prefix once
      if(!firstVal.querySelector('.hof-organizer-star')){
        const star = document.createElement('span');
        star.className='hof-organizer-star';
        star.textContent='*';
        const txt = document.createTextNode(' ' + merged);
        firstVal.textContent='';
        firstVal.appendChild(star);
        firstVal.appendChild(txt);
      }
    });
  }

  // TST/TSL: merge multi-line organizer IDs (ilChO, MARVEL, Arirang, sOnic`, Inter, ...)
  // into a single line to prevent vertical stacking / overlap on small screens.
  function normalizeOrganizerCells(tableEl, leagueKey){
    const k = String(leagueKey||'').toLowerCase();
    if(!tableEl || (k!=='tst' && k!=='tsl')) return;
    const tbody = (tableEl.tBodies && tableEl.tBodies.length) ? tableEl.tBodies[0] : null;
    if(!tbody) return;
    const norm = (s)=> String(s||'').replace(/\s+/g,' ').trim();

    // If there is a separate season row under the title, fold it into the title and remove the season row.
    try{
      let titleIdx=-1, seasonIdx=-1;
      for(let i=0;i<Math.min(6, rows.length); i++){
        const t = norm(rows[i].textContent);
        if(titleIdx<0 && /명예의전당/.test(t)) titleIdx=i;
        if(seasonIdx<0 && /(\(\s*시즌\s*\d+\s*\))/.test(t) && !/명예의전당/.test(t)) seasonIdx=i;
      }
      if(titleIdx>=0 && seasonIdx>=0 && seasonIdx>titleIdx){
        const titleRow = rows[titleIdx];
        const seasonRow = rows[seasonIdx];
        const seasonTxt = norm(seasonRow.textContent);
        const titleCell = (titleRow.children && titleRow.children.length) ? titleRow.children[0] : null;
        if(titleCell && seasonTxt){
          // Append season to the title (left aligned)
          const base = norm(titleCell.textContent);
          if(base && base.indexOf(seasonTxt)===-1){
            titleCell.textContent = base + '  ' + seasonTxt;
          }
        }
        // remove season row entirely
        seasonRow.remove();
        // refresh rows array (used later)
        // eslint-disable-next-line no-unused-vars
        rows.splice(seasonIdx,1);
      }
    }catch(_){}

    const joiner = ' · ';

    Array.from(tbody.querySelectorAll('tr')).forEach(tr=>{
      const tds = Array.from(tr.children||[]);
      if(tds.length < 2) return;
      const label = norm(tds[0].textContent);
      if(!/^(대회\s*진행|진행자|진행|운영팀)$/.test(label)) return;

      for(let i=1;i<tds.length;i++){
        const td = tds[i];
        // textContent preserves newlines; also h&&le <br>
        const raw = (td.innerText != null) ? String(td.innerText) : String(td.textContent||'');
        const parts = raw
          .split(/\r?\n|\s*<br\s*\/?>\s*/i)
          .map(p=>norm(p))
          .filter(Boolean);
        if(parts.length <= 1) continue;
        td.textContent = parts.join(joiner);
        td.classList.add('hof-organizers-merged');
      }
    });
  }


  // TST/TSL: visually merge the top title rows into a single left-aligned cell,
  // and merge the organizer value cells into one cell to avoid multi-column scattering.
  function mergeTstTslHeaderAndOrganizer(tableEl, leagueKey){
    const k = String(leagueKey||'').toLowerCase();
    if(!tableEl || (k!=='tst' && k!=='tsl')) return;
    const tbody = (tableEl.tBodies && tableEl.tBodies.length) ? tableEl.tBodies[0] : null;
    if(!tbody) return;
    const rows = Array.from(tbody.querySelectorAll('tr'));
    if(!rows.length) return;

    const norm = (s)=> String(s||'').replace(/\s+/g,' ').trim();

    // If there is a separate season row under the title, fold it into the title and remove the season row.
    try{
      let titleIdx=-1, seasonIdx=-1;
      for(let i=0;i<Math.min(6, rows.length); i++){
        const t = norm(rows[i].textContent);
        if(titleIdx<0 && /명예의전당/.test(t)) titleIdx=i;
        if(seasonIdx<0 && /(\(\s*시즌\s*\d+\s*\))/.test(t) && !/명예의전당/.test(t)) seasonIdx=i;
      }
      if(titleIdx>=0 && seasonIdx>=0 && seasonIdx>titleIdx){
        const titleRow = rows[titleIdx];
        const seasonRow = rows[seasonIdx];
        const seasonTxt = norm(seasonRow.textContent);
        const titleCell = (titleRow.children && titleRow.children.length) ? titleRow.children[0] : null;
        if(titleCell && seasonTxt){
          // Append season to the title (left aligned)
          const base = norm(titleCell.textContent);
          if(base && base.indexOf(seasonTxt)===-1){
            titleCell.textContent = base + '  ' + seasonTxt;
          }
        }
        // remove season row entirely
        seasonRow.remove();
        // refresh rows array (used later)
        // eslint-disable-next-line no-unused-vars
        rows.splice(seasonIdx,1);
      }
    }catch(_){}


    // Merge first two rows if they contain "명예의전당" and season title.
    for(let r=0; r<Math.min(3, rows.length); r++){
      const tr = rows[r];
      const tds = Array.from(tr.children||[]);
      if(tds.length<=1) continue;
      const txt = norm(tr.textContent);
      if(!txt) continue;
      if(/명예의전당/.test(txt) || /\(\s*시즌\s*\d+\s*\)/.test(txt) || /S\d+/i.test(txt)){
        // keep first non-empty cell
        let keep = tds.find(td=> norm(td.textContent));
        if(!keep) keep = tds[0];
        keep.colSpan = tds.length;
        keep.classList.add('hof-merged-head');
        keep.style.textAlign = 'left';
        // remove others
        tds.forEach(td=>{ if(td!==keep) td.remove(); });
      }
    }

    // Merge organizer row: [대회 진행자 | * ids ...]
    rows.forEach(tr=>{
      const tds = Array.from(tr.children||[]);
      if(tds.length<3) return;
      const label = norm(tds[0].textContent);
      if(!/^(대회\s*진행자|진행자|운영진|운영팀)$/.test(label)) return;
      const firstVal = tds[1];
      // Move any remaining cells into firstVal
      const rest = tds.slice(2);
      const restText = rest.map(td=> td.innerText || td.textContent || '').join(' ');
      const merged = norm((firstVal.innerText||firstVal.textContent||'') + ' ' + restText);
      firstVal.textContent = merged;
      firstVal.colSpan = tds.length-1;
      firstVal.style.textAlign = 'left';
      firstVal.classList.add('hof-organizers-merged');
      rest.forEach(td=> td.remove());
      // Add green star at the very left inside the value cell
      if(!firstVal.querySelector('.hof-organizer-star')){
        const star = document.createElement('span');
        star.className='hof-organizer-star';
        star.textContent='*';
        const txt = document.createTextNode(' ' + merged);
        firstVal.textContent='';
        firstVal.appendChild(star);
        firstVal.appendChild(txt);
      }
    });
  }

// TST/TSL: build mobile-friendly stage cards from a season block (matrix-style sheet)
function renderStageCardsFromBlockData(blockData, leagueKey){
  const k = String(leagueKey||'').toLowerCase();
  if(k!=='tst' && k!=='tsl') return null;
  if(!Array.isArray(blockData) || !blockData.length) return null;

  const norm = (s)=> String(s||'')
    .replace(/[\u200B-\u200D\uFEFF]/g,'')
    .replace(/\u00A0/g,' ')
    .replace(/\s+/g,' ')
    .trim();

  const rowNorm = (row)=> (row||[]).map(norm);

  // Find organizer row
  let organizerRow = null;
  for(const r of blockData){
    const rr = rowNorm(r);
    if(rr.some(x=>/대회\s*진행자|대회진행자|진행자|대회\s*진행/.test(x))){
      organizerRow = rr;
      break;
    }
  }
  let organizer = '';
  if(organizerRow){
    organizer = organizerRow
      .filter((v,i)=> i!==0 && !!v && !/대회\s*진행자|대회진행자|진행자|대회\s*진행/.test(v))
      .join(', ')
      .replace(/\s*,\s*/g, ', ')
      .trim();
  }

  // Winner / Runner rows
  let winRow=null, runRow=null;
  for(const r of blockData){
    const rr = rowNorm(r);
    if(!winRow && rr.some(x=>x==='우승' || (/(^|\s)우\s*승($|\s)/.test(x) && !/준\s*우\s*승/.test(x)))) winRow = rr;
    if(!runRow && rr.some(x=>/준\s*우\s*승/.test(x))) runRow = rr;
  }

  // Stage header row: first row with multiple non-empty labels (excluding 우승/준우승/진행자)
  let headerRow=null;
  for(const r of blockData){
    const rr = rowNorm(r);
    const filled = rr.filter(Boolean);
    if(filled.length < 3) continue;
    if(filled.some(x=>/우\s*승|준\s*우\s*승|대회\s*진행자|대회진행자|진행자/.test(x))) continue;
    const stageLike = filled.filter(x=>/스테이지/.test(x) || /^[A-Z]$/.test(x) || /^[가-힣]{1,4}$/.test(x)).length;
    if(stageLike >= 2){
      headerRow = rr;
      break;
    }
  }

  if(!headerRow || !winRow || !runRow) return null;

  // Determine stage columns: take all non-empty header cells except those that look like row labels
  const cols = [];
  for(let c=0;c<headerRow.length;c++){
    const h = headerRow[c];
    if(!h) continue;
    if(c===0 && /명예의전당/.test(h)) continue;
    if(winRow[c] && /우\s*승/.test(winRow[c])) continue;
    cols.push(c);
  }
  if(!cols.length) return null;

  const letters = ['S','A','B','C','D','E','F','G','H','I','J'];

  const cards = cols.map((c, idx)=>{
    const rawTitle = headerRow[c];
    let title = rawTitle;
    if(!/스테이지/.test(title)){
      const L = letters[idx] || String(idx+1);
      title = `${L}스테이지(${rawTitle})`;
    }
    const win = winRow[c] || '';
    const run = runRow[c] || '';
    return { title, win, run, organizer };
  }).filter(o=> o && (o.win || o.run));

  if(!cards.length) return null;
  return cards;
}

function ensureHofStageCardsContainer(){
  const inline = document.getElementById('hofInline');
  if(!inline) return null;
  let box = inline.querySelector('.hof-stage-cards');
  if(!box){
    box = document.createElement('div');
    box.className = 'hof-stage-cards';
    inline.appendChild(box);
  }
  return box;
}

function clearHofStageCards(){
  const inline = document.getElementById('hofInline');
  if(!inline) return;
  inline.classList.remove('hof-has-stagecards','hof-inline-tst','hof-inline-tsl','hof-inline-pro');
  const box = inline.querySelector('.hof-stage-cards');
  if(box) box.innerHTML='';
}


function removeTstHallOfFameHeaderRows(tableEl, leagueKey){
  const k = String(leagueKey||'').toLowerCase();
  if(!tableEl || k!=='tst') return;
  const tight = (s)=>String(s||'')
    .replace(/[​-‍﻿]/g,'')
    .replace(/\u00a0/g,' ')
    .replace(/\s+/g,'')
    .trim();
  const isBadRow = (tr)=>{
    const t = tight(tr ? tr.textContent : '');
    if(!t) return false;
    // Remove "TST명예의전당" (including line-break split variants)
    if(t.includes('TST명예의전당')) return true;
    // Remove any standalone "명예의전당" row that is not a season label
    if(t.includes('명예의전당') && !t.includes('시즌')) return true;
    return false;
  };
  try{
    if(tableEl.tHead){
      Array.from(tableEl.tHead.querySelectorAll('tr')).forEach(tr=>{ if(isBadRow(tr)) tr.remove(); });
    }
  }catch(_){}
  try{
    const tbodies = tableEl.tBodies ? Array.from(tableEl.tBodies) : [];
    tbodies.forEach(tb=>{
      Array.from(tb.querySelectorAll('tr')).forEach(tr=>{ if(isBadRow(tr)) tr.remove(); });
    });
  }catch(_){}

  // Also remove/hide any single cell that contains the header text (sometimes it's a merged stub cell, not a whole row)
  try{
    Array.from(tableEl.querySelectorAll('th,td')).forEach(cell=>{
      const t = tight(cell.textContent||'');
      if(t.includes('TST명예의전당') || (t.includes('명예의전당') && !t.includes('시즌'))){
        cell.textContent='';
        cell.style.display='none';
      }
    });
  }catch(_){}
}

function removeTstTitleRows(tableEl, leagueKey){
  const k = String(leagueKey||'').toLowerCase();
  if(!tableEl || k!=='tst') return;
  const tbody = tableEl.tBodies && tableEl.tBodies.length ? tableEl.tBodies[0] : null;
  if(!tbody) return;
  Array.from(tbody.querySelectorAll('tr')).forEach(tr=>{
    const txt = (tr.textContent||'').replace(/\s+/g,' ').trim();
    if(/명예의전당/.test(txt) && !/시즌\s*\d+/i.test(txt)){
      tr.remove();
    }
  });
}

function mountStageCardsFromBlock(blockData, leagueKey){
  const k = String(leagueKey||'').toLowerCase();
  if(k!=='tst' && k!=='tsl') return false;
  const cards = renderStageCardsFromBlockData(blockData, k);
  const inline = document.getElementById('hofInline');
  if(!inline) return false;

  const box = ensureHofStageCardsContainer();
  if(!box) return false;
  box.innerHTML = '';

  if(!cards || !cards.length){
    inline.classList.remove('hof-has-stagecards');
    return false;
  }

  inline.classList.add('hof-has-stagecards');
  inline.classList.add(k==='tst'?'hof-inline-tst':'hof-inline-tsl');

  cards.forEach(card=>{
    const el = document.createElement('div');
    el.className = 'hof-stage-card';

    const title = document.createElement('div');
    title.className = 'hof-stage-title';
    title.textContent = card.title;

    const win = document.createElement('div');
    win.className = 'hof-stage-line win';
    const wLabel = document.createElement('span');
    wLabel.className = 'hof-stage-label';
    wLabel.textContent = '우승';
    const wVal = document.createElement('span');
    wVal.className = 'hof-stage-value';
    wVal.textContent = card.win || '-';
    win.appendChild(document.createTextNode('🏆 '));
    win.appendChild(wLabel);
    win.appendChild(document.createTextNode(' '));
    win.appendChild(wVal);

    const run = document.createElement('div');
    run.className = 'hof-stage-line runner';
    const rLabel = document.createElement('span');
    rLabel.className = 'hof-stage-label';
    rLabel.textContent = '준우승';
    const rVal = document.createElement('span');
    rVal.className = 'hof-stage-value';
    rVal.textContent = card.run || '-';
    run.appendChild(document.createTextNode('🥈 '));
    run.appendChild(rLabel);
    run.appendChild(document.createTextNode(' '));
    run.appendChild(rVal);

    el.appendChild(title);
    el.appendChild(win);
    el.appendChild(run);

    if(card.organizer){
      const org = document.createElement('div');
      org.className = 'hof-stage-org';
      const star = document.createElement('span');
      star.className = 'hof-organizer-star';
      star.textContent = '★';
      org.appendChild(star);
      org.appendChild(document.createTextNode(' 대회진행자 : ' + card.organizer));
      el.appendChild(org);
    }

    box.appendChild(el);
  });

  return true;
}




// Build stage cards directly from the already-rendered HTML table (robust for TST wide sheets)
function mountStageCardsFromRenderedTable(tableEl, leagueKey){
  const k = String(leagueKey||'').toLowerCase();
  if(!tableEl || (k!=='tst' && k!=='tsl')) return false;

  const norm = (s)=> String(s||'')
    .replace(/[\u200B-\u200D\uFEFF]/g,'')
    .replace(/\u00A0/g,' ')
    .replace(/\s+/g,' ')
    .trim();

  // Find header cells (stage labels).
  // IMPORTANT: GViz HTML for TST/TSL often inserts a merged "season title" row (e.g., "TST 25 (시즌1)")
  // as the FIRST tbody row. If we naively use that row as the header, card titles become wrong and the
  // winner/runner columns shift (e.g., "우승 : 우승").
  // Strategy:
  //  1) Prefer thead (if present)
  //  2) Otherwise scan tbody for the row that contains MULTIPLE stage labels ("...스테이지" etc.)
  //  3) Fall back to the first tbody row only if we still can't find a stage-header row.
  let headerCells = [];
  const hasStageLabel = (t)=>{ const s=norm(t); return s && /(스테이지|16강|32강|64강|8강|4강|준결승|결승)/.test(s); };

  try{
    const thead = tableEl.tHead;
    if(thead){
      const trs = Array.from(thead.querySelectorAll('tr'));
      // pick the row with the most non-empty THs (usually the stage label row)
      let best = null, bestCount = 0;
      trs.forEach(tr=>{
        const ths = Array.from(tr.querySelectorAll('th'));
        const filled = ths.map(th=>norm(th.textContent)).filter(Boolean);
        if(filled.length > bestCount){ bestCount = filled.length; best = ths; }
      });
      if(best && bestCount>=2) headerCells = best.map(th=>norm(th.textContent));
    }
  }catch(_){}

  // Scan tbody for a real stage header row (preferred for TST wide tables)
  if(!headerCells.length){
    try{
      const trs = Array.from(tableEl.querySelectorAll('tbody tr'));
      let bestRow = null, bestCnt = 0;
      for(const tr of trs){
        const cells = Array.from(tr.children||[]);
        if(!cells.length) continue;
        const vals = cells.map(td=>norm(td.textContent));
        const cnt = vals.filter(hasStageLabel).length;
        if(cnt >= 2 && cnt > bestCnt){
          bestCnt = cnt;
          bestRow = vals;
        }
      }
      if(bestRow) headerCells = bestRow;
    }catch(_){}
  }

  // Last resort: first tbody row
  if(!headerCells.length){
    try{
      const tr = tableEl.querySelector('tbody tr');
      if(tr){
        const tds = Array.from(tr.children||[]);
        headerCells = tds.map(td=>norm(td.textContent));
      }
    }catch(_){}
  }

  // Locate winner / runner / organizer rows
  const rows = Array.from(tableEl.querySelectorAll('tbody tr'));
  const findRowByLabel = (reLabel)=>{
    for(const tr of rows){
      const cells = Array.from(tr.children||[]);
      if(!cells.length) continue;
      const first = norm(cells[0].textContent);
      const all = norm(tr.textContent);
      if(reLabel.test(first) || reLabel.test(all)) return cells;
    }
    return null;
  };

  const winCells = (()=>{ 
    for(const tr of rows){
      const cells = Array.from(tr.children||[]);
      if(!cells.length) continue;
      const txt0 = norm(cells[0].textContent);
      const txtAll = norm(tr.textContent);
      // Winner row: contains '우승' but not '준우승' (handles emoji prefix like '🏅 우승')
      if((/우\s*승/.test(txt0) && !/준\s*우\s*승/.test(txt0)) || (/우\s*승/.test(txtAll) && !/준\s*우\s*승/.test(txtAll))) return cells;
    }
    return null;
  })();
  const runCells = (()=>{ 
    for(const tr of rows){
      const cells = Array.from(tr.children||[]);
      if(!cells.length) continue;
      const txt0 = norm(cells[0].textContent);
      const txtAll = norm(tr.textContent);
      if(/준\s*우\s*승/.test(txt0) || /준\s*우\s*승/.test(txtAll)) return cells;
    }
    return null;
  })();
  const orgCells = findRowByLabel(/대회\s*진행자|대회진행자|진행자/);

  if(!winCells || !runCells) return false;

  // Determine which columns are stages: if header has stage labels, use those indices.
  // If header is missing or includes row-label, skip col0.
  const stageStart = 1;
  const maxCols = Math.max(winCells.length, runCells.length, headerCells.length);
  const cards = [];
  for(let c=stageStart; c<maxCols; c++){
    const rawTitle = headerCells[c] || '';
    // Skip empty columns
    const wv = norm(winCells[c] ? winCells[c].textContent : '');
    const rv = norm(runCells[c] ? runCells[c].textContent : '');
    // Guard: sometimes merged/collapsed columns shift so that label text leaks into value cells.
    // If value is literally the label (e.g., wv === '우승'), treat it as empty.
    const wvClean = (/^우\s*승$/.test(wv) ? '' : wv);
    const rvClean = (/^준\s*우\s*승$/.test(rv) ? '' : rv);
    if(!wvClean && !rvClean) continue;

    let title = rawTitle;
    if(!title){
      title = `스테이지 ${c}`;
    }
    // Make sure it looks like "X스테이지( ... )" when possible
    if(!/스테이지/.test(title) && rawTitle){
      title = rawTitle;
    }
    cards.push({ title, win: wvClean || '-', run: rvClean || '-', organizer: '' });
  }

  // Organizer value (usually on same row, col1+...)
  let organizer = '';
  if(orgCells){
    organizer = orgCells
      .map((td,i)=> i===0 ? '' : norm(td.textContent))
      .filter(v=> v && !/(대회\s*진행자|대회진행자|진행자)/.test(v)) // drop label if it leaks into value cells
      .join(', ')
      .replace(/\s*,\s*/g, ', ')
      .trim();
  }
  cards.forEach(c=>{ c.organizer = organizer; });

  if(!cards.length) return false;

  // Mount cards
  const inline = document.getElementById('hofInline');
  if(!inline) return false;
  const box = ensureHofStageCardsContainer();
  if(!box) return false;
  box.innerHTML = '';
  inline.classList.add('hof-has-stagecards');
  inline.classList.add(k==='tst'?'hof-inline-tst':'hof-inline-tsl');

  cards.forEach(card=>{
    const el = document.createElement('div');
    el.className = 'hof-stage-card';

    const title = document.createElement('div');
    title.className = 'hof-stage-title';
    title.textContent = card.title;

    const win = document.createElement('div');
    win.className = 'hof-stage-line win';
    const wLabel = document.createElement('span');
    wLabel.className = 'hof-stage-label';
    wLabel.textContent = '우승';
    const wVal = document.createElement('span');
    wVal.className = 'hof-stage-value';
    wVal.textContent = card.win || '-';
    win.appendChild(document.createTextNode('🏆 '));
    win.appendChild(wLabel);
    win.appendChild(document.createTextNode(' '));
    win.appendChild(wVal);

    const run = document.createElement('div');
    run.className = 'hof-stage-line runner';
    const rLabel = document.createElement('span');
    rLabel.className = 'hof-stage-label';
    rLabel.textContent = '준우승';
    const rVal = document.createElement('span');
    rVal.className = 'hof-stage-value';
    rVal.textContent = card.run || '-';
    run.appendChild(document.createTextNode('🥈 '));
    run.appendChild(rLabel);
    run.appendChild(document.createTextNode(' '));
    run.appendChild(rVal);

    el.appendChild(title);
    el.appendChild(win);
    el.appendChild(run);

    if(card.organizer){
      const org = document.createElement('div');
      org.className = 'hof-stage-org';
      const star = document.createElement('span');
      star.className = 'hof-organizer-star';
      star.textContent = '★';
      org.appendChild(star);
      org.appendChild(document.createTextNode(' 대회진행자 : ' + card.organizer));
      el.appendChild(org);
    }
    box.appendChild(el);
  });

  // Hide original table once cards are mounted
  try{ tableEl.style.display = 'none'; }catch(_){}
  return true;
}

// TST wide-sheet helper: build stage cards from a matrix where stages are columns.
// Reliable for the current TST tab layout:
//   - a header row contains multiple "...스테이지" labels across columns
//   - a row labeled "우승" has winner values per stage column
//   - a row labeled "준우승" has runner values per stage column
//   - a row labeled "대회 진행자" (optional) has organizer names across columns
function mountStageCardsFromTstWideMatrix(tableEl, blockData){
  if(!tableEl || !Array.isArray(blockData) || !blockData.length) return false;

  const norm = (s)=> String(s||'')
    .replace(/[​-‍﻿]/g,'')
    .replace(/\u00A0/g,' ')
    .replace(/\s+/g,' ')
    .trim();

  const isWinLabel = (t)=>{ const s=norm(t); return s && /우\s*승/.test(s) && !/준\s*우\s*승/.test(s); };
  const isRunLabel = (t)=>{ const s=norm(t); return s && /준\s*우\s*승/.test(s); };
  const isOrgLabel = (t)=>{ const s=norm(t); return s && /(대회\s*진행자|대회진행자|진행자)/.test(s); };
  const hasStageLabel = (t)=>{ const s=norm(t); return s && /(스테이지|16강|32강|64강|8강|4강|준결승|결승)/.test(s); };

  // Find header row with multiple stage labels
  let rHeader = -1;
  for(let r=0; r<Math.min(blockData.length, 12); r++){
    const row = blockData[r] || [];
    const stageCnt = row.map(hasStageLabel).filter(Boolean).length;
    if(stageCnt >= 2){ rHeader = r; break; }
  }

  // Find win/run/org rows
  let rWin=-1, rRun=-1, rOrg=-1;
  for(let r=0; r<blockData.length; r++){
    const row = blockData[r] || [];
    const first = norm(row[0]);
    const joined = norm(row.join(' '));
    if(rWin<0 && (isWinLabel(first) || isWinLabel(joined))) rWin = r;
    if(rRun<0 && (isRunLabel(first) || isRunLabel(joined))) rRun = r;
    if(rOrg<0 && (isOrgLabel(first) || isOrgLabel(joined))) rOrg = r;
  }
  if(rHeader<0 || rWin<0 || rRun<0) return false;

  const header = blockData[rHeader] || [];
  const winRow = blockData[rWin] || [];
  const runRow = blockData[rRun] || [];
  const orgRow = (rOrg>=0 ? (blockData[rOrg]||[]) : []);

  // Build organizer string (spread across cells)
  let organizer = '';
  if(orgRow && orgRow.length){
    organizer = orgRow
      .map((v,i)=> i===0 ? '' : norm(v))
      .filter(Boolean)
      .join(', ')
      .replace(/\s*,\s*/g, ', ')
      .trim();
  }

  const cards = [];
  for(let c=1; c<Math.max(header.length, winRow.length, runRow.length); c++){
    const title = norm(header[c]);
    const wv = norm(winRow[c]);
    const rv = norm(runRow[c]);
    if(!title && !wv && !rv) continue;
    // Skip columns that aren't stages if header is noisy
    if(title && !hasStageLabel(title) && (hasStageLabel(header.join(' ')) )){
      // If the header row clearly has stages, ignore non-stage columns.
      continue;
    }
    if(!wv && !rv) continue;
    cards.push({ title: title || `스테이지 ${c}`, win: wv || '-', run: rv || '-', organizer });
  }
  if(!cards.length) return false;

  const inline = document.getElementById('hofInline');
  if(!inline) return false;
  const box = ensureHofStageCardsContainer();
  if(!box) return false;
  box.innerHTML = '';
  inline.classList.add('hof-has-stagecards','hof-inline-tst');
  inline.classList.remove('hof-inline-tsl');

  cards.forEach(card=>{
    const el = document.createElement('div');
    el.className = 'hof-stage-card';

    const titleEl = document.createElement('div');
    titleEl.className = 'hof-stage-title';
    titleEl.textContent = card.title;

    const mkLine = (emoji,label,value)=>{
      const line = document.createElement('div');
      line.className = 'hof-stage-line';
      line.appendChild(document.createTextNode(emoji + ' '));
      const lab = document.createElement('span');
      lab.className='hof-stage-label';
      lab.textContent = label;
      const val = document.createElement('span');
      val.className='hof-stage-value';
      val.textContent = value;
      line.appendChild(lab);
      line.appendChild(document.createTextNode(' '));
      line.appendChild(val);
      return line;
    };

    el.appendChild(titleEl);
    el.appendChild(mkLine('🏆','우승',card.win));
    el.appendChild(mkLine('🥈','준우승',card.run));

    if(card.organizer){
      const org = document.createElement('div');
      org.className = 'hof-stage-org';
      const star = document.createElement('span');
      star.className = 'hof-organizer-star';
      star.textContent='★';
      org.appendChild(star);
      org.appendChild(document.createTextNode(' 대회진행자 : ' + card.organizer));
      el.appendChild(org);
    }
    box.appendChild(el);
  });

  try{ tableEl.style.display='none'; }catch(_){ }
  return true;
}


  

  // --- PROLEAGUE podium renderer (matrix-style sheet) ---
  // Expected pattern inside a season block (similar to your sheet screenshot):
  //  row: ["우승", ..., "준우승", ...]  -> locate win/run columns
  //  next row: image urls (optional)
  //  rows below: labels (팀명/감독/부감독/운영팀...) + values under win/run columns
  function renderProPodiumFromMatrix(tableEl, blockData){
  if(!tableEl) return;
  if(!Array.isArray(blockData) || blockData.length < 2) return;

  const norm = (s)=> String(s ?? '')
    .replace(/[​-‍﻿]/g,'')
    .replace(/ /g,' ')
    .replace(/\s+/g,' ')
    .trim();
  const isUrl = (v)=> /^https?:\/\//i.test(String(v||'').trim());
  const cell = (row, c)=> (row && c >= 0 && c < row.length) ? row[c] : '';

  // Find header row and winner/runner columns
  let headerR=-1, cWin=-1, cRun=-1;
  for(let r=0; r<Math.min(blockData.length, 12); r++){
    const row = blockData[r] || [];
    let win=-1, run=-1;
    for(let c=0; c<row.length; c++){
      const t = norm(row[c]);
      if(t==='우승' && win<0) win=c;
      if(t==='준우승' && run<0) run=c;
    }
    if(win>=0 && run>=0){ headerR=r; cWin=win; cRun=run; break; }
  }
  if(headerR<0) return;

  // Detect logo row (first row below header where either winner/runner cell is a url)
  let logoR=-1;
  for(let r=headerR+1; r<Math.min(blockData.length, headerR+6); r++){
    const row = blockData[r] || [];
    const w = norm(cell(row,cWin));
    const u = norm(cell(row,cRun));
    if(isUrl(w) || isUrl(u)) { logoR=r; break; }
  }

  const win = { logo:'', team:'', coach:'', subcoach:'', ops:'' };
  const run = { logo:'', team:'', coach:'', subcoach:'', ops:'' };
  if(logoR>=0){
    win.logo = norm(cell(blockData[logoR], cWin));
    run.logo = norm(cell(blockData[logoR], cRun));
  }

  const labelMap = { '팀명':'team', '감독':'coach', '부감독':'subcoach', '운영팀':'ops', '운영':'ops' };

  for(let r=headerR+1; r<blockData.length; r++){
    const row = blockData[r] || [];
    let labelCol=-1, key='';
    for(let c=0; c<Math.min(4,row.length); c++){
      const t = norm(row[c]);
      if(labelMap[t]){ labelCol=c; key=labelMap[t]; break; }
    }
    if(labelCol<0) continue;

    let wv = norm(cell(row, cWin));
    let rv = norm(cell(row, cRun));

    // If cells are empty, fallback to right of label
    if(!wv) wv = norm(cell(row, labelCol+1));
    if(!rv) rv = norm(cell(row, cRun+1));

    if(wv) win[key] = wv;
    if(rv && rv !== '-' && rv !== '—') run[key] = rv;
  }

  // Fallback team name: first non-empty non-url value under each column
  if(!win.team){
    for(let r=headerR+1; r<blockData.length; r++){
      const v = norm(cell(blockData[r]||[], cWin));
      if(v && !isUrl(v) && v!=='우승' && v!=='준우승') { win.team=v; break; }
    }
  }
  if(!run.team){
    for(let r=headerR+1; r<blockData.length; r++){
      const v = norm(cell(blockData[r]||[], cRun));
      if(v && !isUrl(v) && v!=='우승' && v!=='준우승') { run.team=v; break; }
    }
  }

  const thead = tableEl.querySelector('thead');
  const tbody = tableEl.querySelector('tbody');
  if(!tbody) return;
  if(thead) thead.innerHTML = '';
  tbody.innerHTML = '';

  const colSpan = Math.max(1, (blockData[0]||[]).length);

  const makeCard = (type, obj)=>{
    const wrap = document.createElement('div');
    wrap.className = 'hof-pro-card ' + (type==='win'?'win':'runner');

    const badge = document.createElement('div');
    badge.className = 'hof-place-badge ' + (type==='win'?'win':'runner');

    const crown = document.createElement('img');
    crown.className = 'hof-place-crown';
    crown.alt = (type==='win'?'우승':'준우승');
    crown.src = (type==='win'?'./crown_gold.png':'./crown_silver.png');

    const lbl = document.createElement('div');
    lbl.className = 'hof-place-label';
    lbl.textContent = (type==='win'?'우승':'준우승');

    badge.appendChild(crown);
    badge.appendChild(lbl);

    const chip = document.createElement('div');
    chip.className = 'hof-pro-chip';

    const icon = document.createElement('div');
    icon.className = 'hof-team-icon';
    if(obj.logo && isUrl(obj.logo)){
      const img = document.createElement('img');
      img.src = obj.logo;
      img.alt = '';
      img.loading = 'lazy';
      img.decoding = 'async';
      icon.appendChild(img);
    }

    const tbox = document.createElement('div');
    const nm = document.createElement('div');
    nm.className = 'hof-team-name';
    nm.textContent = obj.team || '-';
    tbox.appendChild(nm);

    const subParts = [];
    if(obj.coach) subParts.push('감독 ' + obj.coach);
    if(obj.subcoach) subParts.push('부감독 ' + obj.subcoach);
    if(subParts.length){
      const sub = document.createElement('div');
      sub.className = 'hof-team-sub';
      sub.textContent = subParts.join('   ');
      tbox.appendChild(sub);
    }

    chip.appendChild(icon);
    chip.appendChild(tbox);

    const lines = document.createElement('div');
    lines.className = 'hof-pro-lines';

    const pushLine = (k, v)=>{
      if(!v) return;
      const line = document.createElement('div');
      line.className = 'hof-pro-line';
      const kk = document.createElement('span');
      kk.className = 'k';
      kk.textContent = k + ':';
      line.appendChild(kk);
      line.appendChild(document.createTextNode(' ' + v));
      lines.appendChild(line);
    };

    pushLine('감독', obj.coach);
    pushLine('부감독', obj.subcoach);
    pushLine('운영팀', obj.ops);

    wrap.appendChild(badge);
    wrap.appendChild(chip);
    if(lines.children.length) wrap.appendChild(lines);

    return wrap;
  };

  const addCardRow = (type, obj)=>{
    const tr = document.createElement('tr');
    const td = document.createElement('td');
    td.colSpan = colSpan;
    td.appendChild(makeCard(type, obj));
    tr.appendChild(td);
    tbody.appendChild(tr);
  };

  addCardRow('win', win);
  if(run.team && run.team !== '-' && run.team !== '—') addCardRow('runner', run);

  tableEl.classList.add('hof-pro-podium-table');
}



  // TST/TSL: On small screens, the wide stage table becomes unreadable.
  // Build a mobile-friendly "stage cards" view where each stage shows 우승/준우승 as readable lines.
  function renderStageCardsForMobile(tableEl, blockData, leagueKey){
      // Build cards first; only hide the original table if cards were successfully created.
      let __built = 0;
      const __k0 = String(leagueKey||'').toLowerCase();
const k = String(leagueKey||'').toLowerCase();
    if(!tableEl) return;

    // Always remove old cards (prevents leakage between leagues / seasons)
    const parent = tableEl.parentElement;
    if(!parent) return;
    parent.querySelectorAll('.hof-stage-cards').forEach(n=>n.remove());

    // Reset stagecards flag (will be re-added if we successfully build cards)
    try{
      const inline = document.getElementById('hofInline');
      if(inline) inline.classList.remove('hof-has-stagecards');
    }catch(_){}

    if(k!=='tst' && k!=='tsl' && k!=='tpl' && k!=='msl' && k!=='tcl') return;
    if(!Array.isArray(blockData) || !blockData.length) return;

    const norm = (s)=> String(s||'')
      .replace(/[\u200b-\u200d\ufeff]/g,'')
      .replace(/\xa0/g,' ')
      .replace(/[​-‍﻿]/g,'')
      .replace(/ /g,' ')
      .replace(/\s+/g,' ')
      .trim();

    // ---- TST SPECIAL (forced): parse the season block matrix and render the same card UI as TSL.
    // The TST sheet is a wide "stage-by-column" table; DOM layout varies a lot due to merged headers,
    // so we rely on the already-normalized matrix (blockData) for a deterministic result.
    if(k==='tst'){
      // TST is a wide stage-by-column table and merged headers vary a lot.
      // 가장 확실한 방법: 이미 렌더된 table에서 직접 읽어서 카드로 변환한다.
      let __ok = false;
      try{
        if(typeof mountStageCardsFromRenderedTable === 'function'){
          __ok = !!mountStageCardsFromRenderedTable(tableEl, k);
        }
      }catch(_){}
      if(__ok) return;

      // 2nd choice: parse the wide "stage-by-column" matrix directly (robust for current TST tab)
      try{
        if(typeof mountStageCardsFromTstWideMatrix === 'function'){
          __ok = !!mountStageCardsFromTstWideMatrix(tableEl, blockData);
        }
      }catch(_){ }
      if(__ok) return;

      // Fallback: matrix(blockData) 기반 파싱
      try{
        if(typeof mountStageCardsFromBlock === 'function'){
          __ok = !!mountStageCardsFromBlock(blockData, k);
          if(__ok){
            try{ tableEl.style.display='none'; }catch(_){}
          }
        }
      }catch(_){}
      if(__ok) return;
    }
const stageRe = /(스테이지|16강|32강|64강|8강|4강|준결승|결승|3.?4위|S\s*스테이지|A\s*스테이지|B\s*스테이지|C\s*스테이지|D\s*스테이지|E\s*스테이지|F\s*스테이지)/i;
    const tierRe  = /(갓|킹|퀸|잭|스페이드|조커|히든|\d+\s*티어|[1-7]\s*티어|\b[1-7]\b)/i;

    const findRowAny = (re)=>{
      for(let r=0;r<blockData.length;r++){
        const row = blockData[r] || [];
        for(let c=0;c<row.length;c++){
          const t = norm(row[c]);
          if(t && re.test(t)) return r;
        }
      }
      return -1;
    };

    // Locate key rows (robust across old/new sheets)
    // Older TST seasons sometimes use labels like "우승자", "준우승자", "우승팀" etc.
    // We treat any cell that contains "우승" but NOT "준우승" as the winner label.
    const isWinLabel = (t)=>{
      const s = norm(t);
      if(!s) return false;
      if(/준\s*우\s*승/.test(s)) return false;
      if(/우\s*승/.test(s)) return true;
      return false;
    };
    const isRunLabel = (t)=>{
      const s = norm(t);
      if(!s) return false;
      return /준\s*우\s*승/.test(s);
    };


    const isThirdLabel = (t)=>{
      const s = norm(t);
      if(!s) return false;
      // accept: 3위 / 3 위 / 3위팀 / 3위 결정전 / 3-4위 etc.
      return /3\s*위/.test(s) || /3\s*[-~]?\s*4\s*위/.test(s) || /\b3rd\b/i.test(s);
    };

    const findRowBy = (pred)=>{
      for(let r=0;r<blockData.length;r++){
        const row = blockData[r] || [];
        for(let c=0;c<row.length;c++){
          const t = row[c];
          if(pred(t)) return r;
        }
      }
      return -1;
    };

    const rWin = findRowBy(isWinLabel);
    const rRun = findRowBy(isRunLabel);
    const rThird = (typeof isThirdLabel==='function') ? findRowBy(isThirdLabel) : -1;
    const rOrg = findRowAny(/대회\s*진행자|대회진행자|진행자/);

    // If we can't find winner/runner, we can't build cards reliably
    if(rWin < 0 && rRun < 0) return;

    const maxCols = Math.max(...blockData.map(r=> (r||[]).length), 0);
    if(maxCols <= 1) return;

    const getCell = (r,c)=>{
      if(r<0) return '';
      const row = blockData[r] || [];
      return norm(row[c]);
    };

    // Determine which column is the "label column" (where '우승/준우승' text sits)
    const findLabelCol = (r, re)=>{
      if(r<0) return -1;
      const row = blockData[r] || [];
      for(let c=0;c<row.length;c++){
        if(re.test(norm(row[c]))) return c;
      }
      return -1;
    };
    const labelColWin = findLabelCol(rWin, /(우\s*승)/);
    const labelColRun = findLabelCol(rRun, /(준\s*우\s*승)/);
    const labelCol = (labelColWin>=0) ? labelColWin : (labelColRun>=0 ? labelColRun : 0);

    // Choose a header row near the winner row that has stage/tier labels.
    // Look up to 6 rows above the winner row; pick the one with most stage/tier hits.
    const anchorRow = (rWin>=0 ? rWin : rRun);
    let headerR = -1, headerScore = -1;
    for(let r=Math.max(0, anchorRow-6); r<anchorRow; r++){
      const row = (blockData[r]||[]).map(norm);
      const score = row.filter(t=>stageRe.test(t) || tierRe.test(t)).length;
      if(score > headerScore){
        headerScore = score;
        headerR = (score>=1) ? r : headerR;
      }
    }

    // Fallback: if no stage/tier header found, use the immediate row above anchor
    if(headerR < 0 && anchorRow-1 >= 0) headerR = anchorRow-1;

    const header = (headerR>=0 ? (blockData[headerR]||[]).map(norm) : []);

    // Build column list: any column (except labelCol) where winner or runner has a value
    const cols = [];
    for(let c=0; c<maxCols; c++){
      if(c===labelCol) continue;
      const vWin = getCell(rWin, c);
      const vRun = getCell(rRun, c);
      if(!vWin && !vRun) continue;

      let lab = header[c] || '';
      // If header label is empty or not meaningful, try row-specific stage labels (some sheets have stage labels in the first data row)
      if(!lab || (!stageRe.test(lab) && !tierRe.test(lab) && lab.length<=1)){
        // scan a couple of rows above for something usable in this column
        for(let rr=Math.max(0, anchorRow-3); rr<anchorRow; rr++){
          const cand = norm((blockData[rr]||[])[c]);
          if(cand && (stageRe.test(cand) || tierRe.test(cand) || cand.length>=2)){
            lab = cand; break;
          }
        }
      }
      cols.push({ col:c, label: lab || '' });
    }

    if(!cols.length) return;

    // Organizer: scan row for first non-empty to the right of label col
    let organizer = '';
    if(rOrg>=0){
      for(let c=0; c<(blockData[rOrg]||[]).length; c++){
        if(c===labelCol) continue;
        const v = getCell(rOrg,c);
        if(v){ organizer = v; break; }
      }
    }

    const wrap = document.createElement('div');
    wrap.className = 'hof-stage-cards';

    const stageNameFromTier = (label, idx)=>{
      const t = norm(label||'');
      // For old TSL seasons where header shows tiers, map to S/A/B/C/D/E/F
      const tierOrder = ['갓','킹','퀸','잭','스페이드','조커','히든','1티어','2티어','3티어','4티어','5티어','6티어','7티어','1','2','3','4','5','6','7'];
      const hitTier = tierOrder.find(x => t.replace(/\s+/g,'') === x.replace(/\s+/g,''));
      if(hitTier){
        const map = ['S','A','B','C','D','E','F'];
        const mapped = map[Math.min(idx, map.length-1)] || 'S';
        return `${mapped}스테이지(${t})`;
      }
      // If already has "스테이지" keep it
      if(/스테이지/i.test(t)) return t;
      return t || ((k==='tpl' || k==='tcl' || k==='msl') ? '' : `스테이지${idx+1}`);
    };

    let built = 0;
    cols.forEach((it, idx)=>{
      const col = it.col;
      const label = stageNameFromTier(it.label, idx);
      let winner = getCell(rWin, col);
      let runner = getCell(rRun, col);
      let third = getCell(rThird, col);

      // Make TST match TSL visual output on mobile/resize.
      // Some TST seasons can include tier tokens (e.g., "갓DayDream" or "갓 DayDream")
      // inside the winner/runner values. Since the stage title already contains the tier
      // (e.g., "S스테이지(갓)"), strip the leading tier token so the line reads like TSL.
      if(k==='tst'){
        const hasTierInTitle = /(갓|킹|퀸|잭|스페이드|조커|히든|\d+\s*티어|[1-7]\s*티어)/.test(label);
        if(hasTierInTitle){
          const stripTier = (v)=> String(v||'')
            .replace(/^(갓|킹|퀸|잭|스페이드|조커|히든)\s*/,'')
            .replace(/^(갓|킹|퀸|잭|스페이드|조커|히든)/,'')
            .replace(/^\d+\s*티어\s*/,'')
            .replace(/^[1-7]\s*티어\s*/,'')
            .trim();
          winner = stripTier(winner);
          runner = stripTier(runner);
          third = stripTier(third);
        }
      }

      // only build cards that have at least one value
      if(!winner && !runner && !third) return;

      const card = document.createElement('div');
      card.className = 'hof-stage-card';

      const titleText = String(label||'').trim();
      if(titleText && titleText!=='-' && titleText!=='–' && titleText!=='—' && titleText!=='－' && !/^스테이지\s*\d+$/.test(titleText) && !/^스테이지\d+$/.test(titleText)){
        const title = document.createElement('div');
        title.className = 'hof-stage-title';
        title.textContent = titleText;
        card.appendChild(title);
      }

      const mkLine = (place, value)=>{
        if(!value) return;
        const vv = String(value).trim();
        if(!vv || vv==='-' || vv==='–' || vv==='—' || vv==='－') return;
        const line = document.createElement('div');
        line.className = 'hof-stage-line';

        const badge = document.createElement('span');
        badge.className = 'hof-stage-badge';
        badge.textContent = (place==='win') ? '🏆' : (place==='third') ? '🥉' : '🥈';
        line.appendChild(badge);

        const lab = document.createElement('span');
        lab.className = 'hof-stage-label';
        lab.textContent = (place==='win') ? '우승' : (place==='third') ? '3위' : '준우승';
        line.appendChild(lab);

        const val = document.createElement('span');
        val.className = 'hof-stage-value';
        val.textContent = value;
        line.appendChild(val);

        card.appendChild(line);
      };

      mkLine('win', winner);
      mkLine('run', runner);
      mkLine('third', third);

      if(organizer){
        const org = document.createElement('div');
        org.className = 'hof-stage-organizer';
        org.innerHTML = `<span class="hof-organizer-star">★</span><span class="k">대회진행자</span> : ${organizer}`;
        card.appendChild(org);
      }

      wrap.appendChild(card);
      built++;
    });

    if(!built) return;

    parent.appendChild(wrap);
    // Cards use .hof-stage-card (not .stage-card)
    __built = wrap.querySelectorAll('.hof-stage-card').length;

    // TST/TSL: user wants the table view completely removed.
    // If cards were built, hide the original table at all viewport sizes.
    try{
      if(__built > 0){
        tableEl.style.display = 'none';
      }
    }catch(_){ }
    try{
      const inline = document.getElementById('hofInline');
      if(inline){
        if(__built>0) inline.classList.add('hof-has-stagecards');
        else inline.classList.remove('hof-has-stagecards');
      }
    }catch(_){}
  }

  // Legacy (row-filter) seasons: build a matrix from the currently rendered table
  // so we can reuse renderStageCardsForMobile and keep seasons 1~8 consistent with 9~12 on mobile.
  function hofTableToMatrix(tableEl){
    if(!tableEl) return [];
    const norm = (s)=> String(s||'').replace(/[\u200B-\u200D\uFEFF]/g,'').replace(/\u00A0/g,' ').replace(/\s+/g,' ').trim();
    const mat = [];
    const pullRow = (tr)=>{
      const out = [];
      Array.from(tr.children||[]).forEach(td=>{
        const img = td && td.querySelector ? td.querySelector('img') : null;
        if(img && img.src){ out.push(norm(img.src)); return; }
        out.push(norm(td ? (td.innerText != null ? td.innerText : td.textContent) : ''));
      });
      mat.push(out);
    };
    try{
      if(tableEl.tHead){
        Array.from(tableEl.tHead.querySelectorAll('tr')).forEach(pullRow);
      }
      Array.from(tableEl.tBodies||[]).forEach(tb=>{
        Array.from(tb.querySelectorAll('tr')).forEach(pullRow);
      });
    }catch(_){ }
    return mat;
  }


// --- TST/TSL header row + organizer row merging ---
  function mergeTstTslHeaderRows(tableEl, leagueKey){
    const k = String(leagueKey||'').toLowerCase();
    if(!tableEl || (k!=='tst' && k!=='tsl')) return;
    const tbody = (tableEl.tBodies && tableEl.tBodies.length) ? tableEl.tBodies[0] : null;
    if(!tbody) return;
    const rows = Array.from(tbody.querySelectorAll('tr'));
    const norm = (s)=> String(s||'').replace(/\s+/g,' ').trim();

    // If there is a separate season row under the title, fold it into the title and remove the season row.
    try{
      let titleIdx=-1, seasonIdx=-1;
      for(let i=0;i<Math.min(6, rows.length); i++){
        const t = norm(rows[i].textContent);
        if(titleIdx<0 && /명예의전당/.test(t)) titleIdx=i;
        if(seasonIdx<0 && /(\(\s*시즌\s*\d+\s*\))/.test(t) && !/명예의전당/.test(t)) seasonIdx=i;
      }
      if(titleIdx>=0 && seasonIdx>=0 && seasonIdx>titleIdx){
        const titleRow = rows[titleIdx];
        const seasonRow = rows[seasonIdx];
        const seasonTxt = norm(seasonRow.textContent);
        const titleCell = (titleRow.children && titleRow.children.length) ? titleRow.children[0] : null;
        if(titleCell && seasonTxt){
          // Append season to the title (left aligned)
          const base = norm(titleCell.textContent);
          if(base && base.indexOf(seasonTxt)===-1){
            titleCell.textContent = base + '  ' + seasonTxt;
          }
        }
        // remove season row entirely
        seasonRow.remove();
        // refresh rows array (used later)
        // eslint-disable-next-line no-unused-vars
        rows.splice(seasonIdx,1);
      }
    }catch(_){}


    const mergeRow = (tr, cls)=>{
      const tds = Array.from(tr.children||[]);
      if(tds.length<=1) return;
      const first = tds[0];
      const text = norm(tr.textContent);
      first.textContent = text;
      first.colSpan = tds.length;
      first.classList.add(cls);
      for(let i=tds.length-1;i>=1;i--) tds[i].remove();
    };

    // Merge first 2 header-style rows if they look like titles
    rows.slice(0,4).forEach(tr=>{
      const txt = norm(tr.textContent);
      if(!txt) return;
      if(/명예의전당/.test(txt) || /(TST|TSL)\s*\d{2,4}/i.test(txt) || /스타리그|토너먼트/.test(txt)){
        mergeRow(tr, 'hof-merged-title');
      }
    });

    // Organizer row: label in first cell (대회 진행자) then IDs across other cells
    rows.forEach(tr=>{
      const tds = Array.from(tr.children||[]);
      if(tds.length<2) return;
      const label = norm(tds[0].textContent);
      if(!/^(대회\s*진행자|대회\s*진행|진행자|운영팀)$/.test(label)) return;
      // merge remaining into one cell
      const ids = tds.slice(1).map(td=> (td.innerText!=null? String(td.innerText): String(td.textContent||''))).join(' ');
      const merged = document.createElement('td');
      merged.colSpan = tds.length-1;
      const star = document.createElement('span');
      star.className = 'hof-organizer-star';
      star.textContent = '*';
      merged.appendChild(star);
      merged.appendChild(document.createTextNode(' ' + norm(ids)));
      merged.classList.add('hof-organizers-merged');
      // remove old cells and insert
      for(let i=tds.length-1;i>=1;i--) tds[i].remove();
      tr.appendChild(merged);
      tr.classList.add('hof-organizer-row');
      // left align both label and merged cell
      tds[0].style.textAlign = 'left';
      merged.style.textAlign = 'left';
    });
  }
// PRO sidebar season list: extract winner/runner team names from a block for display.
  function extractPodiumFromBlockData(blockData){
    const out = { win:'', runner:'' };
    if(!Array.isArray(blockData)) return out;
    const norm = (s)=> String(s||'').replace(/[\u200B-\u200D\uFEFF]/g,'').replace(/\u00A0/g,' ').replace(/\s+/g,' ').trim();
    const isUrl = (v)=> /^https?:\/\//i.test(String(v||'').trim());

    for(const row of blockData){
      const r = row || [];
      for(let c=0;c<r.length;c++){
        const cell = norm(r[c]);
        if(!cell) continue;
        if(/준\s*우\s*승/.test(cell)){
          // find next meaningful non-url cell to the right
          for(let j=c+1;j<r.length;j++){
            const vRaw = r[j];
            const v = norm(vRaw);
            if(!v || isUrl(vRaw)) continue;
            out.runner = v;
            break;
          }
        }
        if((/(^|\s)우\s*승($|\s)/.test(cell)) && !/준\s*우\s*승/.test(cell)){
          for(let j=c+1;j<r.length;j++){
            const vRaw = r[j];
            const v = norm(vRaw);
            if(!v || isUrl(vRaw)) continue;
            out.win = v;
            break;
          }
        }
      }
    }
    return out;
  }


  // PRO: render podium cards from a season block laid out like the sheet screenshot:
  //   [우승 | 준우승] header row, image/logo row, then label rows (팀명/감독/부감독/운영팀 ...)
  function renderProPodiumFromBlockData(tableEl, blockData){
    if(!tableEl) return false;
    if(!Array.isArray(blockData) || !blockData.length) return false;

    const norm = (s)=> String(s||'').replace(/[​-‍﻿]/g,'').replace(/ /g,' ').replace(/\s+/g,' ').trim();
    const isUrl = (v)=> /^https?:\/\//i.test(String(v||'').trim());

    // find header row containing 우승 && 준우승
    let headerR=-1, cWin=-1, cRun=-1;
    for(let r=0;r<blockData.length;r++){
      const row = blockData[r]||[];
      for(let c=0;c<row.length;c++){
        const t = norm(row[c]);
        if(t==='우승' && cWin<0) cWin=c;
        if(t==='준우승' && cRun<0) cRun=c;
      }
      if(cWin>=0 && cRun>=0){ headerR=r; break; }
      cWin=cWin; cRun=cRun;
    }
    if(headerR<0 || cWin<0) return false;
    if(cRun<0) cRun = cWin+1;

    // attempt to pick logo row: the next row with URL-ish values at win/run cols
    let logoR=-1;
    for(let r=headerR+1; r<Math.min(headerR+6, blockData.length); r++){
      const row = blockData[r]||[];
      const w=row[cWin];
      const u=row[cRun];
      if((isUrl(w) || /\.(png|jpe?g|webp|gif)(\?|$)/i.test(String(w||''))) ||
         (isUrl(u) || /\.(png|jpe?g|webp|gif)(\?|$)/i.test(String(u||'')))){
        logoR=r; break;
      }
    }

    const win = { label:'우승', name:'-', logo:'', lines:{} };
    const run = { label:'준우승', name:'-', logo:'', lines:{} };

    if(logoR>=0){
      const row = blockData[logoR]||[];
      win.logo = pickImg(row, cWin);
      run.logo = pickImg(row, cRun);
    }

    const wanted = ['팀명','감독','부감독','운영팀','대회 진행자','대회진행자','진행자','운영진'];
    const isLabel = (t)=> wanted.includes(t) || t==='우승' || t==='준우승' || /준\s*우\s*승/.test(t) || (/(^|\s)우\s*승($|\s)/.test(t) && !/준\s*우\s*승/.test(t));
    const pickVal = (row, col)=>{
      const r=row||[];
      for(let j=col; j<r.length; j++){
        const raw=r[j];
        const t=norm(raw);
        if(!t) continue;
        if(isUrl(raw)) continue;
        if(isLabel(t)) continue;
        return t;
      }
      return '';
    };
    const pickImg = (row, col)=>{
      const r=row||[];
      for(let j=col; j<r.length; j++){
        const raw=r[j];
        const t=String(raw||'').trim();
        if(!t) continue;
        if(isUrl(t) || /\.(png|jpe?g|webp|gif)(\?|$)/i.test(t)) return t;
      }
      return '';
    };

    for(let r=headerR+1; r<blockData.length; r++){
      const row = blockData[r]||[];
      // find label cell in this row
      let labelCol=-1; let label='';
      for(let c=0;c<Math.min(6,row.length);c++){
        const t=norm(row[c]);
        if(wanted.includes(t)) { labelCol=c; label=t; break; }
      }
      if(labelCol<0) continue;
      const wv = pickVal(row, cWin);
      const rv = pickVal(row, cRun);
      if(label==='팀명'){
        if(wv) win.name = wv;
        if(rv) run.name = rv;
      }else{
        if(wv) win.lines[label]=wv;
        if(rv) run.lines[label]=rv;
      }
    }

    // if runner-up is missing in the sheet for this season, hide it
    const hasRunner = (run.name && run.name!=='-' && run.name!=='—') || Object.keys(run.lines).length || run.logo;

    // build two stacked cards inside the table to keep layout consistent
    const thead = tableEl.querySelector('thead');
    const tbody = tableEl.querySelector('tbody');
    if(!thead || !tbody) return false;
    thead.innerHTML='';
    tbody.innerHTML='';

    const makeCard = (obj, type)=>{
      const card = document.createElement('div');
      card.className = 'hof-pro-card ' + type;

      const badge = document.createElement('div');
      badge.className = 'hof-place-badge ' + (type==='win'?'win':'runner');
      const crown = document.createElement('img');
      crown.className='hof-place-crown';
      crown.alt = type==='win' ? '우승' : '준우승';
      crown.src = type==='win' ? './crown_gold.png' : './crown_silver.png';
      const lbl = document.createElement('div');
      lbl.className='hof-place-label';
      lbl.textContent = type==='win' ? '우승' : '준우승';
      badge.appendChild(crown); badge.appendChild(lbl);

      const top = document.createElement('div');
      top.className = 'hof-pro-top';

      const icon = document.createElement('div');
      icon.className = 'hof-team-icon';
      if(obj.logo){
        const img=document.createElement('img');
        img.src=obj.logo; img.alt='';
        img.loading='lazy'; img.decoding='async';
        img.referrerPolicy='no-referrer';
        icon.appendChild(img);
      }

      const tbox=document.createElement('div');
      const nm=document.createElement('div');
      nm.className='hof-team-name';
      nm.textContent=obj.name||'-';
      tbox.appendChild(nm);

      // show 감독/부감독 inline subtitle if present
      const subParts=[];
      const d=obj.lines;
      const g = d['감독'];
      const a = d['부감독'];
      if(g) subParts.push('감독 ' + g);
      if(a) subParts.push('부감독 ' + a);
      if(subParts.length){
        const sub=document.createElement('div');
        sub.className='hof-team-sub';
        sub.textContent=subParts.join('   ');
        tbox.appendChild(sub);
      }

      top.appendChild(icon);
      top.appendChild(tbox);

      const lines=document.createElement('div');
      lines.className='hof-pro-lines';
      const ordered=['감독','부감독','운영팀','대회 진행자','대회진행자','진행자','운영진'];
      ordered.forEach(k=>{
        const v=d[k];
        if(!v) return;
        const line=document.createElement('div');
        line.className='hof-pro-line';
        const kk=document.createElement('span');
        kk.className='k';
        kk.textContent=(k.replace('대회 진행자','대회 진행자'))+':';
        line.appendChild(kk);
        // organizer gets green star prefix
        if(/대회\s*진행자|대회진행자|진행자/.test(k)){
          const star=document.createElement('span');
          star.className='hof-organizer-star';
          star.textContent='*';
          line.appendChild(document.createTextNode(' '));
          line.appendChild(star);
        }
        line.appendChild(document.createTextNode(' ' + v));
        lines.appendChild(line);
      });

      card.appendChild(badge);
      card.appendChild(top);
      if(lines.children.length) card.appendChild(lines);
      return card;
    };

    const wrap=document.createElement('div');
    wrap.className='hof-pro-podium';
    wrap.appendChild(makeCard(win,'win'));
    if(hasRunner) wrap.appendChild(makeCard(run,'runner'));

    const tr=document.createElement('tr');
    const td=document.createElement('td');
    td.colSpan = 1;
    td.className='hof-pro-cell';
    td.appendChild(wrap);
    tr.appendChild(td);
    tbody.appendChild(tr);

    // Tag for CSS
    try{ tableEl.classList.add('hof-league-pro'); }catch(_){ }
    return true;
  }


  function showHofSeason(label, leagueKey){
    const k = (leagueKey || HOF_INLINE_CURRENT || 'pro').toLowerCase();
    const cache = HOF_INLINE_CACHE[k];
    const tableEl = document.getElementById('hofInlineTable');
    if(!cache || !tableEl) return;
    // grid/block mode
    if(cache.blocks && cache.blocks.byLabel){
      const normLabel = _normSeasonText(label);
      let picked = cache.blocks.byLabel[label] || cache.blocks.byLabel[normLabel];
      if(!picked){
        const want = extractSeasonNum(normLabel);
        if(want){
          picked = Object.values(cache.blocks.byLabel).find(b=>b && b.num===want) || null;
        }
      }
      if(picked){
        renderBlockTable(tableEl, picked, k);
        return;
      }
      // Fallback: if block label matching fails, try row-filter mode on the already-rendered table.
      // (This prevents "전체목록"으로 보이는 현상 when labels differ slightly.)
      try{ applySeasonFilter(tableEl, label, k); }catch(_){ }
      try{ decorateHofPlacements(tableEl, key); }catch(_){ }
      try{ if (isHofCardLeague(k)) { const mat=hofTableToMatrix(tableEl); renderStageCardsForMobile(tableEl, mat, k); } }catch(_){ }
      return;
    }
    // legacy row-filter mode
    // Prevent table flash during season switch for TST/TSL
    try{ if(tableEl && isHofCardLeague(k)) tableEl.style.visibility='hidden'; }catch(_){ }
    applySeasonFilter(tableEl, label, k);
    try{ decorateHofPlacements(tableEl, key); }catch(_){ }
    try{ if (isHofCardLeague(k)) { const mat=hofTableToMatrix(tableEl); renderStageCardsForMobile(tableEl, mat, k); } }catch(_){ }
    try{ if(tableEl && isHofCardLeague(k)){ const built=(tableEl.parentElement?tableEl.parentElement.querySelectorAll('.hof-stage-card').length:0); if(built<=0) tableEl.style.visibility=''; } }catch(_){ }
  }

  // Expose for renderSeasonBar (defined in global scope below)
  try{ window.showHofSeason = showHofSeason; }catch(_){ }


  async function openHOF(key){
    const myReq = ++HOF_INLINE_REQ_TOKEN; try{ window.HOF_INLINE_REQ_TOKEN = HOF_INLINE_REQ_TOKEN; }catch(_){ }
    HOF_INLINE_CURRENT = key || 'pro'; try{ window.HOF_INLINE_CURRENT = HOF_INLINE_CURRENT; }catch(_){ }
    // reset HOF table visibility on every tab switch (prevents blank screen if stage-cards build fails)
    try{ const t=document.getElementById('hofInlineTable'); if(t){ t.style.display=''; if(t.parentElement) t.parentElement.classList.remove('hof-stage-only'); } }catch(_){ }
    // Clear stage-cards + flags right away to avoid mobile blank when switching leagues (TST -> TSL etc.)
    try{
      const inline=document.getElementById('hofInline');
      if(inline) inline.classList.remove('hof-has-stagecards','hof-inline-tst','hof-inline-tsl','hof-inline-tpl','hof-inline-msl','hof-inline-tcl');
      // Remove any previously appended stage-card containers
      const wrap=document.querySelector('#hofInline .hof-stage-cards');
      if(wrap) wrap.remove();
      const table=document.getElementById('hofInlineTable');
      if(table && table.parentElement){
        table.parentElement.querySelectorAll('.hof-stage-cards').forEach(n=>n.remove());
      }
    }catch(_){}

    const c = cfg[key];
    if(!c) return;
    if(!c.url){
      console.warn('HOF: missing url', key);
      return;
    }

    const titleEl = $("hofInlineTitle");
    const statusEl = $("hofInlineStatus");
    const tableEl = $("hofInlineTable");

    // Prevent league content (especially TST/TSL mobile cards) from leaking into other views.
    // When the viewport is small, CSS can show leftover .hof-stage-cards even after switching to PRO.
    try{
      const p = tableEl && tableEl.parentElement;
      if(p) p.querySelectorAll('.hof-stage-cards').forEach(n=>n.remove());
    }catch(_){ }

    // Tag the wrapper so CSS can safely scope responsive rules per-league.
    try{
      const box = $('hofInline');
      if(box){
        box.classList.remove('hof-inline-pro','hof-inline-tst','hof-inline-tsl');
        box.classList.remove('hof-league-pro','hof-league-tst','hof-league-tsl');
        
        box.classList.add(key==='pro'?'hof-inline-pro':key==='tsl'?'hof-inline-tsl':key==='tst'?'hof-inline-tst':key==='tpl'?'hof-inline-tpl':key==='msl'?'hof-inline-msl':'hof-inline-tcl');
        box.classList.add(key==='pro'?'hof-league-pro':key==='tsl'?'hof-league-tsl':key==='tst'?'hof-league-tst':key==='tpl'?'hof-league-tpl':key==='msl'?'hof-league-msl':'hof-league-tcl');
      }
    }catch(_){ }

    // Tag table with current league for CSS tweaks
    if(tableEl){
      tableEl.classList.remove('hof-league-pro','hof-league-tst','hof-league-tsl','hof-league-tpl','hof-league-msl','hof-league-tcl');
      tableEl.classList.add(key==='pro'?'hof-league-pro':key==='tst'?'hof-league-tst':key==='tsl'?'hof-league-tsl':key==='msl'?'hof-league-msl':key==='tcl'?'hof-league-tcl':'hof-league-race');
    }

    if(titleEl) titleEl.textContent = c.title;
    // Prevent 0.1s table flash for TST/TSL: hide table while building cards
    try{
      if(tableEl && isHofCardLeague(key)){
        tableEl.style.visibility = 'hidden';
        // ensure it's not display:none so we can build cards off DOM if needed
        if(tableEl.style.display==='none') tableEl.style.display='';
      }else if(tableEl){
        // restore for PRO or other views
        tableEl.style.visibility = '';
      }
    }catch(_){ }
    // menu active
    const proBtn = $('hofPro'); const tslBtn = $('hofTSL'); const tstBtn = $('hofTST');
    const tplBtn = $('hofTPL'); const mslBtn = $('hofMSL'); const tclBtn = $('hofTCL');
    [proBtn,tslBtn,tstBtn,tplBtn,mslBtn,tclBtn].forEach(b=>{ if(!b) return; b.classList.remove('active'); b.setAttribute('aria-selected','false'); });
    const pickBtn = (key==='pro')?proBtn:(key==='tsl')?tslBtn:(key==='tst')?tstBtn:(key==='tpl')?tplBtn:(key==='msl')?mslBtn:tclBtn;
    if(pickBtn){ pickBtn.classList.add('active'); pickBtn.setAttribute('aria-selected','true'); }
    if(statusEl){ statusEl.style.display='block'; statusEl.textContent = '시트에서 데이터를 불러오는 중…'; }
    const inlineBox = $('hofInline');
    if(inlineBox){ inlineBox.style.display='block'; }

    try{
      // URL(edit?gid=...) 기반으로 그대로 로딩 → 기존 연동 유지
      let data = await fetchGVIZbyUrl_v12b(c.url);
      if(myReq !== HOF_INLINE_REQ_TOKEN) return;
      data = normData(data);
      if(!data.length){
        if(statusEl) statusEl.textContent = '데이터가 없습니다.';
        if(tableEl) renderTable(tableEl, []);
        return;
      }
      if(tableEl){
      // --- Prefer block/grid season rendering when the sheet is laid out in columns (your current HOF sheet) ---
      try{
        const blocks = buildSeasonBlocksFromData(data);
        if(blocks && blocks.order && blocks.order.length){
          const active = blocks.order[0];
          // Cache blocks per league
          HOF_INLINE_CACHE[key] = { blocks, seasons: blocks.order };

          // Build season summary (winner/runner-up) for PRO sidebar list
          try{
            window.__HOF_SEASON_SUMMARY = window.__HOF_SEASON_SUMMARY || {};
            const summary = {};
            if(String(key).toLowerCase()==='pro'){
              blocks.order.forEach(lbl=>{
                const b = blocks.byLabel[lbl];
                if(!b || !b.data) return;
                summary[_normSeasonText(lbl)] = extractPodiumFromBlockData(b.data);
              });
            }
            window.__HOF_SEASON_SUMMARY[key] = summary;
          }catch(_){ }

          // Render season list + default season block
          try{ renderSeasonBar(blocks.order, active, key); }catch(_){ }
          renderBlockTable(tableEl, blocks.byLabel[active], key);
          if(statusEl){ statusEl.textContent = ''; statusEl.style.display='none'; }
          return;
        }
      }catch(_){ }

      // Fallback: legacy full-table rendering + row-based season filtering
      renderTable(tableEl, data);

      // Post-processing should never break rendering
      try{ markHofTitleCells(tableEl); }catch(_){}
      try{ convertImageUrlCells(tableEl); }catch(_){}
      try{ applyTableDataLabels(tableEl); }catch(_){}
      try{ decorateHofPlacements(tableEl, key); }catch(_){}

      let seasonsSorted = [];
      let active = '';
      let meta = null;

      try{
        const grp = applySeasonGrouping(tableEl, key);
        seasonsSorted = [];
        try{
          const seen = new Set();
          (grp.seasons||[]).forEach(raw=>{
            const label = _normSeasonText(raw);
            if(!label) return;
            if(seen.has(label)) return;
            seen.add(label);
            seasonsSorted.push(label);
          });
        }catch(_){}
        active = seasonsSorted[0] || grp.active || '';
      }catch(_){}

      try{
        meta = buildSeasonMeta(tableEl);
      }catch(_){ meta = null; }

      // Cache pristine HTML + season metadata per league (used by season filter restore)
      try{
        HOF_INLINE_CACHE[key] = { html: tableEl.innerHTML, seasons: seasonsSorted, meta };
      }catch(_){}
      // 시즌 탭: 시즌별 보기
      try{ renderSeasonBar(seasonsSorted, active, key); }catch(_){}
    }
      if(statusEl){ statusEl.textContent = ''; statusEl.style.display='none'; }
    }catch(e){
      console.error('HOF open error', e);
      if(statusEl){ statusEl.textContent=''; statusEl.style.display='none'; }
    }
  }

  function bindOnce(){
    const closeBtn = $("hofPopupClose");
    const backdrop = $("hofPopupBackdrop");

    if(closeBtn && !closeBtn.dataset.bound){
      closeBtn.dataset.bound='1';
      closeBtn.addEventListener('click', closePopup);
    }
    if(backdrop && !backdrop.dataset.bound){
      backdrop.dataset.bound='1';
      backdrop.addEventListener('click', closePopup);
    }
    document.addEventListener('keydown', (e)=>{
      if(e.key==='Escape') closePopup();
    });

    const proBtn = $("hofPro");
    const tslBtn = $("hofTSL");
    const tstBtn = $("hofTST");
    const tplBtn = $("hofTPL");
    const mslBtn = $("hofMSL");
    const tclBtn = $("hofTCL");
// Stop bubbling so any legacy parent click h&&lers (that used to open Google Sheets) won't fire.
    const guard = (e)=>{ try{ e.preventDefault(); }catch(_){} try{ e.stopPropagation(); }catch(_){} try{ e.stopImmediatePropagation(); }catch(_){} };

    if(proBtn && !proBtn.dataset.bound){
      proBtn.dataset.bound='1';
      proBtn.addEventListener('click', (e)=>{ guard(e); openHOF('pro'); });
    }
    if(tstBtn && !tstBtn.dataset.bound){
      tstBtn.dataset.bound='1';
      tstBtn.addEventListener('click', (e)=>{ guard(e); openHOF('tst'); });
    }
    if(tslBtn && !tslBtn.dataset.bound){
      tslBtn.dataset.bound='1';
      tslBtn.addEventListener('click', (e)=>{ guard(e); openHOF('tsl'); });
    }

    if(mslBtn && !mslBtn.dataset.bound){
      mslBtn.dataset.bound='1';
      mslBtn.addEventListener('click', (e)=>{ guard(e); openHOF('msl'); });
    }
    if(tclBtn && !tclBtn.dataset.bound){
      tclBtn.dataset.bound='1';
      tclBtn.addEventListener('click', (e)=>{ guard(e); openHOF('tcl'); });
    }
    if(tplBtn && !tplBtn.dataset.bound){
      tplBtn.dataset.bound='1';
      tplBtn.addEventListener('click', (e)=>{ guard(e); openHOF('tpl'); });
    }
    // Auto render default (latest) when section exists
    try{
      if(!window.__HOF_INLINE_BOOTED && document.getElementById('hofInlineTable')){
        window.__HOF_INLINE_BOOTED = true;
        openHOF('pro');
      }
    }catch(_){ }
  }

  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded', bindOnce);
  else bindOnce();

  // Keep HOF readable on mobile/resize:
  // - TST/TSL: ensure stage cards exist for the currently rendered season
  // - PRO: ensure no leaked stage cards remain
  (function(){
    let t = null;
    const run = ()=>{
      try{
        const tableEl = document.getElementById('hofInlineTable');
        const inline = document.getElementById('hofInline');
        if(!tableEl || !inline) return;
        const k = (window.HOF_INLINE_CURRENT || 'pro').toLowerCase();
        // Always remove leaked stage cards in PRO
        if(k==='pro'){
          inline.querySelectorAll('.hof-stage-cards').forEach(n=>n.remove());
          return;
        }
        if(k!=='tst' && k!=='tsl' && k!=='tpl' && k!=='msl' && k!=='tcl') return;
        // Rebuild cards from last rendered block data (block mode)
        const last = (window.__HOF_LAST_BLOCK && window.__HOF_LAST_BLOCK[k]) ? window.__HOF_LAST_BLOCK[k] : null;
        if(last && Array.isArray(last.data) && last.data.length){
          renderStageCardsForMobile(tableEl, last.data, k);
        }
      }catch(_){ }
    };
    window.addEventListener('resize', ()=>{
      if(t) clearTimeout(t);
      t = setTimeout(run, 120);
    });
  })();

  document.addEventListener('keydown', (e)=>{ if(e.key==='Escape') closeMobile(); });
})();




function mountSimpleKeyValueHofCardFromRenderedTable(tableEl, leagueKey){
  const k = String(leagueKey||'').toLowerCase();
  if(!tableEl || (k!=='tpl' && k!=='tcl')) return false;

  const norm = (s)=> String(s||'')
    .replace(/[\u200B-\u200D\uFEFF]/g,'')
    .replace(/\u00A0/g,' ')
    .replace(/\s+/g,' ')
    .trim();

  // Extract a reasonable "stage/season" label.
  let stageLabel = '';
  try{
    const head = tableEl.querySelector('thead tr');
    if(head){
      const t = norm(head.textContent);
      if(t) stageLabel = t;
    }
  }catch(_){}
  if(!stageLabel){
    try{
      const firstRow = tableEl.querySelector('tbody tr');
      if(firstRow){
        const t = norm(firstRow.textContent);
        if(t && /(시즌|스테이지|리그|TPL|TCL)/.test(t)) stageLabel = t;
      }
    }catch(_){}
  }
  // If still empty, fall back to league title in the card header.
  if(!stageLabel){
    stageLabel = (k==='tpl') ? 'TPL' : 'TCL';
  }

  // Parse key/value rows (label in first cell, value in last non-empty cell)
  let winner='', runner='', third='', organizer='';
  try{
    const rows = Array.from(tableEl.querySelectorAll('tbody tr'));
    for(const tr of rows){
      const cells = Array.from(tr.querySelectorAll('th,td'));
      if(!cells.length) continue;
      const label = norm(cells[0].textContent);
      let value = '';
      for(let i=cells.length-1;i>=1;i--){
        const v = norm(cells[i].textContent);
        if(v){ value = v; break; }
      }
      if(!label) continue;

      if(/(^|\s)3\s*위($|\s)/.test(label) || /삼\s*위/.test(label)) third = value || third;
      else if(/준\s*우\s*승/.test(label)) runner = value || runner;
      else if(/(^|\s)우\s*승($|\s)/.test(label) && !/준\s*우\s*승/.test(label)) winner = value || winner;
      else if(/대회\s*진행자|대회진행자|진행자/.test(label)) organizer = value || organizer;
    }
  }catch(_){}

  // If we can't find winner/runner, don't take over (let the normal renderer show the table).
  if(!winner && !runner) return false;

  const parent = tableEl.parentElement;
  if(!parent) return false;

  // Remove any old cards first
  try{ parent.querySelectorAll('.hof-stage-cards').forEach(n=>n.remove()); }catch(_){}

  const wrap = document.createElement('div');
  wrap.className = 'hof-stage-cards';

  const card = document.createElement('div');
  card.className = 'hof-stage-card';

  const titleText = String(stageLabel||'').trim();
  // Don't show placeholder / auto stage labels
  if(titleText && titleText!=='-' && titleText!=='–' && titleText!=='—' && titleText!=='－' && !/^스테이지\s*\d+$/.test(titleText) && !/^스테이지\d+$/.test(titleText)){
    const title = document.createElement('div');
    title.className = 'hof-stage-title';
    title.textContent = titleText;
    card.appendChild(title);
  }

  const mkLine = (place, value)=>{
    if(value===undefined || value===null) return;
    const vv = String(value).trim();
    if(!vv) return;
    // hide placeholder dashes
    if(vv==='-' || vv==='–' || vv==='—' || vv==='－') return;
    const line = document.createElement('div');
    line.className = 'hof-stage-line';

    const badge = document.createElement('span');
    badge.className = 'hof-stage-badge';
    badge.textContent = (place==='win') ? '🏆' : (place==='third') ? '🥉' : '🥈';
    line.appendChild(badge);

    const lab = document.createElement('span');
    lab.className = 'hof-stage-label';
    lab.textContent = (place==='win') ? '우승' : (place==='third') ? '3위' : '준우승';
    line.appendChild(lab);

    const val = document.createElement('span');
    val.className = 'hof-stage-value';
    val.textContent = vv;
    line.appendChild(val);

    card.appendChild(line);
  };

  mkLine('win', winner);
  mkLine('run', runner);
  mkLine('third', third);

  if(organizer){
    const org = document.createElement('div');
    org.className = 'hof-stage-organizer';
    org.innerHTML = `<span class="hof-organizer-star">★</span><span class="k">대회진행자</span> : ${organizer}`;
    card.appendChild(org);
  }

  wrap.appendChild(card);
  parent.appendChild(wrap);

  // Hide the original table when we successfully built cards (same as TSL/TST behavior).
  try{ tableEl.style.display = 'none'; }catch(_){}

  try{
    const inline = document.getElementById('hofInline');
    if(inline) inline.classList.add('hof-has-stagecards');
  }catch(_){}

  return true;
}



function extractSeasonNum(s){
  const t = String(s||'');
  // Prefer explicit "시즌#" (e.g. "스타리그25 윈터 (시즌12)") over any other digits.
  // Robust: don't rely on \b boundaries (Korean + punctuation can break \b)
  let m = t.match(/시즌\s*0*(\d+)/i);
  // Then allow S# when it looks like an actual season label.
  // (Avoid accidental matches inside long tokens; season cells are already URL-filtered upstream.)
  if(!m) m = t.match(/(?:^|[^A-Za-z0-9])S\s*0*(\d+)/i);
  return m ? parseInt(m[1],10) : 0;
}

/* === 시즌 대표 행 감지 (예: 스타리그 2019 (시즌1)) === */
function applySeasonGrouping(tableEl, leagueKey){
  const _normLocal = (s)=> String(s||'')
    .replace(/[\u200B-\u200D\uFEFF]/g,'')
    .replace(/\u00A0/g,' ')
    .replace(/[–—−]/g,'-')
    .replace(/\s+/g,' ')
    .trim();

  if(!tableEl) return { seasons: [], active: '' };
  const k = (leagueKey||HOF_INLINE_CURRENT||'pro').toLowerCase();
  const rows = Array.from(tableEl.querySelectorAll("tbody tr"));
  const seasons = [];

  const pat = /(S|시즌)\s*0*\d+/i; // allow both S# && 시즌# across leagues

  // "Season header row" heuristic:
  // - contains S#/시즌# text
  // - && is mostly a merged/label row (few non-empty cells)
  // NOTE: some seasons rows have a few more filled cells (e.g., split tables),
  // so keep this threshold slightly generous.
  const isHeaderRow = (tr)=>{
    const tds = Array.from(tr.querySelectorAll('td,th'));
    const texts = tds.map(td => _normLocal(td.textContent||''));
    const rowText = _normLocal(tr.textContent||'');
    if(!rowText || !pat.test(rowText)) return false;

    // Header rows in our HOF sheets are "label rows":
    // usually 1 cell (or 2 cells for split tables) has the season title,
    // && the rest are empty.
    const nonEmpty = texts.filter(Boolean);
    if(nonEmpty.length === 0) return false;

    // If multiple cells are filled, they should still look like season labels (e.g., split layout)
    const seasonLike = nonEmpty.filter(t => pat.test(t)).length;
    const ok = (nonEmpty.length <= 2 && seasonLike >= 1) || (nonEmpty.length <= 3 && seasonLike >= 2);
    return ok;
  };

  const getHeaderTitle = (tr)=>{
    const tds = Array.from(tr.querySelectorAll('td,th'));
    for(const td of tds){
      const t = _normLocal(td.textContent||'');
      if(t) return t;
    }
    return _normLocal(tr.textContent||'');
  };

  rows.forEach(tr=>{
    if(!isHeaderRow(tr)) return;
    const title = getHeaderTitle(tr);
    if(!title) return;

    // Mark visually as header
    tr.classList.add('season-header-row');
    Array.from(tr.querySelectorAll('td,th')).forEach(td=>{
      const t = _normLocal(td.textContent||'');
      if(t && pat.test(t)) td.classList.add('season-header-cell');
    });

    if(!seasons.includes(title)) seasons.push(title);
  });

  // Sort: most recent first (bigger season number first)
  const sorted = seasons.slice().sort((a,b)=>{
    const na = extractSeasonNum(a), nb = extractSeasonNum(b);
    if(na!==nb) return nb-na;
    // If numbers tie, prefer later-looking year prefix (e.g. 19-20 > 17-18) if present
    const ya = (String(a).match(/(\d{2})\s*-\s*(\d{2})/)||[]).slice(1).join('');
    const yb = (String(b).match(/(\d{2})\s*-\s*(\d{2})/)||[]).slice(1).join('');
    if(ya && yb && ya!==yb) return yb.localeCompare(ya,'ko',{numeric:true});
    return String(b).localeCompare(String(a),'ko',{numeric:true});
  });

  return { seasons: sorted, active: sorted[0] || '' };
}

// Build per-row season context metadata for reliable filtering across leagues.
function buildSeasonMeta(tableEl){
  if(!tableEl) return { splitIndex: 0, rows: [] };
  const tbody = tableEl.tBodies && tableEl.tBodies.length ? tableEl.tBodies[0] : null;
  if(!tbody) return { splitIndex: 0, rows: [] };
  const bodyRows = Array.from(tbody.querySelectorAll('tr'));
  const rowCellsCounts = bodyRows.map(r => (r.children ? r.children.length : 0));
  const maxCellCount = rowCellsCounts.reduce((a,b)=>Math.max(a,b),0);

  // Detect two-block layout by presence of 2+ season headers on a single row.
  let splitIndex = 0;
  const doubleRow = bodyRows.find(r=>{
    const hs = Array.from(r.children||[]).filter(c=> c.classList && c.classList.contains('season-header-cell'));
    return hs.length >= 2;
  });
  if(doubleRow){
    const idxs = Array.from(doubleRow.children||[])
      .map((c,i)=> (c.classList && c.classList.contains('season-header-cell')) ? i : -1)
      .filter(i=> i>=0);
    if(idxs.length >= 2) splitIndex = idxs[1];
    if(!splitIndex) splitIndex = Math.max(2, Math.floor(maxCellCount/2));
  }

  let curLeft = '';
  let curRight = '';
  let curSingle = '';

  const rowsMeta = bodyRows.map(tr=>{
    const cells = Array.from(tr.children||[]);
    // Update season context(s)
    cells.forEach((cell, idx)=>{
      if(!(cell.classList && cell.classList.contains('season-header-cell'))) return;
      const txt = _normSeasonText(cell.textContent||'');
      if(!txt) return;
      if(splitIndex > 0){
        if(idx < splitIndex) curLeft = txt;
        else curRight = txt;
      }else{
        curSingle = txt;
      }
    });
    return {
      left: curLeft,
      right: curRight,
      single: curSingle,
      isTitle: /명예의전당/i.test(_normSeasonText(tr.textContent||''))
    };
  });

  return { splitIndex, rows: rowsMeta };
}

function renderSeasonBar(seasons, active, leagueKey){
  const bar = document.getElementById('hofSeasonList') || document.getElementById('hofInlineSeasonBar') || document.getElementById('hofSeasonBar');
  if(!bar) return;
  bar.innerHTML = '';

  const k = leagueKey || HOF_INLINE_CURRENT || 'pro';
  const rawList = Array.isArray(seasons) ? seasons : [];

  const toLabel = (s)=> _normSeasonText(s);
  const seasonNum = (label)=> extractSeasonNum(String(label||''));

  // Normalize + de-dup
  const seen = new Set();
  const labels = [];
  rawList.forEach((s)=>{
    const label = toLabel(s);
    if(!label) return;
    if(seen.has(label)) return;
    seen.add(label);
    labels.push(label);
  });

  // Sort: latest season first (bigger number first)
  labels.sort((a,b)=>{
    const na = seasonNum(a), nb = seasonNum(b);
    if(na !== nb) return nb - na;
    return String(b).localeCompare(String(a), 'ko');
  });

  const act = toLabel(active||'') || (labels[0] || '');

  labels.forEach((label) => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'hof-season-btn' + (label === act ? ' active' : '');
    // Season buttons: show ONLY the season label (no winner/runner-up subtext)
    btn.textContent = label;
    btn.title = label;
    btn.addEventListener('click', () => {
      bar.querySelectorAll('.hof-season-btn').forEach(b=>b.classList.remove('active'));
      btn.classList.add('active');
      showHofSeason(label, k);
    });
    bar.appendChild(btn);
  });

  // Apply default season once
  if(act){
    showHofSeason(act, k);
  }
}



// Normalize season label text for robust matching across slight formatting differences.
function _normSeasonText(s){
  // normalize spaces, zero-width chars, && dash variants for robust season matching
  return String(s||'')
    .replace(/[\u200B-\u200D\uFEFF]/g,'')
    .replace(/\u00A0/g,' ')
    .replace(/[–—−]/g,'-')
    .replace(/\s+/g,' ')
    .trim();
}


// A "generic" season label like "S1" or "시즌 1" (no year/league prefix).
function isGenericSeasonLabel(label){
  const s = _normSeasonText(label||'');
  return /^(S|시즌)\s*0*\d+$/i.test(s);
}


function applySeasonFilter(tableEl, season, leagueKey){
  if(!tableEl) return;

  const k = (leagueKey || HOF_INLINE_CURRENT || 'pro').toLowerCase();
  HOF_INLINE_CURRENT = k;

  // Restore pristine table before filtering (per league key).
  if(!HOF_INLINE_CACHE[k]) HOF_INLINE_CACHE[k] = {};
  if(!HOF_INLINE_CACHE[k].html){
    HOF_INLINE_CACHE[k].html = tableEl.innerHTML;
  }else{
    tableEl.innerHTML = HOF_INLINE_CACHE[k].html;
  }

  const seasonNorm = _normSeasonText(season||'');
  const wantNum = extractSeasonNum(seasonNorm);
  if(!wantNum) return;

  const wantExact = !isGenericSeasonLabel(seasonNorm); // e.g. "17-18프로리그 S1" vs "S1"
  const pat = /(S|시즌)\s*0*\d+/i; // allow both S# && 시즌# across leagues

  const tbody = (tableEl.tBodies && tableEl.tBodies.length) ? tableEl.tBodies[0] : null;
  if(!tbody) return;

  const rows = Array.from(tbody.querySelectorAll('tr'));
  if(!rows.length) return;

  const normCell = (td)=> _normSeasonText((td && td.textContent) ? td.textContent : '');

  const isHeaderRow = (tr)=>{
    const tds = Array.from(tr.querySelectorAll('td,th'));
    const texts = tds.map(td => normCell(td)).filter(Boolean);
    const rowText = _normSeasonText(tr.textContent||'');
    if(!rowText || !pat.test(rowText)) return false;

    const seasonLike = texts.filter(t => pat.test(t)).length;
    // Typical header row: 1 filled cell (or 2 for split tables)
    if(texts.length <= 2 && seasonLike >= 1) return true;
    if(texts.length <= 3 && seasonLike >= 2) return true;
    return false;
  };

  const headerTitle = (tr)=>{
    const tds = Array.from(tr.querySelectorAll('td,th'));
    for(const td of tds){
      const t = normCell(td);
      if(t) return t;
    }
    return _normSeasonText(tr.textContent||'');
  };

  let curNum = 0;
  let curExactOk = false;

  const newBody = document.createElement('tbody');

  rows.forEach(tr=>{
    const rowText = _normSeasonText(tr.textContent||'');
    if(!rowText) return;

    // Update season context when meeting a header row
    if(isHeaderRow(tr)){
      const title = headerTitle(tr);
      const num = extractSeasonNum(title);
      curNum = num || 0;
      if(wantExact){
        curExactOk = (_normSeasonText(title) === seasonNorm);
      }else{
        curExactOk = (curNum === wantNum);
      }

      // include header row only if it belongs to selected season
      if(!curExactOk) return;
      newBody.appendChild(tr.cloneNode(true));
      return;
    }

    // Normal rows: keep only if current context matches wanted season
    const keep = wantExact ? curExactOk : (curNum === wantNum);
    if(!keep) return;

    // Skip visually empty rows
    const hasImg = !!tr.querySelector('img');
    const txt = _normSeasonText(tr.textContent||'').replace(/\s+/g,'');
    if(!hasImg && !txt) return;

    newBody.appendChild(tr.cloneNode(true));
  });

  // Swap tbody
  tbody.parentNode.replaceChild(newBody, tbody);
}




function setActiveSeason(season, leagueKey){
  // 시즌 탭 기능 제거: 전체 목록만 표시
  return;
}


// === Dashboard date badge (총경기수 옆 현재 날짜/요일) ===
document.addEventListener('DOMContentLoaded', ()=>{
  const el = document.getElementById('todayBadge');
  if(!el) return;
  const d = new Date();
  const days = ['일','월','화','수','목','금','토'];
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth()+1).padStart(2,'0');
  const dd = String(d.getDate()).padStart(2,'0');
  const dow = days[d.getDay()] || '';
  el.textContent = `${yyyy}-${mm}-${dd} (${dow})`;
});


// Dashboard: "전체 일정 보기" 버튼 → 프로리그일정(시즌) 탭으로 이동
document.addEventListener('DOMContentLoaded', () => {
  const btn = document.getElementById('viewAllScheduleBtn');
  if (!btn) return;
  btn.addEventListener('click', () => {
    const targetBtn = document.querySelector('.tab-btn[data-target="sched"]');
    if (targetBtn) targetBtn.click();
  });
});

// Dashboard: "팀 로스터" 버튼 → 로스터 팝업 (S10RoasterHOME)
document.addEventListener('DOMContentLoaded', () => {
  const openBtn = document.getElementById('viewRosterBtn');
  const popup = document.getElementById('rosterPopup');
  const teamListEl = document.getElementById('rosterTeamList');
  const teamHeaderEl = document.getElementById('rosterTeamHeader');
  const rosterTableBody = document.querySelector('#rosterTable tbody');
  const rosterMetaEl = document.getElementById('rosterMeta');

  if (!openBtn || !popup) return;

  const TIERS = ['갓','킹','퀸','잭','스페이드','조커','히든','버스트','하이든','조커']; // some fallbacks
  const tierSet = new Set(TIERS);

  function openPopup(){ popup.setAttribute('aria-hidden','false'); }
  function closePopup(){ popup.setAttribute('aria-hidden','true'); }

  // backdrop/close buttons
  popup.addEventListener('click', (e) => {
    const t = e.target;
    if (t && t.getAttribute && t.getAttribute('data-close') === 'rosterPopup') closePopup();
  });

  let rosterCache = null;

  function cleanCell(v){
    const s = String(v ?? '').trim();
    return s;
  }

  function parseTeams(matrix){
    // matrix = [headers?, ...rows] from fetchGVIZ; we treat all rows as data
    if(!Array.isArray(matrix) || !matrix.length) return [];
    const rows = matrix;

    // S10RoasterHOME는 팀 블록이 위/아래로 2구간(예: 3팀 + 2팀)으로 나뉘어 있을 수 있음.
    // 그래서 "팀명" 행을 여러 개 찾아서 전부 합친다(중복 팀명 제거).
    const teams = [];
    const seen = new Set();

    const maxScan = Math.min(rows.length, 120);
    for(let teamRowIdx=0; teamRowIdx<maxScan; teamRowIdx++){
      const row = rows[teamRowIdx] || [];
      const teamLabelCount = row.filter(x => cleanCell(x)==='팀명').length;
      if (teamLabelCount < 2) continue;

      const starts = [];
      for(let c=0;c<row.length;c++){
        if (cleanCell(row[c]) === '팀명'){
          const name = cleanCell(row[c+1] || '');
          if (name) starts.push({ col:c, name });
        }
      }
      if (!starts.length) continue;

      for(let i=0;i<starts.length;i++){
        const start = starts[i].col;
        const end = (i < starts.length-1 ? starts[i+1].col : Math.max(start+4, row.length));
        const width = Math.max(4, end - start); // expect Tier+T+P+Z
        const name = starts[i].name;
        if (seen.has(name)) continue;
        seen.add(name);
        teams.push({ name, startCol:start, width, anchorRow: teamRowIdx });
      }
    }

    return teams;
  }

  function extractTeamRoster(rows, team){
    const s = team.startCol;
    const anchor = Number.isFinite(team.anchorRow) ? team.anchorRow : 0;

    // Heuristic: locate roster header row that has "티어" at s && "T" at s+1 (or within next few rows)
    let headerIdx = -1;
    for(let r=anchor; r<rows.length; r++){
      const a = cleanCell(rows[r]?.[s]);
      const b = cleanCell(rows[r]?.[s+1]);
      if (a === '티어' && (b === 'T' || b === 'P' || b === 'Z' || b === 'T P Z')){ headerIdx = r; break; }
      if (a === '티어' && cleanCell(rows[r+1]?.[s+1]) === 'T'){ headerIdx = r+1; break; }
    }

    let startScan = Math.max(anchor, headerIdx >= 0 ? headerIdx : anchor);

    // Meta + Logo extraction near top of block (감독/부감독만 표기)
    let logoUrl = '';
    let coach = '';
    let assistant = '';

    for(let r=anchor; r<startScan; r++){
      // 첫 번째 이미지 URL(팀 로고) 찾기
      if (!logoUrl){
        const urlCandidate = cleanCell(rows[r]?.[s] || rows[r]?.[s+1] || rows[r]?.[s+2] || '');
        if (/^https?:\/\//i.test(urlCandidate) && /\.(png|jpg|jpeg|webp)(\?|$)/i.test(urlCandidate)){
          logoUrl = urlCandidate;
        }
      }

      // 감독/부감독 셀 스캔
      const row = rows[r] || [];
      const maxC = Math.min(row.length, s+10);
      for(let c=s; c<maxC; c++){
        const cell = cleanCell(row[c]);
        if (!cell) continue;
        // 감독/부감독이 한 셀에 같이 들어있는 경우가 많아서(예: "감독 : DayDream 부감독 : DD 보호선수 : MARVEL")
        // 문자열에서 감독/부감독만 정확히 추출하고, "보호선수" 구간은 버린다.
        if ((!coach || !assistant) && (cell.includes('감독') || cell.includes('부감독'))){
          const cleaned = String(cell).replace(/\s+/g,' ').trim();
          // 보호선수 이후는 제거
          const noProt = cleaned.replace(/보호선수\s*[:：].*$/,'').trim();

          // Case A) "감독" / "부감독" 라벨만 있는 셀 (다음 셀에 아이디가 있는 형태)
          if(!coach && _normSeasonText(cell) === '감독'){
            const nxt = cleanCell(row[c+1] || '');
            if(nxt && !nxt.includes('부감독') && !nxt.includes('보호선수')) coach = nxt;
          }
          if(!assistant && _normSeasonText(cell) === '부감독'){
            const nxt = cleanCell(row[c+1] || '');
            if(nxt && !nxt.includes('감독') && !nxt.includes('보호선수')) assistant = nxt;
          }

          // Case B) 한 셀에 같이 들어있는 형태: "감독 : X 부감독 : Y ..."
          if (!coach){
            const mCoach = noProt.match(/감독\s*(?:[:：])?\s*([^:：]+?)(?=\s*부감독\s*(?:[:：])?|$)/);
            if (mCoach && mCoach[1]) coach = cleanCell(mCoach[1]);
          }
          if (!assistant){
            const mAsst = noProt.match(/부감독\s*(?:[:：])?\s*([^:：]+?)$/);
            if (mAsst && mAsst[1]) assistant = cleanCell(mAsst[1]);
          }
        }
      }
    }

    const out = [];
    // scan roster rows: tier in s; players in s+1..s+3
    for(let r=startScan; r<rows.length; r++){
      const tier = cleanCell(rows[r]?.[s]);
      const t = cleanCell(rows[r]?.[s+1]);
      const p = cleanCell(rows[r]?.[s+2]);
      const z = cleanCell(rows[r]?.[s+3]);
      if (!tier && !t && !p && !z) continue;

      if (tierSet.has(tier)){
        out.push({ tier, t, p, z });
      }

      // 다음 구간(아래쪽)으로 넘어가면 멈춤: 동일한 startCol에서 또 "팀명"이 나오면 다음 블록 시작이므로 stop
      if (r > startScan && cleanCell(rows[r]?.[s]) === '팀명') break;
    }

    return { roster: out, coach, assistant, logoUrl };
  }

function renderTeamMenu(teams){
    if(!teamListEl) return;
    teamListEl.innerHTML = '';
    teams.forEach((team, idx) => {
      const btn = document.createElement('button');
      btn.type='button';
      btn.className='roster-team-btn';
      btn.textContent = team.name;
      btn.addEventListener('click', () => selectTeam(team, btn));
      teamListEl.appendChild(btn);
      if(idx===0) setTimeout(()=>btn.click(), 0);
    });
  }

  function setActive(btn){
    teamListEl?.querySelectorAll('.roster-team-btn').forEach(b => b.classList.remove('active'));
    if(btn) btn.classList.add('active');
  }

  function renderRoster(roster){
    if(!rosterTableBody) return;
    rosterTableBody.innerHTML='';
    const frag=document.createDocumentFragment();
    roster.forEach(r => {
      const tr=document.createElement('tr');
      tr.innerHTML = `<td>${escapeHtml(r.tier)}</td><td>${escapeHtml(r.t)}</td><td>${escapeHtml(r.p)}</td><td>${escapeHtml(r.z)}</td>`;
      frag.appendChild(tr);
    });
    rosterTableBody.appendChild(frag);
  }

  // Minimal HTML escape
  function escapeHtml(str){
    return String(str ?? '')
      .replaceAll('&','&amp;')
      .replaceAll('<','&lt;')
      .replaceAll('>','&gt;')
      .replaceAll('"','&quot;')
      .replaceAll("'","&#39;");
  }

  async function ensureRosterData(){
    if (rosterCache) return rosterCache;
    const cfg = (window.SHEETS && window.SHEETS.roster) ? window.SHEETS.roster : null;
    if (!cfg) return null;
    const data = await fetchGVIZ(cfg);
    // fetchGVIZ returns [headers,...rows] sometimes; for this roster sheet we want raw values.
    // If first row contains '팀명' treat as data; otherwise keep all.
    rosterCache = Array.isArray(data) ? data : null;
    return rosterCache;
  }

  async function selectTeam(team, btn){
    setActive(btn);
    const rows = await ensureRosterData();
    if(!rows){ teamHeaderEl.textContent='로스터 데이터를 불러오지 못했습니다.'; return; }

    const { roster, coach, assistant, logoUrl } = extractTeamRoster(rows, team);

    // Header (logo + team name + 감독/부감독)
    const coachHtml = coach ? `<div class="roster-team-meta-line"><span class="label">감독</span><span class="value">${escapeHtml(coach)}</span></div>` : '';
    const asstHtml  = assistant ? `<div class="roster-team-meta-line"><span class="label">부감독</span><span class="value">${escapeHtml(assistant)}</span></div>` : '';

    if (logoUrl){
      teamHeaderEl.innerHTML = `
        <div class="roster-team-head">
          <img class="roster-team-logo" src="${escapeHtml(logoUrl)}" alt="${escapeHtml(team.name)} 로고">
          <div class="roster-team-text">
            <div class="roster-team-name roster-teamname-accent">${escapeHtml(team.name)}</div>
            <div class="roster-team-meta roster-teammeta-muted">${coachHtml}${asstHtml}</div>
          </div>
        </div>`;
    } else {
      teamHeaderEl.innerHTML = `
        <div class="roster-team-head">
          <div class="roster-team-text">
            <div class="roster-team-name roster-teamname-accent">${escapeHtml(team.name)}</div>
            <div class="roster-team-meta roster-teammeta-muted">${coachHtml}${asstHtml}</div>
          </div>
        </div>`;
    }

    renderRoster(roster);
    rosterMetaEl.innerHTML = '';
  }

  openBtn.addEventListener('click', async () => {
    openPopup();
    teamHeaderEl.textContent='로스터 불러오는 중...';
    rosterTableBody.innerHTML='';
    rosterMetaEl.innerHTML='';
    const rows = await ensureRosterData();
    if(!rows){ teamHeaderEl.textContent='로스터 데이터를 불러오지 못했습니다.'; return; }
    const teams = parseTeams(rows);
    if(!teams.length){ teamHeaderEl.textContent='팀 정보를 찾지 못했습니다.'; return; }
    renderTeamMenu(teams);
    teamHeaderEl.textContent='팀을 선택하세요';
  });
});


