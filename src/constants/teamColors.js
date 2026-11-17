// 구단 대표 색 (경기 화면의 팀 배지·상단 띠·점수판에 사용)
// 각 구단의 대표 색을 화면에서 잘 보이도록 조금 조정한 값이다. 글자는 모두 흰색으로 올린다.
export const TEAM_COLORS = {
  KIA: '#EA0029',
  SAMSUNG: '#074CA1',
  LG: '#C30452',
  DOOSAN: '#131230',
  KT: '#231F20',
  SSG: '#CE0E2D',
  LOTTE: '#041E42',
  HANWHA: '#F05A00',
  NC: '#315288',
  KIWOOM: '#820024',
};

export function teamColor(teamId) {
  return TEAM_COLORS[teamId] ?? '#1e3b30';
}

// style={{ ...teamColorVars(game) }} 처럼 쓰면 CSS 에서 var(--away), var(--home) 으로 색을 쓸 수 있다
export function teamColorVars(game) {
  return { '--away': teamColor(game.awayTeamId), '--home': teamColor(game.homeTeamId) };
}
