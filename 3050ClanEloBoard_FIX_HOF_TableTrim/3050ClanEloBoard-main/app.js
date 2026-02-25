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

function renderTable(el, data){
  if(!el) return;
  const thead = el.querySelector('thead'), tbody = el.querySelector('tbody');
  if(!thead || !tbody) return;
  thead.innerHTML=''; tbody.innerHTML='';
  if(!data || !data.length) return;

  const header = data[0] || [];
  const colCount = header.length;

  const hr = document.createElement('tr');
  header.forEach(h=>{ const th=document.createElement('th'); th.textContent = (h ?? ''); hr.appendChild(th); });
  thead.appendChild(hr);

  (data.slice(1)||[]).forEach((r, idx)=>{
    const tr=document.createElement('tr');
    tr.dataset.rowIndex = String(idx);
    for(let i=0;i<colCount;i++){
      const v = (r||[])[i];
      const td=document.createElement('td');
      td.textContent = (v ?? '');
      tr.appendChild(td);
    }
    tbody.appendChild(tr);
  });
}

function applyTableDataLabels(tableEl){
  try{
    if(!tableEl) return;
    const ths = Array.from(tableEl.querySelectorAll('thead th'));
    const labels = ths.map(th => (th.textContent||'').trim());
    const rows = Array.from(tableEl.querySelectorAll('tbody tr'));
    rows.forEach(tr=>{
      const tds = Array.from(tr.children || []);
      tds.forEach((td, i)=>{
        if(!td || td.tagName !== 'TD') return;
        td.setAttribute('data-label', labels[i] || '');
      });
    });
  }catch(_){}
}



function percent(w,t){ return t? Math.round(w*1000/t)/10 : 0; }
function getRaceIcon(r){ const x=String(r||'').trim().toUpperCase(); if(x==='Z') return './z.png'; if(x==='P') return './p.png'; if(x==='T') return './t.png'; return ''; }

// Caches
let RANK_SRC=[], MATCH_SRC=[], ALL_CACHE=[], MEMBERS_CACHE=[], SCHED_CACHE=[];


// === Dashboard: Race vs Race winrates with mirror counts note ===






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
  const eloText = String(row[COL.J] ?? '');
  const awardsRaw = String(row[COL.L] ?? '');

  const data = MATCH_SRC.length? MATCH_SRC : await fetchGVIZ(SHEETS.matches);
  const MH = data[0]||[]; const M = data.slice(1);
  const you = normalizeId(playerName);
  const yourRows = M.filter(r=>{
    const w = normalizeId(r[ findIdx(MH, /승자\s*선수|winner/i) ]||'');
    const l = normalizeId(r[ findIdx(MH, /패자\s*선수|loser/i) ]||'');
    return (w===you || l===you);
  });

  // Helper to aggregate stats against opponent races for a subset of yourRows
  function aggAgainstOpp(subset){
    const counts = { Z:{w:0,l:0}, P:{w:0,l:0}, T:{w:0,l:0} };
    subset.forEach(r=>{
      const opp = computeOpponentRaceFromRow(MH,r,you);
      const key = /^[ZPT]/i.test(opp) ? opp[0].toUpperCase() : null;
      if(!key) return;
      const res = computeResultForYou(MH,r,you);
      if(res==='W') counts[key].w++; else if(res==='L') counts[key].l++;
    });
    const tot = { w: counts.Z.w+counts.P.w+counts.T.w, l: counts.Z.l+counts.P.l+counts.T.l };
    return {counts:counts, total:tot};
  }

  // Block 1: current race only
  const curRows = yourRows.filter(r => computeRaceFromRow(MH,r,you) === currentRace);
  const curStats = aggAgainstOpp(curRows);

  // Block 2+: OFF races (only those existing)
  const offRaces = ['Z','P','T'].filter(x=> x!==currentRace);
  const offBlocks = [];
  offRaces.forEach(race=>{
    const sub = yourRows.filter(r => computeRaceFromRow(MH,r,you) === race);
    if(sub.length===0) return; // show only if exists
    const st = aggAgainstOpp(sub);
    const z=st.counts.Z, p=st.counts.P, t=st.counts.T;
    const tot = st.total;
    offBlocks.push(`
      <h3>상대 종족별 성적 (${race})</h3>
      <table class="detail"><thead>
        <tr><th>저그전</th><th>프로토스전</th><th>테란전</th><th>총전적</th><th>승률</th></tr>
      </thead><tbody>
        <tr>
          <td>${fmtCell(z)}</td>
          <td>${fmtCell(p)}</td>
          <td>${fmtCell(t)}</td>
          <td>${fmtCell(tot)}</td>
          <td>${tot.w+tot.l? Math.round(tot.w*1000/(tot.w+tot.l))/10 : 0}%</td>
        </tr>
      </tbody></table>
    `);
  });
  // === 공식/이벤트 대회 성적 집계 ===
// I열(리그명)을 '그대로' 사용하여 대회명별 전적을 집계합니다.
// 승패 판정: C열(승자 선수) == 본인 → 승, F열(패자 선수) == 본인 → 패
// 출력 형식: `<리그명> 총전/승/패/승률` 예) 프로리그 20전 18승 2패 (90%)
  const iLeague = findIdx(MH, /리그명|league/i);
  const iWinner = findIdx(MH, /승자\s*선수|winner/i);
  const iLoser  = findIdx(MH, /패자\s*선수|loser/i);

  // 안전 가드
  const leagueAgg = {}; // {"리그명": {w, l}}
  yourRows.forEach(rr => {
    const lg = String(iLeague >= 0 ? rr[iLeague] : "").trim();
    if (!lg) return;
    const winName = lc(rr[iWinner] || "");
    const loseName = lc(rr[iLoser]  || "");
    const res = (winName === you) ? 'W' : (loseName === you ? 'L' : '');
    if (!res) return;
    leagueAgg[lg] = leagueAgg[lg] || { w:0, l:0 };
    if (res === 'W') leagueAgg[lg].w++;
    else if (res === 'L') leagueAgg[lg].l++;
  });

  // 표용 HTML 생성 (총전 많은 순으로 정렬)
  const leagueRows = Object.entries(leagueAgg)
    .map(([name, v]) => ({ name, total: v.w + v.l, w: v.w, l: v.l, pct: (v.w+v.l) ? Math.round(v.w*1000/(v.w+v.l))/10 : 0 }))
    .sort((a, b) => b.total - a.total);


// === 상대전(H2H) 집계: "가장 승을 많이 올린 상대" + "최다 매치 TOP5" ===
// ✅ 요청사항 반영: (개인전)경기기록데이터 탭에서
//  - 본인 승리 시 L열 점수 합산
//  - 본인 패배 시 O열 점수 합산
//  → 상대별 합산값을 "상대 ELO포인트"로 표시 (+면 ▲, -면 ▼)

// (개인전)경기기록데이터는 별도 스프레드시트(URLS_V12.matches)에서 읽습니다.
let matchLog = [];
try{
  // sheet 이름은 사용자가 제공한 그대로
  matchLog = await fetchGVIZ({ id: "1F6Ey-whXAsTSMCWVmfexGd77jj6WDgv6Z7hkK3BHahs", sheet: "(개인전)경기기록데이터", range: "A:O" });
}catch(e){ matchLog = []; }

const oppAgg = {}; // {상대ID: {w,l, elo}}
const toNum = (v)=>{
  const s = String(v??'').replace(/,/g,'').trim();
  if(!s) return 0;
  const n = Number(s);
  return Number.isFinite(n) ? n : 0;
};

if(matchLog && matchLog.length>1){
  const H2 = matchLog[0]||[];
  const R2 = matchLog.slice(1);
  const iW2 = findIdx(H2, /승자\s*선수|winner/i);
  const iL2 = findIdx(H2, /패자\s*선수|loser/i);

  // L열(12번째) / O열(15번째) — 0-indexed
  const idxWinDelta = 11;  // L
  const idxLoseDelta = 14; // O

  R2.forEach(rr=>{
    const winRaw = (iW2>=0? rr[iW2] : '') || '';
    const loseRaw= (iL2>=0? rr[iL2] : '') || '';
    const winName = normalizeId(winRaw);
    const loseName= normalizeId(loseRaw);

    const isWin = (winName === you);
    const isLose= (loseName === you);
    if(!isWin && !isLose) return;

    const oppRaw = String(isWin ? loseRaw : winRaw).split('/')[0].trim();
    const oppKey = normalizeId(oppRaw);
    if(!oppKey) return;

    oppAgg[oppKey] = oppAgg[oppKey] || { disp: oppRaw, w:0, l:0, elo:0 };
    if (oppRaw && (!oppAgg[oppKey].disp || oppRaw.length > oppAgg[oppKey].disp.length)) oppAgg[oppKey].disp = oppRaw;

    if(isWin) oppAgg[oppKey].w++;
    if(isLose) oppAgg[oppKey].l++;

    // 요청 기준: 승리=L, 패배=O
    const delta = isWin ? toNum(rr[idxWinDelta]) : toNum(rr[idxLoseDelta]);
    oppAgg[oppKey].elo += delta;
  });
}

const oppRows = Object.entries(oppAgg).map(([key,v])=>{ const name = v.disp || key; 
  const total = (v.w||0) + (v.l||0);
  const pct = total ? Math.round((v.w||0)*1000/total)/10 : 0;
  const elo = Math.round((v.elo||0)*10)/10;
  return { name, total, w:v.w||0, l:v.l||0, pct, elo };
});

const mostWinOpp = oppRows
  .slice()
  .sort((a,b)=> (b.w-a.w) || (b.total-a.total) || (a.name>b.name?1:-1))[0] || null;

const topMatch5 = oppRows
  .slice()
  .sort((a,b)=> (b.total-a.total) || (b.w-a.w) || (a.name>b.name?1:-1))
  .slice(0,5);

const leagueHtml = `
    <h3>공식 및 이벤트대회 성적 (리그명 기준)</h3>
    <div class="table-wrap">
      <table class="detail">
        <thead>
          <tr><th>리그명</th><th>총전적</th><th>승</th><th>패</th><th>승률</th></tr>
        </thead>
        <tbody>
          ${leagueRows.map(r => `<tr>
            <td>${r.name}</td>
            <td>${r.total}전</td>
            <td>${r.w}</td>
            <td>${r.l}</td>
            <td>${r.pct}%</td>
          </tr>`).join("")}
        </tbody>
      </table>
    </div>
  `;

  const h2hHtml = (()=> {
    const fmtDelta = (n)=>{
      const v = Math.round((Number(n||0))*10)/10;
      const sign = v>0 ? "+" : "";
      return sign + v.toFixed(1);
    };
    const arrow = (v)=>{
      const n = Number(v||0);
      if(n>0) return `<span class="h2h-arrow up">▲</span>`;
      if(n<0) return `<span class="h2h-arrow down">▼</span>`;
      return `<span class="h2h-arrow flat">–</span>`;
    };
    const normId = (s)=> String(s||'').split('/')[0].trim();
    const getEloOf = (pid)=>{
      const target = lc(normId(pid));
      const rr = rows.find(r=> lc(normId(r[COL.B])) === target);
      return rr ? String(rr[COL.J] ?? '').trim() : '-';
    };

    if(!mostWinOpp){
      return `
        <hr class="gold"/>
        <h3>가장 승을 많이 올린 상대</h3>
        <div class="muted" style="margin-top:8px">데이터 없음</div>
      `;
    }

    const oppId = mostWinOpp.name;
    const leftWins = mostWinOpp.w || 0;
    const rightWins = mostWinOpp.l || 0;
    const total = leftWins + rightWins;
    const leftRate = total ? (Math.round(leftWins*1000/total)/10).toFixed(1) : "0.0";
    const rightRate = total ? (Math.round(rightWins*1000/total)/10).toFixed(1) : "0.0";

    const myEloNow = String(eloText||'-');
    const oppEloNow = getEloOf(oppId);

    const delta = mostWinOpp.elo || 0;

    const top5 = (topMatch5 && topMatch5.length) ? `
      <div class="h2h-top5">
        ${topMatch5.map(r=>{
          const d = r.elo || 0;
          return `
            <div class="h2h-top5-item">
              <div class="h2h-top5-name blue"><a href="#" class="h2h-player-link" data-player="${r.name}">${r.name}</a></div>
              <div class="h2h-top5-rec">${r.total}전 (${r.w}승 ${r.l}패) · ${r.pct}%</div>
              <div class="h2h-top5-elo">ELO포인트: ${fmtDelta(d)} ${arrow(d)}</div>
            </div>
          `;
        }).join('')}
      </div>
    ` : `<div class="muted" style="margin-top:8px">데이터 없음</div>`;

    return `
      <hr class="gold"/>
      <h3>가장 승을 많이 올린 상대</h3>
      <div class="h2h-matchup">
        <div class="h2h-side">
          <div class="h2h-id red">${playerName}</div>
          <div class="h2h-elo-now">현재 ELO : <strong>${myEloNow}</strong></div>
          <div class="h2h-wins">${leftWins}</div>
          <div class="h2h-winrate">${leftRate}% WINS</div>
        </div>

        <div class="h2h-center">
          <div class="h2h-vs">VS</div>
          <div class="h2h-delta">${oppId} 상대 ELO포인트 : <strong>${fmtDelta(delta)}</strong> ${arrow(delta)}</div>
        </div>

        <div class="h2h-side">
          <div class="h2h-id blue"><a href="#" class="h2h-player-link" data-player="${oppId}">${oppId}</a></div>
          <div class="h2h-elo-now">현재 ELO : <strong>${oppEloNow}</strong></div>
          <div class="h2h-wins">${rightWins}</div>
          <div class="h2h-winrate">${rightRate}% WINS</div>
        </div>
      </div>

      <h3 style="margin-top:14px">최다 매치 TOP 5</h3>
      ${top5}
    `;
  })();

  if(body){
    const cz=curStats.counts.Z, cp=curStats.counts.P, ct=curStats.counts.T, ctot=curStats.total;
    body.innerHTML = `
      <div class="grid">
        <div class="row"><span class="badge">플레이어</span> <strong>${playerName}</strong></div>
        <div class="row"><span class="badge">주종</span> ${currentRace}</div>
        <div class="row"><span class="badge">티어</span> ${tier||'-'}</div>
        <div class="row"><span class="badge">ELO</span> ${eloText} (${row[0] ? row[0] + "위" : "-위"})</div>
      </div>
      <h3>상대 종족별 성적 (주종: ${currentRace})</h3>
      <table class="detail"><thead>
        <tr><th>저그전</th><th>프로토스전</th><th>테란전</th><th>총전적</th><th>승률</th></tr>
      </thead><tbody>
        <tr>
          <td>${fmtCell(cz)}</td>
          <td>${fmtCell(cp)}</td>
          <td>${fmtCell(ct)}</td>
          <td>${fmtCell(ctot)}</td>
          <td>${ctot.w+ctot.l? Math.round(ctot.w*1000/(ctot.w+ctot.l))/10 : 0}%</td>
        </tr>
      </tbody></table>
      ${offBlocks.join('')}
      <hr class="gold"/>
      <h3>주요성적</h3>
      <div class="awards">${awardsRaw || '-'}
      <hr class="gold"/>
      <h3>티어 변동추이</h3>
      <div class="chart-wrap"><canvas id="tierTrendChart" height="85"></canvas></div>
      <script>/* placeholder to keep HTML validators happy */</script>
      <hr class="gold"/>
      ${leagueHtml}
      ${h2hHtml}

    `;


      // ✅ H2H/Top5 아이디 클릭 → 해당 선수 상세로 이동
      try{
        body.querySelectorAll('.h2h-player-link').forEach(a=>{
          a.addEventListener('click', ev=>{
            ev.preventDefault();
            ev.stopPropagation();
            const pid = (a.getAttribute('data-player') || a.textContent || '').trim();
            if(pid && typeof openPlayer==='function') openPlayer(pid);
          });
        });
      }catch(_e){}
  }

  
  
  
  // === 티어 변동추이 (PlayerTier 시트 D~마지막 + 현재티어 A열 추가, Y축: 갓(1)~히든(7)) ===
