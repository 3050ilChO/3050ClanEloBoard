
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


/* 3050ClanEloBoard — v9_75_Final_FixAll
   - Keep data bindings in index.html (SHEETS) exactly as-is.
   - Fixes:
     * Player detail: show "주종" block, then OFF-race blocks per race that exists (Z/P/T except current)
     * H2H: enter-to-search; table renders; uses existing ELOboard A:Z
     * Schedule/ProRank: render sheet values AS-IS (no sort/format change) using formatted cell c.f if provided
     * Rank: A:J only, enter-to-search
     * Members: highlight rows by column B value (클랜마스터=연한노랑, 클랜 부마스터=연한파랑, 운영진=연한초록)
*/

function $(id){ return document.getElementById(id); }
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
    const headerHints = ['경기일자','승자','패자','맵','리그명','승자티어','패자티어','승자종족','패자종족','티어차이'];
    const firstRow = rows[0] || [];
    const hit = headerHints.some(h => firstRow.join('|').includes(h));
    if (hit) { headers = firstRow; rows.shift(); }
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
  const hr = document.createElement('tr');
  header.forEach(h=>{ const th=document.createElement('th'); th.textContent = (h ?? ''); hr.appendChild(th); });
  thead.appendChild(hr);
  (data.slice(1)||[]).forEach(r=>{
    const tr=document.createElement('tr');
    (r||[]).forEach(v=>{ const td=document.createElement('td'); td.textContent = (v ?? ''); tr.appendChild(td); });
    tbody.appendChild(tr);
  });
}

function percent(w,t){ return t? Math.round(w*1000/t)/10 : 0; }
function getRaceIcon(r){ const x=String(r||'').trim().toUpperCase(); if(x==='Z') return './z.png'; if(x==='P') return './p.png'; if(x==='T') return './t.png'; return ''; }

// Caches
let RANK_SRC=[], MATCH_SRC=[], ALL_CACHE=[], MEMBERS_CACHE=[], SCHED_CACHE=[];

