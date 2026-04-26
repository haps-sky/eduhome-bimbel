const LaporanBulananPage = (() => {
  let _lastData   = null;
  let _ownerPct   = 65;
  let _savingsPct = 15;
  let _activeTab  = 'pemasukan';

  async function load(month, year) {
    const now = new Date();
    month = month || (now.getMonth() + 1);
    year  = year  || now.getFullYear();

    _setLoadingState(true);

    try {
      const res = await API.laporan.getBulanan(month, year, _ownerPct, _savingsPct);
      console.log('DATA LAPORAN:', res);

      if (res.status !== 'OK') {
        UI.toast(res.message || 'Gagal memuat laporan', 'error');
        _renderFullEmpty(month, year);
        return;
      }

      _lastData = res.data;
      _render(res.data, month, year);

    } catch(e) {
      console.error('LaporanBulanan load error:', e);
      UI.toast('Gagal terhubung ke server', 'error');
      _renderFullEmpty(month, year);
    } finally {
      _setLoadingState(false);
    }
  }

  function _render(d, month, year) {
    if (!d) { _renderFullEmpty(month, year); return; }

    const _month = d.month
      || month
      || parseInt(document.getElementById('laporan-month-select')?.value)
      || (new Date().getMonth() + 1);
    const _year = d.year
      || year
      || parseInt(document.getElementById('laporan-year-select')?.value)
      || new Date().getFullYear();

    const monthNames = ['','Januari','Februari','Maret','April','Mei','Juni',
                        'Juli','Agustus','September','Oktober','November','Desember'];

    const periodEl = document.getElementById('laporan-period-label');
    if (periodEl) periodEl.textContent = `${monthNames[_month] || '-'} ${_year}`;

    // ── Revenue ───────────────────────────────────────────────────────────────
    _setVal('laporan-rev-spp',         d.revenue?.spp);
    _setVal('laporan-rev-buku',        d.revenue?.buku);
    _setVal('laporan-rev-pendaftaran', d.revenue?.pendaftaran);
    _setVal('laporan-rev-lain',        d.revenue?.lain);
    _setVal('laporan-rev-total',       d.revenue?.total);

    // ── Expense ───────────────────────────────────────────────────────────────
    _setVal('laporan-exp-gaji',        d.expense?.gaji);
    _setVal('laporan-exp-buku',        d.expense?.buku);
    _setVal('laporan-exp-operasional', d.expense?.operasional);
    _setVal('laporan-exp-total',       d.expense?.total);

    // ── Net Profit ────────────────────────────────────────────────────────────
    const net   = d.net_profit ?? 0;
    const netEl = document.getElementById('laporan-net-profit');
    if (netEl) {
      netEl.textContent = UI.formatCurrency(net);
      netEl.className   = net >= 0 ? 'laporan-value profit-positive' : 'laporan-value profit-negative';
    }

    // ── Distribution ──────────────────────────────────────────────────────────
    _setVal('laporan-dist-owner',   d.distribution?.owner);
    _setVal('laporan-dist-savings', d.distribution?.savings);

    const pctOwnerEl = document.getElementById('laporan-owner-pct-display');
    if (pctOwnerEl) pctOwnerEl.textContent = `${d.distribution?.owner_pct ?? _ownerPct}%`;
    const pctSavEl = document.getElementById('laporan-savings-pct-display');
    if (pctSavEl) pctSavEl.textContent = `${d.distribution?.savings_pct ?? _savingsPct}%`;

    // ── Meta ──────────────────────────────────────────────────────────────────
    const meta   = d.meta || {};
    const metaEl = document.getElementById('laporan-meta');
    if (metaEl) {
      const masuk  = meta.total_transaksi_masuk  ?? 0;
      const keluar = meta.total_transaksi_keluar ?? 0;
      const gaji   = meta.total_gaji_records     ?? 0;
      metaEl.textContent = `${masuk} transaksi masuk · ${keluar} transaksi keluar · ${gaji} catatan gaji`;
    }

    // ── Empty state banner ────────────────────────────────────────────────────
    _renderEmptyBanner(d, _month, _year);

    // ── Profit indicator ──────────────────────────────────────────────────────
    _renderProfitIndicator(d);

    // ── Tab detail (Pemasukan / Pengeluaran) ──────────────────────────────────
    _renderTabUI();
    _renderActiveTab(d);
  }

  // ── Loading state ─────────────────────────────────────────────────────────
  function _setLoadingState(loading) {
    const tbody    = document.getElementById('laporan-gaji-tbody');
    const bannerEl = document.getElementById('laporan-empty-banner');

    if (loading) {
      if (tbody) {
        tbody.innerHTML = `
          <tr>
            <td colspan="6" style="text-align:center;padding:24px;color:#888">
              <span style="display:inline-flex;align-items:center;gap:8px">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                  stroke-width="2" style="animation:spin 1s linear infinite">
                  <path d="M21 12a9 9 0 1 1-6.219-8.56"/>
                </svg>
                Memuat laporan...
              </span>
            </td>
          </tr>`;
      }
      if (bannerEl) bannerEl.style.display = 'none';
    }
    // Saat false: tabel akan diisi oleh _renderActiveTab atau _renderFullEmpty
  }

  // ── Empty state banner ────────────────────────────────────────────────────
  function _renderEmptyBanner(d, month, year) {
    const bannerEl = document.getElementById('laporan-empty-banner');
    if (!bannerEl) return;

    const revTotal = d.revenue?.total  ?? 0;
    const expTotal = d.expense?.total  ?? 0;
    const isEmpty  = revTotal === 0 && expTotal === 0;

    const monthNames = ['','Januari','Februari','Maret','April','Mei','Juni',
                        'Juli','Agustus','September','Oktober','November','Desember'];

    if (isEmpty) {
      bannerEl.style.display = 'flex';
      bannerEl.innerHTML = `
        <div style="
          display:flex; align-items:center; gap:12px;
          background:var(--bg-secondary,#f8f9fa);
          border:1px solid var(--border,#e0e0e0);
          border-left:4px solid var(--warning,#f59e0b);
          border-radius:8px; padding:14px 18px;
          color:var(--text-secondary,#666); font-size:0.875rem;
        ">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--warning,#f59e0b)"
            stroke-width="2" style="flex-shrink:0">
            <circle cx="12" cy="12" r="10"/>
            <line x1="12" y1="8" x2="12" y2="12"/>
            <line x1="12" y1="16" x2="12.01" y2="16"/>
          </svg>
          <span>
            Belum ada transaksi pada
            <strong>${monthNames[month] || '-'} ${year}</strong>.
            Semua nilai ditampilkan sebagai <strong>Rp 0</strong>.
          </span>
        </div>`;
    } else {
      bannerEl.style.display = 'none';
      bannerEl.innerHTML = '';
    }
  }

  // ── Full empty ────────────────────────────────────────────────────────────
  function _renderFullEmpty(month, year) {
    const now    = new Date();
    const _month = month || (now.getMonth() + 1);
    const _year  = year  || now.getFullYear();

    _setVal('laporan-rev-spp', 0);         _setVal('laporan-rev-buku', 0);
    _setVal('laporan-rev-pendaftaran', 0); _setVal('laporan-rev-lain', 0);
    _setVal('laporan-rev-total', 0);

    _setVal('laporan-exp-gaji', 0);        _setVal('laporan-exp-buku', 0);
    _setVal('laporan-exp-operasional', 0); _setVal('laporan-exp-total', 0);
    _setVal('laporan-dist-owner', 0);      _setVal('laporan-dist-savings', 0);

    const netEl = document.getElementById('laporan-net-profit');
    if (netEl) { netEl.textContent = UI.formatCurrency(0); netEl.className = 'laporan-value profit-positive'; }

    const metaEl = document.getElementById('laporan-meta');
    if (metaEl) metaEl.textContent = '0 transaksi masuk · 0 transaksi keluar · 0 catatan gaji';

    const tbody = document.getElementById('laporan-gaji-tbody');
    if (tbody) {
      tbody.innerHTML = `
        <tr>
          <td colspan="6" style="text-align:center;padding:24px;color:#888">
            Belum ada data untuk periode ini
          </td>
        </tr>`;
    }

    const bar = document.getElementById('laporan-profit-bar');
    if (bar) {
      bar.innerHTML = `
        <div style="margin-top:8px;height:8px;background:var(--border,#e0e0e0);border-radius:4px;"></div>
        <div style="display:flex;justify-content:space-between;font-size:0.75rem;
                    color:var(--text-secondary,#999);margin-top:4px;">
          <span>Belum ada data</span><span>—</span>
        </div>`;
    }

    _renderEmptyBanner({ revenue: { total: 0 }, expense: { total: 0 } }, _month, _year);
  }

  // ── Tab UI (inject sekali, idempoten) ─────────────────────────────────────
  function _renderTabUI() {
    const container = document.getElementById('laporan-gaji-tbody')?.closest('.card');
    if (!container) return;
    if (container.querySelector('.laporan-tab-bar')) return;

    const headerTitle = container.querySelector('.card-title');
    if (headerTitle) headerTitle.innerHTML = '<i data-lucide="list"></i> Detail Transaksi Bulan Ini';

    const tableEl = container.querySelector('table');
    if (!tableEl) return;

    const tabBar = document.createElement('div');
    tabBar.className  = 'laporan-tab-bar';
    tabBar.style.cssText = 'display:flex;gap:8px;margin-bottom:12px;border-bottom:1px solid var(--border);padding-bottom:0;';
    tabBar.innerHTML = `
      <button id="tab-btn-pemasukan" onclick="LaporanBulananPage.switchTab('pemasukan')"
        style="padding:8px 16px;border:none;background:none;cursor:pointer;font-size:0.85rem;font-weight:600;
               color:var(--success);border-bottom:2px solid var(--success);margin-bottom:-1px;">
        ↑ Pemasukan
      </button>
      <button id="tab-btn-pengeluaran" onclick="LaporanBulananPage.switchTab('pengeluaran')"
        style="padding:8px 16px;border:none;background:none;cursor:pointer;font-size:0.85rem;font-weight:500;
               color:var(--text-secondary);border-bottom:2px solid transparent;margin-bottom:-1px;">
        ↓ Pengeluaran
      </button>`;
    // HTML laporan tidak pakai .card-body — wrapper table adalah div[style*=overflow]
    // Gunakan parentNode dari tableEl sebagai target insert
    const tableWrapper = tableEl.parentNode;
    tableWrapper.insertBefore(tabBar, tableEl);

    const thead = tableEl.querySelector('thead');
    if (thead) {
      thead.innerHTML = `
        <tr>
          <th>Tanggal</th><th>Nama</th><th>Jenis</th>
          <th>Keterangan</th><th>Jumlah</th><th>Metode</th>
        </tr>`;
    }

    if (window.lucide) lucide.createIcons({ nodes: [container] });
  }

  function switchTab(tab) {
    _activeTab = tab;
    const btnMasuk  = document.getElementById('tab-btn-pemasukan');
    const btnKeluar = document.getElementById('tab-btn-pengeluaran');
    if (btnMasuk) {
      btnMasuk.style.color        = tab === 'pemasukan' ? 'var(--success)' : 'var(--text-secondary)';
      btnMasuk.style.borderBottom = tab === 'pemasukan' ? '2px solid var(--success)' : '2px solid transparent';
      btnMasuk.style.fontWeight   = tab === 'pemasukan' ? '600' : '500';
    }
    if (btnKeluar) {
      btnKeluar.style.color        = tab === 'pengeluaran' ? 'var(--danger)' : 'var(--text-secondary)';
      btnKeluar.style.borderBottom = tab === 'pengeluaran' ? '2px solid var(--danger)' : '2px solid transparent';
      btnKeluar.style.fontWeight   = tab === 'pengeluaran' ? '600' : '500';
    }
    if (_lastData) _renderActiveTab(_lastData);
  }

  function _renderActiveTab(d) {
    if (_activeTab === 'pemasukan') {
      _renderDetailTable(d.detail?.pemasukan || [], 'masuk');
    } else {
      _renderDetailTable(d.detail?.pengeluaran || [], 'keluar');
    }
  }

  function _renderDetailTable(list, arah) {
    const tbody = document.getElementById('laporan-gaji-tbody');
    if (!tbody) return;

    if (!list || !list.length) {
      tbody.innerHTML = `
        <tr>
          <td colspan="6" style="text-align:center;padding:24px;color:var(--text-secondary)">
            Tidak ada ${arah === 'masuk' ? 'pemasukan' : 'pengeluaran'} bulan ini
          </td>
        </tr>`;
      return;
    }

    tbody.innerHTML = list.map(item => {
      const isGaji    = item.kategori === 'gaji';
      const warna     = arah === 'masuk' ? 'var(--success)' : 'var(--danger)';
      const jenisHtml = isGaji
        ? `<span style="background:var(--warning-dim,#fff3cd);color:var(--warning,#856404);
                        padding:2px 8px;border-radius:99px;font-size:0.75rem;font-weight:600;">GAJI</span>`
        : `<span style="background:var(--bg-hover);padding:2px 8px;border-radius:99px;
                        font-size:0.75rem;">${item.jenis || '-'}</span>`;
      return `
        <tr>
          <td style="font-size:0.82rem;white-space:nowrap;">${item.tanggal ? UI.formatDate(item.tanggal) : '-'}</td>
          <td><strong>${item.nama || '-'}</strong></td>
          <td>${jenisHtml}</td>
          <td style="font-size:0.82rem;color:var(--text-secondary);max-width:200px;word-break:break-word;">${item.keterangan || '-'}</td>
          <td style="font-weight:600;color:${warna};white-space:nowrap;">${UI.formatCurrency(item.jumlah ?? 0)}</td>
          <td style="font-size:0.82rem;">${item.metode || '-'}</td>
        </tr>`;
    }).join('');
  }

  // ── Profit indicator ──────────────────────────────────────────────────────
  function _renderProfitIndicator(d) {
    const el       = document.getElementById('laporan-profit-bar');
    if (!el) return;
    const revTotal = d?.revenue?.total ?? 0;
    const expTotal = d?.expense?.total ?? 0;

    if (revTotal === 0) {
      el.innerHTML = `
        <div style="margin-top:8px;height:8px;background:var(--border,#e0e0e0);border-radius:4px;"></div>
        <div style="display:flex;justify-content:space-between;font-size:0.75rem;
                    color:var(--text-secondary,#999);margin-top:4px;">
          <span>Belum ada pemasukan</span><span>—</span>
        </div>`;
      return;
    }

    const expPct  = Math.min(100, Math.round((expTotal / revTotal) * 100));
    const profPct = 100 - expPct;
    el.innerHTML = `
      <div style="display:flex;gap:4px;margin-top:8px;">
        <div style="flex:${profPct||1};height:8px;background:var(--success);
                    border-radius:4px 0 0 4px;min-width:4px;" title="Profit ${profPct}%"></div>
        <div style="flex:${expPct||1};height:8px;background:var(--danger);
                    border-radius:0 4px 4px 0;min-width:4px;" title="Expense ${expPct}%"></div>
      </div>
      <div style="display:flex;justify-content:space-between;font-size:0.75rem;
                  color:var(--text-secondary);margin-top:4px;">
        <span>Profit ${profPct}%</span><span>Expense ${expPct}%</span>
      </div>`;
  }

  function _setVal(id, amount) {
    const el = document.getElementById(id);
    if (el) el.textContent = UI.formatCurrency(amount ?? 0);
  }

  function onMonthChange() {
    const m = document.getElementById('laporan-month-select')?.value;
    const y = document.getElementById('laporan-year-select')?.value;
    if (m && y) load(parseInt(m), parseInt(y));
  }

  function onPctChange() {
    const ownerInput   = document.getElementById('laporan-owner-pct');
    const savingsInput = document.getElementById('laporan-savings-pct');
    if (!ownerInput || !savingsInput) return;
    const newOwner   = Math.min(100, Math.max(0, parseInt(ownerInput.value)   || 0));
    const newSavings = Math.min(100, Math.max(0, parseInt(savingsInput.value) || 0));
    if (newOwner + newSavings > 100) { UI.toast('Total persentase tidak boleh > 100%', 'error'); return; }
    _ownerPct   = newOwner;
    _savingsPct = newSavings;
    if (_lastData) {
      const net     = _lastData.net_profit ?? 0;
      const owner   = net > 0 ? Math.round(net * (_ownerPct   / 100)) : 0;
      const savings = net > 0 ? Math.round(net * (_savingsPct / 100)) : 0;
      _setVal('laporan-dist-owner',   owner);
      _setVal('laporan-dist-savings', savings);
      const pctOwnerEl = document.getElementById('laporan-owner-pct-display');
      if (pctOwnerEl) pctOwnerEl.textContent = `${_ownerPct}%`;
      const pctSavEl = document.getElementById('laporan-savings-pct-display');
      if (pctSavEl) pctSavEl.textContent = `${_savingsPct}%`;
    }
  }

  function refresh() {
    const m = document.getElementById('laporan-month-select')?.value;
    const y = document.getElementById('laporan-year-select')?.value;
    load(parseInt(m) || null, parseInt(y) || null);
  }

  function init() {
    const monthSel = document.getElementById('laporan-month-select');
    if (monthSel && monthSel.options.length === 0) {
      const months = ['Januari','Februari','Maret','April','Mei','Juni',
                      'Juli','Agustus','September','Oktober','November','Desember'];
      months.forEach((m, i) => {
        const opt = document.createElement('option');
        opt.value = i + 1; opt.textContent = m;
        monthSel.appendChild(opt);
      });
      monthSel.value = new Date().getMonth() + 1;
    }
    const yearSel = document.getElementById('laporan-year-select');
    if (yearSel && yearSel.options.length === 0) {
      const cy = new Date().getFullYear();
      for (let y = cy - 2; y <= cy + 1; y++) {
        const opt = document.createElement('option');
        opt.value = y; opt.textContent = y;
        yearSel.appendChild(opt);
      }
      yearSel.value = cy;
    }
  }

  return { init, load, onMonthChange, onPctChange, refresh, switchTab };
})();

window.LaporanBulananPage = LaporanBulananPage;

// CSS: animasi spin untuk loading icon
if (!document.getElementById('laporan-style-patch')) {
  const s = document.createElement('style');
  s.id = 'laporan-style-patch';
  s.textContent = `@keyframes spin { to { transform: rotate(360deg); } }`;
  document.head.appendChild(s);
}
