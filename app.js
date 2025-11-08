// === Rank Search Enhancement v114 ===
$('rankSearchBtn')?.addEventListener('click', ()=>{
  const q = lc($('rankSearch').value || '').trim();
  if (!q) {
    drawRankRows(RANK_SRC.slice(1));
    return;
  }

  const rows = RANK_SRC.slice(1).filter(r => {
    const playerName = lc(String(r[1] || '').split('/')[0].trim());
    return playerName === q || playerName.startsWith(q);
  });

  const sorted = rows.sort((a, b) => {
    const aName = lc(String(a[1] || '').split('/')[0].trim());
    const bName = lc(String(b[1] || '').split('/')[0].trim());
    if (aName === q && bName !== q) return -1;
    if (aName !== q && bName === q) return 1;
    return aName.localeCompare(bName, 'ko');
  });

  drawRankRows(sorted);
});
