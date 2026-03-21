import { useState, useMemo } from 'react';
// AJOUT : Import de supabase pour la synchronisation parfaite avec le Tracker
import { supabase } from './supabaseClient';
import * as AllIcons from 'lucide-react';
import { 
    LayoutDashboard, Wallet, TrendingUp, TrendingDown, 
    CheckSquare, StickyNote, Plus, FolderKanban, 
    Calendar, Eye, EyeOff, CheckCircle2, List, Target, Euro, Flag, Clock, ArrowRightLeft,
    Repeat, RotateCcw, Check, Coffee, Activity
} from 'lucide-react'; 
import FocusProjectModal from './FocusProjectModal';

// --- COMPOSANT DYNAMIC ICON ---
const DynamicIcon = ({ name, size = 18, className = "" }) => {
    if (!name) return <span className="text-lg">✨</span>;
    const pascalName = name.charAt(0).toUpperCase() + name.slice(1);
    const IconComponent = AllIcons[pascalName] || AllIcons[name];
    if (!IconComponent) return <span className="text-xs">{name}</span>; 
    return <IconComponent size={size} className={className} />;
};

// --- COMPOSANT HABIT STRIP ---
const HabitStrip = ({ habits, updateHabit, setView }) => {
    const todayIndex = new Date().getDay(); 
    
    const todayHabits = useMemo(() => {
        if (!Array.isArray(habits)) return [];
        return habits.filter(h => {
            // SÉCURITÉ ANTI-CRASH
            if (!h.frequency || !Array.isArray(h.frequency)) {
                 if (h.days_of_week && Array.isArray(h.days_of_week)) {
                     const lastDateStr = h.history && h.history.length > 0 ? h.history[h.history.length - 1] : null;
                     const todayStr = new Date().toLocaleDateString('fr-CA'); // Format YYYY-MM-DD local
                     
                     let isDoneToday = false;
                     if(lastDateStr) {
                         const lastDate = new Date(lastDateStr);
                         const today = new Date();
                         isDoneToday = lastDate.toDateString() === today.toDateString() || lastDateStr.includes(todayStr);
                     }

                     return h.days_of_week.includes(todayIndex) && !isDoneToday;
                 }
                 return false;
            }

            let isScheduledToday = false;
            if (h.days_of_week && Array.isArray(h.days_of_week)) {
                isScheduledToday = h.days_of_week.includes(todayIndex);
            } 
            else {
                isScheduledToday = h.frequency.some(d => {
                    if (!d) return false;
                    const norm = typeof d === 'string' ? d.toLowerCase().trim().substring(0, 3) : ''; 
                    const map = { 'dim': 0, 'sun': 0, 'lun': 1, 'mon': 1, 'mar': 2, 'tue': 2, 'mer': 3, 'wed': 3, 'jeu': 4, 'thu': 4, 'ven': 5, 'fri': 5, 'sam': 6, 'sat': 6 };
                    return map[norm] === todayIndex;
                });
            }
            
            if (!isScheduledToday) return false;

            const lastDate = h.history && h.history.length > 0 ? new Date(h.history[h.history.length - 1]) : null;
            const isDoneToday = lastDate && new Date().toDateString() === lastDate.toDateString();
            
            return !isDoneToday;
        });
    }, [habits, todayIndex]);

    // ÉTATS POUR L'ANIMATION DE MASQUAGE
    const [hidingIds, setHidingIds] = useState([]);
    const [hiddenIds, setHiddenIds] = useState([]); 

    const handlePass = (id, e) => {
        e.stopPropagation();
        if (e.currentTarget) e.currentTarget.blur();
        
        // Déclenche l'animation
        setHidingIds(prev => [...prev, id]);
        
        // Supprime le composant après l'animation (300ms)
        setTimeout(() => {
            setHiddenIds(prev => [...prev, id]);
        }, 300);
    };

    const handleCheck = async (habit, e) => {
        e.stopPropagation();
        const now = new Date();
        const year = now.getFullYear();
        const month = String(now.getMonth() + 1).padStart(2, '0');
        const day = String(now.getDate()).padStart(2, '0');
        const todayStr = `${year}-${month}-${day}`; 

        const newHistory = [...(habit.history || []), new Date().toISOString()];
        updateHabit({ ...habit, history: newHistory, streak: (habit.streak || 0) + 1 });

        try {
            await supabase.from('habit_logs').insert({
                habit_id: habit.id,
                date: todayStr,
                completed: true
            });
        } catch (err) {
            console.error("Erreur sync log:", err);
        }
    };

    const activeHabits = todayHabits.filter(h => !hiddenIds.includes(h.id));

    if (activeHabits.length === 0) {
        return (
            <div className="flex items-center justify-center gap-3 py-6 opacity-50">
                <Coffee size={24} className="text-slate-400"/>
                <span className="text-sm font-black text-slate-500 uppercase tracking-widest">
                    {todayHabits.length === 0 ? "Repos aujourd'hui" : "Tout est fait !"}
                </span>
            </div>
        );
    }

    return (
        <div className="flex overflow-x-auto pb-4 pt-2 snap-x scrollbar-hide">
            {activeHabits.map(h => {
                const isHiding = hidingIds.includes(h.id);
                return (
                    <div 
                        key={h.id} 
                        className={`snap-center shrink-0 flex flex-col justify-between group relative overflow-hidden transition-all duration-300 ease-out
                        ${isHiding ? 'w-0 mr-0 opacity-0 scale-50 border-0 p-0' : 'w-32 mr-4 opacity-100 scale-100 h-32 bg-gradient-to-br from-white to-slate-50 dark:from-slate-800 dark:to-slate-800/80 rounded-2xl border border-slate-200/60 dark:border-slate-700 shadow-sm p-3 hover:border-blue-300 dark:hover:border-blue-500/50 hover:shadow-md hover:-translate-y-1'}`}
                    >
                        <div className="flex justify-between items-start min-w-[104px]">
                            <span className="p-2 bg-blue-50/80 dark:bg-blue-900/30 rounded-[10px] text-lg text-blue-600 dark:text-blue-400 shadow-inner">
                                <DynamicIcon name={h.icon} size={20} />
                            </span>
                            <button onClick={(e) => handlePass(h.id, e)} className="text-slate-300 hover:text-rose-500 p-1.5 rounded-full hover:bg-rose-50 dark:hover:bg-rose-900/20 transition-colors" title="Masquer pour aujourd'hui">
                                <EyeOff size={14}/>
                            </button>
                        </div>
                        <p className="font-bold text-[10px] text-slate-800 dark:text-slate-200 line-clamp-3 leading-snug min-w-[104px] my-1 flex-1 flex items-center">{h.name}</p>
                        
                        <button onClick={(e) => handleCheck(h, e)} className="w-full py-2 bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-blue-600 dark:hover:bg-blue-500 dark:hover:text-white transition-all flex items-center justify-center gap-1.5 shadow-sm min-w-[104px] shrink-0">
                            <Check size={12} strokeWidth={3}/> Fait
                        </button>
                    </div>
                );
            })}
            <div onClick={() => setView('habits')} className="snap-center shrink-0 w-12 h-32 flex items-center justify-center rounded-2xl border-2 border-dashed border-slate-200 dark:border-slate-700 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800 hover:border-slate-300 dark:hover:border-slate-600 transition-colors">
                <span className="text-slate-400 font-black text-[10px] -rotate-90 whitespace-nowrap tracking-widest uppercase">Gérer</span>
            </div>
        </div>
    );
};

