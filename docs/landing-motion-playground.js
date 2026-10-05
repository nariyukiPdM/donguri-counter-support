(() => {
  const root = document.documentElement;
  const motionPreference = window.matchMedia('(prefers-reduced-motion: reduce)');
  let reducedMotion = motionPreference.matches;
  const scenes = Array.from(document.querySelectorAll('[data-motion-scene]'));
  const states = new Map();
  const activeScenes = new Set();
  root.classList.add('motion-ready', 'has-scroll-motion');
  root.classList.toggle('motion-reduced', reducedMotion);

  function sequenceState(actor) {
    if (states.has(actor)) return states.get(actor);
    const frames = (actor.dataset.motionFrames || '').split('|').filter(Boolean);
    const intro = (actor.dataset.introFrames || '').split('|').filter(Boolean);
    const state = { frames: [...intro, ...frames], loopStart: intro.length, index: 0, timer: null, delayTimer: null, elapsed: 0, finished: false, started: false };
    states.set(actor, state);
    state.frames.forEach(src => { const image = new Image(); image.src = src; });
    return state;
  }
  function stopSequence(actor) {
    const state = states.get(actor);
    if (!state) return;
    clearInterval(state.timer);
    clearTimeout(state.delayTimer);
    state.timer = state.delayTimer = null;
  }
  function startSequence(actor) {
    const state = sequenceState(actor);
    if (reducedMotion || document.hidden || state.finished || state.timer || state.delayTimer || state.frames.length < 2) return;
    if (actor.dataset.seasonalActor && !actor.classList.contains('is-season-current')) return;
    const interval = Number(actor.dataset.frameInterval) || 300;
    const begin = () => {
      state.delayTimer = null;
      if (document.hidden || !activeScenes.has(actor.closest('[data-motion-scene]'))) return;
      if (!state.started) actor.src = state.frames[0];
      state.started = true;
      state.timer = setInterval(() => {
        state.elapsed += interval;
        let next = state.index + 1;
        const duration = Number(actor.dataset.stopAfter);
        if (duration && state.elapsed >= duration) {
          actor.src = state.frames[state.loopStart];
          state.finished = true;
          stopSequence(actor);
          return;
        }
        if (next >= state.frames.length) {
          if (actor.dataset.loop !== 'true') {
            state.finished = true;
            stopSequence(actor);
            return;
          }
          next = state.loopStart;
        }
        state.index = next;
        actor.src = state.frames[next];
      }, interval);
    };
    const delay = state.started ? 0 : Number(actor.dataset.startDelay) || 0;
    if (delay) state.delayTimer = setTimeout(begin, delay);
    else begin();
  }
  const masterWalkFrames = [
    'landing-assets/motion-test/master/walk/frame-01.png',
    'motion-assets/master-acorn.png',
    'landing-assets/motion-test/master/walk/frame-03.png',
    'motion-assets/master-acorn.png'
  ];
  document.querySelectorAll('[data-master-walk]').forEach(actor => {
    const state = { timer: null, index: 0 };
    states.set(actor, state);
    masterWalkFrames.forEach(src => { const image = new Image(); image.src = src; });
  });
  function startMasterWalk(actor) {
    const state = states.get(actor);
    if (!state || reducedMotion || document.hidden || state.timer || !activeScenes.has(actor.closest('[data-motion-scene]'))) return;
    state.timer = setInterval(() => {
      state.index = (state.index + 1) % masterWalkFrames.length;
      actor.src = masterWalkFrames[state.index];
    }, 170);
  }
  function stopMasterWalk(actor) {
    const state = states.get(actor);
    if (!state) return;
    clearInterval(state.timer);
    state.timer = null;
    state.index = 0;
    actor.src = masterWalkFrames[0];
  }
  function startScene(scene) {
    activeScenes.add(scene);
    scene.classList.add('motion-scene', 'is-active', 'has-played');
    scene.querySelectorAll('[data-motion-frames]').forEach(actor => {
      actor.classList.add('is-playing');
      startSequence(actor);
    });
    scene.querySelectorAll('[data-master-walk]').forEach(startMasterWalk);
  }
  function stopScene(scene) {
    activeScenes.delete(scene);
    scene.classList.remove('is-active');
    scene.querySelectorAll('[data-motion-frames]').forEach(actor => {
      actor.classList.remove('is-playing');
      stopSequence(actor);
    });
    scene.querySelectorAll('[data-master-walk]').forEach(stopMasterWalk);
  }
  function pauseMotion() {
    root.classList.add('motion-page-hidden');
    states.forEach((state, actor) => {
      stopSequence(actor);
      if (actor.matches?.('[data-master-walk]')) stopMasterWalk(actor);
    });
  }
  function resumeMotion() {
    root.classList.toggle('motion-page-hidden', document.hidden);
    if (!document.hidden) activeScenes.forEach(startScene);
  }
  document.addEventListener('visibilitychange', () => document.hidden ? pauseMotion() : resumeMotion());
  window.addEventListener('pagehide', pauseMotion);
  window.addEventListener('pageshow', resumeMotion);
  motionPreference.addEventListener('change', event => {
    reducedMotion = event.matches;
    root.classList.toggle('motion-reduced', reducedMotion);
    pauseMotion();
    resumeMotion();
  });

  const seasonCopy = {
    spring: '春の仲間：チョウが、羽ばたきながら空をゆっくり漂います。',
    summer: '夏の仲間：トンボが飛び、カエルが葉陰でひと休み。',
    autumn: '秋の仲間：小鳥が、フクロウの飛ぶ空を横切ります。'
  };
  const seasonButtons = Array.from(document.querySelectorAll('[data-season-choice]'));
  const seasonalGuests = Array.from(document.querySelectorAll('[data-seasonal-actor]'));
  seasonButtons.forEach(button => button.addEventListener('click', () => {
    const season = button.dataset.seasonChoice;
    seasonButtons.forEach(choice => choice.setAttribute('aria-pressed', String(choice === button)));
    seasonalGuests.forEach(actor => {
      const selected = actor.dataset.seasonalActor === season;
      actor.classList.toggle('is-season-current', selected);
      stopSequence(actor);
      const state = sequenceState(actor);
      Object.assign(state, { index: 0, elapsed: 0, started: false, finished: false });
      if (selected && activeScenes.has(actor.closest('[data-motion-scene]'))) startSequence(actor);
    });
    document.querySelector('.glide-scene').dataset.season = season;
    document.getElementById('season-note').textContent = seasonCopy[season];
  }));

  document.querySelectorAll('[data-replay]').forEach(button => button.addEventListener('click', () => {
    const scene = document.getElementById(button.dataset.replay);
    scene.querySelectorAll('[data-motion-frames]').forEach(actor => {
      stopSequence(actor);
      const state = sequenceState(actor);
      Object.assign(state, { index: 0, elapsed: 0, started: false, finished: false });
      actor.src = state.frames[0];
    });
    scene.querySelectorAll('[data-master-walk]').forEach(stopMasterWalk);
    scene.classList.remove('has-played');
    // Commit the reset before restarting both the CSS entrance and frame sequence.
    void scene.offsetWidth;
    scene.scrollIntoView({ behavior: reducedMotion ? 'auto' : 'smooth', block: 'center' });
    requestAnimationFrame(() => { if (activeScenes.has(scene)) startScene(scene); });
  }));

  const reveals = Array.from(document.querySelectorAll('[data-reveal]'));
  reveals.forEach(item => { item.style.transitionDelay = `${Number(item.dataset.revealDelay) || 0}ms`; });
  if (!('IntersectionObserver' in window)) {
    reveals.forEach(item => item.classList.add('is-visible'));
    scenes.forEach(startScene);
    return;
  }
  const revealObserver = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (!entry.isIntersecting) return;
      entry.target.classList.add('is-visible');
      revealObserver.unobserve(entry.target);
    });
  }, { threshold: 0.14 });
  reveals.forEach(item => revealObserver.observe(item));
  // Wait until the scene itself is visible. Starting below the fold consumed one-shot endings too early.
  const sceneObserver = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (entry.isIntersecting && entry.intersectionRatio >= (Number(entry.target.dataset.motionThreshold) || .55)) startScene(entry.target);
      else stopScene(entry.target);
    });
  }, { threshold: [0, .1, .55], rootMargin: '0px' });
  scenes.forEach(scene => sceneObserver.observe(scene));
})();
