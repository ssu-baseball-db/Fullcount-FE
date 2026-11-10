# Fullcount-FE

야구 경기 기록 및 선수 통계 관리 서비스 **풀카운트**의 프론트엔드입니다.

React(Vite)로 만들었고, 백엔드([Fullcount-BE](https://github.com/ssu-baseball-db/Fullcount-BE), 스프링부트)와는 REST API로 통신합니다.

## 실행 방법

Node.js 18 이상이 필요합니다. (`node -v`로 확인)

```bash
npm install      # 처음 한 번만 (라이브러리 설치)
npm run dev      # 개발 서버 실행 → http://localhost:5173
```

> `package.json`의 `overrides`는 Windows 11 스마트 앱 컨트롤이 네이티브 파일(`.node`, `.exe`)을
> 막는 문제를 피하려고 rollup·esbuild를 WebAssembly 버전으로 바꿔 둔 설정입니다. 지우지 마세요.

기본값은 **목업 데이터 모드**라서 백엔드 없이도 화면이 뜹니다.
헤더 아래에 노란 "샘플 데이터" 안내 띠가 보이면 목업 모드입니다.
목업 서버(`src/mock/mockServer.js`)는 `openapi.yaml`의 주소·파라미터·응답 형식·400/404 규칙을 그대로 흉내 내므로,
백엔드 API가 완성되면 설정만 바꿔서 같은 화면을 실제 데이터로 볼 수 있습니다.

### 실제 백엔드에 연결하기

1. 스프링부트를 8080 포트로 실행합니다.
2. 프로젝트 맨 위 폴더에 `.env` 파일을 만들고 아래 한 줄을 넣습니다.
   ```
   VITE_USE_MOCK=false
   ```
3. `npm run dev`를 다시 실행합니다.

`/api`로 시작하는 요청은 `vite.config.js`의 프록시 설정 덕분에 자동으로 `localhost:8080`으로 전달됩니다.
그래서 개발할 때는 CORS 설정이 따로 필요 없습니다.

### 발표·시연용으로 합치기

```bash
npm run build
```
`dist/` 폴더 안의 파일을 스프링 프로젝트의 `src/main/resources/static/`에 복사하면,
스프링부트 하나만 실행해도 화면과 API가 같이 동작합니다.
(새로고침했을 때 404가 나면 백엔드에서 `/api`가 아닌 경로를 `index.html`로 보내는 설정이 필요합니다.)

## 화면 목록과 사용하는 API

| 화면 | 주소 | 호출하는 API (openapi.yaml) | 담당 |
| --- | --- | --- | --- |
| 메인 | `/` | standings, batting-stats·pitching-stats (부문별 TOP 5) | 장정훈 |
| 선수 찾기 | `/players?name=` | `GET /api/players` (1.1) | 장정훈 |
| 선수 상세 | `/players/{playerId}?type=batter\|pitcher` | `GET /api/players/{id}/season-stats` (1.4) | 장정훈 |
| 선수 비교 | `/compare?a=&b=&type=&season=` | `GET /api/players/compare` (4.1) | 장정훈 |
| 팀 목록 | `/teams?year=&sort=` | standings, `GET /api/seasons/{year}/team-stats` (2.1) | 장정훈 |
| 팀 상세 | `/teams/{teamId}?year=&type=&sort=` | standings, `teams/{teamId}/batting-stats·pitching-stats` (2.2, 2.3) | 장정훈 |
| 기록 순위 | `/leaders?year=&type=&category=&team=&qualified=` | `batting-stats`, `pitching-stats` (1.2, 1.3) | 장정훈 |
| 경기 | `/games`, `/games/{gameId}` | `GET /api/games` (3.1~3.3) | 박은호 |

주소의 `?year=` 같은 조건은 화면에서 바꿀 때마다 주소에도 반영되므로, 주소를 복사해 공유하면 같은 화면이 열립니다.

프론트에서 따로 처리하는 것:
- **팀 순위:** standings 의 `rank`는 포스트시즌 반영 최종 순위라, 화면에서는 정규시즌 승률 순으로 다시 매기고 최종 1위(한국시리즈 우승)에 🏆를 붙입니다. 경기 수·게임차도 프론트에서 계산합니다.
- **규정 충족:** 타율·출루율·장타율·OPS·ERA·WHIP 순위는 `qualified=true`로 요청합니다.
- **표기:** 비율이 `null`이면 `-`, 이닝은 `outsPitched`를 3으로 나눠 `144 1/3`처럼 표시합니다.
- **에러:** 백엔드가 `{ "message": "..." }`를 보내면 그 문구를 화면에 그대로 보여 줍니다.

## 폴더 구조

```
src/
├── App.jsx                 주소 ↔ 페이지 연결
├── api/                    백엔드 호출 (파일마다 명세 번호와 응답 형식을 주석으로 적어 둠)
│   ├── client.js           fetch 공통 처리, 목업 모드 스위치, ApiError
│   ├── statsApi.js         시즌 기록·팀 순위 (1.2, 1.3, standings)
│   ├── playerApi.js        선수 검색·연도별 기록·비교 (1.1, 1.4, 4.1)
│   ├── teamApi.js          팀 성적·팀 선수 기록 (2.1~2.3)
│   └── mainApi.js          메인 화면 전용 묶음
├── mock/                   목업 서버와 가짜 데이터 (USE_MOCK 일 때만 불러옴)
├── pages/
│   ├── MainPage.jsx
│   ├── players/            선수 찾기·상세·비교
│   ├── teams/              팀 목록·상세
│   └── leaders/            기록 순위
├── components/
│   ├── common/             여러 페이지가 같이 쓰는 부품
│   │   ├── StatTable.jsx   기록 표 (정렬·합계 행·이름 열 고정)
│   │   ├── LineChart.jsx   연도별 추이 그래프 (라이브러리 없이 SVG)
│   │   ├── PlayerPicker.jsx 이름으로 선수 고르기
│   │   ├── Controls.jsx    시즌·구단 선택, 타자/투수 버튼
│   │   ├── PageHeader.jsx  페이지 위 녹색 띠
│   │   └── StatusMessage.jsx 불러오는 중·에러·빈 결과 안내
│   └── (메인 화면 부품들)
├── constants/              시즌 범위, 구단, 기록 이름, 표 열 정의
├── hooks/useApi.js         API 불러오기 + 로딩/에러 상태
├── utils/                  숫자 표기, 주소 파라미터 읽기
└── styles/                 색·글꼴(global.css), 페이지 공통 레이아웃(page.css)
```

## 브랜치·커밋 규칙

백엔드 저장소 README의 규칙을 그대로 따릅니다.

- `main`: 발표·제출용 안정 버전 / `develop`: 개발 통합 브랜치 (PR은 `develop`으로)
- 브랜치명: `<타입>/<이슈번호>-<영문 설명>` (예: `feat/1-main-page`)
- 커밋: `<타입>: <한국어 설명>` (예: `feat: 메인 화면 구현`)
- 이슈·PR 제목: `[타입] 한국어 설명` (예: `[FEAT] 메인 화면 구현`), PR 본문에 `Closes #이슈번호`
