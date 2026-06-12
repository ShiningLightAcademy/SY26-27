/* ============================================================
   SHINING LIGHT ACADEMY — Admin Dashboard Logic
   ============================================================ */

(async () => {
  // ----- AUTH CHECK -----
  let user, profile;
  try {
    user = await window.sla.requireAuth();
    if (!user) return; // already redirected
    profile = await window.sla.getProfile();
    if (!profile || profile.role !== 'admin' || !profile.is_active) {
      document.getElementById('admin-loading').hidden = true;
      document.getElementById('admin-denied').hidden = false;
      return;
    }
  } catch (e) {
    console.error('[admin] auth check failed:', e);
    document.getElementById('admin-loading').hidden = true;
    document.getElementById('admin-denied').hidden = false;
    return;
  }

  // ----- SHOW APP -----
  document.getElementById('admin-loading').hidden = true;
  document.getElementById('admin-app').hidden = false;

  // ----- POPULATE USER INFO -----
  const displayName = profile.full_name || profile.email.split('@')[0];
  const avatarChar = displayName.charAt(0).toUpperCase();
  document.getElementById('user-avatar').textContent = avatarChar;
  document.getElementById('user-name').textContent = displayName;
  document.getElementById('user-email').textContent = profile.email;
  document.getElementById('welcome-name').textContent = displayName.split(' ')[0];

  if (profile.is_main_admin) {
    document.querySelectorAll('.main-admin-only').forEach(el => el.hidden = false);
  }

  // ----- SIGN OUT -----
  document.getElementById('signout-btn').addEventListener('click', () => window.sla.signOut());

  // ----- NAVIGATION -----
  const navLinks = document.querySelectorAll('.admin-nav-link');
  const views = document.querySelectorAll('.admin-view');

  function showView(viewName) {
    let found = false;
    views.forEach(v => {
      const isMatch = v.dataset.view === viewName;
      v.classList.toggle('active', isMatch);
      if (isMatch) found = true;
    });
    navLinks.forEach(l => l.classList.toggle('active', l.dataset.view === viewName));
    if (!found) {
      // Fall back to dashboard
      showView('dashboard');
      return;
    }
    loadView(viewName);
  }

  navLinks.forEach(link => {
    link.addEventListener('click', e => {
      if (link.classList.contains('disabled')) {
        e.preventDefault();
        return;
      }
      e.preventDefault();
      showView(link.dataset.view);
      history.replaceState({}, '', '#' + link.dataset.view);
    });
  });

  // Initial view: from URL hash, or default to dashboard
  const initial = (window.location.hash || '#dashboard').replace('#', '');
  showView(initial);

  // ----- VIEW LOADERS -----
  async function loadView(name) {
    if (name === 'dashboard') return loadDashboard();
    if (name === 'messages') return loadMessages();
    if (name === 'admins') return loadAdmins();
  }

  async function loadDashboard() {
    const sevenDaysAgo = new Date(Date.now() - 7*24*60*60*1000).toISOString();

    try {
      // Run all stats queries in parallel
      const [users, msgs, teachers, anns, recent] = await Promise.all([
        window.sla.db.from('profiles')
          .select('id', { count: 'exact', head: true })
          .gte('last_seen_at', sevenDaysAgo),
        window.sla.db.from('contact_messages')
          .select('id', { count: 'exact', head: true })
          .eq('is_read', false),
        window.sla.db.from('teachers')
          .select('id', { count: 'exact', head: true }),
        window.sla.db.from('announcements')
          .select('id', { count: 'exact', head: true })
          .eq('is_active', true),
        window.sla.db.from('profiles')
          .select('email, full_name, last_seen_at, role, is_main_admin')
          .order('last_seen_at', { ascending: false, nullsFirst: false })
          .limit(8),
      ]);

      document.getElementById('stat-users').textContent = users.count ?? '0';
      document.getElementById('stat-messages').textContent = msgs.count ?? '0';
      document.getElementById('stat-teachers').textContent = teachers.count ?? '0';
      document.getElementById('stat-announcements').textContent = anns.count ?? '0';

      // Sidebar unread badge
      const badge = document.getElementById('unread-count');
      if (msgs.count && msgs.count > 0) {
        badge.textContent = msgs.count;
        badge.hidden = false;
      } else {
        badge.hidden = true;
      }

      // Recent activity
      const recentEl = document.getElementById('recent-activity');
      const recentUsers = recent.data || [];
      if (recentUsers.length === 0) {
        recentEl.innerHTML = '<div class="admin-empty">No activity yet.</div>';
      } else {
        recentEl.innerHTML = recentUsers.map(u => {
          const name = u.full_name || u.email.split('@')[0];
          const roleLabel = u.is_main_admin ? ' · Main Admin' : (u.role === 'admin' ? ' · Admin' : '');
          return `
            <div class="admin-list-item" style="cursor: default;">
              <div>
                <strong>${escapeHtml(name)}</strong>
                <div class="meta">${escapeHtml(u.email)}${roleLabel}</div>
              </div>
              <div class="meta">${u.last_seen_at ? timeAgo(u.last_seen_at) : 'never'}</div>
            </div>
          `;
        }).join('');
      }
    } catch (e) {
      console.error('[admin] dashboard load failed:', e);
    }
  }

  async function loadMessages() {
    const list = document.getElementById('messages-list');
    list.innerHTML = '<div class="admin-empty">Loading messages…</div>';

    const { data, error } = await window.sla.db
      .from('contact_messages')
      .select('*')
      .order('received_at', { ascending: false })
      .limit(100);

    if (error) {
      list.innerHTML = `<div class="admin-empty">Failed to load: ${escapeHtml(error.message)}</div>`;
      return;
    }
    if (!data || data.length === 0) {
      list.innerHTML = '<div class="admin-empty">No messages yet. When someone submits the contact form on the public site, it will appear here.</div>';
      return;
    }

    list.innerHTML = data.map(m => {
      const name = `${m.first_name || ''} ${m.last_name || ''}`.trim() || m.email || 'Anonymous';
      return `
        <div class="admin-list-item ${m.is_read ? '' : 'unread'}" data-id="${m.id}">
          <div>
            <strong>${escapeHtml(name)}</strong>
            <div class="meta">${escapeHtml(m.subject || '(no subject)')} — ${escapeHtml(m.email || '')}</div>
          </div>
          <div class="meta">${timeAgo(m.received_at)}</div>
        </div>
      `;
    }).join('');

    list.querySelectorAll('.admin-list-item').forEach(item => {
      item.addEventListener('click', () => viewMessage(item.dataset.id));
    });
  }

  async function viewMessage(id) {
    const { data: m, error } = await window.sla.db
      .from('contact_messages')
      .select('*')
      .eq('id', id)
      .single();

    if (error || !m) return;

    // Mark as read
    if (!m.is_read) {
      await window.sla.db.from('contact_messages').update({ is_read: true }).eq('id', id);
    }

    const name = `${m.first_name || ''} ${m.last_name || ''}`.trim() || 'Anonymous';
    const modal = document.createElement('div');
    modal.className = 'admin-modal';
    modal.innerHTML = `
      <div class="admin-modal-content">
        <button class="admin-modal-close" aria-label="Close">×</button>
        <div class="message-detail">
          <div class="from-info">
            <strong>${escapeHtml(name)}</strong>
            <span>${escapeHtml(m.email || 'no email provided')} · ${new Date(m.received_at).toLocaleString()}</span>
          </div>
          <div class="subject">${escapeHtml(m.subject || '(no subject)')}</div>
          <div class="body">${escapeHtml(m.message || '')}</div>
          ${m.email ? `<a href="mailto:${encodeURIComponent(m.email)}?subject=Re: ${encodeURIComponent(m.subject || '')}" class="btn btn-primary" style="margin-top: 1.5rem; display: inline-flex;">Reply via email</a>` : ''}
        </div>
      </div>
    `;
    document.body.appendChild(modal);

    modal.querySelector('.admin-modal-close').addEventListener('click', () => modal.remove());
    modal.addEventListener('click', e => { if (e.target === modal) modal.remove(); });
    document.addEventListener('keydown', function onKey(e) {
      if (e.key === 'Escape') { modal.remove(); document.removeEventListener('keydown', onKey); }
    });

    // Refresh list to update read state
    loadMessages();
    loadDashboard();
  }

  async function loadAdmins() {
    const list = document.getElementById('admins-list');
    list.innerHTML = '<div class="admin-empty">Loading…</div>';

    const { data, error } = await window.sla.db
      .from('profiles')
      .select('id, email, full_name, role, is_main_admin, last_seen_at')
      .eq('role', 'admin')
      .order('is_main_admin', { ascending: false })
      .order('created_at', { ascending: true });

    if (error) {
      list.innerHTML = `<div class="admin-empty">Failed to load: ${escapeHtml(error.message)}</div>`;
      return;
    }
    if (!data || data.length === 0) {
      list.innerHTML = '<div class="admin-empty">No admins yet.</div>';
      return;
    }

    list.innerHTML = data.map(a => {
      const name = a.full_name || a.email.split('@')[0];
      const seen = a.last_seen_at ? `· last seen ${timeAgo(a.last_seen_at)}` : '';
      const isMe = a.email === profile.email;
      const canDemote = !a.is_main_admin && !isMe && profile.is_main_admin;
      return `
        <div class="admins-list-item">
          <div class="admin-user-avatar">${escapeHtml(name.charAt(0).toUpperCase())}</div>
          <div>
            <strong>${escapeHtml(name)}${isMe ? ' (you)' : ''}</strong>
            <div class="meta">${escapeHtml(a.email)} ${seen}</div>
          </div>
          <div>
            <span class="role-badge ${a.is_main_admin ? 'main' : ''}">${a.is_main_admin ? 'Main Admin' : 'Admin'}</span>
            ${canDemote ? `<button data-demote="${a.id}" data-email="${escapeHtml(a.email)}">Remove</button>` : ''}
          </div>
        </div>
      `;
    }).join('');

    list.querySelectorAll('[data-demote]').forEach(btn => {
      btn.addEventListener('click', async () => {
        const email = btn.dataset.email;
        if (!confirm(`Remove admin role from ${email}? They'll go back to being a regular member.`)) return;
        const { error } = await window.sla.db
          .from('profiles')
          .update({ role: 'member' })
          .eq('id', btn.dataset.demote);
        if (error) {
          alert('Failed: ' + error.message);
          return;
        }
        loadAdmins();
        loadDashboard();
      });
    });
  }

  // ----- PROMOTE USER (main admin only) -----
  const promoteBtn = document.getElementById('promote-btn');
  if (promoteBtn) {
    promoteBtn.addEventListener('click', async () => {
      const emailInput = document.getElementById('promote-email');
      const feedback = document.getElementById('promote-feedback');
      const email = (emailInput.value || '').trim().toLowerCase();
      feedback.className = 'admin-feedback';
      feedback.textContent = '';

      if (!email || !/@slasm\.net$/.test(email)) {
        feedback.classList.add('error');
        feedback.textContent = 'Email must be a @slasm.net address.';
        return;
      }

      const { data: target, error: findErr } = await window.sla.db
        .from('profiles')
        .select('id, email, role')
        .eq('email', email)
        .maybeSingle();

      if (findErr) {
        feedback.classList.add('error');
        feedback.textContent = 'Lookup failed: ' + findErr.message;
        return;
      }
      if (!target) {
        feedback.classList.add('error');
        feedback.textContent = 'User not found. They need to sign in to the site at least once first.';
        return;
      }
      if (target.role === 'admin') {
        feedback.classList.add('error');
        feedback.textContent = 'User is already an admin.';
        return;
      }

      const { error: updErr } = await window.sla.db
        .from('profiles')
        .update({ role: 'admin' })
        .eq('id', target.id);

      if (updErr) {
        feedback.classList.add('error');
        feedback.textContent = 'Update failed: ' + updErr.message;
        return;
      }

      feedback.classList.add('success');
      feedback.textContent = `${email} is now an admin.`;
      emailInput.value = '';
      loadAdmins();
    });
  }

  // ----- UTILITIES -----
  function escapeHtml(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, c => ({
      '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'
    })[c]);
  }
  function timeAgo(iso) {
    if (!iso) return '';
    const d = new Date(iso);
    const sec = Math.floor((Date.now() - d.getTime()) / 1000);
    if (sec < 60) return 'just now';
    const m = Math.floor(sec / 60);
    if (m < 60) return m + 'm ago';
    const h = Math.floor(m / 60);
    if (h < 24) return h + 'h ago';
    const days = Math.floor(h / 24);
    if (days < 7) return days + 'd ago';
    if (days < 30) return Math.floor(days / 7) + 'w ago';
    return d.toLocaleDateString();
  }
})();
