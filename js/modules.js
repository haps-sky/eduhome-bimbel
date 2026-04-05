// ============================================================
// EduHome — modules.js (Fixed: All 5 Issues Resolved)
// Referensi: MuridPage pola untuk semua modul
// ============================================================

// ============================================================
// MentorPage — Masalah 2 (toolbar), 4 (undo/redo/hapusAll)
// ============================================================

const MentorPage = (() => {
  let allData      = [];
  let filteredData = [];
  let isFetched    = false;
  let lastDeletedData = null;
  let lastAction      = null;
  let lastAddedId     = null;
  let history = [];
  let future  = [];

  // ── LOAD ──────────────────────────────────────────────────
  async function load(forceRefresh = false) {
    const tbody = document.getElementById('mentor-tbody');
    if (!tbody) return;

    if (!forceRefresh && allData.length > 0) {
      renderTable(allData);
      updateSummary(allData);
    } else {
      tbody.innerHTML = '<tr><td colspan="8" class="empty-row"><div class="spinner spinner-sm"></div> Memuat data mentor...</td></tr>';
    }

    try {
      const res = await API.mentor.getAll();
      if (res.status === 'OK') {
        allData = (res.data || []).sort((a, b) => a.id.localeCompare(b.id));
        filteredData = [...allData];
        isFetched = true;
        renderTable(allData);
        updateSummary(allData);
      }
    } catch (e) {
      console.error('Error Load Mentor:', e);
      if (!allData.length) {
        tbody.innerHTML = '<tr><td colspan="8" class="empty-row">Gagal memuat data mentor.</td></tr>';
      }
    }
  }

  function renderTable(data) {
    const role = API.currentRole();
    const canEdit = role === 'ADMIN';
    const rows = data.map(m => {
      const color = m.jk === 'L' ? '#689bee' : '#e76fab';
      const jkText = m.jk === 'L' ? '♂ Laki-laki' : '♀ Perempuan';
      return `
        <tr>
          <td><span class="id-badge">${m.id}</span></td>
          <td>
            <div class="name-cell">
              <span class="avatar-initial mentor-avatar" style="background:${color}20;color:${color};">
                ${(m.nama||'?')[0].toUpperCase()}
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
              <button class="btn-icon btn-danger" onclick="MentorPage.deleteMentor('${m.id}','${m.nama}')" title="Hapus">
                <i data-lucide="trash-2"></i>
              </button>` : '-'}
            </div>
          </td>
        </tr>`;
    });
    UI.renderTable('mentor-tbody', rows, 'Belum ada data mentor');
    lucide.createIcons();
  }

  function updateSummary(data) {
    const totalEl = document.getElementById('mentor-total-count');
    const aktifEl = document.getElementById('mentor-active-count');
    if (totalEl) totalEl.textContent = data.length;
    if (aktifEl) aktifEl.textContent = data.filter(m => m.status === 'AKTIF').length;
  }

  function search(term) {
    const filtered = allData.filter(m =>
      m.nama.toLowerCase().includes(term.toLowerCase()) ||
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
    if (!allData.length) { UI.toast('Memuat data...','info'); await load(); }
    const m = allData.find(x => x.id === id);
    if (!m) { UI.toast('Data mentor tidak ditemukan','error'); return; }
    document.getElementById('mentor-modal-title').textContent = 'Edit Mentor';
    document.getElementById('mentor-id-field').value   = m.id;
    document.getElementById('mentor-nama').value        = m.nama;
    const jkField = document.getElementById('mentor-jk');
    if (jkField) jkField.value = m.jk || 'L';
    document.getElementById('mentor-kontak').value      = m.kontak || '';
    document.getElementById('mentor-program').value     = m.program || '';
    document.getElementById('mentor-status').value      = m.status;
    document.getElementById('mentor-fee-anak').value    = m.fee_anak;
    document.getElementById('mentor-fee-harian').value  = m.fee_harian;
    UI.openModal('modal-mentor');
  }

  function clearForm() {
    ['mentor-id-field','mentor-nama','mentor-kontak','mentor-program','mentor-fee-anak','mentor-fee-harian'].forEach(id => {
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

    if (!nama)    return UI.toast('Nama mentor wajib diisi!','error');
    if (!jk)      return UI.toast('Jenis kelamin wajib dipilih!','error');
    if (!program) return UI.toast('Program wajib diisi!','error');
    if (!kontak)  return UI.toast('Kontak WA wajib diisi!','error');
    if (fee_anak === '' || fee_harian === '') return UI.toast('Fee wajib diisi (boleh 0)!','error');

    const payload = { nama, jk, program, kontak, status, fee_anak: Number(fee_anak), fee_harian: Number(fee_harian) };
    const btn = document.getElementById('mentor-save-btn');

    try {
      if (btn) { btn.disabled = true; btn.innerHTML = id ? '<div class="spinner spinner-sm"></div> Mengedit...' : '<div class="spinner spinner-sm"></div> Menambahkan...'; }
      const res = id ? await API.mentor.update({ id, ...payload }) : await API.mentor.add(payload);
      if (res.status === 'OK') {
        UI.toast(id ? 'Data mentor diperbarui' : 'Mentor berhasil ditambahkan','success');
        if (!id) { lastAddedId = res.data?.id || null; lastAction = 'ADD'; }
        UI.closeModal('modal-mentor');
        setTimeout(() => load(true), 800);
      } else {
        UI.toast(res.message || 'Gagal menyimpan data','error');
      }
    } catch(e) {
      console.error('Error Save Mentor:',e);
      UI.toast('Terjadi kesalahan koneksi','error');
    } finally {
      if (btn) { btn.disabled = false; btn.innerHTML = '<i data-lucide="save"></i> Simpan'; lucide.createIcons({ nodes: [btn] }); }
    }
  }

  async function deleteMentor(id, nama) {
    const m = allData.find(x => x.id === id);
    if (!m) return;
    const verifikasi = prompt(`Ketik nama mentor "${nama}" untuk mengonfirmasi penghapusan:`);
    if (verifikasi !== nama) { if (verifikasi !== null) UI.toast('Konfirmasi nama salah!','error'); return; }

    lastDeletedData = JSON.parse(JSON.stringify(m));
    lastAction = 'DELETE';

    const btn = document.querySelector(`button[onclick*="deleteMentor('${id}'"]`);
    const originalContent = btn ? btn.innerHTML : '';
    try {
      if (btn) { btn.disabled = true; btn.innerHTML = '<div class="spinner spinner-sm"></div>'; btn.style.width = '40px'; }
      const res = await API.mentor.delete(id);
      if (res.status === 'OK') {
        UI.toast(`Mentor "${nama}" dihapus. Klik Undo untuk membatalkan.`,'warning');
        allData = allData.filter(x => x.id !== id);
        renderTable(allData);
        const undoBtn = document.getElementById('mentor-undo-btn');
        if (undoBtn) undoBtn.disabled = false;
      } else {
        UI.toast(res.message || 'Gagal menghapus mentor','error');
        if (btn) { btn.disabled = false; btn.innerHTML = originalContent; btn.style.width = ''; }
      }
    } catch(e) {
      UI.toast('Gagal terhubung ke server','error');
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
          UI.toast('Undo Berhasil: Data mentor dikembalikan!','success');
          lastAction = 'UNDO_DELETE';
          if (redoBtn) redoBtn.disabled = false;
        }
      } else if (lastAction === 'ADD' && lastAddedId) {
        res = await API.mentor.delete(lastAddedId);
        if (res.status === 'OK') { UI.toast('Undo Berhasil: Penambahan dibatalkan!','warning'); lastAction = null; }
      }
      load(true);
    } catch(e) {
      UI.toast('Gagal melakukan Undo','error');
      if (undoBtn) undoBtn.disabled = false;
    }
  }

  async function redo() {
    if (!lastDeletedData || lastAction !== 'UNDO_DELETE') return;
    const redoBtn = document.getElementById('mentor-redo-btn');
    try {
      if (redoBtn) redoBtn.disabled = true;
      const res = await API.mentor.add(lastDeletedData);
      if (res.status === 'OK') {
        UI.toast('Redo Berhasil: Data dipulihkan kembali!','success');
        lastAction = 'DELETE';
        const undoBtn = document.getElementById('mentor-undo-btn');
        if (undoBtn) undoBtn.disabled = false;
        load(true);
      }
    } catch(e) {
      UI.toast('Gagal melakukan Redo','error');
      if (redoBtn) redoBtn.disabled = false;
    }
  }

  async function deleteAll() {
    const total = allData.length;
    if (total === 0) return UI.toast('Tidak ada data untuk dihapus','info');
    if (!confirm(`PERINGATAN! Kamu akan menghapus SEMUA (${total}) data mentor.`)) return;
    const konfirmasi = prompt("Ketik 'HAPUS SEMUA MENTOR' untuk melanjutkan:");
    if (konfirmasi !== 'HAPUS SEMUA MENTOR') { UI.toast('Penghapusan massal dibatalkan.','error'); return; }
    UI.toast('Sedang membersihkan database...','info');
    // Hapus satu per satu karena tidak ada deleteAll di API mentor
    try {
      for (const m of allData) { await API.mentor.delete(m.id); }
      UI.toast('Seluruh data mentor berhasil dihapus!','success');
      allData = []; isFetched = false; load();
    } catch(e) { UI.toast('Gagal menghapus semua data','error'); }
  }

  return { load, search, openAdd, openEdit, saveForm, deleteMentor, updateSummary, undo, redo, deleteAll };
})();


// ============================================================
// PresensiPage — Masalah 2 (toolbar), 4 (undo/redo/hapusAll)
// ============================================================

const PresensiPage = (() => {
  let allData         = [];
  let filteredData    = [];
  let isFetched       = false;
  let lastDeletedData = null;
  let lastAction      = null;

  async function load(forceRefresh = false) {
    const tbody = document.getElementById('presensi-tbody');
    if (!tbody) return;

    if (!forceRefresh && allData.length > 0) {
      renderTable(allData.slice(-50).reverse());
    } else {
      tbody.innerHTML = '<tr><td colspan="9" class="empty-row"><div class="spinner spinner-sm"></div> Memuat data presensi...</td></tr>';
    }

    try {
      const [presRes, muridRes, mentorRes] = await Promise.all([
        API.presensi.getAll(), API.murid.getAll(), API.mentor.getAll()
      ]);
      if (presRes.status === 'OK') {
        allData = presRes.data || [];
        filteredData = [...allData];
        isFetched = true;
        const ms = document.getElementById('presensi-murid');
        if (ms && ms.options.length <= 1) populateDropdowns(muridRes.data || [], mentorRes.data || []);
        renderTable(allData.slice(-50).reverse());
      }
    } catch(e) {
      console.error(e);
      if (!allData.length) tbody.innerHTML = '<tr><td colspan="9" class="empty-row">Gagal memuat.</td></tr>';
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
      (p.nama_murid || '').toLowerCase().includes(term.toLowerCase()) ||
      (p.nama_mentor || '').toLowerCase().includes(term.toLowerCase()) ||
      (p.program || '').toLowerCase().includes(term.toLowerCase())
    );
    renderTable(filtered);
  }

  function renderTable(data) {
    const role = API.currentRole();
    const canEdit = role === 'ADMIN' || role === 'MENTOR';
    const rows = data.map(p => `
      <tr>
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
    if (window.lucide) lucide.createIcons();
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
    document.getElementById('presensi-id-field').value = '';
    const tglInput = document.getElementById('presensi-tanggal');
    if (tglInput) tglInput.value = '';
    document.getElementById('presensi-murid').value  = '';
    document.getElementById('presensi-mentor').value = '';
    document.getElementById('presensi-status').value = 'HADIR';
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

    if (!tanggal || !muridSel.value) { UI.toast('Tanggal dan murid wajib diisi','error'); return; }

    const muridOpt  = muridSel.options[muridSel.selectedIndex];
    const mentorOpt = mentorSel.options[mentorSel.selectedIndex];
    const programMurid = muridOpt.dataset.program;

    const btn = document.getElementById('presensi-save-btn');
    if (btn) { btn.disabled = true; btn.innerHTML = `<div class="spinner spinner-sm"></div> ${id ? 'Memperbarui...' : 'Memvalidasi...'}`; }

    try {
      let idPaketTerpilih = '';
      if (!id) {
        const sppRes = await API.spp.getAll();
        const paketAktif = (sppRes.data || []).find(p =>
          p.id_murid === muridSel.value && p.program === programMurid &&
          p.status === 'AKTIF' && Number(p.sisa_pertemuan) > 0
        );
        if (!paketAktif) { UI.toast(`Kuota ${programMurid} habis atau paket belum aktif!`,'error'); throw new Error('Kuota Habis'); }
        idPaketTerpilih = paketAktif.id;
      }

      const payload = {
        tanggal, id_murid: muridSel.value, nama_murid: muridOpt.dataset.nama,
        id_mentor: mentorSel.value, nama_mentor: mentorOpt ? mentorOpt.dataset.nama : '',
        program: programMurid, status, catatan, bintang: parseInt(bintang)||0, id_paket: idPaketTerpilih
      };

      const res = id ? await API.presensi.update({ id, ...payload }) : await API.presensi.add(payload);
      if (res.status === 'OK') {
        UI.toast(id ? 'Presensi diperbarui' : 'Presensi berhasil dicatat!','success');
        UI.closeModal('modal-presensi');
        allData = []; isFetched = false;
        setTimeout(() => load(true), 500);
      } else {
        UI.toast(res.message || 'Gagal menyimpan','error');
      }
    } catch(e) {
      if (e.message !== 'Kuota Habis') UI.toast('Error: '+e.message,'error');
    } finally {
      if (btn) { btn.disabled = false; btn.innerHTML = '<i data-lucide="save"></i> Simpan Presensi'; lucide.createIcons({ nodes:[btn] }); }
    }
  }

  async function deleteItem(id) {
    const p = allData.find(x => x.id === id);
    if (!confirm('Hapus presensi ini? Sisa pertemuan murid akan bertambah kembali secara otomatis.')) return;
    if (deleteItem._loading) return;
    deleteItem._loading = true;

    lastDeletedData = p ? JSON.parse(JSON.stringify(p)) : null;
    lastAction = 'DELETE';

    const btn = document.querySelector(`[data-delete-id="${id}"]`);
    const originalContent = btn ? btn.innerHTML : '';
    try {
      if (btn) { btn.disabled = true; btn.innerHTML = '<div class="spinner spinner-sm"></div>'; }
      const res = await API.presensi.delete(id);
      if (res.status === 'OK') {
        UI.toast('Data presensi berhasil dihapus & kuota SPP dikembalikan','success');
        allData = []; isFetched = false;
        if (window.SPPPage) SPPPage.isFetched = false;
        await load(true);
        const undoBtn = document.getElementById('presensi-undo-btn');
        if (undoBtn) undoBtn.disabled = false;
      } else {
        UI.toast(res.message || 'Gagal menghapus','error');
        if (btn) { btn.disabled = false; btn.innerHTML = originalContent; }
      }
    } catch(e) {
      UI.toast('Gagal terhubung ke server.','error');
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
          UI.toast('Undo Berhasil: Presensi dikembalikan!','success');
          lastAction = 'UNDO_DELETE';
          if (redoBtn) redoBtn.disabled = false;
          allData = []; isFetched = false; load(true);
        }
      }
    } catch(e) { UI.toast('Gagal melakukan Undo','error'); if (undoBtn) undoBtn.disabled = false; }
  }

  async function redo() {
    if (!lastDeletedData || lastAction !== 'UNDO_DELETE') return;
    const redoBtn = document.getElementById('presensi-redo-btn');
    try {
      if (redoBtn) redoBtn.disabled = true;
      const res = await API.presensi.add(lastDeletedData);
      if (res.status === 'OK') {
        UI.toast('Redo Berhasil: Data dipulihkan!','success');
        lastAction = 'DELETE';
        const undoBtn = document.getElementById('presensi-undo-btn');
        if (undoBtn) undoBtn.disabled = false;
        allData = []; isFetched = false; load(true);
      }
    } catch(e) { UI.toast('Gagal melakukan Redo','error'); if (redoBtn) redoBtn.disabled = false; }
  }

  async function deleteAll() {
    const total = allData.length;
    if (total === 0) return UI.toast('Tidak ada data untuk dihapus','info');
    if (!confirm(`PERINGATAN! Kamu akan menghapus SEMUA (${total}) data presensi.`)) return;
    const konfirmasi = prompt("Ketik 'HAPUS SEMUA PRESENSI' untuk melanjutkan:");
    if (konfirmasi !== 'HAPUS SEMUA PRESENSI') { UI.toast('Penghapusan massal dibatalkan.','error'); return; }
    UI.toast('Sedang membersihkan database...','info');
    try {
      for (const p of allData) { await API.presensi.delete(p.id); }
      UI.toast('Seluruh data presensi berhasil dihapus!','success');
      allData = []; isFetched = false; load();
    } catch(e) { UI.toast('Gagal menghapus semua data','error'); }
  }

  return { load, search, saveForm, filterByDate, openAdd, openEdit, deleteItem, undo, redo, deleteAll };
})();


