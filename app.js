/*  ── Book configuration ─────────────────────────────── */
const BOOK = {
  title: 'The Private Keys',
  chaptersPath: 'chapters',
  rtlLangs: ['ar'],
  chapters: [
    { number: 1, id: '01', title: { en: 'The Notary', fr: 'Le Notaire', ar: 'الموثّق' } },
    // Add new chapters here as they are written:
    // { number: 2, id: '02', title: { en: 'Title', fr: 'Titre', ar: 'العنوان' } },
  ],
};

/*  ── Language ───────────────────────────────────────── */
function getLang() {
  return localStorage.getItem('pk-lang') || 'en';
}

function setLang(lang) {
  localStorage.setItem('pk-lang', lang);
}

function chapterFile(id, lang) {
  const prefix = lang === 'en' ? '' : `${lang}-`;
  return `${BOOK.chaptersPath}/${prefix}chapter-${id}.md`;
}

function isRTL(lang) {
  return BOOK.rtlLangs.includes(lang);
}

function applyDirection(lang) {
  const dir = isRTL(lang) ? 'rtl' : 'ltr';
  const htmlLang = lang === 'ar' ? 'ar' : lang === 'fr' ? 'fr' : 'en';
  document.documentElement.setAttribute('dir', dir);
  document.documentElement.setAttribute('lang', htmlLang);
}

/*  ── Language toggle (shared by both pages) ─────────── */
function initLangToggle() {
  document.querySelectorAll('.lang-toggle').forEach(toggle => {
    const buttons = toggle.querySelectorAll('button');
    const current = getLang();

    buttons.forEach(btn => {
      if (btn.dataset.lang === current) btn.classList.add('active');
      else btn.classList.remove('active');

      btn.addEventListener('click', () => {
        setLang(btn.dataset.lang);
        buttons.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        applyDirection(btn.dataset.lang);
        buildTOC();
        loadChapter();
      });
    });
  });
}

/*  ── Table of contents (index page) ─────────────────── */
function buildTOC() {
  const list = document.getElementById('toc-list');
  if (!list) return;

  const lang = getLang();
  list.innerHTML = '';

  BOOK.chapters.forEach(ch => {
    const li = document.createElement('li');
    const a = document.createElement('a');
    a.href = `chapter.html?ch=${ch.id}`;
    a.innerHTML =
      `<span class="ch-number">Chapter ${ch.number}</span>` +
      `<span class="ch-title">${ch.title[lang] || ch.title.en}</span>`;
    li.appendChild(a);
    list.appendChild(li);
  });
}

/*  ── Chapter reader (chapter page) ──────────────────── */
async function loadChapter() {
  const container = document.getElementById('chapter-content');
  if (!container) return;

  const params = new URLSearchParams(window.location.search);
  const chId = params.get('ch');
  const lang = getLang();

  if (!chId) {
    container.innerHTML = '<p class="error-message">No chapter specified.</p>';
    return;
  }

  const chapter = BOOK.chapters.find(c => c.id === chId);
  if (!chapter) {
    container.innerHTML = '<p class="error-message">Chapter not found.</p>';
    return;
  }

  const title = chapter.title[lang] || chapter.title.en;
  document.title = `Chapter ${chapter.number}: ${title} — ${BOOK.title}`;

  container.innerHTML = '<p class="loading">Loading\u2026</p>';

  try {
    const resp = await fetch(chapterFile(chId, lang));
    if (!resp.ok) throw new Error(resp.status);
    const md = await resp.text();

    if (typeof marked === 'undefined') {
      container.innerHTML =
        '<p class="error-message">Markdown library not loaded.</p>';
      return;
    }

    marked.use({
      renderer: {
        code({ text }) {
          const escaped = text
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;');
          return `<blockquote class="ai-dialogue">${escaped.replace(/\n/g, '<br>')}</blockquote>`;
        },
        hr() {
          return '<div class="scene-break" aria-hidden="true">\u00B7 \u00B7 \u00B7</div>';
        },
      },
    });

    container.innerHTML = marked.parse(md);
  } catch (err) {
    container.innerHTML =
      '<p class="error-message">' +
      'Could not load chapter.<br>' +
      '<small>Serve from the project root: ' +
      '<code>python3 -m http.server 8000</code></small>' +
      '</p>';
  }

  setupNav(chId);
}

/*  ── Chapter navigation ─────────────────────────────── */
function setupNav(currentId) {
  const idx = BOOK.chapters.findIndex(c => c.id === currentId);
  const prev = document.getElementById('prev-chapter');
  const next = document.getElementById('next-chapter');

  if (prev) {
    if (idx > 0) {
      prev.href = `chapter.html?ch=${BOOK.chapters[idx - 1].id}`;
      prev.style.visibility = 'visible';
    } else {
      prev.style.visibility = 'hidden';
    }
  }
  if (next) {
    if (idx >= 0 && idx < BOOK.chapters.length - 1) {
      next.href = `chapter.html?ch=${BOOK.chapters[idx + 1].id}`;
      next.style.visibility = 'visible';
    } else {
      next.style.visibility = 'hidden';
    }
  }
}

/*  ── Reading progress bar ───────────────────────────── */
function initProgress() {
  const bar = document.getElementById('progress-bar');
  if (!bar) return;

  window.addEventListener('scroll', () => {
    const scrolled = window.scrollY;
    const total = document.documentElement.scrollHeight - window.innerHeight;
    bar.style.width = total > 0 ? `${(scrolled / total) * 100}%` : '0';
  }, { passive: true });
}

/*  ── Init ───────────────────────────────────────────── */
document.addEventListener('DOMContentLoaded', () => {
  applyDirection(getLang());
  initLangToggle();
  buildTOC();
  loadChapter();
  initProgress();
});
