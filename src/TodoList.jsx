import { useState, useMemo, useEffect } from 'react';
import { 
    CheckCircle2, Circle, Plus, Trash2, Calendar, Flag, 
    Filter, CheckSquare, AlertCircle, X, ListTodo,
    LayoutDashboard, List, ChevronRight, Clock, Hash, ArrowRight,
    GripVertical, ChevronLeft, PanelLeftClose, PanelLeftOpen,
    Edit2, Users
} from 'lucide-react';

export default function TodoList({ data, updateData }) {
    const generateUUID = () => {
        try {
            if (typeof crypto !== 'undefined' && crypto.randomUUID) {
                return crypto.randomUUID();
            }
        } catch (e) {}
        return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
            const r = Math.random() * 16 | 0, v = c === 'x' ? r : (r & 0x3 | 0x8);
            return v.toString(16);
        });
    };
    // --- ÉTATS ORIGINAUX (CONSERVÉS À 100%) ---
    const [newTaskText, setNewTaskText] = useState('');
    const [newTaskPriority, setNewTaskPriority] = useState('medium'); 
    const [newTaskDeadline, setNewTaskDeadline] = useState('');
    const [filter, setFilter] = useState('all'); 

    // --- ÉTATS DE NAVIGATION ET DRAG & DROP (CONSERVÉS À 100%) ---
    const [viewMode, setViewMode] = useState('list'); 
    const [activeListId, setActiveListId] = useState('default');
    const [isAddingList, setIsAddingList] = useState(false);
    const [newListTitle, setNewListTitle] = useState('');
    const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false); 
    const [draggingTaskId, setDraggingTaskId] = useState(null); 

    // --- NOUVEL ÉTAT : MODIFICATION DE TÂCHE ---
    const [editingTaskId, setEditingTaskId] = useState(null);

    const isDark = data.settings?.theme === 'dark';

    // --- PARTAGE ---
    const [showShareModal, setShowShareModal] = useState(false);
    const [shareEmail, setShareEmail] = useState('');

    // Sécurisation données (Structure préservée)
    const todos = data.todos || [];
    const todoListsFromData = data.todoLists || [];
    const sharedListIds = (data.todo_list_shares || [])
        .filter(s => s.user_email?.toLowerCase() === data.profile?.email?.toLowerCase())
        .map(s => String(s.list_id));
    
    const allLists = [
        { id: 'default', name: 'To-Do', color: 'indigo' }, 
        ...todoListsFromData.filter(l => 
            !l.user_id || l.user_id === data.profile?.id || 
            sharedListIds.includes(String(l.id))
        )
    ];

    const isSharedWithMe = (listId) => {
        if (listId === 'default') return false;
        const list = todoListsFromData.find(l => String(l.id) === String(listId));
        return list && list.user_id && data.profile?.id && list.user_id !== data.profile.id;
    };

    // --- STATISTIQUES (TON CODE ORIGINAL) ---
    const stats = useMemo(() => {
        const currentTodos = todos.filter(t => (t.listId || t.list_id || 'default') === activeListId);
        const total = currentTodos.length;
        const completed = currentTodos.filter(t => t.completed).length;
        const percentage = total === 0 ? 0 : Math.round((completed / total) * 100);
        return { total, completed, percentage };
    }, [todos, activeListId]);

    // --- CONFIGURATION JAUGE (TES MATHS EXACTES) ---
    const radius = 40; 
    const circumference = 2 * Math.PI * radius; 
    const strokeDashoffset = circumference - (stats.percentage / 100) * circumference; 

    // --- LOGIQUE DRAG & DROP NATIVE (CONSERVÉE À 100%) ---
    const handleDragStart = (e, taskId) => {
        setDraggingTaskId(taskId);
        e.dataTransfer.setData('taskId', taskId);
        e.dataTransfer.effectAllowed = 'move';
    };

    const handleDragOver = (e) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
    };

    const handleDrop = (e, newStatus) => {
        e.preventDefault();
        const taskId = e.dataTransfer.getData('taskId');
        if (taskId) {
            updateStatus(Number(taskId), newStatus);
        }
        setDraggingTaskId(null);
    };

    // --- LOGIQUE AJOUT ET MODIFICATION ---
    const handleSaveTask = (e) => {
        if (e) e.preventDefault();
        if (!newTaskText.trim()) return;

        if (editingTaskId) {
            const updatedTodos = todos.map(t => {
                if (t.id === editingTaskId) {
                    const updated = { 
                        ...t, 
                        text: newTaskText, 
                        priority: newTaskPriority, 
                        deadline: newTaskDeadline || null 
                    };
                    updateData({ ...data, todos: todos.map(tod => tod.id === editingTaskId ? updated : tod) }, { table: 'todos', id: editingTaskId, data: { text: updated.text, priority: updated.priority, deadline: updated.deadline }, action: 'update' });
                    return updated;
                }
                return t;
            });
            setEditingTaskId(null);
            setNewTaskText('');
            return;
        }

        const newTodo = {
            id: Date.now(),
            text: newTaskText,
            completed: false,
            priority: newTaskPriority,
            deadline: newTaskDeadline || null,
            list_id: activeListId,
            status: 'todo',
            user_id: data.profile?.id
        };

        const newTodos = [...todos, newTodo];
        updateData({ ...data, todos: newTodos }, { table: 'todos', data: newTodo, action: 'insert' });

        setNewTaskText('');
        setNewTaskDeadline('');
        setNewTaskPriority('medium');
    };

    // Lancer la modification
    const startEditing = (todo) => {
        setEditingTaskId(todo.id);
        setNewTaskText(todo.text);
        setNewTaskPriority(todo.priority || 'medium');
        setNewTaskDeadline(todo.deadline || '');
    };

    const toggleTodo = (id) => {
        const updatedTodos = todos.map(t => {
            if (t.id === id) {
                const isNowCompleted = !t.completed;
                return { ...t, completed: isNowCompleted, status: isNowCompleted ? 'done' : 'todo' };
            }
            return t;
        });
        const target = updatedTodos.find(t => t.id === id);
        updateData({ ...data, todos: updatedTodos }, { table: 'todos', id, data: { completed: target.completed, status: target.status }, action: 'update' });
    };

    const updateStatus = (id, newStatus) => {
        const updatedTodos = todos.map(t => 
            t.id === id ? { ...t, status: newStatus, completed: newStatus === 'done' } : t
        );
        const target = updatedTodos.find(t => t.id === id);
        updateData({ ...data, todos: updatedTodos }, { table: 'todos', id, data: { status: newStatus, completed: target.completed }, action: 'update' });
    };

    const deleteTodo = (id) => {
        if(window.confirm("Supprimer cette tâche ?")) {
            const target = todos.find(t => t.id === id);
            updateData({ ...data, todos: todos.filter(t => t.id !== id) }, { table: 'todos', id, action: 'delete', data: { list_id: target?.listId || target?.list_id } });
        }
    };

    const addList = () => {
        if (!newListTitle.trim()) return;
        const listId = Date.now().toString();
        const newList = { id: listId, name: newListTitle, color: 'purple', user_id: data.profile?.id };
        
        const newLists = [...todoListsFromData, newList];
        
        updateData({ ...data, todoLists: newLists }, { table: 'todo_lists', data: newList, action: 'insert' });

        setNewListTitle('');
        setIsAddingList(false);
        setActiveListId(newList.id);
    };

    const deleteList = (id) => {
        if (id === 'default') return;
        if (window.confirm("Supprimer cette liste et toutes ses tâches ?")) {
            const newLists = todoListsFromData.filter(l => l.id !== id);
            const newTodos = todos.filter(t => (t.listId !== id && t.list_id !== id));
            updateData({ ...data, todoLists: newLists, todos: newTodos }, { table: 'todo_lists', id, action: 'delete' });
            setActiveListId('default');
        }
    };

    const clearCompleted = () => {
        if(window.confirm("Supprimer toutes les tâches terminées de cette liste ?")) {
            const todosToDelete = todos.filter(t => t.completed && (t.listId || t.list_id || 'default') === activeListId);
            if (todosToDelete.length === 0) return;
            const activeTodos = todos.filter(t => !t.completed || (t.listId || t.list_id || 'default') !== activeListId);
            updateData({ ...data, todos: activeTodos });
            todosToDelete.forEach(todo => {
                updateData({ ...data, todos: activeTodos }, { table: 'todos', id: todo.id, action: 'delete' });
            });
        }
    };

    const addShare = () => {
        if (!shareEmail.trim()) return;
        const cleanEmail = shareEmail.trim().toLowerCase();
        if (cleanEmail === data.profile?.email?.toLowerCase()) return;
        const newShare = { id: generateUUID(), list_id: activeListId, user_email: cleanEmail, owner_id: data.profile?.id };
        updateData(
            { ...data, todo_list_shares: [...(data.todo_list_shares || []), newShare] },
            { table: 'todo_list_shares', data: newShare, action: 'insert' }
        );
        setShareEmail('');
    };

    const removeShare = (id) => {
        updateData({ ...data, todo_list_shares: (data.todo_list_shares || []).filter(s => s.id !== id) }, { table: 'todo_list_shares', id, action: 'delete' });
    };

    const filteredTodos = useMemo(() => {
        return todos
            .filter(t => (t.listId || t.list_id || 'default') === activeListId)
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

    const priorityConfig = {
        high: { color: isDark ? 'text-red-400' : 'text-red-600', bg: isDark ? 'bg-red-900/20' : 'bg-red-50', border: isDark ? 'border-red-800' : 'border-red-200', label: 'Urgent' },
        medium: { color: isDark ? 'text-orange-400' : 'text-orange-600', bg: isDark ? 'bg-orange-900/20' : 'bg-orange-50', border: isDark ? 'border-orange-800' : 'border-orange-200', label: 'Normal' },
        low: { color: isDark ? 'text-blue-400' : 'text-blue-600', bg: isDark ? 'bg-blue-900/20' : 'bg-blue-50', border: isDark ? 'border-blue-800' : 'border-blue-200', label: 'Bas' },
    };

    return (
        <div className={`flex h-screen transition-all duration-200 ${isDark ? 'bg-[#09090b] text-zinc-100' : 'bg-zinc-100 text-zinc-900'}`}>
            
            {/* SIDEBAR RÉTRACTABLE (LOGIQUE INTACTE) */}
            <aside className={`border-r hidden md:flex flex-col transition-all duration-300 ${isSidebarCollapsed ? 'w-20' : 'w-64'} ${isDark ? 'bg-[#09090b] border-zinc-800/80' : 'bg-white border-zinc-200'}`}>
                <div className="p-4 flex flex-col h-full">
                    <div className={`flex items-center gap-3 mb-8 ${isSidebarCollapsed ? 'justify-center' : 'justify-between'}`}>
                        {!isSidebarCollapsed && (
                            <div className="flex items-center gap-3">
                                <div className={`p-2 rounded-lg ${isDark ? 'bg-indigo-600 shadow-indigo-500/20' : 'bg-indigo-500 shadow-indigo-100'}`}>
                                    <ListTodo className="text-white" size={20} />
                                </div>
                                <h1 className="text-lg font-bold tracking-tight whitespace-nowrap">Mes Espaces</h1>
                            </div>
                        )}
                        <button onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)} className={`p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500`}>
                            {isSidebarCollapsed ? <PanelLeftOpen size={20} /> : <PanelLeftClose size={20} />}
                        </button>
                    </div>

                    <nav className="space-y-1 flex-1 overflow-y-auto no-scrollbar">
                        {allLists.map(list => (
                            <div key={list.id} className="group relative">
                                <button
                                    onClick={() => setActiveListId(list.id)}
                                    className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all ${activeListId === list.id ? (isDark ? 'bg-white text-[#09090b] font-semibold' : 'bg-zinc-900 text-white font-semibold') : (isDark ? 'text-zinc-400 hover:bg-zinc-900 hover:text-zinc-100' : 'text-zinc-500 hover:bg-zinc-100')} ${isSidebarCollapsed ? 'justify-center' : ''}`}
                                    title={list.name}
                                >
                                    <Hash size={18} className="shrink-0" />
                                    {!isSidebarCollapsed && <span className="text-sm font-bold truncate">{list.name}</span>}
                                    {!isSidebarCollapsed && activeListId === list.id && <div className="w-1.5 h-1.5 rounded-full bg-indigo-500 shrink-0" />}
                                </button>
                                {!isSidebarCollapsed && list.id !== 'default' && (
                                    <button onClick={(e) => { e.stopPropagation(); deleteList(list.id); }} className="absolute right-2 top-1/2 -translate-y-1/2 p-1 opacity-0 group-hover:opacity-100 text-red-500 hover:bg-red-50 rounded transition-opacity">
                                        <Trash2 size={12} />
                                    </button>
                                )}
                            </div>
                        ))}
                    </nav>

                    <button onClick={() => setIsAddingList(true)} className={`mt-4 flex items-center gap-2 text-[10px] font-black tracking-widest text-slate-500 hover:text-indigo-500 ${isSidebarCollapsed ? 'justify-center' : ''}`}>
                        <Plus size={14} /> {!isSidebarCollapsed && "NOUVELLE LISTE"}
                    </button>
                    {isAddingList && !isSidebarCollapsed && (
                        <input autoFocus className={`mt-2 w-full px-3 py-2 text-sm rounded-lg border outline-none ${isDark ? 'bg-slate-800 border-white/10' : 'bg-white border-slate-200'}`} placeholder="Nom..." value={newListTitle} onChange={e => setNewListTitle(e.target.value)} onKeyDown={e => e.key === 'Enter' && addList()} />
                    )}
                </div>
            </aside>

            {/* MAIN */}
            <main className="flex-1 flex flex-col overflow-hidden w-full">
                <header className="p-6 md:p-8 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                    <div className="flex items-center gap-6">
                        <div className="relative w-16 h-16 md:w-20 md:h-20 flex items-center justify-center shrink-0">
                            <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
                                <circle cx="50" cy="50" r={radius} stroke={isDark ? "rgba(255,255,255,0.05)" : "#e2e8f0"} strokeWidth="8" fill="none" />
                                <circle cx="50" cy="50" r={radius} stroke="currentColor" strokeWidth="8" fill="none" strokeDasharray={circumference} strokeDashoffset={strokeDashoffset} className="text-zinc-900 dark:text-white transition-all duration-1000 ease-out" strokeLinecap="round" />
                            </svg>
                            <span className="absolute text-sm font-bold">{stats.percentage}%</span>
                        </div>
                        <div>
                            <div className="flex items-center gap-2">
                                <h2 className="text-xl md:text-3xl font-black">{allLists.find(l => l.id === activeListId)?.name}</h2>
                                {isSharedWithMe(activeListId) && <div className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-100 text-purple-600 dark:bg-purple-900/30 dark:text-purple-400">Partagée</div>}
                            </div>
                            <p className="text-xs md:text-sm text-slate-500">{stats.completed} terminées sur {stats.total}</p>
                        </div>
                    </div>

                    <div className="flex items-center gap-3">
                        {activeListId !== 'default' && (
                            <button onClick={() => setShowShareModal(true)} className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-all border shadow-sm ${isDark ? 'bg-slate-800 border-white/5 hover:bg-slate-700' : 'bg-white border-slate-200 hover:bg-slate-50'}`}>
                                <Users size={16}/> Partage
                            </button>
                        )}
                        <div className={`flex p-1 rounded-xl border ${isDark ? 'bg-slate-900 border-white/5' : 'bg-white border-slate-200 shadow-sm'}`}>
                            <button onClick={() => setViewMode('list')} className={`flex items-center gap-2 px-4 py-1.5 rounded-lg text-xs font-semibold transition-all ${viewMode === 'list' ? 'bg-zinc-900 dark:bg-white text-white dark:text-[#09090b]' : 'text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-200'}`}><List size={15} /> Liste</button>
                            <button onClick={() => setViewMode('kanban')} className={`flex items-center gap-2 px-4 py-1.5 rounded-lg text-xs font-semibold transition-all ${viewMode === 'kanban' ? 'bg-zinc-900 dark:bg-white text-white dark:text-[#09090b]' : 'text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-200'}`}><LayoutDashboard size={15} /> Kanban</button>
                        </div>
                    </div>
                </header>

                <div className="flex-1 overflow-y-auto px-6 md:px-8 pb-24 custom-scrollbar">
                    
                    {/* FORMULAIRE (MODIFIÉ POUR PRENDRE EN CHARGE L'ÉDITION) */}
                    <div className="mb-8 w-full">
                        <form onSubmit={handleSaveTask} className={`rounded-2xl border p-2 transition-all ${isDark ? 'bg-[#111113] border-zinc-800 focus-within:border-zinc-600' : 'bg-white border-zinc-200 focus-within:border-zinc-400'} ${editingTaskId ? 'ring-1 ring-white border-transparent' : ''}`}>
                            <div className="flex items-center gap-3 px-4 py-2">
                                <input 
                                    type="text" 
                                    placeholder={editingTaskId ? "Modifier la tâche..." : "Ajouter une tâche..."} 
                                    value={newTaskText} 
                                    onChange={(e) => setNewTaskText(e.target.value)} 
                                    className="flex-1 bg-transparent border-none outline-none text-lg py-2" 
                                />
                                {editingTaskId && (
                                    <button 
                                        type="button" 
                                        onClick={() => { setEditingTaskId(null); setNewTaskText(''); setNewTaskPriority('medium'); setNewTaskDeadline(''); }} 
                                        className="p-3 text-slate-400 hover:text-red-500 transition-all"
                                        title="Annuler"
                                    >
                                        <X size={20} />
                                    </button>
                                )}
                                <button 
                                    type="submit" 
                                    className="p-2.5 bg-zinc-900 dark:bg-white text-white dark:text-[#09090b] rounded-xl hover:opacity-90 active:scale-95 transition-all"
                                >
                                    {editingTaskId ? <CheckCircle2 size={20} /> : <Plus size={20} />}
                                </button>
                            </div>
                            <div className={`flex items-center gap-4 px-4 pb-2 border-t pt-3 ${isDark ? 'border-white/5' : 'border-slate-100'}`}>
                                <div className="flex items-center gap-2">
                                    <span className="text-[10px] font-black text-slate-500 uppercase">Priorité</span>
                                    <select value={newTaskPriority} onChange={e => setNewTaskPriority(e.target.value)} className="bg-transparent text-[10px] font-bold outline-none uppercase cursor-pointer dark:text-white">
                                        <option value="low" className="dark:bg-slate-900 dark:text-white">Basse</option>
                                        <option value="medium" className="dark:bg-slate-900 dark:text-white">Moyenne</option>
                                        <option value="high" className="dark:bg-slate-900 dark:text-white">Haute</option>
                                    </select>
                                </div>
                                <div className="h-4 w-px bg-slate-200 dark:bg-white/5" />
                                <input type="date" value={newTaskDeadline} onChange={e => setNewTaskDeadline(e.target.value)} className={`bg-transparent text-[10px] font-bold outline-none uppercase ${isDark ? '[color-scheme:dark]' : ''}`} />
                            </div>
                        </form>
                    </div>

                    {/* VUE LISTE (PLEINE LARGEUR) */}
                    {viewMode === 'list' && (
                        <div className="space-y-3 w-full">
                            <div className="flex justify-between items-center mb-4">
                                <div className="flex gap-2 bg-slate-900/10 dark:bg-slate-900/50 p-1 rounded-lg">
                                    {['all', 'active', 'completed'].map(f => (
                                        <button key={f} onClick={() => setFilter(f)} className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${filter === f ? 'bg-zinc-900 dark:bg-white text-white dark:text-[#09090b]' : 'text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-200'}`}>
                                            {f === 'all' ? 'Toutes' : f === 'active' ? 'À faire' : 'Terminées'}
                                        </button>
                                    ))}
                                </div>
                                {stats.completed > 0 && <button onClick={clearCompleted} className="text-[10px] font-black text-red-500 uppercase tracking-widest hover:underline">Vider terminées</button>}
                            </div>

                            {filteredTodos.map(todo => {
                                const pConf = priorityConfig[todo.priority] || priorityConfig.medium;
                                return (
                                    <div key={todo.id} className={`group flex items-center gap-4 p-4 rounded-xl border transition-all ${todo.completed ? 'opacity-45' : ''} ${isDark ? 'bg-[#111113] border-zinc-800 hover:border-zinc-700' : 'bg-white border-zinc-200 hover:border-zinc-400'}`}>
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
                                        <div className="opacity-0 group-hover:opacity-100 flex items-center gap-1 transition-all">
                                            <button onClick={() => startEditing(todo)} className="p-2 text-slate-400 hover:text-blue-500 transition-all"><Edit2 size={18}/></button>
                                            <button onClick={() => deleteTodo(todo.id)} className="p-2 text-slate-400 hover:text-red-500 transition-all"><Trash2 size={18}/></button>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}

                    {/* VUE KANBAN (LARGEUR ADAPTATIVE CORRIGÉE) */}
                    {viewMode === 'kanban' && (
                        <div className="flex gap-6 h-full overflow-x-auto no-scrollbar min-h-[550px] pb-10">
                            {[
                                { id: 'todo', title: 'À Faire', color: 'text-slate-400' },
                                { id: 'doing', title: 'En cours', color: 'text-indigo-400' },
                                { id: 'done', title: 'Terminé', color: 'text-green-400' }
                            ].map(column => (
                                <div 
                                    key={column.id} 
                                    className="flex-1 min-w-[280px] flex flex-col" 
                                    onDragOver={handleDragOver}
                                    onDrop={(e) => handleDrop(e, column.id)}
                                >
                                    <h3 className={`text-xs font-black uppercase tracking-widest mb-4 flex items-center gap-2 ${column.color}`}>
                                        <div className={`w-2 h-2 rounded-full bg-current`} />
                                        {column.title}
                                    </h3>
                                    
                                    <div className={`flex-1 rounded-2xl p-3.5 border border-dashed transition-colors duration-200 ${isDark ? 'bg-[#111113]/50 border-zinc-800 hover:border-zinc-700' : 'bg-zinc-50 border-zinc-200 hover:bg-zinc-100/60'}`}>
                                        {todos
                                            .filter(t => (t.listId || t.list_id || 'default') === activeListId && (column.id === 'done' ? t.completed : !t.completed && (t.status === column.id || (!t.status && column.id === 'todo'))))
                                            .map(todo => (
                                                <div 
                                                    key={todo.id} 
                                                    draggable="true"
                                                    onDragStart={(e) => handleDragStart(e, todo.id)}
                                                    className={`p-4 rounded-xl border relative group mb-3 cursor-default active:scale-[0.99] transition-all ${isDark ? 'bg-[#141416] border-zinc-800 hover:border-zinc-600' : 'bg-white border-zinc-200'}`}
                                                >
                                                    <div className="absolute left-2 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity cursor-grab active:cursor-grabbing p-1">
                                                        <GripVertical size={16} className="text-slate-500" />
                                                    </div>

                                                    {/* Ajout des boutons Edit et Sup sur le Kanban */}
                                                    <div className="absolute right-2 top-2 opacity-0 group-hover:opacity-100 flex gap-1 transition-opacity z-10">
                                                        <button onClick={(e) => { e.stopPropagation(); startEditing(todo); }} className={`p-1.5 rounded-md transition-colors ${isDark ? 'bg-slate-700 hover:bg-slate-600 text-slate-300 hover:text-blue-400' : 'bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-blue-600'}`} title="Modifier">
                                                            <Edit2 size={14}/>
                                                        </button>
                                                        <button onClick={(e) => { e.stopPropagation(); deleteTodo(todo.id); }} className={`p-1.5 rounded-md transition-colors ${isDark ? 'bg-slate-700 hover:bg-slate-600 text-slate-300 hover:text-red-400' : 'bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-red-600'}`} title="Supprimer">
                                                            <Trash2 size={14}/>
                                                        </button>
                                                    </div>

                                                    <div className="pl-4 pr-12">
                                                        <p className="text-sm font-bold mb-3 leading-tight">{todo.text}</p>
                                                        <div className="flex justify-between items-center">
                                                            <span className={`text-[8px] font-black uppercase px-2 py-0.5 rounded-full ${priorityConfig[todo.priority].bg} ${priorityConfig[todo.priority].color}`}>
                                                                {priorityConfig[todo.priority].label}
                                                            </span>
                                                            <button 
                                                                onClick={() => toggleTodo(todo.id)} 
                                                                className={`w-7 h-7 rounded-lg flex items-center justify-center border transition-all ${todo.completed ? 'bg-green-500 border-green-500 text-white' : 'border-slate-300 text-slate-400 hover:border-green-500'}`}
                                                            >
                                                                <CheckCircle2 size={16}/>
                                                            </button>
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

            {/* MODAL DE PARTAGE */}
            {showShareModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm" onClick={() => setShowShareModal(false)}>
                    <div className={`w-full max-w-md rounded-2xl border shadow-2xl overflow-hidden ${isDark ? 'bg-[#111113] border-zinc-800' : 'bg-white border-zinc-200'}`} onClick={e => e.stopPropagation()}>
                        <div className={`px-6 py-4 flex items-center justify-between border-b ${isDark ? 'border-white/10' : 'border-slate-100'}`}>
                            <h3 className="font-black flex items-center gap-2"><Users size={18}/> Partager la liste</h3>
                            <button onClick={() => setShowShareModal(false)} className="text-slate-400 hover:text-slate-600"><X size={20}/></button>
                        </div>
                        <div className="p-6">
                            {!isSharedWithMe(activeListId) ? (
                                <>
                                    <div className="flex gap-2 mb-6">
                                        <input type="email" placeholder="Email de l'invité..." value={shareEmail} onChange={e => setShareEmail(e.target.value)} className={`flex-1 px-4 py-2 rounded-xl outline-none border ${isDark ? 'bg-slate-900 border-white/10' : 'bg-slate-50 border-slate-200'}`} />
                                        <button onClick={addShare} className="px-4 py-2 bg-indigo-600 text-white rounded-xl font-bold">Inviter</button>
                                    </div>
                                    <div className="space-y-2 mt-4">
                                        <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">Membres invités</h4>
                                        {(data.todo_list_shares || [])
                                            .filter(s => String(s.list_id) === String(activeListId) && s.user_email !== data.profile?.email)
                                            .map(share => (
                                            <div key={share.id} className={`flex items-center justify-between p-3 rounded-xl border ${isDark ? 'bg-slate-900/50 border-white/5' : 'bg-slate-50 border-slate-200'}`}>
                                                <span className="text-sm font-medium">{share.user_email}</span>
                                                <button onClick={() => removeShare(share.id)} className="p-1.5 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-md" title="Expulser"><Trash2 size={14}/></button>
                                            </div>
                                        ))}
                                    </div>
                                </>
                            ) : (
                                <div className="text-center">
                                    <p className="text-sm text-slate-500 mb-6">Vous �tes invit� sur cette liste. Vous pouvez la quitter � tout moment.</p>
                                    <button onClick={() => {
                                        const myShare = data.todo_list_shares?.find(s => s.list_id === activeListId);
                                        if (myShare) {
                                            if (window.confirm("Voulez-vous vraiment quitter cette liste ?")) {
                                                const newShares = (data.todo_list_shares || []).filter(s => s.id !== myShare.id);
                                                updateData({ ...data, todo_list_shares: newShares }, { table: 'todo_list_shares', id: myShare.id, action: 'delete' });
                                                setShowShares(false);
                                                setActiveListId('default');
                                            }
                                        }
                                    }} className="w-full px-4 py-3 bg-red-100 text-red-600 font-bold rounded-xl">Quitter la liste</button>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

