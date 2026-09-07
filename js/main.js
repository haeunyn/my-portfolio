/* ============================================================
   main.js — 페이지의 모든 동작
   ------------------------------------------------------------
   이 파일은 하나의 원칙으로 쓰여 있습니다.

        사용자 이벤트  →  상태(state) 변경  →  화면 렌더링

   1) addEventListener 로 "무슨 일이 일어났는지"만 받는다.
   2) 그 사건은 state 객체의 값을 바꾼다.
   3) 화면은 render 함수가 state 를 보고 다시 그린다.

   React 의 useState/렌더링도 결국 이 흐름을 자동화한 것입니다.
   ============================================================ */

/* ============================================================
   0. 공통 도구
   ============================================================ */

// querySelector 를 짧게 쓰기 위한 도우미 (화살표 함수)
const $ = (selector, scope = document) => scope.querySelector(selector);
const $$ = (selector, scope = document) => scope.querySelectorAll(selector);

/**
 * 외부(GitHub)에서 받은 문자열을 innerHTML 에 넣기 전에 안전하게 바꾼다.
 * 저장소 설명에 <script> 같은 태그가 들어 있어도 "글자"로만 표시되도록 하는 XSS 방어.
 */
const escapeHtml = (value) =>
  String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

// 2024-01-31T... → 2024.01.31
const formatDate = (isoString) => {
  const date = new Date(isoString);
  const pad = (n) => String(n).padStart(2, '0');
  return `${date.getFullYear()}.${pad(date.getMonth() + 1)}.${pad(date.getDate())}`;
};

/* ============================================================
   1. 애플리케이션 상태 (state)
   ------------------------------------------------------------
   화면에 보이는 모든 것은 이 객체에서 나온다.
   "지금 화면이 왜 저렇게 보이지?" 의 답은 항상 여기에 있다.
   ============================================================ */
const state = {
  theme: 'light',          // 'light' | 'dark'
  isMenuOpen: false,       // 모바일 메뉴가 열렸는가
  projects: {
    status: 'idle',        // 'idle' | 'loading' | 'success' | 'error'
    items: [],             // 성공 시 저장소 목록
    error: '',             // 실패 시 사용자에게 보여줄 메시지
  },
  activeLanguage: 'All',   // 프로젝트 언어 필터
  formErrors: {},          // { name: '메시지', email: '...' }
};

/* ============================================================
   2. DOM 요소 캐싱
   ------------------------------------------------------------
   querySelector 는 호출할 때마다 문서를 탐색하므로,
   반복해서 쓰는 요소는 한 번만 찾아 상수에 담아 둔다.
   ============================================================ */
const elements = {
  root: document.documentElement,          // <html> — data-theme 이 붙는 곳
  header: $('#header'),
  navMenu: $('#nav-menu'),
  navToggle: $('#nav-toggle'),
  navLinks: $$('.nav__link'),              // NodeList (유사 배열)
  themeToggle: $('#theme-toggle'),
  scrollTopBtn: $('#scroll-top'),
  typing: $('#typing'),
  skillList: $('#skill-list'),
  filters: $('#filters'),
  projectsGrid: $('#projects-grid'),
  projectsStatus: $('#projects-status'),
  form: $('#contact-form'),
  formSuccess: $('#form-success'),
  year: $('#year'),
  footerGithub: $('#footer-github'),
};

/* ============================================================
   3. 다크 모드
   흐름: 토글 클릭 → state.theme 변경 → <html data-theme> 갱신 + 저장
   ============================================================ */

/** 상태를 화면에 반영하는 함수 (렌더러) */
const renderTheme = () => {
  // CSS 의 [data-theme="dark"] 규칙이 이 속성 하나로 전체 색을 바꾼다
  elements.root.setAttribute('data-theme', state.theme);
  const isDark = state.theme === 'dark';
  elements.themeToggle.setAttribute('aria-pressed', String(isDark));
  elements.themeToggle.setAttribute('aria-label', isDark ? '라이트 모드 전환' : '다크 모드 전환');
};

/** 테마를 바꾸고 저장까지 하는 함수 (상태 변경 지점) */
const setTheme = (theme) => {
  state.theme = theme;
  renderTheme();
  // localStorage 는 브라우저에 문자열로 남는 저장소 → 새로고침해도 유지된다
  localStorage.setItem(CONFIG.STORAGE_KEY_THEME, theme);
};

