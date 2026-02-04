import { useState, useEffect, useMemo } from 'react';
// CHEMIN CORRIGÉ : ./ car on est à la racine de src
import { supabase } from './supabaseClient';
import * as Icons from 'lucide-react';
import { 
  Plus, Trash2, Check, BarChart2, 
  Settings, Target, ChevronLeft, ChevronRight, Zap, Trophy, Loader2, List, CheckCircle2,
  Sparkles
} from 'lucide-react';

const PREMIUM_ICONS = [
    "Activity", "HeartPulse", "Dumbbell", "Bike", "Footprints", "GlassWater", "Apple", "Pill", "BedDouble",
    "Briefcase", "Laptop", "Code", "PenTool", "BookOpen", "BrainCircuit", "Target", "AlarmClock",
    "Wallet", "PiggyBank", "CreditCard", "TrendingUp", "DollarSign",
    "Music", "Camera", "Gamepad2", "Plane", "Coffee", "Home", "ShoppingCart", "Utensils", "Sun", "Moon", "Leaf"
];

const DynamicIcon = ({ name, size = 24, className = "" }) => {
    if (!name) return null;
    const pascalName = name.charAt(0).toUpperCase() + name.slice(1);
    const IconComponent = Icons[pascalName] || Icons[name];
    if (!IconComponent) return <span className="text-xs">?</span>; 
    return <IconComponent size={size} className={className} />;
};

