import { useState, useEffect, useRef } from 'react';
import { 
  ChevronLeft, ChevronRight, CheckCircle2, 
  Plus, Repeat, Trash2, GripVertical, 
  X, Clock, AlertTriangle, Pencil, RotateCcw, Calendar,
  PanelLeftClose, PanelLeftOpen, ArrowLeftFromLine
} from 'lucide-react';
import { 
  format, addDays, startOfWeek, addWeeks, subWeeks, 
  isSameDay, parseISO, getHours, getMinutes, 
  setHours, setMinutes, addMinutes, differenceInMinutes, parse, isValid, startOfDay
} from 'date-fns';
import { fr } from 'date-fns/locale';

export default function PlanningManager({ data, updateData }) {
    const [currentWeekStart, setCurrentWeekStart] = useState(startOfWeek(new Date(), { weekStartsOn: 1 }));
    const [selectedEvent, setSelectedEvent] = useState(null);
    const [isCreating, setIsCreating] = useState(false);
    const [confirmMode, setConfirmMode] = useState(null); 
    const [pendingUpdate, setPendingUpdate] = useState(null); 
    const [showSidebar, setShowSidebar] = useState(true); 
    
    // Drag & Drop
    const [draggedItem, setDraggedItem] = useState(null);
    const [previewSlot, setPreviewSlot] = useState(null);

    // Resize
    const [resizingEvent, setResizingEvent] = useState(null); 
    const resizeRef = useRef(null);
    const ignoreNextClick = useRef(false);
    
    const eventsRef = useRef(data.calendar_events || []);
    useEffect(() => { eventsRef.current = data.calendar_events || []; }, [data.calendar_events]);

    const [eventForm, setEventForm] = useState({ 
        id: null, title: '', date: format(new Date(), 'yyyy-MM-dd'),
        startHour: 9, startMin: 0, duration: 60, 
        type: 'event', recurrence: false, recurrenceWeeks: 12, recurrenceGroupId: null, color: 'blue',
        isAllDay: false
    });

    const events = Array.isArray(data.calendar_events) ? data.calendar_events : [];
    const scheduledTodos = (data.todos || []).filter(t => t.scheduled_date && !t.completed);
    const backlogTodos = (data.todos || []).filter(t => !t.scheduled_date && !t.completed);

    // --- GESTION RESIZE ---
    useEffect(() => {
        const handleMouseMove = (e) => {
            if (!resizeRef.current) return;
            const { startY, startDuration } = resizeRef.current;
            const deltaY = e.clientY - startY; 
            let newDuration = startDuration + deltaY;
            newDuration = Math.round(newDuration / 15) * 15;
            if (newDuration < 15) newDuration = 15; 
            setResizingEvent(prev => prev ? ({ ...prev, currentDuration: newDuration }) : null);
        };

        const handleMouseUp = () => {
            if (!resizeRef.current) return;
            ignoreNextClick.current = true;
            setTimeout(() => { ignoreNextClick.current = false; }, 200);
            finishResize(resizeRef.current.event, resizeRef.current.currentDurationTemp);
            setResizingEvent(null);
            resizeRef.current = null;
        };

        if (resizingEvent) {
            window.addEventListener('mousemove', handleMouseMove);
            window.addEventListener('mouseup', handleMouseUp);
        }
        return () => {
            window.removeEventListener('mousemove', handleMouseMove);
            window.removeEventListener('mouseup', handleMouseUp);
        };
    }, [resizingEvent]);

    useEffect(() => {
        if (resizingEvent && resizeRef.current) {
            resizeRef.current.currentDurationTemp = resizingEvent.currentDuration;
        }
    }, [resizingEvent]);

    const startResize = (e, evt) => {
        e.stopPropagation(); 
        e.preventDefault(); 
        let startDuration = 60;
        let startTime, endTime;
        if (evt.scheduled_date) { 
             startTime = parseISO(evt.scheduled_date);
             startDuration = evt.duration_minutes || 60;
        } else { 
             startTime = parseISO(evt.start_time);
             endTime = parseISO(evt.end_time);
             startDuration = differenceInMinutes(endTime, startTime);
        }
        const initData = { id: evt.id, startY: e.clientY, startDuration: startDuration, currentDuration: startDuration, currentDurationTemp: startDuration, event: evt };
        setResizingEvent(initData);
        resizeRef.current = initData;
    };

    const finishResize = (evt, newDuration) => {
        if (!newDuration || newDuration === resizeRef.current?.startDuration) return;
        
        if (evt.scheduled_date) {
            const updatedTodos = data.todos.map(t => t.id === evt.id ? { ...t, duration_minutes: newDuration } : t);
            updateData({ ...data, todos: updatedTodos });
            return;
        }

        const start = parseISO(evt.start_time);
        const newEnd = addMinutes(start, newDuration);

        if (evt.recurrence_group_id) {
            setEventForm({
                id: evt.id, title: evt.title, color: evt.color, recurrenceGroupId: evt.recurrence_group_id, duration: newDuration, 
                date: format(start, 'yyyy-MM-dd'), startHour: getHours(start), startMin: getMinutes(start), recurrence: true, recurrenceWeeks: 12, type: 'event', isAllDay: false
            });
            setPendingUpdate({ newStart: start, newEnd: newEnd, title: evt.title, color: evt.color, recurrenceGroupId: evt.recurrence_group_id, duration: newDuration, isAllDay: false });
            setConfirmMode('ask_update');
            setIsCreating(true);
        } else {
            const updatedEvents = eventsRef.current.map(ev => ev.id === evt.id ? { ...ev, end_time: newEnd.toISOString(), is_all_day: false } : ev);
            updateData({ ...data, calendar_events: updatedEvents });
        }
    };

    const handleEventClick = (e, itemData, type) => {
        e.stopPropagation();
        if (ignoreNextClick.current) { ignoreNextClick.current = false; return; }
        setSelectedEvent({ type, data: itemData });
    };

    // --- NAVIGATION ---
    const handlePreviousWeek = () => setCurrentWeekStart(subWeeks(currentWeekStart, 1));
    const handleNextWeek = () => setCurrentWeekStart(addWeeks(currentWeekStart, 1));
    const handleToday = () => setCurrentWeekStart(startOfWeek(new Date(), { weekStartsOn: 1 }));

    // --- LAYOUT ENGINE ---
    const getLayoutForDay = (dayItems) => {
        // Filtrage strict : on vire tout ce qui est All Day
        const timedItems = dayItems.filter(item => {
            if (item.type === 'event') return !item.data.is_all_day;
            if (item.type === 'todo') return item.data.duration_minutes !== 1440;
            return true;
        });

        const sorted = [...timedItems].sort((a, b) => parseISO(a.startStr) - parseISO(b.startStr));
        const columns = [];
        sorted.forEach((item) => {
            if(!item.startStr || !item.endStr) return;
            const start = parseISO(item.startStr);
            const end = parseISO(item.endStr);
            if (!isValid(start) || !isValid(end)) return;

            const startMin = getHours(start) * 60 + getMinutes(start);
            let duration = differenceInMinutes(end, start);
            if (resizingEvent && item.data.id === resizingEvent.id) duration = resizingEvent.currentDuration;

            const top = Math.max(0, startMin - (6 * 60)); 
            let placed = false;
            for(let col of columns) {
                if (!col.some(ev => {
                    const evStart = parseISO(ev.startStr);
                    const evEnd = parseISO(ev.endStr);
                    let evDuration = differenceInMinutes(evEnd, evStart);
                    if (resizingEvent && ev.data.id === resizingEvent.id) evDuration = resizingEvent.currentDuration;
                    
                    const myTop = top; const myBottom = top + duration;
                    const otherStartMin = getHours(evStart) * 60 + getMinutes(evStart);
                    const otherTop = Math.max(0, otherStartMin - (6 * 60));
                    const otherBottom = otherTop + evDuration;
                    return (myTop < otherBottom && myBottom > otherTop);
                })) {
                    col.push({ ...item, top, height: Math.max(15, duration) });
                    placed = true;
                    break;
                }
            }
            if (!placed) columns.push([{ ...item, top, height: Math.max(15, duration) }]);
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

    // --- ACTIONS ---
    const openCreateModal = (dayOffset = 0, hour = 9, isAllDay = false, title = '') => {
        const targetDate = addDays(currentWeekStart, dayOffset);
        setEventForm({
            id: null, title: title, date: format(targetDate, 'yyyy-MM-dd'),
            startHour: hour, startMin: 0, duration: 60,
            type: 'event', recurrence: false, recurrenceWeeks: 12, recurrenceGroupId: null, color: 'blue',
            isAllDay: isAllDay
        });
        setIsCreating(true);
        setSelectedEvent(null);
    };

    const openEditModal = (evt, type = 'event') => {
        let start, end, duration, title, id, isAllDay;
        if (type === 'todo') {
            start = parseISO(evt.scheduled_date);
            duration = evt.duration_minutes || 60;
            end = addMinutes(start, duration);
            title = evt.text;
            id = evt.id;
            isAllDay = duration === 1440; 
        } else {
            start = parseISO(evt.start_time);
            end = parseISO(evt.end_time);
            duration = differenceInMinutes(end, start);
            title = evt.title;
            id = evt.id;
            isAllDay = evt.is_all_day || false;
        }
        setEventForm({
            id: id, title: title, date: format(start, 'yyyy-MM-dd'),
            startHour: getHours(start), startMin: getMinutes(start),
            duration: duration, type: type, recurrence: !!evt.recurrence_group_id, recurrenceWeeks: 12,
            recurrenceGroupId: evt.recurrence_group_id, color: evt.color || 'blue', isAllDay: isAllDay
        });
        setIsCreating(true);
        setSelectedEvent(null);
    };

    const handleSave = () => {
        if (!eventForm.title) return alert("Titre requis");
        const baseDate = parse(eventForm.date, 'yyyy-MM-dd', new Date());
        let newStart, newEnd;
        if (eventForm.isAllDay) {
            newStart = setMinutes(setHours(baseDate, 0), 0);
            newEnd = setMinutes(setHours(baseDate, 23), 59);
        } else {
            newStart = setMinutes(setHours(baseDate, eventForm.startHour), eventForm.startMin);
            newEnd = addMinutes(newStart, eventForm.duration);
        }

        if (eventForm.type === 'todo') {
            const updatedTodos = data.todos.map(t => 
                t.id === eventForm.id ? { 
                    ...t, 
                    text: eventForm.title, 
                    scheduled_date: newStart.toISOString(), 
                    duration_minutes: eventForm.isAllDay ? 1440 : eventForm.duration
                } : t
            );
            updateData({ ...data, todos: updatedTodos });
            setIsCreating(false);
            return;
        }

        if (!eventForm.id) {
            const groupId = eventForm.recurrence ? Date.now().toString() : null;
            const eventBase = { user_id: data.profile?.id, title: eventForm.title, color: eventForm.color, recurrence_group_id: groupId, recurrence_type: eventForm.recurrence ? 'weekly' : null, is_all_day: eventForm.isAllDay };
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

        if (eventForm.recurrenceGroupId) {
            setPendingUpdate({ newStart, newEnd, ...eventForm }); 
            setConfirmMode('ask_update'); setIsCreating(true); 
        } else {
            applyUpdate(eventForm.id, newStart, newEnd, eventForm, 'single');
        }
    };

    const applyUpdate = (targetId, startObj, endObj, formData, mode) => {
        let updatedEvents = [...eventsRef.current];
        if (mode === 'series' && formData.recurrenceGroupId) {
            const targetDayOfWeek = startObj.getDay();
            const targetHours = getHours(startObj);
            const targetMinutes = getMinutes(startObj);
            const targetDuration = formData.duration;
            updatedEvents = updatedEvents.map(ev => {
                if (ev.recurrence_group_id === formData.recurrenceGroupId) {
                    let evStart = parseISO(ev.start_time);
                    const currentDayOfWeek = evStart.getDay();
                    if (currentDayOfWeek !== targetDayOfWeek) {
                        const originalEvent = events.find(e => e.id === targetId);
                        if(originalEvent) {
                            const originalStart = parseISO(originalEvent.start_time);
                            const daysDelta = Math.round((startOfDay(startObj) - startOfDay(originalStart)) / (1000 * 60 * 60 * 24));
                            evStart = addDays(evStart, daysDelta);
                        }
                    }
                    let newEvStart = formData.isAllDay ? setMinutes(setHours(evStart, 0), 0) : setMinutes(setHours(evStart, targetHours), targetMinutes);
                    let newEvEnd = formData.isAllDay ? setMinutes(setHours(evStart, 23), 59) : addMinutes(newEvStart, targetDuration);
                    return { ...ev, title: formData.title, color: formData.color, start_time: newEvStart.toISOString(), end_time: newEvEnd.toISOString(), is_all_day: formData.isAllDay };
                }
                return ev;
            });
        } else {
            updatedEvents = updatedEvents.map(ev => ev.id === targetId ? {
                ...ev, title: formData.title, color: formData.color,
                start_time: startObj.toISOString(), end_time: endObj.toISOString(),
                recurrence_group_id: null, is_all_day: formData.isAllDay
            } : ev);
        }
        updateData({ ...data, calendar_events: updatedEvents });
        setConfirmMode(null); setPendingUpdate(null); setIsCreating(false);
    };

    const handleDeleteRequest = (evt) => {
        if (!evt) return;
        if (selectedEvent?.type === 'todo' || evt.scheduled_date) {
             if(window.confirm("Supprimer cette tâche définitivement ?")) {
                 const updatedTodos = data.todos.filter(t => t.id !== evt.id);
                 updateData({ ...data, todos: updatedTodos }, { table: 'todos', id: evt.id });
                 setSelectedEvent(null); setConfirmMode(null);
             }
             return;
        }
        if (evt.recurrence_group_id) { setSelectedEvent({type: 'event', data: evt}); setConfirmMode('ask_delete'); } 
        else { if(window.confirm("Supprimer cet événement ?")) performDelete(evt, false); }
    };

    const performDelete = (evt, series) => {
        if (!evt) { setConfirmMode(null); setSelectedEvent(null); return; }
        let updatedEvents = [...eventsRef.current];
        if (series && evt.recurrence_group_id) {
            updatedEvents = updatedEvents.filter(e => e.recurrence_group_id !== evt.recurrence_group_id);
            updateData({ ...data, calendar_events: updatedEvents }, { table: 'calendar_events', filter: { column: 'recurrence_group_id', value: evt.recurrence_group_id } });
        } else {
            updatedEvents = updatedEvents.filter(e => e.id !== evt.id);
            updateData({ ...data, calendar_events: updatedEvents }, { table: 'calendar_events', id: evt.id });
        }
        setSelectedEvent(null); setConfirmMode(null);
    };

    const handleClearAll = async () => {
        if(!window.confirm("ATTENTION : Cela va effacer TOUS les événements de l'agenda.\nÊtes-vous sûr ?")) return;
        updateData({ ...data, calendar_events: [] }, { table: 'calendar_events', filter: { column: 'user_id', value: data.profile?.id } });
    };

    const onDragStart = (e, item, type) => {
        if (resizeRef.current) { e.preventDefault(); return; }
        setDraggedItem({ type, data: item });
        e.dataTransfer.effectAllowed = "move";
        const img = new Image(); img.src = 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7';
        e.dataTransfer.setDragImage(img, 0, 0);
    };
    const onDragOver = (e) => { e.preventDefault(); };

    // --- DROP GRILLE (HEURES) ---
    const onDropGrid = (e, day) => {
        e.preventDefault();
        setPreviewSlot(null);
        if (!draggedItem || !previewSlot) return;
        
        const [h, m] = previewSlot.timeLabel.split(':').map(Number);
        const newStart = setMinutes(setHours(day, h), m);

        if (draggedItem.type === 'todo' || draggedItem.type === 'planned_todo') {
            // Drop sur la grille = PAS All Day (donc 60min par défaut)
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
                    date: format(newStart, 'yyyy-MM-dd'), startHour: h, startMin: m, recurrence: true, recurrenceWeeks: 12, type: 'event', isAllDay: false
                });
                setPendingUpdate({ newStart, newEnd, title: evt.title, color: evt.color, recurrenceGroupId: evt.recurrence_group_id, duration, isAllDay: false });
                setConfirmMode('ask_update'); setIsCreating(true);
            } else {
                const updatedEvents = eventsRef.current.map(ev => ev.id === evt.id ? { ...ev, start_time: newStart.toISOString(), end_time: newEnd.toISOString(), is_all_day: false } : ev);
                updateData({ ...data, calendar_events: updatedEvents });
            }
        }
        setDraggedItem(null);
    };

    // --- DROP TOUTE LA JOURNÉE ---
    const onDropAllDay = (e, day) => {
        e.preventDefault();
        if (!draggedItem) return;

        if (draggedItem.type === 'event') {
            const evt = draggedItem.data;
            const start = setMinutes(setHours(day, 0), 0);
            const end = setMinutes(setHours(day, 23), 59);
            if (evt.recurrence_group_id) {
                setEventForm({ id: evt.id, title: evt.title, color: evt.color, recurrenceGroupId: evt.recurrence_group_id, duration: 60, date: format(day, 'yyyy-MM-dd'), startHour: 9, startMin: 0, recurrence: true, recurrenceWeeks: 12, type: 'event', isAllDay: true });
                setPendingUpdate({ newStart: start, newEnd: end, title: evt.title, color: evt.color, recurrenceGroupId: evt.recurrence_group_id, duration: 60, isAllDay: true });
                setConfirmMode('ask_update'); setIsCreating(true);
            } else {
                const updatedEvents = eventsRef.current.map(ev => ev.id === evt.id ? { ...ev, start_time: start.toISOString(), end_time: end.toISOString(), is_all_day: true } : ev);
                updateData({ ...data, calendar_events: updatedEvents });
            }
        } 
        else if (draggedItem.type === 'todo' || draggedItem.type === 'planned_todo') {
            // Drop Todo en haut = 1440 min (Convention)
            const newStart = setMinutes(setHours(day, 9), 0);
            const updatedTodos = data.todos.map(t => t.id === draggedItem.data.id ? { ...t, scheduled_date: newStart.toISOString(), duration_minutes: 1440 } : t);
            updateData({ ...data, todos: updatedTodos });
        }
        setDraggedItem(null);
    };

    const updatePreviewSlot = (e, dayIndex) => {
        const rect = e.currentTarget.getBoundingClientRect();
        const y = e.clientY - rect.top;
        let hour = Math.floor(y / 60) + 6; if (hour < 6) hour = 6; if (hour > 23) hour = 23;
        let rawMinutes = Math.floor(y % 60); let snappedMinutes = Math.round(rawMinutes / 15) * 15;
        let duration = 60;
        if (draggedItem?.type === 'event') duration = differenceInMinutes(parseISO(draggedItem.data.end_time), parseISO(draggedItem.data.start_time));
        else if (draggedItem?.type === 'planned_todo') duration = draggedItem.data.duration_minutes || 60;
        setPreviewSlot({ dayIndex, top: (hour - 6) * 60 + snappedMinutes, height: Math.max(30, duration), timeLabel: `${hour}:${snappedMinutes.toString().padStart(2, '0')}` });
    };

    const unscheduleTodo = (todo) => {
        updateData({ ...data, todos: data.todos.map(t => t.id === todo.id ? { ...t, scheduled_date: null } : t) });
        setSelectedEvent(null);
    };

    const weekDays = Array.from({ length: 7 }).map((_, i) => addDays(currentWeekStart, i));
    const hours = Array.from({ length: 18 }).map((_, i) => i + 6);
    const currentTimeMin = getHours(new Date()) * 60 + getMinutes(new Date()) - (6 * 60);

    const durationOptions = [];
    for (let m = 15; m <= 720; m += 15) {
        const h = Math.floor(m / 60); const min = m % 60;
        let label = ''; if (h > 0) label += `${h}h`; if (min > 0) label += ` ${min}`; if (h === 0) label += ' min';
        durationOptions.push(<option key={m} value={m}>{label}</option>);
    }

    return (
        <div className="fade-in flex flex-col md:flex-row h-full w-full overflow-hidden bg-gray-50 dark:bg-slate-950 font-sans">
            {showSidebar && (
                <div className="w-full md:w-80 border-r border-gray-200 dark:border-slate-800 flex flex-col bg-white dark:bg-slate-900 z-20 shadow-xl shadow-slate-200/50 dark:shadow-none animate-in slide-in-from-left-5">
                    <div className="p-5 border-b border-gray-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex justify-between items-center">
                        <h2 className="font-bold text-slate-800 dark:text-white flex items-center gap-2 text-lg"><CheckCircle2 size={20} className="text-blue-600"/> Tâches</h2>
                        <button onClick={() => setShowSidebar(false)} className="p-1.5 hover:bg-gray-100 dark:hover:bg-slate-800 rounded-lg text-slate-400 hover:text-slate-600 transition-colors"><PanelLeftClose size={18} /></button>
                    </div>
                    <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar">
                        {backlogTodos.map(todo => (
                            <div key={todo.id} draggable onDragStart={(e) => onDragStart(e, todo, 'todo')} className="bg-white dark:bg-slate-800 p-4 rounded-xl border border-gray-200 dark:border-slate-700 shadow-sm hover:shadow-md hover:border-blue-400 cursor-grab active:cursor-grabbing transition-all group relative overflow-hidden">
                                <div className="absolute left-0 top-0 bottom-0 w-1 bg-gray-200 dark:bg-slate-700 group-hover:bg-blue-500 transition-colors"></div>
                                <div className="flex justify-between items-start pl-2"><span className="text-sm font-medium text-slate-700 dark:text-slate-200 line-clamp-2 leading-relaxed">{todo.text}</span><GripVertical size={16} className="text-slate-300 dark:text-slate-600 shrink-0"/></div>
                            </div>
                        ))}
                        {backlogTodos.length === 0 && <div className="text-center py-10 text-slate-400 italic text-sm">Rien à planifier !</div>}
                    </div>
                    <div className="p-4 border-t border-gray-200 dark:border-slate-800 bg-white dark:bg-slate-900 space-y-2">
                        <button onClick={() => openCreateModal()} className="w-full py-3 bg-slate-900 dark:bg-white text-white dark:text-black rounded-xl font-bold text-sm hover:shadow-lg transition-all flex items-center justify-center gap-2"><Plus size={18}/> Nouvel Événement</button>
                        <button onClick={handleClearAll} className="w-full py-2 bg-red-50 text-red-600 rounded-lg font-bold text-xs hover:bg-red-100 transition-colors flex items-center justify-center gap-2 border border-red-100"><RotateCcw size={14}/> Tout Effacer</button>
                    </div>
                </div>
            )}

            <div className="flex-1 p-4 md:p-6 overflow-hidden flex flex-col min-w-0 transition-all duration-300">
                <div className="flex-1 bg-white dark:bg-slate-900 rounded-3xl border border-gray-200 dark:border-slate-800 shadow-xl flex flex-col overflow-hidden relative">
                    <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-slate-800 bg-white/80 dark:bg-slate-900/80 backdrop-blur z-30 sticky top-0">
                        <div className="flex items-center gap-4 md:gap-6">
                            {!showSidebar && (<button onClick={() => setShowSidebar(true)} className="p-2 hover:bg-gray-100 dark:hover:bg-slate-800 rounded-lg text-slate-500 transition-colors" title="Ouvrir la liste des tâches"><PanelLeftOpen size={20} /></button>)}
                            <h2 className="text-xl md:text-2xl font-bold text-slate-800 dark:text-white capitalize font-serif tracking-tight flex items-center gap-2"><Calendar className="text-blue-500" size={24}/>{format(currentWeekStart, 'MMMM yyyy', { locale: fr })}</h2>
                            <div className="flex items-center bg-gray-100 dark:bg-slate-800 rounded-xl p-1 shadow-inner border border-gray-200 dark:border-slate-700">
                                <button onClick={handlePreviousWeek} className="p-1.5 hover:bg-white dark:hover:bg-slate-700 rounded-lg transition-all shadow-sm"><ChevronLeft size={18}/></button>
                                <button onClick={handleToday} className="px-4 text-xs font-bold text-slate-600 dark:text-slate-300 border-x border-transparent hover:border-gray-200 dark:hover:border-slate-600 mx-1">Aujourd'hui</button>
                                <button onClick={handleNextWeek} className="p-1.5 hover:bg-white dark:hover:bg-slate-700 rounded-lg transition-all shadow-sm"><ChevronRight size={18}/></button>
                            </div>
                        </div>
                    </div>

                    <div className="flex-1 overflow-y-auto relative custom-scrollbar select-none">
                        <div className="flex w-full h-full min-h-[1140px]">
                            
                            {/* COLONNE GAUCHE (Heures) */}
                            <div className="w-16 flex-shrink-0 border-r border-gray-200 dark:border-slate-800 bg-gray-50/50 dark:bg-slate-900 sticky left-0 z-20">
                                <div className="min-h-[5rem] border-b border-gray-200 dark:border-slate-800 flex flex-col justify-center items-center p-2 text-[10px] font-bold text-slate-400 bg-white dark:bg-slate-900 shadow-sm z-10">
                                    <span>TOUTE</span><span>LA JRN</span>
                                </div>
                                {hours.map(h => <div key={h} className="h-[60px] text-[11px] font-bold text-slate-400 text-right pr-3 pt-1 relative -top-2.5">{h}:00</div>)}
                                <div className="h-[60px] text-[11px] font-bold text-slate-400 text-right pr-3 pt-1 relative -top-2.5">00:00</div>
                            </div>

                            {/* GRILLE JOURS */}
                            <div className="flex-1 grid grid-cols-7 divide-x divide-gray-200 dark:divide-slate-800">
                                {weekDays.map((day, dayIndex) => {
                                    const isToday = isSameDay(day, new Date());
                                    const rawEvents = events.filter(e => isSameDay(parseISO(e.start_time), day)).map(e => ({ type: 'event', data: e, startStr: e.start_time, endStr: e.end_time }));
                                    const rawTodos = scheduledTodos.filter(t => isSameDay(parseISO(t.scheduled_date), day)).map(t => ({ type: 'todo', data: t, startStr: t.scheduled_date, endStr: addMinutes(parseISO(t.scheduled_date), t.duration_minutes || 60).toISOString() }));
                                    
                                    // LOGIQUE DE FILTRAGE STRICT
                                    const isItemAllDay = (item) => {
                                        if (item.type === 'event') return item.data.is_all_day === true;
                                        if (item.type === 'todo') return item.data.duration_minutes === 1440;
                                        return false;
                                    };

                                    const allDayItems = [...rawEvents, ...rawTodos].filter(item => isItemAllDay(item));
                                    const timedItems = [...rawEvents, ...rawTodos].filter(item => !isItemAllDay(item));
                                    
                                    const layoutItems = getLayoutForDay(timedItems);

                                    return (
                                        <div key={dayIndex} className="relative min-w-0 bg-white dark:bg-slate-900">
                                            
                                            {/* EN-TÊTE JOUR (Date) */}
                                            <div className={`h-14 flex flex-col items-center justify-center border-b border-gray-200 dark:border-slate-800 sticky top-0 bg-white/95 dark:bg-slate-900/95 backdrop-blur z-30 ${isToday ? 'bg-blue-50/80 dark:bg-blue-900/20' : ''}`}>
                                                <span className={`text-[10px] font-bold uppercase tracking-wider ${isToday ? 'text-blue-600' : 'text-slate-400'}`}>{format(day, 'EEE', { locale: fr })}</span>
                                                <span className={`text-lg font-bold mt-0.5 ${isToday ? 'bg-blue-600 text-white w-8 h-8 rounded-full flex items-center justify-center shadow-lg shadow-blue-500/30' : 'text-slate-800 dark:text-white'}`}>{format(day, 'd')}</span>
                                            </div>

                                            {/* ZONE "TOUTE LA JOURNÉE" */}
                                            <div 
                                                className={`min-h-[5rem] border-b border-gray-200 dark:border-slate-800 bg-gray-50/30 dark:bg-slate-800/20 p-2 flex flex-col gap-1.5 transition-colors ${draggedItem ? 'hover:bg-blue-50/50 dark:hover:bg-blue-900/20' : ''}`}
                                                onDragOver={(e) => e.preventDefault()}
                                                onDrop={(e) => onDropAllDay(e, day)}
                                            >
                                                {allDayItems.map(item => {
                                                    const isTodo = item.type === 'todo';
                                                    const colorClass = isTodo 
                                                        ? 'bg-orange-100 border-orange-200 text-orange-900 border-l-orange-500'
                                                        : item.data.color === 'green' ? 'bg-emerald-100 border-emerald-200 text-emerald-800 border-l-emerald-500' 
                                                        : item.data.color === 'gray' ? 'bg-slate-100 border-slate-200 text-slate-700 border-l-slate-500' 
                                                        : 'bg-blue-100 border-blue-200 text-blue-800 border-l-blue-500';

                                                    return (
                                                        <div 
                                                            key={item.data.id} 
                                                            draggable
                                                            onDragStart={(e) => onDragStart(e, item.data, isTodo ? 'planned_todo' : 'event')}
                                                            onClick={(e) => handleEventClick(e, item.data, item.type)} 
                                                            className={`text-[11px] font-bold px-3 py-1.5 rounded-lg border-l-4 shadow-sm truncate cursor-pointer hover:shadow-md hover:scale-[1.02] transition-all border border-transparent ${colorClass}`}
                                                        >
                                                            {isTodo ? item.data.text : item.data.title}
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                            
                                            {/* GRILLE HEURES */}
                                            <div 
                                                className={`relative h-[1140px] transition-colors ${draggedItem && previewSlot?.dayIndex !== dayIndex ? 'hover:bg-slate-50 dark:hover:bg-slate-800/50' : ''}`}
                                                onDragOver={(e) => { e.preventDefault(); updatePreviewSlot(e, dayIndex); }} 
                                                onDrop={(e) => onDropGrid(e, day)}
                                            >
                                                {Array.from({length: 19}).map((_, i) => <div key={i} className="absolute w-full border-t border-gray-100 dark:border-slate-800/60 h-[60px]" style={{ top: `${i*60}px` }}></div>)}
                                                {isToday && currentTimeMin > 0 && (<div className="absolute w-full border-t-2 border-red-500 z-10 pointer-events-none flex items-center" style={{ top: `${currentTimeMin}px` }}><div className="w-2 h-2 bg-red-500 rounded-full -ml-1"></div></div>)}
                                                {previewSlot && previewSlot.dayIndex === dayIndex && (<div className="absolute z-0 rounded-lg bg-blue-500/10 border-2 border-blue-500 border-dashed pointer-events-none flex items-center justify-center" style={{ top: `${previewSlot.top}px`, height: `${previewSlot.height}px`, left: '2px', right: '2px' }}><span className="text-xs font-bold text-blue-600 bg-white/80 px-2 py-1 rounded-md shadow-sm">{previewSlot.timeLabel}</span></div>)}
                                                
                                                {layoutItems.map((item) => {
                                                    const isTodo = item.type === 'todo';
                                                    const dataItem = item.data;
                                                    const isDraggingThis = draggedItem?.data?.id === dataItem.id;
                                                    const isRecurrent = !!dataItem.recurrence_group_id;
                                                    const isResizingAny = !!resizeRef.current;
                                                    const colorClass = isTodo ? 'bg-orange-50 border-orange-200 text-orange-900 dark:bg-orange-900/20 dark:border-orange-500 dark:text-orange-100 border-l-4 border-l-orange-500' : dataItem.color === 'green' ? 'bg-white border-l-4 border-l-emerald-500 shadow-sm border border-gray-200 dark:bg-slate-800 dark:border-slate-700 dark:border-l-emerald-500 text-emerald-900 dark:text-emerald-100' : dataItem.color === 'gray' ? 'bg-white border-l-4 border-l-slate-500 shadow-sm border border-gray-200 dark:bg-slate-800 dark:border-slate-700 dark:border-l-slate-500 text-slate-700 dark:text-slate-300' : 'bg-white border-l-4 border-l-blue-600 shadow-sm border border-gray-200 dark:bg-slate-800 dark:border-slate-700 dark:border-l-blue-600 text-blue-900 dark:text-blue-100';

                                                    return (
                                                        <div key={`${item.type}-${dataItem.id}`} style={{...item.style, opacity: isDraggingThis ? 0.5 : 1}} draggable={!isResizingAny} onDragStart={(e) => onDragStart(e, dataItem, isTodo ? 'planned_todo' : 'event')} onClick={(e) => handleEventClick(e, dataItem, item.type)} className={`absolute rounded-r-lg rounded-l-sm p-2 text-xs cursor-pointer hover:brightness-95 hover:z-30 transition-all z-10 overflow-hidden flex flex-col group/item select-none shadow-sm ${colorClass}`}>
                                                            <span className="font-bold truncate leading-tight text-[11px]">{isTodo ? dataItem.text : dataItem.title}</span>
                                                            <div className="flex items-center gap-1 mt-auto pt-1 opacity-80 mb-1"><span className="text-[10px] font-mono font-semibold">{format(parseISO(item.startStr), 'HH:mm')}</span>{isRecurrent && <Repeat size={10} />}</div>
                                                            {!isTodo && (<div className="absolute bottom-0 left-0 w-full h-3 cursor-s-resize hover:bg-black/5 dark:hover:bg-white/10 transition-colors z-50 flex items-center justify-center opacity-0 group-hover/item:opacity-100" onMouseDown={(e) => startResize(e, dataItem)}><div className="w-8 h-1 bg-black/20 dark:bg-white/30 rounded-full"></div></div>)}
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
            </div>

            {/* MODALS */}
            {isCreating && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
                    <div className="bg-white dark:bg-slate-800 p-8 rounded-2xl shadow-2xl w-full max-w-sm animate-in zoom-in-95 border border-slate-200 dark:border-slate-700">
                        {confirmMode === 'ask_update' ? (
                            <div className="text-center space-y-4">
                                <div className="w-12 h-12 bg-blue-100 text-blue-500 rounded-full flex items-center justify-center mx-auto mb-2"><Repeat size={24}/></div>
                                <h3 className="font-bold text-lg dark:text-white">Modifier la récurrence ?</h3>
                                <div className="grid gap-3">
                                    <button onClick={() => applyUpdate(eventForm.id, pendingUpdate.newStart, pendingUpdate.newEnd, pendingUpdate, 'single')} className="w-full py-3 border border-slate-200 rounded-xl font-bold text-sm hover:bg-slate-50 dark:text-white dark:border-slate-700 dark:hover:bg-slate-700">Juste celui-là (Détacher)</button>
                                    <button onClick={() => applyUpdate(eventForm.id, pendingUpdate.newStart, pendingUpdate.newEnd, pendingUpdate, 'series')} className="w-full py-3 bg-blue-600 text-white rounded-xl font-bold text-sm hover:bg-blue-700">Toute la série (Écraser)</button>
                                    <button onClick={() => { setConfirmMode(null); setIsCreating(false); }} className="text-xs text-slate-400 hover:underline mt-2">Annuler</button>
                                </div>
                            </div>
                        ) : (
                            <>
                                <h3 className="text-xl font-bold mb-6 text-slate-800 dark:text-white font-serif flex items-center gap-2">
                                    {eventForm.type === 'todo' ? <CheckCircle2 className="text-orange-500" /> : <Calendar className="text-blue-500"/>}
                                    {eventForm.id ? 'Modifier' : 'Planifier'}
                                </h3>
                                <div className="space-y-4">
                                    <div><label className="text-xs font-bold text-slate-500 uppercase tracking-wide">Titre</label><input autoFocus type="text" value={eventForm.title} onChange={e => setEventForm({...eventForm, title: e.target.value})} className="w-full mt-1.5 p-3 bg-slate-50 dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 outline-none focus:border-blue-500 dark:text-white" placeholder="Titre..." /></div>
                                    <div><label className="text-xs font-bold text-slate-500 uppercase tracking-wide">Date</label><input type="date" value={eventForm.date} onChange={e => setEventForm({...eventForm, date: e.target.value})} className="w-full mt-1.5 p-3 bg-slate-50 dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 text-sm dark:text-white outline-none"/></div>
                                    
                                    <div className="flex items-center gap-2 py-2">
                                        <input type="checkbox" id="allDay" checked={eventForm.isAllDay} onChange={e => setEventForm({...eventForm, isAllDay: e.target.checked})} className="w-5 h-5 text-blue-600 rounded focus:ring-blue-500"/>
                                        <label htmlFor="allDay" className="text-sm font-bold text-slate-700 dark:text-slate-300">Toute la journée</label>
                                    </div>

                                    {!eventForm.isAllDay && (
                                        <div className="grid grid-cols-2 gap-4">
                                            <div><label className="text-xs font-bold text-slate-500 uppercase tracking-wide">Heure</label><div className="flex gap-2"><select value={eventForm.startHour} onChange={e => setEventForm({...eventForm, startHour: parseInt(e.target.value)})} className="w-full mt-1.5 p-3 bg-slate-50 dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 text-sm dark:text-white outline-none">{Array.from({length: 19}).map((_, i) => <option key={i} value={i+6}>{i+6}h</option>)}</select><select value={eventForm.startMin} onChange={e => setEventForm({...eventForm, startMin: parseInt(e.target.value)})} className="w-full mt-1.5 p-3 bg-slate-50 dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 text-sm dark:text-white outline-none"><option value={0}>00</option><option value={15}>15</option><option value={30}>30</option><option value={45}>45</option></select></div></div>
                                            <div><label className="text-xs font-bold text-slate-500 uppercase tracking-wide">Durée</label><select value={eventForm.duration} onChange={e => setEventForm({...eventForm, duration: parseInt(e.target.value)})} className="w-full mt-1.5 p-3 bg-slate-50 dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 text-sm dark:text-white outline-none custom-scrollbar">{durationOptions}</select></div>
                                        </div>
                                    )}

                                    {eventForm.type !== 'todo' && !eventForm.id && (
                                        <div className="p-3 bg-slate-50 dark:bg-slate-900 rounded-xl border border-slate-100 dark:border-slate-700">
                                            <div className="flex items-center justify-between mb-2"><label className="flex items-center gap-2 cursor-pointer"><input type="checkbox" checked={eventForm.recurrence} onChange={e => setEventForm({...eventForm, recurrence: e.target.checked})} className="w-4 h-4 rounded text-blue-600"/><span className="text-sm font-bold text-slate-700 dark:text-slate-300">Répéter (Hebdo)</span></label></div>
                                            {eventForm.recurrence && (<div className="flex items-center gap-2 mt-2"><span className="text-xs text-slate-500">Pendant</span><input type="number" min="1" max="52" value={eventForm.recurrenceWeeks} onChange={e => setEventForm({...eventForm, recurrenceWeeks: e.target.value})} className="w-16 p-1 text-center bg-white dark:bg-slate-800 border rounded text-sm"/><span className="text-xs text-slate-500">semaines</span></div>)}
                                        </div>
                                    )}
                                    {eventForm.type !== 'todo' && (
                                        <div className="flex gap-3 pt-2">{['blue', 'green', 'gray'].map(c => (<button key={c} onClick={() => setEventForm({...eventForm, color: c})} className={`flex-1 h-8 rounded-lg border-2 transition-all ${eventForm.color === c ? 'border-slate-800 dark:border-white opacity-100' : 'border-transparent opacity-40'} ${c === 'blue' ? 'bg-blue-500' : c === 'green' ? 'bg-emerald-500' : 'bg-slate-500'}`}></button>))}</div>
                                    )}
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
                                <div className="mb-6 p-4 bg-slate-50 dark:bg-slate-900/50 rounded-xl border border-slate-100 dark:border-slate-800 flex gap-4 items-center"><div className="p-3 bg-white dark:bg-slate-800 rounded-lg shadow-sm text-blue-600"><Clock size={24}/></div><div><p className="text-xs font-bold text-slate-400 uppercase tracking-wide">Horaire</p><p className="text-sm font-medium text-slate-700 dark:text-slate-300">{selectedEvent.data.is_all_day || (selectedEvent.type === 'todo' && selectedEvent.data.duration_minutes === 1440) ? "Toute la journée" : format(parseISO(selectedEvent.data.start_time || selectedEvent.data.scheduled_date), 'EEEE d MMMM HH:mm', { locale: fr })}</p></div></div>
                                <div className="flex gap-3">
                                    <button onClick={() => openEditModal(selectedEvent.data, selectedEvent.type)} className="flex-1 py-3 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 rounded-xl font-bold text-sm hover:bg-slate-50 dark:hover:bg-slate-800 flex items-center justify-center gap-2"><Pencil size={16}/> Modifier</button>
                                    {selectedEvent.type === 'todo' ? (
                                        <>
                                            <button onClick={() => unscheduleTodo(selectedEvent.data)} className="flex-1 py-3 border-2 border-orange-100 text-orange-600 rounded-xl font-bold text-sm hover:bg-orange-50 transition-colors flex items-center justify-center gap-2"><ArrowLeftFromLine size={16}/> Retirer</button>
                                            <button onClick={() => handleDeleteRequest(selectedEvent.data)} className="flex-1 py-3 bg-red-50 text-red-600 rounded-xl font-bold text-sm hover:bg-red-100 flex items-center justify-center gap-2 transition-colors"><Trash2 size={18}/> Supprimer</button>
                                        </>
                                    ) : (
                                        <button onClick={() => handleDeleteRequest(selectedEvent.data)} className="flex-1 py-3 bg-red-50 text-red-600 rounded-xl font-bold text-sm hover:bg-red-100 flex items-center justify-center gap-2 transition-colors"><Trash2 size={18}/> Supprimer</button>
                                    )}
                                </div>
                            </>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}