// ============================================================
// SPPPage — Masalah 2 (toolbar), 4 (undo/redo/hapusAll)
// ============================================================

const SPPPage = (() => {
  let allData      = [];
  let filteredData = [];
  let isFetched    = false;
  let lastDeletedData = null;
  let lastAction      = null;

  async function load(forceRefresh = false) {
    const tbody = document.getElementById('spp-tbody');
    if (!tbody) return;

    if (!forceRefresh && allData.length > 0) {
      renderTable(allData);
    } else {
      tbody.innerHTML = '<tr><td colspan="12" class="empty-row"><div class="spinner spinner-sm"></div> Memuat data paket SPP...</td></tr>';
    }

    try {
      const [sppRes, muridRes] = await Promise.all([ API.spp.getAll(), API.murid.getAll() ]);
      if (sppRes.status === 'OK') {
        allData = (sppRes.data || []).sort((a,b) => a.id.localeCompare(b.id));
        filteredData = [...allData];
        isFetched = true;
        const sel = document.getElementById('spp-murid');
        if (sel && sel.options.length <= 1) populateMurid(muridRes.data || []);
        renderTable(allData);
      }
    } catch(e) {
      console.error('Gagal load SPP:',e);
      if (!allData.length) tbody.innerHTML = '<tr><td colspan="12" class="empty-row">Gagal memuat data paket SPP.</td></tr>';
    }
    initLiveCount();
  }

  function search(term) {
    const filtered = allData.filter(s =>
      (s.nama_murid||'').toLowerCase().includes(term.toLowerCase()) ||
      (s.program||'').toLowerCase().includes(term.toLowerCase()) ||
      (s.id||'').toLowerCase().includes(term.toLowerCase())
    );
    renderTable(filtered);
  }

  function initLiveCount() {
    ['spp-murid','spp-mulai','spp-akhir'].forEach(id => {
      const el = document.getElementById(id);
      if (el) el.addEventListener('change', calculateLiveSessions);
    });
  }

  async function calculateLiveSessions() {
    const id_murid = document.getElementById('spp-murid').value;
    const mulai = document.getElementById('spp-mulai').value;
    const akhir = document.getElementById('spp-akhir').value;
    const display = document.getElementById('spp-count-preview');
    if (!id_murid || !mulai || !akhir || !display) return;
    display.innerHTML = '<div class="spinner-sm"></div> Menghitung...';
    try {
      const res = await API.jadwal.getByMurid(id_murid);
      const hariLes = (res.data || []).map(j => j.hari.trim().toLowerCase());
      if (!hariLes.length) { display.textContent = 'Total: 0 Sesi (Jadwal kosong)'; return; }
      const dayMap = { 'minggu':0,'senin':1,'selasa':2,'rabu':3,'kamis':4,'jumat':5,'sabtu':6 };
      const targetDays = hariLes.map(h => dayMap[h]);
      let count = 0, cur = new Date(mulai.replace(/-/g,'\/')), end = new Date(akhir.replace(/-/g,'\/'));
      while (cur < end) { if (targetDays.includes(cur.getDay())) count++; cur.setDate(cur.getDate()+1); }
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
    const rows = data.map(s => `
      <tr>
        <td><span class="id-badge">${s.id}</span></td>
        <td><strong>${s.nama_murid}</strong></td>
        <td><span class="program-tag">${s.program}</span></td>
        <td>${UI.formatDate(s.periode_mulai)} – ${UI.formatDate(s.periode_akhir)}</td>
        <td>${s.total_pertemuan}</td>
        <td>${s.hadir} / ${s.sisa_pertemuan}</td>
        <td>
          <div class="progress-bar-wrap">
            <div class="progress-bar-fill" style="width:${s.total_pertemuan > 0 ? Math.round((s.hadir/s.total_pertemuan)*100) : 0}%"></div>
          </div>
        </td>
        <td>${UI.statusBadge(s.status)}</td>
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
      </tr>`);
    UI.renderTable('spp-tbody', rows, 'Belum ada paket SPP');
    lucide.createIcons();
  }

  function openAdd() {
    document.getElementById('spp-modal-title').textContent = 'Buat Paket SPP';
    document.getElementById('spp-id-field').value = '';
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
    if (!s) { UI.toast('Data paket tidak ditemukan','error'); UI.closeModal('modal-spp'); return; }
    document.getElementById('spp-id-field').value = s.id;
    if (muridSel) {
      setTimeout(() => { muridSel.value = s.id_murid; muridSel.disabled = true; calculateLiveSessions(); }, 50);
    }
    document.getElementById('spp-mulai').value = s.periode_mulai;
    document.getElementById('spp-akhir').value = s.periode_akhir;
    document.getElementById('spp-harga').value = s.harga;
  }

  async function saveForm() {
    const id = document.getElementById('spp-id-field').value;
    const btn = document.querySelector('#modal-spp .btn-primary');
    const muridSel = document.getElementById('spp-murid');
    const mulai    = document.getElementById('spp-mulai').value;
    const akhir    = document.getElementById('spp-akhir').value;
    const harga    = parseFloat(document.getElementById('spp-harga').value) || 0;
    if (!muridSel.value || !mulai || !akhir) { UI.toast('Semua field wajib diisi','error'); return; }
    const opt = muridSel.options[muridSel.selectedIndex];
    const payload = { id, id_murid: muridSel.value, nama_murid: opt.dataset.nama, program: opt.dataset.program, periode_mulai: mulai, periode_akhir: akhir, harga };
    try {
      if (btn) { btn.disabled = true; btn.innerHTML = id ? '<div class="spinner spinner-sm"></div> Memperbarui paket...' : '<div class="spinner spinner-sm"></div> Menyimpan paket...'; }
      const res = id ? await API.spp.update(payload) : await API.spp.create(payload);
      if (res.status === 'OK') {
        const msg = id ? 'Paket SPP berhasil diperbarui' : `Berhasil! Total: ${res.data.total_pertemuan} pertemuan.`;
        UI.toast(msg,'success');
        UI.closeModal('modal-spp');
        allData = []; isFetched = false; load();
      } else { UI.toast(res.message || 'Gagal memproses paket SPP','error'); }
    } catch(e) { UI.toast('Gagal terhubung ke server','error'); }
    finally { if (btn) { btn.disabled = false; btn.innerHTML = 'Simpan Paket'; } }
  }

  async function deleteSPP(id) {
    if (!confirm(`Hapus paket SPP ${id}? Sisa pertemuan akan hilang.`)) return;
    const s = allData.find(x => x.id === id);
    lastDeletedData = s ? JSON.parse(JSON.stringify(s)) : null;
    lastAction = 'DELETE';

    const btn = document.querySelector(`button[onclick*="deleteSPP('${id}'"]`);
    const originalContent = btn ? btn.innerHTML : '';
    try {
      if (btn) { btn.disabled = true; btn.innerHTML = '<div class="spinner spinner-sm"></div>'; btn.style.width = '40px'; }
      const res = await API.spp.delete(id);
      if (res.status === 'OK') {
        UI.toast('Paket berhasil dihapus. Klik Undo untuk membatalkan.','warning');
        allData = allData.filter(x => x.id !== id); renderTable(allData);
        const undoBtn = document.getElementById('spp-undo-btn');
        if (undoBtn) undoBtn.disabled = false;
      } else {
        UI.toast(res.message || 'Gagal menghapus','error');
        if (btn) { btn.disabled = false; btn.innerHTML = originalContent; btn.style.width = ''; }
      }
    } catch(e) {
      UI.toast('Gagal terhubung ke server','error');
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
          UI.toast('Undo Berhasil: Paket SPP dikembalikan!','success');
          lastAction = 'UNDO_DELETE';
          if (redoBtn) redoBtn.disabled = false;
          allData = []; isFetched = false; load(true);
        }
      }
    } catch(e) { UI.toast('Gagal melakukan Undo','error'); if (undoBtn) undoBtn.disabled = false; }
  }

  async function redo() {
    if (!lastDeletedData || lastAction !== 'UNDO_DELETE') return;
    const redoBtn = document.getElementById('spp-redo-btn');
    try {
      if (redoBtn) redoBtn.disabled = true;
      const res = await API.spp.create(lastDeletedData);
      if (res.status === 'OK') {
        UI.toast('Redo Berhasil: Paket SPP dipulihkan!','success');
        lastAction = 'DELETE';
        const undoBtn = document.getElementById('spp-undo-btn');
        if (undoBtn) undoBtn.disabled = false;
        allData = []; isFetched = false; load(true);
      }
    } catch(e) { UI.toast('Gagal melakukan Redo','error'); if (redoBtn) redoBtn.disabled = false; }
  }

  async function deleteAll() {
    const total = allData.length;
    if (total === 0) return UI.toast('Tidak ada data untuk dihapus','info');
    if (!confirm(`PERINGATAN! Kamu akan menghapus SEMUA (${total}) paket SPP.`)) return;
    const konfirmasi = prompt("Ketik 'HAPUS SEMUA SPP' untuk melanjutkan:");
    if (konfirmasi !== 'HAPUS SEMUA SPP') { UI.toast('Penghapusan massal dibatalkan.','error'); return; }
    UI.toast('Sedang membersihkan database...','info');
    try {
      for (const s of allData) { await API.spp.delete(s.id); }
      UI.toast('Seluruh paket SPP berhasil dihapus!','success');
      allData = []; isFetched = false; load();
    } catch(e) { UI.toast('Gagal menghapus semua data','error'); }
  }

  return { load, search, saveForm, openAdd, openEdit, deleteSPP, initLiveCount, calculateLiveSessions, undo, redo, deleteAll };
})();


