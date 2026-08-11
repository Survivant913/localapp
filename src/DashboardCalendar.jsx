import React, { useState, useMemo } from 'react';
import { ChevronLeft, ChevronRight, CheckCircle2, Target, Wallet, Calendar as CalendarIcon, X, List } from 'lucide-react';

export default function DashboardCalendar({ data, filter }) {
    const [offsetDays, setOffsetDays] = useState(0);
    const [focusedDay, setFocusedDay] = useState(null);
    const [showGlobalDetail, setShowGlobalDetail] = useState(false);

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
            if (e.start_time) {
                events.push({
                    type: 'calendar',
                    title: e.title,
                    date: new Date(e.start_time).toLocaleDateString('fr-CA'),
                    color: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
                    icon: <CalendarIcon size={12} />
                });
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

        // Map events to days
        days.forEach(day => {
            day.events = events.filter(e => e.date === day.dateStr);
        });

        return days;
    }, [data, offsetDays, filter]);

    const handlePrev = () => setOffsetDays(prev => prev - 7);
    const handleNext = () => setOffsetDays(prev => prev + 7);
    const handleToday = () => setOffsetDays(0);

    return (
        <div className="bg-white dark:bg-slate-900 p-8 rounded-[2.5rem] border border-slate-100 dark:border-slate-800 shadow-2xl mb-8 group transition-all relative overflow-hidden">
            {/* Decorative background elements */}
            <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px] pointer-events-none"></div>
            <div className="absolute -right-10 -top-10 opacity-[0.02] text-indigo-500 pointer-events-none"><CalendarIcon size={200}/></div>

            <div className="flex justify-between items-center mb-8 relative z-10">
                <h3 className="text-xl font-black text-slate-800 dark:text-white flex items-center gap-3 tracking-tighter uppercase">
                    <div className="p-2 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl text-white shadow-lg shadow-indigo-500/30"><CalendarIcon size={22}/></div>
                    Timeline
                </h3>
                <div className="flex items-center gap-2">
                    <button onClick={() => setShowGlobalDetail(true)} className="p-2.5 bg-white dark:bg-slate-800 hover:bg-indigo-50 hover:text-indigo-600 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 rounded-2xl transition-all shadow-sm border border-slate-200 dark:border-slate-700" title="Vue détaillée globale"><List size={16}/></button>
                    <button onClick={handleToday} className="px-5 py-2 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all shadow-sm border border-slate-200 dark:border-slate-700">Auj.</button>
                    <div className="flex gap-1 ml-2">
                        <button onClick={handlePrev} className="p-2.5 bg-white dark:bg-slate-800 hover:bg-indigo-50 hover:text-indigo-600 dark:hover:bg-indigo-900/30 dark:hover:text-indigo-400 rounded-2xl text-slate-600 dark:text-slate-300 transition-all shadow-sm border border-slate-200 dark:border-slate-700"><ChevronLeft size={16}/></button>
                        <button onClick={handleNext} className="p-2.5 bg-white dark:bg-slate-800 hover:bg-indigo-50 hover:text-indigo-600 dark:hover:bg-indigo-900/30 dark:hover:text-indigo-400 rounded-2xl text-slate-600 dark:text-slate-300 transition-all shadow-sm border border-slate-200 dark:border-slate-700"><ChevronRight size={16}/></button>
                    </div>
                </div>
            </div>

            <div className="relative z-10 -mx-4 px-4 sm:mx-0 sm:px-0">
                <div className="flex gap-4 overflow-x-auto pb-6 pt-2 scrollbar-hide snap-x snap-mandatory" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
                    {timeline.map((day, idx) => (
                        <div 
                            key={idx} 
                            className={`
                                w-[140px] shrink-0 snap-start rounded-[2rem] p-4 transition-all duration-300 relative group/day flex flex-col backdrop-blur-sm
                                ${day.isToday 
                                    ? 'border-2 border-indigo-400 dark:border-indigo-500 bg-gradient-to-b from-indigo-50/90 to-purple-50/90 dark:from-indigo-900/40 dark:to-purple-900/30 shadow-xl shadow-indigo-500/10 scale-[1.02] z-10' 
                                    : 'border border-slate-200/60 dark:border-slate-800/60 bg-white/60 dark:bg-slate-800/40 hover:bg-white dark:hover:bg-slate-800 hover:border-indigo-200 dark:hover:border-indigo-800 hover:shadow-xl hover:-translate-y-1 hover:shadow-indigo-500/5'
                                }
                            `}
                        >
                            {day.isToday && <div className="absolute inset-0 rounded-[2rem] ring-1 ring-inset ring-white/50 dark:ring-white/10 pointer-events-none"></div>}
                            
                            <div className="text-center mb-6 relative mt-2">
                                <span className={`text-[10px] font-black uppercase tracking-widest block mb-1 ${day.isToday ? 'text-indigo-600 dark:text-indigo-300' : 'text-slate-400'}`}>{day.dayName.replace('.', '')}</span>
                                <span className={`text-3xl font-black tracking-tighter ${day.isToday ? 'text-indigo-700 dark:text-indigo-100' : 'text-slate-800 dark:text-white'}`}>{day.dayNum}</span>
                                {day.isToday && <div className="absolute -top-2 -right-2 w-2.5 h-2.5 bg-indigo-500 rounded-full animate-ping opacity-75"></div>}
                                {day.isToday && <div className="absolute -top-2 -right-2 w-2.5 h-2.5 bg-indigo-500 rounded-full shadow-lg shadow-indigo-500/50"></div>}
                            </div>
                            <div className="flex-1 space-y-2.5">
                                {day.events.length === 0 ? (
                                    <div className="flex flex-col items-center justify-center h-full opacity-30 py-6">
                                        <span className={`w-1.5 h-1.5 rounded-full ${day.isToday ? 'bg-indigo-400' : 'bg-slate-300 dark:bg-slate-600'} inline-block mb-1 group-hover/day:scale-150 transition-all`}></span>
                                        <span className={`w-1 h-1 rounded-full ${day.isToday ? 'bg-indigo-300' : 'bg-slate-200 dark:bg-slate-700'} inline-block`}></span>
                                    </div>
                                ) : (
                                    <>
                                        {day.events.slice(0, 2).map((evt, i) => (
                                            <div key={i} onClick={() => setFocusedDay(day)} className={`px-3.5 py-3 rounded-2xl text-[10px] font-bold flex flex-col gap-1.5 ${evt.color} shadow-sm group-hover/day:shadow-md transition-all duration-300 hover:scale-105 hover:-rotate-1 cursor-pointer relative overflow-hidden border border-white/40 dark:border-white/5`}>
                                                <div className="absolute top-0 right-0 p-1 opacity-[0.15] transform translate-x-1 -translate-y-1 rotate-12 scale-150">
                                                    {evt.icon}
                                                </div>
                                                <div className="flex items-center gap-1.5 opacity-90 relative z-10">
                                                    {evt.icon}
                                                </div>
                                                <span className="truncate leading-snug relative z-10 font-black">{evt.title}</span>
                                            </div>
                                        ))}
                                        {day.events.length > 2 && (
                                            <button 
                                                onClick={() => setFocusedDay(day)}
                                                className="w-full py-2 mt-1 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 text-[10px] font-bold uppercase tracking-wider hover:bg-indigo-50 hover:text-indigo-600 dark:hover:bg-indigo-900/30 dark:hover:text-indigo-400 transition-all border border-transparent hover:border-indigo-200 dark:hover:border-indigo-800"
                                            >
                                                + {day.events.length - 2} autres...
                                            </button>
                                        )}
                                    </>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            </div>
            {/* Modal Focus Jour */}
            {focusedDay && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={() => setFocusedDay(null)}></div>
                    <div className="bg-white dark:bg-slate-900 rounded-[2rem] w-full max-w-md shadow-2xl relative z-10 border border-slate-100 dark:border-slate-800 overflow-hidden flex flex-col max-h-[80vh] animate-in fade-in zoom-in-95 duration-200">
                        <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-slate-50/50 dark:bg-slate-800/50">
                            <div>
                                <p className="text-xs font-black uppercase tracking-widest text-indigo-500 mb-1">{focusedDay.dayName}</p>
                                <h3 className="text-2xl font-black text-slate-800 dark:text-white">{focusedDay.dayNum} {focusedDay.date.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })}</h3>
                            </div>
                            <button onClick={() => setFocusedDay(null)} className="p-2 bg-slate-100 dark:bg-slate-800 rounded-xl text-slate-500 hover:text-slate-800 dark:hover:text-white"><X size={20}/></button>
                        </div>
                        <div className="p-6 overflow-y-auto flex-1 space-y-3 custom-scrollbar">
                            {focusedDay.events.map((evt, i) => (
                                <div key={i} className={`p-4 rounded-2xl flex items-center gap-4 ${evt.color} border border-white/20 dark:border-white/5 shadow-sm hover:scale-[1.02] transition-all`}>
                                    <div className="p-3 bg-white/50 dark:bg-black/20 rounded-xl shrink-0">
                                        {evt.icon}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="font-bold text-sm leading-tight truncate">{evt.title}</p>
                                        <p className="text-[10px] uppercase tracking-wider opacity-70 font-bold mt-1">{evt.type}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            )}

            {/* Modal Focus Global (Agenda) */}
            {showGlobalDetail && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 md:p-8">
                    <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-md" onClick={() => setShowGlobalDetail(false)}></div>
                    <div className="bg-white dark:bg-slate-900 rounded-[2rem] w-full max-w-3xl shadow-2xl relative z-10 border border-slate-100 dark:border-slate-800 overflow-hidden flex flex-col max-h-[90vh] animate-in fade-in slide-in-from-bottom-8 duration-300">
                        <div className="p-6 md:p-8 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-slate-50/50 dark:bg-slate-800/50 shrink-0">
                            <div>
                                <h3 className="text-2xl font-black text-slate-800 dark:text-white flex items-center gap-3">
                                    <div className="p-2 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl text-white shadow-lg"><List size={24}/></div>
                                    Vue Détaillée
                                </h3>
                                <p className="text-slate-500 mt-2 font-medium">Vos prochains jours chargés</p>
                            </div>
                            <button onClick={() => setShowGlobalDetail(false)} className="p-3 bg-slate-100 dark:bg-slate-800 rounded-xl text-slate-500 hover:bg-slate-200 dark:hover:bg-slate-700 hover:text-slate-800 dark:hover:text-white transition-all"><X size={24}/></button>
                        </div>
                        <div className="p-6 md:p-8 overflow-y-auto flex-1 space-y-8 bg-slate-50/30 dark:bg-slate-900/30 custom-scrollbar">
                            {timeline.filter(day => day.events.length > 0).length === 0 ? (
                                <div className="text-center py-12 opacity-50">
                                    <CalendarIcon size={48} className="mx-auto mb-4 opacity-50" />
                                    <p className="font-bold">Aucun événement prévu.</p>
                                </div>
                            ) : (
                                timeline.filter(day => day.events.length > 0).map((day, idx) => (
                                    <div key={idx} className="flex gap-6">
                                        <div className="w-16 shrink-0 text-right pt-2">
                                            <p className="text-xs font-black uppercase tracking-widest text-slate-400">{day.dayName}</p>
                                            <p className={`text-2xl font-black ${day.isToday ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-800 dark:text-slate-200'}`}>{day.dayNum}</p>
                                        </div>
                                        <div className="flex-1 space-y-3 relative">
                                            {/* Ligne verticale de connexion */}
                                            <div className="absolute -left-3 top-2 bottom-0 w-px bg-slate-200 dark:bg-slate-800"></div>
                                            
                                            {day.events.map((evt, i) => (
                                                <div key={i} className={`p-4 rounded-2xl flex items-center gap-4 ${evt.color} border border-white/40 dark:border-white/5 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all`}>
                                                    <div className="p-3 bg-white/50 dark:bg-black/20 rounded-xl shrink-0 shadow-inner">
                                                        {evt.icon}
                                                    </div>
                                                    <div className="flex-1 min-w-0">
                                                        <p className="font-bold text-sm truncate">{evt.title}</p>
                                                        <p className="text-[10px] uppercase tracking-wider opacity-70 font-bold mt-1">{evt.type}</p>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                </div>
            )}

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
                    background-color: #cbd5e1;
                    border-radius: 10px;
                }
                :global(.dark) .custom-scrollbar::-webkit-scrollbar-thumb {
                    background-color: #475569;
                }
            `}</style>
        </div>
    );
}
