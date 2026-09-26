// Gestion de l'état et persistance LocalStorage pour MA CAISSE V1.4
const STORAGE_KEY = 'ma_caisse_data_v1_4';

class DataStore {
  constructor() {
    this.data = this.load();
    this.listeners = [];
  }

  getDefaultData() {
    return {
      version: '1.4',
      settings: {
        shopName: '',
        description: '',
        phone: '',
        address: '',
        currency: 'FCFA',
        logo: '',
        configured: false,
        theme: 'light'
      },
      products: [],
      sales: [],
      operations: [],
      clients: [],
      categories: [
        'Vente',
        'Approvisionnement',
        'Transport',
        'Loyer',
        'Salaire',
        'Électricité',
        'Internet',
        'Remboursement dette',
        'Autre'
      ],
      productCategories: [
        'Alimentation',
        'Boissons',
        'Hygiène & Beauté',
        'Maison & Entretien',
        'Fournitures',
        'Autre'
      ]
    };
  }

  load() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return this.getDefaultData();
      const parsed = JSON.parse(raw);
      // Assurer la présence de toutes les clés
      const defaults = this.getDefaultData();
      return {
        ...defaults,
        ...parsed,
        settings: { ...defaults.settings, ...(parsed.settings || {}) },
        products: Array.isArray(parsed.products) ? parsed.products : [],
        sales: Array.isArray(parsed.sales) ? parsed.sales : [],
        operations: Array.isArray(parsed.operations) ? parsed.operations : [],
        clients: Array.isArray(parsed.clients) ? parsed.clients : [],
        categories: Array.isArray(parsed.categories) && parsed.categories.length ? parsed.categories : defaults.categories,
        productCategories: Array.isArray(parsed.productCategories) && parsed.productCategories.length ? parsed.productCategories : defaults.productCategories
      };
    } catch (e) {
      console.error('Erreur chargement localStorage:', e);
      return this.getDefaultData();
    }
  }

  save() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.data));
      this.notify();
      return true;
    } catch (e) {
      console.error('Erreur sauvegarde localStorage:', e);
      return false;
    }
  }

  subscribe(listener) {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter(l => l !== listener);
    };
  }

  notify() {
    this.listeners.forEach(fn => fn(this.data));
  }

  // --- SETTINGS ---
  getSettings() {
    return this.data.settings;
  }

  updateSettings(newSettings) {
    this.data.settings = { ...this.data.settings, ...newSettings };
    this.save();
  }

  formatMoney(amount) {
    const num = Number(amount) || 0;
    const currency = this.data.settings.currency || 'FCFA';
    return num.toLocaleString('fr-FR', { minimumFractionDigits: 0, maximumFractionDigits: 2 }) + ' ' + currency;
  }

  // --- PRODUITS ---
  getProducts() {
    return [...this.data.products];
  }

  getProduct(id) {
    return this.data.products.find(p => p.id === id);
  }

  addProduct(product) {
    if (!product.name || product.name.trim() === '') throw new Error('Le nom du produit est obligatoire.');
    const buyPrice = Math.max(0, Number(product.buyPrice) || 0);
    const sellPrice = Math.max(0, Number(product.sellPrice) || 0);
    const stock = Math.max(0, parseInt(product.stock, 10) || 0);
    const minStock = Math.max(0, parseInt(product.minStock, 10) || 0);

    const newProduct = {
      id: 'prod_' + Date.now() + '_' + Math.random().toString(36).substr(2, 4),
      name: product.name.trim(),
      ref: product.ref ? product.ref.trim() : 'REF-' + Math.floor(1000 + Math.random() * 9000),
      category: product.category || 'Général',
      buyPrice,
      sellPrice,
      stock,
      minStock,
      createdAt: new Date().toISOString()
    };

    this.data.products.unshift(newProduct);
    this.save();
    return newProduct;
  }

  updateProduct(id, updates) {
    const idx = this.data.products.findIndex(p => p.id === id);
    if (idx === -1) throw new Error('Produit introuvable.');

    const current = this.data.products[idx];
    this.data.products[idx] = {
      ...current,
      name: updates.name ? updates.name.trim() : current.name,
      ref: updates.ref ? updates.ref.trim() : current.ref,
      category: updates.category || current.category,
      buyPrice: updates.buyPrice !== undefined ? Math.max(0, Number(updates.buyPrice)) : current.buyPrice,
      sellPrice: updates.sellPrice !== undefined ? Math.max(0, Number(updates.sellPrice)) : current.sellPrice,
      stock: updates.stock !== undefined ? Math.max(0, parseInt(updates.stock, 10)) : current.stock,
      minStock: updates.minStock !== undefined ? Math.max(0, parseInt(updates.minStock, 10)) : current.minStock
    };

    this.save();
    return this.data.products[idx];
  }

  deleteProduct(id) {
    this.data.products = this.data.products.filter(p => p.id !== id);
    this.save();
  }

  restockProduct(id, quantity, unitCost, recordExpense = true) {
    const qty = parseInt(quantity, 10);
    if (isNaN(qty) || qty <= 0) throw new Error('Quantité invalide pour le réapprovisionnement.');
    const product = this.getProduct(id);
    if (!product) throw new Error('Produit introuvable.');

    product.stock += qty;
    if (unitCost !== undefined && unitCost > 0) {
      product.buyPrice = Number(unitCost);
    }

    if (recordExpense) {
      const expenseAmount = (product.buyPrice || 0) * qty;
      if (expenseAmount > 0) {
        this.addOperation({
          type: 'out',
          category: 'Approvisionnement',
          amount: expenseAmount,
          description: `Approvisionnement: ${product.name} (+${qty})`,
          date: new Date().toISOString()
        });
      }
    }

    this.save();
    return product;
  }

  // --- VENTES ---
  getSales() {
    return [...this.data.sales];
  }

  recordSale({ productId, quantity, clientId, paidAmount, date }) {
    const qty = parseInt(quantity, 10);
    if (isNaN(qty) || qty <= 0) throw new Error('Quantité de vente invalide.');

    const product = this.getProduct(productId);
    if (!product) throw new Error('Produit sélectionné introuvable.');

    // RÈGLE 1 & 15 : Contrôle strict du stock
    if (qty > product.stock) {
      throw new Error(`Stock insuffisant. Quantité disponible : ${product.stock}`);
    }

    const buyPrice = product.buyPrice;
    const sellPrice = product.sellPrice;
    const total = sellPrice * qty;
    const profit = (sellPrice - buyPrice) * qty;

    const actualPaid = paidAmount !== undefined ? Math.min(total, Math.max(0, Number(paidAmount))) : total;
    const debtAmount = total - actualPaid;

    // Décrémenter le stock
    product.stock -= qty;

    let clientName = 'Client comptoir';
    if (clientId) {
      const client = this.getClient(clientId);
      if (client) {
        clientName = client.name;
        client.totalPurchases = (client.totalPurchases || 0) + total;
        if (debtAmount > 0) {
          client.debt = (client.debt || 0) + debtAmount;
        }
      }
    }

    const saleId = 'sale_' + Date.now() + '_' + Math.random().toString(36).substr(2, 4);
    const saleRecord = {
      id: saleId,
      date: date || new Date().toISOString(),
      productId: product.id,
      productName: product.name,
      productRef: product.ref,
      quantity: qty,
      buyPrice,
      sellPrice,
      total,
      profit,
      clientId: clientId || null,
      clientName,
      paidAmount: actualPaid,
      debtAmount,
      paymentStatus: debtAmount === 0 ? 'paid' : (actualPaid > 0 ? 'partial' : 'credit')
    };

    this.data.sales.unshift(saleRecord);

    // RÈGLE 3 & 16 : Lien Vente -> Opération financière
    if (actualPaid > 0) {
      this.addOperation({
        type: 'in',
        category: 'Vente',
        amount: actualPaid,
        description: `Vente: ${product.name} x ${qty} (${clientName})`,
        date: saleRecord.date,
        saleId: saleRecord.id
      });
    }

    this.save();
    return saleRecord;
  }

  deleteSale(id) {
    const sale = this.data.sales.find(s => s.id === id);
    if (!sale) return;

    // Optionnel : restituer le stock
    const product = this.getProduct(sale.productId);
    if (product) {
      product.stock += sale.quantity;
    }

    // Supprimer l'opération liée
    this.data.operations = this.data.operations.filter(op => op.saleId !== id);
    this.data.sales = this.data.sales.filter(s => s.id !== id);
    this.save();
  }

  // --- OPÉRATIONS ---
  getOperations() {
    return [...this.data.operations];
  }

  addOperation({ type, category, amount, description, date, saleId }) {
    const numAmount = Number(amount);
    if (isNaN(numAmount) || numAmount <= 0) throw new Error('Le montant doit être supérieur à zéro.');
    if (!type || (type !== 'in' && type !== 'out')) throw new Error('Type d’opération invalide.');

    const newOp = {
      id: 'op_' + Date.now() + '_' + Math.random().toString(36).substr(2, 4),
      type, // 'in' ou 'out'
      category: category || (type === 'in' ? 'Vente' : 'Autre'),
      amount: numAmount,
      description: (description || '').trim(),
      date: date || new Date().toISOString(),
      saleId: saleId || null,
      createdAt: new Date().toISOString()
    };

    this.data.operations.unshift(newOp);
    this.save();
    return newOp;
  }

  updateOperation(id, updates) {
    const idx = this.data.operations.findIndex(o => o.id === id);
    if (idx === -1) throw new Error('Opération introuvable.');

    const current = this.data.operations[idx];
    this.data.operations[idx] = {
      ...current,
      type: updates.type || current.type,
      category: updates.category || current.category,
      amount: updates.amount !== undefined ? Math.max(0.01, Number(updates.amount)) : current.amount,
      description: updates.description !== undefined ? updates.description.trim() : current.description,
      date: updates.date || current.date
    };

    this.save();
    return this.data.operations[idx];
  }

  deleteOperation(id) {
    this.data.operations = this.data.operations.filter(o => o.id !== id);
    this.save();
  }

  // --- CLIENTS ---
  getClients() {
    return [...this.data.clients];
  }

  getClient(id) {
    return this.data.clients.find(c => c.id === id);
  }

  addClient({ name, phone, initialDebt }) {
    if (!name || name.trim() === '') throw new Error('Le nom du client est obligatoire.');
    const debt = Math.max(0, Number(initialDebt) || 0);

    const newClient = {
      id: 'cli_' + Date.now() + '_' + Math.random().toString(36).substr(2, 4),
      name: name.trim(),
      phone: (phone || '').trim(),
      debt,
      totalPurchases: 0,
      createdAt: new Date().toISOString()
    };

    this.data.clients.unshift(newClient);
    this.save();
    return newClient;
  }

  updateClient(id, updates) {
    const idx = this.data.clients.findIndex(c => c.id === id);
    if (idx === -1) throw new Error('Client introuvable.');

    const current = this.data.clients[idx];
    this.data.clients[idx] = {
      ...current,
      name: updates.name ? updates.name.trim() : current.name,
      phone: updates.phone !== undefined ? updates.phone.trim() : current.phone,
      debt: updates.debt !== undefined ? Math.max(0, Number(updates.debt)) : current.debt
    };

    this.save();
    return this.data.clients[idx];
  }

  deleteClient(id) {
    this.data.clients = this.data.clients.filter(c => c.id !== id);
    this.save();
  }

  // RÈGLE 8 & 19 : Remboursement de dette client
  repayClientDebt(clientId, amount) {
    const numAmount = Number(amount);
    if (isNaN(numAmount) || numAmount <= 0) throw new Error('Le montant du paiement doit être supérieur à zéro.');

    const client = this.getClient(clientId);
    if (!client) throw new Error('Client introuvable.');

    if (numAmount > client.debt) {
      throw new Error(`Le montant ne peut pas dépasser la dette actuelle (${this.formatMoney(client.debt)}).`);
    }

    client.debt = Math.max(0, client.debt - numAmount);

    // Enregistrer l'opération d'entrée correspondante
    this.addOperation({
      type: 'in',
      category: 'Remboursement dette',
      amount: numAmount,
      description: `Règlement dette client: ${client.name}`,
      date: new Date().toISOString()
    });

    this.save();
    return client;
  }

  // --- STATISTIQUES & CALCULS DU TABLEAU DE BORD ---
  calculateMetrics(period = 'all') {
    const now = new Date();
    let filterDate = null;

    if (period === 'today') {
      filterDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    } else if (period === '7days') {
      filterDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    } else if (period === '30days') {
      filterDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    } else if (period === 'month') {
      filterDate = new Date(now.getFullYear(), now.getMonth(), 1);
    } else if (period === 'prev_month') {
      filterDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    }

    const isWithinPeriod = (dateStr) => {
      if (!filterDate) return true;
      const d = new Date(dateStr);
      if (period === 'prev_month') {
        const start = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        const end = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59);
        return d >= start && d <= end;
      }
      return d >= filterDate;
    };

    // 1. Filtrer les ventes et opérations
    const filteredSales = this.data.sales.filter(s => isWithinPeriod(s.date));
    const filteredOps = this.data.operations.filter(o => isWithinPeriod(o.date));

    // Solde global de trésorerie (Entrées - Dépenses totales)
    const allIn = this.data.operations.filter(o => o.type === 'in').reduce((sum, o) => sum + o.amount, 0);
    const allOut = this.data.operations.filter(o => o.type === 'out').reduce((sum, o) => sum + o.amount, 0);
    const solde = allIn - allOut;

    // Chiffre d'affaires
    const chiffreAffaires = filteredSales.reduce((sum, s) => sum + s.total, 0);

    // Coût des produits vendus (Somme de buyPrice * quantité)
    const coutProduitsVendus = filteredSales.reduce((sum, s) => sum + (s.buyPrice * s.quantity), 0);

    // Bénéfice brut = Chiffre d'affaires - Coût des produits vendus
    const beneficeBrut = Math.max(0, chiffreAffaires - coutProduitsVendus);

    // Dépenses enregistrées sur la période (toutes dépenses)
    const totalDepenses = filteredOps.filter(o => o.type === 'out').reduce((sum, o) => sum + o.amount, 0);

    // Charges d'exploitation (dépenses hors approvisionnement direct pour éviter le double comptage avec le coût d'achat)
    const chargesExploitation = filteredOps
      .filter(o => o.type === 'out' && o.category !== 'Approvisionnement')
      .reduce((sum, o) => sum + o.amount, 0);

    // Bénéfice estimé = Bénéfice brut - Charges d'exploitation
    const beneficeEstime = beneficeBrut - chargesExploitation;

    // Marge % = (Bénéfice brut / Chiffre d'affaires) * 100
    const marge = chiffreAffaires > 0 ? ((beneficeBrut / chiffreAffaires) * 100) : 0;

    // Stocks alertes
    const lowStockCount = this.data.products.filter(p => p.stock <= p.minStock).length;
    const outOfStockCount = this.data.products.filter(p => p.stock === 0).length;

    // Total dettes clients
    const totalDettes = this.data.clients.reduce((sum, c) => sum + (c.debt || 0), 0);

    // Valeur totale stock
    const valeurStockAchat = this.data.products.reduce((sum, p) => sum + (p.stock * p.buyPrice), 0);
    const valeurStockVente = this.data.products.reduce((sum, p) => sum + (p.stock * p.sellPrice), 0);

    return {
      solde,
      chiffreAffaires,
      coutProduitsVendus,
      beneficeBrut,
      totalDepenses,
      chargesExploitation,
      beneficeEstime,
      marge,
      salesCount: filteredSales.length,
      itemsSold: filteredSales.reduce((sum, s) => sum + s.quantity, 0),
      lowStockCount,
      outOfStockCount,
      totalDettes,
      valeurStockAchat,
      valeurStockVente,
      period
    };
  }

  // Données de démonstration
  loadDemoData() {
    this.data.settings = {
      shopName: 'Épicerie Gaston & Fils',
      description: 'Commerce de détails & alimentation générale',
      phone: '+242 06 512 34 56',
      address: 'Avenue de la Paix, Brazzaville',
      currency: 'FCFA',
      logo: '',
      configured: true,
      theme: 'light'
    };

    this.data.products = [
      {
        id: 'prod_1',
        name: 'Sac de Riz Parfumé 25kg',
        ref: 'ALIM-001',
        category: 'Alimentation',
        buyPrice: 17500,
        sellPrice: 21500,
        stock: 14,
        minStock: 5,
        createdAt: new Date().toISOString()
      },
      {
        id: 'prod_2',
        name: 'Bidon d’Huile Végétale 5L',
        ref: 'ALIM-002',
        category: 'Alimentation',
        buyPrice: 4200,
        sellPrice: 5500,
        stock: 3,
        minStock: 5,
        createdAt: new Date().toISOString()
      },
      {
        id: 'prod_3',
        name: 'Paquet de Sucre en Morceaux 1kg',
        ref: 'ALIM-003',
        category: 'Alimentation',
        buyPrice: 850,
        sellPrice: 1100,
        stock: 22,
        minStock: 10,
        createdAt: new Date().toISOString()
      },
      {
        id: 'prod_4',
        name: 'Pack Boissons Gazeuses 33cl (x24)',
        ref: 'BOIS-001',
        category: 'Boissons',
        buyPrice: 6800,
        sellPrice: 8900,
        stock: 0,
        minStock: 4,
        createdAt: new Date().toISOString()
      },
      {
        id: 'prod_5',
        name: 'Carton Savon de Marseille (x30)',
        ref: 'HYG-001',
        category: 'Hygiène & Beauté',
        buyPrice: 5000,
        sellPrice: 6800,
        stock: 8,
        minStock: 3,
        createdAt: new Date().toISOString()
      }
    ];

    this.data.clients = [
      {
        id: 'cli_1',
        name: 'Mme Marie Kongo',
        phone: '06 600 11 22',
        debt: 5500,
        totalPurchases: 48500,
        createdAt: new Date().toISOString()
      },
      {
        id: 'cli_2',
        name: 'M. Jean-Paul Mbemba',
        phone: '05 522 33 44',
        debt: 0,
        totalPurchases: 64500,
        createdAt: new Date().toISOString()
      },
      {
        id: 'cli_3',
        name: 'Restaurant Le Palmier',
        phone: '06 888 99 00',
        debt: 21500,
        totalPurchases: 135000,
        createdAt: new Date().toISOString()
      }
    ];

    this.data.sales = [
      {
        id: 'sale_1',
        date: new Date(Date.now() - 3600000 * 2).toISOString(),
        productId: 'prod_1',
        productName: 'Sac de Riz Parfumé 25kg',
        productRef: 'ALIM-001',
        quantity: 2,
        buyPrice: 17500,
        sellPrice: 21500,
        total: 43000,
        profit: 8000,
        clientId: 'cli_2',
        clientName: 'M. Jean-Paul Mbemba',
        paidAmount: 43000,
        debtAmount: 0,
        paymentStatus: 'paid'
      },
      {
        id: 'sale_2',
        date: new Date(Date.now() - 3600000 * 6).toISOString(),
        productId: 'prod_2',
        productName: 'Bidon d’Huile Végétale 5L',
        productRef: 'ALIM-002',
        quantity: 1,
        buyPrice: 4200,
        sellPrice: 5500,
        total: 5500,
        profit: 1300,
        clientId: 'cli_1',
        clientName: 'Mme Marie Kongo',
        paidAmount: 0,
        debtAmount: 5500,
        paymentStatus: 'credit'
      },
      {
        id: 'sale_3',
        date: new Date(Date.now() - 3600000 * 24).toISOString(),
        productId: 'prod_5',
        productName: 'Carton Savon de Marseille (x30)',
        productRef: 'HYG-001',
        quantity: 1,
        buyPrice: 5000,
        sellPrice: 6800,
        total: 6800,
        profit: 1800,
        clientId: null,
        clientName: 'Client comptoir',
        paidAmount: 6800,
        debtAmount: 0,
        paymentStatus: 'paid'
      }
    ];

    this.data.operations = [
      {
        id: 'op_1',
        type: 'in',
        category: 'Vente',
        amount: 43000,
        description: 'Vente: Sac de Riz Parfumé 25kg x 2 (M. Jean-Paul Mbemba)',
        date: new Date(Date.now() - 3600000 * 2).toISOString(),
        saleId: 'sale_1',
        createdAt: new Date().toISOString()
      },
      {
        id: 'op_2',
        type: 'in',
        category: 'Vente',
        amount: 6800,
        description: 'Vente: Carton Savon de Marseille (x30) x 1 (Client comptoir)',
        date: new Date(Date.now() - 3600000 * 24).toISOString(),
        saleId: 'sale_3',
        createdAt: new Date().toISOString()
      },
      {
        id: 'op_3',
        type: 'out',
        category: 'Approvisionnement',
        amount: 35000,
        description: 'Achat stock riz et savon chez grossiste',
        date: new Date(Date.now() - 3600000 * 48).toISOString(),
        saleId: null,
        createdAt: new Date().toISOString()
      },
      {
        id: 'op_4',
        type: 'out',
        category: 'Électricité',
        amount: 8500,
        description: 'Facture éclairage boutique',
        date: new Date(Date.now() - 3600000 * 72).toISOString(),
        saleId: null,
        createdAt: new Date().toISOString()
      }
    ];

    this.save();
  }

  resetAllData() {
    this.data = this.getDefaultData();
    this.save();
  }
}

// Instance globale du magasin de données
const store = new DataStore();
window.store = store;