const initTheme = () => {
  // 1순위: 사용자가 예전에 고른 값
  const saved = localStorage.getItem(CONFIG.STORAGE_KEY_THEME);
  // 2순위: 운영체제 설정 (보너스 과제: prefers-color-scheme)
  const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;

  state.theme = saved ?? (prefersDark ? 'dark' : 'light');
  renderTheme();

  elements.themeToggle.addEventListener('click', () => {
    setTheme(state.theme === 'dark' ? 'light' : 'dark');
  });

  // 저장된 선택이 없을 때만 OS 설정 변화를 따라간다
  window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (event) => {
    if (localStorage.getItem(CONFIG.STORAGE_KEY_THEME)) return;
    state.theme = event.matches ? 'dark' : 'light';
    renderTheme();
  });
};

/* ============================================================
   4. 네비게이션 — 햄버거 메뉴 / 부드러운 스크롤
   ============================================================ */

const renderMenu = () => {
  // classList.toggle 의 두 번째 인자로 "켤지 끌지"를 상태값으로 직접 지정한다
  elements.navMenu.classList.toggle('nav__menu--open', state.isMenuOpen);
  elements.navToggle.classList.toggle('nav__toggle--open', state.isMenuOpen);
  elements.navToggle.setAttribute('aria-expanded', String(state.isMenuOpen));
  elements.navToggle.setAttribute('aria-label', state.isMenuOpen ? '메뉴 닫기' : '메뉴 열기');
};

const setMenuOpen = (isOpen) => {
  state.isMenuOpen = isOpen;
  renderMenu();
};

const initNavigation = () => {
  // 햄버거 버튼: 클릭할 때마다 열림/닫힘 뒤집기
  elements.navToggle.addEventListener('click', () => setMenuOpen(!state.isMenuOpen));

  // 메뉴 링크 클릭 → 기본 점프 대신 부드러운 스크롤 + 모바일 메뉴 닫기
  elements.navLinks.forEach((link) => {
    link.addEventListener('click', (event) => {
      const targetId = link.getAttribute('href');      // 예: "#about"
      const target = $(targetId);
      if (!target) return;

      event.preventDefault();                          // 주소창이 튀지 않게 기본 동작 차단
      target.scrollIntoView({ behavior: 'smooth', block: 'start' });
      history.pushState(null, '', targetId);           // 뒤로가기로 이전 섹션에 돌아갈 수 있게
      setMenuOpen(false);
    });
  });

  // ESC 키로 메뉴 닫기 (키보드 사용자 배려)
  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && state.isMenuOpen) setMenuOpen(false);
  });

  // 데스크톱 폭으로 넓어지면 열린 상태를 정리한다
  window.matchMedia('(min-width: 768px)').addEventListener('change', (event) => {
    if (event.matches) setMenuOpen(false);
  });
};

/* ============================================================
   5. 스크롤에 반응하는 UI
   - 헤더 배경 변경 (60px 이상)
   - 맨 위로 버튼 표시 (300px 이상)
   - 현재 섹션 메뉴 강조 (스크롤 스파이)
   ============================================================ */
const initScrollEffects = () => {
  const sections = [...$$('main section[id]')];   // NodeList 를 스프레드로 배열로 변환

  const handleScroll = () => {
    const y = window.scrollY;

    // (1) 헤더 스타일
    elements.header.classList.toggle('header--scrolled', y > CONFIG.NAV_SCROLL_THRESHOLD);

    // (2) 맨 위로 버튼
    elements.scrollTopBtn.classList.toggle('scroll-top--visible', y > CONFIG.SCROLL_TOP_THRESHOLD);

    // (3) 스크롤 스파이 — 화면 상단 1/3 지점을 지난 마지막 섹션이 "현재 섹션"
    const line = y + window.innerHeight / 3;
    let currentId = sections[0]?.id ?? '';
    sections.forEach((section) => {
      if (section.offsetTop <= line) currentId = section.id;
    });
    elements.navLinks.forEach((link) => {
      link.classList.toggle('nav__link--active', link.getAttribute('href') === `#${currentId}`);
    });
  };

  // scroll 이벤트는 1초에 수십 번 발생한다.
  // requestAnimationFrame 으로 "다음 화면 그리기 직전 한 번만" 계산하도록 묶어 성능을 지킨다.
  let ticking = false;
  window.addEventListener('scroll', () => {
    if (ticking) return;
    ticking = true;
    window.requestAnimationFrame(() => {
      handleScroll();
      ticking = false;
    });
  });

  // 맨 위로 버튼
  elements.scrollTopBtn.addEventListener('click', () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  });

  handleScroll();   // 새로고침 시 이미 스크롤된 상태일 수 있으므로 한 번 실행
};

