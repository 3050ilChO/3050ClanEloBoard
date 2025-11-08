// search_patch_v115.js
// Safe patch: exact-first + prefix search without touching the big app.js
// Load this AFTER app.js in index.html

// 1) Guard: define $ if missing (prevents '$ is not defined')
if (typeof $ !== 'function') {
  function $(id){ return document.getElementById(id) || null; }
}

(function(){
  const btn = $('rankSearchBtn');
  if (!btn) return;

  // 2) Remove existing listeners by cloning the button
  const clone = btn.cloneNode(true);
  btn.parentNode.replaceChild(clone, btn);

  // 3) New handler: exact match first, then prefix matches
  clone.addEventListener('click', ()=>{
    try{
      const q = ( ($('rankSearch')?.value || '').trim().toLowerCase() );
      if (!q) { drawRankRows(RANK_SRC.slice(1)); return; }

      const exactMatches = RANK_SRC.slice(1).filter(r => {
        const name = String(r[1] || '').split('/')[0].trim().toLowerCase();
        return name === q;
      });

      const prefixMatches = RANK_SRC.slice(1).filter(r => {
        const name = String(r[1] || '').split('/')[0].trim().toLowerCase();
        return name.startsWith(q);
      });

      const combined = [...exactMatches, ...prefixMatches.filter(r => !exactMatches.includes(r))];

      const sorted = combined.sort((a,b)=>{
        const aName = String(a[1] || '').split('/')[0].trim().toLowerCase();
        const bName = String(b[1] || '').split('/')[0].trim().toLowerCase();
        return aName.localeCompare(bName, 'ko', {numeric:true});
      });

      drawRankRows(sorted);

      if (exactMatches.length === 1) {
        openPlayer(exactMatches[0][1]);
      }
    }catch(e){
      console.warn('rank search patch error', e);
    }
  });
})();