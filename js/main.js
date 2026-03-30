const RBAC = {
  pages: {
    OWNER:  ['dashboard', 'owner-finance', 'murid', 'presensi', 'spp', 'gaji', 'logs'],
    ADMIN:  ['dashboard', 'murid', 'mentor', 'presensi', 'pembayaran', 'spp', 'buku', 'gaji'],
    MENTOR: ['dashboard', 'mentor-students', 'mentor-presensi']
  },


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

function buildSidebar(role) {
    const nav = document.getElementById('sidebar-nav');
    const brand = document.getElementById('sidebar-role-label');
    if (!nav) return;

    const groups = RBAC.groups[role] || [];
    const badge = RBAC.badges[role] || { cls: '', label: role };
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

    if (!username || !password) { 
      UI.toast('Username dan password diperlukan', 'error'); 
      return; 
    }

    // 1. Matikan tombol & pasang spinner
    btn.disabled = true;
    const originalText = btn.innerHTML; // Simpan teks asli (misal: "Login")
    btn.innerHTML = '<div class="spinner-sm"></div> Loading...';

    try {
      const res = await API.auth.login(username, password);
      
      if (res.status === 'OK') {
        setSession(res.data);
        showApp(res.data);
        
        const startPage = RBAC.defaultPage[res.data.role] || 'dashboard';
        
        // Cukup panggil navigate(startPage). 
        // Di dalam fungsi navigate() kamu sudah otomatis panggil loadPage().
        // Jadi nggak usah panggil loadPage() lagi di sini biar nggak narik API 2x.
        navigate(startPage);
        
        UI.toast('Selamat datang, ' + res.data.username + '!', 'success');
      } else {
        UI.toast(res.message || 'Login gagal', 'error');
      }
    } catch(err) {
      console.error(err);
      UI.toast('Koneksi gagal. Periksa URL API.', 'error');
    } finally {
      // 2. KUNCI UTAMA: Nyalakan lagi tombolnya kalau proses selesai/gagal
      // Supaya kalau user salah password, mereka bisa coba klik lagi tanpa refresh web
      btn.disabled = false;
      btn.innerHTML = originalText;
    }
  }

function handleLogout() {
    sessionStorage.clear();
    localStorage.clear();
    UI.toast('Berhasil keluar', 'info');
    window.location.replace(window.location.pathname); 
}

function showApp(user) {
    document.getElementById('login-screen').style.display = 'none';
    document.getElementById('app-shell').style.display = 'flex';

    const el = document.getElementById('current-date');
    if (el) {
      el.textContent = new Date().toLocaleDateString('id-ID', { 
        weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' 
      });
    }

    const badge = RBAC.badges[user.role] || { cls: '', label: user.role };
    const userDisplay = document.getElementById('user-display');
    if (userDisplay) {
      userDisplay.innerHTML = `<strong>${user.username}</strong><span class="role-badge ${badge.cls}">${badge.label}</span>`;
    }

    const av = document.getElementById('user-avatar');
    if (av) av.textContent = (user.username || '?')[0].toUpperCase();

    buildSidebar(user.role);
    applyPageVisibility(user.role);
}

  function applyPageVisibility(role) {
    const adminBtns = [
      'btn-tambah-murid', 'btn-tambah-mentor',
      'btn-tambah-presensi', 'btn-tambah-pembayaran',
      'btn-buat-spp', 'btn-tambah-buku', 'btn-bayar-gaji'
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

    document.getElementById('mobile-menu-btn').addEventListener('click', (e) => {
  e.stopPropagation(); // TAMBAHKAN INI: Agar klik tidak "tembus" ke bawah
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
      error: 'x-circle', 
      info: 'info', 
      warning: 'alert-triangle' 
    };

    toast.innerHTML = `<i data-lucide="${icons[type] || 'info'}"></i><span>${message}</span>`;
    container.appendChild(toast);
    lucide.createIcons({ nodes: [toast] });

    setTimeout(() => toast.classList.add('show'), 10);

    setTimeout(() => {
      toast.classList.remove('show');
      
      setTimeout(() => {
        if (toast.parentNode) {
          toast.remove();
        }
      }, 300);
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

async function handleSaveStudent(e) {
  e.preventDefault();
  const btn = e.target.querySelector('button[type="submit"]');
  if (!btn) return;

  const originalHTML = btn.innerHTML;

  btn.disabled = true;
  btn.innerHTML = '<span class="spinner-sm"></span> Menyimpan...';

  try {
    const formData = new FormData(e.target);
    const data = Object.fromEntries(formData.entries());
    
    const res = data.id ? await API.murid.update(data) : await API.murid.add(data);
    
    if (res.status === 'OK') {
      UI.toast('Berhasil disimpan!', 'success');
      UI.closeAllModals();
      App.navigate('murid');
    } else {
      UI.toast(res.message || 'Gagal menyimpan', 'error');
    }
  } catch (err) {
    UI.toast('Gagal: ' + err.message, 'error');
  } finally {
  
    btn.disabled = false;
    btn.innerHTML = originalHTML;
    lucide.createIcons({ nodes: [btn] });
  }
}

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
      if (sidebar && sidebar.classList.contains('open')) {
        sidebar.classList.remove('open');
      }
    });
  }

  const updateDate = () => {
    const el = document.getElementById('current-date');
    if (el) el.textContent = new Date().toLocaleDateString('id-ID', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
  };
  updateDate();

  const skrg = new Date();
  const offset = skrg.getTimezoneOffset() * 60000;
  const localDate = (new Date(skrg - offset)).toISOString().split('T')[0];
  ['presensi-tanggal','pay-tanggal','gaji-tgl','murid-tgl','mentor-presensi-tanggal'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.value = localDate;
  });

  lucide.createIcons();
});