const LaporanBulananPage = (() => {
  let _lastData   = null;
  let _ownerPct   = 65;
  let _savingsPct = 15;

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
        _renderFullEmpty();
        return;
      }

      _lastData = res.data;
      _render(res.data);

    } catch (e) {
      console.error('LaporanBulanan load error:', e);
      UI.toast('Gagal terhubung ke server', 'error');
      _renderFullEmpty();
    }
  }

  function _render(d) {
    if (!d) {
      _renderFullEmpty();
      return;
    }

    // 🔥 EMPTY STATE GLOBAL (SAMA SEPERTI PAGE LAIN)
    if (
      (d.revenue?.total || 0) === 0 &&
      (d.expense?.total || 0) === 0
    ) {
      _renderFullEmpty();
      return;
    }

    const monthNames = ['','Januari','Februari','Maret','April','Mei','Juni',
                        'Juli','Agustus','September','Oktober','November','Desember'];

    const periodEl = document.getElementById('laporan-period-label');
    if (periodEl) {
      periodEl.textContent = `${monthNames[d.month] || '-'} ${d.year || ''}`;
    }

    // ===== REVENUE =====
    _setVal('laporan-rev-spp',         d.revenue?.spp);
    _setVal('laporan-rev-buku',        d.revenue?.buku);
    _setVal('laporan-rev-pendaftaran', d.revenue?.pendaftaran);
    _setVal('laporan-rev-lain',        d.revenue?.lain);
    _setVal('laporan-rev-total',       d.revenue?.total);

    // ===== EXPENSE =====
    _setVal('laporan-exp-gaji',        d.expense?.gaji);
    _setVal('laporan-exp-buku',        d.expense?.buku);
    _setVal('laporan-exp-operasional', d.expense?.operasional);
    _setVal('laporan-exp-total',       d.expense?.total);

    // ===== PROFIT =====
    const net = d.net_profit || 0;
    const netEl = document.getElementById('laporan-net-profit');
    if (netEl) {
      netEl.textContent = UI.formatCurrency(net);
      netEl.className   = net >= 0
        ? 'laporan-value profit-positive'
        : 'laporan-value profit-negative';
    }

    // ===== DISTRIBUTION =====
    _setVal('laporan-dist-owner',   d.distribution?.owner);
    _setVal('laporan-dist-savings', d.distribution?.savings);

    const pctOwnerEl = document.getElementById('laporan-owner-pct-display');
    if (pctOwnerEl) pctOwnerEl.textContent = `${d.distribution?.owner_pct || 0}%`;

    const pctSavEl = document.getElementById('laporan-savings-pct-display');
    if (pctSavEl) pctSavEl.textContent = `${d.distribution?.savings_pct || 0}%`;

    // ===== META =====
    const meta = d.meta || {};
    const metaEl = document.getElementById('laporan-meta');
    if (metaEl) {
      metaEl.textContent =
        `${meta.total_transaksi_masuk || 0} transaksi masuk · ` +
        `${meta.total_transaksi_keluar || 0} transaksi keluar · ` +
        `${meta.total_gaji_records || 0} catatan gaji`;
    }

    // ===== TABLE =====
    _renderGajiDetail(d.detail?.gaji || []);

    // ===== INDICATOR =====
    _renderProfitIndicator(d);
  }

  // 🔥 LOADING STYLE (SAMA SEPERTI MURID/MENTOR)
  function _setLoadingState(loading) {
    const tbody = document.getElementById('laporan-gaji-tbody');
    if (!tbody) return;

    if (loading) {
      tbody.innerHTML = `
        <tr>
          <td colspan="5" style="text-align:center;padding:20px;color:#888">
            Memuat laporan...
          </td>
        </tr>
      `;
    }
  }

  // 🔥 EMPTY STATE (TIDAK HANCURIN LAYOUT)
  function _renderFullEmpty() {
    _setVal('laporan-rev-spp', 0);
    _setVal('laporan-rev-buku', 0);
    _setVal('laporan-rev-pendaftaran', 0);
    _setVal('laporan-rev-lain', 0);
    _setVal('laporan-rev-total', 0);

    _setVal('laporan-exp-gaji', 0);
    _setVal('laporan-exp-buku', 0);
    _setVal('laporan-exp-operasional', 0);
    _setVal('laporan-exp-total', 0);

    const netEl = document.getElementById('laporan-net-profit');
    if (netEl) netEl.textContent = UI.formatCurrency(0);

    const tbody = document.getElementById('laporan-gaji-tbody');
    if (tbody) {
      tbody.innerHTML = `
        <tr>
          <td colspan="5" style="text-align:center;padding:20px;color:#888">
            Belum ada data
          </td>
        </tr>
      `;
    }

    const metaEl = document.getElementById('laporan-meta');
    if (metaEl) {
      metaEl.textContent = `0 transaksi masuk · 0 transaksi keluar · 0 catatan gaji`;
    }

    const bar = document.getElementById('laporan-profit-bar');
    if (bar) bar.innerHTML = '';
  }

  function _setVal(id, amount) {
    const el = document.getElementById(id);
    if (el) el.textContent = UI.formatCurrency(amount || 0);
  }

  function _renderGajiDetail(gajiList) {
    if (!gajiList.length) {
      const tbody = document.getElementById('laporan-gaji-tbody');
      if (tbody) {
        tbody.innerHTML = `
          <tr>
            <td colspan="5" style="text-align:center;padding:20px;color:#888">
              Tidak ada penggajian bulan ini
            </td>
          </tr>
        `;
      }
      return;
    }

    const rows = gajiList.map(g => `
      <tr>
        <td>-</td>
        <td><strong>${g.nama || '-'}</strong></td>
        <td>-</td>
        <td style="font-weight:600;color:var(--danger)">
          ${UI.formatCurrency(g.jumlah)}
        </td>
        <td>-</td>
      </tr>
    `);

    UI.renderTable('laporan-gaji-tbody', rows);
  }

  function _renderProfitIndicator(d) {
    const el = document.getElementById('laporan-profit-bar');

    if (!el || !d?.revenue?.total) {
      if (el) el.innerHTML = '';
      return;
    }

    const expPct  = Math.min(100, Math.round((d.expense.total / d.revenue.total) * 100));
    const profPct = 100 - expPct;

    el.innerHTML = `
      <div style="display:flex;gap:4px;margin-top:8px;">
        <div style="flex:${profPct || 1};height:8px;background:var(--success)"></div>
        <div style="flex:${expPct || 1};height:8px;background:var(--danger)"></div>
      </div>
      <div style="display:flex;justify-content:space-between;font-size:0.75rem;margin-top:4px;">
        <span>Profit ${profPct}%</span>
        <span>Expense ${expPct}%</span>
      </div>
    `;
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

    const newOwner   = Math.min(100, Math.max(0, parseInt(ownerInput.value) || 0));
    const newSavings = Math.min(100, Math.max(0, parseInt(savingsInput.value) || 0));

    if (newOwner + newSavings > 100) {
      UI.toast('Total persentase tidak boleh > 100%', 'error');
      return;
    }

    _ownerPct   = newOwner;
    _savingsPct = newSavings;

    if (_lastData) {
      const net = _lastData.net_profit || 0;

      const owner   = net > 0 ? Math.round(net * (_ownerPct / 100)) : 0;
      const savings = net > 0 ? Math.round(net * (_savingsPct / 100)) : 0;

      _setVal('laporan-dist-owner', owner);
      _setVal('laporan-dist-savings', savings);
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
        opt.value = i + 1;
        opt.textContent = m;
        monthSel.appendChild(opt);
      });

      monthSel.value = new Date().getMonth() + 1;
    }

    const yearSel = document.getElementById('laporan-year-select');

    if (yearSel && yearSel.options.length === 0) {
      const cy = new Date().getFullYear();

      for (let y = cy - 2; y <= cy + 1; y++) {
        const opt = document.createElement('option');
        opt.value = y;
        opt.textContent = y;
        yearSel.appendChild(opt);
      }

      yearSel.value = cy;
    }
  }

  return { init, load, onMonthChange, onPctChange, refresh };
})();

window.LaporanBulananPage = LaporanBulananPage;