// ============================================================
// BukuPage — Masalah 1 (stok/harga sinkron), 2 (toolbar),
//            3 (field mapping fix), 4 (undo/redo/hapusAll)
// ============================================================

const BukuPage = (() => {
  let allData      = [];
  let filteredData = [];
  let isFetched    = false;
  let lastDeletedData = null;
  let lastAction      = null;
  let lastAddedId     = null;

  async function load(forceRefresh = false) {
    const tbody = document.getElementById('buku-tbody');
    if (!tbody) return;

    if (!forceRefresh && allData.length > 0) {
      renderTable(allData);
    } else {
      tbody.innerHTML = '<tr><td colspan="8" class="empty-row"><div class="spinner spinner-sm"></div> Memuat data modul belajar...</td></tr>';
    }

    try {
      const bukuRes = await API.buku.getAll();
      if (bukuRes.status === 'OK') {
        // FIX MASALAH 3: Mapping field konsisten dari backend
        allData = (bukuRes.data || []).map(b => ({
          id:         b.id,
          nama_modul: b.nama_modul || b.nama || '',   // support kedua field
          jenjang:    b.jenjang    || '',
          program:    b.program    || '',
          stok:       Number(b.stok)       || 0,
          harga_beli: Number(b.harga_beli) || 0,
          harga_jual: Number(b.harga_jual) || 0,
          keterangan: b.keterangan || ''
        }));
        filteredData = [...allData];
        isFetched = true;
        renderTable(allData);
      }
    } catch(e) {
      console.error(e);
      if (!allData.length) tbody.innerHTML = '<tr><td colspan="8" class="empty-row">Gagal memuat data.</td></tr>';
    }
  }

  function search(term) {
    const filtered = allData.filter(b =>
      (b.nama_modul||'').toLowerCase().includes(term.toLowerCase()) ||
      (b.program||'').toLowerCase().includes(term.toLowerCase()) ||
      (b.jenjang||'').toLowerCase().includes(term.toLowerCase())
    );
    renderTable(filtered);
  }

  function renderTable(data) {
    const role = API.currentRole();
    const canEdit = role === 'ADMIN';
    const rows = data.map(b => `
      <tr>
        <td><span class="id-badge">${b.id}</span></td>
        <td><strong>${b.nama_modul}</strong></td>
        <td>
          <div class="program-tag">${b.jenjang || '-'}</div>
          <div style="font-size:0.72rem;color:var(--text-secondary);margin-top:2px;">${b.program || '-'}</div>
        </td>
        <td><span class="pill">${b.stok || 0}</span></td>
        <td style="font-family:var(--font-mono)">Rp${Number(b.harga_beli||0).toLocaleString('id-ID')}</td>
        <td style="font-family:var(--font-mono);font-weight:700;color:var(--primary)">Rp${Number(b.harga_jual||0).toLocaleString('id-ID')}</td>
        <td style="font-family:var(--font-mono);color:var(--success)">Rp${Number((b.harga_jual||0)-(b.harga_beli||0)).toLocaleString('id-ID')}</td>
        <td>
          <div class="action-btns">
            ${canEdit ? `
            <button class="btn-icon btn-warning" onclick="BukuPage.openEdit('${b.id}')" title="Edit">
              <i data-lucide="pencil"></i>
            </button>
            <button class="btn-icon btn-danger" onclick="BukuPage.deleteBuku('${b.id}','${b.nama_modul}')" title="Hapus">
              <i data-lucide="trash-2"></i>
            </button>` : '-'}
          </div>
        </td>
      </tr>`);

    const countEl = document.getElementById('buku-count');
    if (countEl) countEl.innerText = `Total: ${data.length} modul`;
    UI.renderTable('buku-tbody', rows, 'Belum ada modul pembelajaran');
    lucide.createIcons();
  }

  function openAdd() {
    ['buku-id-field','buku-nama','buku-jenjang','buku-program','buku-stok','buku-harga-beli','buku-harga-jual','buku-ket'].forEach(id => {
      const el = document.getElementById(id); if (el) el.value = '';
    });
    const titleEl = document.getElementById('buku-modal-title');
    if (titleEl) titleEl.textContent = 'Tambah Modul';
    UI.openModal('modal-buku');
  }

  function openEdit(id) {
    const b = allData.find(x => x.id === id);
    if (!b) return;
    document.getElementById('buku-modal-title').textContent = 'Edit Modul';
    document.getElementById('buku-id-field').value    = b.id;
    // FIX MASALAH 3: gunakan nama_modul konsisten
    document.getElementById('buku-nama').value        = b.nama_modul || '';
    document.getElementById('buku-jenjang').value     = b.jenjang    || '';
    document.getElementById('buku-program').value     = b.program    || '';
    document.getElementById('buku-stok').value        = b.stok       || 0;
    document.getElementById('buku-harga-beli').value  = b.harga_beli || 0;
    document.getElementById('buku-harga-jual').value  = b.harga_jual || 0;
    document.getElementById('buku-ket').value         = b.keterangan || '';
    UI.openModal('modal-buku');
  }

  async function saveForm() {
    const btn = document.querySelector('#modal-buku .btn-primary');
    const id = document.getElementById('buku-id-field').value;

    // FIX MASALAH 3: Semua field dengan nama konsisten & Number() wajib
    const nama_modul = document.getElementById('buku-nama').value.trim();
    const jenjang    = document.getElementById('buku-jenjang').value.trim();
    const program    = document.getElementById('buku-program').value.trim();
    const stok       = Number(document.getElementById('buku-stok').value)       || 0;
    const harga_beli = Number(document.getElementById('buku-harga-beli').value) || 0;
    const harga_jual = Number(document.getElementById('buku-harga-jual').value) || 0;
    const keterangan = document.getElementById('buku-ket').value.trim();

    if (!nama_modul) { UI.toast('Nama modul wajib diisi','error'); return; }

    // FIX MASALAH 1: payload sinkron dengan handleAddBuku di Apps Script
    const payload = { nama_modul, jenjang, program, stok, harga_beli, harga_jual, keterangan };

    try {
      if (btn) { btn.disabled = true; btn.innerHTML = id ? '<div class="spinner spinner-sm"></div> Memperbarui...' : '<div class="spinner spinner-sm"></div> Menyimpan...'; }

      // FIX MASALAH 1: handleUpdateBuku di Apps Script harus menerima field baru
      const res = id ? await API.buku.update({ id, ...payload }) : await API.buku.add(payload);

      if (res.status === 'OK') {
        UI.toast(id ? 'Modul diperbarui' : 'Modul berhasil ditambahkan!','success');
        if (!id) { lastAddedId = res.data?.id || null; lastAction = 'ADD'; }
        UI.closeModal('modal-buku');
        allData = []; isFetched = false;
        setTimeout(() => load(true), 500);
      } else {
        UI.toast(res.message || 'Gagal menyimpan modul','error');
      }
    } catch(e) {
      console.error('Error Buku Modul:',e); UI.toast('Gagal terhubung ke server','error');
    } finally {
      if (btn) { btn.disabled = false; btn.innerHTML = '<i data-lucide="save"></i> Simpan'; lucide.createIcons(); }
    }
  }

  async function deleteBuku(id, nama) {
    const b = allData.find(x => x.id === id);
    if (!confirm(`Hapus modul "${nama}"? Tindakan ini tidak dapat dibatalkan.`)) return;

    lastDeletedData = b ? JSON.parse(JSON.stringify(b)) : null;
    lastAction = 'DELETE';

    const btn = document.querySelector(`button[onclick*="deleteBuku('${id}'"]`);
    const originalContent = btn ? btn.innerHTML : '';
    try {
      if (btn) { btn.disabled = true; btn.innerHTML = '<div class="spinner spinner-sm"></div>'; btn.style.width = '40px'; }
      const res = await API.buku.delete(id);
      if (res.status === 'OK') {
        UI.toast(`Modul "${nama}" berhasil dihapus. Klik Undo untuk membatalkan.`,'warning');
        allData = allData.filter(x => x.id !== id); renderTable(allData);
        const undoBtn = document.getElementById('buku-undo-btn');
        if (undoBtn) undoBtn.disabled = false;
      } else {
        UI.toast(res.message || 'Gagal menghapus modul','error');
        if (btn) { btn.disabled = false; btn.innerHTML = originalContent; btn.style.width = ''; }
      }
    } catch(e) {
      UI.toast('Gagal terhubung ke server','error');
      if (btn) { btn.disabled = false; btn.innerHTML = originalContent; btn.style.width = ''; }
    }
  }

  async function undo() {
    if (!lastAction) return;
    const undoBtn = document.getElementById('buku-undo-btn');
    const redoBtn = document.getElementById('buku-redo-btn');
    try {
      if (undoBtn) undoBtn.disabled = true;
      let res;
      if (lastAction === 'DELETE' && lastDeletedData) {
        res = await API.buku.add(lastDeletedData);
        if (res.status === 'OK') {
          UI.toast('Undo Berhasil: Modul dikembalikan!','success');
          lastAction = 'UNDO_DELETE';
          if (redoBtn) redoBtn.disabled = false;
        }
      } else if (lastAction === 'ADD' && lastAddedId) {
        res = await API.buku.delete(lastAddedId);
        if (res.status === 'OK') { UI.toast('Undo Berhasil: Penambahan modul dibatalkan!','warning'); lastAction = null; }
      }
      allData = []; isFetched = false; load(true);
    } catch(e) { UI.toast('Gagal melakukan Undo','error'); if (undoBtn) undoBtn.disabled = false; }
  }

  async function redo() {
    if (!lastDeletedData || lastAction !== 'UNDO_DELETE') return;
    const redoBtn = document.getElementById('buku-redo-btn');
    try {
      if (redoBtn) redoBtn.disabled = true;
      const res = await API.buku.add(lastDeletedData);
      if (res.status === 'OK') {
        UI.toast('Redo Berhasil: Modul dipulihkan!','success');
        lastAction = 'DELETE';
        const undoBtn = document.getElementById('buku-undo-btn');
        if (undoBtn) undoBtn.disabled = false;
        allData = []; isFetched = false; load(true);
      }
    } catch(e) { UI.toast('Gagal melakukan Redo','error'); if (redoBtn) redoBtn.disabled = false; }
  }

  async function deleteAll() {
    const total = allData.length;
    if (total === 0) return UI.toast('Tidak ada data untuk dihapus','info');
    if (!confirm(`PERINGATAN! Kamu akan menghapus SEMUA (${total}) modul buku.`)) return;
    const konfirmasi = prompt("Ketik 'HAPUS SEMUA MODUL' untuk melanjutkan:");
    if (konfirmasi !== 'HAPUS SEMUA MODUL') { UI.toast('Penghapusan massal dibatalkan.','error'); return; }
    UI.toast('Sedang membersihkan database...','info');
    try {
      for (const b of allData) { await API.buku.delete(b.id); }
      UI.toast('Seluruh modul berhasil dihapus!','success');
      allData = []; isFetched = false; load();
    } catch(e) { UI.toast('Gagal menghapus semua data','error'); }
  }

  // Getter untuk dipakai PembayaranPage (Masalah 5)
  function getData() { return allData; }

  return { load, search, openAdd, openEdit, saveForm, deleteBuku, undo, redo, deleteAll, getData };
})();