/* ============================================================
   6. 스크롤 등장 애니메이션 (Intersection Observer)
   ------------------------------------------------------------
   scroll 이벤트로 위치를 직접 계산하지 않고,
   "이 요소가 화면에 20% 이상 들어왔는가"를 브라우저가 알려주게 한다.
   ============================================================ */
const initRevealAnimation = () => {
  const targets = $$('.reveal');

  // 지원하지 않는 환경이면 전부 그냥 보이게 (점진적 향상)
  if (!('IntersectionObserver' in window)) {
    targets.forEach((el) => el.classList.add('reveal--visible'));
    return;
  }

  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach(({ isIntersecting, target }) => {   // 구조 분해 할당
        if (!isIntersecting) return;
        target.classList.add('reveal--visible');
        observer.unobserve(target);   // 한 번 나타난 요소는 더 감시하지 않는다
      });
    },
    { threshold: CONFIG.OBSERVER_THRESHOLD }
  );

  targets.forEach((el) => observer.observe(el));
};

/* ============================================================
   7. Hero 타이핑 효과 (보너스 과제)
   상태: 몇 번째 문장의 몇 번째 글자까지 썼는가
   ============================================================ */
const initTypingEffect = () => {
  const { taglines } = PROFILE;         // 구조 분해 할당
  if (!elements.typing || taglines.length === 0) return;

  let sentenceIndex = 0;
  let charIndex = 0;
  let isDeleting = false;

  const tick = () => {
    const sentence = taglines[sentenceIndex];
    charIndex += isDeleting ? -1 : 1;
    elements.typing.textContent = sentence.slice(0, charIndex);   // 문자열이므로 textContent

    let delay = isDeleting ? CONFIG.TYPING_ERASE_SPEED : CONFIG.TYPING_SPEED;

    if (!isDeleting && charIndex === sentence.length) {
      isDeleting = true;
      delay = CONFIG.TYPING_HOLD;                 // 다 썼으면 잠깐 멈춘다
    } else if (isDeleting && charIndex === 0) {
      isDeleting = false;
      sentenceIndex = (sentenceIndex + 1) % taglines.length;   // 마지막 다음은 처음으로
      delay = CONFIG.TYPING_SPEED;
    }
    setTimeout(tick, delay);
  };

  tick();
};

/* ============================================================
   8. Skills 렌더링 (배열 → HTML)
   map 으로 문자열 조각을 만들고 join 으로 하나로 합친 뒤 한 번만 innerHTML 에 넣는다.
   (반복문 안에서 innerHTML += 를 쓰면 그때마다 다시 그려서 느리다)
   ============================================================ */
const renderSkills = () => {
  elements.skillList.innerHTML = SKILLS
    .map(({ emoji, name, level, desc }) => `
      <li class="skill reveal">
        <h3 class="skill__name"><span class="skill__emoji" aria-hidden="true">${emoji}</span>${name}</h3>
        <p class="skill__desc">${desc}</p>
        <div class="skill__level" role="img" aria-label="${name} 숙련도 ${level}퍼센트">
          <div class="skill__bar" data-level="${level}"></div>
        </div>
      </li>
    `)
    .join('');
};

/* ============================================================
   9. GitHub API 연동 (fetch + async/await)
   흐름: 로딩 상태 → 요청 → 성공/실패 상태 → 각각 다른 화면
   ============================================================ */

/** 상태를 한 번에 바꾸고 곧바로 다시 그리는 단일 창구 */
const setProjectsState = (partial) => {
  state.projects = { ...state.projects, ...partial };   // 스프레드로 기존 값 유지 + 덮어쓰기
  renderProjects();
};

/** 저장소 하나 → 카드 HTML 한 장 */
const createProjectCard = ({ name, html_url, description, language, stargazers_count, forks_count, updated_at, topics }) => `
  <article class="card">
    <h3 class="card__title">
      <a href="${html_url}" target="_blank" rel="noopener noreferrer">${escapeHtml(name)}</a>
    </h3>
    <p class="card__desc">${escapeHtml(description) || '설명이 아직 없는 저장소입니다.'}</p>
    ${topics && topics.length
      ? `<div class="card__topics">${topics.slice(0, 3).map((t) => `<span class="card__topic">${escapeHtml(t)}</span>`).join('')}</div>`
      : ''}
    <div class="card__meta">
      ${language ? `<span class="card__lang"><span class="card__dot" aria-hidden="true"></span>${escapeHtml(language)}</span>` : ''}
      <span>⭐ ${stargazers_count}</span>
      <span>🍴 ${forks_count}</span>
      <span>수정 ${formatDate(updated_at)}</span>
    </div>
  </article>
`;

