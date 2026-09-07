/* ============================================================
   config.js — 페이지에 들어가는 "데이터"와 "설정값"을 한곳에 모은 파일
   ------------------------------------------------------------
   왜 분리했나?
   - 내용(데이터)이 바뀔 때 로직(main.js)을 건드리지 않아도 된다.
   - 과제에서 "기준값은 자유롭게 바꾸되 README에 명시" 라고 한 숫자들을
     한 화면에서 모두 확인할 수 있다.
   - index.html 에서 config.js 를 main.js 보다 먼저 defer 로 불러오므로,
     main.js 실행 시점에는 아래 상수들이 이미 준비되어 있다.
   ============================================================ */

/* ---------- 1. 나에 대한 정보 ----------
   ⚠️ 제출 전에 본인 정보로 바꿔주세요. GITHUB_USERNAME 이 틀리면
      Projects 섹션은 (의도대로) 에러 상태 UI 를 보여줍니다. */
const PROFILE = {
  name: '해은',
  githubUsername: 'haeunyn',   // ← 본인 GitHub 아이디로 변경
  email: 'haeunyn@gmail.com',
  // Hero 섹션에서 한 글자씩 타이핑될 문장들
  taglines: [
    '웹의 동작 원리를 직접 만들어 봅니다.',
    '이벤트 → 상태 → 렌더링을 설명할 수 있습니다.',
    '프레임워크 없이 처음부터 만들었습니다.',
  ],
};

/* ---------- 2. Skills 섹션 데이터 ----------
   배열로 두면 map() 으로 카드를 한 번에 만들 수 있다. */
const SKILLS = [
  { emoji: '🧱', name: 'HTML',        level: 80, desc: '시맨틱 태그로 의미가 드러나는 구조를 짭니다.' },
  { emoji: '🎨', name: 'CSS',         level: 70, desc: '변수·Flexbox·Grid로 반응형 레이아웃을 만듭니다.' },
  { emoji: '⚡', name: 'JavaScript',  level: 70, desc: 'DOM 조작과 이벤트로 화면을 움직입니다.' },
  { emoji: '🌐', name: 'Fetch API',   level: 60, desc: 'async/await 로 외부 데이터를 가져옵니다.' },
  { emoji: '🔧', name: 'Git/GitHub',  level: 60, desc: '커밋으로 기록하고 Pages 로 배포합니다.' },
  { emoji: '🤝', name: '동료학습',     level: 90, desc: '설명하면서 배우고, 질문하면서 정리합니다.' },
];

/* ---------- 3. 동작 기준값 (README 에 명시한 값들) ---------- */
const CONFIG = {
  NAV_SCROLL_THRESHOLD: 60,     // 헤더 배경이 바뀌기 시작하는 스크롤 위치(px)
  SCROLL_TOP_THRESHOLD: 300,    // 맨 위로 버튼이 나타나는 스크롤 위치(px)
  OBSERVER_THRESHOLD: 0.2,      // 요소가 20% 보이면 등장 애니메이션 실행
  TYPING_SPEED: 70,             // 글자 하나 찍는 간격(ms)
  TYPING_ERASE_SPEED: 35,       // 글자 하나 지우는 간격(ms)
  TYPING_HOLD: 1600,            // 문장을 다 쓴 뒤 멈춰 있는 시간(ms)
  REPO_COUNT: 100,              // GitHub 에서 한 번에 요청할 저장소 개수
  STORAGE_KEY_THEME: 'portfolio-theme',  // 로컬스토리지에 테마를 저장할 키 이름
};

/* ---------- 4. GitHub API 주소 ----------
   sort=updated : 최근에 손댄 저장소가 앞에 오도록
   per_page     : 한 번에 받아올 개수 */
const GITHUB_API_URL =
  `https://api.github.com/users/${PROFILE.githubUsername}/repos?sort=updated&per_page=${CONFIG.REPO_COUNT}`;
