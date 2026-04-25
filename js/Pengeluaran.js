const OperasionalPage = (() => {
  let allData         = [];
  let isFetched       = false;
  let lastDeletedData = null;
  let lastAction      = null;
  let lastAddedId     = null;
  let lastRestoredId  = null;
  let _cachedBukuOps  = null;

  function inferArah(tr) {
    if (tr.arah) return tr.arah;
    const MASUK = ['SPP', 'PENDAFTARAN', 'BUKU_JUAL'];
    return MASUK.includes(String(tr.jenis || '').toUpperCase()) ? 'masuk' : 'keluar';
  }

  async function load(forceRefresh = false) {
    const tbody = document.getElementById('ops-tbody');
    if (!tbody) return;

    if (forceRefresh) {
      lastDeletedData = null;
      lastAction      = null;
      lastRestoredId  = null;
    }

    if (!forceRefresh && isFetched && allData.length >= 0) {
      renderTable(allData.slice(-50).reverse());
      updateSummary();
      return;
    }

    tbody.innerHTML = '<tr><td colspan="7" class="empty-row"><div class="spinner spinner-sm"></div> Memuat data pengeluaran...</td></tr>';
    try {
      const res = await API.pembayaran.getAll();
      if (res.status === 'OK') {
        allData    = (res.data || [])
          .map(d => ({ ...d, arah: inferArah(d) }))
          .filter(d => d.arah === 'keluar');
        isFetched  = true;
        _cachedBukuOps = null;
        renderTable(allData.slice(-50).reverse());
        updateSummary();
      }
    } catch(e) {
      if (!isFetched) tbody.innerHTML = '<tr><td colspan="7" class="empty-row">Gagal memuat data.</td></tr>';
    }
  }

  function search(term) {
    const t = term.toLowerCase();
    renderTable(allData.filter(p =>
      (p.keterangan || '').toLowerCase().includes(t) ||
      (p.jenis      || '').toLowerCase().includes(t) ||
      (p.id         || '').toLowerCase().includes(t)
    ));
  }

  function renderTable(data) {
    const rows = data.map(p => {
      const jenisLabel = ['BUKU', 'BUKU_BELI'].includes(String(p.jenis || '').toUpperCase())
        ? 'Buku (Keluar)' : (p.jenis || '-');
      return `
      <tr>
        <td style="width:32px;">${Selection.checkbox('ops', p.id)}</td>
        <td>${UI.formatDate(p.tanggal)}</td>
        <td><span class="program-tag" style="background:var(--danger-dim);color:var(--danger);">${jenisLabel}</span></td>
        <td>${p.keterangan || '-'}</td>
        <td style="font-weight:600;color:var(--danger);">${UI.formatCurrency(p.jumlah)}</td>
        <td>${p.metode || '-'}</td>
        <td>
          <div class="action-btns">
            <button class="btn-icon btn-warning" onclick="OperasionalPage.openEdit('${p.id}')" title="Edit">
              <i data-lucide="pencil"></i>
            </button>
            <button class="btn-icon btn-danger" data-delete-id="${p.id}"
                    onclick="OperasionalPage.deleteItem('${p.id}','${(p.keterangan || p.jenis || '').replace(/'/g,"\\'")}')">
              <i data-lucide="trash-2"></i>
            </button>
          </div>
        </td>
      </tr>`;
    });
    UI.renderTable('ops-tbody', rows, 'Belum ada data pengeluaran');
    lucide.createIcons({ nodes: [document.getElementById('ops-tbody')] });
  }

  function updateSummary() {
    const today      = new Date().toISOString().split('T')[0];
    const todayTotal = allData.filter(p => p.tanggal === today).reduce((s, p) => s + (Number(p.jumlah) || 0), 0);
    const totalKeluar= allData.reduce((s, p) => s + (Number(p.jumlah) || 0), 0);
    const el         = document.getElementById('ops-today-summary');
    if (el) el.textContent = `Pengeluaran hari ini: ${UI.formatCurrency(todayTotal)} | Total: ${UI.formatCurrency(totalKeluar)}`;
  }

  function _resetOpsForm() {
    ['ops-id-field', 'ops-deskripsi'].forEach(id => { const el = document.getElementById(id); if (el) el.value = ''; });
    ['ops-jumlah-pcs', 'ops-harga-satuan'].forEach(id => { const el = document.getElementById(id); if (el) el.value = '1'; });
    const tgl = document.getElementById('ops-tanggal');
    if (tgl) tgl.value = new Date().toISOString().split('T')[0];
    const kat = document.getElementById('ops-kategori');
    if (kat) kat.value = 'ATK';
    const met = document.getElementById('ops-metode');
    if (met) met.value = 'TUNAI';
    _updateTotal();
  }

  function _updateTotal() {
    const pcs    = Number(document.getElementById('ops-jumlah-pcs')?.value)    || 0;
    const satuan = Number(document.getElementById('ops-harga-satuan')?.value)  || 0;
    const total  = pcs * satuan;
    const totalEl= document.getElementById('ops-total-display');
    if (totalEl) totalEl.textContent = UI.formatCurrency(total);
    const hidEl  = document.getElementById('ops-jumlah-hidden');
    if (hidEl) hidEl.value = total;
  }

  function openAdd() {
    _resetOpsForm();
    const title = document.getElementById('modal-ops-title');
    if (title) title.textContent = 'Catat Pengeluaran';
    UI.openModal('modal-operasional');
    ['ops-jumlah-pcs', 'ops-harga-satuan'].forEach(id => {
      const el = document.getElementById(id);
      if (el) el.oninput = _updateTotal;
    });
    const katEl = document.getElementById('ops-kategori');
    if (katEl && !katEl._opsBound) {
      katEl._opsBound = true;
      katEl.addEventListener('change', () => { if (['BUKU', 'BUKU_BELI'].includes(katEl.value)) _openBukuPicker(); });
    }
  }

  function openEdit(id) {
    const p = allData.find(x => x.id === id);
    if (!p) return;
    _resetOpsForm();
    document.getElementById('modal-ops-title').textContent   = 'Edit Pengeluaran';
    document.getElementById('ops-id-field').value            = p.id;
    document.getElementById('ops-tanggal').value             = p.tanggal;
    document.getElementById('ops-kategori').value            = p.jenis || 'ATK';
    document.getElementById('ops-deskripsi').value           = p.keterangan || '';
    document.getElementById('ops-harga-satuan').value        = p.jumlah || 0;
    document.getElementById('ops-jumlah-pcs').value          = 1;
    _updateTotal();
    UI.openModal('modal-operasional');
    ['ops-jumlah-pcs', 'ops-harga-satuan'].forEach(id => {
      const el = document.getElementById(id);
      if (el) el.oninput = _updateTotal;
    });
  }

  async function saveForm() {
    const btn      = document.querySelector('#modal-operasional .btn-primary');
    const id       = document.getElementById('ops-id-field').value;
    const tanggal  = document.getElementById('ops-tanggal').value;
    const kategori = document.getElementById('ops-kategori').value;
    const deskripsi= document.getElementById('ops-deskripsi').value.trim();
    const pcs      = Number(document.getElementById('ops-jumlah-pcs')?.value)   || 0;
    const satuan   = Number(document.getElementById('ops-harga-satuan')?.value) || 0;
    const total    = pcs * satuan;
    const metode   = document.getElementById('ops-metode').value;

    if (!kategori)       { UI.toast('Pilih kategori pengeluaran', 'error'); return; }
    if (!pcs || pcs <= 0){ UI.toast('Jumlah (pcs) harus lebih dari 0', 'error'); return; }
    if (!satuan || satuan <= 0) { UI.toast('Harga satuan harus lebih dari 0', 'error'); return; }
    if (total <= 0)      { UI.toast('Total harus lebih dari 0', 'error'); return; }

    const payload = {
      tanggal:    tanggal || new Date().toISOString().split('T')[0],
      id_murid:   '',
      nama:       'Operasional',
      jenis:      kategori,
      keterangan: deskripsi || kategori,
      jumlah:     total,
      metode,
      arah:       'keluar'
    };

    try {
      if (btn) { btn.disabled = true; btn.innerHTML = '<div class="spinner spinner-sm"></div> Menyimpan...'; }
      const res = id
        ? await API.pembayaran.update({ id, ...payload })
        : await API.pembayaran.add(payload);
      if (res.status === 'OK') {
        UI.toast(id ? 'Pengeluaran diperbarui' : `Pengeluaran ${UI.formatCurrency(total)} berhasil dicatat!`, 'success');
        if (!id) { lastAddedId = res.data?.id || null; lastAction = 'ADD'; }
        UI.closeModal('modal-operasional');
        _resetOpsForm();
        setTimeout(() => load(true), 500);
      } else {
        UI.toast(res.message || 'Gagal menyimpan', 'error');
      }
    } catch(e) { UI.toast('Gagal terhubung ke server', 'error'); }
    finally {
      if (btn) { btn.disabled = false; btn.innerHTML = '<i data-lucide="save"></i> Simpan'; lucide.createIcons({ nodes: [btn] }); }
    }
  }

  async function deleteItem(id, label) {
    const p = allData.find(x => x.id === id);
    if (!confirm(`Hapus pengeluaran "${label}"?`)) return;
    lastDeletedData = p ? JSON.parse(JSON.stringify(p)) : null;
    lastAction      = 'DELETE';
    const btn       = document.querySelector(`button[data-delete-id="${id}"]`);
    const ori       = btn ? btn.innerHTML : '';
    try {
      if (btn) { btn.disabled = true; btn.innerHTML = '<div class="spinner spinner-sm"></div>'; btn.style.width = '40px'; }
      const res = await API.pembayaran.delete(id);
      if (res.status === 'OK') {
        UI.toast(`"${label}" dihapus. Klik Undo untuk membatalkan.`, 'warning');
        allData = allData.filter(x => x.id !== id);
        renderTable(allData.slice(-50).reverse());
        updateSummary();
        const u = document.getElementById('ops-undo-btn');
        if (u) u.disabled = false;
      } else {
        UI.toast(res.message || 'Gagal menghapus', 'error');
        if (btn) { btn.disabled = false; btn.innerHTML = ori; btn.style.width = ''; }
      }
    } catch(e) {
      UI.toast('Gagal terhubung ke server', 'error');
      if (btn) { btn.disabled = false; btn.innerHTML = ori; btn.style.width = ''; }
    }
  }

  async function undo() {
    if (!lastAction || !lastDeletedData) return;
    const u = document.getElementById('ops-undo-btn');
    const r = document.getElementById('ops-redo-btn');
    try {
      if (u) u.disabled = true;
      if (lastAction === 'DELETE') {
        const res = await API.pembayaran.add(lastDeletedData);
        if (res.status === 'OK') {
          UI.toast('Undo: Pengeluaran dikembalikan!', 'success');
          lastRestoredId = res.data?.id || lastDeletedData.id;
          lastAction     = 'UNDO_DELETE';
          if (r) r.disabled = false;
          load(true);
        } else {
          UI.toast(res.message || 'Undo gagal', 'error');
          if (u) u.disabled = false;
        }
      }
    } catch(e) { UI.toast('Gagal Undo', 'error'); if (u) u.disabled = false; }
  }

  async function redo() {
    if (!lastRestoredId || lastAction !== 'UNDO_DELETE') return;
    const r = document.getElementById('ops-redo-btn');
    try {
      if (r) r.disabled = true;
      const res = await API.pembayaran.delete(lastRestoredId);
      if (res.status === 'OK') {
        UI.toast('Redo: Pengeluaran dihapus kembali!', 'success');
        lastAction     = 'DELETE';
        lastRestoredId = null;
        const u        = document.getElementById('ops-undo-btn');
        if (u) u.disabled = false;
        load(true);
      } else {
        UI.toast(res.message || 'Redo gagal', 'error');
        if (r) r.disabled = false;
      }
    } catch(e) { UI.toast('Gagal Redo', 'error'); if (r) r.disabled = false; }
  }

  async function _openBukuPicker() {
    let overlay = document.getElementById('ops-buku-picker');
    if (!overlay) {
      overlay = document.createElement('div');
      overlay.id = 'ops-buku-picker';
      overlay.style.cssText = 'position:fixed;inset:0;z-index:10000;background:rgba(0,0,0,.5);display:flex;align-items:center;justify-content:center;padding:16px;';
      overlay.innerHTML = `
        <div style="background:var(--bg-card);border:1px solid var(--border);border-radius:16px;width:100%;max-width:460px;overflow:hidden;">
          <div style="display:flex;align-items:center;justify-content:space-between;padding:16px 20px;border-bottom:1px solid var(--border);">
            <h3 style="margin:0;font-size:1rem;color:var(--text-primary);">Pilih Modul (Beli dari Pusat)</h3>
            <button onclick="document.getElementById('ops-buku-picker').style.display='none'"
                    style="background:none;border:none;cursor:pointer;color:var(--text-secondary);font-size:1.2rem;">✕</button>
          </div>
          <div id="ops-buku-list" style="padding:16px;max-height:380px;overflow-y:auto;">
            <div class="picker-loading"><div class="spinner spinner-sm" style="margin:0 auto 8px"></div>Memuat modul...</div>
          </div>
        </div>`;
      document.body.appendChild(overlay);
    }
    overlay.style.display = 'flex';
    const listEl = document.getElementById('ops-buku-list');
    try {
      if (!_cachedBukuOps) {
        const res      = await API.buku.getAll();
        _cachedBukuOps = res.data || [];
      }
      if (!_cachedBukuOps.length) { listEl.innerHTML = '<div class="picker-empty">Belum ada modul terdaftar</div>'; return; }
      listEl.innerHTML = `<div style="display:flex;flex-direction:column;gap:8px;">
        ${_cachedBukuOps.map((b, i) => `
          <div class="picker-row" onclick="OperasionalPage._pilihBukuOps(${i})">
            <div style="display:flex;justify-content:space-between;align-items:center;gap:8px;">
              <div>
                <div style="font-weight:600;color:var(--text-primary);">${b.nama_modul}</div>
                <div style="font-size:0.78rem;color:var(--text-secondary);margin-top:2px;">${b.jenjang || '-'} · ${b.program || '-'} · Stok: <strong>${b.stok}</strong></div>
              </div>
              <div style="text-align:right;flex-shrink:0;">
                <div style="font-weight:700;color:var(--primary);">${UI.formatCurrency(b.harga_beli)}</div>
                <div style="font-size:0.72rem;color:var(--text-secondary);">harga beli</div>
              </div>
            </div>
          </div>`).join('')}
      </div>`;
    } catch(e) { listEl.innerHTML = '<div class="picker-error">Gagal memuat data modul</div>'; }
  }

  function _pilihBukuOps(idx) {
    if (!_cachedBukuOps) return;
    const b = _cachedBukuOps[idx];
    if (!b) return;
    const desk = document.getElementById('ops-deskripsi');
    const sat  = document.getElementById('ops-harga-satuan');
    if (desk) desk.value = b.nama_modul;
    if (sat)  sat.value  = Number(b.harga_beli) || 0;
    _updateTotal();
    const overlay = document.getElementById('ops-buku-picker');
    if (overlay) overlay.style.display = 'none';
    UI.toast(`"${b.nama_modul}" dipilih — harga beli ${UI.formatCurrency(b.harga_beli)}`, 'success');
  }

  function deleteSelected()  { return Selection.deleteSelected('ops'); }
  function _getCurrentData() { return allData; }

  window._opsUpdateTotal = _updateTotal;
  return { load, search, openAdd, openEdit, saveForm, deleteItem, updateSummary, undo, redo, deleteSelected, renderTable, _getCurrentData, _pilihBukuOps, _updateTotalPublic: _updateTotal };
})();

window.OperasionalPage = OperasionalPage;