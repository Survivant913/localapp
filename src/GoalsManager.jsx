import { useState } from 'react';
import { 
  Target, Calendar, CheckSquare, Square, Heart, 
  Trash2, Plus, ChevronDown, Clock, X,
  Briefcase, Activity, Banknote, User, Flame, CheckCircle2,
  GraduationCap, Users, Gamepad2, Plane, Home
} from 'lucide-react';

export default function GoalsManager({ data, updateData }) {
    // --- ÉTATS ---
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

    // --- CONFIGURATION ÉTENDUE (8 CATÉGORIES) ---
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

    // --- HELPERS (SÉCURISÉS) ---
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

    // --- ACTIONS ---
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

    // --- ACTIONS JALONS ---
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

    // --- FILTRAGE & TRI ---
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

    const inputClass = "w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-slate-600 bg-white dark:bg-slate-900 text-gray-900 dark:text-white placeholder-gray-400 outline-none focus:ring-2 focus:ring-blue-500 transition-colors";
    const labelClass = "block text-sm font-bold text-gray-700 dark:text-gray-200 mb-2";

    return (
        <div className="space-y-8 fade-in p-4 pb-24 md:pb-20 max-w-7xl mx-auto">
            
            {/* 1. HEADER STATS ÉTENDU */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                {/* Carte Principale "Total" */}
                <div className="bg-slate-900 text-white p-6 rounded-2xl shadow-lg relative overflow-hidden flex flex-col justify-center min-h-[120px] lg:col-span-2 xl:col-span-1">
                    <div className="relative z-10">
                        <p className="text-xs font-bold opacity-60 uppercase tracking-wider mb-1">Accomplissement Total</p>
                        <div className="flex items-baseline gap-2">
                            <h3 className="text-4xl font-bold">{completedGoals} <span className="text-xl font-normal opacity-50">/ {totalGoals}</span></h3>
                        </div>
                    </div>
                    <Target size={80} className="absolute -right-6 -bottom-6 opacity-10 rotate-12"/>
                </div>
                
                {/* Cartes Catégories (Boucle dynamique sur TOUTES les catégories) */}
                {Object.keys(categories).map(catKey => {
                    const catGoals = goals.filter(g => g.category === catKey);
                    const catProgress = catGoals.length > 0 
                        ? Math.round(catGoals.reduce((acc, g) => acc + calculateProgress(g.id), 0) / catGoals.length) 
                        : 0;
                    const Conf = categories[catKey];
                    const Icon = Conf.icon;
                    
                    return (
                        <div key={catKey} className="bg-white dark:bg-slate-800 p-5 rounded-2xl border border-gray-100 dark:border-slate-700 shadow-sm flex flex-col justify-between min-h-[120px] hover:border-blue-200 dark:hover:border-slate-600 transition-colors">
                            <div className="flex justify-between items-start mb-2">
                                <div className={`p-2 rounded-lg ${Conf.color}`}><Icon size={20}/></div>
                                <span className="text-2xl font-bold text-gray-800 dark:text-white">{catProgress}%</span>
                            </div>
                            <div>
                                <p className="text-sm font-medium text-gray-600 dark:text-gray-300 flex justify-between">
                                    {Conf.label}
                                    <span className="text-xs opacity-50">{catGoals.length} obj.</span>
                                </p>
                                <div className="h-1.5 w-full bg-gray-100 dark:bg-slate-700 rounded-full mt-2 overflow-hidden">
                                    <div className="h-full bg-current opacity-70 transition-all duration-1000" style={{ width: `${catProgress}%`, color: 'inherit' }}></div>
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* 2. BARRE DE FILTRES (Défilable) */}
            <div className="flex flex-col md:flex-row justify-between items-center gap-4">
                <div className="w-full md:w-auto overflow-x-auto pb-2 md:pb-0">
                    <div className="flex gap-2 p-1">
                        <button onClick={() => setActiveFilter('all')} className={`px-4 py-2 rounded-lg text-sm font-bold transition-all whitespace-nowrap ${activeFilter === 'all' ? 'bg-slate-900 text-white shadow-md' : 'bg-white dark:bg-slate-800 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-slate-700'}`}>
                            Tout voir
                        </button>
                        {Object.keys(categories).map(cat => (
                            <button key={cat} onClick={() => setActiveFilter(cat)} className={`px-4 py-2 rounded-lg text-sm font-bold transition-all whitespace-nowrap flex items-center gap-2 ${activeFilter === cat ? 'bg-slate-900 text-white shadow-md' : 'bg-white dark:bg-slate-800 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-slate-700'}`}>
                                {categories[cat].label}
                            </button>
                        ))}
                    </div>
                </div>

                <button 
                    onClick={() => setIsFormOpen(!isFormOpen)}
                    className={`shrink-0 flex items-center gap-2 px-5 py-3 text-white rounded-xl font-bold shadow-lg transition-transform active:scale-95 ${isFormOpen ? 'bg-red-600 hover:bg-red-700' : 'bg-blue-600 hover:bg-blue-700'}`}
                >
                    {isFormOpen ? <><X size={20}/> Fermer</> : <><Plus size={20}/> Nouvel Objectif</>}
                </button>
            </div>

            {/* 3. FORMULAIRE D'AJOUT */}
            {isFormOpen && (
                <div className="bg-white dark:bg-slate-800 p-6 md:p-8 rounded-2xl shadow-xl border border-gray-200 dark:border-slate-700 animate-in slide-in-from-top-4 fade-in duration-300">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="md:col-span-2">
                            <label className={labelClass}>Titre de l'objectif</label>
                            <input type="text" className={inputClass} placeholder="Ex: Devenir bilingue en Anglais" value={newGoalTitle} onChange={e => setNewGoalTitle(e.target.value)} autoFocus />
                        </div>
                        
                        <div className="md:col-span-2">
                            <label className={labelClass}>Catégorie</label>
                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                                {Object.keys(categories).map(cat => {
                                    const Icon = categories[cat].icon;
                                    const isSelected = newGoalCategory === cat;
                                    return (
                                        <button 
                                            key={cat} 
                                            onClick={() => setNewGoalCategory(cat)}
                                            className={`flex flex-col items-center justify-center gap-2 py-3 rounded-xl border transition-all ${isSelected ? 'border-blue-500 bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300 dark:border-blue-500 ring-1 ring-blue-500' : 'border-gray-200 dark:border-slate-600 text-gray-500 dark:text-slate-400 hover:bg-gray-50 dark:hover:bg-slate-700'}`}
                                        >
                                            <Icon size={20}/> <span className="text-xs font-bold">{categories[cat].label}</span>
                                        </button>
                                    );
                                })}
                            </div>
                        </div>

                        <div className="space-y-4">
                            <div>
                                <label className={labelClass}>Date limite (Deadline)</label>
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

                        <div className="md:col-span-2">
                            <label className={labelClass}>Motivation (Le "Pourquoi")</label>
                            <textarea 
                                className={`${inputClass} min-h-[100px]`} 
                                placeholder="Pourquoi est-ce important pour vous ?"
                                value={newGoalMotivation} 
                                onChange={e => setNewGoalMotivation(e.target.value)}
                            />
                        </div>
                    </div>
                    <div className="mt-8 flex justify-end">
                        <button onClick={addGoal} className="px-8 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold shadow-md transition-colors w-full md:w-auto">C'est parti 🚀</button>
                    </div>
                </div>
            )}

            {/* 4. LISTE DES CARTES */}
            <div className="grid grid-cols-1 gap-6">
                {sortedGoals.length === 0 ? (
                    <div className="text-center py-20 opacity-50">
                        <Target size={64} className="mx-auto mb-4 text-gray-300 dark:text-slate-600"/>
                        <p className="text-gray-500 dark:text-slate-400">Aucun objectif trouvé dans cette catégorie.</p>
                    </div>
                ) : (
                    sortedGoals.map(goal => {
                        const progress = calculateProgress(goal.id);
                        const goalMilestones = milestones ? milestones.filter(m => String(m.goal_id) === String(goal.id)) : [];
                        const Conf = categories[goal.category || 'perso'];
                        const daysLeft = getDaysRemaining(goal.deadline);
                        const isExpanded = expandedGoalId === goal.id;

                        return (
                            <div key={goal.id} className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-gray-200 dark:border-slate-700 overflow-hidden group transition-all hover:shadow-md">
                                <div className="p-6 cursor-pointer" onClick={() => setExpandedGoalId(isExpanded ? null : goal.id)}>
                                    <div className="flex justify-between items-start mb-4">
                                        <div className="flex gap-3 flex-wrap">
                                            <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 ${Conf.color}`}>
                                                <Conf.icon size={12}/> {Conf.label}
                                            </span>
                                            {goal.deadline && (
                                                <span className={`px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1.5 ${daysLeft < 0 ? 'bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400' : daysLeft <= 14 ? 'bg-orange-100 text-orange-600 dark:bg-orange-900/30 dark:text-orange-400' : 'bg-gray-100 text-gray-600 dark:bg-slate-700 dark:text-gray-300'}`}>
                                                    <Clock size={12}/> {daysLeft < 0 ? 'En retard' : `J-${daysLeft}`}
                                                </span>
                                            )}
                                            {goal.priority === 'high' && (
                                                <span className="px-2 py-1 rounded-full bg-red-50 dark:bg-red-900/20 text-red-500 text-xs flex items-center"><Flame size={12}/></span>
                                            )}
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <button onClick={(e) => {e.stopPropagation(); toggleFavorite(goal);}} className={`p-2 rounded-full hover:bg-gray-100 dark:hover:bg-slate-700 transition-colors ${goal.is_favorite ? 'text-red-500' : 'text-gray-300'}`}>
                                                <Heart size={20} className={goal.is_favorite ? "fill-current" : ""}/>
                                            </button>
                                            <button onClick={(e) => {e.stopPropagation(); deleteGoal(goal.id);}} className="p-2 rounded-full hover:bg-red-50 dark:hover:bg-red-900/20 text-gray-300 hover:text-red-500 transition-colors">
                                                <Trash2 size={20}/>
                                            </button>
                                        </div>
                                    </div>

                                    <div className="flex flex-col md:flex-row gap-6 items-start md:items-center">
                                        <div className="flex-1">
                                            <h3 className="text-xl font-bold text-gray-800 dark:text-white mb-2">{goal.title}</h3>
                                            {goal.motivation && (
                                                <p className="text-sm text-gray-500 dark:text-slate-400 italic mb-3 border-l-2 border-gray-200 dark:border-slate-600 pl-3">
                                                    "{goal.motivation}"
                                                </p>
                                            )}
                                        </div>
                                        <div className="w-full md:w-48 shrink-0">
                                            <div className="flex justify-between text-xs font-bold text-gray-500 dark:text-gray-400 mb-1">
                                                <span>Progression</span>
                                                <span className={progress === 100 ? 'text-green-600 dark:text-green-400' : 'text-blue-600 dark:text-blue-400'}>{progress}%</span>
                                            </div>
                                            <div className="h-2.5 w-full bg-gray-100 dark:bg-slate-700 rounded-full overflow-hidden">
                                                <div className={`h-full transition-all duration-700 ease-out ${progress === 100 ? 'bg-green-500' : 'bg-gradient-to-r from-blue-500 to-indigo-600'}`} style={{ width: `${progress}%` }}></div>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="mt-4 flex justify-center">
                                        {isExpanded ? <ChevronDown size={20} className="text-gray-300 dark:text-slate-600 rotate-180 transition-transform"/> : <ChevronDown size={20} className="text-gray-300 dark:text-slate-600 transition-transform"/>}
                                    </div>
                                </div>

                                {isExpanded && (
                                    <div className="bg-gray-50 dark:bg-slate-900/50 p-6 border-t border-gray-100 dark:border-slate-700 animate-in slide-in-from-top-2">
                                        <h4 className="text-sm font-bold text-gray-700 dark:text-gray-300 mb-4 flex items-center gap-2">
                                            <CheckSquare size={16} className="text-blue-500"/> Étapes Clés (Jalons)
                                        </h4>
                                        <div className="space-y-2 mb-4">
                                            {goalMilestones.length === 0 && <p className="text-sm text-gray-400 dark:text-slate-500 italic pl-6">Aucune étape définie.</p>}
                                            {goalMilestones.map(m => (
                                                <div key={m.id} className="flex items-center gap-3 group/item bg-white dark:bg-slate-800 p-3 rounded-xl border border-gray-100 dark:border-slate-600 shadow-sm cursor-pointer hover:border-blue-300 dark:hover:border-blue-500 transition-colors" onClick={(e) => toggleMilestone(e, m.id)}>
                                                    <div className={`transition-all active:scale-90 ${m.is_completed ? 'text-green-500' : 'text-gray-300 hover:text-blue-500'}`}>
                                                        {m.is_completed ? <CheckCircle2 size={22} className="fill-green-100 dark:fill-green-900"/> : <Square size={22}/>}
                                                    </div>
                                                    <span className={`text-sm flex-1 font-medium ${m.is_completed ? 'text-gray-400 dark:text-slate-500 line-through' : 'text-gray-700 dark:text-gray-200'}`}>
                                                        {m.title}
                                                    </span>
                                                    <button onClick={(e) => deleteMilestone(e, m.id)} className="opacity-0 group-hover/item:opacity-100 text-gray-300 hover:text-red-500 transition-opacity p-1">
                                                        <Trash2 size={16}/>
                                                    </button>
                                                </div>
                                            ))}
                                        </div>
                                        <div className="flex gap-2">
                                            <input 
                                                type="text" 
                                                className={inputClass}
                                                placeholder="Ajouter une nouvelle étape..."
                                                value={newMilestoneText[goal.id] || ''}
                                                onChange={(e) => setNewMilestoneText({...newMilestoneText, [goal.id]: e.target.value})}
                                                onKeyDown={(e) => e.key === 'Enter' && addMilestone(goal.id)}
                                                onClick={(e) => e.stopPropagation()} 
                                            />
                                            <button onClick={(e) => { e.stopPropagation(); addMilestone(goal.id); }} className="px-4 py-2 bg-slate-900 dark:bg-blue-600 text-white rounded-xl hover:opacity-90 transition-colors shadow-sm">
                                                <Plus size={20}/>
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