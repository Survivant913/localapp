import { useState } from 'react';
import { 
  LayoutDashboard, Wallet, TrendingUp, TrendingDown, 
  CheckSquare, StickyNote, Plus, FolderKanban, 
  Calendar, Eye, EyeOff, CheckCircle2, List, Target, Euro, Flag, Clock, ArrowRightLeft
} from 'lucide-react'; 
import FocusProjectModal from './FocusProjectModal';

// --- COMPOSANT SPARKLINE (Graphique Mini - Optimisé) ---
const SparkLine = ({ data, height = 50 }) => {
    if (!data || !Array.isArray(data) || data.length < 2) return null;
    
    let min = Math.min(...data);
    let max = Math.max(...data);
    
    if (min > 0) min = 0; 
    if (max < 0) max = 0;
    
    const range = max - min || 1;
    const width = 100;
    
    const getY = (val) => height - ((val - min) / range) * height;

    const points = data.map((val, i) => {
        const x = (i / (data.length - 1)) * width;
        const y = getY(val);
        return `${x},${y}`;
    }).join(' ');
    
    const zeroOffset = Math.max(0, Math.min(1, (max - 0) / range));
    const gradientId = "spark-grad-" + Math.random().toString(36).substr(2, 9);

    return (
        <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-full overflow-visible" preserveAspectRatio="none">
            <defs>
                <linearGradient id={gradientId} x1="0" x2="0" y1="0" y2="1">
                    <stop offset="0%" stopColor="#10b981" stopOpacity="1" />
                    <stop offset={`${zeroOffset * 100}%`} stopColor="#10b981" stopOpacity="1" />
                    <stop offset={`${zeroOffset * 100}%`} stopColor="#ef4444" stopOpacity="1" />
                    <stop offset="100%" stopColor="#ef4444" stopOpacity="1" />
                </linearGradient>
            </defs>
            <line x1="0" y1={getY(0)} x2="100" y2={getY(0)} stroke="currentColor" className="text-gray-300 dark:text-slate-600" strokeWidth="0.5" strokeDasharray="2" opacity="0.8" />
            <polyline fill="none" stroke={`url(#${gradientId})`} strokeWidth="2" points={points} vectorEffect="non-scaling-stroke" strokeLinecap="round" strokeLinejoin="round" />
            <circle cx={100} cy={getY(data[data.length-1])} r="3" fill={data[data.length-1] >= 0 ? "#10b981" : "#ef4444"} className="animate-pulse" vectorEffect="non-scaling-stroke"/>
        </svg>
    );
};

