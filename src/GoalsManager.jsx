import { useState } from 'react';
import { 
  Target, Calendar, CheckSquare, Square, Heart, 
  Trash2, Plus, ChevronDown, Clock, X,
  Briefcase, Activity, Banknote, User, Flame, CheckCircle2,
  GraduationCap, Users, Gamepad2, Plane, Home
} from 'lucide-react';

export default function GoalsManager({ data, updateData }) {
    // --- ÉTATS (INTACTS) ---
    const [isFormOpen, setIsFormOpen] = useState(false);
    const [activeFilter, setActiveFilter] = useState('all'); 
    
    // Formulaire
    const [newGoalTitle, setNewGoalTitle] = useState('');
    const [newGoalDeadline, setNewGoalDeadline] = useState('');
    const [newGoalCategory, setNewGoalCategory] = useState('perso');
    const [newGoalPriority, setNewGoalPriority] = useState('medium');
    const [newGoalMotivation, setNewGoalMotivation] = useState('');
    
    // États pour l'ajout de jalons rapides et l'accordéon
    const [newMilestoneText, setNewMilestoneText] = useState({});
    const [expandedGoalId, setExpandedGoalId] = useState(null);

    // --- CONFIGURATION (INTACTE) ---
    const categories = {
        business: { label: 'Business', color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-200', icon: Briefcase },
        finance: { label: 'Finance', color: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-200', icon: Banknote },
        health: { label: 'Santé', color: 'bg-red-100 text-red-700 dark:bg-red-900/50 dark:text-red-200', icon: Activity },
        education: { label: 'Formation', color: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/50 dark:text-yellow-200', icon: GraduationCap },
        social: { label: 'Social', color: 'bg-pink-100 text-pink-700 dark:bg-pink-900/50 dark:text-pink-200', icon: Users },
        hobby: { label: 'Loisirs', color: 'bg-purple-100 text-purple-700 dark:bg-purple-900/50 dark:text-purple-200', icon: Gamepad2 },
        travel: { label: 'Voyage', color: 'bg-sky-100 text-sky-700 dark:bg-sky-900/50 dark:text-sky-200', icon: Plane },
        perso: { label: 'Perso', color: 'bg-gray-100 text-gray-700 dark:bg-slate-700 dark:text-slate-200', icon: User },
    };

    // --- DONNÉES SÉCURISÉES ---
    const goals = Array.isArray(data.goals) ? data.goals : [];
    const milestones = Array.isArray(data.goal_milestones) ? data.goal_milestones : [];

    // --- HELPERS (INTACTS) ---
    const calculateProgress = (goalId) => {
        if (!milestones || milestones.length === 0) return 0;
        const goalMilestones = milestones.filter(m => String(m.goal_id) === String(goalId));
        if (goalMilestones.length === 0) return 0;
        const completed = goalMilestones.filter(m => m.is_completed).length;
        return Math.round((completed / goalMilestones.length) * 100);
    };

    const getDaysRemaining = (dateStr) => {
        if (!dateStr) return null;
        const d = new Date(dateStr);
        const today = new Date();
        d.setHours(23,59,59);
        const diffTime = d - today;
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        return diffDays;
    };

    // --- ACTIONS (INTACTES) ---
    const addGoal = () => {
        if (!newGoalTitle.trim()) return;
        const newId = Date.now();
        const newGoal = {
            id: newId,
            title: newGoalTitle,
            deadline: newGoalDeadline || null,
            status: 'in_progress',
            category: newGoalCategory,
            priority: newGoalPriority,
            motivation: newGoalMotivation,
            is_favorite: false,
            created_at: new Date().toISOString()
        };
        updateData({ ...data, goals: [newGoal, ...goals] });
        setNewGoalTitle(''); setNewGoalDeadline(''); setNewGoalMotivation('');
        setIsFormOpen(false);
    };

    const deleteGoal = (id) => {
        if (!window.confirm("Supprimer cet objectif et ses jalons ?")) return;
        const updatedGoals = goals.filter(g => g.id !== id);
        const updatedMilestones = milestones.filter(m => String(m.goal_id) !== String(id));
        updateData({ ...data, goals: updatedGoals, goal_milestones: updatedMilestones }, { table: 'goals', id: id });
    };

    const toggleFavorite = (goal) => {
        const updated = goals.map(g => g.id === goal.id ? { ...g, is_favorite: !g.is_favorite } : g);
        updateData({ ...data, goals: updated });
    };

    // --- ACTIONS JALONS (INTACTES) ---
    const addMilestone = (goalId) => {
        const text = newMilestoneText[goalId];
        if (!text || !text.trim()) return;
        const newM = { id: Date.now(), goal_id: goalId, title: text, is_completed: false };
        updateData({ ...data, goal_milestones: [...milestones, newM] });
        setNewMilestoneText({ ...newMilestoneText, [goalId]: '' });
    };

    const toggleMilestone = (e, mId) => {
        e.stopPropagation(); 
        const updated = milestones.map(m => m.id === mId ? { ...m, is_completed: !m.is_completed } : m);
        updateData({ ...data, goal_milestones: updated });
    };

    const deleteMilestone = (e, mId) => {
        e.stopPropagation();
        const updated = milestones.filter(m => m.id !== mId);
        updateData({ ...data, goal_milestones: updated }, { table: 'goal_milestones', id: mId });
    };

    // --- FILTRAGE & TRI (INTACTS) ---
    const filteredGoals = goals.filter(g => activeFilter === 'all' || g.category === activeFilter);
    const sortedGoals = [...filteredGoals].sort((a, b) => {
        if (a.is_favorite !== b.is_favorite) return a.is_favorite ? -1 : 1;
        const pMap = { high: 3, medium: 2, low: 1 };
        const pA = pMap[a.priority] || 2;
        const pB = pMap[b.priority] || 2;
        if (pA !== pB) return pB - pA;
        return 0; 
    });

    const totalGoals = goals.length;
    const completedGoals = goals.filter(g => calculateProgress(g.id) === 100).length;

    const inputClass = "w-full px-4 py-4 rounded-xl border border-gray-200 dark:border-slate-600 bg-white dark:bg-slate-900 text-gray-900 dark:text-white placeholder-gray-400 outline-none focus:ring-2 focus:ring-blue-500 transition-colors shadow-sm";
    const labelClass = "block text-sm font-bold text-gray-700 dark:text-gray-200 mb-2 uppercase tracking-wide opacity-80";

    return (
        // MODIF : max-w-full pour prendre toute la place et padding ajusté
        <div className="space-y-10 fade-in p-6 pb-24 md:pb-20 w-full max-w-[1600px] mx-auto">
            
            {/* 1. HEADER STATS ÉTENDU */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5 gap-6">
                {/* Carte Principale "Total" */}
                <div className="bg-slate-900 text-white p-8 rounded-[2rem] shadow-2xl relative overflow-hidden flex flex-col justify-center min-h-[160px] lg:col-span-2 xl:col-span-1 border border-slate-700">
                    <div className="relative z-10">
                        <p className="text-xs font-bold opacity-60 uppercase tracking-[0.2em] mb-2">Accomplissement</p>
                        <div className="flex items-baseline gap-3">
                            <h3 className="text-5xl font-black">{completedGoals} <span className="text-2xl font-medium opacity-40">/ {totalGoals}</span></h3>
                        </div>
                    </div>
                    <Target size={120} className="absolute -right-8 -bottom-8 opacity-[0.08] rotate-12 text-white"/>
                </div>
                
                {/* Cartes Catégories */}
                {Object.keys(categories).map(catKey => {
                    const catGoals = goals.filter(g => g.category === catKey);
                    const catProgress = catGoals.length > 0 
                        ? Math.round(catGoals.reduce((acc, g) => acc + calculateProgress(g.id), 0) / catGoals.length) 
                        : 0;
                    const Conf = categories[catKey];
                    const Icon = Conf.icon;
                    
                    return (
                        <div key={catKey} className="bg-white dark:bg-slate-900 p-6 rounded-[2rem] border border-gray-100 dark:border-slate-800 shadow-sm flex flex-col justify-between min-h-[160px] hover:shadow-xl transition-all duration-300 group">
                            <div className="flex justify-between items-start mb-4">
                                <div className={`p-3 rounded-2xl ${Conf.color} transition-transform group-hover:scale-110`}><Icon size={24}/></div>
                                <span className="text-3xl font-black text-gray-800 dark:text-white">{catProgress}%</span>
                            </div>
                            <div>
                                <p className="text-sm font-bold text-gray-600 dark:text-gray-300 flex justify-between uppercase tracking-wide">
                                    {Conf.label}
                                    <span className="text-xs opacity-50 lowercase font-medium">{catGoals.length} obj.</span>
                                </p>
                                <div className="h-2 w-full bg-gray-100 dark:bg-slate-800 rounded-full mt-3 overflow-hidden">
                                    <div className="h-full bg-current opacity-80 transition-all duration-1000 rounded-full" style={{ width: `${catProgress}%`, color: 'inherit' }}></div>
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* 2. BARRE DE FILTRES & BOUTON */}
            <div className="flex flex-col md:flex-row justify-between items-center gap-6">
                <div className="w-full md:w-auto overflow-x-auto pb-2 md:pb-0 custom-scrollbar">
                    <div className="flex gap-2 p-1">
                        <button onClick={() => setActiveFilter('all')} className={`px-6 py-3 rounded-2xl text-sm font-bold transition-all whitespace-nowrap shadow-sm ${activeFilter === 'all' ? 'bg-slate-900 text-white shadow-lg scale-105' : 'bg-white dark:bg-slate-900 text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-slate-800'}`}>
                            Tout voir
                        </button>
                        {Object.keys(categories).map(cat => (
                            <button key={cat} onClick={() => setActiveFilter(cat)} className={`px-6 py-3 rounded-2xl text-sm font-bold transition-all whitespace-nowrap flex items-center gap-2 shadow-sm ${activeFilter === cat ? 'bg-slate-900 text-white shadow-lg scale-105' : 'bg-white dark:bg-slate-900 text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-slate-800'}`}>
                                {categories[cat].label}
                            </button>
                        ))}
                    </div>
                </div>

                <button 
                    onClick={() => setIsFormOpen(!isFormOpen)}
                    className={`shrink-0 flex items-center gap-3 px-8 py-4 text-white rounded-2xl font-bold shadow-xl transition-transform active:scale-95 ${isFormOpen ? 'bg-red-500 hover:bg-red-600' : 'bg-blue-600 hover:bg-blue-700'}`}
                >
                    {isFormOpen ? <><X size={20}/> Fermer</> : <><Plus size={22}/> Nouvel Objectif</>}
                </button>
            </div>

            {/* 3. FORMULAIRE D'AJOUT */}
            {isFormOpen && (
                <div className="bg-white dark:bg-slate-900 p-8 md:p-12 rounded-[2.5rem] shadow-2xl border border-gray-100 dark:border-slate-800 animate-in slide-in-from-top-6 fade-in duration-500">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        <div className="md:col-span-2">
                            <label className={labelClass}>Titre de l'objectif</label>
                            <input type="text" className={`${inputClass} text-xl font-bold`} placeholder="Ex: Devenir bilingue en Anglais" value={newGoalTitle} onChange={e => setNewGoalTitle(e.target.value)} autoFocus />
                        </div>
                        
                        <div className="md:col-span-2">
                            <label className={labelClass}>Catégorie</label>
                            <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-4">
                                {Object.keys(categories).map(cat => {
                                    const Icon = categories[cat].icon;
                                    const isSelected = newGoalCategory === cat;
                                    return (
                                        <button 
                                            key={cat} 
                                            onClick={() => setNewGoalCategory(cat)}
                                            className={`flex flex-col items-center justify-center gap-3 py-4 rounded-2xl border transition-all ${isSelected ? 'border-blue-500 bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300 dark:border-blue-500 ring-2 ring-blue-500 shadow-md' : 'border-gray-200 dark:border-slate-700 text-gray-400 dark:text-slate-500 hover:bg-gray-50 dark:hover:bg-slate-800'}`}
                                        >
                                            <Icon size={24}/> <span className="text-[10px] font-black uppercase tracking-wider">{categories[cat].label}</span>
                                        </button>
                                    );
                                })}
                            </div>
                        </div>

                        <div className="space-y-6">
                            <div>
                                <label className={labelClass}>Date limite</label>
                                <input type="date" className={inputClass} value={newGoalDeadline} onChange={e => setNewGoalDeadline(e.target.value)} />
                            </div>
                            <div>
                                <label className={labelClass}>Priorité</label>
                                <select className={inputClass} value={newGoalPriority} onChange={e => setNewGoalPriority(e.target.value)}>
                                    <option value="high">🔥 Haute Priorité</option>
                                    <option value="medium">🎯 Moyenne</option>
                                    <option value="low">📅 Basse</option>
                                </select>
                            </div>
                        </div>

                        <div className="md:col-span-1">
                            <label className={labelClass}>Motivation (Le "Pourquoi")</label>
                            <textarea 
                                className={`${inputClass} h-full min-h-[140px] resize-none`} 
                                placeholder="Pourquoi est-ce important pour vous ?"
                                value={newGoalMotivation} 
                                onChange={e => setNewGoalMotivation(e.target.value)}
                            />
                        </div>
                    </div>
                    <div className="mt-10 flex justify-end">
                        <button onClick={addGoal} className="px-10 py-4 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl font-bold shadow-lg shadow-blue-500/30 transition-all transform hover:scale-105 active:scale-95">Lancer l'objectif 🚀</button>
                    </div>
                </div>
            )}

            {/* 4. LISTE DES CARTES */}
            <div className="grid grid-cols-1 gap-8">
                {sortedGoals.length === 0 ? (
                    <div className="text-center py-32 opacity-40 bg-white dark:bg-slate-900/50 rounded-[3rem] border-2 border-dashed border-slate-200 dark:border-slate-800">
                        <Target size={80} className="mx-auto mb-6 text-slate-300 dark:text-slate-600"/>
                        <p className="text-xl font-bold text-slate-400 dark:text-slate-500">Aucun objectif trouvé.</p>
                    </div>
                ) : (
                    sortedGoals.map(goal => {
                        const progress = calculateProgress(goal.id);
                        const goalMilestones = milestones ? milestones.filter(m => String(m.goal_id) === String(goal.id)) : [];
                        const Conf = categories[goal.category || 'perso'];
                        const daysLeft = getDaysRemaining(goal.deadline);
                        const isExpanded = expandedGoalId === goal.id;

                        return (
                            <div key={goal.id} className="bg-white dark:bg-slate-900 rounded-[2.5rem] shadow-sm border border-gray-100 dark:border-slate-800 overflow-hidden group transition-all hover:shadow-2xl hover:border-blue-100 dark:hover:border-slate-700/80">
                                <div className="p-8 md:p-10 cursor-pointer" onClick={() => setExpandedGoalId(isExpanded ? null : goal.id)}>
                                    <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-8">
                                        <div className="flex gap-3 flex-wrap items-center">
                                            <span className={`px-4 py-1.5 rounded-full text-xs font-black uppercase tracking-widest flex items-center gap-2 ${Conf.color}`}>
                                                <Conf.icon size={14}/> {Conf.label}
                                            </span>
                                            {goal.deadline && (
                                                <span className={`px-4 py-1.5 rounded-full text-xs font-black uppercase tracking-widest flex items-center gap-2 ${daysLeft < 0 ? 'bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400' : daysLeft <= 14 ? 'bg-orange-100 text-orange-600 dark:bg-orange-900/30 dark:text-orange-400' : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300'}`}>
                                                    <Clock size={14}/> {daysLeft < 0 ? 'En retard' : `J-${daysLeft}`}
                                                </span>
                                            )}
                                            {goal.priority === 'high' && (
                                                <span className="w-8 h-8 rounded-full bg-red-100 dark:bg-red-900/30 text-red-500 flex items-center justify-center animate-pulse"><Flame size={16}/></span>
                                            )}
                                        </div>
                                        <div className="flex items-center gap-3">
                                            <button onClick={(e) => {e.stopPropagation(); toggleFavorite(goal);}} className={`p-3 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors ${goal.is_favorite ? 'text-red-500 bg-red-50 dark:bg-red-900/10' : 'text-slate-300'}`}>
                                                <Heart size={22} className={goal.is_favorite ? "fill-current" : ""}/>
                                            </button>
                                            <button onClick={(e) => {e.stopPropagation(); deleteGoal(goal.id);}} className="p-3 rounded-xl hover:bg-red-50 dark:hover:bg-red-900/20 text-slate-300 hover:text-red-500 transition-colors">
                                                <Trash2 size={22}/>
                                            </button>
                                        </div>
                                    </div>

                                    <div className="flex flex-col xl:flex-row gap-10 items-start xl:items-center">
                                        <div className="flex-1 space-y-4">
                                            <h3 className="text-3xl font-black text-slate-800 dark:text-white leading-tight">{goal.title}</h3>
                                            {goal.motivation && (
                                                <p className="text-base text-slate-500 dark:text-slate-400 italic pl-4 border-l-4 border-slate-200 dark:border-slate-700">
                                                    "{goal.motivation}"
                                                </p>
                                            )}
                                        </div>
                                        <div className="w-full xl:w-80 shrink-0 bg-slate-50 dark:bg-slate-800/50 p-6 rounded-3xl border border-slate-100 dark:border-slate-700/50">
                                            <div className="flex justify-between text-sm font-bold text-slate-500 dark:text-slate-400 mb-3 uppercase tracking-wider">
                                                <span>Progression</span>
                                                <span className={progress === 100 ? 'text-emerald-500' : 'text-blue-500'}>{progress}%</span>
                                            </div>
                                            <div className="h-3 w-full bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                                                <div className={`h-full transition-all duration-1000 ease-out rounded-full ${progress === 100 ? 'bg-emerald-500' : 'bg-gradient-to-r from-blue-500 to-indigo-600'}`} style={{ width: `${progress}%` }}></div>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="mt-8 flex justify-center">
                                        <div className={`p-2 rounded-full transition-colors ${isExpanded ? 'bg-slate-100 dark:bg-slate-800 text-slate-600' : 'text-slate-300'}`}>
                                            {isExpanded ? <ChevronDown size={24} className="rotate-180 transition-transform"/> : <ChevronDown size={24} className="transition-transform"/>}
                                        </div>
                                    </div>
                                </div>

                                {isExpanded && (
                                    <div className="bg-slate-50/80 dark:bg-slate-900/50 p-8 md:p-10 border-t border-slate-100 dark:border-slate-800 animate-in slide-in-from-top-4">
                                        <h4 className="text-xs font-black text-slate-400 uppercase tracking-[0.2em] mb-6 flex items-center gap-3">
                                            <CheckSquare size={18} className="text-blue-500"/> Étapes Clés (Milestones)
                                        </h4>
                                        <div className="space-y-3 mb-8">
                                            {goalMilestones.length === 0 && <p className="text-slate-400 italic pl-4">Aucune étape pour le moment. Ajoutez-en une !</p>}
                                            {goalMilestones.map(m => (
                                                <div key={m.id} className="flex items-center gap-4 group/item bg-white dark:bg-slate-800 p-4 rounded-2xl border border-slate-100 dark:border-slate-700/50 shadow-sm cursor-pointer hover:border-blue-400 dark:hover:border-blue-500/50 transition-all" onClick={(e) => toggleMilestone(e, m.id)}>
                                                    <div className={`transition-all duration-300 ${m.is_completed ? 'text-emerald-500 scale-110' : 'text-slate-300 group-hover/item:text-blue-400'}`}>
                                                        {m.is_completed ? <CheckCircle2 size={26} className="fill-emerald-100 dark:fill-emerald-900/30"/> : <Square size={26}/>}
                                                    </div>
                                                    <span className={`text-base flex-1 font-medium ${m.is_completed ? 'text-slate-400 line-through decoration-slate-300' : 'text-slate-700 dark:text-slate-200'}`}>
                                                        {m.title}
                                                    </span>
                                                    <button onClick={(e) => deleteMilestone(e, m.id)} className="opacity-0 group-hover/item:opacity-100 text-slate-300 hover:text-red-500 transition-all p-2 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg">
                                                        <Trash2 size={20}/>
                                                    </button>
                                                </div>
                                            ))}
                                        </div>
                                        <div className="flex gap-3">
                                            <input 
                                                type="text" 
                                                className="flex-1 px-6 py-4 rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 outline-none focus:ring-2 focus:ring-blue-500 shadow-sm"
                                                placeholder="Ajouter une nouvelle étape..."
                                                value={newMilestoneText[goal.id] || ''}
                                                onChange={(e) => setNewMilestoneText({...newMilestoneText, [goal.id]: e.target.value})}
                                                onKeyDown={(e) => e.key === 'Enter' && addMilestone(goal.id)}
                                                onClick={(e) => e.stopPropagation()} 
                                            />
                                            <button onClick={(e) => { e.stopPropagation(); addMilestone(goal.id); }} className="px-6 py-4 bg-slate-900 dark:bg-blue-600 text-white rounded-2xl hover:opacity-90 transition-transform active:scale-95 shadow-lg">
                                                <Plus size={24}/>
                                            </button>
                                        </div>
                                    </div>
                                )}
                            </div>
                        );
                    })
                )}
            </div>
        </div>
    );
}