
import React, { useState, useEffect } from 'react';
import { Budget, Vendor, User, UserRole } from '../types';
import { db } from '../services/db';

interface BudgetsProps {
  selectedCondoId: string;
  notify: (msg: string, type?: 'success' | 'error') => void;
  currentUser: User;
}

const Budgets: React.FC<BudgetsProps> = ({ selectedCondoId, notify, currentUser }) => {
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [editingBudget, setEditingBudget] = useState<Budget | null>(null);

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    vendorId: '',
    value: 0,
    status: 'PENDING' as any
  });

  const refreshData = () => {
    setBudgets(db.getBudgets().filter(b => b.condoId === selectedCondoId));
    setVendors(db.getVendors().filter(v => v.condoId === selectedCondoId));
  };

  useEffect(() => {
    refreshData();
  }, [selectedCondoId]);

  const handleOpenAdd = () => {
    setEditingBudget(null);
    setFormData({ title: '', description: '', vendorId: vendors[0]?.id || '', value: 0, status: 'PENDING' });
    setShowModal(true);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    const budgetData: Budget = {
      id: editingBudget?.id || Math.random().toString(36).substr(2, 9),
      ...formData,
      condoId: selectedCondoId,
      createdAt: editingBudget?.createdAt || new Date().toISOString()
    };
    db.saveBudget(budgetData);
    
    db.saveLog({
      id: Math.random().toString(36).substr(2, 9),
      userId: currentUser.id,
      userName: currentUser.name,
      action: editingBudget ? 'UPDATE' : 'CREATE',
      module: 'BUDGET',
      targetName: budgetData.title,
      timestamp: new Date().toISOString(),
      condoId: selectedCondoId
    });

    refreshData();
    setShowModal(false);
    notify('Orçamento salvo com sucesso!');
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
    notify(`Orçamento ${newStatus === 'APPROVED' ? 'aprovado' : 'rejeitado'} com sucesso!`);
  };

  const getStatusStyle = (status: string) => {
    switch (status) {
      case 'APPROVED': return 'bg-emerald-100 text-emerald-700 border-emerald-200';
      case 'REJECTED': return 'bg-rose-100 text-rose-700 border-rose-200';
      default: return 'bg-amber-100 text-amber-700 border-amber-200';
    }
  };

  const canManage = currentUser.role === UserRole.SINDICO || currentUser.role === UserRole.GESTOR;

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h2 className="text-3xl font-black text-slate-900 tracking-tight">Gestão de Orçamentos</h2>
          <p className="text-slate-500 font-medium">Controle de cotações e aprovações de serviços.</p>
        </div>
        {canManage && (
          <button onClick={handleOpenAdd} className="bg-emerald-600 hover:bg-emerald-700 text-white px-8 py-4 rounded-2xl flex items-center gap-3 font-black text-xs uppercase tracking-widest shadow-xl active:scale-95 transition-all">
            Solicitar Orçamento
          </button>
        )}
      </header>

      <div className="grid grid-cols-1 gap-6">
        {budgets.map(b => (
          <div key={b.id} className="bg-white p-8 rounded-[32px] border border-slate-200 shadow-sm hover:border-blue-300 transition-all flex flex-col md:flex-row md:items-center justify-between gap-6 group">
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-3">
                <span className={`px-4 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border shadow-sm ${getStatusStyle(b.status)}`}>
                  {b.status === 'PENDING' ? '⏳ Pendente' : b.status === 'APPROVED' ? '✅ Aprovado' : '❌ Rejeitado'}
                </span>
                <span className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">{new Date(b.createdAt).toLocaleDateString()}</span>
              </div>
              <h4 className="text-xl font-black text-slate-900 mb-1">{b.title}</h4>
              <p className="text-sm text-slate-500 font-medium line-clamp-2">{b.description}</p>
              {b.vendorId && (
                <div className="mt-4 flex items-center gap-2">
                  <div className="w-6 h-6 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"></path></svg>
                  </div>
                  <span className="text-xs font-black text-blue-600 uppercase tracking-tight">{vendors.find(v => v.id === b.vendorId)?.name}</span>
                </div>
              )}
            </div>
            <div className="flex flex-col items-end gap-4 min-w-[200px]">
              <div className="text-right">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Valor do Orçamento</p>
                <p className="text-3xl font-black text-slate-900 tracking-tighter">R$ {b.value?.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
              </div>
              
              {canManage && (
                <div className="flex items-center gap-2">
                  {b.status === 'PENDING' && (
                    <>
                      <button 
                        onClick={() => handleQuickStatusUpdate(b, 'APPROVED')}
                        className="h-12 px-5 bg-emerald-600 text-white rounded-xl text-[10px] font-black uppercase tracking-widest shadow-lg shadow-emerald-500/20 hover:bg-emerald-700 transition-all active:scale-95"
                      >
                        Aprovar
                      </button>
                      <button 
                        onClick={() => handleQuickStatusUpdate(b, 'REJECTED')}
                        className="h-12 px-5 bg-rose-50 text-rose-600 border border-rose-100 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-rose-100 transition-all active:scale-95"
                      >
                        Rejeitar
                      </button>
                    </>
                  )}
                  <button onClick={() => { 
                    setEditingBudget(b); 
                    setFormData({
                      title: b.title,
                      description: b.description,
                      vendorId: b.vendorId || '',
                      value: b.value || 0,
                      status: b.status
                    }); 
                    setShowModal(true); 
                  }} className="w-12 h-12 flex items-center justify-center bg-slate-50 hover:bg-blue-50 text-slate-400 hover:text-blue-600 rounded-xl transition-all" title="Editar / Alterar Status">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"></path></svg>
                  </button>
                </div>
              )}
            </div>
          </div>
        ))}
        {budgets.length === 0 && (
          <div className="py-20 border-2 border-dashed border-slate-200 rounded-[40px] text-center text-slate-400 font-bold uppercase tracking-widest text-xs">Nenhuma cotação registrada.</div>
        )}
      </div>

      {showModal && (
        <div className="fixed inset-0 z-[150] flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-md">
          <div className="bg-white w-full max-w-xl rounded-[40px] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300">
            <div className="px-10 py-8 border-b border-slate-100 flex items-center justify-between">
              <h3 className="text-2xl font-black text-slate-900 tracking-tight">{editingBudget ? 'Ajustar' : 'Novo'} Orçamento</h3>
              <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-slate-900 transition-all"><svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M6 18L18 6M6 6l12 12"></path></svg></button>
            </div>
            <form onSubmit={handleSave} className="p-10 space-y-6">
              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">Título do Serviço</label>
                <input type="text" required placeholder="Ex: Pintura da Fachada" className="w-full h-14 px-6 rounded-2xl border-2 border-slate-100 focus:border-blue-500 bg-slate-50 font-bold outline-none" value={formData.title} onChange={e => setFormData({...formData, title: e.target.value})} />
              </div>
              
              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">Descrição Detalhada</label>
                <textarea placeholder="Liste os materiais e prazos acordados..." className="w-full p-6 rounded-2xl border-2 border-slate-100 focus:border-blue-500 bg-slate-50 font-medium outline-none" rows={3} value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">Fornecedor</label>
                  <select className="w-full h-14 px-6 rounded-2xl border-2 border-slate-100 focus:border-blue-500 bg-slate-50 font-bold outline-none" value={formData.vendorId} onChange={e => setFormData({...formData, vendorId: e.target.value})}>
                    <option value="">Vincular Fornecedor</option>
                    {vendors.map(v => <option key={v.id} value={v.id}>{v.name}</option>)}
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">Valor Final (R$)</label>
                  <input type="number" step="0.01" placeholder="0,00" className="w-full h-14 px-6 rounded-2xl border-2 border-slate-100 focus:border-blue-500 bg-slate-50 font-bold outline-none" value={formData.value || ''} onChange={e => setFormData({...formData, value: parseFloat(e.target.value)})} />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">Status da Decisão</label>
                <select className="w-full h-14 px-6 rounded-2xl border-2 border-slate-100 focus:border-blue-500 bg-slate-50 font-bold outline-none" value={formData.status} onChange={e => setFormData({...formData, status: e.target.value as any})}>
                  <option value="PENDING">⏳ Em Análise / Pendente</option>
                  <option value="APPROVED">✅ Aprovado para Execução</option>
                  <option value="REJECTED">❌ Recusado / Rejeitado</option>
                </select>
              </div>

              <div className="pt-4 flex gap-4">
                <button type="button" onClick={() => setShowModal(false)} className="flex-1 h-16 border-2 border-slate-100 text-slate-500 font-black rounded-2xl text-xs uppercase tracking-widest">Cancelar</button>
                <button type="submit" className="flex-[2] h-16 bg-blue-600 text-white font-black rounded-2xl shadow-xl shadow-blue-500/20 uppercase tracking-widest active:scale-95 transition-all">
                  {editingBudget ? 'Atualizar Orçamento' : 'Confirmar Registro'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Budgets;
