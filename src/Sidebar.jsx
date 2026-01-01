import { useState } from 'react';
import { 
  LayoutDashboard, Calendar, FolderKanban, Wallet, 
  StickyNote, CheckSquare, Settings, LogOut, X, Coffee, Menu 
} from 'lucide-react';
import { supabase } from './supabaseClient';

export default function Sidebar({ currentView, setView, isMobileOpen, toggleMobile, labels }) {
  const [isCollapsed, setIsCollapsed] = useState(false);
  
  const handleLogout = async () => {
    await supabase.auth.signOut();
    window.location.reload();
  };

  const menuItems = [
    { id: 'dashboard', label: 'Tableau de bord', icon: LayoutDashboard },
    { id: 'calendar', label: 'Planning', icon: Calendar },
    { id: 'projects', label: 'Mes Projets', icon: FolderKanban },
    { id: 'budget', label: 'Budget & Finance', icon: Wallet },
    { id: 'notes', label: 'Bloc-notes', icon: StickyNote },
    { id: 'todo', label: 'Tâches Rapides', icon: CheckSquare },
    { id: 'settings', label: 'Paramètres', icon: Settings },
  ];

  return (
    <>
      {/* Overlay Mobile */}
      {isMobileOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-30 md:hidden backdrop-blur-sm"
          onClick={toggleMobile}
        ></div>
      )}

      {/* Sidebar */}
      <div className={`
        fixed inset-y-0 left-0 z-50 bg-slate-950 text-white transform transition-all duration-300 ease-in-out border-r border-slate-800 flex flex-col
        ${isMobileOpen ? 'translate-x-0' : '-translate-x-full'} 
        md:translate-x-0 md:static
        ${isCollapsed ? 'w-20' : 'w-64'}
      `}>
        
        {/* Header */}
        <div className={`p-6 flex items-center ${isCollapsed ? 'justify-center' : 'justify-between'}`}>
          {!isCollapsed && (
            <h1 className="text-xl font-bold tracking-tight text-white whitespace-nowrap overflow-hidden">
              {labels?.appName || 'LocalApp'}
            </h1>
          )}

          <button 
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="hidden md:block text-slate-400 hover:text-white transition-colors p-1 rounded-lg hover:bg-slate-800"
            title={isCollapsed ? "Agrandir le menu" : "Réduire le menu"}
          >
            <Menu size={24} />
          </button>

          <button onClick={toggleMobile} className="md:hidden text-slate-400 hover:text-white">
            <X size={24} />
          </button>
        </div>

        {/* Navigation */}
        {/* CORRECTION ICI : Si replié (isCollapsed), on met 'overflow-visible' pour que l'infobulle sorte. Sinon 'overflow-y-auto' pour scroller. */}
        <nav className={`flex-1 px-3 space-y-2 custom-scrollbar ${isCollapsed ? 'overflow-visible' : 'overflow-y-auto'}`}>
          {menuItems.map(item => {
            const Icon = item.icon;
            const isActive = currentView === item.id;
            return (
              <button
                key={item.id}
                onClick={() => { setView(item.id); if(isMobileOpen) toggleMobile(); }}
                className={`
                  w-full flex items-center gap-3 py-3 rounded-xl text-sm font-medium transition-all duration-200 group relative
                  ${isCollapsed ? 'justify-center px-0' : 'px-4'}
                  ${isActive 
                    ? 'bg-blue-600 text-white shadow-lg shadow-blue-900/20' 
                    : 'text-slate-400 hover:bg-slate-900 hover:text-white'
                  }
                `}
              >
                <Icon size={20} className={`shrink-0 ${isActive ? 'text-white' : 'text-slate-500 group-hover:text-slate-300'}`} />
                
                {!isCollapsed && (
                    <span className="whitespace-nowrap overflow-hidden transition-all duration-300">
                        {item.label}
                    </span>
                )}

                {/* Tooltip au survol si replié (Z-INDEX 50 pour passer au dessus de tout) */}
                {isCollapsed && (
                    <div className="absolute left-16 ml-2 bg-slate-800 text-white text-xs px-3 py-1.5 rounded-lg opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity duration-200 z-50 whitespace-nowrap border border-slate-700 shadow-xl font-bold tracking-wide">
                        {item.label}
                        {/* Petite flèche décorative */}
                        <div className="absolute top-1/2 -left-1 -mt-1 w-2 h-2 bg-slate-800 border-l border-b border-slate-700 transform rotate-45"></div>
                    </div>
                )}
              </button>
            );
          })}
        </nav>

        {/* Footer & Logout */}
        <div className="p-4 mt-auto border-t border-slate-900">
          <div className={`flex gap-2 mb-4 ${isCollapsed ? 'flex-col items-center' : ''}`}>
            
            <button 
                onClick={handleLogout}
                className={`
                    flex items-center justify-center gap-2 rounded-xl text-sm font-medium text-red-400 bg-red-500/10 hover:bg-red-500/20 transition-colors
                    ${isCollapsed ? 'w-10 h-10 p-0' : 'flex-1 px-4 py-3'}
                `}
                title={isCollapsed ? "Déconnexion" : ""}
            >
                <LogOut size={18} />
                {!isCollapsed && <span className="text-xs">Sortir</span>}
            </button>
            
            <button 
                onClick={() => setView('zen')}
                className={`
                    rounded-xl text-emerald-500 bg-emerald-500/10 hover:bg-emerald-500/20 transition-colors
                    ${isCollapsed ? 'w-10 h-10 flex items-center justify-center p-0' : 'p-3'}
                `}
                title={isCollapsed ? "Mode Zen" : "Mode Zen (Focus)"}
            >
                <Coffee size={18} />
            </button>
          </div>

          {!isCollapsed && (
            <div className="text-center animate-in fade-in duration-500">
              <p className="text-[10px] text-slate-600 font-medium uppercase tracking-wider opacity-60 hover:opacity-100 transition-opacity cursor-default">
                Created by <br/> Henni Mohammed Al Amine
              </p>
            </div>
          )}
        </div>

      </div>
    </>
  );
}