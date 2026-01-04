
import React, { useState, useEffect, useMemo } from 'react';
import { UserRole, User, Condo, TaskStatus, Budget } from '../types';
import { Icons } from '../constants';
import { db } from '../services/db';

interface DashboardProps {
  currentUser: User;
  onNavigate: (tab: string) => void;
  selectedCondoId: string;
}

const Dashboard: React.FC<DashboardProps> = ({ currentUser, onNavigate, selectedCondoId }) => {
  const [activeCondo, setActiveCondo] = useState<Condo | null>(null);
  const [notifPermission, setNotifPermission] = useState<NotificationPermission>('default');
  
  const isManagement = currentUser.role === UserRole.SINDICO || currentUser.role === UserRole.GESTOR;
  const isOperational = currentUser.role === UserRole.ZELADOR || currentUser.role === UserRole.LIMPEZA;

  useEffect(() => {
    const currentCondo = db.getCondos().find(c => c.id === selectedCondoId);
    setActiveCondo(currentCondo || null);
    if ('Notification' in window) {
      setNotifPermission(Notification.permission);
    }
  }, [selectedCondoId]);

  const handleRequestPermission = async () => {
    if ('Notification' in window) {
      const res = await Notification.requestPermission();
      setNotifPermission(res);
    }
  };

  const filteredTasks = useMemo(() => db.getTasksByCondo(selectedCondoId), [selectedCondoId]);
  const budgets = useMemo(() => db.getBudgetsByCondo(selectedCondoId), [selectedCondoId]);

  const stats = useMemo(() => {
    const today = new Date().toDateString();
    return {
      pending: filteredTasks.filter(t => t.status === TaskStatus.PENDING).length,
      completedToday: filteredTasks.filter(t => t.status === TaskStatus.COMPLETED && new Date(t.completedAt || '').toDateString() === today).length,
      inProgress: filteredTasks.filter(t => t.status === TaskStatus.IN_PROGRESS).length,
      pendingBudgets: budgets.filter(b => b.status === 'PENDING').length,
      myTasksToday: filteredTasks.filter(t => t.assignedTo === currentUser.id && t.status !== TaskStatus.COMPLETED).length
    };
  }, [filteredTasks, budgets, currentUser.id]);

  const greeting = useMemo(() => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Bom dia';
    if (hour < 18) return 'Boa tarde';
    return 'Boa noite';
  }, []);

  const nextTask = useMemo(() => {
    return filteredTasks
      .filter(t => t.assignedTo === currentUser.id && t.status !== TaskStatus.COMPLETED)
      .sort((a, b) => new Date(a.scheduledFor).getTime() - new Date(b.scheduledFor).getTime())[0];
  }, [filteredTasks, currentUser.id]);

  return (
    <div className="space-y-6 md:space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <header className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h2 className="text-3xl md:text-5xl font-black text-slate-900 tracking-tight leading-none">
            {greeting}, <span className="text-blue-600">{currentUser.name.split(' ')[0]}</span>! 👋
          </h2>
          <div className="flex items-center gap-3 mt-2">
            <p className="text-slate-500 font-bold flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
              {activeCondo ? activeCondo.name : 'Selecione uma unidade'}
            </p>
            <span className="text-slate-300">•</span>
            <p className="text-slate-400 font-medium">{new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long' })}</p>
          </div>
        </div>
        
        {isOperational && notifPermission !== 'granted' && (
          <button 
            onClick={handleRequestPermission}
            className="flex items-center gap-2 bg-amber-50 text-amber-700 px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest border border-amber-100 hover:bg-amber-100 transition-all"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"></path></svg>
            Ativar Alertas Push
          </button>
        )}
      </header>

      <section className="grid grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
        {isManagement ? (
          <>
            <StatCard label="Pendências" val={stats.pending} icon="Tasks" color="blue" />
            <StatCard label="Em Execução" val={stats.inProgress} icon="Schedule" color="amber" />
            <StatCard label="Orçamentos" val={stats.pendingBudgets} icon="Dashboard" color="purple" />
            <StatCard label="Concluídas" val={stats.completedToday} icon="History" color="emerald" />
          </>
        ) : (
          <>
            <StatCard label="Minhas Tarefas" val={stats.myTasksToday} icon="Tasks" color="blue" />
            <StatCard label="Em Curso" val={stats.inProgress} icon="Schedule" color="amber" />
            <StatCard label="Feito Hoje" val={stats.completedToday} icon="History" color="emerald" />
            <div className="bg-slate-900 p-5 md:p-8 rounded-[32px] flex flex-col justify-center border border-slate-800">
               <p className="text-white/50 text-[10px] font-black uppercase tracking-widest">Alertas</p>
               <p className="text-white font-black text-lg md:text-xl mt-1 flex items-center gap-2">
                 {notifPermission === 'granted' ? '✅ Ativos' : '⚠️ Inativos'}
               </p>
            </div>
          </>
        )}
      </section>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 md:gap-8">
        <div className="lg:col-span-8 space-y-6">
          {isOperational && nextTask && (
            <div className="bg-blue-600 rounded-[40px] p-8 text-white shadow-2xl shadow-blue-500/20 group relative overflow-hidden">
               <div className="absolute top-0 right-0 p-8 opacity-10 group-hover:scale-110 transition-transform">
                 <Icons.Tasks />
               </div>
               <p className="text-blue-100 text-[10px] font-black uppercase tracking-[0.2em] mb-4">Ação Prioritária</p>
               <h3 className="text-2xl md:text-3xl font-black mb-2 leading-tight">Sua próxima tarefa é: <br/> {nextTask.title}</h3>
               <p className="text-blue-100/80 font-medium mb-6 text-sm max-w-md">{nextTask.description}</p>
               <button 
                onClick={() => onNavigate('tasks')}
                className="bg-white text-blue-600 px-8 py-4 rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl active:scale-95 transition-all"
               >
                 Abrir Checklist Agora
               </button>
            </div>
          )}

          {isManagement && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
               <button onClick={() => onNavigate('procurement')} className="bg-white p-6 rounded-[32px] border border-slate-200 flex items-center gap-5 hover:border-blue-500 transition-all text-left">
                  <div className="w-14 h-14 rounded-2xl bg-purple-50 text-purple-600 flex items-center justify-center shrink-0">
                    <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                  </div>
                  <div>
                    <h4 className="font-black text-slate-900 text-lg">Suprimentos</h4>
                    <p className="text-xs text-slate-400 font-bold uppercase tracking-tight">{stats.pendingBudgets} orçamentos esperando</p>
                  </div>
               </button>
               <button onClick={() => onNavigate('history')} className="bg-white p-6 rounded-[32px] border border-slate-200 flex items-center gap-5 hover:border-blue-500 transition-all text-left">
                  <div className="w-14 h-14 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
                    <Icons.History />
                  </div>
                  <div>
                    <h4 className="font-black text-slate-900 text-lg">Auditoria</h4>
                    <p className="text-xs text-slate-400 font-bold uppercase tracking-tight">Verificar logs de hoje</p>
                  </div>
               </button>
            </div>
          )}

          <div className="space-y-4 pt-4">
            <div className="flex items-center justify-between px-2">
              <h3 className="text-xl font-black text-slate-900 tracking-tight">Tarefas do Dia</h3>
              <button onClick={() => onNavigate('tasks')} className="text-[10px] font-black text-blue-600 uppercase tracking-widest hover:underline">Ver todas</button>
            </div>
            <div className="space-y-3">
              {filteredTasks.filter(t => t.status !== TaskStatus.COMPLETED).slice(0, 4).map(task => (
                <div key={task.id} className="bg-white p-6 rounded-[28px] border border-slate-200 flex items-center gap-4 hover:shadow-lg transition-all">
                  <div className="w-12 h-12 rounded-xl bg-slate-50 flex items-center justify-center text-slate-400 shrink-0">
                    <Icons.Tasks />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="font-bold text-slate-900 text-sm truncate">{task.title}</h4>
                    <div className="flex items-center gap-3 mt-1">
                       <span className="text-[9px] font-black text-blue-600 uppercase bg-blue-50 px-2 py-0.5 rounded-md">{task.category}</span>
                       <span className="text-[9px] font-black text-slate-400 uppercase">{task.assignedUserName.split(' ')[0]}</span>
                    </div>
                  </div>
                  <div className="text-slate-300">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M9 5l7 7-7 7" /></svg>
                  </div>
                </div>
              ))}
              {filteredTasks.length === 0 && (
                <div className="p-10 bg-slate-50 border-2 border-dashed border-slate-200 rounded-[32px] text-center">
                  <p className="text-slate-400 font-black uppercase tracking-widest text-[10px]">Nenhuma tarefa ativa no momento.</p>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="lg:col-span-4 space-y-6">
          <section className="bg-slate-900 p-8 rounded-[40px] shadow-xl text-white border border-slate-800">
            <div className="flex items-center justify-between mb-8">
              <h3 className="text-xl font-black tracking-tight">Mural Interno</h3>
              <button onClick={() => onNavigate('messages')} className="p-2 bg-white/10 rounded-xl hover:bg-white/20 transition-all">
                <Icons.Messages />
              </button>
            </div>
            <div className="space-y-6">
              <div className="relative pl-6 border-l-2 border-blue-500">
                <p className="text-sm font-medium text-slate-300 leading-relaxed italic">"Atenção equipe: Manutenção programada da bomba d'água amanhã às 08h."</p>
                <p className="text-[10px] font-black uppercase text-blue-400 mt-2">Sindico • Hoje</p>
              </div>
              <div className="relative pl-6 border-l-2 border-slate-700">
                <p className="text-sm font-medium text-slate-400 leading-relaxed italic">"Limpeza do salão de festas concluída com sucesso."</p>
                <p className="text-[10px] font-black uppercase text-slate-500 mt-2">Equipe Limpeza • Ontem</p>
              </div>
            </div>
            <button 
              onClick={() => onNavigate('messages')}
              className="w-full mt-8 py-4 bg-white/10 hover:bg-white/20 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all"
            >
              Ver Todas as Mensagens
            </button>
          </section>

          <div className="bg-white p-8 rounded-[40px] border border-slate-200 shadow-sm">
             <h4 className="text-sm font-black text-slate-900 uppercase tracking-widest mb-4">Clima e Operação</h4>
             <div className="flex items-center justify-between">
                <div>
                   <p className="text-3xl font-black text-slate-900">24°C</p>
                   <p className="text-xs text-slate-500 font-bold">Céu Limpo</p>
                </div>
                <div className="bg-amber-50 text-amber-600 p-3 rounded-2xl">
                   <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 3v1m0 16v1m9-9h-1M4 9h-1m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z"></path></svg>
                </div>
             </div>
             <p className="text-[10px] text-slate-400 font-medium mt-4 leading-relaxed">Condições ideais para manutenção externa e pintura hoje.</p>
          </div>
        </div>
      </div>
    </div>
  );
};

const StatCard = ({ label, val, color, icon }: { label: string, val: number, color: string, icon: keyof typeof Icons }) => {
  const IconComp = Icons[icon];
  
  const colors = {
    blue: 'text-blue-600 bg-blue-50 border-blue-100',
    amber: 'text-amber-600 bg-amber-50 border-amber-100',
    purple: 'text-purple-600 bg-purple-50 border-purple-100',
    emerald: 'text-emerald-600 bg-emerald-50 border-emerald-100',
  }[color as 'blue' | 'amber' | 'purple' | 'emerald'] || 'text-slate-600 bg-slate-50 border-slate-100';

  return (
    <div className="bg-white p-6 md:p-8 rounded-[32px] border border-slate-200 shadow-sm group hover:border-blue-300 transition-all">
      <div className={`w-10 h-10 md:w-12 md:h-12 rounded-2xl flex items-center justify-center mb-4 transition-transform group-hover:scale-110 ${colors.split(' ')[1]} ${colors.split(' ')[0]}`}>
        <IconComp />
      </div>
      <p className="text-3xl md:text-5xl font-black text-slate-900 tracking-tighter leading-none">{val}</p>
      <p className="text-[9px] md:text-[10px] text-slate-400 font-black uppercase tracking-[0.15em] mt-2 whitespace-nowrap">{label}</p>
    </div>
  );
};

export default Dashboard;
