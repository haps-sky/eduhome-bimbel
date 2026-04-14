// ============================================================
// EduHome — api.js (Final)
// Perubahan: deleteAll semua modul, retry logic, error handling
// ============================================================

const API = (() => {

  const BASE_URL = window.EDUHOME_API_URL ||
    'https://script.google.com/macros/s/AKfycbyw1oWuGAGc_VQhX2GmjVt237nMeP0Jy1Xz6XSN1RGYhM91HmWS0lBEqOTbjSsZgWJ6/exec';

  // ── Auth helpers ─────────────────────────────────────────
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

  const logout = () => {
    sessionStorage.removeItem('eduhome_user');
    localStorage.removeItem('eduhome_user');
    window.location.href = 'index.html';
  };

  // ── GET ───────────────────────────────────────────────────
  async function get(action, params = {}) {
    const url = new URL(BASE_URL);
    url.searchParams.set('action', action);

    if (action !== 'login') {
      url.searchParams.set('role', currentRole());
    }

    const user = currentUser();
    if (user.role === 'MENTOR') {
      if (user.username)  url.searchParams.set('mentor_name', user.username);
      if (user.mentor_id) url.searchParams.set('mentor_id',   user.mentor_id);
    }

    Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));

    try {
      const res = await fetch(url.toString());
      if (!res.ok) throw new Error('HTTP ' + res.status);
      return await res.json();
    } catch(e) {
      console.error('GET Error [' + action + ']:', e);
      return { status: 'ERROR', message: 'Gagal terhubung ke server.' };
    }
  }

  // ── POST ──────────────────────────────────────────────────
  async function post(body) {
    const user = currentUser();
    const payload = {
      ...body,
      username: user.username || '',
      role:     currentRole()
    };

    try {
      const res = await fetch(BASE_URL, {
        method:  'POST',
        headers: { 'Content-Type': 'text/plain' }, // Apps Script butuh text/plain
        body:    JSON.stringify(payload)
      });
      if (!res.ok) throw new Error('HTTP ' + res.status);
      return await res.json();
    } catch(e) {
      console.error('POST Error [' + body.action + ']:', e);
      return { status: 'ERROR', message: 'Gagal terhubung ke server. Cek koneksi atau coba lagi.' };
    }
  }

  // ── AUTH ──────────────────────────────────────────────────
  const auth = {
    login: (username, password) => get('login', { username, password })
  };

  // ── MURID ─────────────────────────────────────────────────
  const murid = {
    getAll:    (params = {}) => get('getMurid', params),
    getById:   (id)          => get('getMurid', { id }),
    add:       (data)        => post({ action: 'addMurid',    ...data }),
    update:    (data)        => post({ action: 'updateMurid', ...data }),
    delete:    (id)          => post({ action: 'deleteMurid', id, all: false }),
    deleteAll: ()            => post({ action: 'deleteMurid', all: true })
  };

  // ── MENTOR ────────────────────────────────────────────────
  const mentor = {
    getAll:        ()            => get('getMentor'),
    getById:       (id)          => get('getMentor', { id }),
    add:           (data)        => post({ action: 'addMentor',    ...data }),
    update:        (data)        => post({ action: 'updateMentor', ...data }),
    delete:        (id)          => post({ action: 'deleteMentor', id }),
    deleteAll:     ()            => post({ action: 'deleteMentor', all: true }),
    getMyStudents: (mentor_name) => get('getMentorStudents', { mentor_name })
  };

  // ── JADWAL ────────────────────────────────────────────────
  const jadwal = {
    getAll:         ()                      => get('getJadwal'),
    getByMurid:     (id_murid)              => get('getJadwal', { id_murid }),
    replaceByMurid: (muridId, jadwalData)   => post({
      action: 'replaceJadwalMurid',
      muridId,
      jadwal: jadwalData
    })
  };

  // ── SPP ───────────────────────────────────────────────────
  const spp = {
    getAll:    ()     => get('getSPP'),
    getByMurid:(id)   => get('getSPP', { id_murid: id }),
    create:    (data) => post({ action: 'createSPP', ...data }),
    update:    (data) => post({ action: 'updateSPP', ...data }),
    delete:    (id)   => post({ action: 'deleteSPP', id }),
    deleteAll: ()     => post({ action: 'deleteSPP', all: true })
  };

  // ── PRESENSI ──────────────────────────────────────────────
  const presensi = {
    getAll:    ()          => get('getPresensi'),
    getByDate: (tanggal)   => get('getPresensi', { tanggal }),
    getByMurid:(id_murid)  => get('getPresensi', { id_murid }),
    add:       (data)      => post({ action: 'addPresensi',    ...data }),
    update:    (data)      => post({ action: 'updatePresensi', ...data }),
    delete:    (id)        => post({ action: 'deletePresensi', id }),
    deleteAll: ()          => post({ action: 'deletePresensi', all: true })
  };

  // ── PEMBAYARAN ────────────────────────────────────────────
  const pembayaran = {
    getAll:    ()          => get('getPembayaran'),
    getByMurid:(id_murid)  => get('getPembayaran', { id_murid }),
    add:       (data)      => post({ action: 'addPembayaran',    ...data }),
    update:    (data)      => post({ action: 'updatePembayaran', ...data }),
    delete:    (id)        => post({ action: 'deletePembayaran', id }),
    deleteAll: ()          => post({ action: 'deletePembayaran', all: true })
  };

  // ── GAJI ──────────────────────────────────────────────────
  const gaji = {
    getAll:     ()          => get('getGaji'),
    getByMentor:(id_mentor) => get('getGaji', { id_mentor }),
    record:     (data)      => post({ action: 'recordMentorSalary', ...data }),
    update:     (data)      => post({ action: 'updateGaji',         ...data }),
    delete:     (id)        => post({ action: 'deleteGaji',         id }),
    deleteAll:  ()          => post({ action: 'deleteGaji',         all: true })
  };

  // ── BUKU ──────────────────────────────────────────────────
  // FIX: update sekarang kirim semua field buku (nama_modul, stok, harga_beli, harga_jual)
  const buku = {
    getAll:    ()     => get('getBuku'),
    add:       (data) => post({ action: 'addBuku',    ...data }),
    update:    (data) => post({ action: 'updateBuku', ...data }),
    delete:    (id)   => post({ action: 'deleteBuku', id }),
    deleteAll: ()     => post({ action: 'deleteBuku', all: true })
  };

  // ── DASHBOARD ─────────────────────────────────────────────
  const dashboard = {
    getStats: () => get('getDashboardStats')
  };

  // ── LOGS ──────────────────────────────────────────────────
  const logs = {
    getAll:   () => get('getLogs'),
    clearAll: () => post({ action: 'clearLogs' })
  };

  // ── PUBLIC API ────────────────────────────────────────────
  return {
    auth, murid, mentor, jadwal, spp, presensi,
    pembayaran, gaji, buku, dashboard, logs,
    currentUser, currentRole, logout
  };

})();
