// ============================================================
// EduHome API Layer — js/api.js
// All requests automatically inject the current user's role.
// Backend validates role on every call.
// ============================================================

const API = (() => {
  const BASE_URL = window.EDUHOME_API_URL || '';

  // Get current session role (injected at call time)
  function currentRole() {
    try {
      const s = sessionStorage.getItem('eduhome_user');
      return s ? JSON.parse(s).role : '';
    } catch(e) { return ''; }
  }

  function currentUser() {
    try {
      const s = sessionStorage.getItem('eduhome_user');
      return s ? JSON.parse(s) : {};
    } catch(e) { return {}; }
  }

  async function get(action, params = {}) {
    const url = new URL(BASE_URL);
    url.searchParams.set('action', action);
    url.searchParams.set('role', currentRole());

    // Inject mentor context for scoping
    const user = currentUser();
    if (user.role === 'MENTOR') {
      if (user.username) url.searchParams.set('mentor_name', user.username);
      if (user.mentor_id) url.searchParams.set('mentor_id', user.mentor_id);
    }

    Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));
    const res = await fetch(url.toString());
    return res.json();
  }

  async function post(body) {
    const res = await fetch(BASE_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...body,
        role: currentRole()   // always inject role
      })
    });
    return res.json();
  }

  // AUTH
  const auth = {
    login: (username, password) => get('login', { username, password })
  };

  // MURID
  const murid = {
    getAll:  (params = {}) => get('getMurid', params),
    getById: (id) => get('getMurid', { id }),
    add:     (data) => post({ action: 'addMurid', ...data }),
    update:  (data) => post({ action: 'updateMurid', ...data }),
    delete:  (id)   => post({ action: 'deleteMurid', id })
  };

  // MENTOR
  const mentor = {
    getAll:  () => get('getMentor'),
    getById: (id) => get('getMentor', { id }),
    add:     (data) => post({ action: 'addMentor', ...data }),
    update:  (data) => post({ action: 'updateMentor', ...data }),
    delete:  (id)   => post({ action: 'deleteMentor', id }),
    getMyStudents: (mentor_name) => get('getMentorStudents', { mentor_name })
  };

  // JADWAL
  const jadwal = {
    getAll:     () => get('getJadwal'),
    getByMurid: (id_murid) => get('getJadwal', { id_murid })
  };

  // SPP
  const spp = {
    getAll:     () => get('getSPP'),
    getByMurid: (id_murid) => get('getSPP', { id_murid }),
    create:     (data) => post({ action: 'createSPP', ...data })
  };

  // PRESENSI
  const presensi = {
    getAll:     () => get('getPresensi'),
    getByDate:  (tanggal)  => get('getPresensi', { tanggal }),
    getByMurid: (id_murid) => get('getPresensi', { id_murid }),
    add:        (data)     => post({ action: 'addPresensi', ...data })
  };

  // PEMBAYARAN
  const pembayaran = {
    getAll:     () => get('getPembayaran'),
    getByMurid: (id_murid) => get('getPembayaran', { id_murid }),
    add:        (data) => post({ action: 'addPembayaran', ...data })
  };

  // GAJI
  const gaji = {
    getAll:      () => get('getGaji'),
    getByMentor: (id_mentor) => get('getGaji', { id_mentor }),
    record:      (data) => post({ action: 'recordMentorSalary', ...data })
  };

  // BUKU
  const buku = {
    getAll:  () => get('getBuku'),
    add:     (data) => post({ action: 'addBuku', ...data }),
    update:  (data) => post({ action: 'updateBuku', ...data }),
    delete:  (id)   => post({ action: 'deleteBuku', id })
  };

  // DASHBOARD
  const dashboard = {
    getStats: () => get('getDashboardStats')
  };

  // LOGS
  const logs = {
    getAll: () => get('getLogs')
  };

  return { auth, murid, mentor, jadwal, spp, presensi, pembayaran, gaji, buku, dashboard, logs, currentUser, currentRole };
})();