try {
  const tierSrc = { id:"1F6Ey-whXAsTSMCWVmfexGd77jj6WDgv6Z7hkK3BHahs", sheet:"PlayerTier", range:"A:ZZ" };
  const T = await fetchGVIZ(tierSrc);
  if (T.length) {
    const T_HEADERS = (T[0] || []).map(x => String(x||"").trim());
    const T_ROWS = T.slice(1);

    // 현재 선수 행 찾기 (B열: 이름)
    let rowMine = null;
    for (const r of T_ROWS) {
      const nm = String((r[1]||'')).split('/')[0].trim().toLowerCase();
      if (nm === you) { rowMine = r; break; }
    }

    if (rowMine) {
      // A열 = 현재티어(문자), D~last = 변동회차
      const currentTierNameA = String(rowMine[0]||'').trim();
      const labels = [];
      const dataVals = [];
      const startCol = 3; // D=3 (0-indexed)

      for (let c = startCol; c < rowMine.length; c++) {
        const head = String(T_HEADERS[c]||'').trim();
        const val  = String(rowMine[c]||'').trim();
        if (!head) continue;                 // 헤더 없는 열 제외
        if (!val || val === '-') continue;   // 빈칸/하이픈 제외
        const mapped = TIER_TO_NUM[val];
        if (!mapped) continue;
        labels.push(head);
        dataVals.push(mapped);
      }

      // 마지막 열 뒤에 "현재티어" (A열) 추가
      if (currentTierNameA) {
        const mappedA = TIER_TO_NUM[currentTierNameA];
        if (mappedA) {
          labels.push('현재티어');
          dataVals.push(mappedA);
        }
      }

      // 그래프 렌더
      if (labels.length) {
        const el2 = document.getElementById('tierTrendChart')?.getContext('2d');
        if (el2){
          if (tierTrendChart && typeof tierTrendChart.destroy==='function'){ try{ tierTrendChart.destroy(); }catch(e){} }
          const lastVal = dataVals[dataVals.length-1];
          const lastTierName = NUM_TO_TIER[lastVal] || currentTierNameA || '-';
          tierTrendChart = new Chart(el2, {
            type: 'line',
            data: {
              labels,
              datasets: [{
                label: `티어변동추이 : ${lastTierName}`,
                data: dataVals,
                pointRadius: 3,
                fill: false,
                tension: 0.12,
                borderColor: '#e74c3c',
                backgroundColor: '#e74c3c'
              }]
            },
            options: {
              responsive: true,
              plugins: {
                legend: { display: true, labels:{usePointStyle:true} },
                datalabels: { display: false }
              },
              scales: {
                y: {
                  min: 1, max: 7,
                  reverse: true, // 갓(1) 맨 위 ~ 히든(7) 맨 아래
                  ticks: {
                    stepSize: 1,
                    callback: v => NUM_TO_TIER[v] || v
                  }
                }
              },
              layout: { padding: { top: 8, bottom: 8 } }
            }
          });
        }
      }
    }
  }
} catch(e){ console.warn('tier trend error', e); }

// === ELO 변동추이 (전원 공통: '(개인전)경기기록데이터' / 승자 C→M, 패자 F→P, 날짜별 최종값) ===
  try{
    const eloSrc = { id:"1F6Ey-whXAsTSMCWVmfexGd77jj6WDgv6Z7hkK3BHahs", sheet:"(개인전)경기기록데이터", range:"A:Z" };
    const E = await fetchGVIZ(eloSrc);
    if (!E.length) throw new Error("개인전 시트 비어있음");
    const ER = E.slice(1);

    // 고정 컬럼 (0-based): A=0(날짜), C=2(승자ID), F=5(패자ID), M=12(경기후 승자ELO), P=15(경기후 패자ELO)
    const COL_DATE=0, COL_WIN=2, COL_LOSE=5, COL_POST_WIN=12, COL_POST_LOSE=15;

    const cleanNum = (x)=>{
      const s = String(x ?? '').replace(/[^0-9.\-]/g,'').trim();
      if(!s) return NaN;
      const n = Number(s);
      return Number.isFinite(n) ? n : NaN;
    };
    const dateKey = (x)=>{
      const s = String(x ?? '').trim();
      if(!s) return null;
      const t = s.replace(/\./g,'-').replace(/\//g,'-');
      const m = t.match(/(\d{4})-(\d{1,2})-(\d{1,2})/);
      if(!m) return null;
      const yy=m[1], mm=String(m[2]).padStart(2,'0'), dd=String(m[3]).padStart(2,'0');
      return `${yy}-${mm}-${dd}`;
    };

    const me = normalizeId(playerName);

    // 날짜별 최종(시트상 마지막 행) 경기후 ELO를 모음
    const byDay = new Map(); // key -> {key, post}
    for (let i=0;i<ER.length;i++){
      const r = ER[i]||[];
      const w = normalizeId(r[COL_WIN]);
      const l = normalizeId(r[COL_LOSE]);
      if (w!==me && l!==me) continue;

      const k = dateKey(r[COL_DATE]);
      if (!k) continue;

      const post = (w===me) ? cleanNum(r[COL_POST_WIN]) : cleanNum(r[COL_POST_LOSE]);
      if (!Number.isFinite(post)) continue;

      byDay.set(k, { key:k, post });
    }

    const daily = Array.from(byDay.values()).sort((a,b)=> a.key.localeCompare(b.key));
    if (body){
      body.insertAdjacentHTML('beforeend', `
        <hr class="gold"/>
        <h3>ELO 변동추이</h3>
        <div class="chart-wrap"><canvas id="eloChart" height="170"></canvas></div>
      `);

      const labels = daily.map(x=>x.key);
      const series = daily.map(x=> Math.round(x.post*10)/10);

      // 마지막 점을 현재 표시 ELO와 동기화(표시 불일치 방지)
      const cur = Number(String(eloText).replace(/[^0-9.\-]/g,''));
      if (Number.isFinite(cur) && series.length){
        series[series.length-1] = Math.round(cur*10)/10;
      }

      const ctx = document.getElementById('eloChart')?.getContext('2d');
      if (ctx){
        if (eloChart && typeof eloChart.destroy==='function'){ try{ eloChart.destroy(); }catch(e){} }
        eloChart = new Chart(ctx, {
          type:'line',
          data:{ labels, datasets:[{ label:'경기후 ELO', data: series, fill:false, tension:0.15, pointRadius:2 }]},
          options:{
            responsive:true,
            plugins:{
              legend:{ display:true },
              title:{ display:true, text:'ELO 변동 추이 (개인전 경기기록데이터 기준, 날짜별 최종값)' },
              datalabels:{ display:false }
            },
            scales:{ y:{ title:{ display:true, text:'ELO' } } }
          }
        });
      }
    }
  }catch(e){ console.warn('elo v5 error', e); }
// --- 최근 10경기 승패 그래프 및 테이블 (중복 제거 버전) ---
try {
  const iDate = findIdx(MH, /경기일자|date/i);
  const iWinN = findIdx(MH, /승자\s*선수|winner/i);
  const iLoseN = findIdx(MH, /패자\s*선수|loser/i);
  const iMap = findIdx(MH, /맵|map/i);
  const iLeague = findIdx(MH, /리그명|league/i);

  const seq = yourRows.map(r=>({
    d:String(iDate>=0? r[iDate]:""),
    res:(lc(r[iWinN]||"")===you)?"W":"L"
  })).sort((a,b)=> (a.d > b.d ? 1 : -1));
  const last10 = seq.slice(-10);

  if (body && last10.length){
    // 그래프
    body.insertAdjacentHTML('beforeend', `
      <hr class="gold"/>
      <h3>최근 10경기 승패</h3>
      <div class="chart-wrap"><canvas id="recent5Chart" height="120"></canvas></div>
    `);

    // 테이블 (중복방지)
    const rows10 = (yourRows.map(r=>({
      d:String(iDate>=0? r[iDate]:""),
      res:(lc(r[iWinN]||"")===you)?"W":"L",
      w:String(r[iWinN]||""),
      l:String(iLoseN>=0? r[iLoseN]:""),
      m:String(iMap>=0? r[iMap]:""),
      lg:String(iLeague>=0? r[iLeague]:"")
    })).sort((a,b)=> (a.d > b.d ? 1 : -1))).slice(-10).reverse();

    const rowHtml = rows10.map(r=>{
      const opp = (lc(r.w)===you) ? r.l : r.w;
      const resTxt = r.res === "W" ? "승" : "패";
      return `<tr><td>${r.d||""}</td><td>${opp||""}</td><td>${resTxt}</td><td>${r.m||""}</td><td>${r.lg||""}</td></tr>`;
    }).join("");

    body.insertAdjacentHTML('beforeend', `
      <hr class="gold"/>
      <h3>최근 10경기 (테이블)</h3>
      <div class="table-wrap">
        <table id="recent5Table">
          <thead>
            <tr><th>경기일자</th><th>상대</th><th>결과</th><th>맵</th><th>리그</th></tr>
          </thead>
          <tbody>${rowHtml}</tbody>
        </table>
      </div>
      <!-- 맵별 종족전 전적/승률 표 -->
      <div id="mapStatsWrap"></div>

    `);

    // === Map-by-opponent-race stats for last 5 games ===
    try{
      const mapWrap = document.getElementById('mapStatsWrap');
      if (mapWrap){
        const counts = {}; // {map: {Z:{w:0,l:0}, P:{w:0,l:0}, T:{w:0,l:0}}}
        yourRows.forEach(r0=>{
          const m = (iMap>=0 ? String(r0[iMap]||'') : '') || '(맵미상)';
          const oppRace = computeOpponentRaceFromRow(MH, r0, you);
          const key = /^[ZPT]/i.test(oppRace) ? oppRace[0].toUpperCase() : null;
          if(!key) return;
          counts[m] = counts[m] || {Z:{w:0,l:0},P:{w:0,l:0},T:{w:0,l:0}};
          const res = computeResultForYou(MH, r0, you);
          if (res==='W') counts[m][key].w++; else if(res==='L') counts[m][key].l++;
        });
        const rowsHtml = Object.entries(counts).map(([m,v])=>{
          const tot = ['Z','P','T'].reduce((acc,k)=> acc + v[k].w + v[k].l, 0);
          const wins = ['Z','P','T'].reduce((acc,k)=> acc + v[k].w, 0);
          const pct = tot ? Math.round(wins*1000/tot)/10 : 0;
          function cell(o){ const t=o.w+o.l; return `${t}전 ${o.w}승 ${o.l}패`; }
          return `<tr>
            <td>${m}</td>
            <td>${cell(v.Z)}</td>
            <td>${cell(v.P)}</td>
            <td>${cell(v.T)}</td>
            <td>${tot}전</td>
            <td>${pct}%</td>
          </tr>`;
        }).join("");
        mapWrap.innerHTML = `
          <h3>맵별데이터</h3>
          <div class="table-wrap">
            <table class="detail">
              <thead><tr><th>맵</th><th>저그전</th><th>프로토스전</th><th>테란전</th><th>총</th><th>승률</th></tr></thead>
              <tbody>${rowsHtml}</tbody>
            </table>
          </div>
        `;
      }
    }catch(e){ console.warn('mapStats error', e); }


    // 그래프 생성
    const ctxR = document.getElementById('recent5Chart')?.getContext('2d');
    if (ctxR) {
      if (recent5Chart && typeof recent5Chart.destroy === 'function') {
        try { recent5Chart.destroy(); } catch(e){}
      }
      const labels = last10.map((_,i)=>`G${i+1}`);
      const data = last10.map(g => g.res === 'W' ? 1 : -1);
      const colors = last10.map(g => g.res === 'W' ? '#3498db' : '#e74c3c');

      recent5Chart = new Chart(ctxR, {
        type: 'bar',
        data: {
          labels,
          datasets: [{
            label: '승(1) / 패(-1)',
            data,
            backgroundColor: colors,
            borderRadius: 6
          }]
        },
        options: {
          responsive: true,
          plugins: {
            legend: { display: false },
            title: { display: true, text: '최근 10경기' },
            datalabels: { display: true, formatter: (v) => v > 0 ? 'W' : 'L' }
          },
          scales: {
            y: {
              min: -1,
              max: 1,
              ticks: { stepSize: 1 },
              title: { display: true, text: '결과' }
            }
          }
        }
      });
    }
  }
} catch(e) {
  console.warn('recent5 chart error', e);
}
activate('player');

  } catch(e){ console.warn('openPlayer error', e); }
  finally { window.__openingPlayer = false; }
}
window.openPlayer = openPlayer;
$('playerClose')?.addEventListener('click', ()=> activate('rank'));


