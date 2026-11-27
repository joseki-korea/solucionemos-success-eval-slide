/* 프레임워크 없는 정적 교안 런타임. 외부 전송·추적·AI 호출 없음. */
(function () {
  'use strict';
  const root = document.documentElement;
  const stage = document.getElementById('stage');
  const slides = Array.from(stage.querySelectorAll('.ag-slide'));
  if (!slides.length) return;
  const $ = (s, scope = document) => scope.querySelector(s);
  const $$ = (s, scope = document) => Array.from(scope.querySelectorAll(s));
  const narrow = matchMedia('(max-width: 839px)');
  const prefersReduced = matchMedia('(prefers-reduced-motion: reduce)');
  let current = 0;
  let manualReading = false;
  let motionOff = prefersReduced.matches;
  let returnFocus = null;
  let focusOnClose = null;
  let scrollFrame = 0;
  const counter = $('#page-counter');
  const progress = $('#progress');
  const announcement = $('#announcement');
  const modal = $('#tool-dialog');
  const title = $('#dialog-title');
  const content = $('#dialog-content');
  const modeButton = $('#mode-button');
  const motionButton = $('#motion-button');
  const previous = $('#previous');
  const next = $('#next');
  const indices = new Map(slides.map((slide, i) => [slide.id, i]));
  const pageLabels = slides.map(slide => slide.id.slice('slide-'.length));
  const pageNumbers = slides.map((_, i) => `${i + 1} / ${slides.length}`);

  // 저장 불가·file:// 환경도 동작하도록 실패를 허용한다.
  try { motionOff = prefersReduced.matches || localStorage.getItem('sol-motion-off') === 'true'; } catch (_) {}

  function announce(message) { announcement.textContent = message; }
  function isReading() { return root.classList.contains('reading'); }
  function pageTitle(i) { return slides[i].dataset.title || $('h1,h2', slides[i])?.textContent || `슬라이드 ${i + 1}`; }
  function applyVisibility() {
    slides.forEach((slide, i) => {
      slide.classList.toggle('is-active', i === current);
      const unavailable = !isReading() && i !== current;
      slide.inert = unavailable;
      if (unavailable) slide.setAttribute('aria-hidden', 'true');
      else slide.removeAttribute('aria-hidden');
    });
  }
  function resize() {
    const rect = stage.getBoundingClientRect();
    const scale = Math.max(.05, Math.min((rect.width - 24) / 1920, (rect.height - 16) / 1080));
    root.style.setProperty('--deck-scale', String(scale));
  }
  function go(index, options = {}) {
    current = Math.max(0, Math.min(slides.length - 1, Number(index) || 0));
    applyVisibility();
    counter.textContent = pageNumbers[current];
    progress.max = slides.length;
    progress.value = current + 1;
    progress.setAttribute('aria-label', `전체 ${slides.length}장 중 ${current + 1}장`);
    previous.disabled = current === 0;
    next.disabled = current === slides.length - 1;
    if (!options.fromHash) {
      try { history.replaceState(null, '', '#' + slides[current].id); } catch (_) {}
    }
    if (isReading() && options.scroll !== false) slides[current].scrollIntoView({block: 'start', behavior: 'instant'});
    if (options.focus) $('h1,h2', slides[current])?.focus({preventScroll: true});
    if (!options.silent) announce(`${pageLabels[current]}장. ${pageTitle(current)}`);
  }
  function setMode() {
    root.classList.toggle('reading', manualReading || narrow.matches);
    modeButton.setAttribute('aria-pressed', String(isReading()));
    modeButton.textContent = isReading() ? '발표 보기' : '읽기 보기';
    modeButton.disabled = narrow.matches;
    modeButton.title = narrow.matches ? '작은 화면에서는 읽기 보기를 사용합니다.' : '읽기 보기 전환 (R)';
    applyVisibility();
    resize();
  }
  function setMotion() {
    root.classList.toggle('motion-off', motionOff || prefersReduced.matches);
    motionButton.setAttribute('aria-pressed', String(motionOff || prefersReduced.matches));
    motionButton.textContent = (motionOff || prefersReduced.matches) ? '모션 꺼짐' : '모션 켜짐';
    motionButton.disabled = prefersReduced.matches;
    motionButton.title = prefersReduced.matches ? '운영체제의 동작 줄이기 설정을 따릅니다.' : '슬라이드 진입 효과 전환';
  }
  function closeDialog() {
    if (modal.open) modal.close();
  }
  function openDialog(label, build) {
    returnFocus = document.activeElement;
    title.textContent = label;
    content.replaceChildren();
    build(content);
    if (typeof modal.showModal === 'function') modal.showModal();
    else { announce('이 브라우저는 대화상자를 지원하지 않습니다. 최신 브라우저에서 열어 주세요.'); return; }
    (content.querySelector('input,button') || $('#dialog-close')).focus();
  }
  function makeSlideList(container, query = '') {
    const list = document.createElement('ol');
    list.className = 'toc-list';
    const needle = query.trim().toLocaleLowerCase();
    let count = 0;
    slides.forEach((slide, i) => {
      // 발표자 메모는 검색에서 제외한다.
      const clone = slide.cloneNode(true);
      $$('.notes', clone).forEach(node => node.remove());
      if (needle && !clone.textContent.toLocaleLowerCase().includes(needle)) return;
      count += 1;
      const item = document.createElement('li');
      const button = document.createElement('button');
      button.type = 'button';
      button.textContent = `${pageLabels[i]}  ${pageTitle(i)}`;
      if (i === current) button.setAttribute('aria-current', 'true');
      button.addEventListener('click', () => { go(i); focusOnClose = i; closeDialog(); });
      item.append(button); list.append(item);
    });
    container.replaceChildren(list);
    if (!count) { const p = document.createElement('p'); p.textContent = '일치하는 슬라이드가 없습니다.'; container.append(p); }
  }
  function toc() { openDialog('슬라이드 목차', node => makeSlideList(node)); }
  function search() {
    openDialog('교안 검색', node => {
      const label = document.createElement('label');
      label.className = 'search-label'; label.htmlFor = 'search-input'; label.textContent = '제목 또는 본문 단어';
      const input = document.createElement('input');
      input.id = 'search-input'; input.type = 'search'; input.className = 'search-input'; input.placeholder = '예: 실습, 차트, 폴더';
      const results = document.createElement('div');
      node.append(label, input, results);
      input.addEventListener('input', () => makeSlideList(results, input.value));
      makeSlideList(results);
    });
  }
  function notes() {
    openDialog(`${pageLabels[current]}장 발표자 메모`, node => {
      const p = document.createElement('p'); p.className = 'speaker-content';
      p.textContent = $('.notes', slides[current])?.textContent.trim() || '이 장에는 발표자 메모가 없습니다.';
      node.append(p);
    });
  }
  async function fullScreen() {
    try {
      if (document.fullscreenElement) await document.exitFullscreen();
      else if (root.requestFullscreen) await root.requestFullscreen();
      else announce('전체 화면 기능을 지원하지 않는 브라우저입니다.');
    } catch (_) { announce('전체 화면을 열지 못했습니다. 브라우저 메뉴의 전체 화면을 사용해 주세요.'); }
  }
  function initTabs() {
    $$('[data-tabs]').forEach(group => {
      const tabs = $$('[role="tab"]', group);
      const activate = tab => {
        tabs.forEach(item => {
          const selected = item === tab;
          item.setAttribute('aria-selected', String(selected));
          item.tabIndex = selected ? 0 : -1;
          document.getElementById(item.getAttribute('aria-controls')).hidden = !selected;
        });
      };
      tabs.forEach((tab, index) => {
        tab.addEventListener('click', () => activate(tab));
        tab.addEventListener('keydown', event => {
          let target;
          if (event.key === 'ArrowRight') target = (index + 1) % tabs.length;
          if (event.key === 'ArrowLeft') target = (index - 1 + tabs.length) % tabs.length;
          if (event.key === 'Home') target = 0;
          if (event.key === 'End') target = tabs.length - 1;
          if (target !== undefined) { event.preventDefault(); event.stopPropagation(); activate(tabs[target]); tabs[target].focus(); }
        });
      });
      activate(tabs.find(tab => tab.getAttribute('aria-selected') === 'true') || tabs[0]);
    });
  }
  function initCopy() {
    $$('[data-copy]').forEach(button => {
      button.addEventListener('click', async () => {
        const code = document.getElementById(button.dataset.copy);
        if (!code) return;
        try {
          if (!navigator.clipboard?.writeText) throw new Error('clipboard unavailable');
          await navigator.clipboard.writeText(code.textContent);
          button.textContent = '복사됨'; announce('코드를 복사했습니다.');
          setTimeout(() => { button.textContent = '복사'; }, 1600);
        } catch (_) {
          const range = document.createRange(); range.selectNodeContents(code);
          const selection = window.getSelection(); selection.removeAllRanges(); selection.addRange(range);
          button.textContent = '선택됨'; announce('자동 복사를 사용할 수 없어 코드를 선택했습니다. Ctrl+C 또는 ⌘C로 복사해 주세요.');
          setTimeout(() => { button.textContent = '복사'; }, 3000);
        }
      });
    });
  }
  function initQuiz() {
    $$('[data-quiz]').forEach(quiz => {
      $$('[data-answer]', quiz).forEach(button => {
        button.addEventListener('click', () => {
          $$('[data-answer]', quiz).forEach(item => item.setAttribute('aria-pressed', String(item === button)));
          const correct = button.dataset.answer === quiz.dataset.correct;
          $('[data-feedback]', quiz).textContent = correct ? (quiz.dataset.feedbackCorrect || '정답입니다. 아래 해설을 확인하세요.') : (quiz.dataset.feedbackIncorrect || '다시 살펴보세요. 아래 해설을 확인하세요.');
        });
      });
    });
  }
  slides.forEach((slide, i) => {
    slide.setAttribute('role', 'region');
    const heading = $('h1,h2', slide);
    if (heading) { heading.tabIndex = -1; if (!heading.id) heading.id = slide.id + '-title'; slide.setAttribute('aria-labelledby', heading.id); }
    $$('.ag-page', slide).forEach(page => { page.textContent = pageNumbers[i]; });
  });
  previous.addEventListener('click', () => go(current - 1));
  next.addEventListener('click', () => go(current + 1));
  $('#toc-button').addEventListener('click', toc);
  $('#search-button').addEventListener('click', search);
  $('#notes-button').addEventListener('click', notes);
  $('#print-button').addEventListener('click', () => window.print());
  $('#fullscreen-button').addEventListener('click', fullScreen);
  $('#dialog-close').addEventListener('click', closeDialog);
  modal.addEventListener('close', () => {
    if (focusOnClose !== null) { $('h1,h2', slides[focusOnClose])?.focus({preventScroll:true}); focusOnClose = null; }
    else returnFocus?.focus({preventScroll: true});
  });
  modeButton.addEventListener('click', () => { manualReading = !manualReading; setMode(); go(current); });
  motionButton.addEventListener('click', () => { motionOff = !motionOff; setMotion(); try { localStorage.setItem('sol-motion-off', String(motionOff)); } catch (_) {} });
  narrow.addEventListener('change', setMode);
  prefersReduced.addEventListener('change', setMotion);
  window.addEventListener('resize', resize);
  window.addEventListener('scroll', () => {
    if (!isReading() || scrollFrame || modal.open) return;
    scrollFrame = requestAnimationFrame(() => {
      scrollFrame = 0;
      const anchor = innerHeight * .35;
      let best = 0;
      let distance = Infinity;
      slides.forEach((slide, i) => {
        const rect = slide.getBoundingClientRect();
        const d = rect.top <= anchor && rect.bottom >= anchor ? 0 : Math.min(Math.abs(rect.top-anchor), Math.abs(rect.bottom-anchor));
        if (d < distance) { distance = d; best = i; }
      });
      if (best !== current) go(best, {scroll:false, silent:true});
    });
  }, {passive:true});
  window.addEventListener('hashchange', () => { const i = indices.get(location.hash.slice(1)); if (i !== undefined) go(i, {fromHash: true}); });
  document.addEventListener('keydown', event => {
    if (modal.open || event.defaultPrevented || event.altKey) return;
    const element = event.target;
    const editable = element.closest('input,textarea,select,[contenteditable="true"]');
    if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k' && !editable) { event.preventDefault(); search(); return; }
    if (editable || event.ctrlKey || event.metaKey) return;
    // 버튼·탭·링크의 기본 키 동작을 방해하지 않는다.
    if (element.closest('button,a,summary,[role="tab"]')) return;
    const key = event.key.toLowerCase();
    if (['arrowright','pagedown'].includes(key) || key === ' ') { if (!isReading()) { event.preventDefault(); go(current + 1, {focus:true}); } }
    else if (['arrowleft','pageup'].includes(key)) { if (!isReading()) { event.preventDefault(); go(current - 1, {focus:true}); } }
    else if (key === 'home' && !isReading()) { event.preventDefault(); go(0, {focus:true}); }
    else if (key === 'end' && !isReading()) { event.preventDefault(); go(slides.length - 1, {focus:true}); }
    else if (key === 't') toc();
    else if (key === 's') notes();
    else if (key === 'f') fullScreen();
    else if (key === 'r' && !narrow.matches) { manualReading = !manualReading; setMode(); go(current); }
  });
  // 인쇄에서 비활성 장의 inert/aria-hidden 상태를 잠시 해제한다.
  window.addEventListener('beforeprint', () => { root.classList.remove('reading'); slides.forEach(slide => { slide.inert = false; slide.removeAttribute('aria-hidden'); }); });
  window.addEventListener('afterprint', setMode);
  initTabs(); initCopy(); initQuiz();
  root.classList.add('js-ready'); setMode(); setMotion();
  go(indices.get(location.hash.slice(1)) ?? 0, {silent:true, scroll:false});
  if (document.fonts?.ready) document.fonts.ready.then(resize);
  // 브라우저 콘솔에서 호출하는 수동 검수 보조. 시각 검수를 대체하지 않는다.
  window.SlideDeck = Object.freeze({
    go, count: slides.length,
    pageLabel: index => pageLabels[index],
    current: () => current + 1,
    checkOverflow: () => slides.filter(slide => slide.offsetParent !== null && (slide.scrollHeight > slide.clientHeight + 2 || slide.scrollWidth > slide.clientWidth + 2)).map(slide => slide.id)
  });
})();
