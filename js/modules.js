// ============================================================
// EduHome Mentor Module — js/mentor.js
// ============================================================

const MentorPage = (() => {
  let allData = [];
  let isFetched = false; // <--- Kunci utama biar ga loading terus

  async function load() {
    const tbody = document.getElementById('mentor-tbody');
    if (!tbody) return;

    // 1. CEK KUNCI: Kalau sudah pernah ditarik, langsung tampilkan (Instan!)
    if (isFetched) {
      renderTable(allData);
      updateSummary(allData);
      return; // STOP! Jangan munculin spinner lagi
    }

    // 2. TAMPILAN AWAL: Spinner cuma muncul sekali seumur hidup (sebelum refresh)
    tbody.innerHTML = '<tr><td colspan="7" class="empty-row"><div class="spinner spinner-sm"></div> Memuat data mentor...</td></tr>';

    try {
      // 3. TARIK DATA FRESH
      const res = await API.mentor.getAll();
      
      if (res.status === 'OK') {
        allData = (res.data || []).sort((a, b) => a.id.localeCompare(b.id));
        isFetched = true; // KUNCI PINTU: Berhasil ditarik
        
        renderTable(allData);
        updateSummary(allData);
      }
    } catch (e) {
      console.error("Error Load Mentor:", e);
      // Kalau gagal total, kasih tau user
      tbody.innerHTML = '<tr><td colspan="7" class="empty-row">Gagal memuat data mentor.</td></tr>';
    }
  }

function renderTable(data) {
  const rows = data.map(m => {
    // Tentukan warna & label berdasarkan Jenis Kelamin
    const color = m.jk === 'L' ? '#689bee' : '#e76fab';
    const jkText = m.jk === 'L' ? '♂ Laki-laki' : '♀ Perempuan';

    return `
      <tr>
        <td><span class="id-badge">${m.id}</span></td>
        <td>
          <div class="name-cell">
            <!-- Avatar dengan background tipis sesuai warna gender -->
            <span class="avatar-initial mentor-avatar" style="background: ${color}20; color: ${color};">
              ${(m.nama || '?')[0].toUpperCase()}
            </span>
            <div>
              <strong>${m.nama}</strong>
              <!-- Sub-text Jenis Kelamin di bawah nama -->
              <small style="display: block; color: ${color}; font-weight: 500; margin-top: 2px;">
                ${jkText}
              </small>
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
            <button class="btn-icon btn-warning" onclick="MentorPage.openEdit('${m.id}')" title="Edit">
              <i data-lucide="pencil"></i>
            </button>
            <button class="btn-icon btn-danger" onclick="MentorPage.deleteMentor('${m.id}','${m.nama}')" title="Hapus">
              <i data-lucide="trash-2"></i>
            </button>
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
    if (aktifEl) {
      const aktif = data.filter(m => m.status === 'AKTIF').length;
      aktifEl.textContent = aktif;
    }
  }

// 1. Kita buat fungsi khusus buat bersih-bersih (biar rapi)
  function clearForm() {
    ['mentor-nama', 'mentor-fee-anak', 'mentor-fee-harian'].forEach(id => {
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
    if (allData.length === 0) {
      UI.toast('Memuat data mentor...', 'info');
      await load(); 
    }

    const m = allData.find(x => x.id === id);
    if (!m) {
      UI.toast('Data mentor tidak ditemukan', 'error');
      return;
    }

    document.getElementById('mentor-modal-title').textContent = 'Edit Mentor';
    document.getElementById('mentor-id-field').value   = m.id;
    document.getElementById('mentor-nama').value        = m.nama;
    document.getElementById('mentor-jk').value          = m.jk || '';
    document.getElementById('mentor-kontak').value      = m.kontak || '';
    document.getElementById('mentor-program').value     = m.program || '';
    document.getElementById('mentor-status').value      = m.status;
    document.getElementById('mentor-fee-anak').value    = m.fee_anak;
    document.getElementById('mentor-fee-harian').value  = m.fee_harian;

    UI.openModal('modal-mentor');
}

async function saveForm() {
    // 1. Ambil data dari semua input field Mentor (Pastikan ID-nya sesuai dengan HTML kamu)
    const id         = document.getElementById('mentor-id-field').value;
    const nama       = document.getElementById('mentor-nama').value.trim();
    const jk         = document.getElementById('mentor-jk').value;
    const program    = document.getElementById('mentor-program').value.trim();
    const kontak     = document.getElementById('mentor-kontak').value.trim(); // Kolom H di Sheets
    const status     = document.getElementById('mentor-status').value;
    const fee_anak   = document.getElementById('mentor-fee-anak').value;
    const fee_harian = document.getElementById('mentor-fee-harian').value;

    // 2. Validasi Ketat: Semua wajib diisi
    if (!nama)    return UI.toast('Nama mentor wajib diisi!', 'error');
    if (!jk)      return UI.toast('Jenis kelamin wajib dipilih!', 'error');
    if (!program) return UI.toast('Program wajib diisi!', 'error');
    if (!kontak)  return UI.toast('Kontak WA wajib diisi!', 'error');
    if (fee_anak === "" || fee_harian === "") {
        return UI.toast('Fee wajib diisi (boleh 0)!', 'error');
    }

    // 3. Siapkan Payload (Sesuai dengan handleAddMentor di Code.gs)
    const payload = { 
        nama,
        jk,
        program,
        kontak,
        status,
        fee_anak: Number(fee_anak), 
        fee_harian: Number(fee_harian)
    };

    const btn = document.getElementById('mentor-save-btn');

    try {
        if (btn) { 
            btn.disabled = true; 
            btn.innerHTML = id ? 
                '<div class="spinner spinner-sm"></div> Mengedit...' : 
                '<div class="spinner spinner-sm"></div> Menambahkan...'; 
        }

        // Panggil API Mentor
        const res = id ? 
            await API.mentor.update({ id, ...payload }) : 
            await API.mentor.add(payload);

        if (res.status === 'OK') {
            const pesanSukses = id ? 'Data mentor diperbarui' : 'Mentor berhasil ditambahkan';
            UI.toast(pesanSukses, 'success');
            
            UI.closeModal('modal-mentor');
            
            // 4. RESET CACHE & REFRESH TABEL (Gunakan jeda 800ms agar DB sempat sync)
            allData = []; 
            isFetched = false; 
            setTimeout(() => {
                load(true); // Pastikan fungsi load() mendukung parameter force refresh
            }, 800);

        } else {
            UI.toast(res.message || 'Gagal menyimpan data', 'error');
        }
    } catch(e) {
        console.error("Error Save Mentor:", e);
        UI.toast('Terjadi kesalahan koneksi', 'error');
    } finally {
        if (btn) { 
            btn.disabled = false; 
            btn.innerHTML = '<i data-lucide="save"></i> Simpan'; 
            lucide.createIcons({ nodes: [btn] }); // Re-render icon Lucide
        }
    }
}

  async function deleteMentor(id, nama) {
    // 1. Konfirmasi (Penting agar tidak sengaja klik)
    if (!confirm(`Hapus mentor "${nama}"? Semua data terkait mentor ini akan dihapus.`)) return;

    // 2. Cari tombol tong sampah yang diklik berdasarkan ID mentor
    const btn = document.querySelector(`button[onclick*="deleteMentor('${id}'"]`);
    const originalContent = btn ? btn.innerHTML : ''; 

    try {
        if (btn) {
            btn.disabled = true;
            btn.innerHTML = '<div class="spinner spinner-sm"></div> Menghapus...';
            btn.style.width = 'auto'; 
            btn.style.padding = '0 12px';
        }

        // 3. Panggil API Hapus Mentor
        const res = await API.mentor.delete(id);

        if (res.status === 'OK') {
            UI.toast(`Mentor "${nama}" berhasil dihapus`, 'success');
            
            // --- RESET MEMORI & REFRESH ---
            allData = [];
            isFetched = false;
            load(); 
        } else {
            UI.toast(res.message || 'Gagal menghapus mentor', 'error');
            // Kembalikan tombol jika gagal dari server
            if (btn) {
                btn.disabled = false;
                btn.innerHTML = originalContent;
                btn.style.padding = ''; // Balikin padding asli
            }
        }
    } catch (e) {
        console.error("Error Delete Mentor:", e);
        UI.toast('Gagal terhubung ke server', 'error');
        // Kembalikan tombol jika koneksi putus
        if (btn) {
            btn.disabled = false;
            btn.innerHTML = originalContent;
            btn.style.padding = '';
        }
    }
}

  return { load, openAdd, openEdit, saveForm, deleteMentor, updateSummary };
})();

// ============================================================
// Presensi Module — js/presensi.js (embedded)
// ============================================================

const PresensiPage = (() => {
  let allData = []; 
  let isFetched = false;

  async function load() {
    const tbody = document.getElementById('presensi-tbody');
    if (!tbody) return;

    // 1. LOGIKA ANTI-LOADING TERUS
    if (isFetched) {
      // Jika sudah pernah narik data, LANGSUNG render (meskipun datanya kosong [])
      renderTable(allData.slice(-50).reverse());
      return; // STOP! Gak perlu nampilin spinner lagi
    }

    // 2. TAMPILAN AWAL (Hanya jalan sekali seumur hidup aplikasi sebelum di-refresh)
    tbody.innerHTML = '<tr><td colspan="7" class="empty-row"><div class="spinner spinner-sm"></div> Memuat data presensi...</td></tr>';

    try {
      const [presRes, muridRes, mentorRes] = await Promise.all([
        API.presensi.getAll(), 
        API.murid.getAll(), 
        API.mentor.getAll()
      ]);
      
      if (presRes.status === 'OK') {
        allData = presRes.data || [];
        isFetched = true;
        
        const ms = document.getElementById('presensi-murid');
        if (ms && ms.options.length <= 1) { 
          populateDropdowns(muridRes.data || [], mentorRes.data || []);
        }
        
        renderTable(allData.slice(-50).reverse()); 
      }
    } catch (e) { 
      console.error(e);
      tbody.innerHTML = '<tr><td colspan="7" class="empty-row">Gagal memuat.</td></tr>';
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
    // 1. Ambil elemen tombol menggunakan querySelector (lebih aman jika ID belum terpasang)
    const btn = document.querySelector('#modal-presensi .btn-primary');

    // 2. Ambil data dari input field
    const id        = document.getElementById('presensi-id-field')?.value; // Untuk jaga-jaga jika ada fitur Edit
    const tanggal   = document.getElementById('presensi-tanggal').value;
    const muridSel  = document.getElementById('presensi-murid');
    const mentorSel = document.getElementById('presensi-mentor');
    const status    = document.getElementById('presensi-status').value;
    const catatan   = document.getElementById('presensi-catatan').value;
    const bintang   = document.getElementById('presensi-bintang').value;

    // 3. Validasi
    if (!tanggal || !muridSel.value) { 
      UI.toast('Tanggal dan murid wajib diisi', 'error'); 
      return; 
    }

    const muridOpt  = muridSel.options[muridSel.selectedIndex];
    const mentorOpt = mentorSel.options[mentorSel.selectedIndex];

    // 4. Siapkan Payload
    const payload = {
      tanggal,
      id_murid:    muridSel.value,
      nama_murid:  muridOpt.dataset.nama,
      id_mentor:   mentorSel.value,
      nama_mentor: mentorOpt ? mentorOpt.dataset.nama : '',
      program:     muridOpt.dataset.program,
      status, 
      catatan, 
      bintang: parseInt(bintang) || 0
    };

    try {
      if (btn) { 
        btn.disabled = true; 
        // Efek loading dengan spinner-sm yang imut
        btn.innerHTML = id ? 
            '<div class="spinner spinner-sm"></div> Memperbarui presensi...' : 
            '<div class="spinner spinner-sm"></div> Mencatat presensi...'; 
      }

      // Gunakan ternary: Jika ada ID berarti update, jika tidak berarti add
      const res = id ? 
          await API.presensi.update({ id, ...payload }) : 
          await API.presensi.add(payload);
      
      if (res.status === 'OK') {
        const pesanSukses = id ? 'Presensi berhasil diperbarui' : 'Presensi berhasil dicatat! ⭐';
        UI.toast(pesanSukses, 'success');
        
        UI.closeModal('modal-presensi');
        
        // RESET CACHE & REFRESH TABEL
        allData = [];
        isFetched = false;
        load(); 
      } else {
        UI.toast(res.message || 'Gagal menyimpan presensi', 'error');
      }
    } catch (e) {
      console.error("Error Presensi:", e);
      UI.toast('Gagal terhubung ke server', 'error');
    } finally {
      if (btn) { 
        btn.disabled = false; 
        btn.innerHTML = 'Simpan Presensi'; // Balikin teks tombol
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
  let isFetched = false;
  let sppData = []; // Tambahkan ini kalau kamu butuh data SPP untuk dropdown/validasi

  async function load() {
    const tbody = document.getElementById('pay-tbody');
    if (!tbody) return;

    // 1. KUNCI ANTI-LOADING (Sesuai Template Sakti)
    if (isFetched) {
      renderTable(allData.slice(-50).reverse());
      return; 
    }

    // 2. SPINNER AWAL
    tbody.innerHTML = '<tr><td colspan="7" class="empty-row"><div class="spinner spinner-sm"></div> Memuat data pembayaran...</td></tr>';

    try {
      // 3. TARIK SEMUA DATA (Murid & SPP biasanya buat dropdown di modal)
      const [payRes, muridRes, sppRes] = await Promise.all([
        API.pembayaran.getAll(), 
        API.murid.getAll(), 
        API.spp.getAll()
      ]);

      if (payRes.status === 'OK') {
        allData = payRes.data || [];
        sppData = sppRes.data || []; // Simpan data SPP jika perlu
        isFetched = true;

        // 4. ISI DROPDOWN MURID (Biar kalau catat bayar, nama muridnya muncul)
        const sel = document.getElementById('pay-murid');
        if (sel && sel.options.length <= 1) {
          populateMuridDropdown(muridRes.data || []);
        }

        renderTable(allData.slice(-50).reverse());
        // updateSummary(); // Aktifkan jika ada fungsi rekap harian
      }

    } catch (e) {
      console.error("Error Load Pembayaran:", e);
      tbody.innerHTML = '<tr><td colspan="7" class="empty-row">Gagal memuat data.</td></tr>';
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
    
    // 1. Ambil data dari input field
    const id          = document.getElementById('pay-id-field')?.value; // Untuk mode Edit
    const muridSel    = document.getElementById('pay-murid');
    const sppSel      = document.getElementById('pay-spp');
    const tanggal     = document.getElementById('pay-tanggal').value;
    const jumlah      = parseFloat(document.getElementById('pay-jumlah').value) || 0;
    const metode      = document.getElementById('pay-metode').value;
    const jenis       = document.getElementById('pay-jenis').value;
    const keterangan  = document.getElementById('pay-keterangan').value;

    // 2. Validasi
    if (!muridSel.value || jumlah <= 0) { 
      UI.toast('Pilih murid dan masukkan jumlah pembayaran yang valid', 'error'); 
      return; 
    }

    const muridOpt = muridSel.options[muridSel.selectedIndex];
    
    // 3. Siapkan Payload
    const payload = {
      tanggal:    tanggal || new Date().toISOString().split('T')[0],
      id_murid:   muridSel.value,
      nama:       muridOpt.dataset.nama,
      jenis, 
      jumlah, 
      metode, 
      keterangan,
      spp_id:     sppSel ? sppSel.value : ''
    };

    try {
      if (btn) { 
        btn.disabled = true; 
        // Efek loading spinner-sm yang rapi
        btn.innerHTML = id ? 
            '<div class="spinner spinner-sm"></div> Memperbarui data...' : 
            '<div class="spinner spinner-sm"></div> Memproses pembayaran...'; 
      }

      // Gunakan ternary: Update jika ada ID, Add jika tidak ada
      const res = id ? 
          await API.pembayaran.update({ id, ...payload }) : 
          await API.pembayaran.add(payload);
      
      if (res.status === 'OK') {
        const pesanSukses = id ? 'Data pembayaran diperbarui' : 'Pembayaran berhasil dicatat! 💸';
        UI.toast(pesanSukses, 'success');
        
        UI.closeModal('modal-pembayaran');
        
        // RESET CACHE & REFRESH TABEL
        allData = [];
        isFetched = false;
        load(); 
      } else {
        UI.toast(res.message || 'Gagal menyimpan pembayaran', 'error');
      }
    } catch (e) {
      console.error("Error Payment:", e);
      UI.toast('Terjadi kesalahan pada server', 'error');
    } finally {
      if (btn) { 
        btn.disabled = false; 
        btn.innerHTML = 'Simpan Pembayaran'; // Balikin teks tombol
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
  let isFetched = false; // <--- Penjaga gerbang SPP

  async function load() {
    const tbody = document.getElementById('spp-tbody');
    if (!tbody) return;

    // 1. CEK KUNCI: Biar klik menu SPP langsung "Jreng"
    if (isFetched) {
      renderTable(allData);
      return; // STOP! Gak usah pake spinner lagi
    }

    // 2. SPINNER AWAL (Pakai colspan="12" karena kolomnya banyak)
    tbody.innerHTML = '<tr><td colspan="12" class="empty-row"><div class="spinner spinner-sm"></div> Memuat data paket SPP...</td></tr>';

    try {
      // 3. TARIK DATA (SPP & Murid buat dropdown)
      const [sppRes, muridRes] = await Promise.all([
        API.spp.getAll(), 
        API.murid.getAll()
      ]);

      if (sppRes.status === 'OK') {
        // Simpan ke memori dan urutkan
        allData = (sppRes.data || []).sort((a, b) => a.id.localeCompare(b.id));
        isFetched = true; // KUNCI PINTU: Data sudah aman
        
        // Isi dropdown murid di modal SPP
        const sel = document.getElementById('spp-murid');
        if (sel && sel.options.length <= 1) {
          populateMurid(muridRes.data || []);
        }
        
        renderTable(allData);
      }
    } catch (e) {
      console.error("Gagal load SPP:", e);
      tbody.innerHTML = '<tr><td colspan="12" class="empty-row">Gagal memuat data paket SPP.</td></tr>';
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
    // 1. Ambil ID Field dan Elemen Tombol
    const id = document.getElementById('spp-id-field').value;
    const btn = document.querySelector('#modal-spp .btn-primary');
    
    // 2. Ambil Input Data
    const muridSel = document.getElementById('spp-murid');
    const mulai    = document.getElementById('spp-mulai').value;
    const akhir    = document.getElementById('spp-akhir').value;
    const harga    = parseFloat(document.getElementById('spp-harga').value) || 0;

    // 3. Validasi
    if (!muridSel.value || !mulai || !akhir) { 
      UI.toast('Semua field wajib diisi', 'error'); 
      return; 
    }

    const opt = muridSel.options[muridSel.selectedIndex];

    // 4. Siapkan Payload
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
      if (btn) {
        btn.disabled = true;
        // Gunakan spinner-sm agar rapi dan teks dinamis
        btn.innerHTML = id ? 
            '<div class="spinner spinner-sm"></div> Memperbarui paket...' : 
            '<div class="spinner spinner-sm"></div> Menghitung pertemuan...';
      }

      // Gunakan API sesuai kondisi ID (update atau create)
      const res = id ? await API.spp.update(payload) : await API.spp.create(payload);
      
      if (res.status === 'OK') {
        // Tampilkan jumlah pertemuan hasil hitungan backend jika tambah baru
        const msg = id ? 'Paket SPP berhasil diperbarui' : 
                         `Berhasil! Total: ${res.data.total_pertemuan} pertemuan. ✅`;
        
        UI.toast(msg, 'success');
        UI.closeModal('modal-spp');
        
        // RESET CACHE & REFRESH TABEL
        allData = [];
        isFetched = false;
        load(); 
      } else {
        UI.toast(res.message || 'Gagal memproses paket SPP', 'error');
      }
    } catch (e) {
      console.error("Error SPP:", e);
      UI.toast('Gagal terhubung ke server', 'error');
    } finally {
      if (btn) {
        btn.disabled = false;
        btn.innerHTML = 'Simpan Paket'; // Balikin teks tombol
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

async function deleteSPP(id, namaMurid) {
    // 1. Konfirmasi lebih jelas (pakai nama murid kalau ada)
    const pesan = namaMurid ? 
        `Hapus paket SPP milik "${namaMurid}"? Sisa pertemuan akan hilang.` : 
        `Hapus paket SPP ${id}? Sisa pertemuan akan hilang.`;
        
    if (!confirm(pesan)) return;

    // 2. Cari tombol hapus di tabel untuk pasang loading
    const btn = document.querySelector(`button[onclick*="deleteSPP('${id}'"]`);
    const originalContent = btn ? btn.innerHTML : '';

    try {
        if (btn) {
            btn.disabled = true;
            btn.innerHTML = '<div class="spinner spinner-sm"></div>'; // Spinner kecil
        }

        const res = await API.spp.delete(id);

        if (res.status === 'OK') {
            UI.toast('Paket berhasil dihapus', 'success');
            
            // --- SINKRONISASI DATA ---
            allData = [];       // Kosongkan array data lama
            isFetched = false;  // BUKA GEMBOK: Paksa load() ambil data baru dari Sheets
            load();             // Refresh tabel
        } else {
            UI.toast(res.message || 'Gagal menghapus', 'error');
            if (btn) { btn.disabled = false; btn.innerHTML = originalContent; }
        }
    } catch (e) {
        console.error("Error Delete SPP:", e);
        UI.toast('Gagal terhubung ke server', 'error');
        if (btn) { btn.disabled = false; btn.innerHTML = originalContent; }
    }
}

  return { load, saveForm, openAdd, openEdit, deleteSPP, initLiveCount, calculateLiveSessions };
})();

// ============================================================
// Buku Module
// ============================================================

  const BukuPage = (() => {
  let allData = [];
  let isFetched = false;

  async function load() {
    const tbody = document.getElementById('buku-tbody');
    if (!tbody) return;

    if (isFetched) {
      renderTable(allData);
      return; 
    }

    tbody.innerHTML = '<tr><td colspan="6" class="empty-row"><div class="spinner spinner-sm"></div> Memuat data modul belajar...</td></tr>';

    try {
      const bukuRes = await API.buku.getAll();
      if (bukuRes.status === 'OK') {
        allData = bukuRes.data || [];
        isFetched = true;
        renderTable(allData);
      }
    } catch (e) {
      console.error(e);
      tbody.innerHTML = '<tr><td colspan="6" class="empty-row">Gagal memuat data.</td></tr>';
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
    // 1. Ambil Elemen Tombol dan ID Field
    const btn = document.querySelector('#modal-buku .btn-primary');
    const id = document.getElementById('buku-id-field').value;
    
    // 2. Ambil Input Data
    const nama = document.getElementById('buku-nama').value.trim();
    const jenjang = document.getElementById('buku-jenjang').value.trim();
    const program = document.getElementById('buku-program').value.trim();
    const keterangan = document.getElementById('buku-ket').value.trim();

    // 3. Validasi
    if (!nama) { 
        UI.toast('Nama modul wajib diisi', 'error'); 
        return; 
    }

    // 4. Bungkus Data ke Payload
    const payload = { 
        nama, 
        jenjang, 
        program, 
        keterangan 
    };

    try {
      if (btn) { 
        btn.disabled = true; 
        // Efek loading spinner-sm dengan teks dinamis
        btn.innerHTML = id ? 
            '<div class="spinner spinner-sm"></div> Memperbarui modul...' : 
            '<div class="spinner spinner-sm"></div> Menambahkan modul...'; 
      }

      // Gunakan ternary: Update jika ada ID, Add jika ID kosong
      const res = id ? 
          await API.buku.update({ id, ...payload }) : 
          await API.buku.add(payload);
      
      if (res.status === 'OK') {
        const pesanSukses = id ? 'Modul berhasil diperbarui' : 'Modul baru berhasil ditambahkan! 📚';
        UI.toast(pesanSukses, 'success');
        
        UI.closeModal('modal-buku');
        
        // RESET CACHE & REFRESH TABEL
        allData = [];
        isFetched = false;
        load(); 
      } else {
        UI.toast(res.message || 'Gagal menyimpan modul', 'error');
      }
    } catch (e) {
      console.error("Error Buku Modul:", e);
      UI.toast('Gagal terhubung ke server', 'error');
    } finally {
      if (btn) { 
        btn.disabled = false; 
        btn.innerHTML = 'Simpan'; // Balikin teks tombol
      }
    }
}

  async function deleteBuku(id, nama) {
    // 1. Konfirmasi dengan nama modul agar lebih aman
    if (!confirm(`Hapus modul "${nama}"? Tindakan ini tidak dapat dibatalkan.`)) return;

    // 2. Cari tombol hapus di tabel untuk pasang spinner loading
    // Ini mencari button yang onclick-nya mengandung ID buku tersebut
    const btn = document.querySelector(`button[onclick*="deleteBuku('${id}'"]`);
    const originalContent = btn ? btn.innerHTML : '';

    try {
        if (btn) {
            btn.disabled = true;
            btn.innerHTML = '<div class="spinner spinner-sm"></div>'; // Muncul spinner muter
        }

        const res = await API.buku.delete(id);

        if (res.status === 'OK') {
            UI.toast(`Modul "${nama}" berhasil dihapus`, 'success');
            
            // --- SINKRONISASI DATA ---
            allData = [];       // Kosongkan cache lokal
            isFetched = false;  // BUKA GEMBOK: Paksa load() ambil data terbaru dari Google Sheets
            load();             // Refresh tabel agar baris yang dihapus hilang
        } else {
            UI.toast(res.message || 'Gagal menghapus modul', 'error');
            // Kembalikan tombol jika gagal
            if (btn) { btn.disabled = false; btn.innerHTML = originalContent; }
        }
    } catch (e) {
        console.error("Error Delete Buku:", e);
        UI.toast('Gagal terhubung ke server', 'error');
        // Kembalikan tombol jika error koneksi
        if (btn) { btn.disabled = false; btn.innerHTML = originalContent; }
    }
}

  return { load, openAdd, openEdit, saveForm, deleteBuku };
})();

// ============================================================
// Gaji Module
// ============================================================

  const GajiPage = (() => {
  let allData = [];
  let isFetched = false;

  async function load() {
  const tbody = document.getElementById('gaji-tbody');
  if (!tbody) return;

  if (isFetched) {
    renderTable(allData);
    return; 
  }

  tbody.innerHTML = '<tr><td colspan="6" class="empty-row"><div class="spinner spinner-sm"></div> Memuat data gaji...</td></tr>';

  try {
    // 1. Definisikan gajiRes dan mentorRes
    const [gajiRes, mentorRes] = await Promise.all([
      API.gaji.getAll(), 
      API.mentor.getAll()
    ]);

    // 2. CEK gajiRes (Bukan 'res' saja!)
    if (gajiRes.status === 'OK') {
      allData = gajiRes.data || [];
      isFetched = true;

      // 3. Tambahkan logika populate mentor jika perlu (biar dropdown gak kosong)
      const sel = document.getElementById('gaji-mentor');
      if (sel && sel.options.length <= 1) {
        populateMentor(mentorRes.data || []);
      }

      renderTable(allData);
    }
  } catch (e) {
    console.error("Error Load Gaji:", e);
    tbody.innerHTML = '<tr><td colspan="6" class="empty-row">Gagal memuat data.</td></tr>';
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
    // 1. Ambil Elemen Tombol dan Input
    const btn       = document.querySelector('#modal-gaji .btn-primary');
    const mentorSel = document.getElementById('gaji-mentor');
    const bulan_gaji = document.getElementById('gaji-bulan').value;
    const tgl_bayar  = document.getElementById('gaji-tgl').value;
    const metode     = document.getElementById('gaji-metode').value;

    // 2. Validasi
    if (!mentorSel.value || !bulan_gaji) { 
      UI.toast('Mentor dan bulan gaji wajib diisi', 'error'); 
      return; 
    }

    try {
      if (btn) { 
        btn.disabled = true; 
        // Gunakan spinner-sm agar konsisten dengan modul lainnya
        btn.innerHTML = '<div class="spinner spinner-sm"></div> Memproses gaji...'; 
      }

      // 3. Kirim Data ke API
      const res = await API.gaji.record({ 
        id_mentor: mentorSel.value, 
        bulan_gaji, 
        tgl_bayar, 
        metode 
      });

      if (res.status === 'OK') {
        const d = res.data.salary_detail;
        // Notifikasi lebih personal dengan nama mentor
        UI.toast(`Gaji ${d.nama_mentor} bulan ${bulan_gaji} berhasil dicatat! 💸`, 'success');
        
        UI.closeModal('modal-gaji');
        
        // --- REFRESH DATA ---
        allData = [];
        isFetched = false;
        load(); 
      } else {
        UI.toast(res.message || 'Gagal mencatat gaji', 'error');
      }
    } catch (e) {
      console.error("Error Gaji:", e);
      UI.toast('Terjadi kesalahan koneksi ke server', 'error');
    } finally {
      if (btn) { 
        btn.disabled = false; 
        btn.innerHTML = 'Simpan Penggajian'; // Balikin teks tombol
      }
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


