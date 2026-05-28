
/*
완전 교체용 순위 모듈

시트:
https://docs.google.com/spreadsheets/d/14FUpa0Hcgtx6J1ZByx-cXGfbF7_ze1edONz8Wt70Obw/edit#gid=1624515144

클랜원전체명단 탭 기준

컬럼 구조
0 A 티어
1 B 아이디
2 C 종족
3 D 소속
4 E ELO
5 F 티어랭킹
6 G 전체랭킹
7 H 저그전
8 I 프로토스전
9 J 테란전
10 K 총전적
*/

function normalizeRankValue(v){
  if(v === undefined || v === null || v === '') return '-';
  return String(v).trim();
}

function isRankedPlayer(row){
  return normalizeRankValue(row[6]) !== '-';
}

function sortBySheetRank(rows, tierMode=false){
  return rows.sort((a,b)=>{

    const aRank = normalizeRankValue(tierMode ? a[5] : a[6]);
    const bRank = normalizeRankValue(tierMode ? b[5] : b[6]);

    if(aRank === '-' && bRank === '-') return 0;
    if(aRank === '-') return 1;
    if(bRank === '-') return -1;

    return Number(aRank) - Number(bRank);
  });
}

function buildRankRows(rows, tierMode=false){

  return rows.map(row=>{

    const rankValue = tierMode
      ? normalizeRankValue(row[5])
      : normalizeRankValue(row[6]);

    return `
      <tr>
        <td>${rankValue}</td>
        <td>
          <a href="#" class="player-link" data-player="${row[1]}">
            ${row[1]}
          </a>
        </td>
        <td>${row[2] || ''}</td>
        <td>${row[0] || ''}</td>
        <td>${row[7] || ''}</td>
        <td>${row[8] || ''}</td>
        <td>${row[9] || ''}</td>
        <td>${row[10] || ''}</td>
        <td>${row[4] || ''}</td>
      </tr>
    `;
  }).join('');
}

function buildPlayerDetail(row){

  return `
    <div class="player-info-wrap">

      <div class="row">
        <span class="badge">플레이어</span>
        ${row[1] || ''}
      </div>

      <div class="row">
        <span class="badge">주종</span>
        ${row[2] || ''}
      </div>

      <div class="row">
        <span class="badge">티어</span>
        ${row[0] || ''}
      </div>

      <div class="row">
        <span class="badge">ELO</span>
        ${row[4] || ''}
      </div>

      <div class="row">
        <span class="badge">티어랭킹</span>
        ${normalizeRankValue(row[5])}
      </div>

      <div class="row">
        <span class="badge">전체랭킹</span>
        ${normalizeRankValue(row[6])}
      </div>

    </div>
  `;
}

/*
반드시 삭제해야 하는 기존 코드들

1. elo 기준 sort
2. rank 재계산 함수
3. 자체 순위 생성
4. (조커:18위)(전체:213위) 붙이는 코드
5. row[5], row[6] 를 전적 컬럼으로 읽는 예전 구조

반드시 이 모듈 기준으로 전체 교체
*/
