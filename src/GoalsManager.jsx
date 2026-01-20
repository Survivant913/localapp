import { useState, useMemo } from 'react';
import { 
  Target, Calendar, CheckSquare, Square, Heart, 
  Trash2, Plus, ChevronDown, ChevronRight, Trophy, AlertCircle 
} from 'lucide-react';

export default function GoalsManager({ data, updateData }) {
    // --- ÉTATS ---
    const [newGoalTitle, setNewGoalTitle] = useState('');
    const [newGoalDeadline, setNewGoalDeadline] = useState('');
    const [isFormOpen, setIsFormOpen] = useState(false);
    
    // États pour l'ajout de jalons rapides
    const [newMilestoneText, setNewMilestoneText] = useState({});

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

    const isLate = (dateStr) => {
        if (!dateStr) return false;
        const d = new Date(dateStr);
        const today = new Date();
        d.setHours(23,59,59);
        return d < today;
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
            is_favorite: false,
            created_at: new Date().toISOString()
        };
        // On met à jour via App.jsx
        updateData({ ...data, goals: [newGoal, ...goals] });
        setNewGoalTitle('');
        setNewGoalDeadline('');
        setIsFormOpen(false);
    };

    const deleteGoal = (id) => {
        if (!window.confirm("Supprimer cet objectif et ses jalons ?")) return;
        // Supprime l'objectif ET ses jalons locaux
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
        
        const newM = {
            id: Date.now(),
            goal_id: goalId,
            title: text,
            is_completed: false
        };
        
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

    // --- STATS ---
    const totalGoals = goals.length;
    const completedGoals = goals.filter(g => calculateProgress(g.id) === 100).length;
    const inProgressGoals = totalGoals - completedGoals;

    // Trier : Favoris d'abord, puis date
    const sortedGoals = [...goals].sort((a, b) => (b.is_favorite === a.is_favorite) ? 0 : b.is_favorite ? 1 : -1);

    return (
        <div className="space-y-6 fade-in p-4 pb-24 md:pb-20 max-w-5xl mx-auto">
            
            {/* STATS HEADER */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-slate-800 text-white p-6 rounded-2xl shadow-lg flex justify-between items-center relative overflow-hidden">
                    <div>
                        <p className="text-xs font-bold opacity-60 uppercase tracking-wider">Total Objectifs</p>
                        <h3 className="text-4xl font-bold mt-1">{totalGoals}</h3>
                    </div>
                    <Target size={40} className="opacity-20 absolute right-4 bottom-4"/>
                </div>
                <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl border border-gray-200 dark:border-slate-700 shadow-sm flex justify-between items-center">
                    <div>
                        <p className="text-xs font-bold text-gray-500 dark:text-slate-400 uppercase tracking-wider">En cours</p>
                        <h3 className="text-4xl font-bold text-blue-600 dark:text-blue-400 mt-1">{inProgressGoals}</h3>
                    </div>
                    <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-full text-blue-600">
                        <Trophy size={24}/>
                    </div>
                </div>
                <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl border border-gray-200 dark:border-slate-700 shadow-sm flex justify-between items-center">
                    <div>
                        <p className="text-xs font-bold text-gray-500 dark:text-slate-400 uppercase tracking-wider">Accomplis</p>
                        <h3 className="text-4xl font-bold text-green-600 dark:text-green-400 mt-1">{completedGoals}</h3>
                    </div>
                    <div className="p-3 bg-green-50 dark:bg-green-900/20 rounded-full text-green-600">
                        <CheckSquare size={24}/>
                    </div>
                </div>
            </div>

            {/* BARRE D'AJOUT */}
            {!isFormOpen ? (
                <button 
                    onClick={() => setIsFormOpen(true)}
                    className="w-full py-4 border-2 border-dashed border-gray-300 dark:border-slate-600 rounded-xl flex items-center justify-center gap-2 text-gray-500 dark:text-gray-400 hover:border-blue-500 hover:text-blue-600 dark:hover:text-blue-400 transition-all"
                >
                    <Plus size={20}/> <span className="font-bold">Définir un nouvel objectif</span>
                </button>
            ) : (
                <div className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-lg border border-gray-200 dark:border-slate-700 animate-in slide-in-from-top-2">
                    <h3 className="font-bold text-lg mb-4 text-gray-800 dark:text-white">Nouvel Objectif</h3>
                    <div className="flex flex-col md:flex-row gap-4 mb-4">
                        <input 
                            type="text" 
                            placeholder="Ex: Courir un marathon, Lancer mon site..." 
                            className="flex-1 px-4 py-2 bg-gray-50 dark:bg-slate-700 border border-gray-200 dark:border-slate-600 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 dark:text-white"
                            value={newGoalTitle}
                            onChange={(e) => setNewGoalTitle(e.target.value)}
                        />
                        <input 
                            type="date" 
                            className="px-4 py-2 bg-gray-50 dark:bg-slate-700 border border-gray-200 dark:border-slate-600 rounded-lg outline-none dark:text-white"
                            value={newGoalDeadline}
                            onChange={(e) => setNewGoalDeadline(e.target.value)}
                        />
                    </div>
                    <div className="flex justify-end gap-2">
                        <button onClick={() => setIsFormOpen(false)} className="px-4 py-2 text-gray-500 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-lg">Annuler</button>
                        <button onClick={addGoal} className="px-6 py-2 bg-slate-800 text-white rounded-lg hover:bg-slate-900 font-medium">Créer l'objectif</button>
                    </div>
                </div>
            )}

            {/* LISTE DES OBJECTIFS */}
            <div className="space-y-6">
                {sortedGoals.map(goal => {
                    const progress = calculateProgress(goal.id);
                    const goalMilestones = milestones.filter(m => String(m.goal_id) === String(goal.id));
                    const late = isLate(goal.deadline) && progress < 100;

                    return (
                        <div key={goal.id} className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-gray-200 dark:border-slate-700 p-6 relative group transition-all hover:shadow-md">
                            {/* Header Carte */}
                            <div className="flex justify-between items-start mb-4">
                                <div className="flex items-center gap-3">
                                    <button onClick={() => toggleFavorite(goal)} className={`transition-transform active:scale-90 ${goal.is_favorite ? 'text-red-500 fill-current' : 'text-gray-300 hover:text-red-400'}`}>
                                        <Heart size={24} className={goal.is_favorite ? "fill-red-500" : ""}/>
                                    </button>
                                    <div>
                                        <h3 className="text-xl font-bold text-gray-800 dark:text-white">{goal.title}</h3>
                                        <div className="flex items-center gap-3 mt-1">
                                            <span className="text-sm font-bold text-gray-500 dark:text-slate-400">Progression</span>
                                            <span className={`text-sm font-bold ${progress === 100 ? 'text-green-500' : 'text-blue-500'}`}>{progress}%</span>
                                        </div>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2">
                                    <button onClick={() => deleteGoal(goal.id)} className="p-2 text-gray-300 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"><Trash2 size={18}/></button>
                                </div>
                            </div>

                            {/* Barre de progression */}
                            <div className="h-3 w-full bg-gray-100 dark:bg-slate-700 rounded-full overflow-hidden mb-4">
                                <div className={`h-full transition-all duration-700 ease-out ${progress === 100 ? 'bg-green-500' : 'bg-slate-800 dark:bg-blue-500'}`} style={{ width: `${progress}%` }}></div>
                            </div>

                            {/* Badges / Deadline */}
                            {goal.deadline && (
                                <div className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold mb-6 ${late ? 'bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400' : 'bg-gray-100 text-gray-600 dark:bg-slate-700 dark:text-slate-300'}`}>
                                    {late ? <AlertCircle size={12}/> : <Calendar size={12}/>}
                                    {late ? 'En retard' : `Pour le ${new Date(goal.deadline).toLocaleDateString()}`}
                                </div>
                            )}

                            {/* Jalons */}
                            <div>
                                <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">Jalons Clés</h4>
                                <div className="space-y-2 mb-4">
                                    {goalMilestones.map(m => (
                                        <div key={m.id} className="flex items-center gap-3 group/item">
                                            <button onClick={() => toggleMilestone(m.id)} className={`transition-colors ${m.is_completed ? 'text-slate-800 dark:text-blue-400' : 'text-gray-300 hover:text-blue-400'}`}>
                                                {m.is_completed ? <CheckSquare size={20}/> : <Square size={20}/>}
                                            </button>
                                            <span className={`text-sm flex-1 ${m.is_completed ? 'text-gray-400 line-through' : 'text-gray-700 dark:text-gray-200'}`}>
                                                {m.title}
                                            </span>
                                            <button onClick={() => deleteMilestone(m.id)} className="opacity-0 group-hover/item:opacity-100 text-gray-300 hover:text-red-500 transition-opacity"><Trash2 size={14}/></button>
                                        </div>
                                    ))}
                                </div>
                                
                                {/* Ajout Jalon Rapide */}
                                <div className="flex items-center gap-2">
                                    <Plus size={16} className="text-gray-400"/>
                                    <input 
                                        type="text" 
                                        placeholder="Ajouter une étape..." 
                                        className="flex-1 bg-transparent border-none outline-none text-sm text-gray-600 dark:text-gray-300 placeholder-gray-400"
                                        value={newMilestoneText[goal.id] || ''}
                                        onChange={(e) => setNewMilestoneText({...newMilestoneText, [goal.id]: e.target.value})}
                                        onKeyDown={(e) => e.key === 'Enter' && addMilestone(goal.id)}
                                    />
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}