const RBAC = {
  pages: {
    OWNER:  ['dashboard', 'owner-finance', 'laporan', 'murid', 'presensi', 'spp', 'gaji', 'logs'],
    ADMIN:  ['dashboard', 'murid', 'mentor', 'presensi', 'pembayaran', 'pengeluaran', 'spp', 'buku', 'gaji', 'laporan'],
    MENTOR: ['dashboard', 'mentor-students', 'mentor-presensi']
  },

  titles: {
    'dashboard':        'Dashboard',
    'owner-finance':    'Laporan Keuangan',
    'laporan':          'Laporan Laba Rugi',
    'murid':            'Data Murid',
    'mentor':           'Data Mentor',
    'presensi':         'Presensi',
    'pembayaran':       'Pembayaran',
    'pengeluaran':      'Pengeluaran',
    'spp':              'Paket SPP',
    'buku':             'Modul Belajar',
    'gaji':             'Penggajian',
    'logs':             'System Logs',
    'mentor-students':  'Murid Saya',
    'mentor-presensi':  'Catat Presensi'
  },

  defaultPage: {
    OWNER:  'dashboard',
    ADMIN:  'dashboard',
    MENTOR: 'dashboard'
  },

  groups: {
    OWNER: [
      { label: 'Utama',    pages: ['dashboard'] },
      { label: 'Laporan',  pages: ['owner-finance', 'laporan', 'murid', 'presensi', 'spp', 'gaji'] },
      { label: 'Sistem',   pages: ['logs'] }
    ],
    ADMIN: [
      { label: 'Utama',      pages: ['dashboard'] },
      { label: 'Manajemen',  pages: ['murid', 'mentor', 'spp', 'buku'] },
      { label: 'Transaksi',  pages: ['presensi', 'pembayaran', 'pengeluaran', 'gaji', 'laporan'] }
    ],
    MENTOR: [
      { label: 'Utama',      pages: ['dashboard'] },
      { label: 'Kelas Saya', pages: ['mentor-students', 'mentor-presensi'] }
    ]
  },

  icons: {
    'dashboard':       'layout-dashboard',
    'owner-finance':   'bar-chart-2',
    'laporan':         'file-bar-chart',
    'murid':           'users',
    'mentor':          'user-check',
    'presensi':        'calendar-check',
    'pembayaran':      'credit-card',
    'pengeluaran':     'trending-down',
    'spp':             'package',
    'buku':            'book-open',
    'gaji':            'banknote',
    'logs':            'scroll-text',
    'mentor-students': 'users',
    'mentor-presensi': 'calendar-check'
  },

  badges: {
    OWNER:  { cls: 'role-owner',  label: 'Owner' },
    ADMIN:  { cls: 'role-admin',  label: 'Admin' },
    MENTOR: { cls: 'role-mentor', label: 'Mentor' }
  },

  canAccess(role, page) {
    return (this.pages[role] || []).includes(page);
  }
};

