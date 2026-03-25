// ============================================================
// EduHome Mentor Module — js/mentor.js
// ============================================================

const MentorPage = (() => {
  let allData = [];

  async function load() {
    const tbody = document.getElementById('mentor-tbody');
    if (!tbody) return;

    // 1. TAMPILKAN MEMORI DULU (Biar ga delay)
    if (allData && allData.length > 0) {
      renderTable(allData);
      updateSummary(allData);
    } else {
      tbody.innerHTML = '<tr><td colspan="7" class="empty-row"><div class="spinner"></div> Memuat data mentor...</td></tr>';
    }

    try {
      // 2. AMBIL DATA DARI SERVER
      const res = await API.mentor.getAll();
      if (res.status === 'OK') {
        allData = (res.data || []).sort((a, b) => a.id.localeCompare(b.id));
        renderTable(allData);
        updateSummary(allData);
      }
    } catch (e) {
      console.error(e);
      if (allData.length === 0) {
        tbody.innerHTML = '<tr><td colspan="7" class="empty-row">Gagal memuat data.</td></tr>';
      }
    }
  }

  function renderTable(data) {
    const rows = data.map(m => `
      <tr>
        <td><span class="id-badge">${m.id}</span></td>
        <td>
          <div class="name-cell">
            <span class="avatar-initial mentor-avatar">${(m.nama || '?')[0].toUpperCase()}</span>
            <strong>${m.nama}</strong>
          </div>
        </td>
        <td><span class="program-tag">${m.program}</span></td>
        <td>${UI.statusBadge(m.status)}</td>
        <td>${UI.formatCurrency(m.fee_anak)}</td>
        <td>${UI.formatCurrency(m.fee_harian)}</td>
        <td>
          <div class="action-btns">
            <button class="btn-icon btn-warning" onclick="MentorPage.openEdit('${m.id}')" title="Edit"><i data-lucide="pencil"></i></button>
            <button class="btn-icon btn-danger" onclick="MentorPage.deleteMentor('${m.id}','${m.nama}')" title="Hapus"><i data-lucide="trash-2"></i></button>
          </div>
        </td>
      </tr>`);
    UI.renderTable('mentor-tbody', rows, 'Belum ada data mentor');
    lucide.createIcons();
  }

  function updateSummary(data) {
    const totalEl = document.getElementById('mentor-total-count');
    const aktifEl = document.getElementById('mentor-active-count');
    if (totalEl) totalEl.textContent = data.length;
    if (aktifEl) {
      const aktif = data.filter(m => m.status === 'AKTIF').length;
      aktifEl.textContent = aktif;
    }
  }

// 1. Kita buat fungsi khusus buat bersih-bersih (biar rapi)
  function clearForm() {
    ['mentor-nama', 'mentor-program', 'mentor-fee-anak', 'mentor-fee-harian'].forEach(id => {
      const el = document.getElementById(id); 
      if (el) el.value = '';
    });
    
    // Set status default ke AKTIF
    const status = document.getElementById('mentor-status');
    if (status) status.value = 'AKTIF';
  }

  // 2. Fungsi openAdd jadi lebih pendek dan manis
  function openAdd() {
    clearForm(); // Panggil si tukang bersih-bersih
    
    document.getElementById('mentor-modal-title').textContent = 'Tambah Mentor Baru';
    document.getElementById('mentor-id-field').value = ''; // ID dikosongkan karena data baru
    
    UI.openModal('modal-mentor');
  }

async function openEdit(id) {
    // 1. CEK DATA: Kalau memori kosong (allData = []), tarik data dulu
    if (allData.length === 0) {
      UI.toast('Memuat data mentor...', 'info');
      await load(); // Tunggu sampai data ditarik dari Google Sheets
    }

    // 2. CARI BARANGNYA
    const m = allData.find(x => x.id === id);
    if (!m) {
      UI.toast('Data mentor tidak ditemukan', 'error');
      return;
    }

    // 3. ISI FORM (Sesuai kode kamu, ini sudah urutan yang benar)
    document.getElementById('mentor-modal-title').textContent = 'Edit Mentor';
    document.getElementById('mentor-id-field').value   = m.id;
    document.getElementById('mentor-nama').value        = m.nama;
    document.getElementById('mentor-program').value     = m.program;
    document.getElementById('mentor-status').value      = m.status;
    document.getElementById('mentor-fee-anak').value    = m.fee_anak;
    document.getElementById('mentor-fee-harian').value  = m.fee_harian;

    // 4. BARU BUKA PINTUNYA (Modal muncul dengan data sudah terisi)
    UI.openModal('modal-mentor');
  }

async function saveForm() {
    // 1. Ambil tombol modal Mentor (Bukan modal presensi!)
    const btn = document.querySelector('#modal-mentor .btn-primary');
    
    const id         = document.getElementById('mentor-id-field').value;
    const nama       = document.getElementById('mentor-nama').value.trim();
    const program    = document.getElementById('mentor-program').value.trim();
    const status     = document.getElementById('mentor-status').value;
    const fee_anak   = parseFloat(document.getElementById('mentor-fee-anak').value) || 0;
    const fee_harian = parseFloat(document.getElementById('mentor-fee-harian').value) || 0;

    if (!nama) { UI.toast('Nama mentor wajib diisi', 'error'); return; }

    try {
      // 2. EFEK LOADING: Tombol mati & spinner muncul
      if (btn) { 
        btn.disabled = true; 
        btn.innerHTML = '<div class="spinner"></div> Menyimpan...'; 
      }

      const payload = { nama, program, status, fee_anak, fee_harian };
      
      // 3. PANGGIL API MENTOR (Pastikan ini API Mentor ya!)
      const res = id ? await API.mentor.update({ id, ...payload }) : await API.mentor.add(payload);
      
      if (res.status === 'OK') {
        UI.toast(id ? 'Mentor diperbarui' : 'Mentor ditambahkan', 'success');
        UI.closeModal('modal-mentor');
        allData = []; // Kosongin cache biar data fresh ditarik
        load();
      } else {
        UI.toast(res.message || 'Gagal menyimpan', 'error');
      }
    } catch (e) {
      UI.toast('Gagal terhubung ke server', 'error');
    } finally {
      // 4. BALIKIN TOMBOL: Normal lagi mau sukses atau gagal
      if (btn) { 
        btn.disabled = false; 
        btn.innerHTML = 'Simpan'; 
      }
    }
  }

  async function deleteMentor(id, nama) {
    if (!confirm(`Hapus mentor "${nama}"? Data gaji dan jadwal terkait mungkin akan terpengaruh.`)) return;

    try {
      const res = await API.mentor.delete(id);
      
      if (res.status === 'OK') {
        UI.toast('Mentor berhasil dihapus', 'success');
        
        allData = []; 
        load(); 
      } else {
        UI.toast(res.message || 'Gagal menghapus mentor', 'error');
      }
    } catch (e) {
      console.error("Error delete mentor:", e);
      UI.toast('Gagal terhubung ke server', 'error');
    }
  }

  return { load, openAdd, openEdit, saveForm, deleteMentor, updateSummary };
})();

