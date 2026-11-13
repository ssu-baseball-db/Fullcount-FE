import { teamColor } from '../../constants/teamColors.js';

/**
 * 구단 배지 (구단 대표 색 바탕에 흰 글씨)
 * solid=false 면 옅은 바탕에 구단 색 글씨 (진 팀 표시용)
 * size: 'large' 면 크게
 */
export default function TeamBadge({ teamId, name, solid = true, size }) {
  return (
    <span
      className={`team-badge${solid ? '' : ' is-soft'}${size ? ` team-badge--${size}` : ''}`}
      style={{ '--team': teamColor(teamId) }}
    >
      {name}
    </span>
  );
}