const App = (() => {
  const state = {
    user: null,
    currentPage: 'dashboard',
    cache: {}
  };

  function getSession() {
    const s = sessionStorage.getItem('eduhome_user');
    return s ? JSON.parse(s) : null;
  }

  function setSession(user) {
    sessionStorage.setItem('eduhome_user', JSON.stringify(user));
    state.user = user;
  }

  function clearSession() {
    sessionStorage.removeItem('eduhome_user');
    state.user = null;
  }

  function buildSidebar(role) {
    const nav   = document.getElementById('sidebar-nav');
    const brand = document.getElementById('sidebar-role-label');
    if (!nav) return;

    const groups = RBAC.groups[role] || [];
    const badge  = RBAC.badges[role] || { cls: '', label: role };
    if (brand) { brand.textContent = badge.label; brand.className = 'role-badge ' + badge.cls; }

    nav.innerHTML = groups.map(g => `
      <div class="nav-section-label">${g.label}</div>
      ${g.pages.map(p => `
        <div class="nav-item" data-page="${p}">
          <i data-lucide="${RBAC.icons[p] || 'circle'}"></i>
          ${RBAC.titles[p] || p}
        </div>`).join('')}
    `).join('');

    nav.querySelectorAll('.nav-item').forEach(el => {
      el.addEventListener('click', () => {
        navigate(el.dataset.page);
        const sidebar = document.getElementById('sidebar');
        if (sidebar) sidebar.classList.remove('open');
      });
    });

    lucide.createIcons({ nodes: [nav] });
  }

  function navigate(page) {
    const role = state.user ? state.user.role : null;
    if (!role) return;

    if (!RBAC.canAccess(role, page)) {
      UI.toast('Akses ditolak: halaman ini tidak tersedia untuk role Anda', 'error');
      return;
    }

    state.currentPage = page;

    document.querySelectorAll('.nav-item').forEach(el => {
      el.classList.toggle('active', el.dataset.page === page);
    });

    document.querySelectorAll('.page-section').forEach(el => {
      el.style.display = el.id === 'page-' + page ? 'block' : 'none';
    });

    const titleEl = document.getElementById('page-title');
    if (titleEl) titleEl.textContent = RBAC.titles[page] || page;

    loadPage(page);
  }

  function loadPage(page) {
    switch (page) {
      case 'dashboard':        Dashboard.load();                              break;
      case 'owner-finance':    OwnerFinancePage.load();                      break;
      case 'laporan':          LaporanBulananPage.init(); LaporanBulananPage.load(); break;
      case 'murid':            MuridPage.load();                             break;
      case 'mentor':           MentorPage.load();                            break;
      case 'presensi':         PresensiPage.load();                          break;
      case 'pembayaran':       PembayaranPage.load();                        break;
      case 'pengeluaran':      OperasionalPage.load();                       break;
      case 'spp':              SPPPage.load();                               break;
      case 'buku':             BukuPage.load();                              break;
      case 'gaji':             GajiPage.load();                              break;
      case 'logs':             LogsPage.load();                              break;
      case 'mentor-students':  MentorStudentsPage.load();                    break;
      case 'mentor-presensi':  MentorPresensiPage.load();                    break;
    }
  }

  async function handleLogin(e) {
    e.preventDefault();
    const username = document.getElementById('login-username').value.trim();
    const password = document.getElementById('login-password').value.trim();
    const btn      = document.getElementById('login-btn');

    if (!username || !password) {
      UI.toast('Username dan password diperlukan', 'error');
      return;
    }

    btn.disabled  = true;
    const originalText = btn.innerHTML;
    btn.innerHTML = '<div class="spinner-sm"></div> Loading...';

    try {
      const res = await API.auth.login(username, password);
      if (res.status === 'OK') {
        setSession(res.data);
        showApp(res.data);
        navigate(RBAC.defaultPage[res.data.role] || 'dashboard');
        UI.toast('Selamat datang, ' + res.data.username + '!', 'success');
      } else {
        UI.toast(res.message || 'Login gagal', 'error');
      }
    } catch(err) {
      console.error(err);
      UI.toast('Koneksi gagal. Periksa URL API.', 'error');
    } finally {
      btn.disabled  = false;
      btn.innerHTML = originalText;
    }
  }

  function handleLogout() {
    sessionStorage.clear();
    document.body.classList.remove('light-mode');
    UI.toast('Berhasil keluar', 'info');
    window.location.replace(window.location.pathname);
  }

  const Theme = (() => {
    function _getUsername() {
      try {
        const s = sessionStorage.getItem('eduhome_user');
        return s ? JSON.parse(s).username : 'guest';
      } catch { return 'guest'; }
    }

    function _storageKey() { return 'theme_' + _getUsername().toLowerCase(); }

    function _updateIcon(isLight) {
      const btn  = document.getElementById('theme-toggle-btn');
      if (!btn) return;
      const moon = btn.querySelector('[data-lucide="moon"], svg[data-lucide="moon"]')
                 || document.getElementById('theme-icon-moon');
      const sun  = btn.querySelector('[data-lucide="sun"],  svg[data-lucide="sun"]')
                 || document.getElementById('theme-icon-sun');
      if (moon) moon.style.display = isLight ? 'none' : '';
      if (sun)  sun.style.display  = isLight ? ''     : 'none';
    }

    function _apply(isLight) {
      document.body.classList.toggle('light-mode', isLight);
      _updateIcon(isLight);
    }

    function init() {
      const saved   = localStorage.getItem(_storageKey());
      const isLight = saved === 'light';
      _apply(isLight);
    }

    function toggle() {
      const isCurrentlyLight = document.body.classList.contains('light-mode');
      const next = !isCurrentlyLight;
      localStorage.setItem(_storageKey(), next ? 'light' : 'dark');
      _apply(next);
    }

    return { init, toggle };
  })();

  window.Theme = Theme;

  function showApp(user) {
    document.getElementById('login-screen').style.display = 'none';
    document.getElementById('app-shell').style.display    = 'flex';

    const el = document.getElementById('current-date');
    if (el) {
      el.textContent = new Date().toLocaleDateString('id-ID', {
        weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
      });
    }

    const badge       = RBAC.badges[user.role] || { cls: '', label: user.role };
    const userDisplay = document.getElementById('user-display');
    if (userDisplay) {
      userDisplay.innerHTML = `<strong>${user.username}</strong><span class="role-badge ${badge.cls}">${badge.label}</span>`;
    }

    const av = document.getElementById('user-avatar');
    if (av) av.textContent = (user.username || '?')[0].toUpperCase();

    buildSidebar(user.role);
    applyPageVisibility(user.role);
    Theme.init();
  }

  function applyPageVisibility(role) {
    const adminBtns = [
      'btn-tambah-murid', 'btn-tambah-mentor',
      'btn-tambah-presensi', 'btn-tambah-pembayaran',
      'btn-tambah-pengeluaran',
      'btn-buat-spp', 'btn-tambah-buku', 'btn-bayar-gaji'
    ];
    adminBtns.forEach(id => {
      const el = document.getElementById(id);
      if (el) el.style.display = (role === 'ADMIN') ? 'inline-flex' : 'none';
    });

    const financeSection = document.getElementById('dash-finance-section');
    if (financeSection) {
      financeSection.style.display = (role === 'MENTOR') ? 'none' : 'block';
    }

    const mentorStats = document.getElementById('dash-mentor-stats');
    if (mentorStats) {
      mentorStats.style.display = (role === 'MENTOR') ? 'block' : 'none';
    }

    ['kpi-card-pembayaran', 'kpi-card-unpaid'].forEach(id => {
      const el = document.getElementById(id);
      if (el) el.style.display = (role === 'MENTOR') ? 'none' : 'block';
    });

    if (role === 'OWNER') {
      adminBtns.forEach(id => {
        const el = document.getElementById(id);
        if (el) el.style.display = 'none';
      });

      // Tampilkan tombol admin tools untuk OWNER dan ADMIN di halaman laporan
    const reconcileBtn = document.getElementById('btn-reconcile-spp');
    const migrateBtn   = document.getElementById('btn-migrate-buku');
    if (reconcileBtn) reconcileBtn.style.display = (role === 'ADMIN' || role === 'OWNER') ? 'inline-flex' : 'none';
    if (migrateBtn)   migrateBtn.style.display   = role === 'OWNER' ? 'inline-flex' : 'none';

    }
  }

  function init() {
    const saved = getSession();
    if (saved) {
      state.user = saved;
      showApp(saved);
      navigate(RBAC.defaultPage[saved.role] || 'dashboard');
    } else {
      document.getElementById('login-screen').style.display = 'flex';
      document.getElementById('app-shell').style.display    = 'none';
    }

    document.getElementById('login-form').addEventListener('submit', handleLogin);
    document.getElementById('logout-btn').addEventListener('click', handleLogout);

    document.getElementById('mobile-menu-btn').addEventListener('click', (e) => {
      e.stopPropagation();
      document.getElementById('sidebar').classList.toggle('open');
    });
  }

  return { init, navigate, state, RBAC };
})();

