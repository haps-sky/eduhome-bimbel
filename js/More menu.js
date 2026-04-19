const MoreMenu = (() => {
  let _activeKey = null;

  const MENUS = {
    murid:    { refresh: () => MuridPage.load(true),       undo: () => MuridPage.undo(),       redo: () => MuridPage.redo(),       del: () => MuridPage.deleteSelected()       },
    mentor:   { refresh: () => MentorPage.load(true),      undo: () => MentorPage.undo(),      redo: () => MentorPage.redo(),      del: () => MentorPage.deleteSelected()      },
    presensi: { refresh: () => PresensiPage.load(true),    undo: () => PresensiPage.undo(),    redo: () => PresensiPage.redo(),    del: () => PresensiPage.deleteSelected()    },
    pay:      { refresh: () => PembayaranPage.load(true),  undo: () => PembayaranPage.undo(),  redo: () => PembayaranPage.redo(),  del: () => PembayaranPage.deleteSelected()  },
    ops:      { refresh: () => OperasionalPage.load(true), undo: () => OperasionalPage.undo(), redo: () => OperasionalPage.redo(), del: () => OperasionalPage.deleteSelected() },
    spp:      { refresh: () => SPPPage.load(true),         undo: () => SPPPage.undo(),         redo: () => SPPPage.redo(),         del: () => SPPPage.deleteSelected()         },
    buku:     { refresh: () => BukuPage.load(true),        undo: () => BukuPage.undo(),        redo: () => BukuPage.redo(),        del: () => BukuPage.deleteSelected()        },
    gaji:     { refresh: () => GajiPage.load(true),        undo: () => GajiPage.undo(),        redo: () => GajiPage.redo(),        del: () => GajiPage.deleteSelected()        },
  };

  function toggle(key, btnEl) {
    if (_activeKey === key) { _close(); return; }
    _close();
    _activeKey = key;

    const cfg  = MENUS[key];
    const menu = document.getElementById('global-more-menu');
    if (!menu || !cfg) return;

    menu.innerHTML = `
      <button class="ctrl-more-item" data-action="refresh">
        <i data-lucide="refresh-cw"></i> Refresh
      </button>
      <button class="ctrl-more-item" data-action="undo">
        <i data-lucide="undo-2"></i> Undo
      </button>
      <button class="ctrl-more-item" data-action="redo">
        <i data-lucide="redo-2"></i> Redo
      </button>
      <div class="ctrl-more-divider"></div>
      <button class="ctrl-more-item danger" data-action="del">
        <i data-lucide="trash-2"></i> Hapus Terpilih
      </button>`;

    lucide.createIcons({ nodes: [menu] });

    menu.querySelectorAll('[data-action]').forEach(btn => {
      btn.addEventListener('click', () => {
        const action = btn.dataset.action;
        _close();
        if (typeof cfg[action] === 'function') {
          cfg[action]();
        } else {
          console.warn(`MoreMenu: action "${action}" untuk key "${key}" tidak terdaftar.`);
        }
      });
    });

    const rect  = btnEl.getBoundingClientRect();
    const menuW = 176;
    let   left  = rect.right - menuW;
    if (left < 8) left = 8;

    menu.style.display  = 'block';
    menu.style.top      = (rect.bottom + 6) + 'px';
    menu.style.left     = left + 'px';
    menu.style.minWidth = menuW + 'px';
  }

  function _close() {
    const menu = document.getElementById('global-more-menu');
    if (menu) menu.style.display = 'none';
    _activeKey = null;
  }

  function close() { _close(); }

  document.addEventListener('click', e => {
    if (!e.target.closest('#global-more-menu') && !e.target.closest('.ctrl-more-btn')) _close();
  });

  window.addEventListener('scroll', _close, true);

  return { toggle, close };
})();