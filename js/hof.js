// ==============================
// hof.js
// Modular rebuild version
// ==============================

// if already a relative path like "hof/xxx.png", keep it
const HOF_LINKS = {
  // New HOF menus
  // New HOF menus (sheet-name based; works even if gid changes)
function initHOFButtons(){
  const proBtn = document.getElementById('hofViewPro');
  const tstBtn = document.getElementById('hofViewTST');
  const tslBtn = document.getElementById('hofViewTSL');
  const frame  = document.getElementById('hofFrame');
  const openA  = document.getElementById('hofOpenNew');
  const loading= document.getElementById('hofLoading');
  // If HOF panel isn't on this build, silently ignore.
    const url = (which==='pro') ? HOF_LINKS.pro : (which==='tst') ? HOF_LINKS.tst : HOF_LINKS.tsl;
  initHOFButtons();
// === HOF Popup v13 (프로리그/TST/TSL) ===
  // 기존 프로젝트에서 사용하던(연동되던) HOF_LINKS URL을 그대로 사용
    pro:{ url: (typeof HOF_LINKS!=='undefined'? HOF_LINKS.pro : ''), title:"프로리그 PROLEAGUE" },
    tst:{ url: (typeof HOF_LINKS!=='undefined'? HOF_LINKS.tst : ''), title:"TST 3050토너먼트" },
    tpl:{ url: (typeof HOF_LINKS!=='undefined'? HOF_LINKS.tpl : ''), title:"TPL 갓/킹리그" },
    tsl:{ url: (typeof HOF_LINKS!=='undefined'? HOF_LINKS.tsl : ''), title:"TSL 3050스타리그" },
    msl:{ url: (typeof HOF_LINKS!=='undefined'? HOF_LINKS.msl : ''), title:"MSL 퀸.잭 리그" },
    tcl:{ url: (typeof HOF_LINKS!=='undefined'? HOF_LINKS.tcl : ''), title:"TCL(스페/조커/히든)" },
  const isHofCardLeague = (k)=> (k==='tst' || k==='tsl' || k==='tpl' || k==='msl' || k==='tcl');
  function openPopup(){ const el=$("hofPopup"); if(el) el.setAttribute('aria-hidden','false'); }
  function closePopup(){ const el=$("hofPopup"); if(el) el.setAttribute('aria-hidden','true'); }
  function markHofTitleCells(tableEl){
          if(t && /명예의전당/.test(t)) td.classList.add('hof-table-title-cell');
        tr.classList.add('hof-title-row');
  // Many HOF sheets use a simple structure like:
  function decorateHofPlacements(tableEl, leagueKey){
        if(tableEl.classList.contains('hof-league-tpl')) k='tpl';
        else if(tableEl.classList.contains('hof-league-tcl')) k='tcl';
        else if(tableEl.classList.contains('hof-league-msl')) k='msl';
        else if(tableEl.classList.contains('hof-league-tsl')) k='tsl';
        else if(tableEl.classList.contains('hof-league-tst')) k='tst';
      try{ k = String(window.HOF_INLINE_CURRENT||'').toLowerCase(); }catch(_){ }
    // Simple key/value HOF tables (TPL/TCL): build a single stage card from the rendered table
    if((k==='tpl' || k==='tcl') && typeof mountSimpleKeyValueHofCardFromRenderedTable === 'function'){
      try{ if(mountSimpleKeyValueHofCardFromRenderedTable(tableEl, k)) return; }catch(_){}
      wrap.className = 'hof-place-badge ' + t;
      img.className = 'hof-place-crown';
      label.className = 'hof-place-label';
      if(td.querySelector('.hof-team-chip')) return;
      chip.className = 'hof-team-chip';
      icon.className = 'hof-team-icon';
        pic.classList.add('hof-team-img');
      tbox.className = 'hof-team-text';
      name.className = 'hof-team-name';
    k = k || String(leagueKey || HOF_INLINE_CURRENT || 'pro').toLowerCase();
      tr.classList.add('hof-place-row');
          card.className = 'hof-pro-card ' + (isWin?'win':'runner');
          badge.className = 'hof-pro-badge';
          crownImg.className = 'hof-pro-crown';
          lbl.className = 'hof-pro-place';
          body.className = 'hof-pro-body';
          iconWrap.className = 'hof-pro-iconwrap';
          icon.className = 'hof-pro-icon';
          txt.className = 'hof-pro-text';
          nm.className = 'hof-pro-name';
            st.className = 'hof-pro-sub';
        podium.className = 'hof-pro-podium';
        wrap.className = 'hof-pro-wrap';
          org.className = 'hof-pro-organizer';
        td.className = 'hof-pro-podium-cell';
      card.className = 'hof-pro-card ' + (isWin?'win':'runner');
      badge.className = 'hof-pro-badge';
      crownImg.className = 'hof-pro-crown';
      lbl.className = 'hof-pro-place';
      body.className = 'hof-pro-body';
      iconWrap.className = 'hof-pro-iconwrap';
      icon.className = 'hof-pro-icon';
      txt.className = 'hof-pro-text';
      nm.className = 'hof-pro-name';
        st.className = 'hof-pro-sub';
    podium.className = 'hof-pro-podium';
    wrap.className = 'hof-pro-wrap';
      org.className = 'hof-pro-organizer';
    td.className = 'hof-pro-podium-cell';
      first.classList.add('hof-merged-cell');
      tr.classList.add('hof-merged-row');
        mergeRowAll(tr, 'hof-title-merged');
        mergeRowAll(tr, 'hof-season-merged');
      if(!second.querySelector('.hof-organizer-star')){
        star.className = 'hof-organizer-star';
      second.classList.add('hof-organizers-merged');
      tr.classList.add('hof-tier-row');
        if(td.querySelector('.hof-place-badge')) continue;
        if(td.querySelector('.hof-tier-inline')) continue;
        tierSpan.className = 'hof-tier-inline';
        nameSpan.className = 'hof-name-inline';
  // Per-league inline HOF cache to prevent table/season state leaking across PRO/TST/TSL
  var HOF_INLINE_CACHE = (window.HOF_INLINE_CACHE && typeof window.HOF_INLINE_CACHE==='object') ? window.HOF_INLINE_CACHE : { pro: null, tst: null, tsl: null };
window.HOF_INLINE_CACHE = HOF_INLINE_CACHE;
var HOF_INLINE_CURRENT = window.HOF_INLINE_CURRENT || 'pro';
window.HOF_INLINE_CURRENT = HOF_INLINE_CURRENT;
var HOF_INLINE_REQ_TOKEN = window.HOF_INLINE_REQ_TOKEN || 0;
window.HOF_INLINE_REQ_TOKEN = HOF_INLINE_REQ_TOKEN;
  // --- HOF season extraction (grid/block style sheets) ---
      tableEl.classList.remove('hof-league-pro','hof-league-tst','hof-league-tsl','hof-league-tpl','hof-league-msl','hof-league-tcl');
      if(k==='pro') tableEl.classList.add('hof-league-pro');
      if(k==='tst') tableEl.classList.add('hof-league-tst');
      if(k==='tsl') tableEl.classList.add('hof-league-tsl');
      if(k==='tpl') tableEl.classList.add('hof-league-tpl');
      if(k==='msl') tableEl.classList.add('hof-league-msl');
      if(k==='tcl') tableEl.classList.add('hof-league-tcl');
      const inline = document.getElementById('hofInline');
        inline.classList.remove('hof-league-pro','hof-league-tst','hof-league-tsl','hof-league-tpl','hof-league-msl','hof-league-tcl');
        if(k==='pro') inline.classList.add('hof-league-pro');
        if(k==='tst') inline.classList.add('hof-league-tst');
        if(k==='tsl') inline.classList.add('hof-league-tsl');
        if(k==='tpl') inline.classList.add('hof-league-tpl');
        if(k==='msl') inline.classList.add('hof-league-msl');
        if(k==='tcl') inline.classList.add('hof-league-tcl');
      window.__HOF_LAST_BLOCK = window.__HOF_LAST_BLOCK || {};
      window.__HOF_LAST_BLOCK[k] = { data: Array.isArray(data) ? data : [], ts: Date.now() };
      if(isHofCardLeague(k) && tableEl){
    try{ if (isHofCardLeague(k)) { trimEmptyTstTslHeaderStub(tableEl); } }catch(_){ }
    try{ markHofTitleCells(tableEl); }catch(_){ }
    try{ decorateHofPlacements(tableEl, k); }catch(_){ }
  // Ensure any lingering HOF stage cards/flags are cleared before rebuilding (prevents TST->TSL blank on mobile)
  const inline = document.getElementById('hofInline');
  if(inline) inline.classList.remove('hof-has-stagecards','hof-inline-tst','hof-inline-tsl','hof-inline-tpl','hof-inline-msl','hof-inline-tcl');
    tableEl.parentElement.querySelectorAll('.hof-stage-cards').forEach(n=>n.remove());
  const box = document.querySelector('#hofInline .hof-stage-cards');
      if(isHofCardLeague(k) && tableEl){
        const built = parent ? parent.querySelectorAll('.hof-stage-card').length : 0;
      const inline=document.getElementById('hofInline');
      const hasCard=(inline && inline.querySelector('.hof-stage-card')) || (tableEl && tableEl.parentElement && tableEl.parentElement.querySelector('.hof-stage-card'));
      if(isHofCardLeague(k) && hasCard){
        if(inline) inline.classList.add('hof-has-stagecards');
      firstVal.classList.add('hof-organizers-merged');
      if(!firstVal.querySelector('.hof-organizer-star')){
        star.className='hof-organizer-star';
        td.classList.add('hof-organizers-merged');
        keep.classList.add('hof-merged-head');
      firstVal.classList.add('hof-organizers-merged');
      if(!firstVal.querySelector('.hof-organizer-star')){
        star.className='hof-organizer-star';
function ensureHofStageCardsContainer(){
  const inline = document.getElementById('hofInline');
  let box = inline.querySelector('.hof-stage-cards');
    box.className = 'hof-stage-cards';
function clearHofStageCards(){
  const inline = document.getElementById('hofInline');
  inline.classList.remove('hof-has-stagecards','hof-inline-tst','hof-inline-tsl','hof-inline-pro');
  const box = inline.querySelector('.hof-stage-cards');
  const inline = document.getElementById('hofInline');
  const box = ensureHofStageCardsContainer();
    inline.classList.remove('hof-has-stagecards');
  inline.classList.add('hof-has-stagecards');
  inline.classList.add(k==='tst'?'hof-inline-tst':'hof-inline-tsl');
    el.className = 'hof-stage-card';
    title.className = 'hof-stage-title';
    win.className = 'hof-stage-line win';
    wLabel.className = 'hof-stage-label';
    wVal.className = 'hof-stage-value';
    run.className = 'hof-stage-line runner';
    rLabel.className = 'hof-stage-label';
    rVal.className = 'hof-stage-value';
      org.className = 'hof-stage-org';
      star.className = 'hof-organizer-star';
  const inline = document.getElementById('hofInline');
  const box = ensureHofStageCardsContainer();
  inline.classList.add('hof-has-stagecards');
  inline.classList.add(k==='tst'?'hof-inline-tst':'hof-inline-tsl');
    el.className = 'hof-stage-card';
    title.className = 'hof-stage-title';
    win.className = 'hof-stage-line win';
    wLabel.className = 'hof-stage-label';
    wVal.className = 'hof-stage-value';
    run.className = 'hof-stage-line runner';
    rLabel.className = 'hof-stage-label';
    rVal.className = 'hof-stage-value';
      org.className = 'hof-stage-org';
      star.className = 'hof-organizer-star';
  const inline = document.getElementById('hofInline');
  const box = ensureHofStageCardsContainer();
  inline.classList.add('hof-has-stagecards','hof-inline-tst');
  inline.classList.remove('hof-inline-tsl');
    el.className = 'hof-stage-card';
    titleEl.className = 'hof-stage-title';
      line.className = 'hof-stage-line';
      lab.className='hof-stage-label';
      val.className='hof-stage-value';
      org.className = 'hof-stage-org';
      star.className = 'hof-organizer-star';
    wrap.className = 'hof-pro-card ' + (type==='win'?'win':'runner');
    badge.className = 'hof-place-badge ' + (type==='win'?'win':'runner');
    crown.className = 'hof-place-crown';
    lbl.className = 'hof-place-label';
    chip.className = 'hof-pro-chip';
    icon.className = 'hof-team-icon';
    nm.className = 'hof-team-name';
      sub.className = 'hof-team-sub';
    lines.className = 'hof-pro-lines';
      line.className = 'hof-pro-line';
  tableEl.classList.add('hof-pro-podium-table');
    parent.querySelectorAll('.hof-stage-cards').forEach(n=>n.remove());
      const inline = document.getElementById('hofInline');
      if(inline) inline.classList.remove('hof-has-stagecards');
    wrap.className = 'hof-stage-cards';
      card.className = 'hof-stage-card';
        title.className = 'hof-stage-title';
        line.className = 'hof-stage-line';
        badge.className = 'hof-stage-badge';
        lab.className = 'hof-stage-label';
        val.className = 'hof-stage-value';
        org.className = 'hof-stage-organizer';
        org.innerHTML = `<span class="hof-organizer-star">★</span><span class="k">대회진행자</span> : ${organizer}`;
    // Cards use .hof-stage-card (not .stage-card)
    __built = wrap.querySelectorAll('.hof-stage-card').length;
      const inline = document.getElementById('hofInline');
        if(__built>0) inline.classList.add('hof-has-stagecards');
        else inline.classList.remove('hof-has-stagecards');
  function hofTableToMatrix(tableEl){
        mergeRow(tr, 'hof-merged-title');
      star.className = 'hof-organizer-star';
      merged.classList.add('hof-organizers-merged');
      tr.classList.add('hof-organizer-row');
      card.className = 'hof-pro-card ' + type;
      badge.className = 'hof-place-badge ' + (type==='win'?'win':'runner');
      crown.className='hof-place-crown';
      lbl.className='hof-place-label';
      top.className = 'hof-pro-top';
      icon.className = 'hof-team-icon';
      nm.className='hof-team-name';
        sub.className='hof-team-sub';
      lines.className='hof-pro-lines';
        line.className='hof-pro-line';
          star.className='hof-organizer-star';
    wrap.className='hof-pro-podium';
    td.className='hof-pro-cell';
    try{ tableEl.classList.add('hof-league-pro'); }catch(_){ }
  function showHofSeason(label, leagueKey){
    const k = (leagueKey || HOF_INLINE_CURRENT || 'pro').toLowerCase();
    const cache = HOF_INLINE_CACHE[k];
    const tableEl = document.getElementById('hofInlineTable');
      try{ decorateHofPlacements(tableEl, key); }catch(_){ }
      try{ if (isHofCardLeague(k)) { const mat=hofTableToMatrix(tableEl); renderStageCardsForMobile(tableEl, mat, k); } }catch(_){ }
    try{ if(tableEl && isHofCardLeague(k)) tableEl.style.visibility='hidden'; }catch(_){ }
    try{ decorateHofPlacements(tableEl, key); }catch(_){ }
    try{ if (isHofCardLeague(k)) { const mat=hofTableToMatrix(tableEl); renderStageCardsForMobile(tableEl, mat, k); } }catch(_){ }
    try{ if(tableEl && isHofCardLeague(k)){ const built=(tableEl.parentElement?tableEl.parentElement.querySelectorAll('.hof-stage-card').length:0); if(built<=0) tableEl.style.visibility=''; } }catch(_){ }
  try{ window.showHofSeason = showHofSeason; }catch(_){ }
  async function openHOF(key){
    const myReq = ++HOF_INLINE_REQ_TOKEN; try{ window.HOF_INLINE_REQ_TOKEN = HOF_INLINE_REQ_TOKEN; }catch(_){ }
    HOF_INLINE_CURRENT = key || 'pro'; try{ window.HOF_INLINE_CURRENT = HOF_INLINE_CURRENT; }catch(_){ }
    // reset HOF table visibility on every tab switch (prevents blank screen if stage-cards build fails)
    try{ const t=document.getElementById('hofInlineTable'); if(t){ t.style.display=''; if(t.parentElement) t.parentElement.classList.remove('hof-stage-only'); } }catch(_){ }
      const inline=document.getElementById('hofInline');
      if(inline) inline.classList.remove('hof-has-stagecards','hof-inline-tst','hof-inline-tsl','hof-inline-tpl','hof-inline-msl','hof-inline-tcl');
      const wrap=document.querySelector('#hofInline .hof-stage-cards');
      const table=document.getElementById('hofInlineTable');
        table.parentElement.querySelectorAll('.hof-stage-cards').forEach(n=>n.remove());
      console.warn('HOF: missing url', key);
    const titleEl = $("hofInlineTitle");
    const statusEl = $("hofInlineStatus");
    const tableEl = $("hofInlineTable");
    // When the viewport is small, CSS can show leftover .hof-stage-cards even after switching to PRO.
      if(p) p.querySelectorAll('.hof-stage-cards').forEach(n=>n.remove());
      const box = $('hofInline');
        box.classList.remove('hof-inline-pro','hof-inline-tst','hof-inline-tsl');
        box.classList.remove('hof-league-pro','hof-league-tst','hof-league-tsl');
        box.classList.add(key==='pro'?'hof-inline-pro':key==='tsl'?'hof-inline-tsl':key==='tst'?'hof-inline-tst':key==='tpl'?'hof-inline-tpl':key==='msl'?'hof-inline-msl':'hof-inline-tcl');
        box.classList.add(key==='pro'?'hof-league-pro':key==='tsl'?'hof-league-tsl':key==='tst'?'hof-league-tst':key==='tpl'?'hof-league-tpl':key==='msl'?'hof-league-msl':'hof-league-tcl');
      tableEl.classList.remove('hof-league-pro','hof-league-tst','hof-league-tsl','hof-league-tpl','hof-league-msl','hof-league-tcl');
      tableEl.classList.add(key==='pro'?'hof-league-pro':key==='tst'?'hof-league-tst':key==='tsl'?'hof-league-tsl':key==='msl'?'hof-league-msl':key==='tcl'?'hof-league-tcl':'hof-league-race');
      if(tableEl && isHofCardLeague(key)){
    const proBtn = $('hofPro'); const tslBtn = $('hofTSL'); const tstBtn = $('hofTST');
    const tplBtn = $('hofTPL'); const mslBtn = $('hofMSL'); const tclBtn = $('hofTCL');
    const inlineBox = $('hofInline');
      if(myReq !== HOF_INLINE_REQ_TOKEN) return;
      // --- Prefer block/grid season rendering when the sheet is laid out in columns (your current HOF sheet) ---
          HOF_INLINE_CACHE[key] = { blocks, seasons: blocks.order };
            window.__HOF_SEASON_SUMMARY = window.__HOF_SEASON_SUMMARY || {};
            window.__HOF_SEASON_SUMMARY[key] = summary;
      try{ markHofTitleCells(tableEl); }catch(_){}
      try{ decorateHofPlacements(tableEl, key); }catch(_){}
        HOF_INLINE_CACHE[key] = { html: tableEl.innerHTML, seasons: seasonsSorted, meta };
      console.error('HOF open error', e);
    const closeBtn = $("hofPopupClose");
    const backdrop = $("hofPopupBackdrop");
    const proBtn = $("hofPro");
    const tslBtn = $("hofTSL");
    const tstBtn = $("hofTST");
    const tplBtn = $("hofTPL");
    const mslBtn = $("hofMSL");
    const tclBtn = $("hofTCL");
      proBtn.addEventListener('click', (e)=>{ guard(e); openHOF('pro'); });
      tstBtn.addEventListener('click', (e)=>{ guard(e); openHOF('tst'); });
      tslBtn.addEventListener('click', (e)=>{ guard(e); openHOF('tsl'); });
      mslBtn.addEventListener('click', (e)=>{ guard(e); openHOF('msl'); });
      tclBtn.addEventListener('click', (e)=>{ guard(e); openHOF('tcl'); });
      tplBtn.addEventListener('click', (e)=>{ guard(e); openHOF('tpl'); });
      if(!window.__HOF_INLINE_BOOTED && document.getElementById('hofInlineTable')){
        window.__HOF_INLINE_BOOTED = true;
        openHOF('pro');
  // Keep HOF readable on mobile/resize:
        const tableEl = document.getElementById('hofInlineTable');
        const inline = document.getElementById('hofInline');
        const k = (window.HOF_INLINE_CURRENT || 'pro').toLowerCase();
          inline.querySelectorAll('.hof-stage-cards').forEach(n=>n.remove());
        const last = (window.__HOF_LAST_BLOCK && window.__HOF_LAST_BLOCK[k]) ? window.__HOF_LAST_BLOCK[k] : null;
function mountSimpleKeyValueHofCardFromRenderedTable(tableEl, leagueKey){
  try{ parent.querySelectorAll('.hof-stage-cards').forEach(n=>n.remove()); }catch(_){}
  wrap.className = 'hof-stage-cards';
  card.className = 'hof-stage-card';
    title.className = 'hof-stage-title';
    line.className = 'hof-stage-line';
    badge.className = 'hof-stage-badge';
    lab.className = 'hof-stage-label';
    val.className = 'hof-stage-value';
    org.className = 'hof-stage-organizer';
    org.innerHTML = `<span class="hof-organizer-star">★</span><span class="k">대회진행자</span> : ${organizer}`;
    const inline = document.getElementById('hofInline');
    if(inline) inline.classList.add('hof-has-stagecards');
  const k = (leagueKey||HOF_INLINE_CURRENT||'pro').toLowerCase();
    // Header rows in our HOF sheets are "label rows":
  const bar = document.getElementById('hofSeasonList') || document.getElementById('hofInlineSeasonBar') || document.getElementById('hofSeasonBar');
  const k = leagueKey || HOF_INLINE_CURRENT || 'pro';
    btn.className = 'hof-season-btn' + (label === act ? ' active' : '');
      bar.querySelectorAll('.hof-season-btn').forEach(b=>b.classList.remove('active'));
      showHofSeason(label, k);
    showHofSeason(act, k);
  const k = (leagueKey || HOF_INLINE_CURRENT || 'pro').toLowerCase();
  HOF_INLINE_CURRENT = k;
  if(!HOF_INLINE_CACHE[k]) HOF_INLINE_CACHE[k] = {};
  if(!HOF_INLINE_CACHE[k].html){
    HOF_INLINE_CACHE[k].html = tableEl.innerHTML;
    tableEl.innerHTML = HOF_INLINE_CACHE[k].html;