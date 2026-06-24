/* ============================================================
   SHINING LIGHT ACADEMY — Supabase Client + Auth Helpers
   ============================================================
   This file initializes the Supabase JS SDK and exposes a
   simple namespace (window.sla) used by all other site pages.
   ============================================================ */

(function () {
  const SUPABASE_URL = 'https://sgilnlwunhcthrnywbxt.supabase.co';
  const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNnaWxubHd1bmhjdGhybnl3Ynh0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzk3MDY4MjAsImV4cCI6MjA5NTI4MjgyMH0.CwHYWAdTa1GjeJe0Fg4P0506p1okw5TpMq9d1pgJKmk';

  // The Supabase UMD bundle exposes `window.supabase` with createClient.
  // We use it to construct our own client and stash it on a separate namespace.
  if (!window.supabase || !window.supabase.createClient) {
    console.error('[SLA] Supabase SDK not loaded. Did you include the <script> tag?');
    return;
  }

  const client = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
      flowType: 'pkce',
    },
  });

  // ============================================================
  // Helper functions exposed on window.sla
  // ============================================================
  const sla = {
    db: client,

    async getSession() {
      const { data: { session } } = await client.auth.getSession();
      return session;
    },

    async getUser() {
      const { data: { user } } = await client.auth.getUser();
      return user;
    },

    async getProfile() {
      const user = await this.getUser();
      if (!user) return null;
      const { data, error } = await client
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();
      if (error) {
        console.error('[SLA] Failed to load profile:', error);
        return null;
      }
      return data;
    },

    async isAdmin() {
      const profile = await this.getProfile();
      return !!(profile && profile.role === 'admin' && profile.is_active);
    },

    async signInWithGoogle() {
      // Redirect target: same folder, but to index.html
      const path = window.location.pathname.replace(/login\.html$/, 'index.html');
      const redirectTo = window.location.origin + path;
      return await client.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo,
          queryParams: {
            // Force account chooser so user can pick the right @slasm.net account
            prompt: 'select_account',
          },
        },
      });
    },

    async signOut() {
      await client.auth.signOut();
      // Redirect to login page after sign-out
      const base = window.location.pathname.replace(/[^/]*$/, '');
      window.location.href = window.location.origin + base + 'login.html';
    },

    // Used on protected pages: if not signed in, send to login.html
    async requireAuth() {
      const session = await this.getSession();
      if (!session) {
        const base = window.location.pathname.replace(/[^/]*$/, '');
        const current = window.location.href;
        window.location.href = window.location.origin + base + 'login.html?next=' + encodeURIComponent(current);
        return null;
      }
      return session.user;
    },

    // Used on admin pages: redirect to home if not admin
    async requireAdmin() {
      const user = await this.requireAuth();
      if (!user) return null;
      const ok = await this.isAdmin();
      if (!ok) {
        const base = window.location.pathname.replace(/[^/]*$/, '');
        window.location.href = window.location.origin + base + 'index.html';
        return null;
      }
      return user;
    },

    // Bump last_seen_at on the user's profile (called by every protected page)
    async touchPresence() {
      const user = await this.getUser();
      if (!user) return;
      await client
        .from('profiles')
        .update({ last_seen_at: new Date().toISOString() })
        .eq('id', user.id);
    },

    // ---- LIVE PRESENCE (Realtime websocket) ----
    _presenceChannel: null,
    _presenceCallbacks: [],

    // Join the shared "online-users" channel and broadcast that this user is here.
    // Safe to call on every protected page; it only joins once per page load.
    async joinPresence() {
      if (this._presenceChannel) return this._presenceChannel;
      const user = await this.getUser();
      if (!user) return null;
      let profile = null;
      try { profile = await this.getProfile(); } catch (_) {}
      const meta = {
        user_id: user.id,
        email: user.email,
        full_name: (profile && profile.full_name) || user.email,
        role: (profile && profile.role) || 'member',
        is_main_admin: !!(profile && profile.is_main_admin),
        page: (window.location.pathname.split('/').pop() || 'index.html'),
        online_at: new Date().toISOString(),
      };
      const channel = client.channel('online-users', {
        config: { presence: { key: user.id } },
      });
      channel.on('presence', { event: 'sync' }, () => {
        const state = channel.presenceState();
        this._presenceCallbacks.forEach(cb => { try { cb(state); } catch (_) {} });
      });
      channel.subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          try { await channel.track(meta); } catch (_) {}
        }
      });
      // Leave cleanly when the tab closes so others see us drop off quickly.
      window.addEventListener('beforeunload', () => {
        try { channel.untrack(); client.removeChannel(channel); } catch (_) {}
      });
      this._presenceChannel = channel;
      return channel;
    },

    // Register a callback that fires whenever the online list changes.
    // Fires immediately with the current state if already connected.
    onPresenceSync(cb) {
      if (typeof cb !== 'function') return;
      this._presenceCallbacks.push(cb);
      if (this._presenceChannel) {
        try { cb(this._presenceChannel.presenceState()); } catch (_) {}
      }
    },
  };

  window.sla = sla;
})();
