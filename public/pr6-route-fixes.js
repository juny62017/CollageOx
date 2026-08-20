(() => {
  const baseRefreshCurrent = refreshCurrent;

  async function reopenSharedPost() {
    const sharedPost = new URLSearchParams(location.search).get('post');
    if (!sharedPost || !state.user) return;
    await showPermalink(sharedPost);
  }

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

  const loginForm = document.getElementById('login-form');
  if (loginForm?.onsubmit) {
    const baseLogin = loginForm.onsubmit;
    loginForm.onsubmit = async event => {
      await baseLogin(event);
      await reopenSharedPost();
    };
  }

  const registerForm = document.getElementById('register-form');
  if (registerForm?.onsubmit) {
    const baseRegister = registerForm.onsubmit;
    registerForm.onsubmit = async event => {
      await baseRegister(event);
      await reopenSharedPost();
    };
  }
})();
