(() => {
  const baseRefreshCurrent = refreshCurrent;

  refreshCurrent = async function pr6RefreshCurrent() {
    const sharedPost = new URLSearchParams(location.search).get('post');
    if (sharedPost) {
      const y = scrollY;
      await showPermalink(sharedPost);
      requestAnimationFrame(() => scrollTo({ top: y }));
      return;
    }

    const hash = location.hash.slice(1);
    if (hash === 'notifications' || hash.startsWith('profile/')) {
      const y = scrollY;
      await navigate(hash || 'feed');
      requestAnimationFrame(() => scrollTo({ top: y }));
      return;
    }

    return baseRefreshCurrent();
  };
})();
