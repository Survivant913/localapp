import React, { useState, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { ChevronLeft, ChevronRight, CheckCircle2, Target, Wallet, Calendar as CalendarIcon, X, List } from 'lucide-react';

export default function DashboardCalendar({ data, filter }) {
    const [offsetDays, setOffsetDays] = useState(0);

    const timeline = useMemo(() => {
        const days = [];
        const today = new Date();
        today.setHours(0,0,0,0);

        // Build 14 days array
        for (let i = 0; i < 14; i++) {
            const d = new Date(today);
            d.setDate(today.getDate() + offsetDays + i);
            days.push({
                date: d,
                dateStr: d.toLocaleDateString('fr-CA'),
                dayName: d.toLocaleDateString('fr-FR', { weekday: 'short' }),
                dayNum: d.getDate(),
                isToday: d.getTime() === today.getTime(),
                events: []
            });
        }

        const events = [];

        // 1. Calendar Events
        (data.calendar_events || []).forEach(e => {
            const isOwner = e.user_id === data.profile?.id;
            const isDeclined = (e.my_status || e.status) === 'declined';
            if (isOwner || !isDeclined) {
                if (e.start_time) {
                    events.push({
                        type: 'calendar',
                        title: e.title,
                        date: new Date(e.start_time).toLocaleDateString('fr-CA'),
                        color: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
                        icon: <CalendarIcon size={12} />
                    });
                }
            }
        });

        // 2. Projects
        (data.projects || []).forEach(p => {
            if (p.deadline && p.status !== 'done') {
                events.push({
                    type: 'project',
                    title: p.title,
                    date: p.deadline,
                    color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
                    icon: <Target size={12} />
                });
            }
        });

        // 3. Tasks (Todos)
        (data.todos || []).forEach(t => {
            if (!t.completed && (t.deadline || t.scheduled_date)) {
                let dStr = t.deadline;
                if (t.scheduled_date) {
                     const sd = new Date(t.scheduled_date);
                     if (!isNaN(sd.getTime())) {
                         dStr = sd.toLocaleDateString('fr-CA');
                     }
                }
                if (dStr) {
                    events.push({
                        type: 'task',
                        title: t.text,
                        date: dStr,
                        color: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400',
                        icon: <CheckCircle2 size={12} />
                    });
                }
            }
        });

        const isRelevant = (item) => {
            const hiddenAccounts = data.settings?.hidden_accounts || [];
            const accId = String(item.accountId || item.account_id || '');
            const targetId = String(item.targetAccountId || item.target_account_id || '');
            
            if (!filter || filter === 'total') {
                if (accId && hiddenAccounts.includes(accId)) return false;
                if (targetId && hiddenAccounts.includes(targetId)) return false;
                return true;
            }
            return accId === String(filter) || targetId === String(filter);
        };

        // 4. Budget (Scheduled)
        if (data.budget && data.budget.scheduled) {
            data.budget.scheduled.forEach(s => {
                if (s.date && s.status !== 'paid' && isRelevant(s)) {
                    let dStr;
                    try {
                        const d = new Date(s.date);
                        if (!isNaN(d.getTime())) dStr = d.toLocaleDateString('fr-CA');
                    } catch(e){}
                    if (dStr) {
                        events.push({
                            type: 'scheduled',
                            title: s.description || 'Opération',
                            date: dStr,
                            color: s.type === 'income' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' : 'bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400',
                            icon: <Wallet size={12} />
                        });
                    }
                }
            });
        }

        // 5. Budget (Recurring)
        if (data.budget && data.budget.recurring) {
            data.budget.recurring.forEach(r => {
                const ndd = r.nextDueDate || r.next_due_date;
                if (ndd && isRelevant(r)) {
                    let dStr;
                    try {
                        const d = new Date(ndd);
                        if (!isNaN(d.getTime())) dStr = d.toLocaleDateString('fr-CA');
                    } catch(e){}
                    if (dStr) {
                        events.push({
                            type: 'recurring',
                            title: r.description || 'Récurrent',
                            date: dStr,
                            color: r.type === 'income' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' : 'bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400',
                            icon: <Wallet size={12} />
                        });
                    }
                }
            });
        }

        // 6. Budget (Transactions)
        if (data.budget && data.budget.transactions) {
            data.budget.transactions.forEach(t => {
                if (t.date && isRelevant(t)) {
                    let dStr;
                    try {
                        const d = new Date(t.date);
                        if (!isNaN(d.getTime())) dStr = d.toLocaleDateString('fr-CA');
                    } catch(e){}
                    if (dStr) {
                        events.push({
                            type: 'transaction',
                            title: t.description || 'Opération',
                            date: dStr,
                            color: t.type === 'income' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' : 'bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400',
                            icon: <Wallet size={12} />
                        });
                    }
                }
            });
        }

        // Map events to days
        days.forEach(day => {
            day.events = events.filter(e => e.date === day.dateStr);
        });

        return days;
    }, [data, offsetDays, filter]);

    const [selectedDateStr, setSelectedDateStr] = useState(new Date().toLocaleDateString('fr-CA'));
    const [showGlobalDetail, setShowGlobalDetail] = useState(false);
    const dateStripRef = React.useRef(null);

    const handlePrev = () => setOffsetDays(prev => prev - 7);
    const handleNext = () => setOffsetDays(prev => prev + 7);
    const handleToday = () => {
        setOffsetDays(0);
        setSelectedDateStr(new Date().toLocaleDateString('fr-CA'));
        if (dateStripRef.current) {
            dateStripRef.current.scrollTo({ left: 0, behavior: 'smooth' });
        }
    };

    const selectedDayData = timeline.find(d => d.dateStr === selectedDateStr) || { dateStr: selectedDateStr, dayName: '', dayNum: '', events: [] };
    
    return (
        <>
            <div className="bg-white dark:bg-[#111113] p-6 md:p-7 rounded-2xl border border-zinc-200 dark:border-zinc-800 mb-6 group transition-all relative overflow-hidden flex flex-col">
                {/* Header */}
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6 relative z-10">
                    <h3 className="text-base font-bold text-zinc-900 dark:text-white flex items-center gap-2.5 tracking-wider uppercase">
                        <div className="p-2 bg-zinc-100 dark:bg-[#09090b] rounded-lg text-zinc-900 dark:text-white border border-zinc-200 dark:border-zinc-800"><CalendarIcon size={18} strokeWidth={2}/></div>
                        Timeline
                    </h3>
                    <div className="flex items-center gap-1.5 bg-zinc-100 dark:bg-[#09090b] p-1 rounded-xl border border-zinc-200 dark:border-zinc-800">
                        <button onClick={() => setShowGlobalDetail(true)} className="p-2 hover:bg-white dark:hover:bg-zinc-900 text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white rounded-lg transition-all" title="Vue détaillée globale"><List size={16}/></button>
                        <div className="w-px h-5 bg-zinc-200 dark:bg-zinc-800 mx-0.5"></div>
                        <button onClick={handleToday} className="px-3 py-1.5 hover:bg-white dark:hover:bg-zinc-900 text-zinc-700 dark:text-zinc-300 hover:text-zinc-900 dark:hover:text-white rounded-lg text-[11px] font-mono font-bold uppercase tracking-wider transition-all">Auj.</button>
                        <div className="w-px h-5 bg-zinc-200 dark:bg-zinc-800 mx-0.5"></div>
                        <button onClick={handlePrev} className="p-2 hover:bg-white dark:hover:bg-zinc-900 text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white rounded-lg transition-all"><ChevronLeft size={16}/></button>
                        <button onClick={handleNext} className="p-2 hover:bg-white dark:hover:bg-zinc-900 text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white rounded-lg transition-all"><ChevronRight size={16}/></button>
                    </div>
                </div>

                {/* Date Strip (Top) */}
                <div className="relative z-10 -mx-4 px-4 sm:mx-0 sm:px-0 mb-6">
                    <div ref={dateStripRef} className="flex gap-2.5 overflow-x-auto pb-2 pt-1 scrollbar-hide snap-x snap-mandatory" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
                        {timeline.map((day, idx) => {
                            const isSelected = day.dateStr === selectedDateStr;
                            const hasEvents = day.events.length > 0;
                            return (
                                <div 
                                    key={idx} 
                                    onClick={() => setSelectedDateStr(day.dateStr)}
                                    className={`
                                        w-[68px] shrink-0 snap-start rounded-xl p-2.5 transition-all duration-150 relative cursor-pointer flex flex-col items-center justify-center border
                                        ${isSelected 
                                            ? 'bg-zinc-900 dark:bg-white border-zinc-900 dark:border-white' 
                                            : 'bg-zinc-50 dark:bg-[#09090b] hover:border-zinc-400 dark:hover:border-zinc-600 border-zinc-200 dark:border-zinc-800'
                                        }
                                    `}
                                >
                                    <span className={`text-[10px] font-mono uppercase tracking-wider block mb-0.5 transition-colors ${isSelected ? 'text-zinc-400 dark:text-zinc-600' : (day.isToday ? 'text-zinc-900 dark:text-white font-bold' : 'text-zinc-500')}`}>{day.dayName.replace('.', '')}</span>
                                    <span className={`text-xl font-bold font-mono tracking-tight transition-colors ${isSelected ? 'text-white dark:text-[#09090b]' : (day.isToday ? 'text-zinc-900 dark:text-white' : 'text-zinc-700 dark:text-zinc-300')}`}>{day.dayNum}</span>
                                    
                                    {/* Indicateurs d'événements */}
                                    <div className="h-1.5 flex gap-0.5 mt-1.5 justify-center w-full">
                                        {hasEvents ? (
                                            day.events.slice(0, 3).map((evt, i) => (
                                                <div key={i} className={`w-1 h-1 rounded-full ${isSelected ? 'bg-white/60 dark:bg-[#09090b]/50' : 'bg-zinc-400 dark:bg-zinc-500'}`}></div>
                                            ))
                                        ) : (
                                            <div className="w-1 h-1 rounded-full bg-transparent"></div>
                                        )}
                                        {day.events.length > 3 && <div className={`w-1 h-1 rounded-full ${isSelected ? 'bg-white/60 dark:bg-[#09090b]/50' : 'bg-zinc-500'}`}></div>}
                                    </div>

                                    {day.isToday && !isSelected && <div className="absolute top-1.5 right-1.5 w-1.5 h-1.5 bg-zinc-900 dark:bg-white rounded-full"></div>}
                                </div>
                            );
                        })}
                    </div>
                </div>

                {/* Focus Details Area (Bottom) */}
                <div className="relative z-10 flex-1 min-h-[260px] bg-zinc-50 dark:bg-[#09090b] rounded-xl p-5 md:p-6 border border-zinc-200 dark:border-zinc-800 overflow-hidden flex flex-col">
                    <div className="flex items-end justify-between mb-6 pb-4 border-b border-zinc-200 dark:border-zinc-800">
                        <div>
                            <p className="text-[11px] font-mono uppercase tracking-widest text-zinc-500 mb-1">Programme du jour</p>
                            <h4 className="text-2xl font-bold text-zinc-900 dark:text-white capitalize">
                                {new Date(selectedDateStr).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })}
                            </h4>
                        </div>
                        <div className="text-right hidden sm:block">
                            <p className="text-2xl font-bold font-mono text-zinc-400 dark:text-zinc-600">{selectedDayData.events.length}</p>
                            <p className="text-[10px] font-mono uppercase tracking-widest text-zinc-500">Événement{selectedDayData.events.length !== 1 ? 's' : ''}</p>
                        </div>
                    </div>

                    <div className="flex-1 overflow-y-auto custom-scrollbar pr-2 space-y-3">
                        {selectedDayData.events.length === 0 ? (
                            <div className="h-full flex flex-col items-center justify-center opacity-40 text-center py-10">
                                <div className="p-3 bg-zinc-200 dark:bg-zinc-900 rounded-full mb-3 border border-zinc-300 dark:border-zinc-800">
                                    <CheckCircle2 size={28} className="text-zinc-500" />
                                </div>
                                <p className="text-sm font-semibold text-zinc-600 dark:text-zinc-300">Rien de prévu pour ce jour</p>
                                <p className="text-xs text-zinc-500 mt-1">Profitez de votre temps libre.</p>
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
                                {selectedDayData.events.map((evt, i) => (
                                    <div key={i} className="group flex items-start gap-3.5 p-4 rounded-xl bg-white dark:bg-[#141416] border border-zinc-200 dark:border-zinc-800 hover:border-zinc-400 dark:hover:border-zinc-600 transition-all duration-150">
                                        <div className="p-2.5 bg-zinc-100 dark:bg-[#09090b] border border-zinc-200 dark:border-zinc-800 rounded-lg shrink-0 flex items-center justify-center text-zinc-700 dark:text-zinc-300">
                                            {React.cloneElement(evt.icon, { size: 18, strokeWidth: 2 })}
                                        </div>
                                        <div className="flex-1 min-w-0 pt-0.5">
                                            <div className="flex justify-between items-start gap-2">
                                                <p className="font-semibold text-sm text-zinc-900 dark:text-zinc-100 leading-tight mb-1.5 line-clamp-2">{evt.title}</p>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded bg-zinc-100 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-[10px] font-mono uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                                                    {evt.type}
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>

                <style jsx>{`
                    .scrollbar-hide::-webkit-scrollbar {
                        display: none;
                    }
                    .custom-scrollbar::-webkit-scrollbar {
                        width: 6px;
                    }
                    .custom-scrollbar::-webkit-scrollbar-track {
                        background: transparent;
                    }
                    .custom-scrollbar::-webkit-scrollbar-thumb {
                        background-color: #d4d4d8;
                        border-radius: 9999px;
                    }
                    :global(.dark) .custom-scrollbar::-webkit-scrollbar-thumb {
                        background-color: #27272a;
                    }
                `}</style>
            </div>

            {/* Modal Focus Global (Agenda) MOVED TO PORTAL */}
            {showGlobalDetail && typeof document !== 'undefined' && createPortal(
                <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 md:p-8" style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0 }}>
                    <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={() => setShowGlobalDetail(false)}></div>
                    <div className="bg-white dark:bg-[#111113] rounded-2xl w-full max-w-3xl shadow-2xl relative z-10 border border-zinc-200 dark:border-zinc-800 overflow-hidden flex flex-col max-h-[90vh] animate-in fade-in slide-in-from-bottom-6 duration-200">
                        <div className="p-6 border-b border-zinc-200 dark:border-zinc-800 flex justify-between items-center bg-zinc-50 dark:bg-[#09090b] shrink-0">
                            <div>
                                <h3 className="text-xl font-bold text-zinc-900 dark:text-white flex items-center gap-3 tracking-tight">
                                    <div className="p-2 bg-zinc-100 dark:bg-[#141416] rounded-lg text-zinc-900 dark:text-white border border-zinc-200 dark:border-zinc-800"><CalendarIcon size={20} strokeWidth={2}/></div>
                                    Timeline
                                </h3>
                                <p className="text-zinc-500 mt-1 text-xs font-mono uppercase tracking-wider">Votre semaine en un coup d'œil</p>
                            </div>
                            <button onClick={() => setShowGlobalDetail(false)} className="p-2.5 bg-zinc-100 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg text-zinc-500 hover:text-zinc-900 dark:hover:text-white transition-all"><X size={20}/></button>
                        </div>
                        <div className="p-6 overflow-y-auto flex-1 space-y-6 bg-white dark:bg-[#111113] custom-scrollbar">
                            {timeline.filter(day => day.events.length > 0).length === 0 ? (
                                <div className="text-center py-12 opacity-50">
                                    <CalendarIcon size={40} className="mx-auto mb-4 opacity-50" />
                                    <p className="font-semibold text-sm">Aucun événement prévu.</p>
                                </div>
                            ) : (
                                timeline.filter(day => day.events.length > 0).map((day, idx) => (
                                    <div key={idx} className="flex gap-6">
                                        <div className="w-16 shrink-0 text-right pt-2">
                                            <p className="text-[10px] font-mono uppercase tracking-widest text-zinc-500">{day.dayName}</p>
                                            <p className={`text-2xl font-bold font-mono ${day.isToday ? 'text-zinc-900 dark:text-white' : 'text-zinc-600 dark:text-zinc-400'}`}>{day.dayNum}</p>
                                        </div>
                                        <div className="flex-1 space-y-2.5 relative">
                                            {/* Ligne verticale de connexion */}
                                            <div className="absolute -left-3 top-2 bottom-0 w-px bg-zinc-200 dark:bg-zinc-800"></div>
                                            
                                            {day.events.map((evt, i) => (
                                                <div key={i} className="p-3.5 rounded-xl flex items-center gap-3.5 bg-zinc-50 dark:bg-[#09090b] border border-zinc-200 dark:border-zinc-800 hover:border-zinc-400 dark:hover:border-zinc-700 transition-all">
                                                    <div className="p-2.5 bg-white dark:bg-[#141416] border border-zinc-200 dark:border-zinc-800 rounded-lg shrink-0 text-zinc-700 dark:text-zinc-300">
                                                        {evt.icon}
                                                    </div>
                                                    <div className="flex-1 min-w-0">
                                                        <p className="font-semibold text-sm text-zinc-900 dark:text-white truncate">{evt.title}</p>
                                                        <p className="text-[10px] font-mono uppercase tracking-wider text-zinc-500 mt-0.5">{evt.type}</p>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                </div>,
                document.body
            )}
        </>
    );
}