/** 언어 필터 버튼 만들기 (보너스 과제) */
const renderFilters = () => {
  const { items } = state.projects;
  if (items.length === 0) {
    elements.filters.innerHTML = '';
    return;
  }

  // map 으로 언어만 뽑고 → Boolean 로 null 제거 → Set 으로 중복 제거
  const languages = ['All', ...new Set(items.map((repo) => repo.language).filter(Boolean))];

  elements.filters.innerHTML = languages
    .map((lang) => `
      <button class="filter-btn ${lang === state.activeLanguage ? 'filter-btn--active' : ''}"
              type="button" data-lang="${escapeHtml(lang)}">${escapeHtml(lang)}</button>
    `)
    .join('');
};

/** state 를 보고 Projects 섹션 전체를 다시 그린다 */
const renderProjects = () => {
  const { status, items, error } = state.projects;
  const { projectsGrid: grid, projectsStatus: statusBox } = elements;

  // 상태별로 "무엇을 비우고 무엇을 채울지"가 명확해야 화면이 꼬이지 않는다
  if (status === 'loading') {
    elements.filters.innerHTML = '';
    grid.innerHTML = `<div class="skeleton"></div><div class="skeleton"></div><div class="skeleton"></div>`;
    statusBox.innerHTML = `
      <div class="state">
        <div class="spinner" aria-hidden="true"></div>
        <p class="state__title">프로젝트를 불러오는 중…</p>
      </div>`;
    return;
  }

  if (status === 'error') {
    elements.filters.innerHTML = '';
    grid.innerHTML = '';
    statusBox.innerHTML = `
      <div class="state">
        <p class="state__title">프로젝트를 불러올 수 없습니다</p>
        <p>${escapeHtml(error)}</p>
        <button class="btn btn--primary" type="button" id="retry-btn">다시 시도</button>
      </div>`;
    return;
  }

  if (status === 'success' && items.length === 0) {
    elements.filters.innerHTML = '';
    grid.innerHTML = '';
    statusBox.innerHTML = `
      <div class="state">
        <p class="state__title">표시할 프로젝트가 없습니다</p>
        <p>공개된 저장소가 아직 없어요. 첫 저장소를 만들어 보세요!</p>
      </div>`;
    return;
  }

  if (status === 'success') {
    renderFilters();

    // 필터 상태에 따라 보여줄 목록을 고른다 (원본 배열은 건드리지 않는다)
    const visible = state.activeLanguage === 'All'
      ? items
      : items.filter((repo) => repo.language === state.activeLanguage);

    statusBox.innerHTML = visible.length === 0
      ? `<div class="state"><p class="state__title">${escapeHtml(state.activeLanguage)} 프로젝트가 없습니다</p></div>`
      : '';
    grid.innerHTML = visible.map(createProjectCard).join('');
  }
};

/** 실제 네트워크 요청 */
const fetchProjects = async () => {
  setProjectsState({ status: 'loading', error: '' });

  try {
    const response = await fetch(GITHUB_API_URL);

    // fetch 는 404/403 같은 응답도 "성공"으로 넘긴다. 직접 확인해야 한다.
    if (!response.ok) {
      if (response.status === 403) {
        throw new Error('GitHub API 호출 한도(시간당 60회)를 넘었습니다. 잠시 후 다시 시도해 주세요.');
      }
      if (response.status === 404) {
        throw new Error(`'${PROFILE.githubUsername}' 사용자를 찾을 수 없습니다. config.js 의 아이디를 확인해 주세요.`);
      }
      throw new Error(`요청이 실패했습니다. (HTTP ${response.status})`);
    }

    const repos = await response.json();

    // 포크한 저장소는 빼고, 별 많은 순으로 정렬 ([...] 로 복사본을 만들어 정렬)
    const myRepos = [...repos]
      .filter((repo) => !repo.fork)
      .sort((a, b) => b.stargazers_count - a.stargazers_count);

    state.activeLanguage = 'All';
    setProjectsState({ status: 'success', items: myRepos, error: '' });
  } catch (err) {
    // 네트워크 자체가 끊긴 경우까지 여기서 함께 처리된다
    const message = err instanceof TypeError
      ? '네트워크 연결을 확인해 주세요.'
      : err.message;
    setProjectsState({ status: 'error', items: [], error: message });
  }
};