// ============================================================
// PembayaranPage — Masalah 2 (toolbar), 4 (undo/redo/hapusAll)
//                  Masalah 5 (auto-fill dari SPP & Buku)
// ============================================================

const PembayaranPage = (() => {
  let allData      = [];
  let filteredData = [];
  let isFetched    = false;
  let sppData      = [];
  let lastDeletedData = null;
  let lastAction      = null;

  async function load(forceRefresh = false) {
    const tbody = document.getElementById('pay-tbody');
    if (!tbody) return;

    if (!forceRefresh && allData.length > 0) {
      renderTable(allData.slice(-50).reverse());
      updateSummary();
    } else {
      tbody.innerHTML = '<tr><td colspan="8" class="empty-row"><div class="spinner spinner-sm"></div> Memuat data pembayaran...</td></tr>';
    }

    try {
      const [payRes, muridRes, sppRes] = await Promise.all([
        API.pembayaran.getAll(), API.murid.getAll(), API.spp.getAll()
      ]);
      if (payRes.status === 'OK') {
        allData = payRes.data || [];
        sppData = sppRes.data || [];
        filteredData = [...allData];
        isFetched = true;
        const sel = document.getElementById('pay-murid');
        if (sel && sel.options.length <= 1) populateMuridDropdown(muridRes.data || []);
        renderTable(allData.slice(-50).reverse());
        updateSummary();
      }
    } catch(e) {
      console.error('Error Load Pembayaran:',e);
      if (!allData.length) tbody.innerHTML = '<tr><td colspan="8" class="empty-row">Gagal memuat data.</td></tr>';
    }
  }

  function search(term) {
    const filtered = allData.filter(p =>
      (p.nama||'').toLowerCase().includes(term.toLowerCase()) ||
      (p.jenis||'').toLowerCase().includes(term.toLowerCase()) ||
      (p.id||'').toLowerCase().includes(term.toLowerCase())
    );
    renderTable(filtered);
  }

  function populateMuridDropdown(murid) {
    const sel = document.getElementById('pay-murid');
    if (!sel) return;
    sel.innerHTML = '<option value="">-- Pilih Murid --</option>' +
      murid.map(m => `<option value="${m.id}" data-nama="${m.nama}">${m.nama}</option>`).join('');
    sel.addEventListener('change', () => loadSPPForMurid(sel.value));
  }

  async function loadSPPForMurid(id_murid) {
    if (!id_murid) return;
    const sppSel = document.getElementById('pay-spp');
    if (!sppSel) return;
    const relevant = sppData.filter(s => s.id_murid === id_murid && s.status_bayar !== 'PAID');
    sppSel.innerHTML = '<option value="">-- Pilih Paket SPP (opsional) --</option>' +
      relevant.map(s => `<option value="${s.id}" data-harga="${s.harga}" data-terbayar="${s.terbayar}">${s.program} | ${s.periode_mulai} s/d ${s.periode_akhir} | ${UI.statusBadge(s.status_bayar)}</option>`).join('');
    sppSel.addEventListener('change', () => {
      const opt = sppSel.options[sppSel.selectedIndex];
      const harga    = parseFloat(opt.dataset.harga) || 0;
      const terbayar = parseFloat(opt.dataset.terbayar) || 0;
      const sisa     = harga - terbayar;
      document.getElementById('pay-sisa-info').textContent = sisa > 0 ? `Sisa tagihan: ${UI.formatCurrency(sisa)}` : '';
    });
  }

  function renderTable(data) {
    const rows = data.map(p => `
      <tr>
        <td>${UI.formatDate(p.tanggal)}</td>
        <td><strong>${p.nama}</strong></td>
        <td><span class="program-tag">${p.jenis}</span></td>
        <td>${p.periode || '-'}</td>
        <td>${UI.formatCurrency(p.jumlah)}</td>
        <td>${p.metode}</td>
        <td>${p.keterangan || '-'}</td>
        <td>
          <div class="action-btns">
            <button class="btn-icon btn-warning" onclick="PembayaranPage.openEdit('${p.id}')" title="Edit">
              <i data-lucide="pencil"></i>
            </button>
            <button class="btn-icon btn-danger" data-delete-id="${p.id}"
                    onclick="PembayaranPage.deletePembayaran('${p.id}','${p.nama}')" title="Hapus">
              <i data-lucide="trash-2"></i>
            </button>
          </div>
        </td>
      </tr>`);
    UI.renderTable('pay-tbody', rows, 'Belum ada riwayat pembayaran');
    if (window.lucide) lucide.createIcons();
  }

  function openAdd() {
    clearForm();
    const title = document.getElementById('modal-pembayaran-title');
    if (title) title.textContent = 'Catat Pembayaran Baru';
    document.getElementById('pay-id-field').value = '';
    const muridSel = document.getElementById('pay-murid');
    if (muridSel) { muridSel.value = ''; muridSel.disabled = false; }
    const sisaInfo = document.getElementById('pay-sisa-info');
    if (sisaInfo) sisaInfo.textContent = '';
    document.getElementById('pay-jumlah').value    = '';
    document.getElementById('pay-keterangan').value = '';
    UI.openModal('modal-pembayaran');
  }

  function openEdit(id) {
    const p = allData.find(x => x.id === id);
    if (!p) return;
    clearForm();
    document.getElementById('modal-pembayaran-title').textContent = 'Edit Pembayaran';
    document.getElementById('pay-id-field').value     = p.id;
    document.getElementById('pay-murid').value        = p.id_murid;
    document.getElementById('pay-tanggal').value      = p.tanggal;
    document.getElementById('pay-jenis').value        = p.jenis;
    document.getElementById('pay-jumlah').value       = p.jumlah;
    document.getElementById('pay-metode').value       = p.metode;
    document.getElementById('pay-keterangan').value   = p.keterangan || '';
    document.getElementById('pay-murid').disabled     = true;
    UI.openModal('modal-pembayaran');
  }

  function updateSummary() {
    const today = new Date().toISOString().split('T')[0];
    const todayTotal = allData.filter(p => p.tanggal === today && p.jenis === 'SPP').reduce((s,p) => s+p.jumlah, 0);
    const el = document.getElementById('pay-today-summary');
    if (el) el.textContent = 'Pembayaran hari ini: ' + UI.formatCurrency(todayTotal);
  }

  function clearForm() {
    const form = document.getElementById('form-pembayaran');
    if (form) form.reset();
    const idField = document.getElementById('pay-id-field');
    const sisaInfo = document.getElementById('pay-sisa-info');
    const sppSel = document.getElementById('pay-spp');
    const muridSel = document.getElementById('pay-murid');
    if (idField) idField.value = '';
    if (sisaInfo) sisaInfo.textContent = '';
    if (muridSel) muridSel.disabled = false;
    if (sppSel) sppSel.innerHTML = '<option value="">-- Pilih Paket SPP (opsional) --</option>';
    const tglInput = document.getElementById('pay-tanggal');
    if (tglInput) tglInput.value = new Date().toISOString().split('T')[0];
  }

  async function saveForm() {
    const btn = document.querySelector('#modal-pembayaran .btn-primary');
    const id        = document.getElementById('pay-id-field')?.value;
    const muridSel  = document.getElementById('pay-murid');
    const sppSel    = document.getElementById('pay-spp');
    const tanggal   = document.getElementById('pay-tanggal').value;
    const jumlah    = parseFloat(document.getElementById('pay-jumlah').value) || 0;
    const metode    = document.getElementById('pay-metode').value;
    const jenis     = document.getElementById('pay-jenis').value;
    const keterangan = document.getElementById('pay-keterangan').value;

    if (!muridSel.value || jumlah <= 0) { UI.toast('Pilih murid dan masukkan jumlah yang valid','error'); return; }

    const muridOpt = muridSel.options[muridSel.selectedIndex];
    const payload = {
      tanggal: tanggal || new Date().toISOString().split('T')[0],
      id_murid: muridSel.value, nama: muridOpt.dataset.nama,
      jenis, jumlah, metode, keterangan,
      spp_id: sppSel ? sppSel.value : ''
    };

    try {
      if (btn) { btn.disabled = true; btn.innerHTML = id ? '<div class="spinner spinner-sm"></div> Memperbarui data...' : '<div class="spinner spinner-sm"></div> Memproses pembayaran...'; }

      // FIX MASALAH 1: Saat transaksi buku, stok dikurangi di backend
      // Pastikan jenis='BUKU' dikirim agar backend bisa proses stok
      const res = id ? await API.pembayaran.update({ id, ...payload }) : await API.pembayaran.add(payload);

      if (res.status === 'OK') {
        UI.toast(id ? 'Data pembayaran diperbarui' : 'Pembayaran berhasil dicatat!','success');
        UI.closeModal('modal-pembayaran');
        allData = []; isFetched = false; load();
      } else {
        UI.toast(res.message || 'Gagal menyimpan pembayaran','error');
      }
    } catch(e) {
      console.error('Error Payment:',e); UI.toast('Terjadi kesalahan pada server','error');
    } finally {
      if (btn) { btn.disabled = false; btn.innerHTML = 'Simpan Pembayaran'; }
    }
  }

  async function deletePembayaran(id, nama) {
    const p = allData.find(x => x.id === id);
    if (!confirm(`Hapus riwayat pembayaran untuk "${nama}"? Saldo laporan akan disesuaikan.`)) return;

    lastDeletedData = p ? JSON.parse(JSON.stringify(p)) : null;
    lastAction = 'DELETE';

    const btn = document.querySelector(`button[data-delete-id="${id}"]`);
    const originalContent = btn ? btn.innerHTML : '';
    try {
      if (btn) { btn.disabled = true; btn.innerHTML = '<div class="spinner spinner-sm"></div>'; btn.style.width = '40px'; }
      const res = await API.pembayaran.delete(id);
      if (res.status === 'OK') {
        UI.toast(`Pembayaran "${nama}" berhasil dihapus. Klik Undo untuk membatalkan.`,'warning');
        allData = allData.filter(x => x.id !== id); renderTable(allData.slice(-50).reverse()); updateSummary();
        const undoBtn = document.getElementById('pay-undo-btn');
        if (undoBtn) undoBtn.disabled = false;
        if (window.Dashboard) Dashboard.isFetched = false;
      } else {
        UI.toast(res.message || 'Gagal menghapus pembayaran','error');
        if (btn) { btn.disabled = false; btn.innerHTML = originalContent; btn.style.width = ''; }
      }
    } catch(e) {
      UI.toast('Gagal terhubung ke server','error');
      if (btn) { btn.disabled = false; btn.innerHTML = originalContent; btn.style.width = ''; }
    }
  }

  async function undo() {
    if (!lastAction || !lastDeletedData) return;
    const undoBtn = document.getElementById('pay-undo-btn');
    const redoBtn = document.getElementById('pay-redo-btn');
    try {
      if (undoBtn) undoBtn.disabled = true;
      if (lastAction === 'DELETE') {
        const res = await API.pembayaran.add(lastDeletedData);
        if (res.status === 'OK') {
          UI.toast('Undo Berhasil: Pembayaran dikembalikan!','success');
          lastAction = 'UNDO_DELETE';
          if (redoBtn) redoBtn.disabled = false;
          allData = []; isFetched = false; load(true);
        }
      }
    } catch(e) { UI.toast('Gagal melakukan Undo','error'); if (undoBtn) undoBtn.disabled = false; }
  }

  async function redo() {
    if (!lastDeletedData || lastAction !== 'UNDO_DELETE') return;
    const redoBtn = document.getElementById('pay-redo-btn');
    try {
      if (redoBtn) redoBtn.disabled = true;
      const res = await API.pembayaran.add(lastDeletedData);
      if (res.status === 'OK') {
        UI.toast('Redo Berhasil: Pembayaran dipulihkan!','success');
        lastAction = 'DELETE';
        const undoBtn = document.getElementById('pay-undo-btn');
        if (undoBtn) undoBtn.disabled = false;
        allData = []; isFetched = false; load(true);
      }
    } catch(e) { UI.toast('Gagal melakukan Redo','error'); if (redoBtn) redoBtn.disabled = false; }
  }

  async function deleteAll() {
    const total = allData.length;
    if (total === 0) return UI.toast('Tidak ada data untuk dihapus','info');
    if (!confirm(`PERINGATAN! Kamu akan menghapus SEMUA (${total}) data pembayaran.`)) return;
    const konfirmasi = prompt("Ketik 'HAPUS SEMUA PEMBAYARAN' untuk melanjutkan:");
    if (konfirmasi !== 'HAPUS SEMUA PEMBAYARAN') { UI.toast('Penghapusan massal dibatalkan.','error'); return; }
    UI.toast('Sedang membersihkan database...','info');
    try {
      for (const p of allData) { await API.pembayaran.delete(p.id); }
      UI.toast('Seluruh data pembayaran berhasil dihapus!','success');
      allData = []; isFetched = false; load();
    } catch(e) { UI.toast('Gagal menghapus semua data','error'); }
  }

  // ── MASALAH 5: Modal "Pilih Item" untuk Auto-fill ──────────
  async function openItemPicker() {
    const modal = document.getElementById('modal-pilih-item');
    if (!modal) {
      // Buat modal dinamis jika belum ada di HTML
      _createItemPickerModal();
    }
    
    const listEl = document.getElementById('item-picker-list');
    if (listEl) listEl.innerHTML = '<div class="spinner spinner-sm"></div> Memuat item...';
    UI.openModal('modal-pilih-item');

    try {
      // Ambil SPP yang belum lunas & Buku yang stok tersedia
      const [sppRes, bukuRes] = await Promise.all([
        API.spp.getAll(), API.buku.getAll()
      ]);

      const sppItems = (sppRes.data || [])
        .filter(s => s.status_bayar !== 'PAID' && s.status === 'AKTIF')
        .map(s => ({
          id:    s.id,
          label: `[SPP] ${s.nama_murid} — ${s.program} (${s.periode_mulai} s/d ${s.periode_akhir})`,
          nama:  s.nama_murid,
          harga: Number(s.harga) - Number(s.terbayar || 0),  // Sisa tagihan
          jenis: 'SPP',
          badge: 'spp'
        }));

      const bukuItems = (bukuRes.data || [])
        .filter(b => Number(b.stok) > 0)
        .map(b => ({
          id:    b.id,
          label: `[BUKU] ${b.nama_modul || b.nama} — Stok: ${b.stok}`,
          nama:  b.nama_modul || b.nama,
          harga: Number(b.harga_jual) || 0,
          jenis: 'BUKU',
          badge: 'buku'
        }));

      const allItems = [...sppItems, ...bukuItems];

      if (!allItems.length) {
        if (listEl) listEl.innerHTML = '<div class="empty-feed">Tidak ada item tersedia (SPP sudah lunas / stok buku kosong)</div>';
        return;
      }

      if (listEl) listEl.innerHTML = allItems.map((item, idx) => `
        <div class="item-picker-row" onclick="PembayaranPage.selectItem(${idx})" 
             data-idx="${idx}"
             data-nama="${item.nama}" data-harga="${item.harga}" data-jenis="${item.jenis}">
          <span class="program-tag">${item.jenis}</span>
          <span style="flex:1;margin-left:8px;">${item.label}</span>
          <strong style="color:var(--primary)">${UI.formatCurrency(item.harga)}</strong>
        </div>`).join('');

      // Simpan items di data attribute untuk diakses selectItem
      if (listEl) listEl.dataset.items = JSON.stringify(allItems);
      lucide.createIcons();

    } catch(e) {
      if (listEl) listEl.innerHTML = '<div class="empty-feed">Gagal memuat data item.</div>';
    }
  }

  function selectItem(idx) {
    const listEl = document.getElementById('item-picker-list');
    if (!listEl) return;
    const items = JSON.parse(listEl.dataset.items || '[]');
    const item = items[idx];
    if (!item) return;

    // FIX MASALAH 5: Auto-fill form pembayaran
    const jenisEl = document.getElementById('pay-jenis');
    const jumlahEl = document.getElementById('pay-jumlah');
    const ketEl = document.getElementById('pay-keterangan');

    if (jenisEl)  jenisEl.value  = item.jenis;
    if (jumlahEl) jumlahEl.value = item.harga;
    if (ketEl)    ketEl.value    = item.nama;

    UI.toast(`Item "${item.nama}" dipilih — form sudah diisi otomatis`,'success');
    UI.closeModal('modal-pilih-item');
  }

  function _createItemPickerModal() {
    const div = document.createElement('div');
    div.id = 'modal-pilih-item';
    div.className = 'modal-overlay';
    div.innerHTML = `
      <div class="modal-box">
        <div class="modal-header">
          <h3><i data-lucide="shopping-cart"></i> Pilih Item Pembayaran</h3>
          <button class="modal-close" onclick="UI.closeModal('modal-pilih-item')">
            <i data-lucide="x"></i>
          </button>
        </div>
        <div class="modal-body">
          <p style="color:var(--text-secondary);margin-bottom:12px;font-size:0.85rem;">
            Klik item untuk mengisi form pembayaran secara otomatis.
          </p>
          <div id="item-picker-list" style="display:flex;flex-direction:column;gap:8px;max-height:400px;overflow-y:auto;">
          </div>
        </div>
      </div>`;
    document.body.appendChild(div);
    lucide.createIcons();
  }

  return { load, search, saveForm, openAdd, openEdit, deletePembayaran, updateSummary, undo, redo, deleteAll, openItemPicker, selectItem };
})();


