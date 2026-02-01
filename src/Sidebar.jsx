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
        
        {/* --- NOUVEAU FOND CRÉATIF : DOUBLE DRAGON TRIBAL (HAUT & BAS) --- */}
        <div className="absolute inset-0 pointer-events-none z-0 overflow-hidden">
            
            {/* Dragon Tribal du Haut */}
            <div className={`absolute top-0 left-0 right-0 h-[40%] opacity-[0.07] transition-all duration-500 ${isCollapsed ? '-translate-y-10 scale-110' : 'translate-y-0 scale-100'}`}>
                 <svg viewBox="0 0 600 300" className="w-full h-full text-blue-600 fill-current" preserveAspectRatio="xMidYTop meet">
                    <path d="M300,0 C350,50 450,20 500,80 C550,140 520,200 480,220 C440,240 380,200 350,150 C320,100 350,50 300,50 C250,50 280,100 250,150 C220,200 160,240 120,220 C80,200 50,140 100,80 C150,20 250,50 300,0 Z M100,100 C80,120 60,100 80,80 C100,60 120,80 100,100 M500,100 C520,120 540,100 520,80 C500,60 480,80 500,100 M200,180 C180,200 150,180 170,150 C190,120 220,150 200,180 M400,180 C420,200 450,180 430,150 C410,120 380,150 400,180" />
                    <path d="M280,20 C260,40 220,30 240,60 C260,90 300,80 320,60 C340,40 300,20 280,20" opacity="0.8"/>
                </svg>
            </div>

            {/* Dragon Tribal du Bas */}
            <div className={`absolute bottom-0 left-0 right-0 h-[50%] opacity-[0.07] transition-all duration-500 ${isCollapsed ? 'translate-y-10 scale-110' : 'translate-y-0 scale-100'}`}>
                 <svg viewBox="0 0 600 400" className="w-full h-full text-blue-600 fill-current" preserveAspectRatio="xMidYBottom meet">
                    <path d="M300,400 C250,350 150,380 100,320 C50,260 80,200 120,180 C160,160 220,200 250,250 C280,300 250,350 300,350 C350,350 320,300 350,250 C380,200 440,160 480,180 C520,200 550,260 500,320 C450,380 350,350 300,400 Z M50,300 C30,280 10,300 30,320 C50,340 70,320 50,300 M550,300 C570,280 590,300 570,320 C550,340 530,320 550,300 M150,220 C130,200 100,220 120,250 C140,280 170,250 150,220 M450,220 C470,200 500,220 480,250 C460,280 430,250 450,220" />
                     <path d="M280,380 C260,360 220,370 240,340 C260,310 300,320 320,340 C340,360 300,380 280,380" opacity="0.8"/>
                </svg>
            </div>
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