
import React, { useState, useEffect } from 'react';
import { Condo, Log, User, UserRole } from '../types';
import { Icons } from '../constants';
import { db } from '../services/db';
import Users from './Users';

interface CondosProps {
  onSelectCondo?: (id: string) => void;
  onRefresh?: () => void;
  notify: (msg: string, type?: 'success' | 'error') => void;
  currentUser: User;
}

const Condos: React.FC<CondosProps> = ({ onSelectCondo, onRefresh, notify, currentUser }) => {
  const [condos, setCondos] = useState<Condo[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [editingCondo, setEditingCondo] = useState<Condo | null>(null);
  const [viewingTeamOf, setViewingTeamOf] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    name: '',
    address: ''
  });

  const loadCondos = () => {
    setCondos(db.getCondos());
  };

  useEffect(() => {
    loadCondos();
  }, []);

  const handleOpenAdd = () => {
    setEditingCondo(null);
    setFormData({ name: '', address: '' });
    setShowModal(true);
  };

  const handleOpenEdit = (condo: Condo) => {
    setEditingCondo(condo);
    setFormData({
      name: condo.name,
      address: condo.address
    });
    setShowModal(true);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    const isUpdate = !!editingCondo;
    const condoData: Condo = isUpdate ? {
      ...editingCondo!,
      name: formData.name,
      address: formData.address
    } : {
      id: Math.random().toString(36).substr(2, 9),
      name: formData.name,
      address: formData.address,
      createdAt: new Date().toISOString()
    };

    db.saveCondo(condoData);
    
    db.saveLog({
      id: Math.random().toString(36).substr(2, 9),
      userId: currentUser.id,
      userName: currentUser.name,
      action: isUpdate ? 'UPDATE' : 'CREATE',
      module: 'CONDO',
      targetName: condoData.name,
      timestamp: new Date().toISOString(),
      condoId: condoData.id
    });

    loadCondos();
    onRefresh?.();
    setShowModal(false);
    notify(isUpdate ? 'Dados atualizados.' : 'Condomínio cadastrado!');
  };

  const handleDeleteCondo = (condo: Condo) => {
    if (window.confirm(`Tem certeza que deseja excluir permanentemente o condomínio "${condo.name}"? Todos os dados vinculados podem ficar inacessíveis.`)) {
      db.deleteCondo(condo.id);
      db.saveLog({
        id: Math.random().toString(36).substr(2, 9),
        userId: currentUser.id,
        userName: currentUser.name,
        action: 'DELETE',
        module: 'CONDO',
        targetName: condo.name,
        timestamp: new Date().toISOString(),
        condoId: condo.id
      });
      loadCondos();
      onRefresh?.();
      notify('Condomínio excluído.');
    }
  };

  if (viewingTeamOf) {
    return (
      <Users 
        filterCondoId={viewingTeamOf} 
        onBack={() => setViewingTeamOf(null)} 
        notify={notify}
        currentUser={currentUser}
      />
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h2 className="text-4xl font-black text-slate-900 tracking-tight">Meus Condomínios</h2>
          <p className="text-slate-500 font-medium">Gestão centralizada de suas propriedades e equipes.</p>
        </div>
        <button 
          onClick={handleOpenAdd}
          className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-4 rounded-2xl flex items-center justify-center gap-3 font-black text-sm uppercase tracking-widest transition-all shadow-xl shadow-blue-500/20 active:scale-95"
        >
          <Icons.Add />
          Novo Condomínio
        </button>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {condos.map((condo) => (
          <div key={condo.id} className="bg-white rounded-[40px] border border-slate-200 shadow-sm hover:shadow-2xl hover:border-blue-200 transition-all duration-300 overflow-hidden group flex flex-col">
            <div className="p-8 flex-1">
              <div className="flex justify-between items-start mb-6">
                <div className="w-14 h-14 bg-blue-50 rounded-2xl flex items-center justify-center text-blue-600 group-hover:bg-blue-600 group-hover:text-white transition-all duration-300">
                  <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"></path></svg>
                </div>
                <div className="flex items-center gap-2">
                  <button 
                    onClick={() => handleOpenEdit(condo)} 
                    className="p-2.5 text-slate-400 hover:text-blue-600 bg-slate-50 rounded-xl transition-all"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"></path></svg>
                  </button>
                  {currentUser.role === UserRole.SINDICO && (
                    <button 
                      onClick={() => handleDeleteCondo(condo)} 
                      className="p-2.5 text-slate-400 hover:text-red-500 bg-slate-50 rounded-xl transition-all"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>
                    </button>
                  )}
                </div>
              </div>
              <h3 className="text-2xl font-black text-slate-900 mb-2 leading-tight">{condo.name}</h3>
              <p className="text-sm text-slate-500 mb-8 flex items-start gap-2 font-medium">
                <svg className="w-5 h-5 text-slate-300 mt-0.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"></path><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"></path></svg>
                {condo.address}
              </p>
            </div>
            <div className="p-6 bg-slate-50 border-t border-slate-100 flex flex-col gap-3">
               <button 
                onClick={() => onSelectCondo?.(condo.id)}
                className="w-full bg-blue-600 text-white py-4 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-blue-700 transition-all shadow-xl shadow-blue-500/10 active:scale-95 flex items-center justify-center gap-2"
               >
                 Acessar Dashboard
                 <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M14 5l7 7m0 0l-7 7m7-7H3"></path></svg>
               </button>
               <button 
                onClick={() => setViewingTeamOf(condo.id)}
                className="w-full bg-white border border-slate-200 text-slate-700 py-4 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-slate-100 transition-all flex items-center justify-center gap-2"
               >
                 Equipe Local
               </button>
            </div>
          </div>
        ))}
        {condos.length === 0 && (
          <div className="col-span-full border-2 border-dashed border-slate-200 rounded-[40px] p-20 text-center">
            <h2 className="text-2xl font-black text-slate-900 mb-2">Nenhum condomínio cadastrado</h2>
            <p className="text-slate-500 font-medium mb-8">Adicione sua primeira propriedade para começar.</p>
            <button onClick={handleOpenAdd} className="bg-blue-600 text-white px-10 py-5 rounded-2xl font-black text-xs uppercase tracking-widest">
              Cadastrar Agora
            </button>
          </div>
        )}
      </div>

      {showModal && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-md">
          <div className="bg-white w-full max-w-xl rounded-[40px] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300">
            <div className="px-10 py-8 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <h3 className="text-2xl font-black text-slate-900 tracking-tight">{editingCondo ? 'Editar Condomínio' : 'Novo Condomínio'}</h3>
              <button onClick={() => setShowModal(false)} className="p-3 text-slate-400 hover:bg-white rounded-2xl">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M6 18L18 6M6 6l12 12"></path></svg>
              </button>
            </div>
            <form onSubmit={handleSave} className="p-10 space-y-6">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">Nome</label>
                <input 
                  type="text" required placeholder="Nome do Condomínio"
                  className="w-full h-14 px-6 rounded-2xl border-2 border-slate-100 focus:border-blue-500 outline-none font-bold text-slate-700 bg-slate-50"
                  value={formData.name}
                  onChange={e => setFormData({...formData, name: e.target.value})}
                />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">Endereço</label>
                <input 
                  type="text" required placeholder="Endereço Completo"
                  className="w-full h-14 px-6 rounded-2xl border-2 border-slate-100 focus:border-blue-500 outline-none font-bold text-slate-700 bg-slate-50"
                  value={formData.address}
                  onChange={e => setFormData({...formData, address: e.target.value})}
                />
              </div>
              <div className="pt-4 flex gap-4">
                <button type="button" onClick={() => setShowModal(false)} className="flex-1 h-14 border-2 border-slate-100 text-slate-500 font-black rounded-2xl text-xs uppercase tracking-widest">Cancelar</button>
                <button type="submit" className="flex-[2] h-14 bg-blue-600 text-white font-black rounded-2xl shadow-xl shadow-blue-500/20 active:scale-95 text-xs uppercase tracking-widest">
                  {editingCondo ? 'Salvar Alterações' : 'Concluir Cadastro'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Condos;