// ============================================================
// Presensi Module — js/presensi.js (embedded)
// ============================================================

const PresensiPage = (() => {
  let allData = [];
  let isFetched = false; // KUNCI: Tambahkan flag untuk menandai data sudah pernah diambil

  async function load() {
    const tbody = document.getElementById('presensi-tbody');
    if (!tbody) return;

    // 1. TAMPILKAN CACHE INSTAN (Jika sudah ada data)
    if (allData && allData.length > 0) {
      renderTable(allData.slice(-50).reverse());
    } 

    // 2. CEK APAKAH SUDAH PERNAH FETCH? 
    if (isFetched && allData.length > 0) {
      return; 
    }

    // 3. SPINNER HANYA MUNCUL JIKA BENAR-BENAR KOSONG DI MEMORI
    // Kalau sudah ada data di memori (Poin 1), jangan kasih spinner lagi biar gak "kedip"
    if (allData.length === 0) {
      tbody.innerHTML = '<tr><td colspan="7" class="empty-row"><div class="spinner"></div> Memuat presensi...</td></tr>';
    }

    try {
      // 4. AMBIL DATA FRESH DI BACKGROUND
      const [presRes, muridRes, mentorRes] = await Promise.all([
        API.presensi.getAll(),
        API.murid.getAll(),
        API.mentor.getAll()
      ]);
      
      if (presRes.status === 'OK') {
        allData = presRes.data || [];
        isFetched = true; 
        
        const muridSel = document.getElementById('presensi-murid');
        if (muridSel && muridSel.options.length <= 1) { 
          populateDropdowns(muridRes.data || [], mentorRes.data || []);
        }
        
        // Render ulang dengan data terbaru dari server
        renderTable(allData.slice(-50).reverse()); 
      }
    } catch (e) {
      console.error("Gagal update presensi:", e);
      // Hanya tampilkan error jika di layar memang tidak ada data sama sekali
      if (allData.length === 0) {
        tbody.innerHTML = '<tr><td colspan="7" class="empty-row">Gagal memuat data.</td></tr>';
      }
    }
  }
  
  function populateDropdowns(murid, mentor) {
    const ms = document.getElementById('presensi-murid');
    if (ms) ms.innerHTML = '<option value="">-- Pilih Murid --</option>' +
      murid.filter(m => m.status === 'AKTIF').map(m => `<option value="${m.id}" data-nama="${m.nama}" data-program="${m.program}">${m.nama} (${m.program})</option>`).join('');

    const mt = document.getElementById('presensi-mentor');
    if (mt) mt.innerHTML = '<option value="">-- Pilih Mentor --</option>' +
      mentor.filter(m => m.status === 'AKTIF').map(m => `<option value="${m.id}" data-nama="${m.nama}">${m.nama}</option>`).join('');
  }

  function renderTable(data) {
    const rows = data.map(p => `
      <tr>
        <td>${UI.formatDate(p.tanggal)}</td>
        <td><strong>${p.nama_murid}</strong></td>
        <td>${p.nama_mentor}</td>
        <td><span class="program-tag">${p.program}</span></td>
        <td>${UI.statusBadge(p.status)}</td>
        <td>${p.catatan || '-'}</td>
        <td>${UI.stars(p.bintang)}</td>
      </tr>`);
    UI.renderTable('presensi-tbody', rows, 'Belum ada data presensi');
  }

async function saveForm() {
    const btn = document.querySelector('#modal-presensi .btn-primary');

    const tanggal   = document.getElementById('presensi-tanggal').value;
    const muridSel  = document.getElementById('presensi-murid');
    const mentorSel = document.getElementById('presensi-mentor');
    const status    = document.getElementById('presensi-status').value;
    const catatan   = document.getElementById('presensi-catatan').value;
    const bintang   = document.getElementById('presensi-bintang').value;

    if (!tanggal || !muridSel.value) { 
      UI.toast('Tanggal dan murid wajib diisi', 'error'); 
      return; 
    }

    const muridOpt  = muridSel.options[muridSel.selectedIndex];
    const mentorOpt = mentorSel.options[mentorSel.selectedIndex];

    const payload = {
      tanggal,
      id_murid:    muridSel.value,
      nama_murid:  muridOpt.dataset.nama,
      id_mentor:   mentorSel.value,
      nama_mentor: mentorOpt ? mentorOpt.dataset.nama : '',
      program:     muridOpt.dataset.program,
      status, catatan, bintang: parseInt(bintang) || 0
    };

    try {
      // --- PERBAIKAN: Gunakan innerHTML untuk Spinner ---
      if (btn) { 
        btn.disabled = true; 
        btn.innerHTML = '<div class="spinner"></div> Menyimpan...'; 
      }

      const res = await API.presensi.add(payload);
      
      if (res.status === 'OK') {
        UI.toast('Presensi berhasil dicatat', 'success');
        UI.closeModal('modal-presensi');
        allData = []; 
        isFetched = false;
        load(); 
      } else {
        UI.toast(res.message || 'Gagal mencatat presensi', 'error');
      }
    } catch (e) {
      UI.toast('Gagal terhubung ke server', 'error');
    } finally {
      if (btn) { 
        btn.disabled = false; 
        btn.innerHTML = 'Simpan Presensi'; // Balikin ke teks semula
      }
    }
  }

  function filterByDate(date) {
    const filtered = date ? allData.filter(p => p.tanggal === date) : allData;
    renderTable(filtered.reverse());
  }

  function openAdd() {
  // Pastikan tanggal selalu ke hari ini pas mau input baru
  const tglInput = document.getElementById('presensi-tanggal');
  if (tglInput) tglInput.value = new Date().toISOString().split('T')[0];

  // Kosongkan pilihan murid & mentor
  const ms = document.getElementById('presensi-murid');
  const mt = document.getElementById('presensi-mentor');
  if (ms) ms.value = '';
  if (mt) mt.value = '';

  // Reset catatan & bintang ke default
  document.getElementById('presensi-catatan').value = '';
  document.getElementById('presensi-bintang').value = '5';

  UI.openModal('modal-presensi');
}

  return { load, saveForm, filterByDate, openAdd };
})();

