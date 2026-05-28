// ==============================
// dashboard.js
// Modular rebuild version
// ==============================

async function buildRaceWinrate(){
  }catch(e){console.error('buildRaceWinrate error',e);}
  // Show the 4 stat cards only on Dashboard
    heroStats.style.display = (id === 'dashboard') ? '' : 'none';
    const elA = document.querySelector('#dashboard #activeCount') || document.getElementById('activeCount');
    const elT = document.querySelector('#dashboard #totalMatches') || document.getElementById('totalMatches');
    const elU = document.querySelector('#dashboard #lastUpdate') || document.getElementById('lastUpdate');
// Only show dashboard hero stats on dashboard (index).
  const isDashboard = /(^|\/)index\.html$/.test(location.pathname) || location.pathname === '/' || location.pathname === '';
  if (isDashboard) return;
  try{ buildRaceWinrate(); }catch(e){}
    run.addEventListener("click",async()=>{await buildRaceWinrate();});
// === Dashboard date badge (총경기수 옆 현재 날짜/요일) ===
// Dashboard: "전체 일정 보기" 버튼 → 프로리그일정(시즌) 탭으로 이동
// Dashboard: "팀 로스터" 버튼 → 로스터 팝업 (S10RoasterHOME)