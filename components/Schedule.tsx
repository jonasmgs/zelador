
import React, { useMemo, useState, useRef, useEffect } from 'react';
import { db } from '../services/db';
import { Icons } from '../constants';
import { TaskStatus, Task, TaskFrequency, User, UserRole, Log, Vendor } from '../types';

interface ScheduleProps {
  selectedCondoId: string;
  currentUser: User;
  notify: (msg: string, type?: 'success' | 'error') => void;
}

const Schedule: React.FC<ScheduleProps> = ({ selectedCondoId, currentUser, notify }) => {
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [showModal, setShowModal] = useState(false);
  const [showCategoryManager, setShowCategoryManager] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [categories, setCategories] = useState<string[]>([]);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [condoVendors, setCondoVendors] = useState<Vendor[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [formTask, setFormTask] = useState({
    title: '',
    description: '',
    category: 'Manutenção',
    dates: [new Date().toISOString().slice(0, 16)],
    assignedTo: '',
    photos: [] as string[]
  });

  const refreshCategories = () => {
    setCategories(db.getCategories());
  };

  useEffect(() => {
    refreshCategories();
    setCondoVendors(db.getVendorsByCondo(selectedCondoId));
  }, [refreshTrigger, selectedCondoId]);

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
    if (window.confirm(`Excluir permanentemente o agendamento "${task.title}"?`)) {
      db.deleteTask(task.id);
      db.saveLog({
        id: Math.random().toString(36).substr(2, 9),
        userId: currentUser.id,
        userName: currentUser.name,
        action: 'DELETE',
        module: 'SCHEDULE',
        targetName: task.title,
        timestamp: new Date().toISOString(),
        condoId: selectedCondoId
      });
      setRefreshTrigger(prev => prev + 1);
      notify('Agendamento excluído.');
    }
  };

  const tasks = useMemo(() => {
    const allTasks = db.getTasks().filter(t => t.condoId === selectedCondoId && t.status !== TaskStatus.COMPLETED);
    
    return allTasks.filter(task => {
      const isManagement = currentUser.role === UserRole.SINDICO || currentUser.role === UserRole.GESTOR;
      const isAssignedToMe = task.assignedTo === currentUser.id;
      return isManagement || isAssignedToMe;
    }).sort((a, b) => new Date(a.scheduledFor).getTime() - new Date(b.scheduledFor).getTime());
  }, [selectedCondoId, refreshTrigger, currentUser]);

  const condoUsers = useMemo(() => 
    db.getUsersByCondo(selectedCondoId).filter(u => 
      u.role === UserRole.ZELADOR || u.role === UserRole.LIMPEZA || u.role === UserRole.GESTOR
    ),
  [selectedCondoId]);

  const canManage = [UserRole.SINDICO, UserRole.GESTOR, UserRole.ZELADOR].includes(currentUser.role);
  const canHandleCategory = [UserRole.SINDICO, UserRole.GESTOR, UserRole.ZELADOR].includes(currentUser.role);

  const handleOpenAdd = () => {
    setEditingTask(null);
    const defaultUser = condoUsers.find(u => u.id !== currentUser.id) || condoUsers[0];
    setFormTask({
      title: '',
      description: '',
      category: categories[0] || 'Manutenção',
      dates: [new Date().toISOString().slice(0, 16)],
      assignedTo: defaultUser?.id || currentUser.id,
      photos: []
    });
    setShowModal(true);
  };

  const handleOpenEdit = (task: Task) => {
    setEditingTask(task);
    setFormTask({
      title: task.title,
      description: task.description,
      category: task.category,
      dates: [new Date(task.scheduledFor).toISOString().slice(0, 16)],
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

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
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
    if (!selectedCondoId) return;
    try {
      const assignedUser = db.getUsers().find(u => u.id === formTask.assignedTo);
      const assignedVendor = condoVendors.find(v => v.id === formTask.assignedTo);
      const assignedName = assignedUser?.name || assignedVendor?.name || 'Não atribuído';

      const isUpdate = !!editingTask;
      
      const datesToSave = isUpdate ? [formTask.dates[0]] : formTask.dates;

      datesToSave.forEach(dateStr => {
        const taskData: Task = isUpdate ? {
          ...editingTask!,
          title: formTask.title,
          description: formTask.description,
          category: formTask.category,
          scheduledFor: new Date(dateStr).toISOString(),
          assignedTo: formTask.assignedTo,
          assignedUserName: assignedName,
          photos: formTask.photos
        } : {
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

      setRefreshTrigger(prev => prev + 1);
      setShowModal(false);
      notify(isUpdate ? 'Atualizado!' : `${datesToSave.length} agendamento(s) criado(s)!`);
    } catch (err) {
      notify('Erro ao salvar.', 'error');
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h2 className="text-3xl font-black text-slate-900 tracking-tight">Agenda de Serviços</h2>
          <p className="text-slate-500 font-medium">Cronograma operacional de longo prazo</p>
        </div>
        {canManage && selectedCondoId && (
          <button onClick={handleOpenAdd} className="bg-blue-600 text-white px-8 py-4 rounded-2xl flex items-center gap-3 font-black text-sm uppercase tracking-widest shadow-xl shadow-blue-500/20 active:scale-95 transition-all">
            <Icons.Add /> Agendar Serviço
          </button>
        )}
      </header>

      <div className="bg-white rounded-[40px] border border-slate-200 p-8 shadow-sm">
        {tasks.length > 0 ? (
          <div className="space-y-6">
            {tasks.map((task) => (
              <div key={task.id} className="flex gap-6 items-start group">
                <div className="flex flex-col items-center min-w-[70px] bg-slate-50 py-3 rounded-2xl border border-slate-100 group-hover:bg-blue-50 transition-colors">
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{new Date(task.scheduledFor).toLocaleDateString('pt-BR', { weekday: 'short' })}</span>
                  <span className="text-2xl font-black text-slate-900 mt-1">{new Date(task.scheduledFor).getDate()}</span>
                </div>
                <div className="flex-1 bg-white rounded-3xl p-6 border border-slate-100 group-hover:border-blue-200 transition-all shadow-sm">
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <h4 className="font-bold text-slate-900 text-lg">{task.title}</h4>
                      <span className="text-[10px] font-black uppercase text-blue-600 bg-blue-50 px-4 py-1 rounded-full">{task.category}</span>
                    </div>
                    {canManage && (
                      <div className="flex items-center gap-2">
                        <button onClick={() => handleOpenEdit(task)} className="p-2 text-slate-400 hover:text-blue-600 rounded-xl">
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"></path></svg>
                        </button>
                        <button onClick={() => handleDeleteTask(task)} className="p-2 text-slate-400 hover:text-red-600 rounded-xl">
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>
                        </button>
                      </div>
                    )}
                  </div>
                  <p className="text-sm text-slate-500 font-medium mb-4">{task.description}</p>
                  
                  {task.photos && task.photos.length > 0 && (
                    <div className="flex gap-2 mb-4 overflow-x-auto pb-2 scrollbar-hide">
                      {task.photos.map((p, i) => (
                        <img key={i} src={p} className="w-16 h-16 object-cover rounded-xl border border-slate-100 shadow-sm shrink-0" alt="Anexo" />
                      ))}
                    </div>
                  )}

                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                      <Icons.Schedule />
                      {new Date(task.scheduledFor).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                    </div>
                    <div className="text-[9px] font-black text-blue-600 uppercase bg-blue-50 px-3 py-1 rounded-md">
                      Resp: {task.assignedUserName}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="py-20 text-center flex flex-col items-center text-slate-300">
            <Icons.Schedule />
            <p className="text-slate-400 font-black uppercase text-xs mt-4">Nenhum serviço agendado para você.</p>
          </div>
        )}
      </div>

      {showModal && (
        <div className="fixed inset-0 z-[150] flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-md">
          <div className="bg-white w-full max-w-xl rounded-[40px] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300 flex flex-col max-h-[95vh]">
            <div className="px-10 py-8 border-b border-slate-100 flex items-center justify-between">
              <h3 className="text-2xl font-black text-slate-900">{editingTask ? 'Editar' : 'Novo'} Agendamento</h3>
              <button onClick={() => setShowModal(false)} className="p-3 text-slate-400"><Icons.Add className="rotate-45" /></button>
            </div>
            <form onSubmit={handleSaveTask} className="flex-1 overflow-y-auto p-10 space-y-6 scrollbar-hide">
              <input type="text" required placeholder="Título" className="w-full h-14 px-6 rounded-2xl border-2 border-slate-100 focus:border-blue-500 font-bold bg-slate-50" value={formTask.title} onChange={e => setFormTask({...formTask, title: e.target.value})} />
              <textarea rows={2} placeholder="Descrição" className="w-full p-6 rounded-2xl border-2 border-slate-100 focus:border-blue-500 bg-slate-50 font-medium" value={formTask.description} onChange={e => setFormTask({...formTask, description: e.target.value})} />
              
              <div className="space-y-1">
                <div className="flex items-center justify-between px-2">
                  <label className="text-[10px] font-black uppercase text-slate-400">Datas Agendadas</label>
                  {!editingTask && (
                    <button type="button" onClick={handleAddDateSlot} className="text-[9px] font-black text-blue-600 uppercase hover:underline">+ Adicionar Data</button>
                  )}
                </div>
                <div className="space-y-2">
                  {formTask.dates.map((date, idx) => (
                    <div key={idx} className="flex gap-2 animate-in fade-in slide-in-from-top-1">
                      <input type="datetime-local" required className="flex-1 h-14 px-6 rounded-2xl border-2 border-slate-100 font-bold bg-slate-50" value={date} onChange={e => handleDateChange(idx, e.target.value)} />
                      {!editingTask && formTask.dates.length > 1 && (
                        <button type="button" onClick={() => handleRemoveDateSlot(idx)} className="w-14 h-14 flex items-center justify-center bg-red-50 text-red-400 rounded-2xl"><Icons.Add className="rotate-45" /></button>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <div className="flex items-center justify-between px-2">
                    <label className="text-[10px] font-black uppercase text-slate-400">Categoria</label>
                    {canHandleCategory && (
                      <button type="button" onClick={() => setShowCategoryManager(true)} className="text-[9px] font-black text-blue-600 uppercase hover:underline">Gerenciar</button>
                    )}
                  </div>
                  <select className="w-full h-14 px-6 rounded-2xl border-2 border-slate-100 font-bold bg-slate-50 cursor-pointer" value={formTask.category} onChange={e => setFormTask({...formTask, category: e.target.value})}>
                    {categories.map(cat => <option key={cat} value={cat}>{cat}</option>)}
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-black uppercase text-slate-400 ml-2">Atribuir a</label>
                  <select className="w-full h-14 px-6 rounded-2xl border-2 border-slate-100 font-bold bg-slate-50 cursor-pointer" value={formTask.assignedTo} onChange={e => setFormTask({...formTask, assignedTo: e.target.value})}>
                    <optgroup label="Equipe Interna">
                      {condoUsers.map(u => <option key={u.id} value={u.id}>{u.name} ({u.role})</option>)}
                    </optgroup>
                    <optgroup label="Prestadores Externos">
                      {condoVendors.map(v => <option key={v.id} value={v.id}>🛠️ {v.name} ({v.category})</option>)}
                    </optgroup>
                  </select>
                </div>
              </div>

              <div className="space-y-3">
                <label className="text-[10px] font-black uppercase text-slate-400 ml-2 tracking-widest">Anexar Fotos / Comprovantes</label>
                <div className="grid grid-cols-4 gap-3">
                  {formTask.photos.map((photo, idx) => (
                    <div key={idx} className="relative aspect-square">
                      <img src={photo} className="w-full h-full object-cover rounded-xl border border-slate-100 shadow-sm" alt="Anexo" />
                      <button type="button" onClick={() => setFormTask(prev => ({...prev, photos: prev.photos.filter((_, i) => i !== idx)}))} className="absolute -top-1 -right-1 bg-red-500 text-white w-5 h-5 rounded-full flex items-center justify-center text-[10px] shadow-lg">×</button>
                    </div>
                  ))}
                  <button 
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="aspect-square border-2 border-dashed border-slate-200 rounded-xl flex items-center justify-center text-slate-400 hover:border-blue-500 hover:text-blue-500 transition-all bg-slate-50"
                  >
                    {isUploading ? <div className="w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div> : <Icons.Camera />}
                  </button>
                  <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleFileChange} />
                </div>
              </div>

              <div className="pt-6 flex gap-4">
                <button type="button" onClick={() => setShowModal(false)} className="flex-1 h-16 border-2 border-slate-100 text-slate-500 font-black rounded-3xl text-xs uppercase tracking-widest">Cancelar</button>
                <button type="submit" className="flex-[2] h-16 bg-blue-600 text-white font-black rounded-3xl shadow-xl shadow-blue-500/20 uppercase tracking-widest active:scale-95 transition-all">
                  {editingTask ? 'Salvar Alterações' : 'Confirmar Agendamento(s)'}
                </button>
              </div>
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
                  <input type="text" placeholder="Nome..." className="flex-1 h-12 px-4 rounded-xl border-2 border-slate-100 font-bold bg-slate-50 outline-none" value={newCategoryName} onChange={e => setNewCategoryName(e.target.value)} />
                  <button onClick={handleAddCategory} className="bg-blue-600 text-white w-12 h-12 rounded-xl flex items-center justify-center shrink-0"><Icons.Add /></button>
                </div>
              </div>
              <button onClick={() => setShowCategoryManager(false)} className="w-full py-4 bg-slate-900 text-white font-black rounded-2xl text-xs uppercase tracking-widest">Fechar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Schedule;
