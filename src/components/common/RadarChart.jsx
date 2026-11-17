import './RadarChart.css';

/**
 * 레이더(방사형) 차트. 축마다 0~100점을 그린다. (외부 라이브러리 없이 SVG)
 *
 * axes   : [{ key: 'homeRuns', label: '홈런' }, ...]  — 위쪽부터 시계 방향으로 놓인다
 * series : [{ name: '김도영', scores: { homeRuns: 87.5, ... }, tone: 'a' | 'b' }]
 *          점수가 null 인 축은 0점 자리에 찍는다 (기록 없음)
 * label  : 스크린리더용 설명
 */
export default function RadarChart({ axes, series, label }) {
  const SIZE = 480;
  const CENTER = SIZE / 2;
  const RADIUS = 160;
  const RINGS = [25, 50, 75, 100];

  // i 번째 축에서 점수 score 위치의 좌표 (맨 위에서 시작해 시계 방향)
  const point = (i, score) => {
    const angle = -Math.PI / 2 + (2 * Math.PI * i) / axes.length;
    const r = (RADIUS * score) / 100;
    return [CENTER + r * Math.cos(angle), CENTER + r * Math.sin(angle)];
  };
  const polygon = (scores) => axes.map((axis, i) => point(i, scores[axis.key] ?? 0).join(',')).join(' ');

  return (
    <svg className="radar" viewBox={`0 0 ${SIZE} ${SIZE}`} role="img" aria-label={label}>
      {/* 25·50·75·100점 테두리 */}
      {RINGS.map((ring) => (
        <polygon
          key={ring}
          points={axes.map((_, i) => point(i, ring).join(',')).join(' ')}
          className={ring === 100 ? 'radar__ring is-outer' : 'radar__ring'}
        />
      ))}

      {/* 가운데에서 꼭짓점으로 가는 축 */}
      {axes.map((axis, i) => {
        const [x, y] = point(i, 100);
        return <line key={axis.key} x1={CENTER} y1={CENTER} x2={x} y2={y} className="radar__axis" />;
      })}

      {/* 점수 눈금 (위쪽 축 옆) */}
      {RINGS.map((ring) => {
        const [x, y] = point(0, ring);
        return (
          <text key={`t-${ring}`} x={x + 6} y={y + 4} className="radar__tick">
            {ring}
          </text>
        );
      })}

      {/* 선수별 다각형 */}
      {series.map((s) => (
        <g key={s.name} className={`radar__series is-${s.tone}`}>
          <polygon points={polygon(s.scores)} className="radar__area" />
          {axes.map((axis, i) => {
            const [x, y] = point(i, s.scores[axis.key] ?? 0);
            return (
              <circle key={axis.key} cx={x} cy={y} r="4.5" className="radar__dot">
                <title>{`${s.name} ${axis.label}: ${s.scores[axis.key] == null ? '기록 없음' : `${Math.round(s.scores[axis.key])}점`}`}</title>
              </circle>
            );
          })}
        </g>
      ))}

      {/* 축 이름 */}
      {axes.map((axis, i) => {
        const [x, y] = point(i, 122);
        const anchor = Math.abs(x - CENTER) < 4 ? 'middle' : x > CENTER ? 'start' : 'end';
        return (
          <text key={`l-${axis.key}`} x={x} y={y + 5} textAnchor={anchor} className="radar__label">
            {axis.label}
          </text>
        );
      })}
    </svg>
  );
}
