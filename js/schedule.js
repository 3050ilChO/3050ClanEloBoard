// ==============================
// schedule.js
// Modular rebuild version
// ==============================

let SCHED_CACHE = [];
     * Schedule/ProRank: render sheet values AS-IS (no sort/format change) using formatted cell c.f if provided
// ===== Schedule (AS-IS + popup open) =====
const schedStatus=$('schedStatus'); const schedTable=$('schedTable');
async function loadSchedule(){
  if(schedStatus) schedStatus.textContent='불러오는 중…';
  const cfg = Object.assign({}, SHEETS.sched, { range: SHEETS.sched.range });
  if(!data.length){ if(schedStatus) schedStatus.textContent='데이터 없음/권한/CORS 문제'; return; }
  SCHED_CACHE = data;
  renderTable(schedTable, [data[0], ...data.slice(1).filter(r=> (r||[]).some(c=> String(c||'').trim()!==''))]);
  if(schedStatus) schedStatus.textContent=`불러오기 완료 • ${data.length-1}행`;
function filterSchedule(q){
  if(!SCHED_CACHE.length) return;
  if(!Q){ renderTable(schedTable, [SCHED_CACHE[0], ...SCHED_CACHE.slice(1)]); return; }
  const rows = SCHED_CACHE.slice(1).filter(r => (r||[]).some(c => String(c||'').toLowerCase().includes(Q)));
  renderTable(schedTable, [SCHED_CACHE[0], ...rows]);
$('schedSearchBtn')?.addEventListener('click', ()=> filterSchedule($('schedQuery')?.value));
$('schedResetBtn')?.addEventListener('click', ()=>{ const i=$('schedQuery'); if(i) i.value=''; filterSchedule(''); });
$('schedQuery')?.addEventListener('keydown', e=>{ if(e.key==='Enter') $('schedSearchBtn').click(); });
$('schedOpenSheet')?.addEventListener('click', ()=>{
  try{window.open(url, 'schedPopup', 'width=1200,height=800,noopener');}catch(e){console.warn('popup suppressed')}
  await loadSchedule();
  schedule: "https://docs.google.com/spreadsheets/d/1othAdoPUHvxo5yDKmEZSGH-cjslR1WyV90F7FdU30OE/edit?gid=1935955704#gid=1796534117"
async function v12_loadNextSchedule(){
  const rows = await fetchGVIZbyUrl_v12b(URLS_V12.schedule);
  const tbl=document.getElementById('dashSched'); 
    await v12_loadNextSchedule();
/* v12e hide sched loading */
  const hide = ()=>{ try{ const n=document.getElementById('schedLoading')||document.getElementById('schedStatus'); if(n){ n.textContent=''; n.style.display='none'; } }catch(e){} };
  const btn = document.getElementById('viewAllScheduleBtn');
    const targetBtn = document.querySelector('.tab-btn[data-target="sched"]');