// ============================================================
// Pembayaran Module
// ============================================================

const PembayaranPage = (() => {
  let allData = [];
  let sppData = [];

// Ganti fungsi load() di PembayaranPage:
async function load() {
  const tbody = document.getElementById('pay-tbody');
  if (!tbody) return;

  if (allData && allData.length > 0) {
    renderTable(allData.slice(-50).reverse());
  }

  try {
    const [payRes, muridRes, sppRes] = await Promise.all([
      API.pembayaran.getAll(),
      API.murid.getAll(),
      API.spp.getAll()
    ]);

    if (payRes.status === 'OK') {
      allData = payRes.data || [];
      sppData = sppRes.data || []; 
      
      // KUNCI: Cek dropdown murid dulu
      const sel = document.getElementById('pay-murid');
      if (sel && sel.options.length <= 1) {
        populateMuridDropdown(muridRes.data || []);
        
        // Set tanggal default pembayaran hanya jika kosong
        const tglInput = document.getElementById('pay-tanggal');
        if (tglInput) tglInput.value = new Date().toISOString().split('T')[0];
      }
      
      renderTable(allData.slice(-50).reverse());
      updateSummary();
    }
  } catch (e) {
    console.error("Gagal update Pembayaran:", e);
  }
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
        <td><strong>${UI.formatCurrency(p.jumlah)}</strong></td>
        <td>${p.metode}</td>
        <td>${p.keterangan || '-'}</td>
      </tr>`);
    UI.renderTable('pay-tbody', rows, 'Belum ada data pembayaran');
  }

  function updateSummary() {
    const today = new Date().toISOString().split('T')[0];
    const todayTotal = allData.filter(p => p.tanggal === today && p.jenis === 'SPP').reduce((s, p) => s + p.jumlah, 0);
    const el = document.getElementById('pay-today-summary');
    if (el) el.textContent = 'Pembayaran hari ini: ' + UI.formatCurrency(todayTotal);
  }


  async function saveForm() {

    const btn = document.querySelector('#modal-pembayaran .btn-primary');
    const muridSel   = document.getElementById('pay-murid');
    const sppSel     = document.getElementById('pay-spp');
    const tanggal    = document.getElementById('pay-tanggal').value;
    const jumlah     = parseFloat(document.getElementById('pay-jumlah').value) || 0;
    const metode     = document.getElementById('pay-metode').value;
    const jenis      = document.getElementById('pay-jenis').value;
    const keterangan = document.getElementById('pay-keterangan').value;

    if (!muridSel.value || jumlah <= 0) { 
      UI.toast('Murid dan jumlah wajib diisi', 'error'); 
      return; 
    }

    const muridOpt = muridSel.options[muridSel.selectedIndex];
    const payload = {
      tanggal:    tanggal || new Date().toISOString().split('T')[0],
      id_murid:   muridSel.value,
      nama:       muridOpt.dataset.nama,
      jenis, jumlah, metode, keterangan,
      spp_id:     sppSel ? sppSel.value : ''
    };

    try {

      if (btn) { 
        btn.disabled = true; 
        btn.textContent = 'Memproses...'; 
      }

      const res = await API.pembayaran.add(payload);
      
      if (res.status === 'OK') {
        UI.toast('Pembayaran berhasil dicatat', 'success');
        UI.closeModal('modal-pembayaran');
        allData = []; // KOSONGIN CACHE BIAR FRESH
        load(); 
      } else {
        UI.toast(res.message || 'Gagal menyimpan', 'error');
      }
    } catch (e) {
      UI.toast('Server Error!', 'error');
    } finally {

      if (btn) { 
        btn.disabled = false; 
        btn.textContent = 'Simpan Pembayaran'; 
      }
    }
  }
  
  return { load, saveForm };
})();

// ============================================================
// SPP Module
// ============================================================

const SPPPage = (() => {
  let allData = [];

async function load() {
    const tbody = document.getElementById('spp-tbody');
    if (!tbody) return;

    if (allData && allData.length > 0) {
      renderTable(allData);
    } else {
      tbody.innerHTML = '<tr><td colspan="12" class="empty-row"><div class="spinner"></div> Memuat data paket SPP...</td></tr>';
    }

    try {
      const [sppRes, muridRes] = await Promise.all([
        API.spp.getAll(), 
        API.murid.getAll()
      ]);

      if (sppRes.status === 'OK') {
        allData = (sppRes.data || []).sort((a, b) => a.id.localeCompare(b.id));
        
        populateMurid(muridRes.data || []);
        renderTable(allData);
      }
    } catch (e) {
      console.error("Gagal update background SPP:", e);
      if (allData.length === 0) {
        tbody.innerHTML = '<tr><td colspan="12" class="empty-row">Gagal memuat data.</td></tr>';
      }
    }

    initLiveCount();
  }

  function initLiveCount() {
    const inputs = ['spp-murid', 'spp-mulai', 'spp-akhir'];
    inputs.forEach(id => {
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

    display.innerHTML = 'Menghitung...';

    try {
      const res = await API.jadwal.getByMurid(id_murid);
      const hariLes = (res.data || []).map(j => j.hari.toLowerCase());

      if (hariLes.length === 0) {
        display.textContent = "Total: 0 Sesi (Jadwal kosong)";
        return;
      }

      const dayMap = { 'minggu':0, 'senin':1, 'selasa':2, 'rabu':3, 'kamis':4, 'jumat':5, 'sabtu':6 };
      const targetDays = hariLes.map(h => dayMap[h]);
      
      let count = 0;
      let cur = new Date(mulai);
      const end = new Date(akhir);
      
      while (cur <= end) {
        if (targetDays.includes(cur.getDay())) count++;
        cur.setDate(cur.getDate() + 1);
      }
      display.textContent = `Total: ${count} Sesi`;
    } catch (e) {
      display.textContent = "Gagal menghitung";
    }
  }

  function populateMurid(murid) {
    const sel = document.getElementById('spp-murid');
    if (!sel) return;
    sel.innerHTML = '<option value="">-- Pilih Murid --</option>' +
      murid.filter(m => m.status === 'AKTIF').map(m =>
        `<option value="${m.id}" data-nama="${m.nama}" data-program="${m.program}">${m.nama}</option>`
      ).join('');
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
            <div class="progress-bar-fill" style="width:${s.total_pertemuan > 0 ? Math.round((s.hadir / s.total_pertemuan) * 100) : 0}%"></div>
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

  async function saveForm() {
    const id = document.getElementById('spp-id-field').value;
    const muridSel = document.getElementById('spp-murid');
    const mulai    = document.getElementById('spp-mulai').value;
    const akhir    = document.getElementById('spp-akhir').value;
    const harga    = parseFloat(document.getElementById('spp-harga').value) || 0;

    if (!muridSel.value || !mulai || !akhir) { 
      UI.toast('Semua field wajib diisi', 'error'); 
      return; 
    }

    // 1. TANGKAP TOMBOLNYA
    const btn = document.querySelector('#modal-spp .btn-primary');
    const opt = muridSel.options[muridSel.selectedIndex];

    const payload = {
      id:            id,
      id_murid:      muridSel.value,
      nama_murid:    opt.dataset.nama,
      program:       opt.dataset.program,
      periode_mulai: mulai,
      periode_akhir: akhir,
      harga:         harga
    };

    try {
      // 2. AKTIFKAN LOADING & SPINNER
      if (btn) {
        btn.disabled = true;
        btn.innerHTML = '<div class="spinner"></div> Memproses...';
      }

      const res = id ? await API.spp.update(payload) : await API.spp.create(payload);
      
      if (res.status === 'OK') {
        const msg = id ? 'Paket SPP diperbarui' : `Berhasil! Total: ${res.data.total_pertemuan} pertemuan.`;
        UI.toast(msg, 'success');
        UI.closeModal('modal-spp');
        allData = []; // Reset cache biar list SPP langsung urut & fresh
        load(); 
      } else {
        UI.toast(res.message || 'Gagal memproses paket', 'error');
      }
    } catch (e) {
      UI.toast('Gagal terhubung ke server', 'error');
    } finally {
      // 3. KEMBALIKAN TOMBOL KE NORMAL
      if (btn) {
        btn.disabled = false;
        btn.innerHTML = 'Simpan Paket';
      }
    }
  }

 function openAdd() {
    document.getElementById('spp-modal-title').textContent = 'Buat Paket SPP';
    
    document.getElementById('spp-id-field').value = ''; 
    
    const muridSel = document.getElementById('spp-murid');
    if (muridSel) {
      muridSel.value = '';
      muridSel.disabled = false; 
    }
    
    document.getElementById('spp-mulai').value = '';
    document.getElementById('spp-akhir').value = '';
    document.getElementById('spp-harga').value = '';
    
    const display = document.getElementById('spp-count-preview');
    if (display) display.textContent = 'Total: 0 Sesi';
    
    UI.openModal('modal-spp');
  }

  async function openEdit(id) {
    // 1. LANGSUNG BUKA MODAL
    document.getElementById('spp-modal-title').textContent = 'Edit Paket SPP';
    UI.openModal('modal-spp');

    const muridSel = document.getElementById('spp-murid');
    
    // 2. MODIFIKASI DI SINI:
    // Jangan cuma cek allData, tapi cek apakah dropdown murid sudah ada isinya atau belum
    if (allData.length === 0 || (muridSel && muridSel.options.length <= 1)) {
      const display = document.getElementById('spp-count-preview');
      if (display) display.innerHTML = '<span class="spinner"></span> Sinkronisasi data...';
      
      // Paksa load ulang untuk mastiin dropdown murid & allData SPP beneran sinkron
      await load(); 
    }

    // 3. CARI DATANYA
    const s = allData.find(x => x.id === id);
    if (!s) {
      UI.toast('Data paket tidak ditemukan', 'error');
      UI.closeModal('modal-spp');
      return;
    }

    // 4. ISI KOTAK-KOTAKNYA
    document.getElementById('spp-id-field').value = s.id; 
    
    if (muridSel) {
      // Kita kasih delay 10ms (sangat sebentar) biar browser sempet ngerender dropdown
      setTimeout(() => {
        muridSel.value = s.id_murid;
        muridSel.disabled = true; 
        
        // PENTING: Panggil hitung sesi SETELAH value murid beneran kepasang
        calculateLiveSessions(); 
      }, 50);
    }
    
    document.getElementById('spp-mulai').value = s.periode_mulai;
    document.getElementById('spp-akhir').value = s.periode_akhir;
    document.getElementById('spp-harga').value = s.harga;
  }

async function deleteSPP(id) {
    if (!confirm(`Hapus paket SPP ${id}? Sisa pertemuan akan hilang.`)) return;
    
    const res = await API.spp.delete(id);
    if (res.status === 'OK') {
      UI.toast('Paket berhasil dihapus', 'success');
      
      allData = [];
      load(); 
    } else {
      UI.toast(res.message || 'Gagal menghapus', 'error');
    }
  }

  return { load, saveForm, openAdd, openEdit, deleteSPP, initLiveCount, calculateLiveSessions };
})();

// ============================================================
// Buku Module
// ============================================================

const BukuPage = (() => {
  let allData = [];

async function load() {
    const tbody = document.getElementById('buku-tbody');
    if (!tbody) return;

    if (allData && allData.length > 0) {
      renderTable(allData);
    } else {
      tbody.innerHTML = '<tr><td colspan="6" class="empty-row"><div class="spinner"></div> Memuat data modul belajar...</td></tr>';
    }

    try {
      const res = await API.buku.getAll();
      if (res.status === 'OK') {
        allData = (res.data || []).sort((a, b) => a.id.localeCompare(b.id));
        renderTable(allData);
      }
    } catch (e) {
      console.error("Gagal update background Buku:", e);
      if (allData.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6" class="empty-row">Gagal memuat data.</td></tr>';
      }
    }
  }

  function renderTable(data) {
    const rows = data.map(b => `
      <tr>
        <td><span class="id-badge">${b.id}</span></td>
        <td><strong>${b.nama}</strong></td>
        <td>${b.jenjang || '-'}</td>
        <td><span class="program-tag">${b.program}</span></td>
        <td>${b.keterangan || '-'}</td>
        <td>
          <div class="action-btns">
            <button class="btn-icon btn-warning" onclick="BukuPage.openEdit('${b.id}')" title="Edit"><i data-lucide="pencil"></i></button>
            <button class="btn-icon btn-danger"  onclick="BukuPage.deleteBuku('${b.id}','${b.nama}')" title="Hapus"><i data-lucide="trash-2"></i></button>
          </div>
        </td>
      </tr>`);
    UI.renderTable('buku-tbody', rows, 'Belum ada modul pembelajaran');
    lucide.createIcons();
  }

  function openAdd() {
    ['buku-id-field','buku-nama','buku-jenjang','buku-program','buku-ket'].forEach(id => {
      const el = document.getElementById(id); if (el) el.value = '';
    });
    document.getElementById('buku-modal-title').textContent = 'Tambah Modul';
    UI.openModal('modal-buku');
  }

  function openEdit(id) {
    const b = allData.find(x => x.id === id);
    if (!b) return;
    document.getElementById('buku-modal-title').textContent = 'Edit Modul';
    document.getElementById('buku-id-field').value  = b.id;
    document.getElementById('buku-nama').value      = b.nama;
    document.getElementById('buku-jenjang').value   = b.jenjang;
    document.getElementById('buku-program').value   = b.program;
    document.getElementById('buku-ket').value       = b.keterangan;
    UI.openModal('modal-buku');
  }

async function saveForm() {
    const btn = document.querySelector('#modal-buku .btn-primary');
    const id = document.getElementById('buku-id-field').value;
    const nama = document.getElementById('buku-nama').value.trim();
    const jenjang = document.getElementById('buku-jenjang').value.trim();
    const program = document.getElementById('buku-program').value.trim();
    const keterangan = document.getElementById('buku-ket').value.trim();

    if (!nama) { UI.toast('Nama modul wajib diisi', 'error'); return; }

    try {
      if (btn) { 
        btn.disabled = true; 
        btn.innerHTML = '<div class="spinner"></div> Menyimpan...'; 
      }

      // INI KUNCINYA: Harus dibungkus jadi satu variabel bernama payload!
      const payload = { nama, jenjang, program, keterangan };

      const res = id ? await API.buku.update({ id, ...payload }) : await API.buku.add(payload);
      
      if (res.status === 'OK') {
        UI.toast(id ? 'Modul diperbarui' : 'Modul ditambahkan', 'success');
        UI.closeModal('modal-buku');
        allData = []; 
        load(); 
      } else {
        UI.toast(res.message || 'Gagal', 'error');
      }
    } catch (e) {
      UI.toast('Terjadi kesalahan sistem', 'error');
    } finally {
      if (btn) { 
        btn.disabled = false; 
        btn.innerHTML = 'Simpan'; 
      }
    }
}

  async function deleteBuku(id, nama) {
    if (!confirm(`Hapus modul "${nama}"?`)) return;
    const res = await API.buku.delete(id);
    if (res.status === 'OK') { UI.toast('Modul dihapus', 'success'); load(); }
    else UI.toast(res.message || 'Gagal', 'error');
  }

  return { load, openAdd, openEdit, saveForm, deleteBuku };
})();

// ============================================================
// Gaji Module
// ============================================================

const GajiPage = (() => {
  let allData = []; // Ini sudah benar, kunci utama memori

  async function load() {
    const tbody = document.getElementById('gaji-tbody');
    if (!tbody) return;

    // 1. TAMPILKAN MEMORI INSTAN (Sama kayak MuridPage)
    // Supaya pas diklik, tabel langsung ada isinya, gak putih polos dulu
    if (allData.length > 0) {
      renderTable(allData);
    } else {
      // Hanya tampilkan spinner kalau benar-benar pertama kali buka (allData masih [])
      tbody.innerHTML = '<tr><td colspan="6" class="empty-row"><div class="spinner"></div> Menghitung...</td></tr>';
    }

    try {
      // 2. TARIK DATA FRESH DI BACKGROUND
      const [gajiRes, mentorRes] = await Promise.all([
        API.gaji.getAll(), 
        API.mentor.getAll()
      ]);

      if (gajiRes.status === 'OK' && mentorRes.status === 'OK') {
        // Simpan ke variabel memori module
        allData = (gajiRes.data || []).reverse(); 
        
        // 3. CEK DROPDOWN: Biar gak kedip pas milih mentor
        const sel = document.getElementById('gaji-mentor');
        if (sel && sel.options.length <= 1) {
          populateMentor(mentorRes.data || []);
          
          const tglInput = document.getElementById('gaji-tgl');
          if (tglInput) tglInput.value = new Date().toISOString().split('T')[0];
        }
        
        // 4. UPDATE TABEL SECARA HALUS
        renderTable(allData);
      }
    } catch (e) {
      console.error(e);
      if (allData.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6" class="empty-row">Gagal memuat.</td></tr>';
      }
    }
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
      </tr>`);
    UI.renderTable('gaji-tbody', rows, 'Belum ada data penggajian');
  }

async function saveForm() {
    const btn = document.querySelector('#modal-gaji .btn-primary');
    const mentorSel  = document.getElementById('gaji-mentor');
    const bulan_gaji = document.getElementById('gaji-bulan').value;
    const tgl_bayar  = document.getElementById('gaji-tgl').value;
    const metode     = document.getElementById('gaji-metode').value;

    if (!mentorSel.value || !bulan_gaji) { 
      UI.toast('Mentor dan bulan gaji wajib diisi', 'error'); 
      return; 
    }

    try {
      if (btn) { btn.disabled = true; btn.textContent = 'Memproses...'; }

      const res = await API.gaji.record({ id_mentor: mentorSel.value, bulan_gaji, tgl_bayar, metode });
      if (res.status === 'OK') {
        const d = res.data.salary_detail;
        UI.toast(`Gaji ${d.nama_mentor} berhasil dicatat`, 'success');
        UI.closeModal('modal-gaji');
        load();
      } else {
        UI.toast(res.message || 'Gagal', 'error');
      }
    } catch (e) {
      UI.toast('Kesalahan koneksi!', 'error'); // <--- BIAR GAK BINGUNG KALAU SINYAL ILANG
    } finally {
      if (btn) { btn.disabled = false; btn.textContent = 'Simpan Penggajian'; }
    }
  }

  return { load, saveForm };
})();

