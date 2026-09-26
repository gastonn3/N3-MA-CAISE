// Contrôleur UI principal pour MA CAISSE V1.4
const App = {
  currentView: 'dashboard',
  currentPeriod: '7days',
  deferredPrompt: null,

  init() {
    this.bindEvents();
    this.checkOnboarding();
    this.renderCurrentView();
    this.updateShopProfileUI();
    this.setupPWA();

    // Abonnement aux modifications de données
    window.store.subscribe(() => {
      this.renderCurrentView();
      this.updateShopProfileUI();
    });
  },

  // 1. Navigation
  navigateTo(viewId) {
    this.currentView = viewId;

    // Mise à jour des liens du menu
    document.querySelectorAll('.nav-item').forEach(el => {
      el.classList.toggle('active', el.dataset.view === viewId);
    });

    // Masquer les sections et afficher la vue courante
    document.querySelectorAll('.view-section').forEach(sec => {
      sec.classList.remove('active');
    });

    const activeSection = document.getElementById(`view-${viewId}`);
    if (activeSection) {
      activeSection.classList.add('active');
    }

    // Mettre à jour le titre dans la barre supérieure
    const pageTitleEl = document.getElementById('pageTitle');
    const titles = {
      dashboard: 'Tableau de bord',
      operations: 'Opérations de caisse',
      history: 'Historique des opérations',
      products: 'Gestion des produits & Stock',
      sales: 'Enregistrement des Ventes (POS)',
      clients: 'Gestion des clients & Dettes',
      stats: 'Statistiques & Performance',
      reports: 'Rapports & Exports',
      about: 'À propos de Ma Caisse',
      settings: 'Paramètres du commerce'
    };
    if (pageTitleEl) pageTitleEl.textContent = titles[viewId] || 'Ma Caisse';

    // Rendu spécifique de la vue
    this.renderCurrentView();

    // Fermer le menu mobile si ouvert
    const sidebar = document.getElementById('sidebar');
    if (sidebar) sidebar.classList.remove('mobile-open');

    window.scrollTo({ top: 0, behavior: 'smooth' });
  },

  renderCurrentView() {
    switch (this.currentView) {
      case 'dashboard':
        this.renderDashboard();
        break;
      case 'operations':
        this.renderOperations();
        break;
      case 'history':
        this.renderHistory();
        break;
      case 'products':
        this.renderProducts();
        break;
      case 'sales':
        this.renderSales();
        break;
      case 'clients':
        this.renderClients();
        break;
      case 'stats':
        this.renderStats();
        break;
      case 'reports':
        this.renderReports();
        break;
      case 'settings':
        this.renderSettings();
        break;
    }
  },

  // 2. Écran d'intégration (Onboarding)
  checkOnboarding() {
    const settings = window.store.getSettings();
    const onboardingEl = document.getElementById('onboardingModal');
    if (!settings.configured && (!settings.shopName || settings.shopName.trim() === '')) {
      if (onboardingEl) onboardingEl.style.display = 'flex';
    } else {
      if (onboardingEl) onboardingEl.style.display = 'none';
    }
  },

  saveOnboarding(event) {
    if (event) event.preventDefault();
    const shopName = document.getElementById('onboardShopName').value.trim();
    if (!shopName) {
      this.showToast('Veuillez renseigner le nom de votre commerce.', 'danger');
      return;
    }

    const description = document.getElementById('onboardDescription').value.trim();
    const phone = document.getElementById('onboardPhone').value.trim();
    const address = document.getElementById('onboardAddress').value.trim();
    const currency = document.getElementById('onboardCurrency').value || 'FCFA';

    window.store.updateSettings({
      shopName,
      description,
      phone,
      address,
      currency,
      configured: true
    });

    const onboardingEl = document.getElementById('onboardingModal');
    if (onboardingEl) onboardingEl.style.display = 'none';

    this.showToast(`Bienvenue dans Ma Caisse, ${shopName} !`, 'success');
    this.navigateTo('dashboard');
  },

  updateShopProfileUI() {
    const settings = window.store.getSettings();
    const brandNameEl = document.getElementById('sidebarShopName');
    const brandRoleEl = document.getElementById('sidebarShopRole');
    const avatarEl = document.getElementById('sidebarShopAvatar');

    const name = settings.shopName || 'Ma Caisse';
    if (brandNameEl) brandNameEl.textContent = name;
    if (brandRoleEl) brandRoleEl.textContent = settings.description || 'Commerce Général';
    if (avatarEl) avatarEl.textContent = name.substring(0, 2).toUpperCase();
  },

  // 3. TABLEAU DE BORD
  renderDashboard() {
    const metrics = window.store.calculateMetrics(this.currentPeriod);
    const store = window.store;

    // Remplissage des cartes métriques
    document.getElementById('metricSolde').textContent = store.formatMoney(metrics.solde);
    document.getElementById('metricCA').textContent = store.formatMoney(metrics.chiffreAffaires);
    document.getElementById('metricDepenses').textContent = store.formatMoney(metrics.totalDepenses);
    document.getElementById('metricCoutAchat').textContent = store.formatMoney(metrics.coutProduitsVendus);
    document.getElementById('metricBenefBrut').textContent = store.formatMoney(metrics.beneficeBrut);
    document.getElementById('metricCharges').textContent = store.formatMoney(metrics.chargesExploitation);
    document.getElementById('metricBenefEstime').textContent = store.formatMoney(metrics.beneficeEstime);
    document.getElementById('metricMarge').textContent = metrics.marge.toFixed(1) + ' %';

    // Badge alerte stock faible
    const alertStockBox = document.getElementById('dashboardStockAlert');
    if (alertStockBox) {
      if (metrics.lowStockCount > 0 || metrics.outOfStockCount > 0) {
        alertStockBox.style.display = 'flex';
        alertStockBox.innerHTML = `
          <div style="display:flex; align-items:center; gap:12px;">
            <span style="font-size:20px;">⚠️</span>
            <div>
              <strong>Alerte Stocks :</strong> ${metrics.outOfStockCount} produit(s) en rupture, ${metrics.lowStockCount} à niveau faible.
            </div>
          </div>
          <button class="btn btn-sm btn-secondary" onclick="App.navigateTo('products')">Voir le stock</button>
        `;
      } else {
        alertStockBox.style.display = 'none';
      }
    }

    // Graphiques
    window.Charts.renderSalesTrend('dashboardSalesChart', this.currentPeriod);
    window.Charts.renderTopProducts('dashboardTopProducts');
    window.Charts.renderStockDonut('dashboardStockDonut');

    // Dernières opérations
    const recentOpsTable = document.getElementById('dashboardRecentOps');
    const ops = store.getOperations().slice(0, 5);
    if (recentOpsTable) {
      if (ops.length === 0) {
        recentOpsTable.innerHTML = `<tr><td colspan="4" class="text-center text-muted" style="padding:24px;">Aucune opération récente.</td></tr>`;
      } else {
        recentOpsTable.innerHTML = ops.map(op => `
          <tr>
            <td>${new Date(op.date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}</td>
            <td><span class="badge ${op.type === 'in' ? 'badge-success' : 'badge-danger'}">${op.type === 'in' ? 'Entrée' : 'Dépense'}</span></td>
            <td><strong>${op.category}</strong> - <small style="color:var(--text-muted);">${op.description || '-'}</small></td>
            <td style="text-align:right; font-weight:700; color:${op.type === 'in' ? 'var(--success)' : 'var(--danger)'};">
              ${op.type === 'in' ? '+' : '-'}${store.formatMoney(op.amount)}
            </td>
          </tr>
        `).join('');
      }
    }
  },

  setPeriod(period) {
    this.currentPeriod = period;
    document.querySelectorAll('.period-btn').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.period === period);
    });
    this.renderDashboard();
  },

  // 4. OPÉRATIONS
  renderOperations() {
    const categories = window.store.data.categories;
    const catSelectIn = document.getElementById('opInCat');
    const catSelectOut = document.getElementById('opOutCat');

    const options = categories.map(c => `<option value="${c}">${c}</option>`).join('');
    if (catSelectIn) catSelectIn.innerHTML = options;
    if (catSelectOut) catSelectOut.innerHTML = options;

    const todayStr = new Date().toISOString().split('T')[0];
    const opInDate = document.getElementById('opInDate');
    const opOutDate = document.getElementById('opOutDate');
    if (opInDate && !opInDate.value) opInDate.value = todayStr;
    if (opOutDate && !opOutDate.value) opOutDate.value = todayStr;
  },

  handleRecordOperation(type, event) {
    if (event) event.preventDefault();
    const isOut = type === 'out';
    const amountInput = document.getElementById(isOut ? 'opOutAmount' : 'opInAmount');
    const catInput = document.getElementById(isOut ? 'opOutCat' : 'opInCat');
    const descInput = document.getElementById(isOut ? 'opOutDesc' : 'opInDesc');
    const dateInput = document.getElementById(isOut ? 'opOutDate' : 'opInDate');

    const amount = Number(amountInput.value);
    if (isNaN(amount) || amount <= 0) {
      this.showToast('Veuillez saisir un montant valide supérieur à 0.', 'danger');
      return;
    }

    try {
      window.store.addOperation({
        type: isOut ? 'out' : 'in',
        category: catInput.value,
        amount,
        description: descInput.value,
        date: dateInput.value ? new Date(dateInput.value).toISOString() : new Date().toISOString()
      });

      amountInput.value = '';
      descInput.value = '';

      this.showToast(`${isOut ? 'Dépense' : 'Entrée'} de ${window.store.formatMoney(amount)} enregistrée avec succès.`, 'success');
      this.renderDashboard();
    } catch (e) {
      this.showToast(e.message, 'danger');
    }
  },

  // 5. HISTORIQUE
  renderHistory() {
    const store = window.store;
    let ops = store.getOperations();

    const searchVal = (document.getElementById('historySearch')?.value || '').toLowerCase().trim();
    const typeFilter = document.getElementById('historyTypeFilter')?.value || 'all';
    const catFilter = document.getElementById('historyCatFilter')?.value || 'all';

    // Remplir sélecteur de catégories
    const catSelect = document.getElementById('historyCatFilter');
    if (catSelect && catSelect.options.length <= 1) {
      catSelect.innerHTML = '<option value="all">Toutes les catégories</option>' +
        store.data.categories.map(c => `<option value="${c}">${c}</option>`).join('');
    }

    if (searchVal) {
      ops = ops.filter(o => 
        (o.description && o.description.toLowerCase().includes(searchVal)) ||
        (o.category && o.category.toLowerCase().includes(searchVal)) ||
        o.amount.toString().includes(searchVal)
      );
    }

    if (typeFilter !== 'all') {
      ops = ops.filter(o => o.type === typeFilter);
    }

    if (catFilter !== 'all') {
      ops = ops.filter(o => o.category === catFilter);
    }

    const tableBody = document.getElementById('historyTableBody');
    if (!tableBody) return;

    if (ops.length === 0) {
      tableBody.innerHTML = `<tr><td colspan="6" class="text-center" style="padding:36px; color:var(--text-muted);">Aucune opération trouvée pour ces filtres.</td></tr>`;
      return;
    }

    tableBody.innerHTML = ops.map(op => `
      <tr>
        <td>${new Date(op.date).toLocaleString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</td>
        <td><span class="badge ${op.type === 'in' ? 'badge-success' : 'badge-danger'}">${op.type === 'in' ? 'Entrée' : 'Dépense'}</span></td>
        <td><strong>${op.category}</strong></td>
        <td>${op.description || '-'}</td>
        <td style="font-weight:700; color:${op.type === 'in' ? 'var(--success)' : 'var(--danger)'};">
          ${op.type === 'in' ? '+' : '-'}${store.formatMoney(op.amount)}
        </td>
        <td>
          <button class="btn btn-sm btn-secondary" onclick="App.openEditOperationModal('${op.id}')" title="Modifier">✏️</button>
          <button class="btn btn-sm btn-outline-danger" onclick="App.confirmDeleteOperation('${op.id}')" title="Supprimer">🗑️</button>
        </td>
      </tr>
    `).join('');
  },

  confirmDeleteOperation(id) {
    if (confirm('Voulez-vous vraiment supprimer cette opération financière ?')) {
      window.store.deleteOperation(id);
      this.showToast('Opération supprimée.', 'info');
      this.renderHistory();
      this.renderDashboard();
    }
  },

  // 6. PRODUITS & STOCK
  renderProducts() {
    const store = window.store;
    let products = store.getProducts();

    const searchVal = (document.getElementById('productSearch')?.value || '').toLowerCase().trim();
    const catVal = document.getElementById('productCatFilter')?.value || 'all';

    // Catégories filtre
    const catFilter = document.getElementById('productCatFilter');
    if (catFilter && catFilter.options.length <= 1) {
      catFilter.innerHTML = '<option value="all">Toutes les catégories</option>' +
        store.data.productCategories.map(c => `<option value="${c}">${c}</option>`).join('');
    }

    if (searchVal) {
      products = products.filter(p => 
        p.name.toLowerCase().includes(searchVal) ||
        (p.ref && p.ref.toLowerCase().includes(searchVal)) ||
        (p.category && p.category.toLowerCase().includes(searchVal))
      );
    }

    if (catVal !== 'all') {
      products = products.filter(p => p.category === catVal);
    }

    const tableBody = document.getElementById('productsTableBody');
    if (!tableBody) return;

    if (products.length === 0) {
      tableBody.innerHTML = `
        <tr>
          <td colspan="8" style="padding:40px; text-align:center;">
            <div class="empty-state" style="border:none; padding:0;">
              <h3>Aucun produit trouvé</h3>
              <p>Ajoutez un nouveau produit ou chargez des données de démonstration.</p>
              <button class="btn btn-primary" onclick="App.openAddProductModal()">+ Ajouter un produit</button>
            </div>
          </td>
        </tr>
      `;
      return;
    }

    tableBody.innerHTML = products.map(p => {
      const margin = p.sellPrice - p.buyPrice;
      const marginPct = p.sellPrice > 0 ? Math.round((margin / p.sellPrice) * 100) : 0;
      
      let stockBadgeClass = 'badge-success';
      let stockStatusText = 'Optimal';
      if (p.stock === 0) {
        stockBadgeClass = 'badge-danger';
        stockStatusText = 'Rupture';
      } else if (p.stock <= p.minStock) {
        stockBadgeClass = 'badge-warning';
        stockStatusText = 'Stock Faible';
      }

      return `
        <tr>
          <td>
            <strong>${p.name}</strong><br>
            <small style="color:var(--text-muted); font-family:monospace;">${p.ref}</small>
          </td>
          <td><span class="badge badge-muted">${p.category}</span></td>
          <td>${store.formatMoney(p.buyPrice)}</td>
          <td><strong>${store.formatMoney(p.sellPrice)}</strong></td>
          <td>
            <span style="color:var(--success); font-weight:700;">+${store.formatMoney(margin)}</span>
            <small style="color:var(--text-muted);">(${marginPct}%)</small>
          </td>
          <td>
            <span class="badge ${stockBadgeClass}">${p.stock} un. (${stockStatusText})</span><br>
            <small style="color:var(--text-muted);">Min: ${p.minStock}</small>
          </td>
          <td>
            <div style="display:flex; gap:6px;">
              <button class="btn btn-sm btn-secondary" onclick="App.openRestockModal('${p.id}')" title="Réapprovisionner">📦 +</button>
              <button class="btn btn-sm btn-secondary" onclick="App.openEditProductModal('${p.id}')" title="Modifier">✏️</button>
              <button class="btn btn-sm btn-outline-danger" onclick="App.confirmDeleteProduct('${p.id}')" title="Supprimer">🗑️</button>
            </div>
          </td>
        </tr>
      `;
    }).join('');

    // Produits à réapprovisionner
    const lowStockContainer = document.getElementById('lowStockList');
    if (lowStockContainer) {
      const needRestock = store.getProducts().filter(p => p.stock <= p.minStock);
      if (needRestock.length === 0) {
        lowStockContainer.innerHTML = '<p style="color:var(--success); font-size:13px; font-weight:600;">✓ Tous les stocks sont à un niveau optimal.</p>';
      } else {
        lowStockContainer.innerHTML = needRestock.map(p => `
          <div style="display:flex; align-items:center; justify-content:space-between; padding:10px 12px; background:var(--bg-muted); border-radius:8px; margin-bottom:8px;">
            <div>
              <strong>${p.name}</strong>
              <div style="font-size:12px; color:${p.stock === 0 ? 'var(--danger)' : 'var(--warning)'}; font-weight:600;">
                Stock actuel : ${p.stock} / Seuil : ${p.minStock}
              </div>
            </div>
            <button class="btn btn-sm btn-primary" onclick="App.openRestockModal('${p.id}')">Réapprovisionner</button>
          </div>
        `).join('');
      }
    }
  },

  openAddProductModal() {
    document.getElementById('productModalTitle').textContent = 'Ajouter un Produit';
    document.getElementById('productIdEdit').value = '';
    document.getElementById('prodName').value = '';
    document.getElementById('prodRef').value = 'REF-' + Math.floor(1000 + Math.random() * 9000);
    document.getElementById('prodCategory').value = 'Alimentation';
    document.getElementById('prodBuyPrice').value = '';
    document.getElementById('prodSellPrice').value = '';
    document.getElementById('prodStock').value = '0';
    document.getElementById('prodMinStock').value = '5';
    this.openModal('modalProduct');
  },

  openEditProductModal(id) {
    const p = window.store.getProduct(id);
    if (!p) return;
    document.getElementById('productModalTitle').textContent = 'Modifier le Produit';
    document.getElementById('productIdEdit').value = p.id;
    document.getElementById('prodName').value = p.name;
    document.getElementById('prodRef').value = p.ref;
    document.getElementById('prodCategory').value = p.category;
    document.getElementById('prodBuyPrice').value = p.buyPrice;
    document.getElementById('prodSellPrice').value = p.sellPrice;
    document.getElementById('prodStock').value = p.stock;
    document.getElementById('prodMinStock').value = p.minStock;
    this.openModal('modalProduct');
  },

  saveProductSubmit(event) {
    if (event) event.preventDefault();
    const id = document.getElementById('productIdEdit').value;
    const name = document.getElementById('prodName').value.trim();
    const ref = document.getElementById('prodRef').value.trim();
    const category = document.getElementById('prodCategory').value;
    const buyPrice = Number(document.getElementById('prodBuyPrice').value);
    const sellPrice = Number(document.getElementById('prodSellPrice').value);
    const stock = parseInt(document.getElementById('prodStock').value, 10);
    const minStock = parseInt(document.getElementById('prodMinStock').value, 10);

    if (!name) {
      this.showToast('Le nom du produit est obligatoire.', 'danger');
      return;
    }
    if (isNaN(sellPrice) || sellPrice < 0) {
      this.showToast('Le prix de vente doit être supérieur ou égal à 0.', 'danger');
      return;
    }

    try {
      if (id) {
        window.store.updateProduct(id, { name, ref, category, buyPrice, sellPrice, stock, minStock });
        this.showToast('Produit mis à jour avec succès.', 'success');
      } else {
        window.store.addProduct({ name, ref, category, buyPrice, sellPrice, stock, minStock });
        this.showToast('Nouveau produit ajouté avec succès.', 'success');
      }
      this.closeModal('modalProduct');
      this.renderProducts();
    } catch (e) {
      this.showToast(e.message, 'danger');
    }
  },

  confirmDeleteProduct(id) {
    const p = window.store.getProduct(id);
    if (!p) return;
    if (confirm(`Voulez-vous vraiment supprimer le produit "${p.name}" ?`)) {
      window.store.deleteProduct(id);
      this.showToast('Produit supprimé du catalogue.', 'info');
      this.renderProducts();
    }
  },

  openRestockModal(id) {
    const p = window.store.getProduct(id);
    if (!p) return;
    document.getElementById('restockProdId').value = p.id;
    document.getElementById('restockProdName').textContent = p.name;
    document.getElementById('restockCurrentStock').textContent = `${p.stock} unités`;
    document.getElementById('restockQty').value = '10';
    document.getElementById('restockUnitCost').value = p.buyPrice;
    document.getElementById('restockRecordExpense').checked = true;
    this.openModal('modalRestock');
  },

  submitRestock(event) {
    if (event) event.preventDefault();
    const id = document.getElementById('restockProdId').value;
    const qty = parseInt(document.getElementById('restockQty').value, 10);
    const cost = Number(document.getElementById('restockUnitCost').value);
    const createExp = document.getElementById('restockRecordExpense').checked;

    if (isNaN(qty) || qty <= 0) {
      this.showToast('Quantité invalide.', 'danger');
      return;
    }

    try {
      window.store.restockProduct(id, qty, cost, createExp);
      this.showToast(`Stock réapprovisionné (+${qty} unités).`, 'success');
      this.closeModal('modalRestock');
      this.renderProducts();
      this.renderDashboard();
    } catch (e) {
      this.showToast(e.message, 'danger');
    }
  },

  // 7. VENTES (POS RAPIDE)
  renderSales() {
    const store = window.store;
    const products = store.getProducts();
    const clients = store.getClients();

    // Remplir la sélection client
    const clientSelect = document.getElementById('posClientSelect');
    if (clientSelect) {
      clientSelect.innerHTML = '<option value="">Client comptoir (Anonyme)</option>' +
        clients.map(c => `<option value="${c.id}">${c.name} ${c.debt > 0 ? `(Dette: ${store.formatMoney(c.debt)})` : ''}</option>`).join('');
    }

    // Grille de sélection de produit
    const grid = document.getElementById('posProductPicker');
    if (grid) {
      if (products.length === 0) {
        grid.innerHTML = '<div style="grid-column:1/-1; padding:24px; text-align:center; color:var(--text-muted);">Aucun produit disponible pour la vente.</div>';
      } else {
        grid.innerHTML = products.map(p => {
          const isOut = p.stock === 0;
          return `
            <div class="product-card-selectable ${isOut ? 'out-of-stock' : ''}" onclick="${isOut ? '' : `App.selectProductForSale('${p.id}')`}">
              <div>
                <strong style="font-size:14px;">${p.name}</strong>
                <div style="font-size:12px; color:var(--text-muted);">${p.category}</div>
              </div>
              <div style="margin-top:12px; display:flex; justify-content:space-between; align-items:center;">
                <span style="font-weight:800; color:var(--primary);">${store.formatMoney(p.sellPrice)}</span>
                <span class="badge ${isOut ? 'badge-danger' : (p.stock <= p.minStock ? 'badge-warning' : 'badge-success')}">
                  ${isOut ? 'Épuisé' : `${p.stock} en stock`}
                </span>
              </div>
            </div>
          `;
        }).join('');
      }
    }

    // Historique des ventes récent
    this.renderSalesHistoryTable();
  },

  selectProductForSale(productId) {
    const p = window.store.getProduct(productId);
    if (!p) return;
    if (p.stock <= 0) {
      this.showToast(`Stock épuisé pour ${p.name}.`, 'danger');
      return;
    }

    document.getElementById('posProductId').value = p.id;
    document.getElementById('posProductNameDisplay').textContent = p.name;
    document.getElementById('posProductAvailableStock').textContent = `Stock dispo : ${p.stock}`;
    document.getElementById('posUnitPriceDisplay').textContent = window.store.formatMoney(p.sellPrice);
    document.getElementById('posQty').value = '1';
    document.getElementById('posQty').max = p.stock;

    this.recalcPosTotal();
  },

  recalcPosTotal() {
    const prodId = document.getElementById('posProductId').value;
    if (!prodId) return;

    const p = window.store.getProduct(prodId);
    if (!p) return;

    let qty = parseInt(document.getElementById('posQty').value, 10);
    if (isNaN(qty) || qty < 1) qty = 1;

    const total = p.sellPrice * qty;
    const profit = (p.sellPrice - p.buyPrice) * qty;

    document.getElementById('posTotalAmountDisplay').textContent = window.store.formatMoney(total);
    document.getElementById('posProfitDisplay').textContent = '+' + window.store.formatMoney(profit);

    const paidType = document.querySelector('input[name="posPaymentType"]:checked')?.value || 'full';
    const partialInput = document.getElementById('posPartialPaidAmount');
    if (paidType === 'full') {
      if (partialInput) partialInput.value = total;
    } else if (paidType === 'credit') {
      if (partialInput) partialInput.value = 0;
    }
  },

  handlePosPaymentTypeChange(type) {
    const partialBox = document.getElementById('posPartialPaidWrapper');
    if (partialBox) {
      partialBox.style.display = (type === 'partial') ? 'block' : 'none';
    }
    this.recalcPosTotal();
  },

  submitPosSale(event) {
    if (event) event.preventDefault();
    const prodId = document.getElementById('posProductId').value;
    if (!prodId) {
      this.showToast('Veuillez sélectionner un produit à vendre.', 'warning');
      return;
    }

    const p = window.store.getProduct(prodId);
    if (!p) return;

    const qty = parseInt(document.getElementById('posQty').value, 10);
    if (isNaN(qty) || qty <= 0) {
      this.showToast('Veuillez spécifier une quantité valide.', 'danger');
      return;
    }

    // CONTRÔLE STRICT DU STOCK (Règles 1, 15)
    if (qty > p.stock) {
      this.showToast(`Stock insuffisant. Quantité disponible : ${p.stock}`, 'danger');
      alert(`Stock insuffisant. Quantité disponible : ${p.stock}`);
      return;
    }

    const clientId = document.getElementById('posClientSelect').value || null;
    const payType = document.querySelector('input[name="posPaymentType"]:checked')?.value || 'full';
    const total = p.sellPrice * qty;

    let paidAmount = total;
    if (payType === 'credit') {
      if (!clientId) {
        this.showToast('Une vente à crédit nécessite de sélectionner un client.', 'warning');
        return;
      }
      paidAmount = 0;
    } else if (payType === 'partial') {
      if (!clientId) {
        this.showToast('Une vente avec paiement partiel nécessite de sélectionner un client.', 'warning');
        return;
      }
      paidAmount = Number(document.getElementById('posPartialPaidAmount').value) || 0;
    }

    try {
      const sale = window.store.recordSale({
        productId: prodId,
        quantity: qty,
        clientId,
        paidAmount,
        date: new Date().toISOString()
      });

      this.showToast(`Vente enregistrée avec succès ! (${window.store.formatMoney(total)})`, 'success');

      // Réinitialiser le formulaire POS
      document.getElementById('posProductId').value = '';
      document.getElementById('posProductNameDisplay').textContent = 'Aucun produit sélectionné';
      document.getElementById('posProductAvailableStock').textContent = '-';
      document.getElementById('posUnitPriceDisplay').textContent = '-';
      document.getElementById('posTotalAmountDisplay').textContent = '0 ' + window.store.getSettings().currency;
      document.getElementById('posProfitDisplay').textContent = '-';
      document.getElementById('posQty').value = '1';

      this.renderSales();
      this.renderDashboard();

      // Proposer le ticket de caisse
      this.showReceiptModal(sale);
    } catch (e) {
      this.showToast(e.message, 'danger');
    }
  },

  showReceiptModal(sale) {
    const store = window.store;
    const settings = store.getSettings();
    const modal = document.getElementById('modalReceipt');
    const content = document.getElementById('receiptContent');

    if (!modal || !content) return;

    content.innerHTML = `
      <div class="receipt-box">
        <div style="text-align:center; border-bottom:1px dashed #94A3B8; padding-bottom:12px; margin-bottom:12px;">
          <h2 style="font-size:18px; margin:0; font-weight:800;">${settings.shopName || 'MA CAISSE'}</h2>
          <p style="font-size:12px; margin:2px 0;">${settings.description || 'Commerce Général'}</p>
          <p style="font-size:12px; margin:2px 0;">Tél : ${settings.phone || '-'}</p>
          <p style="font-size:11px; margin:4px 0 0 0; color:#64748B;">Date : ${new Date(sale.date).toLocaleString('fr-FR')}</p>
          <p style="font-size:11px; margin:2px 0 0 0; color:#64748B;">Ticket : ${sale.id}</p>
        </div>

        <div style="margin-bottom:14px; font-size:13px;">
          <div style="display:flex; justify-content:space-between; font-weight:700; border-bottom:1px solid #E2E8F0; padding-bottom:4px;">
            <span>Désignation</span>
            <span>Montant</span>
          </div>
          <div style="display:flex; justify-content:space-between; padding:8px 0;">
            <div>
              <strong>${sale.productName}</strong><br>
              <small>${sale.quantity} x ${store.formatMoney(sale.sellPrice)}</small>
            </div>
            <div style="font-weight:700; align-self:center;">
              ${store.formatMoney(sale.total)}
            </div>
          </div>
        </div>

        <div style="border-top:1px dashed #94A3B8; padding-top:10px; font-size:13px;">
          <div style="display:flex; justify-content:space-between; font-weight:800; font-size:15px; margin-bottom:4px;">
            <span>TOTAL :</span>
            <span>${store.formatMoney(sale.total)}</span>
          </div>
          <div style="display:flex; justify-content:space-between; margin-bottom:2px;">
            <span>Montant Réglé :</span>
            <span>${store.formatMoney(sale.paidAmount)}</span>
          </div>
          ${sale.debtAmount > 0 ? `
            <div style="display:flex; justify-content:space-between; color:var(--danger); font-weight:700;">
              <span>Reste à payer (Dette) :</span>
              <span>${store.formatMoney(sale.debtAmount)}</span>
            </div>
            <div style="font-size:11px; color:#64748B; margin-top:2px;">Client : ${sale.clientName}</div>
          ` : ''}
        </div>

        <div style="text-align:center; margin-top:20px; font-size:11px; color:#64748B; border-top:1px dashed #E2E8F0; padding-top:10px;">
          Merci pour votre visite ! • À bientôt
        </div>
      </div>
    `;

    this.openModal('modalReceipt');
  },

  renderSalesHistoryTable() {
    const store = window.store;
    let sales = store.getSales();

    const searchVal = (document.getElementById('salesSearch')?.value || '').toLowerCase().trim();
    if (searchVal) {
      sales = sales.filter(s =>
        s.productName.toLowerCase().includes(searchVal) ||
        (s.clientName && s.clientName.toLowerCase().includes(searchVal))
      );
    }

    const tbody = document.getElementById('salesTableBody');
    if (!tbody) return;

    if (sales.length === 0) {
      tbody.innerHTML = `<tr><td colspan="7" class="text-center" style="padding:28px; color:var(--text-muted);">Aucune vente enregistrée.</td></tr>`;
      return;
    }

    tbody.innerHTML = sales.map(s => `
      <tr>
        <td>${new Date(s.date).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}</td>
        <td><strong>${s.productName}</strong></td>
        <td style="text-align:center;">${s.quantity}</td>
        <td><strong>${store.formatMoney(s.total)}</strong></td>
        <td style="color:var(--success); font-weight:700;">+${store.formatMoney(s.profit)}</td>
        <td>
          ${s.clientName || 'Comptoir'}
          ${s.debtAmount > 0 ? `<br><small class="badge badge-warning" style="font-size:10px;">Dette: ${store.formatMoney(s.debtAmount)}</small>` : ''}
        </td>
        <td>
          <button class="btn btn-sm btn-secondary" onclick="App.showReceiptModalById('${s.id}')" title="Reçu">🧾</button>
          <button class="btn btn-sm btn-outline-danger" onclick="App.confirmDeleteSale('${s.id}')" title="Annuler">🗑️</button>
        </td>
      </tr>
    `).join('');
  },

  showReceiptModalById(id) {
    const s = window.store.getSales().find(x => x.id === id);
    if (s) this.showReceiptModal(s);
  },

  confirmDeleteSale(id) {
    if (confirm('Voulez-vous annuler cette vente ? Le stock sera réintégré et l’opération correspondante supprimée.')) {
      window.store.deleteSale(id);
      this.showToast('Vente annulée et stock restitué.', 'info');
      this.renderSales();
      this.renderDashboard();
    }
  },

  // 8. CLIENTS & DETTES
  renderClients() {
    const store = window.store;
    let clients = store.getClients();

    const searchVal = (document.getElementById('clientSearch')?.value || '').toLowerCase().trim();
    if (searchVal) {
      clients = clients.filter(c =>
        c.name.toLowerCase().includes(searchVal) ||
        (c.phone && c.phone.toLowerCase().includes(searchVal))
      );
    }

    const tbody = document.getElementById('clientsTableBody');
    if (!tbody) return;

    if (clients.length === 0) {
      tbody.innerHTML = `<tr><td colspan="6" class="text-center" style="padding:36px; color:var(--text-muted);">Aucun client enregistré.</td></tr>`;
      return;
    }

    tbody.innerHTML = clients.map(c => `
      <tr>
        <td>
          <strong>${c.name}</strong>
          ${c.debt > 0 ? '<span class="badge badge-danger" style="margin-left:8px; font-size:11px;">En dette</span>' : ''}
        </td>
        <td>${c.phone || '-'}</td>
        <td style="font-weight:700; color:${c.debt > 0 ? 'var(--danger)' : 'var(--text-main)'};">
          ${store.formatMoney(c.debt)}
        </td>
        <td>${store.formatMoney(c.totalPurchases || 0)}</td>
        <td>
          <div style="display:flex; gap:6px;">
            ${c.debt > 0 ? `<button class="btn btn-sm btn-success" onclick="App.openRepayDebtModal('${c.id}')">💰 Payer dette</button>` : ''}
            <button class="btn btn-sm btn-secondary" onclick="App.openClientCardModal('${c.id}')" title="Fiche client">📋 Fiche</button>
            <button class="btn btn-sm btn-secondary" onclick="App.openEditClientModal('${c.id}')" title="Modifier">✏️</button>
            <button class="btn btn-sm btn-outline-danger" onclick="App.confirmDeleteClient('${c.id}')" title="Supprimer">🗑️</button>
          </div>
        </td>
      </tr>
    `).join('');

    // Résumé global des dettes
    const totalDebt = clients.reduce((sum, c) => sum + (c.debt || 0), 0);
    const debtSummaryEl = document.getElementById('clientsTotalDebtSummary');
    if (debtSummaryEl) {
      debtSummaryEl.textContent = store.formatMoney(totalDebt);
    }
  },

  openAddClientModal() {
    document.getElementById('clientModalTitle').textContent = 'Nouveau Client';
    document.getElementById('clientIdEdit').value = '';
    document.getElementById('clientName').value = '';
    document.getElementById('clientPhone').value = '';
    document.getElementById('clientInitialDebt').value = '0';
    this.openModal('modalClient');
  },

  openEditClientModal(id) {
    const c = window.store.getClient(id);
    if (!c) return;
    document.getElementById('clientModalTitle').textContent = 'Modifier le Client';
    document.getElementById('clientIdEdit').value = c.id;
    document.getElementById('clientName').value = c.name;
    document.getElementById('clientPhone').value = c.phone;
    document.getElementById('clientInitialDebt').value = c.debt;
    this.openModal('modalClient');
  },

  saveClientSubmit(event) {
    if (event) event.preventDefault();
    const id = document.getElementById('clientIdEdit').value;
    const name = document.getElementById('clientName').value.trim();
    const phone = document.getElementById('clientPhone').value.trim();
    const debt = Number(document.getElementById('clientInitialDebt').value) || 0;

    if (!name) {
      this.showToast('Le nom du client est obligatoire.', 'danger');
      return;
    }

    try {
      if (id) {
        window.store.updateClient(id, { name, phone, debt });
        this.showToast('Client mis à jour.', 'success');
      } else {
        window.store.addClient({ name, phone, initialDebt: debt });
        this.showToast('Client enregistré avec succès.', 'success');
      }
      this.closeModal('modalClient');
      this.renderClients();
    } catch (e) {
      this.showToast(e.message, 'danger');
    }
  },

  openRepayDebtModal(id) {
    const c = window.store.getClient(id);
    if (!c) return;
    document.getElementById('repayClientId').value = c.id;
    document.getElementById('repayClientName').textContent = c.name;
    document.getElementById('repayCurrentDebt').textContent = window.store.formatMoney(c.debt);
    document.getElementById('repayAmount').value = c.debt;
    document.getElementById('repayAmount').max = c.debt;
    this.openModal('modalRepayDebt');
  },

  submitRepayDebt(event) {
    if (event) event.preventDefault();
    const id = document.getElementById('repayClientId').value;
    const amount = Number(document.getElementById('repayAmount').value);

    try {
      window.store.repayClientDebt(id, amount);
      this.showToast(`Paiement de ${window.store.formatMoney(amount)} enregistré avec succès.`, 'success');
      this.closeModal('modalRepayDebt');
      this.renderClients();
      this.renderDashboard();
    } catch (e) {
      this.showToast(e.message, 'danger');
    }
  },

  openClientCardModal(id) {
    const c = window.store.getClient(id);
    if (!c) return;

    const sales = window.store.getSales().filter(s => s.clientId === c.id);
    const content = document.getElementById('clientCardDetails');
    if (!content) return;

    content.innerHTML = `
      <div style="background:#F8FAFC; border:1px solid #E2E8F0; padding:16px; border-radius:12px; margin-bottom:18px;">
        <div style="display:flex; justify-content:space-between; align-items:center;">
          <div>
            <h3 style="font-size:18px; margin:0; font-weight:800;">${c.name}</h3>
            <p style="margin:2px 0; color:#64748B; font-size:13px;">📞 ${c.phone || 'Non renseigné'}</p>
          </div>
          <div style="text-align:right;">
            <div style="font-size:11px; text-transform:uppercase; color:#64748B; font-weight:700;">Dette Actuelle</div>
            <div style="font-size:20px; font-weight:800; color:${c.debt > 0 ? 'var(--danger)' : 'var(--success)'};">
              ${window.store.formatMoney(c.debt)}
            </div>
          </div>
        </div>
        <div style="margin-top:10px; font-size:13px; color:#64748B;">
          Total des achats cumulés : <strong>${window.store.formatMoney(c.totalPurchases || 0)}</strong>
        </div>
      </div>

      <h4 style="font-size:14px; font-weight:700; margin-bottom:8px;">Historique des achats (${sales.length})</h4>
      <div style="max-height:220px; overflow-y:auto; border:1px solid #E2E8F0; border-radius:8px;">
        <table class="data-table" style="font-size:13px;">
          <thead>
            <tr>
              <th>Date</th>
              <th>Produit</th>
              <th>Qté</th>
              <th>Total</th>
              <th>Statut</th>
            </tr>
          </thead>
          <tbody>
            ${sales.length === 0 ? '<tr><td colspan="5" style="text-align:center; padding:16px;">Aucun achat.</td></tr>' : 
              sales.map(s => `
                <tr>
                  <td>${new Date(s.date).toLocaleDateString('fr-FR')}</td>
                  <td>${s.productName}</td>
                  <td>${s.quantity}</td>
                  <td>${window.store.formatMoney(s.total)}</td>
                  <td><span class="badge ${s.debtAmount > 0 ? 'badge-warning' : 'badge-success'}">${s.debtAmount > 0 ? 'Partiel/Crédit' : 'Payé'}</span></td>
                </tr>
              `).join('')
            }
          </tbody>
        </table>
      </div>
    `;

    this.openModal('modalClientCard');
  },

  confirmDeleteClient(id) {
    const c = window.store.getClient(id);
    if (!c) return;
    if (confirm(`Voulez-vous supprimer le client "${c.name}" ?`)) {
      window.store.deleteClient(id);
      this.showToast('Client supprimé.', 'info');
      this.renderClients();
    }
  },

  // 9. STATISTIQUES & RAPPORTS
  renderStats() {
    const period = document.getElementById('statsPeriodFilter')?.value || '30days';
    const metrics = window.store.calculateMetrics(period);
    const store = window.store;

    document.getElementById('statCA').textContent = store.formatMoney(metrics.chiffreAffaires);
    document.getElementById('statDepenses').textContent = store.formatMoney(metrics.totalDepenses);
    document.getElementById('statBenefBrut').textContent = store.formatMoney(metrics.beneficeBrut);
    document.getElementById('statBenefEstime').textContent = store.formatMoney(metrics.beneficeEstime);
    document.getElementById('statMarge').textContent = metrics.marge.toFixed(1) + ' %';
    document.getElementById('statSalesCount').textContent = metrics.salesCount;
    document.getElementById('statItemsSold').textContent = metrics.itemsSold;
    document.getElementById('statStockValue').textContent = store.formatMoney(metrics.valeurStockAchat);

    window.Charts.renderSalesTrend('statsTrendChart', period);
    window.Charts.renderTopProducts('statsTopProducts');
  },

  renderReports() {
    const store = window.store;
    const metrics = store.calculateMetrics('all');

    document.getElementById('repTotalSales').textContent = store.formatMoney(metrics.chiffreAffaires);
    document.getElementById('repTotalPurchases').textContent = store.formatMoney(metrics.coutProduitsVendus);
    document.getElementById('repGrossProfit').textContent = store.formatMoney(metrics.beneficeBrut);
    document.getElementById('repStockBuyVal').textContent = store.formatMoney(metrics.valeurStockAchat);
    document.getElementById('repStockSellVal').textContent = store.formatMoney(metrics.valeurStockVente);
    document.getElementById('repTotalDebt').textContent = store.formatMoney(metrics.totalDettes);
  },

  // 10. PARAMÈTRES
  renderSettings() {
    const s = window.store.getSettings();
    document.getElementById('setShopName').value = s.shopName || '';
    document.getElementById('setDescription').value = s.description || '';
    document.getElementById('setPhone').value = s.phone || '';
    document.getElementById('setAddress').value = s.address || '';
    document.getElementById('setCurrency').value = s.currency || 'FCFA';
  },

  saveSettingsSubmit(event) {
    if (event) event.preventDefault();
    const shopName = document.getElementById('setShopName').value.trim();
    if (!shopName) {
      this.showToast('Le nom du commerce est obligatoire.', 'danger');
      return;
    }

    window.store.updateSettings({
      shopName,
      description: document.getElementById('setDescription').value.trim(),
      phone: document.getElementById('setPhone').value.trim(),
      address: document.getElementById('setAddress').value.trim(),
      currency: document.getElementById('setCurrency').value || 'FCFA'
    });

    this.showToast('Paramètres de la boutique enregistrés avec succès !', 'success');
  },

  loadDemoDataConfirm() {
    if (confirm('Voulez-vous charger les données de démonstration de Ma Caisse ? (Riz, Huile, Sucre, Boisson, Savon, clients et ventes de test)')) {
      window.store.loadDemoData();
      this.showToast('Données de démonstration chargées avec succès !', 'success');
      this.navigateTo('dashboard');
    }
  },

  resetAllDataConfirm() {
    const confirmation = prompt('ATTENTION : Cette action supprimera TOUTES les ventes, stocks, clients et opérations.\n\nTapez "SUPPRIMER" pour confirmer :');
    if (confirmation === 'SUPPRIMER') {
      window.store.resetAllData();
      this.showToast('Toutes les données ont été réinitialisées.', 'info');
      this.checkOnboarding();
      this.renderCurrentView();
    }
  },

  // 11. RECHERCHE GLOBALE
  handleGlobalSearch(query) {
    const resultsContainer = document.getElementById('globalSearchResults');
    if (!resultsContainer) return;

    const q = (query || '').toLowerCase().trim();
    if (!q) {
      resultsContainer.innerHTML = '<p style="padding:16px; color:var(--text-muted); text-align:center;">Tapez un mot-clé (produit, client, référence, montant...)</p>';
      return;
    }

    const store = window.store;
    const products = store.getProducts().filter(p => p.name.toLowerCase().includes(q) || p.ref.toLowerCase().includes(q));
    const clients = store.getClients().filter(c => c.name.toLowerCase().includes(q) || c.phone.includes(q));
    const sales = store.getSales().filter(s => s.productName.toLowerCase().includes(q) || (s.clientName && s.clientName.toLowerCase().includes(q)));
    const ops = store.getOperations().filter(o => o.description.toLowerCase().includes(q) || o.category.toLowerCase().includes(q));

    let html = '';

    if (products.length > 0) {
      html += '<div style="font-size:11px; font-weight:700; color:var(--primary); text-transform:uppercase; margin:8px 0 4px;">Produits</div>';
      products.slice(0, 4).forEach(p => {
        html += `
          <div class="search-result-item" onclick="App.navigateTo('products'); App.closeModal('modalGlobalSearch');">
            <span><strong>${p.name}</strong> <small style="color:var(--text-muted); font-family:monospace;">(${p.ref})</small></span>
            <span style="font-weight:700; color:var(--primary);">${store.formatMoney(p.sellPrice)} • Stock: ${p.stock}</span>
          </div>
        `;
      });
    }

    if (clients.length > 0) {
      html += '<div style="font-size:11px; font-weight:700; color:var(--primary); text-transform:uppercase; margin:8px 0 4px;">Clients</div>';
      clients.slice(0, 4).forEach(c => {
        html += `
          <div class="search-result-item" onclick="App.navigateTo('clients'); App.closeModal('modalGlobalSearch');">
            <span><strong>${c.name}</strong> <small style="color:var(--text-muted);">${c.phone}</small></span>
            <span style="font-weight:700; color:${c.debt > 0 ? 'var(--danger)' : 'var(--success)'};">${c.debt > 0 ? 'Dette: ' + store.formatMoney(c.debt) : 'En règle'}</span>
          </div>
        `;
      });
    }

    if (sales.length > 0) {
      html += '<div style="font-size:11px; font-weight:700; color:var(--primary); text-transform:uppercase; margin:8px 0 4px;">Ventes</div>';
      sales.slice(0, 3).forEach(s => {
        html += `
          <div class="search-result-item" onclick="App.navigateTo('sales'); App.closeModal('modalGlobalSearch');">
            <span><strong>${s.productName}</strong> x${s.quantity} (${s.clientName || 'Comptoir'})</span>
            <span style="font-weight:700;">${store.formatMoney(s.total)}</span>
          </div>
        `;
      });
    }

    if (!html) {
      html = '<p style="padding:16px; color:var(--text-muted); text-align:center;">Aucun résultat trouvé pour cette recherche.</p>';
    }

    resultsContainer.innerHTML = html;
  },

  // 12. GESTION DES MODALES
  openModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
      modal.classList.add('active');
    }
  },

  closeModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
      modal.classList.remove('active');
    }
  },

  // 13. NOTIFICATIONS TOAST
  showToast(message, type = 'info') {
    const container = document.getElementById('toastContainer');
    if (!container) return;

    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    
    const icons = {
      success: '✓',
      danger: '⚠️',
      warning: '!',
      info: 'ℹ'
    };

    toast.innerHTML = `
      <span style="font-size:16px;">${icons[type] || 'ℹ'}</span>
      <span>${message}</span>
    `;

    container.appendChild(toast);

    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transform = 'translateX(100%)';
      toast.style.transition = 'all 0.3s ease';
      setTimeout(() => toast.remove(), 300);
    }, 3500);
  },

  // 14. PWA INSTALLATION
  setupPWA() {
    window.addEventListener('beforeinstallprompt', (e) => {
      e.preventDefault();
      this.deferredPrompt = e;
      const installBtn = document.getElementById('btnInstallPwa');
      if (installBtn) installBtn.style.display = 'inline-flex';
    });

    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('./sw.js').then((reg) => {
        console.log('Service Worker enregistré avec succès:', reg.scope);
      }).catch((err) => {
        console.warn('Erreur enregistrement Service Worker:', err);
      });
    }
  },

  promptInstall() {
    if (this.deferredPrompt) {
      this.deferredPrompt.prompt();
      this.deferredPrompt.userChoice.then((choiceResult) => {
        if (choiceResult.outcome === 'accepted') {
          this.showToast('Installation de Ma Caisse acceptée !', 'success');
        }
        this.deferredPrompt = null;
      });
    } else {
      alert("Pour installer l'application :\n• Sur Android / Chrome : Cliquez sur le menu du navigateur (3 points) puis 'Installer l'application'\n• Sur iPhone / Safari : Touchez l'icône Partager puis 'Sur l'écran d'accueil'");
    }
  },

  // Événements globaux
  bindEvents() {
    // Menu mobile toggle
    const toggleBtn = document.getElementById('mobileMenuToggle');
    const sidebar = document.getElementById('sidebar');
    if (toggleBtn && sidebar) {
      toggleBtn.addEventListener('click', () => {
        sidebar.classList.toggle('mobile-open');
      });
    }

    // Clic en dehors de la sidebar pour fermer sur mobile
    document.addEventListener('click', (e) => {
      if (sidebar && sidebar.classList.contains('mobile-open')) {
        if (!sidebar.contains(e.target) && e.target !== toggleBtn) {
          sidebar.classList.remove('mobile-open');
        }
      }
    });

    // Raccourci Ctrl+K / Cmd+K pour la recherche globale
    document.addEventListener('keydown', (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        this.openModal('modalGlobalSearch');
        setTimeout(() => document.getElementById('globalSearchInput')?.focus(), 100);
      }
      if (e.key === 'Escape') {
        document.querySelectorAll('.modal-overlay.active').forEach(m => m.classList.remove('active'));
      }
    });
  }
};

window.App = App;

// Initialisation au chargement du DOM
document.addEventListener('DOMContentLoaded', () => {
  App.init();
});
