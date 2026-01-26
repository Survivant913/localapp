import { useState, useEffect, useMemo } from 'react';
import { supabase } from './supabaseClient';
import { 
  Plus, Trash2, Check, X, Activity, BarChart2, Calendar, 
  Settings, Target, ChevronLeft, ChevronRight, Zap, Trophy 
} from 'lucide-react';

// --- COMPOSANTS UI SIMPLES ---
const Badge = ({ color, text }) => (
    <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${color || 'bg-gray-100 text-gray-500'}`}>
        {text}
    </span>
);

export default function HabitTracker({ data, updateData }) {
    const [activeTab, setActiveTab] = useState('daily'); // 'daily' | 'stats' | 'settings'
    const [selectedDate, setSelectedDate] = useState(new Date());
    const [statRange, setStatRange] = useState(7); // 7, 30, 90
    
    // Données locales
    const [categories, setCategories] = useState([]);
    const [habits, setHabits] = useState([]);
    const [logs, setLogs] = useState([]);
    const [loading, setLoading] = useState(true);

    // --- CHARGEMENT ---
    useEffect(() => {
        loadHabitData();
    }, []);

    const loadHabitData = async () => {
        try {
            setLoading(true);
            const { data: cats } = await supabase.from('habit_categories').select('*').order('created_at');
            const { data: habs } = await supabase.from('habits').select('*').eq('is_archived', false).order('created_at');
            // On charge un historique large (3 derniers mois)
            const d = new Date(); d.setDate(d.getDate() - 100);
            const { data: lgs } = await supabase.from('habit_logs').select('*').gte('date', d.toISOString().split('T')[0]);

            setCategories(cats || []);
            setHabits(habs || []);
            setLogs(lgs || []);
        } catch (e) {
            console.error("Erreur chargement habitudes:", e);
        } finally {
            setLoading(false);
        }
    };

    // --- ACTIONS ---
    const toggleHabit = async (habitId) => {
        const dateStr = selectedDate.toISOString().split('T')[0];
        const existingLog = logs.find(l => l.habit_id === habitId && l.date === dateStr);

        // Optimistic UI Update (Mise à jour immédiate visuelle)
        let newLogs = [...logs];
        
        if (existingLog) {
            // Suppression
            newLogs = newLogs.filter(l => l.id !== existingLog.id);
            setLogs(newLogs); // Update local
            await supabase.from('habit_logs').delete().eq('id', existingLog.id);
        } else {
            // Ajout
            const tempId = Date.now(); // ID temporaire
            const newEntry = { id: tempId, habit_id: habitId, date: dateStr, completed: true };
            newLogs.push(newEntry);
            setLogs(newLogs); // Update local
            
            const { data: inserted } = await supabase.from('habit_logs').insert({ 
                habit_id: habitId, date: dateStr, completed: true 
            }).select().single();
            
            // Remplacer l'ID temporaire par le vrai
            if (inserted) {
                setLogs(prev => prev.map(l => l.id === tempId ? inserted : l));
            }
        }
    };

    const addCategory = async (name, color) => {
        const { data: newCat } = await supabase.from('habit_categories').insert({ name, color }).select().single();
        if (newCat) setCategories([...categories, newCat]);
    };

    const deleteCategory = async (id) => {
        if (!window.confirm("Supprimer cette catégorie et toutes ses habitudes ?")) return;
        await supabase.from('habit_categories').delete().eq('id', id);
        setCategories(categories.filter(c => c.id !== id));
        setHabits(habits.filter(h => h.category_id !== id));
    };

    const addHabit = async (name, categoryId) => {
        const { data: newHab } = await supabase.from('habits').insert({ name, category_id: categoryId }).select().single();
        if (newHab) setHabits([...habits, newHab]);
    };

    const deleteHabit = async (id) => {
        if (!window.confirm("Supprimer cette habitude ? L'historique sera conservé mais elle n'apparaîtra plus.")) return;
        await supabase.from('habits').update({ is_archived: true }).eq('id', id);
        setHabits(habits.filter(h => h.id !== id));
    };

    // --- CALCULS STATISTIQUES ---
    const stats = useMemo(() => {
        const today = new Date();
        today.setHours(0,0,0,0);
        
        // 1. Générer les dates de la période
        const dates = [];
        for(let i = statRange - 1; i >= 0; i--) {
            const d = new Date(today);
            d.setDate(d.getDate() - i);
            dates.push(d.toISOString().split('T')[0]);
        }

        // 2. Calcul par Domaine (Catégorie)
        const domainStats = categories.map(cat => {
            const catHabits = habits.filter(h => h.category_id === cat.id);
            if (catHabits.length === 0) return null;

            let totalPossible = catHabits.length * statRange;
            let totalDone = 0;

            catHabits.forEach(h => {
                const doneCount = logs.filter(l => l.habit_id === h.id && dates.includes(l.date)).length;
                totalDone += doneCount;
            });

            return {
                ...cat,
                percent: totalPossible === 0 ? 0 : Math.round((totalDone / totalPossible) * 100)
            };
        }).filter(Boolean);

        // 3. Calcul Courbe de Constance (Global)
        const consistencyData = dates.map(dateStr => {
            if (habits.length === 0) return 0;
            const logsForDay = logs.filter(l => l.date === dateStr && habits.some(h => h.id === l.habit_id)).length;
            const percent = Math.round((logsForDay / habits.length) * 100);
            return percent;
        });

        return { domainStats, consistencyData, dates };
    }, [statRange, categories, habits, logs]);

    // --- NAVIGATION DATES ---
    const changeDate = (days) => {
        const newDate = new Date(selectedDate);
        newDate.setDate(newDate.getDate() + days);
        setSelectedDate(newDate);
    };

    const isToday = selectedDate.toDateString() === new Date().toDateString();
    const dateStr = selectedDate.toISOString().split('T')[0];

    return (
        <div className="flex flex-col h-full bg-gray-50 dark:bg-slate-900 transition-colors">
            {/* HEADER */}
            <div className="bg-white dark:bg-slate-800 border-b border-gray-200 dark:border-slate-700 px-6 py-4 flex flex-col md:flex-row justify-between items-center gap-4 shrink-0">
                <div>
                    <h2 className="text-2xl font-bold text-gray-800 dark:text-white flex items-center gap-2">
                        <Activity className="text-blue-500" /> Suivi Habitudes
                    </h2>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Construisez votre discipline jour après jour</p>
                </div>
                
                <div className="flex bg-gray-100 dark:bg-slate-700 p-1 rounded-xl">
                    <button 
                        onClick={() => setActiveTab('daily')} 
                        className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${activeTab === 'daily' ? 'bg-white dark:bg-slate-600 text-blue-600 dark:text-white shadow-sm' : 'text-gray-500 dark:text-gray-400 hover:text-gray-700'}`}
                    >
                        Quotidien
                    </button>
                    <button 
                        onClick={() => setActiveTab('stats')} 
                        className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${activeTab === 'stats' ? 'bg-white dark:bg-slate-600 text-blue-600 dark:text-white shadow-sm' : 'text-gray-500 dark:text-gray-400 hover:text-gray-700'}`}
                    >
                        Analyse
                    </button>
                    <button 
                        onClick={() => setActiveTab('settings')} 
                        className={`px-3 py-2 rounded-lg text-sm font-bold transition-all ${activeTab === 'settings' ? 'bg-white dark:bg-slate-600 text-blue-600 dark:text-white shadow-sm' : 'text-gray-500 dark:text-gray-400 hover:text-gray-700'}`}
                    >
                        <Settings size={18}/>
                    </button>
                </div>
            </div>

            {/* CONTENU */}
            <div className="flex-1 overflow-y-auto p-4 md:p-6 custom-scrollbar">
                
                {/* VUE QUOTIDIENNE */}
                {activeTab === 'daily' && (
                    <div className="max-w-3xl mx-auto space-y-6">
                        {/* SELECTEUR DATE */}
                        <div className="flex items-center justify-between bg-white dark:bg-slate-800 p-4 rounded-2xl shadow-sm border border-gray-200 dark:border-slate-700">
                            <button onClick={() => changeDate(-1)} className="p-2 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-full"><ChevronLeft/></button>
                            <div className="text-center">
                                <h3 className="font-bold text-lg capitalize text-gray-800 dark:text-white">
                                    {selectedDate.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })}
                                </h3>
                                {isToday && <span className="text-xs font-bold text-blue-500 uppercase tracking-wide">Aujourd'hui</span>}
                            </div>
                            <button onClick={() => changeDate(1)} className={`p-2 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-full ${isToday ? 'opacity-50 cursor-not-allowed' : ''}`} disabled={isToday}><ChevronRight/></button>
                        </div>

                        {/* LISTE PAR CATEGORIE */}
                        {categories.length === 0 ? (
                            <div className="text-center py-10 text-gray-400">
                                <p>Aucune catégorie définie.</p>
                                <button onClick={() => setActiveTab('settings')} className="mt-2 text-blue-500 font-bold hover:underline">Créer ma première catégorie</button>
                            </div>
                        ) : (
                            categories.map(cat => {
                                const catHabits = habits.filter(h => h.category_id === cat.id);
                                if (catHabits.length === 0) return null;

                                return (
                                    <div key={cat.id} className="bg-white dark:bg-slate-800 rounded-3xl shadow-sm border border-gray-200 dark:border-slate-700 overflow-hidden">
                                        <div className={`h-2 w-full ${cat.color || 'bg-blue-500'}`}></div>
                                        <div className="p-6">
                                            <h4 className="font-bold text-gray-800 dark:text-white mb-4 flex items-center gap-2">
                                                <span className={`w-3 h-3 rounded-full ${cat.color || 'bg-blue-500'}`}></span>
                                                {cat.name}
                                            </h4>
                                            <div className="space-y-3">
                                                {catHabits.map(h => {
                                                    const isDone = logs.some(l => l.habit_id === h.id && l.date === dateStr);
                                                    return (
                                                        <div 
                                                            key={h.id} 
                                                            onClick={() => toggleHabit(h.id)}
                                                            className={`flex items-center justify-between p-4 rounded-2xl border transition-all cursor-pointer group ${isDone ? 'bg-green-50 dark:bg-green-900/10 border-green-200 dark:border-green-900' : 'bg-gray-50 dark:bg-slate-700/50 border-transparent hover:border-gray-200 dark:hover:border-slate-600'}`}
                                                        >
                                                            <span className={`font-medium ${isDone ? 'text-green-700 dark:text-green-400 line-through decoration-green-500/50' : 'text-gray-700 dark:text-slate-300'}`}>{h.name}</span>
                                                            <div className={`w-8 h-8 rounded-full flex items-center justify-center transition-all ${isDone ? 'bg-green-500 text-white scale-110 shadow-lg shadow-green-500/30' : 'bg-white dark:bg-slate-600 border border-gray-200 dark:border-slate-500 text-transparent group-hover:border-gray-400'}`}>
                                                                <Check size={16} strokeWidth={4} />
                                                            </div>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    </div>
                                );
                            })
                        )}
                    </div>
                )}

                {/* VUE ANALYSE */}
                {activeTab === 'stats' && (
                    <div className="max-w-5xl mx-auto space-y-8">
                        {/* CONTROLES */}
                        <div className="flex justify-center mb-6">
                            <div className="bg-white dark:bg-slate-800 p-1 rounded-xl shadow-sm border border-gray-200 dark:border-slate-700 flex gap-1">
                                {[7, 30, 90].map(d => (
                                    <button 
                                        key={d} 
                                        onClick={() => setStatRange(d)}
                                        className={`px-6 py-2 rounded-lg text-sm font-bold transition-all ${statRange === d ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/30' : 'text-gray-500 hover:bg-gray-100 dark:hover:bg-slate-700'}`}
                                    >
                                        {d} Jours
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* GRAPHIQUE CONSTANCE */}
                        <div className="bg-white dark:bg-slate-800 p-6 rounded-3xl shadow-sm border border-gray-200 dark:border-slate-700">
                            <h3 className="font-bold text-gray-800 dark:text-white mb-6 flex items-center gap-2"><Trophy className="text-yellow-500"/> Constance Globale</h3>
                            <div className="h-40 flex items-end justify-between gap-1">
                                {stats.consistencyData.map((val, i) => (
                                    <div key={i} className="flex-1 flex flex-col justify-end group relative">
                                        <div 
                                            className={`w-full rounded-t-sm transition-all duration-500 ${val >= 80 ? 'bg-green-400' : val >= 50 ? 'bg-blue-400' : 'bg-gray-300 dark:bg-slate-600'}`} 
                                            style={{ height: `${Math.max(val, 5)}%` }}
                                        ></div>
                                        {/* Tooltip */}
                                        <div className="absolute bottom-full mb-2 hidden group-hover:block z-10 bg-slate-800 text-white text-xs px-2 py-1 rounded whitespace-nowrap left-1/2 -translate-x-1/2">
                                            {stats.dates[i].split('-').slice(1).join('/')} : {val}%
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* JAUGES PAR DOMAINE */}
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {stats.domainStats.map(cat => (
                                <div key={cat.id} className="bg-white dark:bg-slate-800 p-6 rounded-3xl shadow-sm border border-gray-200 dark:border-slate-700 flex flex-col items-center">
                                    <h4 className="font-bold text-gray-800 dark:text-white mb-4">{cat.name}</h4>
                                    
                                    <div className="relative w-32 h-32 flex items-center justify-center">
                                        <svg className="w-full h-full -rotate-90" viewBox="0 0 36 36">
                                            <path className="text-gray-100 dark:text-slate-700" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="currentColor" strokeWidth="4" />
                                            <path className={`${cat.percent >= 100 ? 'text-green-500' : cat.color ? cat.color.replace('bg-', 'text-') : 'text-blue-500'} transition-all duration-1000 ease-out`} strokeDasharray={`${cat.percent}, 100`} d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round" />
                                        </svg>
                                        <div className="absolute flex flex-col items-center">
                                            <span className="text-2xl font-bold text-gray-800 dark:text-white">{cat.percent}%</span>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* VUE REGLAGES */}
                {activeTab === 'settings' && (
                    <div className="max-w-2xl mx-auto space-y-8">
                        {/* GESTION CATEGORIES */}
                        <div className="bg-white dark:bg-slate-800 p-6 rounded-3xl shadow-sm border border-gray-200 dark:border-slate-700">
                            <h3 className="font-bold text-lg mb-4 text-gray-800 dark:text-white">Mes Domaines (Catégories)</h3>
                            <div className="space-y-3">
                                {categories.map(c => (
                                    <div key={c.id} className="flex justify-between items-center p-3 bg-gray-50 dark:bg-slate-700/50 rounded-xl">
                                        <div className="flex items-center gap-3">
                                            <div className={`w-4 h-4 rounded-full ${c.color || 'bg-gray-400'}`}></div>
                                            <span className="font-medium text-gray-700 dark:text-slate-200">{c.name}</span>
                                        </div>
                                        <button onClick={() => deleteCategory(c.id)} className="text-red-400 hover:text-red-600"><Trash2 size={16}/></button>
                                    </div>
                                ))}
                                {/* Ajouter Catégorie */}
                                <form 
                                    onSubmit={(e) => {
                                        e.preventDefault();
                                        const name = e.target.catName.value;
                                        const color = e.target.catColor.value;
                                        if(name) { addCategory(name, color); e.target.reset(); }
                                    }}
                                    className="flex gap-2 pt-2"
                                >
                                    <input name="catName" placeholder="Nouveau domaine (ex: Sport)" className="flex-1 p-2 bg-gray-50 dark:bg-slate-700 rounded-lg outline-none border focus:border-blue-500 dark:border-slate-600 dark:text-white" required/>
                                    <select name="catColor" className="p-2 bg-gray-50 dark:bg-slate-700 rounded-lg outline-none border dark:border-slate-600 dark:text-white">
                                        <option value="bg-blue-500">Bleu</option>
                                        <option value="bg-green-500">Vert</option>
                                        <option value="bg-purple-500">Violet</option>
                                        <option value="bg-orange-500">Orange</option>
                                        <option value="bg-red-500">Rouge</option>
                                    </select>
                                    <button type="submit" className="p-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"><Plus/></button>
                                </form>
                            </div>
                        </div>

                        {/* GESTION HABITUDES */}
                        <div className="bg-white dark:bg-slate-800 p-6 rounded-3xl shadow-sm border border-gray-200 dark:border-slate-700">
                            <h3 className="font-bold text-lg mb-4 text-gray-800 dark:text-white">Mes Habitudes</h3>
                            <div className="space-y-3">
                                {habits.map(h => (
                                    <div key={h.id} className="flex justify-between items-center p-3 bg-gray-50 dark:bg-slate-700/50 rounded-xl">
                                        <span className="font-medium text-gray-700 dark:text-slate-200">{h.name}</span>
                                        <div className="flex items-center gap-3">
                                            <Badge text={categories.find(c => c.id === h.category_id)?.name || 'Sans cat.'} />
                                            <button onClick={() => deleteHabit(h.id)} className="text-red-400 hover:text-red-600"><Trash2 size={16}/></button>
                                        </div>
                                    </div>
                                ))}
                                {/* Ajouter Habitude */}
                                <form 
                                    onSubmit={(e) => {
                                        e.preventDefault();
                                        const name = e.target.habName.value;
                                        const catId = e.target.habCat.value;
                                        if(name && catId) { addHabit(name, catId); e.target.reset(); }
                                    }}
                                    className="flex gap-2 pt-2"
                                >
                                    <input name="habName" placeholder="Nouvelle habitude (ex: 50 pompes)" className="flex-1 p-2 bg-gray-50 dark:bg-slate-700 rounded-lg outline-none border focus:border-blue-500 dark:border-slate-600 dark:text-white" required/>
                                    <select name="habCat" className="p-2 bg-gray-50 dark:bg-slate-700 rounded-lg outline-none border dark:border-slate-600 dark:text-white" required>
                                        <option value="">Choisir Domaine...</option>
                                        {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                                    </select>
                                    <button type="submit" className="p-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"><Plus/></button>
                                </form>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}