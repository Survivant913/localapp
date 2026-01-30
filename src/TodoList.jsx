import { useState, useMemo } from 'react';
import { 
    CheckCircle2, Circle, Plus, Trash2, Calendar, Flag, 
    Filter, CheckSquare, AlertCircle, X, ListTodo,
    LayoutDashboard, List, MoreVertical, ChevronRight,
    Search, Clock, Hash
} from 'lucide-react';

export default function TodoList({ data, updateData }) {
    // --- ÉTATS ORIGINAUX PRÉSERVÉS ---
    const [newTaskText, setNewTaskText] = useState('');
    const [newTaskPriority, setNewTaskPriority] = useState('medium');
    const [newTaskDeadline, setNewTaskDeadline] = useState('');
    const [filter, setFilter] = useState('all');

    // --- NOUVEAUX ÉTATS (MULTI-LISTES & KANBAN) ---
    const [viewMode, setViewMode] = useState('list'); // 'list' ou 'kanban'
    const [activeListId, setActiveListId] = useState('default');
    const [isAddingList, setIsAddingList] = useState(false);
    const [newListTitle, setNewListTitle] = useState('');

    // Sécurisation données (Structure préservée)
    const todos = data.todos || [];
    const todoLists = data.todoLists || [{ id: 'default', name: 'Ma Journée', color: 'indigo' }];

    // --- STATISTIQUES (LOGIQUE ORIGINALE PRÉSERVÉE) ---
    const stats = useMemo(() => {
        // Stats filtrées par la liste active
        const currentTodos = todos.filter(t => (t.listId || 'default') === activeListId);
        const total = currentTodos.length;
        const completed = currentTodos.filter(t => t.completed).length;
        const percentage = total === 0 ? 0 : Math.round((completed / total) * 100);
        return { total, completed, percentage };
    }, [todos, activeListId]);

    // --- CONFIGURATION JAUGE (MATHS ORIGINALES PRÉSERVÉES) ---
    const radius = 40;
    const circumference = 2 * Math.PI * radius;
    const strokeDashoffset = circumference - (stats.percentage / 100) * circumference;

    // --- ACTIONS (LOGIQUE ORIGINALE ENRICHIE) ---
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
            listId: activeListId, // Lien vers la liste active
            status: 'todo' // Pour le Kanban
        };

        updateData({ ...data, todos: [newTodo, ...todos] }, { table: 'todos', data: newTodo, action: 'insert' });
        
        setNewTaskText('');
        setNewTaskPriority('medium');
        setNewTaskDeadline('');
    };

    const toggleTodo = (id) => {
        const updatedTodos = todos.map(t => 
            t.id === id ? { ...t, completed: !t.completed, status: !t.completed ? 'done' : 'todo' } : t
        );
        const target = updatedTodos.find(t => t.id === id);
        updateData({ ...data, todos: updatedTodos }, { table: 'todos', id, data: { completed: target.completed, status: target.status }, action: 'update' });
    };

    const deleteTodo = (id) => {
        if(window.confirm("Supprimer cette tâche ?")) {
            updateData({ ...data, todos: todos.filter(t => t.id !== id) }, { table: 'todos', id, action: 'delete' });
        }
    };

    const clearCompleted = () => {
        if(window.confirm("Supprimer toutes les tâches terminées de cette liste ?")) {
            const activeTodos = todos.filter(t => !t.completed || (t.listId || 'default') !== activeListId);
            updateData({ ...data, todos: activeTodos });
        }
    };

    // --- GESTION DES LISTES ---
    const addList = () => {
        if (!newListTitle.trim()) return;
        const newList = { id: Date.now().toString(), name: newListTitle, color: 'purple' };
        updateData({ ...data, todoLists: [...todoLists, newList] });
        setNewListTitle('');
        setIsAddingList(false);
        setActiveListId(newList.id);
    };

    // --- FILTRAGE & TRI (LOGIQUE ORIGINALE PRÉSERVÉE) ---
    const filteredTodos = useMemo(() => {
        return todos
            .filter(t => (t.listId || 'default') === activeListId) // Filtre par liste
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

    // --- CONFIGURATION VISUELLE PREMIUM ---
    const priorityConfig = {
        high: { color: 'text-rose-400', bg: 'bg-rose-500/10', border: 'border-rose-500/20', glow: 'shadow-rose-500/20', label: 'Urgent' },
        medium: { color: 'text-amber-400', bg: 'bg-amber-500/10', border: 'border-amber-500/20', glow: 'shadow-amber-500/20', label: 'Important' },
        low: { color: 'text-emerald-400', bg: 'bg-emerald-500/10', border: 'border-emerald-500/20', glow: 'shadow-emerald-500/20', label: 'Standard' },
    };

    return (
        <div className="flex h-screen bg-[#0f172a] text-slate-200 overflow-hidden font-sans">
            
            {/* --- SIDEBAR DES LISTES (PREMIUM DARK) --- */}
            <aside className="w-64 bg-slate-900/50 border-r border-white/5 backdrop-blur-xl flex flex-col hidden md:flex">
                <div className="p-6">
                    <div className="flex items-center gap-3 mb-8">
                        <div className="p-2 bg-indigo-600 rounded-lg shadow-lg shadow-indigo-500/20">
                            <ListTodo className="text-white" size={20} />
                        </div>
                        <h1 className="text-lg font-bold tracking-tight text-white">Mes Espaces</h1>
                    </div>

                    <nav className="space-y-1">
                        {todoLists.map(list => (
                            <button
                                key={list.id}
                                onClick={() => setActiveListId(list.id)}
                                className={`w-full flex items-center justify-between px-3 py-2 rounded-xl transition-all duration-200 group ${activeListId === list.id ? 'bg-indigo-500/10 text-indigo-400' : 'text-slate-400 hover:bg-white/5 hover:text-slate-200'}`}
                            >
                                <div className="flex items-center gap-3">
                                    <Hash size={16} className={activeListId === list.id ? 'text-indigo-400' : 'text-slate-600'} />
                                    <span className="text-sm font-medium">{list.name}</span>
                                </div>
                                {activeListId === list.id && <div className="w-1.5 h-1.5 rounded-full bg-indigo-400 shadow-[0_0_8px_rgba(129,140,248,0.6)]" />}
                            </button>
                        ))}
                    </nav>

                    <div className="mt-6">
                        {isAddingList ? (
                            <div className="space-y-2 animate-in slide-in-from-top-2">
                                <input 
                                    autoFocus
                                    className="w-full bg-slate-800 border border-white/10 rounded-lg px-3 py-2 text-sm outline-none focus:border-indigo-500"
                                    placeholder="Nom de la liste..."
                                    value={newListTitle}
                                    onChange={e => setNewListTitle(e.target.value)}
                                    onKeyDown={e => e.key === 'Enter' && addList()}
                                />
                                <div className="flex gap-2">
                                    <button onClick={addList} className="flex-1 bg-indigo-600 text-xs py-1.5 rounded-md font-bold text-white">Créer</button>
                                    <button onClick={() => setIsAddingList(false)} className="px-2 bg-slate-700 text-xs rounded-md"><X size={14}/></button>
                                </div>
                            </div>
                        ) : (
                            <button 
                                onClick={() => setIsAddingList(true)}
                                className="w-full flex items-center gap-2 px-3 py-2 text-xs font-bold text-slate-500 hover:text-indigo-400 transition-colors"
                            >
                                <Plus size={14} /> NOUVELLE LISTE
                            </button>
                        )}
                    </div>
                </div>
            </aside>

            {/* --- CONTENU PRINCIPAL --- */}
            <main className="flex-1 flex flex-col overflow-hidden relative">
                
                {/* Header Contextuel */}
                <header className="p-6 md:p-8 flex flex-col md:flex-row justify-between items-start md:items-center gap-6 z-10">
                    <div className="flex items-center gap-6">
                        {/* Jauge Circulaire Originale (Stylisée Premium) */}
                        <div className="relative w-16 h-16 flex items-center justify-center shrink-0">
                            <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
                                <circle cx="50" cy="50" r={radius} stroke="rgba(255,255,255,0.05)" strokeWidth="6" fill="none" />
                                <circle 
                                    cx="50" cy="50" r={radius} stroke="currentColor" strokeWidth="6" fill="none" 
                                    strokeDasharray={circumference} strokeDashoffset={strokeDashoffset} 
                                    className="text-indigo-500 transition-all duration-1000 ease-out" strokeLinecap="round" 
                                />
                            </svg>
                            <span className="absolute text-xs font-black text-white">{stats.percentage}%</span>
                        </div>
                        <div>
                            <h2 className="text-2xl md:text-3xl font-black text-white tracking-tight">
                                {todoLists.find(l => l.id === activeListId)?.name}
                            </h2>
                            <p className="text-sm text-slate-500 font-medium">
                                {stats.completed} objectifs atteints sur {stats.total}
                            </p>
                        </div>
                    </div>

                    <div className="flex bg-slate-900/80 p-1 rounded-xl border border-white/5 backdrop-blur-md">
                        <button 
                            onClick={() => setViewMode('list')}
                            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition-all ${viewMode === 'list' ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-500 hover:text-slate-300'}`}
                        >
                            <List size={16} /> Liste
                        </button>
                        <button 
                            onClick={() => setViewMode('kanban')}
                            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition-all ${viewMode === 'kanban' ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-500 hover:text-slate-300'}`}
                        >
                            <LayoutDashboard size={16} /> Kanban
                        </button>
                    </div>
                </header>

                <div className="flex-1 overflow-y-auto px-6 md:px-8 pb-24 custom-scrollbar">
                    
                    {/* FORMULAIRE D'AJOUT PREMIUM */}
                    <div className="mb-8">
                        <form onSubmit={addTask} className="bg-slate-900/40 border border-white/5 rounded-2xl p-2 focus-within:border-indigo-500/50 transition-all backdrop-blur-sm group shadow-2xl">
                            <div className="flex items-center gap-3 px-4 py-2">
                                <input 
                                    type="text" placeholder="Ajouter un objectif à cette liste..." value={newTaskText} onChange={(e) => setNewTaskText(e.target.value)}
                                    className="flex-1 bg-transparent border-none outline-none text-white placeholder-slate-600 text-lg py-2"
                                />
                                <button type="submit" className="p-3 bg-indigo-600 text-white rounded-xl hover:scale-105 active:scale-95 transition-all shadow-lg shadow-indigo-600/20">
                                    <Plus size={20} />
                                </button>
                            </div>
                            <div className="flex items-center gap-4 px-4 pb-2 border-t border-white/5 pt-3">
                                <div className="flex items-center gap-2">
                                    <span className="text-[10px] font-black text-slate-600 uppercase tracking-widest">Priorité</span>
                                    <div className="flex bg-slate-950/50 p-1 rounded-lg gap-1">
                                        {['low', 'medium', 'high'].map(p => (
                                            <button 
                                                key={p} type="button" onClick={() => setNewTaskPriority(p)}
                                                className={`px-3 py-1 rounded-md text-[10px] font-bold uppercase transition-all ${newTaskPriority === p ? 'bg-white/10 text-white shadow-inner' : 'text-slate-600 hover:text-slate-400'}`}
                                            >
                                                {p === 'low' ? 'Basse' : p === 'medium' ? 'Moyenne' : 'Haute'}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                                <div className="h-4 w-px bg-white/5" />
                                <div className="flex items-center gap-2 text-slate-500 hover:text-indigo-400 transition-colors cursor-pointer">
                                    <Calendar size={14} />
                                    <input type="date" value={newTaskDeadline} onChange={e => setNewTaskDeadline(e.target.value)} className="bg-transparent text-[10px] font-bold outline-none uppercase [color-scheme:dark]" />
                                </div>
                            </div>
                        </form>
                    </div>

                    {/* --- VUE LISTE (REFONTE PREMIUM) --- */}
                    {viewMode === 'list' && (
                        <div className="space-y-4 max-w-4xl">
                            <div className="flex justify-between items-center mb-4">
                                <div className="flex gap-2 bg-slate-900/50 p-1 rounded-lg">
                                    {['all', 'active', 'completed'].map(f => (
                                        <button key={f} onClick={() => setFilter(f)} className={`px-4 py-1.5 rounded-md text-xs font-bold transition-all ${filter === f ? 'bg-indigo-500 text-white' : 'text-slate-500 hover:text-slate-300'}`}>
                                            {f === 'all' ? 'Toutes' : f === 'active' ? 'En cours' : 'Terminées'}
                                        </button>
                                    ))}
                                </div>
                                {stats.completed > 0 && <button onClick={clearCompleted} className="text-[10px] font-bold text-rose-500/70 hover:text-rose-400 transition-colors uppercase tracking-widest">Nettoyer la liste</button>}
                            </div>

                            <div className="space-y-3">
                                {filteredTodos.map(todo => {
                                    const pConf = priorityConfig[todo.priority];
                                    return (
                                        <div key={todo.id} className={`group flex items-center gap-4 p-4 rounded-2xl border transition-all duration-300 ${todo.completed ? 'bg-slate-900/20 border-white/5 opacity-40' : 'bg-slate-900/40 border-white/5 hover:border-white/10 hover:translate-x-1 shadow-xl'}`}>
                                            <button onClick={() => toggleTodo(todo.id)} className={`shrink-0 w-6 h-6 rounded-lg border-2 flex items-center justify-center transition-all ${todo.completed ? 'bg-indigo-500 border-indigo-500 text-white' : 'border-slate-700 hover:border-indigo-500'}`}>
                                                {todo.completed && <CheckCircle2 size={16} />}
                                            </button>
                                            
                                            <div className="flex-1 min-w-0">
                                                <p className={`text-base font-medium ${todo.completed ? 'line-through text-slate-500' : 'text-slate-100'}`}>{todo.text}</p>
                                                <div className="flex items-center gap-4 mt-1">
                                                    <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded border ${pConf.bg} ${pConf.color} ${pConf.border} ${pConf.glow}`}>
                                                        {pConf.label}
                                                    </span>
                                                    {todo.deadline && (
                                                        <span className="flex items-center gap-1.5 text-[10px] font-bold text-slate-500">
                                                            <Clock size={10} /> {new Date(todo.deadline).toLocaleDateString()}
                                                        </span>
                                                    )}
                                                </div>
                                            </div>

                                            <button onClick={() => deleteTodo(todo.id)} className="opacity-0 group-hover:opacity-100 p-2 text-slate-600 hover:text-rose-500 transition-all">
                                                <Trash2 size={18} />
                                            </button>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    )}

                    {/* --- VUE KANBAN (NOUVEAUTÉ) --- */}
                    {viewMode === 'kanban' && (
                        <div className="flex gap-6 h-full min-h-[500px] overflow-x-auto no-scrollbar pb-10">
                            {[
                                { id: 'todo', title: 'À Faire', icon: Circle, color: 'text-slate-400' },
                                { id: 'doing', title: 'En cours', icon: Clock, color: 'text-indigo-400' },
                                { id: 'done', title: 'Terminé', icon: CheckCircle2, color: 'text-emerald-400' }
                            ].map(column => (
                                <div key={column.id} className="w-80 flex flex-col shrink-0">
                                    <div className="flex items-center justify-between mb-4 px-2">
                                        <div className="flex items-center gap-2">
                                            <column.icon size={16} className={column.color} />
                                            <h3 className="text-sm font-black uppercase tracking-widest text-white">{column.title}</h3>
                                            <span className="bg-slate-800 text-slate-400 text-[10px] px-2 py-0.5 rounded-full">
                                                {todos.filter(t => (t.listId || 'default') === activeListId && (column.id === 'done' ? t.completed : !t.completed && (t.status === column.id || (!t.status && column.id === 'todo')))).length}
                                            </span>
                                        </div>
                                    </div>
                                    
                                    <div className="flex-1 bg-slate-900/20 rounded-2xl p-3 border border-dashed border-white/5 space-y-3">
                                        {todos
                                            .filter(t => (t.listId || 'default') === activeListId)
                                            .filter(t => {
                                                if (column.id === 'done') return t.completed;
                                                if (column.id === 'todo') return !t.completed && (!t.status || t.status === 'todo');
                                                if (column.id === 'doing') return !t.completed && t.status === 'doing';
                                                return false;
                                            })
                                            .map(todo => (
                                                <div key={todo.id} className="bg-slate-800/80 border border-white/5 p-4 rounded-xl shadow-xl group cursor-grab active:cursor-grabbing">
                                                    <div className="flex justify-between items-start mb-3">
                                                        <span className={`text-[8px] font-black uppercase px-2 py-0.5 rounded border ${priorityConfig[todo.priority].bg} ${priorityConfig[todo.priority].color} ${priorityConfig[todo.priority].border}`}>
                                                            {priorityConfig[todo.priority].label}
                                                        </span>
                                                        <button onClick={() => deleteTodo(todo.id)} className="opacity-0 group-hover:opacity-100 text-slate-600 hover:text-rose-500 transition-all">
                                                            <X size={14} />
                                                        </button>
                                                    </div>
                                                    <p className="text-sm font-medium text-slate-200 mb-3 line-clamp-2">{todo.text}</p>
                                                    <div className="flex justify-between items-center mt-auto">
                                                        {todo.deadline ? (
                                                            <div className="flex items-center gap-1.5 text-[10px] text-slate-500">
                                                                <Calendar size={10} /> {new Date(todo.deadline).toLocaleDateString()}
                                                            </div>
                                                        ) : <div />}
                                                        <button onClick={() => toggleTodo(todo.id)} className={`w-6 h-6 rounded flex items-center justify-center border transition-all ${todo.completed ? 'bg-emerald-500/20 border-emerald-500/50 text-emerald-400' : 'border-slate-700 hover:border-indigo-500 text-slate-500'}`}>
                                                            <CheckCircle2 size={14} />
                                                        </button>
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