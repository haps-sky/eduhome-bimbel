const GajiPage = (() => {
  let allData         = [];
  let filteredData    = [];
  let isFetched       = false;
  let lastDeletedData = null;
  let lastAction      = null;
  let lastRestoredId  = null;

  async function load(forceRefresh = false) {
    const tbody = document.getElementById('gaji-tbody');
    if (!tbody) return;

    if (forceRefresh) {
      lastDeletedData = null;
      lastAction      = null;
      lastRestoredId  = null;
    }

    if (!forceRefresh && isFetched) {
      renderTable(allData);
      return;
    }
      tbody.innerHTML = '<tr><td colspan="8" class="empty-row"><div class="spinner spinner-sm"></div> Memuat data gaji...</td></tr>';

    try {
      const [gajiRes, mentorRes] = await Promise.all([API.gaji.getAll(), API.mentor.getAll()]);
      if (gajiRes.status === 'OK') {
        allData      = gajiRes.data || [];
        filteredData = [...allData];
        isFetched    = true;
        const sel    = document.getElementById('gaji-mentor');
        if (sel && sel.options.length <= 1) populateMentor(mentorRes.data || []);
        renderTable(allData);
      }
    } catch(e) {
      console.error('Error Load Gaji:', e);
      if (!allData.length) tbody.innerHTML = '<tr><td colspan="8" class="empty-row">Gagal memuat data.</td></tr>';
    }
  }

  function search(term) {
    const filtered = allData.filter(g =>
      (g.nama_mentor||'').toLowerCase().includes(term.toLowerCase()) ||
      (g.bulan_gaji ||'').toLowerCase().includes(term.toLowerCase()) ||
      (g.id_trx    ||'').toLowerCase().includes(term.toLowerCase())
    );
    renderTable(filtered);
  }

  function populateMentor(mentors) {
    const sel = document.getElementById('gaji-mentor');
    if (!sel) return;
    sel.innerHTML = '<option value="">-- Pilih Mentor --</option>' +
      mentors.map(m => `<option value="${m.id}">${m.nama}</option>`).join('');
  }

  function _formatBulanGaji(raw) {
    if (!raw) return '-';
    try {
      const d = new Date(raw);
      if (!isNaN(d)) return d.toLocaleDateString('id-ID', { month: 'long', year: 'numeric' });
    } catch(e) {}
    return raw;
  }

  function renderTable(data) {
    const rows = data.map(g => `
      <tr>
        <td style="width:32px;">${Selection.checkbox('gaji', g.id_trx)}</td>
        <td><span class="id-badge">${g.id_trx}</span></td>
        <td>${UI.formatDate(g.tgl_bayar)}</td>
        <td>${_formatBulanGaji(g.bulan_gaji)}</td>
        <td><strong>${g.nama_mentor}</strong></td>
        <td><strong class="text-success">${UI.formatCurrency(g.jumlah)}</strong></td>
        <td>${g.metode}</td>
        <td>
          <div class="action-btns">
            <button class="btn-icon btn-warning" onclick="GajiPage.openEdit('${g.id_trx}')" title="Edit">
              <i data-lucide="pencil"></i>
            </button>
            <button class="btn-icon btn-danger" data-delete-id="${g.id_trx}"
                    onclick="GajiPage.deleteGaji('${g.id_trx}','${(g.nama_mentor||'').replace(/'/g,"\\'")}')">
              <i data-lucide="trash-2"></i>
            </button>
          </div>
        </td>
      </tr>`);
    UI.renderTable('gaji-tbody', rows, 'Belum ada data penggajian');
    lucide.createIcons({ nodes: [document.getElementById('gaji-tbody')] });
  }

  function openAdd() {
    clearForm();
    const title = document.getElementById('modal-gaji-title');
    if (title) title.textContent = 'Catat Penggajian Baru';
    document.getElementById('gaji-id-field').value = '';
    const mentorSel = document.getElementById('gaji-mentor');
    if (mentorSel) { mentorSel.value = ''; mentorSel.disabled = false; }
    document.getElementById('gaji-bulan').value = '';
    document.getElementById('gaji-tgl').value   = new Date().toISOString().split('T')[0];
    UI.openModal('modal-gaji');
  }

  function openEdit(id) {
    const g = allData.find(x => x.id_trx === id);
    if (!g) return;
    clearForm();
    document.getElementById('modal-gaji-title').textContent = 'Edit Catatan Gaji';
    document.getElementById('gaji-id-field').value          = g.id_trx;
    document.getElementById('gaji-mentor').value            = g.id_mentor;
    document.getElementById('gaji-bulan').value             = g.bulan_gaji;
    document.getElementById('gaji-tgl').value               = g.tgl_bayar;
    document.getElementById('gaji-metode').value            = g.metode;
    const mentorSel = document.getElementById('gaji-mentor');
    if (mentorSel) mentorSel.disabled = true;
    UI.openModal('modal-gaji');
  }

  function clearForm() {
    const idField = document.getElementById('gaji-id-field');
    if (idField) idField.value = '';
    const mentorSel = document.getElementById('gaji-mentor');
    if (mentorSel) { mentorSel.value = ''; mentorSel.disabled = false; }
    const bulanInput = document.getElementById('gaji-bulan');
    if (bulanInput) bulanInput.value = '';
    const tglInput = document.getElementById('gaji-tgl');
    if (tglInput) tglInput.value = new Date().toISOString().split('T')[0];
    const metodeInput = document.getElementById('gaji-metode');
    if (metodeInput) metodeInput.value = 'TRANSFER';
  }

  async function saveForm() {
    const btn        = document.querySelector('#modal-gaji .btn-primary');
    const id         = document.getElementById('gaji-id-field').value;
    const mentorSel  = document.getElementById('gaji-mentor');
    const bulan_gaji = document.getElementById('gaji-bulan').value;
    const tgl_bayar  = document.getElementById('gaji-tgl').value;
    const metode     = document.getElementById('gaji-metode').value;

    if (!mentorSel.value || !bulan_gaji) { UI.toast('Mentor dan bulan gaji wajib diisi', 'error'); return; }

    const payload = { id_mentor: mentorSel.value, bulan_gaji, tgl_bayar, metode };

    try {
      if (btn) { btn.disabled = true; btn.innerHTML = '<div class="spinner spinner-sm"></div> Memproses...'; }
      const res = id ? await API.gaji.update({ id, ...payload }) : await API.gaji.record(payload);
      if (res.status === 'OK') {
        UI.toast(id ? 'Data gaji berhasil diperbarui' : 'Gaji berhasil dicatat!', 'success');
        UI.closeModal('modal-gaji');
        await load(true);
      } else { UI.toast(res.message || 'Gagal menyimpan data', 'error'); }
    } catch(e) { UI.toast('Terjadi kesalahan koneksi ke server', 'error'); }
    finally { if (btn) { btn.disabled = false; btn.innerHTML = 'Simpan Penggajian'; } }
  }

  async function deleteGaji(id, nama) {
    const g = allData.find(x => x.id_trx === id);
    if (!confirm(`Hapus catatan gaji untuk "${nama}"?`)) return;

    lastDeletedData = g ? JSON.parse(JSON.stringify(g)) : null;
    lastAction      = 'DELETE';

    const btn             = document.querySelector(`button[data-delete-id="${id}"]`);
    const originalContent = btn ? btn.innerHTML : '';
    try {
      if (btn) { btn.disabled = true; btn.innerHTML = '<div class="spinner spinner-sm"></div>'; btn.style.width = '40px'; }
      const res = await API.gaji.delete(id);
      if (res.status === 'OK') {
        UI.toast(`Catatan gaji "${nama}" berhasil dihapus. Klik Undo untuk membatalkan.`, 'warning');
        allData = allData.filter(x => x.id_trx !== id);
        renderTable(allData);
        const undoBtn = document.getElementById('gaji-undo-btn');
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
    const undoBtn = document.getElementById('gaji-undo-btn');
    const redoBtn = document.getElementById('gaji-redo-btn');
    try {
      if (undoBtn) undoBtn.disabled = true;
      if (lastAction === 'DELETE') {
        const res = await API.gaji.record(lastDeletedData);
        if (res.status === 'OK') {
          UI.toast('Undo Berhasil: Catatan gaji dikembalikan!', 'success');
          lastRestoredId = res.data?.id || lastDeletedData.id_trx;
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
    const redoBtn = document.getElementById('gaji-redo-btn');
    try {
      if (redoBtn) redoBtn.disabled = true;
      const res = await API.gaji.delete(lastRestoredId);
      if (res.status === 'OK') {
        UI.toast('Redo Berhasil: Catatan gaji dihapus kembali!', 'success');
        lastAction     = 'DELETE';
        lastRestoredId = null;
        const undoBtn  = document.getElementById('gaji-undo-btn');
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
    if (!confirm(`PERINGATAN! Kamu akan menghapus SEMUA (${total}) catatan gaji.`)) return;
    const konfirmasi = prompt("Ketik 'HAPUS SEMUA GAJI' untuk melanjutkan:");
    if (konfirmasi !== 'HAPUS SEMUA GAJI') { UI.toast('Penghapusan massal dibatalkan.', 'error'); return; }
    UI.toast('Sedang membersihkan database...', 'info');
    try {
      const res = await API.gaji.deleteAll();
      if (res.status === 'OK') {
        UI.toast('Seluruh catatan gaji berhasil dihapus!', 'success');
        load(true);
      } else {
        UI.toast(res.message || 'Gagal menghapus semua data', 'error');
      }
    } catch(e) { UI.toast('Gagal menghapus semua data', 'error'); }
  }

  function deleteSelected()  { return Selection.deleteSelected('gaji'); }
  function _getCurrentData() { return allData; }

  return { load, search, saveForm, openAdd, openEdit, deleteGaji, clearForm, undo, redo, deleteAll, deleteSelected, renderTable, _getCurrentData };
})();

window.GajiPage = GajiPage;