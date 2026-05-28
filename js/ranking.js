// ==============================
// ranking.js
// Modular rebuild version
// ==============================

let RANK_SRC = [];
     * Rank: A:J only, enter-to-search
async function loadRanking(){
  if(rankStatus) rankStatus.textContent='시트에서 데이터를 불러오는 중…';
  [RANK_SRC, MATCH_SRC] = await Promise.all([ fetchGVIZ(SHEETS.rank), fetchGVIZ(SHEETS.matches) ]);
  if(!RANK_SRC.length){ if(rankStatus) rankStatus.textContent='불러오기 실패(권한/네트워크/CORS 확인)'; return; }
  await loadClanRankCache();
  let rows = RANK_SRC.slice(1).map(r=>{
    const clan = getClanRankRow(copy[1]) || {};
      copy.__tierRank = '-';
      copy.__totalRank = '-';
      copy.__tierRank = clan.tierRank || '-';
      copy.__totalRank = clan.totalRank || '-';
  window.currentRankRows = rows;
  drawRankRows(rows);
  if(rankStatus) rankStatus.textContent=`불러오기 완료 • ${RANK_SRC.length-1}행`;
$('rankRefresh')?.addEventListener('click', loadRanking);
$('rankSearchBtn')?.addEventListener('click', ()=>{
  const q = lc($('rankSearch').value || '').trim();
  if (!q) { drawRankRows(RANK_SRC.slice(1)); return; }
  const rows = (RANK_SRC.slice(1) || []).filter(r => {
    drawRankRows(rows);
    const suggest = (RANK_SRC.slice(1) || []).filter(r => {
    drawRankRows(suggest);
$('rankSearch')?.addEventListener('keydown', e=>{
    const q = lc($('rankSearch').value || '').trim();
    const matchRow = (RANK_SRC.slice(1) || []).find(r => {
    const suggest = (RANK_SRC.slice(1) || []).filter(r => {
    drawRankRows(suggest);
// === Clan member ranking source (E/F/G columns) ===
let CLAN_RANK_CACHE = null;
async function loadClanRankCache(){
  if(CLAN_RANK_CACHE) return CLAN_RANK_CACHE;
    CLAN_RANK_CACHE = rows.map(r=>({
      tierRank: String(r[5]||'').trim(),
      totalRank: String(r[6]||'').trim()
    return CLAN_RANK_CACHE;
    console.error('loadClanRankCache', e);
    CLAN_RANK_CACHE = [];
  const rows = CLAN_RANK_CACHE || [];
function rankNum(v){
  if(!RANK_SRC.length) await loadRanking();
  const header = RANK_SRC[0]||[]; const rows = RANK_SRC.slice(1);
  await loadClanRankCache();
  const detailTierRank = clanRow.tierRank || '-';
  const detailTotalRank = clanRow.totalRank || '-';
        <div class="row"><span class="badge">티어랭킹</span> ${detailTierRank && detailTierRank !== '-' ? detailTierRank + '위' : '-'}</div>
        <div class="row"><span class="badge">전체랭킹</span> ${detailTotalRank && detailTotalRank !== '-' ? detailTotalRank + '위' : '-'}</div>
// ===== Pro Rank (AS-IS) =====
// ===== Pro Rank (IMAGE() 대응 & 중괄호 수정 완료 버전) =====
async function loadProRank(){
  const t = $('proRankTable');
  const d = await fetchGVIZ(SHEETS.proRank);
  const rankIdx = header.findIndex(h => /순위|rank/i.test(String(h||'')));
    const rankVal = (rankIdx >= 0) ? parseInt((r||[])[rankIdx], 10) : NaN;
    const rowRank = (Number.isFinite(rankVal) ? rankVal : (tbody.children.length + 1));
        if (i === rankIdx){
          td.classList.add('rank-cell');
          inline.className = 'rank-inline';
          if (rowRank === 1 || rowRank === 2 || rowRank === 3){
            crown.className = 'rank-badge';
            crown.src = (rowRank === 1) ? 'crown_gold.png' : (rowRank === 2) ? 'crown_silver.png' : 'crown_bronze.png';
          } else if (rowRank === 4){
            star.className = 'rank-star-inline';
            spacer.className = 'rank-spacer';
          num.className = 'rank-num';
try{ const initId = document.querySelector('.panel.active')?.id || 'rank'; activate(initId); }catch(_){}
  await loadRanking();
  await loadProRank();
  if (homeTop) homeTop.addEventListener('click', (e)=>{ e.preventDefault(); activate('rank'); });
        // 홈으로는 rank
        if (!tgt && /홈/.test(btn.textContent)) activate('rank');
(function v12_bindRankClick(){
  const table = document.getElementById('rankTable');
/* v12e rank row click strong */
    const tr = e.target.closest('#rankTable tbody tr');
    if(!Array.isArray(RANK_SRC) || !RANK_SRC.length){ if(typeof loadRanking==='function') loadRanking(); }
    const row = (RANK_SRC.slice? RANK_SRC.slice(1) : []).find(r=> String(r[1]||'').toLowerCase().includes(q));
// === 안전 복구용: drawRankRows 함수 재선언 (중복 방지) ===
function drawRankRows(rows){
    const rankTable = document.getElementById('rankTable');
    if (!rankTable) return;
    const header = RANK_SRC[0] || [];
    const thead = rankTable.querySelector('thead');
    const tbody = rankTable.querySelector('tbody');
    console.error('drawRankRows error', e);
// === v9_79: Tier filters + Tier-rank crowns ===
// Return {tierRank, totalInTier}
    if(!myName || !myTier) return {tierRank:null, totalInTier:0, tierName: myTier};
    qualified.sort((a,b)=> rankNum((getClanRankRow(a[IDX_NAME])||{}).totalRank) - rankNum((getClanRankRow(b[IDX_NAME])||{}).totalRank));
    const rank = qualified.findIndex(r => String(r[IDX_NAME]||'').split('/')[0].trim().toLowerCase() === myName) + 1;
    return {tierRank: rank>0?rank:null, totalInTier: qualified.length, tierName: myTier};
  if (tierRank === 1){ img.src='./crown_gold.png'; }
  else if (tierRank === 2){ img.src='./crown_silver.png'; }
  else if (tierRank === 3){ img.src='./crown_bronze.png'; }
// Hook Tier buttons in Rank page
      if(!RANK_SRC.length || !MATCH_SRC.length){
        await loadRanking();
        const rows = RANK_SRC.slice(1);
        qualified.sort((a,b)=> rankNum((getClanRankRow(a[IDX_NAME])||{}).totalRank) - rankNum((getClanRankRow(b[IDX_NAME])||{}).totalRank));
        drawRankRows(finalRows);
        const st = document.getElementById('rankStatus');
      const rows = RANK_SRC.slice(1);
      same.sort((a,b)=> rankNum((getClanRankRow(a[IDX_NAME])||{}).tierRank) - rankNum((getClanRankRow(b[IDX_NAME])||{}).tierRank));
      drawRankRows(finalRows);
      const st = document.getElementById('rankStatus');
// disabled old rank patch
  if(!RANK_SRC.length) await loadRanking();
  const H = RANK_SRC[0]||[]; const rows = RANK_SRC.slice(1);
      const tierText = info.tierName ? ` (${info.tierName}:${info.tierRank??'-'}위)` : '';
// === v9_80: '전체' filter + overall rank label + single-crown guard ===
  return {overallRank: pos>0?pos:null, total: all.length};
function appendRankBadges(eloRowEl, infoOverall, infoTier){
  const overallText = infoOverall.overallRank? ` (전체:${infoOverall.overallRank}위)` : '';
  const tierText    = infoTier.tierName && infoTier.tierRank? ` (${infoTier.tierName}:${infoTier.tierRank}위)` : '';
// Decide a single crown: prefer tier rank if <=3; else overall if <=3
function pickSingleCrownRank(tierRank, overallRank){
  if (tierRank && tierRank<=3) return tierRank;
  if (overallRank && overallRank<=3) return overallRank;
        if(!RANK_SRC.length) await loadRanking();
        const H = RANK_SRC[0]||[]; const rows = RANK_SRC.slice(1);
        drawRankRows(out);
        const st = document.getElementById('rankStatus');
function cleanOldRankPattern(eloRowEl){
  if(!RANK_SRC.length) await loadRanking();
  const rows = RANK_SRC.slice(1);
    cleanOldRankPattern(eloRow);
    appendRankBadges(eloRow, infoOverall, infoTier);
    const cRank = pickSingleCrownRank(infoTier.tierRank, infoOverall.overallRank);
  function waitForRankData(cb, tries=0){
    if (typeof RANK_SRC !== 'undefined' && Array.isArray(RANK_SRC) && RANK_SRC.length > 1){
    setTimeout(function(){ waitForRankData(cb, tries+1); }, 500);
        var row = (RANK_SRC.slice(1)||[]).find(function(r){
      var row = (RANK_SRC.slice(1)||[]).find(function(r){
    (RANK_SRC.slice(1)||[]).forEach(function(r){
    attachSearch('rankSearch');
    if (typeof RANK_SRC !== 'undefined'){
      waitForRankData(function(){