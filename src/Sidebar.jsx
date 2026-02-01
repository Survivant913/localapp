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
        
        {/* --- FOND TATOUAGE DRAGON TRIBAL (S'ADAPTE AU THÈME) --- */}
        <div className="absolute bottom-10 -right-10 pointer-events-none opacity-10 z-0">
            {/* Dragon Tribal SVG Path */}
            <svg width="300" height="300" viewBox="0 0 512 512" className="text-blue-600 fill-current transform -rotate-12">
                <path d="M145.2 235.3c16.4 5.8 33.6 12.8 45.8 26.5 13.9 15.6 19.3 35.5 15.8 55.4-4.1 23.3-21.6 42.1-42.3 52.8-21.8 11.3-48.4 12.3-71.6 5.4-7.6-2.3-15-5.3-21.8-9.4 11.4 22.2 33.1 39.1 57.8 44.4 25.5 5.5 53.4-1.7 74.3-17.8 20-15.4 32.7-39.7 34.6-65.1 1.7-23-7.6-45.7-22.9-63.1-16.1-18.3-38.3-30.6-60.7-38.8-3.1-1.1-6.1-2.1-9-3.2zm134.4-76.6c-13.6-7.8-28.7-13.3-44.2-15.3-17.4-2.2-35.3 1.8-50.5 10.9-15.9 9.5-28.4 24.3-35.9 41.3-7.8 17.7-9.3 38.2-3.4 56.8 2.1 6.5 5.2 12.7 9.1 18.2-12.2-22.4-13.4-49.9-2.2-72.3 10.8-21.6 32-38.1 55.8-43.2 24.6-5.3 51 2.3 70.3 18.5 1.5 1.3 2.9 2.6 4.3 4 5.3 5.3 10.1 11.1 14.2 17.4-5.8-12.7-11.7-24.8-17.5-36.3zm82.7-37.4c-9.1-8.5-19.7-15.4-31.4-19.8-13.8-5.2-28.8-6.9-43.2-4.1-16.1 3.1-31.1 11.6-42.2 23.7-11.6 12.7-18.7 29.3-20.3 46.4-1.6 17.5 3.9 35.1 14.5 49.3 3.8 5.1 8.3 9.7 13.3 13.6-13.8-20-16.3-46.3-5.9-68.1 10.1-21.1 31.2-37.1 54.7-42.2 24.3-5.2 50.4 2.2 69.5 18.1 3.6 3 7 6.3 10.1 9.8 1.5 1.7 3 3.4 4.4 5.2-7.8-10.7-15.5-21.2-23.5-31.9zm-34.1 270.3c-1.8-8.9-5.1-17.5-9.8-25.2-10.5-17.3-27.8-29.6-47.3-34.3-20.2-4.9-41.9 1.1-58.4 14.3-16.5 13.2-27.1 33.3-28.9 54.4-1.9 21.6 5.8 43.1 20.3 59.7 14.9 17 37 27.2 59.7 27.2 2.3 0 4.6-.1 6.9-.3-23.7 3.3-48.4-4.1-66.6-21.2-18.9-17.8-28.3-44.5-24.8-70.2 3.6-26.6 19.9-50.1 42.9-62.1 23.9-12.5 53.6-11.2 76.7 2.1 10.2 5.9 18.8 14.1 25.4 23.8 3.5 5.2 6.4 10.8 8.6 16.7-1.5-8.3-3-16.6-4.7-24.9z"/>
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