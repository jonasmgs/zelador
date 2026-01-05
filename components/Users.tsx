
import React, { useState, useEffect } from 'react';
import { User, UserRole, Condo, Log } from '../types';
import { Icons } from '../constants';
import { db } from '../services/db';

interface UsersProps {
  filterCondoId?: string;
  onBack?: () => void;
  notify: (msg: string, type?: 'success' | 'error') => void;
  currentUser: User;
}

const Users: React.FC<UsersProps> = ({ filterCondoId, onBack, notify, currentUser }) => {
  const [showModal, setShowModal] = useState(false);
  const [showFunctionModal, setShowFunctionModal] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [condos, setCondos] = useState<Condo[]>([]);
  const [userFunctions, setUserFunctions] = useState<{ name: string, baseRole: UserRole }[]>([]);
  const [newFunctionName, setNewFunctionName] = useState('');
  const [newFunctionBaseRole, setNewFunctionBaseRole] = useState<UserRole>(UserRole.ZELADOR);

  const canManage = [UserRole.SINDICO, UserRole.GESTOR].includes(currentUser.role);
  const condoId = filterCondoId || currentUser.condoId || '';

  const [formData, setFormData] = useState({
    name: '',
    password: '',
    jobTitle: '',
    condoId: condoId
  });

  const refreshData = () => {
    setUsers(db.getUsers());
    const funcs = db.getUserFunctions();
    setUserFunctions(funcs);
    if (!formData.jobTitle && funcs.length > 0) {
      setFormData(prev => ({ ...prev, jobTitle: funcs[0].name }));
    }
  };

  useEffect(() => {
    refreshData();
    setCondos(db.getCondos());
  }, []);

  const handleOpenAdd = () => {
    if (!canManage) return;
    setEditingUser(null);
    setFormData({ 
      name: '', 
      password: '', 
      jobTitle: userFunctions[0]?.name || 'Zelador', 
      condoId: condoId
    });
    setShowModal(true);
  };

  const handleOpenEdit = (user: User) => {
    if (!canManage) return;
    setEditingUser(user);
    setFormData({
      name: user.name,
      password: user.password || '',
      jobTitle: user.jobTitle || '',
      condoId: user.condoId || ''
    });
    setShowModal(true);
  };

  const handleSaveUser = (e: React.FormEvent) => {
    e.preventDefault();
    if (!canManage) return;
    
    const selectedFunc = userFunctions.find(f => f.name === formData.jobTitle);
    const baseRole = selectedFunc?.baseRole || UserRole.ZELADOR;

    const isUpdate = !!editingUser;
    const userData: User = isUpdate ? {
      ...editingUser!,
      name: formData.name,
      password: formData.password,
      role: baseRole,
      jobTitle: formData.jobTitle,
      condoId: formData.condoId,
      email: '' 
    } : {
      id: Math.random().toString(36).substr(2, 9),
      name: formData.name,
      email: '',
      password: formData.password,
      role: baseRole,
      jobTitle: formData.jobTitle,
      condoId: formData.condoId,
      active: true
    };

    db.saveUser(userData);

    db.saveLog({
      id: Math.random().toString(36).substr(2, 9),
      userId: currentUser.id,
      userName: currentUser.name,
      action: isUpdate ? 'UPDATE' : 'CREATE',
      module: 'USER',
      targetName: userData.name,
      timestamp: new Date().toISOString(),
      condoId: userData.condoId || 'SYSTEM'
    });

    refreshData();
    setShowModal(false);
    notify(isUpdate ? 'Cadastro atualizado.' : 'Profissional adicionado!');
  };

  const handleAddFunction = () => {
    if (!newFunctionName.trim()) return;
    db.saveUserFunction({ name: newFunctionName.trim(), baseRole: newFunctionBaseRole });
    setNewFunctionName('');
    refreshData();
    notify('Nova função operacional criada!');
  };

  const handleDeleteFunction = (name: string) => {
    if (window.confirm(`Excluir a função "${name}"? Profissionais já cadastrados com esta função não serão alterados.`)) {
      db.deleteUserFunction(name);
      refreshData();
      notify('Função removida da lista.');
    }
  };

  const toggleUserStatus = (id: string) => {
    if (!canManage) return;
    const user = users.find(u => u.id === id);
    if (user) {
      const newStatus = !user.active;
      db.saveUser({ ...user, active: newStatus });
      refreshData();
      notify(`Acesso do colaborador ${newStatus ? 'liberado' : 'bloqueado'}.`);
    }
  };

  const displayUsers = condoId 
    ? users.filter(u => u.condoId === condoId) 
    : users;

  const currentCondoName = condos.find(c => c.id === condoId)?.name;

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-500 pb-24 md:pb-8">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            {onBack && (
              <button onClick={onBack} className="p-2 -ml-2 text-slate-400 hover:text-blue-600 transition-colors">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7"></path></svg>
              </button>
            )}
            <h2 className="text-2xl font-black text-slate-900 tracking-tight uppercase">
              {currentCondoName ? currentCondoName : 'Equipe Local'}
            </h2>
          </div>
          <p className="text-xs text-slate-500 font-bold uppercase tracking-widest">Gestão de acessos operacionais.</p>
        </div>
        <div className="flex flex-col sm:flex-row gap-2">
          {canManage && (
            <button onClick={() => setShowFunctionModal(true)} className="bg-white border border-slate-200 text-slate-600 px-4 py-3 rounded-none flex items-center justify-center gap-2 font-black text-[10px] uppercase tracking-widest hover:border-slate-400 transition-all">
              Configurar Funções
            </button>
          )}
          {canManage && (
            <button onClick={handleOpenAdd} className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-3 rounded-none flex items-center justify-center gap-2 font-black text-[10px] uppercase tracking-widest shadow-md active:scale-95 transition-all">
              <Icons.Add /> Novo Profissional
            </button>
          )}
        </div>
      </header>

      {/* VIEW DESKTOP: TABELA */}
      <div className="hidden md:block bg-white border border-slate-200 shadow-sm rounded-none overflow-hidden">
        <table className="w-full text-left">
          <thead className="bg-slate-50 border-b border-slate-200">
            <tr>
              <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Colaborador</th>
              <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Função / Cargo</th>
              <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Status</th>
              {canManage && <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Ações</th>}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {displayUsers.map((user) => (
              <tr key={user.id} className="hover:bg-slate-50/50 transition-colors">
                <td className="px-6 py-4">
                  <p className="font-bold text-slate-900">{user.name}</p>
                  <p className="text-[9px] text-slate-400 font-black uppercase tracking-widest">ID: {user.id}</p>
                </td>
                <td className="px-6 py-4">
                  <span className="text-[10px] font-black uppercase tracking-wider text-blue-600 bg-blue-50 px-2 py-1 border border-blue-100">
                    {user.jobTitle || user.role}
                  </span>
                </td>
                <td className="px-6 py-4">
                  <span className={`text-[9px] font-black uppercase px-2 py-1 ${user.active ? 'text-emerald-600 bg-emerald-50 border border-emerald-100' : 'text-slate-400 bg-slate-50 border border-slate-200'}`}>
                    {user.active ? 'Ativo' : 'Bloqueado'}
                  </span>
                </td>
                {canManage && (
                  <td className="px-6 py-4 text-right">
                    <div className="flex items-center justify-end gap-1">
                      <button onClick={() => toggleUserStatus(user.id)} className={`p-2 transition-all ${user.active ? 'text-emerald-600 hover:bg-emerald-50' : 'text-slate-400 hover:bg-slate-100'}`} title={user.active ? 'Bloquear' : 'Ativar'}>
                         <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"></path></svg>
                      </button>
                      <button onClick={() => handleOpenEdit(user)} className="p-2 text-slate-400 hover:text-blue-600 transition-all">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"></path></svg>
                      </button>
                    </div>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* VIEW MOBILE: CARDS */}
      <div className="md:hidden space-y-3">
        {displayUsers.map((user) => (
          <div key={user.id} className="bg-white border border-slate-200 p-5 space-y-4">
            <div className="flex justify-between items-start">
              <div>
                <p className="font-black text-slate-900 text-sm uppercase">{user.name}</p>
                <p className="text-[9px] text-slate-400 font-black uppercase tracking-widest mt-0.5">ID: {user.id}</p>
              </div>
              <span className={`text-[9px] font-black uppercase px-2 py-1 ${user.active ? 'text-emerald-600 bg-emerald-50 border border-emerald-100' : 'text-slate-400 bg-slate-50 border border-slate-200'}`}>
                {user.active ? 'Ativo' : 'Bloqueado'}
              </span>
            </div>
            
            <div className="flex items-center justify-between border-t border-slate-50 pt-4">
              <span className="text-[10px] font-black uppercase text-blue-600">
                {user.jobTitle || user.role}
              </span>
              
              {canManage && (
                <div className="flex gap-2">
                  <button onClick={() => handleOpenEdit(user)} className="bg-slate-50 border border-slate-200 p-2 text-slate-600">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"></path></svg>
                  </button>
                  <button onClick={() => toggleUserStatus(user.id)} className={`p-2 border ${user.active ? 'border-emerald-100 text-emerald-600 bg-emerald-50' : 'border-slate-200 text-slate-400 bg-slate-50'}`}>
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"></path></svg>
                  </button>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {displayUsers.length === 0 && (
        <div className="p-12 text-center border-2 border-dashed border-slate-200 text-slate-400 font-black uppercase tracking-widest text-[10px]">Sem profissionais cadastrados.</div>
      )}

      {/* Modal Novo/Editar Usuário */}
      {showModal && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-sm">
          <div className="bg-white w-full max-w-lg rounded-none shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300">
            <div className="px-8 py-6 border-b border-slate-100 flex items-center justify-between bg-slate-50">
              <h3 className="text-sm font-black uppercase tracking-widest text-slate-900">{editingUser ? 'Ajustar' : 'Novo'} Profissional</h3>
              <button onClick={() => setShowModal(false)} className="p-2 text-slate-400 hover:text-slate-900 transition-colors"><svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M6 18L18 6M6 6l12 12"></path></svg></button>
            </div>
            <form onSubmit={handleSaveUser} className="p-8 space-y-6">
              <div>
                <label className="block text-[9px] font-black uppercase text-slate-400 mb-2 ml-1 tracking-widest">Nome de Acesso</label>
                <input type="text" required placeholder="Ex: Roberto Gomes" className="w-full h-12 px-5 border border-slate-200 font-bold bg-slate-50 outline-none focus:border-blue-500 rounded-none transition-all" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} />
              </div>
              <div>
                <label className="block text-[9px] font-black uppercase text-slate-400 mb-2 ml-1 tracking-widest">Senha Provisória</label>
                <input type="password" required placeholder="Mínimo 3 caracteres" className="w-full h-12 px-5 border border-slate-200 font-bold bg-slate-50 outline-none focus:border-blue-500 rounded-none transition-all" value={formData.password} onChange={e => setFormData({...formData, password: e.target.value})} />
              </div>
              <div>
                <label className="block text-[9px] font-black uppercase text-slate-400 mb-2 ml-1 tracking-widest">Função Atribuída</label>
                <select className="w-full h-12 px-5 border border-slate-200 font-bold bg-slate-50 outline-none focus:border-blue-500 rounded-none transition-all cursor-pointer" value={formData.jobTitle} onChange={e => setFormData({...formData, jobTitle: e.target.value})}>
                  {userFunctions.map(f => <option key={f.name} value={f.name}>{f.name}</option>)}
                </select>
                <p className="text-[9px] text-slate-400 mt-2 italic">* O nível de acesso é herdado da função escolhida.</p>
              </div>
              <div className="pt-4 flex gap-3">
                <button type="button" onClick={() => setShowModal(false)} className="flex-1 h-12 border border-slate-200 text-slate-500 font-black text-[10px] uppercase rounded-none">Cancelar</button>
                <button type="submit" className="flex-[2] h-12 bg-blue-600 text-white font-black rounded-none shadow-lg uppercase text-[10px] tracking-widest active:scale-95 transition-all">Salvar Dados</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Gerenciador de Funções */}
      {showFunctionModal && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-slate-900/90 backdrop-blur-sm">
          <div className="bg-white w-full max-w-lg rounded-none shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300">
            <div className="p-8 border-b border-slate-100 flex items-center justify-between bg-slate-50">
              <h3 className="text-sm font-black uppercase tracking-widest text-slate-900">Funções Operacionais</h3>
              <button onClick={() => setShowFunctionModal(false)} className="p-2 text-slate-400"><svg className="w-6 h-6 rotate-45" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M12 5v14M5 12h14"></path></svg></button>
            </div>
            <div className="p-8 space-y-6">
              <div className="space-y-2 max-h-[30vh] overflow-y-auto pr-2 scrollbar-hide">
                {userFunctions.map(func => (
                  <div key={func.name} className="flex items-center justify-between p-4 bg-slate-50 border border-slate-100">
                    <div>
                      <span className="font-bold text-slate-900 block text-sm">{func.name}</span>
                      <span className="text-[9px] font-black uppercase text-slate-400 tracking-tighter">Nível: {func.baseRole}</span>
                    </div>
                    {func.name !== "Síndico" && func.name !== "Gestor" && (
                      <button onClick={() => handleDeleteFunction(func.name)} className="p-2 text-red-400 hover:text-red-600 transition-all">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>
                      </button>
                    )}
                  </div>
                ))}
              </div>

              <div className="bg-slate-50 p-6 border border-slate-200 space-y-4">
                <p className="text-[9px] font-black uppercase text-slate-500 mb-2 tracking-widest">Criar Nova Função</p>
                <input type="text" placeholder="Ex: Vigilante Noturno" className="w-full h-11 px-4 border border-slate-200 bg-white font-bold outline-none focus:border-blue-500 rounded-none text-sm" value={newFunctionName} onChange={e => setNewFunctionName(e.target.value)} />
                <div className="space-y-1">
                  <label className="text-[8px] font-black uppercase text-slate-400 ml-1">Modelo de Permissão</label>
                  <select className="w-full h-11 px-4 border border-slate-200 bg-white font-bold outline-none focus:border-blue-500 rounded-none cursor-pointer text-sm" value={newFunctionBaseRole} onChange={e => setNewFunctionBaseRole(e.target.value as UserRole)}>
                    <option value={UserRole.PORTEIRO}>Modelo Porteiro (Básico)</option>
                    <option value={UserRole.ZELADOR}>Modelo Zelador (Avançado)</option>
                    <option value={UserRole.LIMPEZA}>Modelo Limpeza (Operacional)</option>
                  </select>
                </div>
                <button onClick={handleAddFunction} className="w-full h-12 bg-slate-900 text-white font-black rounded-none text-[10px] uppercase tracking-widest shadow-lg active:scale-95 transition-all">+ Adicionar Função</button>
              </div>
              
              <button onClick={() => setShowFunctionModal(false)} className="w-full py-4 text-slate-400 font-black text-[10px] uppercase tracking-widest hover:text-slate-900 transition-all">Fechar Gerenciador</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Users;
