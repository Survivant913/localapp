import { useState, useEffect } from 'react';
import { 
  LayoutDashboard, Calendar, FolderKanban, Wallet, 
  StickyNote, CheckSquare, Settings, LogOut, X, Coffee, Menu,
  Users, Box, Target, Book, CalendarRange, Clock, Activity,
  MessageSquare, Search, Bell
} from 'lucide-react';
import { supabase } from './supabaseClient';

export default function Sidebar({ currentView, setView, isMobileOpen, toggleMobile, labels, darkMode, toggleTheme, unreadCount, settings, onSearchClick, unreadNotificationsCount, toggleNotifications }) {
  // MODIFICATION ICI : useState(true) pour que la sidebar soit fermée au démarrage
  const [_isCollapsed, setIsCollapsed] = useState(true);
  const isCollapsed = _isCollapsed && !isMobileOpen;
  
  // --- CHRONO SECONDES ---
  const [sessionSeconds, setSessionSeconds] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setSessionSeconds(prev => prev + 1);
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const formatSessionTime = () => {
    const h = Math.floor(sessionSeconds / 3600);
    const m = Math.floor((sessionSeconds % 3600) / 60);
    const s = sessionSeconds % 60;
    const fmt = (n) => n.toString().padStart(2, '0');
    if (h > 0) return `${h}h ${fmt(m)}m ${fmt(s)}s`;
    return `${fmt(m)}m ${fmt(s)}s`;
  };

  const handleLogout = async () => {
    try {
      const currentTheme = localStorage.getItem('freelanceCockpitTheme'); 
      await supabase.auth.signOut();
      localStorage.clear();
      sessionStorage.clear();
      if (currentTheme) {
        localStorage.setItem('freelanceCockpitTheme', currentTheme);
      }
      if (isMobileOpen && toggleMobile) {
        toggleMobile();
      }
      window.location.replace(window.location.origin);
    } catch (error) {
      console.error("Erreur déconnexion:", error);
      window.location.href = "/";
    }
  };

  const menuItems = [
    { id: 'dashboard', label: 'Tableau de bord', icon: LayoutDashboard },
    { id: 'workspace', label: 'Workspace', icon: Box }, 
    { id: 'chat', label: 'Messages', icon: MessageSquare, badge: unreadCount },
    { id: 'planning', label: 'Agenda', icon: CalendarRange },
    { id: 'calendar', label: 'Calendrier Financier / Deadline', icon: Calendar }, 
    { id: 'projects', label: 'Mes Projets', icon: FolderKanban },
    { id: 'goals', label: 'Objectifs', icon: Target },
    { id: 'habits', label: 'Suivi Habitudes', icon: Activity },
    { id: 'budget', label: 'Budget & Finance', icon: Wallet },
    
    // --- AFFICHÉ ---
    { id: 'clients', label: 'Gestion Client', icon: Users },
    
    { id: 'notes', label: 'Bloc-notes', icon: StickyNote },
    { id: 'journal', label: 'Carnet', icon: Book },
    { id: 'todo', label: 'Tâches Rapides', icon: CheckSquare },
    { id: 'settings', label: 'Paramètres', icon: Settings },
  ].filter(item => {
      // Les anciens (par défaut false)
      if (item.id === 'clients') return settings?.showClients === true;
      if (item.id === 'goals') return settings?.showGoals === true;
      if (item.id === 'projects') return settings?.showProjects === true;
      if (item.id === 'habits') return settings?.showHabits === true;
      
      // Les nouveaux (par défaut true)
      if (item.id === 'dashboard') return settings?.showDashboard !== false;
      if (item.id === 'workspace') return settings?.showWorkspace !== false;
      if (item.id === 'chat') return settings?.showChat !== false;
      if (item.id === 'planning') return settings?.showPlanning !== false;
      if (item.id === 'calendar') return settings?.showCalendar !== false;
      if (item.id === 'budget') return settings?.showBudget !== false;
      if (item.id === 'notes') return settings?.showNotesSide !== false;
      if (item.id === 'journal') return settings?.showJournal !== false;
      if (item.id === 'todo') return settings?.showTodo !== false;
      
      return true; // paramétres etc
    });

  return (
    <>
      {/* Overlay Mobile */}
      {isMobileOpen && (
        <div 
          className="fixed inset-0 bg-black/60 z-40 md:hidden backdrop-blur-sm transition-opacity"
          onClick={toggleMobile}
        ></div>
      )}

      {/* Sidebar */}
      <div className={`
        fixed inset-y-0 left-0 z-50 bg-[#0B1120] text-slate-400 transform transition-all duration-300 ease-in-out border-r border-slate-800/60 flex flex-col shadow-2xl overflow-hidden
        ${isMobileOpen ? 'translate-x-0' : '-translate-x-full'} 
        md:translate-x-0 md:static
        ${isCollapsed ? 'w-20' : 'w-72'}
      `}>
        
        {/* Header */}
        <div className={`h-20 flex items-center ${isCollapsed ? 'justify-center' : 'justify-between px-6'} border-b border-slate-800/60 relative z-10`}>
          {!isCollapsed && (
            <h1 className="text-lg font-bold tracking-tight text-white whitespace-nowrap overflow-hidden flex items-center gap-3">

              {labels?.appName || 'Mon Espace'}
            </h1>
          )}

          <button 
            onClick={() => setIsCollapsed(!_isCollapsed)}
            className="hidden md:flex text-slate-500 hover:text-white transition-colors p-2 rounded-lg hover:bg-slate-800/50"
            title={isCollapsed ? "Agrandir le menu" : "Réduire le menu"}
          >
            <Menu size={20} />
          </button>

          <button onClick={toggleMobile} className="md:hidden text-slate-400 hover:text-white p-2">
            <X size={24} />
          </button>
        </div>

        {/* Navigation */}
        <nav className={`flex-1 py-6 space-y-1 custom-scrollbar ${isCollapsed ? 'px-2' : 'px-4'} overflow-y-auto overflow-x-hidden relative z-10`}>
            
            {/* BOUTON RECHERCHE GLOBALE */}
            {settings?.showGlobalSearch !== false && (
                <button
                    onClick={onSearchClick}
                    className={`
                    w-full flex items-center gap-3 py-3 rounded-lg text-sm font-medium transition-all duration-200 group relative mb-4
                    ${isCollapsed ? 'justify-center px-0' : 'px-3'}
                    text-slate-400 hover:bg-indigo-900/40 hover:text-indigo-400 border border-transparent hover:border-indigo-800/50
                    `}
                >
                    <div className="relative">
                        <Search size={20} className="shrink-0 transition-colors text-slate-500 group-hover:text-indigo-400" />
                    </div>
                    {!isCollapsed && (
                        <span className="whitespace-nowrap overflow-hidden transition-all duration-300 flex-1 text-left flex justify-between items-center">
                            Recherche Globale
                            <kbd className="hidden lg:inline-block px-1.5 py-0.5 text-[9px] font-bold bg-slate-800 text-slate-500 rounded font-sans uppercase tracking-widest border border-slate-700 shadow-sm">CTRL+K</kbd>
                        </span>
                    )}
                </button>
            )}

          {menuItems.map(item => {
            const Icon = item.icon;
            const isActive = currentView === item.id;

            return (
              <button
                key={item.id}
                onClick={() => { setView(item.id); if(isMobileOpen) toggleMobile(); }}
                className={`
                  w-full flex items-center gap-3 py-3 rounded-lg text-sm font-medium transition-all duration-200 group relative
                  ${isCollapsed ? 'justify-center px-0' : 'px-3'}
                  ${isActive 
                    ? 'bg-blue-600/10 text-blue-500' 
                    : 'text-slate-400 hover:bg-slate-800/40 hover:text-slate-200'
                  }
                `}
              >
                <div className="relative">
                    <Icon size={20} className={`shrink-0 transition-colors ${isActive ? 'text-blue-600' : 'text-slate-500 group-hover:text-slate-300'}`} />
                    {isCollapsed && item.badge > 0 && (
                        <span className="absolute -top-1 -right-1 flex h-2.5 w-2.5">
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                          <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-red-500"></span>
                        </span>
                    )}
                </div>
                
                {!isCollapsed && (
                  <span className="whitespace-nowrap overflow-hidden transition-all duration-300 flex-1 text-left">
                    {item.label}
                  </span>
                )}

                {!isCollapsed && item.badge > 0 && (
                    <span className="bg-red-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full animate-pulse shadow-sm ml-2">
                        {item.badge}
                    </span>
                )}

                {isCollapsed && (
                  <div className="absolute left-16 ml-2 bg-slate-900 text-white text-xs px-3 py-2 rounded-md opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity duration-200 z-50 whitespace-nowrap border border-slate-700 shadow-xl font-medium tracking-wide">
                    {item.label}
                    {item.badge > 0 && ` (${item.badge})`}
                    <div className="absolute top-1/2 -left-1 -mt-1 w-2 h-2 bg-slate-900 border-l border-b border-slate-700 transform rotate-45"></div>
                  </div>
                )}
                
                {!isCollapsed && isActive && (
                  <div className="ml-auto w-1.5 h-1.5 rounded-full bg-blue-600 shadow-[0_0_8px_rgba(59,130,246,0.5)]"></div>
                )}
              </button>
            );
          })}
        </nav>

        {/* Footer & Logout */}
        <div className="p-4 mt-auto border-t border-slate-800/60 bg-[#0B1120] relative z-10 flex flex-col gap-4">
          <div className={`flex gap-2 w-full mt-auto ${isCollapsed ? 'flex-col items-center' : 'justify-between'}`}>
            <button 
              onClick={handleLogout}
              className={`
                flex items-center justify-center gap-2 rounded-lg transition-all
                text-slate-400 hover:text-red-400 hover:bg-red-500/10 border border-slate-800 hover:border-red-500/20
                ${isCollapsed ? 'p-0 w-10 h-10 shrink-0' : 'flex-1 p-2.5'}
              `}
              title="Déconnexion"
            >
              <LogOut size={18} />
              {!isCollapsed && <span className="text-xs font-semibold">Déconnexion</span>}
            </button>
            <button 
              onClick={() => setView('zen')}
              className={`
                rounded-lg text-slate-400 hover:text-emerald-400 hover:bg-emerald-500/10 transition-all border border-slate-800 hover:border-emerald-500/20 relative
                ${isCollapsed ? 'w-10 h-10 flex items-center justify-center p-0' : 'p-2.5 w-10 shrink-0'}
              `}
              title="Mode Zen"
            >
              <Coffee size={18} />
            </button>
            {settings?.notifications_enabled !== false && (
                <button 
                  onClick={toggleNotifications}
                  className={`
                    rounded-lg text-slate-400 hover:text-indigo-400 hover:bg-indigo-500/10 transition-all border border-slate-800 hover:border-indigo-500/20 relative flex items-center justify-center
                    ${isCollapsed ? 'w-10 h-10 p-0' : 'p-2.5 w-10 shrink-0'}
                  `}
                  title="Notifications"
                >
                  <Bell size={18} />
                  {unreadNotificationsCount > 0 && (
                      <span className="absolute top-1 right-1 w-2.5 h-2.5 bg-red-500 rounded-full border border-slate-900 shadow-[0_0_8px_rgba(239,68,68,0.8)]"></span>
                  )}
                </button>
            )}
          </div>

          {!isCollapsed && (
            <div className="flex flex-col items-center justify-center pt-2 border-t border-slate-800/40 space-y-2">
              <div className="flex items-center justify-center gap-2 text-xs font-black text-blue-400 select-none tracking-widest bg-blue-900/10 px-3 py-1.5 rounded-lg border border-blue-900/30" title="Temps de session">
                  <Clock size={14}/>
                  <span>{formatSessionTime()}</span>
              </div>
              <p className="text-[9px] text-slate-600 uppercase font-bold tracking-widest hover:text-slate-500 transition-colors cursor-default select-none">
                Created by Henni
              </p>
            </div>
          )}
        </div>
      </div>
    </>
  );
}