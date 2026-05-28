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

  await loadClanRankCache();
  const clanRow = getClanRankRow(playerName) || {};
  const detailElo = clanRow.elo || eloText || '-';
  const detailTierRank = clanRow.tierRank || '-';
  const detailTotalRank = clanRow.totalRank || '-';
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
  
// ==============================
// 🔥 현재 프로리그 (S11) 성적 추가
// ==============================
const S11 = await fetchGVIZ({
  id: "1othAdoPUHvxo5yDKmEZSGH-cjslR1WyV90F7FdU30OE",
  sheet: "S11PlayerResult",
  range: "A:Z"
});

const currentSeason = "S11PlayerResult".match(/S\d+/)[0];
const S11H = S11[0] || [];
const S11R = S11.slice(1);

const s11Player = S11R.filter(r => {
  const pid = normalizeId(r[2]); // C열: 승자선수
  return pid === you;
});

let s11W = 0, s11L = 0;
s11Player.forEach(r => {
  const win = normalizeId(r[2]);  // 승자선수 (C열)
  const lose = normalizeId(r[5]); // 패자선수 (F열)
  if (win === you) s11W++;
  else if (lose === you) s11L++;
});

let s11Html = "";
if (s11Player.length === 0) {
  s11Html = `<tr><td>현재프로리그(${currentSeason})</td><td colspan="4">전적없음</td></tr>`;
} else {
  const total = s11W + s11L;
  const pct = total ? Math.round(s11W * 1000 / total) / 10 : 0;
  s11Html = `<tr><td>현재프로리그(${currentSeason})</td><td>${total}전</td><td>${s11W}</td><td>${s11L}</td><td>${pct}%</td></tr>`;
}

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
          ${s11Html}
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
        <div class="row"><span class="badge">ELO</span> ${detailElo}</div>
        <div class="row"><span class="badge">티어랭킹</span> ${detailTierRank && detailTierRank !== '-' ? detailTierRank + '위' : '-'}</div>
        <div class="row"><span class="badge">전체랭킹</span> ${detailTotalRank && detailTotalRank !== '-' ? detailTotalRank + '위' : '-'}</div>
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