// ============================================================
// GajiPage — Masalah 2 (toolbar), 4 (undo/redo/hapusAll)
// ============================================================

const GajiPage = (() => {
  let allData      = [];
  let filteredData = [];
  let isFetched    = false;
  let lastDeletedData = null;
  let lastAction      = null;

  async function load(forceRefresh = false) {
    const tbody = document.getElementById('gaji-tbody');
    if (!tbody) return;

    if (!forceRefresh && allData.length > 0) {
      renderTable(allData);
    } else {
      tbody.innerHTML = '<tr><td colspan="7" class="empty-row"><div class="spinner spinner-sm"></div> Memuat data gaji...</td></tr>';
    }

    try {
      const [gajiRes, mentorRes] = await Promise.all([ API.gaji.getAll(), API.mentor.getAll() ]);
      if (gajiRes.status === 'OK') {
        allData = gajiRes.data || [];
        filteredData = [...allData];
        isFetched = true;
        const sel = document.getElementById('gaji-mentor');
        if (sel && sel.options.length <= 1) populateMentor(mentorRes.data || []);
        renderTable(allData);
      }
    } catch(e) {
      console.error('Error Load Gaji:',e);
      if (!allData.length) tbody.innerHTML = '<tr><td colspan="7" class="empty-row">Gagal memuat data.</td></tr>';
    }
  }

  function search(term) {
    const filtered = allData.filter(g =>
      (g.nama_mentor||'').toLowerCase().includes(term.toLowerCase()) ||
      (g.bulan_gaji||'').toLowerCase().includes(term.toLowerCase()) ||
      (g.id_trx||'').toLowerCase().includes(term.toLowerCase())
    );
    renderTable(filtered);
  }

  function populateMentor(mentors) {
    const sel = document.getElementById('gaji-mentor');
    if (!sel) return;
    sel.innerHTML = '<option value="">-- Pilih Mentor --</option>' +
      mentors.map(m => `<option value="${m.id}">${m.nama}</option>`).join('');
  }

  function renderTable(data) {
    const rows = data.map(g => `
      <tr>
        <td><span class="id-badge">${g.id_trx}</span></td>
        <td>${UI.formatDate(g.tgl_bayar)}</td>
        <td>${g.bulan_gaji}</td>
        <td><strong>${g.nama_mentor}</strong></td>
        <td><strong class="text-success">${UI.formatCurrency(g.jumlah)}</strong></td>
        <td>${g.metode}</td>
        <td>
          <div class="action-btns">
            <button class="btn-icon btn-warning" onclick="GajiPage.openEdit('${g.id_trx}')" title="Edit">
              <i data-lucide="pencil"></i>
            </button>
            <button class="btn-icon btn-danger" data-delete-id="${g.id_trx}"
                    onclick="GajiPage.deleteGaji('${g.id_trx}','${g.nama_mentor}')" title="Hapus">
              <i data-lucide="trash-2"></i>
            </button>
          </div>
        </td>
      </tr>`);
    UI.renderTable('gaji-tbody', rows, 'Belum ada data penggajian');
    if (window.lucide) lucide.createIcons();
  }

  function openAdd() {
    clearForm();
    const title = document.getElementById('modal-gaji-title');
    if (title) title.textContent = 'Catat Penggajian Baru';
    document.getElementById('gaji-id-field').value = '';
    const mentorSel = document.getElementById('gaji-mentor');
    if (mentorSel) { mentorSel.value = ''; mentorSel.disabled = false; }
    document.getElementById('gaji-bulan').value = '';
    document.getElementById('gaji-tgl').value = new Date().toISOString().split('T')[0];
    UI.openModal('modal-gaji');
  }

  function openEdit(id) {
    const g = allData.find(x => x.id_trx === id);
    if (!g) return;
    clearForm();
    document.getElementById('modal-gaji-title').textContent = 'Edit Catatan Gaji';
    document.getElementById('gaji-id-field').value  = g.id_trx;
    document.getElementById('gaji-mentor').value    = g.id_mentor;
    document.getElementById('gaji-bulan').value     = g.bulan_gaji;
    document.getElementById('gaji-tgl').value       = g.tgl_bayar;
    document.getElementById('gaji-metode').value    = g.metode;
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
    const btn = document.querySelector('#modal-gaji .btn-primary');
    const id = document.getElementById('gaji-id-field').value;
    const mentorSel  = document.getElementById('gaji-mentor');
    const bulan_gaji = document.getElementById('gaji-bulan').value;
    const tgl_bayar  = document.getElementById('gaji-tgl').value;
    const metode     = document.getElementById('gaji-metode').value;

    if (!mentorSel.value || !bulan_gaji) { UI.toast('Mentor dan bulan gaji wajib diisi','error'); return; }

    const payload = { id_mentor: mentorSel.value, bulan_gaji, tgl_bayar, metode };

    try {
      if (btn) { btn.disabled = true; btn.innerHTML = id ? '<div class="spinner spinner-sm"></div> Memperbarui...' : '<div class="spinner spinner-sm"></div> Memproses gaji...'; }
      const res = id ? await API.gaji.update({ id, ...payload }) : await API.gaji.record(payload);
      if (res.status === 'OK') {
        UI.toast(id ? 'Data gaji berhasil diperbarui' : 'Gaji berhasil dicatat!','success');
        UI.closeModal('modal-gaji');
        allData = []; isFetched = false; await load(true);
      } else { UI.toast(res.message || 'Gagal menyimpan data','error'); }
    } catch(e) { UI.toast('Terjadi kesalahan koneksi ke server','error'); }
    finally { if (btn) { btn.disabled = false; btn.innerHTML = 'Simpan Penggajian'; } }
  }

  async function deleteGaji(id, nama) {
    const g = allData.find(x => x.id_trx === id);
    if (!confirm(`Hapus catatan gaji untuk "${nama}"?`)) return;

    lastDeletedData = g ? JSON.parse(JSON.stringify(g)) : null;
    lastAction = 'DELETE';

    const btn = document.querySelector(`button[data-delete-id="${id}"]`);
    const originalContent = btn ? btn.innerHTML : '';
    try {
      if (btn) { btn.disabled = true; btn.innerHTML = '<div class="spinner spinner-sm"></div>'; btn.style.width = '40px'; }
      const res = await API.gaji.delete(id);
      if (res.status === 'OK') {
        UI.toast(`Catatan gaji "${nama}" berhasil dihapus. Klik Undo untuk membatalkan.`,'warning');
        allData = allData.filter(x => x.id_trx !== id); renderTable(allData);
        const undoBtn = document.getElementById('gaji-undo-btn');
        if (undoBtn) undoBtn.disabled = false;
        if (window.Dashboard) Dashboard.isFetched = false;
      } else {
        UI.toast(res.message || 'Gagal menghapus','error');
        if (btn) { btn.disabled = false; btn.innerHTML = originalContent; btn.style.width = ''; }
      }
    } catch(e) {
      UI.toast('Gagal terhubung ke server','error');
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
          UI.toast('Undo Berhasil: Catatan gaji dikembalikan!','success');
          lastAction = 'UNDO_DELETE';
          if (redoBtn) redoBtn.disabled = false;
          allData = []; isFetched = false; load(true);
        }
      }
    } catch(e) { UI.toast('Gagal melakukan Undo','error'); if (undoBtn) undoBtn.disabled = false; }
  }

  async function redo() {
    if (!lastDeletedData || lastAction !== 'UNDO_DELETE') return;
    const redoBtn = document.getElementById('gaji-redo-btn');
    try {
      if (redoBtn) redoBtn.disabled = true;
      const res = await API.gaji.record(lastDeletedData);
      if (res.status === 'OK') {
        UI.toast('Redo Berhasil: Catatan gaji dipulihkan!','success');
        lastAction = 'DELETE';
        const undoBtn = document.getElementById('gaji-undo-btn');
        if (undoBtn) undoBtn.disabled = false;
        allData = []; isFetched = false; load(true);
      }
    } catch(e) { UI.toast('Gagal melakukan Redo','error'); if (redoBtn) redoBtn.disabled = false; }
  }

  async function deleteAll() {
    const total = allData.length;
    if (total === 0) return UI.toast('Tidak ada data untuk dihapus','info');
    if (!confirm(`PERINGATAN! Kamu akan menghapus SEMUA (${total}) catatan gaji.`)) return;
    const konfirmasi = prompt("Ketik 'HAPUS SEMUA GAJI' untuk melanjutkan:");
    if (konfirmasi !== 'HAPUS SEMUA GAJI') { UI.toast('Penghapusan massal dibatalkan.','error'); return; }
    UI.toast('Sedang membersihkan database...','info');
    try {
      for (const g of allData) { await API.gaji.delete(g.id_trx); }
      UI.toast('Seluruh catatan gaji berhasil dihapus!','success');
      allData = []; isFetched = false; load();
    } catch(e) { UI.toast('Gagal menghapus semua data','error'); }
  }

  return { load, search, saveForm, openAdd, openEdit, deleteGaji, clearForm, undo, redo, deleteAll };
})();