const UI = {
  toast(message, type = 'info') {
    const container = document.getElementById('toast-container');
    if (!container) return;

    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;

    const icons = {
      success: 'check-circle',
      error:   'x-circle',
      info:    'info',
      warning: 'alert-triangle'
    };

    toast.innerHTML = `<i data-lucide="${icons[type] || 'info'}"></i><span>${message}</span>`;
    container.appendChild(toast);
    lucide.createIcons({ nodes: [toast] });

    setTimeout(() => toast.classList.add('show'), 10);
    setTimeout(() => {
      toast.classList.remove('show');
      setTimeout(() => { if (toast.parentNode) toast.remove(); }, 300);
    }, 3500);
  },

  formatCurrency(val) {
    return 'Rp ' + Number(val || 0).toLocaleString('id-ID');
  },

  formatDate(str) {
    if (!str) return '-';
    return new Date(str).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' });
  },

  statusBadge(status) {
    const map = {
      'AKTIF':    'badge-success',
      'NONAKTIF': 'badge-danger',
      'HADIR':    'badge-success',
      'ABSEN':    'badge-danger',
      'IZIN':     'badge-warning',
      'PAID':     'badge-success',
      'PARTIAL':  'badge-warning',
      'UNPAID':   'badge-danger',
      'HABIS':    'badge-muted',
      'EXPIRED':  'badge-muted',
      'TIDAK ADA':'badge-muted'
    };
    return `<span class="badge ${map[status] || 'badge-muted'}">${status}</span>`;
  },

  stars(count) {
    const n = parseInt(count) || 0;
    return '<span class="stars">★</span>'.repeat(Math.min(n, 10)) + ' <small>' + n + '</small>';
  },

  renderTable(tbodyId, rows, emptyMsg = 'Tidak ada data') {
    const el = document.getElementById(tbodyId);
    if (!el) return;
    if (!rows || rows.length === 0) {
      const cols = el.closest('table')?.querySelector('thead tr')?.children.length || 5;
      el.innerHTML = `<tr><td colspan="${cols}" class="empty-row">${emptyMsg}</td></tr>`;
      return;
    }
    el.innerHTML = rows.join('');
    lucide.createIcons({ nodes: [el] });
  },

  openModal(id) {
    const el = document.getElementById(id);
    if (el) { el.style.display = 'flex'; lucide.createIcons({ nodes: [el] }); }
  },

  closeModal(id) {
    const el = document.getElementById(id);
    if (el) el.style.display = 'none';
  },

  closeAllModals() {
    document.querySelectorAll('.modal').forEach(m => m.style.display = 'none');
  }
  
};

