import { useState } from 'react';
import { 
  ChevronLeft, ChevronRight, CheckCircle2, 
  Plus, Repeat, Trash2, GripVertical, 
  X, Clock, AlertTriangle, Pencil
} from 'lucide-react';
import { 
  format, addDays, startOfWeek, addWeeks, subWeeks, 
  isSameDay, parseISO, getHours, getMinutes, 
  setHours, setMinutes, addMinutes, differenceInMinutes, parse, isValid
} from 'date-fns';
import { fr } from 'date-fns/locale';

export default function PlanningManager({ data, updateData }) {
    const [currentWeekStart, setCurrentWeekStart] = useState(startOfWeek(new Date(), { weekStartsOn: 1 }));
    const [selectedEvent, setSelectedEvent] = useState(null);
    const [isCreating, setIsCreating] = useState(false);
    
    // Modes de confirmation
    const [confirmMode, setConfirmMode] = useState(null); 
    const [pendingUpdate, setPendingUpdate] = useState(null); 

    // Drag & Drop
    const [draggedItem, setDraggedItem] = useState(null);
    const [previewSlot, setPreviewSlot] = useState(null);

    // Formulaire
    const [eventForm, setEventForm] = useState({ 
        id: null, title: '', date: format(new Date(), 'yyyy-MM-dd'),
        startHour: 9, startMin: 0, duration: 60, 
        type: 'event', recurrence: false, recurrenceWeeks: 12, recurrenceGroupId: null, color: 'blue' 
    });

    // Données sécurisées
    const events = Array.isArray(data.calendar_events) ? data.calendar_events : [];
    const scheduledTodos = (data.todos || []).filter(t => t.scheduled_date && !t.completed);
    const backlogTodos = (data.todos || []).filter(t => !t.scheduled_date && !t.completed);

    // Navigation
    const handlePreviousWeek = () => setCurrentWeekStart(subWeeks(currentWeekStart, 1));
    const handleNextWeek = () => setCurrentWeekStart(addWeeks(currentWeekStart, 1));
    const handleToday = () => setCurrentWeekStart(startOfWeek(new Date(), { weekStartsOn: 1 }));

    // Layout
    const getLayoutForDay = (dayItems) => {
        const sorted = [...dayItems].sort((a, b) => parseISO(a.startStr) - parseISO(b.startStr));
        const columns = [];
        sorted.forEach((item) => {
            if(!item.startStr || !item.endStr) return;
            const start = parseISO(item.startStr);
            const end = parseISO(item.endStr);
            if (!isValid(start) || !isValid(end)) return;

            const startMin = getHours(start) * 60 + getMinutes(start);
            const duration = differenceInMinutes(end, start);
            const top = Math.max(0, startMin - (6 * 60)); 
            
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
                        top: `${item.top}px`, height: `${item.height}px`,
                        width: `${100 / columns.length}%`, left: `${(colIndex * 100) / columns.length}%`,
                        position: 'absolute'
                    }
                });
            });
        });
        return result;
    };

    // Actions Formulaire
    const openCreateModal = (dayOffset = 0, hour = 9) => {
        const targetDate = addDays(currentWeekStart, dayOffset);
        setEventForm({
            id: null, title: '', date: format(targetDate, 'yyyy-MM-dd'),
            startHour: hour, startMin: 0, duration: 60,
            type: 'event', recurrence: false, recurrenceWeeks: 12, recurrenceGroupId: null, color: 'blue'
        });
        setIsCreating(true);
        setSelectedEvent(null);
    };

    const openEditModal = (evt) => {
        const start = parseISO(evt.start_time);
        const end = parseISO(evt.end_time);
        setEventForm({
            id: evt.id, title: evt.title, date: format(start, 'yyyy-MM-dd'),
            startHour: getHours(start), startMin: getMinutes(start),
            duration: differenceInMinutes(end, start),
            type: 'event', recurrence: !!evt.recurrence_group_id, recurrenceWeeks: 12,
            recurrenceGroupId: evt.recurrence_group_id, color: evt.color || 'blue'
        });
        setIsCreating(true);
        setSelectedEvent(null);
    };

    const handleSave = () => {
        if (!eventForm.title) return alert("Titre requis");
        const baseDate = parse(eventForm.date, 'yyyy-MM-dd', new Date());
        const newStart = setMinutes(setHours(baseDate, eventForm.startHour), eventForm.startMin);
        const newEnd = addMinutes(newStart, eventForm.duration);

        if (!eventForm.id) {
            // Création
            const groupId = eventForm.recurrence ? Date.now().toString() : null;
            const eventBase = { user_id: data.profile?.id, title: eventForm.title, color: eventForm.color, recurrence_group_id: groupId, recurrence_type: eventForm.recurrence ? 'weekly' : null };
            let newEvents = [];
            if (eventForm.recurrence) {
                const weeks = parseInt(eventForm.recurrenceWeeks) || 1;
                for (let i = 0; i < weeks; i++) {
                    const s = addWeeks(newStart, i);
                    const e = addWeeks(newEnd, i);
                    newEvents.push({ ...eventBase, id: Date.now() + i, start_time: s.toISOString(), end_time: e.toISOString() });
                }
            } else {
                newEvents.push({ ...eventBase, id: Date.now(), start_time: newStart.toISOString(), end_time: newEnd.toISOString() });
            }
            updateData({ ...data, calendar_events: [...events, ...newEvents] });
            setIsCreating(false);
            return;
        }

        // Modification
        if (eventForm.recurrenceGroupId) {
            setPendingUpdate({ newStart, newEnd, ...eventForm }); 
            setConfirmMode('ask_update'); 
            setIsCreating(true); 
        } else {
            applyUpdate(eventForm.id, newStart, newEnd, eventForm, 'single');
        }
    };

    // --- CORRECTION MAJEURE DU BUG DE SYNCHRONISATION ---
    const applyUpdate = (targetId, startObj, endObj, formData, mode) => {
        let updatedEvents = [...events];

        if (mode === 'series' && formData.recurrenceGroupId) {
            // On récupère les infos cibles : HEURE et MINUTES précises
            const targetHours = getHours(startObj);
            const targetMinutes = getMinutes(startObj);
            const targetDuration = formData.duration;
            
            // On doit aussi savoir si on a changé de JOUR de la semaine
            const originalEvent = events.find(e => e.id === targetId);
            
            // Sécurité crash si event introuvable
            if (!originalEvent) {
                setIsCreating(false);
                setConfirmMode(null);
                return; 
            }

            const originalStart = parseISO(originalEvent.start_time);
            
            // Calcul du décalage en jours (ex: Lundi -> Mardi = +1 jour)
            // On utilise setHours(0,0,0,0) pour comparer les jours purs
            const startDayZero = new Date(startObj); startDayZero.setHours(0,0,0,0);
            const originalDayZero = new Date(originalStart); originalDayZero.setHours(0,0,0,0);
            const dayDiff = Math.round((startDayZero - originalDayZero) / (1000 * 60 * 60 * 24));

            updatedEvents = updatedEvents.map(ev => {
                // On applique à TOUT le groupe, même ceux déjà modifiés auparavant
                if (ev.recurrence_group_id === formData.recurrenceGroupId) {
                    let evStart = parseISO(ev.start_time);
                    
                    // 1. Appliquer le décalage de jours (si on a changé de jour)
                    if (dayDiff !== 0) {
                        evStart = addDays(evStart, dayDiff);
                    }

                    // 2. FORCER l'heure et les minutes (Synchronisation absolue)
                    // C'est ça qui corrige le bug : on n'ajoute pas +1h, on DIT "C'est 11h00".
                    let newEvStart = setMinutes(setHours(evStart, targetHours), targetMinutes);
                    let newEvEnd = addMinutes(newEvStart, targetDuration);

                    return { 
                        ...ev, 
                        title: formData.title, 
                        color: formData.color, 
                        start_time: newEvStart.toISOString(), 
                        end_time: newEvEnd.toISOString() 
                    };
                }
                return ev;
            });
        } else {
            // MODE SINGLE : On modifie juste l'événement, mais ON GARDE LE GROUPE (pour pouvoir le rattraper plus tard si besoin)
            updatedEvents = updatedEvents.map(ev => ev.id === targetId ? {
                ...ev, title: formData.title, color: formData.color,
                start_time: startObj.toISOString(), end_time: endObj.toISOString()
            } : ev);
        }

        updateData({ ...data, calendar_events: updatedEvents });
        setConfirmMode(null);
        setPendingUpdate(null);
        setIsCreating(false);
    };

    const handleDeleteRequest = (evt) => {
        if (!evt) return;
        if (evt.recurrence_group_id) {
            setSelectedEvent(evt); setConfirmMode('ask_delete');
        } else {
            if(window.confirm("Supprimer cet événement ?")) performDelete(evt, false);
        }
    };

    // --- CORRECTION DU CRASH SUR SUPPRESSION ---
    const performDelete = (evt, series) => {
        if (!evt) {
             // Sécurité crash
             setConfirmMode(null);
             setSelectedEvent(null);
             return;
        }

        let updatedEvents = [...events]; // Copie propre
        
        if (series && evt.recurrence_group_id) {
            // Suppression par ID de groupe (Robuste)
            updatedEvents = updatedEvents.filter(e => e.recurrence_group_id !== evt.recurrence_group_id);
        } else {
            // Suppression par ID unique
            updatedEvents = updatedEvents.filter(e => e.id !== evt.id);
        }
        
        // On passe null comme ID pour forcer une sauvegarde globale de la table 'calendar_events'
        // au lieu d'une suppression par ID unique côté serveur, ce qui évite les conflits
        updateData({ ...data, calendar_events: updatedEvents });
        
        setSelectedEvent(null);
        setConfirmMode(null);
    };

    // Drag & Drop
    const onDragStart = (e, item, type) => {
        setDraggedItem({ type, data: item });
        e.dataTransfer.effectAllowed = "move";
        const img = new Image(); img.src = 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7';
        e.dataTransfer.setDragImage(img, 0, 0);
    };

    const onDragOver = (e, dayIndex) => {
        e.preventDefault();
        const rect = e.currentTarget.getBoundingClientRect();
        const y = e.clientY - rect.top;
        let hour = Math.floor(y / 60) + 6; if (hour < 6) hour = 6; if (hour > 23) hour = 23;
        let rawMinutes = Math.floor(y % 60); let snappedMinutes = Math.round(rawMinutes / 15) * 15;
        let duration = 60;
        if (draggedItem?.type === 'event') duration = differenceInMinutes(parseISO(draggedItem.data.end_time), parseISO(draggedItem.data.start_time));
        else if (draggedItem?.type === 'planned_todo') duration = draggedItem.data.duration_minutes || 60;
        setPreviewSlot({ dayIndex, top: (hour - 6) * 60 + snappedMinutes, height: Math.max(30, duration), timeLabel: `${hour}:${snappedMinutes.toString().padStart(2, '0')}` });
    };

    const onDrop = (e, day) => {
        e.preventDefault();
        setPreviewSlot(null);
        if (!draggedItem || !previewSlot) return;

        const [h, m] = previewSlot.timeLabel.split(':').map(Number);
        const newStart = setMinutes(setHours(day, h), m);

        if (draggedItem.type === 'todo' || draggedItem.type === 'planned_todo') {
            const updatedTodos = data.todos.map(t => t.id === draggedItem.data.id ? { ...t, scheduled_date: newStart.toISOString(), duration_minutes: 60 } : t);
            updateData({ ...data, todos: updatedTodos });
        } 
        else if (draggedItem.type === 'event') {
            const evt = draggedItem.data;
            const duration = differenceInMinutes(parseISO(evt.end_time), parseISO(evt.start_time));
            const newEnd = addMinutes(newStart, duration);

            if (evt.recurrence_group_id) {
                setEventForm({
                    id: evt.id, title: evt.title, color: evt.color, recurrenceGroupId: evt.recurrence_group_id, duration: duration, 
                    date: format(newStart, 'yyyy-MM-dd'), startHour: h, startMin: m, recurrence: true, recurrenceWeeks: 12, type: 'event'
                });
                setPendingUpdate({ newStart, newEnd, title: evt.title, color: evt.color, recurrenceGroupId: evt.recurrence_group_id, duration });
                setConfirmMode('ask_update');
                setIsCreating(true);
            } else {
                const updatedEvents = events.map(ev => ev.id === evt.id ? { ...ev, start_time: newStart.toISOString(), end_time: newEnd.toISOString() } : ev);
                updateData({ ...data, calendar_events: updatedEvents });
            }
        }
        setDraggedItem(null);
    };

    const unscheduleTodo = (todo) => {
        updateData({ ...data, todos: data.todos.map(t => t.id === todo.id ? { ...t, scheduled_date: null } : t) });
        setSelectedEvent(null);
    };

    const weekDays = Array.from({ length: 7 }).map((_, i) => addDays(currentWeekStart, i));
    const hours = Array.from({ length: 18 }).map((_, i) => i + 6);
    const currentTimeMin = getHours(new Date()) * 60 + getMinutes(new Date()) - (6 * 60);

    return (
        <div className="fade-in flex flex-col md:flex-row h-[calc(100vh-2rem)] overflow-hidden bg-white dark:bg-slate-900 font-sans">
            <div className="w-full md:w-80 border-r border-slate-200 dark:border-slate-800 flex flex-col bg-slate-50 dark:bg-slate-900 z-20 shadow-xl shadow-slate-200/50 dark:shadow-none">
                <div className="p-5 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900"><h2 className="font-bold text-slate-800 dark:text-white flex items-center gap-2 text-lg"><CheckCircle2 size={20} className="text-blue-600"/> Tâches à faire</h2></div>
                <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar">
                    {backlogTodos.map(todo => (
                        <div key={todo.id} draggable onDragStart={(e) => onDragStart(e, todo, 'todo')} className="bg-white dark:bg-slate-800 p-4 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm hover:shadow-md hover:border-blue-400 cursor-grab active:cursor-grabbing transition-all group relative overflow-hidden">
                            <div className="absolute left-0 top-0 bottom-0 w-1 bg-slate-200 dark:bg-slate-700 group-hover:bg-blue-500 transition-colors"></div>
                            <div className="flex justify-between items-start pl-2"><span className="text-sm font-medium text-slate-700 dark:text-slate-200 line-clamp-2 leading-relaxed">{todo.text}</span><GripVertical size={16} className="text-slate-300 dark:text-slate-600 shrink-0"/></div>
                        </div>
                    ))}
                    {backlogTodos.length === 0 && <div className="text-center py-10 text-slate-400 italic text-sm">Rien à planifier !</div>}
                </div>
                <div className="p-4 border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900"><button onClick={() => openCreateModal()} className="w-full py-3.5 bg-slate-900 dark:bg-white text-white dark:text-black rounded-xl font-bold text-sm hover:shadow-lg transition-all flex items-center justify-center gap-2"><Plus size={18}/> Nouvel Événement</button></div>
            </div>

            <div className="flex-1 flex flex-col min-w-0 bg-white dark:bg-slate-900 relative">
                <div className="flex items-center justify-between px-8 py-5 border-b border-slate-200 dark:border-slate-800 bg-white/80 dark:bg-slate-900/80 backdrop-blur z-30 sticky top-0">
                    <div className="flex items-center gap-6"><h2 className="text-2xl font-bold text-slate-800 dark:text-white capitalize font-serif tracking-tight">{format(currentWeekStart, 'MMMM yyyy', { locale: fr })}</h2><div className="flex items-center bg-slate-100 dark:bg-slate-800 rounded-xl p-1 shadow-inner"><button onClick={handlePreviousWeek} className="p-1.5 hover:bg-white dark:hover:bg-slate-700 rounded-lg transition-all shadow-sm"><ChevronLeft size={18}/></button><button onClick={handleToday} className="px-4 text-xs font-bold text-slate-600 dark:text-slate-300">Aujourd'hui</button><button onClick={handleNextWeek} className="p-1.5 hover:bg-white dark:hover:bg-slate-700 rounded-lg transition-all shadow-sm"><ChevronRight size={18}/></button></div></div>
                </div>
                <div className="flex-1 overflow-y-auto relative custom-scrollbar select-none">
                    <div className="flex min-w-[800px] pb-20">
                        <div className="w-20 flex-shrink-0 border-r border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 sticky left-0 z-20">
                            <div className="h-14 border-b border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900"></div>
                            {hours.map(h => <div key={h} className="h-[60px] text-[11px] font-medium text-slate-400 text-right pr-4 pt-1 relative -top-2.5">{h}:00</div>)}
                            <div className="h-[60px] text-[11px] font-medium text-slate-400 text-right pr-4 pt-1 relative -top-2.5">00:00</div>
                        </div>
                        <div className="flex-1 grid grid-cols-7 divide-x divide-slate-100 dark:divide-slate-800">
                            {weekDays.map((day, dayIndex) => {
                                const isToday = isSameDay(day, new Date());
                                const rawEvents = events.filter(e => isSameDay(parseISO(e.start_time), day)).map(e => ({ type: 'event', data: e, startStr: e.start_time, endStr: e.end_time }));
                                const rawTodos = scheduledTodos.filter(t => isSameDay(parseISO(t.scheduled_date), day)).map(t => ({ type: 'todo', data: t, startStr: t.scheduled_date, endStr: addMinutes(parseISO(t.scheduled_date), t.duration_minutes || 60).toISOString() }));
                                const layoutItems = getLayoutForDay([...rawEvents, ...rawTodos]);
                                return (
                                    <div key={dayIndex} className={`relative min-w-[120px] bg-white dark:bg-slate-900 transition-colors ${draggedItem && previewSlot?.dayIndex !== dayIndex ? 'hover:bg-slate-50 dark:hover:bg-slate-800/50' : ''}`} onDragOver={(e) => onDragOver(e, dayIndex)} onDrop={(e) => onDrop(e, day)}>
                                        <div className={`h-14 flex flex-col items-center justify-center border-b border-slate-100 dark:border-slate-800 sticky top-0 bg-white/95 dark:bg-slate-900/95 backdrop-blur z-20 ${isToday ? 'bg-blue-50/80 dark:bg-blue-900/20' : ''}`}><span className={`text-[10px] font-bold uppercase tracking-wider ${isToday ? 'text-blue-600' : 'text-slate-400'}`}>{format(day, 'EEE', { locale: fr })}</span><span className={`text-lg font-bold mt-0.5 ${isToday ? 'bg-blue-600 text-white w-8 h-8 rounded-full flex items-center justify-center shadow-lg shadow-blue-500/30' : 'text-slate-800 dark:text-white'}`}>{format(day, 'd')}</span></div>
                                        <div className="relative h-[1140px]">
                                            {Array.from({length: 19}).map((_, i) => <div key={i} className="absolute w-full border-t border-slate-50 dark:border-slate-800/40 h-[60px]" style={{ top: `${i*60}px` }}></div>)}
                                            {isToday && currentTimeMin > 0 && <div className="absolute w-full border-t-2 border-red-500 z-10 pointer-events-none" style={{ top: `${currentTimeMin}px` }}></div>}
                                            {previewSlot && previewSlot.dayIndex === dayIndex && (<div className="absolute z-0 rounded-lg bg-blue-500/10 border-2 border-blue-500 border-dashed pointer-events-none flex items-center justify-center" style={{ top: `${previewSlot.top}px`, height: `${previewSlot.height}px`, left: '2px', right: '2px' }}><span className="text-xs font-bold text-blue-600 bg-white/80 px-2 py-1 rounded-md shadow-sm">{previewSlot.timeLabel}</span></div>)}
                                            {layoutItems.map((item) => {
                                                const isTodo = item.type === 'todo';
                                                const dataItem = item.data;
                                                const isDraggingThis = draggedItem?.data?.id === dataItem.id;
                                                const isRecurrent = !!dataItem.recurrence_group_id;
                                                const colorClass = isTodo ? 'bg-orange-50 border-orange-200 text-orange-900 dark:bg-orange-900/20 dark:border-orange-800 dark:text-orange-100 border-l-4 border-l-orange-400' : dataItem.color === 'green' ? 'bg-emerald-50 border-emerald-200 text-emerald-900 dark:bg-emerald-900/20 dark:border-emerald-800 dark:text-emerald-100 border-l-4 border-l-emerald-500' : dataItem.color === 'gray' ? 'bg-slate-100 border-slate-200 text-slate-700 dark:bg-slate-800 dark:border-slate-600 dark:text-slate-300 border-l-4 border-l-slate-400' : 'bg-blue-50 border-blue-200 text-blue-900 dark:bg-blue-900/20 dark:border-blue-800 dark:text-blue-100 border-l-4 border-l-blue-500';
                                                return (<div key={`${item.type}-${dataItem.id}`} style={{...item.style, opacity: isDraggingThis ? 0.5 : 1}} draggable onDragStart={(e) => onDragStart(e, dataItem, isTodo ? 'planned_todo' : 'event')} onClick={(e) => { e.stopPropagation(); setSelectedEvent({ type: item.type, data: dataItem }); }} className={`absolute rounded-lg p-2 text-xs cursor-pointer hover:brightness-95 hover:z-30 transition-all shadow-sm border overflow-hidden flex flex-col group/item select-none ${colorClass}`}><span className="font-bold truncate leading-tight text-[11px]">{isTodo ? dataItem.text : dataItem.title}</span><div className="flex items-center gap-1 mt-auto pt-1 opacity-70"><span className="text-[10px] font-mono">{format(parseISO(item.startStr), 'HH:mm')}</span>{isRecurrent && <Repeat size={10} />}</div></div>);
                                            })}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </div>
            </div>

            {isCreating && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
                    <div className="bg-white dark:bg-slate-800 p-8 rounded-2xl shadow-2xl w-full max-w-sm animate-in zoom-in-95 border border-slate-200 dark:border-slate-700">
                        {confirmMode === 'ask_update' ? (
                            <div className="text-center space-y-4">
                                <div className="w-12 h-12 bg-blue-100 text-blue-500 rounded-full flex items-center justify-center mx-auto mb-2"><Repeat size={24}/></div>
                                <h3 className="font-bold text-lg dark:text-white">Modifier la récurrence ?</h3>
                                <div className="grid gap-3">
                                    <button onClick={() => applyUpdate(eventForm.id, pendingUpdate.newStart, pendingUpdate.newEnd, pendingUpdate, 'single')} className="w-full py-3 border border-slate-200 rounded-xl font-bold text-sm hover:bg-slate-50 dark:text-white dark:border-slate-700 dark:hover:bg-slate-700">Juste celui-là</button>
                                    <button onClick={() => applyUpdate(eventForm.id, pendingUpdate.newStart, pendingUpdate.newEnd, pendingUpdate, 'series')} className="w-full py-3 bg-blue-600 text-white rounded-xl font-bold text-sm hover:bg-blue-700">Toute la série</button>
                                    <button onClick={() => { setConfirmMode(null); setIsCreating(false); }} className="text-xs text-slate-400 hover:underline mt-2">Annuler</button>
                                </div>
                            </div>
                        ) : (
                            <>
                                <h3 className="text-xl font-bold mb-6 text-slate-800 dark:text-white font-serif">{eventForm.id ? 'Modifier' : 'Planifier'}</h3>
                                <div className="space-y-4">
                                    <div><label className="text-xs font-bold text-slate-500 uppercase tracking-wide">Titre</label><input autoFocus type="text" value={eventForm.title} onChange={e => setEventForm({...eventForm, title: e.target.value})} className="w-full mt-1.5 p-3 bg-slate-50 dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 outline-none focus:border-blue-500 dark:text-white" placeholder="Titre..." /></div>
                                    <div><label className="text-xs font-bold text-slate-500 uppercase tracking-wide">Date</label><input type="date" value={eventForm.date} onChange={e => setEventForm({...eventForm, date: e.target.value})} className="w-full mt-1.5 p-3 bg-slate-50 dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 text-sm dark:text-white outline-none"/></div>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div><label className="text-xs font-bold text-slate-500 uppercase tracking-wide">Heure</label><div className="flex gap-2"><select value={eventForm.startHour} onChange={e => setEventForm({...eventForm, startHour: parseInt(e.target.value)})} className="w-full mt-1.5 p-3 bg-slate-50 dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 text-sm dark:text-white outline-none">{Array.from({length: 19}).map((_, i) => <option key={i} value={i+6}>{i+6}h</option>)}</select><select value={eventForm.startMin} onChange={e => setEventForm({...eventForm, startMin: parseInt(e.target.value)})} className="w-full mt-1.5 p-3 bg-slate-50 dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 text-sm dark:text-white outline-none"><option value={0}>00</option><option value={15}>15</option><option value={30}>30</option><option value={45}>45</option></select></div></div>
                                        <div><label className="text-xs font-bold text-slate-500 uppercase tracking-wide">Durée</label><select value={eventForm.duration} onChange={e => setEventForm({...eventForm, duration: parseInt(e.target.value)})} className="w-full mt-1.5 p-3 bg-slate-50 dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 text-sm dark:text-white outline-none"><option value={15}>15 min</option><option value={30}>30 min</option><option value={45}>45 min</option><option value={60}>1h</option><option value={90}>1h 30</option><option value={120}>2h</option><option value={180}>3h</option><option value={240}>4h</option></select></div>
                                    </div>
                                    {!eventForm.id && (
                                        <div className="p-3 bg-slate-50 dark:bg-slate-900 rounded-xl border border-slate-100 dark:border-slate-700">
                                            <div className="flex items-center justify-between mb-2"><label className="flex items-center gap-2 cursor-pointer"><input type="checkbox" checked={eventForm.recurrence} onChange={e => setEventForm({...eventForm, recurrence: e.target.checked})} className="w-4 h-4 rounded text-blue-600"/><span className="text-sm font-bold text-slate-700 dark:text-slate-300">Répéter (Hebdo)</span></label></div>
                                            {eventForm.recurrence && (<div className="flex items-center gap-2 mt-2"><span className="text-xs text-slate-500">Pendant</span><input type="number" min="1" max="52" value={eventForm.recurrenceWeeks} onChange={e => setEventForm({...eventForm, recurrenceWeeks: e.target.value})} className="w-16 p-1 text-center bg-white dark:bg-slate-800 border rounded text-sm"/><span className="text-xs text-slate-500">semaines</span></div>)}
                                        </div>
                                    )}
                                    <div className="flex gap-3 pt-2">{['blue', 'green', 'gray'].map(c => (<button key={c} onClick={() => setEventForm({...eventForm, color: c})} className={`flex-1 h-8 rounded-lg border-2 transition-all ${eventForm.color === c ? 'border-slate-800 dark:border-white opacity-100' : 'border-transparent opacity-40'} ${c === 'blue' ? 'bg-blue-500' : c === 'green' ? 'bg-emerald-500' : 'bg-slate-500'}`}></button>))}</div>
                                    <div className="flex gap-3 pt-4"><button onClick={() => setIsCreating(false)} className="flex-1 py-3 text-slate-600 hover:bg-slate-100 rounded-xl font-bold text-sm">Annuler</button><button onClick={handleSave} className="flex-1 py-3 bg-slate-900 dark:bg-white text-white dark:text-black rounded-xl font-bold text-sm">{eventForm.id ? 'Modifier' : 'Créer'}</button></div>
                                </div>
                            </>
                        )}
                    </div>
                </div>
            )}
            {selectedEvent && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
                    <div className="bg-white dark:bg-slate-800 p-8 rounded-2xl shadow-2xl w-full max-w-sm animate-in zoom-in-95 border border-slate-200 dark:border-slate-700">
                        {confirmMode === 'ask_delete' ? (
                            <div className="text-center space-y-4">
                                <div className="w-12 h-12 bg-red-100 text-red-500 rounded-full flex items-center justify-center mx-auto mb-2"><AlertTriangle size={24}/></div>
                                <h3 className="font-bold text-lg dark:text-white">Supprimer la série ?</h3>
                                <div className="grid gap-3">
                                    <button onClick={() => performDelete(selectedEvent.data, false)} className="w-full py-3 border border-slate-200 rounded-xl font-bold text-sm hover:bg-slate-50 dark:text-white dark:border-slate-700 dark:hover:bg-slate-700">Juste celui-là</button>
                                    <button onClick={() => performDelete(selectedEvent.data, true)} className="w-full py-3 bg-red-500 text-white rounded-xl font-bold text-sm hover:bg-red-600">Toute la série</button>
                                    <button onClick={() => setConfirmMode(null)} className="text-xs text-slate-400 hover:underline mt-2">Annuler</button>
                                </div>
                            </div>
                        ) : (
                            <>
                                <div className="flex justify-between items-start mb-6"><h3 className="text-xl font-bold text-slate-800 dark:text-white leading-tight pr-4">{selectedEvent.type === 'event' ? selectedEvent.data.title : selectedEvent.data.text}</h3><button onClick={() => { setSelectedEvent(null); setConfirmMode(null); }} className="p-1 hover:bg-slate-100 rounded-full"><X size={20} className="text-slate-400"/></button></div>
                                <div className="mb-6 p-4 bg-slate-50 dark:bg-slate-900/50 rounded-xl border border-slate-100 dark:border-slate-800 flex gap-4 items-center"><div className="p-3 bg-white dark:bg-slate-800 rounded-lg shadow-sm text-blue-600"><Clock size={24}/></div><div><p className="text-xs font-bold text-slate-400 uppercase tracking-wide">Horaire</p><p className="text-sm font-medium text-slate-700 dark:text-slate-300">{format(parseISO(selectedEvent.data.start_time || selectedEvent.data.scheduled_date), 'EEEE d MMMM', { locale: fr })}<br/><span className="text-lg font-bold text-slate-900 dark:text-white">{format(parseISO(selectedEvent.data.start_time || selectedEvent.data.scheduled_date), 'HH:mm')}</span></p></div></div>
                                <div className="flex gap-3">{selectedEvent.type === 'todo' ? (<button onClick={() => unscheduleTodo(selectedEvent.data)} className="flex-1 py-3 border-2 border-orange-100 text-orange-600 rounded-xl font-bold text-sm hover:bg-orange-50 transition-colors">Retirer</button>) : (<><button onClick={() => openEditModal(selectedEvent.data)} className="flex-1 py-3 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 rounded-xl font-bold text-sm hover:bg-slate-50 dark:hover:bg-slate-800 flex items-center justify-center gap-2"><Pencil size={16}/> Modifier</button><button onClick={() => handleDeleteRequest(selectedEvent.data)} className="flex-1 py-3 bg-red-50 text-red-600 rounded-xl font-bold text-sm hover:bg-red-100 flex items-center justify-center gap-2 transition-colors"><Trash2 size={18}/> Supprimer</button></>)}</div>
                            </>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}