// ============================================================
// Apps Script FIX — handleGetBuku & handleUpdateBuku
// (Masalah 1 & 3: sinkron field nama_modul, stok, harga)
// Salin fungsi-fungsi ini ke Code.gs Anda, GANTI yang lama
// ============================================================
/*
  ⚠️  PERBAIKAN APPS SCRIPT — TEMPEL KE Code.gs

  Ganti fungsi handleGetBuku yang lama dengan ini:

  function handleGetBuku(params) {
    const data = getSheetData(CONFIG.SHEETS.BUKU);
    const buku = data.map(row => ({
      id:          row[0],
      nama_modul:  row[1],   // ← pakai nama_modul (bukan nama)
      jenjang:     row[2],
      program:     row[3],
      stok:        Number(row[4]) || 0,        // ← Number wajib
      harga_beli:  Number(row[5]) || 0,        // ← Number wajib
      harga_jual:  Number(row[6]) || 0,        // ← Number wajib
      keterangan:  row[7] || ''
    }));
    if (params.program) return ok(buku.filter(b => b.program === params.program));
    return ok(buku);
  }

  Ganti fungsi handleUpdateBuku yang lama dengan ini:

  function handleUpdateBuku(body) {
    const { id, nama_modul, jenjang, program, stok, harga_beli, harga_jual, keterangan } = body;
    if (!id) return err('ID required');
    const data = getSheetData(CONFIG.SHEETS.BUKU);
    const idx  = data.findIndex(row => row[0] === id);
    if (idx === -1) return err('Book not found');
    const existing = data[idx];
    updateRow(CONFIG.SHEETS.BUKU, idx, [
      id,
      nama_modul  !== undefined ? nama_modul  : existing[1],
      jenjang     !== undefined ? jenjang     : existing[2],
      program     !== undefined ? program     : existing[3],
      stok        !== undefined ? Number(stok)       : existing[4],
      harga_beli  !== undefined ? Number(harga_beli) : existing[5],
      harga_jual  !== undefined ? Number(harga_jual) : existing[6],
      keterangan  !== undefined ? keterangan  : existing[7]
    ]);
    logSystem('INFO','UPDATE_BUKU','Modul diperbarui: '+id);
    return ok({ message: 'Modul pembelajaran berhasil diperbarui' });
  }

  Tambahkan juga di handleAddPembayaran, setelah baris appendRow,
  logika pengurangan stok buku jika jenis === 'BUKU':

  if (jenis === 'BUKU' && keterangan) {
    const bukuData = getSheetData(CONFIG.SHEETS.BUKU);
    // Cari buku berdasarkan nama (keterangan = nama buku)
    const bukuIdx = bukuData.findIndex(row =>
      String(row[1]).trim().toLowerCase() === String(keterangan).trim().toLowerCase()
    );
    if (bukuIdx !== -1 && Number(bukuData[bukuIdx][4]) > 0) {
      bukuData[bukuIdx][4] = Number(bukuData[bukuIdx][4]) - 1; // kurangi stok
      updateRow(CONFIG.SHEETS.BUKU, bukuIdx, bukuData[bukuIdx]);
    }
  }
*/


