(() => {
  const reveals = document.querySelectorAll('[data-reveal]');
  const peeks = document.querySelectorAll('[data-peek]');
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (reduceMotion || !('IntersectionObserver' in window)) {
    reveals.forEach((item) => item.classList.add('is-visible'));
    peeks.forEach((item) => item.classList.add('is-peeking'));
    return;
  }
  document.documentElement.classList.add('has-scroll-motion');
  const observer = new IntersectionObserver((entries, activeObserver) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) return;
      entry.target.classList.add('is-visible');
      activeObserver.unobserve(entry.target);
    });
  }, { threshold: 0.14, rootMargin: '0px 0px -4% 0px' });
  reveals.forEach((item, index) => {
    const authoredDelay = Number(item.dataset.revealDelay);
    item.style.transitionDelay = Number.isFinite(authoredDelay)
      ? `${authoredDelay}ms`
      : `${Math.min(index % 3, 2) * 90}ms`;
    observer.observe(item);
  });

  const peekObserver = new IntersectionObserver((entries, activeObserver) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) return;
      entry.target.classList.add('is-peeking');
      activeObserver.unobserve(entry.target);
    });
  }, { threshold: 0.12, rootMargin: '0px 0px -14% 0px' });
  peeks.forEach((item) => {
    const delay = Number(item.dataset.peekDelay);
    if (Number.isFinite(delay)) item.style.transitionDelay = `${delay}ms`;
    if (!item.closest('.friends-stage')) peekObserver.observe(item);
  });

  const friendOrder = ['bird', 'bear', 'squirrel', 'hedgehog', 'tanuki'];
  const actorName = (actor) => Array.from(actor.classList)
    .find((className) => className.startsWith('friend-actor--'))
    ?.slice('friend-actor--'.length) ?? '';
  const stageObserver = new IntersectionObserver((entries, activeObserver) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) return;
      const actors = Array.from(entry.target.querySelectorAll('.friend-actor'));
      actors.sort((a, b) => friendOrder.indexOf(actorName(a)) - friendOrder.indexOf(actorName(b)));
      actors.forEach((actor, index) => {
        window.setTimeout(() => actor.classList.add('is-peeking'), index * 240);
      });
      activeObserver.unobserve(entry.target);
    });
  }, { threshold: 0.18, rootMargin: '0px 0px -12% 0px' });
  document.querySelectorAll('.friends-stage').forEach((stage) => stageObserver.observe(stage));
})();
