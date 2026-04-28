const MentorPage = (() => {
  let allData         = [];
  let filteredData    = [];
  let isFetched       = false;
  let lastDeletedData = null;
  let lastAction      = null;
  let lastAddedId     = null;
  let lastRestoredId  = null;

  async function load(forceRefresh = false) {
    const tbody = document.getElementById('mentor-tbody');
    if (!tbody) return;

    if (forceRefresh) {
      lastDeletedData = null;
      lastAction      = null;
      lastRestoredId  = null;
    }

    if (!forceRefresh && isFetched) {
      renderTable(allData);
      updateSummary(allData);
      return;
    }
      tbody.innerHTML = '<tr><td colspan="9" class="empty-row"><div class="spinner spinner-sm"></div> Memuat data mentor...</td></tr>';

    try {
      const res = await API.mentor.getAll();
      if (res.status === 'OK') {
        allData      = (res.data || []).sort((a, b) => a.id.localeCompare(b.id));
        filteredData = [...allData];
        isFetched    = true;
        renderTable(allData);
        updateSummary(allData);
      }
    } catch(e) {
      console.error('Error Load Mentor:', e);
      if (!allData.length) tbody.innerHTML = '<tr><td colspan="9" class="empty-row">Gagal memuat data mentor.</td></tr>';
    }
  }

  function renderTable(data) {
    const role    = API.currentRole();
    const canEdit = role === 'ADMIN';
    const rows    = data.map(m => {
      const color  = m.jk === 'L' ? '#689bee' : '#e76fab';
      const jkText = m.jk === 'L' ? '♂ Laki-laki' : '♀ Perempuan';
      return `
        <tr>
          <td style="width:32px;">${Selection.checkbox('mentor', m.id)}</td>
          <td><span class="id-badge">${m.id}</span></td>
          <td>
            <div class="name-cell">
              <span class="avatar-initial mentor-avatar" style="background:${color}20;color:${color};">
                ${(m.nama || '?')[0].toUpperCase()}
              </span>
              <div>
                <strong>${m.nama}</strong>
                <small style="display:block;color:${color};font-weight:500;margin-top:2px;">${jkText}</small>
              </div>
            </div>
          </td>
          <td>${m.kontak || '-'}</td>
          <td><span class="program-tag">${m.program}</span></td>
          <td>${UI.statusBadge(m.status)}</td>
          <td>${UI.formatCurrency(m.fee_anak)}</td>
          <td>${UI.formatCurrency(m.fee_harian)}</td>
          <td>
            <div class="action-btns">
              ${canEdit ? `
              <button class="btn-icon btn-warning" onclick="MentorPage.openEdit('${m.id}')" title="Edit">
                <i data-lucide="pencil"></i>
              </button>
              <button class="btn-icon btn-danger" onclick="MentorPage.deleteMentor('${m.id}','${(m.nama||'').replace(/'/g,"\\'")}')" title="Hapus">
                <i data-lucide="trash-2"></i>
              </button>` : '-'}
            </div>
          </td>
        </tr>`;
    });
    UI.renderTable('mentor-tbody', rows, 'Belum ada data mentor');
    lucide.createIcons({ nodes: [document.getElementById('mentor-tbody')] });
  }

  function updateSummary(data) {
    const totalEl = document.getElementById('mentor-total-count');
    const aktifEl = document.getElementById('mentor-active-count');
    if (totalEl) totalEl.textContent = data.length;
    if (aktifEl) aktifEl.textContent = data.filter(m => m.status === 'AKTIF').length;
  }

  function search(term) {
    const filtered = allData.filter(m =>
      m.nama.toLowerCase().includes(term.toLowerCase())    ||
      m.program.toLowerCase().includes(term.toLowerCase()) ||
      m.id.toLowerCase().includes(term.toLowerCase())
    );
    renderTable(filtered);
  }

  function openAdd() {
    clearForm();
    const title = document.getElementById('mentor-modal-title');
    if (title) title.textContent = 'Tambah Mentor Baru';
    UI.openModal('modal-mentor');
  }

  async function openEdit(id) {
    if (!allData.length) { UI.toast('Memuat data...', 'info'); await load(); }
    const m = allData.find(x => x.id === id);
    if (!m) { UI.toast('Data mentor tidak ditemukan', 'error'); return; }
    document.getElementById('mentor-modal-title').textContent  = 'Edit Mentor';
    document.getElementById('mentor-id-field').value           = m.id;
    document.getElementById('mentor-nama').value               = m.nama;
    const jkField = document.getElementById('mentor-jk');
    if (jkField) jkField.value = m.jk || 'L';
    document.getElementById('mentor-kontak').value             = m.kontak     || '';
    document.getElementById('mentor-program').value            = m.program    || '';
    document.getElementById('mentor-status').value             = m.status;
    document.getElementById('mentor-fee-anak').value           = m.fee_anak;
    document.getElementById('mentor-fee-harian').value         = m.fee_harian;
    UI.openModal('modal-mentor');
  }

  function clearForm() {
    ['mentor-id-field', 'mentor-nama', 'mentor-kontak', 'mentor-program', 'mentor-fee-anak', 'mentor-fee-harian'].forEach(id => {
      const el = document.getElementById(id); if (el) el.value = '';
    });
    const jk = document.getElementById('mentor-jk');
    if (jk) jk.selectedIndex = 0;
    const status = document.getElementById('mentor-status');
    if (status) status.value = 'AKTIF';
  }

  async function saveForm() {
    const id         = document.getElementById('mentor-id-field').value;
    const nama       = document.getElementById('mentor-nama').value.trim();
    const jk         = document.getElementById('mentor-jk').value;
    const program    = document.getElementById('mentor-program').value.trim();
    const kontak     = document.getElementById('mentor-kontak').value.trim();
    const status     = document.getElementById('mentor-status').value;
    const fee_anak   = document.getElementById('mentor-fee-anak').value;
    const fee_harian = document.getElementById('mentor-fee-harian').value;

    if (!nama)    return UI.toast('Nama mentor wajib diisi!', 'error');
    if (!jk)      return UI.toast('Jenis kelamin wajib dipilih!', 'error');
    if (!program) return UI.toast('Program wajib diisi!', 'error');
    if (!kontak)  return UI.toast('Kontak WA wajib diisi!', 'error');
    if (fee_anak === '' || fee_harian === '') return UI.toast('Fee wajib diisi (boleh 0)!', 'error');

    const payload = { nama, jk, program, kontak, status, fee_anak: Number(fee_anak), fee_harian: Number(fee_harian) };
    const btn     = document.getElementById('mentor-save-btn');

    try {
      if (btn) { btn.disabled = true; btn.innerHTML = '<div class="spinner spinner-sm"></div> Menyimpan...'; }
      const res = id ? await API.mentor.update({ id, ...payload }) : await API.mentor.add(payload);
      if (res.status === 'OK') {
        UI.toast(id ? 'Data mentor diperbarui' : 'Mentor berhasil ditambahkan', 'success');
        if (!id) { lastAddedId = res.data?.id || null; lastAction = 'ADD'; }
        UI.closeModal('modal-mentor');
        setTimeout(() => load(true), 800);
      } else {
        UI.toast(res.message || 'Gagal menyimpan data', 'error');
      }
    } catch(e) {
      console.error('Error Save Mentor:', e);
      UI.toast('Terjadi kesalahan koneksi', 'error');
    } finally {
      if (btn) { btn.disabled = false; btn.innerHTML = '<i data-lucide="save"></i> Simpan'; lucide.createIcons({ nodes: [btn] }); }
    }
  }

  async function deleteMentor(id, nama) {
    const m = allData.find(x => x.id === id);
    if (!m) return;
    const verifikasi = prompt(`Ketik nama mentor "${nama}" untuk mengonfirmasi penghapusan:`);
    if (verifikasi !== nama) { if (verifikasi !== null) UI.toast('Konfirmasi nama salah!', 'error'); return; }

    lastDeletedData = JSON.parse(JSON.stringify(m));
    lastAction      = 'DELETE';

    const btn             = document.querySelector(`button[onclick*="deleteMentor('${id}'"]`);
    const originalContent = btn ? btn.innerHTML : '';
    try {
      if (btn) { btn.disabled = true; btn.innerHTML = '<div class="spinner spinner-sm"></div>'; btn.style.width = '40px'; }
      const res = await API.mentor.delete(id);
      if (res.status === 'OK') {
        UI.toast(`Mentor "${nama}" dihapus. Klik Undo untuk membatalkan.`, 'warning');
        allData = allData.filter(x => x.id !== id);
        renderTable(allData);
        const undoBtn = document.getElementById('mentor-undo-btn');
        if (undoBtn) undoBtn.disabled = false;
      } else {
        UI.toast(res.message || 'Gagal menghapus mentor', 'error');
        if (btn) { btn.disabled = false; btn.innerHTML = originalContent; btn.style.width = ''; }
      }
    } catch(e) {
      UI.toast('Gagal terhubung ke server', 'error');
      if (btn) { btn.disabled = false; btn.innerHTML = originalContent; btn.style.width = ''; }
    }
  }

  async function undo() {
    if (!lastAction) return;
    const undoBtn = document.getElementById('mentor-undo-btn');
    const redoBtn = document.getElementById('mentor-redo-btn');
    try {
      if (undoBtn) undoBtn.disabled = true;
      let res;
      if (lastAction === 'DELETE' && lastDeletedData) {
        res = await API.mentor.add(lastDeletedData);
        if (res.status === 'OK') {
          UI.toast('Undo Berhasil: Data mentor dikembalikan!', 'success');
          lastRestoredId = res.data?.id || lastDeletedData.id;
          lastAction     = 'UNDO_DELETE';
          if (redoBtn) redoBtn.disabled = false;
        } else {
          UI.toast(res.message || 'Undo gagal', 'error');
          if (undoBtn) undoBtn.disabled = false;
        }
      } else if (lastAction === 'ADD' && lastAddedId) {
        res = await API.mentor.delete(lastAddedId);
        if (res.status === 'OK') { UI.toast('Undo Berhasil: Penambahan dibatalkan!', 'warning'); lastAction = null; }
        else { UI.toast(res.message || 'Undo gagal', 'error'); if (undoBtn) undoBtn.disabled = false; }
      }
      load(true);
    } catch(e) {
      UI.toast('Gagal melakukan Undo', 'error');
      if (undoBtn) undoBtn.disabled = false;
    }
  }

  async function redo() {
    if (!lastRestoredId || lastAction !== 'UNDO_DELETE') return;
    const redoBtn = document.getElementById('mentor-redo-btn');
    try {
      if (redoBtn) redoBtn.disabled = true;
      const res = await API.mentor.delete(lastRestoredId);
      if (res.status === 'OK') {
        UI.toast('Redo Berhasil: Data mentor dihapus kembali!', 'success');
        lastAction     = 'DELETE';
        lastRestoredId = null;
        const undoBtn  = document.getElementById('mentor-undo-btn');
        if (undoBtn) undoBtn.disabled = false;
        load(true);
      } else {
        UI.toast(res.message || 'Redo gagal', 'error');
        if (redoBtn) redoBtn.disabled = false;
      }
    } catch(e) {
      UI.toast('Gagal melakukan Redo', 'error');
      if (redoBtn) redoBtn.disabled = false;
    }
  }

  async function deleteAll() {
    const total = allData.length;
    if (total === 0) return UI.toast('Tidak ada data untuk dihapus', 'info');
    if (!confirm(`PERINGATAN! Kamu akan menghapus SEMUA (${total}) data mentor.`)) return;
    const konfirmasi = prompt("Ketik 'HAPUS SEMUA MENTOR' untuk melanjutkan:");
    if (konfirmasi !== 'HAPUS SEMUA MENTOR') { UI.toast('Penghapusan massal dibatalkan.', 'error'); return; }
    UI.toast('Sedang membersihkan database...', 'info');
    try {
      const res = await API.mentor.deleteAll();
      if (res.status === 'OK') {
        UI.toast('Seluruh data mentor berhasil dihapus!', 'success');
        load(true);
      } else {
        UI.toast(res.message || 'Gagal menghapus semua data', 'error');
      }
    } catch(e) { UI.toast('Gagal menghapus semua data', 'error'); }
  }

  function deleteSelected()  { return Selection.deleteSelected('mentor'); }
  function _getCurrentData() { return allData; }

  return { load, search, openAdd, openEdit, saveForm, deleteMentor, updateSummary, undo, redo, deleteAll, deleteSelected, renderTable, _getCurrentData };
})();

window.MentorPage = MentorPage;