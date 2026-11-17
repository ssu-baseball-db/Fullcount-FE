// ------------------------------------------------------------
// Vercel 배포 설정 (vercel.json 대신 쓰는 프로그래밍 방식 설정 파일)
// 빌드할 때 실행되므로 Vercel 환경변수 FULLCOUNT_API_ORIGIN 을 읽어 백엔드 주소를 넣을 수 있다.
//
// Vercel 프로젝트 환경변수 (Preview·Production 둘 다)
//   FULLCOUNT_API_ORIGIN = https://13.209.86.186   ← 백엔드(EC2) 주소, 끝에 / 없이
//   VITE_USE_MOCK        = false                    ← 목업 대신 실제 백엔드 사용
//
// 규칙 순서가 중요하다.
//   1) /api/*  → 백엔드의 같은 /api/* 주소로 전달 (브라우저 입장에서는 같은 사이트라 CORS·쿠키 문제가 없다)
//   2) 그 밖의 주소 → index.html (SPA fallback: /admin, /games/경기ID 를 바로 열거나 새로고침해도 React 화면이 뜬다)
// 실제 파일(/assets/*.js 등)은 Vercel이 규칙보다 먼저 찾아 주므로 2번에 걸리지 않는다.
// ------------------------------------------------------------
const apiOrigin = (process.env.FULLCOUNT_API_ORIGIN ?? '').trim().replace(/\/+$/, '');

if (!/^https?:\/\/[^/]+$/.test(apiOrigin)) {
  throw new Error(
    `FULLCOUNT_API_ORIGIN 환경변수가 없거나 형식이 틀렸습니다: "${apiOrigin}". 예) https://13.209.86.186`,
  );
}

export const config = {
  framework: 'vite',
  buildCommand: 'npm run build',
  outputDirectory: 'dist',
  rewrites: [
    { source: '/api/:path*', destination: `${apiOrigin}/api/:path*` },
    { source: '/(.*)', destination: '/index.html' },
  ],
};
