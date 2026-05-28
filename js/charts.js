// ==============================
// charts.js
// Modular rebuild version
// ==============================

let recent5Chart = null;
let tierTrendChart = null;
let eloChart = null;
  if (typeof Chart !== 'undefined' && typeof ChartDataLabels !== 'undefined'){
    Chart.register(ChartDataLabels);
    Chart.defaults.set('plugins.datalabels', {
      <div class="chart-wrap"><canvas id="tierTrendChart" height="85"></canvas></div>
        const el2 = document.getElementById('tierTrendChart')?.getContext('2d');
          if (tierTrendChart && typeof tierTrendChart.destroy==='function'){ try{ tierTrendChart.destroy(); }catch(e){} }
          tierTrendChart = new Chart(el2, {
        <div class="chart-wrap"><canvas id="eloChart" height="170"></canvas></div>
      const ctx = document.getElementById('eloChart')?.getContext('2d');
        if (eloChart && typeof eloChart.destroy==='function'){ try{ eloChart.destroy(); }catch(e){} }
        eloChart = new Chart(ctx, {
      <div class="chart-wrap"><canvas id="recent5Chart" height="120"></canvas></div>
    const ctxR = document.getElementById('recent5Chart')?.getContext('2d');
      if (recent5Chart && typeof recent5Chart.destroy === 'function') {
        try { recent5Chart.destroy(); } catch(e){}
      recent5Chart = new Chart(ctxR, {
  console.warn('recent5 chart error', e);
let h2hOutcomeChart = null, h2hMapChart = null;
function destroyChartSafe(chartRef){
  if (chartRef && typeof chartRef.destroy === 'function'){
    try { chartRef.destroy(); } catch(e){}
    const ctx1 = $('h2hOutcomeChart')?.getContext('2d');
      destroyChartSafe(h2hOutcomeChart);
      h2hOutcomeChart = new Chart(ctx1, {
    const ctx2 = $('h2hMapChart')?.getContext('2d');
      destroyChartSafe(h2hMapChart);
      h2hMapChart = new Chart(ctx2, {
const ctx1 = $('h2hOutcomeChart')?.getContext('2d');
  if (h2hOutcomeChart) h2hOutcomeChart.destroy();
  h2hOutcomeChart = new Chart(ctx1, {
      const ctx1=$("#h2hOutcomeChart")?.getContext("2d");
        if(window.h2hOutcomeChart) window.h2hOutcomeChart.destroy();
        window.h2hOutcomeChart=new Chart(ctx1,{
      const ctx2=$("#h2hMapChart")?.getContext("2d");
        if(window.h2hMapChart) window.h2hMapChart.destroy();
        window.h2hMapChart=new Chart(ctx2,{
      const ctx1=$("#h2hOutcomeChart")?.getContext("2d");
        if(window.h2hOutcomeChart)window.h2hOutcomeChart.destroy();
        window.h2hOutcomeChart=new Chart(ctx1,{
      const ctx2=$("#h2hMapChart")?.getContext("2d");
        if(window.h2hMapChart)window.h2hMapChart.destroy();
        window.h2hMapChart=new Chart(ctx2,{
   - Outcome chart: Kyak(blue #3498db) / Burst(red #e74c3c)
   - Map chart: horizontal stacked per map with same colors.
  function ensureChartLib(){ return (typeof Chart !== 'undefined'); }
  function destroyChart(refName){
      const wrap1 = $("#h2hOutcomeWrap"), cvs1 = $("#h2hOutcomeChart");
      if (wrap1 && cvs1 && ensureChartLib()){
        destroyChart("h2hOutcomeChart");
        window.h2hOutcomeChart = new Chart(ctx1, {
      const wrap2 = $("#h2hMapWrap"), cvs2 = $("#h2hMapChart");
      if (wrap2 && cvs2 && ensureChartLib()){
        destroyChart("h2hMapChart");
        window.h2hMapChart = new Chart(ctx2, {
        destroyChart("h2hOutcomeChart");
        destroyChart("h2hMapChart");
   Ensures Chart.js && canvases load correctly after full page render.
   Fixes map chart not showing.
    // Chart.js는 async로 렌더되므로 약간의 지연 후 표시
      const chart = window.h2hOutcomeChart;
      if (!chart || !chart.data) return;
      const data = chart.data.datasets[0].data;
    // Chart.js가 데이터를 채우기까지 약간 더 대기
      // Chart.js 객체에서 실제 데이터 가져오기
      const chart = window.h2hOutcomeChart;
      const data = chart?.data?.datasets?.[0]?.data || [0, 0];
    }, 800); // ← 딜레이를 0.8초로 늘려 Chart.js 데이터 완성 후 실행