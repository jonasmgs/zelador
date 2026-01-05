
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
  const isOperational = currentUser.role === UserRole.ZELADOR || currentUser.role === UserRole.LIMPEZA || currentUser.role === UserRole.PORTEIRO;

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
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-500">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl md:text-3xl font-black text-slate-900 tracking-tight leading-none uppercase">
            {greeting}, <span className="text-blue-600">{currentUser.name.split(' ')[0]}</span>
          </h2>
          <div className="flex items-center gap-3 mt-1.5">
            <p className="text-slate-500 font-bold text-xs flex items-center gap-2 uppercase tracking-widest">
              <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse"></span>
              {activeCondo ? activeCondo.name : 'Unidade Pendente'}
            </p>
            <span className="text-slate-300">|</span>
            <p className="text-slate-400 font-black text-[10px] uppercase tracking-widest">{new Date().toLocaleDateString('pt-BR', { day: '2-digit', month: 'long' })}</p>
          </div>
        </div>
        
        {isOperational && notifPermission !== 'granted' && (
          <button 
            onClick={handleRequestPermission}
            className="flex items-center gap-2 bg-slate-900 text-white px-4 py-2 rounded text-[9px] font-black uppercase tracking-widest hover:bg-slate-800 transition-all shadow-lg"
          >
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"></path></svg>
            Ativar Notificações
          </button>
        )}
      </header>

      <section className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Aguardando" val={stats.pending} icon="Tasks" color="blue" onClick={() => onNavigate('tasks')} />
        <StatCard label="Execução" val={stats.inProgress} icon="Schedule" color="amber" onClick={() => onNavigate('tasks')} />
        <StatCard label="Orçamentos" val={stats.pendingBudgets} icon="Dashboard" color="purple" onClick={() => onNavigate('procurement')} />
        <StatCard label="Concluídas" val={stats.completedToday} icon="History" color="emerald" onClick={() => onNavigate('reports')} />
      </section>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-8 space-y-6">
          {isOperational && nextTask && (
            <div className="bg-slate-900 rounded-lg p-6 text-white shadow-xl relative overflow-hidden border-l-4 border-blue-500">
               <p className="text-blue-400 text-[9px] font-black uppercase tracking-widest mb-3">Prioridade do Dia</p>
               <h3 className="text-xl font-black mb-1 leading-tight uppercase tracking-tight">{nextTask.title}</h3>
               <p className="text-slate-400 font-medium mb-6 text-xs leading-relaxed">{nextTask.description}</p>
               <button 
                onClick={() => onNavigate('tasks')}
                className="bg-blue-600 text-white px-6 py-2.5 rounded text-[10px] font-black uppercase tracking-widest hover:bg-blue-700 transition-all active:scale-95"
               >
                 Abrir Checklist
               </button>
            </div>
          )}

          <div className="space-y-4">
            <div className="flex items-center justify-between border-b border-slate-200 pb-2">
              <h3 className="text-sm font-black text-slate-900 uppercase tracking-widest">Cronograma de Hoje</h3>
              <button onClick={() => onNavigate('tasks')} className="text-[9px] font-black text-blue-600 uppercase tracking-widest hover:underline">Ver tudo</button>
            </div>
            <div className="grid grid-cols-1 gap-2">
              {filteredTasks.filter(t => t.status !== TaskStatus.COMPLETED).slice(0, 5).map(task => (
                <div key={task.id} className="bg-white p-4 rounded border border-slate-200 flex items-center gap-4 hover:border-slate-400 transition-all cursor-pointer group" onClick={() => onNavigate('tasks')}>
                  <div className="w-9 h-9 rounded bg-slate-50 flex items-center justify-center text-slate-400 shrink-0 border border-slate-100 group-hover:bg-blue-50 group-hover:text-blue-600 transition-colors">
                    <Icons.Tasks />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="font-bold text-slate-800 text-xs truncate uppercase tracking-tight group-hover:text-blue-600 transition-colors">{task.title}</h4>
                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-tighter mt-0.5">{task.assignedUserName}</p>
                  </div>
                  <div className="text-[9px] font-black uppercase bg-blue-50 text-blue-600 px-2 py-1 rounded">
                    {task.category}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="lg:col-span-4 space-y-4">
          <section className="bg-white p-6 rounded-lg border border-slate-200 shadow-sm">
            <h3 className="text-xs font-black uppercase tracking-widest text-slate-900 mb-4 border-b pb-2">Mural Interno</h3>
            <div className="space-y-4">
              <div className="border-l-2 border-blue-500 pl-4 py-1">
                <p className="text-xs font-bold text-slate-700 italic">"Manutenção das bombas d'água agendada."</p>
                <p className="text-[9px] font-black uppercase text-slate-400 mt-1">Admin • Hoje</p>
              </div>
              <div className="border-l-2 border-slate-200 pl-4 py-1">
                <p className="text-xs font-bold text-slate-500 italic">"Limpeza do hall social concluída."</p>
                <p className="text-[9px] font-black uppercase text-slate-400 mt-1">Operacional • Ontem</p>
              </div>
            </div>
            <button 
              onClick={() => onNavigate('messages')}
              className="w-full mt-6 py-3 bg-slate-50 border border-slate-200 text-slate-600 rounded text-[9px] font-black uppercase tracking-widest hover:bg-slate-100 transition-all"
            >
              Mural Completo
            </button>
          </section>

          <div className="bg-slate-900 text-white p-6 rounded-lg shadow-sm border-t-2 border-blue-500">
             <p className="text-[9px] font-black uppercase text-slate-400 tracking-widest mb-2">Clima Operacional</p>
             <div className="flex items-end justify-between">
                <div>
                   <p className="text-3xl font-black leading-none tracking-tighter">24°C</p>
                   <p className="text-[10px] text-blue-400 font-black uppercase mt-1">Céu Limpo</p>
                </div>
                <div className="text-blue-500 opacity-50"><Icons.Schedule /></div>
             </div>
          </div>
        </div>
      </div>
    </div>
  );
};

const StatCard = ({ label, val, color, icon, onClick }: { label: string, val: number, color: string, icon: keyof typeof Icons, onClick?: () => void }) => {
  const IconComp = Icons[icon];
  
  const colors = {
    blue: 'text-blue-600 border-blue-200',
    amber: 'text-amber-600 border-amber-200',
    purple: 'text-purple-600 border-purple-200',
    emerald: 'text-emerald-600 border-emerald-200',
  }[color as 'blue' | 'amber' | 'purple' | 'emerald'] || 'text-slate-600 border-slate-200';

  return (
    <button 
      onClick={onClick}
      className="bg-white p-5 rounded-lg border border-slate-200 group hover:border-slate-400 transition-all text-left w-full hover:scale-[1.02] active:scale-95 shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50"
    >
      <div className={`w-8 h-8 rounded mb-3 flex items-center justify-center transition-transform group-hover:scale-110 ${colors.split(' ')[0]}`}>
        <IconComp />
      </div>
      <p className="text-3xl font-black text-slate-900 tracking-tighter leading-none">{val}</p>
      <p className="text-[9px] text-slate-400 font-black uppercase tracking-widest mt-2">{label}</p>
    </button>
  );
};

export default Dashboard;
