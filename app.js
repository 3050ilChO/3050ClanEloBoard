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

// === Hall of Fame popup links (configurable) ===
const HOF_LINKS = {
  pro: "https://docs.google.com/spreadsheets/d/1llp7MXLWxOgCUMdmvy3wnTGaf3uAfZam0TMXKGTy5ic/edit?gid=1658280214#gid=1658280214",
  tst: "https://docs.google.com/spreadsheets/d/1llp7MXLWxOgCUMdmvy3wnTGaf3uAfZam0TMXKGTy5ic/edit?gid=381201435#gid=381201435",
  tsl: "https://docs.google.com/spreadsheets/d/1llp7MXLWxOgCUMdmvy3wnTGaf3uAfZam0TMXKGTy5ic/edit?gid=2130451924#gid=2130451924"
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
  const row = rows.find(r=> lc(String(r[1]||'').split('/')[0].trim())===lc(id));
  if(!row){ if(body) body.innerHTML='<div class="err">선수를 찾을 수 없습니다.</div>'; activate('player'); return; }

  const COL = { B:1, C:2, D:3, J:9, L:11 };
  const playerName = String(row[COL.B]||'').split('/')[0].trim();
  const currentRace = String(row[COL.C]||'').trim().toUpperCase();
  const tier = String(row[COL.D]||'').trim();
  const eloText = String(row[COL.J] ?? '');
  const awardsRaw = String(row[COL.L] ?? '');

  const data = MATCH_SRC.length? MATCH_SRC : await fetchGVIZ(SHEETS.matches);
  const MH = data[0]||[]; const M = data.slice(1);
  const you = lc(playerName);
  const yourRows = M.filter(r=>{
    const w = lc(r[ findIdx(MH, /승자\s*선수|winner/i) ]||'');
    const l = lc(r[ findIdx(MH, /패자\s*선수|loser/i) ]||'');
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

    `;
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

// === ELO 변동추이 (정밀 v4: 전용 시트 '(개인전)경기기록데이터'에서 계산, 전체 기간) ===
  try{
    // 1) 전용 소스에서 원본 데이터 로드
    const eloSrc = { id:"1F6Ey-whXAsTSMCWVmfexGd77jj6WDgv6Z7hkK3BHahs", sheet:"(개인전)경기기록데이터", range:"A:Z" };
    const E = await fetchGVIZ(eloSrc);
    if (!E.length) throw new Error("개인전 시트 비어있음");
    const EH = E[0]||[]; const ER = E.slice(1);
    const idxDate = EH.findIndex(h=>/날짜|경기일자|date/i.test(h));
    const idxWinN = EH.findIndex(h=>/승자\s*선수|winner/i.test(h)); // C
    const idxLoseN = EH.findIndex(h=>/패자\s*선수|loser/i.test(h)); // F
    // 고정 인덱스: A:0 ... J:9, K:10, L:11, M:12, N:13, O:14, P:15
    const K_PRE_WIN = 10, M_POST_WIN = 12, N_PRE_LOSE = 13, P_POST_LOSE = 15;

    const cleanNum = x => {
      const s = String(x??'').replace(/[^0-9.\-]/g,'').trim();
      if (!s) return NaN;
      const n = Number(s);
      return Number.isFinite(n) ? n : NaN;
    };
    const toDate = s => {
      const t = String(s||'').replace(/\./g,'-').replace(/\.$/,'').trim();
      const d = new Date(t);
      return Number.isNaN(d.getTime()) ? null : d;
    };

    // 2) 본인 경기만 필터 + 날짜/전후ELO 추출
    const rowsMine = ER.map(r=>{
      const dStr = String(idxDate>=0 ? r[idxDate] : "");
      const d = toDate(dStr);
      const isWin  = lc(r[idxWinN]||"")  === you;
      const isLose = lc(r[idxLoseN]||"") === you;
      let pre = NaN, post = NaN;
      if (isWin)  { pre = cleanNum(r[K_PRE_WIN]); post = cleanNum(r[M_POST_WIN]); }
      if (isLose) { pre = cleanNum(r[N_PRE_LOSE]); post = cleanNum(r[P_POST_LOSE]); }
      return { dStr, d, pre, post, isMine: (isWin||isLose) };
    }).filter(x=> x.isMine && x.d).sort((a,b)=> (a.d>b.d?1:-1));

    // 3) 날짜별 최종 경기후 ELO만 사용
    const byDay = new Map();
    rowsMine.forEach(m => byDay.set(m.dStr, m)); // 같은 날 마지막 경기로 덮어쓰기
    const daily = Array.from(byDay.entries())
                  .sort((a,b)=> (new Date(a[0]) > new Date(b[0]) ? 1 : -1))
                  .map(([dStr, m])=> ({ dStr, pre: m.pre, post: m.post }));

    if (body && daily.length){
      body.insertAdjacentHTML('beforeend', `
        <hr class="gold"/>
        <h3>ELO 변동추이</h3>
        <div class="chart-wrap"><canvas id="eloChart" height="170"></canvas></div>
      `);

      const labels = daily.map(x=>x.dStr);
      const series = [];
      let carry = Number(String(eloText).replace(/[^0-9.]/g,''));
      if (!Number.isFinite(carry) || carry<300) carry = 1500;
      daily.forEach(x=>{
        let v = Number.isFinite(x.post) ? x.post : (Number.isFinite(x.pre) ? x.pre : carry);
        if (!Number.isFinite(v)) v = carry;
        series.push(Math.round(v*10)/10);
        carry = v;
      });

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
              title:{ display:true, text:'ELO 변동 추이 (전체 기간, 날짜별 최종값)' },
              datalabels:{ display:false }
            },
            scales:{ y:{ title:{display:true,text:'ELO'} } }
          }
        });
      }
    }
  }catch(e){ console.warn('elo v4 error', e); }
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
    })).sort((a,b)=> (a.d > b.d ? 1 : -1))).slice(-10);

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
}
tabs.forEach(btn=>btn.addEventListener('click',()=>activate(btn.dataset.target)));

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

    // 2.2 Attach fresh click handler
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

    // 2.3 Reset handler
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
   Ensures Chart.js and canvases load correctly after full page render.
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

// === v9_65 Final Fix: Global Button Handlers Restored ===
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
    const m = String(fullUrl).match(/spreadsheets\/d\/([^/]+)\/edit.*?[?&#]gid=(\d+)/);
    if(!m) throw new Error("Invalid sheet URL: "+fullUrl);
    const id=m[1], gid=m[2];
    const gvizBase = `https://docs.google.com/spreadsheets/d/${id}/gviz/tq?tqx=out:json&gid=${gid}`;
    const gviz = (window.USE_PROXY ? window.PROXY_URL : '') + gvizBase;
    const res = await fetch(gviz, {cache:'no-store'});
    const text = await res.text();
    let payload = text;
// Handle both raw JSON and the common GVIZ wrapper: google.visualization.Query.setResponse(...)
const mWrap = payload.match(/setResponse\((.*)\)\s*;?\s*$/s);
if(mWrap && mWrap[1]) payload = mWrap[1];
// Otherwise, trim to the first '{' and the last '}'
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
    const elA = document.getElementById('activeCount');
    if(elA) elA.textContent = fmtNum(active)+'명';
  }catch(e){ console.error('activeCount set error', e); }
  try{
    // total matches: (개인전)경기기록데이터!A2:A
    const total = matchRows.length ? matchRows.slice(1).filter(r=> String(r[0]||'').trim()).length : 0;
    const elT = document.getElementById('totalMatches');
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
        // handle yyyy-mm-dd or yyyy/mm/dd or Date object-ish
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
    const elU = document.getElementById('lastUpdate');
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


/* v12f normalize race tags: map 저그/프로토스/테란 and variants to Z/P/T */
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
    const m = String(fullUrl).match(/spreadsheets\/d\/([^/]+)\/edit.*?[?&#]gid=(\d+)/);
    if(!m) throw new Error("Invalid sheet URL: "+fullUrl);
    const id=m[1], gid=m[2];
    const gviz = `https://docs.google.com/spreadsheets/d/${id}/gviz/tq?tqx=out:json&gid=${gid}`;
    const res = await fetch(gviz,{cache:'no-store'});
    const text = await res.text();
    const body = (text.match(/setResponse\((.*)\);?\s*$/s)||[])[1];
    const json = JSON.parse(body);
    const table=json.table||{};
    const rows=(table.rows||[]).map(r=>(r.c||[]).map(c=>(c&&(c.f??c.v))??''));
    return rows;
  }catch(e){ console.error('fetchGVIZbyUrl_v12b error', e); return []; }
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
    // same-tier rows
    const same = allRows.filter(r => String(r[IDX_TIER]||'').trim() === myTier);
    // sort by ELO desc
    same.sort((a,b)=> parseEloText(b[IDX_ELO]) - parseEloText(a[IDX_ELO]));
    const rank = same.findIndex(r => String(r[IDX_NAME]||'').split('/')[0].trim().toLowerCase() === myName) + 1;
    return {tierRank: rank>0?rank:null, totalInTier: same.length, tierName: myTier};
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

// Format "(전체:n위) (티어:n위)" and avoid duplication

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

// Override openPlayer once more to add overall + tier ranks and single crown
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
      opt.value = id;    // browser handles case-insensitive suggestion visually
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
    tsl:{ url: (typeof HOF_LINKS!=='undefined'? HOF_LINKS.tsl : ''), title:"TSL 3050스타리그" }
  };

  const $ = (id)=>document.getElementById(id);

  function openPopup(){ const el=$("hofPopup"); if(el) el.setAttribute('aria-hidden','false'); }
  function closePopup(){ const el=$("hofPopup"); if(el) el.setAttribute('aria-hidden','true'); }

  function normData(data){
    if(!Array.isArray(data) || !data.length) return [];
    let maxCols = 0
    for(const r of data){ maxCols = Math.max(maxCols, (r||[]).length); }
    // detect last useful col
    let last = maxCols - 1;
    while(last>=0){
      let allEmpty = true;
      for(const r of data){
        const v = (r||[])[last];
        if(v!=null && String(v).trim()!==''){ allEmpty=false; break; }
      }
      if(!allEmpty) break;
      last -= 1;
    }
    if(last < 0) return [];
    return data.map(r => (r||[]).slice(0, last+1));
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


  // Per-league inline HOF cache to prevent table/season state leaking across PRO/TST/TSL
  const HOF_INLINE_CACHE = { pro: null, tst: null, tsl: null };
  let HOF_INLINE_CURRENT = 'pro';


  async function openHOF(key){
    HOF_INLINE_CURRENT = key || 'pro';
    const c = cfg[key];
    if(!c) return;
    if(!c.url){
      console.warn('HOF: missing url', key);
      return;
    }

    const titleEl = $("hofInlineTitle");
    const statusEl = $("hofInlineStatus");
    const tableEl = $("hofInlineTable");

    if(titleEl) titleEl.textContent = c.title;
    // menu active
    const proBtn = $('hofPro'); const tstBtn = $('hofTST'); const tslBtn = $('hofTSL');
    [proBtn,tstBtn,tslBtn].forEach(b=>{ if(!b) return; b.classList.remove('active'); b.setAttribute('aria-selected','false'); });
    const pickBtn = (key==='pro')?proBtn:(key==='tst')?tstBtn:tslBtn;
    if(pickBtn){ pickBtn.classList.add('active'); pickBtn.setAttribute('aria-selected','true'); }
    if(statusEl){ statusEl.style.display='block'; statusEl.textContent = '시트에서 데이터를 불러오는 중…'; }
    const inlineBox = $('hofInline');
    if(inlineBox){ inlineBox.style.display='block'; }

    try{
      // URL(edit?gid=...) 기반으로 그대로 로딩 → 기존 연동 유지
      let data = await fetchGVIZbyUrl_v12b(c.url);
      data = normData(data);
      if(!data.length){
        if(statusEl) statusEl.textContent = '데이터가 없습니다.';
        if(tableEl) renderTable(tableEl, []);
        return;
      }
      if(tableEl){
      renderTable(tableEl, data);

      // Post-processing should never break rendering
      try{ markHofTitleCells(tableEl); }catch(_){}
      try{ convertImageUrlCells(tableEl); }catch(_){}

      let seasonsSorted = [];
      let active = '';
      let meta = null;

      try{
        const grp = applySeasonGrouping(tableEl);
        seasonsSorted = (grp.seasons||[]).slice().map(_normSeasonText).filter(Boolean)
          .sort((a,b)=> (extractSeasonNum(b)-extractSeasonNum(a)) || String(a).localeCompare(String(b),'ko'));
        active = seasonsSorted[0] || grp.active || '';
      }catch(_){}

      try{
        meta = buildSeasonMeta(tableEl);
      }catch(_){ meta = null; }

      // Cache pristine HTML + season metadata per league (used by season filter restore)
      try{
        HOF_INLINE_CACHE[key] = { html: tableEl.innerHTML, seasons: seasonsSorted, meta };
      }catch(_){}
      // 시즌 탭 기능 제거: 전체 목록만 표시
      try{ const bar = document.getElementById('hofInlineSeasonBar') || document.getElementById('hofSeasonBar'); if(bar) bar.innerHTML=''; }catch(_){}
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
    const tstBtn = $("hofTST");
    const tslBtn = $("hofTSL");

    // Stop bubbling so any legacy parent click handlers (that used to open Google Sheets) won't fire.
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
  }

  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded', bindOnce);
  else bindOnce();

  document.addEventListener('keydown', (e)=>{ if(e.key==='Escape') closeMobile(); });
})();



function extractSeasonNum(s){
  const t = String(s||'');
  let m = t.match(/\bS\s*(\d+)\b/i);
  if(!m) m = t.match(/시즌\s*(\d+)/i);
  return m ? parseInt(m[1],10) : 0;
}

/* === 시즌 대표 행 감지 (예: 스타리그 2019 (시즌1)) === */
function applySeasonGrouping(tableEl){
  const _normLocal = (s)=> String(s||'')
    .replace(/[\u200B-\u200D\uFEFF]/g,'')
    .replace(/\u00A0/g,' ')
    .replace(/[–—−]/g,'-')
    .replace(/\s+/g,' ')
    .trim();
  if(!tableEl) return { seasons: [], active: '' };
  const rows = Array.from(tableEl.querySelectorAll("tbody tr"));
  const seasons = [];

  const isSeasonHeader = (txt, tr)=>{
    const t = _normLocal(txt);
    if(!t) return false;
    const seasonLike =
      /(시즌\s*0*\d+)/i.test(t) ||
      /(S\s*0*\d+)/i.test(t) ||
      /(\d{2}\s*-\s*\d{2}.*S\s*\d+)/i.test(t) ||
      (/(프로리그|TSL|TST)/i.test(t) && /(S\s*0*\d+)/i.test(t));

    if(!seasonLike) return false;

    // Often header rows have many empty cells
    if(tr){
      const tds = Array.from(tr.querySelectorAll('td,th'));
      const nonEmpty = tds.map(td=>String(td.textContent||'').trim()).filter(Boolean);
      if(nonEmpty.length <= Math.min(2, tds.length)) return true;
    }
    return true;
  };

  rows.forEach(tr=>{
    const tds = Array.from(tr.querySelectorAll('td,th'));
    const rowSeasons = [];
    // Mark every cell that looks like a season header (some layouts have 2 seasons on one row)
    tds.forEach(td=>{
      const txt = (td.textContent || '').trim();
      if(!txt) return;
      if(isSeasonHeader(txt, tr)){
        td.classList.add('season-header-cell');
        rowSeasons.push(txt);
        if(!seasons.includes(txt)) seasons.push(txt);
      }
    });
    // Store all seasons appearing in this row (used for highlighting/scrolling)
    tr.dataset.seasons = rowSeasons.join('||');
    if(rowSeasons.length) tr.classList.add('season-header-row');
  });

  return { seasons, active: seasons[0] || '' };
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
  // 시즌 탭 기능 제거: 전체 목록만 표시
  const bar = document.getElementById('hofInlineSeasonBar') || document.getElementById('hofSeasonBar');
  if(bar) bar.innerHTML='';
  return;
}


// Normalize season label text for robust matching across slight formatting differences.
function _normSeasonText(s){
  // normalize spaces, zero-width chars, and dash variants for robust season matching
  return String(s||'')
    .replace(/[\u200B-\u200D\uFEFF]/g,'')
    .replace(/\u00A0/g,' ')
    .replace(/[–—−]/g,'-')
    .replace(/\s+/g,' ')
    .trim();
}



function applySeasonFilter(tableEl, season, leagueKey){
  if(!tableEl) return;

  const k = leagueKey || HOF_INLINE_CURRENT || 'pro';
  HOF_INLINE_CURRENT = k;

  // Restore original table HTML before applying any filter (per league key).
  if(!HOF_INLINE_CACHE[k]) HOF_INLINE_CACHE[k] = {};
  if(!HOF_INLINE_CACHE[k].html){
    HOF_INLINE_CACHE[k].html = tableEl.innerHTML;
  }else{
    tableEl.innerHTML = HOF_INLINE_CACHE[k].html;
  }

  const seasonNorm = _normSeasonText(season||'');
  const wantNum = extractSeasonNum(seasonNorm);

  // If no season selected, keep as-is.
  if(!seasonNorm && !wantNum) return;

  const tbody = tableEl.tBodies && tableEl.tBodies.length ? tableEl.tBodies[0] : null;
  if(!tbody) return;

  const rows = Array.from(tbody.querySelectorAll('tr'));
  if(!rows.length) return;

  // Heuristic: detect two-block layout (left + right blocks in one wide row)
  const cellCounts = rows.map(r => (r.children ? r.children.length : 0));
  const maxCells = cellCounts.reduce((a,b)=>Math.max(a,b),0);
  const splitIndex = (maxCells >= 8) ? Math.floor(maxCells/2) : 0;

  const isTitleRow = (tr)=>{
    const t = _normSeasonText(tr.textContent||'');
    return /명예의전당/i.test(t);
  };

  const looksLikeSeasonHeaderText = (t)=>{
    const s = _normSeasonText(t||'');
    if(!s) return false;
    // Must include S# or 시즌# and some league-ish clue to avoid false positives.
    const hasSeason = /(S\s*0*\d+)/i.test(s) || /(시즌\s*0*\d+)/i.test(s);
    if(!hasSeason) return false;
    const hasClue = /(프로리그|TSL|TST|스타리그|리그|\d{2}\s*-\s*\d{2})/i.test(s);
    return hasClue;
  };

  const parseSeasonInfo = (t)=>{
    const label = _normSeasonText(t||'');
    const num = extractSeasonNum(label);
    return { label, num };
  };

  // Current season context while scanning down the table
  let curSingle = { label:'', num:0 };
  let curLeft   = { label:'', num:0 };
  let curRight  = { label:'', num:0 };

  const match = (info)=>{
    if(!info) return false;
    if(wantNum>0) return info.num === wantNum;
    return _normSeasonText(info.label||'') === seasonNorm;
  };

  const newBody = document.createElement('tbody');

  rows.forEach((tr)=>{
    const cells = Array.from(tr.children||[]);

    // Keep title row always (and left-align)
    if(isTitleRow(tr)){
      const tr2 = document.createElement('tr');
      cells.forEach(td=>{
        const td2 = td.cloneNode(true);
        td2.style.textAlign='left';
        td2.style.paddingLeft='16px';
        tr2.appendChild(td2);
      });
      newBody.appendChild(tr2);
      return;
    }

    // Detect season header cells on THIS row (no reliance on pre-applied classes)
    const headerCells = [];
    cells.forEach((td, idx)=>{
      const t = td.textContent || '';
      if(looksLikeSeasonHeaderText(t)){
        const info = parseSeasonInfo(t);
        if(splitIndex>0){
          headerCells.push({ side: (idx < splitIndex) ? 'left' : 'right', info, idx });
        }else{
          headerCells.push({ side: 'single', info, idx });
        }
      }
    });

    // Update current context if this row introduces a new season header
    if(headerCells.length){
      headerCells.forEach(h=>{
        if(h.side==='left')  curLeft = h.info;
        else if(h.side==='right') curRight = h.info;
        else curSingle = h.info;
      });

      // Include the season header row only if it matches the selected season
      let keepHeader = false;
      let keepSide = 'single';
      if(splitIndex>0){
        if(match(curLeft)){ keepHeader = true; keepSide='left'; }
        else if(match(curRight)){ keepHeader = true; keepSide='right'; }
      }else{
        keepHeader = match(curSingle);
      }

      if(!keepHeader) return;

      const tr2 = document.createElement('tr');
      if(splitIndex>0){
        if(keepSide==='left'){
          for(let i=0;i<cells.length;i++) if(i < splitIndex) tr2.appendChild(cells[i].cloneNode(true));
        }else{
          for(let i=0;i<cells.length;i++) if(i >= splitIndex) tr2.appendChild(cells[i].cloneNode(true));
        }
      }else{
        cells.forEach(td=> tr2.appendChild(td.cloneNode(true)));
      }
      newBody.appendChild(tr2);
      return;
    }

    // Regular data rows: keep rows that are under the selected season context
    let keep = false;
    let keepSide = 'single';
    if(splitIndex>0){
      if(match(curLeft)){ keep=true; keepSide='left'; }
      else if(match(curRight)){ keep=true; keepSide='right'; }
    }else{
      keep = match(curSingle);
    }
    if(!keep) return;

    const tr2 = document.createElement('tr');
    if(splitIndex>0){
      if(keepSide==='left'){
        for(let i=0;i<cells.length;i++) if(i < splitIndex) tr2.appendChild(cells[i].cloneNode(true));
      }else{
        for(let i=0;i<cells.length;i++) if(i >= splitIndex) tr2.appendChild(cells[i].cloneNode(true));
      }
    }else{
      cells.forEach(td=> tr2.appendChild(td.cloneNode(true)));
    }

    // Skip visually empty rows
    const hasImg = !!tr2.querySelector('img');
    const text = Array.from(tr2.children||[]).map(c=> (c.textContent||'').trim()).join('');
    if(!hasImg && !text) return;

    newBody.appendChild(tr2);
  });

  // Swap tbody (safe, keeps thead intact)
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



