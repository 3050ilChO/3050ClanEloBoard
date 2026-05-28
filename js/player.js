// ==============================
// player.js
// Modular rebuild version
// ==============================

// NOTE: Must be in global scope because openPlayer/search/h2h/etc. run outside IIFEs.
     * Player detail: show "주종" block, then OFF-race blocks per race that exists (Z/P/T except current)
    const uniq = Array.from(new Set((playerNames||[]).map(s=>String(s||'').trim()).filter(Boolean)));
      el = wrap.querySelector(`.tb-chip[data-player-key="${cssEscape(key)}"]`);
  // Build Tier -> Race -> Players
  // Wire search UI (autocomplete + scroll-to-player)
  const dl=$('playerList'); if(dl){ dl.innerHTML=''; RANK_SRC.slice(1).forEach(r=>{ const id=String(r[1]||'').split('/')[0].trim(); if(!id) return; const opt=document.createElement('option'); opt.value=id; dl.appendChild(opt); }); }
      openPlayer(matchRow[1]);
function getClanRankRow(playerId){
  const key = normalizeId(playerId);
// ===== Player Detail =====
async function openPlayer(bCellValue){
  if (window.__openingPlayer) return;
  window.__openingPlayer = true;
  const body=$('playerBody'); const title=$('playerTitle'); if(title) title.textContent=id; if(body) body.innerHTML='';
  if(!row){ if(body) body.innerHTML='<div class="err">선수를 찾을 수 없습니다.</div>'; activate('player'); return; }
  const playerName = String(row[COL.B]||'').split('/')[0].trim();
  const clanRow = getClanRankRow(playerName) || {};
  const you = normalizeId(playerName);
  sheet: "S11PlayerResult",
const currentSeason = "S11PlayerResult".match(/S\d+/)[0];
const s11Player = S11R.filter(r => {
s11Player.forEach(r => {
if (s11Player.length === 0) {
              <div class="h2h-top5-name blue"><a href="#" class="h2h-player-link" data-player="${r.name}">${r.name}</a></div>
          <div class="h2h-id red">${playerName}</div>
          <div class="h2h-id blue"><a href="#" class="h2h-player-link" data-player="${oppId}">${oppId}</a></div>
        <div class="row"><span class="badge">플레이어</span> <strong>${playerName}</strong></div>
        body.querySelectorAll('.h2h-player-link').forEach(a=>{
            const pid = (a.getAttribute('data-player') || a.textContent || '').trim();
            if(pid && typeof openPlayer==='function') openPlayer(pid);
  // === 티어 변동추이 (PlayerTier 시트 D~마지막 + 현재티어 A열 추가, Y축: 갓(1)~히든(7)) ===
  const tierSrc = { id:"1F6Ey-whXAsTSMCWVmfexGd77jj6WDgv6Z7hkK3BHahs", sheet:"PlayerTier", range:"A:ZZ" };
    const me = normalizeId(playerName);
activate('player');
  } catch(e){ console.warn('openPlayer error', e); }
  finally { window.__openingPlayer = false; }
window.openPlayer = openPlayer;
$('playerClose')?.addEventListener('click', ()=> activate('rank'));
  const playerTab = tabs.find(b=>b.dataset.target==='player');
  if(playerTab){ playerTab.style.display = (id==='player') ? 'inline-block' : 'none'; }
    document.getElementById("h2hPlayer1").value = "";
    document.getElementById("h2hPlayer2").value = "";
    if(typeof openPlayer === 'function'){ openPlayer(name); }
      // fallback: try hash or activate player panel
      if(typeof activate === 'function') activate('player');
      const input = document.getElementById('playerQuery') || document.getElementById('playerSearch');
    let name = tr.querySelector('.playerName')?.textContent?.trim() || '';
    if(typeof openPlayer==='function'){ openPlayer(name); return; }
    try{ if(typeof activate==='function') activate('player'); }catch(_){}
    const inputs = ['playerQuery','playerSearch','playerInput'].map(id=>document.getElementById(id)).filter(Boolean);
// === Global search -> open player ===
    if(row && typeof openPlayer==='function') openPlayer(row[1]);
            openPlayer(String(v));
function getTierRankForPlayer(playerRow, allRows, H){
    const myName = String(playerRow[IDX_NAME]||'').split('/')[0].trim().toLowerCase();
    const myTier = String(playerRow[IDX_TIER]||'').trim();
  }catch(e){ console.warn('getTierRankForPlayer error', e); return {tierRank:null, totalInTier:0, tierName:''}; }
// Decorate player ELO line with crown if tierRank 1~3; expects an element already rendered
function decoratePlayerEloWithCrown(containerEl, tierRank){
const __orig_openPlayer_disabled = window.openPlayer;
window.openPlayer_disabled = async function(bCellValue){
  // we need tier rank for the selected player
  await __orig_openPlayer(bCellValue);
    const info = getTierRankForPlayer(row, rows, H);
    const body = document.getElementById('playerBody');
      decoratePlayerEloWithCrown(eloRow, info.tierRank);
function getOverallRankForPlayer(playerRow, allRows){
  const me = String(playerRow[IDX_NAME]||'').split('/')[0].trim().toLowerCase();
// Override openPlayer once more to add overall + tier ranks && single crown
const __prev_openPlayer_v979 = window.openPlayer;
window.openPlayer_disabled = async function(bCellValue){
  await __prev_openPlayer_v979(bCellValue);
    const body = document.getElementById('playerBody');
    const infoTier = getTierRankForPlayer(row, rows);
    const infoOverall = getOverallRankForPlayer(row, rows);
    decoratePlayerEloWithCrown(eloRow, cRank);
  }catch(e){ console.warn('openPlayer v980 add-ons failed', e); }
        if(row){ openPlayer(row[1]); }
      if(row){ openPlayer(row[1]); }
  function populatePlayerList(){
    var list = document.getElementById('playerList');
      window.searchPlayer = function(){};
      window.openPlayerByInput = function(){};
      populatePlayerList();
        populatePlayerList();
    // scan roster rows: tier in s; players in s+1..s+3