
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
  const [isUploading, setIsUploading] = useState(false);
  const [isConfirmingFinal, setIsConfirmingFinal] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [taskToComplete, setTaskToComplete] = useState<Task | null>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [condoWorkers, setCondoWorkers] = useState<User[]>([]);
  const [condoVendors, setCondoVendors] = useState<Vendor[]>([]);
  const [completionPhotos, setCompletionPhotos] = useState<string[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [newCategoryName, setNewCategoryName] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const formPhotoRef = useRef<HTMLInputElement>(null);

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
      u.role === UserRole.ZELADOR || u.role === UserRole.LIMPEZA || u.role === UserRole.GESTOR
    ));
    setCondoVendors(db.getVendorsByCondo(selectedCondoId));
  }, [selectedCondoId]);

  const handleAddCategory = () => {
    if (!newCategoryName.trim()) return;
    db.saveCategory(newCategoryName.trim());
    refreshCategories();
    setNewCategoryName('');
    notify('Categoria adicionada!');
  };

  const handleDeleteCategory = (cat: string) => {
    if (window.confirm(`Excluir a categoria "${cat}"?`)) {
      db.deleteCategory(cat);
      refreshCategories();
      notify('Categoria removida.');
    }
  };

  const handleDeleteTask = (task: Task) => {
    if (window.confirm(`Tem certeza que deseja excluir permanentemente a tarefa "${task.title}"?`)) {
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
      notify('Tarefa excluída com sucesso.');
    }
  };

  const handleOpenAdd = () => {
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
    setEditingTask(task);
    setFormTask({
      title: task.title,
      description: task.description,
      frequency: task.frequency,
      dates: [task.scheduledFor.slice(0, 16)],
      category: task.category,
      assignedTo: task.assignedTo,
      photos: task.photos || []
    });
    setShowModal(true);
  };

  const handleAddDateSlot = () => {
    setFormTask(prev => ({
      ...prev,
      dates: [...prev.dates, new Date().toISOString().slice(0, 16)]
    }));
  };

  const handleRemoveDateSlot = (index: number) => {
    if (formTask.dates.length <= 1) return;
    setFormTask(prev => ({
      ...prev,
      dates: prev.dates.filter((_, i) => i !== index)
    }));
  };

  const handleDateChange = (index: number, value: string) => {
    const newDates = [...formTask.dates];
    newDates[index] = value;
    setFormTask(prev => ({ ...prev, dates: newDates }));
  };

  const handleFormPhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsUploading(true);
    const reader = new FileReader();
    reader.onloadend = () => {
      setFormTask(prev => ({ ...prev, photos: [...prev.photos, reader.result as string] }));
      setIsUploading(false);
    };
    reader.readAsDataURL(file);
  };

  const handleSaveTask = (e: React.FormEvent) => {
    e.preventDefault();
    // Busca o nome do atribuído tanto na lista de funcionários quanto na de fornecedores
    const assignedUser = db.getUsers().find(u => u.id === formTask.assignedTo);
    const assignedVendor = condoVendors.find(v => v.id === formTask.assignedTo);
    const assignedName = assignedUser?.name || assignedVendor?.name || 'Não atribuído';

    const isUpdate = !!editingTask;
    
    const datesToSave = (isUpdate || formTask.frequency !== TaskFrequency.ONCE) 
      ? [formTask.dates[0]] 
      : formTask.dates;

    datesToSave.forEach(dateStr => {
      const taskData: Task = isUpdate ? {
        ...editingTask!,
        title: formTask.title,
        description: formTask.description,
        frequency: formTask.frequency,
        category: formTask.category,
        assignedTo: formTask.assignedTo,
        assignedUserName: assignedName,
        scheduledFor: new Date(dateStr).toISOString(),
        photos: formTask.photos
      } : {
        id: Math.random().toString(36).substr(2, 9),
        title: formTask.title,
        description: formTask.description,
        status: TaskStatus.PENDING,
        frequency: formTask.frequency,
        createdAt: new Date().toISOString(),
        scheduledFor: new Date(dateStr).toISOString(),
        assignedTo: formTask.assignedTo,
        assignedUserName: assignedName,
        category: formTask.category,
        condoId: selectedCondoId,
        photos: formTask.photos
      };

      db.saveTask(taskData);
      
      db.saveLog({
        id: Math.random().toString(36).substr(2, 9),
        userId: currentUser.id,
        userName: currentUser.name,
        action: isUpdate ? 'UPDATE' : 'CREATE',
        module: 'TASK',
        targetName: taskData.title,
        timestamp: new Date().toISOString(),
        condoId: selectedCondoId
      });
    });

    refreshTasks();
    setShowModal(false);
    notify(isUpdate ? 'Atualizado!' : `${datesToSave.length} tarefa(s) criada(s)!`);
  };

  const handleStatusTransition = (task: Task) => {
    if (task.status === TaskStatus.PENDING) {
      db.saveTask({ ...task, status: TaskStatus.IN_PROGRESS });
      refreshTasks();
      notify('Tarefa iniciada!');
    } else if (task.status === TaskStatus.IN_PROGRESS) {
      setTaskToComplete(task);
      setCompletionPhotos([]);
      setIsConfirmingFinal(false);
      setShowCompletionModal(true);
    }
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
      photos: [...(taskToComplete.photos || []), ...completionPhotos]
    };
    
    db.saveTask(updatedTask);
    db.saveLog({
      id: Math.random().toString(36).substr(2, 9),
      userId: currentUser.id,
      userName: currentUser.name,
      action: 'COMPLETE',
      module: 'TASK',
      targetName: taskToComplete.title,
      timestamp: new Date().toISOString(),
      condoId: selectedCondoId
    });

    refreshTasks();
    setShowCompletionModal(false);
    setTaskToComplete(null);
    setIsConfirmingFinal(false);
    notify('Tarefa concluída!');
  };

  const visibleTasks = useMemo(() => {
    const today = new Date();
    const condoTasks = tasks.filter(t => t.condoId === selectedCondoId);

    return condoTasks.filter(task => {
      const isManagement = currentUser.role === UserRole.SINDICO || currentUser.role === UserRole.GESTOR;
      const isAssignedToMe = task.assignedTo === currentUser.id;
      
      if (!isManagement && !isAssignedToMe) return false;

      const scheduled = new Date(task.scheduledFor);
      if (task.status === TaskStatus.COMPLETED) {
        return new Date(task.completedAt || '').toDateString() === today.toDateString();
      }
      switch (task.frequency) {
        case TaskFrequency.DAILY: return true;
        case TaskFrequency.WEEKLY: return scheduled.getDay() === today.getDay();
        case TaskFrequency.MONTHLY: return scheduled.getDate() === today.getDate();
        default: return scheduled.toDateString() === today.toDateString();
      }
    });
  }, [tasks, selectedCondoId, currentUser]);

  const filteredTasks = useMemo(() => {
    if (filter === 'ALL') return visibleTasks;
    if (filter === 'PERMANENT') return visibleTasks.filter(t => t.frequency !== TaskFrequency.ONCE);
    return visibleTasks.filter(t => t.status === filter);
  }, [visibleTasks, filter]);

  const counts = useMemo(() => ({
    all: visibleTasks.length,
    pending: visibleTasks.filter(t => t.status === TaskStatus.PENDING).length,
    permanent: visibleTasks.filter(t => t.frequency !== TaskFrequency.ONCE).length,
    completed: visibleTasks.filter(t => t.status === TaskStatus.COMPLETED).length
  }), [visibleTasks]);

  const canManage = [UserRole.SINDICO, UserRole.GESTOR, UserRole.ZELADOR].includes(currentUser.role);
  const canHandleCategory = [UserRole.SINDICO, UserRole.GESTOR, UserRole.ZELADOR].includes(currentUser.role);

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
          <div className="flex items-center gap-2 mb-1">
             <div className="w-2 h-6 bg-blue-600 rounded-full"></div>
             <h2 className="text-3xl font-black text-slate-900 tracking-tight">Rotina Operacional</h2>
          </div>
          <p className="text-slate-500 font-medium tracking-tight">
            {currentUser.role === UserRole.ZELADOR || currentUser.role === UserRole.LIMPEZA 
              ? 'Minhas tarefas e agendamentos para hoje' 
              : 'Tarefas permanentes e agendamentos para hoje'}
          </p>
        </div>
        
        {canManage && selectedCondoId && (
          <button 
            onClick={handleOpenAdd}
            className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-4 rounded-2xl flex items-center justify-center gap-3 font-black text-sm uppercase tracking-widest shadow-xl shadow-blue-500/20 transition-all active:scale-95"
          >
            <Icons.Add /> Nova Regra/Tarefa
          </button>
        )}
      </header>

      <div className="flex gap-4 overflow-x-auto pb-6 scrollbar-hide pt-2">
        {[
          { id: 'ALL', label: 'Tudo Hoje', count: counts.all, color: 'slate' },
          { id: 'PERMANENT', label: 'Permanentes', count: counts.permanent, color: 'blue' },
          { id: TaskStatus.PENDING, label: 'Pendentes', count: counts.pending, color: 'amber' },
          { id: TaskStatus.COMPLETED, label: 'Concluídas', count: counts.completed, color: 'green' },
        ].map((opt) => (
          <button
            key={opt.id}
            onClick={() => setFilter(opt.id as any)}
            className={`flex items-center gap-3 px-6 py-4 rounded-[24px] text-xs font-black uppercase tracking-widest transition-all border-2 shrink-0 ${
              filter === opt.id 
                ? 'bg-slate-900 text-white border-slate-900 shadow-xl shadow-slate-900/20 translate-y-[-4px]' 
                : 'bg-white text-slate-500 border-slate-100 hover:border-slate-300 hover:text-slate-900 shadow-sm'
            }`}
          >
            {opt.label}
            <span className={`ml-1 px-2 py-0.5 rounded-lg text-[10px] ${
              filter === opt.id ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-500'
            }`}>
              {opt.count}
            </span>
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {filteredTasks.map((task) => (
          <div 
            key={task.id} 
            className={`bg-white rounded-[32px] border-l-8 shadow-sm overflow-hidden flex flex-col hover:shadow-2xl transition-all duration-300 group ${
              task.frequency !== TaskFrequency.ONCE ? 'border-l-blue-600' : 'border-l-slate-200'
            } ${task.status === TaskStatus.COMPLETED ? 'opacity-60 grayscale' : 'opacity-100'}`}
          >
            <div className="p-8 flex-1 space-y-6">
              <div className="flex items-start justify-between">
                <div className="flex flex-col gap-2">
                  <span className={`text-[9px] font-black uppercase tracking-widest px-3 py-1 rounded-full w-fit ${
                    task.frequency === TaskFrequency.DAILY ? 'bg-blue-100 text-blue-700' : 
                    task.frequency === TaskFrequency.WEEKLY ? 'bg-purple-100 text-purple-700' : 
                    task.frequency === TaskFrequency.MONTHLY ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-600'
                  }`}>
                    {task.frequency !== TaskFrequency.ONCE && '🔄 '}{getFrequencyLabel(task.frequency)}
                  </span>
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{task.category}</span>
                </div>
                {canManage && (
                  <div className="flex items-center gap-1">
                    <button onClick={() => handleOpenEdit(task)} className="p-2 text-slate-300 hover:text-blue-600 rounded-xl transition-all">
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"></path></svg>
                    </button>
                    <button onClick={() => handleDeleteTask(task)} className="p-2 text-slate-300 hover:text-red-600 rounded-xl transition-all">
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>
                    </button>
                  </div>
                )}
              </div>
              
              <div>
                <h3 className="font-black text-slate-900 text-xl mb-2 group-hover:text-blue-600 transition-colors leading-tight">{task.title}</h3>
                <p className="text-sm text-slate-500 font-medium line-clamp-2 leading-relaxed">{task.description}</p>
              </div>

              {task.photos && task.photos.length > 0 && (
                <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
                   {task.photos.map((p, i) => (
                     <img key={i} src={p} className="w-12 h-12 rounded-lg object-cover border border-slate-100" alt="Referência" />
                   ))}
                </div>
              )}

              <div className="flex items-center justify-between text-[10px] font-black text-slate-400 uppercase tracking-widest pt-4 border-t border-slate-50">
                <div className="flex items-center gap-2">
                  <Icons.Schedule />
                  <span className="text-slate-600">Ref: {new Date(task.scheduledFor).toLocaleDateString('pt-BR')}</span>
                </div>
                <div className="flex items-center gap-1 text-blue-600">
                  <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse"></span>
                  {task.assignedUserName?.split(' ')[0]}
                </div>
              </div>
            </div>

            <div className="p-6 bg-slate-50/50 flex gap-3">
              {task.status !== TaskStatus.COMPLETED ? (
                <button 
                  onClick={() => handleStatusTransition(task)}
                  className={`flex-1 text-white py-4 rounded-2xl text-xs font-black uppercase tracking-widest active:scale-95 transition-all shadow-xl ${
                    task.status === TaskStatus.PENDING ? 'bg-blue-600 shadow-blue-500/20' : 'bg-green-600 shadow-green-500/20'
                  }`}
                >
                  {task.status === TaskStatus.PENDING ? 'Iniciar Agora' : 'Finalizar Serviço'}
                </button>
              ) : (
                <div className="flex-1 text-center py-4 text-green-600 font-black text-xs uppercase tracking-widest">
                  ✓ Realizado Hoje
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {showModal && (
        <div className="fixed inset-0 z-[150] flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-md">
          <div className="bg-white w-full max-w-xl rounded-[40px] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300 flex flex-col max-h-[90vh]">
            <div className="px-10 py-8 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <h3 className="text-2xl font-black text-slate-900 tracking-tight">{editingTask ? 'Ajustar Regra' : 'Nova Tarefa Operacional'}</h3>
              <button onClick={() => setShowModal(false)} className="p-3 text-slate-400 hover:bg-white rounded-2xl">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M6 18L18 6M6 6l12 12"></path></svg>
              </button>
            </div>
            <form onSubmit={handleSaveTask} className="flex-1 overflow-y-auto p-10 space-y-6 scrollbar-hide">
              <input type="text" required placeholder="Título da Atividade" className="w-full h-14 px-6 rounded-2xl border-2 border-slate-100 focus:border-blue-500 font-bold bg-slate-50 outline-none" value={formTask.title} onChange={e => setFormTask({...formTask, title: e.target.value})} />
              
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-black uppercase text-slate-400 ml-2">Frequência / Repetição</label>
                  <select className="w-full h-14 px-6 rounded-2xl border-2 border-slate-100 font-bold bg-slate-50 cursor-pointer" value={formTask.frequency} onChange={e => setFormTask({...formTask, frequency: e.target.value as any})}>
                    <option value={TaskFrequency.DAILY}>🔄 Todos os dias</option>
                    <option value={TaskFrequency.WEEKLY}>📅 Semanalmente</option>
                    <option value={TaskFrequency.MONTHLY}>🗓️ Mensalmente</option>
                    <option value={TaskFrequency.ONCE}>📍 Datas Aleatórias / Única</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-black uppercase text-slate-400 ml-2">Atribuir a</label>
                  <select className="w-full h-14 px-6 rounded-2xl border-2 border-slate-100 font-bold bg-slate-50" value={formTask.assignedTo} onChange={e => setFormTask({...formTask, assignedTo: e.target.value})}>
                    <optgroup label="Equipe Interna">
                      {condoWorkers.map(w => <option key={w.id} value={w.id}>{w.name} ({w.role.split('_')[0]})</option>)}
                    </optgroup>
                    <optgroup label="Prestadores Externos">
                      {condoVendors.map(v => <option key={v.id} value={v.id}>🛠️ {v.name} ({v.category})</option>)}
                    </optgroup>
                  </select>
                </div>
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between px-2">
                  <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest">
                    {formTask.frequency === TaskFrequency.ONCE ? 'Datas Selecionadas' : 'Data Inicial'}
                  </label>
                  {!editingTask && formTask.frequency === TaskFrequency.ONCE && (
                    <button type="button" onClick={handleAddDateSlot} className="text-[9px] font-black text-blue-600 uppercase hover:underline">+ Adicionar Data</button>
                  )}
                </div>
                
                <div className="space-y-2">
                  {formTask.dates.map((date, idx) => (
                    <div key={idx} className="flex gap-2 animate-in fade-in slide-in-from-top-1 duration-200">
                      <input 
                        type="datetime-local" 
                        required
                        className="flex-1 h-14 px-6 rounded-2xl border-2 border-slate-100 font-bold bg-slate-50" 
                        value={date} 
                        onChange={e => handleDateChange(idx, e.target.value)} 
                      />
                      {!editingTask && formTask.frequency === TaskFrequency.ONCE && formTask.dates.length > 1 && (
                        <button 
                          type="button" 
                          onClick={() => handleRemoveDateSlot(idx)}
                          className="w-14 h-14 flex items-center justify-center bg-red-50 text-red-400 rounded-2xl border-2 border-red-50 hover:bg-red-100 hover:text-red-600 transition-colors"
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M6 18L18 6M6 6l12 12"></path></svg>
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              <div className="space-y-1">
                <div className="flex items-center justify-between px-2">
                  <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Categoria</label>
                  {canHandleCategory && (
                    <button type="button" onClick={() => setShowCategoryManager(true)} className="text-[9px] font-black text-blue-600 uppercase hover:underline">Gerenciar</button>
                  )}
                </div>
                <select className="w-full h-14 px-6 rounded-2xl border-2 border-slate-100 font-bold bg-slate-50" value={formTask.category} onChange={e => setFormTask({...formTask, category: e.target.value})}>
                  {categories.map(cat => <option key={cat} value={cat}>{cat}</option>)}
                </select>
              </div>

              <textarea rows={3} placeholder="Instruções permanentes..." className="w-full p-6 rounded-2xl border-2 border-slate-100 focus:border-blue-500 font-medium bg-slate-50 outline-none" value={formTask.description} onChange={e => setFormTask({...formTask, description: e.target.value})} />

              <div className="space-y-3">
                <label className="text-[10px] font-black uppercase text-slate-400 ml-2 tracking-widest">Fotos de Referência (Opcional)</label>
                <div className="grid grid-cols-4 gap-3">
                  {formTask.photos.map((photo, idx) => (
                    <div key={idx} className="relative aspect-square">
                      <img src={photo} className="w-full h-full object-cover rounded-xl border border-slate-100 shadow-sm" alt="Ref" />
                      <button type="button" onClick={() => setFormTask(prev => ({...prev, photos: prev.photos.filter((_, i) => i !== idx)}))} className="absolute -top-1 -right-1 bg-red-500 text-white w-5 h-5 rounded-full flex items-center justify-center text-[10px] shadow-lg">×</button>
                    </div>
                  ))}
                  <button 
                    type="button"
                    onClick={() => formPhotoRef.current?.click()}
                    className="aspect-square border-2 border-dashed border-slate-200 rounded-xl flex items-center justify-center text-slate-400 hover:border-blue-500 hover:text-blue-500 transition-all bg-slate-50"
                  >
                    {isUploading ? <div className="w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div> : <Icons.Camera />}
                  </button>
                  <input type="file" ref={formPhotoRef} className="hidden" accept="image/*" onChange={handleFormPhotoUpload} />
                </div>
              </div>

              <button type="submit" className="w-full h-16 bg-blue-600 text-white font-black rounded-3xl shadow-xl uppercase tracking-widest transition-all hover:bg-blue-700 active:scale-95 sticky bottom-0">
                {editingTask ? 'Salvar Alterações' : formTask.dates.length > 1 ? `Criar ${formTask.dates.length} Tarefas` : 'Criar Tarefa Permanente'}
              </button>
            </form>
          </div>
        </div>
      )}

      {showCategoryManager && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-slate-900/90 backdrop-blur-xl">
          <div className="bg-white w-full max-w-md rounded-[40px] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300">
            <div className="p-8 border-b border-slate-100 flex items-center justify-between">
              <h3 className="text-xl font-black text-slate-900">Gerenciar Categorias</h3>
              <button onClick={() => setShowCategoryManager(false)} className="p-2 text-slate-400"><Icons.Add className="rotate-45" /></button>
            </div>
            <div className="p-8 space-y-6">
              <div className="space-y-3 max-h-[40vh] overflow-y-auto pr-2 scrollbar-hide">
                {categories.map(cat => (
                  <div key={cat} className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-100 group">
                    <span className="font-bold text-slate-700">{cat}</span>
                    <button onClick={() => handleDeleteCategory(cat)} className="p-2 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-all">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>
                    </button>
                  </div>
                ))}
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase text-slate-400 ml-2">Nova Categoria</label>
                <div className="flex gap-2">
                  <input type="text" placeholder="Nome da categoria..." className="flex-1 h-12 px-4 rounded-xl border-2 border-slate-100 focus:border-blue-500 font-bold bg-slate-50 outline-none" value={newCategoryName} onChange={e => setNewCategoryName(e.target.value)} />
                  <button onClick={handleAddCategory} className="bg-blue-600 text-white w-12 h-12 rounded-xl flex items-center justify-center shrink-0"><Icons.Add /></button>
                </div>
              </div>
              <button onClick={() => setShowCategoryManager(false)} className="w-full py-4 bg-slate-900 text-white font-black rounded-2xl text-xs uppercase tracking-widest">Fechar</button>
            </div>
          </div>
        </div>
      )}

      {showCompletionModal && (
        <div className="fixed inset-0 z-[160] flex items-center justify-center p-4 bg-slate-900/90 backdrop-blur-xl">
          <div className="bg-white w-full max-w-lg rounded-[48px] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300">
            <div className="p-10 text-center space-y-6">
              <div className="w-20 h-20 bg-blue-50 text-blue-600 rounded-[32px] flex items-center justify-center mx-auto border border-blue-100">
                <Icons.Camera />
              </div>
              <h3 className="text-2xl font-black text-slate-900 tracking-tight">Comprovar Realização</h3>
              <p className="text-slate-500 font-medium mt-2">Tire fotos do local/serviço para finalizar o registro de hoje.</p>

              <div className="grid grid-cols-3 gap-3 min-h-[100px]">
                {completionPhotos.map((photo, index) => (
                  <div key={index} className="relative aspect-square">
                    <img src={photo} className="w-full h-full object-cover rounded-2xl border border-slate-100 shadow-sm" alt="Preview" />
                    <button onClick={() => setCompletionPhotos(p => p.filter((_, i) => i !== index))} className="absolute -top-2 -right-2 bg-red-500 text-white p-1 rounded-full shadow-lg"><Icons.Add className="rotate-45" /></button>
                  </div>
                ))}
                <button 
                  onClick={() => fileInputRef.current?.click()}
                  className="aspect-square border-2 border-dashed border-slate-200 rounded-2xl flex flex-col items-center justify-center text-slate-400 hover:border-blue-500 transition-all bg-slate-50"
                >
                  <Icons.Camera />
                </button>
              </div>
              <input type="file" ref={fileInputRef} onChange={e => {
                const file = e.target.files?.[0];
                if (file) {
                  const reader = new FileReader();
                  reader.onloadend = () => setCompletionPhotos(p => [...p, reader.result as string]);
                  reader.readAsDataURL(file);
                }
              }} className="hidden" accept="image/*" />

              <div className="flex flex-col gap-3 pt-4">
                <button 
                  onClick={confirmCompletion}
                  disabled={completionPhotos.length === 0}
                  className="w-full h-16 bg-green-600 text-white rounded-3xl font-black text-xs uppercase tracking-[0.2em] shadow-xl active:scale-95 disabled:opacity-50"
                >
                  Confirmar Finalização
                </button>
                <button onClick={() => setShowCompletionModal(false)} className="w-full h-14 text-slate-400 font-black text-[10px] uppercase tracking-widest">Cancelar</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Tasks;
