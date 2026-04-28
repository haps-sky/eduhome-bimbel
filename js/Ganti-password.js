const GantiPasswordPage = (() => {

  function load() {
    // reset form saat halaman dibuka
    ['gp-old', 'gp-new', 'gp-confirm'].forEach(id => {
      const el = document.getElementById(id);
      if (el) el.value = '';
    });
    const msg = document.getElementById('gp-msg');
    if (msg) { msg.textContent = ''; msg.className = 'gp-msg'; }
  }

  function togglePass(id) {
    const el = document.getElementById(id);
    if (!el) return;
    el.type = el.type === 'password' ? 'text' : 'password';
    const icon = document.querySelector(`[data-toggle="${id}"] i`);
    if (icon) {
      icon.setAttribute('data-lucide', el.type === 'password' ? 'eye' : 'eye-off');
      lucide.createIcons({ nodes: [icon.parentNode] });
    }
  }

  async function saveForm() {
    const oldPass = document.getElementById('gp-old')?.value;
    const newPass = document.getElementById('gp-new')?.value;
    const confirm = document.getElementById('gp-confirm')?.value;
    const msg     = document.getElementById('gp-msg');
    const btn     = document.getElementById('gp-btn');

    const showMsg = (text, type) => {
      if (!msg) return;
      msg.textContent = text;
      msg.className   = `gp-msg ${type}`;
    };

    if (!oldPass || !newPass || !confirm) return showMsg('Semua field wajib diisi.', 'error');
    if (newPass.length < 6)               return showMsg('Password baru minimal 6 karakter.', 'error');
    if (newPass !== confirm)              return showMsg('Konfirmasi password tidak sesuai.', 'error');
    if (oldPass === newPass)              return showMsg('Password baru tidak boleh sama dengan yang lama.', 'error');

    try {
      if (btn) { btn.disabled = true; btn.innerHTML = '<div class="spinner spinner-sm"></div> Menyimpan...'; }
      const res = await API.auth.changePassword(oldPass, newPass);
      if (res.status === 'OK') {
        showMsg('Password berhasil diperbarui.', 'success');
        ['gp-old', 'gp-new', 'gp-confirm'].forEach(id => {
          const el = document.getElementById(id);
          if (el) el.value = '';
        });
      } else {
        showMsg(res.message || 'Gagal memperbarui password.', 'error');
      }
    } catch(e) {
      showMsg('Gagal terhubung ke server.', 'error');
    } finally {
      if (btn) { btn.disabled = false; btn.innerHTML = '<i data-lucide="save"></i> Simpan Password'; lucide.createIcons({ nodes: [btn] }); }
    }
  }

  return { load, togglePass, saveForm };
})();

window.GantiPasswordPage = GantiPasswordPage;