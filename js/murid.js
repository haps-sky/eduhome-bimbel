const MuridPage = (() => {
  let allData = [];
  const DAYS = ['Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu', 'Minggu'];

  async function load() {
    try {
      const [muridRes, mentorRes] = await Promise.all([API.murid.getAll(), API.mentor.getAll()]);
      if (muridRes.status !== 'OK') { UI.toast('Gagal memuat data murid', 'error'); return; }
      allData = muridRes.data || [];
      renderTable(allData);
      populateMentorDropdown(mentorRes.data || []);
      updateSummary(allData);
    } catch(e) {
      UI.toast('Error: ' + e.message, 'error');
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
    const res = await API.murid.getById(id);
    if (res.status !== 'OK') return;
    const m = res.data;

    document.getElementById('murid-modal-title').textContent = 'Edit Data Murid';
    document.getElementById('murid-id-field').value = m.id;
    document.getElementById('murid-nama').value     = m.nama;
    document.getElementById('murid-jk').value       = m.jk;
    document.getElementById('murid-kelas').value    = m.kelas;
    document.getElementById('murid-program').value  = m.program;
    document.getElementById('murid-tgl').value      = m.tgl_mulai;
    document.getElementById('murid-status').value   = m.status;

    renderDayCheckboxes(); 

    const jadwalRes = await API.jadwal.getByMurid(id);
    if (jadwalRes.status === 'OK' && jadwalRes.data.length > 0) {
        const hariSet = new Set(jadwalRes.data.map(j => j.hari));
        
        document.querySelectorAll('#day-checkboxes input[type="checkbox"]').forEach(cb => {
            const val = cb.value;
            if(hariSet.has(val)) {
                cb.checked = true;
                toggleTimeInput(val);
                const item = jadwalRes.data.find(j => j.hari === val);
                if(item) document.getElementById(`time-${val}`).value = item.jam;
            }
        });
    }

    document.getElementById('murid-schedule-section').style.display = 'block';
    UI.openModal('modal-murid');
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
    if (btn) { btn.disabled = true; btn.textContent = 'Menyimpan...'; }

    try {
      let res; 
      if (id) {
        res = await API.murid.update({ id, ...payload });
      } else {
        res = await API.murid.add(payload);
      }

      if (res.status === 'OK') {
        UI.toast(id ? 'Data murid diperbarui' : 'Murid berhasil ditambahkan', 'success');
        UI.closeModal('modal-murid');
        load();
      } else {
        UI.toast(res.message || 'Gagal menyimpan', 'error');
      }
    } catch(e) {
      UI.toast('Error: ' + e.message, 'error');
    } finally {
      if (btn) { btn.disabled = false; btn.textContent = 'Simpan'; }
    }
  }

  async function deleteMurid(id, nama) {
    if (!confirm(`Hapus murid "${nama}"?`)) return;
    const res = await API.murid.delete(id);
    if (res.status === 'OK') { UI.toast('Murid dihapus', 'success'); load(); }
  }

  async function viewSchedule(id, nama) {
    const res = await API.jadwal.getByMurid(id);
    const list = document.getElementById('schedule-detail-list');
    document.getElementById('schedule-modal-title').textContent = 'Jadwal: ' + nama;
    if (res.status !== 'OK' || res.data.length === 0) {
      list.innerHTML = '<div class="empty-feed">Tidak ada jadwal terdaftar</div>';
    } else {
      list.innerHTML = res.data.map(j => `<div class="schedule-row"><span>${j.hari}</span> <span>${j.jam}</span></div>`).join('');
    }
    UI.openModal('modal-schedule');
  }

  return { load, search, openAdd, openEdit, saveForm, deleteMurid, renderDayCheckboxes, toggleTimeInput, viewSchedule };
})();