  const MuridPage = (() => {
    let currentSort = { col: 'id', asc: true };
    const DAYS = ['SENIN', 'SELASA', 'RABU', 'KAMIS', 'JUMAT', 'SABTU', 'MINGGU'];

  let allData = [];
  let isFetched = false;
  let lastDeletedData = null;
  let lastAction = null;
  let lastAddedId = null;

 // Tambahkan default parameter false
async function load(forceRefresh = false) {
    const tbody = document.getElementById('murid-tbody');
    if (!tbody) return;

    // 1. STRATEGI INSTAN: Jika tidak dipaksa refresh & data sudah ada di memori, pakai itu dulu
    if (!forceRefresh && allData && allData.length > 0) {
      renderTable(allData);
      updateSummary(allData);
      // Kita tetap tarik data di background (silent update) tanpa ganggu user
    } else {
      // Tampilkan loading hanya jika memori kosong atau sedang dipaksa refresh
      tbody.innerHTML = '<tr><td colspan="8" class="empty-row"><div class="spinner spinner-sm"></div> Memuat data terbaru...</td></tr>';
    }

    try {
      // 2. Ambil data fresh dari Google Sheets
      const [muridRes, mentorRes] = await Promise.all([
        API.murid.getAll(), 
        API.mentor.getAll()
      ]);

      if (muridRes.status === 'OK') {
        allData = (muridRes.data || []).sort((a, b) => a.id.localeCompare(b.id));
        isFetched = true; // Tandai bahwa data sudah sinkron dengan server
        
        renderTable(allData);
        updateSummary(allData);
      }
      
      if (mentorRes.status === 'OK') {
        populateMentorDropdown(mentorRes.data || []);
      }
    } catch (e) {
      console.error("Gagal update data:", e);
      // Jika memori kosong baru tampilkan error di tabel
      if (!allData || allData.length === 0) {
        tbody.innerHTML = '<tr><td colspan="8" class="empty-row">Gagal terhubung ke server.</td></tr>';
      }
    }
}

  function populateMentorDropdown(mentors) {
    const sel = document.getElementById('murid-mentor');
    if (!sel) return;
    sel.innerHTML = '<option value="">-- Pilih Mentor --</option>' +
      mentors.filter(m => m.status === 'AKTIF').map(m => `<option value="${m.nama}">${m.nama} (${m.program})</option>`).join('');
  }

  function updateSummary(data) {
    const el = document.getElementById('murid-count');
    if (el) el.textContent = 'Total: ' + data.length + ' murid';
  }

  function sortBy(col) {
    // Balik urutan jika kolom yang sama diklik lagi
    currentSort.asc = currentSort.col === col ? !currentSort.asc : true;
    currentSort.col = col;

    allData.sort((a, b) => {
      let valA = (a[col] || '').toString().toLowerCase();
      let valB = (b[col] || '').toString().toLowerCase();
      
      return currentSort.asc 
        ? valA.localeCompare(valB, undefined, { numeric: true }) 
        : valB.localeCompare(valA, undefined, { numeric: true });
    });

    renderTable(allData);
    updateSortIcons(col, currentSort.asc);
  }

  // 3. Fungsi untuk mengubah visual ikon
  function updateSortIcons(activeCol, isAsc) {
    // Reset semua ikon header ke default (up-down)
    document.querySelectorAll('th i[data-lucide]').forEach(icon => {
      icon.setAttribute('data-lucide', 'chevrons-up-down');
      icon.classList.remove('active-sort');
    });

    // Cari header yang aktif dan ganti ikonnya
    const activeHeader = document.querySelector(`th[onclick*="'${activeCol}'"] i`);
    if (activeHeader) {
      activeHeader.setAttribute('data-lucide', isAsc ? 'arrow-up-narrow' : 'arrow-down-wide');
      activeHeader.classList.add('active-sort');
    }
    
    // Render ulang ikon Lucide
    lucide.createIcons();
  }

  function renderTable(data) {
    const role = API.currentRole();
    const canEdit = role === 'ADMIN';
    const rows = data.map(m => {
    const color = m.jk === 'L' ? '#689bee' : '#e76fab';

    return `
      <tr>
        <td style="width:32px;">${Selection.checkbox('murid', m.id)}</td>
        <td><span class="id-badge">${m.id}</span></td>
        <td>
          <div class="name-cell">
            <span class="avatar-initial">${(m.nama || '?')[0].toUpperCase()}</span>
            <div>
              <strong>${m.nama}</strong>
              <small style="color: ${color}; font-weight: 500;">
               ${m.jk === 'L' ? '♂ Laki-laki' : '♀ Perempuan'}</small>
            </div>
          </div>
        </td>
        <td>${m.kelas || '-'}</td>
        <td><span class="program-tag">${m.program}</span></td>
        <td>${UI.formatDate(m.tgl_mulai)}</td>
        <td>${UI.statusBadge(m.status)}</td>
        <td>
          <div class="action-btns">
            <button class="btn-icon btn-info" onclick="MuridPage.viewSchedule('${m.id}','${m.nama}')" title="Jadwal">
              <i data-lucide="calendar"></i>
            </button>
            ${canEdit ? `
            <button class="btn-icon btn-warning" onclick="MuridPage.openEdit('${m.id}')" title="Edit">
              <i data-lucide="pencil"></i>
            </button>
            <button class="btn-icon btn-danger" onclick="MuridPage.deleteMurid('${m.id}','${m.nama}')" title="Hapus">
              <i data-lucide="trash-2"></i>
            </button>` : ''}
          </div>
        </td>
      </tr>`
      });

    UI.renderTable('murid-tbody', rows, 'Belum ada data murid');
    lucide.createIcons();
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
    document.getElementById('murid-modal-title').textContent = 'Tambah Murid Baru';
    document.getElementById('murid-id-field').value = '';
    renderDayCheckboxes();
    UI.openModal('modal-murid');
  }

  function renderDayCheckboxes() {
    const container = document.getElementById('day-checkboxes');
    if (!container) return;
    container.innerHTML = ''; 

    const timeSlots = [
      '08.30-09.00', '09.00-09.30', '09.30-10.00', '10.00-10.30', '10.30-11.00', 
      '11.00-11.30', '11.30-12.00', '12.00-12.30', '12.30-13.00', '13.00-13.30', 
      '13.30-14.00', '14.00-14.30', '14.30-15.00', '15.00-15.30', '15.30-16.00', 
      '16.00-16.30', '16.30-17.00', '17.00-17.30', '17.30-18.00', '18.00-18.30', 
      '18.30-19.00', '19.00-19.30'
    ];

    DAYS.forEach(day => {
      const dayVal = day.toUpperCase();
      const div = document.createElement('div');
      div.className = 'day-card';
      div.id = `card-${dayVal}`;
      
      let timeOptions = timeSlots.map(slot => `<option value="${slot}">${slot}</option>`).join('');

      div.innerHTML = `
        <label>
          <input type="checkbox" name="hari" value="${dayVal}" 
                 onchange="MuridPage.toggleTimeInput('${dayVal}')"> 
          <span>${dayVal}</span>
        </label>
        <select id="time-${dayVal}" class="time-select-card" style="display:none">
          <option value="">-- Jam --</option>
          ${timeOptions}
        </select>
      `;
      container.appendChild(div);
    });
  }


  function toggleTimeInput(day) {
    const cb = document.querySelector(`input[value="${day}"]`);
    const select = document.getElementById(`time-${day}`);
    const card = document.getElementById(`card-${day}`);
    
    if (select && card) {
      if (cb.checked) {
        select.style.display = 'block';
        card.classList.add('active');
      } else {
        select.style.display = 'none';
        card.classList.remove('active');
        select.value = "";
      }
    }
  }


async function openEdit(id) {

  const m = allData.find(x => x.id === id);
  if (!m) return;

  document.querySelectorAll('#day-checkboxes input[type="checkbox"]').forEach(cb => cb.checked = false);
  document.querySelectorAll('.time-input-container').forEach(div => div.style.display = 'none');
  document.querySelectorAll('.time-picker').forEach(input => input.value = '');
  document.getElementById('murid-modal-title').textContent = 'Edit Data Murid';
  document.getElementById('murid-id-field').value = m.id;
  document.getElementById('murid-nama').value     = m.nama;
  document.getElementById('murid-jk').value       = m.jk;
  document.getElementById('murid-kelas').value    = m.kelas;
  document.getElementById('murid-program').value  = m.program;
  document.getElementById('murid-tgl').value      = m.tgl_mulai;
  document.getElementById('murid-status').value   = m.status;

  renderDayCheckboxes(); 


  document.getElementById('murid-schedule-section').style.display = 'block';
  UI.openModal('modal-murid');


  API.jadwal.getByMurid(id).then(jadwalRes => {
    if (jadwalRes.status === 'OK' && jadwalRes.data.length > 0) {
      const hariSet = new Set(jadwalRes.data.map(j => j.hari));
      
      document.querySelectorAll('#day-checkboxes input[type="checkbox"]').forEach(cb => {
        const val = cb.value;
        if(hariSet.has(val)) {
          cb.checked = true;
          
          toggleTimeInput(val);
          const item = jadwalRes.data.find(j => j.hari === val);
          if(item) {
            const timeInput = document.getElementById(`time-${val}`);
            if (timeInput) timeInput.value = item.jam;
          }
        }
      });
    }
  }).catch(err => console.log("Jadwal gagal dimuat, tapi data murid aman."));
}

  function clearForm() {
    ['murid-nama','murid-jk','murid-kelas','murid-program','murid-tgl','murid-status','murid-mentor','murid-jam'].forEach(id => {
      const el = document.getElementById(id);
      if (el) el.value = '';
    });
    const status = document.getElementById('murid-status');
    if (status) status.value = 'AKTIF';
    document.getElementById('murid-schedule-section').style.display = 'block';
  }

async function saveForm() {
    const id      = document.getElementById('murid-id-field').value;
    const nama    = document.getElementById('murid-nama').value.trim();
    const jk      = document.getElementById('murid-jk').value;
    const kelas   = document.getElementById('murid-kelas').value.trim();
    const program = document.getElementById('murid-program').value.trim();
    const tgl     = document.getElementById('murid-tgl').value;
    const status  = document.getElementById('murid-status').value;

    if (!nama || !program) { 
        UI.toast('Nama dan program wajib diisi', 'error'); 
        return; 
    }

    const jadwalData = []
    // Ambil semua checkbox hari yang dicentang
    document.querySelectorAll('#day-checkboxes input[name="hari"]:checked').forEach(cb => {
        const day = cb.value; // Misal: SENIN
        // Cari elemen jam berdasarkan ID 'time-SENIN'
        const timeInput = document.getElementById(`time-${day}`);
        
        if (timeInput && timeInput.value) {
            jadwalData.push({ 
                hari: day, 
                jam: timeInput.value 
            });
        }
    });
    console.log("Data Jadwal yang siap dikirim:", jadwalData); // Cek di F12

    const payload = { nama, jk, kelas, program, tgl_mulai: tgl, status, jadwal: jadwalData };
    const btn = document.getElementById('murid-save-btn');

    if (btn) { 
        btn.disabled = true; 
        // --- LOADING DINAMIS ---
        btn.innerHTML = `<div class="spinner spinner-sm"></div> ${id ? 'Mengedit...' : 'Menambahkan...'}`; 
    }

    try {
        const res = id 
            ? await API.murid.update({ id, ...payload }) 
            : await API.murid.add(payload);

        if (res.status === 'OK') {
            UI.toast(id ? 'Data murid diperbarui' : 'Murid berhasil ditambahkan', 'success');
            UI.closeModal('modal-murid');

            lastAddedId = res.id;
            lastAction = 'ADD'; 
        
        const undoBtn = document.getElementById('undo-btn');
        if (undoBtn) undoBtn.disabled = false;
            
            // --- REFRESH DATA DENGAN JEDA (Penting!) ---
            setTimeout(() => {
                load(true); // Pakai load(true) agar menembus isFetched
            }, 800); 

        } else {
            UI.toast(res.message || 'Gagal menyimpan', 'error');
        }
    } catch(e) {
        UI.toast('Error: ' + e.message, 'error');
    } finally {
        if (btn) { 
            btn.disabled = false; 
            btn.innerHTML = '<i data-lucide="save"></i> Simpan'; 
            lucide.createIcons({ nodes: [btn] }); // Munculkan icon lagi
        }
    }
}

async function redo() {
    // Redo hanya jalan kalau ada aksi yang baru saja di-Undo
    if (!lastDeletedData || lastAction !== 'UNDO_DELETE') return;

    const redoBtn = document.getElementById('redo-btn');
    UI.toast(`Mengulang penambahan ${lastDeletedData.nama}...`, 'info');

    try {
      if (redoBtn) redoBtn.disabled = true;

      // Kirim lagi ke Sheets
      const res = await API.murid.add(lastDeletedData);

      if (res.status === 'OK') {
        UI.toast('Redo Berhasil: Data dipulihkan kembali!', 'success');
        lastAction = 'DELETE'; // Balikin status ke Delete agar bisa di-Undo lagi kalau mau
        
        const undoBtn = document.getElementById('undo-btn');
        if (undoBtn) undoBtn.disabled = false;
        if (redoBtn) redoBtn.disabled = true;

        isFetched = false;
        load();
      }
    } catch (e) {
      UI.toast('Gagal melakukan Redo', 'error');
      if (redoBtn) redoBtn.disabled = false;
    }
  }

async function undo() {
  // Cek apakah ada aksi terakhir (entah itu ADD atau DELETE)
  if (!lastAction) return;

  const undoBtn = document.getElementById('undo-btn');
  const redoBtn = document.getElementById('redo-btn');

  try {
    if (undoBtn) undoBtn.disabled = true;
    let res;

    // KONDISI A: Membatalkan Penghapusan (Kembalikan data)
    if (lastAction === 'DELETE' && lastDeletedData) {
      res = await API.murid.add(lastDeletedData);
      if (res.status === 'OK') {
        UI.toast('Undo Berhasil: Data dikembalikan!', 'success');
        lastAction = 'UNDO_DELETE'; // Tandai buat Redo
        if (redoBtn) redoBtn.disabled = false; 
      }
    } 
    
    // KONDISI B: Membatalkan Penambahan (Hapus kembali data baru)
    else if (lastAction === 'ADD' && lastAddedId) {
      res = await API.murid.delete(lastAddedId); // <--- lastAddedId TERPAKAI DI SINI
      if (res.status === 'OK') {
        UI.toast('Undo Berhasil: Pendaftaran dibatalkan!', 'warning');
        lastAction = null; // Biasanya tambah baru jarang di-redo, jadi kita reset
      }
    }

    // Refresh data dari Sheets
    isFetched = false;
    load(); 

  } catch (e) {
    console.error("Error Undo:", e);
    UI.toast('Gagal melakukan Undo', 'error');
    if (undoBtn) undoBtn.disabled = false;
  }
}

async function deleteMurid(id, nama) {
    // 1. Cari data lengkapnya dulu buat cadangan (Backup)
    const m = allData.find(x => x.id === id);
    if (!m) return;

    // 2. Konfirmasi Ketik Nama
    const verifikasi = prompt(`Ketik nama murid "${nama}" untuk mengonfirmasi penghapusan:`);
    if (verifikasi !== nama) {
      if (verifikasi !== null) UI.toast('Konfirmasi nama salah!', 'error');
      return;
    }

    // 3. Simpan data ke memori sebelum dihapus (Buat Undo)
    lastDeletedData = JSON.parse(JSON.stringify(m)); 
    lastAction = 'DELETE';

    const btn = document.querySelector(`button[onclick*="deleteMurid('${id}'"]`);
    const originalContent = btn ? btn.innerHTML : '';

    try {
      if (btn) {
        btn.disabled = true;
        btn.innerHTML = '<div class="spinner spinner-sm"></div>';
        btn.style.width = '40px';
      }

      const res = await API.murid.delete(id);

      if (res.status === 'OK') {
        UI.toast(`Data "${nama}" berhasil dihapus. Salah klik? Klik tombol Undo di atas!`, 'warning');
        
        // Update tampilan secara instan (tanpa reload full dulu)
        allData = allData.filter(x => x.id !== id);
        renderTable(allData);
        
        // Aktifkan tombol Undo di UI (jika kamu punya tombolnya)
        const undoBtn = document.getElementById('undo-btn');
        if (undoBtn) undoBtn.disabled = false;

      } else {
        UI.toast(res.message || 'Gagal menghapus', 'error');
        if (btn) { btn.disabled = false; btn.innerHTML = originalContent; }
      }
    } catch (e) {
      console.error(e);
      UI.toast('Gagal terhubung ke server', 'error');
      if (btn) { btn.disabled = false; btn.innerHTML = originalContent; }
    }
  }

  // FUNGSI UNDO (Kirim balik data ke Sheets)
  async function undo() {
    if (!lastAction || !lastDeletedData) return;

    const undoBtn = document.getElementById('undo-btn');
    UI.toast(`Mengembalikan data ${lastDeletedData.nama}...`, 'info');

    try {
      if (undoBtn) undoBtn.disabled = true;

      let res;
      if (lastAction === 'DELETE') {
        // Panggil fungsi ADD kembali dengan data yang tadi disimpan
        res = await API.murid.add(lastDeletedData);
      }

      if (res.status === 'OK') {
        UI.toast('Data berhasil dipulihkan ke database!', 'success');
        lastAction = null;
        lastDeletedData = null;
        
        // Refresh data dari Sheets agar sinkron
        isFetched = false;
        load(); 
      }
    } catch (e) {
      UI.toast('Gagal memulihkan data', 'error');
      if (undoBtn) undoBtn.disabled = false;
    }
  }

  async function deleteAll() {
    const total = allData.length;
    if (total === 0) return UI.toast('Tidak ada data untuk dihapus', 'info');

    // Pengamanan 1: Konfirmasi Biasa
    if (!confirm(`PERINGATAN! Kamu akan menghapus SEMUA (${total}) data murid beserta jadwalnya.`)) return;

    // Pengamanan 2: Ketik Kata Kunci (Hard Confirmation)
    const konfirmasi = prompt("Tindakan ini permanen! Ketik 'HAPUS SEMUA MURID' untuk melanjutkan:");
    
    if (konfirmasi !== 'HAPUS SEMUA MURID') {
      UI.toast('Penghapusan massal dibatalkan.', 'error');
      return;
    }

    UI.toast('Sedang membersihkan database...', 'info');

    try {
      // Kamu harus buat fungsi API.murid.deleteAll di script API kamu
      const res = await API.murid.deleteAll(); 

      if (res.status === 'OK') {
        UI.toast('Seluruh data berhasil dihapus!', 'success');
        allData = [];
        isFetched = false;
        load();
      }
    } catch (e) {
      UI.toast('Gagal menghapus semua data', 'error');
    }
  }

async function viewSchedule(id, nama) {
  const list = document.getElementById('schedule-detail-list');

  document.getElementById('schedule-modal-title').textContent = 'Jadwal: ' + nama;
  list.innerHTML = '<div class="empty-feed">Memuat jadwal...</div>';
  UI.openModal('modal-schedule');

  try {
    const res = await API.jadwal.getByMurid(id);

    if (res.status !== 'OK' || res.data.length === 0) {
      list.innerHTML = '<div class="empty-feed">Tidak ada jadwal terdaftar</div>';
    } else {
      // --- TAMBAHAN: FILTER BIAR GAK DOBEL DI TAMPILAN ---
      const seen = new Set();
      const uniqueData = res.data.filter(j => {
        const key = `${j.hari}-${j.jam}`;
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      });

      list.innerHTML = uniqueData.map(j => `
        <div class="schedule-row">
          <span><strong>${j.hari}</strong></span>
          <span>${j.jam}</span>
        </div>
      `).join('');
    }
  } catch(e) {
    list.innerHTML = '<div class="empty-feed">Gagal memuat jadwal</div>';
  }
}

  function deleteSelected() { return Selection.deleteSelected('murid'); }
  function _getCurrentData() { return allData; }
  return { load, search, openAdd, openEdit, saveForm, deleteMurid, renderDayCheckboxes, toggleTimeInput, viewSchedule, undo, redo, deleteAll, sortBy, deleteSelected, renderTable, _getCurrentData };
})();