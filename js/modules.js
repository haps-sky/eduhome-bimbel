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
      return;
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
    // --- 1. Reset Input Teks & Angka (Dikosongkan Total) ---
    document.getElementById('mentor-id-field').value = '';
    document.getElementById('mentor-nama').value = '';
    document.getElementById('mentor-kontak').value = '';
    document.getElementById('mentor-program').value = '';
    document.getElementById('mentor-fee-anak').value = '';
    document.getElementById('mentor-fee-harian').value = '';

    // --- 2. Reset Dropdown Jenis Kelamin ---
    // Kita paksa balik ke urutan pertama (biasanya Laki-laki atau --Pilih--)
    const jk = document.getElementById('mentor-jk');
    if (jk) {
        jk.selectedIndex = 0; 
    }

    // --- 3. Reset Dropdown Status ---
    // Kita paksa ke value 'AKTIF' agar setiap tambah mentor baru statusnya otomatis Aktif
    const status = document.getElementById('mentor-status');
    if (status) {
        status.value = 'AKTIF'; 
    }
}


function openAdd() {
    clearForm(); 
    const title = document.getElementById('mentor-modal-title');
    if (title) title.textContent = 'Tambah Mentor Baru';
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
    // 1. Konfirmasi dulu
    if (!confirm(`Hapus mentor "${nama}"? Semua data terkait mentor ini akan dihapus.`)) return;

    // 2. Cari tombol yang diklik (biar loading-nya muncul di situ)
    // Kita cari button yang punya fungsi deleteMentor dengan ID ini
    const btn = document.querySelector(`button[onclick*="deleteMentor('${id}'"]`);
    const originalContent = btn ? btn.innerHTML : ''; // Simpan icon sampah aslinya

    try {
        if (btn) {
            btn.disabled = true;
            // Ganti icon sampah jadi spinner (tanpa teks tambahan agar tidak melebar berlebihan)
            btn.innerHTML = '<div class="spinner spinner-sm"></div>';
            btn.style.width = 'auto'; 
            btn.style.padding = '0 10px';
        }

        // 3. Panggil API Hapus Mentor
        const res = await API.mentor.delete(id);

        if (res.status === 'OK') {
            UI.toast(`Mentor "${nama}" berhasil dihapus`, 'success');
            
            // --- RESET CACHE AGAR TABEL REFRESH ---
            allData = [];
            isFetched = false;
            load(); 
        } else {
            UI.toast(res.message || 'Gagal menghapus mentor', 'error');
            // Balikin tombol kalau gagal dari server
            if (btn) {
                btn.disabled = false;
                btn.innerHTML = originalContent;
                btn.style.width = ''; // Reset style jika gagal
                btn.style.padding = '';
            }
        }
    } catch (e) {
        console.error("Error Delete Mentor:", e);
        UI.toast('Gagal terhubung ke server', 'error');
        // Balikin tombol kalau koneksi putus
        if (btn) {
            btn.disabled = false;
            btn.innerHTML = originalContent;
            btn.style.width = '';
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
  // Isi Dropdown Murid
  const ms = document.getElementById('presensi-murid');
  if (ms) {
    ms.innerHTML = '<option value="">-- Pilih Murid --</option>' +
      murid.filter(m => String(m.status).trim().toUpperCase() === 'AKTIF')
           .map(m => `<option value="${m.id}" data-nama="${m.nama}" data-program="${m.program}">${m.nama} (${m.program})</option>`)
           .join('');
  }

  const mt = document.getElementById('presensi-mentor');
  if (mt) {
    mt.innerHTML = '<option value="">-- Pilih Mentor --</option>' +
      mentor.filter(m => String(m.status).trim().toUpperCase() === 'AKTIF')
            .map(m => `<option value="${m.id}" data-nama="${m.nama}">${m.nama}</option>`)
            .join('');
  }
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
      <td>
        <div class="action-btns">
          <button class="btn-icon btn-warning" onclick="PresensiPage.openEdit('${p.id}')" title="Edit Data">
            <i data-lucide="pencil"></i> 
          </button>
          <button class="btn-icon btn-danger" data-delete-id="${p.id}" onclick="PresensiPage.deleteItem('${p.id}')" title="Hapus Data">
            <i data-lucide="trash-2"></i>
          </button>
        </div>
      </td>
    </tr>`);

  UI.renderTable('presensi-tbody', rows, 'Belum ada data presensi');
  
  if (window.lucide) {
    lucide.createIcons();
  }
}

async function saveForm() {
  const id        = document.getElementById('presensi-id-field').value;
  const tanggal   = document.getElementById('presensi-tanggal').value;
  const muridSel  = document.getElementById('presensi-murid');
  const mentorSel = document.getElementById('presensi-mentor');
  const status    = document.getElementById('presensi-status').value;
  const catatan   = document.getElementById('presensi-catatan').value.trim();
  const bintang   = document.getElementById('presensi-bintang').value;

  if (!tanggal || !muridSel.value) {
    UI.toast('Tanggal dan murid wajib diisi', 'error');
    return;
  }

  const muridOpt = muridSel.options[muridSel.selectedIndex];
  const mentorOpt = mentorSel.options[mentorSel.selectedIndex];
  const programMurid = muridOpt.dataset.program;

  const btn = document.getElementById('presensi-save-btn');
  if (btn) {
    btn.disabled = true;
    btn.innerHTML = `<div class="spinner spinner-sm"></div> ${id ? 'Memperbarui...' : 'Memvalidasi...'}`;
  }

  try {
    let idPaketTerpilih = '';
    
    if (!id) {
      const sppRes = await API.spp.getAll();
      const paketAktif = (sppRes.data || []).find(p => 
        p.id_murid === muridSel.value && 
        p.program === programMurid && 
        p.status === 'AKTIF' && 
        // GANTI DI SINI: Langsung cek sisa_pertemuan (lebih akurat)
        Number(p.sisa_pertemuan) > 0 
      );

      if (!paketAktif) {
        UI.toast(`Kuota ${programMurid} habis atau paket belum aktif!`, 'error');
        throw new Error('Kuota Habis');
      }
      idPaketTerpilih = paketAktif.id;
    }

    const payload = {
      tanggal,
      id_murid: muridSel.value,
      nama_murid: muridOpt.dataset.nama,
      id_mentor: mentorSel.value,
      nama_mentor: mentorOpt ? mentorOpt.dataset.nama : '',
      program: programMurid,
      status,
      catatan,
      bintang: parseInt(bintang) || 0,
      id_paket: idPaketTerpilih
    };

    const res = id 
      ? await API.presensi.update({ id, ...payload }) 
      : await API.presensi.add(payload);

    if (res.status === 'OK') {
      UI.toast(id ? 'Presensi diperbarui' : 'Presensi berhasil dicatat!', 'success');
      UI.closeModal('modal-presensi');
      
      // Refresh Data
      allData = [];
      isFetched = false;
      setTimeout(() => { load(); }, 500);
    } else {
      UI.toast(res.message || 'Gagal menyimpan', 'error');
    }
  } catch (e) {
    if(e.message !== 'Kuota Habis') UI.toast('Error: ' + e.message, 'error');
  } finally {
    if (btn) {
      btn.disabled = false;
      btn.innerHTML = '<i data-lucide="save"></i> Simpan Presensi';
      lucide.createIcons({ nodes: [btn] });
    }
  }
}

  function filterByDate(date) {
    const filtered = date ? allData.filter(p => p.tanggal === date) : allData;
    renderTable(filtered.reverse());
  }

function openAdd() {
    clearForm();
}

async function openEdit(id) {
  const p = allData.find(x => x.id === id);
  if (!p) return;

  // Reset form & Judul
  document.getElementById('modal-presensi-title').textContent = 'Edit Presensi';
  document.getElementById('presensi-id-field').value = p.id;
  
  // Isi Field
  document.getElementById('presensi-tanggal').value = p.tanggal;
  document.getElementById('presensi-murid').value   = p.id_murid;
  document.getElementById('presensi-mentor').value  = p.id_mentor;
  document.getElementById('presensi-status').value  = p.status;
  document.getElementById('presensi-catatan').value = p.catatan || '';
  document.getElementById('presensi-bintang').value = p.bintang || 5;

  UI.openModal('modal-presensi');
}

function clearForm() {
    const titleEl = document.getElementById('modal-presensi-title');
    if (titleEl) titleEl.textContent = 'Catat Presensi Baru';

    // Set ID kosong (penting untuk bedakan ADD vs EDIT)
    document.getElementById('presensi-id-field').value = '';

    // Tanggal Kosong (sesuai request kamu sebelumnya)
    const tglInput = document.getElementById('presensi-tanggal');
    if (tglInput) tglInput.value = ''; 

    // Reset dropdown & field lainnya
    document.getElementById('presensi-murid').value = '';
    document.getElementById('presensi-mentor').value = '';
    document.getElementById('presensi-status').value = 'HADIR';
    document.getElementById('presensi-catatan').value = '';
    document.getElementById('presensi-bintang').value = 5;

    UI.openModal('modal-presensi');
}

async function deletePresensi(id) {
    if (!confirm('Hapus presensi ini? Sisa pertemuan murid akan bertambah kembali secara otomatis.')) return;

    // ── Guard anti double-click ──────────────────────────────
    if (deletePresensi._loading) return;
    deletePresensi._loading = true;

    // Cari tombol dengan cara lebih robust pakai data-id
    const btn = document.querySelector(`[data-delete-id="${id}"]`);
    const originalContent = btn ? btn.innerHTML : '';

    try {
        if (btn) {
            btn.disabled = true;
            btn.innerHTML = '<div class="spinner spinner-sm"></div>';
        }

        const res = await API.presensi.delete(id);

        if (res.status === 'OK') {
            UI.toast('Data presensi berhasil dihapus & kuota SPP dikembalikan', 'success');

            // Reset cache presensi
            allData    = [];
            isFetched  = false;

            // Invalidate SPP agar fetch ulang saat dibuka
            if (window.SPPPage) SPPPage.isFetched = false;

            // Await agar UI tidak update sebelum data baru datang
            await load();

        } else {
            UI.toast(res.message || 'Gagal menghapus', 'error');
            if (btn) { btn.disabled = false; btn.innerHTML = originalContent; }
        }

    } catch (e) {
        console.error('Error deletePresensi:', e);
        UI.toast('Gagal terhubung ke server. Silakan refresh.', 'error');
        if (btn) { btn.disabled = false; btn.innerHTML = originalContent; }

    } finally {
        // Selalu lepas guard meski error
        deletePresensi._loading = false;
    }
}

return { load, saveForm, filterByDate, openAdd, openEdit, deleteItem: deletePresensi 
};

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
        updateSummary();
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
      <td>${UI.formatCurrency(p.jumlah)}</td>
      <td>${p.metode}</td>
      <td>${p.keterangan || '-'}</td>
      <td>
        <div class="action-btns">
          <button class="btn-icon btn-warning" onclick="PembayaranPage.openEdit('${p.id}')" title="Edit">
            <i data-lucide="pencil"></i>
          </button>
          <button class="btn-icon btn-danger" 
                  data-delete-id="${p.id}" 
                  onclick="PembayaranPage.deletePembayaran('${p.id}', '${p.nama}')" 
                  title="Hapus">
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

    const idField = document.getElementById('pay-id-field');
    const muridSel = document.getElementById('pay-murid');
    const title = document.getElementById('modal-pembayaran-title');
    const sisaInfo = document.getElementById('pay-sisa-info');
    
    // Reset Judul & ID
    if (title) title.textContent = 'Catat Pembayaran Baru';
    if (idField) idField.value = '';
    
    // Reset Form & Aktifkan kembali dropdown murid
    if (muridSel) {
      muridSel.value = '';
      muridSel.disabled = false;
    }
    
    // Kosongkan info sisa tagihan & jumlah
    if (sisaInfo) sisaInfo.textContent = '';
    document.getElementById('pay-jumlah').value = '';
    document.getElementById('pay-keterangan').value = '';
    
    UI.openModal('modal-pembayaran');
  }

// Fungsi untuk membuka modal edit
function openEdit(id) {
  const p = allData.find(x => x.id === id);
  if (!p) return;

  clearForm();

  document.getElementById('modal-pembayaran-title').textContent = 'Edit Pembayaran';
  document.getElementById('pay-id-field').value = p.id; // Pastikan ada input hidden ID di modal
  
  document.getElementById('pay-murid').value = p.id_murid;
  document.getElementById('pay-tanggal').value = p.tanggal;
  document.getElementById('pay-jenis').value = p.jenis;
  document.getElementById('pay-jumlah').value = p.jumlah;
  document.getElementById('pay-metode').value = p.metode;
  document.getElementById('pay-keterangan').value = p.keterangan || '';
  
  // Murid tidak boleh diubah saat edit agar sinkronisasi SPP tidak kacau
  document.getElementById('pay-murid').disabled = true;

  UI.openModal('modal-pembayaran');
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
        const pesanSukses = id ? 'Data pembayaran diperbarui' : 'Pembayaran berhasil dicatat!';
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

function clearForm() {
    const form = document.getElementById('form-pembayaran'); // Pastikan <form> punya ID ini
    if (form) form.reset();

    // Reset elemen manual yang tidak terpengaruh form.reset()
    const idField = document.getElementById('pay-id-field');
    const sisaInfo = document.getElementById('pay-sisa-info');
    const sppSel = document.getElementById('pay-spp');
    const muridSel = document.getElementById('pay-murid');

    if (idField) idField.value = '';
    if (sisaInfo) sisaInfo.textContent = '';
    if (muridSel) muridSel.disabled = false;
    
    if (sppSel) {
      sppSel.innerHTML = '<option value="">-- Pilih Paket SPP (opsional) --</option>';
    }

    const tglInput = document.getElementById('pay-tanggal');
    if (tglInput) tglInput.value = new Date().toISOString().split('T')[0];
  }

async function deletePembayaran(id, nama) {
  if (!confirm(`Hapus riwayat pembayaran untuk "${nama}"? Saldo laporan akan disesuaikan.`)) return;

  // Gunakan selector [data-delete-id] agar lebih akurat
  const btn = document.querySelector(`button[data-delete-id="${id}"]`);
  const originalContent = btn ? btn.innerHTML : '';

  try {
    if (btn) {
      btn.disabled = true;
      btn.innerHTML = '<div class="spinner spinner-sm"></div>';
      btn.style.width = '40px'; // Menjaga lebar kolom tabel tetap rapi
    }

    const res = await API.pembayaran.delete(id);

    if (res.status === 'OK') {
      UI.toast(`Pembayaran "${nama}" berhasil dihapus`, 'success');
      
      // Reset state dan muat ulang data
      allData = [];
      isFetched = false;
      load(); 
      
      // Pastikan Dashboard refresh angka keuangan saat dibuka nanti
      if (window.Dashboard) Dashboard.isFetched = false;
      
    } else {
      UI.toast(res.message || 'Gagal menghapus pembayaran', 'error');
      if (btn) { 
        btn.disabled = false; 
        btn.innerHTML = originalContent; 
        btn.style.width = ''; 
      }
    }
  } catch (e) {
    console.error("Error Delete Pembayaran:", e);
    UI.toast('Gagal terhubung ke server', 'error');
    if (btn) { 
      btn.disabled = false; 
      btn.innerHTML = originalContent; 
      btn.style.width = ''; 
    }
  }
}
  
  return { load, saveForm, openAdd, openEdit, deletePembayaran };
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

  display.innerHTML = '<div class="spinner-sm"></div> Menghitung...';

  try {
    const res = await API.jadwal.getByMurid(id_murid);
    const hariLes = (res.data || []).map(j => j.hari.trim().toLowerCase());

    if (hariLes.length === 0) {
      display.textContent = "Total: 0 Sesi (Jadwal kosong)";
      return;
    }

    const dayMap = { 'minggu':0, 'senin':1, 'selasa':2, 'rabu':3, 'kamis':4, 'jumat':5, 'sabtu':6 };
    const targetDays = hariLes.map(h => dayMap[h]);
    
    let count = 0;
    // PENTING: Gunakan replace agar tanggal tidak lari ke hari sebelumnya
    let cur = new Date(mulai.replace(/-/g, '\/'));
    const end = new Date(akhir.replace(/-/g, '\/'));
    
    while (cur < end) {
      if (targetDays.includes(cur.getDay())) count++;
      cur.setDate(cur.getDate() + 1);
    }
    display.innerHTML = `Total: <strong>${count}</strong> Sesi`;
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
            '<div class="spinner spinner-sm"></div> Mennyimpan paket...';
      }

      // Gunakan API sesuai kondisi ID (update atau create)
      const res = id ? await API.spp.update(payload) : await API.spp.create(payload);
      
      if (res.status === 'OK') {
        // Tampilkan jumlah pertemuan hasil hitungan backend jika tambah baru
        const msg = id ? 'Paket SPP berhasil diperbarui' : 
                         `Berhasil! Total: ${res.data.total_pertemuan} pertemuan.`;
        
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

    initLiveCount();
    
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
    // 1. Konfirmasi
    const pesan = namaMurid ? 
        `Hapus paket SPP milik "${namaMurid}"? Sisa pertemuan akan hilang.` : 
        `Hapus paket SPP ${id}? Sisa pertemuan akan hilang.`;
        
    if (!confirm(pesan)) return;

    // 2. Cari tombol hapus (Gunakan selector yang lebih spesifik)
    const btn = document.querySelector(`button[onclick*="deleteSPP('${id}'"]`);
    const originalContent = btn ? btn.innerHTML : '';

    try {
        if (btn) {
            btn.disabled = true;
            // CUKUP SPINNER SAJA: Biar kolom tabel nggak melebar/berantakan
            btn.innerHTML = '<div class="spinner spinner-sm"></div>';
            btn.style.width = '40px'; // Paksa lebar tetap agar konsisten
        }

        const res = await API.spp.delete(id);

        if (res.status === 'OK') {
            UI.toast('Paket berhasil dihapus', 'success');
            
            // --- REFRESH DATA ---
            // Pastikan variabel ini diakses dari scope yang benar (misal: SPPPage.allData)
            if (typeof allData !== 'undefined') allData = []; 
            if (typeof isFetched !== 'undefined') isFetched = false; 
            
            // Panggil load() milik modul SPP
            if (typeof load === 'function') load(); 
        } else {
            UI.toast(res.message || 'Gagal menghapus', 'error');
            if (btn) { 
                btn.disabled = false; 
                btn.innerHTML = originalContent; 
                btn.style.width = ''; 
            }
        }
    } catch (e) {
        console.error("Error Delete SPP:", e);
        UI.toast('Gagal terhubung ke server', 'error');
        if (btn) { 
            btn.disabled = false; 
            btn.innerHTML = originalContent; 
            btn.style.width = '';
        }
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
      <td><strong>${b.nama_modul}</strong></td>
      <td>
        <div class="program-tag">${b.jenjang || '-'}</div>
        <div style="font-size:0.72rem; color:var(--text-secondary); margin-top:2px;">${b.program || '-'}</div>
      </td>
      <td><span class="pill">${b.stok || 0}</span></td>
      <td style="font-family:var(--font-mono)">Rp${Number(b.harga_beli || 0).toLocaleString('id-ID')}</td>
      <td style="font-family:var(--font-mono); font-weight:700; color:var(--primary)">Rp${Number(b.harga_jual || 0).toLocaleString('id-ID')}</td>
      <td>
        <div class="action-btns">
          <button class="btn-icon btn-warning" onclick="BukuPage.openEdit('${b.id}')" title="Edit">
            <i data-lucide="pencil"></i>
          </button>
          <button class="btn-icon btn-danger" onclick="BukuPage.deleteBuku('${b.id}','${b.nama_modul}')" title="Hapus">
            <i data-lucide="trash-2"></i>
          </button>
        </div>
      </td>
    </tr>`);

  // Update total counter di toolbar
  const countEl = document.getElementById('buku-count');
  if (countEl) countEl.innerText = `Total: ${data.length} modul`;

  UI.renderTable('buku-tbody', rows, 'Belum ada modul pembelajaran');
  lucide.createIcons();
}

function openAdd() {
  // Tambahkan ID input stok dan harga ke dalam array untuk dikosongkan
  const fields = [
    'buku-id-field', 
    'buku-nama', 
    'buku-jenjang', 
    'buku-program', 
    'buku-stok',
    'buku-harga-beli',
    'buku-harga-jual',
    'buku-ket'
  ];

  fields.forEach(id => {
    const el = document.getElementById(id); 
    if (el) el.value = '';
  });

  // Pastikan judul modal kembali ke "Tambah Modul"
  const titleEl = document.getElementById('buku-modal-title');
  if (titleEl) titleEl.textContent = 'Tambah Modul';
  
  UI.openModal('modal-buku');
}

function openEdit(id) {
  // 1. Cari data buku berdasarkan ID di dalam array allData
  const b = allData.find(x => x.id === id);
  if (!b) return;

  // 2. Set Judul Modal jadi Edit
  document.getElementById('buku-modal-title').textContent = 'Edit Modul';
  
  // 3. Isi field hidden ID
  document.getElementById('buku-id-field').value = b.id;
  
  // 4. Isi data identitas (Ganti b.nama jadi b.nama_modul sesuai DB baru)
  document.getElementById('buku-nama').value    = b.nama_modul || '';
  document.getElementById('buku-jenjang').value = b.jenjang || '';
  document.getElementById('buku-program').value = b.program || '';
  
  // 5. ISI DATA BARU (Stok & Harga)
  document.getElementById('buku-stok').value        = b.stok || 0;
  document.getElementById('buku-harga-beli').value  = b.harga_beli || 0;
  document.getElementById('buku-harga-jual').value  = b.harga_jual || 0;
  
  // 6. Keterangan
  document.getElementById('buku-ket').value = b.keterangan || '';
  
  // 7. Munculkan Modal
  UI.openModal('modal-buku');
}

async function saveForm() {
    // 1. Ambil Elemen Tombol dan ID Field
    const btn = document.querySelector('#modal-buku .btn-primary');
    const id = document.getElementById('buku-id-field').value;
    
    // 2. Ambil Input Data (Gunakan ID yang baru kita buat di Modal)
    const nama_modul = document.getElementById('buku-nama').value.trim();
    const jenjang = document.getElementById('buku-jenjang').value.trim();
    const program = document.getElementById('buku-program').value.trim();
    const stok = Number(document.getElementById('buku-stok').value) || 0;
    const harga_beli = Number(document.getElementById('buku-harga-beli').value) || 0;
    const harga_jual = Number(document.getElementById('buku-harga-jual').value) || 0;
    const keterangan = document.getElementById('buku-ket').value.trim();

    // 3. Validasi
    if (!nama_modul) { 
        UI.toast('Nama modul wajib diisi', 'error'); 
        return; 
    }

    // 4. Bungkus Data ke Payload (Pastikan nama key sinkron dengan DB BUKU)
    const payload = { 
        nama_modul, 
        jenjang, 
        program, 
        stok,
        harga_beli,
        harga_jual,
        keterangan 
    };

    try {
      if (btn) { 
        btn.disabled = true; 
        btn.innerHTML = id ? 
            '<div class="spinner spinner-sm"></div> Memperbarui...' : 
            '<div class="spinner spinner-sm"></div> Menyimpan...'; 
      }

      // Kirim ke API
      const res = id ? 
          await API.buku.update({ id, ...payload }) : 
          await API.buku.add(payload);
      
      if (res.status === 'OK') {
        UI.toast(id ? 'Modul diperbarui' : 'Modul berhasil ditambahkan!', 'success');
        UI.closeModal('modal-buku');
        
        // REFRESH DATA
        load(true); 
      } else {
        UI.toast(res.message || 'Gagal menyimpan modul', 'error');
      }
    } catch (e) {
      console.error("Error Buku Modul:", e);
      UI.toast('Gagal terhubung ke server', 'error');
    } finally {
      if (btn) { 
        btn.disabled = false; 
        btn.innerHTML = '<i data-lucide="save"></i> Simpan'; 
        lucide.createIcons(); // Re-render icon save
      }
    }
}

  async function deleteBuku(id, nama) {
    // 1. Konfirmasi dengan nama modul
    if (!confirm(`Hapus modul "${nama}"? Tindakan ini tidak dapat dibatalkan.`)) return;

    // 2. Cari tombol hapus berdasarkan ID buku
    const btn = document.querySelector(`button[onclick*="deleteBuku('${id}'"]`);
    const originalContent = btn ? btn.innerHTML : '';

    try {
        if (btn) {
            btn.disabled = true;
            // Hapus teks "Menghapus...", cukup spinner saja agar kolom tidak melebar
            btn.innerHTML = '<div class="spinner spinner-sm"></div>';
            btn.style.width = '40px'; // Paksa lebar tombol tetap kecil
        }

        const res = await API.buku.delete(id);

        if (res.status === 'OK') {
            UI.toast(`Modul "${nama}" berhasil dihapus`, 'success');
            
            // --- SINKRONISASI DATA ---
            // Gunakan pengecekan typeof agar tidak error jika variabel ada di dalam Modul/IIFE
            if (typeof allData !== 'undefined') allData = [];
            if (typeof isFetched !== 'undefined') isFetched = false;
            
            // Panggil load() untuk refresh tabel
            if (typeof load === 'function') load();
            
        } else {
            UI.toast(res.message || 'Gagal menghapus modul', 'error');
            if (btn) { 
                btn.disabled = false; 
                btn.innerHTML = originalContent; 
                btn.style.width = ''; 
            }
        }
    } catch (e) {
        console.error("Error Delete Buku:", e);
        UI.toast('Gagal terhubung ke server', 'error');
        if (btn) { 
            btn.disabled = false; 
            btn.innerHTML = originalContent; 
            btn.style.width = '';
        }
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

  tbody.innerHTML = '<tr><td colspan="7" class="empty-row"><div class="spinner spinner-sm"></div> Memuat data gaji...</td></tr>';

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
        <td>
          <div class="action-btns">
            <button class="btn-icon btn-warning" 
                    onclick="GajiPage.openEdit('${g.id_trx}')" 
                    title="Edit">
              <i data-lucide="pencil"></i>
            </button>
            
            <button class="btn-icon btn-danger" 
                    data-delete-id="${g.id_trx}" 
                    onclick="GajiPage.deleteGaji('${g.id_trx}', '${g.nama_mentor}')" 
                    title="Hapus">
              <i data-lucide="trash-2"></i>
            </button>
          </div>
        </td>
      </tr>`);
    
    UI.renderTable('gaji-tbody', rows, 'Belum ada data penggajian');
    
    // Wajib panggil ini agar ikon trash & pencil muncul
    if (window.lucide) lucide.createIcons(); 
  }

  // Fungsi untuk reset modal saat tambah gaji baru
  function openAdd() {

    clearForm();
    
    const title = document.getElementById('modal-gaji-title');
    const idField = document.getElementById('gaji-id-field'); // Pastikan ada di HTML
    const mentorSel = document.getElementById('gaji-mentor');

    if (title) title.textContent = 'Catat Penggajian Baru';
    if (idField) idField.value = '';
    
    // Reset form fields
    if (mentorSel) {
      mentorSel.value = '';
      mentorSel.disabled = false;
    }
    document.getElementById('gaji-bulan').value = '';
    document.getElementById('gaji-tgl').value = new Date().toISOString().split('T')[0];
    
    UI.openModal('modal-gaji');
  }

  function openEdit(id) {
    const g = allData.find(x => x.id_trx === id);
    if (!g) return;

    clearForm();

    const title = document.getElementById('modal-gaji-title');
    if (title) title.textContent = 'Edit Catatan Gaji';

    document.getElementById('gaji-id-field').value = g.id_trx;
    document.getElementById('gaji-mentor').value = g.id_mentor;
    document.getElementById('gaji-bulan').value = g.bulan_gaji;
    document.getElementById('gaji-tgl').value = g.tgl_bayar;
    document.getElementById('gaji-metode').value = g.metode;

    // Kunci mentor agar tidak diubah saat edit
    const mentorSel = document.getElementById('gaji-mentor');
    if (mentorSel) mentorSel.disabled = true;

    UI.openModal('modal-gaji');
  }

async function saveForm() {
    const btn = document.querySelector('#modal-gaji .btn-primary');
    const id = document.getElementById('gaji-id-field').value; // Ambil ID untuk cek mode
    const mentorSel = document.getElementById('gaji-mentor');
    const bulan_gaji = document.getElementById('gaji-bulan').value;
    const tgl_bayar = document.getElementById('gaji-tgl').value;
    const metode = document.getElementById('gaji-metode').value;

    // Validasi (Saat edit, mentorSel disabled tapi value tetap ada di element)
    if (!mentorSel.value || !bulan_gaji) { 
        UI.toast('Mentor dan bulan gaji wajib diisi', 'error'); 
        return; 
    }

    const payload = { 
        id_mentor: mentorSel.value, 
        bulan_gaji, 
        tgl_bayar, 
        metode 
    };

    try {
        if (btn) { 
            btn.disabled = true; 
            btn.innerHTML = id ? 
                '<div class="spinner spinner-sm"></div> Memperbarui...' : 
                '<div class="spinner spinner-sm"></div> Memproses gaji...'; 
        }

        // TERNARY: Jika ada ID panggil Update, jika kosong panggil Record (Add)
        const res = id ? 
            await API.gaji.update({ id, ...payload }) : 
            await API.gaji.record(payload);

        if (res.status === 'OK') {
            const pesan = id ? 'Data gaji berhasil diperbarui' : 'Gaji berhasil dicatat!';
            UI.toast(pesan, 'success');
            
            UI.closeModal('modal-gaji');
            
            // RESET & REFRESH
            allData = [];
            isFetched = false;
            await load(); 
        } else {
            UI.toast(res.message || 'Gagal menyimpan data', 'error');
        }
    } catch (e) {
        console.error("Error Gaji:", e);
        UI.toast('Terjadi kesalahan koneksi ke server', 'error');
    } finally {
        if (btn) { 
            btn.disabled = false; 
            btn.innerHTML = 'Simpan Penggajian'; 
        }
    }
}

async function deleteGaji(id, nama) {
  // 1. Konfirmasi
  if (!confirm(`Hapus catatan gaji untuk "${nama}"?`)) return;

  // 2. Cari tombol berdasarkan data-delete-id untuk pasang spinner
  const btn = document.querySelector(`button[data-delete-id="${id}"]`);
  const originalContent = btn ? btn.innerHTML : '';

  try {
    if (btn) {
      btn.disabled = true;
      btn.innerHTML = '<div class="spinner spinner-sm"></div>'; // Spinner muncul di sini!
      btn.style.width = '40px'; 
    }

    const res = await API.gaji.delete(id);

    if (res.status === 'OK') {
      UI.toast(`Catatan gaji "${nama}" berhasil dihapus`, 'success');
      
      // 3. Reset Cache & Refresh
      allData = [];
      isFetched = false;
      await load(); 
      
      // Invalidate Dashboard agar angka pengeluaran di dashboard update
      if (window.Dashboard) Dashboard.isFetched = false;
      
    } else {
      UI.toast(res.message || 'Gagal menghapus', 'error');
      if (btn) { btn.disabled = false; btn.innerHTML = originalContent; btn.style.width = ''; }
    }
  } catch (e) {
    console.error("Error Delete Gaji:", e);
    UI.toast('Gagal terhubung ke server', 'error');
    if (btn) { btn.disabled = false; btn.innerHTML = originalContent; btn.style.width = ''; }
  }
}

function clearForm() {
    // Reset ID hidden agar mode kembali ke 'Add'
    const idField = document.getElementById('gaji-id-field');
    if (idField) idField.value = '';

    // Reset Dropdown Mentor & Aktifkan kembali
    const mentorSel = document.getElementById('gaji-mentor');
    if (mentorSel) {
      mentorSel.value = '';
      mentorSel.disabled = false;
    }

    // Reset Bulan, Tanggal (ke hari ini), dan Metode
    const bulanInput = document.getElementById('gaji-bulan');
    if (bulanInput) bulanInput.value = '';

    const tglInput = document.getElementById('gaji-tgl');
    if (tglInput) tglInput.value = new Date().toISOString().split('T')[0];

    const metodeInput = document.getElementById('gaji-metode');
    if (metodeInput) metodeInput.value = 'TRANSFER'; // Default metode
  }

  return { load, saveForm, openAdd, openEdit, deleteGaji, clearForm };
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


