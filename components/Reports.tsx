
import React, { useState, useMemo, useRef, useEffect } from 'react';
import { db } from '../services/db';
import { summarizeActivities } from '../services/geminiService';
import { Icons } from '../constants';
import { TaskStatus, User, Task, Incident, IncidentStatus, UserRole } from '../types';

interface ReportsProps {
  selectedCondoId: string;
  notify: (msg: string, type?: 'success' | 'error') => void;
  currentUser: User;
}

const Reports: React.FC<ReportsProps> = ({ selectedCondoId, notify, currentUser }) => {
  const [activeTab, setActiveTab] = useState<'ai' | 'incidents' | 'history' | 'audit'>('incidents');
  const [report, setReport] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [startDate, setStartDate] = useState<string>(new Date(new Date().setDate(new Date().getDate() - 7)).toISOString().split('T')[0]);
  const [endDate, setEndDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [customPrompt, setCustomPrompt] = useState('');
  const [selectedTaskPhotos, setSelectedTaskPhotos] = useState<string[] | null>(null);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  
  // Incident States
  const [showIncidentModal, setShowIncidentModal] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const incidentPhotoRef = useRef<HTMLInputElement>(null);
  const [incidentForm, setIncidentForm] = useState({
    title: '',
    description: '',
    photos: [] as string[]
  });

  const condo = db.getCondos().find(c => c.id === selectedCondoId);

  // Permissões
  const isManagement = currentUser.role === UserRole.SINDICO || currentUser.role === UserRole.GESTOR;
  const canAddIncident = [UserRole.SINDICO, UserRole.GESTOR, UserRole.ZELADOR].includes(currentUser.role);

  // Ajustar aba inicial baseada na permissão
  useEffect(() => {
    if (!isManagement) {
      setActiveTab('incidents');
    }
  }, [currentUser.role, isManagement]);

  // Memoized Data
  const taskHistory = useMemo(() => 
    db.getTasks().filter(t => t.condoId === selectedCondoId && t.status === TaskStatus.COMPLETED)
    .sort((a, b) => new Date(b.completedAt || '').getTime() - new Date(a.completedAt || '').getTime()),
  [selectedCondoId, refreshTrigger]);

  const incidents = useMemo(() => 
    db.getIncidentsByCondo(selectedCondoId)
    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()),
  [selectedCondoId, refreshTrigger]);

  const logs = useMemo(() => 
    db.getLogs().filter(l => l.condoId === selectedCondoId),
  [selectedCondoId, refreshTrigger]);

  const handleGenerate = async () => {
    if (!startDate || !endDate) return;
    
    setLoading(true);
    setReport(null);
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

      const filteredIncidents = incidents.filter(i => {
        const incDate = new Date(i.timestamp);
        return incDate >= start && incDate <= end;
      });

      const periodDesc = `${new Date(startDate).toLocaleDateString()} até ${new Date(endDate).toLocaleDateString()}`;
      const summary = await summarizeActivities(filteredTasks, periodDesc, customPrompt, filteredIncidents);
      setReport(summary || "Não foi possível gerar o relatório no momento.");
    } catch (e) {
      console.error(e);
      setReport("Erro ao conectar com a IA. Verifique sua chave de API.");
    }
    setLoading(false);
  };

  const handleSaveIncident = (e: React.FormEvent) => {
    e.preventDefault();
    if (!canAddIncident) return;

    const newIncident: Incident = {
      id: Math.random().toString(36).substr(2, 9),
      condoId: selectedCondoId,
      userId: currentUser.id,
      userName: currentUser.name,
      title: incidentForm.title,
      description: incidentForm.description,
      timestamp: new Date().toISOString(),
      status: IncidentStatus.OPEN,
      photos: incidentForm.photos
    };

    db.saveIncident(newIncident);
    db.saveLog({
      id: Math.random().toString(36).substr(2, 9),
      userId: currentUser.id,
      userName: currentUser.name,
      action: 'CREATE',
      module: 'INCIDENT',
      targetName: newIncident.title,
      timestamp: new Date().toISOString(),
      condoId: selectedCondoId
    });

    setIncidentForm({ title: '', description: '', photos: [] });
    setShowIncidentModal(false);
    setRefreshTrigger(prev => prev + 1);
    notify('Ocorrência registrada no livro digital.');
  };

  const handleToggleIncidentStatus = (incident: Incident) => {
    if (!canAddIncident) return;
    const newStatus = incident.status === IncidentStatus.OPEN ? IncidentStatus.RESOLVED : IncidentStatus.OPEN;
    db.saveIncident({ ...incident, status: newStatus });
    db.saveLog({
      id: Math.random().toString(36).substr(2, 9),
      userId: currentUser.id,
      userName: currentUser.name,
      action: 'UPDATE_STATUS',
      module: 'INCIDENT',
      targetName: incident.title,
      timestamp: new Date().toISOString(),
      condoId: selectedCondoId
    });
    setRefreshTrigger(prev => prev + 1);
    notify(`Ocorrência marcada como ${newStatus === IncidentStatus.RESOLVED ? 'Resolvida' : 'Em Aberto'}.`);
  };

  const handleDeleteIncident = (incident: Incident) => {
    if (!isManagement) return;
    if (window.confirm(`Excluir permanentemente a ocorrência "${incident.title}"? Esta ação não pode ser desfeita.`)) {
      db.deleteIncident(incident.id);
      db.saveLog({
        id: Math.random().toString(36).substr(2, 9),
        userId: currentUser.id,
        userName: currentUser.name,
        action: 'DELETE',
        module: 'INCIDENT',
        targetName: incident.title,
        timestamp: new Date().toISOString(),
        condoId: selectedCondoId
      });
      setRefreshTrigger(prev => prev + 1);
      notify('Ocorrência removida com sucesso.');
    }
  };

  const handleReopenTask = (task: Task) => {
    if (!isManagement) return;
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

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsUploading(true);
    const reader = new FileReader();
    reader.onloadend = () => {
      setIncidentForm(prev => ({ ...prev, photos: [...prev.photos, reader.result as string] }));
      setIsUploading(false);
    };
    reader.readAsDataURL(file);
  };

  const handlePrint = () => window.print();

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-20">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-6 no-print">
        <div>
          <h2 className="text-3xl font-black text-slate-900 tracking-tight">Relatórios & Ocorrências</h2>
          <p className="text-slate-500 font-medium">Hub de inteligência e controle para <span className="text-blue-600 font-bold">{condo?.name}</span></p>
        </div>
        <div className="flex bg-slate-100 p-1.5 rounded-2xl shrink-0 overflow-x-auto scrollbar-hide">
          {[
            { id: 'incidents', label: 'Ocorrências', visible: true },
            { id: 'ai', label: 'IA Executive', visible: isManagement },
            { id: 'history', label: 'Histórico', visible: isManagement },
            { id: 'audit', label: 'Logs Audit', visible: isManagement }
          ].filter(t => t.visible).map(tab => (
            <button 
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all shrink-0 ${activeTab === tab.id ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </header>

      {activeTab === 'ai' && isManagement && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 animate-in slide-in-from-left-4 duration-500">
          <div className="lg:col-span-5 bg-white p-8 rounded-[40px] border border-slate-200 shadow-sm space-y-6 h-fit no-print">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 bg-blue-600 text-white rounded-2xl flex items-center justify-center shadow-xl shadow-blue-500/20">
                <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z"></path></svg>
              </div>
              <div>
                <h3 className="text-2xl font-black text-slate-900 leading-tight">Geração IA</h3>
                <p className="text-xs text-slate-400 font-black uppercase tracking-widest mt-1">Análise estratégica unificada</p>
              </div>
            </div>

            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Início</label>
                  <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="w-full h-12 px-4 rounded-xl border-2 border-slate-100 bg-slate-50 font-bold text-sm outline-none focus:border-blue-500" />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Fim</label>
                  <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="w-full h-12 px-4 rounded-xl border-2 border-slate-100 bg-slate-50 font-bold text-sm outline-none focus:border-blue-500" />
                </div>
              </div>
              
              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Foco da Análise (Opcional)</label>
                <textarea 
                  placeholder="Instrua a IA sobre o que focar..."
                  className="w-full p-5 rounded-2xl border-2 border-slate-100 bg-slate-50 font-medium text-sm outline-none focus:border-blue-500 min-h-[120px] resize-none"
                  value={customPrompt}
                  onChange={(e) => setCustomPrompt(e.target.value)}
                />
              </div>
            </div>

            <button onClick={handleGenerate} disabled={loading} className="w-full bg-slate-900 text-white h-16 rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl active:scale-95 transition-all disabled:opacity-50 flex items-center justify-center gap-3">
              {loading ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div> : 'Analisar Tudo'}
            </button>
          </div>

          <div className="lg:col-span-7">
            {report ? (
              <div className="bg-white p-12 rounded-[40px] shadow-2xl border border-slate-100 report-content">
                <div className="flex items-center justify-between mb-8 no-print">
                  <span className="bg-blue-600 px-4 py-1.5 rounded-full text-[10px] font-black text-white uppercase tracking-widest">Powered by ZeladorCheck IA</span>
                  <button onClick={handlePrint} className="bg-slate-100 hover:bg-slate-200 text-slate-700 px-6 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-2">
                    Exportar PDF
                  </button>
                </div>
                <div className="prose max-w-none text-slate-700 leading-relaxed font-medium whitespace-pre-wrap">{report}</div>
              </div>
            ) : (
              <div className="h-full min-h-[400px] border-2 border-dashed border-slate-200 rounded-[40px] flex flex-col items-center justify-center text-center p-10 bg-slate-50/50 no-print">
                <h4 className="text-slate-900 font-black text-xl mb-2">Relatório Estratégico</h4>
                <p className="text-slate-500 max-w-xs font-medium">A IA analisará atividades concluídas e ocorrências registradas para gerar insights valiosos.</p>
              </div>
            )}
          </div>
        </div>
      )}

      {activeTab === 'incidents' && (
        <div className="space-y-6 animate-in slide-in-from-right-4 duration-500">
          <div className="flex justify-between items-center no-print">
            <h3 className="text-2xl font-black text-slate-900 tracking-tight">Livro de Ocorrências Digital</h3>
            {canAddIncident && (
              <button 
                onClick={() => setShowIncidentModal(true)}
                className="bg-red-600 text-white px-6 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest shadow-lg shadow-red-500/20 active:scale-95 transition-all flex items-center gap-2"
              >
                <Icons.Add /> Registrar Ocorrência
              </button>
            )}
          </div>

          <div className="grid grid-cols-1 gap-4">
            {incidents.map(inc => (
              <div key={inc.id} className="bg-white p-8 rounded-[32px] border border-slate-200 shadow-sm flex flex-col md:flex-row gap-8 group">
                <div className="flex-1 space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <span className={`px-4 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border ${inc.status === IncidentStatus.OPEN ? 'bg-red-50 text-red-600 border-red-100' : 'bg-green-50 text-green-600 border-green-100'}`}>
                        {inc.status === IncidentStatus.OPEN ? '🚨 Aberta' : '✅ Resolvida'}
                      </span>
                    </div>
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                      {new Date(inc.timestamp).toLocaleString()}
                    </span>
                  </div>
                  <div>
                    <h4 className="text-xl font-black text-slate-900 mb-1">{inc.title}</h4>
                    <p className="text-slate-500 font-medium leading-relaxed">{inc.description}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-black text-blue-600 uppercase tracking-widest">Relatado por: {inc.userName}</span>
                  </div>
                  {inc.photos && inc.photos.length > 0 && (
                    <div className="flex gap-2 pt-2">
                      {inc.photos.map((p, idx) => (
                        <img key={idx} src={p} onClick={() => setSelectedTaskPhotos(inc.photos || [])} className="w-16 h-16 rounded-xl object-cover cursor-pointer hover:scale-105 transition-transform" alt="Evidence" />
                      ))}
                    </div>
                  )}
                </div>
                <div className="shrink-0 flex items-center justify-end gap-3 no-print">
                  {canAddIncident && (
                    <button 
                      onClick={() => handleToggleIncidentStatus(inc)}
                      className={`h-12 px-6 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${inc.status === IncidentStatus.OPEN ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-500'}`}
                    >
                      {inc.status === IncidentStatus.OPEN ? 'Resolver Caso' : 'Reabrir Caso'}
                    </button>
                  )}
                  {isManagement && (
                    <button 
                      onClick={() => handleDeleteIncident(inc)}
                      title="Excluir Ocorrência"
                      className="w-12 h-12 flex items-center justify-center bg-red-50 text-red-400 hover:bg-red-500 hover:text-white rounded-xl transition-all border border-red-100"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>
                    </button>
                  )}
                </div>
              </div>
            ))}
            {incidents.length === 0 && (
              <div className="py-20 text-center border-2 border-dashed border-slate-200 rounded-[40px] text-slate-400 font-bold uppercase tracking-widest text-xs">
                Nenhuma ocorrência registrada até o momento.
              </div>
            )}
          </div>
        </div>
      )}

      {activeTab === 'history' && isManagement && (
        <div className="bg-white rounded-[40px] border border-slate-200 overflow-hidden shadow-sm animate-in slide-in-from-right-4 duration-500">
           <table className="w-full text-left">
            <thead className="bg-slate-50 border-b border-slate-100">
              <tr>
                <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Tarefa Concluída</th>
                <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Responsável</th>
                <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {taskHistory.map(task => (
                <tr key={task.id} className="hover:bg-slate-50/50 transition-colors">
                  <td className="px-8 py-5">
                    <p className="font-bold text-slate-900">{task.title}</p>
                    <p className="text-[10px] font-black uppercase text-blue-600">{task.category}</p>
                  </td>
                  <td className="px-8 py-5 text-sm font-medium text-slate-600">{task.assignedUserName}</td>
                  <td className="px-8 py-5 text-right flex justify-end items-center gap-3">
                    {task.photos && task.photos.length > 0 && (
                      <button onClick={() => setSelectedTaskPhotos(task.photos || [])} className="text-blue-600 font-black text-[9px] uppercase hover:underline">Ver Fotos</button>
                    )}
                    <button 
                      onClick={() => handleReopenTask(task)} 
                      title="Reabrir e agendar para hoje"
                      className="p-2 text-amber-600 hover:bg-amber-50 rounded-xl transition-all"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"></path></svg>
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {activeTab === 'audit' && isManagement && (
        <div className="bg-white rounded-[40px] border border-slate-200 overflow-hidden shadow-sm animate-in slide-in-from-bottom-4 duration-500">
          <div className="divide-y divide-slate-100">
            {logs.map(log => (
              <div key={log.id} className="p-6 flex items-center justify-between hover:bg-slate-50 transition-colors">
                <div className="flex items-center gap-6">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-black text-[10px] ${log.action === 'CREATE' ? 'bg-emerald-50 text-emerald-600' : log.action === 'DELETE' ? 'bg-red-50 text-red-600' : 'bg-blue-50 text-blue-600'}`}>
                    {log.module.charAt(0)}
                  </div>
                  <div>
                    <p className="text-sm font-bold text-slate-900">{log.userName} <span className="font-medium text-slate-500">realizou</span> {log.action}</p>
                    <p className="text-[10px] font-black text-blue-600 uppercase tracking-widest mt-0.5">{log.targetName}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{new Date(log.timestamp).toLocaleDateString()}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Incident Modal */}
      {showIncidentModal && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-slate-900/90 backdrop-blur-xl">
          <div className="bg-white w-full max-w-xl rounded-[40px] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300">
            <div className="p-10 border-b border-slate-100 flex items-center justify-between">
              <h3 className="text-2xl font-black text-slate-900 tracking-tight">Nova Ocorrência</h3>
              <button onClick={() => setShowIncidentModal(false)} className="p-2 text-slate-400"><Icons.Add className="rotate-45" /></button>
            </div>
            <form onSubmit={handleSaveIncident} className="p-10 space-y-6">
              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">Título do Evento</label>
                <input type="text" required placeholder="Ex: Vazamento no subsolo 2" className="w-full h-14 px-6 rounded-2xl border-2 border-slate-100 bg-slate-50 font-bold outline-none focus:border-red-500" value={incidentForm.title} onChange={e => setIncidentForm({...incidentForm, title: e.target.value})} />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">Relato Detalhado</label>
                <textarea required rows={4} placeholder="Descreva o que aconteceu e as medidas iniciais..." className="w-full p-6 rounded-2xl border-2 border-slate-100 bg-slate-50 font-medium outline-none focus:border-red-500" value={incidentForm.description} onChange={e => setIncidentForm({...incidentForm, description: e.target.value})} />
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">Evidências (Opcional)</label>
                <div className="flex gap-2">
                  {incidentForm.photos.map((p, i) => <img key={i} src={p} className="w-16 h-16 rounded-xl object-cover border" />)}
                  <button type="button" onClick={() => incidentPhotoRef.current?.click()} className="w-16 h-16 rounded-xl border-2 border-dashed border-slate-300 flex items-center justify-center text-slate-400 hover:text-red-500 hover:border-red-500 transition-all">
                    {isUploading ? '...' : <Icons.Camera />}
                  </button>
                  <input type="file" ref={incidentPhotoRef} className="hidden" accept="image/*" onChange={handlePhotoUpload} />
                </div>
              </div>

              <button type="submit" className="w-full h-16 bg-red-600 text-white font-black rounded-3xl shadow-xl uppercase tracking-widest active:scale-95 transition-all">
                Registrar Ocorrência
              </button>
            </form>
          </div>
        </div>
      )}

      {selectedTaskPhotos && (
        <div className="fixed inset-0 z-[210] flex items-center justify-center p-4 bg-slate-900/95 backdrop-blur-xl">
          <div className="w-full max-w-4xl space-y-6">
            <div className="flex justify-between items-center text-white">
              <h3 className="text-xl font-black uppercase tracking-widest">Evidências</h3>
              <button onClick={() => setSelectedTaskPhotos(null)} className="p-3 bg-white/10 rounded-full hover:bg-white/20 transition-all"><Icons.Add className="rotate-45" /></button>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4 overflow-y-auto max-h-[70vh] p-2 scrollbar-hide">
              {selectedTaskPhotos.map((p, i) => <img key={i} src={p} className="w-full aspect-square object-cover rounded-3xl border border-white/10 shadow-2xl" alt="Evidence" />)}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Reports;
