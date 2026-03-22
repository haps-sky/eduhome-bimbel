// ============================================================
// EduHome Dashboard Module — js/dashboard.js
// Role-aware: MENTOR sees personal stats only, no finance.
// ADMIN/OWNER see full analytics + finance.
// ============================================================

const Dashboard = (() => {

  async function load() {
    const user = API.currentUser();
    const role = user.role || 'ADMIN';

    try {
      const res = await API.dashboard.getStats();
      if (res.status !== 'OK') { UI.toast('Gagal memuat dashboard', 'error'); return; }
      const d = res.data;

      renderKPICards(d, role);

      // Finance: only ADMIN and OWNER
      if (role !== 'MENTOR' && d.finance) {
        renderFinanceCards(d.finance);
      }

      // Mentor personal stats
      if (role === 'MENTOR' && d.my_stats) {
        renderMentorPersonalStats(d.my_stats);
      }

      renderTopStudents(d.top_students);
      renderMentorPerformance(d.mentor_performance);
      renderRecentActivity(d.recent_attendance);
      renderLowSessions(d.low_sessions);

    } catch(e) {
      UI.toast('Error dashboard: ' + e.message, 'error');
    }
  }

  function renderKPICards(d, role) {
    const cards = [
      { id: 'kpi-murid',      val: d.students.active + '/' + d.students.total },
      { id: 'kpi-mentor',     val: d.mentors.active  + '/' + d.mentors.total  },
      { id: 'kpi-spp',        val: d.spp.active },
      { id: 'kpi-presensi',   val: d.attendance.today }
    ];

    // Finance KPIs only for ADMIN/OWNER
    if (role !== 'MENTOR' && d.payments) {
      cards.push({ id: 'kpi-pembayaran', val: UI.formatCurrency(d.payments.today) });
      cards.push({ id: 'kpi-unpaid',     val: d.spp.unpaid });
    }

    cards.forEach(c => {
      const el = document.getElementById(c.id);
      if (el) el.textContent = c.val;
    });
  }

  function renderFinanceCards(f) {
    const items = {
      'fin-spp':         f.total_spp,
      'fin-operational': f.total_operational,
      'fin-savings':     f.total_savings,
      'fin-revenue':     f.total_revenue
    };
    Object.entries(items).forEach(([id, val]) => {
      const el = document.getElementById(id);
      if (el) el.textContent = UI.formatCurrency(val);
    });
  }

  function renderMentorPersonalStats(stats) {
    const todayEl = document.getElementById('kpi-my-today');
    const monthEl = document.getElementById('kpi-my-month');
    if (todayEl) todayEl.textContent = stats.sessions_today;
    if (monthEl) monthEl.textContent = stats.sessions_this_month;
  }

  function renderTopStudents(students) {
    const rows = (students || []).map((s, i) => `
      <tr>
        <td><span class="rank-badge">${i + 1}</span></td>
        <td>${s.nama}</td>
        <td>${UI.stars(s.total_bintang)}</td>
      </tr>`);
    UI.renderTable('top-students-body', rows, 'Belum ada data bintang');
  }

  function renderMentorPerformance(mentors) {
    const rows = (mentors || []).map(m => `
      <tr>
        <td>${m.nama || '-'}</td>
        <td><span class="pill">${m.sessions} sesi</span></td>
      </tr>`);
    UI.renderTable('mentor-perf-body', rows, 'Belum ada data bulan ini');
  }

  function renderRecentActivity(activities) {
    const feed = document.getElementById('activity-feed');
    if (!feed) return;
    if (!activities || activities.length === 0) {
      feed.innerHTML = '<div class="empty-feed">Tidak ada aktivitas terbaru</div>';
      return;
    }
    feed.innerHTML = activities.map(a => `
      <div class="activity-item">
        <div class="activity-icon ${a.status === 'HADIR' ? 'icon-success' : 'icon-warning'}">
          <i data-lucide="${a.status === 'HADIR' ? 'user-check' : 'user-x'}"></i>
        </div>
        <div class="activity-content">
          <div class="activity-name">${a.nama_murid || '-'}</div>
          <div class="activity-meta">${a.program || ''} · ${a.nama_mentor || ''} · ${UI.stars(a.bintang)}</div>
        </div>
        <div class="activity-date">${UI.formatDate(a.tanggal)}</div>
      </div>`).join('');
    lucide.createIcons({ nodes: [feed] });
  }

  function renderLowSessions(sessions) {
    const el = document.getElementById('low-sessions-list');
    if (!el) return;
    if (!sessions || sessions.length === 0) {
      el.innerHTML = '<div class="empty-feed">Semua paket masih mencukupi</div>';
      return;
    }
    el.innerHTML = sessions.map(s => `
      <div class="alert-row">
        <i data-lucide="alert-triangle" class="icon-warning-sm"></i>
        <div>
          <strong>${s.nama}</strong>
          <small>${s.program} — sisa ${s.sisa} pertemuan</small>
        </div>
      </div>`).join('');
    lucide.createIcons({ nodes: [el] });
  }

  return { load };
})();
