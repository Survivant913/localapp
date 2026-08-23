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
        <div className="fixed inset-0 z-[9999] flex justify-end" onClick={onClose}>
            {/* Backdrop */}
            <div className="absolute inset-0 bg-slate-900/20 dark:bg-black/40 backdrop-blur-sm animate-in fade-in duration-300" />
            
            {/* Drawer */}
            <div 
                className="relative w-full max-w-md h-full flex flex-col bg-white/95 dark:bg-[#0B1120]/95 backdrop-blur-3xl shadow-[0_0_40px_rgba(0,0,0,0.1)] dark:shadow-[0_0_40px_rgba(0,0,0,0.5)] border-l border-slate-200/50 dark:border-slate-800/50 z-10 animate-in slide-in-from-right duration-300 ease-out"
                onClick={(e) => e.stopPropagation()}
            >
                {/* EN-TÊTE */}
                <div className="px-6 py-5 border-b border-slate-200/50 dark:border-slate-800/50 flex justify-between items-center shrink-0">
                    <div>
                        <h2 className="text-xl font-black text-slate-900 dark:text-white tracking-tight">Notifications</h2>
                        <p className="text-sm font-medium text-slate-500 mt-0.5">{notifications.filter(n => !n.is_read).length} non lu(s)</p>
                    </div>
                    
                    <div className="flex gap-2">
                        {notifications.length > 0 && (
                            <>
                                <button onClick={onMarkAllRead} className="p-2.5 bg-slate-50 dark:bg-slate-800/50 text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 rounded-xl transition-colors" title="Tout marquer comme lu">
                                    <Check size={18} strokeWidth={2.5} />
                                </button>
                                <button onClick={onClearAll} className="p-2.5 bg-slate-50 dark:bg-slate-800/50 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-xl transition-colors" title="Tout vider">
                                    <Trash2 size={18} strokeWidth={2.5} />
                                </button>
                            </>
                        )}
                        <button onClick={onClose} className="p-2.5 bg-slate-100 dark:bg-slate-800 text-slate-500 hover:text-slate-800 dark:hover:text-white hover:bg-slate-200 dark:hover:bg-slate-700 rounded-xl transition-colors ml-2">
                            <X size={18} strokeWidth={2.5} />
                        </button>
                    </div>
                </div>
                
                {/* CORPS DES NOTIFICATIONS */}
                <div className="flex-1 overflow-y-auto custom-scrollbar p-4 space-y-3">
                    {notifications.length === 0 ? (
                        <div className="text-center py-20 px-4 flex flex-col items-center justify-center h-full opacity-60">
                            <div className="w-20 h-20 rounded-2xl bg-slate-100 dark:bg-slate-800/50 flex items-center justify-center mb-5 border border-slate-200 dark:border-slate-700">
                                <Bell size={32} strokeWidth={1.5} className="text-slate-400" />
                            </div>
                            <p className="text-lg font-black text-slate-700 dark:text-slate-300 tracking-tight mb-2">Tout est calme</p>
                            <p className="text-sm font-medium text-slate-500 dark:text-slate-400 text-center max-w-[250px]">Vous n'avez aucune nouvelle notification pour le moment.</p>
                        </div>
                    ) : (
                        notifications.map(n => (
                            <div 
                                key={n.id} 
                                className={`relative p-5 rounded-2xl border transition-all duration-300 cursor-pointer group flex gap-4
                                    ${!n.is_read 
                                        ? 'bg-white dark:bg-slate-800/80 border-slate-200 dark:border-slate-700 shadow-sm hover:shadow-md' 
                                        : 'bg-slate-50/50 dark:bg-slate-900/50 border-transparent hover:bg-slate-100 dark:hover:bg-slate-800'
                                    }`}
                                onClick={() => {
                                    onMarkRead(n.id);
                                    if (n.link) navigateTo(n.link);
                                }}
                            >
                                {/* Pastille non lue */}
                                {!n.is_read && (
                                    <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1.5 h-10 bg-indigo-500 rounded-r-lg"></div>
                                )}

                                {/* Icône du type de notification */}
                                <div className={`w-12 h-12 rounded-xl shrink-0 flex items-center justify-center border transition-colors ${
                                    !n.is_read ? 'bg-indigo-50 dark:bg-indigo-900/20 border-indigo-100 dark:border-indigo-800/50' : 'bg-slate-100 dark:bg-slate-800 border-transparent text-slate-400'
                                }`}>
                                    {getIconForType(n.type)}
                                </div>

                                {/* Contenu */}
                                <div className="flex-1 min-w-0 flex flex-col justify-center">
                                    <div className="flex justify-between items-start gap-2 mb-1">
                                        <span className={`font-bold text-sm truncate ${
                                            !n.is_read ? 'text-slate-900 dark:text-white' : 'text-slate-600 dark:text-slate-400'
                                        }`}>
                                            {n.title}
                                        </span>
                                        <span className="text-[10px] uppercase tracking-widest font-bold text-slate-400 shrink-0 mt-0.5">
                                            {formatTime(n.created_at)}
                                        </span>
                                    </div>
                                    <p className={`text-sm leading-relaxed line-clamp-2 ${
                                        !n.is_read ? 'text-slate-600 dark:text-slate-300 font-medium' : 'text-slate-500 dark:text-slate-500'
                                    }`}>
                                        {n.message}
                                    </p>
                                    
                                    {/* Call to action si lien */}
                                    {n.link && (
                                        <div className="mt-3 text-xs font-bold text-indigo-600 dark:text-indigo-400 opacity-0 group-hover:opacity-100 -translate-x-2 group-hover:translate-x-0 transition-all flex items-center gap-1.5">
                                            Voir les détails <ExternalLink size={12} strokeWidth={2.5} />
                                        </div>
                                    )}
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>
        </div>
    );
}
