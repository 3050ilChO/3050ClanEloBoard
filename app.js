
/* ================================
   3050 ELO BOARD FINAL RANK FIX
   ================================ */

const SHEET_ID = "14FUpa0Hcgtx6J1ZByx-cXGfbF7_ze1edONz8Wt70Obw";
const SHEET_NAME = "클랜원전체명단";

async function loadClanData() {

  const query =
    `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?sheet=${encodeURIComponent(SHEET_NAME)}`;

  const res = await fetch(query);
  const text = await res.text();

  const json = JSON.parse(
    text.substring(47).slice(0, -2)
  );

  return json.table.rows.map(r => {

    const c = r.c || [];

    return {
      tier: c[0]?.v || "-",
      id: c[1]?.v || "-",
      race: c[2]?.v || "-",
      team: c[3]?.v || "-",
      elo: Number(c[4]?.v || 0),
      tierRank: c[5]?.v || "-",
      totalRank: c[6]?.v || "-",
      zvz: c[7]?.v || "-",
      pvz: c[8]?.v || "-",
      tvz: c[9]?.v || "-",
      total: c[10]?.v || "-"
    };

  });

}

/* =====================================
   중요:
   기존 sort() 랭킹 계산 제거
   시트 순위 그대로 사용
===================================== */

function getTierPlayers(players, tierName) {

  const ranked = [];
  const unranked = [];

  players.forEach(p => {

    if (tierName !== "전체" && p.tier !== tierName) return;

    if (p.totalRank === "-" || p.tierRank === "-") {
      unranked.push(p);
    } else {
      ranked.push(p);
    }

  });

  // 시트 순위 그대로
  ranked.sort((a, b) => Number(a.tierRank) - Number(b.tierRank));

  // 10전 미만 맨 아래
  return [...ranked, ...unranked];

}

function renderRankingTable(players, tierName="전체") {

  const tbody = document.querySelector("#ranking-body");

  if (!tbody) return;

  tbody.innerHTML = "";

  const list = getTierPlayers(players, tierName);

  list.forEach((p, idx) => {

    const tr = document.createElement("tr");

    const rankText =
      p.tierRank === "-" ? "-" : p.tierRank;

    tr.innerHTML = `
      <td>${rankText}</td>
      <td>
        <a href="#player=${encodeURIComponent(p.id)}"
           class="player-link"
           data-player="${p.id}">
           ${p.id}
        </a>
      </td>
      <td>${p.race}</td>
      <td>${p.tier}</td>
      <td>${p.zvz}</td>
      <td>${p.pvz}</td>
      <td>${p.tvz}</td>
      <td>${p.total}</td>
      <td>${p.elo.toFixed(1)}</td>
    `;

    tbody.appendChild(tr);

  });

}

function renderPlayerDetail(player) {

  const wrap = document.querySelector("#player-detail");

  if (!wrap) return;

  wrap.innerHTML = `

    <div class="row">
      <span class="badge">플레이어</span>
      <strong>${player.id}</strong>
    </div>

    <div class="row">
      <span class="badge">주종</span>
      ${player.race}
    </div>

    <div class="row">
      <span class="badge">티어</span>
      ${player.tier}
    </div>

    <div class="row">
      <span class="badge">ELO</span>
      ${player.elo.toFixed(1)}
    </div>

    <div class="row">
      <span class="badge">티어랭킹</span>
      ${player.tierRank}
    </div>

    <div class="row">
      <span class="badge">전체랭킹</span>
      ${player.totalRank}
    </div>

  `;

}

window.loadClanData = loadClanData;
window.renderRankingTable = renderRankingTable;
window.renderPlayerDetail = renderPlayerDetail;
