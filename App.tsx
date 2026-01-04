
import React, { useState, useEffect, useCallback } from 'react';
import Layout from './components/Layout';
import Dashboard from './components/Dashboard';
import Tasks from './components/Tasks';
import Users from './components/Users';
import Condos from './components/Condos';
import Schedule from './components/Schedule';
import Messages from './components/Messages';
import ServiceHub from './components/ServiceHub';
import Reports from './components/Reports';
import Login from './components/Login';
import { User, UserRole, Condo, TaskStatus } from './types';
import { db } from './services/db';

const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [selectedCondoId, setSelectedCondoId] = useState<string>('');
  const [availableCondos, setAvailableCondos] = useState<Condo[]>([]);
  const [notification, setNotification] = useState<{message: string, type: 'success' | 'error'} | null>(null);

  const notify = (message: string, type: 'success' | 'error' = 'success') => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 3000);
  };

  const checkAndNotifyTasks = useCallback(async (user: User, condoId: string) => {
    if (!('Notification' in window) || Notification.permission !== 'granted') return;

    const tasks = db.getTasksByCondo(condoId);
    const today = new Date().toDateString();
    
    const myTasksToday = tasks.filter(t => 
      t.assignedTo === user.id && 
      t.status === TaskStatus.PENDING &&
      new Date(t.scheduledFor).toDateString() === today
    );

    if (myTasksToday.length > 0) {
      const registration = await navigator.serviceWorker.ready;
      registration.showNotification('ZeladorCheck: Tarefas de Hoje', {
        body: `Você tem ${myTasksToday.length} tarefa(s) pendente(s) para realizar hoje.`,
        icon: '/favicon.ico',
        badge: '/favicon.ico',
        vibrate: [200, 100, 200],
        tag: 'daily-tasks'
      } as any);
    }
  }, []);

  const requestNotificationPermission = async () => {
    if ('Notification' in window && Notification.permission === 'default') {
      const permission = await Notification.requestPermission();
      if (permission === 'granted') {
        notify('Notificações ativadas com sucesso!');
      }
    }
  };

  const refreshCondos = () => {
    const condos = db.getCondos();
    setAvailableCondos(condos);
    if (selectedCondoId && !condos.find(c => c.id === selectedCondoId)) {
      setSelectedCondoId(condos[0]?.id || '');
    }
  };

  useEffect(() => {
    const savedUser = localStorage.getItem('zc_user');
    if (savedUser) {
      const user = JSON.parse(savedUser) as User;
      setCurrentUser(user);
      setIsLoggedIn(true);
      const condos = db.getCondos();
      setAvailableCondos(condos);
      const initialCondo = user.condoId || condos[0]?.id || '';
      setSelectedCondoId(initialCondo);
      
      if (initialCondo) checkAndNotifyTasks(user, initialCondo);
    }
  }, [checkAndNotifyTasks]);

  const handleLogin = (user: User) => {
    setCurrentUser(user);
    setIsLoggedIn(true);
    localStorage.setItem('zc_user', JSON.stringify(user));
    const condos = db.getCondos();
    setAvailableCondos(condos);
    const initialCondo = user.condoId || condos[0]?.id || '';
    setSelectedCondoId(initialCondo);
    setActiveTab(user.role === UserRole.SINDICO || user.role === UserRole.GESTOR ? 'dashboard' : 'tasks');
    notify(`Bem-vindo, ${user.name.split(' ')[0]}!`);
    
    requestNotificationPermission();
    if (initialCondo) checkAndNotifyTasks(user, initialCondo);
  };

  const handleLogout = () => {
    setIsLoggedIn(false);
    setCurrentUser(null);
    localStorage.removeItem('zc_user');
    setActiveTab('dashboard');
    notify('Sessão encerrada.');
  };

  if (!isLoggedIn || !currentUser) return <Login onLogin={handleLogin} />;

  const renderContent = () => {
    switch (activeTab) {
      case 'dashboard': return <Dashboard currentUser={currentUser} onNavigate={setActiveTab} selectedCondoId={selectedCondoId} />;
      case 'condos': return <Condos onSelectCondo={(id) => { setSelectedCondoId(id); checkAndNotifyTasks(currentUser, id); setActiveTab('dashboard'); }} onRefresh={refreshCondos} notify={notify} currentUser={currentUser} />;
      case 'procurement': return <ServiceHub selectedCondoId={selectedCondoId} notify={notify} currentUser={currentUser} />;
      case 'reports': return <Reports selectedCondoId={selectedCondoId} notify={notify} currentUser={currentUser} />;
      case 'tasks': return <Tasks currentUser={currentUser} selectedCondoId={selectedCondoId} notify={notify} />;
      case 'schedule': return <Schedule selectedCondoId={selectedCondoId} currentUser={currentUser} notify={notify} />;
      case 'messages': return <Messages currentUser={currentUser} selectedCondoId={selectedCondoId} notify={notify} />;
      case 'users': return <Users notify={notify} currentUser={currentUser} filterCondoId={selectedCondoId} />;
      default: return <Dashboard currentUser={currentUser} onNavigate={setActiveTab} selectedCondoId={selectedCondoId} />;
    }
  };

  return (
    <Layout 
      activeTab={activeTab} setActiveTab={setActiveTab} currentUser={currentUser} onLogout={handleLogout}
      selectedCondoId={selectedCondoId} setSelectedCondoId={(id) => { setSelectedCondoId(id); checkAndNotifyTasks(currentUser, id); }} availableCondos={availableCondos}
    >
      {notification && (
        <div className={`fixed top-6 right-6 z-[200] px-6 py-4 rounded-2xl shadow-2xl animate-in slide-in-from-right-4 duration-300 flex items-center gap-3 font-black text-xs uppercase tracking-widest border no-print ${notification.type === 'success' ? 'bg-green-600 text-white border-green-500' : 'bg-red-600 text-white border-red-500'}`}>
          {notification.message}
        </div>
      )}
      {renderContent()}
    </Layout>
  );
};

export default App;
