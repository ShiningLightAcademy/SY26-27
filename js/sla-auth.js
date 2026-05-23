/* ============================================================
   SHINING LIGHT ACADEMY — Auth Gate
   
   What this does:
   1. On every protected page, verify the user is signed in.
   2. Verify the user's email ends in @slasm.net.
   3. If either check fails, redirect to login.html.
   4. If both pass, reveal the page and add a Sign Out button to the nav.
   
   This file expects:
   - The Supabase JS CDN script loaded BEFORE this script.
   - sla-config.js loaded BEFORE this script (provides URL + key).
   ============================================================ */

(function () {
  'use strict';

  // ---- guard: config must be loaded first ----
  if (typeof SLA_SUPABASE_URL === 'undefined' || typeof SLA_SUPABASE_KEY === 'undefined') {
    console.error('[SLA Auth] Missing sla-config.js — page is not protected.');
    return;
  }
  if (SLA_SUPABASE_URL.includes('YOUR-PROJECT-REF')) {
    console.error('[SLA Auth] Config still has placeholder values. Edit sla-config.js.');
    return;
  }

  // ---- guard: Supabase client must be loaded ----
  if (typeof window.supabase === 'undefined' || !window.supabase.createClient) {
    console.error('[SLA Auth] Supabase JS library not loaded. Include the CDN script first.');
    return;
  }

  // ---- create a single client instance shared with other scripts ----
  window.slaClient = window.supabase.createClient(SLA_SUPABASE_URL, SLA_SUPABASE_KEY);

  // ---- inject a loading veil so unauthorized content doesn't flash ----
  const veil = document.createElement('div');
  veil.id = 'sla-auth-veil';
  veil.style.cssText = `
    position: fixed; inset: 0; z-index: 99999;
    background: #F8F5EC; display: grid; place-items: center;
    font-family: Georgia, serif; color: #142B6F;
    font-style: italic; font-size: 1.25rem; letter-spacing: -0.01em;
  `;
  veil.textContent = 'Verifying access…';
  // Insert as the first child of <body> as soon as body exists.
  function injectVeil() {
    if (document.body && !document.getElementById('sla-auth-veil')) {
      document.body.insertBefore(veil, document.body.firstChild);
    }
  }
  if (document.body) {
    injectVeil();
  } else {
    document.addEventListener('DOMContentLoaded', injectVeil);
  }

  function removeVeil() {
    const v = document.getElementById('sla-auth-veil');
    if (v) v.remove();
  }

  function goToLogin(reason) {
    if (reason) {
      try { sessionStorage.setItem('sla-auth-reason', reason); } catch (e) {}
    }
    window.location.replace('login.html');
  }

  // ---- main auth check ----
  async function verifyAccess() {
    try {
      const { data: { session }, error } = await window.slaClient.auth.getSession();
      if (error || !session) {
        goToLogin('not-signed-in');
        return;
      }
      const email = (session.user && session.user.email) || '';
      if (!email.toLowerCase().endsWith(SLA_ALLOWED_DOMAIN.toLowerCase())) {
        // Wrong domain — sign them out and bounce.
        await window.slaClient.auth.signOut();
        goToLogin('wrong-domain');
        return;
      }
      // All checks passed. Reveal page and decorate nav.
      onAuthReady(session.user);
    } catch (err) {
      console.error('[SLA Auth] Unexpected error:', err);
      goToLogin('error');
    }
  }

  function onAuthReady(user) {
    removeVeil();
    injectSignOutControl(user);
  }

  function injectSignOutControl(user) {
    const navLinks = document.querySelector('.nav-links');
    if (!navLinks) return;

    // Don't double-inject if user navigates and script re-runs.
    if (document.getElementById('sla-signout-li')) return;

    const firstName = (user.user_metadata && (user.user_metadata.given_name || user.user_metadata.name)) || user.email;
    const shortName = String(firstName).split(' ')[0];
    const email = (user.email || '').toLowerCase();
    const ownerEmail = (typeof SLA_OWNER_EMAIL !== 'undefined' ? SLA_OWNER_EMAIL : '').toLowerCase();
    const isOwner = ownerEmail && email === ownerEmail;
    const isOnAdminPage = window.location.pathname.endsWith('admin.html');

    // If owner, add an "Admin" link first (unless already on admin page)
    if (isOwner && !isOnAdminPage) {
      const adminLi = document.createElement('li');
      adminLi.id = 'sla-admin-li';
      adminLi.style.cssText = 'margin-left: auto;';
      adminLi.innerHTML = `
        <a href="admin.html" style="
          background: var(--gold, #C9A050);
          color: var(--cream, #F8F5EC);
          font-size: 0.85rem;
          font-weight: 500;
        ">Admin</a>
      `;
      navLinks.appendChild(adminLi);
    }

    const li = document.createElement('li');
    li.id = 'sla-signout-li';
    li.style.cssText = isOwner && !isOnAdminPage ? '' : 'margin-left: auto;';
    li.innerHTML = `
      <a href="#" id="sla-signout-link" style="
        background: rgba(20, 43, 111, 0.08);
        color: var(--ink, #142B6F);
        font-size: 0.85rem;
      ">
        <span style="opacity: 0.7;">Hi, ${escapeHtml(shortName)} ·</span>
        <span style="font-weight: 500;">Sign out</span>
      </a>
    `;
    navLinks.appendChild(li);

    document.getElementById('sla-signout-link').addEventListener('click', async (e) => {
      e.preventDefault();
      await window.slaClient.auth.signOut();
      window.location.replace('login.html');
    });
  }

  function escapeHtml(s) {
    return String(s).replace(/[&<>"']/g, c => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
    }[c]));
  }

  // ---- listen for auth changes (e.g. token expires) ----
  window.slaClient.auth.onAuthStateChange((event) => {
    if (event === 'SIGNED_OUT') {
      goToLogin('signed-out');
    }
  });

  // ---- run as soon as we can ----
  verifyAccess();
})();
