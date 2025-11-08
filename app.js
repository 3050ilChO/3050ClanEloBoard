// === Rank Search Enhancement v115 (Exact-First) ===
$('rankSearchBtn')?.addEventListener('click', ()=>{
  const q = lc($('rankSearch').value || '').trim();
  if (!q) {
    drawRankRows(RANK_SRC.slice(1));
    return;
  }

  // 정확 일치 우선 필터링
  const exactMatches = RANK_SRC.slice(1).filter(r => {
    const playerName = lc(String(r[1] || '').split('/')[0].trim());
    return playerName === q;
  });

  const prefixMatches = RANK_SRC.slice(1).filter(r => {
    const playerName = lc(String(r[1] || '').split('/')[0].trim());
    return playerName.startsWith(q);
  });

  // 정확 일치 먼저, 그 다음 시작 일치
  const combined = [...exactMatches, ...prefixMatches.filter(r => !exactMatches.includes(r))];

  // 정렬은 가나다 순 유지
  const sorted = combined.sort((a, b) => {
    const aName = lc(String(a[1] || '').split('/')[0].trim());
    const bName = lc(String(b[1] || '').split('/')[0].trim());
    return aName.localeCompare(bName, 'ko', {numeric:true});
  });

  drawRankRows(sorted);

  // 정확히 일치하는 플레이어가 있을 경우 자동으로 해당 선수 열기
  if (exactMatches.length === 1) {
    openPlayer(exactMatches[0][1]);
  }
});