// ===== H2H (FINAL: 요약 2색 + 맵별 가로형) =====
const h2hHeaders = ["경기일자","승자티어","승자선수","승자종족","패자티어","패자선수","패자종족","맵","리그명","티어차이"];
let h2hOutcomeChart = null, h2hMapChart = null;

function destroyChartSafe(chartRef){
  if (chartRef && typeof chartRef.destroy === 'function'){
    try { chartRef.destroy(); } catch(e){}
  }
}

$('h2hRun')?.addEventListener('click', async () => {
  const p1Raw = $('h2hP1')?.value || '';
  const p2Raw = $('h2hP2')?.value || '';
  const qMap  = lc($('h2hMap')?.value || '');
  const p1 = lc(p1Raw), p2 = lc(p2Raw);

  const data = await fetchGVIZ(SHEETS.matches);
  if (!data.length) return;
  const H = data[0] || [], rows = data.slice(1);

  const C = findIdx(H, /승자\s*선수|winner/i);
  const F = findIdx(H, /패자\s*선수|loser/i);
  const L = findIdx(H, /리그명|league/i);
  const M = findIdx(H, /맵|map/i);

  // 필수: 두 선수 모두 입력 시만 요약 + 맵별 그래프를 그림
  if (p1 && p2){
    let filtered = rows.filter(r =>
      (normalize(r[C])===p1 && normalize(r[F])===p2) ||
      (normalize(r[C])===p2 && normalize(r[F])===p1)
    );
    const L = findIdx(H, /리그명|league/i);
    if (qMap && L >= 0) filtered = filtered.filter(r => lc(r[L]).includes(qMap));

    // 승수 집계
    const p1Wins = rows.filter(r => normalize(r[C])===p1 && normalize(r[F])===p2).length;
      const p2Wins = rows.filter(r => normalize(r[C])===p2 && normalize(r[F])===p1).length;

    // 1) 경기별 승패 변동(요약) - 2색 세로 막대
    const ctx1 = $('h2hOutcomeChart')?.getContext('2d');
    if (ctx1){
      $('h2hOutcomeWrap').style.display = 'block';
      destroyChartSafe(h2hOutcomeChart);
      h2hOutcomeChart = new Chart(ctx1, {
        type: 'bar',
        data: {
          labels: [p1Raw || '플레이어1', p2Raw || '플레이어2'],
          datasets: [{
            label: '승리 수',
            data: [p1Wins, p2Wins],
            backgroundColor: ['#3498db', '#e74c3c'], // 파랑, 빨강
            borderRadius: 8
          }]
        },
        options: {
          responsive: true,
          plugins: {
            legend: { display: false },
            title: { display: true, text: '경기별 승패 변동 (요약)' }
          },
          scales: { y: { beginAtZero: true, title: { display: true, text: '승리 수' }, ticks: { stepSize: 1 } } }
        }
      });
    }

    // 2) 맵별 승패 변동(요약) - 가로형 2색
    const mapCounts = {};
    filtered.forEach(r=>{
      const m = M>=0 ? String(r[M]||'') : '(맵미상)';
      (mapCounts[m] ??= { p1:0, p2:0 });
      if (normalize(r[C])===p1) mapCounts[m].p1++;
      else mapCounts[m].p2++;
    });
    const labels = Object.keys(mapCounts);
    const p1Data = labels.map(k=> mapCounts[k].p1);
    const p2Data = labels.map(k=> mapCounts[k].p2);

    const ctx2 = $('h2hMapChart')?.getContext('2d');
    if (ctx2){
      $('h2hMapWrap').style.display = 'block';
      destroyChartSafe(h2hMapChart);
      h2hMapChart = new Chart(ctx2, {
        type: 'bar',
        data: {
          labels,
          datasets: [
            { label: p1Raw || '플레이어1', data: p1Data, backgroundColor: '#3498db' },
            { label: p2Raw || '플레이어2', data: p2Data, backgroundColor: '#e74c3c' }
          ]
        },
        options: {
          indexAxis: 'y',
          responsive: true,
          plugins: {
            legend: { display: true },
            title: { display: true, text: '맵별 승패 변동 (요약)' }
          }
        }
      });
    }

    // 표: 그대로
    renderTable($('h2hTable'), [h2hHeaders, ...filtered]);
  } else {
    // 한 명만 입력된 경우엔 표만 필터
    let rows2 = rows;
    if (p1) rows2 = rows2.filter(r => normalize(r[C])===p1 || normalize(r[F])===p1);
    else if (p2) rows2 = rows2.filter(r => normalize(r[C])===p2 || normalize(r[F])===p2);
    if (qMap && M>=0) rows2 = rows2.filter(r => lc(r[M]).includes(qMap));
    $('h2hOutcomeWrap').style.display = 'none';
    $('h2hMapWrap').style.display = 'none';
    renderTable($('h2hTable'), [h2hHeaders, ...rows2]);
  }
});

['h2hP1','h2hP2','h2hMap'].forEach(id => {
  $(id)?.addEventListener('keydown', e => { if (e.key==='Enter') $('h2hRun').click(); });
});

// 초기화 버튼
$('h2hReset')?.addEventListener('click', () => {
  ['h2hP1','h2hP2','h2hMap'].forEach(id => { const el=$(id); if(el) el.value=''; });
  $('h2hOutcomeWrap').style.display = 'none';
  $('h2hMapWrap').style.display = 'none';
  renderTable($('h2hTable'), [h2hHeaders]);
});
// ===== Pro Rank (AS-IS) =====

