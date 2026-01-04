
import React, { useState, useEffect, useMemo } from 'react';
import { Vendor, User, UserRole } from '../types';
import { Icons } from '../constants';
import { db } from '../services/db';

interface VendorsProps {
  selectedCondoId: string;
  notify: (msg: string, type?: 'success' | 'error') => void;
  currentUser: User;
}

const Vendors: React.FC<VendorsProps> = ({ selectedCondoId, notify, currentUser }) => {
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [showCategoryManager, setShowCategoryManager] = useState(false);
  const [editingVendor, setEditingVendor] = useState<Vendor | null>(null);
  const [newCategoryName, setNewCategoryName] = useState('');
  
  const [formData, setFormData] = useState({
    name: '',
    taxId: '',
    phone: '',
    category: ''
  });

  const refreshData = () => {
    setVendors(db.getVendors().filter(v => v.condoId === selectedCondoId));
    const cats = db.getCategories();
    setCategories(cats);
    if (!formData.category && cats.length > 0) {
      setFormData(prev => ({ ...prev, category: cats[0] }));
    }
  };

  useEffect(() => {
    refreshData();
  }, [selectedCondoId]);

  const handleOpenAdd = () => {
    setEditingVendor(null);
    setFormData({ 
      name: '', 
      taxId: '', 
      phone: '', 
      category: categories[0] || 'Manutenção' 
    });
    setShowModal(true);
  };

  const handleOpenEdit = (vendor: Vendor) => {
    setEditingVendor(vendor);
    setFormData({
      name: vendor.name,
      taxId: vendor.taxId,
      phone: vendor.phone,
      category: vendor.category
    });
    setShowModal(true);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    const vendorData: Vendor = {
      id: editingVendor?.id || Math.random().toString(36).substr(2, 9),
      ...formData,
      condoId: selectedCondoId
    };
    db.saveVendor(vendorData);
    refreshData();
    setShowModal(false);
    notify(editingVendor ? 'Cadastro atualizado.' : 'Fornecedor cadastrado!');
  };

  const handleAddCategory = () => {
    if (!newCategoryName.trim()) return;
    db.saveCategory(newCategoryName.trim());
    refreshData();
    setNewCategoryName('');
    notify('Especialidade adicionada!');
  };

  const handleDeleteCategory = (cat: string) => {
    if (window.confirm(`Excluir a especialidade "${cat}"?`)) {
      db.deleteCategory(cat);
      refreshData();
      notify('Especialidade removida.');
    }
  };

  const canManageSpecialties = [UserRole.SINDICO, UserRole.GESTOR].includes(currentUser.role);

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h2 className="text-3xl font-black text-slate-900 tracking-tight">Gestão de Fornecedores</h2>
          <p className="text-slate-500 font-medium">Controle de parceiros e prestadores de serviço.</p>
        </div>
        <button onClick={handleOpenAdd} className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-4 rounded-2xl flex items-center gap-3 font-black text-xs uppercase tracking-widest shadow-xl shadow-blue-500/20 active:scale-95 transition-all">
          <Icons.Add /> Novo Cadastro
        </button>
      </header>

      <div className="bg-white rounded-[40px] border border-slate-200 overflow-hidden shadow-sm">
        <table className="w-full text-left border-collapse">
          <thead className="bg-slate-50 border-b border-slate-100">
            <tr>
              <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Empresa</th>
              <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Especialidade</th>
              <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Contato</th>
              <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {vendors.map(v => (
              <tr key={v.id} className="hover:bg-slate-50/50 transition-colors">
                <td className="px-8 py-5">
                  <p className="font-bold text-slate-900">{v.name}</p>
                  <p className="text-[10px] font-black text-slate-400 uppercase mt-0.5">CNPJ/CPF: {v.taxId}</p>
                </td>
                <td className="px-8 py-5">
                  <span className="text-[10px] font-black text-blue-600 uppercase bg-blue-50 px-3 py-1 rounded-lg">
                    {v.category}
                  </span>
                </td>
                <td className="px-8 py-5 text-sm font-medium text-slate-600">{v.phone}</td>
                <td className="px-8 py-5 text-right">
                  <button onClick={() => handleOpenEdit(v)} className="p-2 text-slate-400 hover:text-blue-600 transition-all">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"></path></svg>
                  </button>
                </td>
              </tr>
            ))}
            {vendors.length === 0 && (
              <tr><td colSpan={4} className="px-8 py-20 text-center text-slate-400 font-bold uppercase tracking-widest text-xs">Nenhum fornecedor cadastrado.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {showModal && (
        <div className="fixed inset-0 z-[150] flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-md">
          <div className="bg-white w-full max-w-xl rounded-[40px] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300">
            <div className="px-10 py-8 border-b border-slate-100 flex items-center justify-between">
              <h3 className="text-2xl font-black text-slate-900 tracking-tight">{editingVendor ? 'Ajustar' : 'Novo'} Fornecedor</h3>
              <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-slate-900 transition-all"><svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M6 18L18 6M6 6l12 12"></path></svg></button>
            </div>
            <form onSubmit={handleSave} className="p-10 space-y-6">
              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">Empresa (Razão Social)</label>
                <input type="text" required placeholder="Ex: Elevadores ABC Ltda" className="w-full h-14 px-6 rounded-2xl border-2 border-slate-100 focus:border-blue-500 bg-slate-50 font-bold outline-none" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">CNPJ ou CPF</label>
                  <input type="text" required placeholder="00.000.000/0001-00" className="w-full h-14 px-6 rounded-2xl border-2 border-slate-100 focus:border-blue-500 bg-slate-50 font-bold outline-none" value={formData.taxId} onChange={e => setFormData({...formData, taxId: e.target.value})} />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">Contato (Telefone)</label>
                  <input type="tel" required placeholder="(00) 00000-0000" className="w-full h-14 px-6 rounded-2xl border-2 border-slate-100 focus:border-blue-500 bg-slate-50 font-bold outline-none" value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})} />
                </div>
              </div>

              <div className="space-y-1">
                <div className="flex items-center justify-between px-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Especialidade</label>
                  {canManageSpecialties && (
                    <button type="button" onClick={() => setShowCategoryManager(true)} className="text-[9px] font-black text-blue-600 uppercase hover:underline">Gerenciar</button>
                  )}
                </div>
                <select className="w-full h-14 px-6 rounded-2xl border-2 border-slate-100 focus:border-blue-500 bg-slate-50 font-bold outline-none cursor-pointer" value={formData.category} onChange={e => setFormData({...formData, category: e.target.value})}>
                  {categories.map(cat => <option key={cat} value={cat}>{cat}</option>)}
                </select>
              </div>

              <button type="submit" className="w-full h-16 bg-blue-600 text-white font-black rounded-2xl shadow-xl shadow-blue-500/20 uppercase tracking-widest active:scale-95 transition-all mt-4">
                Salvar Cadastro
              </button>
            </form>
          </div>
        </div>
      )}

      {showCategoryManager && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-slate-900/90 backdrop-blur-xl">
          <div className="bg-white w-full max-w-md rounded-[40px] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300">
            <div className="p-8 border-b border-slate-100 flex items-center justify-between">
              <h3 className="text-xl font-black text-slate-900">Gerenciar Especialidades</h3>
              <button onClick={() => setShowCategoryManager(false)} className="p-2 text-slate-400"><Icons.Add className="rotate-45" /></button>
            </div>
            <div className="p-8 space-y-6">
              <div className="space-y-3 max-h-[40vh] overflow-y-auto pr-2 scrollbar-hide">
                {categories.map(cat => (
                  <div key={cat} className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-100 group">
                    <span className="font-bold text-slate-700">{cat}</span>
                    <button onClick={() => handleDeleteCategory(cat)} className="p-2 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-all">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>
                    </button>
                  </div>
                ))}
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase text-slate-400 ml-2">Nova Especialidade</label>
                <div className="flex gap-2">
                  <input type="text" placeholder="Ex: Hidráulica" className="flex-1 h-12 px-4 rounded-xl border-2 border-slate-100 focus:border-blue-500 font-bold bg-slate-50 outline-none" value={newCategoryName} onChange={e => setNewCategoryName(e.target.value)} />
                  <button onClick={handleAddCategory} className="bg-blue-600 text-white w-12 h-12 rounded-xl flex items-center justify-center shrink-0"><Icons.Add /></button>
                </div>
              </div>
              <button onClick={() => setShowCategoryManager(false)} className="w-full py-4 bg-slate-900 text-white font-black rounded-2xl text-xs uppercase tracking-widest">Fechar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Vendors;
