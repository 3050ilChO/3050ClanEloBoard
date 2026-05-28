async function loadRanking(){
  if(rankStatus) rankStatus.textContent='시트에서 데이터를 불러오는 중…';
  [RANK_SRC, MATCH_SRC] = await Promise.all([ fetchGVIZ(SHEETS.rank), fetchGVIZ(SHEETS.matches) ]);
  // Backward compatibility: some functions expect MATCH_SRCH_SRC
  MATCH_SRCH_SRC = MATCH_SRC;
  if(!RANK_SRC.length){ if(rankStatus) rankStatus.textContent='불러오기 실패(권한/네트워크/CORS 확인)'; return; }
  (async function(){
  await loadClanRankCache();

  let rows = RANK_SRC.slice(1).map(r=>{
    const copy = [...r];

    const clan = getClanRankRow(copy[1]) || {};

    const tier = String(copy[3] || '').trim();
    const totalRecord = String(copy[7] || '');

    const gamesMatch = totalRecord.match(/(\\d+)전/);
    const games = gamesMatch ? Number(gamesMatch[1]) : 0;

    // 탈퇴 제외
    if(tier === '탈퇴'){
      return null;
    }

    // 시트값 그대로 사용
    copy[9] = clan.elo || copy[9];

    // 10전 미만은 랭킹 제외
    if(games < 10){
      copy.__tierRank = '-';
      copy.__totalRank = '-';
    }else{
      copy.__tierRank = clan.tierRank || '-';
      copy.__totalRank = clan.totalRank || '-';
    }

    return copy;
  })
  .filter(Boolean);

  // 페이지 이동시 동일 배열 사용
  window.currentRankRows = rows;

  // 절대 재정렬 금지
  drawRankRows(rows);
})();
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


// === Clan member ranking source (E/F/G columns) ===
let CLAN_RANK_CACHE = null;

async function loadClanRankCache(){
  if(CLAN_RANK_CACHE) return CLAN_RANK_CACHE;
  try{
    const data = await fetchGVIZ({
      id:"14FUpa0Hcgtx6J1ZByx-cXGfbF7_ze1edONz8Wt70Obw",
      sheet:"클랜원전체명단",
      range:"A:K"
    });

    const rows = (data||[]).slice(1);
    CLAN_RANK_CACHE = rows.map(r=>({
      tier: String(r[0]||'').trim(),
      id: String(r[1]||'').split('/')[0].trim(),
      elo: String(r[4]||'').trim(),
      tierRank: String(r[5]||'').trim(),
      totalRank: String(r[6]||'').trim()
    }));
    return CLAN_RANK_CACHE;
  }catch(e){
    console.error('loadClanRankCache', e);
    CLAN_RANK_CACHE = [];
    return [];
  }
}

function getClanRankRow(playerId){
  const key = normalizeId(playerId);
  const rows = CLAN_RANK_CACHE || [];
  return rows.find(r => normalizeId(r.id) === key) || null;
}

function rankNum(v){
  const s = String(v||'').trim();
  if(!s || s==='-') return 999999;
  const n = Number(s);
  return Number.isFinite(n) ? n : 999999;
}