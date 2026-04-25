const MentorPresensiPage = (() => {
  let myStudents  = [];
  let myPresensi  = [];
  let _submitting = false;

  async function load() {
    const user       = API.currentUser();
    const mentorName = user.username || '';
    const today      = new Date().toISOString().split('T')[0];

    try {
      const [studRes, presRes] = await Promise.all([
        API.mentor.getMyStudents(mentorName),
        API.presensi.getAll()
      ]);
      myStudents = studRes.data || [];
      myPresensi = presRes.data || [];
      populateStudentDropdown(myStudents);
      const myToday = myPresensi.filter(p => p.nama_mentor === mentorName && p.tanggal === today);
      renderTodayLog(myToday);
      document.getElementById('mentor-presensi-tanggal').value = today;
    } catch(e) { UI.toast('Error: ' + e.message, 'error'); }
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
    if (_submitting) return;

    const user      = API.currentUser();
    const tanggal   = document.getElementById('mentor-presensi-tanggal').value;
    const muridSel  = document.getElementById('mentor-presensi-murid');
    const status    = document.getElementById('mentor-presensi-status').value;
    const bintang   = document.getElementById('mentor-presensi-bintang').value;
    const catatan   = document.getElementById('mentor-presensi-catatan').value;

    if (!tanggal || !muridSel.value) { UI.toast('Tanggal dan murid wajib diisi', 'error'); return; }

    const duplikat = myPresensi.find(p =>
      p.id_murid === muridSel.value &&
      p.tanggal  === tanggal &&
      p.nama_mentor === (user.username || '')
    );
    if (duplikat) {
      UI.toast(`Presensi untuk murid ini pada ${tanggal} sudah dicatat.`, 'error');
      return;
    }

    const opt     = muridSel.options[muridSel.selectedIndex];
    const payload = {
      tanggal,
      id_murid:    muridSel.value,
      nama_murid:  opt.dataset.nama,
      id_mentor:   user.mentor_id || '',
      nama_mentor: user.username,
      program:     opt.dataset.program,
      status,
      catatan,
      bintang:     parseInt(bintang) || 0
    };

    const btn = document.querySelector('#modal-mentor-presensi .btn-primary');
    _submitting = true;
    if (btn) { btn.disabled = true; btn.innerHTML = '<div class="spinner spinner-sm"></div> Menyimpan...'; }

    try {
      const res = await API.presensi.add(payload);
      if (res.status === 'OK') {
        UI.toast('Presensi berhasil dicatat', 'success');
        UI.closeModal('modal-mentor-presensi');
        load();
      } else {
        UI.toast(res.message || 'Gagal mencatat presensi', 'error');
      }
    } catch(e) {
      UI.toast('Gagal terhubung ke server', 'error');
    } finally {
      _submitting = false;
      if (btn) { btn.disabled = false; btn.innerHTML = '<i data-lucide="save"></i> Simpan Presensi'; lucide.createIcons({ nodes: [btn] }); }
    }
  }

  return { load, saveForm };
})();

window.MentorPresensiPage = MentorPresensiPage;
