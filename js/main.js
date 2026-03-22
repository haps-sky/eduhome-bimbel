// ============================================================
// EduHome Main App Controller — js/main.js
// RBAC Edition: role-scoped navigation, page guards, UI control
// ============================================================

// ── Role definitions ────────────────────────────────────────
const RBAC = {
  // Pages accessible per role
  pages: {
    OWNER:  ['dashboard', 'owner-finance', 'murid', 'presensi', 'spp', 'gaji', 'logs'],
    ADMIN:  ['dashboard', 'murid', 'mentor', 'presensi', 'pembayaran', 'spp', 'buku', 'gaji'],
    MENTOR: ['dashboard', 'mentor-students', 'mentor-presensi']
  },

  // Human-readable page titles
  titles: {
    'dashboard':        'Dashboard',
    'owner-finance':    'Laporan Keuangan',
    'murid':            'Data Murid',
    'mentor':           'Data Mentor',
    'presensi':         'Presensi',
    'pembayaran':       'Pembayaran',
    'spp':              'Paket SPP',
    'buku':             'Modul Belajar',
    'gaji':             'Penggajian',
    'logs':             'System Logs',
    'mentor-students':  'Murid Saya',
    'mentor-presensi':  'Catat Presensi'
  },

  // Default landing page per role
  defaultPage: {
    OWNER:  'dashboard',
    ADMIN:  'dashboard',
    MENTOR: 'dashboard'
  },

  // Sidebar label groups per role
  groups: {
    OWNER: [
      { label: 'Utama',    pages: ['dashboard'] },
      { label: 'Laporan',  pages: ['owner-finance', 'murid', 'presensi', 'spp', 'gaji'] },
      { label: 'Sistem',   pages: ['logs'] }
    ],
    ADMIN: [
      { label: 'Utama',      pages: ['dashboard'] },
      { label: 'Manajemen',  pages: ['murid', 'mentor', 'spp', 'buku'] },
      { label: 'Transaksi',  pages: ['presensi', 'pembayaran', 'gaji'] }
    ],
    MENTOR: [
      { label: 'Utama',      pages: ['dashboard'] },
      { label: 'Kelas Saya', pages: ['mentor-students', 'mentor-presensi'] }
    ]
  },

  // Icons per page
  icons: {
    'dashboard':       'layout-dashboard',
    'owner-finance':   'bar-chart-2',
    'murid':           'users',
    'mentor':          'user-check',
    'presensi':        'calendar-check',
    'pembayaran':      'credit-card',
    'spp':             'package',
    'buku':            'book-open',
    'gaji':            'banknote',
    'logs':            'scroll-text',
    'mentor-students': 'users',
    'mentor-presensi': 'calendar-check'
  },

  // Role badge styling
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

  // ── Session management ──────────────────────────────────
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

  // ── Build role-scoped sidebar ───────────────────────────
  function buildSidebar(role) {
    const nav   = document.getElementById('sidebar-nav');
    const brand = document.getElementById('sidebar-role-label');
    if (!nav) return;

    const groups = RBAC.groups[role] || [];
    const badge  = RBAC.badges[role] || { cls: '', label: role };

    if (brand) {
      brand.textContent = badge.label;
      brand.className   = 'role-badge ' + badge.cls;
    }

    nav.innerHTML = groups.map(g => `
      <div class="nav-section-label">${g.label}</div>
      ${g.pages.map(p => `
        <div class="nav-item" data-page="${p}">
          <i data-lucide="${RBAC.icons[p] || 'circle'}"></i>
          ${RBAC.titles[p] || p}
        </div>`).join('')}
    `).join('');

    // Re-attach click listeners
    nav.querySelectorAll('.nav-item').forEach(el => {
      el.addEventListener('click', () => navigate(el.dataset.page));
    });

    lucide.createIcons({ nodes: [nav] });
  }

  // ── Router with access guard ────────────────────────────
  function navigate(page) {
    const role = state.user ? state.user.role : null;
    if (!role) return;

    // ── Frontend access guard ────────────────────────────
    if (!RBAC.canAccess(role, page)) {
      UI.toast('Akses ditolak: halaman ini tidak tersedia untuk role Anda', 'error');
      return;
    }

    state.currentPage = page;

    // Update nav active state
    document.querySelectorAll('.nav-item').forEach(el => {
      el.classList.toggle('active', el.dataset.page === page);
    });

    // Show / hide page sections
    document.querySelectorAll('.page-section').forEach(el => {
      el.style.display = el.id === 'page-' + page ? 'block' : 'none';
    });

    // Update topbar title
    const titleEl = document.getElementById('page-title');
    if (titleEl) titleEl.textContent = RBAC.titles[page] || page;

    loadPage(page);
  }

  function loadPage(page) {
    switch (page) {
      case 'dashboard':        Dashboard.load();          break;
      case 'owner-finance':    OwnerFinancePage.load();   break;
      case 'murid':            MuridPage.load();          break;
      case 'mentor':           MentorPage.load();         break;
      case 'presensi':         PresensiPage.load();       break;
      case 'pembayaran':       PembayaranPage.load();     break;
      case 'spp':              SPPPage.load();            break;
      case 'buku':             BukuPage.load();           break;
      case 'gaji':             GajiPage.load();           break;
      case 'logs':             LogsPage.load();           break;
      case 'mentor-students':  MentorStudentsPage.load(); break;
      case 'mentor-presensi':  MentorPresensiPage.load(); break;
    }
  }

  // ── Auth ─────────────────────────────────────────────────
  async function handleLogin(e) {
    e.preventDefault();
    const username = document.getElementById('login-username').value.trim();
    const password = document.getElementById('login-password').value.trim();
    const btn      = document.getElementById('login-btn');

    if (!username || !password) { UI.toast('Username dan password diperlukan', 'error'); return; }

    btn.disabled = true;
    btn.innerHTML = '<div class="spinner"></div>';

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
      UI.toast('Koneksi gagal. Periksa URL API.', 'error');
    } finally {
      btn.disabled = false;
      btn.innerHTML = '<i data-lucide="log-in"></i> Masuk';
      lucide.createIcons({ nodes: [btn] });
    }
  }

  function handleLogout() {
    clearSession();
    document.getElementById('app-shell').style.display = 'none';
    document.getElementById('login-screen').style.display = 'flex';
    UI.toast('Berhasil keluar', 'info');
  }

  function showApp(user) {
    document.getElementById('login-screen').style.display = 'none';
    document.getElementById('app-shell').style.display = 'flex';

    // User info in sidebar footer
    const badge = RBAC.badges[user.role] || { cls: '', label: user.role };
    document.getElementById('user-display').innerHTML =
      `<strong>${user.username}</strong><span class="role-badge ${badge.cls}">${badge.label}</span>`;

    // Avatar initial
    const av = document.getElementById('user-avatar');
    if (av) av.textContent = (user.username || '?')[0].toUpperCase();

    // Build role-scoped sidebar
    buildSidebar(user.role);

    // Show/hide sections that exist in the DOM based on role
    applyPageVisibility(user.role);
  }

  function applyPageVisibility(role) {
    // ── Admin-only action buttons ────────────────────────
    const adminBtns = [
      'btn-tambah-murid', 'btn-tambah-mentor',
      'btn-tambah-presensi', 'btn-buat-spp', 'btn-bayar-gaji'
    ];
    adminBtns.forEach(id => {
      const el = document.getElementById(id);
      if (el) el.style.display = (role === 'ADMIN') ? 'inline-flex' : 'none';
    });

    // ── Finance section: hide from MENTOR ────────────────
    const financeSection = document.getElementById('dash-finance-section');
    if (financeSection) {
      financeSection.style.display = (role === 'MENTOR') ? 'none' : 'block';
    }

    // ── Mentor personal stat KPIs: show only for MENTOR ──
    const mentorStats = document.getElementById('dash-mentor-stats');
    if (mentorStats) {
      mentorStats.style.display = (role === 'MENTOR') ? 'block' : 'none';
    }

    // ── Payment/Unpaid KPI cards: hide from MENTOR ────────
    ['kpi-card-pembayaran', 'kpi-card-unpaid'].forEach(id => {
      const el = document.getElementById(id);
      if (el) el.style.display = (role === 'MENTOR') ? 'none' : 'block';
    });

    // ── Owner read-only: no action buttons ───────────────
    if (role === 'OWNER') {
      ['btn-tambah-murid','btn-tambah-mentor','btn-tambah-presensi',
       'btn-buat-spp','btn-bayar-gaji'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.style.display = 'none';
      });
    }
  }

  // ── Init ─────────────────────────────────────────────────
  function init() {
    const saved = getSession();
    if (saved) {
      state.user = saved;
      showApp(saved);
      navigate(RBAC.defaultPage[saved.role] || 'dashboard');
    } else {
      document.getElementById('login-screen').style.display = 'flex';
      document.getElementById('app-shell').style.display = 'none';
    }

    document.getElementById('login-form').addEventListener('submit', handleLogin);
    document.getElementById('logout-btn').addEventListener('click', handleLogout);

    document.getElementById('mobile-menu-btn').addEventListener('click', () => {
      document.getElementById('sidebar').classList.toggle('open');
    });
  }

  return { init, navigate, state, RBAC };
})();

