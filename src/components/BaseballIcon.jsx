// 로고용 야구공 그림 (SVG). size 로 크기를 조절한다.
export default function BaseballIcon({ size = 28 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" aria-hidden="true" focusable="false">
      {/* 공 */}
      <circle cx="16" cy="16" r="14.25" fill="#ffffff" stroke="currentColor" strokeWidth="1.5" />

      {/* 왼쪽·오른쪽 실밥 선 */}
      <g fill="none" stroke="#c8102e" strokeLinecap="round">
        <path d="M7.2 5.2 C12.6 10.4 12.6 21.6 7.2 26.8" strokeWidth="1.1" />
        <path d="M24.8 5.2 C19.4 10.4 19.4 21.6 24.8 26.8" strokeWidth="1.1" />

        {/* 점선을 굵게 그려서 바느질 땀처럼 보이게 */}
        <path d="M7.2 5.2 C12.6 10.4 12.6 21.6 7.2 26.8" strokeWidth="3.2" strokeDasharray="0.9 2.3" strokeLinecap="butt" />
        <path d="M24.8 5.2 C19.4 10.4 19.4 21.6 24.8 26.8" strokeWidth="3.2" strokeDasharray="0.9 2.3" strokeLinecap="butt" />
      </g>
    </svg>
  );
}
