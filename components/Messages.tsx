
import React, { useState, useMemo, useEffect } from 'react';
import { db } from '../services/db';
import { User, Message, UserRole, Log } from '../types';

interface MessagesProps {
  currentUser: User;
  selectedCondoId: string;
  notify: (msg: string, type?: 'success' | 'error') => void;
}

const Messages: React.FC<MessagesProps> = ({ currentUser, selectedCondoId, notify }) => {
  const [text, setText] = useState('');
  const [recipientId, setRecipientId] = useState('ALL');
  const [condoUsers, setCondoUsers] = useState<User[]>([]);
  const [messageList, setMessageList] = useState<Message[]>([]);

  useEffect(() => {
    const users = db.getUsers().filter(u => u.condoId === selectedCondoId && u.id !== currentUser.id);
    setCondoUsers(users);
    setMessageList(db.getMessages().filter(m => m.condoId === selectedCondoId));
  }, [selectedCondoId, currentUser.id]);

  const condo = db.getCondos().find(c => c.id === selectedCondoId);

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (!text.trim()) return;

    try {
      let recipientName = 'Todos do Condomínio';
      const effectiveRecipientId = (currentUser.role === UserRole.SINDICO || currentUser.role === UserRole.GESTOR) ? recipientId : 'ALL';

      if (effectiveRecipientId !== 'ALL') {
        const user = condoUsers.find(u => u.id === effectiveRecipientId);
        recipientName = user ? user.name : 'Colaborador';
      }

      const newMessage: Message = {
        id: Math.random().toString(36).substr(2, 9),
        senderId: currentUser.id,
        senderName: currentUser.name,
        recipientId: effectiveRecipientId === 'ALL' ? undefined : effectiveRecipientId,
        recipientName: recipientName,
        text,
        timestamp: new Date().toISOString(),
        condoId: selectedCondoId,
        broadcast: effectiveRecipientId === 'ALL'
      };

      db.saveMessage(newMessage);
      setText('');
      setMessageList(db.getMessages().filter(m => m.condoId === selectedCondoId));
      notify('Mensagem enviada para o mural!');
    } catch (err) {
      notify('Erro ao enviar mensagem.', 'error');
    }
  };

  const handleDeleteMessage = (msg: Message) => {
    if (window.confirm('Excluir esta mensagem do mural?')) {
      db.deleteMessage(msg.id);
      setMessageList(db.getMessages().filter(m => m.condoId === selectedCondoId));
      notify('Mensagem removida.');
    }
  };

  const canManage = currentUser.role === UserRole.SINDICO || currentUser.role === UserRole.GESTOR;

  return (
    <div className="space-y-8 animate-in fade-in duration-500 max-w-4xl mx-auto pb-10">
      <header>
        <h2 className="text-3xl font-black text-slate-900 tracking-tight">Mural de Mensagens</h2>
        <p className="text-slate-500 font-medium">Comunicação interna do <span className="text-blue-600 font-bold">{condo?.name}</span></p>
      </header>

      <div className="bg-white rounded-[40px] border border-slate-200 shadow-sm flex flex-col h-[65vh] overflow-hidden">
        <div className="flex-1 overflow-y-auto p-8 space-y-8 scrollbar-hide">
          {messageList.length > 0 ? messageList.map((m) => (
            <div key={m.id} className={`flex flex-col ${m.senderId === currentUser.id ? 'items-end' : 'items-start'}`}>
              <div className="flex items-center gap-2 mb-1 px-4">
                 <p className="text-[10px] font-black uppercase tracking-[0.1em] text-slate-400">{m.senderName}</p>
                 <span className="text-[10px] text-slate-300">•</span>
                 <span className="text-[9px] font-black uppercase text-slate-400">Para: {m.recipientName}</span>
                 {canManage && (
                   <button onClick={() => handleDeleteMessage(m)} className="ml-2 p-1 text-slate-300 hover:text-red-500 transition-colors">
                     <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>
                   </button>
                 )}
              </div>
              <div className="relative group max-w-[85%]">
                <div className={`p-6 rounded-[32px] shadow-sm border ${
                  m.senderId === currentUser.id 
                    ? 'bg-blue-600 text-white rounded-tr-none border-blue-500' 
                    : 'bg-slate-50 text-slate-900 rounded-tl-none border-slate-100'
                }`}>
                  <p className="font-bold leading-relaxed">{m.text}</p>
                </div>
              </div>
              <span className="text-[9px] text-slate-400 font-black uppercase mt-2 px-4">
                {new Date(m.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit' })}
              </span>
            </div>
          )) : (
            <div className="h-full flex flex-col items-center justify-center text-slate-300 gap-4">
              <div className="w-16 h-16 rounded-full bg-slate-50 flex items-center justify-center">
                <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.827-1.24L3 21l1.857-1.857C3.083 17.226 2 15.12 2 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"></path></svg>
              </div>
              <p className="font-black uppercase tracking-widest text-xs">Nenhuma mensagem neste mural</p>
            </div>
          )}
        </div>

        <div className="p-6 bg-slate-50 border-t border-slate-100 space-y-4">
          <div className="flex flex-col md:flex-row gap-4">
            {canManage && (
              <div className="w-full md:w-64">
                <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1.5 block ml-1">Destinatário</label>
                <select 
                  value={recipientId}
                  onChange={(e) => setRecipientId(e.target.value)}
                  className="w-full h-12 px-4 rounded-xl border-2 border-slate-200 focus:border-blue-500 outline-none font-bold text-slate-700 bg-white appearance-none text-sm cursor-pointer"
                >
                  <option value="ALL">📢 Todos do Condomínio</option>
                  <optgroup label="Colaboradores Locais">
                    {condoUsers.map(u => (
                      <option key={u.id} value={u.id}>👤 {u.name} ({u.role})</option>
                    ))}
                  </optgroup>
                </select>
              </div>
            )}
            <div className="flex-1 flex gap-3">
              <div className="flex-1">
                <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1.5 block ml-1">
                  {canManage ? 'Mensagem' : 'Enviar Mensagem Geral'}
                </label>
                <form onSubmit={handleSend} className="flex gap-3">
                  <input 
                    type="text" 
                    required
                    placeholder={canManage ? "Digite seu aviso ou instrução..." : "Escreva um aviso para o mural..."}
                    className="flex-1 h-12 px-6 rounded-xl border-2 border-slate-200 outline-none focus:border-blue-500 font-medium text-slate-700 bg-white shadow-inner"
                    value={text}
                    onChange={e => setText(e.target.value)}
                  />
                  <button 
                    type="submit" 
                    title="Enviar Mensagem"
                    className="bg-blue-600 text-white w-12 h-12 rounded-xl flex items-center justify-center shadow-lg shadow-blue-500/20 active:scale-90 transition-all hover:bg-blue-700"
                  >
                    <svg className="w-5 h-5 rotate-90" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"></path></svg>
                  </button>
                </form>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Messages;
