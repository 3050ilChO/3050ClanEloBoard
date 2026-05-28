// 수정 핵심 내용
// 1. 상세페이지 ELO는 점수만 출력
// 2. 티어랭킹 = F열
// 3. 전체랭킹 = G열
// 4. 전체랭킹 페이지는 G열 기준 정렬
// 5. 티어별 페이지는 F열 기준 정렬

// 기존 eloText 사용 부분 수정
const eloText = player.ELO || '-';

// 상세페이지 출력 예시
/*
<div class="row"><span class="badge">ELO</span> ${eloText}</div>
<div class="row"><span class="badge">티어랭킹</span> ${player.tierRank || '-'}</div>
<div class="row"><span class="badge">전체랭킹</span> ${player.totalRank || '-'}</div>
*/

// 전체랭킹 정렬
/*
ranked.sort((a,b)=>{
  const ar = parseInt(a.totalRank) || 999999;
  const br = parseInt(b.totalRank) || 999999;
  return ar - br;
});
*/

// 티어랭킹 정렬
/*
tierRanked.sort((a,b)=>{
  const ar = parseInt(a.tierRank) || 999999;
  const br = parseInt(b.tierRank) || 999999;
  return ar - br;
});
*/
