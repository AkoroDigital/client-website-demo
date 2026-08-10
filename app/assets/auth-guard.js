// Include this on every page that should require a team login.
// It checks for a valid session and bounces to the login page if
// there isn't one — before anything on the page is shown.

(async () => {
  const { data: { session } } = await supabaseClient.auth.getSession();
  if (!session) {
    window.location.href = 'login.html';
    return;
  }
  document.documentElement.classList.add('authed');

  supabaseClient.auth.onAuthStateChange((_event, newSession) => {
    if (!newSession) window.location.href = 'login.html';
  });
})();
