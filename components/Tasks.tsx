
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Task, TaskStatus, TaskFrequency, UserRole, User, Log, Vendor } from '../types';
import { Icons } from '../constants';
import { db } from '../services/db';

interface TasksProps {
  currentUser: User;
  selectedCondoId: string;
  notify: (msg: string, type?: 'success' | 'error') => void;
}

const Tasks: React.FC<TasksProps> = ({ currentUser, selectedCondoId, notify }) => {
  const [filter, setFilter] = useState<TaskStatus | 'ALL' | 'PERMANENT'>('ALL');
  const [showModal, setShowModal] = useState(false);
  const [showCategoryManager, setShowCategoryManager] = useState(false);
  const [showCompletionModal, setShowCompletionModal] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [isConfirmingFinal, setIsConfirmingFinal] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [taskToComplete, setTaskToComplete] = useState<Task | null>(null);
  const [taskToView, setTaskToView] = useState<Task | null>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [condoWorkers, setCondoWorkers] = useState<User[]>([]);
  const [condoVendors, setCondoVendors] = useState<Vendor[]>([]);
  const [completionPhotos, setCompletionPhotos] = useState<string[]>([]);
  const [completionObs, setCompletionObs] = useState('');
  const [categories, setCategories] = useState<string[]>([]);
  const [newCategoryName, setNewCategoryName] = useState('');
  const completionPhotoRef = useRef<HTMLInputElement>(null);

  const canManage = [UserRole.SINDICO, UserRole.GESTOR, UserRole.ZELADOR].includes(currentUser.role);

  const [formTask, setFormTask] = useState({
    title: '',
    description: '',
    frequency: TaskFrequency.DAILY,
    dates: [new Date().toISOString().slice(0, 16)], 
    category: 'Manutenção',
    assignedTo: '',
    photos: [] as string[]
  });

  const refreshTasks = () => {
    setTasks(db.getTasks());
  };

  const refreshCategories = () => {
    setCategories(db.getCategories());
  };

  useEffect(() => {
    refreshTasks();
    refreshCategories();
    const workers = db.getUsersByCondo(selectedCondoId);
    setCondoWorkers(workers.filter(u => 
      u.role === UserRole.ZELADOR || u.role === UserRole.LIMPEZA || u.role === UserRole.GESTOR || u.role === UserRole.PORTEIRO
    ));
    setCondoVendors(db.getVendorsByCondo(selectedCondoId));
  }, [selectedCondoId]);

  const handleOpenAdd = () => {
    if (!canManage) return;
    setEditingTask(null);
    const defaultWorker = condoWorkers.find(w => w.id !== currentUser.id) || condoWorkers[0];
    setFormTask({ 
      title: '', 
      description: '', 
      frequency: TaskFrequency.DAILY, 
      dates: [new Date().toISOString().slice(0, 16)], 
      category: categories[0] || 'Manutenção', 
      assignedTo: defaultWorker?.id || currentUser.id,
      photos: []
    });
    setShowModal(true);
  };

  const handleOpenEdit = (task: Task) => {
    if (!canManage) return;
    setEditingTask(task);
    setFormTask({
      title: task.title,
      description: task.description,
      frequency: task.frequency,
      dates: [new Date(task.scheduledFor).toISOString().slice(0, 16)],
      category: task.category,
      assignedTo: task.assignedTo,
      photos: task.photos || []
    });
    setShowModal(true);
  };

  const handleDeleteTask = (task: Task) => {
    if (!canManage) return;
    if (window.confirm(`Excluir permanentemente a tarefa "${task.title}"?`)) {
      db.deleteTask(task.id);
      db.saveLog({
        id: Math.random().toString(36).substr(2, 9),
        userId: currentUser.id,
        userName: currentUser.name,
        action: 'DELETE',
        module: 'TASK',
        targetName: task.title,
        timestamp: new Date().toISOString(),
        condoId: selectedCondoId
      });
      refreshTasks();
      notify('Tarefa excluída.');
    }
  };

  const handleReopenTask = (task: Task) => {
    if (window.confirm(`Deseja reabrir a tarefa "${task.title}" para novas correções? Ela voltará para a lista de hoje.`)) {
      const updatedTask: Task = { 
        ...task, 
        status: TaskStatus.PENDING, 
        completedAt: undefined,
        completionObservation: undefined,
        scheduledFor: new Date().toISOString() // Reagendar para hoje agora
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
      refreshTasks();
      notify('Tarefa reaberta! Verifique na aba de Pendentes.');
    }
  };

  const handleCardClick = (task: Task) => {
    if (task.status === TaskStatus.COMPLETED) {
      setTaskToView(task);
      setShowViewModal(true);
      return;
    }

    if (task.assignedTo !== currentUser.id && !canManage) {
      notify('Esta tarefa está atribuída a outro colaborador.', 'error');
      return;
    }

    if (task.status === TaskStatus.PENDING) {
      db.saveTask({ ...task, status: TaskStatus.IN_PROGRESS });
      refreshTasks();
      notify('Tarefa iniciada! Toque novamente ao terminar para concluir.');
    } else if (task.status === TaskStatus.IN_PROGRESS) {
      setTaskToComplete(task);
      setCompletionPhotos([]);
      setCompletionObs('');
      setIsConfirmingFinal(false);
      setShowCompletionModal(true);
    }
  };

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsUploading(true);
    const reader = new FileReader();
    reader.onloadend = () => {
      const result = reader.result as string;
      setCompletionPhotos(prev => [...prev, result]);
      setIsUploading(false);
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const confirmCompletion = () => {
    if (!taskToComplete) return;
    if (!isConfirmingFinal) {
      setIsConfirmingFinal(true);
      return;
    }

    const updatedTask: Task = { 
      ...taskToComplete, 
      status: TaskStatus.COMPLETED, 
      completedAt: new Date().toISOString(),
      completionObservation: completionObs,
      photos: [...(taskToComplete.photos || []), ...completionPhotos]
    };
    
    db.saveTask(updatedTask);
    refreshTasks();
    setShowCompletionModal(false);
    setTaskToComplete(null);
    setIsConfirmingFinal(false);
    notify('Tarefa concluída com sucesso!');
  };

  const handleSaveTask = (e: React.FormEvent) => {
    e.preventDefault();
    const assignedUser = db.getUsers().find(u => u.id === formTask.assignedTo);
    const assignedVendor = condoVendors.find(v => v.id === formTask.assignedTo);
    const assignedName = assignedUser?.name || assignedVendor?.name || 'Não atribuído';

    if (editingTask) {
      const taskData: Task = {
        ...editingTask,
        title: formTask.title,
        description: formTask.description,
        frequency: formTask.frequency,
        scheduledFor: new Date(formTask.dates[0]).toISOString(),
        assignedTo: formTask.assignedTo,
        assignedUserName: assignedName,
        category: formTask.category,
        photos: formTask.photos
      };
      db.saveTask(taskData);
      
      db.saveLog({
        id: Math.random().toString(36).substr(2, 9),
        userId: currentUser.id,
        userName: currentUser.name,
        action: 'UPDATE',
        module: 'TASK',
        targetName: taskData.title,
        timestamp: new Date().toISOString(),
        condoId: selectedCondoId
      });
    } else {
      formTask.dates.forEach(dateStr => {
        const taskData: Task = {
          id: Math.random().toString(36).substr(2, 9),
          title: formTask.title,
          description: formTask.description,
          status: TaskStatus.PENDING,
          frequency: TaskFrequency.ONCE,
          createdAt: new Date().toISOString(),
          scheduledFor: new Date(dateStr).toISOString(),
          assignedTo: formTask.assignedTo,
          assignedUserName: assignedName,
          category: formTask.category,
          condoId: selectedCondoId,
          photos: formTask.photos
        };
        db.saveTask(taskData);
      });
      
      db.saveLog({
        id: Math.random().toString(36).substr(2, 9),
        userId: currentUser.id,
        userName: currentUser.name,
        action: 'CREATE',
        module: 'TASK',
        targetName: formTask.title,
        timestamp: new Date().toISOString(),
        condoId: selectedCondoId
      });
    }

    refreshTasks();
    setShowModal(false);
    notify(editingTask ? 'Tarefa atualizada!' : 'Rotina salva com sucesso!');
  };

  const visibleTasks = useMemo(() => {
    const todayStr = new Date().toDateString();
    const condoTasks = tasks.filter(t => t.condoId === selectedCondoId);

    return condoTasks.filter(task => {
      const isManagementRole = [UserRole.SINDICO, UserRole.GESTOR, UserRole.ZELADOR].includes(currentUser.role);
      const isAssignedToMe = task.assignedTo === currentUser.id;
      
      if (!isManagementRole && !isAssignedToMe) return false;

      const scheduled = new Date(task.scheduledFor);
      const scheduledStr = scheduled.toDateString();

      // Tarefas concluídas hoje aparecem
      if (task.status === TaskStatus.COMPLETED) {
        return new Date(task.completedAt || '').toDateString() === todayStr;
      }

      // Tarefas pendentes/em execução
      // Se for eventual (ONCE) ou diária/semanal, verificamos se é hoje ou se está atrasada (pendente)
      if (task.status !== TaskStatus.COMPLETED) {
         if (scheduledStr === todayStr) return true;
         if (scheduled < new Date()) return true; // Mostrar atrasadas
      }

      switch (task.frequency) {
        case TaskFrequency.DAILY: return true;
        case TaskFrequency.WEEKLY: return scheduled.getDay() === new Date().getDay();
        case TaskFrequency.MONTHLY: return scheduled.getDate() === new Date().getDate();
        default: return scheduledStr === todayStr;
      }
    });
  }, [tasks, selectedCondoId, currentUser]);

  const filteredTasks = useMemo(() => {
    if (filter === 'ALL') return visibleTasks;
    if (filter === 'PERMANENT') return visibleTasks.filter(t => t.frequency !== TaskFrequency.ONCE);
    return visibleTasks.filter(t => t.status === filter);
  }, [visibleTasks, filter]);

  const getFrequencyLabel = (freq: TaskFrequency) => {
    switch(freq) {
      case TaskFrequency.DAILY: return 'Diária';
      case TaskFrequency.WEEKLY: return 'Semanal';
      case TaskFrequency.MONTHLY: return 'Mensal';
      case TaskFrequency.ONCE: return 'Eventual';
      default: return '';
    }
  };

  return (
    <div className="space-y-8 animate-in slide-in-from-bottom-4 duration-500 pb-24 md:pb-0">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h2 className="text-2xl font-black text-slate-900 tracking-tight uppercase">Rotina Operacional</h2>
          <p className="text-slate-500 font-medium text-sm tracking-tight">Serviços e agendamentos atribuídos ao condomínio.</p>
        </div>
        
        {canManage && selectedCondoId && (
          <button 
            onClick={handleOpenAdd}
            className="bg-slate-900 text-white px-8 py-3 rounded-md flex items-center justify-center gap-3 font-black text-[10px] uppercase tracking-widest shadow-lg active:scale-95 transition-all"
          >
            <Icons.Add /> Nova Regra/Tarefa
          </button>
        )}
      </header>

      <div className="flex gap-2 overflow-x-auto pb-4 scrollbar-hide">
        {[{ id: 'ALL', label: 'Tudo Hoje' }, { id: 'PERMANENT', label: 'Permanentes' }, { id: TaskStatus.PENDING, label: 'Pendentes' }, { id: TaskStatus.COMPLETED, label: 'Concluídas' }].map((opt) => (
          <button
            key={opt.id}
            onClick={() => setFilter(opt.id as any)}
            className={`px-5 py-2 rounded-md text-[9px] font-black uppercase tracking-widest border transition-all shrink-0 ${filter === opt.id ? 'bg-blue-600 text-white border-blue-600 shadow-md' : 'bg-white text-slate-500 border-slate-200 hover:border-slate-400'}`}
          >
            {opt.label}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredTasks.map((task) => (
          <div 
            key={task.id} 
            onClick={() => handleCardClick(task)}
            className="bg-white rounded-md border border-slate-200 shadow-sm overflow-hidden flex flex-col hover:border-slate-400 hover:scale-[1.01] transition-all cursor-pointer group active:bg-slate-50"
          >
            <div className="p-6 flex-1 space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex gap-2">
                  <span className="text-[8px] font-black uppercase tracking-widest px-2 py-0.5 rounded-sm bg-slate-100 text-slate-600">
                    {getFrequencyLabel(task.frequency)}
                  </span>
                  <span className={`text-[8px] font-black uppercase tracking-widest px-2 py-0.5 rounded-sm ${task.status === TaskStatus.COMPLETED ? 'bg-emerald-100 text-emerald-700' : task.status === TaskStatus.IN_PROGRESS ? 'bg-blue-100 text-blue-700' : 'bg-amber-100 text-amber-700'}`}>
                    {task.status === TaskStatus.PENDING ? 'Pendente' : task.status === TaskStatus.IN_PROGRESS ? 'Em Execução' : 'Concluída'}
                  </span>
                </div>
                {canManage && (
                  <div className="flex items-center gap-1 no-print" onClick={e => e.stopPropagation()}>
                    <button onClick={() => handleOpenEdit(task)} className="p-1.5 text-slate-400 hover:text-blue-600 transition-colors">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"></path></svg>
                    </button>
                    <button onClick={() => handleDeleteTask(task)} className="p-1.5 text-slate-400 hover:text-red-600 transition-colors">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>
                    </button>
                  </div>
                )}
              </div>
              <div>
                <h3 className="font-black text-slate-900 text-lg leading-tight uppercase tracking-tight group-hover:text-blue-600 transition-colors">{task.title}</h3>
                <p className="text-xs text-slate-500 font-medium mt-1 leading-relaxed line-clamp-2">{task.description}</p>
              </div>
              <div className="flex items-center justify-between text-[9px] font-black text-slate-400 uppercase border-t border-slate-100 pt-4">
                <span className="bg-blue-50 text-blue-600 px-2 py-1 rounded-sm">{task.category}</span>
                <span className="text-slate-900">{task.assignedUserName}</span>
              </div>
            </div>
            
            {task.assignedTo === currentUser.id && task.status !== TaskStatus.COMPLETED && (
              <div className="p-4 bg-slate-50 border-t border-slate-100">
                <div className={`w-full py-3 rounded-md text-[10px] font-black uppercase tracking-widest text-center shadow-md ${task.status === TaskStatus.PENDING ? 'bg-blue-600 text-white' : 'bg-emerald-600 text-white'}`}>
                  {task.status === TaskStatus.PENDING ? 'Toque para Iniciar' : 'Toque para Finalizar'}
                </div>
              </div>
            )}

            {task.status === TaskStatus.COMPLETED && (
              <div className="p-4 bg-emerald-50 border-t border-emerald-100 flex flex-col gap-2">
                <p className="text-[9px] font-black uppercase text-emerald-700 text-center">Finalizado em {new Date(task.completedAt!).toLocaleDateString()}</p>
                <button 
                  onClick={(e) => { e.stopPropagation(); handleReopenTask(task); }}
                  className="w-full py-2 bg-white border border-emerald-200 text-emerald-700 text-[9px] font-black uppercase tracking-widest rounded-sm hover:bg-emerald-100 transition-all shadow-sm active:scale-95"
                >
                  Reabrir para Correção
                </button>
              </div>
            )}
          </div>
        ))}
        {filteredTasks.length === 0 && (
          <div className="col-span-full py-20 text-center bg-white rounded-md border border-dashed border-slate-300">
             <p className="text-slate-400 font-black uppercase text-[10px] tracking-widest">Nenhuma tarefa encontrada no filtro atual.</p>
          </div>
        )}
      </div>

      {/* MODAL FINALIZAÇÃO COM OBS E FOTO */}
      {showCompletionModal && taskToComplete && (
        <div className="fixed inset-0 z-[250] flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-md">
          <div className="bg-white w-full max-w-lg rounded-md shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300">
            <div className="p-8 border-b border-slate-100 flex items-center justify-between bg-slate-50">
              <h3 className="text-sm font-black uppercase tracking-widest text-slate-900">Finalizar Serviço</h3>
              <button onClick={() => setShowCompletionModal(false)} className="p-1 text-slate-400 hover:text-slate-900"><svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M6 18L18 6M6 6l12 12"></path></svg></button>
            </div>
            <div className="p-8 space-y-6">
              <div className="space-y-1">
                <label className="text-[9px] font-black uppercase text-slate-400 ml-1">Relato de Conclusão / Observações</label>
                <textarea 
                  required 
                  rows={3} 
                  placeholder="Descreva como foi realizado o serviço ou problemas encontrados..." 
                  className="w-full p-4 rounded-sm border border-slate-200 font-medium bg-slate-50 text-sm focus:border-blue-500 outline-none" 
                  value={completionObs} 
                  onChange={e => setCompletionObs(e.target.value)} 
                />
              </div>

              <div className="space-y-2">
                <label className="text-[9px] font-black uppercase text-slate-400 ml-1">Comprovação por Foto (Evidência)</label>
                <div className="grid grid-cols-3 gap-3">
                  {completionPhotos.map((p, i) => (
                    <div key={i} className="aspect-square relative group">
                      <img src={p} className="w-full h-full object-cover rounded border border-slate-200 shadow-sm" />
                      <button onClick={() => setCompletionPhotos(prev => prev.filter((_, idx) => idx !== i))} className="absolute -top-1 -right-1 bg-red-600 text-white w-5 h-5 rounded-full flex items-center justify-center text-xs shadow-lg">×</button>
                    </div>
                  ))}
                  <button 
                    type="button"
                    onClick={() => completionPhotoRef.current?.click()}
                    className="aspect-square border-2 border-dashed border-slate-200 rounded flex flex-col items-center justify-center text-slate-400 hover:border-blue-500 hover:text-blue-500 transition-all bg-slate-50"
                  >
                    {isUploading ? <div className="w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div> : <><Icons.Camera /><span className="text-[8px] font-black uppercase mt-1">Anexar</span></>}
                  </button>
                  <input type="file" ref={completionPhotoRef} className="hidden" accept="image/*" onChange={handlePhotoUpload} />
                </div>
              </div>

              <div className="bg-slate-50 p-4 rounded-sm border border-slate-200 flex justify-between items-center">
                 <span className="text-[9px] font-black uppercase text-slate-400">Data e Hora de Conclusão</span>
                 <span className="text-xs font-bold text-slate-900">{new Date().toLocaleDateString()} - {new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
              </div>

              <button 
                onClick={confirmCompletion}
                className={`w-full h-14 rounded-sm font-black text-[10px] uppercase tracking-widest transition-all ${isConfirmingFinal ? 'bg-emerald-600 text-white shadow-emerald-500/20 shadow-lg' : 'bg-slate-900 text-white'}`}
              >
                {isConfirmingFinal ? 'Confirmar e Enviar' : 'Finalizar Serviço'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL VISUALIZAÇÃO DE TAREFA CONCLUÍDA */}
      {showViewModal && taskToView && (
        <div className="fixed inset-0 z-[250] flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-md">
          <div className="bg-white w-full max-w-xl rounded-md shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300 flex flex-col max-h-[90vh]">
            <div className="px-8 py-5 border-b flex items-center justify-between bg-emerald-50">
              <h3 className="text-sm font-black uppercase tracking-widest text-emerald-900">Relatório de Conclusão</h3>
              <button onClick={() => setShowViewModal(false)} className="p-1 text-emerald-600 hover:text-emerald-900"><svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M6 18L18 6M6 6l12 12"></path></svg></button>
            </div>
            <div className="p-8 space-y-6 overflow-y-auto scrollbar-hide">
              <div>
                <h4 className="text-2xl font-black text-slate-900 uppercase tracking-tight">{taskToView.title}</h4>
                <p className="text-[10px] font-black text-blue-600 uppercase mt-1">{taskToView.category}</p>
              </div>

              <div className="grid grid-cols-2 gap-4 border-y border-slate-100 py-6">
                <div>
                   <p className="text-[9px] font-black uppercase text-slate-400">Responsável</p>
                   <p className="text-sm font-bold text-slate-900">{taskToView.assignedUserName}</p>
                </div>
                <div>
                   <p className="text-[9px] font-black uppercase text-slate-400">Finalizado em</p>
                   <p className="text-sm font-bold text-slate-900">{new Date(taskToView.completedAt!).toLocaleString()}</p>
                </div>
              </div>

              <div className="space-y-2">
                 <p className="text-[9px] font-black uppercase text-slate-400">Observações do Serviço</p>
                 <p className="text-sm font-medium text-slate-700 bg-slate-50 p-4 rounded-sm border border-slate-100 italic">
                   "{taskToView.completionObservation || 'Nenhuma observação registrada.'}"
                 </p>
              </div>

              {taskToView.photos && taskToView.photos.length > 0 && (
                <div className="space-y-2">
                  <p className="text-[9px] font-black uppercase text-slate-400">Evidências Fotográficas</p>
                  <div className="grid grid-cols-2 gap-3">
                    {taskToView.photos.map((p, i) => (
                      <img key={i} src={p} className="w-full aspect-video object-cover rounded-sm border border-slate-200" />
                    ))}
                  </div>
                </div>
              )}

              <button onClick={() => setShowViewModal(false)} className="w-full py-4 text-slate-400 font-black text-[10px] uppercase tracking-widest hover:text-slate-900 transition-all">Fechar</button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL NOVA TAREFA / EDIÇÃO */}
      {showModal && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white w-full max-w-xl rounded-md shadow-2xl overflow-hidden animate-in zoom-in-95 flex flex-col max-h-[90vh]">
            <div className="px-8 py-5 border-b flex items-center justify-between bg-slate-50">
              <h3 className="text-sm font-black uppercase tracking-widest text-slate-900">{editingTask ? 'Editar Tarefa' : 'Configurar Rotina / Tarefa'}</h3>
              <button onClick={() => setShowModal(false)} className="p-1 text-slate-400 hover:text-slate-900"><svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M6 18L18 6M6 6l12 12"></path></svg></button>
            </div>
            <form onSubmit={handleSaveTask} className="p-8 space-y-5 overflow-y-auto scrollbar-hide">
              <div className="space-y-1">
                <label className="text-[9px] font-black uppercase text-slate-400 ml-1">Título do Serviço</label>
                <input type="text" required className="w-full h-11 px-4 rounded-sm border border-slate-200 font-bold bg-slate-50 text-sm focus:border-blue-500 outline-none" value={formTask.title} onChange={e => setFormTask({...formTask, title: e.target.value})} />
              </div>
              <div className="space-y-1">
                <label className="text-[9px] font-black uppercase text-slate-400 ml-1">Instruções de Execução</label>
                <textarea rows={2} className="w-full p-4 rounded-sm border border-slate-200 font-medium bg-slate-50 text-sm focus:border-blue-500 outline-none" value={formTask.description} onChange={e => setFormTask({...formTask, description: e.target.value})} />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[9px] font-black uppercase text-slate-400 ml-1">Frequência</label>
                  <select className="w-full h-11 px-4 rounded-sm border border-slate-200 font-bold bg-slate-50 text-sm outline-none cursor-pointer" value={formTask.frequency} onChange={e => setFormTask({...formTask, frequency: e.target.value as any})}>
                    <option value={TaskFrequency.DAILY}>Diária</option>
                    <option value={TaskFrequency.WEEKLY}>Semanal</option>
                    <option value={TaskFrequency.MONTHLY}>Mensal</option>
                    <option value={TaskFrequency.ONCE}>Eventual (Única)</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-[9px] font-black uppercase text-slate-400 ml-1">Responsável</label>
                  <select className="w-full h-11 px-4 rounded-sm border border-slate-200 font-bold bg-slate-50 text-sm outline-none cursor-pointer" value={formTask.assignedTo} onChange={e => setFormTask({...formTask, assignedTo: e.target.value})}>
                    <optgroup label="Equipe Interna">
                      {condoWorkers.map(w => <option key={w.id} value={w.id}>{w.name} ({w.jobTitle || w.role})</option>)}
                    </optgroup>
                    <optgroup label="Prestadores Externos">
                      {condoVendors.map(v => <option key={v.id} value={v.id}>🛠️ {v.name} ({v.category})</option>)}
                    </optgroup>
                  </select>
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[9px] font-black uppercase text-slate-400 ml-1">Data/Hora de Execução</label>
                <input type="datetime-local" required className="w-full h-11 px-4 rounded-sm border border-slate-200 font-bold bg-slate-50 text-sm focus:border-blue-500 outline-none" value={formTask.dates[0]} onChange={e => setFormTask({...formTask, dates: [e.target.value]})} />
              </div>

              <div className="space-y-1">
                 <div className="flex justify-between items-center mb-1">
                    <label className="text-[9px] font-black uppercase text-slate-400 ml-1">Especialidade / Setor</label>
                    <button type="button" onClick={() => setShowCategoryManager(true)} className="text-[8px] font-black text-blue-600 uppercase hover:underline">Gerenciar</button>
                 </div>
                 <select className="w-full h-11 px-4 rounded-sm border border-slate-200 font-bold bg-slate-50 text-sm outline-none" value={formTask.category} onChange={e => setFormTask({...formTask, category: e.target.value})}>
                    {categories.map(c => <option key={c} value={c}>{c}</option>)}
                 </select>
              </div>

              <div className="pt-6 flex gap-3">
                <button type="button" onClick={() => setShowModal(false)} className="flex-1 py-3 text-[10px] font-black uppercase border border-slate-200 rounded-sm">Cancelar</button>
                <button type="submit" className="flex-1 py-3 text-[10px] font-black uppercase bg-slate-900 text-white rounded-sm">
                  {editingTask ? 'Salvar Alterações' : 'Ativar Regra'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showCategoryManager && (
        <div className="fixed inset-0 z-[300] flex items-center justify-center p-4 bg-slate-900/90 backdrop-blur-md">
          <div className="bg-white w-full max-sm rounded-md shadow-2xl overflow-hidden">
            <div className="p-6 border-b flex items-center justify-between bg-slate-50">
              <h3 className="text-xs font-black uppercase text-slate-900">Categorias</h3>
              <button onClick={() => setShowCategoryManager(false)} className="p-1 text-slate-400"><svg className="w-5 h-5 rotate-45" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M12 5v14M5 12h14"></path></svg></button>
            </div>
            <div className="p-6 space-y-4">
               <div className="space-y-2 max-h-[30vh] overflow-y-auto pr-2 scrollbar-hide">
                  {categories.map(cat => (
                    <div key={cat} className="flex items-center justify-between p-3 bg-slate-50 rounded border border-slate-100">
                      <span className="text-xs font-bold text-slate-700">{cat}</span>
                      <button onClick={() => { db.deleteCategory(cat); refreshCategories(); }} className="text-red-400 hover:text-red-600">×</button>
                    </div>
                  ))}
               </div>
               <div className="pt-2 border-t border-slate-100 flex gap-2">
                 <input type="text" placeholder="Nova..." className="flex-1 h-10 px-3 rounded border text-xs font-bold bg-slate-50" value={newCategoryName} onChange={e => setNewCategoryName(e.target.value)} />
                 <button onClick={() => { db.saveCategory(newCategoryName); refreshCategories(); setNewCategoryName(''); }} className="bg-slate-900 text-white px-4 rounded-sm text-xs font-bold">Add</button>
               </div>
               <button onClick={() => setShowCategoryManager(false)} className="w-full py-3 text-slate-400 font-black text-[9px] uppercase tracking-widest">Fechar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Tasks;
