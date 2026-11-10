// 10개 구단 ID (백엔드 db/03_기준정보.sql 과 같음)
export const TEAM_IDS = ['KIA', 'SAMSUNG', 'LG', 'DOOSAN', 'KT', 'SSG', 'LOTTE', 'HANWHA', 'NC', 'KIWOOM'];

/**
 * 시즌 당시의 구단명 (넥센→키움 2019년, SK→SSG 2021년)
 * 화면에 표시하는 이름은 가능하면 API 응답의 teamName 을 쓰고,
 * 필터 목록처럼 응답이 없을 때만 이 함수를 쓴다.
 */
export function teamNameFor(teamId, year) {
  const names = {
    KIA: 'KIA',
    SAMSUNG: '삼성',
    LG: 'LG',
    DOOSAN: '두산',
    KT: 'KT',
    SSG: year >= 2021 ? 'SSG' : 'SK',
    LOTTE: '롯데',
    HANWHA: '한화',
    NC: 'NC',
    KIWOOM: year >= 2019 ? '키움' : '넥센',
  };
  return names[teamId] ?? teamId;
}

// 검색창에서 팀 이름으로도 찾을 수 있게 쓰는 별칭
export const TEAM_SEARCH_WORDS = {
  KIA: ['KIA', '기아', '타이거즈'],
  SAMSUNG: ['삼성', '라이온즈'],
  LG: ['LG', '엘지', '트윈스'],
  DOOSAN: ['두산', '베어스'],
  KT: ['KT', '케이티', '위즈'],
  SSG: ['SSG', 'SK', '랜더스', '와이번스'],
  LOTTE: ['롯데', '자이언츠'],
  HANWHA: ['한화', '이글스'],
  NC: ['NC', '엔씨', '다이노스'],
  KIWOOM: ['키움', '넥센', '히어로즈'],
};
