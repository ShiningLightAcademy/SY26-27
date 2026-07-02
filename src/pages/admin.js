/* ============================================================
   SHINING LIGHT ACADEMY — Admin Dashboard Logic
   ============================================================ */

(async () => {

  // ----- AUTH CHECK -----
  let user, profile;
  try {
    user = await window.sla.requireAuth();
    if (!user) return;
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

  // ----- PRESENCE -----
  // admin.html doesn't load auth-guard.js, so update last-seen and join the
  // live presence channel here — otherwise people on the admin site never
  // show up as "online".
  window.sla.touchPresence().catch(() => {});
  window.sla.joinPresence().catch(() => {});

  // ----- POPULATE USER INFO -----
  const displayName = profile.full_name || profile.email.split('@')[0];
  document.getElementById('user-avatar').textContent = displayName.charAt(0).toUpperCase();
  document.getElementById('user-name').textContent = displayName;
  document.getElementById('user-email').textContent = profile.email;
  document.getElementById('welcome-name').textContent = displayName.split(' ')[0];

  if (profile.is_main_admin) {
    document.querySelectorAll('.main-admin-only').forEach(el => el.hidden = false);
  }

  document.getElementById('signout-btn').addEventListener('click', () => window.sla.signOut());

  const _stSaveBtn = document.getElementById('site-text-save');
  if (_stSaveBtn) _stSaveBtn.addEventListener('click', saveSiteText);

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
    if (!found) { showView('dashboard'); return; }
    loadView(viewName);
  }

  navLinks.forEach(link => {
    link.addEventListener('click', e => {
      if (link.classList.contains('disabled')) { e.preventDefault(); return; }
      e.preventDefault();
      showView(link.dataset.view);
      history.replaceState({}, '', '#' + link.dataset.view);
    });
  });

  const initial = (window.location.hash || '#dashboard').replace('#', '');
  showView(initial);

  async function loadView(name) {
    if (name === 'dashboard')     return loadDashboard();
    if (name === 'messages')      return loadMessages();
    if (name === 'admins')        return loadAdmins();
    if (name === 'announcements') return loadAnnouncements();
    if (name === 'schedule')      return loadSchedule();
    if (name === 'classrooms')    return loadClassrooms();
    if (name === 'portfolio')     return loadPortfolio();
    if (name === 'teachers')      return loadTeachers();
    if (name === 'gallery')       return loadGallery();
    if (name === 'home-shuffle')  return loadHomeShuffle();
    if (name === 'site-text')     return loadSiteText();
  }

  // ============================================================
  // UTILITIES
  // ============================================================
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
  const LEVEL_LABELS = {
    preschool: 'Preschool', gradeschool: 'Gradeschool',
    junior_high: 'Junior High School', senior_high: 'Senior High School',
  };
  const PORTFOLIO_GRADES = [
    'Nursery','Kinder','Grade 1','Grade 2-3','Grade 4-6','Grade 7-10',
    'Grade 11',
    'Grade 12 STEM (1st Sem)','Grade 12 STEM (2nd Sem)'
  ];

  // ============================================================
  // DASHBOARD
  // ============================================================
  // ============================================================
  // SITE VISIBILITY — main-admin-only maintenance switch
  // ============================================================
  let _visibilityWired = false;
  async function wireVisibility(isMainAdmin) {
    const card = document.getElementById('visibility-card');
    if (!card) return;
    if (!isMainAdmin) { card.hidden = true; return; }
    card.hidden = false;

    const toggle = document.getElementById('visibility-toggle');
    const status = document.getElementById('visibility-status');

    function paint(visible) {
      toggle.checked = visible;
      card.classList.toggle('is-hidden-mode', !visible);
      status.textContent = visible
        ? 'Site is live — everyone can view it.'
        : 'Maintenance mode — only admins can view the site right now.';
    }

    // Load current value
    try {
      const { data } = await window.sla.db.from('site_settings').select('public_visible').eq('id', 1).single();
      paint(data ? !!data.public_visible : true);
    } catch (e) { paint(true); }

    if (_visibilityWired) return; // only attach the listener once
    _visibilityWired = true;

    toggle.addEventListener('change', async () => {
      const visible = toggle.checked;
      status.textContent = 'Saving…';
      const { error } = await window.sla.db
        .from('site_settings')
        .update({ public_visible: visible, updated_at: new Date().toISOString(), updated_by: profile.id })
        .eq('id', 1);
      if (error) {
        status.textContent = 'Could not save: ' + error.message;
        toggle.checked = !visible; // revert
        return;
      }
      paint(visible);
    });
  }

  async function loadDashboard() {
    const sevenDaysAgo = new Date(Date.now() - 7*24*60*60*1000).toISOString();
    try {
      // Active users count and recent activity are main-admin-only
      const isMainAdmin = !!profile.is_main_admin;

      // Site visibility switch (main admin only)
      wireVisibility(isMainAdmin);

      // Live "who's online now" via Realtime presence (main admin only)
      wireOnlineNow(isMainAdmin);

      const queries = [
        // Always fetch for all admins:
        window.sla.db.from('contact_messages').select('id', { count:'exact', head:true }).eq('is_read', false),
        window.sla.db.from('teachers').select('id', { count:'exact', head:true }),
        window.sla.db.from('announcements').select('id', { count:'exact', head:true }).eq('is_active', true),
      ];

      // Main-admin-only queries
      const usersQuery = isMainAdmin
        ? window.sla.db.from('profiles').select('id', { count:'exact', head:true }).gte('last_seen_at', sevenDaysAgo)
        : Promise.resolve({ count: null });
      const recentQuery = isMainAdmin
        ? window.sla.db.from('profiles').select('email, full_name, last_seen_at, role, is_main_admin').order('last_seen_at', { ascending:false, nullsFirst:false }).limit(8)
        : Promise.resolve({ data: null });

      const [msgs, teachers, anns, users, recent] = await Promise.all([
        ...queries, usersQuery, recentQuery,
      ]);

      // Active users stat — only show to main admin
      const statUsersEl = document.getElementById('stat-users');
      const statUsersCard = statUsersEl ? statUsersEl.closest('.admin-stat') : null;
      if (isMainAdmin) {
        statUsersEl.textContent = users.count ?? '0';
        if (statUsersCard) statUsersCard.hidden = false;
      } else {
        if (statUsersCard) statUsersCard.hidden = true;
      }

      document.getElementById('stat-messages').textContent      = msgs.count ?? '0';
      document.getElementById('stat-teachers').textContent      = teachers.count ?? '0';
      document.getElementById('stat-announcements').textContent = anns.count ?? '0';

      const badge = document.getElementById('unread-count');
      if (msgs.count && msgs.count > 0) { badge.textContent = msgs.count; badge.hidden = false; }
      else badge.hidden = true;

      // Recent activity — main admin only
      const recentEl = document.getElementById('recent-activity');
      const recentCard = recentEl ? recentEl.closest('.admin-card') : null;
      if (!isMainAdmin) {
        if (recentCard) recentCard.hidden = true;
        return;
      }
      if (recentCard) recentCard.hidden = false;

      const list = recent.data || [];
      if (!list.length) { recentEl.innerHTML = '<div class="admin-empty">No activity yet.</div>'; return; }
      recentEl.innerHTML = list.map(u => {
        const name = u.full_name || u.email.split('@')[0];
        const role = u.is_main_admin ? ' · Main Admin' : (u.role === 'admin' ? ' · Admin' : '');
        return `<div class="admin-list-item" style="cursor:default;">
          <div><strong>${escapeHtml(name)}</strong><div class="meta">${escapeHtml(u.email)}${role}</div></div>
          <div class="meta">${u.last_seen_at ? timeAgo(u.last_seen_at) : 'never'}</div>
        </div>`;
      }).join('');
    } catch (e) { console.error('[dashboard]', e); }
  }

  // ============================================================
  // ONLINE NOW (live Realtime presence)
  // ============================================================
  let _onlineWired = false;
  function wireOnlineNow(isMainAdmin) {
    const card = document.getElementById('online-now-card');
    if (!card) return;
    if (!isMainAdmin) { card.hidden = true; return; }
    card.hidden = false;

    const listEl = document.getElementById('online-now-list');
    const countEl = document.getElementById('online-now-count');

    // Make sure we've joined the presence channel (auth-guard usually has already).
    window.sla.joinPresence().catch(() => {});

    if (_onlineWired) return;   // only register the sync handler once
    _onlineWired = true;

    window.sla.onPresenceSync((state) => {
      // state = { userId: [meta, meta, ...] } — one key per person, one entry per open tab.
      const people = Object.keys(state).map(key => {
        const metas = state[key] || [];
        const m = metas[0] || {};
        return {
          name: m.full_name || (m.email ? m.email.split('@')[0] : 'Unknown'),
          email: m.email || '',
          role: m.is_main_admin ? 'Main Admin' : (m.role === 'admin' ? 'Admin' : 'Member'),
          tabs: metas.length,
          page: m.page || '',
        };
      }).sort((a, b) => a.name.localeCompare(b.name));

      if (countEl) countEl.textContent = people.length;
      if (!listEl) return;
      if (!people.length) {
        listEl.innerHTML = '<div class="admin-empty">No one is online right now.</div>';
        return;
      }
      const prettyPage = (p) => {
        if (!p || p === 'index.html') return 'Home';
        if (p === 'admin.html') return 'Admin panel';
        return p.replace('.html', '').replace(/^./, c => c.toUpperCase());
      };
      listEl.innerHTML = people.map(p => `
        <div class="admin-list-item" style="cursor:default;">
          <div style="display:flex;align-items:center;gap:0.65rem;">
            <span class="online-dot" aria-hidden="true"></span>
            <div>
              <strong>${escapeHtml(p.name)}</strong>
              <div class="meta">${escapeHtml(p.email)}${p.role ? ' · ' + p.role : ''}${p.tabs > 1 ? ' · ' + p.tabs + ' tabs' : ''}</div>
            </div>
          </div>
          <div class="meta">${escapeHtml(prettyPage(p.page))}</div>
        </div>`).join('');
    });
  }

  // ============================================================
  // SITE TEXT (editable page content)
  // ============================================================
  // Each entry's `def` MUST equal the element's original on-page text exactly,
  // so "equals default" can revert cleanly. `key` matches data-content-key.
  const CONTENT_FIELDS = [
    { group: 'Homepage', fields: [
      { key: 'home.hero_season',       label: 'Hero — season tag', type: 'input',    def: 'School Year 2026–2027 · Carnival' },
      { key: 'home.hero_tagline',      label: 'Hero — tagline',    type: 'input',    def: '"We make your child\'s world better."' },
      { key: 'home.deped_label',       label: 'DepEd permits — label', type: 'input', def: 'DepEd Recognitions and Permits' },
      { key: 'home.award1_title',      label: 'Award 1 — title',       type: 'input',    def: 'Best Performing Private School' },
      { key: 'home.award1_desc',       label: 'Award 1 — description',  type: 'textarea', def: 'Top elementary & secondary school, Schools Division of Cagayan' },
      { key: 'home.award2_title',      label: 'Award 2 — title',       type: 'input',    def: 'World-Class Scholars' },
      { key: 'home.award2_desc',       label: 'Award 2 — description',  type: 'textarea', def: 'Medalists at international Science & Math Olympiads' },
      { key: 'home.award3_title',      label: 'Award 3 — title',       type: 'input',    def: 'Champion Campus Journalists' },
      { key: 'home.award3_desc',       label: 'Award 3 — description',  type: 'textarea', def: 'Awarded at the Asiarope International Journalism Olympiad, Malaysia' },
      { key: 'home.award4_title',      label: 'Award 4 — title',       type: 'input',    def: 'Region 2 STARS Awardee' },
      { key: 'home.award4_desc',       label: 'Award 4 — description',  type: 'textarea', def: "Among the region's best-performing private schools" },
      { key: 'home.award5_title',      label: 'Award 5 — title',       type: 'input',    def: 'Fifteen Years of Excellence' },
      { key: 'home.award5_desc',       label: 'Award 5 — description',  type: 'textarea', def: 'A government-recognized school, Nursery to Senior High' },
      { key: 'home.foundation_eyebrow',label: 'Foundation — eyebrow',  type: 'input',    def: 'Our Foundation' },
      { key: 'home.vision_text',       label: 'Vision statement',      type: 'textarea', def: 'A leading school wherein learners are developed to fear God, and excel in academics and character, who will become future leaders in following Biblical principles that will uplift the falling world.' },
      { key: 'home.mission_text',      label: 'Mission statement',     type: 'textarea', def: 'The heart of education is the education of the heart. SLA will train and mold children to love and honor God and country and become socially responsible through high quality education.' },
      { key: 'home.community_eyebrow', label: 'Community — eyebrow',    type: 'input',    def: 'Moments at SLA' },
      { key: 'home.modalities_eyebrow',label: 'Modalities — eyebrow',   type: 'input',    def: 'Learning Modalities' },
      { key: 'home.numbers_eyebrow',   label: 'By the Numbers — eyebrow', type: 'input',  def: 'By the Numbers' },
    ]},
    { group: 'Teachers page', fields: [
      { key: 'teachers.eyebrow',  label: 'Eyebrow',  type: 'input',    def: 'Faculty & Staff' },
      { key: 'teachers.title',    label: 'Title',    type: 'input',    def: 'The Movers & Shakers.' },
      { key: 'teachers.subtitle', label: 'Description', type: 'textarea', def: "Know your teachers here. Get to see their faces. All contact details are listed — please message during school days and hours only, and respect each teacher's privacy. For in-person classes, you may ask for help personally." },
    ]},
    { group: 'Schedule page', fields: [
      { key: 'schedule.eyebrow',  label: 'Eyebrow',  type: 'input',    def: 'Class Schedules' },
      { key: 'schedule.title',    label: 'Title',    type: 'input',    def: 'Find your schedule.' },
      { key: 'schedule.subtitle', label: 'Description', type: 'textarea', def: 'This is only for virtual class. Physical class schedules will be given during orientation. Click your grade level to be redirected to your schedule — make sure to download it. The links for all classes are present there.' },
    ]},
    { group: 'Classrooms page', fields: [
      { key: 'classrooms.eyebrow',  label: 'Eyebrow',  type: 'input',    def: 'Google Classrooms' },
      { key: 'classrooms.title',    label: 'Title',    type: 'input',    def: 'Join your classroom.' },
      { key: 'classrooms.subtitle', label: 'Description', type: 'textarea', def: "Find your grade level, click the link, and you're in. Each classroom contains your weekly tasks, materials, and announcements." },
    ]},
    { group: 'Portfolio page', fields: [
      { key: 'portfolio.eyebrow',  label: 'Eyebrow',  type: 'input',    def: 'Portfolio Color Codes' },
      { key: 'portfolio.title',    label: 'Title',    type: 'input',    def: 'Subject color codes.' },
      { key: 'portfolio.subtitle', label: 'Description', type: 'textarea', def: 'Find your grade level below. Tap to see all subjects with their assigned color codes. Use these to organize your folders, notebooks, and submissions consistently across all subjects.' },
    ]},
    { group: 'Gallery page', fields: [
      { key: 'gallery.eyebrow',  label: 'Eyebrow',  type: 'input',    def: 'Gallery' },
      { key: 'gallery.title',    label: 'Title',    type: 'input',    def: 'Moments at SLA' },
      { key: 'gallery.subtitle', label: 'Description', type: 'textarea', def: 'A look at the events, milestones, and ordinary days that make our community.' },
    ]},
    { group: 'Contact page', fields: [
      { key: 'contact.eyebrow',      label: 'Eyebrow',  type: 'input',    def: 'Contact' },
      { key: 'contact.title',        label: 'Title',    type: 'input',    def: 'Send us a word.' },
      { key: 'contact.subtitle',     label: 'Description', type: 'textarea', def: 'Questions about enrollment, partnerships, or anything else — reach out through the form or any of the channels listed here.' },
      { key: 'contact.form_heading', label: 'Form heading', type: 'input', def: 'Drop us a message.' },
      { key: 'contact.form_note',    label: 'Form note',    type: 'textarea', def: "Your message goes straight to the SLA admin's inbox on this site. They'll email you back at the address you provide." },
    ]},
  ];

  let _siteTextSaved = {};

  async function loadSiteText() {
    const wrap = document.getElementById('site-text-groups');
    if (!wrap) return;
    const status = document.getElementById('site-text-status');
    if (status) status.textContent = '';

    let saved = {};
    try {
      const { data, error } = await window.sla.db.from('site_content').select('key,value');
      if (error) throw error;
      (data || []).forEach(r => { saved[r.key] = r.value; });
    } catch (e) {
      console.error('[site-text load]', e);
      wrap.innerHTML = '<div class="admin-empty">Could not load saved text. The site_content table may not exist yet — run the SQL, then refresh.</div>';
      return;
    }
    _siteTextSaved = saved;

    wrap.innerHTML = CONTENT_FIELDS.map(g => `
      <div class="site-text-group">
        <h3>${escapeHtml(g.group)}</h3>
        ${g.fields.map(f => `
          <div class="site-text-field">
            <div class="site-text-label">
              <span>${escapeHtml(f.label)}</span>
              <button type="button" class="site-text-reset" data-key="${f.key}">Reset</button>
            </div>
            ${f.type === 'textarea'
              ? `<textarea data-key="${f.key}" rows="3"></textarea>`
              : `<input type="text" data-key="${f.key}" />`}
          </div>`).join('')}
      </div>`).join('');

    // Fill values via DOM property (no escaping headaches)
    CONTENT_FIELDS.forEach(g => g.fields.forEach(f => {
      const el = wrap.querySelector(`[data-key="${f.key}"]`);
      if (!el) return;
      const sv = saved[f.key];
      el.value = (typeof sv === 'string' && sv.trim() !== '') ? sv : f.def;
    }));

    wrap.querySelectorAll('.site-text-reset').forEach(btn => {
      btn.addEventListener('click', () => {
        const key = btn.dataset.key;
        let field = null;
        CONTENT_FIELDS.forEach(g => g.fields.forEach(f => { if (f.key === key) field = f; }));
        const el = wrap.querySelector(`[data-key="${key}"]`);
        if (el && field) el.value = field.def;
      });
    });
  }

  async function saveSiteText() {
    const wrap = document.getElementById('site-text-groups');
    const status = document.getElementById('site-text-status');
    if (!wrap) return;
    if (status) status.textContent = 'Saving…';

    const now = new Date().toISOString();
    const toUpsert = [], toDelete = [];
    CONTENT_FIELDS.forEach(g => g.fields.forEach(f => {
      const el = wrap.querySelector(`[data-key="${f.key}"]`);
      if (!el) return;
      const cur = el.value;
      const sv = _siteTextSaved[f.key];
      if (cur.trim() === f.def.trim()) {
        if (sv !== undefined) toDelete.push(f.key);   // back to default → remove override
      } else if (cur !== sv) {
        toUpsert.push({ key: f.key, value: cur, updated_at: now, updated_by: profile.id });
      }
    }));

    if (!toUpsert.length && !toDelete.length) {
      if (status) status.textContent = 'No changes to save.';
      return;
    }
    try {
      if (toUpsert.length) {
        const { error } = await window.sla.db.from('site_content').upsert(toUpsert, { onConflict: 'key' });
        if (error) throw error;
      }
      if (toDelete.length) {
        const { error } = await window.sla.db.from('site_content').delete().in('key', toDelete);
        if (error) throw error;
      }
      if (status) status.textContent = `✓ Saved (${toUpsert.length} updated${toDelete.length ? ', ' + toDelete.length + ' reset' : ''}).`;
      await loadSiteText();
    } catch (e) {
      console.error('[site-text save]', e);
      if (status) status.textContent = 'Could not save: ' + (e.message || e);
    }
  }

  // ============================================================
  // MESSAGES
  // ============================================================
  async function loadMessages() {
    const list = document.getElementById('messages-list');
    list.innerHTML = '<div class="admin-empty">Loading messages…</div>';
    const { data, error } = await window.sla.db.from('contact_messages').select('*').order('received_at', { ascending:false }).limit(100);
    if (error) { list.innerHTML = `<div class="admin-empty">Failed: ${escapeHtml(error.message)}</div>`; return; }
    if (!data || !data.length) { list.innerHTML = '<div class="admin-empty">No messages yet.</div>'; return; }
    list.innerHTML = data.map(m => {
      const name = `${m.first_name || ''} ${m.last_name || ''}`.trim() || m.email || 'Anonymous';
      return `<div class="admin-list-item ${m.is_read ? '' : 'unread'}" data-id="${m.id}">
        <div><strong>${escapeHtml(name)}</strong><div class="meta">${escapeHtml(m.subject || '(no subject)')} — ${escapeHtml(m.email || '')}</div></div>
        <div class="meta">${timeAgo(m.received_at)}</div>
      </div>`;
    }).join('');
    list.querySelectorAll('.admin-list-item').forEach(item => item.addEventListener('click', () => viewMessage(item.dataset.id)));
  }
  async function viewMessage(id) {
    const { data: m } = await window.sla.db.from('contact_messages').select('*').eq('id', id).single();
    if (!m) return;
    if (!m.is_read) await window.sla.db.from('contact_messages').update({ is_read: true }).eq('id', id);
    const name = `${m.first_name || ''} ${m.last_name || ''}`.trim() || 'Anonymous';
    const modal = document.createElement('div');
    modal.className = 'admin-modal';
    modal.innerHTML = `<div class="admin-modal-content">
      <button class="admin-modal-close">×</button>
      <div class="message-detail">
        <div class="from-info"><strong>${escapeHtml(name)}</strong><span>${escapeHtml(m.email || 'no email')} · ${new Date(m.received_at).toLocaleString()}</span></div>
        <div class="subject">${escapeHtml(m.subject || '(no subject)')}</div>
        <div class="body">${escapeHtml(m.message || '')}</div>
        ${m.email ? `<a href="mailto:${encodeURIComponent(m.email)}?subject=Re: ${encodeURIComponent(m.subject || '')}" class="btn btn-primary" style="margin-top:1.5rem;display:inline-flex;">Reply via email</a>` : ''}
      </div>
    </div>`;
    document.body.appendChild(modal);
    modal.querySelector('.admin-modal-close').addEventListener('click', () => modal.remove());
    modal.addEventListener('click', e => { if (e.target === modal) modal.remove(); });
    document.addEventListener('keydown', function esc(e) { if (e.key === 'Escape') { modal.remove(); document.removeEventListener('keydown', esc); } });
    loadMessages(); loadDashboard();
  }

  // ============================================================
  // ADMINS
  // ============================================================
  async function loadAdmins() {
    const list = document.getElementById('admins-list');
    list.innerHTML = '<div class="admin-empty">Loading…</div>';
    const { data, error } = await window.sla.db.from('profiles').select('id, email, full_name, role, is_main_admin, last_seen_at').eq('role', 'admin').order('is_main_admin', { ascending:false }).order('created_at', { ascending:true });
    if (error) { list.innerHTML = `<div class="admin-empty">Failed: ${escapeHtml(error.message)}</div>`; return; }
    if (!data || !data.length) { list.innerHTML = '<div class="admin-empty">No admins.</div>'; return; }
    list.innerHTML = data.map(a => {
      const name = a.full_name || a.email.split('@')[0];
      const isMe = a.email === profile.email;
      const canDemote = !a.is_main_admin && !isMe && profile.is_main_admin;
      return `<div class="admins-list-item">
        <div class="admin-user-avatar">${escapeHtml(name.charAt(0).toUpperCase())}</div>
        <div><strong>${escapeHtml(name)}${isMe ? ' (you)' : ''}</strong><div class="meta">${escapeHtml(a.email)} ${a.last_seen_at ? '· last seen ' + timeAgo(a.last_seen_at) : ''}</div></div>
        <div>
          <span class="role-badge ${a.is_main_admin ? 'main' : ''}">${a.is_main_admin ? 'Main Admin' : 'Admin'}</span>
          ${canDemote ? `<button data-demote="${a.id}" data-email="${escapeHtml(a.email)}">Remove</button>` : ''}
        </div>
      </div>`;
    }).join('');
    list.querySelectorAll('[data-demote]').forEach(btn => {
      btn.addEventListener('click', async () => {
        if (!confirm(`Remove admin role from ${btn.dataset.email}?`)) return;
        const { error } = await window.sla.db.from('profiles').update({ role:'member' }).eq('id', btn.dataset.demote);
        if (error) { alert('Failed: ' + error.message); return; }
        loadAdmins(); loadDashboard();
      });
    });
  }

  const promoteBtn = document.getElementById('promote-btn');
  if (promoteBtn) {
    promoteBtn.addEventListener('click', async () => {
      const emailInput = document.getElementById('promote-email');
      const feedback = document.getElementById('promote-feedback');
      const email = (emailInput.value || '').trim().toLowerCase();
      feedback.className = 'admin-feedback';
      feedback.textContent = '';
      if (!email || !/@slasm\.net$/.test(email)) { feedback.classList.add('error'); feedback.textContent = 'Must be a @slasm.net address.'; return; }
      const { data: target, error: findErr } = await window.sla.db.from('profiles').select('id, email, role').eq('email', email).maybeSingle();
      if (findErr) { feedback.classList.add('error'); feedback.textContent = 'Lookup failed: ' + findErr.message; return; }
      if (!target) { feedback.classList.add('error'); feedback.textContent = 'User not found. They need to sign in at least once first.'; return; }
      if (target.role === 'admin') { feedback.classList.add('error'); feedback.textContent = 'Already an admin.'; return; }
      const { error: updErr } = await window.sla.db.from('profiles').update({ role:'admin' }).eq('id', target.id);
      if (updErr) { feedback.classList.add('error'); feedback.textContent = 'Update failed: ' + updErr.message; return; }
      feedback.classList.add('success'); feedback.textContent = `${email} is now an admin.`;
      emailInput.value = '';
      loadAdmins();
    });
  }

  // ============================================================
  // ANNOUNCEMENTS
  // ============================================================
  async function loadAnnouncements() {
    const list = document.getElementById('ann-list');
    if (!list) return;
    list.innerHTML = '<div class="admin-empty">Loading…</div>';
    const { data, error } = await window.sla.db.from('announcements').select('*').order('is_active', { ascending:false }).order('created_at', { ascending:false });
    if (error) { list.innerHTML = `<div class="admin-empty">Failed: ${escapeHtml(error.message)}</div>`; return; }
    if (!data || !data.length) { list.innerHTML = '<div class="admin-empty">No announcements yet. Use the form above to create one.</div>'; return; }
    list.innerHTML = data.map(a => `
      <div class="admin-list-item" style="cursor:default;">
        <div>
          <strong>${escapeHtml(a.title)} ${a.is_active ? '<span class="role-badge" style="background:#1E8E3E;margin-left:.4rem;">Active</span>' : ''}</strong>
          <div class="meta">${escapeHtml(a.body.slice(0, 100))}${a.body.length > 100 ? '…' : ''}</div>
        </div>
        <div style="display:flex;gap:.5rem;">
          <button class="ann-edit" data-id="${a.id}" style="padding:.4rem .8rem;font-size:.78rem;border-radius:8px;border:1px solid rgba(0,0,0,.1);background:white;cursor:pointer;font-family:inherit;">Edit</button>
          <button class="ann-del" data-id="${a.id}" style="padding:.4rem .8rem;font-size:.78rem;border-radius:8px;border:1px solid rgba(0,0,0,.1);background:white;cursor:pointer;font-family:inherit;color:#DC2626;">Delete</button>
        </div>
      </div>
    `).join('');
    list.querySelectorAll('.ann-edit').forEach(btn => btn.addEventListener('click', () => editAnnouncement(btn.dataset.id)));
    list.querySelectorAll('.ann-del').forEach(btn => btn.addEventListener('click', () => deleteAnnouncement(btn.dataset.id)));
  }
  function clearAnnouncementForm() {
    ['ann-id','ann-title','ann-body','ann-link-text','ann-link-url'].forEach(id => { const el = document.getElementById(id); if (el) el.value = ''; });
    const active = document.getElementById('ann-active'); if (active) active.checked = false;
    document.getElementById('ann-form-title').textContent = 'Create new announcement';
    document.getElementById('ann-cancel').style.display = 'none';
    const fb = document.getElementById('ann-feedback'); if (fb) { fb.textContent = ''; fb.className = 'admin-feedback'; }
  }
  async function editAnnouncement(id) {
    const { data, error } = await window.sla.db.from('announcements').select('*').eq('id', id).single();
    if (error || !data) return;
    document.getElementById('ann-id').value = data.id;
    document.getElementById('ann-title').value = data.title || '';
    document.getElementById('ann-body').value = data.body || '';
    document.getElementById('ann-link-text').value = data.link_text || '';
    document.getElementById('ann-link-url').value = data.link_url || '';
    document.getElementById('ann-active').checked = !!data.is_active;
    document.getElementById('ann-form-title').textContent = 'Edit announcement';
    document.getElementById('ann-cancel').style.display = 'inline-flex';
    document.getElementById('ann-form-title').scrollIntoView({ behavior:'smooth', block:'start' });
  }
  async function deleteAnnouncement(id) {
    if (!confirm('Delete this announcement?')) return;
    const { error } = await window.sla.db.from('announcements').delete().eq('id', id);
    if (error) { alert('Failed: ' + error.message); return; }
    loadAnnouncements();
  }
  async function saveAnnouncement() {
    const feedback = document.getElementById('ann-feedback');
    feedback.className = 'admin-feedback'; feedback.textContent = '';
    const id = document.getElementById('ann-id').value || null;
    const title = document.getElementById('ann-title').value.trim();
    const body = document.getElementById('ann-body').value.trim();
    const linkText = document.getElementById('ann-link-text').value.trim() || null;
    const linkUrl = document.getElementById('ann-link-url').value.trim() || null;
    const isActive = document.getElementById('ann-active').checked;
    if (!title || !body) { feedback.classList.add('error'); feedback.textContent = 'Title and body are required.'; return; }
    if (isActive) {
      let q = window.sla.db.from('announcements').update({ is_active:false }).eq('is_active', true);
      if (id) q = q.neq('id', id);
      await q;
    }
    const payload = { title, body, link_text:linkText, link_url:linkUrl, is_active:isActive };
    const result = id ? await window.sla.db.from('announcements').update(payload).eq('id', id) : await window.sla.db.from('announcements').insert(payload);
    if (result.error) { feedback.classList.add('error'); feedback.textContent = 'Save failed: ' + result.error.message; return; }
    feedback.classList.add('success'); feedback.textContent = id ? 'Updated.' : 'Created.';
    clearAnnouncementForm(); loadAnnouncements(); loadDashboard();
  }
  document.addEventListener('click', e => {
    if (e.target && e.target.id === 'ann-save') saveAnnouncement();
    if (e.target && e.target.id === 'ann-cancel') clearAnnouncementForm();
  });

  // ============================================================
  // SCHEDULE
  // ============================================================
  async function loadSchedule() {
    const editor = document.getElementById('schedule-editor');
    editor.innerHTML = '<div class="admin-empty">Loading…</div>';
    const { data, error } = await window.sla.db.from('schedule_links').select('*').order('level_group').order('sort_order');
    if (error) { editor.innerHTML = `<div class="admin-empty">Failed: ${escapeHtml(error.message)}</div>`; return; }
    if (!data || !data.length) { editor.innerHTML = '<div class="admin-empty">No grades. Run the seed SQL first.</div>'; return; }
    const groups = {};
    data.forEach(r => { if (!groups[r.level_group]) groups[r.level_group] = []; groups[r.level_group].push(r); });
    editor.innerHTML = Object.entries(groups).map(([key, rows]) => `
      <div class="admin-grade-group">
        <h4>${escapeHtml(LEVEL_LABELS[key] || key)}</h4>
        <div class="admin-grade-rows">
          ${rows.map(r => `<div class="admin-grade-row" data-id="${r.id}">
            <span class="admin-grade-name">${escapeHtml(r.grade_level)}</span>
            <input type="url" class="admin-grade-url" placeholder="https://drive.google.com/…" value="${escapeHtml(r.drive_url || '')}" />
            <button class="admin-grade-save">Save</button>
            <span class="admin-grade-feedback"></span>
          </div>`).join('')}
        </div>
      </div>
    `).join('');
    editor.querySelectorAll('.admin-grade-save').forEach(btn => {
      btn.addEventListener('click', async () => {
        const row = btn.closest('.admin-grade-row');
        const fb = row.querySelector('.admin-grade-feedback');
        fb.textContent = 'Saving…'; fb.className = 'admin-grade-feedback';
        const { error } = await window.sla.db.from('schedule_links').update({ drive_url: row.querySelector('.admin-grade-url').value.trim() || null, updated_at: new Date().toISOString() }).eq('id', row.dataset.id);
        if (error) { fb.textContent = '✗ ' + error.message; fb.classList.add('error'); }
        else { fb.textContent = '✓ Saved'; fb.classList.add('success'); setTimeout(() => { fb.textContent = ''; fb.className = 'admin-grade-feedback'; }, 2000); }
      });
    });
  }

  // ============================================================
  // CLASSROOMS
  // ============================================================
  async function loadClassrooms() {
    const editor = document.getElementById('classrooms-editor');
    editor.innerHTML = '<div class="admin-empty">Loading…</div>';
    const { data, error } = await window.sla.db.from('classroom_links').select('*').order('level_group').order('sort_order');
    if (error) { editor.innerHTML = `<div class="admin-empty">Failed: ${escapeHtml(error.message)}</div>`; return; }
    if (!data || !data.length) { editor.innerHTML = '<div class="admin-empty">No grades. Run the seed SQL first.</div>'; return; }
    const groups = {};
    data.forEach(r => { if (!groups[r.level_group]) groups[r.level_group] = []; groups[r.level_group].push(r); });
    editor.innerHTML = Object.entries(groups).map(([key, rows]) => `
      <div class="admin-grade-group">
        <h4>${escapeHtml(LEVEL_LABELS[key] || key)}</h4>
        <div class="admin-grade-rows">
          ${rows.map(r => `<div class="admin-grade-row" data-id="${r.id}">
            <span class="admin-grade-name">${escapeHtml(r.grade_level)}</span>
            <input type="url" class="admin-grade-url" placeholder="https://drive.google.com/…" value="${escapeHtml(r.classroom_url || '')}" />
            <button class="admin-grade-save">Save</button>
            <span class="admin-grade-feedback"></span>
          </div>`).join('')}
        </div>
      </div>
    `).join('');
    editor.querySelectorAll('.admin-grade-save').forEach(btn => {
      btn.addEventListener('click', async () => {
        const row = btn.closest('.admin-grade-row');
        const fb = row.querySelector('.admin-grade-feedback');
        fb.textContent = 'Saving…'; fb.className = 'admin-grade-feedback';
        const { error } = await window.sla.db.from('classroom_links').update({ classroom_url: row.querySelector('.admin-grade-url').value.trim() || null, classroom_code: null, updated_at: new Date().toISOString() }).eq('id', row.dataset.id);
        if (error) { fb.textContent = '✗ ' + error.message; fb.classList.add('error'); }
        else { fb.textContent = '✓ Saved'; fb.classList.add('success'); setTimeout(() => { fb.textContent = ''; fb.className = 'admin-grade-feedback'; }, 2000); }
      });
    });
  }

  // ============================================================
  // PORTFOLIO
  // ============================================================
  async function loadPortfolio() {
    const editor = document.getElementById('portfolio-editor');
    editor.innerHTML = '<div class="admin-empty">Loading…</div>';
    const { data, error } = await window.sla.db.from('portfolio_subjects').select('*').order('grade_level').order('sort_order');
    if (error) { editor.innerHTML = `<div class="admin-empty">Failed: ${escapeHtml(error.message)}</div>`; return; }
    const groups = {};
    PORTFOLIO_GRADES.forEach(g => { groups[g] = []; });
    (data || []).forEach(r => { if (!groups[r.grade_level]) groups[r.grade_level] = []; groups[r.grade_level].push(r); });
    // Render the known grades first, then any extra grades found in the DB
    const extraGrades = Object.keys(groups).filter(g => !PORTFOLIO_GRADES.includes(g));
    const renderGrades = [...PORTFOLIO_GRADES, ...extraGrades];
    editor.innerHTML = `<div class="admin-card"><div id="portfolio-grades">
      ${renderGrades.map(grade => {
        const subjects = groups[grade] || [];
        return `<div class="portfolio-grade-block" data-grade="${escapeHtml(grade)}">
          <h4>${escapeHtml(grade)} <span class="meta">(${subjects.length} subjects)</span></h4>
          <div class="portfolio-subjects">
            ${subjects.map(s => `<div class="portfolio-subject-row" data-id="${s.id}">
              <input type="color" class="portfolio-color" value="${escapeHtml(s.color_hex)}" />
              <input type="text" class="portfolio-name" value="${escapeHtml(s.subject_name)}" />
              <input type="text" class="portfolio-label" placeholder="Color label" value="${escapeHtml(s.color_label || '')}" />
              <button class="portfolio-save-btn">Save</button>
              <button class="portfolio-del-btn">×</button>
            </div>`).join('')}
          </div>
          <div class="portfolio-add-row">
            <input type="color" class="portfolio-new-color" value="#888888" />
            <input type="text" class="portfolio-new-name" placeholder="Subject name" />
            <input type="text" class="portfolio-new-label" placeholder="Color label" />
            <button class="portfolio-add-btn">+ Add</button>
          </div>
        </div>`;
      }).join('')}
    </div></div>`;
    wirePortfolio();
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
        const { error } = await window.sla.db.from('portfolio_subjects').insert({ grade_level: grade, subject_name: name, color_hex: color, color_label: label, sort_order: 99 });
        if (error) { alert('Failed: ' + error.message); return; }
        loadPortfolio();
      });
    });
    document.querySelectorAll('.portfolio-save-btn').forEach(btn => {
      btn.addEventListener('click', async () => {
        const row = btn.closest('.portfolio-subject-row');
        const { error } = await window.sla.db.from('portfolio_subjects').update({ color_hex: row.querySelector('.portfolio-color').value, subject_name: row.querySelector('.portfolio-name').value.trim(), color_label: row.querySelector('.portfolio-label').value.trim() || null }).eq('id', row.dataset.id);
        if (error) { alert('Failed: ' + error.message); return; }
        btn.textContent = '✓';
        setTimeout(() => { btn.textContent = 'Save'; }, 1500);
      });
    });
    document.querySelectorAll('.portfolio-del-btn').forEach(btn => {
      btn.addEventListener('click', async () => {
        const row = btn.closest('.portfolio-subject-row');
        if (!confirm('Delete this subject?')) return;
        const { error } = await window.sla.db.from('portfolio_subjects').delete().eq('id', row.dataset.id);
        if (error) { alert('Failed: ' + error.message); return; }
        loadPortfolio();
      });
    });
  }

  // ============================================================
  // TEACHERS
  // ============================================================
  async function loadTeachers() {
    const grid = document.getElementById('teachers-grid');
    grid.innerHTML = '<div class="admin-empty">Loading…</div>';
    try {
      const { data, error } = await window.sla.db.from('teachers').select('*').order('sort_order', { ascending:true }).order('created_at', { ascending:true });
      if (error) { grid.innerHTML = `<div class="admin-empty" style="color:#DC2626;">Error: ${escapeHtml(error.message)}</div>`; return; }
      if (!data || !data.length) { grid.innerHTML = '<div class="admin-empty">No teachers yet. Click "+ Add teacher" to add the first one.</div>'; return; }
      grid.innerHTML = data.map(t => {
        const initial = (t.full_name || '?').charAt(0).toUpperCase();
        const photoHtml = t.photo_url ? `<img src="${escapeHtml(t.photo_url)}" alt="" loading="lazy" />` : `<span>${escapeHtml(initial)}</span>`;
        return `<div class="teacher-admin-card ${t.is_visible ? '' : 'hidden-teacher'}" data-id="${t.id}" draggable="true">
          <div class="teacher-drag-handle" title="Drag to reorder">⋮⋮</div>
          <div class="teacher-admin-photo">${photoHtml}</div>
          <div class="teacher-admin-info"><strong>${escapeHtml(t.full_name)}</strong><div class="meta">${escapeHtml(t.role || 'No role set')}</div></div>
        </div>`;
      }).join('');

      // Click → edit modal (ignore clicks on the drag handle)
      grid.querySelectorAll('.teacher-admin-card').forEach(card => {
        card.addEventListener('click', e => {
          if (e.target.classList.contains('teacher-drag-handle')) return;
          openTeacherModal(card.dataset.id);
        });
      });

      wireTeacherDragDrop(grid);
    } catch (e) {
      console.error('[teachers]', e);
      grid.innerHTML = `<div class="admin-empty" style="color:#DC2626;">Unexpected error: ${escapeHtml(e.message)}</div>`;
    }
  }

  // ---- DRAG TO REORDER ----
  function wireTeacherDragDrop(grid) {
    let draggedCard = null;

    grid.querySelectorAll('.teacher-admin-card').forEach(card => {
      card.addEventListener('dragstart', e => {
        draggedCard = card;
        card.classList.add('dragging');
        e.dataTransfer.effectAllowed = 'move';
        // Firefox needs data set or drag won't start
        e.dataTransfer.setData('text/plain', card.dataset.id);
      });

      card.addEventListener('dragend', () => {
        card.classList.remove('dragging');
        grid.querySelectorAll('.teacher-admin-card').forEach(c => c.classList.remove('drop-target'));
        draggedCard = null;
      });

      card.addEventListener('dragover', e => {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
        if (card === draggedCard) return;
        card.classList.add('drop-target');
      });

      card.addEventListener('dragleave', () => {
        card.classList.remove('drop-target');
      });

      card.addEventListener('drop', async e => {
        e.preventDefault();
        card.classList.remove('drop-target');
        if (!draggedCard || draggedCard === card) return;

        // Reorder in DOM: place draggedCard before this card
        const draggedRect = draggedCard.getBoundingClientRect();
        const targetRect = card.getBoundingClientRect();
        // Decide before or after based on cursor position
        const dropAfter = (e.clientY - targetRect.top) > (targetRect.height / 2)
                       || (e.clientX - targetRect.left) > (targetRect.width / 2);
        if (dropAfter) card.parentNode.insertBefore(draggedCard, card.nextSibling);
        else card.parentNode.insertBefore(draggedCard, card);

        // Persist new order
        await persistTeacherOrder(grid);
      });
    });
  }

  async function persistTeacherOrder(grid) {
    const cards = grid.querySelectorAll('.teacher-admin-card');
    const updates = [];
    cards.forEach((card, idx) => {
      updates.push({ id: card.dataset.id, sort_order: idx });
    });
    // Batch-update each teacher's sort_order. (Supabase upsert with onConflict
    // could do it in one round-trip, but plain updates are safer with RLS.)
    try {
      await Promise.all(updates.map(u =>
        window.sla.db.from('teachers').update({ sort_order: u.sort_order }).eq('id', u.id)
      ));
      // Show a transient indicator
      const toast = document.createElement('div');
      toast.textContent = '✓ Order saved';
      toast.style.cssText = 'position:fixed;bottom:1.5rem;right:1.5rem;background:#1E8E3E;color:white;padding:.65rem 1.1rem;border-radius:999px;font-size:.85rem;font-weight:500;z-index:9999;box-shadow:0 8px 24px rgba(0,0,0,.15);animation:fadeInOut 2.5s ease forwards;';
      document.body.appendChild(toast);
      setTimeout(() => toast.remove(), 2500);
    } catch (e) {
      console.error('[reorder]', e);
      alert('Failed to save order: ' + e.message);
      loadTeachers(); // refresh to true server state
    }
  }

  let currentPhotoFile = null;
  let currentPhotoUrl = null;
  const teacherModal = document.getElementById('teacher-modal');

  function openTeacherModal(id) {
    resetTeacherForm();
    document.getElementById('teacher-modal-title').textContent = id ? 'Edit teacher' : 'Add teacher';
    document.getElementById('teacher-delete-btn').style.display = id ? 'inline-flex' : 'none';
    if (id) loadTeacherIntoForm(id);
    teacherModal.hidden = false;
    document.body.style.overflow = 'hidden';
  }
  function closeTeacherModal() {
    teacherModal.hidden = true;
    document.body.style.overflow = '';
    resetTeacherForm();
  }
  function resetTeacherForm() {
    ['teacher-id','teacher-name','teacher-role','teacher-email','teacher-whatsapp','teacher-tm','teacher-globe','teacher-zoom','teacher-meetingid','teacher-passcode','teacher-photo-url'].forEach(id => { const el = document.getElementById(id); if (el) el.value = ''; });
    const vis = document.getElementById('teacher-visible'); if (vis) vis.checked = true;
    const sort = document.getElementById('teacher-sort'); if (sort) sort.value = '0';
    const photoInput = document.getElementById('teacher-photo-input'); if (photoInput) photoInput.value = '';
    const preview = document.getElementById('teacher-photo-preview'); if (preview) preview.innerHTML = '<span class="teacher-photo-hint">Click or drop image</span>';
    const clear = document.getElementById('teacher-photo-clear'); if (clear) clear.style.display = 'none';
    const fb = document.getElementById('teacher-form-feedback'); if (fb) { fb.textContent = ''; fb.className = 'admin-feedback'; }
    currentPhotoFile = null; currentPhotoUrl = null;
  }
  async function loadTeacherIntoForm(id) {
    const { data: t } = await window.sla.db.from('teachers').select('*').eq('id', id).single();
    if (!t) return;
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

  document.getElementById('teacher-add-btn').addEventListener('click', () => openTeacherModal(null));
  document.getElementById('teacher-modal-close').addEventListener('click', closeTeacherModal);
  document.getElementById('teacher-cancel-btn').addEventListener('click', closeTeacherModal);
  teacherModal.addEventListener('click', e => { if (e.target === teacherModal) closeTeacherModal(); });
  document.addEventListener('keydown', e => { if (e.key === 'Escape' && !teacherModal.hidden) closeTeacherModal(); });

  const photoArea  = document.querySelector('.teacher-photo-area');
  const photoInput = document.getElementById('teacher-photo-input');
  const photoPreview = document.getElementById('teacher-photo-preview');
  const photoUrlInput = document.getElementById('teacher-photo-url');
  const photoClear = document.getElementById('teacher-photo-clear');

  function handlePhotoFile(file) {
    if (!file || !file.type.startsWith('image/')) { alert('Please use an image file.'); return; }
    if (file.size > 5 * 1024 * 1024) { alert('Image must be under 5 MB.'); return; }
    currentPhotoFile = file; currentPhotoUrl = null; photoUrlInput.value = '';
    const reader = new FileReader();
    reader.onload = e => { photoPreview.innerHTML = `<img src="${e.target.result}" alt="" />`; photoClear.style.display = 'inline-flex'; };
    reader.readAsDataURL(file);
  }
  photoInput.addEventListener('change', e => { if (e.target.files[0]) handlePhotoFile(e.target.files[0]); });
  ['dragenter','dragover'].forEach(ev => photoArea.addEventListener(ev, e => { e.preventDefault(); photoArea.classList.add('dragging'); }));
  ['dragleave','drop'].forEach(ev => photoArea.addEventListener(ev, e => { e.preventDefault(); photoArea.classList.remove('dragging'); }));
  photoArea.addEventListener('drop', e => { if (e.dataTransfer.files[0]) handlePhotoFile(e.dataTransfer.files[0]); });
  photoUrlInput.addEventListener('input', () => {
    const url = photoUrlInput.value.trim();
    if (url && /^https?:\/\//.test(url)) { currentPhotoUrl = url; currentPhotoFile = null; photoPreview.innerHTML = `<img src="${escapeHtml(url)}" alt="" />`; photoClear.style.display = 'inline-flex'; }
  });
  photoClear.addEventListener('click', () => { currentPhotoFile = null; currentPhotoUrl = null; photoUrlInput.value = ''; photoInput.value = ''; photoPreview.innerHTML = '<span class="teacher-photo-hint">Click or drop image</span>'; photoClear.style.display = 'none'; });

  async function uploadPhotoToStorage(file) {
    const ext = (file.name.split('.').pop() || 'jpg').toLowerCase().replace(/[^a-z0-9]/g, '');
    const safeExt = ['jpg','jpeg','png','webp','gif'].includes(ext) ? ext : 'jpg';
    const path = `teachers/${Date.now()}-${Math.random().toString(36).slice(2,8)}.${safeExt}`;
    const { data, error } = await window.sla.db.storage.from('sla-media').upload(path, file, { cacheControl:'3600', upsert:false, contentType:file.type });
    if (error) throw error;
    const { data: urlData } = window.sla.db.storage.from('sla-media').getPublicUrl(data.path);
    return urlData.publicUrl;
  }

  document.getElementById('teacher-save-btn').addEventListener('click', async () => {
    const fb = document.getElementById('teacher-form-feedback');
    fb.className = 'admin-feedback'; fb.textContent = '';
    const name = document.getElementById('teacher-name').value.trim();
    if (!name) { fb.classList.add('error'); fb.textContent = 'Full name is required.'; return; }
    const saveBtn = document.getElementById('teacher-save-btn');
    saveBtn.disabled = true; saveBtn.textContent = 'Saving…';
    try {
      let photoUrl = currentPhotoUrl;
      if (currentPhotoFile) { photoArea.classList.add('teacher-uploading'); photoUrl = await uploadPhotoToStorage(currentPhotoFile); photoArea.classList.remove('teacher-uploading'); }
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
      const result = id ? await window.sla.db.from('teachers').update(payload).eq('id', id) : await window.sla.db.from('teachers').insert(payload);
      if (result.error) throw result.error;
      closeTeacherModal(); loadTeachers(); loadDashboard();
    } catch (e) {
      photoArea.classList.remove('teacher-uploading');
      fb.classList.add('error'); fb.textContent = 'Failed: ' + (e.message || e);
    } finally {
      saveBtn.disabled = false; saveBtn.textContent = 'Save';
    }
  });

  document.getElementById('teacher-delete-btn').addEventListener('click', async () => {
    const id = document.getElementById('teacher-id').value;
    if (!id) return;
    if (!confirm(`Delete ${document.getElementById('teacher-name').value}? This cannot be undone.`)) return;
    try {
      if (currentPhotoUrl && currentPhotoUrl.includes('/storage/v1/object/public/sla-media/')) {
        const path = currentPhotoUrl.split('/sla-media/').pop();
        if (path) await window.sla.db.storage.from('sla-media').remove([path]).catch(() => {});
      }
      const { error } = await window.sla.db.from('teachers').delete().eq('id', id);
      if (error) throw error;
      closeTeacherModal(); loadTeachers(); loadDashboard();
    } catch (e) { alert('Failed: ' + (e.message || e)); }
  });


  // ============================================================
  // GALLERY — Sets and photos
  // ============================================================
  async function loadGallery() {
    const list = document.getElementById('gallery-sets-list');
    list.innerHTML = '<div class="admin-empty">Loading…</div>';

    const { data: sets, error } = await window.sla.db
      .from('gallery_sets').select('*')
      .order('sort_order', { ascending: true })
      .order('created_at', { ascending: false });

    if (error) { list.innerHTML = `<div class="admin-empty">Failed: ${escapeHtml(error.message)}</div>`; return; }
    if (!sets || sets.length === 0) {
      list.innerHTML = '<div class="admin-empty">No gallery sets yet. Click "+ New set" to create one.</div>';
      return;
    }

    // Count photos per set
    const setIds = sets.map(s => s.id);
    const { data: photos } = await window.sla.db
      .from('gallery_photos').select('id, set_id').in('set_id', setIds);
    const photoCount = {};
    (photos || []).forEach(p => { photoCount[p.set_id] = (photoCount[p.set_id] || 0) + 1; });

    list.innerHTML = sets.map(s => `
      <div class="gset-card ${s.is_visible ? '' : 'gset-hidden'}" data-id="${s.id}" draggable="true">
        <div class="gset-head">
          <div class="gset-drag" title="Drag to reorder">⋮⋮</div>
          <div class="gset-titlewrap">
            <strong>${escapeHtml(s.title)}</strong>
            <div class="meta">${escapeHtml(s.meta || '')}${s.event_date ? ' · ' + new Date(s.event_date).toLocaleDateString() : ''} · ${photoCount[s.id] || 0} photos${s.is_visible ? '' : ' · Hidden'}</div>
          </div>
          <div class="gset-actions">
            <button class="gset-toggle" data-id="${s.id}">Manage photos ▾</button>
            <button class="gset-edit" data-id="${s.id}">Edit</button>
            <button class="gset-del" data-id="${s.id}">Delete</button>
          </div>
        </div>
        <div class="gset-photos" id="gset-photos-${s.id}" hidden></div>
      </div>
    `).join('');

    list.querySelectorAll('.gset-toggle').forEach(btn => {
      btn.addEventListener('click', () => toggleSetPhotos(btn.dataset.id, btn));
    });
    list.querySelectorAll('.gset-edit').forEach(btn => {
      btn.addEventListener('click', () => editGallerySet(btn.dataset.id));
    });
    list.querySelectorAll('.gset-del').forEach(btn => {
      btn.addEventListener('click', () => deleteGallerySet(btn.dataset.id));
    });

    wireGallerySetDragDrop(list);
  }

  // ---- DRAG TO REORDER GALLERY SETS ----
  function wireGallerySetDragDrop(list) {
    let dragged = null;
    list.querySelectorAll('.gset-card').forEach(card => {
      card.addEventListener('dragstart', e => {
        // Only start a set-drag from the card chrome — never from buttons,
        // inputs, or the expanded photo panel (which has its own drag-reorder).
        if (e.target.closest('button, input, textarea, .gset-photos')) {
          e.preventDefault();
          return;
        }
        dragged = card;
        card.classList.add('dragging');
        e.dataTransfer.effectAllowed = 'move';
        e.dataTransfer.setData('text/plain', card.dataset.id);
      });
      card.addEventListener('dragend', () => {
        card.classList.remove('dragging');
        list.querySelectorAll('.gset-card').forEach(c => c.classList.remove('drop-target'));
        dragged = null;
      });
      card.addEventListener('dragover', e => {
        if (!dragged) return;
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
        if (card !== dragged) card.classList.add('drop-target');
      });
      card.addEventListener('dragleave', () => card.classList.remove('drop-target'));
      card.addEventListener('drop', async e => {
        e.preventDefault();
        card.classList.remove('drop-target');
        if (!dragged || dragged === card) return;
        const rect = card.getBoundingClientRect();
        const dropAfter = (e.clientY - rect.top) > (rect.height / 2);
        if (dropAfter) card.parentNode.insertBefore(dragged, card.nextSibling);
        else card.parentNode.insertBefore(dragged, card);
        await persistGallerySetOrder(list);
      });
    });
  }

  async function persistGallerySetOrder(list) {
    const cards = [...list.querySelectorAll('.gset-card')];
    try {
      await Promise.all(cards.map((card, idx) =>
        window.sla.db.from('gallery_sets').update({ sort_order: idx }).eq('id', card.dataset.id)
      ));
      const toast = document.createElement('div');
      toast.textContent = '✓ Order saved';
      toast.style.cssText = 'position:fixed;bottom:1.5rem;right:1.5rem;background:#1E8E3E;color:white;padding:.65rem 1.1rem;border-radius:999px;font-size:.85rem;font-weight:500;z-index:9999;box-shadow:0 8px 24px rgba(0,0,0,.15);animation:fadeInOut 2.5s ease forwards;';
      document.body.appendChild(toast);
      setTimeout(() => toast.remove(), 2500);
    } catch (e) {
      console.error('[gallery reorder]', e);
      alert('Failed to save order: ' + e.message);
      loadGallery();
    }
  }

  async function toggleSetPhotos(setId, btn) {
    const panel = document.getElementById('gset-photos-' + setId);
    if (!panel.hidden) {
      panel.hidden = true;
      btn.textContent = 'Manage photos ▾';
      return;
    }
    btn.textContent = 'Hide photos ▴';
    panel.hidden = false;
    panel.innerHTML = '<div class="admin-empty">Loading photos…</div>';

    const { data: photos } = await window.sla.db
      .from('gallery_photos').select('*')
      .eq('set_id', setId)
      .order('sort_order', { ascending: true });

    panel.innerHTML = `
      <div class="shuffle-dropzone" data-set-id="${setId}">
        <input type="file" class="gset-file-input" accept="image/*" multiple hidden />
        <span>Click or drop images to upload to this set</span>
      </div>
      <div class="gset-photo-status admin-feedback"></div>
      <div class="gset-photo-grid">
        ${(photos || []).map(p => `
          <div class="gset-photo" data-id="${p.id}" draggable="true">
            <img src="${escapeHtml(p.photo_url)}" alt="" />
            <input type="text" class="gset-photo-caption" placeholder="Caption (optional)" value="${escapeHtml(p.caption || '')}" />
            <div class="gset-photo-actions">
              <button class="gset-photo-save">Save</button>
              <button class="gset-photo-del">×</button>
            </div>
          </div>
        `).join('')}
      </div>
    `;

    wireGsetPhotoControls(panel, setId);
  }

  function wireGsetPhotoControls(panel, setId) {
    const dropzone = panel.querySelector('.shuffle-dropzone');
    const input = dropzone.querySelector('.gset-file-input');
    const status = panel.querySelector('.gset-photo-status');

    dropzone.addEventListener('click', () => input.click());
    ['dragenter', 'dragover'].forEach(ev => dropzone.addEventListener(ev, e => {
      e.preventDefault(); dropzone.classList.add('dragging');
    }));
    ['dragleave', 'drop'].forEach(ev => dropzone.addEventListener(ev, e => {
      e.preventDefault(); dropzone.classList.remove('dragging');
    }));
    dropzone.addEventListener('drop', e => uploadGalleryPhotos(e.dataTransfer.files, setId, status, panel));
    input.addEventListener('change', e => uploadGalleryPhotos(e.target.files, setId, status, panel));

    panel.querySelectorAll('.gset-photo-save').forEach(btn => {
      btn.addEventListener('click', async () => {
        const photo = btn.closest('.gset-photo');
        const caption = photo.querySelector('.gset-photo-caption').value.trim() || null;
        const { error } = await window.sla.db.from('gallery_photos').update({ caption }).eq('id', photo.dataset.id);
        if (error) { alert('Failed: ' + error.message); return; }
        btn.textContent = '✓';
        setTimeout(() => { btn.textContent = 'Save'; }, 1500);
      });
    });
    panel.querySelectorAll('.gset-photo-del').forEach(btn => {
      btn.addEventListener('click', async () => {
        const photo = btn.closest('.gset-photo');
        if (!confirm('Delete this photo?')) return;
        const img = photo.querySelector('img');
        if (img && img.src.includes('/storage/v1/object/public/sla-media/')) {
          const path = img.src.split('/sla-media/').pop();
          if (path) await window.sla.db.storage.from('sla-media').remove([path]).catch(() => {});
        }
        const { error } = await window.sla.db.from('gallery_photos').delete().eq('id', photo.dataset.id);
        if (error) { alert('Failed: ' + error.message); return; }
        photo.remove();
        loadGallery(); // refresh counts
      });
    });

    // Drag-to-reorder photos
    wireGalleryPhotoDrag(panel, setId);
  }

  function wireGalleryPhotoDrag(panel, setId) {
    let dragged = null;
    panel.querySelectorAll('.gset-photo').forEach(card => {
      card.addEventListener('dragstart', e => {
        dragged = card;
        card.classList.add('dragging');
        e.dataTransfer.effectAllowed = 'move';
        e.dataTransfer.setData('text/plain', card.dataset.id);
      });
      card.addEventListener('dragend', () => {
        card.classList.remove('dragging');
        panel.querySelectorAll('.gset-photo').forEach(c => c.classList.remove('drop-target'));
      });
      card.addEventListener('dragover', e => {
        e.preventDefault();
        if (card !== dragged) card.classList.add('drop-target');
      });
      card.addEventListener('dragleave', () => card.classList.remove('drop-target'));
      card.addEventListener('drop', async e => {
        e.preventDefault();
        card.classList.remove('drop-target');
        if (!dragged || dragged === card) return;
        const targetRect = card.getBoundingClientRect();
        const dropAfter = (e.clientY - targetRect.top) > targetRect.height / 2
                       || (e.clientX - targetRect.left) > targetRect.width / 2;
        if (dropAfter) card.parentNode.insertBefore(dragged, card.nextSibling);
        else card.parentNode.insertBefore(dragged, card);

        const ids = Array.from(panel.querySelectorAll('.gset-photo')).map(c => c.dataset.id);
        await Promise.all(ids.map((id, i) =>
          window.sla.db.from('gallery_photos').update({ sort_order: i }).eq('id', id)
        ));
      });
    });
  }

  async function uploadGalleryPhotos(files, setId, statusEl, panel) {
    if (!files || !files.length) return;
    const list = Array.from(files).filter(f => f.type.startsWith('image/'));
    if (!list.length) { statusEl.textContent = 'No image files selected.'; statusEl.className = 'gset-photo-status admin-feedback error'; return; }

    statusEl.className = 'gset-photo-status admin-feedback';
    statusEl.textContent = `Uploading 0 of ${list.length}…`;

    let uploaded = 0;
    for (const file of list) {
      if (file.size > 5 * 1024 * 1024) {
        statusEl.textContent = `Skipping ${file.name} (over 5 MB)`;
        continue;
      }
      try {
        const ext = (file.name.split('.').pop() || 'jpg').toLowerCase().replace(/[^a-z0-9]/g, '');
        const safeExt = ['jpg','jpeg','png','webp','gif'].includes(ext) ? ext : 'jpg';
        const path = `gallery/${setId}/${Date.now()}-${Math.random().toString(36).slice(2,8)}.${safeExt}`;
        const { data, error } = await window.sla.db.storage.from('sla-media').upload(path, file, { cacheControl:'3600', upsert:false, contentType:file.type });
        if (error) throw error;
        const { data: urlData } = window.sla.db.storage.from('sla-media').getPublicUrl(data.path);
        await window.sla.db.from('gallery_photos').insert({
          set_id: setId, photo_url: urlData.publicUrl, sort_order: 999,
        });
        uploaded++;
        statusEl.textContent = `Uploading ${uploaded} of ${list.length}…`;
      } catch (e) {
        console.error('[upload]', file.name, e);
        statusEl.textContent = `Error: ${e.message}`;
        statusEl.className = 'gset-photo-status admin-feedback error';
      }
    }
    statusEl.textContent = `✓ Uploaded ${uploaded} of ${list.length}.`;
    statusEl.className = 'gset-photo-status admin-feedback success';
    // Refresh the panel
    const btn = panel.closest('.gset-card').querySelector('.gset-toggle');
    panel.hidden = true;
    toggleSetPhotos(setId, btn);
    loadGallery(); // update counts
  }

  // Create / edit set — uses inline modal form (not prompts)
  const gsetModal = document.getElementById('gset-modal');
  function openGsetModal(id) {
    document.getElementById('gset-id').value = '';
    document.getElementById('gset-title').value = '';
    document.getElementById('gset-meta').value = '';
    document.getElementById('gset-date').value = '';
    document.getElementById('gset-visible').checked = true;
    document.querySelectorAll('input[name="gset-size"]').forEach(r => { r.checked = (r.value === 'medium'); });
    document.querySelectorAll('input[name="gset-layout"]').forEach(r => { r.checked = (r.value === 'landscape'); });
    document.getElementById('gset-form-feedback').textContent = '';
    document.getElementById('gset-form-feedback').className = 'admin-feedback';
    document.getElementById('gset-modal-title').textContent = id ? 'Edit gallery set' : 'New gallery set';

    if (id) {
      window.sla.db.from('gallery_sets').select('*').eq('id', id).single().then(({ data }) => {
        if (!data) return;
        document.getElementById('gset-id').value = data.id;
        document.getElementById('gset-title').value = data.title || '';
        document.getElementById('gset-meta').value = data.meta || '';
        document.getElementById('gset-date').value = data.event_date || '';
        document.getElementById('gset-visible').checked = !!data.is_visible;
        const size = data.size_class || 'medium';
        document.querySelectorAll('input[name="gset-size"]').forEach(r => { r.checked = (r.value === size); });
        const layout = data.layout || 'landscape';
        document.querySelectorAll('input[name="gset-layout"]').forEach(r => { r.checked = (r.value === layout); });
      });
    }
    gsetModal.hidden = false;
    document.body.style.overflow = 'hidden';
  }
  function closeGsetModal() {
    gsetModal.hidden = true;
    document.body.style.overflow = '';
  }
  document.getElementById('gset-modal-close').addEventListener('click', closeGsetModal);
  document.getElementById('gset-cancel-btn').addEventListener('click', closeGsetModal);
  gsetModal.addEventListener('click', e => { if (e.target === gsetModal) closeGsetModal(); });
  document.addEventListener('keydown', e => { if (e.key === 'Escape' && !gsetModal.hidden) closeGsetModal(); });

  document.getElementById('gset-save-btn').addEventListener('click', async () => {
    const fb = document.getElementById('gset-form-feedback');
    fb.className = 'admin-feedback'; fb.textContent = '';
    const title = document.getElementById('gset-title').value.trim();
    if (!title) { fb.classList.add('error'); fb.textContent = 'Title is required.'; return; }
    const sizeRadio = document.querySelector('input[name="gset-size"]:checked');
    const layoutRadio = document.querySelector('input[name="gset-layout"]:checked');
    const payload = {
      title,
      meta: document.getElementById('gset-meta').value.trim() || null,
      event_date: document.getElementById('gset-date').value || null,
      is_visible: document.getElementById('gset-visible').checked,
      size_class: sizeRadio ? sizeRadio.value : 'medium',
      layout: layoutRadio ? layoutRadio.value : 'landscape',
    };
    const id = document.getElementById('gset-id').value;
    const save = (p) => id
      ? window.sla.db.from('gallery_sets').update(p).eq('id', id)
      : window.sla.db.from('gallery_sets').insert(p);
    let result = await save(payload);
    // Backward-compat: if the `layout` column hasn't been added to the DB yet
    // (see docs/migrations), drop it and retry so saving never breaks.
    if (result.error && /layout/.test(result.error.message)) {
      const { layout, ...rest } = payload;
      result = await save(rest);
    }
    if (result.error) { fb.classList.add('error'); fb.textContent = 'Save failed: ' + result.error.message; return; }
    closeGsetModal();
    loadGallery();
  });

  function editGallerySet(id) { openGsetModal(id); }

  async function deleteGallerySet(id) {
    if (!confirm('Delete this gallery set? All its photos will also be deleted.')) return;
    const { data: photos } = await window.sla.db.from('gallery_photos').select('photo_url').eq('set_id', id);
    const paths = (photos || [])
      .map(p => p.photo_url)
      .filter(u => u.includes('/storage/v1/object/public/sla-media/'))
      .map(u => u.split('/sla-media/').pop())
      .filter(Boolean);
    if (paths.length) await window.sla.db.storage.from('sla-media').remove(paths).catch(() => {});
    const { error } = await window.sla.db.from('gallery_sets').delete().eq('id', id);
    if (error) { alert('Failed: ' + error.message); return; }
    loadGallery();
  }

  document.addEventListener('click', e => {
    if (e.target && e.target.id === 'gset-add-btn') openGsetModal(null);
  });


  // ============================================================
  // HOME SHUFFLE — Images for the rotating card on homepage
  // ============================================================
  async function loadHomeShuffle() {
    const grid = document.getElementById('shuffle-grid');
    grid.innerHTML = '<div class="admin-empty">Loading…</div>';

    const { data, error } = await window.sla.db.from('home_shuffle_images')
      .select('*').order('sort_order', { ascending: true }).order('created_at', { ascending: true });
    if (error) { grid.innerHTML = `<div class="admin-empty">Failed: ${escapeHtml(error.message)}</div>`; return; }

    if (!data || !data.length) {
      grid.innerHTML = '<div class="admin-empty">No images yet. Upload some above.</div>';
    } else {
      grid.innerHTML = data.map(img => `
        <div class="shuffle-admin-card${img.is_visible ? '' : ' hidden-shuffle'}" data-id="${img.id}" draggable="true">
          <img src="${escapeHtml(img.image_url)}" alt="" />
          <input type="text" class="shuffle-caption" placeholder="Caption (shown on card)" value="${escapeHtml(img.caption || '')}" />
          <div class="shuffle-card-actions">
            <label style="display:flex;align-items:center;gap:.3rem;font-size:.78rem;">
              <input type="checkbox" class="shuffle-visible" ${img.is_visible ? 'checked' : ''} /> Show
            </label>
            <button class="shuffle-save">Save</button>
            <button class="shuffle-del">×</button>
          </div>
        </div>
      `).join('');

      grid.querySelectorAll('.shuffle-save').forEach(btn => {
        btn.addEventListener('click', async () => {
          const card = btn.closest('.shuffle-admin-card');
          const fields = {
            caption: card.querySelector('.shuffle-caption').value.trim() || null,
            is_visible: card.querySelector('.shuffle-visible').checked,
          };
          const { error } = await window.sla.db.from('home_shuffle_images').update(fields).eq('id', card.dataset.id);
          if (error) { alert('Failed: ' + error.message); return; }
          btn.textContent = '✓';
          setTimeout(() => { btn.textContent = 'Save'; }, 1500);
          card.classList.toggle('hidden-shuffle', !fields.is_visible);
        });
      });
      grid.querySelectorAll('.shuffle-del').forEach(btn => {
        btn.addEventListener('click', async () => {
          const card = btn.closest('.shuffle-admin-card');
          if (!confirm('Delete this image?')) return;
          const img = card.querySelector('img');
          if (img && img.src.includes('/storage/v1/object/public/sla-media/')) {
            const path = img.src.split('/sla-media/').pop();
            if (path) await window.sla.db.storage.from('sla-media').remove([path]).catch(() => {});
          }
          const { error } = await window.sla.db.from('home_shuffle_images').delete().eq('id', card.dataset.id);
          if (error) { alert('Failed: ' + error.message); return; }
          loadHomeShuffle();
        });
      });

      // Drag reorder
      let dragged = null;
      grid.querySelectorAll('.shuffle-admin-card').forEach(card => {
        card.addEventListener('dragstart', e => { dragged = card; card.classList.add('dragging'); e.dataTransfer.effectAllowed = 'move'; e.dataTransfer.setData('text/plain', card.dataset.id); });
        card.addEventListener('dragend', () => { card.classList.remove('dragging'); grid.querySelectorAll('.shuffle-admin-card').forEach(c => c.classList.remove('drop-target')); });
        card.addEventListener('dragover', e => { e.preventDefault(); if (card !== dragged) card.classList.add('drop-target'); });
        card.addEventListener('dragleave', () => card.classList.remove('drop-target'));
        card.addEventListener('drop', async e => {
          e.preventDefault();
          card.classList.remove('drop-target');
          if (!dragged || dragged === card) return;
          const rect = card.getBoundingClientRect();
          const after = (e.clientY - rect.top) > rect.height / 2 || (e.clientX - rect.left) > rect.width / 2;
          if (after) card.parentNode.insertBefore(dragged, card.nextSibling);
          else card.parentNode.insertBefore(dragged, card);
          const ids = Array.from(grid.querySelectorAll('.shuffle-admin-card')).map(c => c.dataset.id);
          await Promise.all(ids.map((id, i) =>
            window.sla.db.from('home_shuffle_images').update({ sort_order: i }).eq('id', id)
          ));
        });
      });
    }

    // Wire up the dropzone (only needs wiring once, but easier to re-wire each load)
    const dropzone = document.getElementById('shuffle-drop');
    const fileInput = document.getElementById('shuffle-file-input');
    const status = document.getElementById('shuffle-upload-status');

    // Remove existing listeners by cloning
    const newDropzone = dropzone.cloneNode(true);
    dropzone.parentNode.replaceChild(newDropzone, dropzone);
    const newInput = document.getElementById('shuffle-file-input');

    newDropzone.addEventListener('click', () => newInput.click());
    ['dragenter','dragover'].forEach(ev => newDropzone.addEventListener(ev, e => { e.preventDefault(); newDropzone.classList.add('dragging'); }));
    ['dragleave','drop'].forEach(ev => newDropzone.addEventListener(ev, e => { e.preventDefault(); newDropzone.classList.remove('dragging'); }));
    newDropzone.addEventListener('drop', e => uploadShuffleImages(e.dataTransfer.files, status));
    newInput.addEventListener('change', e => uploadShuffleImages(e.target.files, status));
  }

  async function uploadShuffleImages(files, statusEl) {
    if (!files || !files.length) return;
    const list = Array.from(files).filter(f => f.type.startsWith('image/'));
    if (!list.length) { statusEl.textContent = 'No image files.'; statusEl.className = 'admin-feedback error'; return; }
    statusEl.className = 'admin-feedback';
    statusEl.textContent = `Uploading 0 of ${list.length}…`;

    let uploaded = 0;
    for (const file of list) {
      if (file.size > 5 * 1024 * 1024) { statusEl.textContent = `Skipping ${file.name}: over 5 MB`; continue; }
      try {
        const ext = (file.name.split('.').pop() || 'jpg').toLowerCase().replace(/[^a-z0-9]/g, '');
        const safeExt = ['jpg','jpeg','png','webp','gif'].includes(ext) ? ext : 'jpg';
        const path = `home-shuffle/${Date.now()}-${Math.random().toString(36).slice(2,8)}.${safeExt}`;
        const { data, error } = await window.sla.db.storage.from('sla-media').upload(path, file, { cacheControl:'3600', upsert:false, contentType:file.type });
        if (error) throw error;
        const { data: urlData } = window.sla.db.storage.from('sla-media').getPublicUrl(data.path);
        await window.sla.db.from('home_shuffle_images').insert({
          image_url: urlData.publicUrl, sort_order: 999, is_visible: true,
        });
        uploaded++;
        statusEl.textContent = `Uploading ${uploaded} of ${list.length}…`;
      } catch (e) {
        console.error('[shuffle-upload]', file.name, e);
        statusEl.textContent = `Error: ${e.message}`;
        statusEl.className = 'admin-feedback error';
      }
    }
    statusEl.textContent = `✓ Uploaded ${uploaded} of ${list.length}.`;
    statusEl.className = 'admin-feedback success';
    loadHomeShuffle();
  }


})();
