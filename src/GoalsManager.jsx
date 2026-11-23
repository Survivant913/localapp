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
        <div className="space-y-8 fade-in p-6 pb-24 md:pb-20 w-full max-w-[1600px] mx-auto">
            
            {/* 1. HEADER STATS ÉTENDU */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                {/* Carte Principale "Total" */}
                <div className="bg-zinc-900 dark:bg-[#111113] text-white p-6 rounded-2xl relative overflow-hidden flex flex-col justify-center min-h-[140px] lg:col-span-2 xl:col-span-1 border border-zinc-800">
                    <div className="relative z-10">
                        <p className="text-[10px] font-mono text-zinc-400 uppercase tracking-[0.2em] mb-2">Accomplissement</p>
                        <div className="flex items-baseline gap-2">
                            <h3 className="text-4xl font-mono font-bold">{completedGoals} <span className="text-xl font-medium text-zinc-500">/ {totalGoals}</span></h3>
                        </div>
                    </div>
                    <Target size={96} className="absolute -right-6 -bottom-6 opacity-[0.05] rotate-12 text-white"/>
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
                        <div key={catKey} className="bg-white dark:bg-[#111113] p-5 rounded-2xl border border-zinc-200 dark:border-zinc-800 flex flex-col justify-between min-h-[140px] hover:border-zinc-400 dark:hover:border-zinc-700 transition-all duration-200 group">
                            <div className="flex justify-between items-start mb-3">
                                <div className="p-2.5 rounded-xl bg-zinc-100 dark:bg-[#09090b] border border-zinc-200 dark:border-zinc-800 text-zinc-900 dark:text-white"><Icon size={18}/></div>
                                <span className="text-2xl font-mono font-bold text-zinc-900 dark:text-white">{catProgress}%</span>
                            </div>
                            <div>
                                <p className="text-xs font-bold text-zinc-700 dark:text-zinc-300 flex justify-between uppercase tracking-wide">
                                    {Conf.label}
                                    <span className="text-[11px] font-mono text-zinc-500 lowercase font-normal">{catGoals.length} obj.</span>
                                </p>
                                <div className="h-1.5 w-full bg-zinc-200 dark:bg-zinc-800 rounded-full mt-2.5 overflow-hidden">
                                    <div className="h-full bg-zinc-900 dark:bg-white transition-all duration-1000 rounded-full" style={{ width: `${catProgress}%` }}></div>
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* 2. BARRE DE FILTRES & BOUTON */}
            <div className="flex flex-col md:flex-row justify-between items-center gap-4">
                <div className="w-full md:w-auto overflow-x-auto pb-2 md:pb-0 custom-scrollbar">
                    <div className="flex gap-2 p-1">
                        <button onClick={() => setActiveFilter('all')} className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all whitespace-nowrap border ${activeFilter === 'all' ? 'bg-zinc-900 dark:bg-white text-white dark:text-[#09090b] border-zinc-900 dark:border-white' : 'bg-white dark:bg-[#111113] border-zinc-200 dark:border-zinc-800 text-zinc-500 hover:text-zinc-900 dark:hover:text-white'}`}>
                            Tout voir
                        </button>
                        {Object.keys(categories).map(cat => (
                            <button key={cat} onClick={() => setActiveFilter(cat)} className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all whitespace-nowrap flex items-center gap-2 border ${activeFilter === cat ? 'bg-zinc-900 dark:bg-white text-white dark:text-[#09090b] border-zinc-900 dark:border-white' : 'bg-white dark:bg-[#111113] border-zinc-200 dark:border-zinc-800 text-zinc-500 hover:text-zinc-900 dark:hover:text-white'}`}>
                                {categories[cat].label}
                            </button>
                        ))}
                    </div>
                </div>

                <button 
                    onClick={() => setIsFormOpen(!isFormOpen)}
                    className={`shrink-0 flex items-center gap-2 px-5 py-2.5 rounded-xl font-semibold text-sm transition-all active:scale-95 ${isFormOpen ? 'bg-red-500/10 text-red-500 border border-red-500/20' : 'bg-zinc-900 dark:bg-white text-white dark:text-[#09090b] hover:opacity-90'}`}
                >
                    {isFormOpen ? <><X size={18}/> Fermer</> : <><Plus size={18}/> Nouvel Objectif</>}
                </button>
            </div>

            {/* 3. FORMULAIRE D'AJOUT */}
            {isFormOpen && (
                <div className="bg-white dark:bg-[#111113] p-6 md:p-8 rounded-2xl border border-zinc-200 dark:border-zinc-800 animate-in slide-in-from-top-4 fade-in duration-300">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="md:col-span-2">
                            <label className={labelClass}>Titre de l'objectif</label>
                            <input type="text" className={`${inputClass} text-lg font-bold`} placeholder="Ex: Devenir bilingue en Anglais" value={newGoalTitle} onChange={e => setNewGoalTitle(e.target.value)} autoFocus />
                        </div>
                        
                        <div className="md:col-span-2">
                            <label className={labelClass}>Catégorie</label>
                            <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3">
                                {Object.keys(categories).map(cat => {
                                    const Icon = categories[cat].icon;
                                    const isSelected = newGoalCategory === cat;
                                    return (
                                        <button 
                                            key={cat} 
                                            onClick={() => setNewGoalCategory(cat)}
                                            className={`flex flex-col items-center justify-center gap-2 py-3 rounded-xl border transition-all ${isSelected ? 'border-zinc-900 dark:border-white bg-zinc-900 dark:bg-white text-white dark:text-[#09090b]' : 'border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-[#09090b] text-zinc-500 hover:text-zinc-900 dark:hover:text-white'}`}
                                        >
                                            <Icon size={20}/> <span className="text-[10px] font-mono font-bold uppercase tracking-wider">{categories[cat].label}</span>
                                        </button>
                                    );
                                })}
                            </div>
                        </div>

                        <div className="space-y-5">
                            <div>
                                <label className={labelClass}>Date limite</label>
                                <input type="date" className={inputClass} value={newGoalDeadline} onChange={e => setNewGoalDeadline(e.target.value)} />
                            </div>
                            <div>
                                <label className={labelClass}>Priorité</label>
                                <select className={inputClass} value={newGoalPriority} onChange={e => setNewGoalPriority(e.target.value)}>
                                    <option value="high">Haute Priorité</option>
                                    <option value="medium">Moyenne</option>
                                    <option value="low">Basse</option>
                                </select>
                            </div>
                        </div>

                        <div className="md:col-span-1">
                            <label className={labelClass}>Motivation (Le "Pourquoi")</label>
                            <textarea 
                                className={`${inputClass} h-full min-h-[130px] resize-none`} 
                                placeholder="Pourquoi est-ce important pour vous ?"
                                value={newGoalMotivation} 
                                onChange={e => setNewGoalMotivation(e.target.value)}
                            />
                        </div>
                    </div>
                    <div className="mt-8 flex justify-end">
                        <button onClick={addGoal} className="px-8 py-3 bg-zinc-900 dark:bg-white text-white dark:text-[#09090b] rounded-xl font-bold text-sm hover:opacity-90 active:scale-95 transition-all">Lancer l'objectif</button>
                    </div>
                </div>
            )}

            {/* 4. LISTE DES CARTES */}
            <div className="grid grid-cols-1 gap-6">
                {sortedGoals.length === 0 ? (
                    <div className="text-center py-24 opacity-40 bg-white dark:bg-[#111113] rounded-2xl border border-dashed border-zinc-300 dark:border-zinc-800">
                        <Target size={56} className="mx-auto mb-4 text-zinc-400"/>
                        <p className="text-lg font-bold text-zinc-500">Aucun objectif trouvé.</p>
                    </div>
                ) : (
                    sortedGoals.map(goal => {
                        const progress = calculateProgress(goal.id);
                        const goalMilestones = milestones ? milestones.filter(m => String(m.goal_id) === String(goal.id)) : [];
                        const Conf = categories[goal.category || 'perso'];
                        const daysLeft = getDaysRemaining(goal.deadline);
                        const isExpanded = expandedGoalId === goal.id;

                        return (
                            <div key={goal.id} className="bg-white dark:bg-[#111113] rounded-2xl border border-zinc-200 dark:border-zinc-800 overflow-hidden group transition-all hover:border-zinc-400 dark:hover:border-zinc-700">
                                <div className="p-6 md:p-7 cursor-pointer" onClick={() => setExpandedGoalId(isExpanded ? null : goal.id)}>
                                    <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
                                        <div className="flex gap-2.5 flex-wrap items-center">
                                            <span className="px-3 py-1 rounded-md text-[11px] font-mono font-bold uppercase tracking-wider flex items-center gap-1.5 bg-zinc-100 dark:bg-[#09090b] border border-zinc-200 dark:border-zinc-800 text-zinc-800 dark:text-zinc-200">
                                                <Conf.icon size={13}/> {Conf.label}
                                            </span>
                                            {goal.deadline && (
                                                <span className={`px-3 py-1 rounded-md text-[11px] font-mono font-bold uppercase tracking-wider flex items-center gap-1.5 border ${daysLeft < 0 ? 'bg-red-500/10 text-red-500 border-red-500/20' : daysLeft <= 14 ? 'bg-amber-500/10 text-amber-500 border-amber-500/20' : 'bg-zinc-100 dark:bg-[#09090b] border-zinc-200 dark:border-zinc-800 text-zinc-500'}`}>
                                                    <Clock size={12}/> {daysLeft < 0 ? 'En retard' : `J-${daysLeft}`}
                                                </span>
                                            )}
                                            {goal.priority === 'high' && (
                                                <span className="w-7 h-7 rounded-md bg-red-500/10 border border-red-500/20 text-red-500 flex items-center justify-center"><Flame size={14}/></span>
                                            )}
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <button onClick={(e) => {e.stopPropagation(); toggleFavorite(goal);}} className={`p-2 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-900 transition-colors ${goal.is_favorite ? 'text-red-500 bg-red-500/10' : 'text-zinc-400'}`}>
                                                <Heart size={18} className={goal.is_favorite ? "fill-current" : ""}/>
                                            </button>
                                            <button onClick={(e) => {e.stopPropagation(); deleteGoal(goal.id);}} className="p-2 rounded-lg hover:bg-red-500/10 text-zinc-400 hover:text-red-500 transition-colors">
                                                <Trash2 size={18}/>
                                            </button>
                                        </div>
                                    </div>

                                    <div className="flex flex-col xl:flex-row gap-8 items-start xl:items-center">
                                        <div className="flex-1 space-y-3">
                                            <h3 className="text-2xl font-bold text-zinc-900 dark:text-white leading-tight">{goal.title}</h3>
                                            {goal.motivation && (
                                                <p className="text-sm text-zinc-500 dark:text-zinc-400 italic pl-4 border-l-2 border-zinc-300 dark:border-zinc-700">
                                                    "{goal.motivation}"
                                                </p>
                                            )}
                                        </div>
                                        <div className="w-full xl:w-72 shrink-0 bg-zinc-50 dark:bg-[#09090b] p-5 rounded-xl border border-zinc-200 dark:border-zinc-800">
                                            <div className="flex justify-between text-xs font-mono text-zinc-500 mb-2.5 uppercase tracking-wider">
                                                <span>Progression</span>
                                                <span className={progress === 100 ? 'text-emerald-500 font-bold' : 'text-zinc-900 dark:text-white font-bold'}>{progress}%</span>
                                            </div>
                                            <div className="h-2 w-full bg-zinc-200 dark:bg-zinc-800 rounded-full overflow-hidden">
                                                <div className={`h-full transition-all duration-1000 ease-out rounded-full ${progress === 100 ? 'bg-emerald-500' : 'bg-zinc-900 dark:bg-white'}`} style={{ width: `${progress}%` }}></div>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="mt-6 flex justify-center">
                                        <div className={`p-1.5 rounded-lg transition-colors ${isExpanded ? 'bg-zinc-100 dark:bg-zinc-900 text-zinc-900 dark:text-white' : 'text-zinc-400'}`}>
                                            {isExpanded ? <ChevronDown size={20} className="rotate-180 transition-transform"/> : <ChevronDown size={20} className="transition-transform"/>}
                                        </div>
                                    </div>
                                </div>

                                {isExpanded && (
                                    <div className="bg-zinc-50 dark:bg-[#09090b] p-6 md:p-7 border-t border-zinc-200 dark:border-zinc-800 animate-in slide-in-from-top-4">
                                        <h4 className="text-xs font-mono text-zinc-500 uppercase tracking-[0.2em] mb-5 flex items-center gap-2.5">
                                            <CheckSquare size={16}/> Étapes Clés (Milestones)
                                        </h4>
                                        <div className="space-y-2.5 mb-6">
                                            {goalMilestones.length === 0 && <p className="text-zinc-500 text-sm pl-2">Aucune étape pour le moment. Ajoutez-en une !</p>}
                                            {goalMilestones.map(m => (
                                                <div key={m.id} className="flex items-center gap-3.5 group/item bg-white dark:bg-[#111113] p-3.5 rounded-xl border border-zinc-200 dark:border-zinc-800 cursor-pointer hover:border-zinc-400 dark:hover:border-zinc-600 transition-all" onClick={(e) => toggleMilestone(e, m.id)}>
                                                    <div className={`transition-all duration-200 ${m.is_completed ? 'text-zinc-900 dark:text-white' : 'text-zinc-400 group-hover/item:text-zinc-900 dark:group-hover/item:text-white'}`}>
                                                        {m.is_completed ? <CheckCircle2 size={20}/> : <Square size={20}/>}
                                                    </div>
                                                    <span className={`text-sm flex-1 font-medium ${m.is_completed ? 'text-zinc-400 line-through' : 'text-zinc-800 dark:text-zinc-200'}`}>
                                                        {m.title}
                                                    </span>
                                                    <button onClick={(e) => deleteMilestone(e, m.id)} className="opacity-0 group-hover/item:opacity-100 text-zinc-400 hover:text-red-500 transition-all p-1.5 hover:bg-red-500/10 rounded-lg">
                                                        <Trash2 size={16}/>
                                                    </button>
                                                </div>
                                            ))}
                                        </div>
                                        <div className="flex gap-2.5">
                                            <input 
                                                type="text" 
                                                className="flex-1 px-4 py-3 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-[#111113] outline-none focus:border-zinc-500 text-sm dark:text-white"
                                                placeholder="Ajouter une nouvelle étape..."
                                                value={newMilestoneText[goal.id] || ''}
                                                onChange={(e) => setNewMilestoneText({...newMilestoneText, [goal.id]: e.target.value})}
                                                onKeyDown={(e) => e.key === 'Enter' && addMilestone(goal.id)}
                                                onClick={(e) => e.stopPropagation()} 
                                            />
                                            <button onClick={(e) => { e.stopPropagation(); addMilestone(goal.id); }} className="px-5 py-3 bg-zinc-900 dark:bg-white text-white dark:text-[#09090b] rounded-xl hover:opacity-90 transition-all active:scale-95">
                                                <Plus size={18}/>
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