import { useState, useEffect, useMemo } from 'react';
import { supabase } from './supabaseClient';
import { 
  Plus, Trash2, Check, X, Activity, BarChart2, Calendar, 
  Settings, Target, ChevronLeft, ChevronRight, Zap, Trophy, Loader2, LayoutGrid, List, CheckCircle2, TrendingUp
} from 'lucide-react';

// --- UTILITAIRES (INTACTS) ---

const COLOR_MAP = {
    'bg-blue-500': 'text-blue-500',
    'bg-green-500': 'text-green-500',
    'bg-purple-500': 'text-purple-500',
    'bg-orange-500': 'text-orange-500',
    'bg-red-500': 'text-red-500',
    'bg-gray-400': 'text-gray-400'
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

export default function HabitTracker({ data, updateData }) {
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
        await supabase.from('habit_categories').delete().eq('id', id);
        setCategories(categories.filter(c => c.id !== id));
        setHabits(habits.filter(h => h.category_id !== id));
    };

    const addHabit = async (name, categoryId, daysOfWeek) => {
        const { data: newHab } = await supabase.from('habits').insert({ 
            name, 
            category_id: categoryId,
            days_of_week: daysOfWeek 
        }).select().single();
        if (newHab) setHabits([...habits, newHab]);
    };

    const deleteHabit = async (id) => {
        if (!window.confirm("Archiver cette habitude ? Elle disparaîtra du quotidien mais restera dans l'historique.")) return;
        await supabase.from('habits').update({ is_archived: true }).eq('id', id);
        setHabits(habits.map(h => h.id === id ? { ...h, is_archived: true } : h));
    };

    // --- MOTEUR DE STATISTIQUES (INTACT) ---
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
                percent: totalPossible === 0 ? 0 : Math.round((totalDone / totalPossible) * 100)
            };
        }).filter(Boolean);

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
                } else if (isScheduled && !h.is_archived) {
                    activeHabitsCount++;
                }
            });

            if (activeHabitsCount === 0) return 0;
            return Math.round((doneCount / activeHabitsCount) * 100);
        });

        return { domainStats, consistencyData, dates: dates.map(d => d.str) };
    }, [statRange, categories, habits, logs]);

    // --- NAVIGATION DATES (INTACTE) ---
    const changeDate = (days) => {
        const newDate = new Date(selectedDate);
        newDate.setDate(newDate.getDate() + days);
        setSelectedDate(newDate);
    };

    const isToday = getLocalYYYYMMDD(selectedDate) === getLocalYYYYMMDD(new Date());
    const dateStr = getLocalYYYYMMDD(selectedDate);
    const currentDayIndex = selectedDate.getDay();

    const visibleHabits = habits.filter(h => {
        if (h.is_archived) return false;
        const scheduledDays = h.days_of_week || [0,1,2,3,4,5,6];
        return scheduledDays.includes(currentDayIndex);
    });
    
    const activeHabitsForManagement = habits.filter(h => !h.is_archived);

    // --- CALCULS DE PROGRESSION QUOTIDIENNE (NOUVEAU POUR UI) ---
    const dailyProgress = useMemo(() => {
        if (visibleHabits.length === 0) return 0;
        const done = visibleHabits.filter(h => logs.some(l => l.habit_id === h.id && l.date === dateStr)).length;
        return Math.round((done / visibleHabits.length) * 100);
    }, [visibleHabits, logs, dateStr]);

    return (
        <div className="flex flex-col h-full bg-slate-50 dark:bg-slate-950 transition-colors duration-300">
            {/* HEADER DESIGN ULTRA-CLEAN */}
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

            <div className="flex-1 overflow-y-auto px-6 md:px-12 py-8 custom-scrollbar">
                
                {/* VUE QUOTIDIENNE REVISITÉE */}
                {activeTab === 'daily' && (
                    <div className="max-w-6xl mx-auto space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-500">
                        
                        {/* WIDGET DE PROGRESSION DU JOUR */}
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
                                    <h3 className="font-black text-2xl capitalize dark:text-white">
                                        {selectedDate.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })}
                                    </h3>
                                    <button onClick={() => changeDate(1)} className={`p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors text-slate-400 ${isToday ? 'invisible' : ''}`} disabled={isToday}><ChevronRight size={20}/></button>
                                </div>
                                <p className="text-slate-500 font-medium">Vous avez complété {visibleHabits.filter(h => logs.some(l => l.habit_id === h.id && l.date === dateStr)).length} tâches sur {visibleHabits.length} prévues.</p>
                                {dailyProgress === 100 && <div className="mt-3 inline-flex items-center gap-2 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 px-4 py-1.5 rounded-full text-xs font-black uppercase tracking-widest"><Trophy size={14}/> Journée Parfaite !</div>}
                            </div>
                        </div>

                        {loading ? (
                            <div className="flex flex-col items-center justify-center py-20 gap-4">
                                <Loader2 className="animate-spin text-blue-600 w-12 h-12"/>
                                <span className="text-sm font-bold text-slate-400 uppercase tracking-tighter">Sync en cours...</span>
                            </div>
                        ) : visibleHabits.length === 0 ? (
                            <div className="text-center py-24 bg-white dark:bg-slate-900 rounded-[2.5rem] border-2 border-dashed border-slate-200 dark:border-slate-800">
                                <Zap className="text-slate-200 dark:text-slate-700 mx-auto mb-6" size={64}/>
                                <h3 className="text-xl font-black text-slate-700 dark:text-slate-300">Aucune habitude programmée</h3>
                                <p className="text-slate-400 mt-2">C'est une journée off ? Profitez-en pour recharger vos batteries.</p>
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                {categories.map(cat => {
                                    const catHabits = visibleHabits.filter(h => h.category_id === cat.id);
                                    if (catHabits.length === 0) return null;
                                    const catDone = catHabits.filter(h => logs.some(l => l.habit_id === h.id && l.date === dateStr)).length;
                                    const catPercent = Math.round((catDone / catHabits.length) * 100);

                                    return (
                                        <div key={cat.id} className="space-y-4 animate-in fade-in duration-700">
                                            <div className="flex items-center justify-between px-2">
                                                <h4 className="font-black text-xs uppercase tracking-[0.2em] text-slate-400 flex items-center gap-3">
                                                    <span className={`w-2 h-2 rounded-full ${cat.color || 'bg-blue-500'}`}></span>
                                                    {cat.name}
                                                </h4>
                                                <span className="text-[10px] font-black text-slate-400">{catDone}/{catHabits.length}</span>
                                            </div>
                                            <div className="space-y-3">
                                                {catHabits.map(h => {
                                                    const isDone = logs.some(l => l.habit_id === h.id && l.date === dateStr);
                                                    const isProcessing = processingHabits.has(h.id);
                                                    return (
                                                        <div 
                                                            key={h.id} 
                                                            onClick={() => !isProcessing && toggleHabit(h.id)}
                                                            className={`group flex items-center justify-between p-5 rounded-3xl border-2 transition-all duration-300 cursor-pointer select-none active:scale-[0.98] ${isDone ? 'bg-white dark:bg-slate-900 border-emerald-500/30 shadow-lg shadow-emerald-500/5' : 'bg-white dark:bg-slate-900 border-transparent hover:border-slate-200 dark:hover:border-slate-700 shadow-sm'}`}
                                                        >
                                                            <div className="flex items-center gap-4">
                                                                <div className={`w-10 h-10 rounded-2xl flex items-center justify-center transition-colors ${isDone ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/20' : 'bg-slate-100 dark:bg-slate-800 text-slate-400 group-hover:bg-blue-50 dark:group-hover:bg-blue-900/20 group-hover:text-blue-600'}`}>
                                                                    {isProcessing ? <Loader2 size={18} className="animate-spin" /> : isDone ? <Check size={20} strokeWidth={3} /> : <Zap size={18} />}
                                                                </div>
                                                                <span className={`text-base font-bold transition-all ${isDone ? 'text-slate-400 dark:text-slate-500 line-through opacity-60' : 'text-slate-700 dark:text-slate-200'}`}>
                                                                    {h.name}
                                                                </span>
                                                            </div>
                                                            <div className={`w-6 h-6 rounded-lg border-2 flex items-center justify-center transition-all ${isDone ? 'bg-emerald-500 border-emerald-500 text-white' : 'border-slate-200 dark:border-slate-700 text-transparent group-hover:border-blue-400'}`}>
                                                                <Check size={12} strokeWidth={4} />
                                                            </div>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                )}

                {/* VUE ANALYSE (VISUELS AMÉLIORÉS) */}
                {activeTab === 'stats' && (
                    <div className="max-w-6xl mx-auto space-y-10 animate-in fade-in duration-500">
                        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                            <h3 className="text-2xl font-black dark:text-white flex items-center gap-3"><Trophy className="text-amber-500"/> Performances</h3>
                            <div className="bg-slate-200/50 dark:bg-slate-800 p-1 rounded-xl flex gap-1 border border-slate-300 dark:border-slate-700 shadow-inner">
                                {[7, 30, 90].map(d => (
                                    <button key={d} onClick={() => setStatRange(d)} className={`px-5 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${statRange === d ? 'bg-white dark:bg-slate-600 text-blue-600 dark:text-white shadow-md' : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-300'}`}>{d} Jours</button>
                                ))}
                            </div>
                        </div>

                        <div className="bg-white dark:bg-slate-900 p-10 rounded-[2.5rem] border border-slate-200 dark:border-slate-800 shadow-2xl">
                            <div className="h-80 w-full flex items-end justify-between gap-2">
                                {stats.consistencyData.map((val, i) => (
                                    <div key={i} className="flex-1 flex flex-col justify-end group relative h-full">
                                        <div className={`w-full rounded-t-xl transition-all duration-700 ease-out hover:brightness-110 ${val >= 80 ? 'bg-gradient-to-t from-emerald-600 to-emerald-400' : val >= 50 ? 'bg-gradient-to-t from-blue-600 to-blue-400' : val > 0 ? 'bg-slate-300 dark:bg-slate-700' : 'bg-slate-100 dark:bg-slate-800 h-2'}`} style={{ height: val > 0 ? `${Math.max(val, 5)}%` : '8px' }}></div>
                                        <div className="absolute bottom-full mb-4 left-1/2 -translate-x-1/2 hidden group-hover:flex flex-col items-center z-20 pointer-events-none">
                                            <div className="bg-slate-900 text-white text-[10px] px-3 py-2 rounded-lg shadow-2xl whitespace-nowrap font-black uppercase tracking-tighter">
                                                {new Date(stats.dates[i]).toLocaleDateString('fr-FR', {day: 'numeric', month: 'short'})} <span className="ml-2 text-blue-400">{val}%</span>
                                            </div>
                                            <div className="w-2 h-2 bg-slate-900 rotate-45 -mt-1"></div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                            <div className="mt-8 pt-8 border-t border-slate-100 dark:border-slate-800 flex justify-between text-[10px] font-black text-slate-400 uppercase tracking-widest">
                                <span>{new Date(stats.dates[0]).toLocaleDateString()}</span>
                                <span>Historique de Complétion</span>
                                <span>Aujourd'hui</span>
                            </div>
                        </div>

                        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                            {stats.domainStats.map(cat => {
                                const textColor = cat.color ? COLOR_MAP[cat.color] : 'text-blue-500';
                                return (
                                    <div key={cat.id} className="bg-white dark:bg-slate-900 p-8 rounded-[2rem] border border-slate-200 dark:border-slate-800 flex flex-col items-center shadow-sm hover:shadow-xl transition-all duration-300">
                                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-4 text-center">{cat.name}</span>
                                        <div className="relative w-24 h-24 flex items-center justify-center">
                                            <svg className="w-full h-full -rotate-90" viewBox="0 0 36 36">
                                                <path className="text-slate-100 dark:text-slate-800" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="currentColor" strokeWidth="4" />
                                                <path className={`${cat.percent >= 100 ? 'text-emerald-500' : textColor} transition-all duration-1000 ease-in-out`} strokeDasharray={`${cat.percent}, 100`} d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round" />
                                            </svg>
                                            <span className="absolute text-xl font-black dark:text-white">{cat.percent}%</span>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                )}

                {/* VUE REGLAGES (INTACTE) */}
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
                                            <div className="font-bold text-slate-700 dark:text-slate-200">{h.name}</div>
                                            <div className="flex gap-1 mt-2">
                                                {['D','L','M','M','J','V','S'].map((d, i) => (
                                                    <span key={i} className={`text-[8px] w-4 h-4 flex items-center justify-center rounded-md font-black ${(h.days_of_week||[0,1,2,3,4,5,6]).includes(i) ? 'bg-blue-100 text-blue-600 dark:bg-blue-900/40' : 'text-slate-300 dark:text-slate-600'}`}>{d}</span>
                                                ))}
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-4">
                                            <Badge text={categories.find(c => c.id === h.category_id)?.name || 'N/A'} />
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

function HabitCreator({ categories, onAdd }) {
    const [selectedDays, setSelectedDays] = useState([0,1,2,3,4,5,6]); 

    const toggleDay = (dayIndex) => {
        if (selectedDays.includes(dayIndex)) {
            setSelectedDays(selectedDays.filter(d => d !== dayIndex));
        } else {
            setSelectedDays([...selectedDays, dayIndex].sort());
        }
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        const name = e.target.habName.value;
        const catId = e.target.habCat.value;
        if(name && catId) { 
            onAdd(name, catId, selectedDays); 
            e.target.reset(); 
            setSelectedDays([0,1,2,3,4,5,6]); 
        }
    };

    return (
        <form onSubmit={handleSubmit} className="pt-8 border-t border-slate-100 dark:border-slate-800 space-y-4">
            <div className="flex gap-2">
                <input name="habName" placeholder="Nouvel objectif..." className="flex-1 p-3 bg-slate-50 dark:bg-slate-800 rounded-xl outline-none border border-transparent focus:border-blue-500 dark:text-white transition-all font-bold" required/>
                <select name="habCat" className="p-3 bg-slate-50 dark:bg-slate-800 rounded-xl outline-none border border-transparent focus:border-blue-500 dark:text-white cursor-pointer font-bold" required>
                    <option value="">Domaine...</option>
                    {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
                <button type="submit" className="p-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 shadow-lg shadow-blue-500/30 transition-all"><Plus size={20}/></button>
            </div>
            
            <div className="flex items-center justify-between bg-slate-50 dark:bg-slate-800 p-3 rounded-2xl">
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">Fréquence</span>
                <div className="flex gap-1">
                    {['D','L','M','M','J','V','S'].map((d, i) => (
                        <button key={i} type="button" onClick={() => toggleDay(i)} className={`w-8 h-8 rounded-lg text-[10px] font-black transition-all duration-200 ${selectedDays.includes(i) ? 'bg-blue-600 text-white shadow-lg' : 'bg-white dark:bg-slate-700 text-slate-400 hover:bg-slate-100'}`}>{d}</button>
                    ))}
                </div>
            </div>
        </form>
    );
}