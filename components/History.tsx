
import React, { useMemo, useState, useEffect } from 'react';
import { db } from '../services/db';
import { summarizeActivities } from '../services/geminiService';
import { TaskStatus, UserRole, User, Task, Log } from '../types';
import { Icons } from '../constants';

interface HistoryProps {
  selectedCondoId: string;
  currentUser: User;
  notify: (msg: string, type?: 'success' | 'error') => void;
}

const History: React.FC<HistoryProps> = ({ selectedCondoId, currentUser, notify }) => {
  const [view, setView] = useState<'tasks' | 'logs' | 'reports'>('tasks');
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [selectedTaskPhotos, setSelectedTaskPhotos] = useState<string[] | null>(null);

  // States for IA Reports
  const [reportText, setReportText] = useState<string | null>(null);
  const [loadingReport, setLoadingReport] = useState(false);
  const [startDate, setStartDate] = useState<string>(new Date(new Date().setDate(new Date().getDate() - 7)).toISOString().split('T')[0]);
  const [endDate, setEndDate] = useState<string>(new Date().toISOString().split('T')[0]);

  const taskHistory = useMemo(() => 
    db.getTasks().filter(t => t.condoId === selectedCondoId && t.status === TaskStatus.COMPLETED)
    .sort((a, b) => new Date(b.completedAt || '').getTime() - new Date(a.completedAt || '').getTime()),
  [selectedCondoId, refreshTrigger]);

  const logs = useMemo(() => 
    db.getLogs().filter(l => l.condoId === selectedCondoId),
  [selectedCondoId, refreshTrigger]);

  const condoName = db.getCondos().find(c => c.id === selectedCondoId)?.name;

  const handleReopenTask = (task: Task) => {
    if (window.confirm(`Reabrir a tarefa "${task.title}"? Ela será reagendada para hoje.`)) {
      try {
        const updatedTask: Task = { 
          ...task, 
          status: TaskStatus.PENDING, 
          completedAt: undefined,
          scheduledFor: new Date().toISOString() // Atualiza a data para hoje
        };
        db.saveTask(updatedTask);
        db.saveLog({
          id: Math.random().toString(36).substr(2, 9),
          userId: currentUser.id,
          userName: currentUser.name,
          action: 'REOPEN',
          module: 'TASK',
          targetName: task.title,
          timestamp: new Date().toISOString(),
          condoId: selectedCondoId
        });
        setRefreshTrigger(prev => prev + 1);
        notify('Tarefa reaberta e reagendada para hoje.', 'success');
      } catch (err) {
        notify('Erro ao reabrir.', 'error');
      }
    }
  };

  const handleGenerateReport = async () => {
    if (!startDate || !endDate) return;
    setLoadingReport(true);
    setReportText(null);
    try {
      const allTasks = db.getTasks().filter(t => t.condoId === selectedCondoId);
      const start = new Date(startDate);
      start.setHours(0, 0, 0, 0);
      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999);
      const filteredTasks = allTasks.filter(t => {
        const taskDate = new Date(t.scheduledFor);
        return taskDate >= start && taskDate <= end;
      });
      const periodDesc = `${new Date(startDate).toLocaleDateString()} até ${new Date(endDate).toLocaleDateString()}`;
      const summary = await summarizeActivities(filteredTasks, periodDesc);
      setReportText(summary || "Não foi possível gerar o relatório.");
    } catch (e) {
      setReportText("Erro ao conectar com a IA.");
    }
    setLoadingReport(false);
  };

  const canManage = [UserRole.SINDICO, UserRole.GESTOR].includes(currentUser.role);

  return (
    <div className="space-y-6 md:space-y-8 animate-in fade-in duration-500 pb-20">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl md:text-3xl font-black text-slate-900 tracking-tight">Audit & Histórico</h2>
          <p className="text-sm text-slate-500 font-medium">Relatórios do <span className="text-blue-600 font-bold">{condoName}</span></p>
        </div>
        <div className="flex bg-slate-100 p-1 rounded-2xl overflow-x-auto scrollbar-hide">
          <button onClick={() => setView('tasks')} className={`px-4 md:px-6 py-2 rounded-xl text-[9px] md:text-[10px] font-black uppercase tracking-widest transition-all ${view === 'tasks' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-400'}`}>Atividades</button>
          {canManage && <button onClick={() => setView('logs')} className={`px-4 md:px-6 py-2 rounded-xl text-[9px] md:text-[10px] font-black uppercase tracking-widest transition-all ${view === 'logs' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-400'}`}>Logs</button>}
          {canManage && <button onClick={() => setView('reports')} className={`px-4 md:px-6 py-2 rounded-xl text-[9px] md:text-[10px] font-black uppercase tracking-widest transition-all ${view === 'reports' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-400'}`}>IA Report</button>}
        </div>
      </header>

      {view === 'tasks' && (
        <div className="bg-white rounded-[32px] md:rounded-[40px] border border-slate-200 overflow-hidden shadow-sm">
          {/* Mobile View */}
          <div className="md:hidden divide-y divide-slate-100">
            {taskHistory.map(task => (
              <div key={task.id} className="p-5 space-y-3">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="font-bold text-slate-900 text-sm">{task.title}</p>
                    <span className="text-[9px] font-black uppercase text-blue-600 tracking-tighter">{task.category}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    {task.photos && task.photos.length > 0 && (
                      <button onClick={() => setSelectedTaskPhotos(task.photos || [])} className="bg-blue-50 text-blue-600 px-2 py-1 rounded-lg text-[8px] font-black uppercase">FOTOS ({task.photos.length})</button>
                    )}
                    {canManage && (
                      <button onClick={() => handleReopenTask(task)} className="p-2 text-amber-600 bg-amber-50 rounded-lg"><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"></path></svg></button>
                    )}
                  </div>
                </div>
                <div className="flex items-center justify-between text-[8px] font-black uppercase tracking-widest text-slate-400 bg-slate-50 p-3 rounded-xl">
                  <span>{task.assignedUserName}</span>
                  <span>{new Date(task.completedAt || '').toLocaleDateString()}</span>
                </div>
              </div>
            ))}
          </div>

          {/* Desktop View */}
          <table className="hidden md:table w-full text-left">
            <thead className="bg-slate-50 border-b">
              <tr>
                <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Tarefa</th>
                <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Responsável</th>
                <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {taskHistory.map(task => (
                <tr key={task.id} className="hover:bg-slate-50/30 transition-colors">
                  <td className="px-8 py-5">
                    <p className="font-bold text-slate-900">{task.title}</p>
                    <p className="text-[10px] font-black uppercase text-blue-600">{task.category}</p>
                  </td>
                  <td className="px-8 py-5 text-sm font-medium text-slate-600">{task.assignedUserName}</td>
                  <td className="px-8 py-5 text-right flex justify-end gap-3">
                    {task.photos && task.photos.length > 0 && <button onClick={() => setSelectedTaskPhotos(task.photos || [])} className="text-blue-600 font-black text-[9px] uppercase hover:underline">Ver Evidências</button>}
                    {canManage && <button onClick={() => handleReopenTask(task)} className="p-2 text-amber-600 hover:bg-amber-50 rounded-lg"><Icons.History /></button>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {taskHistory.length === 0 && <div className="p-10 text-center text-slate-300 font-black uppercase text-xs">Sem registros.</div>}
        </div>
      )}

      {view === 'logs' && (
        <div className="bg-white rounded-[32px] md:rounded-[40px] border border-slate-200 overflow-hidden shadow-sm">
          <div className="divide-y divide-slate-100">
            {logs.map(log => (
              <div key={log.id} className="p-4 md:p-6 flex items-center justify-between hover:bg-slate-50 transition-colors">
                <div className="flex items-center gap-4">
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-black text-[9px] ${log.action === 'CREATE' ? 'bg-green-50 text-green-600' : log.action === 'DELETE' ? 'bg-red-50 text-red-600' : 'bg-blue-50 text-blue-600'}`}>
                    {log.module.charAt(0)}
                  </div>
                  <div>
                    <p className="text-xs md:text-sm font-bold text-slate-900 leading-tight">{log.userName} <span className="text-slate-400 font-medium">realizou</span> {log.action}</p>
                    <p className="text-[9px] font-black uppercase text-blue-600 tracking-tighter mt-0.5">{log.targetName}</p>
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-[8px] font-black text-slate-400 uppercase">{new Date(log.timestamp).toLocaleDateString()}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {view === 'reports' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 animate-in slide-in-from-bottom-4 duration-500">
          <div className="lg:col-span-4 bg-white p-6 md:p-8 rounded-[32px] md:rounded-[40px] border border-slate-200 h-fit space-y-6">
            <h3 className="text-xl font-black text-slate-900 tracking-tight">IA Reports</h3>
            <div className="space-y-4">
              <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="w-full h-12 px-4 rounded-xl border-2 border-slate-100 bg-slate-50 font-bold text-xs" />
              <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="w-full h-12 px-4 rounded-xl border-2 border-slate-100 bg-slate-50 font-bold text-xs" />
              <button onClick={handleGenerateReport} disabled={loadingReport} className="w-full h-14 bg-slate-900 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-xl disabled:opacity-50">
                {loadingReport ? 'Analisando...' : 'Gerar Relatório IA'}
              </button>
            </div>
          </div>
          <div className="lg:col-span-8">
            {reportText ? (
              <div className="bg-slate-900 text-white p-6 md:p-10 rounded-[32px] md:rounded-[40px] shadow-2xl h-full prose prose-invert max-w-none">
                <div className="text-slate-300 text-sm md:text-base leading-relaxed whitespace-pre-wrap">{reportText}</div>
              </div>
            ) : (
              <div className="h-full min-h-[300px] border-2 border-dashed border-slate-200 rounded-[32px] flex items-center justify-center text-slate-400 font-black uppercase text-[10px] p-10 text-center">Aguardando geração de relatório.</div>
            )}
          </div>
        </div>
      )}

      {selectedTaskPhotos && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-slate-900/95 backdrop-blur-xl">
          <div className="w-full max-w-4xl space-y-6">
            <div className="flex justify-between items-center text-white">
              <h3 className="text-xl font-black uppercase tracking-widest">Evidências</h3>
              <button onClick={() => setSelectedTaskPhotos(null)} className="p-3 bg-white/10 rounded-full hover:bg-white/20 transition-all"><svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M6 18L18 6M6 6l12 12"></path></svg></button>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3 md:gap-4 overflow-y-auto max-h-[70vh] p-2 scrollbar-hide">
              {selectedTaskPhotos.map((p, i) => <img key={i} src={p} className="w-full aspect-square object-cover rounded-2xl border border-white/10" />)}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default History;
