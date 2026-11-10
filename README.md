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
화면 오른쪽 위에 "샘플 데이터" 표시가 보이면 목업 모드입니다.

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

## 폴더 구조

```
src/
├── main.jsx              앱 시작점 (라우터 연결)
├── App.jsx               URL ↔ 페이지 연결
├── api/
│   ├── client.js         fetch 공통 함수, 목업 모드 스위치
│   └── mainApi.js        메인 화면용 API 함수 (← API 명세가 주석으로 있음)
├── mock/mainMock.js      목업 데이터 (팀 이름 외에는 모두 임의 값)
├── hooks/useApi.js       API 불러오기 + 로딩/에러 상태 관리
├── components/
│   ├── Header.jsx        상단 메뉴
│   ├── SearchBox.jsx     선수·팀 검색창
│   ├── SeasonPlates.jsx  전광판 숫자판 모양의 시즌 선택
│   ├── StandingsBoard.jsx 팀 순위표
│   ├── LeaderBoard.jsx   부문별 TOP 5 (타자/투수 탭)
│   └── Footer.jsx
├── pages/
│   ├── MainPage.jsx      메인 화면
│   └── ComingSoon.jsx    아직 안 만든 화면 자리
├── constants/stats.js    부문 코드 → 한글 이름
├── utils/format.js       타율(.347), 게임차 등 표기 함수
└── styles/global.css     색·글꼴 등 디자인 기본값
```

## 메인 화면이 쓰는 API

API 명세 원본은 백엔드 저장소 [Fullcount-BE](https://github.com/ssu-baseball-db/Fullcount-BE)의
`src/main/resources/static/openapi.yaml`입니다. (백엔드 실행 후 http://localhost:8080/swagger-ui/index.html)

| 화면 영역 | 호출하는 API | 비고 |
| --- | --- | --- |
| 시즌 선택 | 없음 | 명세의 시즌 범위(2015~2026)를 `src/constants/seasons.js`에 상수로 둠 |
| 팀 순위표 | `GET /api/seasons/{year}/standings` | 응답의 rank는 포스트시즌 반영 최종 순위라 화면은 정규시즌 승률 순으로 다시 정렬하고, 최종 순위 1위(한국시리즈 우승)에 🏆 표시. 경기 수·게임차는 프론트에서 계산 |
| 부문별 순위(타자) | `GET /api/seasons/{year}/batting-stats?sort=avg&qualified=true` 외 `homeRuns`, `runsBattedIn`, `stolenBases` | 부문마다 1번씩 호출, 상위 5명만 사용 |
| 부문별 순위(투수) | `GET /api/seasons/{year}/pitching-stats?sort=era&qualified=true` 외 `wins`, `strikeouts`, `saves` | 위와 동일 |
| 검색창 | (검색 결과 화면에서) `GET /api/players?name=` | 검색 결과 화면은 아직 준비 중 |

호출 코드는 `src/api/mainApi.js`, 목업 응답은 `src/mock/mainMock.js`에 있습니다.
목업도 명세와 같은 형식이라, 백엔드가 준비되면 `VITE_USE_MOCK=false`만 바꾸면 됩니다.

## 브랜치·커밋 규칙

백엔드 저장소 README의 규칙을 그대로 따릅니다.

- `main`: 발표·제출용 안정 버전 / `develop`: 개발 통합 브랜치 (PR은 `develop`으로)
- 브랜치명: `<타입>/<이슈번호>-<영문 설명>` (예: `feat/1-main-page`)
- 커밋: `<타입>: <한국어 설명>` (예: `feat: 메인 화면 구현`)
- 이슈·PR 제목: `[타입] 한국어 설명` (예: `[FEAT] 메인 화면 구현`), PR 본문에 `Closes #이슈번호`
