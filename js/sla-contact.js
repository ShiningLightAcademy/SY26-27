/* ============================================================
   SHINING LIGHT ACADEMY — Contact Form Handler
   
   This replaces the old mailto behaviour. Form submissions now
   go straight into the contact_messages table.
   
   Requires:
   - sla-auth.js loaded first (creates window.slaClient).
   - A signed-in user with @slasm.net email (RLS will reject others).
   ============================================================ */

(function () {
  'use strict';

  document.addEventListener('DOMContentLoaded', () => {
    const sendBtn = document.getElementById('sendBtn');
    if (!sendBtn) return;

    sendBtn.addEventListener('click', async (e) => {
      e.preventDefault();

      const fn = document.getElementById('firstName').value.trim();
      const ln = document.getElementById('lastName').value.trim();
      const em = document.getElementById('email').value.trim();
      const sub = document.getElementById('subject').value.trim();
      const msg = document.getElementById('message').value.trim();

      // Basic validation.
      if (!fn || !ln || !em || !sub || !msg) {
        showStatus('Please fill in all fields.', 'error');
        return;
      }
      if (!em.includes('@')) {
        showStatus('Please enter a valid email address.', 'error');
        return;
      }

      // Disable button + show spinner state.
      const originalLabel = sendBtn.innerHTML;
      sendBtn.disabled = true;
      sendBtn.style.opacity = '0.6';
      sendBtn.innerHTML = 'Sending…';

      try {
        if (!window.slaClient) throw new Error('Supabase client not initialized.');

        const { error } = await window.slaClient
          .from('contact_messages')
          .insert([{
            first_name: fn,
            last_name: ln,
            email: em,
            subject: sub,
            message: msg
          }]);

        if (error) throw error;

        // Success.
        showStatus('Message sent. Thank you!', 'success');
        document.getElementById('firstName').value = '';
        document.getElementById('lastName').value = '';
        document.getElementById('email').value = '';
        document.getElementById('subject').value = '';
        document.getElementById('message').value = '';
      } catch (err) {
        console.error('[Contact form]', err);
        showStatus('Could not send: ' + (err.message || 'unknown error'), 'error');
      } finally {
        sendBtn.disabled = false;
        sendBtn.style.opacity = '1';
        sendBtn.innerHTML = originalLabel;
      }
    });
  });

  function showStatus(text, kind) {
    let el = document.getElementById('contact-status');
    if (!el) {
      el = document.createElement('div');
      el.id = 'contact-status';
      el.style.cssText = `
        margin-top: 1rem; padding: 0.85rem 1rem;
        border-radius: 8px; font-size: 0.9rem; text-align: center;
        font-family: var(--font-body, system-ui);
      `;
      const sendBtn = document.getElementById('sendBtn');
      sendBtn.parentNode.insertBefore(el, sendBtn.nextSibling);
    }
    if (kind === 'success') {
      el.style.background = 'rgba(20, 43, 111, 0.08)';
      el.style.color = '#142B6F';
      el.style.border = '1px solid rgba(20, 43, 111, 0.2)';
    } else {
      el.style.background = 'rgba(160, 82, 45, 0.1)';
      el.style.color = '#7A3E1E';
      el.style.border = '1px solid rgba(160, 82, 45, 0.3)';
    }
    el.textContent = text;
  }
})();
