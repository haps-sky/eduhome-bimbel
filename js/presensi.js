const PresensiPage = (() => {
  let allData         = [];
  let filteredData    = [];
  let isFetched       = false;
  let lastDeletedData = null;
  let lastAction      = null;
  let lastRestoredId  = null;

  async function load(forceRefresh = false) {
    const tbody = document.getElementById('presensi-tbody');
    if (!tbody) return;

    if (forceRefresh) {
      lastDeletedData = null;
      lastAction      = null;
      lastRestoredId  = null;
    }

    if (!forceRefresh && isFetched) {
      renderTable(allData.slice(-50).reverse());
      return;
    }

    tbody.innerHTML = '<tr><td colspan="9" class="empty-row"><div class="spinner spinner-sm"></div> Memuat data presensi...</td></tr>';

    try {
      const [presRes, muridRes, mentorRes] = await Promise.all([
        API.presensi.getAll(), API.murid.getAll(), API.mentor.getAll()
      ]);
      if (presRes.status === 'OK') {
        allData      = presRes.data || [];
        filteredData = [...allData];
        isFetched    = true;
        const ms     = document.getElementById('presensi-murid');
        if (ms && ms.options.length <= 1) populateDropdowns(muridRes.data || [], mentorRes.data || []);
        renderTable(allData.slice(-50).reverse());
      }
    } catch(e) {
      console.error(e);
      tbody.innerHTML = '<tr><td colspan="9" class="empty-row">Gagal memuat.</td></tr>';
    }
  }

  function populateDropdowns(murid, mentor) {
    const ms = document.getElementById('presensi-murid');
    if (ms) ms.innerHTML = '<option value="">-- Pilih Murid --</option>' +
      murid.filter(m => String(m.status).trim().toUpperCase() === 'AKTIF')
           .map(m => `<option value="${m.id}" data-nama="${m.nama}" data-program="${m.program}">${m.nama} (${m.program})</option>`).join('');
    const mt = document.getElementById('presensi-mentor');
    if (mt) mt.innerHTML = '<option value="">-- Pilih Mentor --</option>' +
      mentor.filter(m => String(m.status).trim().toUpperCase() === 'AKTIF')
            .map(m => `<option value="${m.id}" data-nama="${m.nama}">${m.nama}</option>`).join('');
  }

  function search(term) {
    const filtered = allData.filter(p =>
      (p.nama_murid  || '').toLowerCase().includes(term.toLowerCase()) ||
      (p.nama_mentor || '').toLowerCase().includes(term.toLowerCase()) ||
      (p.program     || '').toLowerCase().includes(term.toLowerCase())
    );
    renderTable(filtered);
  }

  function renderTable(data) {
    const role    = API.currentRole();
    const canEdit = role === 'ADMIN' || role === 'MENTOR';
    const rows    = data.map(p => `
      <tr>
        <td style="width:32px;">${Selection.checkbox('presensi', p.id)}</td>
        <td>${UI.formatDate(p.tanggal)}</td>
        <td><strong>${p.nama_murid}</strong></td>
        <td>${p.nama_mentor}</td>
        <td><span class="program-tag">${p.program}</span></td>
        <td>${UI.statusBadge(p.status)}</td>
        <td>${p.catatan || '-'}</td>
        <td>${UI.stars(p.bintang)}</td>
        <td>
          <div class="action-btns">
            ${canEdit ? `
            <button class="btn-icon btn-warning" onclick="PresensiPage.openEdit('${p.id}')" title="Edit">
              <i data-lucide="pencil"></i>
            </button>
            <button class="btn-icon btn-danger" data-delete-id="${p.id}" onclick="PresensiPage.deleteItem('${p.id}')" title="Hapus">
              <i data-lucide="trash-2"></i>
            </button>` : '-'}
          </div>
        </td>
      </tr>`);
    UI.renderTable('presensi-tbody', rows, 'Belum ada data presensi');
    lucide.createIcons({ nodes: [document.getElementById('presensi-tbody')] });
  }

  function filterByDate(date) {
    const filtered = date ? allData.filter(p => p.tanggal === date) : allData;
    renderTable([...filtered].reverse());
  }

  function openAdd() { clearForm(); }

  async function openEdit(id) {
    const p = allData.find(x => x.id === id);
    if (!p) return;
    document.getElementById('modal-presensi-title').textContent = 'Edit Presensi';
    document.getElementById('presensi-id-field').value  = p.id;
    document.getElementById('presensi-tanggal').value   = p.tanggal;
    document.getElementById('presensi-murid').value     = p.id_murid;
    document.getElementById('presensi-mentor').value    = p.id_mentor;
    document.getElementById('presensi-status').value    = p.status;
    document.getElementById('presensi-catatan').value   = p.catatan || '';
    document.getElementById('presensi-bintang').value   = p.bintang || 5;
    UI.openModal('modal-presensi');
  }

  function clearForm() {
    const titleEl = document.getElementById('modal-presensi-title');
    if (titleEl) titleEl.textContent = 'Catat Presensi Baru';
    document.getElementById('presensi-id-field').value  = '';
    const tglInput = document.getElementById('presensi-tanggal');
    if (tglInput) tglInput.value = '';
    document.getElementById('presensi-murid').value   = '';
    document.getElementById('presensi-mentor').value  = '';
    document.getElementById('presensi-status').value  = 'HADIR';
    document.getElementById('presensi-catatan').value = '';
    document.getElementById('presensi-bintang').value = 5;
    UI.openModal('modal-presensi');
  }

  async function saveForm() {
    const id        = document.getElementById('presensi-id-field').value;
    const tanggal   = document.getElementById('presensi-tanggal').value;
    const muridSel  = document.getElementById('presensi-murid');
    const mentorSel = document.getElementById('presensi-mentor');
    const status    = document.getElementById('presensi-status').value;
    const catatan   = document.getElementById('presensi-catatan').value.trim();
    const bintang   = document.getElementById('presensi-bintang').value;

    if (!tanggal || !muridSel.value) { UI.toast('Tanggal dan murid wajib diisi', 'error'); return; }

    const muridOpt  = muridSel.options[muridSel.selectedIndex];
    const mentorOpt = mentorSel.options[mentorSel.selectedIndex];

    const btn = document.getElementById('presensi-save-btn');
    if (btn) { btn.disabled = true; btn.innerHTML = `<div class="spinner spinner-sm"></div> ${id ? 'Memperbarui...' : 'Menyimpan...'}`; }

    try {
      const payload = {
        tanggal,
        id_murid:    muridSel.value,
        nama_murid:  muridOpt ? muridOpt.dataset.nama    : '',
        id_mentor:   mentorSel.value,
        nama_mentor: mentorOpt ? mentorOpt.dataset.nama  : '',
        program:     muridOpt ? muridOpt.dataset.program : '',
        status, catatan,
        bintang:     parseInt(bintang) || 0
      };

      const res = id
        ? await API.presensi.update({ id, ...payload })
        : await API.presensi.add(payload);

      if (res.status === 'OK') {
        UI.toast(id ? 'Presensi diperbarui' : 'Presensi berhasil dicatat!', 'success');
        UI.closeModal('modal-presensi');
        setTimeout(() => load(true), 500);
      } else {
        UI.toast(res.message || 'Gagal menyimpan', 'error');
      }
    } catch(e) {
      UI.toast('Error: ' + e.message, 'error');
    } finally {
      if (btn) { btn.disabled = false; btn.innerHTML = '<i data-lucide="save"></i> Simpan Presensi'; lucide.createIcons({ nodes: [btn] }); }
    }
  }

  async function deleteItem(id) {
    const p = allData.find(x => x.id === id);
    if (!confirm('Hapus presensi ini? Sisa pertemuan murid akan bertambah kembali secara otomatis.')) return;
    if (deleteItem._loading) return;
    deleteItem._loading = true;

    lastDeletedData = p ? JSON.parse(JSON.stringify(p)) : null;
    lastAction      = 'DELETE';

    const btn             = document.querySelector(`[data-delete-id="${id}"]`);
    const originalContent = btn ? btn.innerHTML : '';
    try {
      if (btn) { btn.disabled = true; btn.innerHTML = '<div class="spinner spinner-sm"></div>'; }
      const res = await API.presensi.delete(id);
      if (res.status === 'OK') {
        UI.toast('Data presensi berhasil dihapus & kuota SPP dikembalikan', 'success');
        if (window.SPPPage) SPPPage.invalidateCache();
        await load(true);
        const undoBtn = document.getElementById('presensi-undo-btn');
        if (undoBtn) undoBtn.disabled = false;
      } else {
        UI.toast(res.message || 'Gagal menghapus', 'error');
        if (btn) { btn.disabled = false; btn.innerHTML = originalContent; }
      }
    } catch(e) {
      UI.toast('Gagal terhubung ke server.', 'error');
      if (btn) { btn.disabled = false; btn.innerHTML = originalContent; }
    } finally {
      deleteItem._loading = false;
    }
  }

  async function undo() {
    if (!lastAction || !lastDeletedData) return;
    const undoBtn = document.getElementById('presensi-undo-btn');
    const redoBtn = document.getElementById('presensi-redo-btn');
    try {
      if (undoBtn) undoBtn.disabled = true;
      if (lastAction === 'DELETE') {
        const res = await API.presensi.add(lastDeletedData);
        if (res.status === 'OK') {
          UI.toast('Undo Berhasil: Presensi dikembalikan!', 'success');
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
    const redoBtn = document.getElementById('presensi-redo-btn');
    try {
      if (redoBtn) redoBtn.disabled = true;
      const res = await API.presensi.delete(lastRestoredId);
      if (res.status === 'OK') {
        UI.toast('Redo Berhasil: Presensi dihapus kembali!', 'success');
        lastAction     = 'DELETE';
        lastRestoredId = null;
        const undoBtn  = document.getElementById('presensi-undo-btn');
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
    if (!confirm(`PERINGATAN! Kamu akan menghapus SEMUA (${total}) data presensi.`)) return;
    const konfirmasi = prompt("Ketik 'HAPUS SEMUA PRESENSI' untuk melanjutkan:");
    if (konfirmasi !== 'HAPUS SEMUA PRESENSI') { UI.toast('Penghapusan massal dibatalkan.', 'error'); return; }
    UI.toast('Sedang membersihkan database...', 'info');
    try {
      const res = await API.presensi.deleteAll();
      if (res.status === 'OK') {
        UI.toast('Seluruh data presensi berhasil dihapus!', 'success');
        load(true);
      } else {
        UI.toast(res.message || 'Gagal menghapus semua data', 'error');
      }
    } catch(e) { UI.toast('Gagal menghapus semua data', 'error'); }
  }

  function deleteSelected()  { return Selection.deleteSelected('presensi'); }
  function _getCurrentData() { return allData; }

  return { load, search, saveForm, filterByDate, openAdd, openEdit, deleteItem, undo, redo, deleteAll, deleteSelected, renderTable, _getCurrentData };
})();