import { Bell, Trash2, Check, ExternalLink, X } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { fr } from 'date-fns/locale';

export default function NotificationCenter({ notifications, onClose, onClearAll, onMarkAllRead, onMarkRead, navigateTo }) {
    return (
        <div className="absolute left-16 bottom-0 w-80 max-h-[80vh] flex flex-col bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl z-50 overflow-hidden" onClick={(e) => e.stopPropagation()}>
            <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex justify-between items-center bg-slate-50 dark:bg-slate-950">
                <h3 className="font-bold flex items-center gap-2 dark:text-white">
                    <Bell size={18} className="text-indigo-600" /> Notifications
                </h3>
                <div className="flex gap-1">
                    {notifications.length > 0 && (
                        <>
                            <button onClick={onMarkAllRead} className="p-2 text-slate-500 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-lg transition-colors" title="Tout marquer comme lu"><Check size={16} /></button>
                            <button onClick={onClearAll} className="p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg transition-colors" title="Tout vider"><Trash2 size={16} /></button>
                        </>
                    )}
                    <button onClick={onClose} className="p-2 text-slate-500 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-lg transition-colors"><X size={16} /></button>
                </div>
            </div>
            
            <div className="flex-1 overflow-y-auto custom-scrollbar p-2 space-y-2">
                {notifications.length === 0 ? (
                    <div className="text-center py-10 text-slate-400">
                        <Bell size={32} className="mx-auto mb-2 opacity-20" />
                        <p>Aucune notification</p>
                    </div>
                ) : (
                    notifications.map(n => (
                        <div key={n.id} 
                             className={`p-3 rounded-xl border transition-colors cursor-pointer group ${!n.is_read ? 'bg-indigo-50/50 border-indigo-100 dark:bg-indigo-900/10 dark:border-indigo-800' : 'bg-white border-transparent hover:border-slate-200 dark:bg-slate-900 dark:hover:border-slate-700'}`}
                             onClick={() => {
                                 onMarkRead(n.id);
                                 if (n.link) navigateTo(n.link);
                             }}>
                            <div className="flex justify-between items-start gap-2 mb-1">
                                <span className={`font-semibold text-sm line-clamp-1 ${!n.is_read ? 'text-indigo-900 dark:text-indigo-300' : 'text-slate-700 dark:text-slate-300'}`}>
                                    {n.title}
                                </span>
                                {!n.is_read && <div className="w-2 h-2 rounded-full bg-indigo-600 shrink-0 mt-1" />}
                            </div>
                            <p className={`text-xs mb-2 line-clamp-2 ${!n.is_read ? 'text-indigo-800/70 dark:text-indigo-300/70' : 'text-slate-500'}`}>
                                {n.message}
                            </p>
                            <div className="flex justify-between items-center text-[10px] text-slate-400">
                                <span>{format(parseISO(n.created_at), 'd MMM à HH:mm', { locale: fr })}</span>
                                {n.link && <ExternalLink size={12} className="opacity-0 group-hover:opacity-100 transition-opacity" />}
                            </div>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
}