// ===== Pro Rank (IMAGE() 대응 & 중괄호 수정 완료 버전) =====
async function loadProRank(){
  const t = $('proRankTable');
  const d = await fetchGVIZ(SHEETS.proRank);
  if (!d.length){
    if (t) t.outerHTML = '<div class="status err">프로리그순위 데이터 없음</div>';
    return;
  }

  const thead = t.querySelector('thead');
  const tbody = t.querySelector('tbody');
  thead.innerHTML = '';
  tbody.innerHTML = '';

  const header = d[0] || [];

  // 헤더에서 로고/팀명 컬럼 자동 감지
  const logoIdx = header.findIndex(h => /로고|logo/i.test(String(h||'')));
  const teamIdx = header.findIndex((h, idx) => idx !== logoIdx && /팀명|팀/i.test(String(h||'')));

  const rankIdx = header.findIndex(h => /순위|rank/i.test(String(h||'')));

  const indices = header.map((_, i) => i).filter(i => i !== logoIdx);

  // 헤더 렌더 (로고 컬럼은 숨김)
  const hr = document.createElement('tr');
  indices.forEach(i => {
    const th = document.createElement('th');
    th.textContent = header[i] || '';
    hr.appendChild(th);
  });
  thead.appendChild(hr);

  // 본문
  d.slice(1).forEach(r => {
    const tr = document.createElement('tr');

    const rankVal = (rankIdx >= 0) ? parseInt((r||[])[rankIdx], 10) : NaN;
    const rowRank = (Number.isFinite(rankVal) ? rankVal : (tbody.children.length + 1));

    indices.forEach(i => {
      const td = document.createElement('td');
      const v = (r||[])[i];

      // 팀명 셀은 '로고만' 표시 (셀 크기에 맞춰 자동 축소/확대)
      if (i === teamIdx){
        td.classList.add('logo-only-cell');

        // 1) 로고컬럼이 있으면 그 값을 사용
        let logoVal = (logoIdx >= 0) ? (r||[])[logoIdx] : null;

        // 2) 혹시 팀명 셀에 URL이 섞여있으면 거기서도 추출(백업)
        const teamStr = (v ?? '') + '';
        if (!logoVal && /https?:\/\//i.test(teamStr)) logoVal = teamStr;

        const match = (logoVal + '').match(/https?:\/\/[\S")]+/i);
        if (match){
          const wrap = document.createElement('div');
          wrap.className = 'logo-wrap';

          const img = document.createElement('img');
          img.src = match[0];
          img.alt = '팀로고';
          img.className = 'team-logo';
          wrap.appendChild(img);

          td.appendChild(wrap);
        } else {
          td.textContent = '';
        }

        // 팀명은 셀에 표시하지 않고, 툴팁으로만 제공
        let nameText = teamStr.replace(/https?:\/\/[\S")]+/ig, '').replace(/[()"]/g,'').trim();
        if (!nameText) nameText = teamStr.trim();
        if (nameText) td.title = nameText;
      } else {
        // 순위 셀: (왼쪽) 왕관/별표 + (오른쪽) 숫자
        if (i === rankIdx){
          td.classList.add('rank-cell');
          const inline = document.createElement('div');
          inline.className = 'rank-inline';

          // badge
          if (rowRank === 1 || rowRank === 2 || rowRank === 3){
            const crown = document.createElement('img');
            crown.className = 'rank-badge';
            crown.alt = 'crown';
            crown.src = (rowRank === 1) ? 'crown_gold.png' : (rowRank === 2) ? 'crown_silver.png' : 'crown_bronze.png';
            inline.appendChild(crown);
          } else if (rowRank === 4){
            const star = document.createElement('span');
            star.className = 'rank-star-inline';
            star.textContent = '*';
            inline.appendChild(star);
          } else {
            const spacer = document.createElement('span');
            spacer.className = 'rank-spacer';
            spacer.textContent = '';
            inline.appendChild(spacer);
          }

          const num = document.createElement('span');
          num.className = 'rank-num';
          num.textContent = (v ?? '');
          inline.appendChild(num);

          td.appendChild(inline);
        } else {
          td.textContent = v ?? '';
        }
      }

      tr.appendChild(td);
    });

    tbody.appendChild(tr);
  });
}


// ===== Schedule (AS-IS + popup open) =====
const schedStatus=$('schedStatus'); const schedTable=$('schedTable');
async function loadSchedule(){
  if(schedStatus) schedStatus.textContent='불러오는 중…';
  const cfg = Object.assign({}, SHEETS.sched, { range: SHEETS.sched.range });
  const data = await fetchGVIZ(cfg);
  if(!data.length){ if(schedStatus) schedStatus.textContent='데이터 없음/권한/CORS 문제'; return; }
  SCHED_CACHE = data;
  renderTable(schedTable, [data[0], ...data.slice(1).filter(r=> (r||[]).some(c=> String(c||'').trim()!==''))]);
  if(schedStatus) schedStatus.textContent=`불러오기 완료 • ${data.length-1}행`;
}
function filterSchedule(q){
  if(!SCHED_CACHE.length) return;
  const Q = String(q||'').trim().toLowerCase();
  if(!Q){ renderTable(schedTable, [SCHED_CACHE[0], ...SCHED_CACHE.slice(1)]); return; }
  const rows = SCHED_CACHE.slice(1).filter(r => (r||[]).some(c => String(c||'').toLowerCase().includes(Q)));
  renderTable(schedTable, [SCHED_CACHE[0], ...rows]);
}
$('schedSearchBtn')?.addEventListener('click', ()=> filterSchedule($('schedQuery')?.value));
$('schedResetBtn')?.addEventListener('click', ()=>{ const i=$('schedQuery'); if(i) i.value=''; filterSchedule(''); });
$('schedQuery')?.addEventListener('keydown', e=>{ if(e.key==='Enter') $('schedSearchBtn').click(); });
$('schedOpenSheet')?.addEventListener('click', ()=>{
  const url='https://docs.google.com/spreadsheets/d/1othAdoPUHvxo5yDKmEZSGH-cjslR1WyV90F7FdU30OE/edit?gid=1796534117#gid=1796534117';
  try{window.open(url, 'schedPopup', 'width=1200,height=800,noopener');}catch(e){console.warn('popup suppressed')}
});


// ===== All matches =====
const allStatus=$('allStatus'); const allTable=$('allTable');
async function loadAll(){ if(allStatus) allStatus.textContent='불러오는 중…'; ALL_CACHE=await fetchGVIZ(SHEETS.all); if(!ALL_CACHE.length){ if(allStatus) allStatus.textContent='데이터 없음/권한/CORS 문제'; return;} renderTable(allTable, ALL_CACHE); if(allStatus) allStatus.textContent=`불러오기 완료 • ${ALL_CACHE.length-1}행`; }
function filterAll(q){ if(!ALL_CACHE.length) return; const Q=lc(q||''); if(!Q){ renderTable(allTable, ALL_CACHE); return;} const rows=ALL_CACHE.slice(1).filter(r=> (r||[]).some(c=> lc(c).includes(Q))); renderTable(allTable,[ALL_CACHE[0],...rows]); }
$('allSearchBtn')?.addEventListener('click', ()=> filterAll($('allQuery')?.value));
$('allResetBtn')?.addEventListener('click', ()=>{ const i=$('allQuery'); if(i) i.value=''; filterAll(''); });
$('allQuery')?.addEventListener('keydown', e=>{ if(e.key==='Enter') $('allSearchBtn').click(); });

// ===== Members =====
const membersStatus=$('membersStatus'); const membersTable=$('membersTable');
async function loadMembers(){ if(membersStatus) membersStatus.textContent='불러오는 중…'; const data=await fetchGVIZ(SHEETS.members); if(!data.length){ if(membersStatus) membersStatus.textContent='데이터 없음/권한/CORS 문제'; return;} MEMBERS_CACHE=data; renderTable(membersTable,[data[0],...data.slice(1)]); if(membersStatus) membersStatus.textContent=`불러오기 완료 • ${data.length-1}행`; highlightMembers(); }
function highlightMembers(){
  const tbody = membersTable?.querySelector('tbody'); if(!tbody) return;
  [...tbody.rows].forEach(tr=>{
    const role = String(tr.cells?.[1]?.textContent||''); // Column B
    if(/클랜\s*마스터/.test(role)) tr.style.backgroundColor = '#fff2cc';        // light yellow
    else if(/클랜\s*부마스터/.test(role)) tr.style.backgroundColor = '#dbe5f1';  // light blue
    else if(/운영진/.test(role)) tr.style.backgroundColor = '#e2f0d9';           // light green
  });
}
function filterMembers(q){
  if(!MEMBERS_CACHE.length) return;
  const Q=String(q||'').trim().toLowerCase();
  if(!Q){ renderTable(membersTable,[MEMBERS_CACHE[0],...MEMBERS_CACHE.slice(1)]); highlightMembers(); return; }
  const rows = MEMBERS_CACHE.slice(1).filter(r => (r||[]).some(c => String(c||'').toLowerCase().includes(Q)));
  renderTable(membersTable,[MEMBERS_CACHE[0],...rows]); highlightMembers();
}
$('memberSearchBtn')?.addEventListener('click', ()=> filterMembers($('memberSearch')?.value));
$('memberResetBtn')?.addEventListener('click', ()=>{ const i=$('memberSearch'); if(i) i.value=''; filterMembers(''); });
$('memberSearch')?.addEventListener('keydown', e=>{ if(e.key==='Enter') $('memberSearchBtn')?.click(); });

// ===== Tabs & boot =====
const tabs=[...document.querySelectorAll('.tab-btn')];
function activate(id){
  document.querySelectorAll('.panel').forEach(p=>p.classList.remove('active'));
  const tgt=document.getElementById(id); if(tgt) tgt.classList.add('active');
  tabs.forEach(b=>b.classList.toggle('active', b.dataset.target===id));
  const playerTab = tabs.find(b=>b.dataset.target==='player');
  if(playerTab){ playerTab.style.display = (id==='player') ? 'inline-block' : 'none'; }

  // Show the 4 stat cards only on Dashboard
  const heroStats = document.querySelector('.hero-stats');
  if(heroStats){
    heroStats.style.display = (id === 'dashboard') ? '' : 'none';
  }
}
tabs.forEach(btn=>btn.addEventListener('click',()=>activate(btn.dataset.target)));
// Ensure hero stats visibility matches initial active panel
try{ const initId = document.querySelector('.panel.active')?.id || 'rank'; activate(initId); }catch(_){}

(async()=>{
  await loadRanking();
  await loadProRank();
  await loadSchedule();
  await loadAll();
  await loadMembers();
  initHOFButtons();
})();


// === 경기별 승패변동 그래프 (직관적 개선) & 초기화 버튼 기능 추가 ===
$('h2hRun')?.addEventListener('click', async ()=>{
  const p1Raw = $('h2hP1')?.value || ''; const p2Raw = $('h2hP2')?.value || ''; const p1=lc(p1Raw); const p2=lc(p2Raw); const qMap=lc($('h2hMap')?.value||'');
  const data = await fetchGVIZ(SHEETS.matches); if(!data.length) return;
  const H=data[0]||[], rows=data.slice(1);
  const C = findIdx(H, /승자\s*선수|winner/i);
  const F = findIdx(H, /패자\s*선수|loser/i);
  const mapIdx = findIdx(H, /리그명|league/i);
  const dateIdx = findIdx(H, /경기일자|date/i);

  if(p1 && p2){
    let filtered = rows.filter(r=> (normalize(r[C])===p1 && normalize(r[F])===p2) || (normalize(r[C])===p2 && normalize(r[F])===p1));
    if(qMap && mapIdx>=0) filtered = filtered.filter(r=> lc(r[mapIdx]).includes(qMap));

    const p1Wins = rows.filter(r => normalize(r[C])===p1 && normalize(r[F])===p2).length;
      const p2Wins = rows.filter(r => normalize(r[C])===p2 && normalize(r[F])===p1).length;
    


const ctx1 = $('h2hOutcomeChart')?.getContext('2d');
if (ctx1) {
  if (h2hOutcomeChart) h2hOutcomeChart.destroy();
  $('h2hOutcomeWrap').style.display = 'block';
  const p1Label = p1Raw || '플레이어1';
  const p2Label = p2Raw || '플레이어2';
  h2hOutcomeChart = new Chart(ctx1, {
    type: 'bar',
    data: {
      labels: [p1Label, p2Label],
      datasets: [
        { label: p1Label, data: [p1Wins, 0], backgroundColor: '#3498db' },
        { label: p2Label, data: [0, p2Wins], backgroundColor: '#e74c3c' }
      ]
    },
    options: {
      responsive: true,
      plugins: {
        legend: { display: true, position: 'bottom' },
        title: { display: true, text: '경기별 승패 변동 (요약)' }
      },
      scales: { y: { beginAtZero: true, title: { display: true, text: '승리 수' } } }
    }
  });
}


renderTable($('h2hTable'), [h2hHeaders, ...filtered]);
  }
});

$('h2hReset')?.addEventListener('click', () => {
  ['h2hP1', 'h2hP2', 'h2hMap'].forEach(id => {
    const el = $(id);
    if (el) el.value = '';
  });
  renderTable($('h2hTable'), [h2hHeaders]);
  $('h2hOutcomeWrap').style.display = 'none';
  $('h2hMapWrap').style.display = 'none';
});


// === 햄버거 메뉴 작동 전용 ===
const hamburger = document.getElementById('hamburger');
const mainMenu = document.getElementById('mainMenu');
if (hamburger && mainMenu) {
  mainMenu.classList.add('collapsed');
  hamburger.addEventListener('click', () => {
    mainMenu.classList.toggle('collapsed');
  });
}


/* === v9_97_FinalDualColor_MapCompareFix === */
(function(){
  function lc(s){ return String(s ?? '').toLowerCase(); }

function normalizeId(v){
  // remove normal/nbps/zero-width spaces and lower-case for stable matching
  return String(v ?? '')
    .replace(/\u00A0/g,' ')
    .replace(/[\u200B-\u200D\uFEFF]/g,'')
    .replace(/\s+/g,'')
    .toLowerCase();
}
  function $(id){
  const el = document.getElementById(id);
  if (el) return el;
  // Safe stub to avoid 'Cannot set properties of undefined'
  const stub = {
    style: {},
    dataset: {},
    addEventListener: ()=>{},
    removeEventListener: ()=>{},
    appendChild: ()=>{},
    querySelector: ()=>null,
    querySelectorAll: ()=>[],
    getContext: ()=>null
  };
  return stub;
}

  // Scroll buttons
  document.addEventListener("DOMContentLoaded", () => {
    const up=$("#scrollUp"), down=$("#scrollDown");
    if(up && up.dataset && !up.dataset.bound){
      up.dataset.bound="1";
      up.addEventListener("click", ()=>window.scrollTo({top:0,behavior:"smooth"}));
    }
    if(down && down.dataset && !down.dataset.bound){
      down.dataset.bound="1";
      down.addEventListener("click", ()=>window.scrollTo({top:document.documentElement.scrollHeight,behavior:"smooth"}));
    }
  });

  // H2H - Dual Color & Map Compare
  document.addEventListener("DOMContentLoaded", ()=>{
    const runBtn=$("#h2hRun");
    if(!runBtn) return;
    if (runBtn && typeof runBtn.cloneNode === "function" && runBtn.parentNode){
      const fresh = runBtn.cloneNode(true);
      runBtn.parentNode.replaceChild(fresh, runBtn);
      runBtn = fresh;
    }
    if (!runBtn) return;
    runBtn.addEventListener("click", async ()=>{
      const p1El=$("#h2hP1"), p2El=$("#h2hP2");
      const p1Label=p1El?.value?.trim()||"플레이어1";
      const p2Label=p2El?.value?.trim()||"플레이어2";
      const p1=lc(p1Label), p2=lc(p2Label);

      const data=await fetchGVIZ(SHEETS.matches);
      if(!data.length) return;
      const H=data[0]||[], rows=data.slice(1);
      const C=findIdx(H,/승자\s*선수|winner/i);
      const F=findIdx(H,/패자\s*선수|loser/i);
      const mapIdx=findIdx(H,/맵|map/i);

      const filtered=rows.filter(r=>
        (normalize(r[C])===p1 && normalize(r[F])===p2) ||
        (normalize(r[C])===p2 && normalize(r[F])===p1)
      );

      const p1Wins = rows.filter(r => normalize(r[C])===p1 && normalize(r[F])===p2).length;
      const p2Wins = rows.filter(r => normalize(r[C])===p2 && normalize(r[F])===p1).length;
    // === [NEW] 경기요약 정보 표시 ===
    if (compareDiv) {
      compareDiv.style.display = "block";
      compareDiv.innerHTML = `
        <div style="text-align:center;font-weight:800;font-size:16px;margin:8px 0;color:#333;">
          ${p1Label} ${p1Wins}/${p2Wins} ${p2Label}
        </div>
      `;
    }


      // 경기별 승패 변동 (요약)
      const ctx1=$("#h2hOutcomeChart")?.getContext("2d");
      if(ctx1){
        if(window.h2hOutcomeChart) window.h2hOutcomeChart.destroy();
        $("#h2hOutcomeWrap").style.display="block";
        window.h2hOutcomeChart=new Chart(ctx1,{
          type:"bar",
          data:{
            labels:[p1Label,p2Label],
            datasets:[{
              label:"승리 수",
              data:[p1Wins,p2Wins],
              backgroundColor:["#3399ff","#ff6666"]
            }]
          },
          options:{
            responsive:true,
            maintainAspectRatio:false,
            plugins:{
              legend:{display:false},
              title:{display:true,text:"경기별 승패 변동 (요약)"}
            },
            scales:{
              y:{beginAtZero:true,title:{display:true,text:"승리 수"},ticks:{stepSize:1}}
            }
          }
        });
      }

      // 맵별 승패 변동 (복구)
      const mapCounts={};
      filtered.forEach(r=>{
        const m=mapIdx>=0?(r[mapIdx]||"(맵미상)"):"(맵미상)";
        if(!mapCounts[m]) mapCounts[m]={p1:0,p2:0};
        if(normalize(r[C])===p1) mapCounts[m].p1++; else mapCounts[m].p2++;
      });
      const mlabels=Object.keys(mapCounts);
      const p1w=mlabels.map(k=>mapCounts[k].p1);
      const p2w=mlabels.map(k=>mapCounts[k].p2);

      const ctx2=$("#h2hMapChart")?.getContext("2d");
      if(ctx2){
        if(window.h2hMapChart) window.h2hMapChart.destroy();
        $("#h2hMapWrap").style.display="block";
        window.h2hMapChart=new Chart(ctx2,{
          type:"bar",
          data:{
            labels:mlabels,
            datasets:[
              {label:p1Label,data:p1w,backgroundColor:"#3399ff"},
              {label:p2Label,data:p2w,backgroundColor:"#ff6666"}
            ]
          },
          options:{
            indexAxis:"y",
            responsive:true,
            maintainAspectRatio:false,
            plugins:{
              legend:{display:true,position:"bottom"},
              title:{display:true,text:"맵별 승패 변동"}
            },
            scales:{
              x:{beginAtZero:true,title:{display:true,text:"승리 수"}}
            }
          }
        });
      }

      if(typeof renderTable==="function")
        renderTable($("#h2hTable"),[h2hHeaders,...filtered]);
    });
  });
})();


/* === v9_98_FinalDualColor_MapSummary === */
(function(){
  function lc(s){return String(s??'').toLowerCase();}
  function $(id){return document.getElementById(id);}

  // Scroll Buttons
  document.addEventListener("DOMContentLoaded",()=>{
    const up=$("#scrollUp"),down=$("#scrollDown");
    if(up&&!up.dataset.bound){up.dataset.bound="1";up.addEventListener("click",()=>window.scrollTo({top:0,behavior:"smooth"}));}
    if(down&&!down.dataset.bound){down.dataset.bound="1";down.addEventListener("click",()=>window.scrollTo({top:document.documentElement.scrollHeight,behavior:"smooth"}));}
  });

  // H2H DualColor Summary + Map Summary
  document.addEventListener("DOMContentLoaded",()=>{
    const run=$("#h2hRun");if(!run)return;
    const fresh=run.cloneNode ? cloneNode(true) : (el => el);run.parentNode.replaceChild(fresh,run);

    fresh.addEventListener("click",async()=>{
      const p1El=$("#h2hP1"),p2El=$("#h2hP2");
      const p1Label=p1El?.value?.trim()||"플레이어1";
      const p2Label=p2El?.value?.trim()||"플레이어2";
      const p1=lc(p1Label),p2=lc(p2Label);

      const data=await fetchGVIZ(SHEETS.matches);
      if(!data.length)return;
      const H=data[0]||[],rows=data.slice(1);
      const C=findIdx(H,/승자\s*선수|winner/i);
      const F=findIdx(H,/패자\s*선수|loser/i);
      const M=findIdx(H,/맵|map/i);

      const filtered=rows.filter(r=>(normalize(r[C])===p1&&normalize(r[F])===p2)||(normalize(r[C])===p2&&normalize(r[F])===p1));
      const p1Wins = rows.filter(r => normalize(r[C])===p1 && normalize(r[F])===p2).length;
      const p2Wins = rows.filter(r => normalize(r[C])===p2 && normalize(r[F])===p1).length;
    // === [NEW] 경기요약 정보 표시 ===
    if (compareDiv) {
      compareDiv.style.display = "block";
      compareDiv.innerHTML = `
        <div style="text-align:center;font-weight:800;font-size:16px;margin:8px 0;color:#333;">
          ${p1Label} ${p1Wins}/${p2Wins} ${p2Label}
        </div>
      `;
    }


      // 경기별 승패 변동(요약)
      const ctx1=$("#h2hOutcomeChart")?.getContext("2d");
      if(ctx1){
        if(window.h2hOutcomeChart)window.h2hOutcomeChart.destroy();
        $("#h2hOutcomeWrap").style.display="block";
        window.h2hOutcomeChart=new Chart(ctx1,{
          type:"bar",
          data:{
            labels:[p1Label,p2Label],
            datasets:[{
              label:"승리 수",
              data:[p1Wins,p2Wins],
              backgroundColor:["#3399ff","#ff6666"]
            }]
          },
          options:{
            responsive:true,
            plugins:{
              legend:{display:false},
              title:{display:true,text:"경기별 승패 변동 (요약)"}
            },
            scales:{
              y:{beginAtZero:true,title:{display:true,text:"승리 수"},ticks:{stepSize:1}}
            }
          }
        });
      }

      // 맵별 승패 요약 (가로형)
      const mapStats={};
      filtered.forEach(r=>{
        const mapName=M>=0?(r[M]||"(맵미상)"):"(맵미상)";
        if(!mapStats[mapName])mapStats[mapName]={p1:0,p2:0};
        if(normalize(r[C])===p1)mapStats[mapName].p1++;else mapStats[mapName].p2++;
      });
      const maps=Object.keys(mapStats);
      const p1Data=maps.map(m=>mapStats[m].p1);
      const p2Data=maps.map(m=>mapStats[m].p2);
      const ctx2=$("#h2hMapChart")?.getContext("2d");
      if(ctx2){
        if(window.h2hMapChart)window.h2hMapChart.destroy();
        $("#h2hMapWrap").style.display="block";
        window.h2hMapChart=new Chart(ctx2,{
          type:"bar",
          data:{
            labels:maps,
            datasets:[
              {label:p1Label,data:p1Data,backgroundColor:"#3399ff"},
              {label:p2Label,data:p2Data,backgroundColor:"#ff6666"}
            ]
          },
          options:{
            indexAxis:"y",
            responsive:true,
            plugins:{
              legend:{display:true,position:"bottom"},
              title:{display:true,text:"맵별 승패 요약"}
            },
            scales:{
              x:{beginAtZero:true,title:{display:true,text:"승리 수"}}
            }
          }
        });
      }

      if(typeof renderTable==="function")renderTable($("#h2hTable"),[h2hHeaders,...filtered]);
    });
  });
})();


/* === v9_101_NoConflict_H2H_Final ===
   - Removes all prior H2H listeners by cloning buttons.
   - Outcome chart: Kyak(blue #3498db) / Burst(red #e74c3c)
   - Map chart: horizontal stacked per map with same colors.
   - Keeps table + reset working.
   - Does not touch other features.
*/
(function(){
  const $ = (id) => document.getElementById(id);
  const normalize = (s) => String(s || '').trim().toLowerCase();

  function ensureChartLib(){ return (typeof Chart !== 'undefined'); }
  function destroyChart(refName){
    if (window[refName]) { try { window[refName].destroy(); } catch(e){} window[refName]=null; }
  }

  function getIdx(header, re){ return (Array.isArray(header)? header.findIndex(h => re.test(String(h||''))) : -1); }

  function getCustomHeaders() {
    if (Array.isArray(window.customHeaders) && window.customHeaders.length) return window.customHeaders;
    return ["경기일자","승자티어","승자선수","승자종족","패자티어","패자선수","패자종족","맵","리그명","티어차이"];
  }

  // Bind once after DOM ready
  document.addEventListener("DOMContentLoaded", ()=>{
    const runBtn = $("#h2hRun");
    const resetBtn = $("#h2hReset");
    if (!runBtn) return;

    // 2.1 Remove all previous listeners by cloning
    const freshRun = runBtn.cloneNode ? cloneNode(true) : (el => el);
    runBtn.parentNode.replaceChild(freshRun, runBtn);

    const freshReset = resetBtn ? resetBtn.cloneNode ? cloneNode(true) : (el => el) : null;
    if (resetBtn) resetBtn.parentNode.replaceChild(freshReset, resetBtn);

    // 2.2 Attach fresh click h&&ler
    freshRun.addEventListener("click", async ()=>{
      const p1Label = ($("#h2hP1")?.value || "플레이어1").trim();
      const p2Label = ($("#h2hP2")?.value || "플레이어2").trim();
      const p1 = lc(p1Label), p2 = lc(p2Label);

      // Fetch using existing helper to keep CORS/format rules
      const data = await fetchGVIZ(window.SHEETS.matches);
      if (!data || !data.length) return;

      const H = data[0] || [];
      const rows = data.slice(1);

      const iWName = getIdx(H, /승자\\s*선수|winner/i);
      const iLName = getIdx(H, /패자\\s*선수|loser/i);
      const iMap   = getIdx(H, /맵|map/i);
      const iDate  = getIdx(H, /경기일자|date/i);

      if (iWName < 0 || iLName < 0) return;

      // Filter exact head-to-head both directions
      let filtered = rows.filter(r => {
        const w = lc(r[iWName]||''), l = lc(r[iLName]||'');
        return (w===p1 && l===p2) || (w===p2 && l===p1);
      });

      // 2.2.1 Table render (keep as-is)
      const headers = getCustomHeaders();
      if (typeof renderTable === "function") {
        renderTable($("#h2hTable"), [headers, ...filtered]);
      }

      // 2.2.2 Outcome summary (two bars)
      const p1Wins = filtered.filter(r => lc(r[iWName]||'')===p1).length;
      const p2Wins = filtered.filter(r => lc(r[iWName]||'')===p2).length;

      const wrap1 = $("#h2hOutcomeWrap"), cvs1 = $("#h2hOutcomeChart");
      if (wrap1 && cvs1 && ensureChartLib()){
        wrap1.style.display = "block";
        destroyChart("h2hOutcomeChart");
        const ctx1 = cvs1.getContext("2d");
        window.h2hOutcomeChart = new Chart(ctx1, {
          type: "bar",
          data: {
            labels: [p1Label, p2Label],
            datasets: [{
              label: "승리 수",
              data: [p1Wins, p2Wins],
              backgroundColor: ["#3498db", "#e74c3c"],
              borderRadius: 8
            }]
          },
          options: {
            responsive: true,
            plugins: { legend:{display:false}, title:{display:true, text:"경기별 승패 변동 (요약)"} },
            scales: { y:{ beginAtZero:true, title:{display:true, text:"승리 수"}, ticks:{ stepSize:1 } } }
          }
        });
      }

      // 2.2.3 Map summary (horizontal 2-color bars)
      const mapCounts = {};
      filtered.forEach(r => {
        const m = (iMap>=0 ? String(r[iMap]||"(맵미상)") : "(맵미상)");
        if (!mapCounts[m]) mapCounts[m] = { p1:0, p2:0 };
        if (lc(r[iWName]||'')===p1) mapCounts[m].p1++;
        else if (lc(r[iWName]||'')===p2) mapCounts[m].p2++;
      });
      const labels = Object.keys(mapCounts);
      const p1data = labels.map(k => mapCounts[k].p1);
      const p2data = labels.map(k => mapCounts[k].p2);

      const wrap2 = $("#h2hMapWrap"), cvs2 = $("#h2hMapChart");
      if (wrap2 && cvs2 && ensureChartLib()){
        wrap2.style.display = "block";
        destroyChart("h2hMapChart");
        const ctx2 = cvs2.getContext("2d");
        window.h2hMapChart = new Chart(ctx2, {
          type: "bar",
          data: {
            labels,
            datasets: [
              { label: p1Label, data: p1data, backgroundColor: "#3498db" },
              { label: p2Label, data: p2data, backgroundColor: "#e74c3c" }
            ]
          },
          options: {
            indexAxis: "y",
            responsive: true,
            plugins: { legend:{display:true}, title:{display:true, text:"맵별 승패 변동 (요약)"} },
            scales: { x:{ beginAtZero:true, ticks:{ stepSize:1 } } }
          }
        });
      }
    });

    // 2.3 Reset h&&ler
    if (freshReset){
      freshReset.addEventListener("click", ()=>{
        ["h2hP1","h2hP2","h2hMap"].forEach(id => { const el = $("#"+id); if(el) el.value=""; });
        if (typeof renderTable === "function") {
          const headers = getCustomHeaders();
          renderTable($("#h2hTable"), [headers]);
        }
        const w1 = $("#h2hOutcomeWrap"), w2 = $("#h2hMapWrap");
        if (w1) w1.style.display = "none";
        if (w2) w2.style.display = "none";
        destroyChart("h2hOutcomeChart");
        destroyChart("h2hMapChart");
      });
    }
  });
})();



/* === v9_106_VerifiedLiveFix ===
   Ensures Chart.js && canvases load correctly after full page render.
   Fixes map chart not showing.
*/
window.addEventListener('load', () => {
  document.querySelectorAll('canvas').forEach(c => {
    try { c.getContext('2d'); } catch(e){}
  });
  console.log('✅ Canvas contexts initialized after page load');
});


// === v9_101 H2H Summary Line (Final) ===
document.addEventListener("DOMContentLoaded", () => {
  const run = document.getElementById("h2hRun");
  if (!run) return;

  run.addEventListener("click", () => {
    const p1 = document.getElementById("h2hP1")?.value?.trim() || "";
    const p2 = document.getElementById("h2hP2")?.value?.trim() || "";
    if (!compare) return;

    // Chart.js는 async로 렌더되므로 약간의 지연 후 표시
    setTimeout(() => {
      const chart = window.h2hOutcomeChart;
      if (!chart || !chart.data) return;

      const data = chart.data.datasets[0].data;
      const p1Wins = data[0] ?? 0;
      const p2Wins = data[1] ?? 0;

      compare.style.display = "block";
      compare.innerHTML = `
        <div style="text-align:center;font-weight:800;font-size:16px;margin:8px 0;color:#333;">
          ${p1} ${p1Wins}/${p2Wins} ${p2}
        </div>
      `;
    }, 300);
  });
});








// === v9_107 Guaranteed Correct Wins Display ===
document.addEventListener("DOMContentLoaded", () => {
  const run = document.getElementById("h2hRun");
  if (!run) return;

  run.addEventListener("click", () => {
    // Chart.js가 데이터를 채우기까지 약간 더 대기
    setTimeout(() => {
      const p1 = document.getElementById("h2hP1")?.value?.trim() || "플레이어1";
      const p2 = document.getElementById("h2hP2")?.value?.trim() || "플레이어2";

      // Chart.js 객체에서 실제 데이터 가져오기
      const chart = window.h2hOutcomeChart;
      const data = chart?.data?.datasets?.[0]?.data || [0, 0];
      const p1Wins = data[0] ?? 0;
      const p2Wins = data[1] ?? 0;

      // compareDiv가 없으면 자동 생성
      if (!compareDiv) {
        const filters = document.querySelector("#h2h .filters");
        compareDiv = document.createElement("div");
        compareDiv.style.cssText = "text-align:center;font-weight:800;font-size:16px;margin:8px 0;color:#333;";
        if (filters) filters.insertAdjacentElement("afterend", compareDiv);
        else document.body.appendChild(compareDiv);
      }

      // 올바른 승수 반영
      compareDiv.innerHTML = `${p1} ${p1Wins}/${p2Wins} ${p2}`;
      compareDiv.style.display = "block";
    }, 800); // ← 딜레이를 0.8초로 늘려 Chart.js 데이터 완성 후 실행
  });
});



// === v9_112_FixComparePosition ===
document.addEventListener("DOMContentLoaded", () => {
  const run = document.getElementById("h2hRun");
  if (!run) return;

  run.addEventListener("click", async () => {
    const p1 = document.getElementById("h2hP1")?.value?.trim() || "";
    const p2 = document.getElementById("h2hP2")?.value?.trim() || "";
    if (!p1 || !p2) return;

    const data = await fetchGVIZ(window.SHEETS.matches);
    if (!data?.length) return;

    const H = data[0] || [];
    const rows = data.slice(1);
    const iW = H.findIndex(h => /승자\s*선수|winner/i.test(h));
    const iL = H.findIndex(h => /패자\s*선수|loser/i.test(h));
    if (iW < 0 || iL < 0) return;

    const p1Norm = p1.toLowerCase();
    const p2Norm = p2.toLowerCase();

    const p1Wins = rows.filter(r => r[iW]?.toLowerCase() === p1Norm && r[iL]?.toLowerCase() === p2Norm).length;
    const p2Wins = rows.filter(r => r[iW]?.toLowerCase() === p2Norm && r[iL]?.toLowerCase() === p1Norm).length;

    await new Promise(r => setTimeout(r, 300)); // 데이터 안정 대기

    if (!compare) {
      compare = document.createElement("div");
      compare.style.cssText = "text-align:center;font-weight:800;font-size:16px;margin:12px 0;color:#333;";
      const outcome = document.getElementById("h2hOutcomeWrap");
      if (outcome && outcome.parentNode) {
        outcome.parentNode.insertBefore(compare, outcome); // ✅ 검색창과 그래프 사이 위치
      } else {
        document.body.appendChild(compare);
      }
    }

    compare.textContent = `${p1} ${p1Wins}/${p2Wins} ${p2}`;
    compare.style.display = "block";
  });
});

/* === v9_101_RealScore_UnderSearch_Fix === */
(function(){
  const $ = (id)=>document.getElementById(id);
  const lc = (s)=>String(s??'').toLowerCase();
  const normalize = (s)=>String(s||'').trim().toLowerCase();
  function bindScroll(){
    const up = $("scrollUp"), down = $("scrollDown");
    if(up && !up.dataset.bind){
      up.dataset.bind="1";
      up.addEventListener("click",()=>window.scrollTo({top:0,behavior:"smooth"}));
    }
    if(down && !down.dataset.bind){
      down.dataset.bind="1";
      down.addEventListener("click",()=>window.scrollTo({top:document.documentElement.scrollHeight,behavior:"smooth"}));
    }
  }
  document.addEventListener("DOMContentLoaded",bindScroll);
  window.addEventListener("load",bindScroll);

  function moveCompare(){
    const cmp=document.getElementById('h2hOutcomeWrap');
    const reset=document.getElementById('h2hReset');
    if(cmp && reset && !cmp.dataset.moved){
      reset.parentNode.insertBefore(cmp,reset.nextSibling);
      cmp.dataset.moved="1";
    }
  }
  document.addEventListener("DOMContentLoaded",moveCompare);

  function fixH2H(){
    const run=$("h2hRun");
    if(!run||run.dataset.fixed)return;
    run.dataset.fixed="1";
    run.addEventListener("click",async()=>{
      const p1Raw=$("h2hP1").value.trim();
      const p2Raw=$("h2hP2").value.trim();
      const p1=lc(p1Raw),p2=lc(p2Raw);
      const data=await fetchGVIZ(window.SHEETS.matches);
      if(!data.length)return;
      const H=data[0]||[],rows=data.slice(1);
      const C=H.findIndex(h=>/승자|winner/i.test(h));
      const F=H.findIndex(h=>/패자|loser/i.test(h));
      const p1Wins=rows.filter(r=>normalize(r[C])===p1&&normalize(r[F])===p2).length;
      const p2Wins=rows.filter(r=>normalize(r[C])===p2&&normalize(r[F])===p1).length;
      moveCompare();
      if(cmp){
        cmp.style.display="block";
        cmp.innerHTML=`<div style='text-align:center;font-weight:800;font-size:16px;margin:8px 0;color:#333;'>${p1Raw} ${p1Wins}/${p2Wins} ${p2Raw}</div>`;
      }
    });
  }
  document.addEventListener("DOMContentLoaded",fixH2H);
})();

/* === v9_102_RealScore_FinalFix === */
(function(){
  const $ = (id)=>document.getElementById(id);
  const lc = (s)=>String(s??'').toLowerCase();
  const normalize = (s)=>String(s||'').trim().toLowerCase();

  function findIdxFlexible(headers, keywords){
    for(let i=0;i<headers.length;i++){
      const cell=String(headers[i]||'').trim().toLowerCase();
      for(const kw of keywords){ if(cell.includes(kw.toLowerCase())) return i; }
    }
    return -1;
  }

  async function loadRealScore(p1Raw,p2Raw){
    const p1=lc(p1Raw),p2=lc(p2Raw);
    const data=await fetchGVIZ(window.SHEETS.matches);
    if(!data.length) return {p1Wins:0,p2Wins:0};
    const H=data[0]||[],rows=data.slice(1);
    const C=findIdxFlexible(H,["승자","winner","win"]);
    const F=findIdxFlexible(H,["패자","loser","lose"]);
    if(C<0||F<0){console.warn("⚠️ Cannot find winner/loser columns",C,F);return {p1Wins:0,p2Wins:0};}
    const p1Wins=rows.filter(r=>normalize(r[C])===p1&&normalize(r[F])===p2).length;
    const p2Wins=rows.filter(r=>normalize(r[C])===p2&&normalize(r[F])===p1).length;
    return {p1Wins,p2Wins};
  }

  document.addEventListener("DOMContentLoaded",()=>{
    const run=$("h2hRun");
    if(!run)return;
    run.addEventListener("click",async()=>{
      const p1Raw=$("h2hP1").value.trim();
      const p2Raw=$("h2hP2").value.trim();
      const {p1Wins,p2Wins}=await loadRealScore(p1Raw,p2Raw);
      if(compare){
        compare.style.display="block";
        compare.innerHTML=`<div style='text-align:center;font-weight:800;font-size:16px;margin:8px 0;color:#333;'>${p1Raw||"플레이어1"} ${p1Wins}/${p2Wins} ${p2Raw||"플레이어2"}</div>`;
      }
    });
  });
})();

// === v9_65 Final Fix: Global Button H&&lers Restored ===
function reset() {
  try {
    document.getElementById("h2hPlayer1").value = "";
    document.getElementById("h2hPlayer2").value = "";
    document.getElementById("h2hMap").value = "";
    document.getElementById("h2hResult").innerHTML = "";
  } catch (e) {
    console.error("Reset failed:", e);
  }
}

function compare() {
  try {
    compareDiv();
  } catch (e) {
    console.error("Compare failed:", e);
  }
}

function compareDiv() {
  const btn = document.querySelector("#compareButton");
  if (btn) btn.click();
}

// === Date Formatting Helper ===
function formatDate(value) {
  if (!value) return "";
  try {
    const d = new Date(value);
    if (!isNaN(d.getTime())) {
      const y = d.getFullYear();
      const m = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      return `${y}-${m}-${day}`;
    }
    return value;
  } catch (e) {
    return value;
  }
}

function formatDateSafe(value){
  if(!value)return"";
  try{
    const d=new Date(value);
    if(!isNaN(d.getTime())){
      const y=d.getFullYear();
      const m=String(d.getMonth()+1).padStart(2,'0');
      const day=String(d.getDate()).padStart(2,'0');
      return `${y}-${m}-${day}`;
    }
    return value;
  }catch(e){return value;}
}


// === v9_80 Hamburger + Home ===
(function(){
  const hamb = document.getElementById('hamburgerBtn');
  const mobile = document.getElementById('mobileMenu');
  const closeBtn = document.getElementById('mobileMenuClose');
  const homeTop = document.getElementById('homeBtnTop');

  if (homeTop) homeTop.addEventListener('click', (e)=>{ e.preventDefault(); activate('rank'); });

  function openMobile(){
    if(mobile){
      mobile.classList.add('open');
      mobile.setAttribute('aria-hidden','false');
      document.body.classList.add('menu-open');
    }
  }
  function closeMobile(){
    if(mobile){
      mobile.classList.remove('open');
      mobile.setAttribute('aria-hidden','true');
      document.body.classList.remove('menu-open');
    }
  }

  if (hamb) hamb.addEventListener('click', openMobile);
  if (closeBtn) closeBtn.addEventListener('click', closeMobile);
  if (mobile){
    mobile.addEventListener('click', (e)=>{ if(e.target === mobile) closeMobile(); });
    mobile.querySelectorAll('.mobile-item').forEach(btn=>{
      btn.addEventListener('click', ()=>{
        const tgt = btn.getAttribute('data-target');
        if (tgt){ activate(tgt); }
        // 홈으로는 rank
        if (!tgt && /홈/.test(btn.textContent)) activate('rank');
        closeMobile();
      });
    });
  }
})();

/* === v12 Full Data Connect Patch === */
/* GViz helper: accept full Google Sheets URL with edit?gid=... */
async function fetchGVIZbyUrl_v12b(fullUrl){
  try{
    const s = String(fullUrl||'').trim();
    const u = new URL(s);
    const parts = u.pathname.split('/').filter(Boolean);
    const dIdx = parts.indexOf('d');
    const id = (dIdx>=0 && parts[dIdx+1]) ? parts[dIdx+1] : null;
    const gid = u.searchParams.get('gid') || (u.hash.match(/gid=(\d+)/)?.[1]) || null;
    const sheet = u.searchParams.get('sheet') || null;
    if(!id || (!gid && !sheet)) throw new Error("Invalid sheet URL: "+fullUrl);

    let gvizBase = `https://docs.google.com/spreadsheets/d/${id}/gviz/tq?tqx=out:json`;
    if(gid) gvizBase += `&gid=${gid}`;
    if(sheet) gvizBase += `&sheet=${encodeURIComponent(sheet)}`;
    const gviz = (window.USE_PROXY ? window.PROXY_URL : '') + gvizBase;

    const res = await fetch(gviz, {cache:'no-store'});
    const text = await res.text();
    let payload = text;

    // Handle GVIZ wrapper: google.visualization.Query.setResponse(...)
    const mWrap = payload.match(/setResponse\((.*)\)\s*;?\s*$/s);
    if(mWrap && mWrap[1]) payload = mWrap[1];

    // Trim to JSON object
    const first = payload.indexOf('{');
    const last = payload.lastIndexOf('}');
    if(first >= 0 && last >= 0) payload = payload.slice(first, last+1);

    const json = JSON.parse(payload);
    const table = json.table || {};
    const rows = (table.rows||[]).map(r => (r.c||[]).map(c => (c && (c.f ?? c.v)) ?? ''));
    return rows;
  }catch(e){ console.error('fetchGVIZbyUrl error', e); return []; }
}

/* Format helpers */
function fmtNum(n){ const x=Number(n||0); return isNaN(x)?'-':x.toLocaleString('ko-KR'); }
function fmtPct(win,total){ const t=Number(total||0), w=Number(win||0); if(!t) return '0%'; return ((w/t)*100).toFixed(1)+'%'; }
function toDateKR(s){
  const str=String(s||'').trim();
  let m=str.match(/(\d{4})[^\d](\d{1,2})[^\d](\d{1,2})/);
  if(m){ return new Date(`${m[1]}-${('0'+m[2]).slice(-2)}-${('0'+m[3]).slice(-2)}`); }
  m=str.match(/(\d{4})-(\d{2})-(\d{2})/);
  if(m){ return new Date(`${m[1]}-${m[2]}-${m[3]}`); }
  const d=new Date(str); return isNaN(d)?null:d;
}

/* User-provided Google Sheets */
const URLS_V12 = {
  active: "https://docs.google.com/spreadsheets/d/18m01CS5kUZKByQHmusXMN54Pa0SXwozgPGp92Q2Nnwo/edit?gid=829552378#gid=829552378",
  matches: "https://docs.google.com/spreadsheets/d/1F6Ey-whXAsTSMCWVmfexGd77jj6WDgv6Z7hkK3BHahs/edit?gid=1297807009#gid=1297807009",
  schedule: "https://docs.google.com/spreadsheets/d/1othAdoPUHvxo5yDKmEZSGH-cjslR1WyV90F7FdU30OE/edit?gid=1796534117#gid=1796534117"
};

/* 1) 활동인원 & 총경기수 */
async function v12_loadCounts(){
  const [activeRows, matchRows] = await Promise.all([
    fetchGVIZbyUrl_v12b(URLS_V12.active),
    fetchGVIZbyUrl_v12b(URLS_V12.matches)
  ]);
  try{
    // active: ClanMembers!A2:A -> numeric count
    const active = activeRows.slice(1).map(r=>String(r[0]||'').trim()).filter(Boolean).length;
    const elA = document.querySelector('#dashboard #activeCount') || document.getElementById('activeCount');
    if(elA) elA.textContent = fmtNum(active)+'명';
  }catch(e){ console.error('activeCount set error', e); }
  try{
    // total matches: (개인전)경기기록데이터!A2:A
    const total = matchRows.length ? matchRows.slice(1).filter(r=> String(r[0]||'').trim()).length : 0;
    const elT = document.querySelector('#dashboard #totalMatches') || document.getElementById('totalMatches');
    if(elT) elT.textContent = fmtNum(total)+'경기';
  }catch(e){ console.error('totalMatches set error', e); }

  try{
    // last update: latest date in matchRows col A
    let maxD = null;
    if(matchRows && matchRows.length>1){
      for(const r of matchRows.slice(1)){
        const raw = String((r||[])[0]||'').trim();
        if(!raw) continue;
        let d = null;
        // h&&le yyyy-mm-dd or yyyy/mm/dd or Date object-ish
        const m = raw.match(/(\d{4})[\-\/.](\d{1,2})[\-\/.](\d{1,2})/);
        if(m){
          const y=parseInt(m[1],10), mo=parseInt(m[2],10), da=parseInt(m[3],10);
          d = new Date(y, mo-1, da);
        } else {
          const t = Date.parse(raw);
          if(!Number.isNaN(t)) d = new Date(t);
        }
        if(d && !Number.isNaN(d.getTime())){
          if(!maxD || d.getTime()>maxD.getTime()) maxD=d;
        }
      }
    }
    const elU = document.querySelector('#dashboard #lastUpdate') || document.getElementById('lastUpdate');
    if(elU){
      if(maxD){
        const days=['일','월','화','수','목','금','토'];
        const yy=maxD.getFullYear();
        const mm=String(maxD.getMonth()+1).padStart(2,'0');
        const dd=String(maxD.getDate()).padStart(2,'0');
        const wd=days[maxD.getDay()];
        elU.textContent = `${yy}-${mm}-${dd} (${wd})`;
      } else {
        elU.textContent = '-';
      }
    }
  }catch(e){ console.error('lastUpdate set error', e); }
  return {activeRows, matchRows};
}


/* v12f normalize race tags: map 저그/프로토스/테란 && variants to Z/P/T */
function normalizeRaceTag(v){
  const s = String(v||'').trim().toLowerCase();
  if(!s) return '';
  if(['z','저그','zerg'].includes(s)) return 'Z';
  if(['p','프로토스','protoss','tos','토스'].includes(s)) return 'P';
  if(['t','테란','terran'].includes(s)) return 'T';
  return s.toUpperCase();
}

/* 2) 종족별 상대 승률: D=승자종족, G=패자종족 */
function v12_calcRaceStats(rows){
  const R=['Z','P','T'];
  const B={Z:{vs:{Z:{total:0},P:{total:0,win:0,lose:0},T:{total:0,win:0,lose:0}}},
           P:{vs:{Z:{total:0,win:0,lose:0},P:{total:0},T:{total:0,win:0,lose:0}}},
           T:{vs:{Z:{total:0,win:0,lose:0},P:{total:0,win:0,lose:0},T:{total:0}}}};
  rows.slice(1).forEach(r=>{
    const w=normalizeRaceTag(r[3]);
    const l=normalizeRaceTag(r[6]);
    if(!R.includes(w) || !R.includes(l)) return;
    if(w===l){ /* mirror match excluded */ return; }
    else{
      B[w].vs[l].total += 1; B[w].vs[l].win = (B[w].vs[l].win||0)+1;
      B[l].vs[w].total += 1; B[l].vs[w].lose = (B[l].vs[w].lose||0)+1;
    }
  });
  return B;
}
function v12_renderRace(B){
  const tbl = document.getElementById('raceTable');
  if(!tbl) return;
  const tbody = tbl.querySelector('tbody'); if(!tbody) return;
  tbody.innerHTML='';
  const order=['Z','P','T'];
  order.forEach(race=>{
    const tr=document.createElement('tr');
    const make = (t)=>{const td=document.createElement('td'); td.textContent=t; return td;};
    tr.appendChild(make(race));
    // vs Z/P/T columns
    order.forEach(opp=>{
      if(race===opp){
        const tot=B[race].vs[opp].total||0;
        tr.appendChild(make(`${fmtNum(tot)}전`));
      }else{
        const cell=B[race].vs[opp]||{total:0,win:0,lose:0};
        const txt = `${fmtNum(cell.total)}전 ${fmtNum(cell.win)}승 ${fmtNum(cell.lose)}패 (${fmtPct(cell.win, cell.total)})`;
        tr.appendChild(make(txt));
      }
    });
    // 합계
    let sum=0;
    order.forEach(opp=>{ sum += (B[race].vs[opp].total||0); });
    tr.appendChild(make(v12e_renderRaceSumRow(B, race)));
    tbody.appendChild(tr);
  });
}

/* 3) 다음 프로리그 일정: A:H, D & H present, today onward, take next 3
      Columns: A Round, B Date, C 요일, D HOME, (VS blank), H AWAY */
async function v12_loadNextSchedule(){
  const rows = await fetchGVIZbyUrl_v12b(URLS_V12.schedule);
  const today = new Date(); today.setHours(0,0,0,0);
  const filtered = rows.slice(1).filter(r=>{
    const d = toDateKR(r[1]);
    const home = String(r[3]||'').trim();
    const away = String(r[7]||'').trim();
    return d && d>=today && home && away;
  }).sort((a,b)=> toDateKR(a[1]) - toDateKR(b[1])).slice(0,3);
  const tbl=document.getElementById('dashSched'); if(!tbl) return;
  const tbody=tbl.querySelector('tbody'); if(!tbody) return;
  tbody.innerHTML='';
  filtered.forEach(r=>{
    const tr=document.createElement('tr');
    const cells=[r[0]||'', r[1]||'', r[2]||'', r[3]||'', 'VS', r[7]||''];
    cells.forEach(v=>{ const td=document.createElement('td'); td.textContent=String(v||''); tr.appendChild(td); });
    tbody.appendChild(tr);
  });
}

/* 4) 전적랭킹에서 선수 클릭 → 선수상세 이동 */
(function v12_bindRankClick(){
  const table = document.getElementById('rankTable');
  if(!table) return;
  table.addEventListener('click', (e)=>{
    const tr = e.target.closest('tr'); if(!tr) return;
    const nameCell = tr.querySelector('td,th'); if(!nameCell) return;
    const name = String(nameCell.textContent || '').trim();
    if(!name) return;
    if(typeof openPlayer === 'function'){ openPlayer(name); }
    else {
      // fallback: try hash or activate player panel
      if(typeof activate === 'function') activate('player');
      const input = document.getElementById('playerQuery') || document.getElementById('playerSearch');
      if(input){ input.value=name; input.dispatchEvent(new Event('change')); }
    }
  });
})();

/* 5) Bootstrap loader on DOM ready */

// Only show dashboard hero stats on dashboard (index).
document.addEventListener('DOMContentLoaded', () => {
  const isDashboard = /(^|\/)index\.html$/.test(location.pathname) || location.pathname === '/' || location.pathname === '';
  if (isDashboard) return;
  document.querySelectorAll('.hero-stats').forEach(el => el.remove());
});

document.addEventListener('DOMContentLoaded', async ()=>{
  try{
    const {matchRows} = await v12_loadCounts();
    if(matchRows && matchRows.length){
      const stats = v12_calcRaceStats(matchRows);
      /* disabled duplicate race render */
    }
    await v12_loadNextSchedule();
  }catch(e){ console.error('v12 boot error', e); }
});
/* === end of v12 patch === */

/* robust GViz parser (v12b) */
async function fetchGVIZbyUrl_v12b(fullUrl){
  try{
    const s = String(fullUrl||'').trim();
    const u = new URL(s);
    const parts = u.pathname.split('/').filter(Boolean);
    const dIdx = parts.indexOf('d');
    const id = (dIdx>=0 && parts[dIdx+1]) ? parts[dIdx+1] : null;

    const gid = u.searchParams.get('gid') || (u.hash.match(/gid=(\d+)/)?.[1]) || null;
    const sheet = u.searchParams.get('sheet') || null;

    // allow plain /edit URL too (default to gid=0 when nothing specified)
    const gidFinal = (gid || (!sheet ? '0' : null));

    if(!id) throw new Error("Invalid sheet URL: " + fullUrl);

    let gvizBase = `https://docs.google.com/spreadsheets/d/${id}/gviz/tq?tqx=out:json`;
    if(gidFinal != null) gvizBase += `&gid=${gidFinal}`;
    if(sheet) gvizBase += `&sheet=${encodeURIComponent(sheet)}`;

    const gviz = (window.USE_PROXY ? window.PROXY_URL : '') + gvizBase;
    const res = await fetch(gviz, {cache:'no-store'});
    const text = await res.text();
    let payload = text;

    const mWrap = payload.match(/setResponse\((.*)\)\s*;?\s*$/s);
    if(mWrap && mWrap[1]) payload = mWrap[1];

    const first = payload.indexOf('{');
    const last  = payload.lastIndexOf('}');
    if(first >= 0 && last >= 0) payload = payload.slice(first, last+1);

    const json = JSON.parse(payload);
    const table = json.table || {};
    const rows = (table.rows||[]).map(r => (r.c||[]).map(c => (c && (c.f ?? c.v)) ?? ''));
    return rows;
  }catch(e){
    console.error('fetchGVIZbyUrl_v12b error', e);
    return [];
  }
}

/* v12e rank row click strong */
(function(){
  document.addEventListener('click', (e)=>{
    const tr = e.target.closest('#rankTable tbody tr');
    if(!tr) return;
    let name = tr.querySelector('.playerName')?.textContent?.trim() || '';
    if(!name){
      const cells = Array.from(tr.querySelectorAll('td,th')).map(td=>td.textContent.trim());
      const pick = cells.find(txt => /[A-Za-z가-힣]{2,}/.test(txt) && !/^\d+(\s*[-.:])?/.test(txt));
      name = (pick || '').replace(/^\d+\s*[-.:]?\s*/,'').replace(/\s+\(.*\)$/, '');
    }
    if(!name) return;
    if(typeof openPlayer==='function'){ openPlayer(name); return; }
    try{ if(typeof activate==='function') activate('player'); }catch(_){}
    const inputs = ['playerQuery','playerSearch','playerInput'].map(id=>document.getElementById(id)).filter(Boolean);
    if(inputs[0]){ inputs[0].value = name; inputs[0].dispatchEvent(new Event('change')); }
  }, false);
})();

/* v12e race sum override */
function v12e_renderRaceSumRow(stat, race){
  const races=['Z','P','T'];
  const sum = races.reduce((acc,x)=>{
    const o = (race===x) ? {total:0,win:0,lose:0} : ((stat[race]&&stat[race].vs&&stat[race].vs[x])? stat[race].vs[x] : {total:0,win:0,lose:0});
    acc.total += o.total||0;
    acc.win   += o.win||0;
    acc.lose  += o.lose||0;
    return acc;
  },{total:0,win:0,lose:0});
  const pct = sum.total ? Math.round(sum.win*1000/sum.total)/10 : 0;
  return `${sum.total}전 ${sum.win}승 ${sum.lose}패 (${pct}%)`;
};

/* v12e hide sched loading */
(function(){
  const hide = ()=>{ try{ const n=document.getElementById('schedLoading')||document.getElementById('schedStatus'); if(n){ n.textContent=''; n.style.display='none'; } }catch(e){} };
  

// === Global search -> open player ===
document.getElementById('globalSearchBtn')?.addEventListener('click', ()=>{
  try{
    const q = String(document.getElementById('globalSearch')?.value||'').trim().toLowerCase();
    if(!q) return;
    if(!Array.isArray(RANK_SRC) || !RANK_SRC.length){ if(typeof loadRanking==='function') loadRanking(); }
    const row = (RANK_SRC.slice? RANK_SRC.slice(1) : []).find(r=> String(r[1]||'').toLowerCase().includes(q));
    if(row && typeof openPlayer==='function') openPlayer(row[1]);
  }catch(e){ console.warn('global search error', e); }
});
document.getElementById('globalSearch')?.addEventListener('keydown', e=>{
  if(e.key==='Enter') document.getElementById('globalSearchBtn')?.click();
});

document.addEventListener('DOMContentLoaded', hide);
  setTimeout(hide, 1500);
})();


document.addEventListener('DOMContentLoaded', ()=>{
  try{ buildRaceWinrate(); }catch(e){}
});



// === Utility: renderOnce to prevent duplicate sections ===
function renderOnce(sel, html) {
  const box = document.querySelector(sel);
  if (!box) return;
  box.innerHTML = '';
  box.insertAdjacentHTML('beforeend', html);
}


// === 안전 복구용: drawRankRows 함수 재선언 (중복 방지) ===
function drawRankRows(rows){
  try {
    const rankTable = document.getElementById('rankTable');
    if (!rankTable) return;
    const header = RANK_SRC[0] || [];
    const thead = rankTable.querySelector('thead');
    const tbody = rankTable.querySelector('tbody');
    if (!thead || !tbody) return;
    thead.innerHTML = '';
    tbody.innerHTML = '';

    const hr = document.createElement('tr');
    (header.slice(0, 10) || []).forEach(h => {
      const th = document.createElement('th');
      th.textContent = h ?? '';
      hr.appendChild(th);
    });
    thead.appendChild(hr);

    rows.forEach(r => {
      const tr = document.createElement('tr');
      (r.slice(0, 10) || []).forEach((v, i) => {
        const td = document.createElement('td');
        if (i === 1 && v) {
          const id = String(v).split('/')[0].trim();
          const a = document.createElement('a');
          a.href = '#';
          a.textContent = id;
          a.addEventListener('click', e => {
            e.preventDefault();
            openPlayer(String(v));
          });
          td.appendChild(a);
        } else {
          td.textContent = v ?? '';
        }
        tr.appendChild(td);
      });
      tbody.appendChild(tr);
    });
  } catch(e){
    console.error('drawRankRows error', e);
  }
}



// === Safe menu toggle only for mobile menu ===
document.addEventListener('DOMContentLoaded', ()=>{
  const menuBtn = document.getElementById('menuBtn');
  const mobileMenu = document.getElementById('mobileMenu');
  if(menuBtn && mobileMenu){
    menuBtn.addEventListener('click', ()=>{
      if(mobileMenu.style.display==='block'){
        mobileMenu.style.display='none';
      } else {
        mobileMenu.style.display='block';
      }
    });
  }
});

window.addEventListener("load",()=>{
  // Scroll buttons
  const up=document.getElementById("scrollUp");
  const down=document.getElementById("scrollDown");
  if(up&&!up.dataset.bound){
    up.dataset.bound="1";
    up.addEventListener("click",()=>window.scrollTo({top:0,behavior:"smooth"}));
  }
  if(down&&!down.dataset.bound){
    down.dataset.bound="1";
    down.addEventListener("click",()=>window.scrollTo({top:document.documentElement.scrollHeight,behavior:"smooth"}));
  }
  // Run button guard
  const run=document.getElementById("h2hRun");
  if(run && run.dataset && !run.dataset.bound){
    run.dataset.bound="1";
    run.addEventListener("click",async()=>{await buildRaceWinrate();});
  }
});


// === v9_79: Tier filters + Tier-rank crowns ===

// Compute numeric ELO from text like "1,234.5"
function parseEloText(s){
  const n = Number(String(s||'').replace(/[^0-9.]/g,''));
  return Number.isFinite(n) ? n : 0;
}

// Return {tierRank, totalInTier}
function getTierRankForPlayer(playerRow, allRows, H){
  try{
    const IDX_TIER = 3; // D
    const IDX_ELO  = 9; // J
    const IDX_NAME = 1; // B

    const myName = String(playerRow[IDX_NAME]||'').split('/')[0].trim().toLowerCase();
    const myTier = String(playerRow[IDX_TIER]||'').trim();
    if(!myName || !myTier) return {tierRank:null, totalInTier:0, tierName: myTier};

    // --- 동일한 기준(5경기 이상)으로 티어 순위 계산 ---
    const rows = Array.isArray(allRows) ? allRows : [];
    const sameTier = rows.filter(r => String(r[IDX_TIER]||'').trim() === myTier);

    // 경기수 계산 (MATCH_SRC가 없으면 fallback: 기존 전체 인원 기준)
    let qualified = sameTier;
    try{
      const MH = (MATCH_SRC && MATCH_SRC[0]) ? MATCH_SRC[0] : [];
      const MR = (MATCH_SRC && MATCH_SRC.length>1) ? MATCH_SRC.slice(1) : [];
      const iW = findIdx(MH, /승자\s*선수|winner/i);
      const iL = findIdx(MH, /패자\s*선수|loser/i);

      function gamesOf(rawName){
        const name = String(rawName||'').split('/')[0].trim().toLowerCase();
        if(!name) return 0;
        let c=0;
        for(const r of MR){
          const w = lc(r[iW]||''); const l = lc(r[iL]||'');
          if(w===name || l===name) c++;
        }
        return c;
      }

      qualified = sameTier.filter(r => gamesOf(r[IDX_NAME]) >= 5);
    }catch(e){ /* ignore, fallback */ }

    // sort by ELO desc
    qualified.sort((a,b)=> parseEloText(b[IDX_ELO]) - parseEloText(a[IDX_ELO]));

    const rank = qualified.findIndex(r => String(r[IDX_NAME]||'').split('/')[0].trim().toLowerCase() === myName) + 1;

    return {tierRank: rank>0?rank:null, totalInTier: qualified.length, tierName: myTier};
  }catch(e){ console.warn('getTierRankForPlayer error', e); return {tierRank:null, totalInTier:0, tierName:''}; }
}

// Decorate player ELO line with crown if tierRank 1~3; expects an element already rendered
function decoratePlayerEloWithCrown(containerEl, tierRank){
  if(!containerEl) return;
  const img = document.createElement('img');
  if (tierRank === 1){ img.src='./crown_gold.png'; }
  else if (tierRank === 2){ img.src='./crown_silver.png'; }
  else if (tierRank === 3){ img.src='./crown_bronze.png'; }
  else return;
  img.className = 'crown';
  containerEl.appendChild(img);
}

// Hook Tier buttons in Rank page


function setupTierButtons(){
  const host = document.getElementById('tierFilters');
  if(!host) return;
  host.addEventListener('click', (e)=>{
    const btn = e.target.closest('.tier-btn');
    if(!btn) return;
    // UI state
    host.querySelectorAll('.tier-btn').forEach(b=> b.classList.remove('active'));
    btn.classList.add('active');
    const tierName = btn.dataset.tier;

    (async () => {
      if(!RANK_SRC.length || !MATCH_SRC.length){
        await loadRanking();
      }
      if(tierName === '전체'){
        // === v9_83: 전체 탭도 ELO 정렬 + 5경기 미만 아래로 ===
        const rows = RANK_SRC.slice(1);
        const IDX_ELO  = 9; // J
        const IDX_NAME = 1; // B

        const MH = (MATCH_SRC && MATCH_SRC[0]) ? MATCH_SRC[0] : [];
        const MR = (MATCH_SRC && MATCH_SRC.length>1) ? MATCH_SRC.slice(1) : [];
        const iW = findIdx(MH, /승자\s*선수|winner/i);
        const iL = findIdx(MH, /패자\s*선수|loser/i);
        function gamesOf(rawName){
          const name = String(rawName||'').split('/')[0].trim().toLowerCase();
          if(!name) return 0;
          let c = 0;
          for(const r of MR){
            const w = lc(r[iW]||''); const l = lc(r[iL]||'');
            if(w===name || l===name) c++;
          }
          return c;
        }

        const cloned = rows.map(r => r.slice(0));
        const qualified = [];
        const unqualified = [];

        cloned.forEach(r => {
          const games = gamesOf(r[IDX_NAME]);
          if (games >= 5) qualified.push(r);
          else unqualified.push(r);
        });

        qualified.sort((a,b)=> parseEloText(b[IDX_ELO]) - parseEloText(a[IDX_ELO]));

        qualified.forEach((r,i)=> { r[0] = i+1; });
        unqualified.forEach(r => { r[0] = '–'; });

        const finalRows = [...qualified, ...unqualified];
        drawRankRows(finalRows);

        const st = document.getElementById('rankStatus');
        if(st){
          const q = qualified.length;
          const u = unqualified.length;
          st.textContent = `전체 • 총 ${q+u}명 (랭킹 대상 ${q}명 / 5경기 미만 ${u}명)`;
        }
        return;
      }

      const rows = RANK_SRC.slice(1);
      const IDX_TIER = 3; // D
      const IDX_ELO  = 9; // J
      const IDX_NAME = 1; // B

      const same = rows.filter(r => String(r[IDX_TIER]||'').trim() === tierName);
      same.sort((a,b)=> parseEloText(b[IDX_ELO]) - parseEloText(a[IDX_ELO]));

      const MH = (MATCH_SRC && MATCH_SRC[0]) ? MATCH_SRC[0] : [];
      const MR = (MATCH_SRC && MATCH_SRC.length>1) ? MATCH_SRC.slice(1) : [];
      const iW = findIdx(MH, /승자\s*선수|winner/i);
      const iL = findIdx(MH, /패자\s*선수|loser/i);
      function gamesOf(rawName){
        const name = String(rawName||'').split('/')[0].trim().toLowerCase();
        if(!name) return 0;
        let c = 0;
        for(const r of MR){
          const w = lc(r[iW]||''); const l = lc(r[iL]||'');
          if(w===name || l===name) c++;
        }
        return c;
      }

      const cloned = same.map(r => r.slice(0));
      const qualified = [];
      const unqualified = [];
      cloned.forEach(r => {
        const games = gamesOf(r[IDX_NAME]);
        if(games >= 5){ qualified.push(r); }
        else { unqualified.push(r); }
      });

      qualified.forEach((r, i) => { r[0] = i+1; });
      unqualified.forEach(r => { r[0] = '–'; });

      // 자격자는 위, 미자격자는 아래로 표시
      const finalRows = [...qualified, ...unqualified];

      drawRankRows(finalRows);

      const st = document.getElementById('rankStatus');
      if(st){
        const q = qualified.length;
        const u = unqualified.length;
        st.textContent = `${tierName} 티어 • 총 ${q+u}명 (랭킹 대상 ${q}명 / 5경기 미만 ${u}명)`;
      }
    })();
  });
}
document.addEventListener('DOMContentLoaded', setupTierButtons);

// Patch openPlayer to show "(조커:1위)" style + crown
const __orig_openPlayer = window.openPlayer;
window.openPlayer = async function(bCellValue){
  if(!RANK_SRC.length) await loadRanking();
  const H = RANK_SRC[0]||[]; const rows = RANK_SRC.slice(1);
  // we need tier rank for the selected player
  let id = String(bCellValue||'').split('/')[0].trim();
  // Find the row
  const row = rows.find(r=> String(r[1]||'').split('/')[0].trim().toLowerCase() === id.toLowerCase());
  // Call original logic
  await __orig_openPlayer(bCellValue);
  try{
    if(!row) return;
    const info = getTierRankForPlayer(row, rows, H);
    // Find the ELO row container we rendered earlier
    const body = document.getElementById('playerBody');
    if(!body) return;
    // Find the line that contains "ELO"
    const rowsEls = Array.from(body.querySelectorAll('.row'));
    const eloRow = rowsEls.find(el => /ELO/i.test(el.textContent||''));
    if(eloRow){
      // Append "(티어:순위)" if missing
      const tierText = info.tierName ? ` (${info.tierName}:${info.tierRank??'-'}위)` : '';
      if (!eloRow.textContent.includes(tierText)){
        eloRow.innerHTML = eloRow.innerHTML + tierText;
      }
      // Append crown image if 1~3
      decoratePlayerEloWithCrown(eloRow, info.tierRank);
    }
  }catch(e){ console.warn('decorate crown failed', e); }
};


// === v9_80: '전체' filter + overall rank label + single-crown guard ===
function getOverallRankForPlayer(playerRow, allRows){
  const IDX_ELO = 9; // J
  const IDX_NAME = 1; // B
  const me = String(playerRow[IDX_NAME]||'').split('/')[0].trim().toLowerCase();
  const all = [...allRows];
  all.sort((a,b)=> parseEloText(b[IDX_ELO]) - parseEloText(a[IDX_ELO]));
  const pos = all.findIndex(r=> String(r[IDX_NAME]||'').split('/')[0].trim().toLowerCase() === me) + 1;
  return {overallRank: pos>0?pos:null, total: all.length};
}

// Remove any existing crown in ELO line
function clearExistingCrown(containerEl){
  if(!containerEl) return;
  containerEl.querySelectorAll('img.crown').forEach(n=>n.remove());
}

// Format "(전체:n위) (티어:n위)" && avoid duplication

function appendRankBadges(eloRowEl, infoOverall, infoTier){
  if(!eloRowEl) return;
  const overallText = infoOverall.overallRank? ` (전체:${infoOverall.overallRank}위)` : '';
  const tierText    = infoTier.tierName && infoTier.tierRank? ` (${infoTier.tierName}:${infoTier.tierRank}위)` : '';
  const want = overallText + tierText;
  if(!want) return;
  const txt = eloRowEl.textContent || '';
  // Order: 전체 먼저, 그 다음 티어
  if(!txt.includes('(전체:') && overallText) eloRowEl.innerHTML += overallText;
  if(infoTier.tierName && !txt.includes(`(${infoTier.tierName}:`)) eloRowEl.innerHTML += tierText;
}

// Decide a single crown: prefer tier rank if <=3; else overall if <=3
function pickSingleCrownRank(tierRank, overallRank){
  if (tierRank && tierRank<=3) return tierRank;
  if (overallRank && overallRank<=3) return overallRank;
  return null;
}

// Enhance tier buttons to support "전체"
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


// === v9_82: Remove old (n위) after ELO ===
function cleanOldRankPattern(eloRowEl){
  if(!eloRowEl) return;
  // Remove patterns like (1위), (23위) etc that appear right after ELO numbers
  eloRowEl.innerHTML = eloRowEl.innerHTML.replace(/\(\d+위\)/g,'');
}

// Override openPlayer once more to add overall + tier ranks && single crown
const __prev_openPlayer_v979 = window.openPlayer;
window.openPlayer = async function(bCellValue){
  if(!RANK_SRC.length) await loadRanking();
  const rows = RANK_SRC.slice(1);
  const nameKey = String(bCellValue||'').split('/')[0].trim().toLowerCase();
  const row = rows.find(r=> String(r[1]||'').split('/')[0].trim().toLowerCase() === nameKey);
  await __prev_openPlayer_v979(bCellValue);
  try{
    const body = document.getElementById('playerBody');
    if(!body || !row) return;
    const infoTier = getTierRankForPlayer(row, rows);
    const infoOverall = getOverallRankForPlayer(row, rows);
    const eloRow = Array.from(body.querySelectorAll('.row')).find(el => /ELO/i.test(el.textContent||''));
    if(!eloRow) return;
    cleanOldRankPattern(eloRow);
    // badges
    appendRankBadges(eloRow, infoOverall, infoTier);
    // single crown
    clearExistingCrown(eloRow);
    const cRank = pickSingleCrownRank(infoTier.tierRank, infoOverall.overallRank);
    decoratePlayerEloWithCrown(eloRow, cRank);
  }catch(e){ console.warn('openPlayer v980 add-ons failed', e); }
};



/* === v9_81: 전체경기기록 200행 페이지 버튼 (처음으로/맨마지막 버튼만) === */
(function(){
  const ROWS_PER_PAGE = 200;
  let __ALL_DATA = null;
  let __ALL_HEADERS = null;
  let __ALL_ROWS = null;
  let __ALL_PAGE = 1;
  let __ALL_TOTAL_PAGES = 1;

  function ensureAllPaginationContainer(){
    const wrap = document.querySelector('#all .table-wrap.full');
    if(!wrap) return null;
    let pag = document.getElementById('allPagination');
    if(!pag){
      pag = document.createElement('div');
      pag.id = 'allPagination';
      pag.style.display = 'flex';
      pag.style.gap = '6px';
      pag.style.justifyContent = 'center';
      pag.style.alignItems = 'center';
      pag.style.margin = '14px 0 6px 0';
      pag.style.flexWrap = 'wrap';
      wrap.after(pag);
    }
    return pag;
  }

  function renderAllPage(page){
    if (!__ALL_ROWS || !__ALL_HEADERS) return;
    const table = document.getElementById('allTable');
    if(!table) return;
    const thead = table.querySelector('thead');
    const tbody = table.querySelector('tbody');
    if(thead) {
      thead.innerHTML = '<tr>' + __ALL_HEADERS.map(h=>`<th>${h??''}</th>`).join('') + '</tr>';
    }
    if(tbody){
      tbody.innerHTML = '';
      const start = (page-1)*ROWS_PER_PAGE;
      const end = Math.min(start + ROWS_PER_PAGE, __ALL_ROWS.length);
      for(let i=start;i<end;i++){
        const r = __ALL_ROWS[i] || [];
        const tr = document.createElement('tr');
        r.forEach(v=>{
          const td = document.createElement('td');
          td.textContent = (v==null?'':v);
          tr.appendChild(td);
        });
        tbody.appendChild(tr);
      }
    }
    __ALL_PAGE = page;
    renderAllPagination();
  }

  function renderAllPagination(){
    const pag = ensureAllPaginationContainer();
    if(!pag) return;
    pag.innerHTML = '';

    const first = document.createElement('button');
    first.textContent = '처음으로';
    first.disabled = (__ALL_PAGE === 1);
    first.onclick = ()=>renderAllPage(1);
    pag.appendChild(first);

    const prev = document.createElement('button');
    prev.textContent = '이전';
    prev.disabled = (__ALL_PAGE <= 1);
    prev.onclick = () => renderAllPage(Math.max(1, __ALL_PAGE-1));
    pag.appendChild(prev);

    const MAX_BTN = 9;
    let start = Math.max(1, __ALL_PAGE - Math.floor(MAX_BTN/2));
    let end = Math.min(__ALL_TOTAL_PAGES, start + MAX_BTN - 1);
    if (end - start + 1 < MAX_BTN){
      start = Math.max(1, end - MAX_BTN + 1);
    }
    if (start > 1){
      const firstNum = document.createElement('button');
      firstNum.textContent = '1';
      firstNum.onclick = ()=>renderAllPage(1);
      pag.appendChild(firstNum);
      if (start > 2){
        const dots = document.createElement('span');
        dots.textContent = '…';
        dots.style.padding = '0 4px';
        pag.appendChild(dots);
      }
    }

    for(let i=start;i<=end;i++){
      const btn = document.createElement('button');
      btn.textContent = String(i);
      if(i===__ALL_PAGE){
        btn.style.fontWeight = '900';
        btn.style.border = '1px solid #a78d40';
        btn.style.color = '#a78d40';
      }
      btn.onclick = ()=>renderAllPage(i);
      pag.appendChild(btn);
    }

    if (end < __ALL_TOTAL_PAGES){
      if (end < __ALL_TOTAL_PAGES - 1){
        const dots2 = document.createElement('span');
        dots2.textContent = '…';
        dots2.style.padding = '0 4px';
        pag.appendChild(dots2);
      }
      const lastNum = document.createElement('button');
      lastNum.textContent = String(__ALL_TOTAL_PAGES);
      lastNum.onclick = ()=>renderAllPage(__ALL_TOTAL_PAGES);
      pag.appendChild(lastNum);
    }

    const next = document.createElement('button');
    next.textContent = '다음';
    next.disabled = (__ALL_PAGE >= __ALL_TOTAL_PAGES);
    next.onclick = () => renderAllPage(Math.min(__ALL_TOTAL_PAGES, __ALL_PAGE+1));
    pag.appendChild(next);

    const last = document.createElement('button');
    last.textContent = '맨마지막';
    last.disabled = (__ALL_PAGE === __ALL_TOTAL_PAGES);
    last.onclick = ()=>renderAllPage(__ALL_TOTAL_PAGES);
    pag.appendChild(last);
  }

  async function buildAllMatchesPaged(force=false){
    try{
      const table = document.getElementById('allTable');
      if(!table) return;
      if(__ALL_DATA && !force){
        __ALL_TOTAL_PAGES = Math.max(1, Math.ceil(__ALL_ROWS.length / ROWS_PER_PAGE));
        renderAllPage(__ALL_PAGE || 1);
        return;
      }
      const src = window.SHEETS && window.SHEETS.all;
      if(!src) return;
      __ALL_DATA = await fetchGVIZ(src);
      if(!__ALL_DATA.length) return;
      __ALL_HEADERS = __ALL_DATA[0] || [];
      __ALL_ROWS = __ALL_DATA.slice(1) || [];
      __ALL_TOTAL_PAGES = Math.max(1, Math.ceil(__ALL_ROWS.length / ROWS_PER_PAGE));
      __ALL_PAGE = 1;
      renderAllPage(1);
    }catch(e){
      console.warn('buildAllMatchesPaged error', e);
    }
  }

  document.addEventListener('DOMContentLoaded', ()=>{ buildAllMatchesPaged(); });
  window.buildAllMatchesPaged = buildAllMatchesPaged;
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
            img.src = logo;
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
        img.src = logo;
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




