
window.$ = function(id){ return document.getElementById(id) || null; };

window.lc = s => String(s ?? '').toLowerCase();

window.normalizeId = function(v){
  return String(v ?? '')
    .replace(/\u00A0/g,' ')
    .replace(/[\u200B-\u200D\uFEFF]/g,'')
    .replace(/\s+/g,'')
    .toLowerCase();
};

window.currentRankRows = [];
