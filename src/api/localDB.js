// Local localStorage-based entity store with per-user data isolation

// ─── Auth session helpers ────────────────────────────────────────────────────

function getCurrentUser() {
  try {
    return JSON.parse(localStorage.getItem('auth_session') || 'null');
  } catch { return null; }
}

function getCurrentUserId() {
  return getCurrentUser()?.id || 'anonymous';
}

function getCurrentUserEmail() {
  return getCurrentUser()?.email || 'unknown';
}

// ─── Cleanup ─────────────────────────────────────────────────────────────────

export function runCleanup() {
  const uid = getCurrentUserId();

  const cutoff7 = new Date();
  cutoff7.setDate(cutoff7.getDate() - 7);
  const cutoffDate7 = cutoff7.toISOString().split('T')[0];
  const cutoffISO7  = cutoff7.toISOString();

  const cutoff30 = new Date();
  cutoff30.setDate(cutoff30.getDate() - 30);
  const cutoffDate30 = cutoff30.toISOString().split('T')[0];

  // TaskCompletion — 7 days
  try {
    const key = `user_${uid}_TaskCompletion`;
    const records = JSON.parse(localStorage.getItem(key) || '[]');
    localStorage.setItem(key, JSON.stringify(
      records.filter(r => (r.completed_date || '') >= cutoffDate7)
    ));
  } catch {}

  // Completed TodoItems — 7 days
  try {
    const key = `user_${uid}_TodoItem`;
    const records = JSON.parse(localStorage.getItem(key) || '[]');
    localStorage.setItem(key, JSON.stringify(
      records.filter(r => {
        if (!r.is_done) return true;
        const ts = r.completed_at || r.created_at;
        return !ts || ts >= cutoffISO7;
      })
    ));
  } catch {}

  // Sleep entries — 30 days
  try {
    const key = `user_${uid}_Sleep`;
    const records = JSON.parse(localStorage.getItem(key) || '[]');
    localStorage.setItem(key, JSON.stringify(
      records.filter(r => (r.date || '') >= cutoffDate30)
    ));
  } catch {}
}

// ─── Entity store factory ─────────────────────────────────────────────────────

function generateId() {
  return Math.random().toString(36).slice(2, 11) + Date.now().toString(36);
}

function createEntityStore(name) {
  // Key is computed at call-time so it always reflects the logged-in user
  const storageKey = () => `user_${getCurrentUserId()}_${name}`;
  const listeners = new Set();

  function getAll() {
    try { return JSON.parse(localStorage.getItem(storageKey()) || '[]'); }
    catch { return []; }
  }

  function saveAll(records) {
    localStorage.setItem(storageKey(), JSON.stringify(records));
    listeners.forEach(cb => cb(records));
  }

  return {
    filter(criteria = {}, sort = null, limit = null) {
      let records = getAll();
      records = records.filter(record =>
        Object.entries(criteria).every(([k, v]) => record[k] === v)
      );
      if (sort) {
        const desc  = sort.startsWith('-');
        const field = desc ? sort.slice(1) : sort;
        records.sort((a, b) => {
          const av = String(a[field] ?? '');
          const bv = String(b[field] ?? '');
          return desc ? bv.localeCompare(av) : av.localeCompare(bv);
        });
      }
      if (limit) records = records.slice(0, limit);
      return Promise.resolve(records);
    },

    create(data) {
      const records = getAll();
      const record = {
        ...data,
        id: generateId(),
        created_at: new Date().toISOString(),
        created_by: getCurrentUserEmail(),
      };
      records.push(record);
      saveAll(records);
      return Promise.resolve(record);
    },

    update(id, data) {
      const records = getAll();
      const idx = records.findIndex(r => r.id === id);
      if (idx === -1) return Promise.reject(new Error(`Record ${id} not found`));
      records[idx] = { ...records[idx], ...data };
      saveAll(records);
      return Promise.resolve(records[idx]);
    },

    delete(id) {
      saveAll(getAll().filter(r => r.id !== id));
      return Promise.resolve();
    },

    subscribe(callback) {
      listeners.add(callback);
      return () => listeners.delete(callback);
    },
  };
}

// ─── Auth store ───────────────────────────────────────────────────────────────

async function hashPassword(password) {
  const data = new TextEncoder().encode(password);
  const buf  = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('');
}

function getUsers() {
  try { return JSON.parse(localStorage.getItem('auth_users') || '[]'); }
  catch { return []; }
}

function saveUsers(users) {
  localStorage.setItem('auth_users', JSON.stringify(users));
}

const authStore = {
  async register(email, password, name) {
    const users = getUsers();
    if (users.find(u => u.email.toLowerCase() === email.toLowerCase())) {
      throw new Error('An account with this email already exists.');
    }
    const hash = await hashPassword(password);
    const user = {
      id: generateId(),
      email: email.toLowerCase(),
      name: name || email.split('@')[0],
      password_hash: hash,
      created_at: new Date().toISOString(),
    };
    users.push(user);
    saveUsers(users);
    const session = { id: user.id, email: user.email, name: user.name };
    localStorage.setItem('auth_session', JSON.stringify(session));
    return session;
  },

  async login(email, password) {
    const users = getUsers();
    const user  = users.find(u => u.email.toLowerCase() === email.toLowerCase());
    if (!user) throw new Error('No account found with this email.');
    const hash = await hashPassword(password);
    if (hash !== user.password_hash) throw new Error('Incorrect password.');
    const session = { id: user.id, email: user.email, name: user.name, picture: user.picture };
    localStorage.setItem('auth_session', JSON.stringify(session));
    return session;
  },

  me() {
    const s = getCurrentUser();
    if (!s) return Promise.reject(new Error('Not authenticated'));
    return Promise.resolve({ id: s.id, email: s.email, full_name: s.name });
  },

  logout() {
    localStorage.removeItem('auth_session');
  },

  isAuthenticated() {
    return !!getCurrentUser();
  },
};

// ─── Exported DB ──────────────────────────────────────────────────────────────

export const localDB = {
  entities: {
    Task:           createEntityStore('Task'),
    TaskCompletion: createEntityStore('TaskCompletion'),
    UserProfile:    createEntityStore('UserProfile'),
    TodoItem:       createEntityStore('TodoItem'),
    Sleep:          createEntityStore('Sleep'),
    Project:        createEntityStore('Project'),
    ProjectTask:    createEntityStore('ProjectTask'),
  },
  auth: authStore,
};
