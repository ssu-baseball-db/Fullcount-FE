import { useEffect, useState } from 'react';
import './LineChart.css';

// 화면 폭이 좁은지 (휴대폰) 알려주는 훅 — 좁으면 그래프를 덜 넓게 그려 글자가 작아지지 않게 한다
function useIsNarrow(maxWidth = 640) {
  const query = `(max-width: ${maxWidth}px)`;
  const [narrow, setNarrow] = useState(() => window.matchMedia(query).matches);
  useEffect(() => {
    const media = window.matchMedia(query);
    const onChange = () => setNarrow(media.matches);
    media.addEventListener('change', onChange);
    return () => media.removeEventListener('change', onChange);
  }, [query]);
  return narrow;
}

/**
 * 연도별 추이를 그리는 간단한 꺾은선 그래프 (외부 라이브러리 없이 SVG 로 그림)
 *
 * points : [{ x: 2018, y: 0.312 }, ...]  y 가 null 인 연도는 건너뛴다
 * format : 값 표기 함수 (예: v => formatStat('avg', v))
 * label  : 스크린리더용 설명
 */
export default function LineChart({ points, format = String, label, height = 240 }) {
  const narrow = useIsNarrow();
  const valid = points.filter((p) => p.y != null);
  if (valid.length === 0) return <p className="line-chart__empty">그래프로 보여줄 기록이 없습니다.</p>;

  // 그림 크기와 여백 (viewBox 기준이라 실제 화면 폭에 맞춰 늘어나고 줄어든다)
  const W = narrow ? 400 : 720;
  const H = narrow ? 260 : height;
  const PAD = { left: narrow ? 44 : 56, right: narrow ? 18 : 28, top: 30, bottom: 36 };
  // 좁은 화면에서는 연도를 '18 처럼 줄여 쓴다
  const yearLabel = (year) => (narrow && valid.length > 6 ? `'${String(year).slice(2)}` : year);

  const xs = valid.map((p) => p.x);
  const ys = valid.map((p) => p.y);
  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);
  let minY = Math.min(...ys);
  let maxY = Math.max(...ys);
  if (minY === maxY) {
    minY -= Math.abs(minY) * 0.1 || 1;
    maxY += Math.abs(maxY) * 0.1 || 1;
  }
  const spread = maxY - minY;
  minY -= spread * 0.15;
  maxY += spread * 0.15;

  const toX = (x) =>
    minX === maxX ? (PAD.left + W - PAD.right) / 2 : PAD.left + ((x - minX) / (maxX - minX)) * (W - PAD.left - PAD.right);
  const toY = (y) => PAD.top + (1 - (y - minY) / (maxY - minY)) * (H - PAD.top - PAD.bottom);

  const path = valid.map((p, i) => `${i === 0 ? 'M' : 'L'}${toX(p.x).toFixed(1)},${toY(p.y).toFixed(1)}`).join(' ');
  const gridValues = [minY + (maxY - minY) * 0.15, (minY + maxY) / 2, maxY - (maxY - minY) * 0.15];

  return (
    <svg className="line-chart" viewBox={`0 0 ${W} ${H}`} role="img" aria-label={label}>
      {/* 가로 보조선과 왼쪽 눈금 */}
      {gridValues.map((value) => (
        <g key={value}>
          <line x1={PAD.left} x2={W - PAD.right} y1={toY(value)} y2={toY(value)} className="line-chart__grid" />
          <text x={PAD.left - 10} y={toY(value) + 4} textAnchor="end" className="line-chart__axis">
            {format(value)}
          </text>
        </g>
      ))}

      {/* 아래쪽 연도 */}
      {valid.map((p) => (
        <text key={`x-${p.x}`} x={toX(p.x)} y={H - 10} textAnchor="middle" className="line-chart__axis">
          {yearLabel(p.x)}
        </text>
      ))}

      <path d={path} className="line-chart__line" />

      {/* 점과 값 */}
      {valid.map((p) => (
        <g key={`p-${p.x}`}>
          <circle cx={toX(p.x)} cy={toY(p.y)} r="5" className="line-chart__dot">
            <title>{`${p.x}: ${format(p.y)}`}</title>
          </circle>
          {/* 좁은 화면에서 점이 많으면 값 글자가 겹치므로 그래프 위 숫자는 생략 (점에 마우스·터치하면 보임) */}
          {!(narrow && valid.length > 6) && (
            <text x={toX(p.x)} y={toY(p.y) - 12} textAnchor="middle" className="line-chart__value">
              {format(p.y)}
            </text>
          )}
        </g>
      ))}
    </svg>
  );
}
