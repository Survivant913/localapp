import { useState, useMemo } from 'react';
import { 
  ChevronLeft, ChevronRight, Wallet, TrendingUp, TrendingDown, 
  CheckSquare, Target, Calendar as CalendarIcon, X, ArrowRightLeft 
} from 'lucide-react';

export default function CalendarView({ data }) {
    const [viewDate, setViewDate] = useState(new Date());
    const [selectedDateDetails, setSelectedDateDetails] = useState(null);
    const [calendarFilter, setCalendarFilter] = useState('total');

    // --- DONNÉES ---
    const budget = data.budget || { transactions: [], recurring: [], scheduled: [], accounts: [] };
    const accounts = budget.accounts || [];
    const todos = data.todos || [];
    const projects = data.projects || [];

    // --- OUTILS ---
    const formatCurrency = (val) => new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(val);
    
    // CORRECTION DATE : On force minuit locale pour éviter les décalages UTC
    const parseLocalDate = (dateStr) => {
        if (!dateStr) return new Date();
        try {
            if (dateStr instanceof Date) {
                const d = new Date(dateStr);
                d.setHours(0,0,0,0);
                return d;
            }
            if (typeof dateStr === 'string') {
                const d = new Date(dateStr);
                d.setHours(0,0,0,0);
                return d;
            }
            return new Date();
        } catch (e) { return new Date(); }
    };

    const isSameDay = (d1, d2) => {
        if (!d1 || !d2) return false;
        return d1.getFullYear() === d2.getFullYear() && 
               d1.getMonth() === d2.getMonth() && 
               d1.getDate() === d2.getDate();
    };

    // --- 1. INTELLIGENCE VISUELLE (FILTRAGE CORRIGÉ) ---
    const checkFilter = (itemId, targetId = null) => {
        if (calendarFilter === 'total') return true;
        // Comparaison souple String vs String
        if (itemId && String(itemId) === String(calendarFilter)) return true;
        if (targetId && String(targetId) === String(calendarFilter)) return true;
        return false;
    };

    const getContextDisplay = (item) => {
        // VUE GLOBALE
        if (calendarFilter === 'total') {
            if (item.type === 'transfer') {
                return { 
                    colorClass: 'text-blue-600 dark:text-blue-400', 
                    bgClass: 'bg-blue-100 dark:bg-blue-900/30', 
                    borderClass: 'border-blue-200 dark:border-blue-800', 
                    icon: ArrowRightLeft, 
                    sign: '', 
                    label: 'Virement', 
                    isExpense: false, isIncome: false 
                };
            }
            if (item.type === 'income') {
                return { colorClass: 'text-green-700 dark:text-green-400', bgClass: 'bg-green-100 dark:bg-green-900/30', borderClass: 'border-green-200 dark:border-green-800', icon: TrendingUp, sign: '+', label: 'Revenu', isExpense: false, isIncome: true };
            }
            return { colorClass: 'text-red-700 dark:text-red-400', bgClass: 'bg-red-100 dark:bg-red-900/30', borderClass: 'border-red-200 dark:border-red-800', icon: TrendingDown, sign: '-', label: 'Dépense', isExpense: true, isIncome: false };
        }

        // VUE COMPTE SPÉCIFIQUE
        if (item.type === 'transfer') {
            if (String(item.targetAccountId) === String(calendarFilter)) {
                return { colorClass: 'text-green-700 dark:text-green-400', bgClass: 'bg-green-100 dark:bg-green-900/30', borderClass: 'border-green-200 dark:border-green-800', icon: TrendingUp, sign: '+', label: 'Reçu', isExpense: false, isIncome: true };
            }
            if (String(item.accountId) === String(calendarFilter)) {
                return { colorClass: 'text-red-700 dark:text-red-400', bgClass: 'bg-red-100 dark:bg-red-900/30', borderClass: 'border-red-200 dark:border-red-800', icon: TrendingDown, sign: '-', label: 'Envoyé', isExpense: true, isIncome: false };
            }
        }

        if (item.type === 'income') return { colorClass: 'text-green-700 dark:text-green-400', bgClass: 'bg-green-100 dark:bg-green-900/30', borderClass: 'border-green-200 dark:border-green-800', icon: TrendingUp, sign: '+', label: 'Revenu', isExpense: false, isIncome: true };
        return { colorClass: 'text-red-700 dark:text-red-400', bgClass: 'bg-red-100 dark:bg-red-900/30', borderClass: 'border-red-200 dark:border-red-800', icon: TrendingDown, sign: '-', label: 'Dépense', isExpense: true, isIncome: false };
    };

    // --- 2. CALCUL DU SOLDE ACTUEL (CORRIGÉ) ---
    const currentBalance = useMemo(() => {
        return budget.transactions
            .filter(t => checkFilter(t.accountId, t.targetAccountId))
            .reduce((acc, t) => {
                const amt = parseFloat(t.amount || 0);
                if (t.type === 'transfer') {
                    if (calendarFilter === 'total') return acc;
                    if (String(t.accountId) === String(calendarFilter)) return acc - amt;
                    if (String(t.targetAccountId) === String(calendarFilter)) return acc + amt;
                }
                return t.type === 'income' ? acc + amt : acc - amt;
            }, 0);
    }, [budget.transactions, calendarFilter]);

    // --- 3. MOTEUR JOURNALIER INTELLIGENT (CORRIGÉ & ROBUSTE) ---
    const dailyData = useMemo(() => {
        const year = viewDate.getFullYear();
        const month = viewDate.getMonth();
        const daysInMonth = new Date(year, month + 1, 0).getDate();
        const today = new Date();
        today.setHours(0,0,0,0);
        const firstDayOfView = new Date(year, month, 1);

        const calculateImpact = (item) => {
            const amt = parseFloat(item.amount || 0);
            const disp = getContextDisplay(item);
            if (calendarFilter === 'total') {
                if (item.type === 'income') return amt;
                if (item.type !== 'transfer') return -amt;
                return 0;
            } else {
                if (disp.isIncome) return amt;
                if (disp.isExpense) return -amt;
                return 0;
            }
        };

        // --- CORRECTIF : CALCUL DU SOLDE INITIAL (HISTORIQUE CUMULÉ) ---
        let startOfMonthProjection = budget.transactions
            .filter(t => checkFilter(t.accountId, t.targetAccountId) && parseLocalDate(t.date) < firstDayOfView)
            .reduce((acc, t) => {
                const amt = parseFloat(t.amount || 0);
                if (t.type === 'transfer') {
                    if (calendarFilter === 'total') return acc;
                    if (String(t.accountId) === String(calendarFilter)) return acc - amt;
                    if (String(t.targetAccountId) === String(calendarFilter)) return acc + amt;
                }
                return t.type === 'income' ? acc + amt : acc - amt;
            }, 0);

        if (firstDayOfView > today) {
            let simDate = new Date(today);
            simDate.setDate(simDate.getDate() + 1); 
            
            while (simDate < firstDayOfView) {
                const simDay = simDate.getDate();
                const simMaxDays = new Date(simDate.getFullYear(), simDate.getMonth() + 1, 0).getDate();
                const isSimLastDay = simDay === simMaxDays;

                budget.scheduled.forEach(s => {
                    if (s.status === 'pending' && isSameDay(parseLocalDate(s.date), simDate)) {
                        if (checkFilter(s.accountId, s.targetAccountId)) {
                            startOfMonthProjection += calculateImpact(s);
                        }
                    }
                });
                budget.recurring.forEach(r => {
                    const matchDay = r.dayOfMonth === simDay || (isSimLastDay && r.dayOfMonth > simDay);
                    if (matchDay && (!r.endDate || parseLocalDate(r.endDate) >= simDate)) {
                        if (checkFilter(r.accountId, r.targetAccountId)) {
                            startOfMonthProjection += calculateImpact(r);
                        }
                    }
                });
                simDate.setDate(simDate.getDate() + 1);
            }
        } 

        const daysMap = {};
        let runningBalance = startOfMonthProjection;

        for (let d = 1; d <= daysInMonth; d++) {
            const date = new Date(year, month, d);
            const events = [];
            let dailyChange = 0;

            const addEvent = (item, type, source) => {
                const impact = calculateImpact(item);
                dailyChange += impact;
                events.push({ id: item.id, data: item, type, source, impact, display: getContextDisplay(item) });
            };

            // Transactions passées (Historique)
            budget.transactions.forEach(t => {
                if (isSameDay(parseLocalDate(t.date), date)) {
                    if (checkFilter(t.accountId, t.targetAccountId)) {
                        addEvent(t, 'transaction', 'history');
                    }
                }
            });

            // Transactions prévues (Futur)
            budget.scheduled.forEach(s => {
                if (s.status === 'pending') {
                    if (isSameDay(parseLocalDate(s.date), date)) {
                        if (checkFilter(s.accountId, s.targetAccountId)) {
                            addEvent(s, 'scheduled', 'planned');
                        }
                    }
                }
            });

            // Récurrents (Futur)
            if (date >= today) {
                budget.recurring.forEach(r => {
                    const isLastDay = d === daysInMonth;
                    const matchDay = r.dayOfMonth === d || (isLastDay && r.dayOfMonth > d);

                    if (matchDay && (!r.endDate || parseLocalDate(r.endDate) >= date)) {
                        if (checkFilter(r.accountId, r.targetAccountId)) {
                            const alreadyScheduled = budget.scheduled.some(s => s.status === 'pending' && isSameDay(parseLocalDate(s.date), date) && Math.abs(parseFloat(s.amount) - parseFloat(r.amount)) < 0.01 && s.description === r.description);
                            const alreadyPaidToday = budget.transactions.some(t => isSameDay(parseLocalDate(t.date), date) && Math.abs(parseFloat(t.amount) - parseFloat(r.amount)) < 0.01 && (t.description === r.description || t.description.includes(r.description)));
                            
                            if (!alreadyScheduled && !alreadyPaidToday) {
                                addEvent(r, 'recurring', 'recurring');
                            }
                        }
                    }
                });
            }

            const extras = [];
            todos.forEach(t => { if (!t.completed && t.deadline && isSameDay(parseLocalDate(t.deadline), date)) extras.push({ type: 'todo', text: t.text }); });
            projects.forEach(p => { if (p.deadline && p.status !== 'done' && isSameDay(parseLocalDate(p.deadline), date)) extras.push({ type: 'project', text: p.title }); });

            runningBalance += dailyChange;
            daysMap[d] = { date, events, dailyChange, extras, endBalance: Math.round(runningBalance * 100) / 100 };
        }

        return daysMap;
    }, [viewDate, budget, calendarFilter, currentBalance, accounts]);

    const changeMonth = (delta) => {
        const newDate = new Date(viewDate);
        // FIX : On force le jour à 1 pour éviter le bug du 30/31 (ex: 30 Janvier -> 30 Février qui devient 2 Mars)
        newDate.setDate(1); 
        newDate.setMonth(newDate.getMonth() + delta);
        setViewDate(newDate);
        setSelectedDateDetails(null);
    };

    // --- RENDU ---
    const year = viewDate.getFullYear();
    const month = viewDate.getMonth();
    const firstDayIndex = new Date(year, month, 1).getDay();
    const offset = firstDayIndex === 0 ? 6 : firstDayIndex - 1;
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const today = new Date();

    const daysLabels = ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi', 'Dimanche'];

    return (
        <div className="space-y-6 fade-in p-4 pb-24 md:pb-20 max-w-[1600px] mx-auto h-full flex flex-col">
            
            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-center gap-4 bg-white dark:bg-slate-800 p-4 rounded-2xl border border-gray-200 dark:border-slate-700 shadow-sm">
                <div className="flex flex-col sm:flex-row items-center gap-4 sm:gap-6 w-full md:w-auto">
                    <div className="flex items-center justify-between w-full sm:w-auto bg-gray-100 dark:bg-slate-700 rounded-lg p-1">
                        <button onClick={() => changeMonth(-1)} className="p-2 hover:bg-white dark:hover:bg-slate-600 rounded-md transition-colors"><ChevronLeft size={20}/></button>
                        <button onClick={() => setViewDate(new Date())} className="px-4 text-sm font-bold text-gray-700 dark:text-gray-200">Aujourd'hui</button>
                        <button onClick={() => changeMonth(1)} className="p-2 hover:bg-white dark:hover:bg-slate-600 rounded-md transition-colors"><ChevronRight size={20}/></button>
                    </div>
                    <h2 className="text-xl md:text-2xl font-bold capitalize text-slate-800 dark:text-white text-center">
                        {viewDate.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })}
                    </h2>
                </div>
                
                <div className="flex items-center gap-3 bg-blue-50 dark:bg-slate-700/50 px-4 py-2 rounded-xl w-full md:w-auto">
                    <Wallet size={20} className="text-blue-600 dark:text-blue-400 shrink-0"/>
                    <select 
                        value={calendarFilter} 
                        onChange={(e) => setCalendarFilter(e.target.value)} 
                        className="bg-transparent text-sm font-bold text-slate-700 dark:text-white outline-none cursor-pointer w-full md:w-auto"
                        style={{ colorScheme: 'dark' }}
                    >
                        <option value="total" className="bg-white dark:bg-slate-800 text-slate-900 dark:text-white">Vue Globale</option>
                        {accounts.map(acc => (
                            <option key={acc.id} value={acc.id} className="bg-white dark:bg-slate-800 text-slate-900 dark:text-white">
                                {acc.name}
                            </option>
                        ))}
                    </select>
                </div>
            </div>

            {/* Grille Calendrier */}
            <div className="flex-1 bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-gray-200 dark:border-slate-700 overflow-hidden flex flex-col min-h-[500px] md:min-h-[700px]">
                <div className="grid grid-cols-7 border-b border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-900/50">
                    {daysLabels.map((day, i) => (
                        <div key={day} className="py-2 md:py-3 text-center">
                            <span className="md:hidden text-[9px] font-bold text-slate-500 uppercase tracking-wide">{day.substring(0, 3)}</span>
                            <span className="hidden md:block text-xs font-bold text-slate-500 uppercase tracking-wider">{day}</span>
                        </div>
                    ))}
                </div>

                <div className="grid grid-cols-7 auto-rows-fr flex-1 bg-gray-200 dark:bg-slate-700 gap-px border-b border-gray-200 dark:border-slate-700">
                    {Array.from({ length: offset }).map((_, i) => (
                        <div key={`blank-${i}`} className="bg-gray-50/50 dark:bg-slate-900/30"></div>
                    ))}

                    {Array.from({ length: daysInMonth }).map((_, i) => {
                        const d = i + 1;
                        const dayData = dailyData[d];
                        const isToday = isSameDay(new Date(year, month, d), today);
                        
                        return (
                            <div 
                                key={d}
                                onClick={() => setSelectedDateDetails(dayData)}
                                className={`
                                    bg-white dark:bg-slate-800 p-1 md:p-2 relative flex flex-col gap-1 md:gap-2 cursor-pointer transition-colors group min-h-[90px] md:min-h-[120px]
                                    ${isToday ? 'bg-blue-50/40 dark:bg-slate-800 ring-inset ring-2 ring-blue-500' : 'hover:bg-gray-50 dark:hover:bg-slate-700'}
                                `}
                            >
                                <div className="flex justify-between items-start">
                                    <span className={`text-xs md:text-sm font-bold w-5 h-5 md:w-7 md:h-7 flex items-center justify-center rounded-full ${isToday ? 'bg-blue-600 text-white shadow-md' : 'text-slate-700 dark:text-slate-300'}`}>
                                        {d}
                                    </span>
                                    {dayData.dailyChange !== 0 && (
                                        <span className={`text-[8px] md:text-[10px] font-bold px-1 py-0.5 rounded ${dayData.dailyChange > 0 ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300' : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300'}`}>
                                            {dayData.dailyChange > 0 ? '+' : ''}{Math.round(dayData.dailyChange)}€
                                        </span>
                                    )}
                                </div>

                                <div className="flex-1 flex flex-col gap-0.5 md:gap-1 overflow-hidden min-h-[40px] md:min-h-[60px]">
                                    {dayData.events.slice(0, 4).map((e, idx) => {
                                        const dDisp = e.display;
                                        const Icon = dDisp.icon;
                                        return (
                                            <div key={idx} className={`text-[9px] md:text-[10px] px-1 md:px-1.5 py-0.5 md:py-1 rounded border flex justify-between items-center gap-1 ${dDisp.bgClass} ${dDisp.colorClass} ${dDisp.borderClass}`}>
                                                <div className="flex items-center gap-1 min-w-0">
                                                    <Icon size={8} className="shrink-0 md:w-[10px] md:h-[10px]"/>
                                                    <span className="truncate font-medium max-w-[40px] md:max-w-none">{e.data.description}</span>
                                                </div>
                                                <span className="font-bold whitespace-nowrap hidden sm:inline">{Math.round(e.data.amount)}€</span>
                                            </div>
                                        );
                                    })}
                                    {dayData.extras.map((ex, idx) => (
                                        <div key={`ex-${idx}`} className="flex items-center gap-1 text-[8px] md:text-[9px] text-slate-500 px-1">
                                            {ex.type === 'todo' ? <CheckSquare size={8} className="text-orange-500"/> : <Target size={8} className="text-purple-500"/>}
                                            <span className="truncate">{ex.text}</span>
                                        </div>
                                    ))}
                                    {(dayData.events.length > 4) && (
                                        <span className="text-[8px] md:text-[9px] text-slate-400 text-center">+ {dayData.events.length - 4}</span>
                                    )}
                                </div>

                                {dayData.endBalance !== null && (
                                    <div className="mt-auto pt-1 md:pt-2 border-t border-dashed border-gray-100 dark:border-slate-700 flex justify-end">
                                        <span className={`text-[9px] md:text-xs font-extrabold ${dayData.endBalance < 0 ? 'text-red-600 dark:text-red-400' : 'text-slate-600 dark:text-slate-400'}`}>
                                            {formatCurrency(dayData.endBalance)}
                                        </span>
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* Modale Détail Journée */}
            {selectedDateDetails && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4" onClick={() => setSelectedDateDetails(null)}>
                    <div className="bg-white dark:bg-slate-800 w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200" onClick={e => e.stopPropagation()}>
                        <div className="p-6 border-b border-gray-100 dark:border-slate-700 flex justify-between items-start bg-gray-50 dark:bg-slate-800/50">
                            <div>
                                <h3 className="text-2xl font-bold text-slate-800 dark:text-white capitalize">
                                    {selectedDateDetails.date.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })}
                                </h3>
                                {selectedDateDetails.endBalance !== null && (
                                    <p className="text-sm font-medium text-slate-500 mt-1">
                                        Solde estimé en fin de journée : <span className={`font-bold ${selectedDateDetails.endBalance < 0 ? 'text-red-500' : 'text-blue-600'}`}>{formatCurrency(selectedDateDetails.endBalance)}</span>
                                    </p>
                                )}
                            </div>
                            <button onClick={() => setSelectedDateDetails(null)} className="p-2 bg-white dark:bg-slate-700 rounded-full hover:bg-gray-100 dark:hover:bg-slate-600 transition-colors"><X size={20}/></button>
                        </div>
                        
                        <div className="p-6 space-y-4 max-h-[60vh] overflow-y-auto">
                            {selectedDateDetails.events.length === 0 && selectedDateDetails.extras.length === 0 ? (
                                <p className="text-center text-gray-400 italic">Aucune activité ce jour-là.</p>
                            ) : (
                                <>
                                    {selectedDateDetails.events.map((e, i) => {
                                        const dDisp = e.display;
                                        const Icon = dDisp.icon;
                                        return (
                                            <div key={i} className="flex items-center justify-between p-3 rounded-xl bg-white dark:bg-slate-700 border border-gray-100 dark:border-slate-600 shadow-sm">
                                                <div className="flex items-center gap-3">
                                                    <div className={`p-2 rounded-full ${dDisp.bgClass} ${dDisp.colorClass}`}>
                                                        <Icon size={18}/>
                                                    </div>
                                                    <div>
                                                        <p className="font-bold text-slate-800 dark:text-white text-sm">{e.data.description}</p>
                                                        <p className="text-xs text-slate-400 capitalize">{dDisp.label} • {e.source === 'history' ? 'Réalisé' : e.source === 'planned' ? 'Planifié' : 'Récurrent'}</p>
                                                    </div>
                                                </div>
                                                <span className={`font-bold ${dDisp.colorClass}`}>
                                                    {dDisp.sign}{formatCurrency(e.data.amount)}
                                                </span>
                                            </div>
                                        );
                                    })}
                                    {selectedDateDetails.extras.map((ex, i) => (
                                        <div key={`ex-d-${i}`} className="flex items-center gap-3 p-3 rounded-xl bg-gray-50 dark:bg-slate-700/50 border border-dashed border-gray-300 dark:border-slate-600">
                                            {ex.type === 'todo' ? <CheckSquare size={18} className="text-orange-500"/> : <Target size={18} className="text-purple-500"/>}
                                            <span className="text-sm font-medium text-slate-600 dark:text-slate-300">{ex.text}</span>
                                        </div>
                                    ))}
                                </>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}