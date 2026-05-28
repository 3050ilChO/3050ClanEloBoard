
// =========================
// 3050 NEW RANK SYSTEM
// =========================

const MEMBER_SHEET = {
  id: "14FUpa0Hcgtx6J1ZByx-cXGfbF7_ze1edONz8Wt70Obw",
  sheet: "클랜원전체명단",
  range: "A:L"
};

let MEMBER_DATA = [];

function normalizeId(v){
  return String(v || '')
    .replace(/\s+/g,'')
    .trim()
    .toLowerCase();
}

async function fetchGVIZ(cfg){
  const url = `https://docs.google.com/spreadsheets/d/${cfg.id}/gviz/tq?sheet=${encodeURIComponent(cfg.sheet)}&range=${encodeURIComponent(cfg.range)}&tqx=out:json`;

  const res = await fetch(url);
  const txt = await res.text();

  const json = JSON.parse(
    txt.substring(txt.indexOf('{'), txt.lastIndexOf('}') + 1)
  );

  return json.table.rows.map(r =>
    (r.c || []).map(c => c ? (c.f ?? c.v ?? '') : '')
  );
}

async function loadMemberRanking(){

  const rows = await fetchGVIZ(MEMBER_SHEET);

  MEMBER_DATA = rows.map(r => ({
    tier: r[0] || '-',
    id: r[1] || '-',
    race: r[2] || '-',
    team: r[3] || '-',
    elo: Number(String(r[4]).replace(/,/g,'')) || 0,
    tierRank: String(r[5] || '-').trim(),
    totalRank: String(r[6] || '-').trim(),
    zvz: r[7] || '-',
    pvz: r[8] || '-',
    tvz: r[9] || '-',
    total: r[10] || '-',
    winrate: r[11] || '-'
  }));

  drawRankingTable(MEMBER_DATA);
}

function isUnranked(player){
  return player.tierRank === '-' || player.totalRank === '-';
}

function drawRankingTable(data){

  const tbody = document.querySelector('#rankTable tbody');
  if(!tbody) return;

  tbody.innerHTML = '';

  const activeTier =
    document.querySelector('.tier-btn.active')?.textContent?.trim() || '전체';

  let filtered = [...data];

  if(activeTier !== '전체'){
    filtered = filtered.filter(p => p.tier === activeTier);
  }

  const ranked = filtered.filter(p => !isUnranked(p));
  const unranked = filtered.filter(p => isUnranked(p));

  ranked.sort((a,b)=>{

    const av = activeTier === '전체'
      ? Number(a.totalRank)
      : Number(a.tierRank);

    const bv = activeTier === '전체'
      ? Number(b.totalRank)
      : Number(b.tierRank);

    return av - bv;
  });

  const finalRows = [...ranked, ...unranked];

  finalRows.forEach(player=>{

    const rankValue = activeTier === '전체'
      ? player.totalRank
      : player.tierRank;

    const tr = document.createElement('tr');

    tr.innerHTML = `
      <td>${rankValue}</td>
      <td>
        <a href="#" class="player-link" data-player="${player.id}">
          ${player.id}
        </a>
      </td>
      <td>${player.race}</td>
      <td>${player.tier}</td>
      <td>${player.zvz}</td>
      <td>${player.pvz}</td>
      <td>${player.tvz}</td>
      <td>${player.total}</td>
      <td>${player.winrate}</td>
      <td>${player.elo}</td>
    `;

    tbody.appendChild(tr);
  });

  bindPlayerLinks();
}

function bindPlayerLinks(){

  document.querySelectorAll('.player-link').forEach(el=>{

    el.onclick = (e)=>{
      e.preventDefault();
      e.stopPropagation();

      const id = el.dataset.player;
      openPlayer(id);
    };
  });
}

function openPlayer(id){

  const player = MEMBER_DATA.find(p=>
    normalizeId(p.id) === normalizeId(id)
  );

  if(!player) return;

  const title = document.getElementById('playerTitle');
  const body = document.getElementById('playerBody');

  if(!title || !body) return;

  title.innerText = player.id;

  body.innerHTML = `

    <div class="player-summary">

      <div class="summary-box">
        <div class="summary-title">티어</div>
        <div class="summary-value">${player.tier}</div>
      </div>

      <div class="summary-box">
        <div class="summary-title">티어랭킹</div>
        <div class="summary-value">${player.tierRank}</div>
      </div>

      <div class="summary-box">
        <div class="summary-title">전체랭킹</div>
        <div class="summary-value">${player.totalRank}</div>
      </div>

      <div class="summary-box">
        <div class="summary-title">ELO</div>
        <div class="summary-value">${player.elo}</div>
      </div>

    </div>

    <table class="detail-table">
      <tr>
        <th>저그전</th>
        <td>${player.zvz}</td>
      </tr>

      <tr>
        <th>프로토스전</th>
        <td>${player.pvz}</td>
      </tr>

      <tr>
        <th>테란전</th>
        <td>${player.tvz}</td>
      </tr>

      <tr>
        <th>총전적</th>
        <td>${player.total}</td>
      </tr>

      <tr>
        <th>승률</th>
        <td>${player.winrate}</td>
      </tr>
    </table>
  `;

  const rankWrap = document.getElementById('rankingPanel');
  const playerWrap = document.getElementById('playerPanel');

  if(rankWrap) rankWrap.style.display = 'none';
  if(playerWrap) playerWrap.style.display = 'block';
}

document.addEventListener('DOMContentLoaded', ()=>{
  loadMemberRanking();
});
