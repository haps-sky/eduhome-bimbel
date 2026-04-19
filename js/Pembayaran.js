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
  let lastRestoredId  = null;

  // Backward compat: infer arah dari jenis untuk data lama
  function inferArah(tr) {
    if (tr.arah) return tr.arah;
    return ['SPP','PENDAFTARAN','BUKU'].includes(tr.jenis) ? 'masuk' : 'keluar';
  }

  async function load(forceRefresh = false) {
    const tbody = document.getElementById('pay-tbody');
    if (!tbody) return;

    if (!forceRefresh && allData.length > 0) {
      renderTable(allData.slice(-50).reverse());
      updateSummary();
    } else {
      tbody.innerHTML = '<tr><td colspan="9" class="empty-row"><div class="spinner spinner-sm"></div> Memuat data pembayaran...</td></tr>';
    }

    try {
      const [payRes, muridRes, sppRes] = await Promise.all([
        API.pembayaran.getAll(), API.murid.getAll(), API.spp.getAll()
      ]);
      if (payRes.status === 'OK') {
        // Filter hanya arah masuk
        allData = (payRes.data || [])
          .map(d => ({ ...d, arah: inferArah(d) }))
          .filter(d => d.arah === 'masuk');
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
      if (!allData.length) tbody.innerHTML = '<tr><td colspan="9" class="empty-row">Gagal memuat data.</td></tr>';
    }
  }

  function search(term) {
    const filtered = allData.filter(p =>
      (p.nama||'').toLowerCase().includes(term.toLowerCase()) ||
      (p.jenis||'').toLowerCase().includes(term.toLowerCase()) ||
      (p.id||'').toLowerCase().includes(term.toLowerCase())
    ).filter(p => p.arah === 'masuk');
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
    const rows = data.map(p => {
      const jenisLabel = p.jenis === 'BUKU'
        ? `Buku (${p.arah === 'masuk' ? 'Masuk' : 'Keluar'})`
        : (p.jenis || '-');
      return `
      <tr>
        <td style="width:32px;">${Selection.checkbox('pay', p.id)}</td>
        <td>${UI.formatDate(p.tanggal)}</td>
        <td><strong>${p.nama}</strong></td>
        <td><span class="program-tag">${jenisLabel}</span></td>
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
      </tr>`;
    });
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
    const masuk = allData.filter(p => p.arah === 'masuk');
    const todayTotal = masuk.filter(p => p.tanggal === today).reduce((s,p) => s+(Number(p.jumlah)||0), 0);
    const totalMasuk = masuk.reduce((s,p) => s+(Number(p.jumlah)||0), 0);
    const el = document.getElementById('pay-today-summary');
    if (el) el.textContent = `Pemasukan hari ini: ${UI.formatCurrency(todayTotal)} | Total: ${UI.formatCurrency(totalMasuk)}`;
  }

  function clearForm() {
    const form = document.getElementById('form-pembayaran');
    if (form) form.reset();
    const idField  = document.getElementById('pay-id-field');
    const sisaInfo = document.getElementById('pay-sisa-info');
    const sppId    = document.getElementById('pay-spp-id-hidden');
    const muridSel = document.getElementById('pay-murid');
    const labelEl  = document.getElementById('pay-item-label');

    if (idField)  idField.value  = '';
    if (sppId)    sppId.value    = '';
    if (sisaInfo) sisaInfo.textContent = '';
    if (muridSel) muridSel.disabled = false;
    if (labelEl)  labelEl.innerHTML = 'Klik untuk memilih item (SPP / Pendaftaran / Buku)';

    const tglInput = document.getElementById('pay-tanggal');
    if (tglInput) tglInput.value = new Date().toISOString().split('T')[0];

    // Reset cache picker agar fresh
    _pickerState.cachedSPP  = null;
    _pickerState.cachedBuku = null;
  }

  async function saveForm() {
    const btn = document.querySelector('#modal-pembayaran .btn-primary');
    const id        = document.getElementById('pay-id-field')?.value;
    const muridSel  = document.getElementById('pay-murid');
    const sppId     = document.getElementById('pay-spp-id-hidden')?.value || '';
    const tanggal   = document.getElementById('pay-tanggal').value;
    const jumlah    = parseFloat(document.getElementById('pay-jumlah').value) || 0;
    const metode    = document.getElementById('pay-metode').value;
    const jenis     = document.getElementById('pay-jenis').value;
    const keterangan = document.getElementById('pay-keterangan').value;

    if (!muridSel.value || jumlah <= 0) { UI.toast('Pilih murid dan masukkan jumlah yang valid','error'); return; }

    const muridOpt = muridSel.options[muridSel.selectedIndex];
    // Ambil qty buku jika transaksi buku
    const bukuQty  = (jenis === 'BUKU' && _pickerState.bukuQty)  ? _pickerState.bukuQty  : 1;
    const bukuNama = (jenis === 'BUKU' && _pickerState.bukuNama) ? _pickerState.bukuNama : keterangan;

    const payload = {
      tanggal:    tanggal || new Date().toISOString().split('T')[0],
      id_murid:   muridSel.value,
      nama:       muridOpt.dataset.nama,
      jenis, jumlah, metode,
      keterangan: jenis === 'BUKU' ? bukuNama : keterangan,
      spp_id:     sppId,
      arah:       'masuk',   // PembayaranPage selalu masuk
      jumlah_buku: bukuQty    // untuk kurangi stok di backend
    };

    try {
      if (btn) { btn.disabled = true; btn.innerHTML = id ? '<div class="spinner spinner-sm"></div> Memperbarui data...' : '<div class="spinner spinner-sm"></div> Memproses pembayaran...'; }

      const res = id ? await API.pembayaran.update({ id, ...payload }) : await API.pembayaran.add(payload);

      if (res.status === 'OK') {
        UI.toast(id ? 'Data pembayaran diperbarui' : 'Pembayaran berhasil dicatat!','success');
        UI.closeModal('modal-pembayaran');
        _pickerState.bukuQty = null; _pickerState.bukuNama = null;
        _pickerState.cachedBuku = null;
        load(true);
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
          lastRestoredId = res.data?.id || lastDeletedData.id;
          lastAction = 'UNDO_DELETE';
          if (redoBtn) redoBtn.disabled = false;
          load(true);
        }
      }
    } catch(e) { UI.toast('Gagal melakukan Undo','error'); if (undoBtn) undoBtn.disabled = false; }
  }

  async function redo() {
    if (!lastRestoredId || lastAction !== 'UNDO_DELETE') return;
    const redoBtn = document.getElementById('pay-redo-btn');
    try {
      if (redoBtn) redoBtn.disabled = true;
      const res = await API.pembayaran.delete(lastRestoredId);
      if (res.status === 'OK') {
        UI.toast('Redo Berhasil: Pembayaran dihapus kembali!','success');
        lastAction = 'DELETE';
        lastRestoredId = null;
        const undoBtn = document.getElementById('pay-undo-btn');
        if (undoBtn) undoBtn.disabled = false;
        load(true);
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
      const res = await API.pembayaran.delete({ all: true });
      if (res.status === 'OK') {
        UI.toast('Seluruh data pembayaran berhasil dihapus!','success');
        load(true);
      } else {
        UI.toast(res.message || 'Gagal menghapus semua data','error');
      }
    } catch(e) { UI.toast('Gagal menghapus semua data','error'); }
  }

  // ── Item Picker 3-Langkah ─────────────────────────────────
  // State picker disimpan di sini agar bisa diakses antar step
  let _pickerState = { step: 'kategori', bukuMode: null, cachedSPP: null, cachedBuku: null };

  function openItemPicker() {
    _pickerState.step = 'kategori';
    _showPickerStep();
    UI.openModal('modal-item-picker');
  }

  function itemPickerBack() {
    if (_pickerState.step === 'buku-qty')  _pickerState.step = 'buku-list';
    else if (_pickerState.step === 'buku-list') _pickerState.step = 'kategori';
    else if (_pickerState.step === 'spp-list') _pickerState.step = 'kategori';
    else if (_pickerState.step === 'daftar')   _pickerState.step = 'kategori';
    else _pickerState.step = 'kategori';
    _showPickerStep();
  }

  function _showPickerStep() {
    const body     = document.getElementById('item-picker-body');
    const title    = document.getElementById('item-picker-title');
    const backBtn  = document.getElementById('item-picker-back');
    if (!body) return;

    const isRoot = _pickerState.step === 'kategori';
    if (backBtn) backBtn.style.display = isRoot ? 'none' : 'inline-flex';

    switch (_pickerState.step) {
      case 'kategori':  return _renderKategori(body, title);
      case 'spp-list':  return _renderSPPList(body, title);
      case 'daftar':    return _renderDaftar(body, title);
      case 'buku-mode': return _renderBukuMode(body, title);
      case 'buku-list': return _renderBukuList(body, title);
      case 'buku-qty':  return _renderBukuQty(body, title);
    }
  }

  // STEP 1 — Pilih Kategori
  function _renderKategori(body, title) {
    title.textContent = 'Pilih Kategori';
    const kategori = [
      { key:'spp',    icon:'calendar-check', label:'SPP',          sub:'Tagihan paket belajar belum lunas', color:'var(--primary)',  bg:'var(--primary-dim)' },
      { key:'daftar', icon:'user-plus',      label:'Pendaftaran',  sub:'Biaya pendaftaran murid baru',      color:'var(--success)',  bg:'var(--success-dim)' },
      { key:'buku',   icon:'shopping-bag',   label:'Buku (Jual)',  sub:'Jual modul ke murid — stok berkurang', color:'var(--warning)', bg:'var(--warning-dim)' },
    ];
    body.innerHTML = `
      <div style="display:flex;flex-direction:column;gap:10px;padding:4px 0;">
        ${kategori.map(k => `
          <div class="picker-item" onclick="PembayaranPage._pilihKategori('${k.key}')">
            <div class="picker-icon" style="background:${k.bg};">
              <i data-lucide="${k.icon}" style="width:20px;height:20px;color:${k.color}"></i>
            </div>
            <div style="flex:1;">
              <div class="picker-item-title">${k.label}</div>
              <div class="picker-item-sub">${k.sub}</div>
            </div>
            <i data-lucide="chevron-right" style="width:16px;height:16px;color:var(--text-dim)"></i>
          </div>`).join('')}
      </div>`;
    lucide.createIcons({ nodes: [body] });
  }

  function _pilihKategori(key) {
    _pickerState.step = key === 'buku' ? 'buku-mode' : key === 'spp' ? 'spp-list' : 'daftar';
    _showPickerStep();
  }

  // STEP 2a — SPP: list tagihan belum lunas
  async function _renderSPPList(body, title) {
    title.textContent = 'Pilih Tagihan SPP';
    body.innerHTML = `<div class="picker-loading">
      <div class="spinner spinner-sm" style="margin:0 auto 8px"></div> Memuat tagihan...</div>`;

    try {
      if (!_pickerState.cachedSPP) {
        const res = await API.spp.getAll();
        _pickerState.cachedSPP = (res.data || []).filter(s =>
          s.status_bayar !== 'PAID' && s.status === 'AKTIF'
        );
      }
      const list = _pickerState.cachedSPP;

      if (!list.length) {
        body.innerHTML = `<div class="picker-empty">
          <i data-lucide="check-circle" style="width:32px;height:32px;margin-bottom:8px;color:var(--success)"></i>
          <div>Semua tagihan SPP sudah lunas 🎉</div></div>`;
        lucide.createIcons({ nodes:[body] });
        return;
      }

      body.innerHTML = `
        <div style="font-size:0.78rem;color:var(--text-secondary);margin-bottom:10px;">
          ${list.length} tagihan belum lunas</div>
        <div style="display:flex;flex-direction:column;gap:8px;max-height:360px;overflow-y:auto;">
          ${list.map((s, i) => {
            const sisa = Number(s.harga) - Number(s.terbayar || 0);
            const pct  = s.harga > 0 ? Math.round((s.terbayar/s.harga)*100) : 0;
            return `
            <div class="picker-row" onclick="PembayaranPage._pilihSPP(${i})">
              <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:8px;">
                <div>
                  <div style="font-weight:600;color:var(--text-primary);">${s.nama_murid}</div>
                  <div style="font-size:0.78rem;color:var(--text-secondary);margin-top:2px;">
                    ${s.program} · ${s.periode_mulai} s/d ${s.periode_akhir}
                  </div>
                </div>
                <div style="text-align:right;flex-shrink:0;">
                  <div style="font-weight:700;color:var(--primary);">${UI.formatCurrency(sisa)}</div>
                  <div style="font-size:0.72rem;color:var(--text-secondary);">sisa tagihan</div>
                </div>
              </div>
              <div class="picker-progress-track">
                <div class="picker-progress-fill" style="width:${pct}%"></div>
              </div>
              <div style="font-size:0.72rem;color:var(--text-secondary);margin-top:3px;">
                Terbayar ${pct}% · Total ${UI.formatCurrency(s.harga)}
              </div>
            </div>`;
          }).join('')}
        </div>`;
    } catch(e) {
      body.innerHTML = `<div class="picker-error">Gagal memuat data SPP</div>`;
    }
  }

  function _pilihSPP(idx) {
    const s    = _pickerState.cachedSPP[idx];
    if (!s) return;
    const sisa = Number(s.harga) - Number(s.terbayar || 0);

    // Auto-fill form pembayaran
    _autoFill({
      jenis:      'SPP',
      jumlah:     sisa,
      keterangan: `SPP ${s.program} ${s.periode_mulai} s/d ${s.periode_akhir}`,
      spp_id:     s.id,
      label:      `SPP · ${s.nama_murid} · sisa ${UI.formatCurrency(sisa)}`
    });
    UI.closeModal('modal-item-picker');
  }

  // STEP 2b — Pendaftaran: input nominal manual
  function _renderDaftar(body, title) {
    title.textContent = 'Biaya Pendaftaran';
    body.innerHTML = `
      <div style="padding:8px 0;">
        <p style="font-size:0.85rem;color:var(--text-secondary);margin-bottom:16px;">
          Masukkan nominal biaya pendaftaran murid baru.
        </p>
        <div class="form-group">
          <label>Nominal (Rp) *</label>
          <input type="number" id="picker-daftar-nominal"
                 placeholder="Contoh: 150000" min="0"
                 style="width:100%;padding:10px 12px;
                        border:1px solid var(--border);border-radius:8px;
                        font-size:0.9rem;background:var(--bg-surface);
                        color:var(--text-primary);outline:none;">
        </div>
        <div class="form-group" style="margin-top:12px;">
          <label>Keterangan (opsional)</label>
          <input type="text" id="picker-daftar-ket"
                 placeholder="Contoh: Pendaftaran semester ganjil"
                 style="width:100%;padding:10px 12px;
                        border:1px solid var(--border);border-radius:8px;
                        font-size:0.9rem;background:var(--bg-surface);
                        color:var(--text-primary);outline:none;">
        </div>
        <button class="picker-btn-confirm" onclick="PembayaranPage._pilihDaftar()">
          <i data-lucide="check"></i> Gunakan Nominal Ini
        </button>
      </div>`;
    lucide.createIcons({ nodes:[body] });
    setTimeout(() => document.getElementById('picker-daftar-nominal')?.focus(), 100);
  }

  function _pilihDaftar() {
    const nominal = parseFloat(document.getElementById('picker-daftar-nominal')?.value) || 0;
    const ket     = document.getElementById('picker-daftar-ket')?.value || 'Biaya Pendaftaran';
    if (nominal <= 0) { UI.toast('Masukkan nominal yang valid','error'); return; }
    _autoFill({
      jenis:      'PENDAFTARAN',
      jumlah:     nominal,
      keterangan: ket,
      label:      `Pendaftaran · ${UI.formatCurrency(nominal)}`
    });
    UI.closeModal('modal-item-picker');
  }

  // STEP 2c — Buku: langsung ke list jual (Beli pindah ke Pengeluaran)
  function _renderBukuMode(body, title) {
    _pickerState.bukuMode = 'jual';
    _pickerState.step = 'buku-list';
    _showPickerStep();
  }

  async function _pilihBukuMode(mode) {
    _pickerState.bukuMode = mode;
    _pickerState.step = 'buku-list';
    _showPickerStep();
  }

  // STEP 3 — Buku: list buku
  async function _renderBukuList(body, title) {
    const mode = _pickerState.bukuMode;
    title.textContent = mode === 'jual' ? 'Pilih Modul (Jual)' : 'Pilih Modul (Beli)';
    body.innerHTML = `<div class="picker-loading">
      <div class="spinner spinner-sm" style="margin:0 auto 8px"></div> Memuat modul...</div>`;

    try {
      if (!_pickerState.cachedBuku) {
        const res = await API.buku.getAll();
        _pickerState.cachedBuku = res.data || [];
      }
      const list = _pickerState.cachedBuku.filter(b =>
        mode === 'jual' ? Number(b.stok) > 0 : true
      );

      if (!list.length) {
        body.innerHTML = `<div class="picker-empty">
          ${mode === 'jual' ? 'Semua stok habis' : 'Belum ada modul terdaftar'}</div>`;
        return;
      }

      body.innerHTML = `
        <div style="display:flex;flex-direction:column;gap:8px;max-height:380px;overflow-y:auto;">
          ${list.map((b, i) => {
            const harga  = mode === 'jual' ? Number(b.harga_jual) : Number(b.harga_beli);
            const untung = Number(b.harga_jual) - Number(b.harga_beli);
            const warna  = mode === 'jual' ? 'var(--warning)' : 'var(--primary)';
            return `
            <div class="picker-row" onclick="PembayaranPage._pilihBuku(${i})">
              <div style="display:flex;justify-content:space-between;align-items:center;gap:8px;">
                <div>
                  <div style="font-weight:600;color:var(--text-primary);">${b.nama_modul}</div>
                  <div style="font-size:0.78rem;color:var(--text-secondary);margin-top:2px;">
                    ${b.jenjang||'-'} · ${b.program||'-'} · Stok: <strong>${b.stok}</strong>
                  </div>
                </div>
                <div style="text-align:right;flex-shrink:0;">
                  <div style="font-weight:700;color:${warna};">${UI.formatCurrency(harga)}</div>
                  ${mode==='jual' ? `<div style="font-size:0.72rem;color:var(--success);">+${UI.formatCurrency(untung)} untung</div>` : ''}
                </div>
              </div>
            </div>`;
          }).join('')}
        </div>`;
    } catch(e) {
      body.innerHTML = `<div class="picker-error">Gagal memuat data modul</div>`;
    }
  }

  function _pilihBuku(idx) {
    const b = _pickerState.cachedBuku.filter(b =>
      _pickerState.bukuMode === 'jual' ? Number(b.stok) > 0 : true
    )[idx];
    if (!b) return;
    _pickerState.selectedBuku = b;
    _pickerState.step = 'buku-qty';
    _showPickerStep();
  }

  // STEP 4 — Input jumlah buku (khusus JUAL)
  function _renderBukuQty(body, title) {
    const b     = _pickerState.selectedBuku;
    if (!b) return;
    const harga = Number(b.harga_jual);
    title.textContent = 'Jumlah Buku';
    body.innerHTML = `
      <div style="padding:4px 0;">
        <div style="background:var(--bg-hover);border-radius:10px;padding:12px 14px;margin-bottom:16px;">
          <div style="font-weight:600;color:var(--text-primary);">${b.nama_modul}</div>
          <div style="font-size:0.8rem;color:var(--text-secondary);margin-top:2px;">
            ${b.jenjang||'-'} · ${b.program||'-'} · Stok tersedia: <strong style="color:var(--success)">${b.stok}</strong>
          </div>
          <div style="font-weight:700;color:var(--warning);margin-top:4px;">${UI.formatCurrency(harga)} / buku</div>
        </div>
        <div class="form-group">
          <label>Jumlah Buku *</label>
          <input type="number" id="buku-qty-input" min="1" max="${b.stok}" value="1"
                 style="width:100%;padding:10px 12px;border:1px solid var(--border);border-radius:8px;
                        font-size:1rem;background:var(--bg-surface);color:var(--text-primary);"
                 oninput="PembayaranPage._updateBukuQtyTotal()">
        </div>
        <div style="background:var(--warning-dim);border:1px solid var(--warning);border-radius:10px;
                    padding:10px 14px;display:flex;justify-content:space-between;align-items:center;margin-top:4px;">
          <span style="font-size:0.85rem;color:var(--text-secondary);">Total</span>
          <span id="buku-qty-total" style="font-weight:700;font-size:1.05rem;color:var(--warning);">${UI.formatCurrency(harga)}</span>
        </div>
        <button class="picker-btn-confirm" style="background:var(--warning);margin-top:14px;"
                onclick="PembayaranPage._konfirmasiBuku()">
          <i data-lucide="check"></i> Konfirmasi
        </button>
      </div>`;
    lucide.createIcons({ nodes:[body] });
    setTimeout(() => document.getElementById('buku-qty-input')?.focus(), 100);
  }

  function _updateBukuQtyTotal() {
    const b   = _pickerState.selectedBuku;
    if (!b) return;
    const qty = parseInt(document.getElementById('buku-qty-input')?.value) || 1;
    const total = qty * Number(b.harga_jual);
    const el = document.getElementById('buku-qty-total');
    if (el) el.textContent = UI.formatCurrency(total);
  }

  function _konfirmasiBuku() {
    const b   = _pickerState.selectedBuku;
    if (!b) return;
    const qty = parseInt(document.getElementById('buku-qty-input')?.value) || 1;
    if (qty <= 0) { UI.toast('Jumlah harus lebih dari 0','error'); return; }
    if (qty > Number(b.stok)) { UI.toast(`Stok hanya ${b.stok}`, 'error'); return; }
    const total = qty * Number(b.harga_jual);
    _autoFill({
      jenis:      'BUKU',
      jumlah:     total,
      keterangan: `${b.nama_modul} (${qty} buku)`,
      label:      `Jual ${qty} Buku · ${b.nama_modul} · ${UI.formatCurrency(total)}`
    });
    // Simpan qty untuk dikirim ke backend
    _pickerState.bukuQty = qty;
    _pickerState.bukuNama = b.nama_modul;
    UI.closeModal('modal-item-picker');
  }

  // Auto-fill form pembayaran dari item picker
  function _autoFill({ jenis, jumlah, keterangan, spp_id, label }) {
    const jenisEl  = document.getElementById('pay-jenis');
    const jumlahEl = document.getElementById('pay-jumlah');
    const ketEl    = document.getElementById('pay-keterangan');
    const sppIdEl  = document.getElementById('pay-spp-id-hidden');
    const labelEl  = document.getElementById('pay-item-label');
    const sisaEl   = document.getElementById('pay-sisa-info');

    if (jenisEl)  { jenisEl.value  = jenis;      }
    if (jumlahEl) { jumlahEl.value = jumlah;     }
    if (ketEl)    { ketEl.value    = keterangan; }
    if (sppIdEl)  { sppIdEl.value  = spp_id || ''; }

    // Update tampilan tombol item di form utama
    if (labelEl) {
      labelEl.innerHTML = `<span class="program-tag" style="font-size:0.75rem;">${jenis}</span>
        <span style="margin-left:6px;font-weight:500;">${label}</span>`;
    }
    if (sisaEl && jenis === 'SPP') {
      sisaEl.textContent = `Sisa tagihan: ${UI.formatCurrency(jumlah)}`;
    } else if (sisaEl) {
      sisaEl.textContent = '';
    }

    // Pastikan _pickerState.cachedSPP & cachedBuku di-reset agar fresh next time
    _pickerState.cachedSPP  = null;
    _pickerState.cachedBuku = null;
  }

  function deleteSelected() { return Selection.deleteSelected('pay'); }
  function _getCurrentData() { return allData; }
  return { load, search, saveForm, openAdd, openEdit, deletePembayaran, updateSummary, undo, redo, deleteAll, openItemPicker, itemPickerBack, _pilihKategori, _pilihSPP, _pilihDaftar, _pilihBukuMode, _pilihBuku, deleteSelected, renderTable, _getCurrentData, _updateBukuQtyTotal, _konfirmasiBuku };
})();
