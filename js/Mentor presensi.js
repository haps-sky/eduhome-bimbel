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
