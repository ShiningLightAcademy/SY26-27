/* ============================================================
   SHINING LIGHT ACADEMY — Admin Dashboard Logic
   
   Runs AFTER sla-auth.js has confirmed the user is signed in
   with an @slasm.net account. We do an additional check here
   to make sure the user is the site OWNER (SLA_OWNER_EMAIL).
   
   Provides full CRUD for: classrooms, teachers, schedule.
   Read-only view of: contact_messages.
   ============================================================ */

(function () {
  'use strict';

  // ---- Wait for the auth gate to settle ----
  // sla-auth.js removes the loading veil and creates window.slaClient.
  // We poll briefly until we can check the user's email.
  let attempts = 0;
  const startInterval = setInterval(async () => {
    attempts++;
    if (!window.slaClient && attempts < 50) return;
    clearInterval(startInterval);
    if (!window.slaClient) {
      console.error('[Admin] slaClient not available.');
      return;
    }
    await bootAdmin();
  }, 100);

  async function bootAdmin() {
    const { data: { session } } = await window.slaClient.auth.getSession();
    if (!session) return; // sla-auth.js handles redirect
    const email = (session.user.email || '').toLowerCase();
    const ownerEmail = (SLA_OWNER_EMAIL || '').toLowerCase();

    if (email !== ownerEmail) {
      // Show access denied
      document.getElementById('admin-shell').style.display = 'none';
      document.getElementById('denied-screen').style.display = 'block';
      document.getElementById('denied-email').textContent = email;
      return;
    }

    // Show the admin shell, wire it up.
    document.getElementById('admin-shell').style.display = 'block';
    initTabs();
    initFormHandlers();
    await Promise.all([
      loadClassrooms(),
      loadTeachers(),
      loadSchedule(),
      loadMessages()
    ]);
  }

  // ============================================================
  // TABS
  // ============================================================
  function initTabs() {
    document.querySelectorAll('.admin-tab').forEach(tab => {
      tab.addEventListener('click', () => {
        const target = tab.dataset.section;
        document.querySelectorAll('.admin-tab').forEach(t => t.classList.toggle('active', t === tab));
        document.querySelectorAll('.admin-section').forEach(s => {
          s.classList.toggle('active', s.id === 'section-' + target);
        });
      });
    });
  }

  // ============================================================
  // FORM HANDLERS (add/cancel buttons)
  // ============================================================
  function initFormHandlers() {
    document.querySelectorAll('[data-add]').forEach(btn => {
      btn.addEventListener('click', () => openForm(btn.dataset.add, null));
    });
    document.querySelectorAll('[data-cancel]').forEach(btn => {
      btn.addEventListener('click', () => closeForm(btn.dataset.cancel));
    });

    document.getElementById('form-classroom').addEventListener('submit', e => {
      e.preventDefault();
      saveClassroom();
    });
    document.getElementById('form-teacher').addEventListener('submit', e => {
      e.preventDefault();
      saveTeacher();
    });
    document.getElementById('form-schedule').addEventListener('submit', e => {
      e.preventDefault();
      saveSchedule();
    });
  }

  function openForm(kind, record) {
    const form = document.getElementById('form-' + kind);
    form.classList.add('show');
    form.reset();
    if (record) {
      // Edit mode — fill in fields
      Object.keys(record).forEach(key => {
        const field = form.querySelector(`[name="${key}"]`);
        if (field) field.value = record[key] === null ? '' : record[key];
      });
    } else {
      form.querySelector('[name="id"]').value = '';
    }
    form.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }

  function closeForm(kind) {
    const form = document.getElementById('form-' + kind);
    form.classList.remove('show');
    form.reset();
  }

  function formToObject(form) {
    const obj = {};
    new FormData(form).forEach((value, key) => {
      if (value === '' && key !== 'subject' && key !== 'name' && key !== 'role') {
        obj[key] = null;
      } else {
        obj[key] = value;
      }
    });
    if (obj.display_order !== null && obj.display_order !== undefined) {
      obj.display_order = parseInt(obj.display_order, 10) || 0;
    }
    if (obj.day_of_week !== null && obj.day_of_week !== undefined) {
      obj.day_of_week = parseInt(obj.day_of_week, 10);
    }
    if (obj.is_break !== undefined) {
      obj.is_break = obj.is_break === 'true' || obj.is_break === true;
    }
    if (obj.id === null || obj.id === '') delete obj.id;
    return obj;
  }

  // ============================================================
  // CLASSROOMS — CRUD
  // ============================================================
  async function loadClassrooms() {
    const { data, error } = await window.slaClient
      .from('classrooms')
      .select('*')
      .order('display_order', { ascending: true })
      .order('subject', { ascending: true });
    if (error) return toast('Failed to load classrooms: ' + error.message, true);
    renderClassrooms(data || []);
    document.getElementById('count-classrooms').textContent = (data || []).length;
  }

  function renderClassrooms(rows) {
    const container = document.getElementById('table-classrooms');
    if (rows.length === 0) {
      container.innerHTML = '<div class="admin-empty">No classrooms yet. Click "+ Add Classroom" to add one.</div>';
      return;
    }
    container.innerHTML = `
      <table class="admin-table">
        <thead>
          <tr>
            <th style="width:60px;">Order</th>
            <th>Subject</th>
            <th>Teacher</th>
            <th>Grade</th>
            <th>Link</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          ${rows.map(r => `
            <tr>
              <td>${r.display_order ?? 0}</td>
              <td><strong>${escape(r.subject)}</strong></td>
              <td>${escape(r.teacher_name || '—')}</td>
              <td>${escape(r.grade_level || '—')}</td>
              <td>${r.classroom_url ? `<a class="admin-link" href="${escapeAttr(r.classroom_url)}" target="_blank" rel="noopener">${escape(r.classroom_url)}</a>` : '—'}</td>
              <td>
                <div class="actions">
                  <button class="btn-edit" data-edit-classroom='${escapeAttr(JSON.stringify(r))}'>Edit</button>
                  <button class="btn-delete" data-delete-classroom="${r.id}">Delete</button>
                </div>
              </td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    `;
    container.querySelectorAll('[data-edit-classroom]').forEach(b => {
      b.addEventListener('click', () => openForm('classroom', JSON.parse(b.dataset.editClassroom)));
    });
    container.querySelectorAll('[data-delete-classroom]').forEach(b => {
      b.addEventListener('click', () => deleteRecord('classrooms', b.dataset.deleteClassroom, loadClassrooms));
    });
  }

  async function saveClassroom() {
    const form = document.getElementById('form-classroom');
    const obj = formToObject(form);
    const isUpdate = !!obj.id;
    const btn = form.querySelector('.btn-save');
    btn.disabled = true; btn.textContent = 'Saving…';
    try {
      const { error } = isUpdate
        ? await window.slaClient.from('classrooms').update(obj).eq('id', obj.id)
        : await window.slaClient.from('classrooms').insert([obj]);
      if (error) throw error;
      toast(isUpdate ? 'Classroom updated.' : 'Classroom added.');
      closeForm('classroom');
      await loadClassrooms();
    } catch (err) {
      toast('Save failed: ' + err.message, true);
    } finally {
      btn.disabled = false; btn.textContent = 'Save';
    }
  }

  // ============================================================
  // TEACHERS — CRUD
  // ============================================================
  async function loadTeachers() {
    const { data, error } = await window.slaClient
      .from('teachers')
      .select('*')
      .order('display_order', { ascending: true })
      .order('name', { ascending: true });
    if (error) return toast('Failed to load teachers: ' + error.message, true);
    renderTeachers(data || []);
    document.getElementById('count-teachers').textContent = (data || []).length;
  }

  function renderTeachers(rows) {
    const container = document.getElementById('table-teachers');
    if (rows.length === 0) {
      container.innerHTML = '<div class="admin-empty">No teachers yet. Click "+ Add Teacher" to add one.</div>';
      return;
    }
    container.innerHTML = `
      <table class="admin-table">
        <thead>
          <tr>
            <th style="width:60px;">Order</th>
            <th>Name</th>
            <th>Role</th>
            <th>Bio</th>
            <th>Photo</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          ${rows.map(r => `
            <tr>
              <td>${r.display_order ?? 0}</td>
              <td><strong>${escape(r.name)}</strong></td>
              <td>${escape(r.role || '—')}</td>
              <td style="max-width: 300px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${escape(r.bio || '—')}</td>
              <td>${r.photo_url ? '<span style="color: var(--gold-deep);">●</span> Yes' : '—'}</td>
              <td>
                <div class="actions">
                  <button class="btn-edit" data-edit-teacher='${escapeAttr(JSON.stringify(r))}'>Edit</button>
                  <button class="btn-delete" data-delete-teacher="${r.id}">Delete</button>
                </div>
              </td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    `;
    container.querySelectorAll('[data-edit-teacher]').forEach(b => {
      b.addEventListener('click', () => openForm('teacher', JSON.parse(b.dataset.editTeacher)));
    });
    container.querySelectorAll('[data-delete-teacher]').forEach(b => {
      b.addEventListener('click', () => deleteRecord('teachers', b.dataset.deleteTeacher, loadTeachers));
    });
  }

  async function saveTeacher() {
    const form = document.getElementById('form-teacher');
    const obj = formToObject(form);
    const isUpdate = !!obj.id;
    const btn = form.querySelector('.btn-save');
    btn.disabled = true; btn.textContent = 'Saving…';
    try {
      const { error } = isUpdate
        ? await window.slaClient.from('teachers').update(obj).eq('id', obj.id)
        : await window.slaClient.from('teachers').insert([obj]);
      if (error) throw error;
      toast(isUpdate ? 'Teacher updated.' : 'Teacher added.');
      closeForm('teacher');
      await loadTeachers();
    } catch (err) {
      toast('Save failed: ' + err.message, true);
    } finally {
      btn.disabled = false; btn.textContent = 'Save';
    }
  }

  // ============================================================
  // SCHEDULE — CRUD
  // ============================================================
  const DAY_NAMES = { 1: 'Monday', 2: 'Tuesday', 3: 'Wednesday', 4: 'Thursday', 5: 'Friday' };

  async function loadSchedule() {
    const { data, error } = await window.slaClient
      .from('schedule_entries')
      .select('*')
      .order('display_order', { ascending: true })
      .order('day_of_week', { ascending: true });
    if (error) return toast('Failed to load schedule: ' + error.message, true);
    renderSchedule(data || []);
    document.getElementById('count-schedule').textContent = (data || []).length;
  }

  function renderSchedule(rows) {
    const container = document.getElementById('table-schedule');
    if (rows.length === 0) {
      container.innerHTML = '<div class="admin-empty">No schedule entries yet. Click "+ Add Schedule Entry" to add one.</div>';
      return;
    }
    container.innerHTML = `
      <table class="admin-table">
        <thead>
          <tr>
            <th style="width:60px;">Order</th>
            <th>Day</th>
            <th>Time</th>
            <th>Subject</th>
            <th>Type</th>
            <th>Link</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          ${rows.map(r => `
            <tr>
              <td>${r.display_order ?? 0}</td>
              <td>${DAY_NAMES[r.day_of_week] || '?'}</td>
              <td>${escape(r.time_label)}</td>
              <td><strong>${escape(r.subject)}</strong></td>
              <td>${r.is_break ? '<em style="color: var(--gold-deep);">Break</em>' : 'Class'}</td>
              <td>${r.classroom_url ? `<a class="admin-link" href="${escapeAttr(r.classroom_url)}" target="_blank" rel="noopener">${escape(r.classroom_url)}</a>` : '—'}</td>
              <td>
                <div class="actions">
                  <button class="btn-edit" data-edit-schedule='${escapeAttr(JSON.stringify(r))}'>Edit</button>
                  <button class="btn-delete" data-delete-schedule="${r.id}">Delete</button>
                </div>
              </td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    `;
    container.querySelectorAll('[data-edit-schedule]').forEach(b => {
      b.addEventListener('click', () => openForm('schedule', JSON.parse(b.dataset.editSchedule)));
    });
    container.querySelectorAll('[data-delete-schedule]').forEach(b => {
      b.addEventListener('click', () => deleteRecord('schedule_entries', b.dataset.deleteSchedule, loadSchedule));
    });
  }

  async function saveSchedule() {
    const form = document.getElementById('form-schedule');
    const obj = formToObject(form);
    const isUpdate = !!obj.id;
    const btn = form.querySelector('.btn-save');
    btn.disabled = true; btn.textContent = 'Saving…';
    try {
      const { error } = isUpdate
        ? await window.slaClient.from('schedule_entries').update(obj).eq('id', obj.id)
        : await window.slaClient.from('schedule_entries').insert([obj]);
      if (error) throw error;
      toast(isUpdate ? 'Schedule entry updated.' : 'Schedule entry added.');
      closeForm('schedule');
      await loadSchedule();
    } catch (err) {
      toast('Save failed: ' + err.message, true);
    } finally {
      btn.disabled = false; btn.textContent = 'Save';
    }
  }

  // ============================================================
  // MESSAGES — read only
  // ============================================================
  async function loadMessages() {
    const { data, error } = await window.slaClient
      .from('contact_messages')
      .select('*')
      .order('created_at', { ascending: false });
    if (error) {
      document.getElementById('list-messages').innerHTML =
        '<div class="admin-empty">Could not load messages: ' + escape(error.message) + '</div>';
      return;
    }
    renderMessages(data || []);
    document.getElementById('count-messages').textContent = (data || []).length;
  }

  function renderMessages(rows) {
    const container = document.getElementById('list-messages');
    if (rows.length === 0) {
      container.innerHTML = '<div class="admin-empty">No messages yet.</div>';
      return;
    }
    container.innerHTML = rows.map(m => `
      <div class="message-card">
        <div class="message-meta">
          <span class="message-from">${escape(m.first_name)} ${escape(m.last_name)}</span>
          <span class="message-date">${formatDate(m.created_at)}</span>
        </div>
        <div class="message-subject">${escape(m.subject)}</div>
        <div class="message-body">${escape(m.message)}</div>
        <div class="message-email">${escape(m.email)}</div>
      </div>
    `).join('');
  }

  function formatDate(iso) {
    if (!iso) return '';
    const d = new Date(iso);
    return d.toLocaleString('en-PH', { dateStyle: 'medium', timeStyle: 'short' });
  }

  // ============================================================
  // DELETE (shared)
  // ============================================================
  async function deleteRecord(table, id, reload) {
    if (!confirm('Delete this record? This cannot be undone.')) return;
    const { error } = await window.slaClient.from(table).delete().eq('id', id);
    if (error) {
      toast('Delete failed: ' + error.message, true);
      return;
    }
    toast('Deleted.');
    await reload();
  }

  // ============================================================
  // TOAST
  // ============================================================
  let toastTimer;
  function toast(message, isError) {
    const el = document.getElementById('admin-toast');
    el.textContent = message;
    el.classList.toggle('error', !!isError);
    el.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => el.classList.remove('show'), 3200);
  }

  // ============================================================
  // ESCAPE HELPERS
  // ============================================================
  function escape(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, c => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
    }[c]));
  }
  function escapeAttr(s) { return escape(s); }
})();