// ============================================================
// Logs Module
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
// Owner Finance Page — read-only financial analytics for OWNER
// ============================================================

const OwnerFinancePage = (() => {
  async function load() {
    try {
      const [statsRes, payRes, sppRes, gajiRes] = await Promise.all([
        API.dashboard.getStats(),
        API.pembayaran.getAll(),
        API.spp.getAll(),
        API.gaji.getAll()
      ]);

      if (statsRes.status === 'OK' && statsRes.data.finance) {
        renderFinanceSummary(statsRes.data.finance, statsRes.data.payments);
      }
      if (payRes.status === 'OK')  renderPaymentHistory(payRes.data || []);
      if (sppRes.status === 'OK')  renderSPPStatus(sppRes.data || []);
      if (gajiRes.status === 'OK') renderGajiHistory(gajiRes.data || []);
    } catch(e) {
      UI.toast('Error memuat laporan keuangan: ' + e.message, 'error');
    }
  }

  function renderFinanceSummary(finance, payments) {
    const ids = {
      'owner-fin-spp':   finance.total_spp,
      'owner-fin-op':    finance.total_operational,
      'owner-fin-sav':   finance.total_savings,
      'owner-fin-rev':   finance.total_revenue,
      'owner-pay-today': payments ? payments.today : 0,
      'owner-pay-month': payments ? payments.this_month : 0
    };
    Object.entries(ids).forEach(([id, val]) => {
      const el = document.getElementById(id);
      if (el) el.textContent = UI.formatCurrency(val);
    });
  }

  function renderPaymentHistory(data) {
    // Only SPP entries for clean owner view
    const sppOnly = data.filter(p => p.jenis === 'SPP').slice(-30).reverse();
    const rows = sppOnly.map(p => `
      <tr>
        <td>${UI.formatDate(p.tanggal)}</td>
        <td><strong>${p.nama}</strong></td>
        <td>${p.periode || '-'}</td>
        <td><strong>${UI.formatCurrency(p.jumlah)}</strong></td>
        <td>${p.metode}</td>
      </tr>`);
    UI.renderTable('owner-pay-tbody', rows, 'Belum ada data pembayaran');
  }

  function renderSPPStatus(data) {
    const unpaid  = data.filter(s => s.status_bayar === 'UNPAID').length;
    const partial = data.filter(s => s.status_bayar === 'PARTIAL').length;
    const paid    = data.filter(s => s.status_bayar === 'PAID').length;
    const els = { 'owner-spp-unpaid': unpaid, 'owner-spp-partial': partial, 'owner-spp-paid': paid };
    Object.entries(els).forEach(([id, val]) => {
      const el = document.getElementById(id); if (el) el.textContent = val;
    });
  }

  function renderGajiHistory(data) {
    const rows = data.slice(-20).reverse().map(g => `
      <tr>
        <td>${UI.formatDate(g.tgl_bayar)}</td>
        <td>${g.bulan_gaji}</td>
        <td><strong>${g.nama_mentor}</strong></td>
        <td><strong class="text-success">${UI.formatCurrency(g.jumlah)}</strong></td>
        <td>${g.metode}</td>
      </tr>`);
    UI.renderTable('owner-gaji-tbody', rows, 'Belum ada data penggajian');
  }

  return { load };
})();

