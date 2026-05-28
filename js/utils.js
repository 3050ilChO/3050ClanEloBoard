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
const firstRow = rows[0] || [];
// Heuristic A: if GViz labels are ALL empty, treat first row as headers
const allEmpty = headers.every(h => !String(h||'').trim());
if (allEmpty && firstRow.length){
  headers = firstRow;
  rows.shift();
}else{
  // Heuristic B: known ELOboard-style headers
  const headerHints = ['경기일자','승자','패자','맵','리그명','승자티어','패자티어','승자종족','패자종족','티어차이'];
  const hit = firstRow.join('|').includes('경기일자') || headerHints.some(h => firstRow.join('|').includes(h));
  if (hit) { headers = firstRow; rows.shift(); }
}
return [headers, ...rows];
  }catch(e){
    console.error('GVIZ error:', e);
    return [];
  }
}


async function fetchGVIZMatrix(cfg){
  try{
    const p = new URLSearchParams({ tqx: 'out:json', headers: '0' });
    if (cfg.sheet) p.set('sheet', cfg.sheet);
    if (cfg.range) p.set('range', cfg.range);
    if (cfg.select) p.set('tq', String(cfg.select));
    const base = `https://docs.google.com/spreadsheets/d/${cfg.id}/gviz/tq?${p.toString()}`;
    const url = (window.USE_PROXY ? window.PROXY_URL : '') + base;

    const res = await fetch(url, { cache: 'no-store' });
    const txt = await res.text();
    const json = JSON.parse(txt.replace(/^[^{]+/, '').replace(/\);?\s*$/, ''));
    const rows = (json.table.rows||[]).map(r => (r.c||[]).map(c => {
      if (!c) return '';
      return (c.f != null ? c.f : (c.v != null ? c.v : ''));
    }));
    // Trim trailing empty rows
    while(rows.length && rows[rows.length-1].every(v => !String(v||'').trim())) rows.pop();
    return rows;
  }catch(e){
    console.error('GVIZ matrix error:', e);
    return [];
  }
}