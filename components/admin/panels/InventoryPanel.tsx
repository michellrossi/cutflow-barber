import React, { useState, useMemo } from 'react';
import { useShop } from '../../../store';
import { Product } from '../../../types';
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
  ChevronDown
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export const InventoryPanel: React.FC = () => {
  const { products, addProduct, updateProduct, removeProduct, appointments } = useShop();
  
  // UI State
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState('Todos');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);

  // Categorias únicas
  const categories = useMemo(() => {
    const cats = new Set(products.map(p => p.category));
    return ['Todos', ...Array.from(cats)];
  }, [products]);

  // Insights
  const insights = useMemo(() => {
    const totalCost = products.reduce((acc, p) => acc + (p.costPrice * p.currentStock), 0);
    const avgMargin = products.length > 0 
      ? products.reduce((acc, p) => {
          const profit = p.salePrice - p.costPrice;
          const margin = p.salePrice > 0 ? (profit / p.salePrice) * 100 : 0;
          return acc + margin;
        }, 0) / products.length 
      : 0;
    
    // Simplificação para produto mais vendido (precisaria cruzar com appointment_products no mundo real)
    // Por enquanto, vamos fingir ou deixar como placeholder se não tivermos os dados de venda aqui
    const topProduct = products.length > 0 ? products.sort((a, b) => b.currentStock - a.currentStock)[0].name : '---';

    return { totalCost, avgMargin, topProduct };
  }, [products]);

  // Produtos filtrados
  const filteredProducts = useMemo(() => {
    return products.filter(p => {
      const matchesSearch = p.name.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesCategory = activeCategory === 'Todos' || p.category === activeCategory;
      return matchesSearch && matchesCategory;
    });
  }, [products, searchQuery, activeCategory]);

  const handleSaveProduct = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    
    const productData = {
      name: formData.get('name') as string,
      category: formData.get('category') as string,
      costPrice: Number(formData.get('costPrice')),
      salePrice: Number(formData.get('salePrice')),
      currentStock: Number(formData.get('currentStock')),
      minStock: Number(formData.get('minStock'))
    };

    if (editingProduct) {
      await updateProduct(editingProduct.id, productData);
    } else {
      await addProduct(productData);
    }
    
    setIsModalOpen(false);
    setEditingProduct(null);
  };

  return (
    <div className="p-1">
      {/* 1. Cabeçalho e Descrição */}
      <div className="mb-8">
        <h2 className="text-2xl font-bold text-slate-900 mb-1">Gestão de Estoque</h2>
        <p className="text-[#6b7d99] text-sm font-medium">
          Controle seus produtos, insumos e margens de lucro.
        </p>
      </div>

      {/* 5. Relatório de Margem e Performance (Top Cards) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <InsightCard 
          icon={<DollarSign className="text-emerald-500" />}
          label="Valor em Estoque (Custo)"
          value={new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(insights.totalCost)}
          subtitle="Capital imobilizado em produtos"
        />
        <InsightCard 
          icon={<TrendingUp className="text-blue-500" />}
          label="Margem Média"
          value={`${insights.avgMargin.toFixed(1)}%`}
          subtitle="Rentabilidade real da vitrine"
        />
        <InsightCard 
          icon={<Package className="text-orange-500" />}
          label="Estoque Principal"
          value={insights.topProduct}
          subtitle="Produto com maior volume"
        />
      </div>

      {/* 2. Sub-menu Estilo 'Interruptor' (Categorias) */}
      <div className="flex gap-2 p-1 bg-slate-100 rounded-lg w-fit mb-8 overflow-x-auto no-scrollbar max-w-full">
        {categories.map(cat => (
          <button
            key={cat}
            onClick={() => setActiveCategory(cat)}
            className={`flex items-center gap-2 px-6 py-2.5 rounded-md text-sm font-bold transition-all whitespace-nowrap ${
              activeCategory === cat ? 'bg-white text-orange-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Barra de Busca e Ações */}
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
        <button 
          onClick={() => { setEditingProduct(null); setIsModalOpen(true); }}
          className="flex items-center justify-center gap-2 px-6 py-2 bg-orange-600 text-white font-bold rounded-xl hover:bg-orange-700 transition-all shadow-lg shadow-orange-600/20"
        >
          <Plus size={20} /> Adicionar Produto
        </button>
      </div>

      {/* 3. Lista de Produtos (Grid de Cards) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {filteredProducts.map(product => (
          <ProductCard 
            key={product.id} 
            product={product} 
            onEdit={() => { setEditingProduct(product); setIsModalOpen(true); }}
            onDelete={() => { if(confirm('Excluir produto?')) removeProduct(product.id); }}
          />
        ))}
      </div>

      {/* Modal Adicionar/Editar */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsModalOpen(false)}
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-lg bg-white rounded-2xl shadow-2xl overflow-hidden"
            >
              <div className="p-6 border-b border-slate-100">
                <h3 className="text-xl font-bold text-slate-900">{editingProduct ? 'Editar Produto' : 'Novo Produto'}</h3>
              </div>
              
              <form onSubmit={handleSaveProduct} className="p-6 space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="col-span-2 space-y-1">
                    <label className="text-xs font-bold text-slate-500 uppercase">Nome do Produto</label>
                    <input name="name" defaultValue={editingProduct?.name} required className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:border-orange-500 outline-none" />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-500 uppercase">Categoria</label>
                    <input name="category" defaultValue={editingProduct?.category} required className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:border-orange-500 outline-none" placeholder="Ex: Cabelo, Barba" />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-500 uppercase">Estoque Atual</label>
                    <input name="currentStock" type="number" defaultValue={editingProduct?.currentStock} required className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:border-orange-500 outline-none" />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 p-4 bg-slate-50 rounded-xl">
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-500 uppercase">Preço de Custo (R$)</label>
                    <input name="costPrice" type="number" step="0.01" defaultValue={editingProduct?.costPrice} required className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:border-orange-500 outline-none" />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-500 uppercase">Preço de Venda (R$)</label>
                    <input name="salePrice" type="number" step="0.01" defaultValue={editingProduct?.salePrice} required className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:border-orange-500 outline-none" />
                  </div>
                  <div className="col-span-2 space-y-1">
                    <label className="text-xs font-bold text-slate-500 uppercase">Estoque Mínimo (Alerta)</label>
                    <input name="minStock" type="number" defaultValue={editingProduct?.minStock} required className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:border-orange-500 outline-none" />
                  </div>
                </div>

                <div className="flex gap-3 pt-4">
                  <button type="button" onClick={() => setIsModalOpen(false)} className="flex-1 px-4 py-3 bg-slate-100 text-slate-600 font-bold rounded-xl hover:bg-slate-200 transition-all">Cancelar</button>
                  <button type="submit" className="flex-1 px-4 py-3 bg-orange-600 text-white font-bold rounded-xl hover:bg-orange-700 transition-all shadow-lg shadow-orange-600/20">Salvar Produto</button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

// Componentes Auxiliares Internos
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

const ProductCard: React.FC<{ product: Product, onEdit: () => void, onDelete: () => void }> = ({ product, onEdit, onDelete }) => {
  const profit = product.salePrice - product.costPrice;
  const margin = product.salePrice > 0 ? (profit / product.salePrice) * 100 : 0;
  
  const getStockStatus = () => {
    if (product.currentStock <= 0) return { label: 'Esgotado', color: 'bg-red-500', icon: <XCircle size={12} /> };
    if (product.currentStock <= product.minStock) return { label: 'Estoque Baixo', color: 'bg-amber-500', icon: <AlertTriangle size={12} /> };
    return { label: 'Estoque OK', color: 'bg-emerald-500', icon: <CheckCircle2 size={12} /> };
  };

  const status = getStockStatus();

  return (
    <motion.div 
      layout
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white rounded-2xl border border-slate-200 overflow-hidden group hover:shadow-lg transition-all"
    >
      <div className="p-5">
        <div className="flex justify-between items-start mb-3">
          <div className={`flex items-center gap-1.5 px-2 py-1 rounded-full text-[10px] font-bold text-white ${status.color}`}>
            {status.icon} {status.label}
          </div>
          <div className="flex gap-2">
            <button onClick={onEdit} className="p-1.5 text-slate-400 hover:text-orange-500 hover:bg-orange-50 rounded-lg transition-all"><Edit2 size={14} /></button>
            <button onClick={onDelete} className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all"><Trash2 size={14} /></button>
          </div>
        </div>

        <h3 className="font-bold text-slate-900 mb-1 group-hover:text-orange-600 transition-colors uppercase text-sm truncate">{product.name}</h3>
        <p className="text-xs text-slate-400 font-bold uppercase mb-4">{product.category}</p>

        <div className="grid grid-cols-2 gap-4 mb-4 pb-4 border-b border-slate-50">
          <div>
            <p className="text-[10px] font-bold text-slate-400 uppercase">Venda</p>
            <p className="text-lg font-black text-slate-900">{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(product.salePrice)}</p>
          </div>
          <div className="text-right">
            <p className="text-[10px] font-bold text-slate-400 uppercase">Estoque</p>
            <p className="text-lg font-black text-slate-900">{product.currentStock}</p>
          </div>
        </div>

        <div className="flex justify-between items-center text-[10px] font-bold">
          <div className="text-slate-500 uppercase">Margem Real</div>
          <div className="px-2 py-0.5 bg-emerald-50 text-emerald-600 rounded">
            {margin.toFixed(0)}% (+{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(profit)})
          </div>
        </div>
      </div>
    </motion.div>
  );
};