export default function Dashboard({ data, updateData, setView }) {
    const [dashboardFilter, setDashboardFilter] = useState('total');
    const [focusedProject, setFocusedProject] = useState(null);
    
    const isPrivacyMode = data.settings?.privacyMode || false;
    const togglePrivacyMode = () => {
        updateData({ ...data, settings: { ...data.settings, privacyMode: !isPrivacyMode } });
    };

    // SÉCURISATION DES DONNÉES
    const todos = Array.isArray(data.todos) ? data.todos : [];
    const projects = Array.isArray(data.projects) ? data.projects : [];
    const notes = Array.isArray(data.notes) ? data.notes : [];
    
    const budget = data.budget || {};
    const transactions = Array.isArray(budget.transactions) ? budget.transactions : [];
    const scheduled = Array.isArray(budget.scheduled) ? budget.scheduled : [];
    const recurring = Array.isArray(budget.recurring) ? budget.recurring : [];
    const accounts = Array.isArray(budget.accounts) ? budget.accounts : [];
    
    const labels = data.customLabels || {};

    // --- 1. FILTRES INTELLIGENTS (CORRIGÉS) ---
    const isRelevantItem = (item) => {
        if (dashboardFilter === 'total') return true;
        const accId = String(item.accountId || item.account_id);
        const targetId = String(item.targetAccountId || item.target_account_id);
        return accId === String(dashboardFilter) || targetId === String(dashboardFilter);
    };

    const getFinancialImpact = (item) => {
        const amount = parseFloat(item.amount || 0);
        const type = item.type;
        const accId = String(item.accountId || item.account_id);
        const targetId = String(item.targetAccountId || item.target_account_id);

        if (dashboardFilter === 'total') {
            if (type === 'income') return amount;
            if (type === 'expense') return -amount;
            if (type === 'transfer') return 0; 
            return -amount;
        }

        if (type === 'transfer') {
            if (targetId === String(dashboardFilter)) return amount; 
            if (accId === String(dashboardFilter)) return -amount;   
            return 0;
        }

        if (type === 'income') return amount;
        return -amount;
    };

    // --- 2. CALCULS DE SOLDE ---
    const currentBalanceRaw = transactions
        .filter(t => isRelevantItem(t))
        .reduce((acc, t) => acc + getFinancialImpact(t), 0);
    
    const currentBalance = Math.round(currentBalanceRaw * 100) / 100;

    const renderAmount = (val, withSign = false) => {
        if (isPrivacyMode) return '**** €';
        const formatted = new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(Math.abs(val));
        if (withSign) {
            if (val > 0) return '+' + formatted;
            if (val < 0) return '-' + formatted;
            return formatted;
        }
        return (val < 0 ? '-' : '') + formatted;
    };

    // --- NOUVEAU : CALCUL PRÉVISION FIN DE MOIS ---
    const getProjectedEndOfMonth = () => {
        const today = new Date();
        const lastDayOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0); // Dernier jour du mois
        let projected = currentBalance;

        // 1. Ajouter les opérations planifiées (Scheduled) d'ici la fin du mois
        scheduled.forEach(s => {
            if (s.status === 'pending' && isRelevantItem(s)) {
                const sDate = new Date(s.date);
                if (sDate >= today && sDate <= lastDayOfMonth) {
                    projected += getFinancialImpact(s);
                }
            }
        });

        // 2. Ajouter les récurrentes (Recurring) d'ici la fin du mois
        recurring.forEach(r => {
            if (isRelevantItem(r) && r.nextDueDate) {
                const rDate = new Date(r.nextDueDate);
                if (rDate >= today && rDate <= lastDayOfMonth) {
                    projected += getFinancialImpact(r);
                }
            }
        });

        return projected;
    };
    const projectedBalance = getProjectedEndOfMonth();
    const balanceDiff = projectedBalance - currentBalance; // Différence pour savoir si ça monte ou descend

    // Graphique Performant
    const getSparklineData = () => {
        try {
            const days = 30; 
            const history = [];
            let tempBalance = currentBalance;
            
            const dailyChanges = {};
            const relevantTransactions = transactions.filter(t => isRelevantItem(t));
            
            relevantTransactions.forEach(t => {
                const d = new Date(t.date);
                d.setHours(0,0,0,0);
                const key = d.getTime();
                const impact = getFinancialImpact(t);
                dailyChanges[key] = (dailyChanges[key] || 0) + impact;
            });

            let currentDateCursor = new Date();
            currentDateCursor.setHours(0,0,0,0); 

            for (let i = 0; i < days; i++) {
                history.unshift(Number(tempBalance.toFixed(2)));
                const key = currentDateCursor.getTime();
                tempBalance -= (dailyChanges[key] || 0);
                currentDateCursor.setDate(currentDateCursor.getDate() - 1);
            }
            return history;
        } catch (e) { return [0, 0]; }
    };
    
    const sparkData = getSparklineData();

    // --- 3. CALCUL "À VENIR" ---
    const getUpcomingEvents = () => {
        try {
            const today = new Date();
            today.setHours(0,0,0,0);
            let events = [];

            scheduled.forEach(s => {
                if(s.status === 'pending') {
                    if (!isRelevantItem(s)) return;
                    events.push({ type: 'scheduled', date: new Date(s.date), data: s, id: `s-${s.id}` });
                }
            });

            recurring.forEach(r => {
                if (!isRelevantItem(r)) return;
                let nextDate = r.nextDueDate ? new Date(r.nextDueDate) : new Date();
                events.push({ type: 'recurring', date: nextDate, data: r, id: `r-${r.id}` });
            });

            return events
                .filter(e => !isNaN(e.date.getTime()) && e.date >= today)
                .sort((a, b) => a.date - b.date)
                .slice(0, 3);
        } catch (e) { return []; }
    };
    const upcomingList = getUpcomingEvents();

    // --- 4. AUTRES HELPERS ---
    const getNextCalendarEvents = () => {
        try {
            const now = new Date();
            const today = new Date();
            today.setHours(0,0,0,0);
            
            const calEvents = (data.calendar_events || []).map(e => ({
                id: e.id, title: e.title, start_time: e.start_time, is_todo: false,
                is_all_day: e.is_all_day
            }));

            return calEvents
                .filter(e => {
                    const evtDate = new Date(e.start_time);
                    if (e.is_all_day) return evtDate >= today;
                    return evtDate > now;
                })
                .sort((a, b) => new Date(a.start_time) - new Date(b.start_time))
                .slice(0, 4);
        } catch (e) { return []; }
    };
    const nextCalendarEvents = getNextCalendarEvents();

    // --- NOUVEAU : FONCTION COMPTEUR JOURS (AGENDA) ---
    const getDayCounterLabel = (dateStr) => {
        const today = new Date(); today.setHours(0,0,0,0);
        const target = new Date(dateStr); target.setHours(0,0,0,0);
        const diffTime = target - today;
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

        if (diffDays === 0) return { text: 'Auj.', color: 'text-green-600 bg-green-100' };
        if (diffDays === 1) return { text: 'Demain', color: 'text-blue-600 bg-blue-100' };
        if (diffDays < 0) return { text: 'Passé', color: 'text-gray-400 bg-gray-100' };
        return { text: `J-${diffDays}`, color: 'text-purple-600 bg-purple-100' };
    };

    const toggleTodo = (id) => {
        const newTodos = todos.map(t => t.id === id ? { ...t, completed: !t.completed } : t);
        updateData({ ...data, todos: newTodos });
    };

    const getAccountBalanceForProject = (accId) => {
        return transactions
            .filter(t => String(t.accountId || t.account_id) === String(accId))
            .reduce((acc, t) => t.type === 'income' ? acc + parseFloat(t.amount || 0) : acc - parseFloat(t.amount || 0), 0);
    };

    const priorityWeight = { high: 3, medium: 2, low: 1, none: 0 };
    
    const activeProjects = projects
        .filter(p => p.status !== 'done' && p.status !== 'on_hold')
        .sort((a, b) => {
            const weightA = priorityWeight[a.priority] || 0;
            const weightB = priorityWeight[b.priority] || 0;
            return weightB - weightA; 
        })
        .slice(0, 3);

    const handleAutoFocus = () => {
        const active = projects.filter(p => p.status !== 'done' && p.status !== 'on_hold');
        if (active.length === 0) return;
        const sorted = active.sort((a, b) => {
            const diffP = (priorityWeight[b.priority || 'none'] || 0) - (priorityWeight[a.priority || 'none'] || 0);
            if (diffP !== 0) return diffP;
            if (a.deadline && b.deadline) return new Date(a.deadline) - new Date(b.deadline);
            if (a.deadline) return -1;
            if (b.deadline) return 1;
            return 0;
        });
        setFocusedProject(sorted[0]);
    };

    const updateProjectFromFocus = (updatedProject) => {
        const updatedProjects = projects.map(p => p.id === updatedProject.id ? updatedProject : p);
        updateData({ ...data, projects: updatedProjects });
        setFocusedProject(updatedProject);
    };

    const pinnedNotes = notes.filter(n => n.isPinned).slice(0, 4);
    const urgentTodos = todos.filter(t => !t.completed && (t.priority === 'high' || t.priority === 'warm')).slice(0, 5);
    const todayDate = new Date().toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });

    return (
        <div className="space-y-6 fade-in p-4 pb-24 md:pb-20 max-w-7xl mx-auto">
            {focusedProject && (
                <FocusProjectModal 
                    project={focusedProject} 
                    onClose={() => setFocusedProject(null)} 
                    updateProject={updateProjectFromFocus} 
                    accounts={accounts} 
                    availableForProjects={currentBalance} 
                    getAccountBalance={getAccountBalanceForProject} 
                />
            )}

            {/* HEADER */}
            <div className="flex flex-col lg:flex-row gap-6">
                <div className="flex-1 bg-white dark:bg-slate-800 p-6 md:p-8 rounded-3xl shadow-sm border border-gray-200 dark:border-slate-700 flex flex-col justify-between">
                    <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
                        <div>
                            <h2 className="text-2xl md:text-3xl font-bold text-gray-800 dark:text-white mb-1 md:mb-2">{labels.userName || 'Bonjour,'}</h2>
                            <p className="text-gray-500 dark:text-gray-400 text-sm md:text-lg capitalize">{todayDate}</p>
                        </div>
                        <select 
                            value={dashboardFilter} 
                            onChange={(e) => setDashboardFilter(e.target.value)} 
                            className="w-full md:w-auto px-4 py-2 bg-gray-50 dark:bg-slate-700 border border-gray-200 dark:border-slate-600 rounded-xl text-sm font-bold outline-none text-slate-800 dark:text-white"
                        >
                            <option value="total">Vue Globale</option>
                            {accounts.map(acc => <option key={acc.id} value={acc.id}>{acc.name}</option>)}
                        </select>
                    </div>
                    <div className="flex gap-2 md:gap-4 mt-auto">
                        <button onClick={() => setView('budget')} className="flex-1 flex items-center justify-center gap-2 px-3 py-3 md:px-6 md:py-4 bg-blue-600 hover:bg-blue-700 text-white rounded-xl md:rounded-2xl text-sm md:text-base font-bold shadow-lg shadow-blue-900/20 transition-transform hover:scale-[1.02]"><Plus size={18}/> <span className="hidden sm:inline">Dépense</span><span className="sm:hidden">Ajout</span></button>
                        <button onClick={() => setView('todo')} className="flex-1 flex items-center justify-center gap-2 px-3 py-3 md:px-6 md:py-4 bg-gray-100 dark:bg-slate-700 hover:bg-gray-200 dark:hover:bg-slate-600 text-gray-800 dark:text-white rounded-xl md:rounded-2xl text-sm md:text-base font-bold transition-transform hover:scale-[1.02]"><CheckSquare size={18} className="text-orange-500"/> <span className="hidden sm:inline">Tâche</span><span className="sm:hidden">Tâche</span></button>
                        <button onClick={() => setView('notes')} className="flex-1 flex items-center justify-center gap-2 px-3 py-3 md:px-6 md:py-4 bg-gray-100 dark:bg-slate-700 hover:bg-gray-200 dark:hover:bg-slate-600 text-gray-800 dark:text-white rounded-xl md:rounded-2xl text-sm md:text-base font-bold transition-transform hover:scale-[1.02]"><StickyNote size={18} className="text-yellow-500"/> <span className="hidden sm:inline">Note</span><span className="sm:hidden">Note</span></button>
                    </div>
                </div>
            </div>

            {/* METRICS ROW */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {/* CARTE SOLDE */}
                <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl shadow-lg border border-gray-200 dark:border-slate-700 relative overflow-hidden flex flex-col justify-between min-h-[220px]">
                    <div className="relative z-10 flex justify-between items-start">
                        <div className="p-3 bg-green-50 dark:bg-slate-800 rounded-2xl text-green-600 dark:text-green-400"><Wallet size={24}/></div>
                        <button onClick={togglePrivacyMode} className="text-gray-400 dark:text-slate-500 hover:text-gray-600 dark:hover:text-white transition-colors">{isPrivacyMode ? <EyeOff size={20}/> : <Eye size={20}/>}</button>
                    </div>
                    <div className="relative z-10 mt-4 mb-4">
                        <h3 className="text-3xl md:text-4xl font-extrabold text-gray-900 dark:text-white tracking-tight mb-1">{renderAmount(currentBalance)}</h3>
                        <p className="text-sm font-medium text-gray-500 dark:text-slate-400">Solde {dashboardFilter === 'total' ? 'Total' : 'du Compte'}</p>
                        
                        {/* --- NOUVEAU : AFFICHAGE DISCRET ESTIMATION FIN DE MOIS --- */}
                        {!isPrivacyMode && (
                            <div className="mt-2 text-xs font-medium flex items-center gap-1 opacity-80">
                                <span className="text-gray-400 dark:text-slate-500">Est. fin de mois :</span>
                                <span className={balanceDiff >= 0 ? "text-green-600 dark:text-green-400" : "text-red-500"}>
                                    {renderAmount(projectedBalance)}
                                </span>
                            </div>
                        )}
                    </div>
                    <div className="h-16 w-full mt-auto bg-gray-50 dark:bg-slate-800/50 rounded-xl p-2 border border-gray-100 dark:border-slate-700/50">
                        <SparkLine data={sparkData} height={50} />
                    </div>
                </div>

                {/* CARTE À VENIR (FINANCE) */}
                <div className="lg:col-span-2 bg-white dark:bg-slate-900 p-6 rounded-3xl shadow-lg border border-gray-200 dark:border-slate-700 flex flex-col">
                    <div className="flex items-center gap-2 mb-6 text-purple-600 dark:text-purple-400">
                        <Calendar size={20}/>
                        <h3 className="font-bold text-gray-800 dark:text-white">Opérations à venir</h3>
                    </div>
                    <div className="flex-1 flex flex-col gap-3">
                        {upcomingList.length === 0 ? (
                            <div className="flex-1 flex items-center justify-center text-gray-400 dark:text-slate-500 text-sm py-4">Rien à signaler</div>
                        ) : (
                            upcomingList.map((e, idx) => {
                                const impact = getFinancialImpact(e.data);
                                const isNeutral = impact === 0;
                                const isPositive = impact > 0;
                                
                                return (
                                    <div key={idx} className="flex items-center justify-between p-3 md:p-4 bg-gray-50 dark:bg-slate-800/50 rounded-xl border border-gray-100 dark:border-slate-700">
                                        <div className="flex items-center gap-3 md:gap-4 overflow-hidden">
                                            <div className="p-2 bg-white dark:bg-slate-700 rounded-lg text-gray-500 dark:text-slate-300 shadow-sm shrink-0">
                                                {e.data.type === 'transfer' ? <ArrowRightLeft size={18} className="text-blue-500"/> : e.type === 'scheduled' ? <Calendar size={18}/> : <TrendingUp size={18}/>}
                                            </div>
                                            <div className="min-w-0">
                                                <p className="font-bold text-gray-800 dark:text-white text-sm truncate">{e.data.description}</p>
                                                <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-slate-400">
                                                    <span>{e.date.toLocaleDateString()}</span>
                                                    {e.type === 'recurring' && <span className="flex items-center gap-1"><TrendingUp size={10}/> <span className="hidden sm:inline">Récurrent</span></span>}
                                                </div>
                                            </div>
                                        </div>
                                        <span className={`font-bold text-sm shrink-0 pl-2 ${isNeutral ? 'text-blue-600 dark:text-blue-400' : isPositive ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                                            {isNeutral ? 'Transfert' : renderAmount(impact, true)}
                                        </span>
                                    </div>
                                );
                            })
                        )}
                    </div>
                </div>
            </div>

            {/* MAIN CONTENT ROW */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                
                {/* PROJETS ACTIFS (2/3) */}
                <div className="lg:col-span-2 space-y-6">
                    <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-gray-200 dark:border-slate-700 shadow-sm">
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="font-bold text-gray-800 dark:text-white flex items-center gap-2"><FolderKanban size={20} className="text-blue-500"/> Projets Actifs</h3>
                            <button onClick={handleAutoFocus} className="flex items-center gap-2 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-bold transition-colors shadow-lg shadow-indigo-900/20"><Target size={14}/> FOCUS</button>
                        </div>
                        
                        <div className="space-y-4">
                            {activeProjects.length === 0 ? (
                                <p className="text-gray-400 dark:text-slate-500 text-sm italic text-center py-4">Aucun projet en cours.</p>
                            ) : (
                                activeProjects.map(p => {
                                    const cost = parseFloat(p.cost || 0);
                                    let fundingPercentage = 0;
                                    let isFunded = true;
                                    let budgetAvailable = 0;
                                    
                                    if (cost > 0) {
                                        budgetAvailable = p.linkedAccountId 
                                            ? getAccountBalanceForProject(p.linkedAccountId) 
                                            : Math.max(0, currentBalance); // Use calculated currentBalance
                                        
                                        fundingPercentage = Math.min(100, (Math.max(0, budgetAvailable) / cost) * 100);
                                        isFunded = budgetAvailable >= cost;
                                    }
                                    
                                    let safeProgress = Math.min(100, Math.max(0, p.progress || 0));
                                    let safeFunding = Math.min(100, Math.max(0, fundingPercentage));
                                    
                                    let globalScore = safeProgress;
                                    if (cost > 0) globalScore = (safeProgress + safeFunding) / 2;

                                    return (
                                        <div key={p.id} className="bg-gray-50 dark:bg-slate-800/50 p-4 md:p-5 rounded-2xl border border-gray-100 dark:border-slate-700 hover:border-blue-200 dark:hover:border-slate-600 transition-colors cursor-pointer" onClick={() => setView('projects')}>
                                            <div className="flex items-center gap-4 md:gap-5">
                                                
                                                <div className="relative inline-flex items-center justify-center w-12 h-12 md:w-14 md:h-14 shrink-0">
                                                    <svg className="w-full h-full -rotate-90" viewBox="0 0 36 36">
                                                        <path className="text-gray-200 dark:text-slate-700" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="currentColor" strokeWidth="3" />
                                                        <path className={`transition-all duration-1000 ${globalScore >= 100 ? 'text-green-500' : 'text-blue-500'}`} strokeDasharray={`${globalScore}, 100`} d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
                                                    </svg>
                                                    <span className="absolute text-[10px] md:text-xs font-bold text-gray-700 dark:text-slate-200">{Math.round(globalScore)}%</span>
                                                </div>

                                                <div className="flex-1 min-w-0 space-y-2">
                                                    <div className="flex justify-between items-start">
                                                        <div className="min-w-0 flex-1 pr-2">
                                                            <h4 className="font-bold text-gray-800 dark:text-white text-sm md:text-base truncate">{p.title}</h4>
                                                            <div className="flex items-center gap-2 mt-0.5">
                                                                <span className={`w-2 h-2 shrink-0 rounded-full ${p.status === 'in_progress' ? 'bg-green-500' : 'bg-blue-500'}`}></span>
                                                                <p className="text-xs text-gray-500 dark:text-slate-400 truncate">{p.description || "Pas de description"}</p>
                                                            </div>
                                                        </div>
                                                        {p.status === 'in_progress' && <span className="hidden sm:inline-block text-[9px] font-bold bg-blue-100 dark:bg-blue-500/20 text-blue-600 dark:text-blue-400 px-2 py-0.5 rounded uppercase shrink-0">En cours</span>}
                                                    </div>

                                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 md:gap-4">
                                                        <div className="space-y-1">
                                                            <div className="flex justify-between text-[10px] text-gray-500 dark:text-slate-400">
                                                                <span className="flex items-center gap-1"><List size={10}/> Tâches</span>
                                                                <span>{Math.round(safeProgress)}%</span>
                                                            </div>
                                                            <div className="h-1.5 w-full bg-gray-200 dark:bg-slate-700 rounded-full overflow-hidden">
                                                                <div className="h-full bg-blue-500 rounded-full transition-all duration-500" style={{ width: `${safeProgress}%` }}></div>
                                                            </div>
                                                        </div>
                                                        {cost > 0 && (
                                                            <div className="space-y-1">
                                                                <div className="flex justify-between text-[10px] text-gray-500 dark:text-slate-400">
                                                                    <span className="flex items-center gap-1"><Euro size={10}/> Budget</span>
                                                                    <span className={isFunded ? "text-green-600 dark:text-green-400" : "text-orange-500 dark:text-orange-400"}>{Math.round(safeFunding)}%</span>
                                                                </div>
                                                                <div className="h-1.5 w-full bg-gray-200 dark:bg-slate-700 rounded-full overflow-hidden">
                                                                    <div className={`h-full rounded-full transition-all duration-500 ${isFunded ? 'bg-green-500' : 'bg-orange-500'}`} style={{ width: `${safeFunding}%` }}></div>
                                                                </div>
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })
                            )}
                        </div>
                    </div>

                    {pinnedNotes.length > 0 && (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            {pinnedNotes.map(n => (
                                <div key={n.id} className={`p-5 rounded-2xl border border-transparent shadow-sm ${n.color} text-slate-800 min-h-[120px] flex flex-col cursor-pointer hover:opacity-90`} onClick={() => setView('notes')}>
                                    <h4 className="font-bold text-sm mb-1 line-clamp-1">{n.title}</h4>
                                    <p className="text-xs opacity-80 line-clamp-6 break-words">{n.content}</p>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* COLONNE DROITE : AGENDA + URGENCES */}
                <div className="space-y-6">
                    
                    {/* WIDGET AGENDA */}
                    <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-gray-200 dark:border-slate-700 shadow-sm" onClick={() => setView('planning')}>
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="font-bold text-gray-800 dark:text-white flex items-center gap-2">
                                <Clock size={20} className="text-purple-500"/> Agenda
                            </h3>
                        </div>
                        <div className="space-y-3">
                            {nextCalendarEvents.length === 0 ? (
                                <p className="text-gray-400 dark:text-slate-500 text-sm italic py-2">Rien de prévu prochainement.</p>
                            ) : (
                                nextCalendarEvents.map(evt => {
                                    const d = new Date(evt.start_time);
                                    
                                    // --- NOUVEAU : CALCULATEUR DE JOURS ---
                                    const dayLabel = getDayCounterLabel(evt.start_time);

                                    return (
                                        <div key={`${evt.type}-${evt.id}`} className="flex gap-3 items-center p-2 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors cursor-pointer">
                                            {/* Badge Date */}
                                            <div className={`flex flex-col items-center justify-center w-10 h-10 ${evt.is_todo ? 'bg-orange-50 text-orange-600 border-orange-100' : 'bg-purple-50 text-purple-600 border-purple-100'} dark:bg-opacity-20 rounded-lg shrink-0 border`}>
                                                <span className="text-[9px] font-bold uppercase leading-none">{d.toLocaleDateString('fr-FR', {weekday: 'short'}).replace('.', '')}</span>
                                                <span className="text-sm font-bold leading-none mt-0.5">{d.getDate()}</span>
                                            </div>
                                            <div className="min-w-0 flex-1">
                                                <div className="flex items-center justify-between">
                                                    <p className="text-sm font-bold text-gray-800 dark:text-white truncate">{evt.title}</p>
                                                    
                                                    {/* --- NOUVEAU : AFFICHAGE DU COMPTEUR (J-3) --- */}
                                                    <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-md ${dayLabel.color} dark:bg-opacity-20`}>
                                                        {dayLabel.text}
                                                    </span>
                                                </div>
                                                <p className="text-xs text-gray-500 dark:text-slate-400 flex items-center gap-1">
                                                    {evt.is_all_day ? "Toute la journée" : d.toLocaleTimeString('fr-FR', {hour: '2-digit', minute:'2-digit'})}
                                                    {evt.is_todo && <CheckCircle2 size={10} className="text-orange-500"/>}
                                                </p>
                                            </div>
                                        </div>
                                    );
                                })
                            )}
                        </div>
                    </div>

                    {/* URGENCES */}
                    <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-gray-200 dark:border-slate-700 shadow-sm h-fit">
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="font-bold text-gray-800 dark:text-white flex items-center gap-2"><CheckSquare size={20} className="text-red-500"/> Urgences</h3>
                            <span className="bg-red-100 dark:bg-red-500/20 text-red-600 dark:text-red-400 text-xs font-bold px-2 py-1 rounded-full">{urgentTodos.length}</span>
                        </div>
                        <div className="space-y-3">
                            {urgentTodos.length === 0 ? (
                                <p className="text-gray-400 dark:text-slate-500 text-sm italic text-center py-4">Rien d'urgent.</p>
                            ) : (
                                urgentTodos.map(t => (
                                    <div 
                                        key={t.id} 
                                        className="group flex items-center gap-3 p-3 bg-white dark:bg-slate-800 rounded-xl border border-gray-100 dark:border-slate-700 hover:border-red-300 dark:hover:border-red-500 hover:shadow-sm transition-all cursor-pointer"
                                        onClick={() => toggleTodo(t.id)}
                                    >
                                        <button className="shrink-0 w-5 h-5 rounded-full border-2 border-gray-300 dark:border-slate-500 flex items-center justify-center transition-colors group-hover:border-green-500 group-hover:text-green-500 text-transparent">
                                            <CheckCircle2 size={12} />
                                        </button>
                                        <div className="flex-1 min-w-0">
                                            <span className="text-sm font-medium text-gray-800 dark:text-slate-100 line-clamp-1">{t.text}</span>
                                            <div className="flex items-center gap-2 mt-0.5">
                                                <span className="text-[10px] font-bold text-red-500 flex items-center gap-1"><Flag size={8}/> Urgent</span>
                                            </div>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                        <button onClick={() => setView('todo')} className="w-full mt-6 py-3 bg-gray-100 dark:bg-slate-800 hover:bg-gray-200 dark:hover:bg-slate-700 text-gray-600 dark:text-slate-300 text-sm font-bold rounded-xl transition-colors">Voir toutes les tâches</button>
                    </div>
                </div>
            </div>
        </div>
    );
}