// ============================================================
// HTML TOOLBAR TEMPLATE — Masalah 2
// Salin pola ini ke masing-masing halaman HTML.
// Ganti XxxPage & xxx-tbody sesuai modul.
// ============================================================
/*
<!-- MENTOR PAGE toolbar -->
<div class="table-toolbar">
  <div class="table-title">
    <i data-lucide="user-check"></i> Data Mentor
  </div>
  <div class="table-controls">
    <input type="text" class="search-input" placeholder="Cari mentor..."
      oninput="MentorPage.search(this.value)">
    <div class="ctrl-divider"></div>
    <button class="ctrl-btn" onclick="MentorPage.load(true)">
      <i data-lucide="refresh-cw"></i> Refresh
    </button>
    <button class="ctrl-btn icon-only" id="mentor-undo-btn" onclick="MentorPage.undo()" disabled>
      <i data-lucide="undo-2"></i>
    </button>
    <button class="ctrl-btn icon-only" id="mentor-redo-btn" onclick="MentorPage.redo()" disabled>
      <i data-lucide="redo-2"></i>
    </button>
    <div class="ctrl-divider"></div>
    <button class="ctrl-btn ctrl-danger" onclick="MentorPage.deleteAll()">
      <i data-lucide="trash-2"></i> Hapus Semua
    </button>
  </div>
</div>

<!-- SPP PAGE toolbar -->
<div class="table-toolbar">
  <div class="table-title">
    <i data-lucide="calendar-check"></i> Data Paket SPP
  </div>
  <div class="table-controls">
    <input type="text" class="search-input" placeholder="Cari SPP..."
      oninput="SPPPage.search(this.value)">
    <div class="ctrl-divider"></div>
    <button class="ctrl-btn" onclick="SPPPage.load(true)">
      <i data-lucide="refresh-cw"></i> Refresh
    </button>
    <button class="ctrl-btn icon-only" id="spp-undo-btn" onclick="SPPPage.undo()" disabled>
      <i data-lucide="undo-2"></i>
    </button>
    <button class="ctrl-btn icon-only" id="spp-redo-btn" onclick="SPPPage.redo()" disabled>
      <i data-lucide="redo-2"></i>
    </button>
    <div class="ctrl-divider"></div>
    <button class="ctrl-btn ctrl-danger" onclick="SPPPage.deleteAll()">
      <i data-lucide="trash-2"></i> Hapus Semua
    </button>
  </div>
</div>

<!-- MODUL BELAJAR (BUKU) PAGE toolbar -->
<div class="table-toolbar">
  <div class="table-title">
    <i data-lucide="book-open"></i> Modul Belajar
  </div>
  <div class="table-controls">
    <input type="text" class="search-input" placeholder="Cari modul..."
      oninput="BukuPage.search(this.value)">
    <div class="ctrl-divider"></div>
    <button class="ctrl-btn" onclick="BukuPage.load(true)">
      <i data-lucide="refresh-cw"></i> Refresh
    </button>
    <button class="ctrl-btn icon-only" id="buku-undo-btn" onclick="BukuPage.undo()" disabled>
      <i data-lucide="undo-2"></i>
    </button>
    <button class="ctrl-btn icon-only" id="buku-redo-btn" onclick="BukuPage.redo()" disabled>
      <i data-lucide="redo-2"></i>
    </button>
    <div class="ctrl-divider"></div>
    <button class="ctrl-btn ctrl-danger" onclick="BukuPage.deleteAll()">
      <i data-lucide="trash-2"></i> Hapus Semua
    </button>
  </div>
</div>

<!-- PRESENSI PAGE toolbar -->
<div class="table-toolbar">
  <div class="table-title">
    <i data-lucide="clipboard-list"></i> Data Presensi
  </div>
  <div class="table-controls">
    <input type="text" class="search-input" placeholder="Cari presensi..."
      oninput="PresensiPage.search(this.value)">
    <div class="ctrl-divider"></div>
    <button class="ctrl-btn" onclick="PresensiPage.load(true)">
      <i data-lucide="refresh-cw"></i> Refresh
    </button>
    <button class="ctrl-btn icon-only" id="presensi-undo-btn" onclick="PresensiPage.undo()" disabled>
      <i data-lucide="undo-2"></i>
    </button>
    <button class="ctrl-btn icon-only" id="presensi-redo-btn" onclick="PresensiPage.redo()" disabled>
      <i data-lucide="redo-2"></i>
    </button>
    <div class="ctrl-divider"></div>
    <button class="ctrl-btn ctrl-danger" onclick="PresensiPage.deleteAll()">
      <i data-lucide="trash-2"></i> Hapus Semua
    </button>
  </div>
</div>

<!-- PEMBAYARAN PAGE toolbar -->
<div class="table-toolbar">
  <div class="table-title">
    <i data-lucide="credit-card"></i> Riwayat Pembayaran
  </div>
  <div class="table-controls">
    <input type="text" class="search-input" placeholder="Cari pembayaran..."
      oninput="PembayaranPage.search(this.value)">
    <div class="ctrl-divider"></div>
    <button class="ctrl-btn" onclick="PembayaranPage.load(true)">
      <i data-lucide="refresh-cw"></i> Refresh
    </button>
    <button class="ctrl-btn icon-only" id="pay-undo-btn" onclick="PembayaranPage.undo()" disabled>
      <i data-lucide="undo-2"></i>
    </button>
    <button class="ctrl-btn icon-only" id="pay-redo-btn" onclick="PembayaranPage.redo()" disabled>
      <i data-lucide="redo-2"></i>
    </button>
    <div class="ctrl-divider"></div>
    <button class="ctrl-btn" onclick="PembayaranPage.openItemPicker()">
      <i data-lucide="shopping-cart"></i> Pilih Item
    </button>
    <div class="ctrl-divider"></div>
    <button class="ctrl-btn ctrl-danger" onclick="PembayaranPage.deleteAll()">
      <i data-lucide="trash-2"></i> Hapus Semua
    </button>
  </div>
</div>

<!-- GAJI PAGE toolbar -->
<div class="table-toolbar">
  <div class="table-title">
    <i data-lucide="banknote"></i> Data Penggajian
  </div>
  <div class="table-controls">
    <input type="text" class="search-input" placeholder="Cari gaji..."
      oninput="GajiPage.search(this.value)">
    <div class="ctrl-divider"></div>
    <button class="ctrl-btn" onclick="GajiPage.load(true)">
      <i data-lucide="refresh-cw"></i> Refresh
    </button>
    <button class="ctrl-btn icon-only" id="gaji-undo-btn" onclick="GajiPage.undo()" disabled>
      <i data-lucide="undo-2"></i>
    </button>
    <button class="ctrl-btn icon-only" id="gaji-redo-btn" onclick="GajiPage.redo()" disabled>
      <i data-lucide="redo-2"></i>
    </button>
    <div class="ctrl-divider"></div>
    <button class="ctrl-btn ctrl-danger" onclick="GajiPage.deleteAll()">
      <i data-lucide="trash-2"></i> Hapus Semua
    </button>
  </div>
</div>
*/


