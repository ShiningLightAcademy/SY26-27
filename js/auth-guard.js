/* ============================================================
   SHINING LIGHT ACADEMY — Auth Guard
   ============================================================
   Checks auth on every protected page.
   Injects a compact user-menu pill into #nav-user-menu,
   keeping it separate from the main nav links so mobile
   hamburger menu stays clean.
   ============================================================ */

(async () => {
  if (!window.sla) {
    console.error('[SLA auth-guard] supabase-client.js must load first');
    return;
  }

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
    window.location.replace(relUrl('login.html'));
    return;
  }

  // Touch presence async — don't block rendering
  window.sla.touchPresence().catch(() => {});

  // ----------------------------------------------------------------
  // Build the user-menu pill and inject it into #nav-user-menu
  // ----------------------------------------------------------------
  async function injectUserMenu() {
    const slot = document.getElementById('nav-user-menu');
    if (!slot) return;

    // Get profile for display name + admin check
    const [profile, isAdmin] = await Promise.all([
      window.sla.getProfile().catch(() => null),
      window.sla.isAdmin().catch(() => false),
    ]);

    const displayName = profile
      ? (profile.full_name ? profile.full_name.split(' ')[0] : profile.email.split('@')[0])
      : '…';
    const initial = displayName.charAt(0).toUpperCase();

    // Build the menu
    slot.innerHTML = `
      <div class="nav-user-pill" id="nav-user-pill">
        <span class="nav-user-avatar">${initial}</span>
        <span class="nav-user-name">${escHtml(displayName)}</span>
        <span class="nav-user-chevron">▾</span>
      </div>
      <div class="nav-user-dropdown" id="nav-user-dropdown" hidden>
        ${isAdmin ? `<a href="${relUrl('admin.html')}" class="nav-user-item">⚙️ Admin panel</a>` : ''}
        <button class="nav-user-item nav-user-signout" id="nav-signout-btn">Sign out</button>
      </div>
    `;
    slot.hidden = false;

    // Toggle dropdown
    const pill = document.getElementById('nav-user-pill');
    const dropdown = document.getElementById('nav-user-dropdown');
    pill.addEventListener('click', (e) => {
      e.stopPropagation();
      dropdown.hidden = !dropdown.hidden;
    });
    // Close on outside click
    document.addEventListener('click', () => { if (dropdown) dropdown.hidden = true; });
    // Close on Escape
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && dropdown) dropdown.hidden = true;
    });

    // Sign out
    document.getElementById('nav-signout-btn').addEventListener('click', async (e) => {
      e.preventDefault();
      try { await window.sla.signOut(); }
      catch (err) { window.location.href = relUrl('login.html'); }
    });
  }

  function escHtml(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, c => ({
      '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'
    })[c]);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', injectUserMenu, { once: true });
  } else {
    injectUserMenu();
  }
})();