// ============================================================
// Mentor — My Students Page
// ============================================================

const MentorStudentsPage = (() => {
  async function load() {
    const user = API.currentUser();
    const mentorName = user.username || '';

    try {
      const res = await API.mentor.getMyStudents(mentorName);
      if (res.status !== 'OK') { UI.toast('Gagal memuat data murid', 'error'); return; }
      renderStudents(res.data || []);
    } catch(e) {
      UI.toast('Error: ' + e.message, 'error');
    }
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
            <div class="student-card-meta">${s.kelas || '-'} · <span class="program-tag">${s.program}</span></div>
          </div>
          ${UI.statusBadge(s.status)}
        </div>
        <div class="student-card-body">
          <div class="student-stat">
            <i data-lucide="calendar-days"></i>
            <span>${s.schedule.map(sc => sc.hari + ' ' + sc.jam).join(', ') || 'Belum ada jadwal'}</span>
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
// Mentor — Record Attendance Page (scoped to their students)
// ============================================================

const MentorPresensiPage = (() => {
  let myStudents = [];

  async function load() {
    const user = API.currentUser();
    const mentorName = user.username || '';
    const today = new Date().toISOString().split('T')[0];

    try {
      const [studRes, presRes] = await Promise.all([
        API.mentor.getMyStudents(mentorName),
        API.presensi.getAll()
      ]);

      myStudents = studRes.data || [];
      populateStudentDropdown(myStudents);

      // Show today's records by this mentor
      const myToday = (presRes.data || []).filter(p =>
        p.nama_mentor === mentorName && p.tanggal === today
      );
      renderTodayLog(myToday);

      document.getElementById('mentor-presensi-tanggal').value = today;
    } catch(e) {
      UI.toast('Error: ' + e.message, 'error');
    }
  }

  function populateStudentDropdown(students) {
    const sel = document.getElementById('mentor-presensi-murid');
    if (!sel) return;
    sel.innerHTML = '<option value="">-- Pilih Murid --</option>' +
      students.map(s =>
        `<option value="${s.id}" data-nama="${s.nama}" data-program="${s.program}">${s.nama}</option>`
      ).join('');
  }

  function renderTodayLog(records) {
    const rows = records.map(p => `
      <tr>
        <td><strong>${p.nama_murid}</strong></td>
        <td><span class="program-tag">${p.program}</span></td>
        <td>${UI.statusBadge(p.status)}</td>
        <td>${UI.stars(p.bintang)}</td>
        <td>${p.catatan || '-'}</td>
      </tr>`);
    UI.renderTable('mentor-presensi-tbody', rows, 'Belum ada presensi hari ini');
  }

  async function saveForm() {
    const user       = API.currentUser();
    const tanggal    = document.getElementById('mentor-presensi-tanggal').value;
    const muridSel   = document.getElementById('mentor-presensi-murid');
    const status     = document.getElementById('mentor-presensi-status').value;
    const bintang    = document.getElementById('mentor-presensi-bintang').value;
    const catatan    = document.getElementById('mentor-presensi-catatan').value;

    if (!tanggal || !muridSel.value) { UI.toast('Tanggal dan murid wajib diisi', 'error'); return; }

    const opt = muridSel.options[muridSel.selectedIndex];
    const payload = {
      tanggal,
      id_murid:    muridSel.value,
      nama_murid:  opt.dataset.nama,
      id_mentor:   user.mentor_id || '',
      nama_mentor: user.username,
      program:     opt.dataset.program,
      status, catatan, bintang: parseInt(bintang) || 0
    };

    const res = await API.presensi.add(payload);
    if (res.status === 'OK') {
      UI.toast('Presensi berhasil dicatat', 'success');
      UI.closeModal('modal-mentor-presensi');
      load();
    } else {
      UI.toast(res.message || 'Gagal', 'error');
    }
  }

  return { load, saveForm };
})();


