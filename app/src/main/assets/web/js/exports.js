// Modules d'exports (Excel/CSV, PDF Imprimable, Sauvegarde/Restauration JSON) pour MA CAISSE V1.4
const Exports = {
  // 1. Export Excel / CSV avec encodage UTF-8 et séparateur compatible Excel
  exportToExcel(dataType = 'sales') {
    const store = window.store;
    let csvContent = '\uFEFF'; // BOM UTF-8 pour Excel
    let filename = '';

    if (dataType === 'sales') {
      filename = `ma_caisse_ventes_${new Date().toISOString().slice(0, 10)}.csv`;
      csvContent += 'Date;Référence;Produit;Quantité;Prix Achat (FCFA);Prix Vente (FCFA);Total Vente (FCFA);Bénéfice (FCFA);Client;Statut Paiement\n';
      store.getSales().forEach(s => {
        csvContent += `"${new Date(s.date).toLocaleString('fr-FR')}";"${s.productRef || ''}";"${s.productName}";${s.quantity};${s.buyPrice};${s.sellPrice};${s.total};${s.profit};"${s.clientName || 'Comptoir'}";"${s.paymentStatus}"\n`;
      });
    } else if (dataType === 'products') {
      filename = `ma_caisse_catalogue_stock_${new Date().toISOString().slice(0, 10)}.csv`;
      csvContent += 'Référence;Nom Produit;Catégorie;Prix Achat;Prix Vente;Marge Unitaire;Marge %;Stock Actuel;Stock Minimum;Valeur Stock Achat\n';
      store.getProducts().forEach(p => {
        const margin = p.sellPrice - p.buyPrice;
        const marginPct = p.sellPrice > 0 ? Math.round((margin / p.sellPrice) * 100) : 0;
        csvContent += `"${p.ref}";"${p.name}";"${p.category}";${p.buyPrice};${p.sellPrice};${margin};${marginPct}%;${p.stock};${p.minStock};${p.stock * p.buyPrice}\n`;
      });
    } else if (dataType === 'clients') {
      filename = `ma_caisse_clients_dettes_${new Date().toISOString().slice(0, 10)}.csv`;
      csvContent += 'Nom Client;Téléphone;Dette Actuelle (FCFA);Total Achats Cumulés (FCFA);Date Création\n';
      store.getClients().forEach(c => {
        csvContent += `"${c.name}";"${c.phone}";${c.debt};${c.totalPurchases};"${new Date(c.createdAt).toLocaleDateString('fr-FR')}"\n`;
      });
    } else if (dataType === 'operations') {
      filename = `ma_caisse_journal_operations_${new Date().toISOString().slice(0, 10)}.csv`;
      csvContent += 'Date;Type;Catégorie;Description;Montant (FCFA)\n';
      store.getOperations().forEach(o => {
        const typeStr = o.type === 'in' ? 'ENTRÉE' : 'DÉPENSE';
        csvContent += `"${new Date(o.date).toLocaleString('fr-FR')}";"${typeStr}";"${o.category}";"${o.description}";${o.amount}\n`;
      });
    }

    this.downloadFile(csvContent, filename, 'text/csv;charset=utf-8;');
    window.App.showToast(`Export Excel/CSV généré : ${filename}`, 'success');
  },

  // 2. Impression et enregistrement PDF
  printReport(reportType = 'sales', period = 'all') {
    const store = window.store;
    const settings = store.getSettings();
    const metrics = store.calculateMetrics(period);
    const sales = store.getSales();
    const products = store.getProducts();

    const periodLabels = {
      all: 'Toutes les données',
      today: 'Aujourd’hui',
      '7days': '7 derniers jours',
      '30days': '30 derniers jours',
      month: 'Ce mois-ci'
    };

    let reportHtml = `
      <div id="printArea" class="print-report-container" style="padding:20px; font-family:sans-serif; color:#0F172A; max-width:800px; margin:0 auto;">
        <div style="display:flex; justify-content:space-between; align-items:flex-start; border-bottom:2px solid #4F46E5; padding-bottom:16px; margin-bottom:20px;">
          <div>
            <h1 style="font-size:24px; font-weight:800; color:#4F46E5; margin:0 0 4px 0;">${settings.shopName || 'MA CAISSE'}</h1>
            <p style="margin:0; font-size:13px; color:#64748B;">${settings.description || 'Commerce Général'} • Tél: ${settings.phone || '-'}</p>
            <p style="margin:0; font-size:13px; color:#64748B;">${settings.address || '-'}</p>
          </div>
          <div style="text-align:right;">
            <h2 style="font-size:18px; margin:0; font-weight:700;">RAPPORT COMMERCIAL</h2>
            <p style="margin:4px 0 0 0; font-size:12px; color:#64748B;">Période : <strong>${periodLabels[period] || period}</strong></p>
            <p style="margin:2px 0 0 0; font-size:12px; color:#64748B;">Date d'édition : ${new Date().toLocaleDateString('fr-FR')}</p>
          </div>
        </div>

        <div style="display:grid; grid-template-columns:repeat(3, 1fr); gap:12px; margin-bottom:24px;">
          <div style="background:#F8FAFC; border:1px solid #E2E8F0; padding:12px; border-radius:8px;">
            <div style="font-size:11px; color:#64748B; font-weight:700; text-transform:uppercase;">Chiffre d'Affaires</div>
            <div style="font-size:18px; font-weight:800; color:#4F46E5; margin-top:4px;">${store.formatMoney(metrics.chiffreAffaires)}</div>
          </div>
          <div style="background:#F8FAFC; border:1px solid #E2E8F0; padding:12px; border-radius:8px;">
            <div style="font-size:11px; color:#64748B; font-weight:700; text-transform:uppercase;">Coût Produits Vendus</div>
            <div style="font-size:18px; font-weight:800; color:#0F172A; margin-top:4px;">${store.formatMoney(metrics.coutProduitsVendus)}</div>
          </div>
          <div style="background:#F8FAFC; border:1px solid #E2E8F0; padding:12px; border-radius:8px;">
            <div style="font-size:11px; color:#64748B; font-weight:700; text-transform:uppercase;">Bénéfice Brut</div>
            <div style="font-size:18px; font-weight:800; color:#10B981; margin-top:4px;">${store.formatMoney(metrics.beneficeBrut)}</div>
          </div>
          <div style="background:#F8FAFC; border:1px solid #E2E8F0; padding:12px; border-radius:8px;">
            <div style="font-size:11px; color:#64748B; font-weight:700; text-transform:uppercase;">Charges d'Exploitation</div>
            <div style="font-size:18px; font-weight:800; color:#EF4444; margin-top:4px;">${store.formatMoney(metrics.chargesExploitation)}</div>
          </div>
          <div style="background:#F8FAFC; border:1px solid #E2E8F0; padding:12px; border-radius:8px;">
            <div style="font-size:11px; color:#64748B; font-weight:700; text-transform:uppercase;">Bénéfice Estimé</div>
            <div style="font-size:18px; font-weight:800; color:#10B981; margin-top:4px;">${store.formatMoney(metrics.beneficeEstime)}</div>
          </div>
          <div style="background:#F8FAFC; border:1px solid #E2E8F0; padding:12px; border-radius:8px;">
            <div style="font-size:11px; color:#64748B; font-weight:700; text-transform:uppercase;">Taux de Marge</div>
            <div style="font-size:18px; font-weight:800; color:#4F46E5; margin-top:4px;">${metrics.marge.toFixed(1)}%</div>
          </div>
        </div>

        <h3 style="font-size:15px; font-weight:700; border-bottom:1px solid #E2E8F0; padding-bottom:6px; margin-bottom:12px;">Détail des Ventes récentes</h3>
        <table style="width:100%; border-collapse:collapse; font-size:12px; text-align:left; margin-bottom:24px;">
          <thead>
            <tr style="background:#F1F5F9;">
              <th style="padding:8px; border:1px solid #CBD5E1;">Date</th>
              <th style="padding:8px; border:1px solid #CBD5E1;">Produit</th>
              <th style="padding:8px; border:1px solid #CBD5E1; text-align:center;">Qté</th>
              <th style="padding:8px; border:1px solid #CBD5E1; text-align:right;">P.U.</th>
              <th style="padding:8px; border:1px solid #CBD5E1; text-align:right;">Total</th>
              <th style="padding:8px; border:1px solid #CBD5E1; text-align:right;">Bénéfice</th>
              <th style="padding:8px; border:1px solid #CBD5E1;">Client</th>
            </tr>
          </thead>
          <tbody>
            ${sales.slice(0, 25).map(s => `
              <tr>
                <td style="padding:6px 8px; border:1px solid #E2E8F0;">${new Date(s.date).toLocaleDateString('fr-FR')}</td>
                <td style="padding:6px 8px; border:1px solid #E2E8F0;">${s.productName}</td>
                <td style="padding:6px 8px; border:1px solid #E2E8F0; text-align:center;">${s.quantity}</td>
                <td style="padding:6px 8px; border:1px solid #E2E8F0; text-align:right;">${s.sellPrice.toLocaleString()}</td>
                <td style="padding:6px 8px; border:1px solid #E2E8F0; text-align:right; font-weight:600;">${s.total.toLocaleString()}</td>
                <td style="padding:6px 8px; border:1px solid #E2E8F0; text-align:right; color:#10B981;">+${s.profit.toLocaleString()}</td>
                <td style="padding:6px 8px; border:1px solid #E2E8F0;">${s.clientName || 'Comptoir'}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>

        <div style="border-top:1px solid #E2E8F0; padding-top:12px; display:flex; justify-content:space-between; font-size:11px; color:#94A3B8;">
          <span>Solution MA CAISSE V1.4 • Porteur: Gaston N3</span>
          <span>Imprimé le ${new Date().toLocaleString('fr-FR')}</span>
        </div>
      </div>
    `;

    // Afficher dans une modale ou conteneur d'impression et lancer window.print()
    let printContainer = document.getElementById('printContainerWrapper');
    if (!printContainer) {
      printContainer = document.createElement('div');
      printContainer.id = 'printContainerWrapper';
      document.body.appendChild(printContainer);
    }
    printContainer.innerHTML = reportHtml;

    setTimeout(() => {
      if (window.AndroidBridge && typeof window.AndroidBridge.printDocument === 'function') {
        window.AndroidBridge.printDocument('Rapport_Ma_Caisse');
      } else {
        window.print();
      }
    }, 150);
  },

  // 3. Sauvegarde des données en fichier JSON
  exportBackup() {
    const data = window.store.data;
    const jsonString = JSON.stringify(data, null, 2);
    const dateStr = new Date().toISOString().slice(0, 10);
    const filename = `ma_caisse_sauvegarde_${dateStr}.json`;

    this.downloadFile(jsonString, filename, 'application/json');
    window.App.showToast('Sauvegarde JSON exportée avec succès !', 'success');
  },

  // 4. Restauration d'un fichier JSON
  restoreBackup(file, onSuccess, onError) {
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const parsed = JSON.parse(e.target.result);

        // Validation du schéma minimal
        if (!parsed || typeof parsed !== 'object') {
          throw new Error('Fichier JSON invalide.');
        }

        if (!Array.isArray(parsed.products) || !Array.isArray(parsed.sales)) {
          throw new Error('Structure de sauvegarde invalide (sections produits/ventes manquantes).');
        }

        window.store.data = {
          ...window.store.getDefaultData(),
          ...parsed
        };
        window.store.save();

        if (onSuccess) onSuccess();
      } catch (err) {
        if (onError) onError(err.message || 'Erreur lors de la lecture du fichier.');
      }
    };
    reader.readAsText(file);
  },

  // Utilitaire téléchargement universel
  downloadFile(content, filename, mimeType) {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    setTimeout(() => {
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    }, 200);
  }
};

window.Exports = Exports;
