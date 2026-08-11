import { Bell, Trash2, Check, ExternalLink, X, Calendar, MessageSquare, FolderKanban, Info, Box, Book, CheckSquare, Wallet } from 'lucide-react';
import { format, parseISO, isToday, isYesterday } from 'date-fns';
import { fr } from 'date-fns/locale';

export default function NotificationCenter({ notifications, onClose, onClearAll, onMarkAllRead, onMarkRead, navigateTo }) {
    
    const getIconForType = (type) => {
        if (type.includes('agenda') || type.includes('calendar')) return <Calendar size={18} className="text-emerald-500" />;
        if (type.includes('chat') || type.includes('message')) return <MessageSquare size={18} className="text-blue-500" />;
        if (type.includes('workspace')) return <Box size={18} className="text-indigo-500" />;
        if (type.includes('projet') || type.includes('project')) return <FolderKanban size={18} className="text-purple-500" />;
        if (type.includes('journal') || type.includes('carnet')) return <Book size={18} className="text-amber-500" />;
        if (type.includes('todo') || type.includes('tache')) return <CheckSquare size={18} className="text-cyan-500" />;
        if (type.includes('budget') || type.includes('finance')) return <Wallet size={18} className="text-rose-500" />;
        return <Bell size={18} className="text-slate-500" />;
    };

    const formatTime = (dateString) => {
        if (!dateString) return '';
        const date = new Date(dateString);
        if (isNaN(date.getTime())) return '';
        if (isToday(date)) return format(date, "'Aujourd''hui à' HH:mm", { locale: fr });
        if (isYesterday(date)) return format(date, "'Hier à' HH:mm", { locale: fr });
        return format(date, "d MMM 'à' HH:mm", { locale: fr });
    };

    return (
        <div 
            className="absolute left-[70px] bottom-4 w-[380px] max-h-[85vh] flex flex-col bg-white/95 dark:bg-[#0B1120]/95 backdrop-blur-2xl border border-slate-200/50 dark:border-slate-700/50 rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.12)] dark:shadow-[0_8px_30px_rgb(0,0,0,0.4)] z-50 overflow-hidden transform transition-all animate-in slide-in-from-bottom-2 fade-in duration-200"
            onClick={(e) => e.stopPropagation()}
        >
            {/* EN-TÊTE */}
            <div className="p-4 border-b border-slate-200/50 dark:border-slate-800/50 flex justify-between items-center bg-slate-50/50 dark:bg-slate-900/50">
                <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center">
                        <Bell size={16} className="text-indigo-600 dark:text-indigo-400" />
                    </div>
                    <div>
                        <h3 className="font-bold text-slate-800 dark:text-white text-sm">Centre d'activité</h3>
                        <p className="text-xs text-slate-500 dark:text-slate-400">{notifications.filter(n => !n.is_read).length} non lu(s)</p>
                    </div>
                </div>
                
                <div className="flex gap-1">
                    {notifications.length > 0 && (
                        <>
                            <button onClick={onMarkAllRead} className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 rounded-lg transition-all" title="Tout marquer comme lu">
                                <Check size={16} />
                            </button>
                            <button onClick={onClearAll} className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg transition-all" title="Tout vider">
                                <Trash2 size={16} />
                            </button>
                        </>
                    )}
                    <div className="w-px h-4 bg-slate-200 dark:bg-slate-700 mx-1 my-auto"></div>
                    <button onClick={onClose} className="p-2 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-all">
                        <X size={16} />
                    </button>
                </div>
            </div>
            
            {/* CORPS DES NOTIFICATIONS */}
            <div className="flex-1 overflow-y-auto custom-scrollbar p-3 space-y-2">
                {notifications.length === 0 ? (
                    <div className="text-center py-12 px-4 flex flex-col items-center justify-center h-full">
                        <div className="w-16 h-16 rounded-full bg-slate-50 dark:bg-slate-800/50 flex items-center justify-center mb-4">
                            <Bell size={28} className="text-slate-300 dark:text-slate-600" />
                        </div>
                        <p className="font-semibold text-slate-700 dark:text-slate-300 text-sm mb-1">Tout est calme</p>
                        <p className="text-xs text-slate-500 dark:text-slate-500 text-center">Vous n'avez aucune notification pour le moment.</p>
                    </div>
                ) : (
                    notifications.map(n => (
                        <div 
                            key={n.id} 
                            className={`relative p-3.5 rounded-xl border transition-all duration-200 cursor-pointer group flex gap-3
                                ${!n.is_read 
                                    ? 'bg-indigo-50/40 border-indigo-100/50 dark:bg-indigo-900/20 dark:border-indigo-800/50 shadow-sm' 
                                    : 'bg-transparent border-transparent hover:bg-slate-50 dark:hover:bg-slate-800/50'
                                }`}
                            onClick={() => {
                                onMarkRead(n.id);
                                if (n.link) navigateTo(n.link);
                            }}
                        >
                            {/* Pastille non lue */}
                            {!n.is_read && (
                                <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-8 bg-indigo-500 rounded-r-md"></div>
                            )}

                            {/* Icône du type de notification */}
                            <div className={`w-10 h-10 rounded-full shrink-0 flex items-center justify-center border ${
                                !n.is_read ? 'bg-white dark:bg-slate-800 border-indigo-100 dark:border-indigo-800' : 'bg-slate-50 dark:bg-slate-800/50 border-slate-100 dark:border-slate-700'
                            }`}>
                                {getIconForType(n.type)}
                            </div>

                            {/* Contenu */}
                            <div className="flex-1 min-w-0">
                                <div className="flex justify-between items-start gap-2 mb-0.5">
                                    <span className={`font-semibold text-sm truncate ${
                                        !n.is_read ? 'text-slate-900 dark:text-slate-100' : 'text-slate-700 dark:text-slate-300'
                                    }`}>
                                        {n.title}
                                    </span>
                                    <span className="text-[10px] text-slate-400 whitespace-nowrap shrink-0 mt-0.5 font-medium">
                                        {formatTime(n.created_at)}
                                    </span>
                                </div>
                                <p className={`text-xs leading-relaxed line-clamp-2 ${
                                    !n.is_read ? 'text-slate-600 dark:text-slate-300' : 'text-slate-500 dark:text-slate-400'
                                }`}>
                                    {n.message}
                                </p>
                                
                                {/* Call to action si lien */}
                                {n.link && (
                                    <div className="mt-2 text-[11px] font-medium text-indigo-600 dark:text-indigo-400 opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1">
                                        Voir les détails <ExternalLink size={10} />
                                    </div>
                                )}
                            </div>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
}
