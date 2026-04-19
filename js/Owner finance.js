// ============================================================
// OwnerFinancePage (tidak berubah)
// ============================================================

const OwnerFinancePage = (() => {
  async function load() {
    try {
      const [statsRes, payRes, sppRes, gajiRes] = await Promise.all([
        API.dashboard.getStats(), API.pembayaran.getAll(), API.spp.getAll(), API.gaji.getAll()
      ]);
      if (statsRes.status === 'OK' && statsRes.data.finance) renderFinanceSummary(statsRes.data.finance, statsRes.data.payments);
      if (payRes.status === 'OK')  renderPaymentHistory(payRes.data || []);
      if (sppRes.status === 'OK')  renderSPPStatus(sppRes.data || []);
      if (gajiRes.status === 'OK') renderGajiHistory(gajiRes.data || []);
    } catch(e) { UI.toast('Error memuat laporan keuangan: '+e.message,'error'); }
  }
  function renderFinanceSummary(finance, payments) {
    const ids = {
      'owner-fin-spp': finance.total_spp, 'owner-fin-op': finance.total_operational,
      'owner-fin-sav': finance.total_savings, 'owner-fin-rev': finance.total_revenue,
      'owner-pay-today': payments ? payments.today : 0, 'owner-pay-month': payments ? payments.this_month : 0
    };
    Object.entries(ids).forEach(([id,val]) => { const el = document.getElementById(id); if (el) el.textContent = UI.formatCurrency(val); });
  }
  function renderPaymentHistory(data) {
    const sppOnly = data.filter(p => p.jenis === 'SPP').slice(-30).reverse();
    const rows = sppOnly.map(p => `<tr><td>${UI.formatDate(p.tanggal)}</td><td><strong>${p.nama}</strong></td><td>${p.periode||'-'}</td><td><strong>${UI.formatCurrency(p.jumlah)}</strong></td><td>${p.metode}</td></tr>`);
    UI.renderTable('owner-pay-tbody', rows, 'Belum ada data pembayaran');
  }
  function renderSPPStatus(data) {
    const unpaid = data.filter(s => s.status_bayar === 'UNPAID').length;
    const partial = data.filter(s => s.status_bayar === 'PARTIAL').length;
    const paid = data.filter(s => s.status_bayar === 'PAID').length;
    const els = { 'owner-spp-unpaid': unpaid, 'owner-spp-partial': partial, 'owner-spp-paid': paid };
    Object.entries(els).forEach(([id,val]) => { const el = document.getElementById(id); if (el) el.textContent = val; });
  }
  function renderGajiHistory(data) {
    const rows = data.slice(-20).reverse().map(g => `<tr><td>${UI.formatDate(g.tgl_bayar)}</td><td>${g.bulan_gaji}</td><td><strong>${g.nama_mentor}</strong></td><td><strong class="text-success">${UI.formatCurrency(g.jumlah)}</strong></td><td>${g.metode}</td></tr>`);
    UI.renderTable('owner-gaji-tbody', rows, 'Belum ada data penggajian');
  }
  return { load };
})();