const initProjects = () => {
  /* 이벤트 위임(delegation)
     '다시 시도' 버튼과 필터 버튼은 JS 가 나중에 만든다.
     아직 없는 요소에는 리스너를 걸 수 없으므로,
     항상 존재하는 부모에 한 번만 걸고 event.target 으로 누가 눌렸는지 판별한다. */
  elements.projectsStatus.addEventListener('click', (event) => {
    if (event.target.id === 'retry-btn') fetchProjects();
  });

  elements.filters.addEventListener('click', (event) => {
    const button = event.target.closest('.filter-btn');
    if (!button) return;
    state.activeLanguage = button.dataset.lang;   // 상태 변경
    renderProjects();                             // 화면 갱신
  });

  fetchProjects();
};

/* ============================================================
   10. Contact 폼 유효성 검사
   흐름: 입력/제출 → 검증 결과(상태) → 에러 메시지 표시/숨김
   ============================================================ */

// 이메일 형식: 공백 없이 "무언가@무언가.무언가"
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** 필드 하나를 검사해 에러 메시지(없으면 빈 문자열)를 돌려준다 */
const validateField = (id, value) => {
  const trimmed = value.trim();

  if (id === 'name') {
    if (!trimmed) return '이름을 입력해 주세요.';
    if (trimmed.length < 2) return '이름은 2글자 이상 입력해 주세요.';
  }
  if (id === 'email') {
    if (!trimmed) return '이메일을 입력해 주세요.';
    if (!EMAIL_PATTERN.test(trimmed)) return '이메일 형식이 올바르지 않습니다. (예: you@example.com)';
  }
  if (id === 'message') {
    if (!trimmed) return '메시지를 입력해 주세요.';
    if (trimmed.length < 10) return `10자 이상 입력해 주세요. (현재 ${trimmed.length}자)`;
  }
  return '';
};

/** 에러 상태를 화면에 반영 */
const renderFieldError = (id) => {
  const input = $(`#${id}`);
  const errorBox = $(`#${id}-error`);
  const message = state.formErrors[id] ?? '';

  errorBox.textContent = message;                                  // 메시지 표시
  input.classList.toggle('form__input--invalid', Boolean(message)); // 테두리 빨갛게
  input.setAttribute('aria-invalid', String(Boolean(message)));     // 보조기기에 알림
};

const initForm = () => {
  const fieldIds = ['name', 'email', 'message'];

  // 입력 중에는 "고쳐지면 바로 에러를 지워주는" 정도로만 개입한다(과한 잔소리 방지)
  fieldIds.forEach((id) => {
    $(`#${id}`).addEventListener('input', (event) => {
      if (!state.formErrors[id]) return;
      state.formErrors[id] = validateField(id, event.target.value);
      renderFieldError(id);
    });
  });

  elements.form.addEventListener('submit', (event) => {
    event.preventDefault();   // 폼의 기본 동작(페이지 새로고침)을 막는다
    elements.formSuccess.textContent = '';

    // 모든 필드를 검사해 상태에 기록
    fieldIds.forEach((id) => {
      state.formErrors[id] = validateField(id, $(`#${id}`).value);
      renderFieldError(id);
    });

    const firstInvalid = fieldIds.find((id) => state.formErrors[id]);
    if (firstInvalid) {
      $(`#${firstInvalid}`).focus();   // 첫 번째 문제 필드로 커서를 옮겨 준다
      return;
    }

    // 통과 — 실제 전송 서버는 없으므로 성공 메시지로 대체한다
    const { name } = Object.fromEntries(new FormData(elements.form));
    elements.formSuccess.textContent = `${name}님, 메시지가 정상적으로 확인되었습니다. 곧 답장할게요!`;
    elements.form.reset();
    state.formErrors = {};
  });
};

/* ============================================================
   11. 자잘한 마무리
   ============================================================ */
const initMisc = () => {
  elements.year.textContent = new Date().getFullYear();          // 저작권 연도 자동 갱신
  elements.footerGithub.href = `https://github.com/${PROFILE.githubUsername}`;
};

/* ============================================================
   12. 시작점
   defer 덕분에 이 파일이 실행될 때 DOM 은 이미 완성되어 있다.
   ============================================================ */
const init = () => {
  document.documentElement.classList.add('js');   // CSS 에게 "JS 가 살아있다"고 알림
  initTheme();
  initNavigation();
  initScrollEffects();
  renderSkills();          // reveal 대상이 생기므로 애니메이션 초기화보다 먼저
  initRevealAnimation();
  initTypingEffect();
  initProjects();
  initForm();
  initMisc();
};

init();