// --- NOUVEAU COMPOSANT PREMIUM CHART (Graphique Lissé avec Prévision) ---
const PremiumChart = ({ data, height = 80 }) => {
    if (!data || !data.past || !data.future) return null;
    const allPoints = [...data.past, data.current, ...data.future];
    if (allPoints.length < 2) return null;

    let min = Math.min(...allPoints);
    let max = Math.max(...allPoints);
    // Petit padding visuel pour éviter de toucher les bords
    if (min === max) { min -= 10; max += 10; }
    
    const range = max - min;
    const width = 200;
    
    // Ratio visuel : 60% pour le passé (plus aéré), 40% pour le futur (compressé comme demandé)
    const pastWidthRatio = 0.6;
    
    // Fonction Y inversée (0 est en haut du SVG) avec padding de 10px
    const getY = (val) => height - 5 - ((val - min) / range) * (height - 10);

    const pastLength = data.past.length;
    const futureLength = data.future.length;

    // Calcul des coordonnées pour la partie Passé (Solide)
    const pastPointsStr = data.past.map((val, i) => {
        const x = (i / pastLength) * (width * pastWidthRatio);
        return `${x},${getY(val)}`;
    }).join(' ') + ` ${width * pastWidthRatio},${getY(data.current)}`;

    // Calcul des coordonnées pour la partie Future (Pointillée)
    const futurePointsStr = `${width * pastWidthRatio},${getY(data.current)} ` + data.future.map((val, i) => {
        const x = (width * pastWidthRatio) + ((i + 1) / futureLength) * (width * (1 - pastWidthRatio));
        return `${x},${getY(val)}`;
    }).join(' ');

    const todayX = width * pastWidthRatio;
    const todayY = getY(data.current);

    const gradientId = "premium-grad-" + Math.random().toString(36).substr(2, 9);
    // Le polygone de remplissage s'arrête exactement à "Aujourd'hui"
    const fillPolygon = `0,${height} ${pastPointsStr} ${todayX},${height}`;

    return (
        <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-full overflow-visible" preserveAspectRatio="none">
            <defs>
                <linearGradient id={gradientId} x1="0" x2="0" y1="0" y2="1">
                    <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.25" />
                    <stop offset="100%" stopColor="#3b82f6" stopOpacity="0" />
                </linearGradient>
            </defs>

            {/* Remplissage uniquement sous la courbe passée */}
            <polygon points={fillPolygon} fill={`url(#${gradientId})`} />

            {/* Ligne du 0€ si on passe en négatif (repère visuel discret) */}
            {min < 0 && max > 0 && (
                <line x1="0" y1={getY(0)} x2={width} y2={getY(0)} stroke="currentColor" className="text-slate-300 dark:text-slate-700" strokeWidth="0.5" strokeDasharray="2" opacity="0.8" />
            )}

            {/* Ligne Verticale "Aujourd'hui" */}
            <line x1={todayX} y1="0" x2={todayX} y2={height} stroke="currentColor" className="text-blue-500/30 dark:text-blue-400/30" strokeWidth="1" strokeDasharray="2 2" />

            {/* Courbe Future (Prévision) - Compressée, Pointillée, Teinte différente */}
            <polyline fill="none" stroke="currentColor" className="text-slate-400 dark:text-slate-500" strokeWidth="1.5" strokeDasharray="3 3" points={futurePointsStr} vectorEffect="non-scaling-stroke" strokeLinecap="round" strokeLinejoin="round" />

            {/* Courbe Passée (Réel) - Solide et lisse */}
            <polyline fill="none" stroke="#3b82f6" strokeWidth="2.5" points={pastPointsStr} vectorEffect="non-scaling-stroke" strokeLinecap="round" strokeLinejoin="round" />

            {/* Marqueur "Aujourd'hui" lumineux */}
            <circle cx={todayX} cy={todayY} r="3" className="fill-white dark:fill-slate-900 stroke-blue-500" strokeWidth="1.5" vectorEffect="non-scaling-stroke" />
            <circle cx={todayX} cy={todayY} r="1.5" className="fill-blue-500 animate-pulse" vectorEffect="non-scaling-stroke" />
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
    const habits = Array.isArray(data.habits) ? data.habits : []; 
    
    const budget = data.budget || {};
    const transactions = Array.isArray(budget.transactions) ? budget.transactions : [];
    const scheduled = Array.isArray(budget.scheduled) ? budget.scheduled : [];
    const recurring = Array.isArray(budget.recurring) ? budget.recurring : [];
    const accounts = Array.isArray(budget.accounts) ? budget.accounts : [];
    
    const labels = data.customLabels || {};

    // --- FILTRES ---
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

    const currentBalanceRaw = transactions.filter(t => isRelevantItem(t)).reduce((acc, t) => acc + getFinancialImpact(t), 0);
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

    const getProjectedEndOfMonth = () => {
        const today = new Date();
        const lastDayOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0); 
        let projected = currentBalance;
        scheduled.forEach(s => {
            if (s.status === 'pending' && isRelevantItem(s)) {
                const sDate = new Date(s.date);
                if (sDate >= today && sDate <= lastDayOfMonth) projected += getFinancialImpact(s);
            }
        });
        recurring.forEach(r => {
            if (isRelevantItem(r) && r.nextDueDate) {
                const rDate = new Date(r.nextDueDate);
                if (rDate >= today && rDate <= lastDayOfMonth) projected += getFinancialImpact(r);
            }
        });
        return projected;
    };
    const projectedBalance = getProjectedEndOfMonth();
    const balanceDiff = projectedBalance - currentBalance; 

    // --- ALGORITHME DU GRAPHIQUE PREMIUM (30J PASSÉ + AUJOURD'HUI + 30J FUTUR) ---
    const getPremiumSparklineData = () => {
        try {
            const pastDays = 30;
            const futureDays = 30;
            const pastHistory = [];
            const futureHistory = [];

            // 1. Calcul du passé
            let tempBalancePast = currentBalance;
            const dailyChangesPast = {};
            const relevantTransactions = transactions.filter(t => isRelevantItem(t));
            
            relevantTransactions.forEach(t => {
                const d = new Date(t.date); d.setHours(0,0,0,0);
                const key = d.getTime();
                const impact = getFinancialImpact(t);
                dailyChangesPast[key] = (dailyChangesPast[key] || 0) + impact;
            });
            
            let cursorPast = new Date(); cursorPast.setHours(0,0,0,0); 
            for (let i = 0; i < pastDays; i++) {
                pastHistory.unshift(Number(tempBalancePast.toFixed(2)));
                const key = cursorPast.getTime();
                tempBalancePast -= (dailyChangesPast[key] || 0);
                cursorPast.setDate(cursorPast.getDate() - 1);
            }

            // 2. Calcul du futur (Simulation)
            let tempBalanceFuture = currentBalance;
            let cursorFuture = new Date(); cursorFuture.setHours(0,0,0,0);
            
            for (let i = 1; i <= futureDays; i++) {
                cursorFuture.setDate(cursorFuture.getDate() + 1);
                const checkDate = new Date(cursorFuture);
                let dailyChange = 0;

                // Ajout des dépenses/revenus planifiés
                scheduled.forEach(s => {
                    if (s.status === 'pending' && isRelevantItem(s)) {
                        const sDate = new Date(s.date);
                        if (sDate.getFullYear() === checkDate.getFullYear() && sDate.getMonth() === checkDate.getMonth() && sDate.getDate() === checkDate.getDate()) {
                            dailyChange += getFinancialImpact(s);
                        }
                    }
                });

                // Ajout des dépenses/revenus récurrents
                recurring.forEach(r => {
                    if (!isRelevantItem(r)) return;
                    if (r.endDate && new Date(r.endDate) < checkDate) return;
                    
                    const daysInMonth = new Date(checkDate.getFullYear(), checkDate.getMonth() + 1, 0).getDate();
                    // On gère r.dayOfMonth ou r.day_of_month avec une sécurité
                    const effectiveDay = Math.min(r.dayOfMonth || r.day_of_month || 1, daysInMonth);
                    
                    if (checkDate.getDate() === effectiveDay) {
                        dailyChange += getFinancialImpact(r);
                    }
                });

                tempBalanceFuture += dailyChange;
                futureHistory.push(Number(tempBalanceFuture.toFixed(2)));
            }

            return { 
                past: pastHistory, 
                current: Number(currentBalance.toFixed(2)), 
                future: futureHistory 
            };
        } catch (e) { 
            return { past: [0], current: 0, future: [0] }; 
        }
    };
    
    const premiumData = getPremiumSparklineData();
    // On extrait le solde final simulé à J+30
    const forecast30Days = premiumData.future[premiumData.future.length - 1] || currentBalance;

    const getUpcomingEvents = () => {
        try {
            const today = new Date(); today.setHours(0,0,0,0);
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
            return events.filter(e => !isNaN(e.date.getTime()) && e.date >= today).sort((a, b) => a.date - b.date).slice(0, 3);
        } catch (e) { return []; }
    };
    const upcomingList = getUpcomingEvents();

    const getNextCalendarEvents = () => {
        try {
            const now = new Date(); const today = new Date(); today.setHours(0,0,0,0);
            const calEvents = (data.calendar_events || []).map(e => ({ id: e.id, title: e.title, start_time: e.start_time, is_todo: false, is_all_day: e.is_all_day }));
            return calEvents.filter(e => {
                const evtDate = new Date(e.start_time);
                if (e.is_all_day) return evtDate >= today;
                return evtDate > now;
            }).sort((a, b) => new Date(a.start_time) - new Date(b.start_time)).slice(0, 4);
        } catch (e) { return []; }
    };
    const nextCalendarEvents = getNextCalendarEvents();

    const getDayCounterLabel = (dateStr) => {
        const today = new Date(); today.setHours(0,0,0,0);
        const target = new Date(dateStr); target.setHours(0,0,0,0);
        const diffTime = target - today;
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        if (diffDays === 0) return { text: 'Auj.', color: 'text-green-600 bg-green-100 dark:bg-emerald-900/30 dark:text-emerald-400' };
        if (diffDays === 1) return { text: 'Demain', color: 'text-blue-600 bg-blue-100 dark:bg-blue-900/30 dark:text-blue-400' };
        if (diffDays < 0) return { text: 'Passé', color: 'text-gray-400 bg-gray-100' };
        return { text: `J-${diffDays}`, color: 'text-purple-600 bg-purple-100 dark:bg-purple-900/30 dark:text-purple-400' };
    };

    const toggleTodo = (id) => {
        const newTodos = todos.map(t => t.id === id ? { ...t, completed: !t.completed } : t);
        updateData({ ...data, todos: newTodos });
    };

    const updateHabit = (updatedHabit) => {
        const newHabits = habits.map(h => h.id === updatedHabit.id ? updatedHabit : h);
        updateData({ ...data, habits: newHabits }, { table: 'habits', id: updatedHabit.id, action: 'update', data: { history: updatedHabit.history, streak: updatedHabit.streak } });
    };

    const getAccountBalanceForProject = (accId) => {
        return transactions.filter(t => String(t.accountId || t.account_id) === String(accId)).reduce((acc, t) => t.type === 'income' ? acc + parseFloat(t.amount || 0) : acc - parseFloat(t.amount || 0), 0);
    };

    const priorityWeight = { high: 3, medium: 2, low: 1, none: 0 };
    const activeProjects = projects.filter(p => p.status !== 'done' && p.status !== 'on_hold').sort((a, b) => {
        const weightA = priorityWeight[a.priority] || 0;
        const weightB = priorityWeight[b.priority] || 0;
        return weightB - weightA; 
    }).slice(0, 3);

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
        <div className="space-y-6 fade-in p-6 pb-24 md:pb-20 w-full transition-all duration-300">
            {focusedProject && (
                <FocusProjectModal project={focusedProject} onClose={() => setFocusedProject(null)} updateProject={updateProjectFromFocus} accounts={accounts} availableForProjects={currentBalance} getAccountBalance={getAccountBalanceForProject} />
            )}

            {/* HEADER */}
            <div className="flex flex-col lg:flex-row gap-6">
                <div className="flex-1 bg-white/70 dark:bg-slate-900/60 backdrop-blur-xl p-4 md:p-6 rounded-[2.5rem] shadow-2xl border border-white dark:border-white/5 flex flex-col justify-center relative overflow-hidden group">
                    <div className="absolute -right-20 -top-20 w-64 h-64 bg-blue-500/5 rounded-full blur-3xl"></div>
                    <div className="grid grid-cols-1 md:grid-cols-3 items-center relative z-10 w-full">
                        <div className="flex justify-start">
                            <select value={dashboardFilter} onChange={(e) => setDashboardFilter(e.target.value)} className="px-3 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-[10px] font-black outline-none text-slate-800 dark:text-white shadow-sm">
                                <option value="total">GLOBAL</option>
                                {accounts.map(acc => <option key={acc.id} value={acc.id}>{acc.name}</option>)}
                            </select>
                        </div>
                        <div className="text-center">
                            <p className="text-blue-600 dark:text-blue-400 text-[10px] md:text-xs font-bold uppercase tracking-[0.3em]">{todayDate}</p>
                        </div>
                        <div className="flex justify-end gap-2">
                            <button onClick={() => setView('budget')} className="p-2.5 bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-xl shadow-lg hover:scale-110 active:scale-95 transition-all"><Plus size={16}/></button>
                            <button onClick={() => setView('todo')} className="p-2.5 bg-white dark:bg-slate-800 text-slate-900 dark:text-white border border-slate-200 dark:border-slate-700 rounded-xl shadow-sm hover:bg-slate-50 transition-all"><CheckSquare size={16}/></button>
                            <button onClick={() => setView('notes')} className="p-2.5 bg-white dark:bg-slate-800 text-slate-900 dark:text-white border border-slate-200 dark:border-slate-700 rounded-xl shadow-sm hover:bg-slate-50 transition-all"><StickyNote size={16}/></button>
                        </div>
                    </div>
                </div>
            </div>

            {/* METRICS ROW */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                <div className="bg-white dark:bg-slate-900 p-8 rounded-[2.5rem] shadow-2xl border border-slate-100 dark:border-slate-800 relative overflow-hidden flex flex-col group h-full transition-all hover:border-emerald-500/20">
                    <div className="relative z-10 flex justify-between items-start mb-10">
                        <div className="p-4 bg-emerald-50 dark:bg-emerald-900/20 rounded-2xl text-emerald-600 dark:text-emerald-400 ring-1 ring-emerald-100 dark:ring-emerald-800"><Wallet size={28}/></div>
                        <button onClick={togglePrivacyMode} className="p-2 text-slate-300 dark:text-slate-600 hover:text-blue-500 transition-all">
                            {isPrivacyMode ? <EyeOff size={22}/> : <Eye size={22}/>}
                        </button>
                    </div>
                    <div className="relative z-10 mb-6">
                        <h3 className="text-4xl md:text-5xl font-black text-slate-900 dark:text-white tracking-tighter mb-2">{renderAmount(currentBalance)}</h3>
                        <p className="text-xs font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest text-center md:text-left">TRÉSORERIE {dashboardFilter === 'total' ? 'GLOBALE' : 'COMPTE'}</p>
                        
                        {/* L'ancien petit encart a été gardé pour la cohérence, mais la vraie star est en dessous */}
                        {!isPrivacyMode && (
                            <div className="mt-4 inline-flex items-center gap-2 px-3 py-1 bg-slate-50 dark:bg-slate-800/50 rounded-full border border-slate-100 dark:border-slate-700">
                                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter opacity-70">Projeté fin de mois :</span>
                                <span className={`text-xs font-black ${balanceDiff >= 0 ? "text-emerald-500" : "text-rose-500"}`}>{renderAmount(projectedBalance)}</span>
                            </div>
                        )}
                    </div>
                    
                    {/* LE NOUVEAU GRAPHIQUE PREMIUM */}
                    <div className="w-full mt-auto bg-slate-50/50 dark:bg-slate-800/30 rounded-3xl p-5 border border-slate-100 dark:border-slate-800/50 relative group/chart">
                        <div className="flex justify-between items-center mb-3">
                            <span className="text-[9px] font-black uppercase tracking-widest text-slate-400">Passé (30J)</span>
                            <span className="text-[9px] font-black uppercase tracking-widest text-blue-500 bg-blue-50 dark:bg-blue-900/30 px-2 py-0.5 rounded-full ring-1 ring-blue-100 dark:ring-blue-900/50">Aujourd'hui</span>
                            <span className="text-[9px] font-black uppercase tracking-widest text-slate-400 text-right">Prévu (+30J)</span>
                        </div>
                        <div className="h-20 w-full">
                            <PremiumChart data={premiumData} height={80} />
                        </div>
                        {/* Info Bulle de projection (S'affiche au survol du graphique) */}
                        {!isPrivacyMode && (
                            <div className="absolute -top-3 right-4 opacity-0 group-hover/chart:opacity-100 transition-opacity duration-300 bg-slate-900 dark:bg-white text-white dark:text-slate-900 text-[10px] font-black px-3 py-1.5 rounded-xl shadow-xl pointer-events-none z-20">
                                Projection à 30J : <span className={forecast30Days >= currentBalance ? 'text-emerald-400 dark:text-emerald-600' : 'text-rose-400 dark:text-rose-600'}>{renderAmount(forecast30Days)}</span>
                            </div>
                        )}
                    </div>
                </div>

                <div className="lg:col-span-2 bg-white dark:bg-slate-900 p-8 rounded-[2.5rem] shadow-2xl border border-slate-100 dark:border-slate-800 flex flex-col group transition-all hover:border-purple-500/20">
                    <div className="flex items-center gap-3 mb-8 text-purple-600 dark:text-purple-400">
                        <div className="p-2 bg-purple-50 dark:bg-purple-900/20 rounded-xl"><Calendar size={22}/></div>
                        <h3 className="text-xl font-black text-slate-800 dark:text-white uppercase tracking-tighter">Opérations à venir</h3>
                    </div>
                    <div className="flex-1 flex flex-col gap-4">
                        {upcomingList.length === 0 ? (
                            <div className="flex-1 flex items-center justify-center text-slate-400 italic py-4 font-bold opacity-30 tracking-widest uppercase text-center">Tranquillité totale</div>
                        ) : (
                            upcomingList.map((e, idx) => {
                                const impact = getFinancialImpact(e.data);
                                const isNeutral = impact === 0;
                                const isPositive = impact > 0;
                                return (
                                    <div key={idx} className="flex items-center justify-between p-4 md:p-6 bg-slate-50/50 dark:bg-slate-800/40 rounded-[1.5rem] border border-slate-100 dark:border-slate-800 hover:bg-white dark:hover:bg-slate-800 transition-all duration-300 shadow-sm">
                                        <div className="flex items-center gap-5 overflow-hidden">
                                            <div className="p-3 bg-white dark:bg-slate-700 rounded-xl text-slate-500 shadow-sm shrink-0 border dark:border-slate-600">
                                                {e.data.type === 'transfer' ? <ArrowRightLeft size={18} className="text-blue-500"/> : e.type === 'scheduled' ? <Calendar size={18}/> : <TrendingUp size={18}/>}
                                            </div>
                                            <div className="min-w-0">
                                                <p className="font-bold text-slate-800 dark:text-white text-sm truncate">{e.data.description}</p>
                                                <div className="flex items-center gap-2 text-[10px] font-bold text-gray-400 uppercase">
                                                    <span>{e.date.toLocaleDateString()}</span>
                                                    {e.type === 'recurring' && <span className="text-blue-500 font-black">• RÉCURRENCE</span>}
                                                </div>
                                            </div>
                                        </div>
                                        <span className={`font-black text-base shrink-0 pl-4 ${isNeutral ? 'text-blue-600' : isPositive ? 'text-emerald-600' : 'text-rose-600'}`}>
                                            {isNeutral ? 'TRANS.' : renderAmount(impact, true)}
                                        </span>
                                    </div>
                                );
                            })
                        )}
                    </div>
                </div>
            </div>

            {/* MAIN CONTENT */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                <div className="lg:col-span-8 space-y-8">
                    
                    {/* --- ZONE HABITUDES --- */}
                    {habits.length > 0 && (
                        <div className="bg-white/50 dark:bg-slate-900/50 backdrop-blur-sm rounded-[2.5rem] border border-slate-100 dark:border-slate-800 p-6 shadow-sm">
                            <h3 className="text-lg font-black text-slate-800 dark:text-white flex items-center gap-3 uppercase tracking-widest mb-4 ml-2">
                                <Activity size={20} className="text-blue-500"/> Routines du jour
                            </h3>
                            <HabitStrip habits={habits} updateHabit={updateHabit} setView={setView} />
                        </div>
                    )}

                    {/* --- ZONE NOTES ÉPINGLÉES --- */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-8">
                        {pinnedNotes.map(n => (
                            <div key={n.id} className={`p-10 rounded-[2.5rem] border border-white/20 shadow-2xl ${n.color} text-slate-900 relative overflow-hidden cursor-pointer group hover:scale-[1.02] transition-all shadow-sm`} onClick={() => setView('notes')}>
                                <div className="absolute top-6 right-8 opacity-20"><StickyNote size={28}/></div>
                                <h4 className="font-black text-xl mb-4 tracking-tighter uppercase">{n.title}</h4>
                                <p className="text-sm font-medium opacity-80 leading-relaxed line-clamp-4">{n.content}</p>
                            </div>
                        ))}
                    </div>

                    {/* --- ZONE PROJETS ACTIFS --- */}
                    <div className="bg-white dark:bg-slate-900 p-8 rounded-[2.5rem] border border-slate-100 dark:border-slate-800 shadow-2xl">
                        <div className="flex justify-between items-center mb-8">
                            <h3 className="text-xl font-black text-slate-800 dark:text-white flex items-center gap-3 tracking-tighter uppercase">
                                <div className="p-2 bg-blue-50 dark:bg-blue-900/20 rounded-xl text-blue-600"><FolderKanban size={22}/></div>
                                Projets Actifs
                            </h3>
                            <button onClick={handleAutoFocus} className="px-5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-lg shadow-indigo-900/20 active:scale-95 transition-all">FOCUS</button>
                        </div>
                        <div className="space-y-4">
                            {activeProjects.length === 0 ? (
                                <p className="text-center text-slate-400 py-10 font-bold italic opacity-50 tracking-widest uppercase">Aucun projet actif</p>
                            ) : (
                                activeProjects.map(p => {
                                    const cost = parseFloat(p.cost || 0);
                                    let budgetAvailable = p.linkedAccountId ? getAccountBalanceForProject(p.linkedAccountId) : Math.max(0, currentBalance);
                                    const fundingPercentage = cost > 0 ? Math.min(100, (Math.max(0, budgetAvailable) / cost) * 100) : 0;
                                    const isFunded = budgetAvailable >= cost;
                                    const safeProgress = Math.min(100, Math.max(0, p.progress || 0));
                                    const safeFunding = Math.min(100, Math.max(0, fundingPercentage));
                                    const globalScore = cost > 0 ? (safeProgress + safeFunding) / 2 : safeProgress;

                                    return (
                                        <div key={p.id} className="bg-slate-50/50 dark:bg-slate-800/30 p-6 rounded-[2rem] border border-slate-100 dark:border-slate-800/80 hover:bg-white dark:hover:bg-slate-800 transition-all cursor-pointer group" onClick={() => setView('projects')}>
                                            <div className="flex items-center gap-5 mb-6">
                                                <div className="relative w-16 h-16 shrink-0">
                                                    <svg className="w-full h-full -rotate-90" viewBox="0 0 36 36">
                                                        <path className="text-slate-200 dark:text-slate-700" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="currentColor" strokeWidth="3" />
                                                        <path className="text-blue-500 transition-all duration-1000" strokeDasharray={`${globalScore}, 100`} d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
                                                    </svg>
                                                    <span className="absolute inset-0 flex items-center justify-center text-[10px] font-black dark:text-white">{Math.round(globalScore)}%</span>
                                                </div>
                                                <div className="min-w-0 flex-1">
                                                    <h4 className="font-black text-slate-800 dark:text-white text-base truncate">{p.title}</h4>
                                                    <div className="flex items-center gap-2 mt-0.5">
                                                        <span className={`w-2 h-2 shrink-0 rounded-full ${p.status === 'in_progress' ? 'bg-green-500' : 'bg-blue-500'}`}></span>
                                                        <p className="text-xs text-slate-400 font-bold uppercase truncate tracking-tighter">{p.description || "Aucun descriptif"}</p>
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 md:gap-4">
                                                <div className="space-y-1">
                                                    <div className="flex justify-between text-[10px] font-black text-slate-400 uppercase tracking-tighter">
                                                        <span className="flex items-center gap-1"><List size={10}/> Tâches</span>
                                                        <span className="dark:text-white">{Math.round(safeProgress)}%</span>
                                                    </div>
                                                    <div className="h-1.5 w-full bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden shadow-inner">
                                                        <div className="h-full bg-blue-500 transition-all duration-500" style={{ width: `${safeProgress}%` }}></div>
                                                    </div>
                                                </div>
                                                {cost > 0 && (
                                                    <div className="space-y-1">
                                                        <div className="flex justify-between text-[10px] font-black text-slate-400 uppercase tracking-tighter">
                                                            <span className="flex items-center gap-1"><Euro size={10}/> Budget</span>
                                                            <span className={isFunded ? "text-green-500" : "text-orange-500"}>{Math.round(safeFunding)}%</span>
                                                        </div>
                                                        <div className="h-1.5 w-full bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden shadow-inner">
                                                            <div className={`h-full rounded-full transition-all duration-500 ${isFunded ? 'bg-green-500' : 'bg-orange-500'}`} style={{ width: `${safeFunding}%` }}></div>
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    );
                                })
                            )}
                        </div>
                    </div>
                </div>

                {/* COLONNE DROITE */}
                <div className="lg:col-span-4 space-y-8">
                    <div className="bg-white dark:bg-slate-900 p-8 rounded-[2.5rem] border border-slate-100 dark:border-slate-800 shadow-2xl group transition-all" onClick={() => setView('planning')}>
                        <div className="flex justify-between items-center mb-8">
                            <h3 className="text-lg font-black text-slate-800 dark:text-white flex items-center gap-3 uppercase tracking-widest text-center md:text-left">
                                <div className="p-2 bg-blue-50 dark:bg-blue-900/20 rounded-xl text-blue-600"><Clock size={20}/></div>
                                Agenda
                            </h3>
                        </div>
                        <div className="space-y-4">
                            {nextCalendarEvents.length === 0 ? (
                                <p className="text-slate-400 text-sm font-bold italic py-8 uppercase opacity-50 tracking-widest text-center">Calendrier vierge</p>
                            ) : (
                                nextCalendarEvents.map((evt, index) => {
                                    const d = new Date(evt.start_time);
                                    const dayLabel = getDayCounterLabel(evt.start_time);
                                    const isToday = dayLabel.text === 'Auj.';
                                    const isNext = index === 0;

                                    return (
                                        <div key={`${evt.type}-${evt.id}`} className={`relative overflow-hidden flex gap-5 items-center p-4 rounded-3xl transition-all cursor-pointer group/item shadow-sm ${isNext ? 'bg-indigo-50/50 dark:bg-indigo-900/20 ring-1 ring-indigo-200 dark:ring-indigo-800 hover:bg-indigo-100 dark:hover:bg-indigo-900/40' : isToday ? 'bg-white dark:bg-slate-800 ring-1 ring-slate-200 dark:ring-slate-700 shadow-sm hover:shadow-md hover:ring-slate-300 dark:hover:ring-slate-600' : 'hover:bg-slate-50 dark:hover:bg-slate-800 border border-transparent'}`}>
                                            
                                            {/* BARRE LUMINEUSE POUR LE PROCHAIN */}
                                            {isNext && <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-indigo-500 shadow-[0_0_10px_rgba(99,102,241,0.5)]"></div>}
                                            
                                            {/* BARRE DISCRÈTE POUR LE RESTE D'AUJOURD'HUI */}
                                            {!isNext && isToday && <div className="absolute left-0 top-0 bottom-0 w-1 bg-slate-300 dark:bg-slate-600"></div>}
                                            
                                            <div className={`flex flex-col items-center justify-center w-14 h-14 ${evt.is_todo ? 'bg-orange-50 text-orange-600 border-orange-100' : 'bg-purple-50 text-purple-600 border-purple-100'} dark:bg-opacity-20 rounded-2xl border shrink-0 transition-transform group-hover/item:scale-110 shadow-sm shadow-indigo-500/5`}>
                                                <span className="text-[10px] font-black uppercase leading-none">{d.toLocaleDateString('fr-FR', {weekday: 'short'}).replace('.', '')}</span>
                                                <span className="text-xl font-black leading-none mt-1">{d.getDate()}</span>
                                            </div>
                                            <div className="min-w-0 flex-1">
                                                <div className="flex items-center justify-between">
                                                    <p className={`text-sm font-black truncate tracking-tighter ${isNext ? 'text-indigo-900 dark:text-indigo-100' : 'text-slate-800 dark:text-white'}`}>{evt.title}</p>
                                                    <div className="flex items-center gap-1">
                                                        {isNext && <span className="text-[8px] font-black px-1.5 py-0.5 rounded-full bg-indigo-500 text-white shadow-sm uppercase tracking-widest animate-pulse">Prochain</span>}
                                                        <span className={`text-[9px] font-black px-2 py-0.5 rounded-full ${dayLabel.color} shadow-sm`}>{dayLabel.text}</span>
                                                    </div>
                                                </div>
                                                <p className={`text-[11px] font-bold uppercase mt-1 flex items-center gap-1 ${isNext ? 'text-indigo-500/80 dark:text-indigo-400/80' : 'text-slate-400'}`}>
                                                    {evt.is_all_day ? "Journée" : d.toLocaleTimeString('fr-FR', {hour: '2-digit', minute:'2-digit'})}
                                                    {evt.is_todo && <CheckCircle2 size={10} className="text-orange-500"/>}
                                                </p>
                                            </div>
                                        </div>
                                    );
                                })
                            )}
                        </div>
                    </div>

                    <div className="bg-white dark:bg-slate-900 p-8 rounded-[2.5rem] border border-slate-100 dark:border-slate-800 shadow-2xl relative overflow-hidden">
                        <div className="absolute -left-4 -top-4 p-8 opacity-5 text-rose-500"><Flag size={80} className="-rotate-12"/></div>
                        <div className="flex justify-between items-center mb-8 relative z-10">
                            <h3 className="text-lg font-black text-slate-800 dark:text-white flex items-center gap-3 uppercase tracking-widest text-center md:text-left">
                                <div className="p-2 bg-rose-50 dark:bg-rose-900/20 rounded-xl text-rose-600"><Flag size={20}/></div>
                                Priorités
                            </h3>
                            <span className="bg-rose-500 text-white text-[10px] font-black px-2 py-1 rounded-lg shadow-lg shadow-rose-500/20">{urgentTodos.length}</span>
                        </div>
                        <div className="space-y-4 relative z-10">
                            {urgentTodos.length === 0 ? (
                                <p className="text-slate-400 text-sm font-bold italic py-6 text-center opacity-50 uppercase tracking-widest">Aucune tâche urgente</p>
                            ) : (
                                urgentTodos.map(t => (
                                    <div key={t.id} className="group flex items-center gap-5 p-5 bg-white dark:bg-slate-800/50 rounded-3xl border border-slate-100 dark:border-slate-700 hover:border-rose-500/30 transition-all cursor-pointer shadow-sm shadow-indigo-500/5" onClick={() => toggleTodo(t.id)}>
                                        <button className="shrink-0 w-7 h-7 rounded-xl border-2 border-slate-200 dark:border-slate-600 flex items-center justify-center group-hover:border-emerald-500 group-hover:bg-emerald-500 transition-all text-transparent group-hover:text-white shadow-inner">
                                            <CheckCircle2 size={14} />
                                        </button>
                                        <div className="flex-1 min-w-0">
                                            <span className="text-sm font-black text-slate-800 dark:text-slate-100 truncate block tracking-tighter">{t.text}</span>
                                            <div className="flex items-center gap-2 mt-1">
                                                <span className="text-[8px] font-black text-rose-500 uppercase tracking-widest px-1.5 py-0.5 border border-rose-500/30 rounded bg-rose-500/5 shadow-sm">Urgent</span>
                                            </div>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                        <button onClick={() => setView('todo')} className="w-full mt-10 py-5 bg-slate-900 dark:bg-slate-800 text-white text-[10px] font-black uppercase tracking-[0.2em] rounded-3xl hover:bg-black transition-all shadow-xl active:scale-95 shadow-sm shadow-indigo-500/10">Explorer les tâches</button>
                    </div>
                </div>
            </div>
        </div>
    );
}