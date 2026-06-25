/* ============================================================
   SHINING LIGHT ACADEMY — Inline "Edit text" mode
   Lets signed-in admins edit any [data-content-key] text directly
   on the live page and save it to the site_content table.
   Members and visitors never see any of this.
   ============================================================ */
(function () {
  let editing = false;
  const originals = new Map(); // el -> { text, html }

  async function init() {
    if (!window.sla || typeof window.sla.getProfile !== 'function') return;
    if (!document.querySelector('[data-content-key]')) return; // nothing editable on this page
    let profile;
    try { profile = await window.sla.getProfile(); } catch (_) { return; }
    if (!profile || profile.role !== 'admin' || profile.is_active === false) return;

    injectPill();
    if (new URLSearchParams(location.search).get('edit') === '1') enterEdit();
  }

  function injectPill() {
    const pill = document.createElement('button');
    pill.id = 'edit-mode-pill';
    pill.type = 'button';
    pill.innerHTML = '<span class="emp-ico">\u270E</span><span class="emp-label">Edit text</span>';
    pill.addEventListener('click', () => editing ? exitEdit(false) : enterEdit());
    document.body.appendChild(pill);
  }

  function buildBar() {
    const bar = document.createElement('div');
    bar.id = 'edit-mode-bar';
    bar.innerHTML =
      '<span class="emb-status">Edit mode on — click any highlighted text to change it.</span>' +
      '<span class="emb-spacer"></span>' +
      '<button type="button" id="emb-save" class="emb-btn emb-save" disabled>Save changes</button>' +
      '<button type="button" id="emb-exit" class="emb-btn emb-exit">Exit</button>';
    document.body.appendChild(bar);
    document.getElementById('emb-save').addEventListener('click', saveAll);
    document.getElementById('emb-exit').addEventListener('click', () => exitEdit(false));
  }

  function countDirty() {
    let d = 0;
    originals.forEach((rec, el) => { if (el.textContent !== rec.text) d++; });
    return d;
  }

  function markDirty() {
    const btn = document.getElementById('emb-save');
    if (!btn) return;
    const d = countDirty();
    btn.disabled = d === 0;
    btn.textContent = d ? 'Save changes (' + d + ')' : 'Save changes';
  }

  function onKey(e) {
    if (e.key === 'Enter') { e.preventDefault(); e.target.blur(); }   // no messy newlines
    else if (e.key === 'Escape') { e.target.blur(); }
  }

  function enterEdit() {
    if (editing) return;
    editing = true;
    document.body.classList.add('editmode-on');
    const pill = document.getElementById('edit-mode-pill');
    if (pill) { pill.classList.add('is-on'); pill.querySelector('.emp-label').textContent = 'Editing…'; }
    originals.clear();
    document.querySelectorAll('[data-content-key]').forEach(el => {
      originals.set(el, { text: el.textContent, html: el.innerHTML });
      el.setAttribute('contenteditable', 'true');
      el.setAttribute('spellcheck', 'false');
      el.classList.add('emp-editable');
      el.addEventListener('input', markDirty);
      el.addEventListener('keydown', onKey);
    });
    buildBar();
  }

  async function saveAll() {
    const btn = document.getElementById('emb-save');
    const status = document.querySelector('#edit-mode-bar .emb-status');
    const changed = [];
    originals.forEach((rec, el) => {
      if (el.textContent !== rec.text) {
        const value = el.textContent.replace(/\u00a0/g, ' ').trim();
        changed.push({ el: el, key: el.getAttribute('data-content-key'), value: value });
      }
    });
    if (!changed.length) return;
    if (btn) { btn.disabled = true; btn.textContent = 'Saving…'; }
    try {
      const profile = await window.sla.getProfile();
      const now = new Date().toISOString();
      const rows = changed.map(c => ({
        key: c.key, value: c.value, updated_at: now, updated_by: profile ? profile.id : null
      }));
      const { error } = await window.sla.db.from('site_content').upsert(rows, { onConflict: 'key' });
      if (error) throw error;
      changed.forEach(c => {
        const rec = originals.get(c.el);
        if (rec) { rec.text = c.el.textContent; rec.html = c.el.innerHTML; }
      });
      if (status) status.textContent = '\u2713 Saved ' + changed.length + ' change' + (changed.length > 1 ? 's' : '') + '.';
      markDirty();
    } catch (e) {
      console.error('[edit-mode save]', e);
      if (status) status.textContent = 'Could not save: ' + (e.message || e);
      if (btn) { btn.disabled = false; btn.textContent = 'Save changes'; }
    }
  }

  function exitEdit(skipPrompt) {
    if (!editing) return;
    const dirty = countDirty();
    if (dirty && !skipPrompt) {
      if (!window.confirm('You have ' + dirty + ' unsaved change' + (dirty > 1 ? 's' : '') + '. Leave edit mode and discard them?')) return;
      originals.forEach((rec, el) => { el.innerHTML = rec.html; }); // restore exactly (keeps accent styling)
    }
    editing = false;
    document.body.classList.remove('editmode-on');
    const pill = document.getElementById('edit-mode-pill');
    if (pill) { pill.classList.remove('is-on'); pill.querySelector('.emp-label').textContent = 'Edit text'; }
    document.querySelectorAll('[data-content-key]').forEach(el => {
      el.removeAttribute('contenteditable');
      el.removeAttribute('spellcheck');
      el.classList.remove('emp-editable');
      el.removeEventListener('input', markDirty);
      el.removeEventListener('keydown', onKey);
    });
    const bar = document.getElementById('edit-mode-bar');
    if (bar) bar.remove();
    if (new URLSearchParams(location.search).get('edit') === '1') {
      history.replaceState({}, '', location.pathname);
    }
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
