import { useState, useEffect, useRef } from 'react';
import { useAppStore } from '../core/store/useAppStore';
import { useLanguage } from '../context/LanguageContext';
import type { Product } from '../domain/entities/Product';
import { 
  Plus, 
  Search, 
  Trash2, 
  Edit, 
  Folder, 
  X,
  Upload,
  Image as ImageIcon
} from 'lucide-react';
import EmptyState from '../components/shared/EmptyState';
import { useLocation } from 'react-router-dom';
import { uploadFile, STORAGE_PATHS } from '../infrastructure/storage/localStorage';

const CATEGORIES_LIST = [
  'fruits-vegetables', 
  'bakery-bread', 
  'dairy-eggs', 
  'beverages', 
  'snacks-munchies', 
  'staples-atta', 
  'household-items', 
  'personal-care'
];

export default function Products() {
  const { shop, products, addNewProduct, editProductDetails, removeProduct, adjustStockQuantity } = useAppStore();
  const { t } = useLanguage();
  const location = useLocation();
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Search & Filter State
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  // Form State
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  
  const defaultForm = {
    name: '',
    category: 'fruits-vegetables',
    price: 0,
    mrp: 0,
    stock: 10,
    description: '',
    image: '',
    images: [] as string[]
  };

  const [form, setForm] = useState(defaultForm);
  const [error, setError] = useState<string | null>(null);

  // File Upload State
  const [uploadingCover, setUploadingCover] = useState(false);
  const [coverProgress, setCoverProgress] = useState(0);
  const [uploadingGallery, setUploadingGallery] = useState(false);
  const [galleryProgress, setGalleryProgress] = useState(0);

  // Check URL params for quick actions
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    if (params.get('add') === 'true') {
      handleOpenAdd();
    }
    if (params.get('search') === 'focus' && searchInputRef.current) {
      searchInputRef.current.focus();
    }
  }, [location]);

  // Filter products
  const filteredProducts = products.filter(p => {
    const matchesSearch = p.name.toLowerCase().includes(search.toLowerCase()) || 
                          (p.sku && p.sku.toLowerCase().includes(search.toLowerCase()));
    const matchesCategory = selectedCategory === 'all' || p.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const handleOpenAdd = () => {
    setEditingProduct(null);
    setForm(defaultForm);
    setError(null);
    setIsFormOpen(true);
  };

  const handleOpenEdit = (p: Product) => {
    setEditingProduct(p);
    setForm({
      name: p.name,
      category: p.category,
      price: p.price,
      mrp: p.mrp || p.price,
      stock: p.stock,
      description: p.description || '',
      image: p.image,
      images: p.images || []
    });
    setError(null);
    setIsFormOpen(true);
  };

  const handleCoverUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingCover(true);
    setCoverProgress(1);
    setError(null);

    try {
      const productId = editingProduct ? editingProduct.id : `prod-${Date.now()}`;
      const path = STORAGE_PATHS.productCover(shop?.id || 'shop-id', productId);
      const url = await uploadFile(path, file, {
        compress: true,
        quality: 0.8,
        maxWidth: 600,
        maxHeight: 600,
        onProgress: (p) => setCoverProgress(Math.round(p))
      });
      setForm(prev => ({ ...prev, image: url }));
    } catch (err: any) {
      setError("Cover upload failed: " + (err.message || String(err)));
    } finally {
      setUploadingCover(false);
      setCoverProgress(0);
    }
  };

  const handleGalleryUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingGallery(true);
    setGalleryProgress(1);
    setError(null);

    try {
      const productId = editingProduct ? editingProduct.id : `prod-${Date.now()}`;
      const imgIdx = form.images.length;
      const path = (STORAGE_PATHS.productGallery as any)(shop?.id || 'shop-id', productId, `gallery_${imgIdx}_${Date.now()}.jpg`);
      
      const url = await uploadFile(path, file, {
        compress: true,
        quality: 0.8,
        maxWidth: 650,
        maxHeight: 650,
        onProgress: (p) => setGalleryProgress(Math.round(p))
      });
      setForm(prev => ({ ...prev, images: [...prev.images, url] }));
    } catch (err: any) {
      setError("Gallery upload failed: " + (err.message || String(err)));
    } finally {
      setUploadingGallery(false);
      setGalleryProgress(0);
    }
  };

  const removeGalleryImage = (idx: number) => {
    setForm(prev => ({
      ...prev,
      images: prev.images.filter((_, i) => i !== idx)
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name || form.price <= 0 || form.stock < 0) {
      setError('Please fill in name, correct price, and stock levels.');
      return;
    }

    if (form.mrp > 0 && form.price > form.mrp) {
      setError(`Discounted price (₹${form.price}) cannot be greater than Maximum Retail Price (MRP ₹${form.mrp}).`);
      return;
    }

    try {
      const productImages = form.images.length > 0 ? form.images : [form.image];
      if (editingProduct) {
        // Edit mode
        await editProductDetails(editingProduct.id, {
          name: form.name,
          category: form.category,
          price: form.price,
          mrp: form.mrp || form.price,
          stock: form.stock,
          description: form.description,
          image: form.image,
          images: productImages
        });
      } else {
        // Create mode
        await addNewProduct({
          name: form.name,
          category: form.category,
          price: form.price,
          mrp: form.mrp || form.price,
          stock: form.stock,
          description: form.description,
          image: form.image,
          images: productImages,
          discount: form.mrp > form.price ? Math.round(((form.mrp - form.price) / form.mrp) * 100) : 0,
          specs: {},
          status: 'active',
          tags: [],
          featured: false,
          shopId: '',
          shopName: ''
        });
      }
      setIsFormOpen(false);
    } catch (e: any) {
      setError(e.message || 'Failed to save product.');
    }
  };

  // Stock Quick Increments/Decrements
  const handleQuickStockChange = async (productId: string, delta: number, currentStock: number) => {
    if (currentStock + delta < 0) return; // Prevent negative stock
    await adjustStockQuantity(productId, delta, 'manual_adjust', 'Quick 1-tap stock adjustment');
  };

  return (
    <div className="space-y-5 max-w-md mx-auto pb-8">
      {/* Header controls */}
      <div className="flex justify-between items-center text-left">
        <div>
          <h1 className="text-xl font-black text-slate-800 dark:text-zinc-150">
            🛒 {t('my_items')}
          </h1>
          <p className="text-[10px] text-slate-400 font-extrabold uppercase tracking-widest mt-0.5">
            {t('all_items')}
          </p>
        </div>

        <button
          onClick={handleOpenAdd}
          className="bg-primary hover:bg-emerald-600 text-white font-black text-xs py-2 px-3.5 rounded-2xl flex items-center gap-1.5 cursor-pointer shadow-xs transition duration-200"
        >
          <Plus className="h-4 w-4" /> {t('add_product')}
        </button>
      </div>

      {/* Search Input */}
      <div className="relative">
        <input
          ref={searchInputRef}
          type="text"
          placeholder={t('search_items')}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full pl-10 pr-4 py-3 bg-white dark:bg-dark-card border border-slate-100 dark:border-dark-border rounded-3xl outline-none font-bold text-xs shadow-xs focus:border-primary focus:ring-1 focus:ring-primary/20 text-slate-800 dark:text-zinc-100"
        />
        <Search className="absolute left-3.5 top-3.5 h-4.5 w-4.5 text-slate-400" />
      </div>

      {/* Categories chips filter - Horizontal scrolling */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2 pl-0.5 -mx-4 px-4 scrollbar-none text-[10px] font-black uppercase tracking-wider">
        <button
          onClick={() => setSelectedCategory('all')}
          className={`px-4 py-2 rounded-full cursor-pointer transition shrink-0 ${
            selectedCategory === 'all'
              ? 'bg-primary text-white shadow-xs shadow-emerald-500/10'
              : 'bg-white dark:bg-dark-card border border-slate-100 dark:border-dark-border text-slate-500 dark:text-zinc-400'
          }`}
        >
          {t('all_items')}
        </button>

        {CATEGORIES_LIST.map((cat) => (
          <button
            key={cat}
            onClick={() => setSelectedCategory(cat)}
            className={`px-4 py-2 rounded-full cursor-pointer transition shrink-0 ${
              selectedCategory === cat
                ? 'bg-primary text-white shadow-xs shadow-emerald-500/10'
                : 'bg-white dark:bg-dark-card border border-slate-100 dark:border-dark-border text-slate-500 dark:text-zinc-400'
            }`}
          >
            {t(`cat_${cat.replace(/-/g, '_')}` as any) || cat.replace('-', ' ')}
          </button>
        ))}
      </div>

      {/* Product List cards */}
      <div className="space-y-3">
        {filteredProducts.length === 0 ? (
          <EmptyState
            icon={Folder}
            title="No items found"
            description="Add products to your catalog to show them to customers."
          />
        ) : (
          filteredProducts.map((p) => {
            const isLow = p.stock > 0 && p.stock <= (p.minStockAlert || 5);
            const isOut = p.stock === 0;

            return (
              <div 
                key={p.id}
                className={`p-4 bg-white dark:bg-dark-card border rounded-3xl transition space-y-3 text-left relative ${
                  isOut 
                    ? 'border-red-100 dark:border-red-950/20' 
                    : isLow 
                    ? 'border-amber-100 dark:border-amber-950/20 bg-amber-500/5' 
                    : 'border-slate-100 dark:border-dark-border'
                }`}
              >
                {/* Product primary details */}
                <div className="flex items-center gap-3">
                  <img 
                    src={p.image} 
                    alt={p.name} 
                    className="w-12 h-12 rounded-2xl object-cover border border-slate-100/50 bg-slate-50 shrink-0"
                  />
                  <div className="min-w-0 flex-1">
                    <h4 className="font-extrabold text-slate-800 dark:text-zinc-200 truncate pr-2">{p.name}</h4>
                    <p className="text-[9px] text-slate-400 font-extrabold uppercase tracking-wider capitalize mt-0.5">{p.category.replace('-', ' ')}</p>
                  </div>
                  
                  {/* Item Price */}
                  <div className="text-right shrink-0">
                    <span className="font-black text-slate-800 dark:text-zinc-100 text-sm block">₹{p.price}</span>
                    {p.mrp > p.price && (
                      <span className="text-[10px] text-slate-400 font-bold line-through">₹{p.mrp}</span>
                    )}
                  </div>
                </div>

                {/* Stock controls (Large touch Targets) */}
                <div className="flex items-center justify-between border-t border-slate-50 dark:border-dark-border/40 pt-3 bg-slate-50/50 dark:bg-zinc-900/30 p-2.5 rounded-2xl">
                  <div className="space-y-0.5">
                    <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider block">{t('stock')}</span>
                    <span className={`text-xs font-black uppercase ${
                      isOut 
                        ? 'text-red-500' 
                        : isLow 
                        ? 'text-amber-500 animate-pulse font-black' 
                        : 'text-emerald-600 dark:text-emerald-450'
                    }`}>
                      {isOut ? t('out_of_stock') : `${p.stock} ${t('items')}`}
                    </span>
                  </div>

                  {/* Tactile + / - buttons */}
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleQuickStockChange(p.id, -1, p.stock)}
                      disabled={p.stock === 0}
                      className={`w-9 h-9 rounded-xl font-black text-lg flex items-center justify-center transition cursor-pointer select-none ${
                        p.stock === 0
                          ? 'bg-slate-100 text-slate-350 cursor-not-allowed dark:bg-zinc-800'
                          : 'bg-white dark:bg-dark-card border border-slate-200 dark:border-dark-border text-slate-700 dark:text-zinc-300 hover:bg-slate-100'
                      }`}
                      title="Decrease Stock"
                    >
                      －
                    </button>
                    <span className="font-mono font-black text-sm px-1.5 min-w-4 text-center">{p.stock}</span>
                    <button
                      onClick={() => handleQuickStockChange(p.id, 1, p.stock)}
                      className="w-9 h-9 rounded-xl bg-white dark:bg-dark-card border border-slate-200 dark:border-dark-border text-slate-700 dark:text-zinc-300 font-black text-lg flex items-center justify-center hover:bg-slate-100 cursor-pointer select-none"
                      title="Increase Stock"
                    >
                      ＋
                    </button>
                  </div>
                </div>

                {/* Edit & Delete actions */}
                <div className="flex items-center justify-between border-t border-slate-50 dark:border-dark-border/40 pt-2.5 text-[10px]">
                  <span className="text-[9px] text-slate-400 font-bold">Product Status: {p.status}</span>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleOpenEdit(p)}
                      className="px-3.5 py-1.5 border border-slate-100 dark:border-dark-border hover:bg-slate-50 text-slate-700 dark:text-zinc-300 font-black rounded-xl cursor-pointer flex items-center gap-1"
                    >
                      <Edit className="h-3.5 w-3.5" /> {t('edit')}
                    </button>
                    <button
                      onClick={() => { if(confirm('Delete product permanently?')) removeProduct(p.id); }}
                      className="p-1.5 border border-red-100 text-red-500 rounded-xl cursor-pointer hover:bg-red-50 flex items-center justify-center"
                      title="Delete Product"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* SIMPLE ADD / EDIT MODAL */}
      {isFormOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 dark:bg-black/80 backdrop-blur-xs">
          <div className="bg-white dark:bg-dark-card border border-slate-100 dark:border-dark-border rounded-3xl w-full max-w-sm overflow-hidden shadow-2xl p-5 space-y-4 animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between border-b border-slate-50 dark:border-dark-border/40 pb-3">
              <h3 className="text-sm font-black text-slate-800 dark:text-zinc-200">
                {editingProduct ? '📝 ' + t('edit_product') : '➕ ' + t('add_product')}
              </h3>
              <button 
                onClick={() => setIsFormOpen(false)}
                className="text-slate-400 hover:text-slate-600 font-extrabold cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {error && (
              <div className="p-3 bg-red-500/10 border border-red-500/20 text-red-500 rounded-2xl text-[10px] font-black text-left">
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-3.5 text-xs text-left">
              {/* Product Name */}
              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-450 uppercase tracking-wider block">{t('name')} *</label>
                <input
                  type="text"
                  placeholder="e.g. Fresh Bread (400g)"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className="w-full p-2.5 bg-slate-50 dark:bg-zinc-900 border border-slate-100 dark:border-dark-border rounded-xl font-bold outline-none"
                />
              </div>

              {/* Category */}
              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-450 uppercase tracking-wider block">{t('category')} *</label>
                <select
                  value={form.category}
                  onChange={(e) => setForm({ ...form, category: e.target.value })}
                  className="w-full p-2.5 bg-slate-50 dark:bg-zinc-900 border border-slate-100 dark:border-dark-border rounded-xl font-bold outline-none"
                >
                  {CATEGORIES_LIST.map((cat) => (
                    <option key={cat} value={cat}>
                      {t(`cat_${cat.replace(/-/g, '_')}` as any).toUpperCase()}
                    </option>
                  ))}
                </select>
              </div>

              {/* Pricing Grid */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-450 uppercase tracking-wider block">{t('price')} *</label>
                  <input
                    type="number"
                    value={form.price || ''}
                    onChange={(e) => setForm({ ...form, price: parseFloat(e.target.value) || 0 })}
                    className="w-full p-2.5 bg-slate-50 dark:bg-zinc-900 border border-slate-100 dark:border-dark-border rounded-xl font-bold outline-none font-mono"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-450 uppercase tracking-wider block">{t('mrp')}</label>
                  <input
                    type="number"
                    value={form.mrp || ''}
                    onChange={(e) => setForm({ ...form, mrp: parseFloat(e.target.value) || 0 })}
                    className="w-full p-2.5 bg-slate-50 dark:bg-zinc-900 border border-slate-100 dark:border-dark-border rounded-xl font-bold outline-none font-mono"
                  />
                </div>
              </div>

              {/* Current Stock */}
              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-450 uppercase tracking-wider block">{t('stock')} *</label>
                <input
                  type="number"
                  value={form.stock || '0'}
                  onChange={(e) => setForm({ ...form, stock: parseInt(e.target.value) || 0 })}
                  className="w-full p-2.5 bg-slate-50 dark:bg-zinc-900 border border-slate-100 dark:border-dark-border rounded-xl font-bold outline-none font-mono"
                />
              </div>

              {/* Description */}
              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-450 uppercase tracking-wider block">{t('description')}</label>
                <textarea
                  placeholder="Details about product size, package, etc..."
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  rows={2}
                  className="w-full p-2.5 bg-slate-50 dark:bg-zinc-900 border border-slate-100 dark:border-dark-border rounded-xl font-bold outline-none"
                />
              </div>

              {/* Product Cover Image Upload */}
              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-450 uppercase tracking-wider block">Product Main Image (Cover)</label>
                <div className="flex items-center gap-3">
                  <div className="h-12 w-12 bg-slate-50 dark:bg-zinc-900 border border-slate-100 dark:border-dark-border rounded-xl overflow-hidden flex items-center justify-center shrink-0">
                    {form.image ? (
                      <img src={form.image} alt="Cover" className="h-full w-full object-cover" />
                    ) : (
                      <ImageIcon className="h-5 w-5 text-slate-400" />
                    )}
                  </div>
                  <div className="flex-1 space-y-1">
                    <label className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-slate-50 dark:bg-zinc-800 hover:text-emerald-500 rounded-xl cursor-pointer border border-slate-150 dark:border-dark-border transition text-[10px] font-black uppercase">
                      <Upload className="h-3.5 w-3.5" /> {uploadingCover ? `Uploading (${coverProgress}%)` : 'Upload Cover'}
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={handleCoverUpload}
                        disabled={uploadingCover}
                      />
                    </label>
                  </div>
                </div>
              </div>

              {/* Product Gallery Images (Multiple) */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-slate-450 uppercase tracking-wider block">Product Gallery Carousel Images</label>
                <div className="flex flex-wrap gap-2 items-center">
                  {/* Gallery List */}
                  {form.images && form.images.map((img, idx) => (
                    <div key={idx} className="relative h-12 w-12 bg-slate-50 dark:bg-zinc-900 border border-slate-200 dark:border-dark-border rounded-xl overflow-hidden shrink-0 group">
                      <img src={img} alt={`Gallery ${idx}`} className="h-full w-full object-cover" />
                      <button
                        type="button"
                        onClick={() => removeGalleryImage(idx)}
                        className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 flex items-center justify-center text-white transition-opacity cursor-pointer"
                        title="Delete image"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  ))}

                  {/* Add Gallery Button */}
                  <label className="h-12 w-12 bg-slate-50 dark:bg-zinc-800 hover:bg-slate-100 border-2 border-dashed border-slate-250 dark:border-dark-border rounded-xl flex flex-col items-center justify-center cursor-pointer transition text-slate-450 shrink-0 select-none">
                    <Plus className="h-5 w-5" />
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={handleGalleryUpload}
                      disabled={uploadingGallery}
                    />
                  </label>
                  {uploadingGallery && (
                    <span className="text-[9px] text-slate-400 font-extrabold uppercase animate-pulse">Uploading ({galleryProgress}%)</span>
                  )}
                </div>
              </div>

              {/* Save Button */}
              <div className="pt-2 border-t border-slate-50 dark:border-dark-border/40">
                <button
                  type="submit"
                  className="w-full bg-emerald-500 hover:bg-emerald-600 text-white font-black py-3 rounded-2xl cursor-pointer text-center uppercase tracking-wider text-xs shadow-xs"
                >
                  {t('save_changes')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
