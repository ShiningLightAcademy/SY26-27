/* ============================================================
   SHINING LIGHT ACADEMY — Auth Guard
   ============================================================
   Include on every page EXCEPT login.html.
   Load order in <head>:
     1. @supabase/supabase-js (CDN)
     2. js/supabase-client.js
     3. js/auth-guard.js   <-- this file
   ============================================================ */

(async () => {
  if (!window.sla) {
    console.error('[SLA auth-guard] supabase-client.js must load first');
    return;
  }

  // Helper to build absolute URL to a file in the current folder
  function relUrl(filename) {
    const base = window.location.pathname.replace(/[^/]*$/, '');
    return window.location.origin + base + filename;
  }

  let session;
  try {
    session = await window.sla.getSession();
  } catch (e) {
    console.error('[SLA auth-guard] getSession failed:', e);
  }

  if (!session) {
    // Not signed in — bounce to login. Replace (no history entry).
    window.location.replace(relUrl('login.html'));
    return;
  }

  // Signed in. Touch presence asynchronously — don't block rendering.
  window.sla.touchPresence().catch(err => console.warn('[SLA] touchPresence:', err));

  // Inject the sign-out link + maybe an admin link into the nav.
  function injectNavExtras() {
    const navLinks = document.querySelector('.nav-links');
    if (!navLinks) return;
    if (navLinks.querySelector('.sla-signout-link')) return; // already injected

    // Admin link (only visible to admins) — added before sign-out
    window.sla.isAdmin().then(admin => {
      if (admin && !navLinks.querySelector('.sla-admin-link')) {
        const liAdmin = document.createElement('li');
        const aAdmin = document.createElement('a');
        aAdmin.href = relUrl('admin.html');
        aAdmin.textContent = 'Admin';
        aAdmin.className = 'sla-admin-link';
        liAdmin.appendChild(aAdmin);
        navLinks.insertBefore(liAdmin, navLinks.lastElementChild);
      }
    }).catch(() => {});

    // Sign out
    const li = document.createElement('li');
    const a = document.createElement('a');
    a.href = '#';
    a.textContent = 'Sign out';
    a.className = 'sla-signout-link';
    a.addEventListener('click', async (e) => {
      e.preventDefault();
      try {
        await window.sla.signOut();
      } catch (err) {
        console.error('[SLA] sign out failed:', err);
        // Fallback: force redirect even if signOut errored
        window.location.href = relUrl('login.html');
      }
    });
    li.appendChild(a);
    navLinks.appendChild(li);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', injectNavExtras);
  } else {
    injectNavExtras();
  }
})();