// ===== Rank (list) =====
const rankStatus=$('rankStatus'); 
const rankTable=$('rankTable');
function drawRankRows(rows){
  if(!rankTable) return;
  const header=RANK_SRC[0]||[];
  const thead=rankTable.querySelector('thead'); const tbody=rankTable.querySelector('tbody');
  thead.innerHTML=''; tbody.innerHTML='';
  const hr=document.createElement('tr'); 
  (header.slice(0,10)||[]).forEach(h=>{ const th=document.createElement('th'); th.textContent=h??''; hr.appendChild(th);}); 
  thead.appendChild(hr);
  rows.forEach(r=>{
    const tr=document.createElement('tr');
    (r.slice(0,10)||[]).forEach((v,i)=>{
      const td=document.createElement('td');
      if(i===1 && v){
        const id=String(v).split('/')[0].trim();
        const a=document.createElement('a'); a.href='#'; a.textContent=id; a.addEventListener('click',(e)=>{e.preventDefault(); openPlayer(String(v));});
        td.appendChild(a);
      } else td.textContent=v??'';
      tr.appendChild(td);
    });
    tbody.appendChild(tr);
  });
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
  const q=lc($('rankSearch').value||''); if(!q){ drawRankRows(RANK_SRC.slice(1)); return; }
  const rows=RANK_SRC.slice(1).filter(r=> lc(r.join(' ')).includes(q)); drawRankRows(rows);
});
$('rankSearch')?.addEventListener('keydown', e=>{ if(e.key==='Enter') $('rankSearchBtn').click(); });

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
  const id = String(bCellValue||'').split('/')[0].trim();
  const body=$('playerBody'); const title=$('playerTitle'); if(title) title.textContent=id;
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
    <hr class="gold"/>
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
      <div class="awards">${awardsRaw || '-'}</div>
      <hr class="gold"/>
      ${leagueHtml}
    `;
  }

  // Graph untouched except safety
  try{
    const iDate = findIdx(MH, /경기일자|date/i);
    const iWinN = findIdx(MH, /승자\s*선수|winner/i);
    const seq = yourRows.map(r=>({d:String(iDate>=0? r[iDate]:''), v:(lc(r[iWinN]||'')===you)?1:-1})).sort((a,b)=> (a.d>b.d?1:-1));
    const labels = seq.map(s=>s.d);
    let cur = Number(String(eloText).replace(/,/g,'')) || 1500;
    const vals=[]; seq.forEach(x=>{ cur+=x.v*8; vals.push(Math.round(cur*10)/10); });
    // [ELO 그래프 캔버스 참조 제거]
    if(ctx){
      if(eloChart) // [ELO 그래프 객체 제거]

      eloChart = new Chart(ctx, { type:'line',
        data:{ labels, datasets:[{ label:'ELO POINT', data: vals, fill:false, tension:0, pointRadius:3 }]},
        options:{ responsive:true, plugins:{ legend:{display:true}, title:{display:true,text:'ELO 변동 추이'} },
                  scales:{ y:{ title:{display:true,text:'ELO'} } } }
      });
    }
  }catch(e){ console.warn('chart err', e); }

  // --- 최근 5경기 승패 그래프 (ELO 그래프 없이 추가) ---
  try {
    const iDate = findIdx(MH, /경기일자|date/i);
    const iWinN = findIdx(MH, /승자\s*선수|winner/i);
    const seq = yourRows.map(r=>({ d:String(iDate>=0? r[iDate]:""), res:(lc(r[iWinN]||"")===you)?"W":"L" }));
    seq.sort((a,b)=> (a.d > b.d ? 1 : (a.d < b.d ? -1 : 0)));
    const last5 = seq.slice(-5);

    if (body && last5.length){
      body.insertAdjacentHTML('beforeend', `
        <hr class="gold"/>
        <h3>최근 5경기 승패</h3>
        <div class="chart-wrap"><canvas id="recent5Chart" height="120"></canvas></div>
      `);

      const labels = last5.map((_,i)=>`G${i+1}`);
      const data = last5.map(g => g.res === 'W' ? 1 : -1);
      const colors = last5.map(g => g.res === 'W' ? '#3498db' : '#e74c3c');

      
      // --- 구분선 + 최근 5경기 테이블 ---
      if (body && last5.length){
        // Collect richer info for the last 5
        const iDate2 = iDate;
        const iWinN2 = iWinN;
        const iLoseN2 = findIdx(MH, /패자\s*선수|loser/i);
        const iMap2 = findIdx(MH, /맵|map/i);
        const rows5 = (yourRows.map(r=>({ 
          d:String(iDate2>=0? r[iDate2]:""), 
          res:(lc(r[iWinN2]||"")===you)?"W":"L",
          w:String(r[iWinN2]||""),
          l:String(iLoseN2>=0? r[iLoseN2]:""),
          m:String(iMap2>=0? r[iMap2]:"")
        })).sort((a,b)=> (a.d > b.d ? 1 : (a.d < b.d ? -1 : 0)))).slice(-5);

        const rowHtml = rows5.map(r=>{
          const opp = (lc(r.w)===you) ? r.l : r.w;
          const resTxt = r.res === "W" ? "승" : "패";
          return `<tr><td>${r.d||""}</td><td>${opp||""}</td><td>${resTxt}</td><td>${r.m||""}</td></tr>`;
        }).join("");

        body.insertAdjacentHTML('beforeend', `
          <hr class="gold"/>
          <h3>최근 5경기 (테이블)</h3>
          <div class="table-wrap">
            <table id="recent5Table">
              <thead>
                <tr><th>경기일자</th><th>상대</th><th>결과</th><th>맵</th></tr>
              </thead>
              <tbody>${rowHtml}</tbody>
            </table>
          </div>
        `);
      }
    
      const ctxR = document.getElementById('recent5Chart')?.getContext('2d');
      if (ctxR) {
        if (recent5Chart && typeof recent5Chart.destroy === 'function') {
          try { recent5Chart.destroy(); } catch(e){}
        }
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
              title: { display: true, text: '최근 5경기' },
              datalabels: {
                display: true,
                formatter: (v) => v > 0 ? 'W' : 'L'
              }
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
async function loadProRank(){
  const t=$('proRankTable'); const d=await fetchGVIZ(SHEETS.proRank);
  if(!d.length){ if(t) t.outerHTML='<div class="status err">프로리그순위 데이터 없음</div>'; return; }
  renderTable(t, d); // No sorting, no transforms
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
  window.open(url, 'schedPopup', 'width=1200,height=800,noopener');
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
  function $(id){ return document.getElementById(id); }

  // Scroll buttons
  document.addEventListener("DOMContentLoaded", () => {
    const up=$("#scrollUp"), down=$("#scrollDown");
    if(up && !up.dataset.bound){
      up.dataset.bound="1";
      up.addEventListener("click", ()=>window.scrollTo({top:0,behavior:"smooth"}));
    }
    if(down && !down.dataset.bound){
      down.dataset.bound="1";
      down.addEventListener("click", ()=>window.scrollTo({top:document.documentElement.scrollHeight,behavior:"smooth"}));
    }
  });

  // H2H - Dual Color & Map Compare
  document.addEventListener("DOMContentLoaded", ()=>{
    const runBtn=$("#h2hRun");
    if(!runBtn) return;
    const fresh=runBtn.cloneNode(true);
    runBtn.parentNode.replaceChild(fresh,runBtn);

    fresh.addEventListener("click", async ()=>{
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
    const fresh=run.cloneNode(true);run.parentNode.replaceChild(fresh,run);

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
    const freshRun = runBtn.cloneNode(true);
    runBtn.parentNode.replaceChild(freshRun, runBtn);

    const freshReset = resetBtn ? resetBtn.cloneNode(true) : null;
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
