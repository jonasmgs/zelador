
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Vendor, Budget, BudgetItem, User, UserRole, Attachment, Log } from '../types';
import { Icons } from '../constants';
import { db } from '../services/db';

interface ServiceHubProps {
  selectedCondoId: string;
  notify: (msg: string, type?: 'success' | 'error') => void;
  currentUser: User;
}

const ServiceHub: React.FC<ServiceHubProps> = ({ selectedCondoId, notify, currentUser }) => {
  const [activeSubTab, setActiveSubTab] = useState<'vendors' | 'budgets' | 'history'>('vendors');
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [procurementLogs, setProcurementLogs] = useState<Log[]>([]);
  
  const [filterVendorId, setFilterVendorId] = useState<string>('ALL');
  const [filterStatus, setFilterStatus] = useState<'ALL' | 'PENDING' | 'APPROVED' | 'REJECTED'>('ALL');
  
  const [showVendorModal, setShowVendorModal] = useState(false);
  const [showCategoryManager, setShowCategoryManager] = useState(false);
  const [showBudgetModal, setShowBudgetModal] = useState(false);
  const [editingVendor, setEditingVendor] = useState<Vendor | null>(null);
  const [editingBudget, setEditingBudget] = useState<Budget | null>(null);
  const [editingCategory, setEditingCategory] = useState<{ old: string, new: string } | null>(null);
  
  const [newCategoryName, setNewCategoryName] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const budgetFileRef = useRef<HTMLInputElement>(null);

  const [vendorForm, setVendorForm] = useState({ name: '', taxId: '', phone: '', category: '', documents: [] as Attachment[] });
  
  const [budgetForm, setBudgetForm] = useState({ 
    title: '', 
    description: '', 
    vendorId: '', 
    items: [{ id: '1', description: '', quantity: 1, unitPrice: 0 }] as BudgetItem[],
    status: 'PENDING' as any,
    documents: [] as Attachment[]
  });

  const activeCondo = db.getCondos().find(c => c.id === selectedCondoId);
  const canManage = [UserRole.SINDICO, UserRole.GESTOR].includes(currentUser.role);

  const refreshData = () => {
    setVendors(db.getVendorsByCondo(selectedCondoId));
    setBudgets(db.getBudgetsByCondo(selectedCondoId));
    setCategories(db.getCategories());
    const allLogs = db.getLogs().filter(l => 
      l.condoId === selectedCondoId && 
      (l.module === 'VENDOR' || l.module === 'BUDGET')
    );
    setProcurementLogs(allLogs);
  };

  useEffect(() => {
    refreshData();
  }, [selectedCondoId]);

  const totalValue = useMemo(() => {
    return budgetForm.items.reduce((acc, item) => acc + (item.quantity * item.unitPrice), 0);
  }, [budgetForm.items]);

  const filteredBudgets = useMemo(() => {
    return budgets.filter(b => {
      const matchVendor = filterVendorId === 'ALL' || b.vendorId === filterVendorId;
      const matchStatus = filterStatus === 'ALL' || b.status === filterStatus;
      return matchVendor && matchStatus;
    });
  }, [budgets, filterVendorId, filterStatus]);

  const handleSaveVendor = (e: React.FormEvent) => {
    e.preventDefault();
    if (!canManage) return;
    
    const isUpdate = !!editingVendor;
    const vendorData: Vendor = {
      id: editingVendor?.id || Math.random().toString(36).substr(2, 9),
      ...vendorForm,
      condoId: selectedCondoId
    };
    
    db.saveVendor(vendorData);
    db.saveLog({
      id: Math.random().toString(36).substr(2, 9),
      userId: currentUser.id,
      userName: currentUser.name,
      action: isUpdate ? 'UPDATE' : 'CREATE',
      module: 'VENDOR',
      targetName: vendorData.name,
      timestamp: new Date().toISOString(),
      condoId: selectedCondoId
    });

    refreshData();
    setShowVendorModal(false);
    notify(isUpdate ? 'Fornecedor atualizado.' : 'Fornecedor cadastrado!');
  };

  const handleSaveBudget = (e: React.FormEvent) => {
    e.preventDefault();
    if (!canManage) return;
    
    const isUpdate = !!editingBudget;
    const budgetData: Budget = {
      id: editingBudget?.id || Math.random().toString(36).substr(2, 9),
      title: budgetForm.title,
      description: budgetForm.description,
      vendorId: budgetForm.vendorId,
      items: budgetForm.items,
      value: totalValue,
      status: budgetForm.status,
      documents: budgetForm.documents,
      condoId: selectedCondoId,
      createdAt: editingBudget?.createdAt || new Date().toISOString()
    };
    
    db.saveBudget(budgetData);
    db.saveLog({
      id: Math.random().toString(36).substr(2, 9),
      userId: currentUser.id,
      userName: currentUser.name,
      action: isUpdate ? 'UPDATE' : 'CREATE',
      module: 'BUDGET',
      targetName: budgetData.title,
      timestamp: new Date().toISOString(),
      condoId: selectedCondoId
    });

    refreshData();
    setShowBudgetModal(false);
    notify(isUpdate ? 'Cotação atualizada!' : 'Cotação registrada!');
  };

  const handleBudgetFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsUploading(true);
    const reader = new FileReader();
    reader.onloadend = () => {
      const newAttachment: Attachment = {
        id: Math.random().toString(36).substr(2, 9),
        name: file.name,
        url: reader.result as string,
        uploadDate: new Date().toISOString()
      };
      setBudgetForm(prev => ({
        ...prev,
        documents: [...prev.documents, newAttachment]
      }));
      setIsUploading(false);
      e.target.value = ''; // Reset input
    };
    reader.readAsDataURL(file);
  };

  const removeBudgetAttachment = (id: string) => {
    setBudgetForm(prev => ({
      ...prev,
      documents: prev.documents.filter(doc => doc.id !== id)
    }));
  };

  const handleAddBudgetItem = () => {
    setBudgetForm(prev => ({
      ...prev,
      items: [...prev.items, { id: Math.random().toString(36).substr(2, 9), description: '', quantity: 1, unitPrice: 0 }]
    }));
  };

  const handleRemoveBudgetItem = (id: string) => {
    if (budgetForm.items.length <= 1) return;
    setBudgetForm(prev => ({
      ...prev,
      items: prev.items.filter(item => item.id !== id)
    }));
  };

  const handleItemChange = (id: string, field: keyof BudgetItem, value: any) => {
    setBudgetForm(prev => ({
      ...prev,
      items: prev.items.map(item => item.id === id ? { ...item, [field]: value } : item)
    }));
  };

  const handleQuickStatusUpdate = (budget: Budget, newStatus: 'APPROVED' | 'REJECTED') => {
    const updatedBudget: Budget = { ...budget, status: newStatus };
    db.saveBudget(updatedBudget);
    db.saveLog({
      id: Math.random().toString(36).substr(2, 9),
      userId: currentUser.id,
      userName: currentUser.name,
      action: newStatus,
      module: 'BUDGET',
      targetName: budget.title,
      timestamp: new Date().toISOString(),
      condoId: selectedCondoId
    });
    refreshData();
    notify(`Orçamento ${newStatus === 'APPROVED' ? 'aprovado' : 'rejeitado'}!`);
  };

  const handleAddCategory = () => {
    if (!newCategoryName.trim()) return;
    db.saveCategory(newCategoryName.trim());
    refreshData();
    setNewCategoryName('');
    notify('Especialidade adicionada!');
  };

  const handleUpdateCategory = () => {
    if (!editingCategory || !editingCategory.new.trim()) return;
    db.updateCategory(editingCategory.old, editingCategory.new.trim());
    refreshData();
    setEditingCategory(null);
    notify('Especialidade atualizada em todo o sistema!');
  };

  const handleDeleteCategory = (cat: string) => {
    if (window.confirm(`Excluir a especialidade "${cat}"?`)) {
      db.deleteCategory(cat);
      refreshData();
      notify('Especialidade removida.');
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-20">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <h2 className="text-2xl font-black text-slate-900 tracking-tight">Suprimentos & Parceiros</h2>
            {activeCondo && (
              <span className="bg-white text-slate-500 px-3 py-1 rounded-sm text-[10px] font-black uppercase tracking-widest border border-slate-200">
                {activeCondo.name}
              </span>
            )}
          </div>
          <p className="text-slate-500 font-medium text-sm">Controle financeiro e operacional de prestadores.</p>
        </div>
        <div className="flex bg-slate-200 p-1 rounded-md shrink-0 overflow-x-auto scrollbar-hide">
          {[
            { id: 'vendors', label: 'Empresas' },
            { id: 'budgets', label: 'Orçamentos' },
            { id: 'history', label: 'Audit Log' }
          ].map(tab => (
            <button 
              key={tab.id}
              onClick={() => setActiveSubTab(tab.id as any)}
              className={`px-5 py-2 rounded-sm text-[10px] font-black uppercase tracking-widest transition-all shrink-0 ${activeSubTab === tab.id ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </header>

      {activeSubTab === 'vendors' && (
        <div className="space-y-4 animate-in slide-in-from-left-4 duration-500">
           <div className="flex justify-between items-center">
              <h3 className="text-lg font-black text-slate-800">Fornecedores Homologados</h3>
              <div className="flex gap-2">
                {canManage && (
                  <button onClick={() => setShowCategoryManager(true)} className="bg-white border border-slate-300 text-slate-600 px-4 py-2.5 rounded-md text-[10px] font-black uppercase tracking-widest hover:border-blue-500 hover:text-blue-600 transition-all">
                    Especialidades
                  </button>
                )}
                {canManage && (
                  <button onClick={() => { setEditingVendor(null); setVendorForm({ name: '', taxId: '', phone: '', category: categories[0] || 'Manutenção', documents: [] }); setShowVendorModal(true); }} className="bg-slate-900 text-white px-5 py-2.5 rounded-md text-[10px] font-black uppercase tracking-widest shadow-lg active:scale-95 transition-all">
                    + Novo Fornecedor
                  </button>
                )}
              </div>
           </div>
           
           <div className="bg-white rounded-md border border-slate-200 overflow-x-auto scrollbar-hide">
             <table className="w-full text-left border-collapse min-w-[600px] md:min-w-full">
               <thead className="bg-slate-50 border-b border-slate-200">
                 <tr>
                   <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Empresa</th>
                   <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Especialidade</th>
                   <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Contato</th>
                   {canManage && <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Ações</th>}
                 </tr>
               </thead>
               <tbody className="divide-y divide-slate-100">
                 {vendors.map(v => (
                   <tr key={v.id} className="hover:bg-slate-50/50 transition-colors">
                     <td className="px-6 py-4">
                       <p className="font-bold text-slate-900">{v.name}</p>
                       <p className="text-[9px] text-slate-400 font-black uppercase">{v.taxId}</p>
                     </td>
                     <td className="px-6 py-4"><span className="text-[10px] font-black text-blue-600 uppercase bg-blue-50 px-3 py-1 rounded-sm">{v.category}</span></td>
                     <td className="px-6 py-4 text-xs font-semibold text-slate-600">{v.phone}</td>
                     {canManage && (
                       <td className="px-6 py-4 text-right">
                         <button onClick={() => { setEditingVendor(v); setVendorForm({ name: v.name, taxId: v.taxId, phone: v.phone, category: v.category, documents: v.documents || [] }); setShowVendorModal(true); }} className="p-2 text-slate-400 hover:text-blue-600"><svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"></path></svg></button>
                       </td>
                     )}
                   </tr>
                 ))}
                 {vendors.length === 0 && (
                   <tr><td colSpan={4} className="px-6 py-12 text-center text-slate-400 font-bold uppercase tracking-widest text-[10px]">Sem fornecedores cadastrados.</td></tr>
                 )}
               </tbody>
             </table>
           </div>
        </div>
      )}

      {activeSubTab === 'budgets' && (
        <div className="space-y-4 animate-in slide-in-from-right-4 duration-500">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <h3 className="text-lg font-black text-slate-800">Processos de Cotação</h3>
            <div className="flex gap-2">
              <select value={filterStatus} onChange={e => setFilterStatus(e.target.value as any)} className="bg-white border border-slate-200 rounded-md px-4 py-2 text-[10px] font-black uppercase text-slate-600 outline-none">
                <option value="ALL">Status: Todos</option>
                <option value="PENDING">Pendentes</option>
                <option value="APPROVED">Aprovados</option>
                <option value="REJECTED">Rejeitados</option>
              </select>
              {canManage && (
                <button onClick={() => { setEditingBudget(null); setBudgetForm({ title: '', description: '', vendorId: vendors[0]?.id || '', items: [{ id: '1', description: '', quantity: 1, unitPrice: 0 }], status: 'PENDING', documents: [] }); setShowBudgetModal(true); }} className="bg-emerald-600 text-white px-5 py-2.5 rounded-md text-[10px] font-black uppercase tracking-widest shadow-lg active:scale-95 transition-all">
                  Nova Cotação
                </button>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 gap-3">
            {filteredBudgets.map(b => (
              <div key={b.id} className="bg-white p-6 rounded-md border border-slate-200 flex flex-col md:flex-row md:items-center justify-between gap-6 hover:border-slate-400 transition-all">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <span className={`px-3 py-1 rounded-sm text-[8px] font-black uppercase tracking-tighter border ${
                      b.status === 'PENDING' ? 'bg-amber-50 text-amber-600 border-amber-200' :
                      b.status === 'APPROVED' ? 'bg-emerald-50 text-emerald-600 border-emerald-200' : 'bg-red-50 text-red-600 border-red-200'
                    }`}>
                      {b.status}
                    </span>
                    <span className="text-[9px] font-black text-slate-400 uppercase">{new Date(b.createdAt).toLocaleDateString()}</span>
                  </div>
                  <h4 className="text-lg font-black text-slate-900 leading-tight">{b.title}</h4>
                  <p className="text-xs text-slate-500 font-medium mb-3 mt-1">{b.description}</p>
                  
                  {b.documents && b.documents.length > 0 && (
                    <div className="flex flex-wrap gap-2 mb-3">
                      {b.documents.map(doc => (
                        <a key={doc.id} href={doc.url} download={doc.name} className="flex items-center gap-1.5 px-2 py-1 bg-slate-50 border border-slate-200 rounded-sm text-[9px] font-black text-slate-500 uppercase hover:bg-slate-100 transition-colors">
                           <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path></svg>
                           {doc.name}
                        </a>
                      ))}
                    </div>
                  )}

                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-1.5 text-[10px] font-black text-blue-600 uppercase bg-blue-50 px-2 py-1 rounded-sm">
                       Fornecedor: {vendors.find(v => v.id === b.vendorId)?.name || '---'}
                    </div>
                  </div>
                </div>
                <div className="flex flex-col items-end gap-2 min-w-[150px]">
                   <p className="text-2xl font-black text-slate-900 tracking-tighter leading-none">R$ {b.value?.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                   {canManage && b.status === 'PENDING' && (
                     <div className="flex gap-2">
                        <button onClick={() => handleQuickStatusUpdate(b, 'APPROVED')} className="px-3 py-1.5 bg-emerald-600 text-white rounded-sm text-[9px] font-black uppercase">Aprovar</button>
                        <button onClick={() => handleQuickStatusUpdate(b, 'REJECTED')} className="px-3 py-1.5 bg-slate-100 text-slate-500 rounded-sm text-[9px] font-black uppercase">Recusar</button>
                     </div>
                   )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {activeSubTab === 'history' && (
        <div className="bg-white rounded-md border border-slate-200 overflow-hidden shadow-sm">
           <div className="divide-y divide-slate-100">
              {procurementLogs.map(log => (
                <div key={log.id} className="p-4 flex items-center justify-between hover:bg-slate-50 transition-colors">
                  <div className="flex items-center gap-4">
                    <div className={`w-8 h-8 rounded-sm flex items-center justify-center font-black text-[9px] ${log.action === 'APPROVED' ? 'bg-emerald-50 text-emerald-600' : 'bg-blue-50 text-blue-600'}`}>
                      {log.module.charAt(0)}
                    </div>
                    <div>
                      <p className="text-xs font-bold text-slate-900">{log.userName} <span className="font-medium text-slate-500">{log.action}</span></p>
                      <p className="text-[9px] font-black text-blue-600 uppercase">{log.targetName}</p>
                    </div>
                  </div>
                  <span className="text-[9px] font-black text-slate-400 uppercase">{new Date(log.timestamp).toLocaleDateString()}</span>
                </div>
              ))}
           </div>
        </div>
      )}

      {/* MODAL FORNECEDOR */}
      {showVendorModal && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white w-full max-w-lg rounded-md shadow-2xl overflow-hidden animate-in zoom-in-95">
            <div className="px-8 py-5 border-b flex items-center justify-between bg-slate-50">
              <h3 className="text-sm font-black uppercase tracking-widest text-slate-900">Cadastro de Fornecedor</h3>
              <button onClick={() => setShowVendorModal(false)} className="p-1 text-slate-400 hover:text-slate-900"><svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M6 18L18 6M6 6l12 12"></path></svg></button>
            </div>
            <form onSubmit={handleSaveVendor} className="p-8 space-y-4">
              <div className="space-y-1">
                <label className="text-[9px] font-black uppercase text-slate-400 ml-1">Empresa</label>
                <input type="text" required className="w-full h-11 px-4 rounded-sm border border-slate-200 font-bold bg-slate-50 text-sm focus:border-blue-500 outline-none" value={vendorForm.name} onChange={e => setVendorForm({...vendorForm, name: e.target.value})} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[9px] font-black uppercase text-slate-400 ml-1">CNPJ/CPF</label>
                  <input type="text" required className="w-full h-11 px-4 rounded-sm border border-slate-200 font-bold bg-slate-50 text-sm focus:border-blue-500 outline-none" value={vendorForm.taxId} onChange={e => setVendorForm({...vendorForm, taxId: e.target.value})} />
                </div>
                <div className="space-y-1">
                  <label className="text-[9px] font-black uppercase text-slate-400 ml-1">Telefone</label>
                  <input type="tel" required className="w-full h-11 px-4 rounded-sm border border-slate-200 font-bold bg-slate-50 text-sm focus:border-blue-500 outline-none" value={vendorForm.phone} onChange={e => setVendorForm({...vendorForm, phone: e.target.value})} />
                </div>
              </div>
              <div className="space-y-1">
                <div className="flex justify-between items-center mb-1">
                  <label className="text-[9px] font-black uppercase text-slate-400 ml-1">Especialidade</label>
                  <button type="button" onClick={() => setShowCategoryManager(true)} className="text-[9px] font-black text-blue-600 uppercase hover:underline">Gerenciar</button>
                </div>
                <select className="w-full h-11 px-4 rounded-sm border border-slate-200 font-bold bg-slate-50 text-sm outline-none cursor-pointer" value={vendorForm.category} onChange={e => setVendorForm({...vendorForm, category: e.target.value})}>
                   {categories.map(cat => <option key={cat} value={cat}>{cat}</option>)}
                </select>
              </div>
              <div className="pt-4 flex gap-3">
                <button type="button" onClick={() => setShowVendorModal(false)} className="flex-1 py-3 text-[10px] font-black uppercase border border-slate-200 rounded-sm hover:bg-slate-50 transition-all">Cancelar</button>
                <button type="submit" className="flex-1 py-3 text-[10px] font-black uppercase bg-slate-900 text-white rounded-sm shadow-lg active:scale-95 transition-all">Salvar Fornecedor</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL ORÇAMENTO */}
      {showBudgetModal && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white w-full max-w-2xl rounded-md shadow-2xl overflow-hidden animate-in zoom-in-95 flex flex-col max-h-[90vh]">
            <div className="px-8 py-5 border-b flex items-center justify-between bg-slate-50">
              <h3 className="text-sm font-black uppercase tracking-widest text-slate-900">Novo Registro de Orçamento</h3>
              <button onClick={() => setShowBudgetModal(false)} className="p-1 text-slate-400 hover:text-slate-900"><svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M6 18L18 6M6 6l12 12"></path></svg></button>
            </div>
            <form onSubmit={handleSaveBudget} className="p-8 space-y-5 overflow-y-auto scrollbar-hide">
              <input type="text" placeholder="Título do Serviço (ex: Pintura fachada)" required className="w-full h-11 px-4 rounded-sm border border-slate-200 font-bold bg-slate-50 text-sm focus:border-blue-500 outline-none" value={budgetForm.title} onChange={e => setBudgetForm({...budgetForm, title: e.target.value})} />
              <textarea placeholder="Observações..." className="w-full p-4 rounded-sm border border-slate-200 font-medium bg-slate-50 text-sm focus:border-blue-500 outline-none" rows={2} value={budgetForm.description} onChange={e => setBudgetForm({...budgetForm, description: e.target.value})} />
              
              <div className="space-y-2">
                <label className="text-[9px] font-black uppercase text-slate-400 ml-1">Fornecedor Vinculado</label>
                <select required className="w-full h-11 px-4 rounded-sm border border-slate-200 font-bold bg-slate-50 text-sm outline-none" value={budgetForm.vendorId} onChange={e => setBudgetForm({...budgetForm, vendorId: e.target.value})}>
                  <option value="">Selecione uma empresa...</option>
                  {vendors.map(v => <option key={v.id} value={v.id}>{v.name} ({v.category})</option>)}
                </select>
              </div>

              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <label className="text-[9px] font-black uppercase text-slate-400 ml-1">Itens da Cotação</label>
                  <button type="button" onClick={handleAddBudgetItem} className="text-[9px] font-black text-blue-600 uppercase">+ Add Item</button>
                </div>
                <div className="space-y-2">
                  {budgetForm.items.map(item => (
                    <div key={item.id} className="flex gap-2 items-center">
                      <input type="text" placeholder="Item" className="flex-1 h-10 px-3 rounded-sm border bg-slate-50 text-xs font-bold" value={item.description} onChange={e => handleItemChange(item.id, 'description', e.target.value)} />
                      <input type="number" placeholder="Qtde" className="w-16 h-10 px-3 rounded-sm border bg-slate-50 text-xs font-bold" value={item.quantity} onChange={e => handleItemChange(item.id, 'quantity', parseInt(e.target.value))} />
                      <input type="number" step="0.01" placeholder="Preço" className="w-24 h-10 px-3 rounded-sm border bg-slate-50 text-xs font-bold" value={item.unitPrice} onChange={e => handleItemChange(item.id, 'unitPrice', parseFloat(e.target.value))} />
                      <button type="button" onClick={() => handleRemoveBudgetItem(item.id)} className="text-red-400 p-1">×</button>
                    </div>
                  ))}
                </div>
                <div className="text-right pt-2">
                  <span className="text-xs font-black uppercase text-slate-400 mr-3">Valor Total:</span>
                  <span className="text-xl font-black text-slate-900">R$ {totalValue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                </div>
              </div>

              {/* ANEXOS ORÇAMENTO */}
              <div className="space-y-2">
                <label className="text-[9px] font-black uppercase text-slate-400 ml-1">Documentos & Propostas</label>
                <div className="flex flex-wrap gap-2 mb-2">
                  {budgetForm.documents.map(doc => (
                    <div key={doc.id} className="flex items-center gap-2 px-3 py-1.5 bg-slate-100 rounded-sm border border-slate-200 text-[10px] font-bold text-slate-700">
                      <span className="truncate max-w-[150px]">{doc.name}</span>
                      <button type="button" onClick={() => removeBudgetAttachment(doc.id)} className="text-red-500 hover:text-red-700 transition-colors">
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
                      </button>
                    </div>
                  ))}
                </div>
                <button 
                  type="button" 
                  onClick={() => budgetFileRef.current?.click()}
                  className="w-full h-11 border-2 border-dashed border-slate-200 rounded-sm flex items-center justify-center gap-2 text-slate-400 hover:border-blue-500 hover:text-blue-500 transition-all bg-slate-50"
                >
                   {isUploading ? (
                     <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                   ) : (
                     <>
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13"></path></svg>
                        <span className="text-[10px] font-black uppercase">Anexar Arquivo (PDF, Imagem, Doc)</span>
                     </>
                   )}
                </button>
                <input type="file" ref={budgetFileRef} className="hidden" onChange={handleBudgetFileChange} />
              </div>

              <div className="pt-4 flex gap-3">
                <button type="button" onClick={() => setShowBudgetModal(false)} className="flex-1 py-3 text-[10px] font-black uppercase border border-slate-200 rounded-sm">Cancelar</button>
                <button type="submit" className="flex-1 py-3 text-[10px] font-black uppercase bg-blue-600 text-white rounded-sm shadow-lg active:scale-95 transition-all">Confirmar Processo</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL GERENCIADOR DE ESPECIALIDADES */}
      {showCategoryManager && (
        <div className="fixed inset-0 z-[250] flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-md">
          <div className="bg-white w-full max-w-md rounded-md shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300">
            <div className="p-8 border-b border-slate-100 flex items-center justify-between bg-slate-50">
              <h3 className="text-sm font-black uppercase tracking-widest text-slate-900">Especialidades</h3>
              <button onClick={() => setShowCategoryManager(false)} className="p-1 text-slate-400 hover:text-slate-900"><svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M6 18L18 6M6 6l12 12"></path></svg></button>
            </div>
            <div className="p-8 space-y-6">
              <div className="space-y-3 max-h-[40vh] overflow-y-auto pr-2 scrollbar-hide">
                {categories.map(cat => (
                  <div key={cat} className="flex items-center justify-between p-4 bg-white rounded-sm border border-slate-100 group hover:border-blue-300 transition-all">
                    {editingCategory?.old === cat ? (
                      <div className="flex-1 flex gap-2">
                        <input type="text" className="flex-1 px-3 py-1 border border-blue-500 rounded-sm text-sm font-bold bg-white" value={editingCategory.new} onChange={e => setEditingCategory({...editingCategory, new: e.target.value})} />
                        <button onClick={handleUpdateCategory} className="text-emerald-600"><svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7"></path></svg></button>
                        <button onClick={() => setEditingCategory(null)} className="text-slate-400">×</button>
                      </div>
                    ) : (
                      <>
                        <span className="font-bold text-slate-700 text-sm">{cat}</span>
                        <div className="flex gap-2">
                          <button onClick={() => setEditingCategory({ old: cat, new: cat })} className="p-1.5 text-slate-400 hover:text-blue-600 transition-all">
                             <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"></path></svg>
                          </button>
                          <button onClick={() => handleDeleteCategory(cat)} className="p-1.5 text-slate-400 hover:text-red-600 transition-all">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                ))}
              </div>
              <div className="bg-slate-50 p-6 rounded-md border border-slate-200">
                <label className="text-[9px] font-black uppercase text-slate-400 ml-1 mb-2 block">Nova Especialidade</label>
                <div className="flex gap-2">
                  <input type="text" placeholder="Ex: Hidráulica" className="flex-1 h-11 px-4 rounded-sm border border-slate-200 font-bold bg-white text-sm outline-none focus:border-blue-500 shadow-sm" value={newCategoryName} onChange={e => setNewCategoryName(e.target.value)} />
                  <button onClick={handleAddCategory} className="bg-slate-900 text-white w-11 h-11 rounded-sm flex items-center justify-center shrink-0 shadow-lg active:scale-95 transition-all">
                    <Icons.Add />
                  </button>
                </div>
              </div>
              <button onClick={() => setShowCategoryManager(false)} className="w-full py-4 text-slate-400 font-black text-[10px] uppercase tracking-widest hover:text-slate-900">Fechar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ServiceHub;
