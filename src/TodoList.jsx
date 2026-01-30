import { useState, useMemo } from 'react';
import { 
  CheckCircle2, Circle, Plus, Trash2, Calendar, Flag, 
  Filter, CheckSquare, AlertCircle, X, ListTodo,
  LayoutDashboard, List, ChevronRight, Clock, Hash, ArrowRight
} from 'lucide-react';

export default function TodoList({ data, updateData }) {
    // --- ÉTATS ORIGINAUX (CONSERVÉS À 100%) ---
    const [newTaskText, setNewTaskText] = useState('');
    const [newTaskPriority, setNewTaskPriority] = useState('medium'); 
    const [newTaskDeadline, setNewTaskDeadline] = useState('');
    const [filter, setFilter] = useState('all'); 

    // --- NOUVEAUX ÉTATS (SANS SIMPLIFICATION) ---
    const [viewMode, setViewMode] = useState('list'); // 'list' ou 'kanban'
    const [activeListId, setActiveListId] = useState('default');
    const [isAddingList, setIsAddingList] = useState(false);
    const [newListTitle, setNewListTitle] = useState('');

    const isDark = data.settings?.theme === 'dark';

    // Sécurisation données (Structure préservée)
    const todos = data.todos || [];
    const todoLists = data.todoLists || [{ id: 'default', name: 'To-Do', color: 'indigo' }];

    // --- STATISTIQUES (TON CODE ORIGINAL) ---
    const stats = useMemo(() => {
        const currentTodos = todos.filter(t => (t.listId || 'default') === activeListId);
        const total = currentTodos.length;
        const completed = currentTodos.filter(t => t.completed).length;
        const percentage = total === 0 ? 0 : Math.round((completed / total) * 100);
        return { total, completed, percentage };
    }, [todos, activeListId]);

    // --- CONFIGURATION JAUGE (TES MATHS EXACTES) ---
    const radius = 40; 
    const circumference = 2 * Math.PI * radius; 
    const strokeDashoffset = circumference - (stats.percentage / 100) * circumference; 

    // --- ACTIONS (LOGIQUE ORIGINALE PRÉSERVÉE + KANBAN) ---
    const addTask = (e) => {
        e.preventDefault();
        if (!newTaskText.trim()) return;

        const newTodo = {
            id: Date.now(),
            text: newTaskText,
            completed: false,
            priority: newTaskPriority,
            deadline: newTaskDeadline || null,
            createdAt: new Date().toISOString(),
            listId: activeListId,
            status: 'todo' // Statut initial pour le Kanban
        };

        updateData({ ...data, todos: [newTodo, ...todos] }, { table: 'todos', data: newTodo, action: 'insert' }); 
        
        setNewTaskText('');
        setNewTaskPriority('medium');
        setNewTaskDeadline('');
    };

    const toggleTodo = (id) => {
        const updatedTodos = todos.map(t => {
            if (t.id === id) {
                const isNowCompleted = !t.completed;
                return { 
                    ...t, 
                    completed: isNowCompleted,
                    status: isNowCompleted ? 'done' : 'todo' // Synchro visuelle
                };
            }
            return t;
        });
        const target = updatedTodos.find(t => t.id === id);
        updateData({ ...data, todos: updatedTodos }, { table: 'todos', id, data: { completed: target.completed, status: target.status }, action: 'update' });
    };

    // Nouvelle fonction pour changer le statut Kanban sans forcément compléter la tâche
    const updateStatus = (id, newStatus) => {
        const updatedTodos = todos.map(t => 
            t.id === id ? { ...t, status: newStatus, completed: newStatus === 'done' } : t
        );
        const target = updatedTodos.find(t => t.id === id);
        updateData({ ...data, todos: updatedTodos }, { table: 'todos', id, data: { status: newStatus, completed: target.completed }, action: 'update' });
    };

    const deleteTodo = (id) => {
        if(window.confirm("Supprimer cette tâche ?")) {
            updateData({ ...data, todos: todos.filter(t => t.id !== id) }, { table: 'todos', id, action: 'delete' });
        }
    };

    const addList = () => {
        if (!newListTitle.trim()) return;
        const newList = { id: Date.now().toString(), name: newListTitle, color: 'purple' };
        updateData({ ...data, todoLists: [...todoLists, newList] }, { table: 'todo_lists', data: newList, action: 'insert' });
        setNewListTitle('');
        setIsAddingList(false);
        setActiveListId(newList.id);
    };

    const deleteList = (id) => {
        if (id === 'default') return;
        if (window.confirm("Supprimer cette liste et toutes ses tâches ?")) {
            const newLists = todoLists.filter(l => l.id !== id);
            const newTodos = todos.filter(t => t.listId !== id);
            updateData({ ...data, todoLists: newLists, todos: newTodos }, { table: 'todo_lists', id, action: 'delete' });
            setActiveListId('default');
        }
    };

    const clearCompleted = () => {
        if(window.confirm("Supprimer toutes les tâches terminées ?")) {
            const activeTodos = todos.filter(t => !t.completed || (t.listId || 'default') !== activeListId);
            updateData({ ...data, todos: activeTodos });
        }
    };

    // --- FILTRAGE (TON TRI ORIGINAL) ---
    const filteredTodos = useMemo(() => {
        return todos
            .filter(t => (t.listId || 'default') === activeListId)
            .filter(t => {
                if (filter === 'active') return !t.completed;
                if (filter === 'completed') return t.completed;
                return true;
            })
            .sort((a, b) => {
                if (a.completed === b.completed) {
                    const pScore = { high: 3, medium: 2, low: 1 };
                    return (pScore[b.priority] || 0) - (pScore[a.priority] || 0);
                }
                return a.completed ? 1 : -1;
            });
    }, [todos, activeListId, filter]);

    // --- CONFIGURATION COULEURS PREMIUM ---
    const priorityConfig = {
        high: { color: isDark ? 'text-red-400' : 'text-red-600', bg: isDark ? 'bg-red-900/20' : 'bg-red-50', border: isDark ? 'border-red-800' : 'border-red-200', label: 'Urgent' },
        medium: { color: isDark ? 'text-orange-400' : 'text-orange-600', bg: isDark ? 'bg-orange-900/20' : 'bg-orange-50', border: isDark ? 'border-orange-800' : 'border-orange-200', label: 'Normal' },
        low: { color: isDark ? 'text-blue-400' : 'text-blue-600', bg: isDark ? 'bg-blue-900/20' : 'bg-blue-50', border: isDark ? 'border-blue-800' : 'border-blue-200', label: 'Bas' },
    };

    return (
        <div className={`flex h-screen transition-colors duration-300 ${isDark ? 'bg-[#0f172a] text-slate-200' : 'bg-[#f8fafc] text-slate-900'}`}>
            
            {/* SIDEBAR */}
            <aside className={`w-64 border-r hidden md:flex flex-col ${isDark ? 'bg-slate-900/50 border-white/5' : 'bg-white border-slate-200 shadow-xl'}`}>
                <div className="p-6">
                    <div className="flex items-center gap-3 mb-8">
                        <div className={`p-2 rounded-lg ${isDark ? 'bg-indigo-600 shadow-indigo-500/20' : 'bg-indigo-500 shadow-indigo-100'}`}>
                            <ListTodo className="text-white" size={20} />
                        </div>
                        <h1 className="text-lg font-bold tracking-tight">Mes Espaces</h1>
                    </div>

                    <nav className="space-y-1">
                        {todoLists.map(list => (
                            <div key={list.id} className="group relative">
                                <button
                                    onClick={() => setActiveListId(list.id)}
                                    className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl transition-all ${activeListId === list.id ? (isDark ? 'bg-indigo-500/10 text-indigo-400' : 'bg-indigo-50 text-indigo-600') : (isDark ? 'text-slate-400 hover:bg-white/5' : 'text-slate-500 hover:bg-slate-50')}`}
                                >
                                    <div className="flex items-center gap-3">
                                        <Hash size={16} />
                                        <span className="text-sm font-bold">{list.name}</span>
                                    </div>
                                    {activeListId === list.id && <div className="w-1.5 h-1.5 rounded-full bg-indigo-500" />}
                                </button>
                                {list.id !== 'default' && (
                                    <button onClick={(e) => { e.stopPropagation(); deleteList(list.id); }} className="absolute right-2 top-1/2 -translate-y-1/2 p-1 opacity-0 group-hover:opacity-100 text-red-500 hover:bg-red-50 rounded">
                                        <Trash2 size={12} />
                                    </button>
                                )}
                            </div>
                        ))}
                    </nav>

                    <button onClick={() => setIsAddingList(true)} className="mt-6 flex items-center gap-2 text-[10px] font-black tracking-widest text-slate-500 hover:text-indigo-500">
                        <Plus size={14} /> NOUVELLE LISTE
                    </button>
                    {isAddingList && (
                        <input autoFocus className={`mt-2 w-full px-3 py-2 text-sm rounded-lg border outline-none ${isDark ? 'bg-slate-800 border-white/10' : 'bg-white border-slate-200'}`} placeholder="Nom..." value={newListTitle} onChange={e => setNewListTitle(e.target.value)} onKeyDown={e => e.key === 'Enter' && addList()} />
                    )}
                </div>
            </aside>

            {/* MAIN */}
            <main className="flex-1 flex flex-col overflow-hidden">
                <header className="p-6 md:p-8 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                    <div className="flex items-center gap-6">
                        <div className="relative w-16 h-16 md:w-20 md:h-20 flex items-center justify-center shrink-0">
                            <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
                                <circle cx="50" cy="50" r={radius} stroke={isDark ? "rgba(255,255,255,0.05)" : "#e2e8f0"} strokeWidth="8" fill="none" />
                                <circle cx="50" cy="50" r={radius} stroke="currentColor" strokeWidth="8" fill="none" strokeDasharray={circumference} strokeDashoffset={strokeDashoffset} className="text-indigo-500 transition-all duration-1000 ease-out" strokeLinecap="round" />
                            </svg>
                            <span className="absolute text-sm font-bold">{stats.percentage}%</span>
                        </div>
                        <div>
                            <h2 className="text-xl md:text-3xl font-black">{todoLists.find(l => l.id === activeListId)?.name}</h2>
                            <p className="text-xs md:text-sm text-slate-500">{stats.completed} terminées sur {stats.total}</p>
                        </div>
                    </div>

                    <div className={`flex p-1 rounded-xl border ${isDark ? 'bg-slate-900 border-white/5' : 'bg-white border-slate-200 shadow-sm'}`}>
                        <button onClick={() => setViewMode('list')} className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition-all ${viewMode === 'list' ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-500 hover:text-slate-300'}`}><List size={16} /> Liste</button>
                        <button onClick={() => setViewMode('kanban')} className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition-all ${viewMode === 'kanban' ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-500 hover:text-slate-300'}`}><LayoutDashboard size={16} /> Kanban</button>
                    </div>
                </header>

                <div className="flex-1 overflow-y-auto px-6 md:px-8 pb-24">
                    
                    {/* FORMULAIRE (LOGIQUE ORIGINALE PRÉSERVÉE) */}
                    <div className="mb-8 max-w-4xl">
                        <form onSubmit={addTask} className={`rounded-2xl border p-2 shadow-xl transition-all ${isDark ? 'bg-slate-900/40 border-white/5 focus-within:border-indigo-500/50' : 'bg-white border-slate-200 focus-within:border-indigo-400'}`}>
                            <div className="flex items-center gap-3 px-4 py-2">
                                <input type="text" placeholder="Nouvelle tâche..." value={newTaskText} onChange={(e) => setNewTaskText(e.target.value)} className="flex-1 bg-transparent border-none outline-none text-lg py-2" />
                                <button type="submit" className="p-3 bg-indigo-600 text-white rounded-xl hover:scale-105 active:scale-95 transition-all shadow-lg shadow-indigo-600/20"><Plus size={20} /></button>
                            </div>
                            <div className={`flex items-center gap-4 px-4 pb-2 border-t pt-3 ${isDark ? 'border-white/5' : 'border-slate-100'}`}>
                                <div className="flex items-center gap-2">
                                    <span className="text-[10px] font-black text-slate-500 uppercase">Priorité</span>
                                    <select value={newTaskPriority} onChange={e => setNewTaskPriority(e.target.value)} className="bg-transparent text-[10px] font-bold outline-none uppercase">
                                        <option value="low">Basse</option>
                                        <option value="medium">Moyenne</option>
                                        <option value="high">Haute</option>
                                    </select>
                                </div>
                                <div className="h-4 w-px bg-slate-200 dark:bg-white/5" />
                                <input type="date" value={newTaskDeadline} onChange={e => setNewTaskDeadline(e.target.value)} className={`bg-transparent text-[10px] font-bold outline-none uppercase ${isDark ? '[color-scheme:dark]' : ''}`} />
                            </div>
                        </form>
                    </div>

                    {/* VUE LISTE (TON DESIGN ORIGINAL + RE-STYLISÉ) */}
                    {viewMode === 'list' && (
                        <div className="space-y-3 max-w-4xl">
                            <div className="flex justify-between items-center mb-4">
                                <div className="flex gap-2 bg-slate-900/10 dark:bg-slate-900/50 p-1 rounded-lg">
                                    {['all', 'active', 'completed'].map(f => (
                                        <button key={f} onClick={() => setFilter(f)} className={`px-4 py-1.5 rounded-md text-xs font-bold transition-all ${filter === f ? 'bg-indigo-500 text-white shadow-md' : 'text-slate-500 hover:text-slate-300'}`}>
                                            {f === 'all' ? 'Toutes' : f === 'active' ? 'À faire' : 'Terminées'}
                                        </button>
                                    ))}
                                </div>
                                {stats.completed > 0 && <button onClick={clearCompleted} className="text-[10px] font-black text-red-500 uppercase tracking-widest hover:underline">Vider terminées</button>}
                            </div>

                            {filteredTodos.map(todo => {
                                const pConf = priorityConfig[todo.priority] || priorityConfig.medium;
                                return (
                                    <div key={todo.id} className={`group flex items-center gap-4 p-4 rounded-2xl border transition-all ${todo.completed ? 'opacity-50' : ''} ${isDark ? 'bg-slate-900/40 border-white/5 hover:border-white/10' : 'bg-white border-slate-100 hover:border-indigo-200 shadow-sm'}`}>
                                        <button onClick={() => toggleTodo(todo.id)} className={`shrink-0 w-6 h-6 rounded-lg border-2 flex items-center justify-center transition-all ${todo.completed ? 'bg-green-500 border-green-500 text-white' : 'border-slate-300 hover:border-green-500'}`}>
                                            {todo.completed && <CheckCircle2 size={16} />}
                                        </button>
                                        <div className="flex-1 min-w-0">
                                            <p className={`text-base font-bold ${todo.completed ? 'line-through text-slate-500' : ''}`}>{todo.text}</p>
                                            <div className="flex items-center gap-3 mt-1">
                                                <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded border ${pConf.bg} ${pConf.color} ${pConf.border}`}>{pConf.label}</span>
                                                {todo.deadline && <span className="text-[9px] font-bold text-slate-400 flex items-center gap-1"><Clock size={10}/> {new Date(todo.deadline).toLocaleDateString()}</span>}
                                            </div>
                                        </div>
                                        <button onClick={() => deleteTodo(todo.id)} className="opacity-0 group-hover:opacity-100 p-2 text-slate-400 hover:text-red-500 transition-all"><Trash2 size={18}/></button>
                                    </div>
                                );
                            })}
                        </div>
                    )}

                    {/* VUE KANBAN (NOUVEAUTÉ SANS BUG) */}
                    {viewMode === 'kanban' && (
                        <div className="flex gap-6 h-full overflow-x-auto no-scrollbar min-h-[500px]">
                            {[
                                { id: 'todo', title: 'À Faire', color: 'text-slate-400', next: 'doing' },
                                { id: 'doing', title: 'En cours', color: 'text-indigo-400', next: 'done', prev: 'todo' },
                                { id: 'done', title: 'Terminé', color: 'text-green-400', prev: 'doing' }
                            ].map(column => (
                                <div key={column.id} className="w-80 shrink-0 flex flex-col">
                                    <h3 className={`text-xs font-black uppercase tracking-widest mb-4 flex items-center gap-2 ${column.color}`}>
                                        <div className={`w-2 h-2 rounded-full bg-current`} />
                                        {column.title}
                                    </h3>
                                    <div className={`flex-1 rounded-2xl p-3 border-2 border-dashed space-y-3 ${isDark ? 'bg-slate-900/20 border-white/5' : 'bg-slate-50 border-slate-200/50'}`}>
                                        {todos
                                            .filter(t => (t.listId || 'default') === activeListId && (column.id === 'done' ? t.completed : !t.completed && (t.status === column.id || (!t.status && column.id === 'todo'))))
                                            .map(todo => (
                                                <div key={todo.id} className={`p-4 rounded-xl border shadow-xl relative group ${isDark ? 'bg-slate-800 border-white/5' : 'bg-white border-slate-200'}`}>
                                                    <p className="text-sm font-bold mb-3">{todo.text}</p>
                                                    <div className="flex justify-between items-center">
                                                        <span className={`text-[8px] font-black uppercase px-2 py-0.5 rounded-full ${priorityConfig[todo.priority].bg} ${priorityConfig[todo.priority].color}`}>{priorityConfig[todo.priority].label}</span>
                                                        <div className="flex gap-1">
                                                            {column.prev && <button onClick={() => updateStatus(todo.id, column.prev)} className="p-1 hover:bg-slate-700 rounded"><ArrowRight size={14} className="rotate-180" /></button>}
                                                            {column.next && <button onClick={() => updateStatus(todo.id, column.next)} className="p-1 hover:bg-slate-700 rounded"><ArrowRight size={14}/></button>}
                                                        </div>
                                                    </div>
                                                </div>
                                            ))}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </main>
        </div>
    );
}