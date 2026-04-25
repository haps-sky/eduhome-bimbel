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
      if (res.status !== 'OK') { UI.toast(res.message || 'Gagal memuat laporan', 'error'); return; }
      _lastData = res.data;
      _render(res.data);
    } catch(e) {
      console.error('LaporanBulanan load error:', e);
      UI.toast('Gagal terhubung ke server', 'error');
    } finally {
      _setLoadingState(false);
    }
  }

  function _render(d) {
    if (!d) return;

    const periodEl = document.getElementById('laporan-period-label');
    if (periodEl) {
      const monthNames = ['','Januari','Februari','Maret','April','Mei','Juni',
                          'Juli','Agustus','September','Oktober','November','Desember'];
      periodEl.textContent = `${monthNames[d.month]} ${d.year}`;
    }

    _setVal('laporan-rev-spp',         d.revenue.spp);
    _setVal('laporan-rev-buku',        d.revenue.buku);
    _setVal('laporan-rev-pendaftaran', d.revenue.pendaftaran);
    _setVal('laporan-rev-lain',        d.revenue.lain);
    _setVal('laporan-rev-total',       d.revenue.total);

    _setVal('laporan-exp-gaji',        d.expense.gaji);
    _setVal('laporan-exp-buku',        d.expense.buku);
    _setVal('laporan-exp-operasional', d.expense.operasional);
    _setVal('laporan-exp-total',       d.expense.total);

    const netEl = document.getElementById('laporan-net-profit');
    if (netEl) {
      netEl.textContent = UI.formatCurrency(d.net_profit);
      netEl.className   = d.net_profit >= 0 ? 'laporan-value profit-positive' : 'laporan-value profit-negative';
    }

    _setVal('laporan-dist-owner',   d.distribution.owner);
    _setVal('laporan-dist-savings', d.distribution.savings);

    const pctOwnerEl = document.getElementById('laporan-owner-pct-display');
    if (pctOwnerEl) pctOwnerEl.textContent = `${d.distribution.owner_pct}%`;
    const pctSavEl = document.getElementById('laporan-savings-pct-display');
    if (pctSavEl) pctSavEl.textContent = `${d.distribution.savings_pct}%`;

    const metaEl = document.getElementById('laporan-meta');
    if (metaEl) {
      metaEl.textContent =
        `${d.meta.total_transaksi_masuk} transaksi masuk · ` +
        `${d.meta.total_transaksi_keluar} transaksi keluar · ` +
        `${d.meta.total_gaji_records} catatan gaji`;
    }

    _renderGajiDetail(d.detail.gaji || []);
    _renderProfitIndicator(d);
  }

  function _setVal(id, amount) {
    const el = document.getElementById(id);
    if (el) el.textContent = UI.formatCurrency(amount || 0);
  }

  function _renderGajiDetail(gajiList) {
    const rows = gajiList.map(g => `
      <tr>
        <td>${UI.formatDate(g.tanggal)}</td>
        <td><strong>${g.nama_mentor}</strong></td>
        <td>${g.bulan_gaji || '-'}</td>
        <td style="font-weight:600;color:var(--danger)">${UI.formatCurrency(g.jumlah)}</td>
        <td>${g.metode}</td>
      </tr>`);
    UI.renderTable('laporan-gaji-tbody', rows, 'Tidak ada penggajian bulan ini');
  }

  function _renderProfitIndicator(d) {
    const indicatorEl = document.getElementById('laporan-profit-bar');
    if (!indicatorEl || d.revenue.total === 0) {
      if (indicatorEl) indicatorEl.innerHTML = '';
      return;
    }
    const expPct = Math.min(100, Math.round((d.expense.total / d.revenue.total) * 100));
    const profPct = 100 - expPct;
    indicatorEl.innerHTML = `
      <div style="display:flex;gap:4px;align-items:center;margin-top:8px;">
        <div style="flex:${profPct || 1};height:8px;background:var(--success);border-radius:4px 0 0 4px;min-width:4px;"></div>
        <div style="flex:${expPct || 1};height:8px;background:var(--danger);border-radius:0 4px 4px 0;min-width:4px;"></div>
      </div>
      <div style="display:flex;justify-content:space-between;font-size:0.75rem;color:var(--text-secondary);margin-top:4px;">
        <span>Profit ${profPct}%</span>
        <span>Expense ${expPct}%</span>
      </div>`;
  }

  function _setLoadingState(loading) {
    const container = document.getElementById('laporan-content');
    if (!container) return;
    container.style.opacity       = loading ? '0.5' : '1';
    container.style.pointerEvents = loading ? 'none' : 'auto';
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

    if (newOwner + newSavings > 100) { UI.toast('Total persentase tidak boleh melebihi 100%', 'error'); return; }

    _ownerPct   = newOwner;
    _savingsPct = newSavings;

    if (_lastData) {
      const net     = _lastData.net_profit;
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
        const opt       = document.createElement('option');
        opt.value       = i + 1;
        opt.textContent = m;
        monthSel.appendChild(opt);
      });
      monthSel.value = new Date().getMonth() + 1;
    }

    const yearSel = document.getElementById('laporan-year-select');
    if (yearSel && yearSel.options.length === 0) {
      const cy = new Date().getFullYear();
      for (let y = cy - 2; y <= cy + 1; y++) {
        const opt       = document.createElement('option');
        opt.value       = y;
        opt.textContent = y;
        yearSel.appendChild(opt);
      }
      yearSel.value = cy;
    }
  }

  return { load, init, onMonthChange, onPctChange, refresh };
})();

window.LaporanBulananPage = LaporanBulananPage;