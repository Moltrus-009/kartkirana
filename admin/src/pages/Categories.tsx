import { useState, useEffect } from 'react';
import { db } from '../lib/firebase';
import { collection, onSnapshot, doc, setDoc, deleteDoc, writeBatch } from 'firebase/firestore';
import { 
  Plus, 
  Trash2, 
  Edit, 
  Check, 
  EyeOff, 
  Eye, 
  ArrowUp, 
  ArrowDown 
} from 'lucide-react';

interface Category {
  id: string;
  name: string;
  icon?: string;
  order: number;
  isActive: boolean;
}

export default function Categories() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Create / Edit state
  const [showAddForm, setShowAddForm] = useState(false);
  const [name, setName] = useState('');
  const [icon, setIcon] = useState('🍎');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');

  useEffect(() => {
    if (!db) {
      setLoading(false);
      return;
    }
    const unsub = onSnapshot(collection(db, 'categories'), (snap) => {
      const list = snap.docs.map(d => ({ id: d.id, ...d.data() } as Category));
      list.sort((a, b) => (a.order || 0) - (b.order || 0));
      setCategories(list);
      setLoading(false);
    });
    return () => unsub();
  }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    try {
      const id = name.trim().toLowerCase().replace(/\s+/g, '-');
      const docRef = doc(db!, 'categories', id);
      await setDoc(docRef, {
        id,
        name: name.trim(),
        icon,
        order: categories.length + 1,
        isActive: true
      });
      setName('');
      setIcon('🍎');
      setShowAddForm(false);
      alert('Category created successfully.');
    } catch (err: any) {
      alert(`Create failed: ${err.message}`);
    }
  };

  const handleRename = async (id: string) => {
    if (!editName.trim()) return;
    try {
      await setDoc(doc(db!, 'categories', id), { name: editName.trim() }, { merge: true });
      setEditingId(null);
      setEditName('');
    } catch (err: any) {
      alert(`Rename failed: ${err.message}`);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this category?')) return;
    try {
      await deleteDoc(doc(db!, 'categories', id));
      alert('Category deleted.');
    } catch (err: any) {
      alert(`Deletion failed: ${err.message}`);
    }
  };

  const handleToggleActive = async (cat: Category) => {
    try {
      await setDoc(doc(db!, 'categories', cat.id), { isActive: !cat.isActive }, { merge: true });
    } catch (err: any) {
      alert(`Status toggle failed: ${err.message}`);
    }
  };

  const handleMoveOrder = async (index: number, direction: 'up' | 'down') => {
    if (direction === 'up' && index === 0) return;
    if (direction === 'down' && index === categories.length - 1) return;

    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    const batch = writeBatch(db!);
    
    const catA = categories[index];
    const catB = categories[targetIndex];

    batch.update(doc(db!, 'categories', catA.id), { order: catB.order });
    batch.update(doc(db!, 'categories', catB.id), { order: catA.order });

    try {
      await batch.commit();
    } catch (err: any) {
      alert(`Failed to reorder: ${err.message}`);
    }
  };

  return (
    <div className="space-y-6 text-left select-none">
      
      {/* Header */}
      <div className="flex justify-between items-center text-left">
        <div>
          <h1 className="text-2xl font-black text-slate-800 dark:text-white">
            📁 Category Directory
          </h1>
          <p className="text-[10px] text-slate-400 font-extrabold uppercase tracking-widest mt-0.5">
            Manage product catalog categories & ordering
          </p>
        </div>

        <button
          onClick={() => setShowAddForm(true)}
          className="bg-emerald-500 hover:bg-emerald-600 text-white font-black text-xs py-2.5 px-4 rounded-2xl flex items-center gap-1.5 cursor-pointer shadow-xs transition duration-200 uppercase tracking-wider"
        >
          <Plus className="h-4 w-4" /> Add Category
        </button>
      </div>

      {/* Categories Cards Grid */}
      {loading ? (
        <div className="text-center py-16 text-slate-400 font-bold text-xs uppercase tracking-widest animate-pulse">
          Syncing Catalog Categories...
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {categories.map((cat, index) => {
            const isEditing = cat.id === editingId;
            return (
              <div 
                key={cat.id}
                className="p-5 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-850 rounded-[28px] shadow-xs space-y-4 text-left relative flex flex-col justify-between"
              >
                <div className="flex justify-between items-start">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 bg-slate-50 dark:bg-slate-800 rounded-xl flex items-center justify-center border border-slate-200 dark:border-slate-800 text-lg">
                      {cat.icon || '📦'}
                    </div>
                    {isEditing ? (
                      <div className="flex items-center gap-1">
                        <input
                          type="text"
                          value={editName}
                          onChange={(e) => setEditName(e.target.value)}
                          className="bg-slate-50 dark:bg-zinc-800 border border-slate-250 dark:border-slate-800 rounded px-2 py-1 text-xs font-bold w-28 outline-none"
                        />
                        <button 
                          onClick={() => handleRename(cat.id)}
                          className="p-1 bg-emerald-500 text-slate-950 rounded"
                        >
                          <Check className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    ) : (
                      <div>
                        <h4 className="font-extrabold text-sm text-slate-850 dark:text-white tracking-wide truncate max-w-[140px]">
                          {cat.name}
                        </h4>
                        <span className="text-[8px] text-slate-400 font-bold block mt-0.5">Order index: {cat.order}</span>
                      </div>
                    )}
                  </div>

                  <span className={`px-2.5 py-0.5 rounded-lg text-[9px] font-black uppercase tracking-wider block ${
                    cat.isActive ? 'bg-emerald-500/10 text-emerald-500' : 'bg-slate-500/10 text-slate-500'
                  }`}>
                    {cat.isActive ? 'Active' : 'Hidden'}
                  </span>
                </div>

                {/* Operations panel buttons */}
                <div className="pt-3 border-t border-slate-50 dark:border-slate-800/40 flex justify-between items-center gap-1">
                  <div className="flex gap-1">
                    <button
                      onClick={() => handleMoveOrder(index, 'up')}
                      className="p-1.5 border border-slate-100 hover:bg-slate-50 dark:border-slate-800 dark:hover:bg-slate-850 rounded-lg cursor-pointer"
                      title="Move Up"
                    >
                      <ArrowUp className="h-3.5 w-3.5" />
                    </button>
                    <button
                      onClick={() => handleMoveOrder(index, 'down')}
                      className="p-1.5 border border-slate-100 hover:bg-slate-50 dark:border-slate-800 dark:hover:bg-slate-850 rounded-lg cursor-pointer"
                      title="Move Down"
                    >
                      <ArrowDown className="h-3.5 w-3.5" />
                    </button>
                  </div>

                  <div className="flex gap-1.5">
                    <button
                      onClick={() => { setEditingId(cat.id); setEditName(cat.name); }}
                      className="p-2 hover:bg-slate-50 dark:hover:bg-slate-850 text-slate-400 hover:text-emerald-500 rounded-xl cursor-pointer"
                      title="Edit Category Name"
                    >
                      <Edit className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => handleToggleActive(cat)}
                      className="p-2 hover:bg-slate-50 dark:hover:bg-slate-850 text-slate-400 hover:text-indigo-500 rounded-xl cursor-pointer"
                      title="Toggle Visibility"
                    >
                      {cat.isActive ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
                    </button>
                    <button
                      onClick={() => handleDelete(cat.id)}
                      className="p-2 hover:bg-red-500/10 text-slate-400 hover:text-red-500 rounded-xl cursor-pointer"
                      title="Remove Category"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>

              </div>
            );
          })}
        </div>
      )}

      {/* CREATE MODAL */}
      {showAddForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 dark:bg-black/80 backdrop-blur-xs">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-850 rounded-3xl w-full max-w-sm p-5 space-y-4">
            <h3 className="text-sm font-black text-slate-800 dark:text-white uppercase tracking-wider">
              📁 Add New Category
            </h3>
            <form onSubmit={handleCreate} className="space-y-4 text-xs text-left">
              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1">Category Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Fruits & Vegetables"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 dark:bg-zinc-800 border border-slate-200 dark:border-slate-800 rounded-xl font-bold outline-none"
                />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1">Icon Emoji *</label>
                <input
                  type="text"
                  required
                  value={icon}
                  onChange={(e) => setIcon(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 dark:bg-zinc-800 border border-slate-200 dark:border-slate-800 rounded-xl font-bold outline-none"
                />
              </div>
              <div className="pt-2 flex gap-3">
                <button
                  type="submit"
                  className="flex-1 bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-black py-3 rounded-xl uppercase tracking-wider cursor-pointer"
                >
                  Create
                </button>
                <button
                  type="button"
                  onClick={() => setShowAddForm(false)}
                  className="px-4 py-3 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 rounded-xl font-bold"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
