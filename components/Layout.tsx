
import React, { useState } from 'react';
import { Icons } from '../constants';
import { UserRole, User, Condo } from '../types';

interface LayoutProps {
  children: React.PreactElement;
  activeTab: string;
  setActiveTab: (tab: string) => void;
  currentUser: User;
  onLogout: () => void;
  selectedCondoId: string;
  setSelectedCondoId: (id: string) => void;
  availableCondos: Condo[];
}

const Layout: React.FC<LayoutProps> = ({ 
  children, 
  activeTab, 
  setActiveTab, 
  currentUser, 
  onLogout,
  selectedCondoId,
  setSelectedCondoId,
  availableCondos
}) => {
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const menuItems = [
    { id: 'dashboard', label: 'Início', icon: Icons.Dashboard, roles: [UserRole.SINDICO, UserRole.GESTOR, UserRole.ZELADOR, UserRole.LIMPEZA, UserRole.PORTEIRO] },
    { id: 'condos', label: 'Unidades', icon: () => (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"></path></svg>
    ), roles: [UserRole.SINDICO, UserRole.GESTOR] },
    { id: 'procurement', label: 'Suprimentos', icon: () => (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z"></path></svg>
    ), roles: [UserRole.SINDICO, UserRole.GESTOR] },
    { id: 'reports', label: 'Relatórios & IA', icon: () => (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 17v-2m3 2v-4m3 2v-6m-9 9h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"></path></svg>
    ), roles: [UserRole.SINDICO, UserRole.GESTOR, UserRole.ZELADOR, UserRole.LIMPEZA, UserRole.PORTEIRO] },
    { id: 'users', label: 'Equipe', icon: () => (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"></path></svg>
    ), roles: [UserRole.SINDICO, UserRole.GESTOR, UserRole.ZELADOR] },
    { id: 'tasks', label: 'Checklist', icon: Icons.Tasks, roles: [UserRole.SINDICO, UserRole.GESTOR, UserRole.ZELADOR, UserRole.LIMPEZA, UserRole.PORTEIRO] },
    { id: 'schedule', label: 'Agenda', icon: Icons.Schedule, roles: [UserRole.SINDICO, UserRole.GESTOR, UserRole.ZELADOR, UserRole.LIMPEZA, UserRole.PORTEIRO] },
    { id: 'messages', label: 'Mural', icon: Icons.Messages, roles: [UserRole.SINDICO, UserRole.GESTOR, UserRole.ZELADOR, UserRole.LIMPEZA, UserRole.PORTEIRO] },
  ];

  const filteredItems = menuItems.filter(item => item.roles.includes(currentUser.role));

  const roleLabels: Record<UserRole, string> = {
    [UserRole.SINDICO]: 'Síndico',
    [UserRole.GESTOR]: 'Gestor',
    [UserRole.ZELADOR]: 'Zelador',
    [UserRole.LIMPEZA]: 'Limpeza',
    [UserRole.PORTEIRO]: 'Porteiro',
  };

  const showCondoSelector = (currentUser.role === UserRole.SINDICO || currentUser.role === UserRole.GESTOR) && availableCondos.length > 0;

  const handleTabSelect = (id: string) => {
    setActiveTab(id);
    setIsMobileMenuOpen(false);
  };

  const SidebarContent = ({ isMobile = false }) => (
    <div className="flex flex-col h-full">
      <div className={`pt-8 pb-8 flex items-center ${isMobile || !isSidebarCollapsed ? 'px-8' : 'px-0 justify-center'}`}>
        <div className="flex items-center gap-3">
          <div className="bg-blue-600 w-9 h-9 rounded text-white shadow-lg flex items-center justify-center font-black text-lg">ZC</div>
          {(isMobile || !isSidebarCollapsed) && (
            <span className="text-lg font-black tracking-tight text-white uppercase">ZeladorCheck</span>
          )}
        </div>
      </div>

      {showCondoSelector && (isMobile || !isSidebarCollapsed) && (
        <div className="px-6 mb-6">
          <div className="bg-slate-800 border border-slate-700 p-3 rounded">
            <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1.5 block">Unidade Ativa</label>
            <select 
              value={selectedCondoId} 
              onChange={(e) => setSelectedCondoId(e.target.value)} 
              className="w-full bg-slate-900 border-none rounded-sm px-2 py-1.5 text-xs font-bold text-blue-400 outline-none cursor-pointer"
            >
              {availableCondos.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
        </div>
      )}

      <nav className="flex-1 px-3 space-y-1 overflow-y-auto scrollbar-hide">
        {filteredItems.map((item) => (
          <button 
            key={item.id} 
            onClick={() => handleTabSelect(item.id)} 
            className={`flex items-center w-full transition-all duration-200 group ${isMobile || !isSidebarCollapsed ? 'px-4 py-3' : 'p-3 justify-center'} text-[11px] font-bold uppercase tracking-wider rounded-md ${activeTab === item.id ? 'bg-blue-600 text-white shadow-lg shadow-blue-900/40' : 'text-slate-400 hover:bg-slate-800 hover:text-white'}`}
          >
            <div className="shrink-0 scale-90"><item.icon /></div>
            {(isMobile || !isSidebarCollapsed) && <span className="ml-3 whitespace-nowrap">{item.label}</span>}
          </button>
        ))}
      </nav>

      <div className="p-4 border-t border-slate-800">
        <div className={`flex items-center gap-3 mb-4 bg-slate-800 p-3 rounded-md ${!isMobile && isSidebarCollapsed ? 'justify-center' : ''}`}>
          <div className="w-8 h-8 rounded bg-blue-500 flex items-center justify-center text-xs font-black text-white shrink-0">{currentUser.name.charAt(0)}</div>
          {(isMobile || !isSidebarCollapsed) && (
            <div className="flex-1 overflow-hidden">
              <p className="text-xs font-bold truncate text-white">{currentUser.name}</p>
              <p className="text-[9px] text-slate-500 font-black uppercase tracking-widest">{currentUser.jobTitle || roleLabels[currentUser.role]}</p>
            </div>
          )}
        </div>
        <button onClick={onLogout} className={`flex items-center ${isMobile || !isSidebarCollapsed ? 'w-full px-3 py-2' : 'justify-center w-full py-2'} text-[10px] font-black uppercase text-slate-500 hover:text-red-400 transition-colors`}>
          <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" /></svg>
          {(isMobile || !isSidebarCollapsed) && <span className="ml-2">Logout</span>}
        </button>
      </div>
    </div>
  );

  return (
    <div className="flex h-screen bg-slate-100 overflow-hidden font-sans select-none">
      <aside className={`hidden md:flex flex-col bg-slate-900 text-white transition-all duration-300 relative ${isSidebarCollapsed ? 'w-20' : 'w-64'}`}>
        <button 
          onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
          className="absolute -right-3 top-10 bg-blue-600 text-white w-6 h-6 rounded flex items-center justify-center shadow-lg hover:bg-blue-700 transition-all z-50"
        >
          <svg className={`w-4 h-4 transition-transform ${isSidebarCollapsed ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M15 19l-7-7 7-7" /></svg>
        </button>
        <SidebarContent />
      </aside>

      <div className={`md:hidden fixed inset-0 z-[100] transition-opacity duration-300 ${isMobileMenuOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>
        <div className="absolute inset-0 bg-slate-900/70 backdrop-blur-sm" onClick={() => setIsMobileMenuOpen(false)}></div>
        <aside className={`absolute top-0 left-0 h-full w-64 bg-slate-900 shadow-2xl transition-transform duration-300 transform ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'}`}>
          <SidebarContent isMobile />
        </aside>
      </div>

      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <header className="md:hidden h-14 bg-white border-b flex items-center justify-between px-4 shrink-0 z-40 no-print">
          <button onClick={() => setIsMobileMenuOpen(true)} className="p-2 text-slate-600 hover:bg-slate-50 rounded">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16" /></svg>
          </button>
          <div className="flex items-center gap-2">
            <div className="bg-blue-600 w-6 h-6 rounded flex items-center justify-center text-[10px] text-white font-black">ZC</div>
            <span className="font-black text-slate-900 uppercase text-xs">ZeladorCheck</span>
          </div>
          <div className="w-8 h-8 rounded bg-slate-100 flex items-center justify-center text-[10px] font-black text-slate-500">
            {currentUser.name.charAt(0)}
          </div>
        </header>

        <div className="flex-1 overflow-y-auto overflow-x-hidden">
          <div className="max-w-7xl mx-auto p-4 md:p-8 report-container pb-20">
            {children}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Layout;