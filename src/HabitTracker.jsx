import { useState, useEffect, useMemo, useRef } from 'react';
// CHEMIN CORRIGÉ : ./ car on est à la racine de src
import { supabase } from './supabaseClient';
import * as Icons from 'lucide-react';
import { 
    Plus, Trash2, Check, BarChart2, 
    Settings, Target, ChevronLeft, ChevronRight, Zap, Trophy, Loader2, List, CheckCircle2,
    Sparkles, Edit2, RotateCcw
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

const getHabitDays = (h) => Array.isArray(h?.days_of_week) ? h.days_of_week : (h?.days_of_week?.days || [0,1,2,3,4,5,6]);
const getHabitImportance = (h) => Array.isArray(h?.days_of_week) ? 1 : (h?.days_of_week?.importance || 1);

export default function HabitTracker({ }) {
    const [activeTab, setActiveTab] = useState('daily'); 
    const [selectedDate, setSelectedDate] = useState(new Date());
    const [statRange, setStatRange] = useState(7); 
    
    const [categories, setCategories] = useState([]);
    const [habits, setHabits] = useState([]);
    const [logs, setLogs] = useState([]);
    const [loading, setLoading] = useState(true);
    const [processingHabits, setProcessingHabits] = useState(new Set());

    // NOUVEAU : ÉTAT D'ÉDITION
    const [editingHabit, setEditingHabit] = useState(null);

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

            const catsData = cats || [];
            const habsData = habs || [];
            const lgsData = lgs || [];

            setCategories(catsData);
            setHabits(habsData);
            setLogs(lgsData);

            // AUTO-REPAIR: Sync missing logs to habit.history
            const logsByHabit = {};
            for (const lg of lgsData) {
                if (!logsByHabit[lg.habit_id]) logsByHabit[lg.habit_id] = [];
                logsByHabit[lg.habit_id].push(lg.date);
            }
            
            let repairedHabits = false;
            const syncedHabs = habsData.map(h => {
                const existing = h.history || [];
                const logged = logsByHabit[h.id] || [];
                const merged = [...new Set([...existing, ...logged])];
                if (merged.length !== existing.length) {
                    repairedHabits = true;
                    // Mettre à jour en arrière-plan sans bloquer
                    supabase.from('habits').update({ history: merged }).eq('id', h.id).then();
                    return { ...h, history: merged };
                }
                return h;
            });

            if (repairedHabits) {
                setHabits(syncedHabs);
            }

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

                // SYNC HISTORY FOR DASHBOARD
                const targetHabit = habits.find(h => h.id === habitId);
                if (targetHabit) {
                    const newHistory = (targetHabit.history || []).filter(d => d !== dateStr);
                    setHabits(prev => prev.map(h => h.id === habitId ? { ...h, history: newHistory } : h));
                    await supabase.from('habits').update({ history: newHistory }).eq('id', habitId);
                }
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

                // SYNC HISTORY FOR DASHBOARD
                const targetHabit = habits.find(h => h.id === habitId);
                if (targetHabit) {
                    const newHistory = [...new Set([...(targetHabit.history || []), dateStr])];
                    setHabits(prev => prev.map(h => h.id === habitId ? { ...h, history: newHistory } : h));
                    await supabase.from('habits').update({ history: newHistory }).eq('id', habitId);
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

    // --- LOGIQUE AMÉLIORÉE : AJOUT / MODIFICATION ---
    const addHabit = async (name, categoryId, daysOfWeek, icon, importance) => {
        const payload = { 
            name, 
            category_id: (categoryId === "" || categoryId === "null") ? null : categoryId, 
            days_of_week: { days: daysOfWeek, importance: importance || 1 },
            icon: icon || null 
        };

        if (editingHabit) {
            // MODIFICATION D'UNE HABITUDE EXISTANTE
            const { data: updatedHab, error } = await supabase.from('habits').update(payload).eq('id', editingHabit.id).select().single();
            if (error) {
                console.error("Erreur mise à jour:", error);
                alert(`Erreur: ${error.message}`);
            } else if (updatedHab) {
                setHabits(habits.map(h => h.id === editingHabit.id ? updatedHab : h));
                setEditingHabit(null); // On sort du mode édition
            }
        } else {
            // CRÉATION NOUVELLE HABITUDE (Original)
            const { data: newHab, error } = await supabase.from('habits').insert(payload).select().single();
            if (error) {
                console.error("Erreur ajout habitude:", error);
                alert(`Erreur: ${error.message}.`);
            } else if (newHab) {
                setHabits([...habits, newHab]);
            }
        }
    };

    const startEditingHabit = (habit) => {
        setEditingHabit(habit);
        // Le formulaire d'ajout va récupérer cet état pour se pré-remplir
    };

    // --- SUPPRESSION / RESET ---
    const deleteHabit = async (id) => {
        if (!window.confirm("Supprimer DÉFINITIVEMENT cette habitude et tout son historique ?")) return;
        
        // Mise à jour de l'interface immédiatement
        setHabits(habits.filter(h => h.id !== id));
        setLogs(logs.filter(l => l.habit_id !== id)); // On enlève aussi les logs de la mémoire locale

        // Suppression en base de données
        await supabase.from('habit_logs').delete().eq('habit_id', id);
        await supabase.from('habits').delete().eq('id', id);
        if (editingHabit && editingHabit.id === id) setEditingHabit(null);
    };

    const resetHabitHistory = async (id) => {
        if (!window.confirm("Voulez-vous vraiment remettre l'historique de cette habitude à ZÉRO ? Cela effacera tous les jours cochés, mais l'habitude restera.")) return;
        setLogs(logs.filter(l => l.habit_id !== id));
        await supabase.from('habit_logs').delete().eq('habit_id', id);
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
                    const scheduledDays = getHabitDays(h);
                    const isScheduled = scheduledDays.includes(d.dayIndex);
                    const imp = getHabitImportance(h);
                    
                    if (isDone) {
                        totalDone += imp;
                        totalPossible += imp;
                    } else if (isScheduled && !h.is_archived) {
                        totalPossible += imp;
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
                const scheduledDays = getHabitDays(h);
                const isScheduled = scheduledDays.includes(d.dayIndex);
                const imp = getHabitImportance(h);

                if (isDone) {
                    totalDone += imp;
                    totalPossible += imp;
                } else if (isScheduled) {
                    totalPossible += imp;
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
                const scheduledDays = getHabitDays(h);
                const isScheduled = scheduledDays.includes(dObj.dayIndex);
                const imp = getHabitImportance(h);

                if (isDone) {
                    doneCount += imp;
                    activeHabitsCount += imp;
                } else if (isScheduled) {
                    activeHabitsCount += imp;
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
        const scheduledDays = getHabitDays(h);
        return scheduledDays.includes(currentDayIndex);
    });

    const tomorrowDateObj = new Date(selectedDate); tomorrowDateObj.setDate(tomorrowDateObj.getDate() + 1);
    const tomorrowDayIndex = tomorrowDateObj.getDay();
    const tomorrowHabits = habits.filter(h => getHabitDays(h).includes(tomorrowDayIndex));
    
    const uncategorizedVisibleHabits = visibleHabits.filter(h => !h.category_id);
    const categorizedVisibleHabits = categories.map(cat => ({
        ...cat,
        habits: visibleHabits.filter(h => h.category_id === cat.id)
    })).filter(c => c.habits.length > 0);
    
    const activeHabitsForManagement = habits;

    const dailyProgress = useMemo(() => {
        if (visibleHabits.length === 0) return 0;
        const totalImp = visibleHabits.reduce((acc, h) => acc + getHabitImportance(h), 0);
        const doneImp = visibleHabits.filter(h => logs.some(l => l.habit_id === h.id && l.date === dateStr))
                                     .reduce((acc, h) => acc + getHabitImportance(h), 0);
        if (totalImp === 0) return 0;
        return Math.round((doneImp / totalImp) * 100);
    }, [visibleHabits, logs, dateStr]);

    return (
        <div className="flex flex-col h-full bg-zinc-100 dark:bg-[#09090b] transition-colors duration-200">
            {/* HEADER */}
            <div className="bg-white dark:bg-[#111113] border-b border-zinc-200 dark:border-zinc-800 px-6 md:px-8 py-4 flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 shrink-0 z-30">
                <div className="flex bg-zinc-100 dark:bg-[#09090b] p-1 rounded-xl border border-zinc-200 dark:border-zinc-800">
                    <button onClick={() => setActiveTab('daily')} className={`flex items-center gap-2 px-5 py-2 rounded-lg text-xs font-mono font-bold transition-all ${activeTab === 'daily' ? 'bg-zinc-900 dark:bg-white text-white dark:text-[#09090b]' : 'text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-200'}`}>
                        <CheckCircle2 size={15}/> AUJOURD'HUI
                    </button>
                    <button onClick={() => setActiveTab('stats')} className={`flex items-center gap-2 px-5 py-2 rounded-lg text-xs font-mono font-bold transition-all ${activeTab === 'stats' ? 'bg-zinc-900 dark:bg-white text-white dark:text-[#09090b]' : 'text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-200'}`}>
                        <BarChart2 size={15}/> ANALYSE
                    </button>
                    <button onClick={() => setActiveTab('settings')} className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-mono font-bold transition-all ${activeTab === 'settings' ? 'bg-zinc-900 dark:bg-white text-white dark:text-[#09090b]' : 'text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-200'}`}>
                        <Settings size={16}/>
                    </button>
                </div>
            </div>

            <div className="flex-1 overflow-y-auto px-4 md:px-8 lg:px-12 py-8 custom-scrollbar">
                
                {/* VUE QUOTIDIENNE */}
                {activeTab === 'daily' && (
                    <div className="w-full max-w-[1600px] mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-300">
                        <div className="bg-white dark:bg-[#111113] rounded-2xl p-6 md:p-7 border border-zinc-200 dark:border-zinc-800 flex flex-col md:flex-row items-center gap-8">
                            <div className="relative w-28 h-28 flex items-center justify-center shrink-0">
                                <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
                                    <circle cx="50" cy="50" r="42" stroke="currentColor" strokeWidth="9" fill="none" className="text-zinc-200 dark:text-zinc-800" />
                                    <circle cx="50" cy="50" r="42" stroke="currentColor" strokeWidth="9" fill="none" strokeDasharray="263.89" strokeDashoffset={263.89 - (dailyProgress / 100) * 263.89} className="text-zinc-900 dark:text-white transition-all duration-1000 ease-out" strokeLinecap="round" />
                                </svg>
                                <div className="absolute flex flex-col items-center">
                                    <span className="text-2xl font-mono font-bold dark:text-white">{dailyProgress}%</span>
                                </div>
                            </div>
                            <div className="flex-1 text-center md:text-left">
                                <div className="flex items-center justify-center md:justify-start gap-3 mb-2">
                                    <button onClick={() => changeDate(-1)} className="p-2 hover:bg-zinc-100 dark:hover:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg transition-colors text-zinc-500"><ChevronLeft size={18}/></button>
                                    <h3 className="font-bold text-2xl capitalize dark:text-white">
                                        {selectedDate.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })}
                                    </h3>
                                    <button onClick={() => changeDate(1)} className={`p-2 hover:bg-zinc-100 dark:hover:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg transition-colors text-zinc-500 ${isToday ? 'invisible' : ''}`} disabled={isToday}><ChevronRight size={18}/></button>
                                </div>
                                <p className="text-zinc-500 font-mono text-sm">Focus du jour : {visibleHabits.filter(h => logs.some(l => l.habit_id === h.id && l.date === dateStr)).length} / {visibleHabits.length} tâches accomplies.</p>
                            </div>
                        </div>

                        {loading ? (
                            <div className="flex flex-col items-center justify-center py-20 gap-4">
                                <Loader2 className="animate-spin text-zinc-900 dark:text-white w-10 h-10"/>
                            </div>
                        ) : visibleHabits.length === 0 ? (
                            <div className="text-center py-20 bg-white dark:bg-[#111113] rounded-2xl border border-dashed border-zinc-300 dark:border-zinc-800">
                                <Zap className="text-zinc-300 dark:text-zinc-700 mx-auto mb-4" size={48}/>
                                <h3 className="text-lg font-bold text-zinc-700 dark:text-zinc-300">Aucune habitude programmée</h3>
                            </div>
                        ) : (
                            <div className="space-y-10">
                                {uncategorizedVisibleHabits.length > 0 && (
                                    <div className="animate-in fade-in duration-500">
                                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                            {uncategorizedVisibleHabits.map(h => (
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
                                )}

                                {categorizedVisibleHabits.map(cat => (
                                    <div key={cat.id} className="animate-in fade-in duration-500">
                                        <div className="flex items-center justify-between px-1 mb-4 border-b border-zinc-200 dark:border-zinc-800 pb-2">
                                            <h4 className="font-bold text-base text-zinc-800 dark:text-white flex items-center gap-2.5">
                                                <span className={`w-2.5 h-2.5 rounded-full ${cat.color || 'bg-zinc-400'}`}></span>
                                                {cat.name}
                                            </h4>
                                            <span className="text-xs font-mono bg-zinc-100 dark:bg-[#111113] border border-zinc-200 dark:border-zinc-800 px-2.5 py-0.5 rounded-md text-zinc-500">
                                                {cat.habits.filter(h => logs.some(l => l.habit_id === h.id && l.date === dateStr)).length}/{cat.habits.length}
                                            </span>
                                        </div>
                                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
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
                        
                        {/* Aperçu Demain */}
                        {tomorrowHabits.length > 0 && isToday && (
                            <div className="mt-12 pt-8 pb-8 border-t border-zinc-200 dark:border-zinc-800">
                                <h4 className="font-bold text-lg text-zinc-800 dark:text-white flex items-center gap-3 mb-5">
                                    Prévu pour Demain
                                </h4>
                                <div className="flex flex-wrap gap-3">
                                    {tomorrowHabits.map(h => (
                                        <div key={h.id} className="bg-white dark:bg-[#111113] border border-zinc-200 dark:border-zinc-800 rounded-xl px-4 py-2.5 flex items-center gap-2.5 opacity-75 hover:opacity-100 transition-opacity">
                                            <DynamicIcon name={h.icon} size={16} className="text-zinc-500" />
                                            <span className="font-medium text-zinc-700 dark:text-zinc-300 text-sm">{h.name}</span>
                                            {getHabitImportance(h) > 1 && (
                                                <span className="text-[10px] font-mono bg-zinc-200 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 px-1.5 py-0.5 rounded ml-1">x{getHabitImportance(h)}</span>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {/* VUE ANALYSE */}
                {activeTab === 'stats' && (
                    <div className="w-full max-w-[1600px] mx-auto space-y-8 animate-in fade-in duration-300">
                        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                            <div className="bg-zinc-200/70 dark:bg-[#111113] p-1 rounded-xl flex gap-1 border border-zinc-200 dark:border-zinc-800 flex-wrap">
                                {[4, 7, 10, 15, 21, 30, 40, 50, 60].map(d => (
                                    <button key={d} onClick={() => setStatRange(d)} className={`px-3 py-1.5 rounded-lg text-[10px] font-mono font-bold uppercase tracking-wider transition-all ${statRange === d ? 'bg-zinc-900 dark:bg-white text-white dark:text-[#09090b]' : 'text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-200'}`}>{d} Jours</button>
                                ))}
                            </div>
                        </div>

                        <div className="bg-white dark:bg-[#111113] p-8 rounded-2xl border border-zinc-200 dark:border-zinc-800">
                            <div className="h-80 w-full flex items-end justify-between gap-1 md:gap-2">
                                {stats.consistencyData.map((val, i) => (
                                    <div key={i} className="flex-1 flex flex-col justify-end group relative h-full">
                                        <div className={`w-full rounded-t-md transition-all duration-500 ease-out hover:brightness-110 ${val >= 80 ? 'bg-zinc-900 dark:bg-white' : val >= 50 ? 'bg-zinc-500 dark:bg-zinc-400' : val > 0 ? 'bg-zinc-300 dark:bg-zinc-700' : 'bg-zinc-100 dark:bg-zinc-900 h-2'}`} style={{ height: val > 0 ? `${Math.max(val, 5)}%` : '8px' }}></div>
                                        <div className="absolute bottom-full mb-3 left-1/2 -translate-x-1/2 hidden group-hover:flex flex-col items-center z-20 pointer-events-none">
                                            <div className="bg-zinc-900 dark:bg-white text-white dark:text-[#09090b] text-[10px] px-2.5 py-1.5 rounded-lg shadow-xl whitespace-nowrap font-mono font-bold uppercase">
                                                {new Date(stats.dates[i]).toLocaleDateString('fr-FR', {day: 'numeric', month: 'short'})} <span className="ml-1.5">{val}%</span>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
                            {stats.domainStats.map(cat => {
                                return (
                                    <div key={'cat-'+cat.id} className="bg-white dark:bg-[#111113] p-6 rounded-2xl border border-zinc-200 dark:border-zinc-800 flex flex-col items-center transition-all duration-200 group hover:border-zinc-400 dark:hover:border-zinc-600">
                                        <span className="text-[10px] font-mono text-zinc-500 uppercase tracking-widest mb-4 text-center truncate w-full">{cat.name}</span>
                                        <div className="relative w-20 h-20 flex items-center justify-center">
                                            <svg className="w-full h-full -rotate-90" viewBox="0 0 36 36">
                                                <path className="text-zinc-200 dark:text-zinc-800" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="currentColor" strokeWidth="4" />
                                                <path className="text-zinc-900 dark:text-white transition-all duration-1000 ease-in-out" strokeDasharray={`${cat.percent}, 100`} d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round" />
                                            </svg>
                                            <span className="absolute text-base font-mono font-bold dark:text-white">{cat.percent}%</span>
                                        </div>
                                    </div>
                                );
                            })}

                            {stats.orphanStats.map(hab => (
                                <div key={'hab-'+hab.id} className="bg-white dark:bg-[#111113] p-6 rounded-2xl border border-dashed border-zinc-300 dark:border-zinc-800 flex flex-col items-center transition-all duration-200 group relative overflow-hidden">
                                     <span className="text-[10px] font-mono text-zinc-500 uppercase tracking-tighter mb-4 text-center truncate w-full flex justify-center items-center gap-1.5">
                                         <DynamicIcon name={hab.icon} size={13} className="text-zinc-400" />
                                         {hab.name}
                                     </span>
                                     <div className="relative w-20 h-20 flex items-center justify-center">
                                        <svg className="w-full h-full -rotate-90" viewBox="0 0 36 36">
                                            <path className="text-zinc-200 dark:text-zinc-800" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="currentColor" strokeWidth="3" />
                                            <path className="text-zinc-900 dark:text-white transition-all duration-1000 ease-in-out" strokeDasharray={`${hab.percent}, 100`} d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
                                        </svg>
                                        <span className="absolute text-sm font-mono font-bold dark:text-white text-zinc-700">{hab.percent}%</span>
                                     </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* VUE REGLAGES (MODIFIÉE POUR INCLURE LES BOUTONS ÉDITER/REMETTRE À ZÉRO) */}
                {activeTab === 'settings' && (
                    <div className="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-8 animate-in fade-in duration-300">
                        <div className="bg-white dark:bg-[#111113] p-6 md:p-7 rounded-2xl border border-zinc-200 dark:border-zinc-800">
                            <h3 className="font-bold text-lg mb-6 dark:text-white flex items-center gap-2.5"><List size={18}/> Domaines</h3>
                            <div className="space-y-2.5 mb-6">
                                {categories.map(c => (
                                    <div key={c.id} className="flex justify-between items-center p-3.5 bg-zinc-50 dark:bg-[#09090b] rounded-xl border border-zinc-200 dark:border-zinc-800 hover:border-zinc-400 dark:hover:border-zinc-700 transition-all">
                                        <div className="flex items-center gap-3">
                                            <div className={`w-2.5 h-2.5 rounded-full ${c.color || 'bg-zinc-400'}`}></div>
                                            <span className="font-semibold text-sm text-zinc-800 dark:text-zinc-200">{c.name}</span>
                                        </div>
                                        <button onClick={() => deleteCategory(c.id)} className="p-1.5 text-zinc-400 hover:text-red-500 hover:bg-red-500/10 rounded-lg transition-all"><Trash2 size={15}/></button>
                                    </div>
                                ))}
                            </div>
                            <form onSubmit={(e) => { e.preventDefault(); const name = e.target.catName.value; const color = e.target.catColor.value; if(name) { addCategory(name, color); e.target.reset(); } }} className="flex gap-2 pt-5 border-t border-zinc-200 dark:border-zinc-800">
                                <input name="catName" placeholder="Nom..." className="flex-1 p-2.5 bg-zinc-50 dark:bg-[#09090b] rounded-xl outline-none border border-zinc-200 dark:border-zinc-800 focus:border-zinc-500 dark:text-white transition-all text-sm font-medium" required/>
                                <select name="catColor" className="p-2.5 bg-zinc-50 dark:bg-[#09090b] rounded-xl outline-none border border-zinc-200 dark:border-zinc-800 focus:border-zinc-500 dark:text-white cursor-pointer text-sm font-medium">
                                    <option value="bg-blue-500">Bleu</option>
                                    <option value="bg-green-500">Vert</option>
                                    <option value="bg-purple-500">Violet</option>
                                    <option value="bg-orange-500">Orange</option>
                                    <option value="bg-red-500">Rouge</option>
                                </select>
                                <button type="submit" className="p-2.5 bg-zinc-900 dark:bg-white text-white dark:text-[#09090b] rounded-xl hover:opacity-90 transition-all"><Plus size={18}/></button>
                            </form>
                        </div>

                        <div className="bg-white dark:bg-[#111113] p-6 md:p-7 rounded-2xl border border-zinc-200 dark:border-zinc-800">
                            <h3 className="font-bold text-lg mb-6 dark:text-white flex items-center gap-2.5"><Target size={18}/> Catalogue Habitudes</h3>
                            <div className="space-y-2.5 mb-6 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
                                {activeHabitsForManagement.map(h => (
                                    <div key={h.id} className="flex justify-between items-center p-3.5 bg-zinc-50 dark:bg-[#09090b] rounded-xl border border-zinc-200 dark:border-zinc-800 hover:border-zinc-400 dark:hover:border-zinc-700 transition-all group">
                                        <div>
                                            <div className="font-semibold text-sm text-zinc-800 dark:text-zinc-200 flex items-center gap-2">
                                                <DynamicIcon name={h.icon} size={16} className="text-zinc-400" />
                                                {h.name}
                                            </div>
                                            <div className="flex gap-1 mt-2">
                                                {['D','L','M','M','J','V','S'].map((d, i) => (
                                                    <span key={i} className={`text-[8px] w-4 h-4 flex items-center justify-center rounded font-mono font-bold ${(getHabitDays(h)).includes(i) ? 'bg-zinc-900 dark:bg-white text-white dark:text-[#09090b]' : 'text-zinc-400 dark:text-zinc-600'}`}>{d}</span>
                                                ))}
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-all">
                                            <button onClick={() => resetHabitHistory(h.id)} className="p-2 text-zinc-400 hover:text-amber-500 hover:bg-amber-500/10 rounded-lg transition-all" title="Remettre à zéro l'historique"><RotateCcw size={15}/></button>
                                            <button onClick={() => startEditingHabit(h)} className="p-2 text-zinc-400 hover:text-white hover:bg-zinc-800 rounded-lg transition-all" title="Modifier"><Edit2 size={15}/></button>
                                            <button onClick={() => deleteHabit(h.id)} className="p-2 text-zinc-400 hover:text-red-500 hover:bg-red-500/10 rounded-lg transition-all" title="Supprimer complètement"><Trash2 size={15}/></button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                            
                            {/* COMPOSANT HABITCREATOR avec les props nécessaires */}
                            <HabitCreator 
                                categories={categories} 
                                onAdd={addHabit} 
                                editingHabit={editingHabit} 
                                onCancelEdit={() => setEditingHabit(null)} 
                            />
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
                group relative flex items-center justify-between p-5 rounded-2xl border transition-all duration-200 cursor-pointer select-none active:scale-[0.99] overflow-hidden
                ${isDone 
                    ? 'bg-zinc-50 dark:bg-[#09090b] border-zinc-300 dark:border-zinc-700' 
                    : `bg-white dark:bg-[#111113] border-zinc-200 dark:border-zinc-800 hover:border-zinc-400 dark:hover:border-zinc-600 ${colorClass || ''}`
                }
            `}
        >
            <div className="flex items-center gap-4 relative z-10">
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center transition-all duration-200 border ${isDone ? 'bg-zinc-900 dark:bg-white border-zinc-900 dark:border-white text-white dark:text-[#09090b]' : `${iconColor || 'bg-zinc-100 dark:bg-[#09090b] border-zinc-200 dark:border-zinc-800 text-zinc-500 dark:text-zinc-400 group-hover:text-zinc-900 dark:group-hover:text-white'}`}`}>
                    {isProcessing ? (
                        <Loader2 size={20} className="animate-spin" />
                    ) : isDone ? (
                        <Check size={22} strokeWidth={3} />
                    ) : habit.icon ? (
                        <DynamicIcon name={habit.icon} size={20} />
                    ) : (
                        <Zap size={20} />
                    )}
                </div>
                <div>
                     <span className={`text-base font-semibold block transition-all ${isDone ? 'text-zinc-400 dark:text-zinc-500 line-through' : 'text-zinc-900 dark:text-zinc-100'}`}>
                        {habit.name}
                    </span>
                    <span className="text-[11px] font-mono text-zinc-500">
                        {isDone ? 'Complété' : 'À faire aujourd\'hui'}
                    </span>
                </div>
            </div>
            
            <div className={`relative z-10 w-7 h-7 rounded-lg border flex items-center justify-center transition-all ${isDone ? 'bg-zinc-900 dark:bg-white border-zinc-900 dark:border-white text-white dark:text-[#09090b]' : 'border-zinc-300 dark:border-zinc-700 text-transparent group-hover:border-zinc-500'}`}>
                <Check size={14} strokeWidth={3} />
            </div>
        </div>
    );
}

// --- FORMULAIRE MODIFIÉ POUR SUPPORTER L'ÉDITION ---
function HabitCreator({ categories, onAdd, editingHabit, onCancelEdit }) {
    const [name, setName] = useState('');
    const [categoryId, setCategoryId] = useState('');
    const [selectedDays, setSelectedDays] = useState([0,1,2,3,4,5,6]); 
    const [selectedIcon, setSelectedIcon] = useState('');
    const [importance, setImportance] = useState(1);

    // Si on clique sur "Éditer", on pré-remplit les champs
    useEffect(() => {
        if (editingHabit) {
            setName(editingHabit.name);
            setCategoryId(editingHabit.category_id || '');
            setSelectedDays(Array.isArray(editingHabit?.days_of_week) ? editingHabit.days_of_week : (editingHabit?.days_of_week?.days || [0,1,2,3,4,5,6]));
            setSelectedIcon(editingHabit.icon || '');
            setImportance(Array.isArray(editingHabit?.days_of_week) ? 1 : (editingHabit?.days_of_week?.importance || 1));
        }
    }, [editingHabit]);

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
            onAdd(name, categoryId, selectedDays, selectedIcon, importance); 
            setName('');
            setCategoryId('');
            setSelectedDays([0,1,2,3,4,5,6]); 
            setSelectedIcon('');
            setImportance(1);
        }
    };

    return (
        <form onSubmit={handleSubmit} className={`pt-6 border-t space-y-5 ${editingHabit ? 'border-white' : 'border-zinc-200 dark:border-zinc-800'}`}>
            {editingHabit && <div className="text-[10px] font-mono font-bold text-zinc-900 dark:text-white uppercase tracking-widest bg-zinc-200 dark:bg-zinc-800 px-3 py-1 rounded w-fit">Mode Modification</div>}
            <div className="space-y-4">
                <div className="flex flex-col md:flex-row gap-2">
                    <input 
                        value={name} 
                        onChange={(e) => setName(e.target.value)}
                        placeholder="Nom de l'habitude..." 
                        className="flex-1 w-full p-3 bg-zinc-50 dark:bg-[#09090b] rounded-xl outline-none border border-zinc-200 dark:border-zinc-800 focus:border-zinc-500 dark:text-white transition-all font-semibold text-sm" 
                        required
                    />
                    <select 
                        value={categoryId} 
                        onChange={(e) => setCategoryId(e.target.value)}
                        className="p-3 w-full md:w-1/3 bg-zinc-50 dark:bg-[#09090b] rounded-xl outline-none border border-zinc-200 dark:border-zinc-800 focus:border-zinc-500 dark:text-white cursor-pointer font-semibold text-sm"
                    >
                        <option value="">Sans Domaine</option>
                        {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </select>
                </div>

                <div className="bg-zinc-50 dark:bg-[#09090b] border border-zinc-200 dark:border-zinc-800 p-3.5 rounded-xl">
                    <div className="flex flex-wrap gap-2 max-h-32 overflow-y-auto custom-scrollbar pr-2">
                        {PREMIUM_ICONS.map(iconName => (
                            <button 
                                key={iconName} 
                                type="button" 
                                onClick={() => setSelectedIcon(iconName === selectedIcon ? '' : iconName)}
                                className={`w-9 h-9 flex items-center justify-center rounded-lg transition-all border ${selectedIcon === iconName ? 'bg-zinc-900 dark:bg-white border-zinc-900 dark:border-white text-white dark:text-[#09090b]' : 'bg-white dark:bg-[#111113] border-zinc-200 dark:border-zinc-800 text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white'}`}
                                title={iconName}
                            >
                                <DynamicIcon name={iconName} size={18} />
                            </button>
                        ))}
                    </div>
                </div>

                <div className="flex flex-col xl:flex-row items-start xl:items-center justify-between gap-3">
                    <div className="flex-1 w-full bg-zinc-50 dark:bg-[#09090b] border border-zinc-200 dark:border-zinc-800 p-3.5 rounded-xl flex flex-wrap sm:flex-nowrap items-center justify-between gap-3">
                        <span className="text-[10px] font-mono text-zinc-500 uppercase tracking-widest shrink-0">Fréquence</span>
                        <div className="flex flex-wrap gap-1 justify-end">
                            {['D','L','M','M','J','V','S'].map((d, i) => (
                                <button key={i} type="button" onClick={() => toggleDay(i)} className={`w-7 h-7 rounded-md text-[10px] font-mono font-bold transition-all duration-150 shrink-0 ${selectedDays.includes(i) ? 'bg-zinc-900 dark:bg-white text-white dark:text-[#09090b]' : 'bg-white dark:bg-[#111113] border border-zinc-200 dark:border-zinc-800 text-zinc-500 hover:text-white'}`}>{d}</button>
                            ))}
                        </div>
                    </div>
                    <div className="flex-1 w-full bg-zinc-50 dark:bg-[#09090b] border border-zinc-200 dark:border-zinc-800 p-3.5 rounded-xl flex flex-wrap sm:flex-nowrap items-center justify-between gap-3">
                        <span className="text-[10px] font-mono text-zinc-500 uppercase tracking-widest shrink-0">Importance</span>
                        <div className="flex flex-wrap gap-1 justify-end">
                            {[1, 2, 3, 4, 5].map((val) => (
                                <button key={val} type="button" onClick={() => setImportance(val)} className={`w-7 h-7 rounded-md text-[10px] font-mono font-bold transition-all duration-150 shrink-0 ${importance === val ? 'bg-zinc-900 dark:bg-white text-white dark:text-[#09090b]' : 'bg-white dark:bg-[#111113] border border-zinc-200 dark:border-zinc-800 text-zinc-500 hover:text-white'}`}>x{val}</button>
                            ))}
                        </div>
                    </div>
                </div>
                <div className="flex flex-wrap justify-end gap-2 mt-4">
                    {editingHabit ? (
                        <>
                            <button type="button" onClick={onCancelEdit} className="px-4 py-2.5 bg-zinc-200 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300 rounded-xl hover:bg-zinc-300 dark:hover:bg-zinc-700 transition-all font-mono font-bold text-xs uppercase tracking-wider shrink-0">Annuler</button>
                            <button type="submit" className="px-5 py-2.5 bg-zinc-900 dark:bg-white text-white dark:text-[#09090b] rounded-xl hover:opacity-90 transition-all font-mono font-bold text-xs uppercase tracking-wider shrink-0">Sauver</button>
                        </>
                    ) : (
                        <button type="submit" className="px-5 py-2.5 bg-zinc-900 dark:bg-white text-white dark:text-[#09090b] rounded-xl flex items-center justify-center gap-2 font-mono font-bold uppercase tracking-wider text-xs hover:opacity-90 active:scale-95 transition-all shrink-0 w-full sm:w-auto">
                            <Plus size={16}/> Ajouter
                        </button>
                    )}
                </div>
            </div>
        </form>
    );
}