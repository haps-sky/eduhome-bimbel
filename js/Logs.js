// ============================================================
// ============================================================
// LogsPage — Enhanced: toolbar, undo/redo, hapus, tampilan rapi
// ============================================================
const LogsPage = (() => {
  let allData = [];
  let lastDeletedData = null;
  let lastAction = null;

  const EVENT_LABELS = {
    'ADD_MURID':'Tambah Murid','UPDATE_MURID':'Edit Murid','DELETE_MURID':'Hapus Murid',
    'DELETE_ALL_MURID':'Hapus Semua Murid','ADD_MENTOR':'Tambah Mentor',
    'UPDATE_MENTOR':'Edit Mentor','DELETE_MENTOR':'Hapus Mentor',
    'DELETE_ALL_MENTOR':'Hapus Semua Mentor','ADD_PRESENSI':'Catat Presensi',
    'UPDATE_PRESENSI':'Edit Presensi','DELETE_PRESENSI':'Hapus Presensi',
    'DELETE_ALL_PRESENSI':'Hapus Semua Presensi','ADD_PEMBAYARAN':'Catat Pembayaran',
    'UPDATE_PEMBAYARAN':'Edit Pembayaran','DELETE_PEMBAYARAN':'Hapus Pembayaran',
    'DELETE_ALL_PEMBAYARAN':'Hapus Semua Pembayaran','ADD_BUKU':'Tambah Modul Buku',
    'UPDATE_BUKU':'Edit Modul Buku','DELETE_BUKU':'Hapus Modul Buku',
    'DELETE_ALL_BUKU':'Hapus Semua Modul','KURANGI_STOK_BUKU':'Stok Buku Berkurang',
    'KEMBALIKAN_STOK_BUKU':'Stok Buku Dikembalikan','CREATE_SPP':'Buat Paket SPP',
    'UPDATE_SPP':'Edit Paket SPP','DELETE_SPP':'Hapus Paket SPP',
    'DELETE_ALL_SPP':'Hapus Semua SPP','RECORD_GAJI':'Catat Gaji Mentor',
    'UPDATE_GAJI':'Edit Gaji','DELETE_GAJI':'Hapus Gaji','DELETE_ALL_GAJI':'Hapus Semua Gaji',
    'UNAUTHORIZED':'⚠ Akses Ditolak',
  };

  async function load(forceRefresh = false) {
    const tbody = document.getElementById('logs-tbody');
    if (!tbody) return;
    tbody.innerHTML = `<tr><td colspan="5" class="empty-row"><div class="spinner spinner-sm" style="margin:0 auto 6px"></div> Memuat log...</td></tr>`;
    try {
      const res = await API.logs.getAll();
      allData = res.data || [];
      renderTable(allData);
      _updateBtns();
    } catch(e) {
      tbody.innerHTML = `<tr><td colspan="5" class="empty-row">Gagal memuat log</td></tr>`;
    }
  }

  function renderTable(data) {
    const rows = data.map(l => {
      const ts = l.timestamp ? new Date(l.timestamp) : null;
      const tgl = ts ? ts.toLocaleDateString('id-ID',{day:'2-digit',month:'short',year:'numeric'}) : '-';
      const jam = ts ? ts.toLocaleTimeString('id-ID',{hour:'2-digit',minute:'2-digit',second:'2-digit'}) : '';
      const label = EVENT_LABELS[l.event] || l.event || '-';
      const lvlCls = l.level==='ERROR'?'badge-danger':l.level==='WARN'?'badge-warning':'badge-success';
      const icon = l.level==='ERROR'?'x-circle':l.level==='WARN'?'alert-triangle':'check-circle';
      return `<tr>
        <td><div style="font-weight:600;font-size:0.82rem;">${tgl}</div><div style="font-size:0.75rem;color:var(--text-dim);">${jam}</div></td>
        <td><span class="badge ${lvlCls}" style="display:inline-flex;align-items:center;gap:4px;"><i data-lucide="${icon}" style="width:11px;height:11px;"></i>${l.level}</span></td>
        <td><strong>${label}</strong></td>
        <td style="font-size:0.82rem;color:var(--text-secondary);max-width:280px;word-break:break-word;">${l.detail||'-'}</td>
        <td><span style="background:var(--bg-hover);padding:2px 8px;border-radius:99px;font-size:0.8rem;">${l.user||'system'}</span></td>
      </tr>`;
    });
    UI.renderTable('logs-tbody', rows, 'Tidak ada log sistem');
    if (window.lucide) lucide.createIcons();
  }

  function search(term) {
    if (!term.trim()) { renderTable(allData); return; }
    const t = term.toLowerCase();
    renderTable(allData.filter(l =>
      (l.event||'').toLowerCase().includes(t) ||
      (l.detail||'').toLowerCase().includes(t) ||
      (l.user||'').toLowerCase().includes(t) ||
      (EVENT_LABELS[l.event]||'').toLowerCase().includes(t)
    ));
  }

  async function clearLogs() {
    if (API.currentRole() !== 'OWNER') { UI.toast('Hanya Owner yang dapat menghapus log','error'); return; }
    if (!allData.length) { UI.toast('Log sudah kosong','info'); return; }
    if (!confirm(`Hapus semua ${allData.length} log sistem? Tindakan ini tidak dapat dibatalkan.`)) return;
    const konfirmasi = prompt("Ketik 'HAPUS LOG' untuk melanjutkan:");
    if (konfirmasi !== 'HAPUS LOG') { if (konfirmasi !== null) UI.toast('Konfirmasi salah, penghapusan dibatalkan','warning'); return; }
    lastDeletedData = [...allData];
    lastAction = 'DELETE_ALL';
    UI.toast('Menghapus semua log...','info');
    try {
      const res = await API.logs.clearAll();
      if (res.status === 'OK') {
        allData = [];
        renderTable([]);
        UI.toast('Semua log berhasil dihapus. Data masih bisa dilihat via Undo (sesi ini).','warning');
        _updateBtns();
      } else {
        UI.toast(res.message || 'Gagal menghapus log','error');
        lastAction = null; lastDeletedData = null;
        _updateBtns();
      }
    } catch(e) { UI.toast('Gagal terhubung ke server','error'); lastAction = null; _updateBtns(); }
  }

  function undo() {
    if (lastAction !== 'DELETE_ALL' || !lastDeletedData?.length) return;
    // Log sudah dihapus dari server — tampilkan in-memory saja
    allData = lastDeletedData;
    renderTable(allData);
    lastAction = 'UNDO';
    _updateBtns();
    UI.toast('Menampilkan log sebelum dihapus (tampilan sementara sesi ini)','info');
  }

  function redo() {
    if (lastAction !== 'UNDO') return;
    allData = [];
    renderTable([]);
    lastAction = 'DELETE_ALL';
    _updateBtns();
  }

  function _updateBtns() {
    const u = document.getElementById('logs-undo-btn');
    const r = document.getElementById('logs-redo-btn');
    if (u) u.disabled = lastAction !== 'DELETE_ALL';
    if (r) r.disabled = lastAction !== 'UNDO';
  }

  return { load, search, clearLogs, undo, redo };
})();

window.LogsPage = LogsPage;