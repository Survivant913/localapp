import { useState, useEffect, useMemo } from 'react';
import { supabase } from './supabaseClient';
import { 
  Plus, Trash2, Check, X, Activity, BarChart2, Calendar, 
  Settings, Target, ChevronLeft, ChevronRight, Zap, Trophy, Loader2, LayoutGrid, List
} from 'lucide-react';

// --- UTILITAIRES ---

// Fix Tailwind : Mapping explicite pour éviter la purge CSS des couleurs dynamiques
const COLOR_MAP = {
    'bg-blue-500': 'text-blue-500',
    'bg-green-500': 'text-green-500',
    'bg-purple-500': 'text-purple-500',
    'bg-orange-500': 'text-orange-500',
    'bg-red-500': 'text-red-500',
    'bg-gray-400': 'text-gray-400'
};

const Badge = ({ color, text }) => (
    <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${color || 'bg-gray-100 text-gray-500'}`}>
        {text}
    </span>
);

// Fonction critique : Garantit que les dates sont gérées en local (pas de décalage UTC)
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
    
    // Données locales
    const [categories, setCategories] = useState([]);
    const [habits, setHabits] = useState([]);
    const [logs, setLogs] = useState([]);
    const [loading, setLoading] = useState(true);
    
    // Sécurité : Empêche le double-clic (spam) pendant la requête
    const [processingHabits, setProcessingHabits] = useState(new Set());

    // --- CHARGEMENT DES DONNÉES ---
    useEffect(() => {
        loadHabitData();
    }, []);

    const loadHabitData = async () => {
        try {
            setLoading(true);
            
            // 1. Catégories triées par nom
            const { data: cats } = await supabase.from('habit_categories').select('*').order('name');
            
            // 2. Habitudes (On charge TOUT, même les archivées, pour la cohérence historique)
            const { data: habs } = await supabase.from('habits').select('*').order('created_at');
            
            // 3. Historique étendu (1 an en arrière + Limite augmentée à 10 000)
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

    // --- ACTIONS (Logique Cœur - INTACTE) ---
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

    // --- MOTEUR DE STATISTIQUES (Logique Cœur - INTACTE) ---
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
                    } else if (isScheduled) {
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
                } else if (isScheduled) {
                    activeHabitsCount++;
                }
            });

            if (activeHabitsCount === 0) return 0;
            return Math.round((doneCount / activeHabitsCount) * 100);
        });

        return { domainStats, consistencyData, dates: dates.map(d => d.str) };
    }, [statRange, categories, habits, logs]);

    // --- NAVIGATION DATES ---
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

    // --- RENDER (NOUVEAU DESIGN PRO) ---
    return (
        <div className="flex flex-col h-full bg-gray-50 dark:bg-slate-900 transition-colors">
            {/* HEADER PRO */}
            <div className="bg-white dark:bg-slate-800 border-b border-gray-200 dark:border-slate-700 px-6 py-4 flex flex-col md:flex-row justify-between items-center gap-4 shrink-0 shadow-sm z-10">
                <div>
                    <h2 className="text-2xl font-bold text-gray-800 dark:text-white flex items-center gap-3">
                        <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg text-blue-600 dark:text-blue-400">
                            <Activity size={24} />
                        </div>
                        Suivi Habitudes
                    </h2>
                    <p className="text-sm text-gray-500 dark:text-gray-400 ml-1">Construisez votre discipline jour après jour</p>
                </div>
                
                <div className="flex bg-gray-100 dark:bg-slate-700/50 p-1.5 rounded-xl border border-gray-200 dark:border-slate-600">
                    <button onClick={() => setActiveTab('daily')} className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition-all ${activeTab === 'daily' ? 'bg-white dark:bg-slate-600 text-blue-600 dark:text-white shadow-sm ring-1 ring-black/5 dark:ring-white/10' : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 hover:bg-gray-200/50'}`}>
                        <LayoutGrid size={16}/> Quotidien
                    </button>
                    <button onClick={() => setActiveTab('stats')} className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition-all ${activeTab === 'stats' ? 'bg-white dark:bg-slate-600 text-blue-600 dark:text-white shadow-sm ring-1 ring-black/5 dark:ring-white/10' : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 hover:bg-gray-200/50'}`}>
                        <BarChart2 size={16}/> Analyse
                    </button>
                    <button onClick={() => setActiveTab('settings')} className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-bold transition-all ${activeTab === 'settings' ? 'bg-white dark:bg-slate-600 text-blue-600 dark:text-white shadow-sm ring-1 ring-black/5 dark:ring-white/10' : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 hover:bg-gray-200/50'}`}>
                        <Settings size={18}/>
                    </button>
                </div>
            </div>

            {/* CONTENU FLUIDE */}
            <div className="flex-1 overflow-y-auto p-6 md:p-8 custom-scrollbar">
                
                {/* VUE QUOTIDIENNE (MODE DASHBOARD) */}
                {activeTab === 'daily' && (
                    <div className="max-w-7xl mx-auto space-y-8">
                        {/* SELECTEUR DATE LARGE */}
                        <div className="flex items-center justify-between bg-white dark:bg-slate-800 p-4 rounded-2xl shadow-sm border border-gray-200 dark:border-slate-700 sticky top-0 z-20 backdrop-blur-md bg-white/90 dark:bg-slate-800/90 supports-[backdrop-filter]:bg-white/60">
                            <button onClick={() => changeDate(-1)} className="p-3 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-xl text-gray-500 transition-colors"><ChevronLeft/></button>
                            <div className="flex flex-col items-center">
                                <h3 className="font-bold text-xl capitalize text-gray-800 dark:text-white">
                                    {selectedDate.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })}
                                </h3>
                                {isToday ? (
                                    <span className="text-xs font-bold text-blue-600 bg-blue-50 dark:bg-blue-900/30 px-2 py-0.5 rounded-full uppercase tracking-wide mt-1">Aujourd'hui</span>
                                ) : (
                                    <span className="text-xs font-medium text-gray-400 mt-1">Historique</span>
                                )}
                            </div>
                            <button onClick={() => changeDate(1)} className={`p-3 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-xl text-gray-500 transition-colors ${isToday ? 'opacity-30 cursor-not-allowed' : ''}`} disabled={isToday}><ChevronRight/></button>
                        </div>

                        {/* GRILLE DES HABITUDES */}
                        {loading ? (
                            <div className="flex justify-center py-20"><Loader2 className="animate-spin text-blue-500 w-10 h-10"/></div>
                        ) : categories.length === 0 ? (
                            <div className="text-center py-20 text-gray-400 bg-white dark:bg-slate-800 rounded-3xl border border-dashed border-gray-200 dark:border-slate-700">
                                <p className="text-lg">Aucune catégorie définie.</p>
                                <button onClick={() => setActiveTab('settings')} className="mt-4 px-6 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors">Créer ma première catégorie</button>
                            </div>
                        ) : visibleHabits.length === 0 ? (
                            <div className="flex flex-col items-center justify-center py-24 bg-white dark:bg-slate-800 rounded-3xl border border-dashed border-gray-200 dark:border-slate-700 text-center">
                                <div className="p-4 bg-gray-50 dark:bg-slate-700 rounded-full mb-4">
                                    <Zap className="text-gray-400 dark:text-slate-500" size={48}/>
                                </div>
                                <h3 className="text-lg font-bold text-gray-700 dark:text-slate-200">Rien de prévu pour ce jour</h3>
                                <p className="text-gray-500 dark:text-slate-400 max-w-xs mt-2">C'est le moment idéal pour se reposer ou planifier de nouvelles habitudes.</p>
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                                {categories.map(cat => {
                                    const catHabits = visibleHabits.filter(h => h.category_id === cat.id);
                                    if (catHabits.length === 0) return null;

                                    return (
                                        <div key={cat.id} className="bg-white dark:bg-slate-800 rounded-3xl shadow-sm border border-gray-200 dark:border-slate-700 overflow-hidden hover:shadow-md transition-shadow duration-300">
                                            <div className={`h-1.5 w-full ${cat.color || 'bg-blue-500'}`}></div>
                                            <div className="p-6">
                                                <div className="flex items-center justify-between mb-6">
                                                    <h4 className="font-bold text-lg text-gray-800 dark:text-white flex items-center gap-2">
                                                        <span className={`w-3 h-3 rounded-full ${cat.color || 'bg-blue-500'}`}></span>
                                                        {cat.name}
                                                    </h4>
                                                    <span className="text-xs font-medium text-gray-400 bg-gray-100 dark:bg-slate-700 px-2 py-1 rounded-lg">
                                                        {catHabits.length} tâches
                                                    </span>
                                                </div>
                                                
                                                <div className="space-y-3">
                                                    {catHabits.map(h => {
                                                        const isDone = logs.some(l => l.habit_id === h.id && l.date === dateStr);
                                                        const isProcessing = processingHabits.has(h.id);
                                                        return (
                                                            <div 
                                                                key={h.id} 
                                                                onClick={() => !isProcessing && toggleHabit(h.id)}
                                                                className={`
                                                                    flex items-center justify-between p-4 rounded-2xl border cursor-pointer group transition-all duration-200
                                                                    ${isProcessing ? 'opacity-50 cursor-wait' : 'hover:scale-[1.01]'}
                                                                    ${isDone 
                                                                        ? 'bg-emerald-50 dark:bg-emerald-900/10 border-emerald-200 dark:border-emerald-900/30' 
                                                                        : 'bg-gray-50 dark:bg-slate-700/30 border-transparent hover:border-gray-200 dark:hover:border-slate-600'
                                                                    }
                                                                `}
                                                            >
                                                                <span className={`font-medium text-base ${isDone ? 'text-emerald-700 dark:text-emerald-400 line-through decoration-emerald-500/30' : 'text-gray-700 dark:text-slate-200'}`}>
                                                                    {h.name}
                                                                </span>
                                                                
                                                                <div className={`
                                                                    w-8 h-8 rounded-full flex items-center justify-center transition-all duration-300
                                                                    ${isDone 
                                                                        ? 'bg-emerald-500 text-white scale-110 shadow-lg shadow-emerald-500/20' 
                                                                        : 'bg-white dark:bg-slate-600 border-2 border-gray-200 dark:border-slate-500 text-transparent group-hover:border-gray-300'
                                                                    }
                                                                `}>
                                                                    <Check size={16} strokeWidth={4} />
                                                                </div>
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                )}

                {/* VUE ANALYSE (GRANDE TAILLE) */}
                {activeTab === 'stats' && (
                    <div className="max-w-7xl mx-auto space-y-8">
                        {/* Barre d'outils Stats */}
                        <div className="flex justify-center md:justify-end">
                            <div className="bg-white dark:bg-slate-800 p-1 rounded-xl shadow-sm border border-gray-200 dark:border-slate-700 flex gap-1">
                                {[7, 30, 90].map(d => (
                                    <button 
                                        key={d} 
                                        onClick={() => setStatRange(d)}
                                        className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${statRange === d ? 'bg-blue-600 text-white shadow-md' : 'text-gray-500 hover:bg-gray-100 dark:hover:bg-slate-700'}`}
                                    >
                                        {d} Jours
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* GRAPHIQUE CONSTANCE (LARGEUR MAX & HAUTEUR PRO) */}
                        <div className="bg-white dark:bg-slate-800 p-8 rounded-3xl shadow-sm border border-gray-200 dark:border-slate-700">
                            <h3 className="font-bold text-xl text-gray-800 dark:text-white mb-8 flex items-center gap-3">
                                <div className="p-2 bg-amber-100 dark:bg-amber-900/30 rounded-lg text-amber-600">
                                    <Trophy size={24}/> 
                                </div>
                                Constance Globale
                            </h3>
                            
                            {/* Container Graphique HAUTEUR PRO (h-80) */}
                            <div className="h-80 w-full flex items-end justify-between gap-1 md:gap-2">
                                {stats.consistencyData.length > 0 ? stats.consistencyData.map((val, i) => (
                                    <div key={i} className="flex-1 flex flex-col justify-end group relative h-full">
                                        <div 
                                            className={`
                                                w-full rounded-t-lg transition-all duration-700 ease-out hover:opacity-80
                                                ${val >= 80 ? 'bg-gradient-to-t from-emerald-500 to-emerald-400' : 
                                                  val >= 50 ? 'bg-gradient-to-t from-blue-500 to-blue-400' : 
                                                  'bg-gray-200 dark:bg-slate-700'}
                                            `}
                                            style={{ height: `${Math.max(val, 5)}%` }}
                                        ></div>
                                        
                                        {/* Tooltip Amélioré */}
                                        <div className="absolute bottom-full mb-3 left-1/2 -translate-x-1/2 hidden group-hover:flex flex-col items-center z-20 pointer-events-none">
                                            <div className="bg-slate-900 text-white text-xs px-3 py-2 rounded-lg shadow-xl whitespace-nowrap font-medium">
                                                {new Date(stats.dates[i]).toLocaleDateString('fr-FR', {day: 'numeric', month: 'short'})} : <span className="font-bold text-emerald-400">{val}%</span>
                                            </div>
                                            <div className="w-2 h-2 bg-slate-900 rotate-45 -mt-1"></div>
                                        </div>
                                    </div>
                                )) : <div className="w-full text-center text-gray-400 flex items-center justify-center h-full">Pas assez de données pour cette période</div>}
                            </div>
                        </div>

                        {/* JAUGES (GRID RESPONSIVE) */}
                        <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-6">
                            {stats.domainStats.map(cat => {
                                const textColor = cat.color ? COLOR_MAP[cat.color] : 'text-blue-500';
                                
                                return (
                                    <div key={cat.id} className="bg-white dark:bg-slate-800 p-6 rounded-3xl shadow-sm border border-gray-200 dark:border-slate-700 flex flex-col items-center hover:translate-y-[-2px] transition-transform duration-300">
                                        <h4 className="font-bold text-gray-700 dark:text-slate-200 mb-4 text-center line-clamp-1">{cat.name}</h4>
                                        
                                        <div className="relative w-28 h-28 flex items-center justify-center">
                                            {/* Cercle Fond */}
                                            <svg className="w-full h-full -rotate-90" viewBox="0 0 36 36">
                                                <path className="text-gray-100 dark:text-slate-700/50" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="currentColor" strokeWidth="3" />
                                                <path 
                                                    className={`${cat.percent >= 100 ? 'text-emerald-500' : textColor} transition-all duration-1000 ease-out`} 
                                                    strokeDasharray={`${cat.percent}, 100`} 
                                                    d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" 
                                                    fill="none" 
                                                    stroke="currentColor" 
                                                    strokeWidth="3" 
                                                    strokeLinecap="round" 
                                                />
                                            </svg>
                                            <div className="absolute flex flex-col items-center">
                                                <span className="text-2xl font-black text-gray-800 dark:text-white">{cat.percent}%</span>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                )}

                {/* VUE REGLAGES (SPLIT VIEW) */}
                {activeTab === 'settings' && (
                    <div className="max-w-7xl mx-auto">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                            
                            {/* COLONNE GAUCHE : CATEGORIES */}
                            <div className="bg-white dark:bg-slate-800 p-8 rounded-3xl shadow-sm border border-gray-200 dark:border-slate-700 h-fit">
                                <h3 className="font-bold text-xl mb-6 text-gray-800 dark:text-white flex items-center gap-2">
                                    <List size={20}/> Domaines
                                </h3>
                                <div className="space-y-3 mb-6">
                                    {categories.map(c => (
                                        <div key={c.id} className="flex justify-between items-center p-3 hover:bg-gray-50 dark:hover:bg-slate-700/50 rounded-xl transition-colors border border-transparent hover:border-gray-100 dark:hover:border-slate-600">
                                            <div className="flex items-center gap-3">
                                                <div className={`w-4 h-4 rounded-full ${c.color || 'bg-gray-400'}`}></div>
                                                <span className="font-medium text-gray-700 dark:text-slate-200">{c.name}</span>
                                            </div>
                                            <button onClick={() => deleteCategory(c.id)} className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"><Trash2 size={16}/></button>
                                        </div>
                                    ))}
                                </div>
                                <form 
                                    onSubmit={(e) => {
                                        e.preventDefault();
                                        const name = e.target.catName.value;
                                        const color = e.target.catColor.value;
                                        if(name) { addCategory(name, color); e.target.reset(); }
                                    }}
                                    className="flex gap-2 pt-4 border-t border-gray-100 dark:border-slate-700"
                                >
                                    <input name="catName" placeholder="Nom du domaine..." className="flex-1 p-2.5 bg-gray-50 dark:bg-slate-700 rounded-xl outline-none border border-transparent focus:border-blue-500 focus:bg-white dark:focus:bg-slate-600 dark:text-white transition-all" required/>
                                    <select name="catColor" className="p-2.5 bg-gray-50 dark:bg-slate-700 rounded-xl outline-none border border-transparent focus:border-blue-500 dark:text-white cursor-pointer">
                                        <option value="bg-blue-500">Bleu</option>
                                        <option value="bg-green-500">Vert</option>
                                        <option value="bg-purple-500">Violet</option>
                                        <option value="bg-orange-500">Orange</option>
                                        <option value="bg-red-500">Rouge</option>
                                    </select>
                                    <button type="submit" className="p-2.5 bg-blue-600 text-white rounded-xl hover:bg-blue-700 shadow-lg shadow-blue-500/30 transition-all"><Plus size={20}/></button>
                                </form>
                            </div>

                            {/* COLONNE DROITE : HABITUDES */}
                            <div className="bg-white dark:bg-slate-800 p-8 rounded-3xl shadow-sm border border-gray-200 dark:border-slate-700 h-fit">
                                <h3 className="font-bold text-xl mb-6 text-gray-800 dark:text-white flex items-center gap-2">
                                    <Target size={20}/> Habitudes
                                </h3>
                                <div className="space-y-3 mb-6 max-h-[500px] overflow-y-auto pr-2 custom-scrollbar">
                                    {activeHabitsForManagement.map(h => (
                                        <div key={h.id} className="flex justify-between items-center p-3 hover:bg-gray-50 dark:hover:bg-slate-700/50 rounded-xl transition-colors border border-transparent hover:border-gray-100 dark:hover:border-slate-600">
                                            <div>
                                                <div className="font-medium text-gray-700 dark:text-slate-200">{h.name}</div>
                                                <div className="flex gap-1 mt-1.5">
                                                    {['D','L','M','M','J','V','S'].map((d, i) => (
                                                        <span key={i} className={`text-[9px] w-4 h-4 flex items-center justify-center rounded-full ${(h.days_of_week||[0,1,2,3,4,5,6]).includes(i) ? 'bg-blue-100 text-blue-600 dark:bg-blue-900/40 dark:text-blue-300 font-bold' : 'text-gray-300 dark:text-slate-600'}`}>
                                                            {d}
                                                        </span>
                                                    ))}
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-3">
                                                <Badge text={categories.find(c => c.id === h.category_id)?.name || 'Sans cat.'} />
                                                <button onClick={() => deleteHabit(h.id)} className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"><Trash2 size={16}/></button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                                <HabitCreator categories={categories} onAdd={addHabit} />
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}

// --- SOUS-COMPOSANT CRÉATION (DESIGN PRO) ---
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
        <form onSubmit={handleSubmit} className="pt-6 border-t border-gray-100 dark:border-slate-700">
            <div className="flex gap-2 mb-3">
                <input name="habName" placeholder="Nouvelle habitude..." className="flex-1 p-2.5 bg-gray-50 dark:bg-slate-700 rounded-xl outline-none border border-transparent focus:border-blue-500 focus:bg-white dark:focus:bg-slate-600 dark:text-white transition-all" required/>
                <select name="habCat" className="p-2.5 bg-gray-50 dark:bg-slate-700 rounded-xl outline-none border border-transparent focus:border-blue-500 dark:text-white cursor-pointer" required>
                    <option value="">Domaine...</option>
                    {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
                <button type="submit" className="p-2.5 bg-blue-600 text-white rounded-xl hover:bg-blue-700 shadow-lg shadow-blue-500/30 transition-all"><Plus size={20}/></button>
            </div>
            
            <div className="flex items-center justify-between bg-gray-50 dark:bg-slate-700/50 p-2 rounded-xl">
                <span className="text-xs font-bold text-gray-400 uppercase tracking-wider ml-2">Fréquence</span>
                <div className="flex gap-1">
                    {['D','L','M','M','J','V','S'].map((d, i) => (
                        <button 
                            key={i}
                            type="button"
                            onClick={() => toggleDay(i)}
                            className={`w-7 h-7 rounded-lg text-[10px] font-bold transition-all duration-200 ${selectedDays.includes(i) ? 'bg-blue-600 text-white shadow-md scale-105' : 'bg-white dark:bg-slate-600 text-gray-400 hover:bg-gray-100'}`}
                        >
                            {d}
                        </button>
                    ))}
                </div>
            </div>
        </form>
    );
}