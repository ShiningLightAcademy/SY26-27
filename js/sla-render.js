/* ============================================================
   SHINING LIGHT ACADEMY — Public Page Renderer
   
   Fetches data from Supabase and renders into the public pages.
   Each public page calls one render function, scoped to its own
   container. Falls back gracefully if no data exists yet.
   ============================================================ */

(function () {
  'use strict';

  // ---- Wait for slaClient (created by sla-auth.js) ----
  function ready(fn) {
    let attempts = 0;
    const iv = setInterval(() => {
      attempts++;
      if (window.slaClient) {
        clearInterval(iv);
        fn();
      } else if (attempts > 60) {
        clearInterval(iv);
        console.error('[Render] slaClient not available.');
      }
    }, 100);
  }

  function escape(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, c => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
    }[c]));
  }

  // ============================================================
  // TEACHERS
  // ============================================================
  window.slaRenderTeachers = async function (containerId) {
    ready(async () => {
      const container = document.getElementById(containerId);
      if (!container) return;
      const { data, error } = await window.slaClient
        .from('teachers')
        .select('*')
        .order('display_order', { ascending: true });

      if (error) {
        container.innerHTML = `<p style="grid-column: 1 / -1; color: var(--ink-mute); font-style: italic;">Could not load teachers.</p>`;
        return;
      }
      if (!data || data.length === 0) {
        container.innerHTML = `<p style="grid-column: 1 / -1; color: var(--ink-mute); font-style: italic; text-align: center; padding: 2rem;">No teachers added yet. Check back soon.</p>`;
        return;
      }

      container.innerHTML = data.map(t => {
        const firstInitial = (t.name || '?').charAt(0).toUpperCase();
        const photoOrInitial = t.photo_url
          ? `<img src="${escape(t.photo_url)}" alt="${escape(t.name)}" />`
          : `<span class="teacher-initial">${firstInitial}</span>`;
        return `
          <article class="teacher-card reveal in">
            <div class="teacher-photo">${photoOrInitial}</div>
            <h4>${escape(t.name)}</h4>
            <div class="teacher-role">${escape(t.role || '')}</div>
            ${t.bio ? `<p class="teacher-bio">${escape(t.bio)}</p>` : ''}
          </article>
        `;
      }).join('');
    });
  };

  // ============================================================
  // CLASSROOMS
  // ============================================================
  window.slaRenderClassrooms = async function (containerId) {
    ready(async () => {
      const container = document.getElementById(containerId);
      if (!container) return;
      const { data, error } = await window.slaClient
        .from('classrooms')
        .select('*')
        .order('display_order', { ascending: true });

      if (error) {
        container.innerHTML = `<p style="grid-column: 1 / -1; color: var(--ink-mute); font-style: italic;">Could not load classrooms.</p>`;
        return;
      }
      if (!data || data.length === 0) {
        container.innerHTML = `<p style="grid-column: 1 / -1; color: var(--ink-mute); font-style: italic; text-align: center; padding: 2rem;">No classrooms added yet.</p>`;
        return;
      }

      container.innerHTML = data.map(c => `
        <a href="${c.classroom_url ? escape(c.classroom_url) : '#'}" 
           target="_blank" rel="noopener" class="classroom-card reveal in">
          <div>
            <div class="classroom-subject">${escape(c.subject)}</div>
            ${c.teacher_name ? `<div class="classroom-teacher">${escape(c.teacher_name)}</div>` : ''}
          </div>
          <div class="classroom-meta">
            <span>${escape(c.grade_level || '')}</span>
            <span class="classroom-link">${c.classroom_url ? 'Join →' : '(no link)'}</span>
          </div>
        </a>
      `).join('');
    });
  };

  // ============================================================
  // SCHEDULE
  // ============================================================
  window.slaRenderSchedule = async function (tbodyId) {
    ready(async () => {
      const tbody = document.getElementById(tbodyId);
      if (!tbody) return;
      const { data, error } = await window.slaClient
        .from('schedule_entries')
        .select('*')
        .order('display_order', { ascending: true });

      if (error) {
        tbody.innerHTML = `<tr><td colspan="6" style="text-align: center; padding: 2rem; color: var(--ink-mute); font-style: italic;">Could not load schedule.</td></tr>`;
        return;
      }
      if (!data || data.length === 0) {
        tbody.innerHTML = `<tr><td colspan="6" style="text-align: center; padding: 2rem; color: var(--ink-mute); font-style: italic;">No schedule yet.</td></tr>`;
        return;
      }

      // Group entries by time_label.
      const groups = new Map();
      for (const entry of data) {
        if (!groups.has(entry.time_label)) {
          groups.set(entry.time_label, {
            time_label: entry.time_label,
            is_break: false,
            display_order: entry.display_order ?? 0,
            days: {},
            break_label: ''
          });
        }
        const g = groups.get(entry.time_label);
        if ((entry.display_order ?? 0) < g.display_order) g.display_order = entry.display_order ?? 0;
        if (entry.is_break) {
          g.is_break = true;
          g.break_label = entry.subject || g.break_label;
        } else if (entry.day_of_week) {
          g.days[entry.day_of_week] = entry;
        }
      }

      const sortedGroups = Array.from(groups.values()).sort(
        (a, b) => a.display_order - b.display_order
      );

      tbody.innerHTML = sortedGroups.map(g => {
        if (g.is_break) {
          return `
            <tr>
              <td>${escape(g.time_label)}</td>
              <td colspan="5" style="font-style: italic; color: var(--gold-deep);">${escape(g.break_label)}</td>
            </tr>
          `;
        }
        return `
          <tr>
            <td>${escape(g.time_label)}</td>
            ${[1, 2, 3, 4, 5].map(dow => {
              const entry = g.days[dow];
              if (!entry) return '<td>—</td>';
              if (entry.classroom_url) {
                return `<td><a href="${escape(entry.classroom_url)}" target="_blank" rel="noopener" class="subject-link">${escape(entry.subject)}</a></td>`;
              }
              return `<td>${escape(entry.subject)}</td>`;
            }).join('')}
          </tr>
        `;
      }).join('');
    });
  };
})();
