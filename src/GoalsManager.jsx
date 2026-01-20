import { useState, useMemo } from 'react';
import { 
  Target, Calendar, CheckSquare, Square, Heart, 
  Trash2, Plus, ChevronDown, ChevronRight, Trophy, AlertCircle,
  Briefcase, Activity, Banknote, User, Flame, Filter, Clock
} from 'lucide-react';

export default function GoalsManager({ data, updateData }) {
    // --- ÉTATS ---
    const [isFormOpen, setIsFormOpen] = useState(false);
    const [activeFilter, setActiveFilter] = useState('all'); // all, business, health, finance, perso
    
    // Formulaire
    const [newGoalTitle, setNewGoalTitle] = useState('');
    const [newGoalDeadline, setNewGoalDeadline] = useState('');
    const [newGoalCategory, setNewGoalCategory] = useState('perso');
    const [newGoalPriority, setNewGoalPriority] = useState('medium');
    const [newGoalMotivation, setNewGoalMotivation] = useState('');
    
    // États pour l'ajout de jalons rapides
    const [newMilestoneText, setNewMilestoneText] = useState({});
    const [expandedGoalId, setExpandedGoalId] = useState(null);

    // --- CONFIGURATION ---
    const categories = {
        business: { label: 'Business', color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300', icon: Briefcase },
        health: { label: 'Santé', color: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300', icon: Activity },
        finance: { label: 'Finance', color: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300', icon: Banknote },
        perso: { label: 'Perso', color: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300', icon: User },
    };

    const priorities = {
        high: { label: 'Haute', icon: Flame, color: 'text-red-500' },
        medium: { label: 'Moyenne', icon: Target, color: 'text-orange-500' },
        low: { label: 'Basse', icon: Calendar, color: 'text-blue-500' },
    };

    // --- DONNÉES SÉCURISÉES ---
    const goals = Array.isArray(data.goals) ? data.goals : [];
    const milestones = Array.isArray(data.goal_milestones) ? data.goal_milestones : [];

    // --- HELPERS ---
    const calculateProgress = (goalId) => {
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
        // Reset
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

    const toggleMilestone = (mId) => {
        const updated = milestones.map(m => m.id === mId ? { ...m, is_completed: !m.is_completed } : m);
        updateData({ ...data, goal_milestones: updated });
    };

    const deleteMilestone = (mId) => {
        const updated = milestones.filter(m => m.id !== mId);
        updateData({ ...data, goal_milestones: updated }, { table: 'goal_milestones', id: mId });
    };

    // --- FILTRAGE & TRI ---
    const filteredGoals = goals.filter(g => activeFilter === 'all' || g.category === activeFilter);
    const sortedGoals = [...filteredGoals].sort((a, b) => {
        if (a.is_favorite !== b.is_favorite) return a.is_favorite ? -1 : 1;
        return calculateProgress(b.id) - calculateProgress(a.id); // Les plus avancés en haut
    });

    // Stats
    const totalGoals = goals.length;
    const completedGoals = goals.filter(g => calculateProgress(g.id) === 100).length;

    return (
        <div className="space-y-8 fade-in p-4 pb-24 md:pb-20 max-w-6xl mx-auto">
            
            {/* 1. HEADER STATS */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-gradient-to-br from-slate-900 to-slate-800 text-white p-6 rounded-2xl shadow-lg relative overflow-hidden">
                    <div className="relative z-10">
                        <p className="text-xs font-bold opacity-60 uppercase tracking-wider mb-1">Vision Globale</p>
                        <h3 className="text-3xl font-bold">{completedGoals} / {totalGoals}</h3>
                        <p className="text-xs opacity-50 mt-1">Objectifs atteints</p>
                    </div>
                    <Trophy size={60} className="absolute -right-4 -bottom-4 opacity-10 rotate-12"/>
                </div>
                
                {['business', 'health', 'finance'].map(catKey => {
                    const catGoals = goals.filter(g => g.category === catKey);
                    const catProgress = catGoals.length > 0 
                        ? Math.round(catGoals.reduce((acc, g) => acc + calculateProgress(g.id), 0) / catGoals.length) 
                        : 0;
                    const Conf = categories[catKey];
                    const Icon = Conf.icon;
                    
                    return (
                        <div key={catKey} className="bg-white dark:bg-slate-800 p-5 rounded-2xl border border-gray-100 dark:border-slate-700 shadow-sm flex flex-col justify-between">
                            <div className="flex justify-between items-start mb-2">
                                <div className={`p-2 rounded-lg ${Conf.color}`}><Icon size={20}/></div>
                                <span className="text-xl font-bold text-gray-800 dark:text-white">{catProgress}%</span>
                            </div>
                            <div>
                                <p className="text-sm font-medium text-gray-600 dark:text-gray-300">{Conf.label}</p>
                                <div className="h-1.5 w-full bg-gray-100 dark:bg-slate-700 rounded-full mt-2 overflow-hidden">
                                    <div className="h-full bg-current opacity-70 transition-all duration-1000" style={{ width: `${catProgress}%`, color: 'inherit' }}></div>
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* 2. BARRE D'ACTIONS & FILTRES */}
            <div className="flex flex-col md:flex-row justify-between items-center gap-4">
                <div className="flex gap-2 p-1 bg-gray-100 dark:bg-slate-800 rounded-xl overflow-x-auto max-w-full">
                    <button onClick={() => setActiveFilter('all')} className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${activeFilter === 'all' ? 'bg-white dark:bg-slate-600 shadow-sm text-gray-900 dark:text-white' : 'text-gray-500 hover:text-gray-900 dark:text-gray-400'}`}>Tous</button>
                    {Object.keys(categories).map(cat => (
                        <button key={cat} onClick={() => setActiveFilter(cat)} className={`px-4 py-2 rounded-lg text-sm font-bold transition-all whitespace-nowrap ${activeFilter === cat ? 'bg-white dark:bg-slate-600 shadow-sm text-gray-900 dark:text-white' : 'text-gray-500 hover:text-gray-900 dark:text-gray-400'}`}>
                            {categories[cat].label}
                        </button>
                    ))}
                </div>

                <button 
                    onClick={() => setIsFormOpen(!isFormOpen)}
                    className="flex items-center gap-2 px-5 py-3 bg-slate-900 hover:bg-slate-800 text-white rounded-xl font-bold shadow-lg shadow-slate-900/20 transition-transform active:scale-95"
                >
                    <Plus size={20}/> {isFormOpen ? 'Fermer' : 'Nouvel Objectif'}
                </button>
            </div>

            {/* 3. FORMULAIRE D'AJOUT (ANIMÉ) */}
            {isFormOpen && (
                <div className="bg-white dark:bg-slate-800 p-6 md:p-8 rounded-2xl shadow-xl border border-gray-200 dark:border-slate-700 animate-in slide-in-from-top-4 fade-in duration-300">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="md:col-span-2">
                            <label className="label">Titre de l'objectif</label>
                            <input type="text" className="input-field text-lg font-bold" placeholder="Ex: Devenir bilingue en Anglais" value={newGoalTitle} onChange={e => setNewGoalTitle(e.target.value)} autoFocus />
                        </div>
                        
                        <div>
                            <label className="label">Catégorie</label>
                            <div className="grid grid-cols-2 gap-2">
                                {Object.keys(categories).map(cat => {
                                    const Icon = categories[cat].icon;
                                    return (
                                        <button 
                                            key={cat} 
                                            onClick={() => setNewGoalCategory(cat)}
                                            className={`flex items-center justify-center gap-2 py-2 rounded-lg border text-sm font-medium transition-all ${newGoalCategory === cat ? 'border-blue-500 bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300' : 'border-gray-200 dark:border-slate-600 text-gray-500 dark:text-slate-400'}`}
                                        >
                                            <Icon size={16}/> {categories[cat].label}
                                        </button>
                                    );
                                })}
                            </div>
                        </div>

                        <div className="space-y-4">
                            <div>
                                <label className="label">Date limite (Deadline)</label>
                                <input type="date" className="input-field" value={newGoalDeadline} onChange={e => setNewGoalDeadline(e.target.value)} />
                            </div>
                            <div>
                                <label className="label">Priorité</label>
                                <select className="input-field" value={newGoalPriority} onChange={e => setNewGoalPriority(e.target.value)}>
                                    <option value="high">🔥 Haute Priorité</option>
                                    <option value="medium">🎯 Moyenne</option>
                                    <option value="low">📅 Basse</option>
                                </select>
                            </div>
                        </div>

                        <div className="md:col-span-2">
                            <label className="label">Motivation (Le "Pourquoi")</label>
                            <textarea 
                                className="input-field min-h-[80px]" 
                                placeholder="Pourquoi est-ce important pour vous ? (Cela vous aidera dans les moments difficiles)"
                                value={newGoalMotivation} 
                                onChange={e => setNewGoalMotivation(e.target.value)}
                            />
                        </div>
                    </div>
                    <div className="mt-6 flex justify-end">
                        <button onClick={addGoal} className="px-8 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold shadow-md transition-colors">C'est parti 🚀</button>
                    </div>
                </div>
            )}

            {/* 4. LISTE DES CARTES */}
            <div className="grid grid-cols-1 gap-6">
                {sortedGoals.length === 0 ? (
                    <div className="text-center py-20 opacity-50">
                        <Target size={64} className="mx-auto mb-4 text-gray-300"/>
                        <p>Aucun objectif pour le moment. Visez la lune !</p>
                    </div>
                ) : (
                    sortedGoals.map(goal => {
                        const progress = calculateProgress(goal.id);
                        const goalMilestones = milestones.filter(m => String(m.goal_id) === String(goal.id));
                        const Conf = categories[goal.category || 'perso'];
                        const PriorityConf = priorities[goal.priority || 'medium'];
                        const daysLeft = getDaysRemaining(goal.deadline);
                        const isExpanded = expandedGoalId === goal.id;

                        return (
                            <div key={goal.id} className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-gray-200 dark:border-slate-700 overflow-hidden group transition-all hover:shadow-md">
                                {/* CARD HEADER */}
                                <div className="p-6 cursor-pointer" onClick={() => setExpandedGoalId(isExpanded ? null : goal.id)}>
                                    <div className="flex justify-between items-start mb-4">
                                        <div className="flex gap-3">
                                            <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 ${Conf.color}`}>
                                                <Conf.icon size={12}/> {Conf.label}
                                            </span>
                                            {goal.deadline && (
                                                <span className={`px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1.5 ${daysLeft < 0 ? 'bg-red-100 text-red-600' : daysLeft <= 14 ? 'bg-orange-100 text-orange-600' : 'bg-gray-100 text-gray-600 dark:bg-slate-700 dark:text-gray-300'}`}>
                                                    <Clock size={12}/> {daysLeft < 0 ? 'En retard' : `J-${daysLeft}`}
                                                </span>
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
                                        
                                        {/* PROGRESS CIRCLE (Mobile) / BAR (Desktop) */}
                                        <div className="w-full md:w-48 shrink-0">
                                            <div className="flex justify-between text-xs font-bold text-gray-500 mb-1">
                                                <span>Progression</span>
                                                <span className={progress === 100 ? 'text-green-600' : 'text-blue-600'}>{progress}%</span>
                                            </div>
                                            <div className="h-2.5 w-full bg-gray-100 dark:bg-slate-700 rounded-full overflow-hidden">
                                                <div className={`h-full transition-all duration-700 ease-out ${progress === 100 ? 'bg-green-500' : 'bg-gradient-to-r from-blue-500 to-indigo-600'}`} style={{ width: `${progress}%` }}></div>
                                            </div>
                                        </div>
                                    </div>
                                    
                                    <div className="mt-4 flex justify-center">
                                        {isExpanded ? <ChevronDown size={20} className="text-gray-300"/> : <ChevronDown size={20} className="text-gray-300"/>}
                                    </div>
                                </div>

                                {/* CARD BODY (EXPANDED) */}
                                {isExpanded && (
                                    <div className="bg-gray-50 dark:bg-slate-700/30 p-6 border-t border-gray-100 dark:border-slate-700 animate-in slide-in-from-top-2">
                                        <h4 className="text-sm font-bold text-gray-700 dark:text-gray-300 mb-4 flex items-center gap-2">
                                            <CheckSquare size={16} className="text-blue-500"/> Étapes Clés (Jalons)
                                        </h4>
                                        
                                        <div className="space-y-2 mb-4">
                                            {goalMilestones.length === 0 && <p className="text-sm text-gray-400 italic pl-6">Aucune étape définie. Ajoutez-en une !</p>}
                                            {goalMilestones.map(m => (
                                                <div key={m.id} className="flex items-center gap-3 group/item bg-white dark:bg-slate-800 p-3 rounded-xl border border-gray-100 dark:border-slate-600 shadow-sm">
                                                    <button onClick={() => toggleMilestone(m.id)} className={`transition-all active:scale-90 ${m.is_completed ? 'text-green-500' : 'text-gray-300 hover:text-blue-500'}`}>
                                                        {m.is_completed ? <CheckCircle2 size={22} className="fill-green-100 dark:fill-green-900"/> : <Square size={22}/>}
                                                    </button>
                                                    <span className={`text-sm flex-1 font-medium ${m.is_completed ? 'text-gray-400 line-through' : 'text-gray-700 dark:text-gray-200'}`}>
                                                        {m.title}
                                                    </span>
                                                    <button onClick={() => deleteMilestone(m.id)} className="opacity-0 group-hover/item:opacity-100 text-gray-300 hover:text-red-500 transition-opacity"><Trash2 size={16}/></button>
                                                </div>
                                            ))}
                                        </div>

                                        <div className="flex gap-2">
                                            <input 
                                                type="text" 
                                                className="flex-1 px-4 py-2 rounded-xl border border-gray-200 dark:border-slate-600 dark:bg-slate-800 dark:text-white text-sm outline-none focus:ring-2 focus:ring-blue-500"
                                                placeholder="Ajouter une nouvelle étape..."
                                                value={newMilestoneText[goal.id] || ''}
                                                onChange={(e) => setNewMilestoneText({...newMilestoneText, [goal.id]: e.target.value})}
                                                onKeyDown={(e) => e.key === 'Enter' && addMilestone(goal.id)}
                                            />
                                            <button onClick={() => addMilestone(goal.id)} className="px-4 py-2 bg-slate-900 dark:bg-slate-600 text-white rounded-xl hover:bg-blue-600 transition-colors">
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

            <style jsx>{`
                .label { @apply block text-sm font-bold text-gray-700 dark:text-gray-300 mb-1.5; }
                .input-field { @apply w-full px-4 py-2.5 bg-gray-50 dark:bg-slate-700 border border-gray-200 dark:border-slate-600 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 dark:text-white transition-all; }
            `}</style>
        </div>
    );
}