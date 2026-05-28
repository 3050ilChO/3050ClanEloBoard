
/* =========================================
   3050ClanEloBoard - RANK FIX VERSION
   ========================================= */

/*
핵심 수정 내용

1. ELO는 E열 점수만 출력
2. 티어랭킹 = F열
3. 전체랭킹 = G열
4. 순위 재계산 금지
5. 시트값 그대로 사용
6. 전체랭킹 페이지 = G열 기준 정렬
7. 티어별 페이지 = F열 기준 정렬
*/


function getTierRank(row){
  return row[5] || "-"; // F열
}

function getTotalRank(row){
  return row[6] || "-"; // G열
}

function getElo(row){
  return row[4] || "-"; // E열
}


/* =========================================
   선수 상세페이지
   ========================================= */

function renderPlayerProfile(row){

  const playerId = row[1] || "-";
  const race = row[2] || "-";
  const tier = row[0] || "-";
  const elo = getElo(row);

  const tierRank = getTierRank(row);
  const totalRank = getTotalRank(row);

  return `
    <div class="player-profile">

      <div class="row">
        <span class="badge">플레이어</span>
        ${playerId}
      </div>

      <div class="row">
        <span class="badge">주종</span>
        ${race}
      </div>

      <div class="row">
        <span class="badge">티어</span>
        ${tier}
      </div>

      <div class="row">
        <span class="badge">ELO</span>
        ${elo}
      </div>

      <div class="row">
        <span class="badge">티어랭킹</span>
        ${tierRank}
      </div>

      <div class="row">
        <span class="badge">전체랭킹</span>
        ${totalRank}
      </div>

    </div>
  `;
}


/* =========================================
   전체 랭킹 정렬
   G열 기준
   ========================================= */

function sortAllRanking(rows){

  return rows.sort((a,b)=>{

    const rankA = Number(a[6] || 999999);
    const rankB = Number(b[6] || 999999);

    return rankA - rankB;

  });

}


/* =========================================
   티어별 정렬
   F열 기준
   ========================================= */

function sortTierRanking(rows){

  return rows.sort((a,b)=>{

    const rankA = Number(a[5] || 999999);
    const rankB = Number(b[5] || 999999);

    return rankA - rankB;

  });

}


/* =========================================
   랭킹 테이블 생성
   ========================================= */

function buildRankingTable(rows, mode="all"){

  const sortedRows =
    mode === "all"
      ? sortAllRanking(rows)
      : sortTierRanking(rows);

  return sortedRows.map(row=>{

    const rank =
      mode === "all"
        ? getTotalRank(row)
        : getTierRank(row);

    return `
      <tr>
        <td>${rank}</td>
        <td>${row[1]}</td>
        <td>${row[2]}</td>
        <td>${row[0]}</td>
        <td>${row[7] || "-"}</td>
        <td>${row[8] || "-"}</td>
        <td>${row[9] || "-"}</td>
        <td>${row[10] || "-"}</td>
        <td>${row[11] || "-"}</td>
        <td>${getElo(row)}</td>
      </tr>
    `;

  }).join("");

}


/* =========================================
   반드시 삭제해야 하는 코드
   ========================================= */

/*

삭제 대상:

1.
elo 기준 정렬 코드

2.
ranked / unranked 재분류 코드

3.
elo 뒤에 순위 붙이는 코드

예:
${elo} (조커:18위)

4.
전적으로 티어랭킹 표시하는 코드

예:
30전12승18패

5.
새 rank 계산하는 코드

예:
index + 1

*/


console.log("3050 Rank Fix Loaded");
