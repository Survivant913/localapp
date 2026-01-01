import { useState, useMemo } from 'react';
import { 
  CheckCircle2, Circle, Plus, Trash2, Calendar, Flag, 
  Filter, CheckSquare, AlertCircle, X, ListTodo
} from 'lucide-react';

export default function TodoList({ data, updateData }) {
    // --- ETATS ---
    const [newTaskText, setNewTaskText] = useState('');
    const [newTaskPriority, setNewTaskPriority] = useState('medium'); // low, medium, high
    const [newTaskDeadline, setNewTaskDeadline] = useState('');
    const [filter, setFilter] = useState('all'); // all, active, completed

    // Sécurisation données
    const todos = data.todos || [];

    // --- STATISTIQUES ---
    const stats = useMemo(() => {
        const total = todos.length;
        const completed = todos.filter(t => t.completed).length;
        const percentage = total === 0 ? 0 : Math.round((completed / total) * 100);
        return { total, completed, percentage };
    }, [todos]);

    // --- ACTIONS ---
    const addTask = (e) => {
        e.preventDefault();
        if (!newTaskText.trim()) return;

        const newTodo = {
            id: Date.now(),
            text: newTaskText,
            completed: false,
            priority: newTaskPriority,
            deadline: newTaskDeadline || null,
            createdAt: new Date().toISOString()
        };

        updateData({ ...data, todos: [newTodo, ...todos] }); // Ajout en haut de liste
        
        // Reset
        setNewTaskText('');
        setNewTaskPriority('medium');
        setNewTaskDeadline('');
    };

    const toggleTodo = (id) => {
        const updatedTodos = todos.map(t => 
            t.id === id ? { ...t, completed: !t.completed } : t
        );
        updateData({ ...data, todos: updatedTodos });
    };

    const deleteTodo = (id) => {
        updateData({ ...data, todos: todos.filter(t => t.id !== id) }, { table: 'todos', id });
    };

    const clearCompleted = () => {
        if(window.confirm("Supprimer toutes les tâches terminées ?")) {
            const activeTodos = todos.filter(t => !t.completed);
            updateData({ ...data, todos: activeTodos });
        }
    };

    // --- FILTRAGE ---
    const filteredTodos = todos.filter(t => {
        if (filter === 'active') return !t.completed;
        if (filter === 'completed') return t.completed;
        return true;
    }).sort((a, b) => {
        // Tri : Non-fait d'abord, puis par priorité
        if (a.completed === b.completed) {
            const pScore = { high: 3, medium: 2, low: 1 };
            return (pScore[b.priority] || 0) - (pScore[a.priority] || 0);
        }
        return a.completed ? 1 : -1;
    });

    // --- COULEURS & ICONES ---
    const priorityConfig = {
        high: { color: 'text-red-500', bg: 'bg-red-50 dark:bg-red-900/20', border: 'border-red-200 dark:border-red-800', label: 'Urgent' },
        medium: { color: 'text-orange-500', bg: 'bg-orange-50 dark:bg-orange-900/20', border: 'border-orange-200 dark:border-orange-800', label: 'Normal' },
        low: { color: 'text-blue-500', bg: 'bg-blue-50 dark:bg-blue-900/20', border: 'border-blue-200 dark:border-blue-800', label: 'Bas' },
    };

    return (
        <div className="fade-in p-4 md:p-6 pb-24 md:pb-20 max-w-5xl mx-auto space-y-6 md:space-y-8">
            
            {/* 1. EN-TÊTE & PROGRESSION */}
            <div className="flex flex-col lg:flex-row gap-4 md:gap-6">
                
                {/* Carte Résumé (Cercle de progression) */}
                <div className="bg-white dark:bg-slate-800 p-4 md:p-6 rounded-2xl shadow-sm border border-gray-200 dark:border-slate-700 flex items-center gap-4 md:gap-6 lg:w-1/3">
                    <div className="relative w-16 h-16 md:w-20 md:h-20 flex items-center justify-center shrink-0">
                        <svg className="w-full h-full transform -rotate-90">
                            <circle cx="50%" cy="50%" r="45%" stroke="currentColor" strokeWidth="8" fill="none" className="text-gray-100 dark:text-slate-700" />
                            <circle cx="50%" cy="50%" r="45%" stroke="currentColor" strokeWidth="8" fill="none" strokeDasharray={2 * Math.PI * 45} strokeDashoffset={2 * Math.PI * 45 * (1 - stats.percentage / 100)} className="text-blue-600 dark:text-blue-500 transition-all duration-1000 ease-out" strokeLinecap="round" />
                        </svg>
                        <span className="absolute text-sm font-bold text-gray-700 dark:text-white">{stats.percentage}%</span>
                    </div>
                    <div>
                        <h2 className="text-xl md:text-2xl font-bold text-gray-800 dark:text-white">Ma Journée</h2>
                        <p className="text-xs md:text-sm text-gray-500 dark:text-gray-400">
                            {stats.completed} terminées sur {stats.total}
                        </p>
                    </div>
                </div>

                {/* Carte Ajout Rapide */}
                <div className="flex-1 bg-gradient-to-r from-blue-600 to-indigo-700 dark:from-slate-800 dark:to-slate-900 p-4 md:p-6 rounded-2xl shadow-lg text-white flex flex-col justify-center relative overflow-hidden">
                    <form onSubmit={addTask} className="relative z-10 flex flex-col gap-3">
                        <div className="relative w-full">
                            <input 
                                type="text" 
                                placeholder="Nouvelle tâche..." 
                                value={newTaskText}
                                onChange={(e) => setNewTaskText(e.target.value)}
                                className="w-full pl-4 pr-12 py-3 md:py-4 rounded-xl bg-white/10 backdrop-blur-sm border border-white/20 placeholder-white/60 text-white outline-none focus:bg-white/20 transition-all text-sm md:text-base"
                            />
                            <button 
                                type="submit"
                                className="absolute right-2 top-1/2 -translate-y-1/2 p-2 bg-white text-blue-600 rounded-lg hover:scale-105 transition-transform"
                            >
                                <Plus size={18} />
                            </button>
                        </div>

                        <div className="flex justify-between items-center">
                            {/* Sélecteur de priorité */}
                            <div className="flex items-center gap-2">
                                <select 
                                    value={newTaskPriority}
                                    onChange={(e) => setNewTaskPriority(e.target.value)}
                                    className="bg-white/10 backdrop-blur-sm text-[10px] md:text-xs font-bold uppercase text-white outline-none cursor-pointer hover:bg-white/20 [&>option]:text-black border border-white/20 rounded-lg px-2 py-1.5 appearance-none text-center min-w-[70px]"
                                >
                                    <option value="low">Basse</option>
                                    <option value="medium">Moyenne</option>
                                    <option value="high">Haute</option>
                                </select>
                            </div>
                            
                            {/* Input Date */}
                            <div className="flex items-center gap-2 bg-white/10 px-3 py-1.5 rounded-lg border border-white/10 hover:bg-white/20 transition-colors cursor-pointer group">
                                <Calendar size={14} className="text-white shrink-0"/>
                                <input 
                                    type="date" 
                                    value={newTaskDeadline}
                                    onChange={(e) => setNewTaskDeadline(e.target.value)}
                                    className="bg-transparent text-white outline-none cursor-pointer text-[10px] md:text-xs font-bold w-[90px] md:w-[110px] opacity-90 [color-scheme:dark]" 
                                />
                            </div>
                        </div>
                    </form>
                </div>
            </div>

            {/* 2. LISTE & FILTRES */}
            <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-gray-200 dark:border-slate-700 min-h-[400px] flex flex-col">
                
                {/* Barre d'outils */}
                <div className="p-4 border-b border-gray-100 dark:border-slate-700 flex flex-col sm:flex-row justify-between items-center gap-4">
                    <div className="flex w-full sm:w-auto bg-gray-100 dark:bg-slate-700 p-1 rounded-xl overflow-x-auto no-scrollbar">
                        {['all', 'active', 'completed'].map(f => (
                            <button
                                key={f}
                                onClick={() => setFilter(f)}
                                className={`flex-1 sm:flex-none px-3 md:px-4 py-1.5 rounded-lg text-xs md:text-sm font-medium transition-all whitespace-nowrap ${filter === f ? 'bg-white dark:bg-slate-600 text-gray-800 dark:text-white shadow-sm' : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'}`}
                            >
                                {f === 'all' && 'Toutes'}
                                {f === 'active' && 'À faire'}
                                {f === 'completed' && 'Terminées'}
                            </button>
                        ))}
                    </div>
                    {stats.completed > 0 && (
                        <button onClick={clearCompleted} className="text-xs text-red-500 hover:text-red-600 hover:underline px-2 whitespace-nowrap">
                            Effacer terminées
                        </button>
                    )}
                </div>

                {/* Liste des tâches */}
                <div className="flex-1 p-3 md:p-4 space-y-2">
                    {filteredTodos.length === 0 ? (
                        <div className="h-full flex flex-col items-center justify-center text-gray-400 py-12 opacity-50">
                            <ListTodo size={48} md:size={64} strokeWidth={1} className="mb-4"/>
                            <p className="text-sm md:text-base">Aucune tâche trouvée</p>
                        </div>
                    ) : (
                        filteredTodos.map(todo => {
                            const pConf = priorityConfig[todo.priority] || priorityConfig.medium;
                            const isOverdue = todo.deadline && new Date(todo.deadline) < new Date() && !todo.completed;

                            return (
                                <div 
                                    key={todo.id} 
                                    className={`group flex items-start md:items-center gap-3 md:gap-4 p-3 md:p-4 rounded-xl border transition-all duration-200
                                        ${todo.completed 
                                            ? 'bg-gray-50 dark:bg-slate-700/30 border-gray-100 dark:border-slate-700 opacity-60' 
                                            : 'bg-white dark:bg-slate-800 border-gray-100 dark:border-slate-700 hover:border-blue-300 dark:hover:border-blue-500 hover:shadow-sm'
                                        }
                                    `}
                                >
                                    {/* Checkbox Custom */}
                                    <button 
                                        onClick={() => toggleTodo(todo.id)}
                                        className={`shrink-0 w-5 h-5 md:w-6 md:h-6 mt-0.5 md:mt-0 rounded-full border-2 flex items-center justify-center transition-colors
                                            ${todo.completed 
                                                ? 'bg-green-500 border-green-500 text-white' 
                                                : `border-gray-300 dark:border-slate-500 hover:border-green-500 text-transparent`
                                            }
                                        `}
                                    >
                                        <CheckCircle2 size={14} md:size={16} className={todo.completed ? 'scale-100' : 'scale-0'} />
                                    </button>

                                    {/* Contenu */}
                                    <div className="flex-1 min-w-0">
                                        <p className={`text-sm font-medium break-words leading-tight md:leading-normal ${todo.completed ? 'line-through text-gray-500' : 'text-gray-800 dark:text-gray-100'}`}>
                                            {todo.text}
                                        </p>
                                        
                                        <div className="flex flex-wrap items-center gap-2 md:gap-3 mt-1.5">
                                            {/* Badge Priorité */}
                                            <span className={`text-[9px] md:text-[10px] px-1.5 md:px-2 py-0.5 rounded-full flex items-center gap-1 font-bold border ${pConf.bg} ${pConf.color} ${pConf.border}`}>
                                                <Flag size={10} fill="currentColor"/> {pConf.label}
                                            </span>

                                            {/* Badge Date */}
                                            {todo.deadline && (
                                                <span className={`text-[9px] md:text-[10px] flex items-center gap-1 ${isOverdue ? 'text-red-500 font-bold' : 'text-gray-400'}`}>
                                                    <Calendar size={10} /> 
                                                    {new Date(todo.deadline).toLocaleDateString()}
                                                    {isOverdue && " (!)"}
                                                </span>
                                            )}
                                        </div>
                                    </div>

                                    {/* Actions - Poubelle toujours visible sur mobile */}
                                    <button 
                                        onClick={() => deleteTodo(todo.id)}
                                        className="opacity-100 md:opacity-0 md:group-hover:opacity-100 p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-all"
                                        title="Supprimer"
                                    >
                                        <Trash2 size={16} md:size={18} />
                                    </button>
                                </div>
                            );
                        })
                    )}
                </div>
            </div>
        </div>
    );
}