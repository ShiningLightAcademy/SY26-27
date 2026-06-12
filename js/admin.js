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
    if (name === 'announcements') return loadAnnouncements();
    if (name === 'schedule') return loadSchedule();
    if (name === 'classrooms') return loadClassrooms();
    if (name === 'portfolio') return loadPortfolio();
    if (name === 'teachers') return loadTeachers();
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

  // ============================================================
  // ANNOUNCEMENTS — CRUD
  // ============================================================
  async function loadAnnouncements() {
    const list = document.getElementById('ann-list');
    if (!list) return;
    list.innerHTML = '<div class="admin-empty">Loading…</div>';

    const { data, error } = await window.sla.db.from('announcements')
      .select('*')
      .order('is_active', { ascending: false })
      .order('created_at', { ascending: false });

    if (error) {
      list.innerHTML = `<div class="admin-empty">Failed: ${error.message}</div>`;
      return;
    }
    if (!data || data.length === 0) {
      list.innerHTML = '<div class="admin-empty">No announcements yet. Use the form above to create one.</div>';
      return;
    }

    list.innerHTML = data.map(a => `
      <div class="admin-list-item" style="cursor: default;">
        <div>
          <strong>${escapeHtml(a.title)} ${a.is_active ? '<span class="role-badge" style="background:#1E8E3E; margin-left: .4rem;">Active</span>' : ''}</strong>
          <div class="meta">${escapeHtml(a.body.slice(0, 100))}${a.body.length > 100 ? '…' : ''}</div>
        </div>
        <div style="display: flex; gap: 0.5rem;">
          <button class="ann-edit" data-id="${a.id}" style="padding: 0.4rem 0.8rem; font-size: 0.78rem; border-radius: 8px; border: 1px solid rgba(0,0,0,0.1); background: white; cursor: pointer; font-family: inherit;">Edit</button>
          <button class="ann-del" data-id="${a.id}" style="padding: 0.4rem 0.8rem; font-size: 0.78rem; border-radius: 8px; border: 1px solid rgba(0,0,0,0.1); background: white; cursor: pointer; font-family: inherit; color: #DC2626;">Delete</button>
        </div>
      </div>
    `).join('');

    list.querySelectorAll('.ann-edit').forEach(btn => {
      btn.addEventListener('click', () => editAnnouncement(btn.dataset.id));
    });
    list.querySelectorAll('.ann-del').forEach(btn => {
      btn.addEventListener('click', () => deleteAnnouncement(btn.dataset.id));
    });
  }

  function clearAnnouncementForm() {
    document.getElementById('ann-id').value = '';
    document.getElementById('ann-title').value = '';
    document.getElementById('ann-body').value = '';
    document.getElementById('ann-link-text').value = '';
    document.getElementById('ann-link-url').value = '';
    document.getElementById('ann-active').checked = false;
    document.getElementById('ann-form-title').textContent = 'Create new announcement';
    document.getElementById('ann-cancel').style.display = 'none';
    document.getElementById('ann-feedback').textContent = '';
    document.getElementById('ann-feedback').className = 'admin-feedback';
  }

  async function editAnnouncement(id) {
    const { data, error } = await window.sla.db.from('announcements')
      .select('*').eq('id', id).single();
    if (error || !data) return;
    document.getElementById('ann-id').value = data.id;
    document.getElementById('ann-title').value = data.title || '';
    document.getElementById('ann-body').value = data.body || '';
    document.getElementById('ann-link-text').value = data.link_text || '';
    document.getElementById('ann-link-url').value = data.link_url || '';
    document.getElementById('ann-active').checked = !!data.is_active;
    document.getElementById('ann-form-title').textContent = 'Edit announcement';
    document.getElementById('ann-cancel').style.display = 'inline-flex';
    // Scroll to form
    document.getElementById('ann-form-title').scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  async function deleteAnnouncement(id) {
    if (!confirm('Delete this announcement? This cannot be undone.')) return;
    const { error } = await window.sla.db.from('announcements').delete().eq('id', id);
    if (error) { alert('Failed: ' + error.message); return; }
    loadAnnouncements();
  }

  async function saveAnnouncement() {
    const feedback = document.getElementById('ann-feedback');
    feedback.className = 'admin-feedback';
    feedback.textContent = '';

    const id = document.getElementById('ann-id').value || null;
    const title = document.getElementById('ann-title').value.trim();
    const body = document.getElementById('ann-body').value.trim();
    const linkText = document.getElementById('ann-link-text').value.trim() || null;
    const linkUrl = document.getElementById('ann-link-url').value.trim() || null;
    const isActive = document.getElementById('ann-active').checked;

    if (!title || !body) {
      feedback.classList.add('error');
      feedback.textContent = 'Title and body are required.';
      return;
    }

    // If marking active, deactivate all others first
    if (isActive) {
      let q = window.sla.db.from('announcements').update({ is_active: false }).eq('is_active', true);
      if (id) q = q.neq('id', id);
      await q;
    }

    const payload = { title, body, link_text: linkText, link_url: linkUrl, is_active: isActive };

    let result;
    if (id) {
      result = await window.sla.db.from('announcements').update(payload).eq('id', id);
    } else {
      result = await window.sla.db.from('announcements').insert(payload);
    }

    if (result.error) {
      feedback.classList.add('error');
      feedback.textContent = 'Save failed: ' + result.error.message;
      return;
    }

    feedback.classList.add('success');
    feedback.textContent = id ? 'Announcement updated.' : 'Announcement created.';
    clearAnnouncementForm();
    loadAnnouncements();
    loadDashboard();
  }

  // Wire up announcement form buttons (one-time setup)
  document.addEventListener('click', (e) => {
    if (e.target && e.target.id === 'ann-save') saveAnnouncement();
    if (e.target && e.target.id === 'ann-cancel') clearAnnouncementForm();
  });


  // ============================================================
  // SCHEDULE — Edit Drive URL per grade
  // ============================================================
  const LEVEL_LABELS = {
    preschool: 'Preschool',
    gradeschool: 'Gradeschool',
    junior_high: 'Junior High School',
    senior_high: 'Senior High School',
  };

  async function loadSchedule() {
    const editor = document.getElementById('schedule-editor');
    editor.innerHTML = '<div class="admin-empty">Loading…</div>';

    const { data, error } = await window.sla.db.from('schedule_links')
      .select('*')
      .order('level_group')
      .order('sort_order');

    if (error) {
      editor.innerHTML = `<div class="admin-empty">Failed: ${error.message}</div>`;
      return;
    }
    if (!data || data.length === 0) {
      editor.innerHTML = '<div class="admin-empty">No grades configured. Run the seed SQL first.</div>';
      return;
    }

    // Group by level_group
    const groups = {};
    data.forEach(r => {
      if (!groups[r.level_group]) groups[r.level_group] = [];
      groups[r.level_group].push(r);
    });

    editor.innerHTML = Object.entries(groups).map(([key, rows]) => `
      <div class="admin-grade-group">
        <h4>${escapeHtml(LEVEL_LABELS[key] || key)}</h4>
        <div class="admin-grade-rows">
          ${rows.map(r => `
            <div class="admin-grade-row" data-id="${r.id}">
              <span class="admin-grade-name">${escapeHtml(r.grade_level)}</span>
              <input type="url" class="admin-grade-url" placeholder="https://drive.google.com/..." value="${escapeHtml(r.drive_url || '')}" />
              <button class="admin-grade-save">Save</button>
              <span class="admin-grade-feedback"></span>
            </div>
          `).join('')}
        </div>
      </div>
    `).join('');

    editor.querySelectorAll('.admin-grade-save').forEach(btn => {
      btn.addEventListener('click', async () => {
        const row = btn.closest('.admin-grade-row');
        const id = row.dataset.id;
        const url = row.querySelector('.admin-grade-url').value.trim() || null;
        const fb = row.querySelector('.admin-grade-feedback');
        fb.textContent = 'Saving…';
        fb.className = 'admin-grade-feedback';
        const { error } = await window.sla.db.from('schedule_links')
          .update({ drive_url: url, updated_at: new Date().toISOString() })
          .eq('id', id);
        if (error) {
          fb.textContent = '✗ ' + error.message;
          fb.classList.add('error');
        } else {
          fb.textContent = '✓ Saved';
          fb.classList.add('success');
          setTimeout(() => { fb.textContent = ''; fb.className = 'admin-grade-feedback'; }, 2000);
        }
      });
    });
  }


  // ============================================================
  // CLASSROOMS — Edit URL + Code per grade
  // ============================================================
  async function loadClassrooms() {
    const editor = document.getElementById('classrooms-editor');
    editor.innerHTML = '<div class="admin-empty">Loading…</div>';

    const { data, error } = await window.sla.db.from('classroom_links')
      .select('*')
      .order('level_group')
      .order('sort_order');

    if (error) {
      editor.innerHTML = `<div class="admin-empty">Failed: ${error.message}</div>`;
      return;
    }
    if (!data || data.length === 0) {
      editor.innerHTML = '<div class="admin-empty">No grades configured. Run the seed SQL first.</div>';
      return;
    }

    const groups = {};
    data.forEach(r => {
      if (!groups[r.level_group]) groups[r.level_group] = [];
      groups[r.level_group].push(r);
    });

    editor.innerHTML = Object.entries(groups).map(([key, rows]) => `
      <div class="admin-grade-group">
        <h4>${escapeHtml(LEVEL_LABELS[key] || key)}</h4>
        <div class="admin-grade-rows">
          ${rows.map(r => `
            <div class="admin-grade-row admin-grade-row-wide" data-id="${r.id}">
              <span class="admin-grade-name">${escapeHtml(r.grade_level)}</span>
              <input type="url" class="admin-grade-url" placeholder="https://classroom.google.com/c/..." value="${escapeHtml(r.classroom_url || '')}" />
              <input type="text" class="admin-grade-code" placeholder="Code" value="${escapeHtml(r.classroom_code || '')}" />
              <button class="admin-grade-save">Save</button>
              <span class="admin-grade-feedback"></span>
            </div>
          `).join('')}
        </div>
      </div>
    `).join('');

    editor.querySelectorAll('.admin-grade-save').forEach(btn => {
      btn.addEventListener('click', async () => {
        const row = btn.closest('.admin-grade-row');
        const id = row.dataset.id;
        const url = row.querySelector('.admin-grade-url').value.trim() || null;
        const code = row.querySelector('.admin-grade-code').value.trim() || null;
        const fb = row.querySelector('.admin-grade-feedback');
        fb.textContent = 'Saving…';
        fb.className = 'admin-grade-feedback';
        const { error } = await window.sla.db.from('classroom_links')
          .update({ classroom_url: url, classroom_code: code, updated_at: new Date().toISOString() })
          .eq('id', id);
        if (error) {
          fb.textContent = '✗ ' + error.message;
          fb.classList.add('error');
        } else {
          fb.textContent = '✓ Saved';
          fb.classList.add('success');
          setTimeout(() => { fb.textContent = ''; fb.className = 'admin-grade-feedback'; }, 2000);
        }
      });
    });
  }


  // ============================================================
  // PORTFOLIO — Edit subjects + colors per grade
  // ============================================================
  const PORTFOLIO_GRADES = [
    'Nursery', 'Kindergarten',
    'Grade 1', 'Grade 2', 'Grade 3', 'Grade 4', 'Grade 5', 'Grade 6',
    'Grade 7', 'Grade 8', 'Grade 9', 'Grade 10',
    'Grade 11 STEM', 'Grade 11 HUMSS', 'Grade 12 STEM', 'Grade 12 HUMSS'
  ];

  async function loadPortfolio() {
    const editor = document.getElementById('portfolio-editor');
    editor.innerHTML = '<div class="admin-empty">Loading…</div>';

    const { data, error } = await window.sla.db.from('portfolio_subjects')
      .select('*')
      .order('grade_level')
      .order('sort_order');

    if (error) {
      editor.innerHTML = `<div class="admin-empty">Failed: ${error.message}</div>`;
      return;
    }

    // Group by grade
    const groups = {};
    PORTFOLIO_GRADES.forEach(g => groups[g] = []);
    (data || []).forEach(r => {
      if (!groups[r.grade_level]) groups[r.grade_level] = [];
      groups[r.grade_level].push(r);
    });

    editor.innerHTML = `<div class="admin-card"><div id="portfolio-grades">
      ${PORTFOLIO_GRADES.map(grade => {
        const subjects = groups[grade] || [];
        return `
          <div class="portfolio-grade-block" data-grade="${escapeHtml(grade)}">
            <h4>${escapeHtml(grade)} <span class="meta">(${subjects.length} subjects)</span></h4>
            <div class="portfolio-subjects">
              ${subjects.map(s => renderSubjectRow(s)).join('')}
            </div>
            <div class="portfolio-add-row">
              <input type="text" class="portfolio-new-name" placeholder="Subject name (e.g. English)" />
              <input type="color" class="portfolio-new-color" value="#888888" />
              <input type="text" class="portfolio-new-label" placeholder="Color label (e.g. Red)" />
              <button class="portfolio-add-btn">+ Add</button>
            </div>
          </div>
        `;
      }).join('')}
    </div></div>`;

    wirePortfolio();
  }

  function renderSubjectRow(s) {
    return `
      <div class="portfolio-subject-row" data-id="${s.id}">
        <input type="color" class="portfolio-color" value="${escapeHtml(s.color_hex)}" />
        <input type="text" class="portfolio-name" value="${escapeHtml(s.subject_name)}" />
        <input type="text" class="portfolio-label" placeholder="Color label" value="${escapeHtml(s.color_label || '')}" />
        <button class="portfolio-save-btn">Save</button>
        <button class="portfolio-del-btn">×</button>
      </div>
    `;
  }

  function wirePortfolio() {
    document.querySelectorAll('.portfolio-add-btn').forEach(btn => {
      btn.addEventListener('click', async () => {
        const block = btn.closest('.portfolio-grade-block');
        const grade = block.dataset.grade;
        const name = block.querySelector('.portfolio-new-name').value.trim();
        const color = block.querySelector('.portfolio-new-color').value;
        const label = block.querySelector('.portfolio-new-label').value.trim() || null;
        if (!name) { alert('Subject name required.'); return; }
        const { error } = await window.sla.db.from('portfolio_subjects').insert({
          grade_level: grade,
          subject_name: name,
          color_hex: color,
          color_label: label,
          sort_order: 99,
        });
        if (error) { alert('Failed: ' + error.message); return; }
        loadPortfolio();
      });
    });
    document.querySelectorAll('.portfolio-save-btn').forEach(btn => {
      btn.addEventListener('click', async () => {
        const row = btn.closest('.portfolio-subject-row');
        const id = row.dataset.id;
        const fields = {
          color_hex: row.querySelector('.portfolio-color').value,
          subject_name: row.querySelector('.portfolio-name').value.trim(),
          color_label: row.querySelector('.portfolio-label').value.trim() || null,
        };
        const { error } = await window.sla.db.from('portfolio_subjects')
          .update(fields).eq('id', id);
        if (error) { alert('Failed: ' + error.message); return; }
        btn.textContent = '✓';
        setTimeout(() => { btn.textContent = 'Save'; }, 1500);
      });
    });
    document.querySelectorAll('.portfolio-del-btn').forEach(btn => {
      btn.addEventListener('click', async () => {
        const row = btn.closest('.portfolio-subject-row');
        if (!confirm('Delete this subject?')) return;
        const { error } = await window.sla.db.from('portfolio_subjects')
          .delete().eq('id', row.dataset.id);
        if (error) { alert('Failed: ' + error.message); retur
  // ============================================================
  // TEACHERS — CRUD with photo upload
  // ============================================================
  async function loadTeachers() {
    const grid = document.getElementById('teachers-grid');
    grid.innerHTML = '<div class="admin-empty">Loading…</div>';

    const { data, error } = await window.sla.db.from('teachers')
      .select('*')
      .order('sort_order', { ascending: true })
      .order('created_at', { ascending: true });

    if (error) {
      grid.innerHTML = `<div class="admin-empty">Failed: ${escapeHtml(error.message)}</div>`;
      return;
    }
    if (!data || data.length === 0) {
      grid.innerHTML = '<div class="admin-empty">No teachers yet. Click "+ Add teacher" to add the first one.</div>';
      return;
    }

    grid.innerHTML = data.map(t => {
      const initial = (t.full_name || '?').charAt(0).toUpperCase();
      const photoHtml = t.photo_url
        ? `<img src="${escapeHtml(t.photo_url)}" alt="" loading="lazy" onerror="this.replaceWith(Object.assign(document.createElement('span'), {textContent: '${initial}', style: 'font-family: var(--font-display); font-size: 2.2rem; font-weight: 600;'}))" />`
        : escapeHtml(initial);
      return `
        <div class="teacher-admin-card ${t.is_visible ? '' : 'hidden-teacher'}" data-id="${t.id}">
          <div class="teacher-admin-photo">${photoHtml}</div>
          <div class="teacher-admin-info">
            <strong>${escapeHtml(t.full_name)}</strong>
            <div class="meta">${escapeHtml(t.role || 'No role set')}</div>
          </div>
        </div>
      `;
    }).join('');

    grid.querySelectorAll('.teacher-admin-card').forEach(card => {
      card.addEventListener('click', () => openTeacherModal(card.dataset.id));
    });
  }

  // ---- Modal management ----
  const teacherModal = document.getElementById('teacher-modal');
  let currentPhotoFile = null;
  let currentPhotoUrl = null;

  function openTeacherModal(id) {
    resetTeacherForm();
    if (id) {
      document.getElementById('teacher-modal-title').textContent = 'Edit teacher';
      document.getElementById('teacher-delete-btn').style.display = 'inline-flex';
      loadTeacherIntoForm(id);
    } else {
      document.getElementById('teacher-modal-title').textContent = 'Add teacher';
      document.getElementById('teacher-delete-btn').style.display = 'none';
    }
    teacherModal.hidden = false;
    document.body.style.overflow = 'hidden';
  }

  function closeTeacherModal() {
    teacherModal.hidden = true;
    document.body.style.overflow = '';
    resetTeacherForm();
  }

  function resetTeacherForm() {
    document.getElementById('teacher-id').value = '';
    document.getElementById('teacher-name').value = '';
    document.getElementById('teacher-role').value = '';
    document.getElementById('teacher-email').value = '';
    document.getElementById('teacher-whatsapp').value = '';
    document.getElementById('teacher-tm').value = '';
    document.getElementById('teacher-globe').value = '';
    document.getElementById('teacher-zoom').value = '';
    document.getElementById('teacher-meetingid').value = '';
    document.getElementById('teacher-passcode').value = '';
    document.getElementById('teacher-sort').value = '0';
    document.getElementById('teacher-visible').checked = true;
    document.getElementById('teacher-photo-url').value = '';
    document.getElementById('teacher-photo-input').value = '';
    document.getElementById('teacher-photo-preview').innerHTML =
      '<span class="teacher-photo-hint">Click or drop image</span>';
    document.getElementById('teacher-photo-clear').style.display = 'none';
    const fb = document.getElementById('teacher-form-feedback');
    fb.textContent = '';
    fb.className = 'admin-feedback';
    currentPhotoFile = null;
    currentPhotoUrl = null;
  }

  async function loadTeacherIntoForm(id) {
    const { data: t, error } = await window.sla.db.from('teachers')
      .select('*').eq('id', id).single();
    if (error || !t) return;
    document.getElementById('teacher-id').value = t.id;
    document.getElementById('teacher-name').value = t.full_name || '';
    document.getElementById('teacher-role').value = t.role || '';
    document.getElementById('teacher-email').value = t.email || '';
    document.getElementById('teacher-whatsapp').value = t.whatsapp || '';
    document.getElementById('teacher-tm').value = t.tm_smart || '';
    document.getElementById('teacher-globe').value = t.globe || '';
    document.getElementById('teacher-zoom').value = t.zoom_link || '';
    document.getElementById('teacher-meetingid').value = t.meeting_id || '';
    document.getElementById('teacher-passcode').value = t.passcode || '';
    document.getElementById('teacher-sort').value = t.sort_order || 0;
    document.getElementById('teacher-visible').checked = !!t.is_visible;
    if (t.photo_url) {
      currentPhotoUrl = t.photo_url;
      document.getElementById('teacher-photo-preview').innerHTML = `<img src="${escapeHtml(t.photo_url)}" alt="" />`;
      document.getElementById('teacher-photo-clear').style.display = 'inline-flex';
    }
  }

  // Wire up modal triggers
  document.getElementById('teacher-add-btn').addEventListener('click', () => openTeacherModal(null));
  document.getElementById('teacher-modal-close').addEventListener('click', closeTeacherModal);
  document.getElementById('teacher-cancel-btn').addEventListener('click', closeTeacherModal);
  teacherModal.addEventListener('click', (e) => {
    if (e.target === teacherModal) closeTeacherModal();
  });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && !teacherModal.hidden) closeTeacherModal();
  });

  // Photo upload — file picker + drag-and-drop
  const photoArea = document.querySelector('.teacher-photo-area');
  const photoInput = document.getElementById('teacher-photo-input');
  const photoPreview = document.getElementById('teacher-photo-preview');
  const photoUrlInput = document.getElementById('teacher-photo-url');
  const photoClear = document.getElementById('teacher-photo-clear');

  function handlePhotoFile(file) {
    if (!file || !file.type.startsWith('image/')) {
      alert('Please drop an image file.');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      alert('Image must be under 5 MB. Storage policy limit.');
      return;
    }
    currentPhotoFile = file;
    currentPhotoUrl = null;
    photoUrlInput.value = '';
    // Show preview from local file
    const reader = new FileReader();
    reader.onload = (e) => {
      photoPreview.innerHTML = `<img src="${e.target.result}" alt="" />`;
      photoClear.style.display = 'inline-flex';
    };
    reader.readAsDataURL(file);
  }

  photoInput.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (file) handlePhotoFile(file);
  });
  ['dragenter', 'dragover'].forEach(ev => {
    photoArea.addEventListener(ev, (e) => {
      e.preventDefault();
      photoArea.classList.add('dragging');
    });
  });
  ['dragleave', 'drop'].forEach(ev => {
    photoArea.addEventListener(ev, (e) => {
      e.preventDefault();
      photoArea.classList.remove('dragging');
    });
  });
  photoArea.addEventListener('drop', (e) => {
    const file = e.dataTransfer.files[0];
    if (file) handlePhotoFile(file);
  });

  // Paste an external URL
  photoUrlInput.addEventListener('input', () => {
    const url = photoUrlInput.value.trim();
    if (url && /^https?:\/\//.test(url)) {
      currentPhotoUrl = url;
      currentPhotoFile = null;
      photoPreview.innerHTML = `<img src="${escapeHtml(url)}" alt="" />`;
      photoClear.style.display = 'inline-flex';
    }
  });

  photoClear.addEventListener('click', () => {
    currentPhotoFile = null;
    currentPhotoUrl = null;
    photoUrlInput.value = '';
    photoInput.value = '';
    photoPreview.innerHTML = '<span class="teacher-photo-hint">Click or drop image</span>';
    photoClear.style.display = 'none';
  });

  async function uploadPhotoToStorage(file) {
    const ext = (file.name.split('.').pop() || 'jpg').toLowerCase().replace(/[^a-z0-9]/g, '');
    const safeExt = ['jpg','jpeg','png','webp','gif'].includes(ext) ? ext : 'jpg';
    const path = `teachers/${Date.now()}-${Math.random().toString(36).slice(2,8)}.${safeExt}`;
    const { data, error } = await window.sla.db.storage.from('sla-media').upload(path, file, {
      cacheControl: '3600',
      upsert: false,
      contentType: file.type,
    });
    if (error) throw error;
    const { data: urlData } = window.sla.db.storage.from('sla-media').getPublicUrl(data.path);
    return urlData.publicUrl;
  }

  // Save
  document.getElementById('teacher-save-btn').addEventListener('click', async () => {
    const fb = document.getElementById('teacher-form-feedback');
    fb.className = 'admin-feedback';
    fb.textContent = '';

    const name = document.getElementById('teacher-name').value.trim();
    if (!name) {
      fb.classList.add('error');
      fb.textContent = 'Full name is required.';
      return;
    }

    const saveBtn = document.getElementById('teacher-save-btn');
    saveBtn.disabled = true;
    saveBtn.textContent = 'Saving…';

    try {
      let photoUrl = currentPhotoUrl;
      if (currentPhotoFile) {
        photoArea.classList.add('teacher-uploading');
        photoUrl = await uploadPhotoToStorage(currentPhotoFile);
        photoArea.classList.remove('teacher-uploading');
      }

      const payload = {
        full_name: name,
        role: document.getElementById('teacher-role').value.trim() || null,
        email: document.getElementById('teacher-email').value.trim() || null,
        whatsapp: document.getElementById('teacher-whatsapp').value.trim() || null,
        tm_smart: document.getElementById('teacher-tm').value.trim() || null,
        globe: document.getElementById('teacher-globe').value.trim() || null,
        zoom_link: document.getElementById('teacher-zoom').value.trim() || null,
        meeting_id: document.getElementById('teacher-meetingid').value.trim() || null,
        passcode: document.getElementById('teacher-passcode').value.trim() || null,
        sort_order: parseInt(document.getElementById('teacher-sort').value) || 0,
        is_visible: document.getElementById('teacher-visible').checked,
        photo_url: photoUrl,
      };

      const id = document.getElementById('teacher-id').value;
      let result;
      if (id) {
        result = await window.sla.db.from('teachers').update(payload).eq('id', id);
      } else {
        result = await window.sla.db.from('teachers').insert(payload);
      }
      if (result.error) throw result.error;

      closeTeacherModal();
      loadTeachers();
      loadDashboard();
    } catch (e) {
      photoArea.classList.remove('teacher-uploading');
      fb.classList.add('error');
      fb.textContent = 'Failed: ' + (e.message || e);
    } finally {
      saveBtn.disabled = false;
      saveBtn.textContent = 'Save';
    }
  });

  // Delete
  document.getElementById('teacher-delete-btn').addEventListener('click', async () => {
    const id = document.getElementById('teacher-id').value;
    if (!id) return;
    const name = document.getElementById('teacher-name').value;
    if (!confirm(`Delete ${name}? This cannot be undone. The photo file will also be removed from storage.`)) return;

    try {
      // Try to delete the photo file from storage if it's hosted by us
      const photoUrl = currentPhotoUrl;
      if (photoUrl && photoUrl.includes('/storage/v1/object/public/sla-media/')) {
        const path = photoUrl.split('/sla-media/').pop();
        if (path) {
          await window.sla.db.storage.from('sla-media').remove([path]).catch(() => {});
        }
      }
      const { error } = await window.sla.db.from('teachers').delete().eq('id', id);
      if (error) throw error;
      closeTeacherModal();
      loadTeachers();
      loadDashboard();
    } catch (e) {
      alert('Failed: ' + (e.message || e));
    }
  });


n; }
        loadPortfolio();
      });
    });
  }
})();
