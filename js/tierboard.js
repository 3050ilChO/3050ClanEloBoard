// ==============================
// tierboard.js
// Modular rebuild version
// ==============================

// --- TierBoard search helpers ---
function normalizeTierboardPlayerKey(v){
function setupTierboardSearch(playerNames){
  const input = document.getElementById('tierboardSearch');
  const btn   = document.getElementById('tierboardSearchBtn');
  const dl    = document.getElementById('tierboardDatalist');
  const status= document.getElementById('tierboardStatus');
    const key = normalizeTierboardPlayerKey(qRaw);
    const wrap = document.getElementById('tierboardWrap');
        const ck = c.getAttribute('data-player-key') || normalizeTierboardPlayerKey(c.textContent);
        const ck = c.getAttribute('data-player-key') || normalizeTierboardPlayerKey(c.textContent);
        if(ck.includes(key) || normalizeTierboardPlayerKey(c.textContent).includes(key)) { el = c; break; }
async function loadTierBoard(){
  const wrap = document.getElementById('tierboardWrap');
  const status = document.getElementById('tierboardStatus');
  const totalEl = document.getElementById('tierboardTotal');
        chip.setAttribute('data-player-key', normalizeTierboardPlayerKey(name));
    setupTierboardSearch(allNames);
  }catch(e){ console.warn('tierboard search setup failed', e); }
// TierBoard reload button
$('tierboardReloadBtn')?.addEventListener('click', ()=> loadTierBoard());
  await loadTierBoard();