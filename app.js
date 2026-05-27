// app.js 수정본
// 핵심 수정:
// 1. ELO 표시 = E열 점수만 출력
// 2. 티어별랭킹 = 시트 F열
// 3. 전체랭킹 = 시트 G열
// 4. 자체 순위 재계산 제거

function formatPlayerDetail(player){
  return {
    elo: player.elo,
    tierRank: player.tierRank,
    totalRank: player.totalRank
  };
}
