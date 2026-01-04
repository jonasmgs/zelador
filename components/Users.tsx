
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
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [condos, setCondos] = useState<Condo[]>([]);

  const canManage = [UserRole.SINDICO, UserRole.GESTOR].includes(currentUser.role);
  const condoId = filterCondoId || currentUser.condoId || '';

  const [formData, setFormData] = useState({
    name: '',
    password: '',
    role: UserRole.ZELADOR,
    condoId: condoId
  });

  const refreshUsers = () => {
    setUsers(db.getUsers());
  };

  useEffect(() => {
    refreshUsers();
    setCondos(db.getCondos());
  }, []);

  const handleOpenAdd = () => {
    if (!canManage) return;
    setEditingUser(null);
    setFormData({ 
      name: '', 
      password: '', 
      role: UserRole.ZELADOR, 
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
      role: user.role,
      condoId: user.condoId || ''
    });
    setShowModal(true);
  };

  const handleDeleteUser = (user: User) => {
    if (user.id === currentUser.id) return notify('Você não pode excluir seu próprio acesso.', 'error');
    
    if (window.confirm(`Tem certeza que deseja excluir permanentemente o colaborador "${user.name}"? Esta ação é irreversível.`)) {
      db.deleteUser(user.id);
      db.saveLog({
        id: Math.random().toString(36).substr(2, 9),
        userId: currentUser.id,
        userName: currentUser.name,
        action: 'DELETE',
        module: 'USER',
        targetName: user.name,
        timestamp: new Date().toISOString(),
        condoId: condoId || 'SYSTEM'
      });
      refreshUsers();
      notify('Colaborador removido do sistema.');
    }
  };

  const handleSaveUser = (e: React.FormEvent) => {
    e.preventDefault();
    if (!canManage) return;
    const isUpdate = !!editingUser;
    const userData: User = isUpdate ? {
      ...editingUser!,
      name: formData.name,
      password: formData.password,
      role: formData.role,
      condoId: formData.condoId,
      email: '' 
    } : {
      id: Math.random().toString(36).substr(2, 9),
      name: formData.name,
      email: '',
      password: formData.password,
      role: formData.role,
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

    refreshUsers();
    setShowModal(false);
    notify(isUpdate ? 'Cadastro atualizado.' : 'Colaborador adicionado!');
  };

  const toggleUserStatus = (id: string) => {
    if (!canManage) return;
    const user = users.find(u => u.id === id);
    if (user) {
      const newStatus = !user.active;
      db.saveUser({ ...user, active: newStatus });
      refreshUsers();
      notify(`Acesso do colaborador ${newStatus ? 'liberado' : 'bloqueado'}.`);
    }
  };

  const displayUsers = condoId 
    ? users.filter(u => u.condoId === condoId) 
    : users;

  const roleLabels: Record<UserRole, string> = {
    [UserRole.SINDICO]: 'Síndico',
    [UserRole.GESTOR]: 'Gestor',
    [UserRole.ZELADOR]: 'Zelador',
    [UserRole.LIMPEZA]: 'Limpeza',
  };

  const currentCondoName = condos.find(c => c.id === condoId)?.name;

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-20">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            {onBack && (
              <button onClick={onBack} className="p-2 -ml-2 text-slate-400 hover:text-blue-600 transition-colors">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7"></path></svg>
              </button>
            )}
            <h2 className="text-2xl md:text-3xl font-black text-slate-900 tracking-tight">
              {currentCondoName ? currentCondoName : 'Equipe Local'}
            </h2>
          </div>
          <p className="text-sm md:text-base text-slate-500 font-medium">Gestão de acessos operacionais.</p>
        </div>
        {canManage && (
          <button onClick={handleOpenAdd} className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-3 rounded-2xl flex items-center justify-center gap-2 font-black text-[10px] uppercase tracking-widest shadow-xl shadow-blue-500/20 active:scale-95 transition-all">
            <Icons.Add /> Novo Profissional
          </button>
        )}
      </header>

      <div className="bg-white rounded-[32px] md:rounded-[40px] border border-slate-200 overflow-hidden shadow-sm">
        <div className="md:hidden divide-y divide-slate-100">
          {displayUsers.map((user) => (
            <div key={user.id} className="p-5 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-black text-sm ${user.active ? 'bg-blue-50 text-blue-600' : 'bg-slate-100 text-slate-400'}`}>
                  {user.name.charAt(0)}
                </div>
                <div>
                  <p className="font-bold text-slate-900 text-sm">{user.name}</p>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-[9px] font-black uppercase text-slate-400 tracking-tighter">{roleLabels[user.role]}</span>
                    <div className={`w-1.5 h-1.5 rounded-full ${user.active ? 'bg-green-500' : 'bg-slate-300'}`}></div>
                  </div>
                </div>
              </div>
              {canManage && (
                <div className="flex items-center gap-2">
                  <button onClick={() => toggleUserStatus(user.id)} className={`p-2 rounded-lg ${user.active ? 'bg-green-50 text-green-600' : 'bg-slate-50 text-slate-400'}`}>
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"></path></svg>
                  </button>
                  <button onClick={() => handleOpenEdit(user)} className="p-2 bg-slate-50 text-slate-400 rounded-lg">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"></path></svg>
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>

        <table className="hidden md:table w-full text-left">
          <thead className="bg-slate-50 border-b">
            <tr>
              <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Colaborador</th>
              <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Função</th>
              {canManage && <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Controles</th>}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {displayUsers.map((user) => (
              <tr key={user.id} className="hover:bg-slate-50/50 transition-colors">
                <td className="px-8 py-5">
                  <p className="font-bold text-slate-900">{user.name}</p>
                  <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest">ID: {user.id}</p>
                </td>
                <td className="px-8 py-5">
                  <span className={`px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider ${
                    user.role === UserRole.SINDICO ? 'bg-purple-100 text-purple-700' : 'bg-slate-100 text-slate-700'
                  }`}>
                    {roleLabels[user.role]}
                  </span>
                </td>
                {canManage && (
                  <td className="px-8 py-5 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button onClick={() => toggleUserStatus(user.id)} className={`p-2.5 rounded-xl transition-all ${user.active ? 'text-green-600 hover:bg-green-50' : 'text-slate-400 hover:bg-slate-100'}`} title={user.active ? 'Bloquear' : 'Ativar'}>
                         <div className={`w-2.5 h-2.5 rounded-full ${user.active ? 'bg-green-500' : 'bg-slate-400'}`}></div>
                      </button>
                      <button onClick={() => handleOpenEdit(user)} className="p-2.5 text-slate-400 hover:text-blue-600 rounded-xl transition-all">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"></path></svg>
                      </button>
                      <button onClick={() => handleDeleteUser(user)} className="p-2.5 text-slate-400 hover:text-red-600 rounded-xl transition-all">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>
                      </button>
                    </div>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>

        {displayUsers.length === 0 && (
          <div className="p-10 text-center text-slate-400 font-bold uppercase tracking-widest text-xs">Sem profissionais cadastrados.</div>
        )}
      </div>

      {showModal && (
        <div className="fixed inset-0 z-[110] flex items-end md:items-center justify-center p-0 md:p-4 bg-slate-900/80 backdrop-blur-md">
          <div className="bg-white w-full max-w-xl rounded-t-[32px] md:rounded-[40px] shadow-2xl overflow-hidden animate-in slide-in-from-bottom md:zoom-in-95 duration-300">
            <div className="px-8 md:px-10 py-6 md:py-8 border-b border-slate-100 flex items-center justify-between">
              <h3 className="text-xl md:text-2xl font-black text-slate-900">{editingUser ? 'Ajustar' : 'Novo'} Profissional</h3>
              <button onClick={() => setShowModal(false)} className="p-2 text-slate-400"><svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M6 18L18 6M6 6l12 12"></path></svg></button>
            </div>
            <form onSubmit={handleSaveUser} className="p-8 md:p-10 space-y-5 md:space-y-6">
              <div>
                <label className="block text-[10px] font-black uppercase text-slate-400 mb-2 ml-2 tracking-widest">Nome de Acesso</label>
                <input type="text" required placeholder="Ex: Roberto Gomes" className="w-full h-12 md:h-14 px-6 rounded-2xl border-2 border-slate-100 font-bold bg-slate-50 outline-none focus:border-blue-500 transition-all" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} />
              </div>
              <div>
                <label className="block text-[10px] font-black uppercase text-slate-400 mb-2 ml-2 tracking-widest">Senha Provisória</label>
                <input type="password" required placeholder="Defina a senha" className="w-full h-12 md:h-14 px-6 rounded-2xl border-2 border-slate-100 font-bold bg-slate-50 outline-none focus:border-blue-500 transition-all" value={formData.password} onChange={e => setFormData({...formData, password: e.target.value})} />
              </div>
              <div>
                <label className="block text-[10px] font-black uppercase text-slate-400 mb-2 ml-2 tracking-widest">Função Operacional</label>
                <select className="w-full h-12 md:h-14 px-6 rounded-2xl border-2 border-slate-100 font-bold bg-slate-50 outline-none focus:border-blue-500 transition-all" value={formData.role} onChange={e => setFormData({...formData, role: e.target.value as UserRole})}>
                  <option value={UserRole.GESTOR}>Gestor</option>
                  <option value={UserRole.ZELADOR}>Zelador</option>
                  <option value={UserRole.LIMPEZA}>Limpeza</option>
                </select>
              </div>
              <button type="submit" className="w-full h-14 md:h-16 bg-blue-600 text-white font-black rounded-2xl shadow-xl uppercase tracking-widest active:scale-95 transition-all mb-4 md:mb-0">Salvar Profissional</button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Users;
