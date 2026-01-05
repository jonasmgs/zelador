
import React, { useState, useMemo, useRef, useEffect } from 'react';
import { db } from '../services/db';
import { summarizeActivities } from '../services/geminiService';
import { Icons } from '../constants';
import { TaskStatus, User, Task, Incident, IncidentStatus, UserRole, Log, Budget } from '../types';

interface ReportsProps {
  selectedCondoId: string;
  notify: (msg: string, type?: 'success' | 'error') => void;
  currentUser: User;
}

const Reports: React.FC<ReportsProps> = ({ selectedCondoId, notify, currentUser }) => {
  const [activeTab, setActiveTab] = useState<'ai' | 'incidents' | 'history' | 'audit'>('incidents');
  const [report, setReport] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  
  // Filtros e Configurações
  const [startDate, setStartDate] = useState<string>(new Date(new Date().setDate(new Date().getDate() - 7)).toISOString().split('T')[0]);
  const [endDate, setEndDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [customPrompt, setCustomPrompt] = useState('');
  const [modules, setModules] = useState({
    tasks: true,
    incidents: true,
    budgets: true,
    logs: false
  });

  const [selectedTaskPhotos, setSelectedTaskPhotos] = useState<string[] | null>(null);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  
  const [showIncidentModal, setShowIncidentModal] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const incidentPhotoRef = useRef<HTMLInputElement>(null);
  const [incidentForm, setIncidentForm] = useState({ title: '', description: '', photos: [] as string[] });

  const isManagement = currentUser.role === UserRole.SINDICO || currentUser.role === UserRole.GESTOR;
  // Limpeza agora pode registrar ocorrências conforme solicitado
  const canHandleIncident = [UserRole.SINDICO, UserRole.GESTOR, UserRole.ZELADOR, UserRole.PORTEIRO, UserRole.LIMPEZA].includes(currentUser.role);

  const incidents = useMemo(() => 
    db.getIncidentsByCondo(selectedCondoId)
    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()),
  [selectedCondoId, refreshTrigger]);

  // Função para gerar o relatório estratégico via IA
  const handleGenerateAIReport = async () => {
    setLoading(true);
    setReport(null);
    try {
      const start = new Date(startDate);
      start.setHours(0,0,0,0);
      const end = new Date(endDate);
      end.setHours(23,59,59,999);

      const dataToAnalyze: any = {};
      
      if (modules.tasks) {
        dataToAnalyze.tasks = db.getTasksByCondo(selectedCondoId).filter(t => {
          const d = new Date(t.scheduledFor);
          return d >= start && d <= end;
        });
      }

      if (modules.incidents) {
        dataToAnalyze.incidents = db.getIncidentsByCondo(selectedCondoId).filter(i => {
          const d = new Date(i.timestamp);
          return d >= start && d <= end;
        });
      }

      if (modules.budgets) {
        dataToAnalyze.budgets = db.getBudgetsByCondo(selectedCondoId).filter(b => {
          const d = new Date(b.createdAt);
          return d >= start && d <= end;
        });
      }

      if (modules.logs) {
        dataToAnalyze.logs = db.getLogs().filter(l => {
          const d = new Date(l.timestamp);
          return l.condoId === selectedCondoId && d >= start && d <= end;
        });
      }

      const periodDesc = `de ${new Date(startDate).toLocaleDateString()} a ${new Date(endDate).toLocaleDateString()}`;
      const result = await summarizeActivities(
        Object.values(dataToAnalyze).flat(), 
        periodDesc, 
        customPrompt, 
        dataToAnalyze.incidents
      );
      
      setReport(result || 'Ocorreu um erro ao processar os dados.');
      notify('Relatório estratégico gerado!');
    } catch (error) {
      console.error(error);
      notify('Erro ao conectar com o motor de IA.', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsUploading(true);
    const reader = new FileReader();
    reader.onloadend = () => {
      const result = reader.result as string;
      setIncidentForm(prev => ({ ...prev, photos: [...prev.photos, result] }));
      setIsUploading(false);
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const removePhoto = (index: number) => {
    setIncidentForm(prev => ({
      ...prev,
      photos: prev.photos.filter((_, i) => i !== index)
    }));
  };

  const handleSaveIncident = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCondoId) return;
    
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

    setShowIncidentModal(false);
    setIncidentForm({ title: '', description: '', photos: [] });
    setRefreshTrigger(prev => prev + 1);
    notify('Ocorrência registrada no livro digital.');
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-20">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-6 no-print">
        <div>
          <h2 className="text-3xl font-black text-slate-900 tracking-tight uppercase">Inteligência Operacional</h2>
          <p className="text-slate-500 font-medium">Relatórios estratégicos e gestão de ocorrências.</p>
        </div>
        <div className="flex bg-slate-200 p-1 rounded-md shrink-0 overflow-x-auto scrollbar-hide">
          <button onClick={() => setActiveTab('incidents')} className={`px-6 py-2.5 rounded-sm text-[10px] font-black uppercase tracking-widest transition-all shrink-0 ${activeTab === 'incidents' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>Livro Digital</button>
          {isManagement && (
            <>
              <button onClick={() => setActiveTab('ai')} className={`px-6 py-2.5 rounded-sm text-[10px] font-black uppercase tracking-widest transition-all shrink-0 ${activeTab === 'ai' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>IA Executive Summary</button>
              <button onClick={() => setActiveTab('audit')} className={`px-6 py-2.5 rounded-sm text-[10px] font-black uppercase tracking-widest transition-all shrink-0 ${activeTab === 'audit' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>Audit Log</button>
            </>
          )}
        </div>
      </header>

      {activeTab === 'ai' && isManagement && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 animate-in slide-in-from-bottom-4 duration-500">
          <div className="lg:col-span-4 space-y-6 no-print">
            <section className="bg-white p-6 rounded-md border border-slate-200 shadow-sm space-y-6">
              <h3 className="text-xs font-black uppercase tracking-widest text-slate-900 border-b pb-4">Personalizar Relatório</h3>
              
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-[9px] font-black uppercase text-slate-400">Início</label>
                    <input type="date" className="w-full h-10 px-3 border border-slate-200 rounded-sm text-[10px] font-bold outline-none bg-slate-50 focus:border-blue-500" value={startDate} onChange={e => setStartDate(e.target.value)} />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[9px] font-black uppercase text-slate-400">Término</label>
                    <input type="date" className="w-full h-10 px-3 border border-slate-200 rounded-sm text-[10px] font-bold outline-none bg-slate-50 focus:border-blue-500" value={endDate} onChange={e => setEndDate(e.target.value)} />
                  </div>
                </div>

                <div className="space-y-2 pt-2">
                  <label className="text-[9px] font-black uppercase text-slate-400">Módulos de Dados (Itens do Relatório)</label>
                  <div className="grid grid-cols-1 gap-2">
                    {[
                      { id: 'tasks', label: 'Checklist / Atividades' },
                      { id: 'incidents', label: 'Livro de Ocorrências' },
                      { id: 'budgets', label: 'Suprimentos / Orçamentos' },
                      { id: 'logs', label: 'Audit Log Completo' }
                    ].map(mod => (
                      <label key={mod.id} className="flex items-center gap-3 p-3 border border-slate-100 rounded-sm hover:bg-slate-50 cursor-pointer transition-colors">
                        <input 
                          type="checkbox" 
                          className="w-4 h-4 rounded-sm border-slate-300 text-blue-600 focus:ring-blue-500" 
                          checked={(modules as any)[mod.id]}
                          onChange={() => setModules(prev => ({ ...prev, [mod.id]: !(prev as any)[mod.id] }))}
                        />
                        <span className="text-[10px] font-bold text-slate-700 uppercase tracking-tight">{mod.label}</span>
                      </label>
                    ))}
                  </div>
                </div>

                <div className="space-y-1 pt-2">
                  <label className="text-[9px] font-black uppercase text-slate-400">Foco do Consultor IA (Instruções)</label>
                  <textarea 
                    rows={3} 
                    placeholder="Ex: Focar em segurança perimetral e custos de manutenção..." 
                    className="w-full p-4 border border-slate-200 rounded-sm text-xs font-medium bg-slate-50 focus:border-blue-500 outline-none"
                    value={customPrompt}
                    onChange={e => setCustomPrompt(e.target.value)}
                  />
                </div>
              </div>

              <button 
                onClick={handleGenerateAIReport}
                disabled={loading}
                className="w-full h-14 bg-slate-900 text-white rounded-sm font-black text-[10px] uppercase tracking-widest shadow-xl active:scale-95 transition-all disabled:opacity-50 flex items-center justify-center gap-3"
              >
                {loading ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin"></div>
                    Processando...
                  </>
                ) : (
                  <>
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z"></path></svg>
                    Gerar Relatório Estratégico
                  </>
                )}
              </button>
            </section>
          </div>

          <div className="lg:col-span-8">
            {report ? (
              <div className="animate-in fade-in zoom-in-95 duration-500 space-y-6">
                <div className="bg-white p-10 md:p-14 rounded-md border border-slate-200 shadow-2xl relative min-h-[600px] report-container">
                  <div className="absolute top-0 left-0 w-full h-1.5 bg-blue-600 rounded-t-md"></div>
                  
                  <div className="flex justify-between items-start mb-12 border-b border-slate-100 pb-8">
                    <div>
                      <div className="bg-blue-600 text-white px-3 py-1 rounded-sm text-[10px] font-black uppercase mb-4 inline-block">Relatório IA Executive</div>
                      <h1 className="text-3xl font-black text-slate-900 uppercase tracking-tighter">Análise Estratégica Predial</h1>
                      <p className="text-slate-500 font-bold uppercase text-[10px] tracking-widest mt-1">
                        Período: {new Date(startDate).toLocaleDateString()} — {new Date(endDate).toLocaleDateString()}
                      </p>
                    </div>
                    <div className="text-right no-print">
                      <button 
                        onClick={() => window.print()}
                        className="bg-slate-50 border border-slate-200 text-slate-600 px-4 py-2 rounded-md text-[10px] font-black uppercase flex items-center gap-2 hover:bg-slate-100 transition-all"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z"></path></svg>
                        Imprimir / PDF
                      </button>
                    </div>
                  </div>

                  <div className="prose prose-slate max-w-none prose-sm md:prose-base leading-relaxed">
                    <div className="whitespace-pre-wrap font-medium text-slate-700" dangerouslySetInnerHTML={{ __html: report.replace(/\*\*(.*?)\*\*/g, '<strong class="text-slate-900">$1</strong>').replace(/^# (.*$)/gim, '<h1 class="text-2xl font-black uppercase text-slate-900 mt-8 mb-4 border-l-4 border-blue-600 pl-4">$1</h1>').replace(/^## (.*$)/gim, '<h2 class="text-lg font-black uppercase text-slate-800 mt-6 mb-3">$1</h2>').replace(/^### (.*$)/gim, '<h3 class="text-sm font-black uppercase text-slate-600 mt-4 mb-2">$1</h3>') }}></div>
                  </div>

                  <div className="mt-16 pt-8 border-t border-slate-100 flex justify-between items-center text-[9px] font-black text-slate-400 uppercase tracking-widest">
                    <span>ZeladorCheck AI v2.5</span>
                    <span>Página 1 de 1</span>
                    <span>Documento Auditado via Blockchain Localthost</span>
                  </div>
                </div>
              </div>
            ) : (
              <div className="h-full min-h-[500px] border-2 border-dashed border-slate-200 rounded-md flex flex-col items-center justify-center text-center p-10 bg-white/50">
                <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center text-slate-300 mb-6">
                  <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"></path></svg>
                </div>
                <h4 className="text-sm font-black uppercase text-slate-400 tracking-widest">Aguardando Parâmetros</h4>
                <p className="text-xs text-slate-400 font-medium max-w-xs mt-2">Configure o período e os módulos ao lado para gerar uma análise profunda do condomínio.</p>
              </div>
            )}
          </div>
        </div>
      )}

      {activeTab === 'incidents' && (
        <div className="space-y-6">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-black text-slate-900 tracking-tight uppercase">Livro de Ocorrências Digital</h3>
            {canHandleIncident && (
              <button onClick={() => { setIncidentForm({ title: '', description: '', photos: [] }); setShowIncidentModal(true); }} className="bg-red-600 text-white px-6 py-3 rounded-md text-[10px] font-black uppercase shadow-lg active:scale-95 transition-all">
                Registrar Ocorrência
              </button>
            )}
          </div>
          <div className="grid grid-cols-1 gap-4">
            {incidents.map(inc => (
              <div key={inc.id} className="bg-white p-6 rounded-md border border-slate-200 shadow-sm hover:border-slate-400 transition-all">
                <div className="flex justify-between items-center mb-4">
                  <span className={`px-3 py-1 rounded-sm text-[9px] font-black uppercase tracking-tighter border ${inc.status === IncidentStatus.OPEN ? 'bg-red-50 text-red-600 border-red-200' : 'bg-green-50 text-green-600 border-green-200'}`}>
                    {inc.status === IncidentStatus.OPEN ? 'Em Aberto' : 'Resolvida'}
                  </span>
                  <span className="text-[9px] text-slate-400 font-black uppercase">{new Date(inc.timestamp).toLocaleString()}</span>
                </div>
                <h4 className="text-lg font-black text-slate-900 mb-2 uppercase tracking-tight leading-tight">{inc.title}</h4>
                <p className="text-slate-500 font-medium text-sm mb-4 leading-relaxed">{inc.description}</p>
                
                {inc.photos && inc.photos.length > 0 && (
                  <div className="flex gap-2 mb-4 overflow-x-auto pb-2 scrollbar-hide">
                    {inc.photos.map((photo, i) => (
                      <img 
                        key={i} 
                        src={photo} 
                        className="w-20 h-20 object-cover rounded-sm border border-slate-200 cursor-pointer hover:opacity-80 transition-opacity" 
                        alt="Evidência" 
                        onClick={() => setSelectedTaskPhotos(inc.photos || [])}
                      />
                    ))}
                  </div>
                )}

                <div className="pt-4 border-t border-slate-100 text-[9px] font-black text-slate-400 uppercase tracking-widest">
                   Registrado por: <span className="text-slate-900">{inc.userName}</span>
                </div>
              </div>
            ))}
            {incidents.length === 0 && (
              <div className="py-20 text-center border-2 border-dashed border-slate-200 rounded-md">
                <p className="text-slate-400 font-black uppercase text-[10px] tracking-widest">Nenhuma ocorrência registrada no sistema.</p>
              </div>
            )}
          </div>
        </div>
      )}

      {activeTab === 'audit' && isManagement && (
        <div className="bg-white rounded-md border border-slate-200 overflow-hidden shadow-sm animate-in slide-in-from-right-4 duration-500">
           <div className="bg-slate-50 border-b p-4">
             <h3 className="text-xs font-black uppercase tracking-widest text-slate-900">Rastreabilidade Completa</h3>
           </div>
           <div className="divide-y divide-slate-100 max-h-[70vh] overflow-y-auto scrollbar-hide">
              {db.getLogs().filter(l => l.condoId === selectedCondoId).map(log => (
                <div key={log.id} className="p-4 flex items-center justify-between hover:bg-slate-50 transition-colors">
                  <div className="flex items-center gap-4">
                    <div className="w-8 h-8 rounded-sm bg-slate-100 flex items-center justify-center font-black text-[9px] text-slate-500">
                      {log.module.charAt(0)}
                    </div>
                    <div>
                      <p className="text-xs font-bold text-slate-900">{log.userName} <span className="font-medium text-slate-500">{log.action}</span> em <span className="text-blue-600">{log.module}</span></p>
                      <p className="text-[9px] font-black text-slate-400 uppercase tracking-tighter mt-0.5">{log.targetName}</p>
                    </div>
                  </div>
                  <span className="text-[9px] font-black text-slate-400 uppercase">{new Date(log.timestamp).toLocaleDateString()}</span>
                </div>
              ))}
              {db.getLogs().filter(l => l.condoId === selectedCondoId).length === 0 && (
                <div className="p-10 text-center text-slate-400 font-black text-[10px] uppercase">Nenhum log encontrado.</div>
              )}
           </div>
        </div>
      )}

      {/* MODAL REGISTRO DE OCORRÊNCIA */}
      {showIncidentModal && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white w-full max-w-xl rounded-md shadow-2xl overflow-hidden animate-in zoom-in-95 flex flex-col max-h-[90vh]">
            <div className="px-8 py-5 border-b flex items-center justify-between bg-slate-50">
              <h3 className="text-sm font-black uppercase tracking-widest text-slate-900">Nova Ocorrência</h3>
              <button onClick={() => setShowIncidentModal(false)} className="p-1 text-slate-400 hover:text-slate-900">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M6 18L18 6M6 6l12 12"></path></svg>
              </button>
            </div>
            <form onSubmit={handleSaveIncident} className="p-8 space-y-5 overflow-y-auto scrollbar-hide">
              <div className="space-y-1">
                <label className="text-[9px] font-black uppercase text-slate-400 ml-1">Assunto / Título</label>
                <input 
                  type="text" 
                  required 
                  placeholder="Ex: Vazamento no 2º subsolo" 
                  className="w-full h-11 px-4 rounded-sm border border-slate-200 font-bold bg-slate-50 text-sm focus:border-blue-500 outline-none" 
                  value={incidentForm.title} 
                  onChange={e => setIncidentForm({...incidentForm, title: e.target.value})} 
                />
              </div>

              <div className="space-y-1">
                <label className="text-[9px] font-black uppercase text-slate-400 ml-1">Relato Detalhado</label>
                <textarea 
                  required 
                  rows={4} 
                  placeholder="Descreva o que aconteceu..." 
                  className="w-full p-4 rounded-sm border border-slate-200 font-medium bg-slate-50 text-sm focus:border-blue-500 outline-none" 
                  value={incidentForm.description} 
                  onChange={e => setIncidentForm({...incidentForm, description: e.target.value})} 
                />
              </div>

              <div className="space-y-2">
                <label className="text-[9px] font-black uppercase text-slate-400 ml-1">Evidências Fotográficas</label>
                <div className="grid grid-cols-4 gap-3">
                  {incidentForm.photos.map((photo, i) => (
                    <div key={i} className="aspect-square relative group">
                      <img src={photo} className="w-full h-full object-cover rounded-sm border border-slate-200 shadow-sm" />
                      <button 
                        type="button" 
                        onClick={() => removePhoto(i)} 
                        className="absolute -top-1 -right-1 bg-red-600 text-white w-5 h-5 rounded-full flex items-center justify-center text-xs shadow-lg"
                      >
                        ×
                      </button>
                    </div>
                  ))}
                  <button 
                    type="button" 
                    onClick={() => incidentPhotoRef.current?.click()}
                    className="aspect-square border-2 border-dashed border-slate-200 rounded-sm flex flex-col items-center justify-center text-slate-400 hover:border-blue-500 hover:text-blue-500 transition-all bg-slate-50"
                  >
                    {isUploading ? (
                      <div className="w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                    ) : (
                      <>
                        <Icons.Camera />
                        <span className="text-[8px] font-black uppercase mt-1">Anexar</span>
                      </>
                    )}
                  </button>
                  <input type="file" ref={incidentPhotoRef} className="hidden" accept="image/*" onChange={handlePhotoUpload} />
                </div>
              </div>

              <div className="pt-4 flex gap-3">
                <button 
                  type="button" 
                  onClick={() => setShowIncidentModal(false)} 
                  className="flex-1 py-3 text-[10px] font-black uppercase border border-slate-200 rounded-sm hover:bg-slate-50 transition-all"
                >
                  Cancelar
                </button>
                <button 
                  type="submit" 
                  className="flex-1 py-3 text-[10px] font-black uppercase bg-red-600 text-white rounded-sm shadow-lg active:scale-95 transition-all"
                >
                  Registrar Agora
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {selectedTaskPhotos && (
        <div className="fixed inset-0 z-[300] flex items-center justify-center p-4 bg-slate-900/90 backdrop-blur-md">
          <div className="w-full max-w-4xl space-y-6">
            <div className="flex justify-between items-center text-white">
              <h3 className="text-sm font-black uppercase tracking-widest">Evidências da Ocorrência</h3>
              <button onClick={() => setSelectedTaskPhotos(null)} className="p-2 bg-white/10 rounded-full hover:bg-white/20 transition-all">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M6 18L18 6M6 6l12 12"></path></svg>
              </button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 overflow-y-auto max-h-[75vh] p-2 scrollbar-hide">
              {selectedTaskPhotos.map((p, i) => (
                <img key={i} src={p} className="w-full aspect-video object-cover rounded-md border border-white/20 shadow-2xl" />
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Reports;
