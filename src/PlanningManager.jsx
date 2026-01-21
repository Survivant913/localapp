import { useState } from 'react';
import { 
  ChevronLeft, ChevronRight, CheckCircle2, 
  Plus, Repeat, Trash2, ArrowRight
} from 'lucide-react';
import { 
  format, addDays, startOfWeek, addWeeks, subWeeks, 
  isSameDay, parseISO, getHours, getMinutes, 
  setHours, setMinutes, addMinutes, differenceInMinutes
} from 'date-fns';
import { fr } from 'date-fns/locale';

export default function PlanningManager({ data, updateData }) {
    const [currentWeekStart, setCurrentWeekStart] = useState(startOfWeek(new Date(), { weekStartsOn: 1 }));
    const [selectedEvent, setSelectedEvent] = useState(null);
    const [isCreating, setIsCreating] = useState(false);
    
    // État pour le Drag & Drop
    const [draggedTodo, setDraggedTodo] = useState(null);

    // Pour la création
    const [newEvent, setNewEvent] = useState({ 
        title: '', 
        dayOffset: 0, 
        startHour: 9, 
        duration: 60, 
        type: 'event', 
        recurrence: false,
        color: 'blue'
    });

    // --- DONNÉES ---
    const events = Array.isArray(data.calendar_events) ? data.calendar_events : [];
    const scheduledTodos = (data.todos || []).filter(t => t.scheduled_date && !t.completed);
    const backlogTodos = (data.todos || []).filter(t => !t.scheduled_date && !t.completed);

    // --- ACTIONS NAVIGATION ---
    const handlePreviousWeek = () => setCurrentWeekStart(subWeeks(currentWeekStart, 1));
    const handleNextWeek = () => setCurrentWeekStart(addWeeks(currentWeekStart, 1));
    const handleToday = () => setCurrentWeekStart(startOfWeek(new Date(), { weekStartsOn: 1 }));

    // --- LOGIQUE DE SUPERPOSITION (ALGORITHME) ---
    const getLayoutForDay = (dayItems) => {
        // 1. Trier par heure de début
        const sorted = [...dayItems].sort((a, b) => {
            const startA = parseISO(a.startStr);
            const startB = parseISO(b.startStr);
            return startA - startB;
        });

        // 2. Détecter les groupes qui se chevauchent
        const columns = [];
        let lastEnd = null;

        sorted.forEach((item, i) => {
            const start = parseISO(item.startStr);
            const end = parseISO(item.endStr);
            
            // Calcul position verticale
            const startMin = getHours(start) * 60 + getMinutes(start);
            const duration = differenceInMinutes(end, start);
            const top = Math.max(0, startMin - (7 * 60)); // Offset 7h du mat
            
            // Algorithme simple de chevauchement
            // Si c'est le premier ou s'il ne chevauche pas le précédent groupe...
            let placed = false;
            for(let col of columns) {
                if (!col.some(ev => {
                    const evStart = parseISO(ev.startStr);
                    const evEnd = parseISO(ev.endStr);
                    return (start < evEnd && end > evStart);
                })) {
                    col.push({ ...item, top, height: Math.max(30, duration) });
                    placed = true;
                    break;
                }
            }
            if (!placed) {
                columns.push([{ ...item, top, height: Math.max(30, duration) }]);
            }
        });

        // 3. Aplatir pour le rendu
        const result = [];
        const totalCols = columns.length;
        columns.forEach((col, colIndex) => {
            col.forEach(item => {
                result.push({
                    ...item,
                    style: {
                        top: `${item.top}px`,
                        height: `${item.height}px`,
                        width: `${100 / totalCols}%`,
                        left: `${(colIndex * 100) / totalCols}%`,
                        position: 'absolute'
                    }
                });
            });
        });
        return result;
    };

    // --- ACTIONS EVENTS ---
    const saveEvent = () => {
        if (!newEvent.title) return alert("Titre requis");
        const targetDate = addDays(currentWeekStart, newEvent.dayOffset);
        const startDate = setMinutes(setHours(targetDate, newEvent.startHour), 0);
        const endDate = addMinutes(startDate, newEvent.duration);

        const eventBase = {
            user_id: data.profile?.id,
            title: newEvent.title,
            start_time: startDate.toISOString(),
            end_time: endDate.toISOString(),
            color: newEvent.color,
            recurrence_type: newEvent.recurrence ? 'weekly' : null
        };

        let newEvents = [];
        if (newEvent.recurrence) {
            for (let i = 0; i < 12; i++) {
                const s = addWeeks(startDate, i);
                const e = addWeeks(endDate, i);
                newEvents.push({ ...eventBase, id: Date.now() + i, start_time: s.toISOString(), end_time: e.toISOString() });
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

    // --- DRAG & DROP LOGIC ---
    const onDragStart = (e, todo) => {
        setDraggedTodo(todo);
        e.dataTransfer.effectAllowed = "move";
        // Petite image fantôme si besoin, sinon par défaut
    };

    const onDragOver = (e) => {
        e.preventDefault(); // Nécessaire pour autoriser le drop
        e.dataTransfer.dropEffect = "move";
    };

    const onDrop = (e, day) => {
        e.preventDefault();
        if (!draggedTodo) return;

        // Calculer l'heure en fonction de la position de la souris dans la case
        const rect = e.currentTarget.getBoundingClientRect();
        const y = e.clientY - rect.top; // Position Y relative au conteneur jour
        const minutesFrom7am = y; // car 1px = 1min dans notre CSS
        let hour = Math.floor(minutesFrom7am / 60) + 7; // +7 car on commence à 7h
        const minutes = Math.floor(minutesFrom7am % 60);

        // Arrondir au quart d'heure le plus proche
        const roundedMinutes = Math.round(minutes / 15) * 15;
        
        // Sécurité bornes
        if(hour < 7) hour = 7;
        if(hour > 21) hour = 21;

        const targetDate = setMinutes(setHours(day, hour), roundedMinutes);
        
        // Mise à jour
        const updatedTodos = data.todos.map(t => t.id === draggedTodo.id ? { ...t, scheduled_date: targetDate.toISOString(), duration_minutes: 60 } : t);
        updateData({ ...data, todos: updatedTodos });
        setDraggedTodo(null);
    };

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

    const weekDays = Array.from({ length: 7 }).map((_, i) => addDays(currentWeekStart, i));
    const hours = Array.from({ length: 15 }).map((_, i) => i + 7); 

    return (
        <div className="fade-in flex flex-col md:flex-row h-[calc(100vh-2rem)] overflow-hidden bg-white dark:bg-slate-900">
            
            {/* SIDEBAR */}
            <div className="w-full md:w-80 border-r border-slate-200 dark:border-slate-800 flex flex-col bg-slate-50/50 dark:bg-slate-900">
                <div className="p-4 border-b border-slate-200 dark:border-slate-800">
                    <h2 className="font-bold text-slate-800 dark:text-white flex items-center gap-2">
                        <CheckCircle2 size={20} className="text-slate-400"/> À planifier
                    </h2>
                    <p className="text-xs text-slate-500 mt-1">Glissez une tâche dans l'agenda</p>
                </div>
                <div className="flex-1 overflow-y-auto p-4 space-y-3">
                    {backlogTodos.map(todo => (
                        <div 
                            key={todo.id} 
                            draggable
                            onDragStart={(e) => onDragStart(e, todo)}
                            className="bg-white dark:bg-slate-800 p-3 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm hover:border-blue-400 cursor-grab active:cursor-grabbing transition-all group hover:shadow-md"
                        >
                            <div className="flex justify-between items-start">
                                <span className="text-sm font-medium text-slate-700 dark:text-slate-200 line-clamp-2">{todo.text}</span>
                                <button onClick={() => scheduleTodo(todo, 0, 9)} className="opacity-0 group-hover:opacity-100 p-1 hover:bg-blue-100 text-blue-600 rounded transition-opacity" title="Planifier demain 9h"><ArrowRight size={14}/></button>
                            </div>
                        </div>
                    ))}
                    {backlogTodos.length === 0 && <div className="text-center py-10 text-slate-400 italic text-sm">Rien à planifier !</div>}
                </div>
                <div className="p-4 border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-800">
                    <button onClick={() => { setNewEvent({...newEvent, type: 'event'}); setIsCreating(true); }} className="w-full py-3 bg-slate-900 dark:bg-white text-white dark:text-black rounded-xl font-bold text-sm hover:opacity-90 transition-opacity flex items-center justify-center gap-2">
                        <Plus size={16}/> Nouvel Événement
                    </button>
                </div>
            </div>

            {/* CALENDRIER */}
            <div className="flex-1 flex flex-col min-w-0">
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

                <div className="flex-1 overflow-y-auto relative custom-scrollbar">
                    <div className="flex min-w-[800px]">
                        {/* Colonne Heures */}
                        <div className="w-16 flex-shrink-0 border-r border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 sticky left-0 z-10">
                            <div className="h-10"></div>
                            {hours.map(h => (
                                <div key={h} className="h-[60px] text-xs text-slate-400 text-right pr-2 pt-1 relative">
                                    {h}:00
                                </div>
                            ))}
                        </div>

                        {/* Grille Jours */}
                        <div className="flex-1 grid grid-cols-7 divide-x divide-slate-100 dark:divide-slate-800">
                            {weekDays.map((day, dayIndex) => {
                                const isToday = isSameDay(day, new Date());
                                
                                // Préparation des items pour l'algo de layout
                                const rawEvents = events.filter(e => isSameDay(parseISO(e.start_time), day)).map(e => ({ type: 'event', data: e, startStr: e.start_time, endStr: e.end_time }));
                                const rawTodos = scheduledTodos.filter(t => isSameDay(parseISO(t.scheduled_date), day)).map(t => ({ type: 'todo', data: t, startStr: t.scheduled_date, endStr: addMinutes(parseISO(t.scheduled_date), t.duration_minutes || 60).toISOString() }));
                                
                                const layoutItems = getLayoutForDay([...rawEvents, ...rawTodos]);

                                return (
                                    <div 
                                        key={dayIndex} 
                                        className={`relative min-w-[120px] bg-white dark:bg-slate-900 group transition-colors ${draggedTodo ? 'hover:bg-blue-50/30' : ''}`}
                                        onDragOver={onDragOver}
                                        onDrop={(e) => onDrop(e, day)}
                                    >
                                        <div className={`h-10 flex flex-col items-center justify-center border-b border-slate-100 dark:border-slate-800 sticky top-0 bg-white/95 dark:bg-slate-900/95 backdrop-blur z-20 ${isToday ? 'bg-blue-50/50 dark:bg-blue-900/10' : ''}`}>
                                            <span className={`text-xs font-bold uppercase ${isToday ? 'text-blue-600' : 'text-slate-500'}`}>{format(day, 'EEE', { locale: fr })}</span>
                                            <span className={`text-sm font-bold ${isToday ? 'bg-blue-600 text-white w-6 h-6 rounded-full flex items-center justify-center' : 'text-slate-800 dark:text-white'}`}>{format(day, 'd')}</span>
                                        </div>

                                        <div className="relative h-[900px]">
                                            {hours.map(h => (
                                                <div key={h} className="absolute w-full border-t border-slate-50 dark:border-slate-800/50 h-[60px]" style={{ top: `${(h-7)*60}px` }}></div>
                                            ))}
                                            
                                            {/* Bouton rapide au survol */}
                                            <button 
                                                onClick={() => { setNewEvent({...newEvent, dayOffset: dayIndex, startHour: 9}); setIsCreating(true); }}
                                                className="absolute inset-0 w-full h-full opacity-0 hover:opacity-100 bg-blue-50/0 hover:bg-blue-50/5 transition-colors cursor-crosshair z-0"
                                            ></button>

                                            {/* ITEMS POSITIONNÉS INTELLIGEMMENT */}
                                            {layoutItems.map((item, idx) => {
                                                const isTodo = item.type === 'todo';
                                                const dataItem = item.data;
                                                const colorClass = isTodo 
                                                    ? 'bg-orange-50 border-orange-200 text-orange-800 dark:bg-orange-900/30 dark:border-orange-800 dark:text-orange-200 border-dashed'
                                                    : dataItem.color === 'green' ? 'bg-emerald-100 border-emerald-200 text-emerald-800 dark:bg-emerald-900/50 dark:border-emerald-700 dark:text-emerald-100'
                                                    : dataItem.color === 'gray' ? 'bg-slate-100 border-slate-200 text-slate-700 dark:bg-slate-800 dark:border-slate-600 dark:text-slate-300'
                                                    : 'bg-blue-100 border-blue-200 text-blue-800 dark:bg-blue-900/50 dark:border-blue-700 dark:text-blue-100';

                                                return (
                                                    <div 
                                                        key={`${item.type}-${dataItem.id}`}
                                                        style={item.style}
                                                        onClick={(e) => { e.stopPropagation(); setSelectedEvent({ type: item.type, data: dataItem }); }}
                                                        className={`rounded-md border p-1 text-xs cursor-pointer hover:brightness-95 hover:z-30 transition-all shadow-sm z-10 overflow-hidden flex flex-col ${colorClass}`}
                                                    >
                                                        <span className="font-bold truncate leading-tight">{isTodo ? dataItem.text : dataItem.title}</span>
                                                        <span className="opacity-70 text-[10px] mt-0.5">{format(parseISO(item.startStr), 'HH:mm')} - {format(parseISO(item.endStr), 'HH:mm')}</span>
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

            {/* MODALS (Création & Détails) */}
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
                                    <label className="text-xs font-bold text-slate-500 uppercase">Jour</label>
                                    <select value={newEvent.dayOffset} onChange={e => setNewEvent({...newEvent, dayOffset: parseInt(e.target.value)})} className="w-full mt-1 p-2 bg-slate-100 dark:bg-slate-900 rounded text-sm dark:text-white">
                                        {weekDays.map((d, i) => <option key={i} value={i}>{format(d, 'EEEE', { locale: fr })}</option>)}
                                    </select>
                                </div>
                                <div>
                                    <label className="text-xs font-bold text-slate-500 uppercase">Heure</label>
                                    <select value={newEvent.startHour} onChange={e => setNewEvent({...newEvent, startHour: parseInt(e.target.value)})} className="w-full mt-1 p-2 bg-slate-100 dark:bg-slate-900 rounded text-sm dark:text-white">
                                        {hours.map(h => <option key={h} value={h}>{h}:00</option>)}
                                    </select>
                                </div>
                            </div>
                            <div>
                                <label className="text-xs font-bold text-slate-500 uppercase mb-2 block">Couleur</label>
                                <div className="flex gap-2">
                                    {['blue', 'green', 'gray'].map(c => (
                                        <button key={c} onClick={() => setNewEvent({...newEvent, color: c})} className={`flex-1 h-8 rounded-lg border-2 transition-all ${newEvent.color === c ? 'border-black dark:border-white opacity-100' : 'border-transparent opacity-40'} ${c === 'blue' ? 'bg-blue-500' : c === 'green' ? 'bg-emerald-500' : 'bg-slate-500'}`}></button>
                                    ))}
                                </div>
                            </div>
                            <div className="flex items-center gap-2 pt-2">
                                <input type="checkbox" id="rec" checked={newEvent.recurrence} onChange={e => setNewEvent({...newEvent, recurrence: e.target.checked})} className="rounded text-blue-600"/>
                                <label htmlFor="rec" className="text-sm text-slate-700 dark:text-slate-300">Répéter 12 semaines</label>
                            </div>
                            <div className="flex gap-2 pt-4">
                                <button onClick={() => setIsCreating(false)} className="flex-1 py-2 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg font-bold text-sm">Annuler</button>
                                <button onClick={saveEvent} className="flex-1 py-2 bg-blue-600 text-white rounded-lg font-bold text-sm hover:bg-blue-700">Créer</button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

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
                            {selectedEvent.type === 'event' ? 'Événement Calendrier' : 'Tâche Planifiée'}
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