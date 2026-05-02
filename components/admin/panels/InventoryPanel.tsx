import React, { useState, useMemo, useRef } from 'react';
import { useShop } from '../../../store';
import { Product } from '../../../types';
import { ConfirmationModal } from '../../ui/ConfirmationModal';
import { 
  Package, 
  Search, 
  Filter, 
  Plus, 
  TrendingUp, 
  AlertTriangle, 
  CheckCircle2, 
  XCircle, 
  MoreVertical, 
  Edit2, 
  Trash2, 
  DollarSign, 
  BarChart3,
  ChevronDown,
  X,
  Sparkles,
  CalendarCheck,
  ShoppingBag,
  Tag,
  Loader2
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useToast } from '../../ui/ToastContext';

export const InventoryPanel: React.FC = () => {
  const { products, addProduct, updateProduct, removeProduct, restockProduct, settings, formatCurrencyBRL } = useShop();
  const { showToast } = useToast();
  
  // UI State
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategoryFilter, setActiveCategoryFilter] = useState('Todos');
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [restockId, setRestockId] = useState<string | null>(null);
  
  const [restockData, setRestockData] = useState({ quantity: '', unitCost: '' });
  
  const [formData, setFormData] = useState({
    name: '',
    category: 'Cuidados com o Cabelo',
    costPrice: '',
    salePrice: '',
    currentStock: '',
    minStock: '2'
  });

  const [isCustom, setIsCustom] = useState(false);
  const [selectedCat, setSelectedCat] = useState<string>('');
  const [isSaving, setIsSaving] = useState(false);

  // Sales data state
  const [productSales, setProductSales] = useState<Record<string, number>>({});
  
  // Fetch sales
  React.useEffect(() => {
    if (products.length === 0) return;
    const fetchSales = async () => {
      const { supabase } = await import('../../../supabaseClient');
      if (!settings?.shopId) return;
      const { data } = await supabase
        .from('appointment_products')
        .select('product_id, quantity, appointments!inner(shop_id)')
        .eq('appointments.shop_id', settings.shopId);
      if (data) {
        const salesStats: Record<string, number> = {};
        data.forEach(item => {
          if (!salesStats[item.product_id]) salesStats[item.product_id] = 0;
          salesStats[item.product_id] += item.quantity;
        });
        setProductSales(salesStats);
      }
    };
    fetchSales();
  }, [products]);

  // --- CATALOGO PRE-DEFINIDO (Baseado no pedido do usuário) ---
  const PRODUCT_CATEGORIES = [
    'Cuidados com o Cabelo',
    'Cuidados com a Barba',
    'Finalização e Estética Facial',
    'Bebidas e Conveniência',
    'Acessórios e Vestuário (Lifestyle)'
  ];

  const CATALOG_PRODUCTS = [
    // Cuidados com o Cabelo
    { name: 'Pomada Modeladora: Efeito matte (seco)', category: 'Cuidados com o Cabelo' },
    { name: 'Gel e Gel-Cola', category: 'Cuidados com o Cabelo' },
    { name: 'Shampoo Anticaspa específico', category: 'Cuidados com o Cabelo' },
    { name: 'Condicionador / Tônico Capilar', category: 'Cuidados com o Cabelo' },
    // Cuidados com a Barba
    { name: 'Óleo para Barba hidratante', category: 'Cuidados com a Barba' },
    { name: 'Balm para Barba anti-frizz', category: 'Cuidados com a Barba' },
    { name: 'Shampoo de Barba limpeza profunda', category: 'Cuidados com a Barba' },
    { name: 'Espuma ou Gel de Barbear (Shaving)', category: 'Cuidados com a Barba' },
    { name: 'Pós-Barba refrescante', category: 'Cuidados com a Barba' },
    // Finalização e Estética Facial
    { name: 'Spray Fixador (Laquê)', category: 'Finalização e Estética Facial' },
    { name: 'Pó Modelador (Mattifying Powder)', category: 'Finalização e Estética Facial' },
    { name: 'Máscara Negra remoção de cravos', category: 'Finalização e Estética Facial' },
    { name: 'Creme Esfoliante facial', category: 'Finalização e Estética Facial' },
    // Bebidas e Conveniência
    { name: 'Cerveja Artesanal', category: 'Bebidas e Conveniência' },
    { name: 'Cerveja Tradicional', category: 'Bebidas e Conveniência' },
    { name: 'Refrigerante / Suco / Água', category: 'Bebidas e Conveniência' },
    { name: 'Café Gourmet / Energético', category: 'Bebidas e Conveniência' },
    { name: 'Dose Whisky / Cachaça Premium', category: 'Bebidas e Conveniência' },
    // Acessórios e Vestuário (Lifestyle)
    { name: 'Pente de Madeira anti-estático', category: 'Acessórios e Vestuário (Lifestyle)' },
    { name: 'Escova de Cabelo Profissional', category: 'Acessórios e Vestuário (Lifestyle)' },
    { name: 'Camiseta Merchandising', category: 'Acessórios e Vestuário (Lifestyle)' },
    { name: 'Boné Merchandising', category: 'Acessórios e Vestuário (Lifestyle)' },
    { name: 'Carteira / Pulseira de Couro', category: 'Acessórios e Vestuário (Lifestyle)' },
  ];

  // Categorias únicas para filtro
  const allCategories = useMemo(() => {
    const cats = new Set(['Todos']);
    PRODUCT_CATEGORIES.forEach(cat => cats.add(cat));
    products.forEach(p => cats.add(p.category));
    return Array.from(cats);
  }, [products]);

  // Insights
  const insights = useMemo(() => {
    const totalCost = (products || []).reduce((acc, p) => acc + (p.costPrice * p.currentStock), 0);
    const avgMargin = (products || []).length > 0 
      ? products.reduce((acc, p) => {
          const profit = p.salePrice - p.costPrice;
          const margin = p.salePrice > 0 ? (profit / p.salePrice) * 100 : 0;
          return acc + margin;
        }, 0) / products.length 
      : 0;
    
    const topProduct = (products || []).length > 0 ? products.sort((a, b) => b.currentStock - a.currentStock)[0].name : '---';

    return { totalCost, avgMargin, topProduct };
  }, [products]);

  // Produtos filtrados
  const filteredProducts = useMemo(() => {
    return (products || []).filter(p => {
      const matchesSearch = p.name.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesCategory = activeCategoryFilter === 'Todos' || p.category === activeCategoryFilter;
      return matchesSearch && matchesCategory;
    });
  }, [products, searchQuery, activeCategoryFilter]);

  const handleCategorySelect = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const cat = e.target.value;
    setSelectedCat(cat);
    setIsCustom(false);
    setFormData(prev => ({ ...prev, name: '', category: cat }));
  };

  const handleTemplateSelect = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const selectedName = e.target.value;
    if (!selectedName) {
      setFormData(prev => ({ ...prev, name: '' }));
      setIsCustom(false);
      return;
    }

    if (selectedName === 'CUSTOM') {
      setIsCustom(true);
      setFormData(prev => ({ ...prev, name: '' }));
      return;
    }

    const template = CATALOG_PRODUCTS.find(item => item.name === selectedName);
    if (template) {
      setIsCustom(false);
      setFormData(prev => ({
        ...prev,
        name: template.name,
        category: template.category
      }));
    }
  };

  const handleEdit = (product: Product) => {
    setEditingId(product.id);
    setIsCustom(true); // Sempre custom ao editar
    setFormData({
      name: product.name,
      category: product.category,
      costPrice: product.costPrice.toString(),
      salePrice: product.salePrice.toString(),
      currentStock: product.currentStock.toString(),
      minStock: product.minStock.toString()
    });
    setIsFormOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    
    const productData = {
      name: formData.name,
      category: formData.category,
      costPrice: Math.round(Number(formData.costPrice) * 100) / 100,
      salePrice: Math.round(Number(formData.salePrice) * 100) / 100,
      currentStock: Number(formData.currentStock),
      minStock: Number(formData.minStock)
    };

    let result;
    if (editingId) {
      result = await updateProduct(editingId, productData);
    } else {
      result = await addProduct(productData);
    }
    
    setIsSaving(false);
    if (result.success) {
      showToast(editingId ? 'Produto atualizado!' : 'Produto cadastrado!');
      setIsFormOpen(false);
      setEditingId(null);
      setIsCustom(false);
      setSelectedCat('');
      setFormData({ name: '', category: 'Cuidados com o Cabelo', costPrice: '', salePrice: '', currentStock: '', minStock: '2' });
    } else {
      showToast(result.error || 'Erro ao salvar.', 'error');
    }
  };

  const confirmDelete = async () => {
    if (deleteId) {
        const { success, error } = await removeProduct(deleteId);
        if (success) {
            showToast('Produto removido do estoque!');
            setDeleteId(null);
        } else {
            showToast(error || 'Erro ao remover produto.', 'error');
        }
    }
  };

  const handleRestockSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!restockId) return;
    
    setIsSaving(true);
    const addedQuantity = Number(restockData.quantity);
    const unitCost = Math.round(Number(restockData.unitCost) * 100) / 100;
    
    const { success, error } = await restockProduct(restockId, addedQuantity, unitCost);
    setIsSaving(false);
    
    if (success) {
        showToast('Estoque atualizado com sucesso!');
        setRestockId(null);
        setRestockData({ quantity: '', unitCost: '' });
    } else {
        showToast(error || 'Erro ao registrar entrada de estoque.', 'error');
    }
  };

  // Encontra o produto sendo reposto para mostrar preview
  const restockProductInstance = useMemo(() => {
     return products.find(p => p.id === restockId);
  }, [products, restockId]);

  const restockPreview = useMemo(() => {
     if (!restockProductInstance) return null;
     const currentStock = restockProductInstance.currentStock;
     const currentCost = restockProductInstance.costPrice;
     const addQty = Number(restockData.quantity) || 0;
     const addCost = Number(restockData.unitCost) || 0;
     
     const newStock = currentStock + addQty;
     let newAvgCost = currentCost;
     if (newStock > 0) {
         newAvgCost = ((currentStock * currentCost) + (addQty * addCost)) / newStock;
     }
     return {
         stock: newStock,
         avgCost: newAvgCost
     };
  }, [restockProductInstance, restockData]);

  return (
    <div className="p-1 animate-fade-in">
      <ConfirmationModal 
        isOpen={!!deleteId}
        onClose={() => setDeleteId(null)}
        onConfirm={confirmDelete}
        title="Remover Produto"
        message="Tem certeza que deseja remover este produto do estoque?"
        confirmText="Remover"
        isDestructive
      />

      {/* Restock Modal */}
      <AnimatePresence>
        {restockId && restockProductInstance && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-fade-in" onClick={(e) => e.target === e.currentTarget && setRestockId(null)}>
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white p-8 rounded-2xl border border-slate-200 w-full max-w-lg shadow-2xl relative"
            >
              <div className="flex justify-between items-start mb-6">
                <div>
                    <h3 className="text-xl font-bold text-slate-900">Nova Entrada de Estoque</h3>
                    <p className="text-sm font-medium text-slate-500 mt-1">{restockProductInstance.name}</p>
                </div>
                <button onClick={() => setRestockId(null)} className="text-slate-400 hover:text-slate-900 transition-colors"><X size={24}/></button>
              </div>

              <form onSubmit={handleRestockSubmit} className="space-y-6">
                  <div className="grid grid-cols-2 gap-4">
                      <div>
                          <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2">Qtd. Comprada</label>
                          <input required type="number" min="1" value={restockData.quantity} onChange={e => setRestockData({...restockData, quantity: e.target.value})} className="w-full bg-slate-50 border border-slate-200 rounded-xl p-4 text-slate-900 focus:outline-none focus:border-orange-500 font-bold" placeholder="Ex: 5" />
                      </div>
                      <div>
                          <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2">Custo Unitário (R$)</label>
                          <input required type="number" step="0.01" min="0" value={restockData.unitCost} onChange={e => setRestockData({...restockData, unitCost: e.target.value})} className="w-full bg-slate-50 border border-slate-200 rounded-xl p-4 text-slate-900 focus:outline-none focus:border-orange-500 font-bold" placeholder="Ex: 15.50" />
                      </div>
                  </div>

                  {restockPreview && (
                      <div className="bg-orange-50/50 border border-orange-100 rounded-xl p-4 flex justify-between items-center">
                          <div>
                              <p className="text-[10px] font-bold text-orange-600 uppercase tracking-widest mb-1">Preview após entrada</p>
                              <div className="flex gap-4">
                                  <div>
                                      <p className="text-xs text-slate-500 font-medium">Novo Estoque:</p>
                                      <p className="font-black text-slate-900">{restockPreview.stock} un</p>
                                  </div>
                                  <div>
                                      <p className="text-xs text-slate-500 font-medium">Preço Médio:</p>
                                      <p className="font-black text-slate-900">{formatCurrencyBRL(restockPreview.avgCost)}</p>
                                  </div>
                              </div>
                          </div>
                      </div>
                  )}

                  <div className="flex gap-4 justify-end pt-2">
                    <button type="button" onClick={() => setRestockId(null)} className="px-6 py-3 text-slate-500 font-bold hover:text-slate-900 transition-colors" disabled={isSaving}>Cancelar</button>
                    <button type="submit" className="px-10 py-3 rounded-xl text-white font-bold flex items-center gap-2 shadow-lg hover:brightness-110 transition-all text-sm bg-orange-600" disabled={isSaving}>
                      {isSaving ? <Loader2 size={20} className="animate-spin"/> : 'Confirmar Entrada'}
                    </button>
                  </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* 1. Cabeçalho e Descrição */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 mb-1">Gestão de Estoque</h2>
          <p className="text-slate-500 text-sm font-medium">Controle seus produtos, insumos e margens de lucro.</p>
        </div>
        <button 
          onClick={() => { 
            setIsFormOpen(true); 
            setEditingId(null); 
            setIsCustom(false);
            setSelectedCat('');
            setFormData({ name: '', category: 'Cuidados com o Cabelo', costPrice: '', salePrice: '', currentStock: '', minStock: '2' }); 
          }}
          className="bg-orange-600 text-white font-bold px-6 py-3 rounded-[2rem] flex items-center justify-center gap-2 transition-all shadow-lg hover:bg-orange-700 whitespace-nowrap"
        >
          <Plus size={20} className="stroke-[3px]" />
          Novo Produto
        </button>
      </div>


      {/* 2. Sub-menu Estilo 'Interruptor' (Categorias) */}
      <div className="flex gap-2 p-1 bg-slate-100 rounded-lg w-fit mb-8 overflow-x-auto no-scrollbar max-w-full">
        {allCategories.map(cat => (
          <button
            key={cat}
            onClick={() => setActiveCategoryFilter(cat)}
            className={`flex items-center gap-2 px-6 py-2.5 rounded-md text-sm font-bold transition-all whitespace-nowrap ${
              activeCategoryFilter === cat ? 'bg-white text-orange-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            {cat === 'Todos' ? <LayoutGrid size={18} /> : <Tag size={18} />}
            {cat}
          </button>
        ))}
      </div>

      <div className="flex flex-col md:flex-row justify-between gap-4 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5" />
          <input 
            type="text"
            placeholder="Buscar produto..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 outline-none transition-all"
          />
        </div>
      </div>

      {/* Form Modal (Step-by-Step similar to Services) */}
      <AnimatePresence>
        {isFormOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-fade-in" onClick={(e) => e.target === e.currentTarget && setIsFormOpen(false)}>
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white p-8 rounded-2xl border border-slate-200 w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl relative"
            >
              <div className="flex justify-between items-start mb-6">
                <h3 className="text-xl font-bold text-slate-900">{editingId ? 'Editar Produto' : 'Novo Produto'}</h3>
                <button onClick={() => setIsFormOpen(false)} className="text-slate-400 hover:text-slate-900 transition-colors"><X size={24}/></button>
              </div>
              
              {!editingId && (
                <div className="space-y-4 mb-8">
                  <div className={`flex items-center gap-3 p-4 bg-slate-100 border border-slate-300 rounded-xl transition-all ${!selectedCat ? 'py-12 flex-col text-center' : ''}`}>
                    <Sparkles size={!selectedCat ? 32 : 18} className="text-orange-500" />
                    <div className="flex-1 w-full">
                      <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1 text-left">1. Categoria do Produto</p>
                      <select 
                        value={selectedCat}
                        onChange={handleCategorySelect}
                        className="w-full bg-transparent text-slate-900 text-sm font-bold focus:outline-none cursor-pointer"
                      >
                        <option value="" className="bg-white text-slate-900">Selecione uma categoria...</option>
                        {PRODUCT_CATEGORIES.map((cat, idx) => (
                          <option key={idx} value={cat} className="bg-white text-slate-900">{cat}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {selectedCat && (
                    <div className="flex items-center gap-3 p-4 bg-slate-100 border border-slate-300 rounded-xl animate-fade-in">
                      <ShoppingBag size={18} className="text-orange-500" />
                      <div className="flex-1 w-full">
                        <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">2. Escolha o Produto</p>
                        <select 
                          value={isCustom ? 'CUSTOM' : formData.name}
                          onChange={handleTemplateSelect}
                          className="w-full bg-transparent text-slate-900 text-sm font-bold focus:outline-none cursor-pointer"
                        >
                          <option value="" className="bg-white text-slate-900">Selecione um produto de {selectedCat}...</option>
                          {CATALOG_PRODUCTS.filter(item => item.category === selectedCat).map((item, idx) => (
                            <option key={idx} value={item.name} className="bg-white text-slate-900">{item.name}</option>
                          ))}
                          <option value="CUSTOM" className="bg-white text-orange-500 font-bold">➕ Outro (Produto Personalizado)</option>
                        </select>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {(formData.name || isCustom || editingId) && (
                <form onSubmit={handleSubmit} className="space-y-6 animate-fade-in">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="md:col-span-2">
                      <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2">Nome do Produto</label>
                      <input required value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} className="w-full bg-slate-50 border border-slate-200 rounded-xl p-4 text-slate-900 focus:outline-none focus:border-orange-500 font-bold" />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2">
                        {editingId ? `Ajuste de Estoque (atual: ${products.find(p=>p.id===editingId)?.currentStock}un)` : 'Quantidade em Estoque'}
                      </label>
                      <input required type="number" value={formData.currentStock} onChange={e => setFormData({...formData, currentStock: e.target.value})} className="w-full bg-slate-50 border border-slate-200 rounded-xl p-4 text-slate-900 focus:outline-none focus:border-orange-500 font-bold" placeholder="0" />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2">Estoque Mínimo (Alerta)</label>
                      <input required type="number" value={formData.minStock} onChange={e => setFormData({...formData, minStock: e.target.value})} className="w-full bg-slate-50 border border-slate-200 rounded-xl p-4 text-slate-900 focus:outline-none focus:border-orange-500 font-bold" placeholder="2" />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2">Preço de Custo (R$)</label>
                      <div className="relative">
                        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-bold">R$</span>
                        <input required type="number" step="0.01" value={formData.costPrice} onChange={e => setFormData({...formData, costPrice: e.target.value})} className="w-full bg-slate-50 border border-slate-200 rounded-xl p-4 pl-12 text-slate-900 focus:outline-none focus:border-orange-500 font-bold" />
                      </div>
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2">Preço de Venda (R$)</label>
                      <div className="relative">
                        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-bold">R$</span>
                        <input required type="number" step="0.01" value={formData.salePrice} onChange={e => setFormData({...formData, salePrice: e.target.value})} className="w-full bg-slate-50 border border-slate-200 rounded-xl p-4 pl-12 text-slate-900 focus:outline-none focus:border-orange-500 font-bold" />
                      </div>
                    </div>
                  </div>

                  <div>
                      <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2">Categoria</label>
                      <div className="flex gap-2 flex-wrap mb-3">
                          {PRODUCT_CATEGORIES.map(cat => (
                              <button
                                  key={cat}
                                  type="button"
                                  onClick={() => setFormData({...formData, category: cat})}
                                  className={`px-4 py-2 rounded-full text-[10px] font-bold border transition-all ${formData.category === cat ? 'bg-orange-600 border-orange-600 text-white' : 'border-slate-200 text-slate-500 hover:border-slate-400'}`}
                              >
                                  {cat}
                              </button>
                          ))}
                      </div>
                       <input 
                          value={formData.category} 
                          onChange={e => setFormData({...formData, category: e.target.value})} 
                          className="w-full bg-slate-50 border border-slate-200 rounded-xl p-4 text-slate-900 focus:outline-none focus:border-orange-500" 
                          placeholder="Ou digite uma nova categoria..."
                      />
                  </div>

                  <div className="flex gap-4 justify-end pt-4">
                    <button type="button" onClick={() => setIsFormOpen(false)} className="px-6 py-3 text-slate-500 font-bold hover:text-slate-900 transition-colors" disabled={isSaving}>Cancelar</button>
                    <button type="submit" className="px-10 py-3 rounded-xl text-white font-bold flex items-center gap-2 shadow-lg hover:brightness-110 transition-all text-sm" style={{ backgroundColor: settings.primaryColor }} disabled={isSaving}>
                      {isSaving ? <Loader2 size={20} className="animate-spin"/> : 'Salvar Produto'}
                    </button>
                  </div>
                </form>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-3">
        {filteredProducts.map(product => (
          <div key={product.id} onClick={() => handleEdit(product)} className="bg-white rounded-lg border border-slate-200 flex flex-col overflow-hidden group hover:border-slate-300 transition-all shadow cursor-pointer">
            <div className="p-4 flex flex-col h-full relative">
               {/* Badge de Alerta de Estoque */}
               {(() => {
                 const current = product.currentStock - (productSales[product.id] || 0);
                 if (current <= product.minStock) {
                   return (
                     <div className="absolute top-3 right-3 animate-pulse">
                        <AlertTriangle className={current <= 0 ? "text-red-500" : "text-amber-500"} size={16} />
                     </div>
                   );
                 }
                 return null;
               })()}

              <div className="min-h-[40px] mb-1">
                <h3 className="font-bold text-slate-900 text-sm leading-tight group-hover:text-orange-600 transition-colors uppercase pr-4 line-clamp-2">{product.name}</h3>
              </div>
              <p className="text-[9px] text-slate-400 font-bold uppercase mb-3">{product.category}</p>

              <div className="space-y-1 mb-3 pb-3 border-b border-slate-50">
                <div className="flex justify-between">
                  <span className="text-[9px] font-bold text-slate-400 uppercase">Custo</span>
                  <span className="text-[10px] font-black text-slate-900">{formatCurrencyBRL(product.costPrice)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[9px] font-bold text-slate-400 uppercase">Venda</span>
                  <span className="text-[10px] font-black text-slate-900">{formatCurrencyBRL(product.salePrice)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[9px] font-bold text-emerald-500 uppercase">Lucro</span>
                  <span className="text-[10px] font-black text-emerald-600">{formatCurrencyBRL(product.salePrice > product.costPrice ? product.salePrice - product.costPrice : 0)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[9px] font-bold text-slate-400 uppercase">Margem (%)</span>
                  <span className="text-[10px] font-black text-slate-900">{product.salePrice > 0 ? ((product.salePrice - product.costPrice) / product.salePrice * 100).toFixed(0) : 0}%</span>
                </div>
                <div className="flex justify-between mt-2 pt-2 border-t border-slate-50">
                  <span className="text-[9px] font-bold text-slate-400 uppercase">Est. Inicial</span>
                  <span className="text-[10px] font-black text-slate-900">{product.currentStock}</span> 
                </div>
                <div className="flex justify-between">
                  <span className="text-[9px] font-bold text-slate-400 uppercase">Est. Atual</span>
                  <span className={`text-[10px] font-black ${(product.currentStock - (productSales[product.id] || 0)) <= product.minStock ? 'text-orange-500' : 'text-slate-900'}`}>
                    {product.currentStock - (productSales[product.id] || 0)}
                  </span>
                </div>
              </div>

              <div className="mt-auto space-y-2">

                <div className="flex gap-1.5 flex-wrap">
                  <button 
                    onClick={(e) => { e.stopPropagation(); setRestockId(product.id); }} 
                    className="flex-1 py-1 px-2 bg-emerald-50 border border-emerald-200 rounded-lg text-emerald-700 hover:text-emerald-900 hover:bg-emerald-100 transition-all font-bold text-[10px] flex items-center justify-center gap-1 uppercase"
                  >
                     <Package size={11} /> Repor
                  </button>
                  <button 
                    onClick={(e) => { e.stopPropagation(); handleEdit(product); }} 
                    className="flex-1 py-1 px-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-all font-bold text-[10px] flex items-center justify-center gap-1 uppercase"
                  >
                    <Edit2 size={11} /> Editar
                  </button>
                  <button 
                    onClick={(e) => { e.stopPropagation(); setDeleteId(product.id); }} 
                    className="px-2 py-1 bg-slate-50 border border-slate-200 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 transition-all flex items-center justify-center"
                  >
                    <Trash2 size={13}/>
                  </button>
                </div>
              </div>
            </div>
          </div>
        ))}

        <button 
          onClick={() => { 
            setIsFormOpen(true); 
            setEditingId(null); 
            setIsCustom(false);
            setSelectedCat('');
            setFormData({ name: '', category: 'Cuidados com o Cabelo', costPrice: '', salePrice: '', currentStock: '', minStock: '2' }); 
          }}
          className="bg-slate-50 rounded-lg border-2 border-dashed border-slate-200 p-4 flex flex-col items-center justify-center gap-3 hover:border-slate-300 hover:bg-slate-100 transition-all min-h-[200px] group"
        >
          <div className="w-12 h-12 rounded-full bg-white border border-slate-200 flex items-center justify-center text-slate-400 group-hover:text-orange-500 group-hover:scale-110 transition-all shadow">
            <Plus size={24} />
          </div>
          <div className="text-center">
            <p className="text-sm font-bold text-slate-900 mb-1">Novo Produto</p>
            <p className="text-xs text-slate-500 leading-relaxed max-w-[140px]">
              Expanda sua vitrine.
            </p>
          </div>
        </button>
      </div>
    </div>
  );
};

// Componentes Auxiliares
const InsightCard: React.FC<{ icon: React.ReactNode, label: string, value: string, subtitle: string }> = ({ icon, label, value, subtitle }) => (
  <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-all">
    <div className="flex items-center gap-3 mb-4">
      <div className="w-10 h-10 rounded-full bg-slate-50 flex items-center justify-center">
        {icon}
      </div>
      <span className="text-sm font-bold text-slate-500 uppercase tracking-wider">{label}</span>
    </div>
    <div className="text-2xl font-black text-slate-900 mb-1">{value}</div>
    <div className="text-xs text-slate-400 font-medium">{subtitle}</div>
  </div>
);

const LayoutGrid: React.FC<{ size: number }> = ({ size }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="7"></rect><rect x="14" y="3" width="7" height="7"></rect><rect x="14" y="14" width="7" height="7"></rect><rect x="3" y="14" width="7" height="7"></rect></svg>
);
