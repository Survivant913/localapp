import { useState, useMemo, useEffect } from 'react';
import { 
  ChevronLeft, ChevronRight, Calendar as CalendarIcon, 
  Clock, CheckCircle2, MoreVertical, Plus, Repeat, Trash2,
  ArrowRight
} from 'lucide-react';
import { 
  format, addDays, startOfWeek, addWeeks, subWeeks, 
  isSameDay, parseISO, startOfDay, getHours, getMinutes, 
  differenceInMinutes, setHours, setMinutes, addMinutes
} from 'date-fns';
import { fr } from 'date-fns/locale';

export default function PlanningManager({ data, updateData }) {
    const [currentWeekStart, setCurrentWeekStart] = useState(startOfWeek(new Date(), { weekStartsOn: 1 }));
    const [selectedEvent, setSelectedEvent] = useState(null);
    const [isCreating, setIsCreating] = useState(false);
    
    // Pour la création
    const [newEvent, setNewEvent] = useState({ 
        title: '', 
        dayOffset: 0, 
        startHour: 9, 
        duration: 60, 
        type: 'event', // 'event' ou 'todo'
        recurrence: false,
        color: 'blue'
    });

    // --- DONNÉES ---
    // 1. Les événements fixes (RDV, Sport...)
    const events = Array.isArray(data.calendar_events) ? data.calendar_events : [];
    // 2. Les tâches (Todos) qui ont une date planifiée
    const scheduledTodos = (data.todos || []).filter(t => t.scheduled_date && !t.completed);
    // 3. Les tâches "À faire" (Backlog) sans date
    const backlogTodos = (data.todos || []).filter(t => !t.scheduled_date && !t.completed);

    // --- ACTIONS ---

    const handlePreviousWeek = () => setCurrentWeekStart(subWeeks(currentWeekStart, 1));
    const handleNextWeek = () => setCurrentWeekStart(addWeeks(currentWeekStart, 1));
    const handleToday = () => setCurrentWeekStart(startOfWeek(new Date(), { weekStartsOn: 1 }));

    // Création d'un événement (ou récurrent)
    const saveEvent = () => {
        if (!newEvent.title) return alert("Titre requis");

        // Calcul de la date précise
        const targetDate = addDays(currentWeekStart, newEvent.dayOffset);
        const startDate = setMinutes(setHours(targetDate, newEvent.startHour), 0);
        const endDate = addMinutes(startDate, newEvent.duration);

        const eventBase = {
            user_id: data.profile?.id, // Sera géré par Supabase auto normalement mais bon
            title: newEvent.title,
            start_time: startDate.toISOString(),
            end_time: endDate.toISOString(),
            color: newEvent.color,
            recurrence_type: newEvent.recurrence ? 'weekly' : null
        };

        let newEvents = [];
        
        if (newEvent.recurrence) {
            // GÉNÉRATION AUTOMATIQUE SUR 12 SEMAINES (Simple et Robuste)
            for (let i = 0; i < 12; i++) {
                const s = addWeeks(startDate, i);
                const e = addWeeks(endDate, i);
                newEvents.push({ 
                    ...eventBase, 
                    id: Date.now() + i, // ID temporaire
                    start_time: s.toISOString(), 
                    end_time: e.toISOString() 
                });
            }
        } else {
            newEvents.push({ ...eventBase, id: Date.now() });
        }

        updateData({ ...data, calendar_events: [...events, ...newEvents] });
        setIsCreating(false);
    };

    const deleteEvent = (evt) => {
        if(!window.confirm("Supprimer cet événement ?")) return;
        updateData({ ...data, calendar_events: events.filter(e => e.id !== evt.id) }, { table: 'calendar_events', id: evt.id });
        setSelectedEvent(null);
    };

    // Transformer une Tâche en "Event Planifié"
    const scheduleTodo = (todo, dayOffset, hour) => {
        const targetDate = addDays(currentWeekStart, dayOffset);
        const scheduledDate = setMinutes(setHours(targetDate, hour), 0);
        
        const updatedTodos = data.todos.map(t => t.id === todo.id ? { ...t, scheduled_date: scheduledDate.toISOString(), duration_minutes: 60 } : t);
        updateData({ ...data, todos: updatedTodos });
    };

    const unscheduleTodo = (todo) => {
        const updatedTodos = data.todos.map(t => t.id === todo.id ? { ...t, scheduled_date: null } : t);
        updateData({ ...data, todos: updatedTodos });
        setSelectedEvent(null);
    };

    // --- RENDER HELPERS ---
    const weekDays = Array.from({ length: 7 }).map((_, i) => addDays(currentWeekStart, i));
    const hours = Array.from({ length: 15 }).map((_, i) => i + 7); // De 07h à 21h

    // Calcul de la position CSS (top/height) pour un événement
    const getEventStyle = (start, end) => {
        const s = new Date(start);
        const e = new Date(end);
        const startMin = getHours(s) * 60 + getMinutes(s);
        const endMin = getHours(e) * 60 + getMinutes(e);
        const duration = endMin - startMin;
        
        // 7h du matin = 420 minutes. On décale tout.
        const dayStartMin = 7 * 60;
        const top = Math.max(0, startMin - dayStartMin);
        
        // 1 minute = 1 pixel (pour simplifier le CSS)
        return { top: `${top}px`, height: `${Math.max(30, duration)}px` };
    };

    return (
        <div className="fade-in flex flex-col md:flex-row h-[calc(100vh-2rem)] overflow-hidden bg-white dark:bg-slate-900">
            
            {/* --- SIDEBAR : BACKLOG (Tâches non planifiées) --- */}
            <div className="w-full md:w-80 border-r border-slate-200 dark:border-slate-800 flex flex-col bg-slate-50/50 dark:bg-slate-900">
                <div className="p-4 border-b border-slate-200 dark:border-slate-800">
                    <h2 className="font-bold text-slate-800 dark:text-white flex items-center gap-2">
                        <CheckCircle2 size={20} className="text-slate-400"/> À planifier
                    </h2>
                    <p className="text-xs text-slate-500 mt-1">{backlogTodos.length} tâches en attente</p>
                </div>
                <div className="flex-1 overflow-y-auto p-4 space-y-3">
                    {backlogTodos.length === 0 && (
                        <div className="text-center py-10 text-slate-400 italic text-sm">Rien à planifier ! 🎉</div>
                    )}
                    {backlogTodos.map(todo => (
                        <div key={todo.id} className="bg-white dark:bg-slate-800 p-3 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm hover:border-blue-400 transition-colors group">
                            <div className="flex justify-between items-start">
                                <span className="text-sm font-medium text-slate-700 dark:text-slate-200 line-clamp-2">{todo.text}</span>
                                <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                                    {/* Petit menu rapide pour planifier demain à 9h ou 14h */}
                                    <button onClick={() => scheduleTodo(todo, 0, 9)} className="p-1 hover:bg-blue-100 text-blue-600 rounded" title="Planifier Lundi 9h"><ArrowRight size={14}/></button>
                                </div>
                            </div>
                            <div className="mt-2 flex items-center gap-2">
                                <span className={`text-[10px] px-2 py-0.5 rounded-full ${todo.priority === 'high' ? 'bg-red-100 text-red-600' : 'bg-slate-100 text-slate-500'}`}>
                                    {todo.priority === 'high' ? 'Urgent' : 'Normal'}
                                </span>
                            </div>
                        </div>
                    ))}
                </div>
                <div className="p-4 border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-800">
                    <button onClick={() => { setNewEvent({...newEvent, type: 'event'}); setIsCreating(true); }} className="w-full py-3 bg-slate-900 dark:bg-white text-white dark:text-black rounded-xl font-bold text-sm hover:opacity-90 transition-opacity flex items-center justify-center gap-2">
                        <Plus size={16}/> Nouvel Événement
                    </button>
                </div>
            </div>

            {/* --- MAIN : CALENDRIER --- */}
            <div className="flex-1 flex flex-col min-w-0">
                
                {/* Header Semaine */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
                    <div className="flex items-center gap-4">
                        <h2 className="text-xl font-bold text-slate-800 dark:text-white capitalize">
                            {format(currentWeekStart, 'MMMM yyyy', { locale: fr })}
                        </h2>
                        <div className="flex items-center bg-slate-100 dark:bg-slate-800 rounded-lg p-1">
                            <button onClick={handlePreviousWeek} className="p-1 hover:bg-white dark:hover:bg-slate-700 rounded-md transition-shadow"><ChevronLeft size={18}/></button>
                            <button onClick={handleToday} className="px-3 text-xs font-bold">Auj.</button>
                            <button onClick={handleNextWeek} className="p-1 hover:bg-white dark:hover:bg-slate-700 rounded-md transition-shadow"><ChevronRight size={18}/></button>
                        </div>
                    </div>
                </div>

                {/* GRILLE CALENDRIER */}
                <div className="flex-1 overflow-y-auto relative custom-scrollbar">
                    <div className="flex min-w-[800px]">
                        {/* Colonne Heures */}
                        <div className="w-16 flex-shrink-0 border-r border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 sticky left-0 z-10">
                            <div className="h-10"></div> {/* Spacer Header */}
                            {hours.map(h => (
                                <div key={h} className="h-[60px] text-xs text-slate-400 text-right pr-2 pt-1 relative">
                                    {h}:00
                                </div>
                            ))}
                        </div>

                        {/* Colonnes Jours */}
                        <div className="flex-1 grid grid-cols-7 divide-x divide-slate-100 dark:divide-slate-800">
                            {weekDays.map((day, dayIndex) => {
                                const isToday = isSameDay(day, new Date());
                                const dayEvents = events.filter(e => isSameDay(parseISO(e.start_time), day));
                                const dayTodos = scheduledTodos.filter(t => isSameDay(parseISO(t.scheduled_date), day));

                                return (
                                    <div key={dayIndex} className="relative min-w-[120px] bg-white dark:bg-slate-900 group">
                                        {/* En-tête Jour */}
                                        <div className={`h-10 flex flex-col items-center justify-center border-b border-slate-100 dark:border-slate-800 sticky top-0 bg-white/95 dark:bg-slate-900/95 backdrop-blur z-10 ${isToday ? 'bg-blue-50/50 dark:bg-blue-900/10' : ''}`}>
                                            <span className={`text-xs font-bold uppercase ${isToday ? 'text-blue-600' : 'text-slate-500'}`}>{format(day, 'EEE', { locale: fr })}</span>
                                            <span className={`text-sm font-bold ${isToday ? 'bg-blue-600 text-white w-6 h-6 rounded-full flex items-center justify-center' : 'text-slate-800 dark:text-white'}`}>{format(day, 'd')}</span>
                                        </div>

                                        {/* Zone Contenu (1px = 1min) */}
                                        <div className="relative h-[900px]"> {/* 15h * 60px = 900px */}
                                            {/* Lignes repères */}
                                            {hours.map(h => (
                                                <div key={h} className="absolute w-full border-t border-slate-50 dark:border-slate-800/50 h-[60px]" style={{ top: `${(h-7)*60}px` }}></div>
                                            ))}

                                            {/* Bouton Ajouter rapide au survol */}
                                            <button 
                                                onClick={() => { setNewEvent({...newEvent, dayOffset: dayIndex, startHour: 9}); setIsCreating(true); }}
                                                className="absolute inset-0 w-full h-full opacity-0 hover:opacity-100 bg-blue-50/0 hover:bg-blue-50/10 transition-colors cursor-crosshair z-0"
                                                title="Cliquer pour ajouter"
                                            ></button>

                                            {/* ÉVÉNEMENTS */}
                                            {dayEvents.map(evt => {
                                                const style = getEventStyle(evt.start_time, evt.end_time);
                                                const colorClass = evt.color === 'green' ? 'bg-emerald-100 border-emerald-200 text-emerald-800 dark:bg-emerald-900/50 dark:border-emerald-700 dark:text-emerald-100' : 
                                                                  evt.color === 'gray' ? 'bg-slate-100 border-slate-200 text-slate-700 dark:bg-slate-800 dark:border-slate-600 dark:text-slate-300' : 
                                                                  'bg-blue-100 border-blue-200 text-blue-800 dark:bg-blue-900/50 dark:border-blue-700 dark:text-blue-100';
                                                
                                                return (
                                                    <div 
                                                        key={evt.id} 
                                                        style={style}
                                                        onClick={(e) => { e.stopPropagation(); setSelectedEvent({ type: 'event', data: evt }); }}
                                                        className={`absolute left-1 right-1 rounded-md border p-1 text-xs cursor-pointer hover:brightness-95 hover:scale-[1.02] transition-all shadow-sm z-10 overflow-hidden flex flex-col ${colorClass}`}
                                                    >
                                                        <span className="font-bold truncate">{evt.title}</span>
                                                        <span className="opacity-70 text-[10px]">{format(parseISO(evt.start_time), 'HH:mm')} - {format(parseISO(evt.end_time), 'HH:mm')}</span>
                                                        {evt.recurrence_type && <Repeat size={10} className="absolute bottom-1 right-1 opacity-50"/>}
                                                    </div>
                                                );
                                            })}

                                            {/* TODOS PLANIFIÉS (Time Blocking) */}
                                            {dayTodos.map(todo => {
                                                const start = parseISO(todo.scheduled_date);
                                                const end = addMinutes(start, todo.duration_minutes || 60);
                                                const style = getEventStyle(start, end);
                                                
                                                return (
                                                    <div 
                                                        key={todo.id} 
                                                        style={style}
                                                        onClick={(e) => { e.stopPropagation(); setSelectedEvent({ type: 'todo', data: todo }); }}
                                                        className="absolute left-1 right-1 rounded-md border border-orange-200 bg-orange-50 dark:bg-orange-900/30 dark:border-orange-800 p-1 text-xs cursor-pointer hover:brightness-95 transition-all shadow-sm z-10 text-orange-800 dark:text-orange-200 border-dashed"
                                                    >
                                                        <div className="flex items-center gap-1">
                                                            <CheckCircle2 size={10} />
                                                            <span className="font-bold truncate">{todo.text}</span>
                                                        </div>
                                                        <span className="opacity-70 text-[10px] block mt-0.5">{format(start, 'HH:mm')} (Tâche)</span>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </div>
            </div>

            {/* --- MODAL DE CRÉATION --- */}
            {isCreating && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
                    <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-xl w-full max-w-sm animate-in zoom-in-95 border border-slate-200 dark:border-slate-700">
                        <h3 className="text-lg font-bold mb-4 text-slate-800 dark:text-white">Nouvel Événement</h3>
                        
                        <div className="space-y-4">
                            <div>
                                <label className="text-xs font-bold text-slate-500 uppercase">Titre</label>
                                <input autoFocus type="text" value={newEvent.title} onChange={e => setNewEvent({...newEvent, title: e.target.value})} className="w-full mt-1 p-2 bg-slate-100 dark:bg-slate-900 rounded border-none outline-none dark:text-white" placeholder="ex: Réunion Client" />
                            </div>
                            
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="text-xs font-bold text-slate-500 uppercase">Jour (Semaine)</label>
                                    <select value={newEvent.dayOffset} onChange={e => setNewEvent({...newEvent, dayOffset: parseInt(e.target.value)})} className="w-full mt-1 p-2 bg-slate-100 dark:bg-slate-900 rounded text-sm dark:text-white">
                                        {weekDays.map((d, i) => <option key={i} value={i}>{format(d, 'EEEE', { locale: fr })}</option>)}
                                    </select>
                                </div>
                                <div>
                                    <label className="text-xs font-bold text-slate-500 uppercase">Heure Début</label>
                                    <select value={newEvent.startHour} onChange={e => setNewEvent({...newEvent, startHour: parseInt(e.target.value)})} className="w-full mt-1 p-2 bg-slate-100 dark:bg-slate-900 rounded text-sm dark:text-white">
                                        {hours.map(h => <option key={h} value={h}>{h}:00</option>)}
                                    </select>
                                </div>
                            </div>

                            <div>
                                <label className="text-xs font-bold text-slate-500 uppercase mb-2 block">Couleur / Type</label>
                                <div className="flex gap-2">
                                    {['blue', 'green', 'gray'].map(c => (
                                        <button key={c} onClick={() => setNewEvent({...newEvent, color: c})} className={`flex-1 h-8 rounded-lg border-2 transition-all ${newEvent.color === c ? 'border-black dark:border-white opacity-100' : 'border-transparent opacity-40'} ${c === 'blue' ? 'bg-blue-500' : c === 'green' ? 'bg-emerald-500' : 'bg-slate-500'}`}></button>
                                    ))}
                                </div>
                                <p className="text-[10px] text-center mt-1 text-slate-400">{newEvent.color === 'blue' ? 'Travail / Focus' : newEvent.color === 'green' ? 'Perso / Sport' : 'Admin / Fixe'}</p>
                            </div>

                            <div className="flex items-center gap-2 pt-2">
                                <input type="checkbox" id="rec" checked={newEvent.recurrence} onChange={e => setNewEvent({...newEvent, recurrence: e.target.checked})} className="rounded text-blue-600"/>
                                <label htmlFor="rec" className="text-sm text-slate-700 dark:text-slate-300">Répéter 12 semaines (Hebdo)</label>
                            </div>

                            <div className="flex gap-2 pt-4">
                                <button onClick={() => setIsCreating(false)} className="flex-1 py-2 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg font-bold text-sm">Annuler</button>
                                <button onClick={saveEvent} className="flex-1 py-2 bg-blue-600 text-white rounded-lg font-bold text-sm hover:bg-blue-700">Créer</button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* --- MODAL DETAILS / SUPPRESSION --- */}
            {selectedEvent && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
                    <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-xl w-full max-w-sm animate-in zoom-in-95 border border-slate-200 dark:border-slate-700">
                        <div className="flex justify-between items-start mb-4">
                            <h3 className="text-lg font-bold text-slate-800 dark:text-white">
                                {selectedEvent.type === 'event' ? selectedEvent.data.title : selectedEvent.data.text}
                            </h3>
                            <button onClick={() => setSelectedEvent(null)}><div className="text-slate-400 hover:text-slate-600">✕</div></button>
                        </div>
                        
                        <p className="text-sm text-slate-500 mb-6">
                            {selectedEvent.type === 'event' ? 'Événement Calendrier' : 'Tâche Planifiée (Time Blocking)'}
                            <br/>
                            {format(parseISO(selectedEvent.data.start_time || selectedEvent.data.scheduled_date), 'EEEE d MMMM à HH:mm', { locale: fr })}
                        </p>

                        <div className="flex gap-2">
                            {selectedEvent.type === 'todo' ? (
                                <button onClick={() => unscheduleTodo(selectedEvent.data)} className="flex-1 py-2 border border-orange-200 text-orange-600 rounded-lg font-bold text-sm hover:bg-orange-50">Retirer du planning</button>
                            ) : (
                                <button onClick={() => deleteEvent(selectedEvent.data)} className="flex-1 py-2 bg-red-50 text-red-600 rounded-lg font-bold text-sm hover:bg-red-100 flex items-center justify-center gap-2"><Trash2 size={16}/> Supprimer</button>
                            )}
                        </div>
                    </div>
                </div>
            )}

        </div>
    );
}