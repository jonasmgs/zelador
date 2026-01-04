
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

  const handleBudgetFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsUploading(true);
    const reader = new FileReader();
    reader.onloadend = () => {
      const newDoc: Attachment = {
        id: Math.random().toString(36).substr(2, 9),
        name: file.name,
        url: reader.result as string,
        uploadDate: new Date().toISOString()
      };
      setBudgetForm(prev => ({ ...prev, documents: [...prev.documents, newDoc] }));
      setIsUploading(false);
    };
    reader.readAsDataURL(file);
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

  const handleDeleteCategory = (cat: string) => {
    if (window.confirm(`Excluir a especialidade "${cat}"?`)) {
      db.deleteCategory(cat);
      refreshData();
      notify('Especialidade removida.');
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-20">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <h2 className="text-3xl font-black text-slate-900 tracking-tight">Central de Suprimentos</h2>
            {activeCondo && (
              <span className="bg-blue-50 text-blue-600 px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest border border-blue-100">
                {activeCondo.name}
              </span>
            )}
          </div>
          <p className="text-slate-500 font-medium">Controle de parceiros, orçamentos e auditoria.</p>
        </div>
        <div className="flex bg-slate-100 p-1.5 rounded-2xl shrink-0 overflow-x-auto scrollbar-hide">
          {[
            { id: 'vendors', label: 'Fornecedores' },
            { id: 'budgets', label: 'Cotações' },
            { id: 'history', label: 'Histórico' }
          ].map(tab => (
            <button 
              key={tab.id}
              onClick={() => setActiveSubTab(tab.id as any)}
              className={`px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all shrink-0 ${activeSubTab === tab.id ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </header>

      {activeSubTab === 'vendors' && (
        <div className="space-y-6 animate-in slide-in-from-left-4 duration-500">
           <div className="flex justify-between items-center">
              <h3 className="text-xl font-black text-slate-900 tracking-tight">Parceiros de Negócio</h3>
              {canManage && (
                <button onClick={() => { setEditingVendor(null); setVendorForm({ name: '', taxId: '', phone: '', category: categories[0] || 'Manutenção', documents: [] }); setShowVendorModal(true); }} className="bg-blue-600 text-white px-6 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-xl shadow-blue-500/20 active:scale-95 transition-all">
                   + Adicionar Empresa
                </button>
              )}
           </div>
           
           <div className="bg-white rounded-[40px] border border-slate-200 overflow-hidden shadow-sm">
             <table className="w-full text-left border-collapse">
               <thead className="bg-slate-50 border-b border-slate-100">
                 <tr>
                   <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Empresa</th>
                   <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Especialidade</th>
                   <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Contato</th>
                   {canManage && <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Ações</th>}
                 </tr>
               </thead>
               <tbody className="divide-y divide-slate-100">
                 {vendors.map(v => (
                   <tr key={v.id} className="hover:bg-slate-50/50 transition-colors">
                     <td className="px-8 py-5">
                       <p className="font-bold text-slate-900">{v.name}</p>
                       <p className="text-[9px] text-slate-400 font-black uppercase">Ref: {v.taxId}</p>
                     </td>
                     <td className="px-8 py-5"><span className="text-[10px] font-black text-blue-600 uppercase bg-blue-50 px-3 py-1 rounded-lg">{v.category}</span></td>
                     <td className="px-8 py-5 text-sm font-medium text-slate-600">{v.phone}</td>
                     {canManage && (
                       <td className="px-8 py-5 text-right">
                         <button onClick={() => { setEditingVendor(v); setVendorForm({ name: v.name, taxId: v.taxId, phone: v.phone, category: v.category, documents: v.documents || [] }); setShowVendorModal(true); }} className="p-2 text-slate-400 hover:text-blue-600 transition-all"><svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"></path></svg></button>
                       </td>
                     )}
                   </tr>
                 ))}
                 {vendors.length === 0 && (
                   <tr><td colSpan={4} className="px-8 py-20 text-center text-slate-400 font-bold uppercase tracking-widest text-xs">Nenhum fornecedor cadastrado.</td></tr>
                 )}
               </tbody>
             </table>
           </div>
        </div>
      )}

      {activeSubTab === 'budgets' && (
        <div className="space-y-6 animate-in slide-in-from-right-4 duration-500">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <h3 className="text-xl font-black text-slate-900 tracking-tight">Cotações e Orçamentos</h3>
            <div className="flex gap-3">
              <select value={filterStatus} onChange={e => setFilterStatus(e.target.value as any)} className="bg-white border-2 border-slate-100 rounded-xl px-4 py-2 text-xs font-bold text-slate-600 outline-none">
                <option value="ALL">Todos os Status</option>
                <option value="PENDING">Pendentes</option>
                <option value="APPROVED">Aprovados</option>
                <option value="REJECTED">Rejeitados</option>
              </select>
              {canManage && (
                <button onClick={() => { setEditingBudget(null); setBudgetForm({ title: '', description: '', vendorId: vendors[0]?.id || '', items: [{ id: '1', description: '', quantity: 1, unitPrice: 0 }], status: 'PENDING', documents: [] }); setShowBudgetModal(true); }} className="bg-emerald-600 text-white px-6 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-xl shadow-emerald-500/20 active:scale-95 transition-all">
                  Solicitar Orçamento
                </button>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4">
            {filteredBudgets.map(b => (
              <div key={b.id} className="bg-white p-8 rounded-[32px] border border-slate-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-6 group">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <span className={`px-4 py-1 rounded-full text-[9px] font-black uppercase tracking-widest border ${
                      b.status === 'PENDING' ? 'bg-amber-50 text-amber-600 border-amber-100' :
                      b.status === 'APPROVED' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : 'bg-red-50 text-red-600 border-red-100'
                    }`}>
                      {b.status === 'PENDING' ? 'Em Análise' : b.status === 'APPROVED' ? 'Aprovado' : 'Rejeitado'}
                    </span>
                    <span className="text-[10px] font-black text-slate-400 uppercase">{new Date(b.createdAt).toLocaleDateString()}</span>
                  </div>
                  <h4 className="text-xl font-black text-slate-900 mb-1">{b.title}</h4>
                  <p className="text-sm text-slate-500 font-medium mb-3">{b.description}</p>
                  
                  {/* Resumo dos Itens */}
                  <div className="mb-4 bg-slate-50 rounded-2xl p-4 border border-slate-100 space-y-2">
                    {b.items?.map((item, idx) => (
                      <div key={idx} className="flex justify-between text-[10px] font-bold">
                        <span className="text-slate-600">{item.quantity}x {item.description}</span>
                        <span className="text-slate-900">R$ {(item.quantity * item.unitPrice).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                      </div>
                    ))}
                  </div>

                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded bg-blue-50 text-blue-600 flex items-center justify-center text-[10px] font-black">F</div>
                      <span className="text-xs font-black text-blue-600 uppercase">{vendors.find(v => v.id === b.vendorId)?.name || 'Desconhecido'}</span>
                    </div>
                    {b.documents && b.documents.length > 0 && (
                      <a href={b.documents[0].url} download={b.documents[0].name} className="flex items-center gap-1.5 text-[10px] font-black text-emerald-600 uppercase tracking-widest bg-emerald-50 px-3 py-1 rounded-lg hover:bg-emerald-600 hover:text-white transition-all">
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M9 19l3 3m0 0l3-3m-3 3V10"></path></svg>
                        Baixar Orçamento Original
                      </a>
                    )}
                  </div>
                </div>
                <div className="flex flex-col items-end gap-3 min-w-[180px]">
                   <p className="text-3xl font-black text-slate-900 tracking-tighter">R$ {b.value?.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                   {canManage && b.status === 'PENDING' && (
                     <div className="flex gap-2">
                        <button onClick={() => handleQuickStatusUpdate(b, 'APPROVED')} className="px-4 py-2 bg-emerald-600 text-white rounded-xl text-[9px] font-black uppercase tracking-widest shadow-lg shadow-emerald-500/20">Aprovar</button>
                        <button onClick={() => handleQuickStatusUpdate(b, 'REJECTED')} className="px-4 py-2 bg-slate-100 text-slate-500 rounded-xl text-[9px] font-black uppercase tracking-widest">Rejeitar</button>
                     </div>
                   )}
                </div>
              </div>
            ))}
            {filteredBudgets.length === 0 && (
              <div className="py-20 text-center border-2 border-dashed border-slate-200 rounded-[40px] text-slate-400 font-black uppercase text-xs">Nenhum orçamento encontrado.</div>
            )}
          </div>
        </div>
      )}

      {activeSubTab === 'history' && (
        <div className="bg-white rounded-[40px] border border-slate-200 overflow-hidden shadow-sm animate-in slide-in-from-bottom-4 duration-500">
           <div className="divide-y divide-slate-100">
              {procurementLogs.map(log => (
                <div key={log.id} className="p-6 flex items-center justify-between hover:bg-slate-50 transition-colors">
                  <div className="flex items-center gap-4">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-black text-[10px] ${log.action === 'APPROVED' ? 'bg-emerald-50 text-emerald-600' : 'bg-blue-50 text-blue-600'}`}>
                      {log.module.charAt(0)}
                    </div>
                    <div>
                      <p className="text-sm font-bold text-slate-900">{log.userName} <span className="font-medium text-slate-500">realizou</span> {log.action}</p>
                      <p className="text-[10px] font-black text-blue-600 uppercase mt-0.5">{log.targetName}</p>
                    </div>
                  </div>
                  <span className="text-[10px] font-black text-slate-400 uppercase">{new Date(log.timestamp).toLocaleDateString()}</span>
                </div>
              ))}
              {procurementLogs.length === 0 && <div className="p-20 text-center text-slate-400 font-black uppercase text-xs">Sem registros de auditoria em suprimentos.</div>}
           </div>
        </div>
      )}

      {/* Vendor Modal */}
      {showVendorModal && (
        <div className="fixed inset-0 z-[150] flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-md">
           <div className="bg-white w-full max-w-xl rounded-[40px] p-10 animate-in zoom-in-95 duration-300 shadow-2xl overflow-hidden">
              <h3 className="text-2xl font-black text-slate-900 mb-6">{editingVendor ? 'Ajustar' : 'Nova'} Empresa</h3>
              <form onSubmit={handleSaveVendor} className="space-y-4">
                 <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">Empresa (Razão Social)</label>
                    <input type="text" required placeholder="Ex: Elevadores ABC" className="w-full h-14 px-6 rounded-2xl border-2 border-slate-100 bg-slate-50 font-bold outline-none focus:border-blue-500" value={vendorForm.name} onChange={e => setVendorForm({...vendorForm, name: e.target.value})} />
                 </div>
                 <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">CNPJ / CPF</label>
                    <input type="text" placeholder="00.000.000/0001-00" className="w-full h-14 px-6 rounded-2xl border-2 border-slate-100 bg-slate-50 font-bold outline-none focus:border-blue-500" value={vendorForm.taxId} onChange={e => setVendorForm({...vendorForm, taxId: e.target.value})} />
                 </div>
                 <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">Contato (Telefone)</label>
                    <input type="tel" placeholder="(00) 00000-0000" className="w-full h-14 px-6 rounded-2xl border-2 border-slate-100 bg-slate-50 font-bold outline-none focus:border-blue-500" value={vendorForm.phone} onChange={e => setVendorForm({...vendorForm, phone: e.target.value})} />
                 </div>
                 <div className="space-y-1">
                    <div className="flex items-center justify-between px-2">
                       <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Especialidade</label>
                       {canManage && (
                         <button type="button" onClick={() => setShowCategoryManager(true)} className="text-[9px] font-black text-blue-600 uppercase hover:underline">Gerenciar</button>
                       )}
                    </div>
                    <select className="w-full h-14 px-6 rounded-2xl border-2 border-slate-100 bg-slate-50 font-bold outline-none" value={vendorForm.category} onChange={e => setVendorForm({...vendorForm, category: e.target.value})}>
                        {categories.map(cat => <option key={cat} value={cat}>{cat}</option>)}
                    </select>
                 </div>
                 <div className="flex gap-4 pt-4">
                    <button type="button" onClick={() => setShowVendorModal(false)} className="flex-1 h-14 font-black uppercase text-xs text-slate-400">Cancelar</button>
                    <button type="submit" className="flex-1 h-14 bg-blue-600 text-white rounded-2xl font-black uppercase text-xs shadow-lg shadow-blue-500/20 active:scale-95 transition-all">Salvar Cadastro</button>
                 </div>
              </form>
           </div>
        </div>
      )}

      {/* Budget Modal - MÚLTIPLOS ITENS + ANEXO */}
      {showBudgetModal && (
        <div className="fixed inset-0 z-[150] flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-md overflow-y-auto">
           <div className="bg-white w-full max-w-2xl rounded-[40px] p-10 animate-in zoom-in-95 duration-300 shadow-2xl my-8">
              <div className="flex justify-between items-center mb-8">
                <h3 className="text-2xl font-black text-slate-900 tracking-tight">Solicitar Cotação Detalhada</h3>
                <div className="text-right">
                   <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Total Estimado</p>
                   <p className="text-2xl font-black text-emerald-600 tracking-tighter">R$ {totalValue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                </div>
              </div>

              <form onSubmit={handleSaveBudget} className="space-y-8">
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-1">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">Título</label>
                        <input type="text" required placeholder="Título do Serviço" className="w-full h-14 px-6 rounded-2xl border-2 border-slate-100 bg-slate-50 font-bold outline-none" value={budgetForm.title} onChange={e => setBudgetForm({...budgetForm, title: e.target.value})} />
                    </div>
                    <div className="space-y-1">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">Fornecedor</label>
                        <select required className="w-full h-14 px-6 rounded-2xl border-2 border-slate-100 bg-slate-50 font-bold outline-none" value={budgetForm.vendorId} onChange={e => setBudgetForm({...budgetForm, vendorId: e.target.value})}>
                            <option value="">Selecionar Fornecedor</option>
                            {vendors.map(v => <option key={v.id} value={v.id}>{v.name}</option>)}
                        </select>
                    </div>
                 </div>

                 <div className="space-y-4">
                    <div className="flex items-center justify-between px-2">
                       <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Itens do Orçamento</label>
                       <button type="button" onClick={handleAddBudgetItem} className="text-[9px] font-black text-emerald-600 uppercase hover:underline">+ Adicionar Item</button>
                    </div>
                    
                    <div className="space-y-3 max-h-[30vh] overflow-y-auto pr-2 scrollbar-hide">
                        {budgetForm.items.map((item, idx) => (
                          <div key={item.id} className="flex gap-2 animate-in slide-in-from-top-2 duration-300">
                             <input 
                                type="text" 
                                placeholder="Descrição do item..." 
                                required
                                className="flex-1 h-12 px-4 rounded-xl border-2 border-slate-100 bg-white font-bold text-xs"
                                value={item.description}
                                onChange={e => handleItemChange(item.id, 'description', e.target.value)}
                             />
                             <input 
                                type="number" 
                                placeholder="Qtd" 
                                required
                                min="1"
                                className="w-20 h-12 px-2 rounded-xl border-2 border-slate-100 bg-white font-bold text-xs text-center"
                                value={item.quantity}
                                onChange={e => handleItemChange(item.id, 'quantity', parseInt(e.target.value) || 0)}
                             />
                             <input 
                                type="number" 
                                placeholder="Preço" 
                                step="0.01"
                                required
                                className="w-28 h-12 px-2 rounded-xl border-2 border-slate-100 bg-white font-bold text-xs text-center"
                                value={item.unitPrice || ''}
                                onChange={e => handleItemChange(item.id, 'unitPrice', parseFloat(e.target.value) || 0)}
                             />
                             <button 
                                type="button" 
                                onClick={() => handleRemoveBudgetItem(item.id)}
                                className="w-12 h-12 flex items-center justify-center bg-red-50 text-red-400 rounded-xl hover:bg-red-500 hover:text-white transition-all"
                             >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M6 18L18 6M6 6l12 12"></path></svg>
                             </button>
                          </div>
                        ))}
                    </div>
                 </div>

                 <div className="space-y-3">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">Arquivo de Orçamento do Fornecedor (Opcional)</label>
                    <div className="flex items-center gap-4">
                        <button type="button" onClick={() => budgetFileRef.current?.click()} className="flex items-center gap-2 px-6 py-4 bg-slate-50 border-2 border-dashed border-slate-200 rounded-2xl text-[10px] font-black uppercase text-slate-500 hover:border-blue-500 hover:text-blue-600 transition-all">
                            {isUploading ? 'Processando...' : <><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"></path></svg> Selecionar Arquivo</>}
                        </button>
                        <input type="file" ref={budgetFileRef} className="hidden" onChange={handleBudgetFileUpload} />
                        {budgetForm.documents.length > 0 && (
                          <div className="flex items-center gap-2 bg-blue-50 text-blue-600 px-4 py-3 rounded-xl border border-blue-100">
                             <span className="text-[10px] font-black uppercase truncate max-w-[150px]">{budgetForm.documents[0].name}</span>
                             <button type="button" onClick={() => setBudgetForm(prev => ({...prev, documents: []}))} className="text-red-400"><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M6 18L18 6M6 6l12 12"></path></svg></button>
                          </div>
                        )}
                    </div>
                 </div>

                 <textarea rows={2} placeholder="Observações técnicas gerais..." className="w-full p-6 rounded-2xl border-2 border-slate-100 bg-slate-50 font-medium outline-none" value={budgetForm.description} onChange={e => setBudgetForm({...budgetForm, description: e.target.value})} />

                 <div className="flex gap-4 pt-4">
                    <button type="button" onClick={() => setShowBudgetModal(false)} className="flex-1 h-14 font-black uppercase text-xs text-slate-400">Cancelar</button>
                    <button type="submit" className="flex-1 h-14 bg-emerald-600 text-white rounded-2xl font-black uppercase text-xs shadow-lg shadow-emerald-500/20 active:scale-95 transition-all">Salvar Cotação</button>
                 </div>
              </form>
           </div>
        </div>
      )}

      {showCategoryManager && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-slate-900/90 backdrop-blur-xl">
          <div className="bg-white w-full max-w-md rounded-[40px] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300">
            <div className="p-8 border-b border-slate-100 flex items-center justify-between">
              <h3 className="text-xl font-black text-slate-900">Especialidades</h3>
              <button onClick={() => setShowCategoryManager(false)} className="p-2 text-slate-400"><Icons.Add className="rotate-45" /></button>
            </div>
            <div className="p-8 space-y-6">
              <div className="space-y-2 max-h-[40vh] overflow-y-auto pr-2 scrollbar-hide">
                {categories.map(cat => (
                  <div key={cat} className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-100">
                    <span className="font-bold text-slate-700">{cat}</span>
                    <button onClick={() => handleDeleteCategory(cat)} className="p-2 text-red-400 hover:bg-red-50 rounded-lg"><Icons.Add className="rotate-45 w-4 h-4" /></button>
                  </div>
                ))}
              </div>
              <div className="flex gap-2">
                <input type="text" placeholder="Nova..." className="flex-1 h-12 px-4 rounded-xl border-2 border-slate-100 font-bold bg-slate-50 outline-none" value={newCategoryName} onChange={e => setNewCategoryName(e.target.value)} />
                <button onClick={handleAddCategory} className="bg-blue-600 text-white w-12 h-12 rounded-xl flex items-center justify-center"><Icons.Add /></button>
              </div>
              <button onClick={() => setShowCategoryManager(false)} className="w-full py-4 bg-slate-900 text-white font-black rounded-2xl text-xs uppercase tracking-widest">Fechar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ServiceHub;