// ============================================================
// LogsPage (tidak berubah)
// ============================================================

const LogsPage = (() => {
  async function load() {
    const res = await API.logs.getAll();
    const logs = res.data || [];
    const rows = logs.map(l => `
      <tr>
        <td><small>${l.timestamp || '-'}</small></td>
        <td><span class="badge ${l.level === 'ERROR' ? 'badge-danger' : 'badge-success'}">${l.level}</span></td>
        <td><strong>${l.event}</strong></td>
        <td>${l.detail}</td>
        <td>${l.user || '-'}</td>
      </tr>`);
    UI.renderTable('logs-tbody', rows, 'Tidak ada log sistem');
  }
  return { load };
})();


// ============================================================
// OwnerFinancePage (tidak berubah)
// ============================================================

const OwnerFinancePage = (() => {
  async function load() {
    try {
      const [statsRes, payRes, sppRes, gajiRes] = await Promise.all([
        API.dashboard.getStats(), API.pembayaran.getAll(), API.spp.getAll(), API.gaji.getAll()
      ]);
      if (statsRes.status === 'OK' && statsRes.data.finance) renderFinanceSummary(statsRes.data.finance, statsRes.data.payments);
      if (payRes.status === 'OK')  renderPaymentHistory(payRes.data || []);
      if (sppRes.status === 'OK')  renderSPPStatus(sppRes.data || []);
      if (gajiRes.status === 'OK') renderGajiHistory(gajiRes.data || []);
    } catch(e) { UI.toast('Error memuat laporan keuangan: '+e.message,'error'); }
  }
  function renderFinanceSummary(finance, payments) {
    const ids = {
      'owner-fin-spp': finance.total_spp, 'owner-fin-op': finance.total_operational,
      'owner-fin-sav': finance.total_savings, 'owner-fin-rev': finance.total_revenue,
      'owner-pay-today': payments ? payments.today : 0, 'owner-pay-month': payments ? payments.this_month : 0
    };
    Object.entries(ids).forEach(([id,val]) => { const el = document.getElementById(id); if (el) el.textContent = UI.formatCurrency(val); });
  }
  function renderPaymentHistory(data) {
    const sppOnly = data.filter(p => p.jenis === 'SPP').slice(-30).reverse();
    const rows = sppOnly.map(p => `<tr><td>${UI.formatDate(p.tanggal)}</td><td><strong>${p.nama}</strong></td><td>${p.periode||'-'}</td><td><strong>${UI.formatCurrency(p.jumlah)}</strong></td><td>${p.metode}</td></tr>`);
    UI.renderTable('owner-pay-tbody', rows, 'Belum ada data pembayaran');
  }
  function renderSPPStatus(data) {
    const unpaid = data.filter(s => s.status_bayar === 'UNPAID').length;
    const partial = data.filter(s => s.status_bayar === 'PARTIAL').length;
    const paid = data.filter(s => s.status_bayar === 'PAID').length;
    const els = { 'owner-spp-unpaid': unpaid, 'owner-spp-partial': partial, 'owner-spp-paid': paid };
    Object.entries(els).forEach(([id,val]) => { const el = document.getElementById(id); if (el) el.textContent = val; });
  }
  function renderGajiHistory(data) {
    const rows = data.slice(-20).reverse().map(g => `<tr><td>${UI.formatDate(g.tgl_bayar)}</td><td>${g.bulan_gaji}</td><td><strong>${g.nama_mentor}</strong></td><td><strong class="text-success">${UI.formatCurrency(g.jumlah)}</strong></td><td>${g.metode}</td></tr>`);
    UI.renderTable('owner-gaji-tbody', rows, 'Belum ada data penggajian');
  }
  return { load };
})();


// ============================================================
// MentorStudentsPage (tidak berubah)
// ============================================================

const MentorStudentsPage = (() => {
  async function load() {
    const user = API.currentUser();
    const mentorName = user.username || '';
    try {
      const res = await API.mentor.getMyStudents(mentorName);
      if (res.status !== 'OK') { UI.toast('Gagal memuat data murid','error'); return; }
      renderStudents(res.data || []);
    } catch(e) { UI.toast('Error: '+e.message,'error'); }
  }
  function renderStudents(students) {
    const container = document.getElementById('mentor-students-grid');
    if (!container) return;
    if (!students.length) {
      container.innerHTML = '<div class="empty-feed" style="padding:32px;text-align:center;">Belum ada murid yang ditugaskan kepada Anda</div>';
      return;
    }
    container.innerHTML = students.map(s => `
      <div class="student-card">
        <div class="student-card-header">
          <div class="avatar-initial" style="width:40px;height:40px;font-size:1rem;">${(s.nama||'?')[0].toUpperCase()}</div>
          <div>
            <div class="student-card-name">${s.nama}</div>
            <div class="student-card-meta">${s.kelas||'-'} · <span class="program-tag">${s.program}</span></div>
          </div>
          ${UI.statusBadge(s.status)}
        </div>
        <div class="student-card-body">
          <div class="student-stat">
            <i data-lucide="calendar-days"></i>
            <span>${s.schedule.map(sc => sc.hari+' '+sc.jam).join(', ')||'Belum ada jadwal'}</span>
          </div>
          <div class="student-stat">
            <i data-lucide="layers"></i>
            <span>Sisa ${s.sisa_pertemuan} pertemuan &nbsp;${UI.statusBadge(s.spp_status)}</span>
          </div>
        </div>
      </div>`).join('');
    lucide.createIcons({ nodes: [container] });
  }
  return { load };
})();


// ============================================================
// MentorPresensiPage (tidak berubah)
// ============================================================

const MentorPresensiPage = (() => {
  let myStudents = [];
  async function load() {
    const user = API.currentUser();
    const mentorName = user.username || '';
    const today = new Date().toISOString().split('T')[0];
    try {
      const [studRes, presRes] = await Promise.all([
        API.mentor.getMyStudents(mentorName), API.presensi.getAll()
      ]);
      myStudents = studRes.data || [];
      populateStudentDropdown(myStudents);
      const myToday = (presRes.data||[]).filter(p => p.nama_mentor === mentorName && p.tanggal === today);
      renderTodayLog(myToday);
      document.getElementById('mentor-presensi-tanggal').value = today;
    } catch(e) { UI.toast('Error: '+e.message,'error'); }
  }
  function populateStudentDropdown(students) {
    const sel = document.getElementById('mentor-presensi-murid');
    if (!sel) return;
    sel.innerHTML = '<option value="">-- Pilih Murid --</option>' +
      students.map(s => `<option value="${s.id}" data-nama="${s.nama}" data-program="${s.program}">${s.nama}</option>`).join('');
  }
  function renderTodayLog(records) {
    const rows = records.map(p => `
      <tr>
        <td><strong>${p.nama_murid}</strong></td>
        <td><span class="program-tag">${p.program}</span></td>
        <td>${UI.statusBadge(p.status)}</td>
        <td>${UI.stars(p.bintang)}</td>
        <td>${p.catatan||'-'}</td>
      </tr>`);
    UI.renderTable('mentor-presensi-tbody', rows, 'Belum ada presensi hari ini');
  }
  async function saveForm() {
    const user     = API.currentUser();
    const tanggal  = document.getElementById('mentor-presensi-tanggal').value;
    const muridSel = document.getElementById('mentor-presensi-murid');
    const status   = document.getElementById('mentor-presensi-status').value;
    const bintang  = document.getElementById('mentor-presensi-bintang').value;
    const catatan  = document.getElementById('mentor-presensi-catatan').value;
    if (!tanggal || !muridSel.value) { UI.toast('Tanggal dan murid wajib diisi','error'); return; }
    const opt = muridSel.options[muridSel.selectedIndex];
    const payload = {
      tanggal, id_murid: muridSel.value, nama_murid: opt.dataset.nama,
      id_mentor: user.mentor_id||'', nama_mentor: user.username,
      program: opt.dataset.program, status, catatan, bintang: parseInt(bintang)||0
    };
    const res = await API.presensi.add(payload);
    if (res.status === 'OK') {
      UI.toast('Presensi berhasil dicatat','success');
      UI.closeModal('modal-mentor-presensi');
      load();
    } else { UI.toast(res.message||'Gagal','error'); }
  }
  return { load, saveForm };
})();
