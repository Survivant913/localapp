import { useState, useEffect } from 'react';
import { 
  LayoutDashboard, Calendar, FolderKanban, Wallet, 
  StickyNote, CheckSquare, Settings, LogOut, X, Coffee, Menu,
  Users, Box, Target, Book, CalendarRange, Clock, Activity,
  MessageSquare 
} from 'lucide-react';
import { supabase } from './supabaseClient';

// --- AJOUT DE LA PROP "unreadCount" ICI ---
export default function Sidebar({ currentView, setView, isMobileOpen, toggleMobile, labels, darkMode, toggleTheme, unreadCount }) {
  const [isCollapsed, setIsCollapsed] = useState(false);
  
  // --- CHRONO SECONDES ---
  const [sessionSeconds, setSessionSeconds] = useState(0);

  useEffect(() => {
    // Incrémente le compteur toutes les secondes (1000ms)
    const timer = setInterval(() => {
      setSessionSeconds(prev => prev + 1);
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const formatSessionTime = () => {
    const h = Math.floor(sessionSeconds / 3600);
    const m = Math.floor((sessionSeconds % 3600) / 60);
    const s = sessionSeconds % 60;

    // Ajout du zéro devant si < 10 pour un affichage stable (ex: 04s)
    const fmt = (n) => n.toString().padStart(2, '0');

    if (h > 0) return `${h}h ${fmt(m)}m ${fmt(s)}s`;
    return `${fmt(m)}m ${fmt(s)}s`;
  };
  // ---------------------------------

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
    { id: 'chat', label: 'Messages', icon: MessageSquare, badge: unreadCount }, // --- AJOUT BADGE ICI ---
    { id: 'planning', label: 'Agenda', icon: CalendarRange },
    { id: 'calendar', label: 'Calendrier Financier', icon: Calendar }, 
    { id: 'projects', label: 'Mes Projets', icon: FolderKanban },
    { id: 'goals', label: 'Objectifs', icon: Target },
    { id: 'habits', label: 'Suivi Habitudes', icon: Activity },
    { id: 'budget', label: 'Budget & Finance', icon: Wallet },
    { id: 'clients', label: 'Clients', icon: Users },
    { id: 'notes', label: 'Bloc-notes', icon: StickyNote },
    { id: 'journal', label: 'Carnet', icon: Book },
    { id: 'todo', label: 'Tâches Rapides', icon: CheckSquare },
    { id: 'settings', label: 'Paramètres', icon: Settings },
  ];

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
        
        {/* --- FOND TATOUAGE DRAGON TRIBAL ULTRA DÉTAILLÉ (S'ADAPTE AU THÈME) --- */}
        <div className="absolute inset-0 pointer-events-none opacity-[0.08] z-0 flex items-center justify-center overflow-hidden">
            <svg 
                viewBox="0 0 1000 1000" 
                className={`text-blue-600 fill-current h-[150%] w-[150%] flex-shrink-0 transition-transform duration-700 ${isCollapsed ? 'scale-125 rotate-0' : 'scale-100 -rotate-12 translate-x-10'}`}
                preserveAspectRatio="xMidYMid slice"
            >
                {/* TRACÉ COMPLEXE DRAGON TRIBAL STYLE AGRESSIF */}
                <path d="M866.9 446.6c-13.4-33.6-50.6-77.1-88.8-108-35.6-28.9-77.7-54.7-122.2-69.8-21.9-7.4-46.5-12.7-72-11.2-26.2 1.5-53.5 8.3-76.8 21.4-22.4 12.7-41.9 29.6-57.3 49.8-15.1 19.9-26.1 43.2-33.9 69.1-3.8 12.7-6.6 25.9-8.6 39.4-4.1-16.6-10.9-33.2-21.3-48.6-12.7-18.8-30-34.4-50.8-45.1-20.9-10.7-44.5-16-69.8-14.7-25.2 1.2-51.2 7.5-73.5 19.5-20.9 11.2-39.4 26.6-54.4 45.1-14.7 18.2-25.8 39.9-32.3 63.9-3.3 11.9-5.4 24.3-6.4 37-3.6-15.4-9.6-31.2-18.7-46-12.5-20.3-29.6-37.5-49.6-49.8-19.9-12.3-42.6-19.4-67.6-20.5-24.5-1-50.4 3.1-74.3 13.3-23 9.8-43.9 24.3-61.2 42.7-16.9 18-30.3 40.1-38.8 65.4-4.4 12.8-7.6 26.5-9.3 40.6 0 0-1.6 23.7 4.2 45.3 5.5 20.2 16.4 39.9 31.4 56.9 15.1 17.1 34.7 31.3 57.1 41.5 22.7 10.3 48.5 16 74.5 16 26.3 0 51.7-5.5 73.6-15.1 20.9-9.1 39.4-22.1 54.4-38.2 14.3-15.4 24.6-34.5 30.1-56.1 3-11.4 4.2-23.7 4.1-36.4 3.9 16 10.7 32.2 20.9 47.4 12.7 19 30.1 34.7 51 45.8 20.8 11 44.5 16.7 70.1 16 25.2-.7 51.4-6.4 74.2-17.8 21.4-10.7 40.3-25.4 55.6-43.2 14.8-17.3 26.3-38.4 33.6-61.8 3.7-11.9 6-24.7 6.9-37.7 3.6 16.3 10.1 32.7 20 48 12.5 19.4 30 36.1 50.5 47.8 19.9 11.4 43 17.5 67.9 17.5 24.7 0 50.8-5.5 73.5-16.3 21.4-10.2 40.1-24.3 55.3-41.2 14.4-16.2 25.3-35.7 31.9-57.6 3.3-10.9 5.2-22.4 5.8-34.2 2.8 16.6 8.5 33.7 18.3 50.1 12.7 21.1 30.6 39.4 51.6 52.4 20.9 12.8 45.3 19.7 71.6 19.7 26.2 0 53.7-6.5 77.5-18.8 22.3-11.4 41.6-27.1 57-45.9 14.7-18 25.3-39.7 31-64 2.8-12.3 4.1-25.4 3.7-38.8 5.7 21.7 17.1 41.5 32.3 58.2 16.9 18.5 39 33.1 64 42.4 23.7 8.8 50 12.6 76.6 10.2 24.9-2.2 48.2-11.1 67-25.9 17.5-13.8 30.6-32.2 37.9-54.1 6.9-20.9 7.6-44.1 1.9-65.9z M 160.2 536c-6.8 18.3-18.7 35.7-34.1 49.2-15.9 13.9-35.3 24.2-56.5 28.8-20.9 4.5-43.7 2.5-64.1-5.9-19.5-8.1-36.1-21.7-47.6-39.9-11.3-17.9-16.5-38.9-15.3-60 1.2-20.3 9.2-40.3 22.7-56.5 12.7-15.1 30.1-26.9 50.4-33.7 19.7-6.6 42.4-6.5 63.3 1 20.2 7.3 38 20.9 50.2 38.6 11.8 17.3 17.4 37.9 16.4 58.8-.9 17.9-6.9 35.1-15.7 50.3-11.8-21.6-31.1-38.6-54.4-46.9-22.3-7.9-47.7-6.8-69.3 2.9-20.6 9.3-37.5 25.6-47.6 46.3-9.6 19.9-12.3 42.7-7.5 64.4 4.7 20.5 16.9 39.6 33.8 53 16.6 13.1 38.3 19.5 59.7 17.3 20.8-2.1 40.4-11.8 54.5-27.2 13.4-14.7 21.4-33.7 22.6-54.1 1.2-19-4.7-38.1-16.5-53.4zm199.5 38.2c-5.9 18.3-16.6 35.7-31 49.2-14.7 13.9-33 24.2-52.8 28.8-19.7 4.5-41.3 2.5-60.8-5.9-18.9-8.1-35-21.7-46.6-39.9-11.2-17.9-16.6-38.9-16-60 1.2-20.3 8.5-40.3 20.6-56.5 11.8-15.1 28.3-26.9 47.6-33.7 18.9-6.6 40.8-6.5 61.2 1 19.9 7.3 37.1 20.9 49.6 38.6 11.9 17.3 18.1 37.9 17.9 58.8-.1 17.9-5.3 35.1-13.5 50.3-10.2-21.6-28.4-38.6-50.3-46.9-20.9-7.9-45-6.8-65.9 2.9-19.9 9.3-36.5 25.6-46.9 46.3-9.8 19.9-13.2 42.7-9.4 64.4 3.7 20.5 14.5 39.6 30.3 53 15.6 13.1 36.1 19.5 56.7 17.3 20.2-2.1 38.8-11.8 52.8-27.2 13.6-14.7 22.1-33.7 24-54.1 1.9-19-3.2-38.1-14.5-53.4zm194.9-43.4c-4.7 18.3-14.1 35.7-27.2 49.2-13.1 13.9-29.8 24.2-48.2 28.8-18.3 4.5-38.3 2.5-56.7-5.9-17.7-8.1-32.8-21.7-44.2-39.9-10.8-17.9-16.2-38.9-16.5-60 0-20.3 6.6-40.3 17.9-56.5 10.7-15.1 25.6-26.9 43.5-33.7 17.7-6.6 38.3-6.5 57.9 1 18.9 7.3 35.5 20.9 47.8 38.6 11.8 17.3 18.5 37.9 19.2 58.8.6 17.9-3.7 35.1-11.2 50.3-8.5-21.6-25.6-38.6-45.8-46.9-19.7-7.9-42.4-6.8-62.3 2.9-19.3 9.3-35 25.6-45.3 46.3-10 19.9-14 42.7-11.1 64.4 2.8 20.5 12.7 39.6 27.2 53 14.4 13.1 33.6 19.5 53.2 17.3 19.5-2.1 37.2-11.8 50.9-27.2 13.4-14.7 22.4-33.7 25.1-54.1 2.8-19-1.5-38.1-12.2-53.4zm169.4-118.2c3.6 18.8-.9 38.3-12.5 53.4-11.6 15.1-28.7 26.3-49.4 32-19.5 5.4-41.5 4.2-61.5-4.4-19.3-8.3-35.7-23.3-47.1-42.4-10.8-18.2-15.5-39.9-13.5-61.3 2.1-20.3 11.2-39.7 24.9-55 13.4-14.7 31.3-25.4 51.7-31 19.5-5.4 41.6-4.4 61.8 4.2 19.5 8.3 36.3 23.1 48.4 41.9 11.6 18 16.8 39.7 15.5 61-.9 17.9-6.4 35-15.6 50-12.3-21.4-31.9-37.7-54.8-45.3-22.1-7.3-47.1-5.8-68.6 4.8-20.2 9.9-36.5 26.6-46.3 47.4-9.3 19.9-11.9 42.9-7 64.5 4.9 20.2 17.6 38.7 34.6 51.7 16.6 12.7 38.4 18.7 59.7 16 20.3-2.5 39.4-12.7 53.2-28.3 13.4-15.3 21.1-34.6 21.9-55.3.8-19.1-5.4-38-17.4-53z" />
            </svg>
        </div>

        {/* Header */}
        <div className={`h-20 flex items-center ${isCollapsed ? 'justify-center' : 'justify-between px-6'} border-b border-slate-800/60 relative z-10`}>
          {!isCollapsed && (
            <h1 className="text-lg font-bold tracking-tight text-white whitespace-nowrap overflow-hidden flex items-center gap-2">
              <div className="w-2 h-2 bg-blue-600 rounded-full shadow-[0_0_8px_rgba(37,99,235,0.6)]"></div>
              {labels?.appName || 'Mon Espace'}
            </h1>
          )}

          <button 
            onClick={() => setIsCollapsed(!isCollapsed)}
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
                    {/* PASTILLE BADGE COLLAPSED */}
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

                {/* PASTILLE BADGE EXPANDED */}
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
        <div className="p-4 mt-auto border-t border-slate-800/60 bg-[#0B1120] relative z-10">
          <div className={`flex gap-2 mb-4 ${isCollapsed ? 'flex-col items-center' : ''}`}>
            
            <button 
              onClick={handleLogout}
              className={`
                flex items-center justify-center gap-2 rounded-lg text-sm font-medium text-slate-400 hover:text-red-400 hover:bg-red-500/10 transition-all cursor-pointer border border-slate-800 hover:border-red-500/20
                ${isCollapsed ? 'w-10 h-10 p-0' : 'flex-1 px-4 py-2.5'}
              `}
              style={{ WebkitTapHighlightColor: 'transparent' }}
              title="Déconnexion"
            >
              <LogOut size={16} />
              {!isCollapsed && <span className="text-xs font-semibold">Déconnexion</span>}
            </button>
            
            <button 
              onClick={() => setView('zen')}
              className={`
                rounded-lg text-slate-400 hover:text-emerald-400 hover:bg-emerald-500/10 transition-all border border-slate-800 hover:border-emerald-500/20
                ${isCollapsed ? 'w-10 h-10 flex items-center justify-center p-0' : 'p-2.5'}
              `}
              title="Mode Zen"
            >
              <Coffee size={18} />
            </button>
          </div>

          {!isCollapsed && (
            <div className="text-center pb-1 space-y-1">
              {/* CHRONO AVEC SECONDES (Format: 00m 00s) */}
              <div className="flex items-center justify-center gap-1.5 text-[10px] text-slate-600 select-none opacity-60 hover:opacity-100 transition-opacity font-mono" title="Temps de session">
                  <Clock size={10}/>
                  <span>{formatSessionTime()}</span>
              </div>
              
              <p className="text-[10px] text-slate-600 font-medium hover:text-slate-500 transition-colors cursor-default select-none">
                Created by Henni Mohammed Al Amine
              </p>
            </div>
          )}
        </div>

      </div>
    </>
  );
}