const Badge = ({ color, text }) => (
    <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${color || 'bg-gray-100 text-gray-500 dark:bg-slate-700 dark:text-gray-400'}`}>
        {text}
    </span>
);

const getLocalYYYYMMDD = (dateObj) => {
    if (!dateObj) return null;
    const d = new Date(dateObj);
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
};

const COLOR_MAP = {
    'bg-blue-500': 'text-blue-500',
    'bg-green-500': 'text-green-500',
    'bg-purple-500': 'text-purple-500',
    'bg-orange-500': 'text-orange-500',
    'bg-red-500': 'text-red-500',
    'bg-gray-400': 'text-gray-400'
};

export default function HabitTracker({ }) {
    const [activeTab, setActiveTab] = useState('daily'); 
    const [selectedDate, setSelectedDate] = useState(new Date());
    const [statRange, setStatRange] = useState(7); 
    
    const [categories, setCategories] = useState([]);
    const [habits, setHabits] = useState([]);
    const [logs, setLogs] = useState([]);
    const [loading, setLoading] = useState(true);
    const [processingHabits, setProcessingHabits] = useState(new Set());

    useEffect(() => {
        loadHabitData();
    }, []);

    const loadHabitData = async () => {
        try {
            setLoading(true);
            const { data: cats } = await supabase.from('habit_categories').select('*').order('name');
            const { data: habs } = await supabase.from('habits').select('*').order('created_at');
            
            const d = new Date(); d.setDate(d.getDate() - 365);
            const { data: lgs } = await supabase
                .from('habit_logs')
                .select('*')
                .gte('date', getLocalYYYYMMDD(d))
                .limit(10000); 

            setCategories(cats || []);
            setHabits(habs || []);
            setLogs(lgs || []);
        } catch (e) {
            console.error("Erreur chargement habitudes:", e);
        } finally {
            setLoading(false);
        }
    };

    const toggleHabit = async (habitId) => {
        if (processingHabits.has(habitId)) return;
        setProcessingHabits(prev => new Set(prev).add(habitId));

        try {
            const dateStr = getLocalYYYYMMDD(selectedDate);
            const existingLog = logs.find(l => l.habit_id === habitId && l.date === dateStr);
            let newLogs = [...logs];
            
            if (existingLog) {
                newLogs = newLogs.filter(l => l.id !== existingLog.id);
                setLogs(newLogs); 
                await supabase.from('habit_logs').delete().eq('id', existingLog.id);
            } else {
                const tempId = Date.now(); 
                const newEntry = { id: tempId, habit_id: habitId, date: dateStr, completed: true };
                newLogs.push(newEntry);
                setLogs(newLogs); 
                
                const { data: inserted } = await supabase.from('habit_logs').insert({ 
                    habit_id: habitId, date: dateStr, completed: true 
                }).select().single();
                
                if (inserted) {
                    setLogs(prev => prev.map(l => l.id === tempId ? inserted : l));
                }
            }
        } catch (error) {
            console.error("Erreur toggle:", error);
            loadHabitData(); 
        } finally {
            setProcessingHabits(prev => {
                const next = new Set(prev);
                next.delete(habitId);
                return next;
            });
        }
    };

    const addCategory = async (name, color) => {
        const { data: newCat } = await supabase.from('habit_categories').insert({ name, color }).select().single();
        if (newCat) setCategories([...categories, newCat].sort((a,b) => a.name.localeCompare(b.name)));
    };

    const deleteCategory = async (id) => {
        if (!window.confirm("⚠️ ATTENTION : Supprimer cette catégorie effacera DÉFINITIVEMENT toutes les habitudes et l'historique associés. Continuer ?")) return;
        
        // Suppression locale
        setCategories(categories.filter(c => c.id !== id));
        setHabits(habits.filter(h => h.category_id !== id));

        // Suppression DB (Logs d'abord, puis habitudes, puis catégorie)
        const habitsToDelete = habits.filter(h => h.category_id === id).map(h => h.id);
        if (habitsToDelete.length > 0) {
            await supabase.from('habit_logs').delete().in('habit_id', habitsToDelete);
            await supabase.from('habits').delete().eq('category_id', id);
        }
        await supabase.from('habit_categories').delete().eq('id', id);
    };

    const addHabit = async (name, categoryId, daysOfWeek, icon) => {
        const payload = { 
            name, 
            category_id: (categoryId === "" || categoryId === "null") ? null : categoryId, 
            days_of_week: daysOfWeek,
            icon: icon || null 
        };

        const { data: newHab, error } = await supabase.from('habits').insert(payload).select().single();
        
        if (error) {
            console.error("Erreur ajout habitude:", error);
            alert(`Erreur: ${error.message}.`);
        } else if (newHab) {
            setHabits([...habits, newHab]);
        }
    };

    // --- MODIFICATION : SUPPRESSION RÉELLE (HARD DELETE) ---
    const deleteHabit = async (id) => {
        if (!window.confirm("Supprimer DÉFINITIVEMENT cette habitude et tout son historique ?")) return;
        
        // Mise à jour de l'interface immédiatement
        setHabits(habits.filter(h => h.id !== id));
        setLogs(logs.filter(l => l.habit_id !== id)); // On enlève aussi les logs de la mémoire locale

        // Suppression en base de données
        await supabase.from('habit_logs').delete().eq('habit_id', id);
        await supabase.from('habits').delete().eq('id', id);
    };

    const stats = useMemo(() => {
        const today = new Date();
        today.setHours(0,0,0,0); 
        
        const dates = [];
        for(let i = statRange - 1; i >= 0; i--) {
            const d = new Date(today);
            d.setDate(d.getDate() - i);
            dates.push({
                str: getLocalYYYYMMDD(d),
                dayIndex: d.getDay() 
            });
        }

        const domainStats = categories.map(cat => {
            const catHabits = habits.filter(h => h.category_id === cat.id);
            if (catHabits.length === 0) return null;

            let totalPossible = 0;
            let totalDone = 0;

            catHabits.forEach(h => {
                dates.forEach(d => {
                    const isDone = logs.some(l => l.habit_id === h.id && l.date === d.str);
                    const scheduledDays = h.days_of_week || [0,1,2,3,4,5,6];
                    const isScheduled = scheduledDays.includes(d.dayIndex);
                    
                    if (isDone) {
                        totalDone++;
                        totalPossible++;
                    } else if (isScheduled && !h.is_archived) {
                        totalPossible++;
                    }
                });
            });

            return {
                ...cat,
                type: 'category',
                percent: totalPossible === 0 ? 0 : Math.round((totalDone / totalPossible) * 100)
            };
        }).filter(Boolean);

        const orphanHabits = habits.filter(h => !h.category_id);
        const orphanStats = orphanHabits.map(h => {
            let totalPossible = 0;
            let totalDone = 0;

            dates.forEach(d => {
                const isDone = logs.some(l => l.habit_id === h.id && l.date === d.str);
                const scheduledDays = h.days_of_week || [0,1,2,3,4,5,6];
                const isScheduled = scheduledDays.includes(d.dayIndex);

                if (isDone) {
                    totalDone++;
                    totalPossible++;
                } else if (isScheduled) {
                    totalPossible++;
                }
            });

            return {
                id: h.id,
                name: h.name,
                icon: h.icon,
                type: 'habit',
                percent: totalPossible === 0 ? 0 : Math.round((totalDone / totalPossible) * 100)
            };
        });

        const consistencyData = dates.map(dObj => {
            let activeHabitsCount = 0;
            let doneCount = 0;

            habits.forEach(h => {
                const isDone = logs.some(l => l.habit_id === h.id && l.date === dObj.str);
                const scheduledDays = h.days_of_week || [0,1,2,3,4,5,6];
                const isScheduled = scheduledDays.includes(dObj.dayIndex);

                if (isDone) {
                    doneCount++;
                    activeHabitsCount++;
                } else if (isScheduled) {
                    activeHabitsCount++;
                }
            });

            if (activeHabitsCount === 0) return 0;
            return Math.round((doneCount / activeHabitsCount) * 100);
        });

        return { domainStats, orphanStats, consistencyData, dates: dates.map(d => d.str) };
    }, [statRange, categories, habits, logs]);

    const changeDate = (days) => {
        const newDate = new Date(selectedDate);
        newDate.setDate(newDate.getDate() + days);
        setSelectedDate(newDate);
    };

    const isToday = getLocalYYYYMMDD(selectedDate) === getLocalYYYYMMDD(new Date());
    const dateStr = getLocalYYYYMMDD(selectedDate);
    const currentDayIndex = selectedDate.getDay();

    const visibleHabits = habits.filter(h => {
        const scheduledDays = h.days_of_week || [0,1,2,3,4,5,6];
        return scheduledDays.includes(currentDayIndex);
    });
    
    const uncategorizedVisibleHabits = visibleHabits.filter(h => !h.category_id);
    const categorizedVisibleHabits = categories.map(cat => ({
        ...cat,
        habits: visibleHabits.filter(h => h.category_id === cat.id)
    })).filter(c => c.habits.length > 0);
    
    const activeHabitsForManagement = habits;

    const dailyProgress = useMemo(() => {
        if (visibleHabits.length === 0) return 0;
        const done = visibleHabits.filter(h => logs.some(l => l.habit_id === h.id && l.date === dateStr)).length;
        return Math.round((done / visibleHabits.length) * 100);
    }, [visibleHabits, logs, dateStr]);

    return (
        <div className="flex flex-col h-full bg-slate-50 dark:bg-slate-950 transition-colors duration-300">
            {/* HEADER */}
            <div className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 px-8 py-6 flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6 shrink-0 z-30">
                <div className="flex bg-slate-100 dark:bg-slate-800 p-1.5 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-inner">
                    <button onClick={() => setActiveTab('daily')} className={`flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-black transition-all ${activeTab === 'daily' ? 'bg-white dark:bg-slate-700 text-blue-600 dark:text-white shadow-xl' : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}>
                        <CheckCircle2 size={18}/> AUJOURD'HUI
                    </button>
                    <button onClick={() => setActiveTab('stats')} className={`flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-black transition-all ${activeTab === 'stats' ? 'bg-white dark:bg-slate-700 text-blue-600 dark:text-white shadow-xl' : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}>
                        <BarChart2 size={18}/> ANALYSE
                    </button>
                    <button onClick={() => setActiveTab('settings')} className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-black transition-all ${activeTab === 'settings' ? 'bg-white dark:bg-slate-700 text-blue-600 dark:text-white shadow-xl' : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}>
                        <Settings size={20}/>
                    </button>
                </div>
            </div>

            <div className="flex-1 overflow-y-auto px-4 md:px-8 lg:px-12 py-8 custom-scrollbar">
                
                {/* VUE QUOTIDIENNE */}
                {activeTab === 'daily' && (
                    <div className="w-full max-w-[1600px] mx-auto space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-500">
                        <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] p-8 border border-slate-200 dark:border-slate-800 shadow-2xl flex flex-col md:flex-row items-center gap-10">
                            <div className="relative w-32 h-32 flex items-center justify-center shrink-0">
                                <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
                                    <circle cx="50" cy="50" r="42" stroke="currentColor" strokeWidth="10" fill="none" className="text-slate-100 dark:text-slate-800" />
                                    <circle cx="50" cy="50" r="42" stroke="currentColor" strokeWidth="10" fill="none" strokeDasharray="263.89" strokeDashoffset={263.89 - (dailyProgress / 100) * 263.89} className="text-blue-600 transition-all duration-1000 ease-out" strokeLinecap="round" />
                                </svg>
                                <div className="absolute flex flex-col items-center">
                                    <span className="text-3xl font-black dark:text-white">{dailyProgress}%</span>
                                </div>
                            </div>
                            <div className="flex-1 text-center md:text-left">
                                <div className="flex items-center justify-center md:justify-start gap-4 mb-2">
                                    <button onClick={() => changeDate(-1)} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors text-slate-400"><ChevronLeft size={20}/></button>
                                    <h3 className="font-black text-3xl capitalize dark:text-white">
                                        {selectedDate.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })}
                                    </h3>
                                    <button onClick={() => changeDate(1)} className={`p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors text-slate-400 ${isToday ? 'invisible' : ''}`} disabled={isToday}><ChevronRight size={20}/></button>
                                </div>
                                <p className="text-slate-500 font-medium text-lg">Focus du jour : {visibleHabits.filter(h => logs.some(l => l.habit_id === h.id && l.date === dateStr)).length} / {visibleHabits.length} tâches accomplies.</p>
                            </div>
                        </div>

                        {loading ? (
                            <div className="flex flex-col items-center justify-center py-20 gap-4">
                                <Loader2 className="animate-spin text-blue-600 w-12 h-12"/>
                            </div>
                        ) : visibleHabits.length === 0 ? (
                            <div className="text-center py-24 bg-white dark:bg-slate-900 rounded-[2.5rem] border-2 border-dashed border-slate-200 dark:border-slate-800">
                                <Zap className="text-slate-200 dark:text-slate-700 mx-auto mb-6" size={64}/>
                                <h3 className="text-xl font-black text-slate-700 dark:text-slate-300">Aucune habitude programmée</h3>
                            </div>
                        ) : (
                            <div className="space-y-12">
                                {uncategorizedVisibleHabits.length > 0 && (
                                    <div className="animate-in fade-in duration-700">
                                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                            {uncategorizedVisibleHabits.map(h => (
                                                 <HabitCard 
                                                    key={h.id} 
                                                    habit={h} 
                                                    isDone={logs.some(l => l.habit_id === h.id && l.date === dateStr)} 
                                                    isProcessing={processingHabits.has(h.id)} 
                                                    onToggle={() => toggleHabit(h.id)}
                                                    colorClass="border-amber-500/30 shadow-amber-500/5"
                                                    iconColor="bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400"
                                                />
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {categorizedVisibleHabits.map(cat => (
                                    <div key={cat.id} className="animate-in fade-in duration-700">
                                        <div className="flex items-center justify-between px-2 mb-6 border-b border-slate-100 dark:border-slate-800 pb-2">
                                            <h4 className="font-black text-lg text-slate-700 dark:text-white flex items-center gap-3">
                                                <span className={`w-3 h-3 rounded-full ${cat.color || 'bg-blue-500'}`}></span>
                                                {cat.name}
                                            </h4>
                                            <span className="text-xs font-black bg-slate-100 dark:bg-slate-800 px-3 py-1 rounded-full text-slate-500">
                                                {cat.habits.filter(h => logs.some(l => l.habit_id === h.id && l.date === dateStr)).length}/{cat.habits.length}
                                            </span>
                                        </div>
                                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                            {cat.habits.map(h => (
                                                <HabitCard 
                                                    key={h.id} 
                                                    habit={h} 
                                                    isDone={logs.some(l => l.habit_id === h.id && l.date === dateStr)} 
                                                    isProcessing={processingHabits.has(h.id)} 
                                                    onToggle={() => toggleHabit(h.id)}
                                                />
                                            ))}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                )}

                {/* VUE ANALYSE */}
                {activeTab === 'stats' && (
                    <div className="w-full max-w-[1600px] mx-auto space-y-10 animate-in fade-in duration-500">
                        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                           
                            <div className="bg-slate-200/50 dark:bg-slate-800 p-1 rounded-xl flex gap-1 border border-slate-300 dark:border-slate-700 shadow-inner">
                                {[7, 30, 90].map(d => (
                                    <button key={d} onClick={() => setStatRange(d)} className={`px-5 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${statRange === d ? 'bg-white dark:bg-slate-600 text-blue-600 dark:text-white shadow-md' : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-300'}`}>{d} Jours</button>
                                ))}
                            </div>
                        </div>

                        <div className="bg-white dark:bg-slate-900 p-10 rounded-[2.5rem] border border-slate-200 dark:border-slate-800 shadow-2xl">
                            <div className="h-96 w-full flex items-end justify-between gap-1 md:gap-3">
                                {stats.consistencyData.map((val, i) => (
                                    <div key={i} className="flex-1 flex flex-col justify-end group relative h-full">
                                        <div className={`w-full rounded-t-lg md:rounded-t-xl transition-all duration-700 ease-out hover:brightness-110 ${val >= 80 ? 'bg-gradient-to-t from-emerald-600 to-emerald-400' : val >= 50 ? 'bg-gradient-to-t from-blue-600 to-blue-400' : val > 0 ? 'bg-slate-300 dark:bg-slate-700' : 'bg-slate-100 dark:bg-slate-800 h-2'}`} style={{ height: val > 0 ? `${Math.max(val, 5)}%` : '8px' }}></div>
                                        <div className="absolute bottom-full mb-4 left-1/2 -translate-x-1/2 hidden group-hover:flex flex-col items-center z-20 pointer-events-none">
                                            <div className="bg-slate-900 text-white text-[10px] px-3 py-2 rounded-lg shadow-2xl whitespace-nowrap font-black uppercase tracking-tighter">
                                                {new Date(stats.dates[i]).toLocaleDateString('fr-FR', {day: 'numeric', month: 'short'})} <span className="ml-2 text-blue-400">{val}%</span>
                                            </div>
                                            <div className="w-2 h-2 bg-slate-900 rotate-45 -mt-1"></div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-6">
                            {stats.domainStats.map(cat => {
                                const textColor = cat.color ? COLOR_MAP[cat.color] : 'text-blue-500';
                                return (
                                    <div key={'cat-'+cat.id} className="bg-white dark:bg-slate-900 p-8 rounded-[2rem] border border-slate-200 dark:border-slate-800 flex flex-col items-center shadow-sm hover:shadow-xl transition-all duration-300 group">
                                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-4 text-center truncate w-full">{cat.name}</span>
                                        <div className="relative w-24 h-24 flex items-center justify-center group-hover:scale-110 transition-transform">
                                            <svg className="w-full h-full -rotate-90" viewBox="0 0 36 36">
                                                <path className="text-slate-100 dark:text-slate-800" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="currentColor" strokeWidth="4" />
                                                <path className={`${cat.percent >= 100 ? 'text-emerald-500' : textColor} transition-all duration-1000 ease-in-out`} strokeDasharray={`${cat.percent}, 100`} d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round" />
                                            </svg>
                                            <span className="absolute text-xl font-black dark:text-white">{cat.percent}%</span>
                                        </div>
                                    </div>
                                );
                            })}

                            {stats.orphanStats.map(hab => (
                                <div key={'hab-'+hab.id} className="bg-white dark:bg-slate-900 p-8 rounded-[2rem] border-2 border-dashed border-amber-200 dark:border-slate-800 flex flex-col items-center shadow-sm hover:shadow-xl transition-all duration-300 group relative overflow-hidden">
                                     <div className="absolute top-0 right-0 bg-amber-500 w-3 h-3 rounded-bl-xl"></div>
                                     <span className="text-[10px] font-black text-slate-500 uppercase tracking-tighter mb-4 text-center truncate w-full flex justify-center items-center gap-2">
                                         <DynamicIcon name={hab.icon} size={14} className="text-amber-500" />
                                         {hab.name}
                                     </span>
                                     <div className="relative w-20 h-20 flex items-center justify-center group-hover:scale-110 transition-transform">
                                        <svg className="w-full h-full -rotate-90" viewBox="0 0 36 36">
                                            <path className="text-slate-100 dark:text-slate-800" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="currentColor" strokeWidth="3" />
                                            <path className={`${hab.percent >= 100 ? 'text-amber-500' : 'text-slate-400'} transition-all duration-1000 ease-in-out`} strokeDasharray={`${hab.percent}, 100`} d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
                                        </svg>
                                        <span className="absolute text-sm font-black dark:text-white text-slate-600">{hab.percent}%</span>
                                     </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* VUE REGLAGES */}
                {activeTab === 'settings' && (
                    <div className="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-10 animate-in fade-in duration-500">
                        <div className="bg-white dark:bg-slate-900 p-8 rounded-[2.5rem] border border-slate-200 dark:border-slate-800 shadow-sm">
                            <h3 className="font-black text-xl mb-8 dark:text-white flex items-center gap-3"><List size={22} className="text-blue-500"/> Domaines</h3>
                            <div className="space-y-3 mb-8">
                                {categories.map(c => (
                                    <div key={c.id} className="flex justify-between items-center p-4 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-transparent hover:border-slate-200 dark:hover:border-slate-700 transition-all">
                                        <div className="flex items-center gap-4">
                                            <div className={`w-3 h-3 rounded-full ${c.color || 'bg-gray-400'}`}></div>
                                            <span className="font-bold text-slate-700 dark:text-slate-200">{c.name}</span>
                                        </div>
                                        <button onClick={() => deleteCategory(c.id)} className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-xl transition-all"><Trash2 size={16}/></button>
                                    </div>
                                ))}
                            </div>
                            <form onSubmit={(e) => { e.preventDefault(); const name = e.target.catName.value; const color = e.target.catColor.value; if(name) { addCategory(name, color); e.target.reset(); } }} className="flex gap-2 pt-6 border-t border-slate-100 dark:border-slate-800">
                                <input name="catName" placeholder="Nom..." className="flex-1 p-3 bg-slate-50 dark:bg-slate-800 rounded-xl outline-none border border-transparent focus:border-blue-500 dark:text-white transition-all font-bold" required/>
                                <select name="catColor" className="p-3 bg-slate-50 dark:bg-slate-800 rounded-xl outline-none border border-transparent focus:border-blue-500 dark:text-white cursor-pointer font-bold">
                                    <option value="bg-blue-500">Bleu</option>
                                    <option value="bg-green-500">Vert</option>
                                    <option value="bg-purple-500">Violet</option>
                                    <option value="bg-orange-500">Orange</option>
                                    <option value="bg-red-500">Rouge</option>
                                </select>
                                <button type="submit" className="p-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 shadow-lg shadow-blue-500/30 transition-all"><Plus size={20}/></button>
                            </form>
                        </div>

                        <div className="bg-white dark:bg-slate-900 p-8 rounded-[2.5rem] border border-slate-200 dark:border-slate-800 shadow-sm">
                            <h3 className="font-black text-xl mb-8 dark:text-white flex items-center gap-3"><Target size={22} className="text-emerald-500"/> Catalogue Habitudes</h3>
                            <div className="space-y-3 mb-8 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
                                {activeHabitsForManagement.map(h => (
                                    <div key={h.id} className="flex justify-between items-center p-4 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-transparent hover:border-slate-200 dark:hover:border-slate-700 transition-all">
                                        <div>
                                            <div className="font-bold text-slate-700 dark:text-slate-200 flex items-center gap-2">
                                                <DynamicIcon name={h.icon} size={18} className="text-blue-500" />
                                                {h.name}
                                            </div>
                                            <div className="flex gap-1 mt-2">
                                                {['D','L','M','M','J','V','S'].map((d, i) => (
                                                    <span key={i} className={`text-[8px] w-4 h-4 flex items-center justify-center rounded-md font-black ${(h.days_of_week||[0,1,2,3,4,5,6]).includes(i) ? 'bg-blue-100 text-blue-600 dark:bg-blue-900/40' : 'text-slate-300 dark:text-slate-600'}`}>{d}</span>
                                                ))}
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-4">
                                            <Badge text={categories.find(c => c.id === h.category_id)?.name || 'Sans Domaine'} color={!h.category_id ? 'bg-amber-100 text-amber-600' : ''} />
                                            <button onClick={() => deleteHabit(h.id)} className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-xl transition-all"><Trash2 size={16}/></button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                            <HabitCreator categories={categories} onAdd={addHabit} />
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}

function HabitCard({ habit, isDone, isProcessing, onToggle, colorClass, iconColor }) {
    return (
        <div 
            onClick={() => !isProcessing && onToggle()}
            className={`
                group relative flex items-center justify-between p-6 rounded-3xl border-2 transition-all duration-300 cursor-pointer select-none active:scale-[0.98] overflow-hidden
                ${isDone 
                    ? 'bg-white dark:bg-slate-900 border-emerald-500/30 shadow-xl shadow-emerald-500/10' 
                    : `bg-white dark:bg-slate-900 border-transparent hover:border-slate-200 dark:hover:border-slate-700 shadow-lg hover:shadow-2xl ${colorClass || ''}`
                }
            `}
        >
            {isDone && <div className="absolute inset-0 bg-emerald-500/5 pointer-events-none"></div>}

            <div className="flex items-center gap-5 relative z-10">
                <div className={`w-14 h-14 rounded-[1.2rem] flex items-center justify-center transition-all duration-500 ${isDone ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/30 scale-110 rotate-3' : `${iconColor || 'bg-slate-100 dark:bg-slate-800 text-slate-400 group-hover:bg-blue-50 dark:group-hover:bg-blue-900/20 group-hover:text-blue-600 group-hover:scale-110'}`}`}>
                    {isProcessing ? (
                        <Loader2 size={24} className="animate-spin" />
                    ) : isDone ? (
                        <Check size={28} strokeWidth={3} />
                    ) : habit.icon ? (
                        <DynamicIcon name={habit.icon} size={24} />
                    ) : (
                        <Zap size={24} />
                    )}
                </div>
                <div>
                     <span className={`text-lg font-bold block transition-all ${isDone ? 'text-slate-400 dark:text-slate-500 line-through opacity-60' : 'text-slate-800 dark:text-slate-100'}`}>
                        {habit.name}
                    </span>
                    <span className="text-xs font-medium text-slate-400 group-hover:text-blue-500 transition-colors">
                        {isDone ? 'Complété' : 'À faire aujourd\'hui'}
                    </span>
                </div>
            </div>
            
            <div className={`relative z-10 w-8 h-8 rounded-xl border-2 flex items-center justify-center transition-all ${isDone ? 'bg-emerald-500 border-emerald-500 text-white scale-110' : 'border-slate-200 dark:border-slate-700 text-transparent group-hover:border-blue-400'}`}>
                <Check size={16} strokeWidth={4} />
            </div>
        </div>
    );
}

function HabitCreator({ categories, onAdd }) {
    const [name, setName] = useState('');
    const [categoryId, setCategoryId] = useState('');
    const [selectedDays, setSelectedDays] = useState([0,1,2,3,4,5,6]); 
    const [selectedIcon, setSelectedIcon] = useState('');

    const toggleDay = (dayIndex) => {
        if (selectedDays.includes(dayIndex)) {
            setSelectedDays(selectedDays.filter(d => d !== dayIndex));
        } else {
            setSelectedDays([...selectedDays, dayIndex].sort());
        }
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        if(name) { 
            onAdd(name, categoryId, selectedDays, selectedIcon); 
            setName('');
            setCategoryId('');
            setSelectedDays([0,1,2,3,4,5,6]); 
            setSelectedIcon('');
        }
    };

    return (
        <form onSubmit={handleSubmit} className="pt-8 border-t border-slate-100 dark:border-slate-800 space-y-6">
            <div className="space-y-4">
                <div className="flex gap-2">
                    <input 
                        value={name} 
                        onChange={(e) => setName(e.target.value)}
                        placeholder="Nouvelle habitude..." 
                        className="flex-1 p-4 bg-slate-50 dark:bg-slate-800 rounded-2xl outline-none border border-transparent focus:border-blue-500 dark:text-white transition-all font-bold text-lg" 
                        required
                    />
                    <select 
                        value={categoryId} 
                        onChange={(e) => setCategoryId(e.target.value)}
                        className="p-4 bg-slate-50 dark:bg-slate-800 rounded-2xl outline-none border border-transparent focus:border-blue-500 dark:text-white cursor-pointer font-bold w-1/3"
                    >
                        <option value="">Sans Domaine</option>
                        {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </select>
                </div>

                <div className="bg-slate-50 dark:bg-slate-800 p-4 rounded-2xl">
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 block">Choisir une Icône (Premium)</span>
                    <div className="flex flex-wrap gap-2 max-h-32 overflow-y-auto custom-scrollbar pr-2">
                        {PREMIUM_ICONS.map(iconName => (
                            <button 
                                key={iconName} 
                                type="button" 
                                onClick={() => setSelectedIcon(iconName === selectedIcon ? '' : iconName)}
                                className={`w-10 h-10 flex items-center justify-center rounded-xl transition-all ${selectedIcon === iconName ? 'bg-blue-600 text-white scale-110 shadow-lg' : 'bg-white dark:bg-slate-700 text-slate-500 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-600 hover:text-blue-500'}`}
                                title={iconName}
                            >
                                <DynamicIcon name={iconName} size={20} />
                            </button>
                        ))}
                    </div>
                </div>

                <div className="flex items-center justify-between gap-4">
                    <div className="flex-1 bg-slate-50 dark:bg-slate-800 p-4 rounded-2xl flex items-center justify-between">
                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest mr-4">Fréquence</span>
                        <div className="flex gap-1">
                            {['D','L','M','M','J','V','S'].map((d, i) => (
                                <button key={i} type="button" onClick={() => toggleDay(i)} className={`w-8 h-8 rounded-lg text-[10px] font-black transition-all duration-200 ${selectedDays.includes(i) ? 'bg-blue-600 text-white shadow-lg' : 'bg-white dark:bg-slate-700 text-slate-400 hover:bg-slate-100'}`}>{d}</button>
                            ))}
                        </div>
                    </div>
                    <button type="submit" className="p-5 bg-blue-600 text-white rounded-2xl hover:bg-blue-700 shadow-xl shadow-blue-500/30 transition-all hover:scale-105 active:scale-95"><Plus size={24}/></button>
                </div>
            </div>
        </form>
    );
}