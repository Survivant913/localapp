import { useState, useEffect, useRef } from 'react';
import { 
  ChevronLeft, ChevronRight, CheckCircle2, 
  Plus, Repeat, Trash2, ArrowRight, GripVertical, Calendar as CalendarIcon
} from 'lucide-react';
import { 
  format, addDays, startOfWeek, addWeeks, subWeeks, 
  isSameDay, parseISO, getHours, getMinutes, 
  setHours, setMinutes, addMinutes, differenceInMinutes, startOfDay
} from 'date-fns';
import { fr } from 'date-fns/locale';

export default function PlanningManager({ data, updateData }) {
    const [currentWeekStart, setCurrentWeekStart] = useState(startOfWeek(new Date(), { weekStartsOn: 1 }));
    const [selectedEvent, setSelectedEvent] = useState(null);
    const [isCreating, setIsCreating] = useState(false);
    
    // --- DRAG & DROP STATE ---
    const [draggedItem, setDraggedItem] = useState(null); // { type: 'todo' | 'event' | 'planned_todo', data: ... }
    const [previewSlot, setPreviewSlot] = useState(null); // { dayIndex, top, height, timeLabel }

    // --- FORM CREATION ---
    const [newEvent, setNewEvent] = useState({ 
        title: '', dayOffset: 0, startHour: 9, duration: 60, type: 'event', recurrence: false, color: 'blue'
    });

    // --- DONNÉES ---
    const events = Array.isArray(data.calendar_events) ? data.calendar_events : [];
    const scheduledTodos = (data.todos || []).filter(t => t.scheduled_date && !t.completed);
    const backlogTodos = (data.todos || []).filter(t => !t.scheduled_date && !t.completed);

    // --- NAVIGATION ---
    const handlePreviousWeek = () => setCurrentWeekStart(subWeeks(currentWeekStart, 1));
    const handleNextWeek = () => setCurrentWeekStart(addWeeks(currentWeekStart, 1));
    const handleToday = () => setCurrentWeekStart(startOfWeek(new Date(), { weekStartsOn: 1 }));

    // --- ALGO DE LAYOUT (Superposition Intelligente) ---
    const getLayoutForDay = (dayItems) => {
        const sorted = [...dayItems].sort((a, b) => parseISO(a.startStr) - parseISO(b.startStr));
        const columns = [];
        
        sorted.forEach((item) => {
            const start = parseISO(item.startStr);
            const end = parseISO(item.endStr);
            const startMin = getHours(start) * 60 + getMinutes(start);
            const duration = differenceInMinutes(end, start);
            const top = Math.max(0, startMin - (7 * 60)); 
            
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
            if (!placed) columns.push([{ ...item, top, height: Math.max(30, duration) }]);
        });

        const result = [];
        columns.forEach((col, colIndex) => {
            col.forEach(item => {
                result.push({
                    ...item,
                    style: {
                        top: `${item.top}px`,
                        height: `${item.height}px`,
                        width: `${100 / columns.length}%`,
                        left: `${(colIndex * 100) / columns.length}%`,
                        position: 'absolute'
                    }
                });
            });
        });
        return result;
    };

    // --- ACTIONS CRUD ---
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

    // --- DRAG & DROP LOGIQUE COMPLÈTE ---
    const onDragStart = (e, item, type) => {
        setDraggedItem({ type, data: item });
        e.dataTransfer.effectAllowed = "move";
        // On rend l'image fantôme transparente pour utiliser notre propre preview
        const img = new Image();
        img.src = 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7';
        e.dataTransfer.setDragImage(img, 0, 0);
    };

    const onDragOver = (e, dayIndex) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = "move";
        
        // Calcul position souris
        const rect = e.currentTarget.getBoundingClientRect();
        const y = e.clientY - rect.top;
        const minutesFrom7am = y; // 1px = 1min
        
        // Snap au 15min
        let rawMinutes = Math.floor(minutesFrom7am % 60);
        let snappedMinutes = Math.round(rawMinutes / 15) * 15;
        let hour = Math.floor(minutesFrom7am / 60) + 7;

        if (hour < 7) hour = 7;
        if (hour > 21) hour = 21;

        // Hauteur de la preview selon durée (par défaut 60min)
        let duration = 60;
        if (draggedItem?.type === 'event') {
            duration = differenceInMinutes(parseISO(draggedItem.data.end_time), parseISO(draggedItem.data.start_time));
        } else if (draggedItem?.type === 'planned_todo') {
            duration = draggedItem.data.duration_minutes || 60;
        }

        const top = (hour - 7) * 60 + snappedMinutes;
        
        setPreviewSlot({
            dayIndex,
            top,
            height: Math.max(30, duration),
            timeLabel: `${hour}:${snappedMinutes.toString().padStart(2, '0')}`
        });
    };

    const onDragLeave = () => {
        // Optionnel : nettoyer preview si on sort vraiment de la zone
        // setPreviewSlot(null);
    };

    const onDrop = (e, day) => {
        e.preventDefault();
        setPreviewSlot(null);
        if (!draggedItem || !previewSlot) return;

        // Calculer nouvelle date
        const [h, m] = previewSlot.timeLabel.split(':').map(Number);
        const newStart = setMinutes(setHours(day, h), m);

        if (draggedItem.type === 'todo') {
            // BACKLOG -> CALENDRIER
            const updatedTodos = data.todos.map(t => t.id === draggedItem.data.id ? { ...t, scheduled_date: newStart.toISOString(), duration_minutes: 60 } : t);
            updateData({ ...data, todos: updatedTodos });
        } 
        else if (draggedItem.type === 'planned_todo') {
            // CALENDRIER -> CALENDRIER (Déplacement Tâche)
            const updatedTodos = data.todos.map(t => t.id === draggedItem.data.id ? { ...t, scheduled_date: newStart.toISOString() } : t);
            updateData({ ...data, todos: updatedTodos });
        } 
        else if (draggedItem.type === 'event') {
            // CALENDRIER -> CALENDRIER (Déplacement Event)
            const oldStart = parseISO(draggedItem.data.start_time);
            const oldEnd = parseISO(draggedItem.data.end_time);
            const duration = differenceInMinutes(oldEnd, oldStart);
            const newEnd = addMinutes(newStart, duration);
            
            const updatedEvents = events.map(ev => ev.id === draggedItem.data.id ? { ...ev, start_time: newStart.toISOString(), end_time: newEnd.toISOString() } : ev);
            updateData({ ...data, calendar_events: updatedEvents });
        }
        
        setDraggedItem(null);
    };

    const weekDays = Array.from({ length: 7 }).map((_, i) => addDays(currentWeekStart, i));
    const hours = Array.from({ length: 15 }).map((_, i) => i + 7); 
    const currentTimeMin = getHours(new Date()) * 60 + getMinutes(new Date()) - (7 * 60);

    return (
        <div className="fade-in flex flex-col md:flex-row h-[calc(100vh-2rem)] overflow-hidden bg-white dark:bg-slate-900 font-sans">
            
            {/* SIDEBAR BACKLOG */}
            <div className="w-full md:w-80 border-r border-slate-200 dark:border-slate-800 flex flex-col bg-slate-50 dark:bg-slate-900 z-20 shadow-xl shadow-slate-200/50 dark:shadow-none">
                <div className="p-5 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
                    <h2 className="font-bold text-slate-800 dark:text-white flex items-center gap-2 text-lg">
                        <CheckCircle2 size={20} className="text-blue-600"/> Tâches à faire
                    </h2>
                    <p className="text-xs text-slate-500 mt-1">Glissez ces tâches dans votre agenda.</p>
                </div>
                <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar">
                    {backlogTodos.map(todo => (
                        <div 
                            key={todo.id} 
                            draggable
                            onDragStart={(e) => onDragStart(e, todo, 'todo')}
                            className="bg-white dark:bg-slate-800 p-4 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm hover:shadow-md hover:border-blue-400 cursor-grab active:cursor-grabbing transition-all group relative overflow-hidden"
                        >
                            <div className="absolute left-0 top-0 bottom-0 w-1 bg-slate-200 dark:bg-slate-700 group-hover:bg-blue-500 transition-colors"></div>
                            <div className="flex justify-between items-start pl-2">
                                <span className="text-sm font-medium text-slate-700 dark:text-slate-200 line-clamp-2 leading-relaxed">{todo.text}</span>
                                <GripVertical size={16} className="text-slate-300 dark:text-slate-600 shrink-0"/>
                            </div>
                            <div className="mt-2 pl-2 flex gap-2">
                                <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider ${todo.priority === 'high' ? 'bg-red-50 text-red-600 border border-red-100' : 'bg-slate-100 text-slate-500 border border-slate-200 dark:bg-slate-700 dark:text-slate-400 dark:border-slate-600'}`}>
                                    {todo.priority === 'high' ? 'Urgent' : 'Normal'}
                                </span>
                            </div>
                        </div>
                    ))}
                    {backlogTodos.length === 0 && (
                        <div className="flex flex-col items-center justify-center h-40 text-slate-400 italic text-sm border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-xl m-2">
                            <CalendarIcon size={32} className="mb-2 opacity-50"/>
                            Tout est planifié ! 🎉
                        </div>
                    )}
                </div>
                <div className="p-4 border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
                    <button onClick={() => { setNewEvent({...newEvent, type: 'event'}); setIsCreating(true); }} className="w-full py-3.5 bg-slate-900 dark:bg-white text-white dark:text-black rounded-xl font-bold text-sm hover:shadow-lg hover:-translate-y-0.5 transition-all flex items-center justify-center gap-2">
                        <Plus size={18}/> Nouvel Événement
                    </button>
                </div>
            </div>

            {/* CALENDRIER */}
            <div className="flex-1 flex flex-col min-w-0 bg-white dark:bg-slate-900 relative">
                {/* HEADER SEMAINE */}
                <div className="flex items-center justify-between px-8 py-5 border-b border-slate-200 dark:border-slate-800 bg-white/80 dark:bg-slate-900/80 backdrop-blur z-30 sticky top-0">
                    <div className="flex items-center gap-6">
                        <h2 className="text-2xl font-bold text-slate-800 dark:text-white capitalize font-serif tracking-tight">
                            {format(currentWeekStart, 'MMMM yyyy', { locale: fr })}
                        </h2>
                        <div className="flex items-center bg-slate-100 dark:bg-slate-800 rounded-xl p-1 shadow-inner">
                            <button onClick={handlePreviousWeek} className="p-1.5 hover:bg-white dark:hover:bg-slate-700 rounded-lg transition-all shadow-sm"><ChevronLeft size={18}/></button>
                            <button onClick={handleToday} className="px-4 text-xs font-bold text-slate-600 dark:text-slate-300">Aujourd'hui</button>
                            <button onClick={handleNextWeek} className="p-1.5 hover:bg-white dark:hover:bg-slate-700 rounded-lg transition-all shadow-sm"><ChevronRight size={18}/></button>
                        </div>
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto relative custom-scrollbar select-none">
                    <div className="flex min-w-[800px] pb-20">
                        {/* Colonne Heures */}
                        <div className="w-20 flex-shrink-0 border-r border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 sticky left-0 z-20">
                            <div className="h-14 border-b border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900"></div>
                            {hours.map(h => (
                                <div key={h} className="h-[60px] text-[11px] font-medium text-slate-400 text-right pr-4 pt-1 relative -top-2.5">
                                    {h}:00
                                </div>
                            ))}
                        </div>

                        {/* Grille Jours */}
                        <div className="flex-1 grid grid-cols-7 divide-x divide-slate-100 dark:divide-slate-800">
                            {weekDays.map((day, dayIndex) => {
                                const isToday = isSameDay(day, new Date());
                                
                                const rawEvents = events.filter(e => isSameDay(parseISO(e.start_time), day)).map(e => ({ type: 'event', data: e, startStr: e.start_time, endStr: e.end_time }));
                                const rawTodos = scheduledTodos.filter(t => isSameDay(parseISO(t.scheduled_date), day)).map(t => ({ type: 'todo', data: t, startStr: t.scheduled_date, endStr: addMinutes(parseISO(t.scheduled_date), t.duration_minutes || 60).toISOString() }));
                                
                                const layoutItems = getLayoutForDay([...rawEvents, ...rawTodos]);

                                return (
                                    <div 
                                        key={dayIndex} 
                                        className={`relative min-w-[120px] bg-white dark:bg-slate-900 transition-colors ${draggedItem && previewSlot?.dayIndex !== dayIndex ? 'hover:bg-slate-50 dark:hover:bg-slate-800/50' : ''}`}
                                        onDragOver={(e) => onDragOver(e, dayIndex)}
                                        onDrop={(e) => onDrop(e, day)}
                                        onDragLeave={onDragLeave}
                                    >
                                        {/* Header Jour */}
                                        <div className={`h-14 flex flex-col items-center justify-center border-b border-slate-100 dark:border-slate-800 sticky top-0 bg-white/95 dark:bg-slate-900/95 backdrop-blur z-20 ${isToday ? 'bg-blue-50/80 dark:bg-blue-900/20' : ''}`}>
                                            <span className={`text-[10px] font-bold uppercase tracking-wider ${isToday ? 'text-blue-600' : 'text-slate-400'}`}>{format(day, 'EEE', { locale: fr })}</span>
                                            <span className={`text-lg font-bold mt-0.5 ${isToday ? 'bg-blue-600 text-white w-8 h-8 rounded-full flex items-center justify-center shadow-lg shadow-blue-500/30' : 'text-slate-800 dark:text-white'}`}>{format(day, 'd')}</span>
                                        </div>

                                        <div className="relative h-[900px]">
                                            {/* Lignes Heures */}
                                            {hours.map(h => (
                                                <div key={h} className="absolute w-full border-t border-slate-50 dark:border-slate-800/40 h-[60px]" style={{ top: `${(h-7)*60}px` }}></div>
                                            ))}
                                            
                                            {/* Ligne Temps Actuel (Rouge) */}
                                            {isToday && currentTimeMin > 0 && currentTimeMin < 900 && (
                                                <div className="absolute w-full border-t-2 border-red-500 z-10 pointer-events-none flex items-center" style={{ top: `${currentTimeMin}px` }}>
                                                    <div className="w-2 h-2 bg-red-500 rounded-full -ml-1"></div>
                                                </div>
                                            )}

                                            {/* PREVIEW FANTÔME (GHOST) */}
                                            {previewSlot && previewSlot.dayIndex === dayIndex && (
                                                <div 
                                                    className="absolute z-0 rounded-lg bg-blue-500/10 border-2 border-blue-500 border-dashed pointer-events-none transition-all duration-75 ease-out flex items-center justify-center"
                                                    style={{
                                                        top: `${previewSlot.top}px`,
                                                        height: `${previewSlot.height}px`,
                                                        left: '2px', right: '2px'
                                                    }}
                                                >
                                                    <span className="text-xs font-bold text-blue-600 bg-white/80 px-2 py-1 rounded-md shadow-sm">
                                                        {previewSlot.timeLabel}
                                                    </span>
                                                </div>
                                            )}

                                            {/* EVENTS & TASKS */}
                                            {layoutItems.map((item) => {
                                                const isTodo = item.type === 'todo';
                                                const dataItem = item.data;
                                                const isDraggingThis = draggedItem?.data?.id === dataItem.id && draggedItem?.type === (isTodo ? 'planned_todo' : 'event');

                                                // Classes de couleur
                                                const baseClasses = "absolute rounded-lg p-2 text-xs cursor-pointer hover:brightness-95 hover:z-30 transition-all shadow-sm border overflow-hidden flex flex-col group/item select-none";
                                                const colorClass = isTodo 
                                                    ? 'bg-orange-50 border-orange-200 text-orange-900 dark:bg-orange-900/20 dark:border-orange-800 dark:text-orange-100 border-l-4 border-l-orange-400'
                                                    : dataItem.color === 'green' ? 'bg-emerald-50 border-emerald-200 text-emerald-900 dark:bg-emerald-900/20 dark:border-emerald-800 dark:text-emerald-100 border-l-4 border-l-emerald-500'
                                                    : dataItem.color === 'gray' ? 'bg-slate-100 border-slate-200 text-slate-700 dark:bg-slate-800 dark:border-slate-600 dark:text-slate-300 border-l-4 border-l-slate-400'
                                                    : 'bg-blue-50 border-blue-200 text-blue-900 dark:bg-blue-900/20 dark:border-blue-800 dark:text-blue-100 border-l-4 border-l-blue-500';

                                                return (
                                                    <div 
                                                        key={`${item.type}-${dataItem.id}`}
                                                        style={{...item.style, opacity: isDraggingThis ? 0.5 : 1}}
                                                        draggable
                                                        onDragStart={(e) => onDragStart(e, dataItem, isTodo ? 'planned_todo' : 'event')}
                                                        onClick={(e) => { e.stopPropagation(); setSelectedEvent({ type: item.type, data: dataItem }); }}
                                                        className={`${baseClasses} ${colorClass}`}
                                                    >
                                                        <span className="font-bold truncate leading-tight text-[11px]">{isTodo ? dataItem.text : dataItem.title}</span>
                                                        <div className="flex items-center gap-1 mt-auto pt-1 opacity-70">
                                                            <span className="text-[10px] font-mono">{format(parseISO(item.startStr), 'HH:mm')}</span>
                                                        </div>
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

            {/* MODALS */}
            {isCreating && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
                    <div className="bg-white dark:bg-slate-900 p-8 rounded-2xl shadow-2xl w-full max-w-sm animate-in zoom-in-95 border border-slate-200 dark:border-slate-700">
                        <h3 className="text-xl font-bold mb-6 text-slate-800 dark:text-white font-serif">Nouvel Événement</h3>
                        <div className="space-y-5">
                            <div>
                                <label className="text-xs font-bold text-slate-500 uppercase tracking-wide">Titre</label>
                                <input autoFocus type="text" value={newEvent.title} onChange={e => setNewEvent({...newEvent, title: e.target.value})} className="w-full mt-1.5 p-3 bg-slate-50 dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 outline-none focus:border-blue-500 dark:text-white transition-colors" placeholder="ex: Réunion Client" />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wide">Jour</label>
                                    <select value={newEvent.dayOffset} onChange={e => setNewEvent({...newEvent, dayOffset: parseInt(e.target.value)})} className="w-full mt-1.5 p-3 bg-slate-50 dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 text-sm dark:text-white outline-none">
                                        {weekDays.map((d, i) => <option key={i} value={i}>{format(d, 'EEEE', { locale: fr })}</option>)}
                                    </select>
                                </div>
                                <div>
                                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wide">Heure</label>
                                    <select value={newEvent.startHour} onChange={e => setNewEvent({...newEvent, startHour: parseInt(e.target.value)})} className="w-full mt-1.5 p-3 bg-slate-50 dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 text-sm dark:text-white outline-none">
                                        {hours.map(h => <option key={h} value={h}>{h}:00</option>)}
                                    </select>
                                </div>
                            </div>
                            <div>
                                <label className="text-xs font-bold text-slate-500 uppercase mb-2 block tracking-wide">Type / Couleur</label>
                                <div className="flex gap-3">
                                    {['blue', 'green', 'gray'].map(c => (
                                        <button key={c} onClick={() => setNewEvent({...newEvent, color: c})} className={`flex-1 h-10 rounded-xl border-2 transition-all ${newEvent.color === c ? 'border-slate-800 dark:border-white opacity-100 scale-105 shadow-md' : 'border-transparent opacity-40 hover:opacity-70'} ${c === 'blue' ? 'bg-blue-500' : c === 'green' ? 'bg-emerald-500' : 'bg-slate-500'}`}></button>
                                    ))}
                                </div>
                            </div>
                            <div className="flex items-center gap-3 pt-2 p-3 bg-slate-50 dark:bg-slate-800 rounded-xl">
                                <input type="checkbox" id="rec" checked={newEvent.recurrence} onChange={e => setNewEvent({...newEvent, recurrence: e.target.checked})} className="w-5 h-5 rounded text-blue-600 focus:ring-blue-500"/>
                                <label htmlFor="rec" className="text-sm font-medium text-slate-700 dark:text-slate-300">Répéter chaque semaine (x12)</label>
                            </div>
                            <div className="flex gap-3 pt-4">
                                <button onClick={() => setIsCreating(false)} className="flex-1 py-3 text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800 rounded-xl font-bold text-sm transition-colors">Annuler</button>
                                <button onClick={saveEvent} className="flex-1 py-3 bg-slate-900 dark:bg-white text-white dark:text-black rounded-xl font-bold text-sm hover:shadow-lg transition-all">Créer</button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {selectedEvent && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
                    <div className="bg-white dark:bg-slate-800 p-8 rounded-2xl shadow-2xl w-full max-w-sm animate-in zoom-in-95 border border-slate-200 dark:border-slate-700">
                        <div className="flex justify-between items-start mb-6">
                            <h3 className="text-xl font-bold text-slate-800 dark:text-white font-serif leading-tight">
                                {selectedEvent.type === 'event' ? selectedEvent.data.title : selectedEvent.data.text}
                            </h3>
                            <button onClick={() => setSelectedEvent(null)} className="p-1 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-full transition-colors"><div className="text-slate-400 hover:text-slate-600">✕</div></button>
                        </div>
                        
                        <div className="mb-8 p-4 bg-slate-50 dark:bg-slate-900/50 rounded-xl border border-slate-100 dark:border-slate-800">
                            <p className="text-xs font-bold text-slate-400 uppercase tracking-wide mb-1">
                                {selectedEvent.type === 'event' ? 'Événement Calendrier' : 'Tâche Planifiée'}
                            </p>
                            <p className="text-sm font-medium text-slate-700 dark:text-slate-300">
                                {format(parseISO(selectedEvent.data.start_time || selectedEvent.data.scheduled_date), 'EEEE d MMMM', { locale: fr })}
                                <br/>
                                <span className="text-lg font-bold text-slate-900 dark:text-white">
                                    {format(parseISO(selectedEvent.data.start_time || selectedEvent.data.scheduled_date), 'HH:mm')}
                                </span>
                            </p>
                        </div>

                        <div className="flex gap-3">
                            {selectedEvent.type === 'todo' ? (
                                <button onClick={() => unscheduleTodo(selectedEvent.data)} className="flex-1 py-3 border-2 border-orange-100 text-orange-600 rounded-xl font-bold text-sm hover:bg-orange-50 hover:border-orange-200 transition-colors">Retirer du planning</button>
                            ) : (
                                <button onClick={() => deleteEvent(selectedEvent.data)} className="flex-1 py-3 bg-red-50 text-red-600 rounded-xl font-bold text-sm hover:bg-red-100 flex items-center justify-center gap-2 transition-colors"><Trash2 size={18}/> Supprimer</button>
                            )}
                        </div>
                    </div>
                </div>
            )}

        </div>
    );
}