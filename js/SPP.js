const SPPPage = (() => {
  let allData         = [];
  let filteredData    = [];
  let isFetched       = false;
  let lastDeletedData = null;
  let lastAction      = null;
  let lastRestoredId  = null;

  async function load(forceRefresh = false) {
    const tbody = document.getElementById('spp-tbody');
    if (!tbody) return;

    if (forceRefresh) {
      lastDeletedData = null;
      lastAction      = null;
      lastRestoredId  = null;
    }

    if (!forceRefresh && isFetched) {
      renderTable(allData);
      initLiveCount();
      return;
    }

    tbody.innerHTML = '<tr><td colspan="13" class="empty-row"><div class="spinner spinner-sm"></div> Memuat data paket SPP...</td></tr>';

    try {
      const [sppRes, muridRes] = await Promise.all([API.spp.getAll(), API.murid.getAll()]);
      if (sppRes.status === 'OK') {
        allData      = (sppRes.data || []).sort((a, b) => a.id.localeCompare(b.id));
        filteredData = [...allData];
        isFetched    = true;
        const sel    = document.getElementById('spp-murid');
        if (sel && sel.options.length <= 1) populateMurid(muridRes.data || []);
        renderTable(allData);
      }
    } catch(e) {
      console.error('Gagal load SPP:', e);
      tbody.innerHTML = '<tr><td colspan="13" class="empty-row">Gagal memuat data paket SPP.</td></tr>';
    }
    initLiveCount();
  }

  function search(term) {
    const filtered = allData.filter(s =>
      (s.nama_murid || '').toLowerCase().includes(term.toLowerCase()) ||
      (s.program    || '').toLowerCase().includes(term.toLowerCase()) ||
      (s.id         || '').toLowerCase().includes(term.toLowerCase())
    );
    renderTable(filtered);
  }

  function initLiveCount() {
    ['spp-murid', 'spp-mulai', 'spp-akhir'].forEach(id => {
      const el = document.getElementById(id);
      if (el) el.addEventListener('change', calculateLiveSessions);
    });
  }

  async function calculateLiveSessions() {
    const id_murid = document.getElementById('spp-murid').value;
    const mulai    = document.getElementById('spp-mulai').value;
    const akhir    = document.getElementById('spp-akhir').value;
    const display  = document.getElementById('spp-count-preview');
    if (!id_murid || !mulai || !akhir || !display) return;
    display.innerHTML = '<div class="spinner-sm"></div> Menghitung...';
    try {
      const res     = await API.jadwal.getByMurid(id_murid);
      const hariLes = (res.data || []).map(j => j.hari.trim().toLowerCase());
      if (!hariLes.length) { display.textContent = 'Total: 0 Sesi (Jadwal kosong)'; return; }
      const dayMap     = { minggu: 0, senin: 1, selasa: 2, rabu: 3, kamis: 4, jumat: 5, sabtu: 6 };
      const targetDays = hariLes.map(h => dayMap[h]);
      const startDate  = new Date(mulai.replace(/-/g, '\/'));
      const endDate    = new Date(akhir.replace(/-/g, '\/'));
      startDate.setHours(0, 0, 0, 0);
      endDate.setHours(0, 0, 0, 0);
      let count = 0, cur = new Date(startDate);
      while (cur <= endDate) { if (targetDays.includes(cur.getDay())) count++; cur.setDate(cur.getDate() + 1); }
      display.innerHTML = `Total: <strong>${count}</strong> Sesi`;
    } catch(e) { display.textContent = 'Gagal menghitung'; }
  }

  function populateMurid(murid) {
    const sel = document.getElementById('spp-murid');
    if (!sel) return;
    sel.innerHTML = '<option value="">-- Pilih Murid --</option>' +
      murid.filter(m => m.status === 'AKTIF').map(m =>
        `<option value="${m.id}" data-nama="${m.nama}" data-program="${m.program}">${m.nama}</option>`).join('');
  }

  function renderTable(data) {
    const today = new Date().toISOString().split('T')[0];
    const rows  = data.map(s => {
      let st = s.status;
      if (st !== 'HABIS' && s.periode_akhir) {
        st = s.periode_akhir < today ? 'EXPIRED' : 'AKTIF';
      }
      return `
      <tr>
        <td style="width:32px;">${Selection.checkbox('spp', s.id)}</td>
        <td><span class="id-badge">${s.id}</span></td>
        <td><strong>${s.nama_murid}</strong></td>
        <td><span class="program-tag">${s.program}</span></td>
        <td>${UI.formatDate(s.periode_mulai)} – ${UI.formatDate(s.periode_akhir)}</td>
        <td>${s.total_pertemuan}</td>
        <td>${s.hadir} / ${s.sisa_pertemuan}</td>
        <td>
          <div class="progress-bar-wrap">
            <div class="progress-bar-fill" style="width:${s.total_pertemuan > 0 ? Math.round((s.hadir / s.total_pertemuan) * 100) : 0}%"></div>
          </div>
        </td>
        <td>${UI.statusBadge(st)}</td>
        <td>${UI.formatCurrency(s.harga)}</td>
        <td>${UI.formatCurrency(s.terbayar)}</td>
        <td>${UI.statusBadge(s.status_bayar)}</td>
        <td>
          <div class="action-btns">
            <button class="btn-icon btn-warning" onclick="SPPPage.openEdit('${s.id}')" title="Edit">
              <i data-lucide="pencil"></i>
            </button>
            <button class="btn-icon btn-danger" onclick="SPPPage.deleteSPP('${s.id}')" title="Hapus">
              <i data-lucide="trash-2"></i>
            </button>
          </div>
        </td>
      </tr>`;
    });
    UI.renderTable('spp-tbody', rows, 'Belum ada paket SPP');
    lucide.createIcons({ nodes: [document.getElementById('spp-tbody')] });
  }

  function openAdd() {
    document.getElementById('spp-modal-title').textContent = 'Buat Paket SPP';
    document.getElementById('spp-id-field').value          = '';
    const muridSel = document.getElementById('spp-murid');
    if (muridSel) { muridSel.value = ''; muridSel.disabled = false; }
    document.getElementById('spp-mulai').value = '';
    document.getElementById('spp-akhir').value = '';
    document.getElementById('spp-harga').value = '';
    const display = document.getElementById('spp-count-preview');
    if (display) display.textContent = 'Total: 0 Sesi';
    initLiveCount();
    UI.openModal('modal-spp');
  }

  async function openEdit(id) {
    document.getElementById('spp-modal-title').textContent = 'Edit Paket SPP';
    UI.openModal('modal-spp');
    const muridSel = document.getElementById('spp-murid');
    if (!allData.length || (muridSel && muridSel.options.length <= 1)) {
      const display = document.getElementById('spp-count-preview');
      if (display) display.innerHTML = '<span class="spinner"></span> Sinkronisasi data...';
      await load(true);
    }
    const s = allData.find(x => x.id === id);
    if (!s) { UI.toast('Data paket tidak ditemukan', 'error'); UI.closeModal('modal-spp'); return; }
    document.getElementById('spp-id-field').value = s.id;
    if (muridSel) {
      setTimeout(() => { muridSel.value = s.id_murid; muridSel.disabled = true; calculateLiveSessions(); }, 50);
    }
    document.getElementById('spp-mulai').value = s.periode_mulai;
    document.getElementById('spp-akhir').value = s.periode_akhir;
    document.getElementById('spp-harga').value = s.harga;
  }

  async function saveForm() {
    const id       = document.getElementById('spp-id-field').value;
    const btn      = document.querySelector('#modal-spp .btn-primary');
    const muridSel = document.getElementById('spp-murid');
    const mulai    = document.getElementById('spp-mulai').value;
    const akhir    = document.getElementById('spp-akhir').value;
    const harga    = parseFloat(document.getElementById('spp-harga').value) || 0;

    if (!muridSel.value || !mulai || !akhir) { UI.toast('Semua field wajib diisi', 'error'); return; }
    if (new Date(mulai) >= new Date(akhir)) { UI.toast('Periode akhir harus setelah periode mulai', 'error'); return; }

    const opt      = muridSel.options[muridSel.selectedIndex];
    const todaySPP = new Date().toISOString().split('T')[0];

    const paketMurid = allData.filter(p =>
      p.id_murid === muridSel.value &&
      p.id !== id &&
      p.periode_akhir >= todaySPP
    );
    for (const p of paketMurid) {
      const s = new Date(p.periode_mulai), e = new Date(p.periode_akhir);
      const mulaiNew = new Date(mulai), akhirNew = new Date(akhir);
      if (mulaiNew < e && akhirNew > s) {
        const fmt = d => new Date(d).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' });
        UI.toast(`Periode tumpang tindih dengan paket ${p.id} (${fmt(p.periode_mulai)} – ${fmt(p.periode_akhir)}).`, 'error');
        return;
      }
    }

    const payload = {
      id, id_murid: muridSel.value,
      nama_murid: opt.dataset.nama, program: opt.dataset.program,
      periode_mulai: mulai, periode_akhir: akhir, harga
    };

    try {
      if (btn) { btn.disabled = true; btn.innerHTML = '<div class="spinner spinner-sm"></div> Menyimpan paket...'; }
      const res = id ? await API.spp.update(payload) : await API.spp.create(payload);
      if (res.status === 'OK') {
        const msg = id
          ? 'Paket SPP berhasil diperbarui'
          : `Berhasil! ${res.data.total_pertemuan} sesi di periode ini.`;
        UI.toast(msg, 'success');
        UI.closeModal('modal-spp');
        load(true);
      } else { UI.toast(res.message || 'Gagal memproses paket SPP', 'error'); }
    } catch(e) { UI.toast('Gagal terhubung ke server', 'error'); }
    finally { if (btn) { btn.disabled = false; btn.innerHTML = 'Simpan Paket'; } }
  }

  async function deleteSPP(id) {
    if (!confirm(`Hapus paket SPP ${id}? Sisa pertemuan akan hilang.`)) return;
    const s         = allData.find(x => x.id === id);
    lastDeletedData = s ? JSON.parse(JSON.stringify(s)) : null;
    lastAction      = 'DELETE';

    const btn             = document.querySelector(`button[onclick*="deleteSPP('${id}'"]`);
    const originalContent = btn ? btn.innerHTML : '';
    try {
      if (btn) { btn.disabled = true; btn.innerHTML = '<div class="spinner spinner-sm"></div>'; btn.style.width = '40px'; }
      const res = await API.spp.delete(id);
      if (res.status === 'OK') {
        UI.toast('Paket berhasil dihapus. Klik Undo untuk membatalkan.', 'warning');
        allData = allData.filter(x => x.id !== id);
        renderTable(allData);
        const undoBtn = document.getElementById('spp-undo-btn');
        if (undoBtn) undoBtn.disabled = false;
      } else {
        UI.toast(res.message || 'Gagal menghapus', 'error');
        if (btn) { btn.disabled = false; btn.innerHTML = originalContent; btn.style.width = ''; }
      }
    } catch(e) {
      UI.toast('Gagal terhubung ke server', 'error');
      if (btn) { btn.disabled = false; btn.innerHTML = originalContent; btn.style.width = ''; }
    }
  }

  async function undo() {
    if (!lastAction || !lastDeletedData) return;
    const undoBtn = document.getElementById('spp-undo-btn');
    const redoBtn = document.getElementById('spp-redo-btn');
    try {
      if (undoBtn) undoBtn.disabled = true;
      if (lastAction === 'DELETE') {
        const res = await API.spp.create(lastDeletedData);
        if (res.status === 'OK') {
          UI.toast('Undo Berhasil: Paket SPP dikembalikan!', 'success');
          lastRestoredId = res.data?.id || lastDeletedData.id;
          lastAction     = 'UNDO_DELETE';
          if (redoBtn) redoBtn.disabled = false;
          load(true);
        } else {
          UI.toast(res.message || 'Undo gagal', 'error');
          if (undoBtn) undoBtn.disabled = false;
        }
      }
    } catch(e) { UI.toast('Gagal melakukan Undo', 'error'); if (undoBtn) undoBtn.disabled = false; }
  }

  async function redo() {
    if (!lastRestoredId || lastAction !== 'UNDO_DELETE') return;
    const redoBtn = document.getElementById('spp-redo-btn');
    try {
      if (redoBtn) redoBtn.disabled = true;
      const res = await API.spp.delete(lastRestoredId);
      if (res.status === 'OK') {
        UI.toast('Redo Berhasil: Paket SPP dihapus kembali!', 'success');
        lastAction     = 'DELETE';
        lastRestoredId = null;
        const undoBtn  = document.getElementById('spp-undo-btn');
        if (undoBtn) undoBtn.disabled = false;
        load(true);
      } else {
        UI.toast(res.message || 'Redo gagal', 'error');
        if (redoBtn) redoBtn.disabled = false;
      }
    } catch(e) { UI.toast('Gagal melakukan Redo', 'error'); if (redoBtn) redoBtn.disabled = false; }
  }

  async function deleteAll() {
    const total = allData.length;
    if (total === 0) return UI.toast('Tidak ada data untuk dihapus', 'info');
    if (!confirm(`PERINGATAN! Kamu akan menghapus SEMUA (${total}) paket SPP.`)) return;
    const konfirmasi = prompt("Ketik 'HAPUS SEMUA SPP' untuk melanjutkan:");
    if (konfirmasi !== 'HAPUS SEMUA SPP') { UI.toast('Penghapusan massal dibatalkan.', 'error'); return; }
    UI.toast('Sedang membersihkan database...', 'info');
    try {
      const res = await API.spp.deleteAll();
      if (res.status === 'OK') {
        UI.toast('Seluruh paket SPP berhasil dihapus!', 'success');
        load(true);
      } else {
        UI.toast(res.message || 'Gagal menghapus semua data', 'error');
      }
    } catch(e) { UI.toast('Gagal menghapus semua data', 'error'); }
  }

  function invalidateCache() { isFetched = false; }
  function deleteSelected()  { return Selection.deleteSelected('spp'); }
  function _getCurrentData() { return allData; }

  return { load, search, saveForm, openAdd, openEdit, deleteSPP, initLiveCount, calculateLiveSessions, undo, redo, deleteAll, deleteSelected, renderTable, _getCurrentData, invalidateCache };
})();

window.SPPPage = SPPPage;