// ── Global UI Utilities ────────────────────────────────────
const UI = {
  toast(message, type = 'info') {
    const container = document.getElementById('toast-container');
    const toast = document.createElement('div');
    toast.className = 'toast toast-' + type;
    const icons = { success: 'check-circle', error: 'x-circle', info: 'info', warning: 'alert-triangle' };
    toast.innerHTML = `<i data-lucide="${icons[type] || 'info'}"></i><span>${message}</span>`;
    container.appendChild(toast);
    lucide.createIcons({ nodes: [toast] });
    requestAnimationFrame(() => toast.classList.add('show'));
    setTimeout(() => {
      toast.classList.remove('show');
      setTimeout(() => toast.remove(), 300);
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
    return '<span class="stars">★'.repeat(Math.min(n, 10)) + '</span> <small>' + n + '</small>';
  },

  renderTable(tbodyId, rows, emptyMsg = 'Tidak ada data') {
    const el = document.getElementById(tbodyId);
    if (!el) return;
    if (!rows || rows.length === 0) {
      const cols = el.closest('table').querySelector('thead tr').children.length;
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

document.addEventListener('DOMContentLoaded', () => {
  App.init();
  document.querySelectorAll('.modal').forEach(modal => {
    modal.addEventListener('click', e => {
      if (e.target === modal) UI.closeAllModals();
    });
  });

  // Current date in topbar
  document.getElementById('current-date').textContent =
    new Date().toLocaleDateString('id-ID', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });

  // Default dates
  const today = new Date().toISOString().split('T')[0];
  ['presensi-tanggal','pay-tanggal','gaji-tgl','murid-tgl','mentor-presensi-tanggal'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.value = today;
  });

  lucide.createIcons();
});

