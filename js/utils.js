// ==============================
// utils.js
// Modular rebuild version
// ==============================

// Several pages call renderTable(); keep a single canonical implementation.
function renderTable(tableEl, data){
    console.error('renderTable error', e);
// - normalizes filenames (JD.png -> jd.png)
    const normalizedRel = raw.replace(/\.jpe?g$/i, ".png");
    push(normalizedRel);
    push(normalizedRel.replace(/^s10team\//i, "s10Team/").replace(/^s10Team\//i, "s10team/"));
  const jpg = normalized.replace(/\.png$/i, ".jpg");
  if (jpg !== normalized) {
// === Global ID normalizer (whitespace/NBSP/zero-width/case-insensitive) ===
if (typeof window !== 'undefined' && typeof window.normalizeId !== 'function') {
  window.normalizeId = function normalizeId(v){
// Local alias (keeps existing calls like normalizeId(x) working)
const normalizeId = (typeof window !== 'undefined' && window.normalizeId) ? window.normalizeId : (v)=>String(v??'').toLowerCase();
const normalize = (s) => String(s || '').trim().toLowerCase();
async function fetchGVIZ(cfg){
async function fetchGVIZMatrix(cfg){
    // exact match by normalized key
  const rows = await fetchGVIZ(SHEETS.members);
    const data = MATCH_SRC.length ? MATCH_SRC : await fetchGVIZ(SHEETS.matches);
    const data = await fetchGVIZ({
  return rows.find(r => normalizeId(r.id) === key) || null;
  const row = rows.find(r=> normalizeId(String(r[1]||'').split('/')[0].trim())===normalizeId(id));
  const data = MATCH_SRC.length? MATCH_SRC : await fetchGVIZ(SHEETS.matches);
    const w = normalizeId(r[ findIdx(MH, /승자\s*선수|winner/i) ]||'');
    const l = normalizeId(r[ findIdx(MH, /패자\s*선수|loser/i) ]||'');
const S11 = await fetchGVIZ({
  const pid = normalizeId(r[2]); // C열: 승자선수
  const win = normalizeId(r[2]);  // 승자선수 (C열)
  const lose = normalizeId(r[5]); // 패자선수 (F열)
  matchLog = await fetchGVIZ({ id: "1F6Ey-whXAsTSMCWVmfexGd77jj6WDgv6Z7hkK3BHahs", sheet: "(개인전)경기기록데이터", range: "A:O" });
    const winName = normalizeId(winRaw);
    const loseName= normalizeId(loseRaw);
    const oppKey = normalizeId(oppRaw);
  const T = await fetchGVIZ(tierSrc);
    const E = await fetchGVIZ(eloSrc);
      const w = normalizeId(r[COL_WIN]);
      const l = normalizeId(r[COL_LOSE]);
  const data = await fetchGVIZ(SHEETS.matches);
      (normalize(r[C])===p1 && normalize(r[F])===p2) ||
      (normalize(r[C])===p2 && normalize(r[F])===p1)
    const p1Wins = rows.filter(r => normalize(r[C])===p1 && normalize(r[F])===p2).length;
      const p2Wins = rows.filter(r => normalize(r[C])===p2 && normalize(r[F])===p1).length;
      if (normalize(r[C])===p1) mapCounts[m].p1++;
    renderTable($('h2hTable'), [h2hHeaders, ...filtered]);
    if (p1) rows2 = rows2.filter(r => normalize(r[C])===p1 || normalize(r[F])===p1);
    else if (p2) rows2 = rows2.filter(r => normalize(r[C])===p2 || normalize(r[F])===p2);
    renderTable($('h2hTable'), [h2hHeaders, ...rows2]);
  renderTable($('h2hTable'), [h2hHeaders]);
  const data = await fetchGVIZ(cfg);
async function loadAll(){ if(allStatus) allStatus.textContent='불러오는 중…'; ALL_CACHE=await fetchGVIZ(SHEETS.all); if(!ALL_CACHE.length){ if(allStatus) allStatus.textContent='데이터 없음/권한/CORS 문제'; return;} renderTable(allTable, ALL_CACHE); if(allStatus) allStatus.textContent=`불러오기 완료 • ${ALL_CACHE.length-1}행`; }
function filterAll(q){ if(!ALL_CACHE.length) return; const Q=lc(q||''); if(!Q){ renderTable(allTable, ALL_CACHE); return;} const rows=ALL_CACHE.slice(1).filter(r=> (r||[]).some(c=> lc(c).includes(Q))); renderTable(allTable,[ALL_CACHE[0],...rows]); }
async function loadMembers(){ if(membersStatus) membersStatus.textContent='불러오는 중…'; const data=await fetchGVIZ(SHEETS.members); if(!data.length){ if(membersStatus) membersStatus.textContent='데이터 없음/권한/CORS 문제'; return;} MEMBERS_CACHE=data; renderTable(membersTable,[data[0],...data.slice(1)]); if(membersStatus) membersStatus.textContent=`불러오기 완료 • ${data.length-1}행`; highlightMembers(); }
  if(!Q){ renderTable(membersTable,[MEMBERS_CACHE[0],...MEMBERS_CACHE.slice(1)]); highlightMembers(); return; }
  renderTable(membersTable,[MEMBERS_CACHE[0],...rows]); highlightMembers();
  const data = await fetchGVIZ(SHEETS.matches); if(!data.length) return;
    let filtered = rows.filter(r=> (normalize(r[C])===p1 && normalize(r[F])===p2) || (normalize(r[C])===p2 && normalize(r[F])===p1));
    const p1Wins = rows.filter(r => normalize(r[C])===p1 && normalize(r[F])===p2).length;
      const p2Wins = rows.filter(r => normalize(r[C])===p2 && normalize(r[F])===p1).length;
renderTable($('h2hTable'), [h2hHeaders, ...filtered]);
  renderTable($('h2hTable'), [h2hHeaders]);
function normalizeId(v){
      const data=await fetchGVIZ(SHEETS.matches);
        (normalize(r[C])===p1 && normalize(r[F])===p2) ||
        (normalize(r[C])===p2 && normalize(r[F])===p1)
      const p1Wins = rows.filter(r => normalize(r[C])===p1 && normalize(r[F])===p2).length;
      const p2Wins = rows.filter(r => normalize(r[C])===p2 && normalize(r[F])===p1).length;
        if(normalize(r[C])===p1) mapCounts[m].p1++; else mapCounts[m].p2++;
      if(typeof renderTable==="function")
        renderTable($("#h2hTable"),[h2hHeaders,...filtered]);
      const data=await fetchGVIZ(SHEETS.matches);
      const filtered=rows.filter(r=>(normalize(r[C])===p1&&normalize(r[F])===p2)||(normalize(r[C])===p2&&normalize(r[F])===p1));
      const p1Wins = rows.filter(r => normalize(r[C])===p1 && normalize(r[F])===p2).length;
      const p2Wins = rows.filter(r => normalize(r[C])===p2 && normalize(r[F])===p1).length;
        if(normalize(r[C])===p1)mapStats[mapName].p1++;else mapStats[mapName].p2++;
      if(typeof renderTable==="function")renderTable($("#h2hTable"),[h2hHeaders,...filtered]);
  const normalize = (s) => String(s || '').trim().toLowerCase();
      const data = await fetchGVIZ(window.SHEETS.matches);
      if (typeof renderTable === "function") {
        renderTable($("#h2hTable"), [headers, ...filtered]);
        if (typeof renderTable === "function") {
          renderTable($("#h2hTable"), [headers]);
    const data = await fetchGVIZ(window.SHEETS.matches);
  const normalize = (s)=>String(s||'').trim().toLowerCase();
      const data=await fetchGVIZ(window.SHEETS.matches);
      const p1Wins=rows.filter(r=>normalize(r[C])===p1&&normalize(r[F])===p2).length;
      const p2Wins=rows.filter(r=>normalize(r[C])===p2&&normalize(r[F])===p1).length;
  const normalize = (s)=>String(s||'').trim().toLowerCase();
    const data=await fetchGVIZ(window.SHEETS.matches);
    const p1Wins=rows.filter(r=>normalize(r[C])===p1&&normalize(r[F])===p2).length;
    const p2Wins=rows.filter(r=>normalize(r[C])===p2&&normalize(r[F])===p1).length;
async function fetchGVIZbyUrl_v12b(fullUrl){
  }catch(e){ console.error('fetchGVIZbyUrl error', e); return []; }
    fetchGVIZbyUrl_v12b(URLS_V12.active),
    fetchGVIZbyUrl_v12b(URLS_V12.matches)
/* v12f normalize race tags: map 저그/프로토스/테란 && variants to Z/P/T */
function normalizeRaceTag(v){
    const w=normalizeRaceTag(r[3]);
    const l=normalizeRaceTag(r[6]);
async function fetchGVIZbyUrl_v12b(fullUrl){
    console.error('fetchGVIZbyUrl_v12b error', e);
      __ALL_DATA = await fetchGVIZ(src);
      renderTable(tableEl, blockData||[]);
  const normalizeCellText = (s)=> _normSeasonText(String(s||''));
        const txt = normalizeCellText(raw);
    const isRowEmpty = (arr)=> arr.every(v=> !normalizeCellText(v));
    const isColEmpty = (idx)=> rows.every(r=> !normalizeCellText(r[idx]));
          const v = normalizeCellText((data[r]||[])[c]);
          for(let c=colFrom;c<=colTo;c++) if(normalizeCellText(row[c])) return true;
          for(let c=anchor.c;c<=c1;c++) if(normalizeCellText(row2[c])) { has2=true; break; }
    // Normalize: some old TST blocks include a standalone title row like "TST명예의전당"
    renderTable(tableEl, data);
      try{ renderProPodiumFromBlock(tableEl, data); }catch(_){ renderTable(tableEl, data); }
    try{ normalizeOrganizerCells(tableEl, k); }catch(_){ }
  function normalizeOrganizerCells(tableEl, leagueKey){
    // so we rely on the already-normalized matrix (blockData) for a deterministic result.
      let data = await fetchGVIZbyUrl_v12b(c.url);
        if(tableEl) renderTable(tableEl, []);
      renderTable(tableEl, data);
  // Normalize + de-dup
// Normalize season label text for robust matching across slight formatting differences.
  // normalize spaces, zero-width chars, && dash variants for robust season matching
    // matrix = [headers?, ...rows] from fetchGVIZ; we treat all rows as data
    const data = await fetchGVIZ(cfg);
    // fetchGVIZ returns [headers,...rows] sometimes; for this roster sheet we want raw values.