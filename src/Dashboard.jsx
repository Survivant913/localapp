import { useState, useMemo, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
// AJOUT : Import de supabase pour la synchronisation parfaite avec le Tracker
import { supabase } from './supabaseClient';
import * as AllIcons from 'lucide-react';
import { 
    LayoutDashboard, Wallet, TrendingUp, TrendingDown, 
    CheckSquare, StickyNote, Plus, FolderKanban, 
    Calendar, Eye, EyeOff, CheckCircle2, List, Target, Euro, Flag, Clock, ArrowRightLeft, ArrowRight,
    Repeat, RotateCcw, Check, Coffee, Activity, ChevronLeft, ChevronRight, Flame, Trophy, X, Zap, Sparkles
} from 'lucide-react'; 
import FocusProjectModal from './FocusProjectModal';
import DashboardCalendar from './DashboardCalendar';

// --- UTILITAIRE : CALCUL DE LA SÉRIE (STREAK) EN TEMPS RÉEL ---
const getHabitDays = (h) => Array.isArray(h?.days_of_week) ? h.days_of_week : (h?.days_of_week?.days || [0,1,2,3,4,5,6]);
const getHabitImportance = (h) => Array.isArray(h?.days_of_week) ? 1 : (h?.days_of_week?.importance || 1);

const calculateStreak = (habit) => {
    if (!habit.history || habit.history.length === 0) return 0;
    
    // Normalise toutes les dates en YYYY-MM-DD local
    const toLocalYYYYMMDD = (d) => {
        let dateObj;
        if (typeof d === 'string' && d.length === 10) {
            // Si c'est déjà YYYY-MM-DD, forcer midi pour éviter les décalages UTC
            dateObj = new Date(d + 'T12:00:00');
        } else {
            dateObj = new Date(d);
        }
        if (isNaN(dateObj.getTime())) return null;
        return `${dateObj.getFullYear()}-${String(dateObj.getMonth() + 1).padStart(2, '0')}-${String(dateObj.getDate()).padStart(2, '0')}`;
    };

    const historyDates = habit.history.map(toLocalYYYYMMDD).filter(Boolean);
    const uniqueHistory = [...new Set(historyDates)].sort((a, b) => b.localeCompare(a)); // Décroissant YYYY-MM-DD
    
    let streak = 0;
    let currentDate = new Date();
    
    const isScheduled = (dateObj) => {
        const dayIdx = dateObj.getDay();
        if (habit.days_of_week && Array.isArray(habit.days_of_week)) {
            return habit.days_of_week.includes(dayIdx);
        }
        if (habit.frequency && Array.isArray(habit.frequency)) {
            return habit.frequency.some(d => {
                if (!d) return false;
                const norm = typeof d === 'string' ? d.toLowerCase().trim().substring(0, 3) : ''; 
                const map = { 'dim': 0, 'sun': 0, 'lun': 1, 'mon': 1, 'mar': 2, 'tue': 2, 'mer': 3, 'wed': 3, 'jeu': 4, 'thu': 4, 'ven': 5, 'fri': 5, 'sam': 6, 'sat': 6 };
                return map[norm] === dayIdx;
            });
        }
        return true; 
    };

    let historyIdx = 0;
    let daysChecked = 0;
    
    while (daysChecked < 365) { 
        const currentStr = toLocalYYYYMMDD(currentDate);
        const doneToday = historyIdx < uniqueHistory.length && uniqueHistory[historyIdx] === currentStr;

        if (isScheduled(currentDate)) {
            if (doneToday) {
                streak++;
                historyIdx++;
            } else {
                if (daysChecked > 0) break; 
            }
        } else {
            if (doneToday) {
                streak++;
                historyIdx++;
            }
        }
        
        currentDate.setDate(currentDate.getDate() - 1);
        daysChecked++;
        if (historyIdx >= uniqueHistory.length) break;
    }
    
    return streak;
};

// --- COMPOSANT ROUTINE FOCUS MODAL ---
const RoutineFocusModal = ({ habits, updateHabit, onClose }) => {
    // Trier les habitudes : non complétées d'abord
    const [localHabits, setLocalHabits] = useState(() => {
        return [...habits].sort((a, b) => {
            const aDone = calculateStreak(a) > 0 && a.history?.includes(new Date().toLocaleDateString('fr-CA')); // Simplification
            const bDone = calculateStreak(b) > 0 && b.history?.includes(new Date().toLocaleDateString('fr-CA'));
            if (aDone === bDone) return 0;
            return aDone ? 1 : -1;
        });
    });

    const [animatingId, setAnimatingId] = useState(null);

    const handleCheck = async (habit) => {
        setAnimatingId(habit.id);
        
        const now = new Date();
        const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`; 
        
        const newHistory = [...(habit.history || []), todayStr];
        updateHabit({ ...habit, history: newHistory }); 

        try {
            await supabase.from('habit_logs').insert({ habit_id: habit.id, date: todayStr, completed: true });
        } catch (err) { console.error(err); }

        setTimeout(() => {
            setLocalHabits(prev => {
                const updated = prev.map(h => h.id === habit.id ? { ...h, history: newHistory } : h);
                return updated.sort((a, b) => {
                    const aDone = a.history?.includes(todayStr);
                    const bDone = b.history?.includes(todayStr);
                    if (aDone === bDone) return 0;
                    return aDone ? 1 : -1;
                });
            });
            setAnimatingId(null);
        }, 600);
    };

    const todayStr = new Date().toLocaleDateString('fr-CA');
    const completedCount = localHabits.filter(h => h.history?.includes(todayStr)).length;
    const totalImp = localHabits.reduce((acc, h) => acc + getHabitImportance(h), 0);
    const completedImp = localHabits.filter(h => h.history?.includes(todayStr)).reduce((acc, h) => acc + getHabitImportance(h), 0);
    const progress = totalImp > 0 ? (completedImp / totalImp) * 100 : 0;

    return createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 sm:p-6">
            <div className="absolute inset-0 bg-black/70 backdrop-blur-sm transition-opacity" onClick={onClose}></div>
            <div className="bg-white dark:bg-[#111113] rounded-2xl shadow-2xl border border-zinc-200 dark:border-zinc-800 w-full max-w-md relative z-10 flex flex-col max-h-[90vh] overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                
                {/* En-tête */}
                <div className="p-6 pb-4 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between shrink-0">
                    <div>
                        <h2 className="text-xl font-bold text-zinc-900 dark:text-white tracking-tight">Routine du jour</h2>
                        <p className="text-xs font-mono text-zinc-500 dark:text-zinc-400 mt-1">{completedCount} / {localHabits.length} terminées</p>
                    </div>
                    <button onClick={onClose} className="p-2 bg-zinc-100 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg text-zinc-500 hover:text-zinc-900 dark:hover:text-white transition-all">
                        <X size={18} />
                    </button>
                </div>

                {/* Jauge de progression */}
                <div className="px-6 py-3 shrink-0">
                    <div className="h-1.5 w-full bg-zinc-100 dark:bg-zinc-800 rounded-full overflow-hidden">
                        <div className="h-full bg-zinc-900 dark:bg-white rounded-full transition-all duration-500 ease-out" style={{ width: `${progress}%` }}></div>
                    </div>
                </div>

                {/* Liste des habitudes */}
                <div className="flex-1 overflow-y-auto p-6 pt-2 space-y-2.5 scrollbar-hide">
                    {localHabits.map((habit) => {
                        const isDone = habit.history?.includes(todayStr);
                        const streak = calculateStreak(habit);
                        const isAnimating = animatingId === habit.id;

                        return (
                            <div 
                                key={habit.id}
                                onClick={() => !isDone && handleCheck(habit)}
                                className={`group relative p-3.5 rounded-xl border transition-all duration-200 flex items-center gap-4
                                    ${isDone 
                                        ? 'bg-zinc-50 dark:bg-[#09090b] border-zinc-200/60 dark:border-zinc-800/50 opacity-50' 
                                        : 'bg-white dark:bg-[#141416] border-zinc-200 dark:border-zinc-800 hover:border-zinc-400 dark:hover:border-zinc-600 cursor-pointer'
                                    }
                                    ${isAnimating ? 'scale-95 opacity-50' : 'scale-100'}
                                `}
                            >
                                {/* Checkbox / Icône */}
                                <div className={`w-11 h-11 rounded-lg flex items-center justify-center shrink-0 transition-colors duration-200 border
                                    ${isDone ? 'bg-zinc-100 dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 text-zinc-400' : 'bg-zinc-100 dark:bg-[#09090b] border-zinc-200 dark:border-zinc-800 text-zinc-700 dark:text-zinc-300 group-hover:bg-zinc-900 group-hover:text-white dark:group-hover:bg-white dark:group-hover:text-[#09090b]'}
                                `}>
                                    {isDone ? <Check size={20} strokeWidth={3} /> : <DynamicIcon name={habit.icon} size={20} />}
                                </div>

                                {/* Infos */}
                                <div className="flex-1 min-w-0">
                                    <h3 className={`font-semibold text-sm truncate transition-colors ${isDone ? 'text-zinc-400 line-through' : 'text-zinc-900 dark:text-zinc-100'}`}>
                                        {habit.name}
                                    </h3>
                                    {streak > 0 && (
                                        <div className="flex items-center gap-1.5 mt-1">
                                            <div className={`w-1.5 h-1.5 rounded-full ${streak >= 3 ? 'bg-zinc-900 dark:bg-white' : 'bg-zinc-400 dark:bg-zinc-600'}`}></div>
                                            <span className={`text-[10px] font-mono uppercase tracking-wider ${streak >= 3 ? 'text-zinc-900 dark:text-zinc-200' : 'text-zinc-500'}`}>
                                                Série : {streak}j
                                            </span>
                                        </div>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                    
                    {localHabits.length === 0 && (
                        <div className="text-center py-10 opacity-50">
                            <Coffee size={32} className="mx-auto mb-3" />
                            <p className="text-sm font-bold uppercase tracking-widest">Rien de prévu aujourd'hui</p>
                        </div>
                    )}
                </div>
            </div>
        </div>,
        document.body
    );
};

// --- COMPOSANT DYNAMIC ICON ---
const DynamicIcon = ({ name, size = 18, className = "" }) => {
    if (!name) return <span className="text-lg">✨</span>;
    const pascalName = name.charAt(0).toUpperCase() + name.slice(1);
    const IconComponent = AllIcons[pascalName] || AllIcons[name];
    if (!IconComponent) return <span className="text-xs">{name}</span>; 
    return <IconComponent size={size} className={className} />;
};

// --- COMPOSANT HABIT STRIP (WIDGET RÉSUMÉ) ---
const HabitStrip = ({ habits, updateHabit, setView }) => {
    const todayIndex = new Date().getDay(); 
    
    const todayHabits = useMemo(() => {
        if (!Array.isArray(habits)) return [];
        return habits.filter(h => getHabitDays(h).includes(todayIndex));
    }, [habits, todayIndex]);

    const tomorrowHabits = useMemo(() => {
        if (!Array.isArray(habits)) return [];
        const tomorrowIndex = (todayIndex + 1) % 7;
        return habits.filter(h => getHabitDays(h).includes(tomorrowIndex));
    }, [habits, todayIndex]);

    const todayStr = new Date().toLocaleDateString('fr-CA');
    const completedHabits = todayHabits.filter(h => h.history?.includes(todayStr));
    const isAllDone = todayHabits.length > 0 && completedHabits.length === todayHabits.length;
    
    const [isFocusModalOpen, setIsFocusModalOpen] = useState(false);

    if (todayHabits.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center py-6 opacity-40">
                <Coffee size={24} className="text-slate-400 mb-2"/>
                <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Repos aujourd'hui</span>
            </div>
        );
    }

    return (
        <>
            <div 
                onClick={() => setIsFocusModalOpen(true)}
                className={`group cursor-pointer relative overflow-hidden rounded-xl border p-4 transition-all duration-200 flex items-center justify-between
                ${isAllDone 
                    ? 'bg-zinc-50 dark:bg-[#09090b] border-zinc-200/60 dark:border-zinc-800/60 opacity-70' 
                    : 'bg-white dark:bg-[#141416] border-zinc-200 dark:border-zinc-800 hover:border-zinc-400 dark:hover:border-zinc-600'
                }`}
            >
                <div className="flex items-center gap-4 relative z-10">
                    <div className={`w-11 h-11 rounded-lg flex items-center justify-center transition-colors border
                        ${isAllDone ? 'bg-zinc-100 dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 text-zinc-400' : 'bg-zinc-900 dark:bg-white border-zinc-900 dark:border-white text-white dark:text-[#09090b]'}
                    `}>
                        {isAllDone ? <Check size={18} strokeWidth={3} /> : <Zap size={18} strokeWidth={2.5} />}
                    </div>
                    <div>
                        <h3 className={`font-semibold text-sm tracking-tight ${isAllDone ? 'text-zinc-500' : 'text-zinc-900 dark:text-white'}`}>
                            {isAllDone ? "Routine terminée" : "Routine du jour"}
                        </h3>
                        <p className="text-[11px] font-mono text-zinc-500 uppercase tracking-wider mt-0.5">
                            {completedHabits.length} / {todayHabits.length}
                        </p>
                    </div>
                </div>

                <div className="relative z-10 flex items-center gap-2">
                    <span className={`text-xs font-medium ${isAllDone ? 'text-zinc-500' : 'text-zinc-900 dark:text-white'} opacity-0 group-hover:opacity-100 transition-opacity translate-x-2 group-hover:translate-x-0 hidden sm:block`}>
                        {isAllDone ? "Voir" : "Commencer"}
                    </span>
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center transition-colors border border-zinc-200 dark:border-zinc-800
                        ${isAllDone ? 'bg-zinc-100 dark:bg-zinc-900 text-zinc-400' : 'bg-zinc-100 dark:bg-zinc-900 group-hover:bg-zinc-900 group-hover:text-white dark:group-hover:bg-white dark:group-hover:text-[#09090b]'}
                    `}>
                        <ChevronRight size={15} strokeWidth={2.5} />
                    </div>
                </div>
            </div>

            {isFocusModalOpen && (
                <RoutineFocusModal 
                    habits={todayHabits} 
                    updateHabit={updateHabit} 
                    onClose={() => setIsFocusModalOpen(false)} 
                />
            )}

            {tomorrowHabits.length > 0 && (
                <div className="mt-3 p-4 rounded-xl bg-zinc-50 dark:bg-[#09090b] border border-zinc-200 dark:border-zinc-800">
                    <h4 className="text-[10px] font-mono font-semibold text-zinc-500 uppercase tracking-widest mb-2.5 flex items-center gap-2">
                        Prévu demain
                    </h4>
                    <div className="flex flex-wrap gap-2">
                        {tomorrowHabits.map(h => (
                            <div key={h.id} className="flex items-center gap-1.5 px-2.5 py-1 bg-white dark:bg-[#141416] rounded-md border border-zinc-200 dark:border-zinc-800">
                                <DynamicIcon name={h.icon} size={12} className="text-zinc-500" />
                                <span className="text-[11px] font-medium text-zinc-700 dark:text-zinc-300">{h.name}</span>
                                {getHabitImportance(h) > 1 && (
                                    <span className="text-[9px] font-mono font-bold text-zinc-500 ml-1">x{getHabitImportance(h)}</span>
                                )}
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </>
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
        <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-full overflow-visible text-zinc-900 dark:text-white" preserveAspectRatio="none">
            <defs>
                <linearGradient id={gradientId} x1="0" x2="0" y1="0" y2="1">
                    <stop offset="0%" stopColor="currentColor" stopOpacity="0.18" />
                    <stop offset="100%" stopColor="currentColor" stopOpacity="0" />
                </linearGradient>
            </defs>

            {/* Remplissage uniquement sous la courbe passée */}
            <polygon points={fillPolygon} fill={`url(#${gradientId})`} />

            {/* Ligne du 0€ si on passe en négatif (repère visuel discret) */}
            {min < 0 && max > 0 && (
                <line x1="0" y1={getY(0)} x2={width} y2={getY(0)} stroke="currentColor" className="text-zinc-300 dark:text-zinc-700" strokeWidth="0.5" strokeDasharray="2" opacity="0.8" />
            )}

            {/* Ligne Verticale "Aujourd'hui" */}
            <line x1={todayX} y1="0" x2={todayX} y2={height} stroke="currentColor" className="text-zinc-400/40 dark:text-zinc-600/60" strokeWidth="1" strokeDasharray="2 2" />

            {/* Courbe Future (Prévision) - Compressée, Pointillée, Teinte différente */}
            <polyline fill="none" stroke="currentColor" className="text-zinc-400 dark:text-zinc-600" strokeWidth="1.5" strokeDasharray="3 3" points={futurePointsStr} vectorEffect="non-scaling-stroke" strokeLinecap="round" strokeLinejoin="round" />

            {/* Courbe Passée (Réel) - Solide et lisse */}
            <polyline fill="none" stroke="currentColor" strokeWidth="2" points={pastPointsStr} vectorEffect="non-scaling-stroke" strokeLinecap="round" strokeLinejoin="round" />

            {/* Marqueur "Aujourd'hui" */}
            <circle cx={todayX} cy={todayY} r="3" className="fill-white dark:fill-[#09090b] stroke-zinc-900 dark:stroke-white" strokeWidth="1.5" vectorEffect="non-scaling-stroke" />
            <circle cx={todayX} cy={todayY} r="1.5" className="fill-zinc-900 dark:fill-white" vectorEffect="non-scaling-stroke" />
        </svg>
    );
};

export default function Dashboard({ data, updateData, setView }) {
    const [dashboardFilter, setDashboardFilter] = useState('total');
    const [focusedProject, setFocusedProject] = useState(null);
    
    const dc = data.settings || {};
    const showSolde = dc.dcSolde ?? true;
    const showOperations = dc.dcOperations ?? true;
    const showTimeline = dc.dcTimeline ?? true;
    const showRoutines = dc.dcRoutines ?? true;
    const showNotes = dc.dcNotes ?? true;
    const showProjets = dc.dcProjets ?? true;
    const showPriorites = dc.dcPriorites ?? true;
    const showAgenda = dc.dcAgenda ?? true;

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
        const hiddenAccounts = data.profile?.settings?.hidden_accounts || [];
        const accId = String(item.accountId || item.account_id);
        const targetId = String(item.targetAccountId || item.target_account_id);
        
        if (dashboardFilter === 'total') {
            return !hiddenAccounts.includes(accId) && !hiddenAccounts.includes(targetId);
        }
        return accId === String(dashboardFilter) || targetId === String(dashboardFilter);
    };

    // --- AUTO-REPAIR HABITS HISTORY IN DASHBOARD ---
    useEffect(() => {
        const repairHabits = async () => {
            if (!habits || habits.length === 0) return;
            try {
                // Fetch recent logs
                const d = new Date(); d.setDate(d.getDate() - 365);
                const year = d.getFullYear(); const month = String(d.getMonth()+1).padStart(2,'0'); const day = String(d.getDate()).padStart(2,'0');
                const dStr = `${year}-${month}-${day}`;
                
                const { data: logs } = await supabase.from('habit_logs').select('habit_id, date').gte('date', dStr);
                if (!logs) return;

                const logsByHabit = {};
                for (const lg of logs) {
                    if (!logsByHabit[lg.habit_id]) logsByHabit[lg.habit_id] = [];
                    logsByHabit[lg.habit_id].push(lg.date);
                }
                
                let repaired = false;
                const syncedHabs = habits.map(h => {
                    const existing = h.history || [];
                    const logged = logsByHabit[h.id] || [];
                    const merged = [...new Set([...existing, ...logged])];
                    if (merged.length !== existing.length) {
                        repaired = true;
                        // Background update in DB
                        supabase.from('habits').update({ history: merged }).eq('id', h.id).then();
                        return { ...h, history: merged };
                    }
                    return h;
                });

                if (repaired && updateData) {
                    updateData({ ...data, habits: syncedHabs }); 
                }
            } catch (e) { console.error("Dashboard habit repair error:", e); }
        };
        repairHabits();
    }, [habits.length]); // Only run when habits count changes to avoid infinite loops if data changes

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
            const validEvents = (data.calendar_events || []).filter(e => {
                const isOwner = e.user_id === data.profile?.id;
                const isDeclined = (e.my_status || e.status) === 'declined';
                return isOwner || !isDeclined;
            });
            const calEvents = validEvents.map(e => ({ id: e.id, title: e.title, start_time: e.start_time, is_todo: false, is_all_day: e.is_all_day }));
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
        if (diffDays === 0) return { text: 'Auj.', color: 'text-[#09090b] bg-white border border-zinc-200' };
        if (diffDays === 1) return { text: 'Demain', color: 'text-zinc-200 bg-zinc-800 border border-zinc-700' };
        if (diffDays < 0) return { text: 'Passé', color: 'text-zinc-500 bg-zinc-900 border border-zinc-800' };
        return { text: `J-${diffDays}`, color: 'text-zinc-300 bg-zinc-900 border border-zinc-800' };
    };

    const toggleTodo = (id) => {
        const target = todos.find(t => t.id === id);
        if (!target) return;
        const newTodos = todos.map(t => t.id === id ? { ...t, completed: !t.completed, status: !t.completed ? 'done' : 'todo' } : t);
        updateData(
            { ...data, todos: newTodos },
            { table: 'todos', id, data: { completed: !target.completed, status: !target.completed ? 'done' : 'todo', list_id: target.listId || target.list_id }, action: 'update' }
        );
    };

    const updateHabit = (updatedHabit) => {
        const newHabits = habits.map(h => h.id === updatedHabit.id ? updatedHabit : h);
        updateData({ ...data, habits: newHabits }, { table: 'habits', id: updatedHabit.id, action: 'update', data: { history: updatedHabit.history, streak: updatedHabit.streak } });
    };

    const getAccountBalanceForProject = (accId) => {
        const rawBalance = transactions.filter(t => String(t.accountId || t.account_id) === String(accId)).reduce((acc, t) => t.type === 'income' ? acc + parseFloat(t.amount || 0) : acc - parseFloat(t.amount || 0), 0);
        const safetyBase = data.budget?.planner?.safetyBases?.[accId] || 0;
        return rawBalance - safetyBase;
    };

    const availableForProjectsGlobal = (() => {
        const totalSafetyBase = Object.values(data.budget?.planner?.safetyBases || {}).reduce((sum, val) => sum + (parseFloat(val) || 0), 0);
        return currentBalance - totalSafetyBase;
    })();

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

    const isLeftColumnVisible = (showRoutines && habits.length > 0) || showNotes || (showProjets && activeProjects.length > 0);
    const isRightColumnVisible = showAgenda || (showPriorites && urgentTodos.length > 0);

    return (
        <div className="space-y-6 fade-in p-6 pb-24 md:pb-20 w-full transition-all duration-300">
            {focusedProject && (
                <FocusProjectModal project={focusedProject} onClose={() => setFocusedProject(null)} updateProject={updateProjectFromFocus} accounts={accounts} availableForProjects={availableForProjectsGlobal} getAccountBalance={getAccountBalanceForProject} />
            )}

            {/* HEADER */}
            <div className="flex flex-col lg:flex-row gap-6">
                <div className="flex-1 bg-white dark:bg-[#111113] p-4 md:px-6 md:py-4 rounded-2xl border border-zinc-200 dark:border-zinc-800 flex flex-col justify-center relative overflow-hidden">
                    <div className="grid grid-cols-1 md:grid-cols-3 items-center gap-3 relative z-10 w-full">
                        <div className="flex justify-start">
                            <select value={dashboardFilter} onChange={(e) => setDashboardFilter(e.target.value)} className="px-3 py-1.5 bg-zinc-50 dark:bg-[#09090b] border border-zinc-200 dark:border-zinc-800 rounded-lg text-xs font-mono font-semibold outline-none text-zinc-800 dark:text-zinc-200">
                                <option value="total">GLOBAL</option>
                                {accounts.filter(acc => !(data.profile?.settings?.hidden_accounts || []).includes(String(acc.id))).map(acc => <option key={acc.id} value={acc.id}>{acc.name}</option>)}
                            </select>
                        </div>
                        <div className="text-center">
                            <p className="text-zinc-500 dark:text-zinc-400 text-xs font-mono uppercase tracking-[0.2em]">{todayDate}</p>
                        </div>
                        <div className="flex justify-end gap-2">
                            <button onClick={() => setView('budget')} className="p-2 bg-zinc-900 dark:bg-white text-white dark:text-[#09090b] rounded-lg hover:opacity-90 active:scale-95 transition-all"><Plus size={16}/></button>
                            <button onClick={() => setView('todo')} className="p-2 bg-zinc-50 dark:bg-[#09090b] text-zinc-800 dark:text-zinc-200 border border-zinc-200 dark:border-zinc-800 rounded-lg hover:border-zinc-400 dark:hover:border-zinc-600 transition-all"><CheckSquare size={16}/></button>
                            <button onClick={() => setView('notes')} className="p-2 bg-zinc-50 dark:bg-[#09090b] text-zinc-800 dark:text-zinc-200 border border-zinc-200 dark:border-zinc-800 rounded-lg hover:border-zinc-400 dark:hover:border-zinc-600 transition-all"><StickyNote size={16}/></button>
                        </div>
                    </div>
                </div>
            </div>

            {/* METRICS ROW */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {showSolde && (
                <div className="bg-white dark:bg-[#111113] p-6 md:p-7 rounded-2xl border border-zinc-200 dark:border-zinc-800 relative overflow-hidden flex flex-col group h-full transition-all hover:border-zinc-400 dark:hover:border-zinc-700">
                    <div className="relative z-10 flex justify-between items-start mb-8">
                        <div className="p-3 bg-zinc-100 dark:bg-[#09090b] rounded-xl text-zinc-900 dark:text-white border border-zinc-200 dark:border-zinc-800"><Wallet size={22}/></div>
                        <button onClick={togglePrivacyMode} className="p-2 text-zinc-400 dark:text-zinc-600 hover:text-zinc-900 dark:hover:text-white transition-all">
                            {isPrivacyMode ? <EyeOff size={20}/> : <Eye size={20}/>}
                        </button>
                    </div>
                    <div className="relative z-10 mb-6">
                        <h3 className="text-4xl md:text-5xl font-bold font-mono text-zinc-900 dark:text-white tracking-tight mb-2">{renderAmount(currentBalance)}</h3>
                        <p className="text-[11px] font-mono text-zinc-500 uppercase tracking-widest text-center md:text-left">TRÉSORERIE {dashboardFilter === 'total' ? 'GLOBALE' : 'COMPTE'}</p>
                        
                        {!isPrivacyMode && (
                            <div className="mt-4 inline-flex items-center gap-2 px-3 py-1 bg-zinc-100 dark:bg-[#09090b] rounded-lg border border-zinc-200 dark:border-zinc-800">
                                <span className="text-[10px] font-mono text-zinc-500 uppercase">Fin de mois :</span>
                                <span className={`text-xs font-mono font-bold ${balanceDiff >= 0 ? "text-emerald-500" : "text-rose-500"}`}>{renderAmount(projectedBalance)}</span>
                            </div>
                        )}
                    </div>
                    
                    {/* LE NOUVEAU GRAPHIQUE PREMIUM */}
                    <div className="w-full mt-auto bg-zinc-50 dark:bg-[#09090b] rounded-xl p-4 border border-zinc-200 dark:border-zinc-800 relative group/chart">
                        <div className="flex justify-between items-center mb-3">
                            <span className="text-[9px] font-mono uppercase tracking-widest text-zinc-500">Passé (30J)</span>
                            <span className="text-[9px] font-mono uppercase tracking-widest text-zinc-900 dark:text-white bg-zinc-200 dark:bg-zinc-800 px-2 py-0.5 rounded">Aujourd'hui</span>
                            <span className="text-[9px] font-mono uppercase tracking-widest text-zinc-500 text-right">Prévu (+30J)</span>
                        </div>
                        <div className="h-20 w-full">
                            <PremiumChart data={premiumData} height={80} />
                        </div>
                        {!isPrivacyMode && (
                            <div className="absolute -top-3 right-4 opacity-0 group-hover/chart:opacity-100 transition-opacity duration-200 bg-zinc-900 dark:bg-white text-white dark:text-[#09090b] text-[10px] font-mono font-bold px-3 py-1.5 rounded-lg shadow-xl pointer-events-none z-20">
                                Projection 30J : <span className={forecast30Days >= currentBalance ? 'text-emerald-400 dark:text-emerald-600' : 'text-rose-400 dark:text-rose-600'}>{renderAmount(forecast30Days)}</span>
                            </div>
                        )}
                    </div>
                </div>
                )}

                {showOperations && (
                <div className="lg:col-span-2 bg-white dark:bg-[#111113] p-6 md:p-7 rounded-2xl border border-zinc-200 dark:border-zinc-800 flex flex-col group transition-all hover:border-zinc-400 dark:hover:border-zinc-700">
                    <div className="flex items-center gap-3 mb-6">
                        <div className="p-2 bg-zinc-100 dark:bg-[#09090b] border border-zinc-200 dark:border-zinc-800 rounded-lg text-zinc-900 dark:text-white"><Calendar size={18}/></div>
                        <h3 className="text-base font-bold text-zinc-900 dark:text-white uppercase tracking-wider">Opérations à venir</h3>
                    </div>
                    <div className="flex-1 flex flex-col gap-3">
                        {upcomingList.length === 0 ? (
                            <div className="flex-1 flex items-center justify-center text-zinc-500 py-4 font-mono text-xs opacity-50 tracking-widest uppercase text-center">Tranquillité totale</div>
                        ) : (
                            upcomingList.map((e, idx) => {
                                const impact = getFinancialImpact(e.data);
                                const isNeutral = impact === 0;
                                const isPositive = impact > 0;
                                return (
                                    <div key={idx} className="flex items-center justify-between p-4 bg-zinc-50 dark:bg-[#09090b] rounded-xl border border-zinc-200 dark:border-zinc-800 hover:border-zinc-400 dark:hover:border-zinc-700 transition-all duration-200">
                                        <div className="flex items-center gap-4 overflow-hidden">
                                            <div className="p-2.5 bg-white dark:bg-[#141416] rounded-lg text-zinc-500 dark:text-zinc-400 shrink-0 border border-zinc-200 dark:border-zinc-800">
                                                {e.data.type === 'transfer' ? <ArrowRightLeft size={16}/> : e.type === 'scheduled' ? <Calendar size={16}/> : <TrendingUp size={16}/>}
                                            </div>
                                            <div className="min-w-0">
                                                <p className="font-semibold text-zinc-900 dark:text-white text-sm truncate">{e.data.description}</p>
                                                <div className="flex items-center gap-2 text-[10px] font-mono text-zinc-500 uppercase mt-0.5">
                                                    <span>{e.date.toLocaleDateString()}</span>
                                                    {e.type === 'recurring' && <span className="text-zinc-300">• RÉCURRENCE</span>}
                                                </div>
                                            </div>
                                        </div>
                                        <span className={`font-mono font-bold text-sm shrink-0 pl-4 ${isNeutral ? 'text-zinc-400' : isPositive ? 'text-emerald-500' : 'text-rose-500'}`}>
                                            {isNeutral ? 'TRANS.' : renderAmount(impact, true)}
                                        </span>
                                    </div>
                                );
                            })
                        )}
                    </div>
                </div>
                )}
            </div>

            {showTimeline && <DashboardCalendar data={data} filter={dashboardFilter} />}

            {/* MAIN CONTENT */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                {isLeftColumnVisible && (
                <div className={`space-y-6 ${isRightColumnVisible ? 'lg:col-span-8' : 'lg:col-span-12'}`}>
                    
                    {/* --- ZONE HABITUDES --- */}
                    {showRoutines && habits.length > 0 && (
                        <div className="bg-white dark:bg-[#111113] rounded-2xl border border-zinc-200 dark:border-zinc-800 p-6 relative overflow-hidden">
                            <div className="flex justify-between items-center mb-5 relative z-10">
                                <h3 className="text-sm font-bold text-zinc-900 dark:text-white flex items-center gap-2.5 uppercase tracking-widest">
                                    <div className="p-2 bg-zinc-100 dark:bg-[#09090b] rounded-lg text-zinc-900 dark:text-white border border-zinc-200 dark:border-zinc-800"><Activity size={16} strokeWidth={2.5}/></div>
                                    Routines
                                </h3>
                            </div>
                            
                            <div className="relative z-10">
                                <HabitStrip habits={habits} updateHabit={updateHabit} setView={setView} />
                            </div>
                        </div>
                    )}

                    {/* --- ZONE NOTES ÉPINGLÉES --- */}
                    {showNotes && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                        {pinnedNotes.map(n => (
                            <div key={n.id} className={`p-6 rounded-2xl border border-zinc-200 dark:border-zinc-800 ${n.color} text-zinc-900 relative overflow-hidden cursor-pointer group hover:border-zinc-400 transition-all`} onClick={() => setView('notes')}>
                                <div className="absolute top-5 right-6 opacity-20"><StickyNote size={22}/></div>
                                <h4 className="font-bold text-base mb-2 tracking-tight uppercase">{n.title}</h4>
                                <p className="text-sm opacity-80 leading-relaxed line-clamp-4">{n.content}</p>
                            </div>
                        ))}
                    </div>
                    )}

                    {/* --- ZONE PROJETS ACTIFS --- */}
                    {showProjets && activeProjects.length > 0 && (
                    <div className="bg-white dark:bg-[#111113] p-6 rounded-2xl border border-zinc-200 dark:border-zinc-800">
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="text-base font-bold text-zinc-900 dark:text-white flex items-center gap-2.5 tracking-wider uppercase">
                                <div className="p-2 bg-zinc-100 dark:bg-[#09090b] border border-zinc-200 dark:border-zinc-800 rounded-lg text-zinc-900 dark:text-white"><FolderKanban size={18}/></div>
                                Projets Actifs
                            </h3>
                            <button onClick={handleAutoFocus} className="px-4 py-1.5 bg-zinc-900 dark:bg-white hover:opacity-90 text-white dark:text-[#09090b] rounded-lg text-[10px] font-mono font-bold uppercase tracking-widest active:scale-95 transition-all">FOCUS</button>
                        </div>
                        <div className="space-y-3">
                            {activeProjects.length === 0 ? (
                                <p className="text-center text-zinc-500 py-10 font-mono text-xs opacity-50 tracking-widest uppercase">Aucun projet actif</p>
                            ) : (
                                activeProjects.map(p => {
                                    const cost = parseFloat(p.cost || 0);
                                    let budgetAvailable = p.linkedAccountId ? getAccountBalanceForProject(p.linkedAccountId) : Math.max(0, availableForProjectsGlobal);
                                    const fundingPercentage = cost > 0 ? Math.min(100, (Math.max(0, budgetAvailable) / cost) * 100) : 0;
                                    const isFunded = budgetAvailable >= cost;
                                    const safeProgress = Math.min(100, Math.max(0, p.progress || 0));
                                    const safeFunding = Math.min(100, Math.max(0, fundingPercentage));
                                    const globalScore = cost > 0 ? (safeProgress + safeFunding) / 2 : safeProgress;

                                    return (
                                        <div key={p.id} className="bg-zinc-50 dark:bg-[#09090b] p-5 rounded-xl border border-zinc-200 dark:border-zinc-800 hover:border-zinc-400 dark:hover:border-zinc-700 transition-all cursor-pointer group" onClick={() => setView('projects')}>
                                            <div className="flex items-center gap-4 mb-5">
                                                <div className="relative w-14 h-14 shrink-0">
                                                    <svg className="w-full h-full -rotate-90" viewBox="0 0 36 36">
                                                        <path className="text-zinc-200 dark:text-zinc-800" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="currentColor" strokeWidth="3" />
                                                        <path className="text-zinc-900 dark:text-white transition-all duration-1000" strokeDasharray={`${globalScore}, 100`} d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
                                                    </svg>
                                                    <span className="absolute inset-0 flex items-center justify-center text-[10px] font-mono font-bold dark:text-white">{Math.round(globalScore)}%</span>
                                                </div>
                                                <div className="min-w-0 flex-1">
                                                    <h4 className="font-bold text-zinc-900 dark:text-white text-sm truncate">{p.title}</h4>
                                                    <div className="flex items-center gap-2 mt-1">
                                                        <span className={`w-1.5 h-1.5 shrink-0 rounded-full ${p.status === 'in_progress' ? 'bg-white' : 'bg-zinc-500'}`}></span>
                                                        <p className="text-xs text-zinc-500 truncate">{p.description || "Aucun descriptif"}</p>
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 md:gap-4">
                                                <div className="space-y-1.5">
                                                    <div className="flex justify-between text-[10px] font-mono text-zinc-500 uppercase">
                                                        <span className="flex items-center gap-1"><List size={10}/> Tâches</span>
                                                        <span className="dark:text-white">{Math.round(safeProgress)}%</span>
                                                    </div>
                                                    <div className="h-1.5 w-full bg-zinc-200 dark:bg-zinc-800 rounded-full overflow-hidden">
                                                        <div className="h-full bg-zinc-900 dark:bg-white transition-all duration-500" style={{ width: `${safeProgress}%` }}></div>
                                                    </div>
                                                </div>
                                                {cost > 0 && (
                                                    <div className="space-y-1.5">
                                                        <div className="flex justify-between text-[10px] font-mono text-zinc-500 uppercase">
                                                            <span className="flex items-center gap-1"><Euro size={10}/> Budget</span>
                                                            <span className={isFunded ? "text-emerald-500" : "text-zinc-400"}>{Math.round(safeFunding)}%</span>
                                                        </div>
                                                        <div className="h-1.5 w-full bg-zinc-200 dark:bg-zinc-800 rounded-full overflow-hidden">
                                                            <div className={`h-full rounded-full transition-all duration-500 ${isFunded ? 'bg-emerald-500' : 'bg-zinc-500'}`} style={{ width: `${safeFunding}%` }}></div>
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
                    )}
                </div>
                )}

                {/* COLONNE DROITE */}
                {isRightColumnVisible && (
                <div className={`space-y-6 ${isLeftColumnVisible ? 'lg:col-span-4' : 'lg:col-span-12'}`}>
                    {showAgenda && (
                    <div className="bg-white dark:bg-[#111113] p-6 rounded-2xl border border-zinc-200 dark:border-zinc-800 relative overflow-hidden group transition-all" onClick={() => setView('planning')}>
                        <div className="flex justify-between items-center mb-6 relative z-10">
                            <h3 className="text-base font-bold text-zinc-900 dark:text-white flex items-center gap-2.5 uppercase tracking-wider">
                                <div className="p-2 bg-zinc-100 dark:bg-[#09090b] rounded-lg text-zinc-900 dark:text-white border border-zinc-200 dark:border-zinc-800"><Clock size={18} strokeWidth={2}/></div>
                                Agenda
                            </h3>
                            <button onClick={(e) => { e.stopPropagation(); setView('planning'); }} className="p-2 hover:bg-zinc-100 dark:bg-[#09090b] text-zinc-500 hover:text-zinc-900 dark:hover:text-white rounded-lg transition-all border border-zinc-200 dark:border-zinc-800">
                                <ArrowRight size={16} />
                            </button>
                        </div>

                        <div className="space-y-5 relative z-10">
                            {nextCalendarEvents.length === 0 ? (
                                <div className="flex flex-col items-center justify-center py-10 opacity-40">
                                    <div className="p-4 bg-zinc-100 dark:bg-zinc-900 rounded-full mb-3"><Clock size={28} /></div>
                                    <p className="text-xs font-mono uppercase tracking-widest text-center">Calendrier vierge</p>
                                </div>
                            ) : (
                                <div className="flex flex-col">
                                    {/* PREMIER EVENEMENT (PROCHAIN) */}
                                    {nextCalendarEvents.length > 0 && (() => {
                                        const evt = nextCalendarEvents[0];
                                        const d = new Date(evt.start_time);
                                        const dayLabel = getDayCounterLabel(evt.start_time);
                                        return (
                                            <div key={`${evt.type}-${evt.id}`} className="mb-5 relative overflow-hidden rounded-xl p-4 bg-zinc-50 dark:bg-[#09090b] border border-zinc-200 dark:border-zinc-800 group/next transition-all hover:border-zinc-400 dark:hover:border-zinc-600 cursor-pointer">
                                                <div className="flex justify-between items-start mb-3.5 relative z-10">
                                                    <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-zinc-900 dark:bg-white text-white dark:text-[#09090b] text-[10px] font-mono font-bold uppercase tracking-wider">
                                                        <span className="w-1.5 h-1.5 bg-current rounded-full"></span> Prochainement
                                                    </span>
                                                    <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded uppercase tracking-wider ${dayLabel.color}`}>{dayLabel.text}</span>
                                                </div>

                                                <div className="flex gap-4 items-center relative z-10">
                                                    <div className="flex flex-col items-center justify-center w-14 h-14 bg-zinc-900 dark:bg-white text-white dark:text-[#09090b] rounded-xl shrink-0">
                                                        <span className="text-[10px] font-mono uppercase leading-none opacity-75">{d.toLocaleDateString('fr-FR', {weekday: 'short'}).replace('.', '')}</span>
                                                        <span className="text-xl font-bold font-mono leading-none mt-1">{d.getDate()}</span>
                                                    </div>
                                                    <div className="min-w-0 flex-1">
                                                        <p className="text-base font-bold text-zinc-900 dark:text-white truncate tracking-tight">{evt.title}</p>
                                                        <p className="text-[11px] font-mono uppercase mt-1 flex items-center gap-1.5 text-zinc-500 dark:text-zinc-400">
                                                            <Clock size={12} strokeWidth={2.5} />
                                                            {evt.is_all_day ? "Toute la journée" : d.toLocaleTimeString('fr-FR', {hour: '2-digit', minute:'2-digit'})}
                                                            {evt.is_todo && <CheckCircle2 size={12} className="text-zinc-400 ml-1"/>}
                                                        </p>
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })()}

                                    {/* AUTRES EVENEMENTS */}
                                    {nextCalendarEvents.length > 1 && (
                                        <div className="relative pl-5 space-y-3">
                                            <div className="absolute left-[1.05rem] top-2 bottom-4 w-px bg-zinc-200 dark:bg-zinc-800"></div>
                                            {nextCalendarEvents.slice(1).map((evt, index) => {
                                                const d = new Date(evt.start_time);
                                                const dayLabel = getDayCounterLabel(evt.start_time);
                                                return (
                                                    <div key={`${evt.type}-${evt.id}`} className="relative flex items-center gap-3 cursor-pointer group/item">
                                                        <div className="absolute -left-[1.35rem] w-2.5 h-2.5 rounded-full bg-white dark:bg-[#111113] border-2 border-zinc-300 dark:border-zinc-700 group-hover/item:border-white transition-all"></div>
                                                        
                                                        <div className="flex flex-col items-center justify-center w-11 h-11 bg-zinc-50 dark:bg-[#09090b] text-zinc-700 dark:text-zinc-300 rounded-lg border border-zinc-200 dark:border-zinc-800 shrink-0">
                                                            <span className="text-[9px] font-mono uppercase leading-none text-zinc-500">{d.toLocaleDateString('fr-FR', {weekday: 'short'}).replace('.', '')}</span>
                                                            <span className="text-base font-bold font-mono leading-none mt-0.5">{d.getDate()}</span>
                                                        </div>
                                                        <div className="min-w-0 flex-1 bg-zinc-50 dark:bg-[#09090b] p-3 rounded-xl border border-zinc-200 dark:border-zinc-800 group-hover/item:border-zinc-400 dark:group-hover/item:border-zinc-600 transition-all">
                                                            <div className="flex items-center justify-between gap-2 mb-0.5">
                                                                <p className="text-sm font-semibold text-zinc-900 dark:text-white truncate">{evt.title}</p>
                                                                <span className={`text-[9px] font-mono px-1.5 py-0.5 rounded uppercase shrink-0 ${dayLabel.color}`}>{dayLabel.text}</span>
                                                            </div>
                                                            <p className="text-[10px] font-mono uppercase text-zinc-500 flex items-center gap-1">
                                                                {evt.is_all_day ? "Journée" : d.toLocaleTimeString('fr-FR', {hour: '2-digit', minute:'2-digit'})}
                                                                {evt.is_todo && <CheckCircle2 size={10} className="text-zinc-400"/>}
                                                            </p>
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>
                    )}

                    {showPriorites && urgentTodos.length > 0 && (
                    <div className="bg-white dark:bg-[#111113] p-6 rounded-2xl border border-zinc-200 dark:border-zinc-800 flex flex-col group transition-all">
                        <div className="flex justify-between items-center mb-5">
                            <h3 className="text-xs font-bold text-zinc-900 dark:text-white flex items-center gap-2 uppercase tracking-[0.2em]">
                                <Target size={15} className="text-zinc-400" />
                                Action Requise
                            </h3>
                            <span className="text-[10px] font-mono text-zinc-500 tracking-wider">{urgentTodos.length} TÂCHE{urgentTodos.length > 1 ? 'S' : ''}</span>
                        </div>
                        <div className="flex flex-col gap-2">
                            {urgentTodos.map(t => (
                                <div key={t.id} className="group/task flex items-start gap-3.5 p-3 rounded-xl bg-zinc-50 dark:bg-[#09090b] border border-zinc-200 dark:border-zinc-800 hover:border-zinc-400 dark:hover:border-zinc-600 transition-all cursor-pointer" onClick={() => toggleTodo(t.id)}>
                                    <button className="shrink-0 w-5 h-5 mt-0.5 rounded-full border border-zinc-300 dark:border-zinc-700 flex items-center justify-center group-hover/task:border-zinc-900 dark:group-hover/task:border-white transition-all text-transparent group-hover/task:text-zinc-900 dark:group-hover/task:text-white">
                                        <Check size={11} strokeWidth={3} />
                                    </button>
                                    <div className="flex-1 min-w-0">
                                        <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300 leading-snug truncate block group-hover/task:text-zinc-900 dark:group-hover/task:text-white transition-colors">{t.text}</span>
                                        {t.priority === 'high' && (
                                            <div className="mt-1.5 flex items-center">
                                                <span className="text-[9px] font-mono uppercase tracking-widest text-zinc-400 border border-zinc-700 px-1.5 py-0.2 rounded">Prioritaire</span>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                        <button onClick={() => setView('todo')} className="mt-5 flex items-center justify-center gap-2 w-full py-3 bg-zinc-50 dark:bg-[#09090b] hover:bg-zinc-100 dark:hover:bg-zinc-900 text-zinc-700 dark:text-zinc-300 text-[10px] font-mono font-bold uppercase tracking-[0.2em] rounded-xl transition-all border border-zinc-200 dark:border-zinc-800">
                            Voir toutes les tâches
                        </button>
                    </div>
                    )}
                </div>
                )}
            </div>
        </div>
    );
}
