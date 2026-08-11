import React, { useState, useMemo } from 'react';
import { ChevronLeft, ChevronRight, CheckCircle2, Target, Wallet, Calendar as CalendarIcon } from 'lucide-react';

export default function DashboardCalendar({ data }) {
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

        // 4. Budget (Scheduled)
        if (data.budget && data.budget.scheduled) {
            data.budget.scheduled.forEach(s => {
                if (s.date && s.status !== 'paid') {
                    events.push({
                        type: 'scheduled',
                        title: s.description || 'Opération',
                        date: s.date,
                        color: s.type === 'income' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' : 'bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400',
                        icon: <Wallet size={12} />
                    });
                }
            });
        }

        // 5. Budget (Recurring)
        if (data.budget && data.budget.recurring) {
            data.budget.recurring.forEach(r => {
                if (r.nextDueDate || r.next_due_date) {
                    const ndd = r.nextDueDate || r.next_due_date;
                    events.push({
                        type: 'recurring',
                        title: r.description || 'Récurrent',
                        date: ndd,
                        color: r.type === 'income' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' : 'bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400',
                        icon: <Wallet size={12} />
                    });
                }
            });
        }

        // Map events to days
        days.forEach(day => {
            day.events = events.filter(e => e.date === day.dateStr);
        });

        return days;
    }, [data, offsetDays]);

    const handlePrev = () => setOffsetDays(prev => prev - 7);
    const handleNext = () => setOffsetDays(prev => prev + 7);
    const handleToday = () => setOffsetDays(0);

    return (
        <div className="bg-white dark:bg-slate-900 p-8 rounded-[2.5rem] border border-slate-100 dark:border-slate-800 shadow-2xl mb-8 group transition-all relative overflow-hidden">
            <div className="absolute -right-10 -top-10 opacity-[0.02] text-indigo-500 pointer-events-none"><CalendarIcon size={200}/></div>
            <div className="flex justify-between items-center mb-8 relative z-10">
                <h3 className="text-xl font-black text-slate-800 dark:text-white flex items-center gap-3 tracking-tighter uppercase">
                    <div className="p-2 bg-indigo-50 dark:bg-indigo-900/20 rounded-xl text-indigo-600"><CalendarIcon size={22}/></div>
                    Timeline
                </h3>
                <div className="flex items-center gap-2">
                    <button onClick={handleToday} className="px-4 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all">Auj.</button>
                    <div className="flex gap-1 ml-2">
                        <button onClick={handlePrev} className="p-2.5 bg-slate-100 dark:bg-slate-800 hover:bg-indigo-50 hover:text-indigo-600 dark:hover:bg-indigo-900/30 dark:hover:text-indigo-400 rounded-2xl text-slate-600 dark:text-slate-300 transition-all"><ChevronLeft size={16}/></button>
                        <button onClick={handleNext} className="p-2.5 bg-slate-100 dark:bg-slate-800 hover:bg-indigo-50 hover:text-indigo-600 dark:hover:bg-indigo-900/30 dark:hover:text-indigo-400 rounded-2xl text-slate-600 dark:text-slate-300 transition-all"><ChevronRight size={16}/></button>
                    </div>
                </div>
            </div>

            <div className="flex gap-4 overflow-x-auto pb-4 scrollbar-hide snap-x snap-mandatory relative z-10" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
                {timeline.map((day, idx) => (
                    <div key={idx} className={`w-[140px] shrink-0 snap-start rounded-[2rem] p-4 border transition-all ${day.isToday ? 'border-indigo-500 bg-indigo-50/50 dark:bg-indigo-900/20 shadow-sm' : 'border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30 hover:border-slate-200 dark:hover:border-slate-700'} flex flex-col`}>
                        <div className="text-center mb-5">
                            <span className={`text-[10px] font-black uppercase tracking-widest block mb-1 ${day.isToday ? 'text-indigo-500' : 'text-slate-400'}`}>{day.dayName.replace('.', '')}</span>
                            <span className={`text-2xl font-black ${day.isToday ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-800 dark:text-white'}`}>{day.dayNum}</span>
                        </div>
                        <div className="flex-1 space-y-2">
                            {day.events.length === 0 ? (
                                <div className="flex items-center justify-center h-full opacity-30 py-4">
                                    <span className="w-1.5 h-1.5 rounded-full bg-slate-300 dark:bg-slate-600 inline-block"></span>
                                </div>
                            ) : (
                                day.events.map((evt, i) => (
                                    <div key={i} className={`px-3 py-2.5 rounded-xl text-[10px] font-bold flex flex-col gap-1.5 ${evt.color} shadow-sm shadow-black/5`}>
                                        <div className="flex items-center gap-1.5 opacity-70">
                                            {evt.icon}
                                        </div>
                                        <span className="truncate leading-snug">{evt.title}</span>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                ))}
            </div>
            <style jsx>{`
                .scrollbar-hide::-webkit-scrollbar {
                    display: none;
                }
            `}</style>
        </div>
    );
}
