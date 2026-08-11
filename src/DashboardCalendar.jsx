import React, { useState, useMemo } from 'react';
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
        <div className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl p-8 rounded-[2.5rem] border border-slate-100/50 dark:border-slate-800/50 shadow-2xl mb-8 group transition-all relative overflow-hidden flex flex-col">
            {/* Decorative background elements */}
            <div className="absolute inset-0 bg-[linear-gradient(to_right,#8080800a_1px,transparent_1px),linear-gradient(to_bottom,#8080800a_1px,transparent_1px)] bg-[size:24px_24px] pointer-events-none"></div>
            <div className="absolute -right-20 -top-20 opacity-[0.02] text-indigo-500 pointer-events-none"><CalendarIcon size={300}/></div>
            <div className="absolute top-0 right-1/4 w-96 h-96 bg-indigo-500/5 dark:bg-indigo-500/10 rounded-full blur-3xl pointer-events-none"></div>
            <div className="absolute bottom-0 left-1/4 w-96 h-96 bg-purple-500/5 dark:bg-purple-500/10 rounded-full blur-3xl pointer-events-none"></div>

            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8 relative z-10">
                <h3 className="text-xl font-black text-slate-800 dark:text-white flex items-center gap-3 tracking-tighter uppercase">
                    <div className="p-2.5 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-2xl text-white shadow-lg shadow-indigo-500/20"><CalendarIcon size={20} strokeWidth={2.5}/></div>
                    Focus Agenda
                </h3>
                <div className="flex items-center gap-2 bg-slate-50 dark:bg-slate-800/50 p-1.5 rounded-2xl border border-slate-200/50 dark:border-slate-700/50 backdrop-blur-md">
                    <button onClick={handleToday} className="px-4 py-2 hover:bg-white dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 rounded-xl text-[11px] font-black uppercase tracking-widest transition-all shadow-sm border border-transparent hover:border-slate-200 dark:hover:border-slate-600">Aujourd'hui</button>
                    <div className="w-px h-6 bg-slate-200 dark:bg-slate-700 mx-1"></div>
                    <button onClick={handlePrev} className="p-2 hover:bg-white dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 rounded-xl transition-all shadow-sm border border-transparent hover:border-slate-200 dark:hover:border-slate-600"><ChevronLeft size={18}/></button>
                    <button onClick={handleNext} className="p-2 hover:bg-white dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 rounded-xl transition-all shadow-sm border border-transparent hover:border-slate-200 dark:hover:border-slate-600"><ChevronRight size={18}/></button>
                </div>
            </div>

            {/* Date Strip (Top) */}
            <div className="relative z-10 -mx-4 px-4 sm:mx-0 sm:px-0 mb-8">
                <div ref={dateStripRef} className="flex gap-3 overflow-x-auto pb-4 pt-2 scrollbar-hide snap-x snap-mandatory" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
                    {timeline.map((day, idx) => {
                        const isSelected = day.dateStr === selectedDateStr;
                        const hasEvents = day.events.length > 0;
                        return (
                            <div 
                                key={idx} 
                                onClick={() => setSelectedDateStr(day.dateStr)}
                                className={`
                                    w-[72px] shrink-0 snap-start rounded-[1.5rem] p-3 transition-all duration-300 relative cursor-pointer flex flex-col items-center justify-center
                                    ${isSelected 
                                        ? 'bg-slate-800 dark:bg-white shadow-xl shadow-slate-800/10 scale-110 z-10 ring-4 ring-slate-100 dark:ring-slate-800' 
                                        : 'bg-white/60 dark:bg-slate-800/40 hover:bg-white dark:hover:bg-slate-700 hover:shadow-md border border-slate-200/50 dark:border-slate-700/50'
                                    }
                                `}
                            >
                                <span className={`text-[10px] font-black uppercase tracking-widest block mb-1 transition-colors ${isSelected ? 'text-slate-300 dark:text-slate-500' : (day.isToday ? 'text-indigo-500' : 'text-slate-400')}`}>{day.dayName.replace('.', '')}</span>
                                <span className={`text-2xl font-black tracking-tighter transition-colors ${isSelected ? 'text-white dark:text-slate-900' : (day.isToday ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-700 dark:text-slate-200')}`}>{day.dayNum}</span>
                                
                                {/* Indicateurs d'événements */}
                                <div className="h-1.5 flex gap-0.5 mt-2 justify-center w-full">
                                    {hasEvents ? (
                                        day.events.slice(0, 3).map((evt, i) => (
                                            <div key={i} className={`w-1.5 h-1.5 rounded-full ${isSelected ? 'bg-white/50 dark:bg-slate-900/40' : (evt.color.includes('emerald') ? 'bg-emerald-400' : evt.color.includes('rose') ? 'bg-rose-400' : evt.color.includes('orange') ? 'bg-orange-400' : evt.color.includes('purple') ? 'bg-purple-400' : 'bg-blue-400')}`}></div>
                                        ))
                                    ) : (
                                        <div className="w-1 h-1 rounded-full bg-transparent"></div>
                                    )}
                                    {day.events.length > 3 && <div className={`w-1.5 h-1.5 rounded-full ${isSelected ? 'bg-white/50 dark:bg-slate-900/40' : 'bg-slate-300 dark:bg-slate-600'}`}></div>}
                                </div>

                                {day.isToday && !isSelected && <div className="absolute top-2 right-2 w-2 h-2 bg-indigo-500 rounded-full animate-ping opacity-50"></div>}
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* Focus Details Area (Bottom) */}
            <div className="relative z-10 flex-1 min-h-[300px] bg-slate-50/50 dark:bg-slate-900/50 rounded-[2rem] p-6 md:p-8 border border-slate-200/50 dark:border-slate-700/50 overflow-hidden flex flex-col">
                <div className="flex items-end justify-between mb-8 pb-4 border-b border-slate-200/50 dark:border-slate-800/50">
                    <div>
                        <p className="text-sm font-black uppercase tracking-widest text-indigo-500 dark:text-indigo-400 mb-1">Programme du jour</p>
                        <h4 className="text-3xl font-black text-slate-800 dark:text-white capitalize">
                            {new Date(selectedDateStr).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })}
                        </h4>
                    </div>
                    <div className="text-right hidden sm:block">
                        <p className="text-3xl font-black text-slate-300 dark:text-slate-700">{selectedDayData.events.length}</p>
                        <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Événement{selectedDayData.events.length !== 1 ? 's' : ''}</p>
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto custom-scrollbar pr-2 space-y-4">
                    {selectedDayData.events.length === 0 ? (
                        <div className="h-full flex flex-col items-center justify-center opacity-40 text-center py-12">
                            <div className="p-4 bg-slate-200 dark:bg-slate-800 rounded-full mb-4">
                                <CheckCircle2 size={40} className="text-slate-500" />
                            </div>
                            <p className="text-lg font-bold text-slate-600 dark:text-slate-300">Rien de prévu pour ce jour</p>
                            <p className="text-sm font-medium mt-2">Profitez de votre temps libre !</p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                            {selectedDayData.events.map((evt, i) => (
                                <div key={i} className={`group flex items-start gap-4 p-5 rounded-2xl border border-white/40 dark:border-white/5 shadow-sm hover:shadow-lg hover:-translate-y-1 transition-all duration-300 ${evt.color.replace('bg-', 'bg-gradient-to-br from-').replace('100', '50/80').replace('900/30', '900/20')} backdrop-blur-sm`}>
                                    <div className="p-3 bg-white/60 dark:bg-black/20 rounded-[1rem] shrink-0 shadow-sm flex items-center justify-center">
                                        {React.cloneElement(evt.icon, { size: 24, strokeWidth: 2 })}
                                    </div>
                                    <div className="flex-1 min-w-0 pt-0.5">
                                        <div className="flex justify-between items-start gap-2">
                                            <p className="font-bold text-base text-slate-800 dark:text-slate-100 leading-tight mb-1.5 line-clamp-2">{evt.title}</p>
                                        </div>
                                        <div className="flex items-center gap-3">
                                            <span className="inline-flex items-center gap-1.5 px-2 py-1 rounded-md bg-white/50 dark:bg-black/20 text-[10px] font-black uppercase tracking-widest opacity-80">
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
