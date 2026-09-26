// Graphiques interactifs SVG ultra-légers et responsives pour MA CAISSE V1.4
const Charts = {
  renderSalesTrend(containerId, period = '7days') {
    const container = document.getElementById(containerId);
    if (!container) return;

    const sales = window.store.getSales();
    const ops = window.store.getOperations();

    // Regrouper par date (les 7 derniers jours ou 30 derniers jours)
    const daysCount = period === 'today' ? 1 : (period === '30days' ? 30 : 7);
    const dayLabels = [];
    const salesMap = {};
    const expenseMap = {};

    const now = new Date();
    for (let i = daysCount - 1; i >= 0; i--) {
      const d = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
      const key = d.toISOString().split('T')[0];
      const label = d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
      dayLabels.push({ key, label });
      salesMap[key] = 0;
      expenseMap[key] = 0;
    }

    sales.forEach(s => {
      const key = s.date.split('T')[0];
      if (salesMap[key] !== undefined) {
        salesMap[key] += s.total;
      }
    });

    ops.filter(o => o.type === 'out').forEach(o => {
      const key = o.date.split('T')[0];
      if (expenseMap[key] !== undefined) {
        expenseMap[key] += o.amount;
      }
    });

    const maxVal = Math.max(
      ...Object.values(salesMap),
      ...Object.values(expenseMap),
      1000
    );

    const width = 600;
    const height = 240;
    const padX = 45;
    const padY = 30;
    const chartW = width - padX * 2;
    const chartH = height - padY * 2;

    const stepX = chartW / Math.max(1, dayLabels.length);

    let barsHtml = '';
    let xLabelsHtml = '';

    dayLabels.forEach((d, idx) => {
      const x = padX + idx * stepX + (stepX * 0.1);
      const barW = Math.max(8, stepX * 0.35);

      const sVal = salesMap[d.key];
      const sH = (sVal / maxVal) * chartH;
      const sY = height - padY - sH;

      const eVal = expenseMap[d.key];
      const eH = (eVal / maxVal) * chartH;
      const eY = height - padY - eH;

      barsHtml += `
        <!-- Vente bar -->
        <rect x="${x}" y="${sY}" width="${barW}" height="${sH}" fill="#4F46E5" rx="3">
          <title>${d.label} - Ventes: ${sVal.toLocaleString()} FCFA</title>
        </rect>
        <!-- Dépense bar -->
        <rect x="${x + barW + 2}" y="${eY}" width="${barW}" height="${eH}" fill="#EF4444" rx="3">
          <title>${d.label} - Dépenses: ${eVal.toLocaleString()} FCFA</title>
        </rect>
      `;

      if (daysCount <= 7 || idx % Math.ceil(daysCount / 7) === 0) {
        xLabelsHtml += `
          <text x="${x + barW}" y="${height - 10}" font-size="11" font-weight="600" fill="#64748B" text-anchor="middle">
            ${d.label}
          </text>
        `;
      }
    });

    // Grilles horizontales
    let gridHtml = '';
    for (let i = 0; i <= 3; i++) {
      const y = height - padY - (i / 3) * chartH;
      const val = Math.round((i / 3) * maxVal);
      gridHtml += `
        <line x1="${padX}" y1="${y}" x2="${width - padX}" y2="${y}" stroke="#E2E8F0" stroke-dasharray="3,3" />
        <text x="${padX - 8}" y="${y + 4}" font-size="10" fill="#94A3B8" text-anchor="end">${val >= 1000 ? Math.round(val/1000) + 'k' : val}</text>
      `;
    }

    container.innerHTML = `
      <div style="width:100%; display:flex; flex-direction:column; align-items:center;">
        <div style="display:flex; gap:16px; margin-bottom:10px; font-size:12px; font-weight:600;">
          <span style="display:flex; align-items:center; gap:6px;"><span style="width:10px;height:10px;background:#4F46E5;border-radius:2px;"></span> Ventes</span>
          <span style="display:flex; align-items:center; gap:6px;"><span style="width:10px;height:10px;background:#EF4444;border-radius:2px;"></span> Dépenses</span>
        </div>
        <svg viewBox="0 0 ${width} ${height}" style="width:100%; height:auto; max-height:240px; overflow:visible;">
          ${gridHtml}
          ${barsHtml}
          ${xLabelsHtml}
        </svg>
      </div>
    `;
  },

  renderTopProducts(containerId) {
    const container = document.getElementById(containerId);
    if (!container) return;

    const sales = window.store.getSales();
    const productStats = {};

    sales.forEach(s => {
      if (!productStats[s.productId]) {
        productStats[s.productId] = {
          name: s.productName,
          quantity: 0,
          revenue: 0,
          profit: 0
        };
      }
      productStats[s.productId].quantity += s.quantity;
      productStats[s.productId].revenue += s.total;
      productStats[s.productId].profit += s.profit;
    });

    const topList = Object.values(productStats)
      .sort((a, b) => b.quantity - a.quantity)
      .slice(0, 5);

    if (topList.length === 0) {
      container.innerHTML = `
        <div class="empty-state" style="padding: 24px 10px;">
          <p style="font-size:13px; color:var(--text-muted);">Aucune vente pour le moment.</p>
        </div>
      `;
      return;
    }

    const maxQty = Math.max(...topList.map(t => t.quantity), 1);

    let html = '<div style="display:flex; flex-direction:column; gap:12px; width:100%;">';
    topList.forEach((item, index) => {
      const pct = Math.round((item.quantity / maxQty) * 100);
      html += `
        <div>
          <div style="display:flex; justify-content:space-between; font-size:13px; font-weight:700; margin-bottom:4px;">
            <span><span style="color:var(--primary); margin-right:4px;">#${index + 1}</span> ${item.name}</span>
            <span style="color:var(--text-muted); font-size:12px;">${item.quantity} vendus (${item.revenue.toLocaleString()} FCFA)</span>
          </div>
          <div style="background:var(--bg-muted); height:8px; border-radius:4px; overflow:hidden;">
            <div style="background:var(--primary); width:${pct}%; height:100%; border-radius:4px; transition:width 0.5s ease;"></div>
          </div>
        </div>
      `;
    });
    html += '</div>';

    container.innerHTML = html;
  },

  renderStockDonut(containerId) {
    const container = document.getElementById(containerId);
    if (!container) return;

    const products = window.store.getProducts();
    if (products.length === 0) {
      container.innerHTML = '<p style="color:var(--text-muted); font-size:13px;">Aucun produit enregistré.</p>';
      return;
    }

    const normal = products.filter(p => p.stock > p.minStock).length;
    const low = products.filter(p => p.stock <= p.minStock && p.stock > 0).length;
    const out = products.filter(p => p.stock === 0).length;
    const total = products.length;

    const pNormal = Math.round((normal / total) * 100);
    const pLow = Math.round((low / total) * 100);
    const pOut = Math.round((out / total) * 100);

    container.innerHTML = `
      <div style="display:flex; flex-direction:column; gap:14px; width:100%;">
        <div style="display:flex; align-items:center; justify-content:space-between; padding:10px 14px; background:var(--success-light); border-radius:8px; border:1px solid var(--success-border);">
          <span style="font-weight:700; font-size:13px; color:var(--success);">Stock Optimal</span>
          <span style="font-weight:800; font-size:15px; color:var(--success);">${normal} <small style="font-size:11px; opacity:0.8;">(${pNormal}%)</small></span>
        </div>
        <div style="display:flex; align-items:center; justify-content:space-between; padding:10px 14px; background:var(--warning-light); border-radius:8px; border:1px solid var(--warning-border);">
          <span style="font-weight:700; font-size:13px; color:var(--warning);">Stock Faible</span>
          <span style="font-weight:800; font-size:15px; color:var(--warning);">${low} <small style="font-size:11px; opacity:0.8;">(${pLow}%)</small></span>
        </div>
        <div style="display:flex; align-items:center; justify-content:space-between; padding:10px 14px; background:var(--danger-light); border-radius:8px; border:1px solid var(--danger-border);">
          <span style="font-weight:700; font-size:13px; color:var(--danger);">Rupture de Stock</span>
          <span style="font-weight:800; font-size:15px; color:var(--danger);">${out} <small style="font-size:11px; opacity:0.8;">(${pOut}%)</small></span>
        </div>
      </div>
    `;
  }
};

window.Charts = Charts;
