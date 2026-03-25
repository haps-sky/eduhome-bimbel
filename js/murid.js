  const MuridPage = (() => {
    const DAYS = ['SENIN', 'SELASA', 'RABU', 'KAMIS', 'JUMAT', 'SABTU', 'MINGGU'];

  let allData = [];
  let isFetched = false;

  async function load() {
    const tbody = document.getElementById('murid-tbody');
    if (!tbody) return;

    if (isFetched) {
      renderTable(allData);
      updateSummary(allData);
      return;
    }

    tbody.innerHTML = '<tr><td colspan="8" class="empty-row"><div class="spinner"></div> Memuat data murid...</td></tr>';

    try {
      const [muridRes, mentorRes] = await Promise.all([
        API.murid.getAll(), 
        API.mentor.getAll()
      ]);

      if (muridRes.status === 'OK') {
      allData = (muridRes.data || []).sort((a, b) => a.id.localeCompare(b.id));
      isFetched = true;
        
        renderTable(allData);
        updateSummary(allData);
      }
    } catch (e) {
      console.error("Error Load Murid:", e);
      tbody.innerHTML = '<tr><td colspan="8" class="empty-row">Gagal memuat data murid.</td></tr>';
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

  function renderTable(data) {
    const role = API.currentRole();
    const canEdit = role === 'ADMIN';
    const rows = data.map(m => `
      <tr>
        <td><span class="id-badge">${m.id}</span></td>
        <td>
          <div class="name-cell">
            <span class="avatar-initial">${(m.nama || '?')[0].toUpperCase()}</span>
            <div>
              <strong>${m.nama}</strong>
              <small>${m.jk === 'L' ? '♂ Laki-laki' : '♀ Perempuan'}</small>
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
      </tr>`);
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
    ['murid-nama','murid-jk','murid-kelas','murid-program','murid-tgl','murid-mentor','murid-jam'].forEach(id => {
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

    // Ambil Data Jadwal (Sudah benar!)
    const jadwalData = [];
    document.querySelectorAll('#day-checkboxes input[name="hari"]:checked').forEach(cb => {
      const day = cb.value;
      const timeSelect = document.getElementById(`time-${day}`);
      if (timeSelect && timeSelect.value) {
        jadwalData.push({ hari: day, jam: timeSelect.value });
      }
    });

    const payload = { 
      nama, jk, kelas, program, 
      tgl_mulai: tgl, 
      status,
      jadwal: jadwalData 
    };

    const btn = document.getElementById('murid-save-btn');

    try {
      if (btn) { 
        btn.disabled = true; 
        // --- 1. TEKS TOMBOL DINAMIS SESUAI STATUS ID ---
        btn.innerHTML = id ? 
            '<div class="spinner"></div> Mengedit data...' : 
            '<div class="spinner"></div> Menambahkan data...'; 
      }

      // Gunakan ternary operator biar lebih ringkas (Sesuai gaya Master Template)
      const res = id ? await API.murid.update({ id, ...payload }) : await API.murid.add(payload);

      if (res.status === 'OK') {
        const pesanSukses = id ? 'Data murid berhasil diperbarui' : 'Murid baru berhasil ditambahkan';
        UI.toast(pesanSukses, 'success');
        
        UI.closeModal('modal-murid');
        
        allData = []; 
        isFetched = false; //
        load(); 
      } else {
        UI.toast(res.message || 'Gagal menyimpan', 'error');
      }
    } catch(e) {
      console.error(e);
      UI.toast('Terjadi kesalahan koneksi', 'error');
    } finally {
      if (btn) { 
        btn.disabled = false; 
        btn.innerHTML = 'Simpan'; 
      }
    }
}

async function deleteMurid(id, nama) {

  if (!confirm(`Hapus murid "${nama}"?`)) return;

  const btn = event.target.closest('button');
  const oldHTML = btn.innerHTML;

  // loading hanya di tombol
  btn.innerHTML = 'Menghapus...';
  btn.disabled = true;

  try {

    const res = await API.murid.delete(id);

    if (res.status === 'OK') {
      UI.toast('Murid berhasil dihapus', 'success');
      load();
    } else {
      UI.toast('Gagal menghapus', 'error');
      btn.innerHTML = oldHTML;
      btn.disabled = false;
    }

  } catch (e) {
    UI.toast('Error: ' + e.message, 'error');
    btn.innerHTML = oldHTML;
    btn.disabled = false;
  }
}

async function viewSchedule(id, nama) {

  const list = document.getElementById('schedule-detail-list');

  // 1. buka modal langsung
  document.getElementById('schedule-modal-title').textContent = 'Jadwal: ' + nama;
  list.innerHTML = '<div class="empty-feed">Memuat jadwal...</div>';
  UI.openModal('modal-schedule');

  try {
    // 2. baru ambil data di background
    const res = await API.jadwal.getByMurid(id);

    if (res.status !== 'OK' || res.data.length === 0) {
      list.innerHTML = '<div class="empty-feed">Tidak ada jadwal terdaftar</div>';
    } else {
      list.innerHTML = res.data.map(j => `
        <div class="schedule-row">
          <span>${j.hari}</span>
          <span>${j.jam}</span>
        </div>
      `).join('');
    }

  } catch(e) {
    list.innerHTML = '<div class="empty-feed">Gagal memuat jadwal</div>';
  }
}

  return { load, search, openAdd, openEdit, saveForm, deleteMurid, renderDayCheckboxes, toggleTimeInput, viewSchedule };
})();