const AdminTools = (() => {
  async function reconcile() {
    UI.toast('Menjalankan reconciliation SPP...', 'info');
    try {
      const res = await API.laporan.reconcileSPP();
      if (res.status !== 'OK') { UI.toast(res.message || 'Gagal', 'error'); return; }
      const d       = res.data;
      const panel   = document.getElementById('laporan-reconcile-panel');
      const summary = document.getElementById('laporan-reconcile-summary');
      const tbody   = document.getElementById('laporan-reconcile-tbody');
      if (!panel) return;

      if (summary) {
        summary.textContent = `Diperiksa: ${d.summary.total_checked} paket SPP · Mismatch: ${d.summary.total_mismatch}`;
      }

      const rows = (d.items || []).map(r => `
        <tr>
          <td><span class="id-badge">${r.id_spp}</span></td>
          <td>${r.nama_murid || r.id_murid}</td>
          <td>${r.expected_hadir}</td>
          <td>${r.actual_hadir}</td>
          <td>${r.sisa_pertemuan}</td>
          <td><span class="badge ${r.status === 'MATCH' ? 'badge-success' : 'badge-danger'}">${r.status}</span></td>
        </tr>`);

      if (tbody) {
        tbody.innerHTML = rows.length
          ? rows.join('')
          : '<tr><td colspan="6" class="empty-row">Semua paket SPP konsisten</td></tr>';
      }

      panel.style.display = 'block';
      lucide.createIcons({ nodes: [panel] });
      UI.toast(`Reconciliation selesai. ${d.summary.total_mismatch} mismatch ditemukan.`,
        d.summary.total_mismatch > 0 ? 'warning' : 'success');
    } catch(e) {
      UI.toast('Gagal menjalankan reconciliation', 'error');
    }
  }

  async function migrateBuku() {
    if (!confirm('Migrasi data BUKU lama? Proses ini akan mengisi field arah yang kosong berdasarkan jumlah transaksi. Aman untuk dijalankan ulang.')) return;
    UI.toast('Menjalankan migrasi BUKU...', 'info');
    try {
      const res = await API.laporan.migrateLegacyBuku();
      if (res.status !== 'OK') { UI.toast(res.message || 'Gagal', 'error'); return; }
      const d = res.data;
      UI.toast(`Migrasi selesai. Diupdate: ${d.updated}, Dilewati: ${d.skipped}, Peringatan: ${d.warnings.length}`,
        d.warnings.length > 0 ? 'warning' : 'success');
      if (d.warnings.length > 0) {
        console.warn('BUKU migration warnings:', d.warnings);
      }
    } catch(e) {
      UI.toast('Gagal menjalankan migrasi', 'error');
    }
  }

  return { reconcile, migrateBuku };
})();

document.addEventListener('DOMContentLoaded', () => {
  App.init();

  document.querySelectorAll('.modal').forEach(modal => {
    modal.addEventListener('click', e => {
      if (e.target === modal) UI.closeAllModals();
    });
  });

  const mainArea = document.getElementById('main-area');
  if (mainArea) {
    mainArea.addEventListener('click', () => {
      const sidebar = document.getElementById('sidebar');
      if (sidebar && sidebar.classList.contains('open')) sidebar.classList.remove('open');
    });
  }

  const updateDate = () => {
    const el = document.getElementById('current-date');
    if (el) el.textContent = new Date().toLocaleDateString('id-ID', {
      weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
    });
  };
  updateDate();

  const skrg      = new Date();
  const offset    = skrg.getTimezoneOffset() * 60000;
  const localDate = (new Date(skrg - offset)).toISOString().split('T')[0];
  ['presensi-tanggal','pay-tanggal','gaji-tgl','murid-tgl','mentor-presensi-tanggal'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.value = localDate;
  });

  lucide.createIcons();
});
<<<<<<< HEAD:js/main.js

=======
>>>>>>> 2261640:js/Main.js
