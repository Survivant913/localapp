import { X, Target, ChevronLeft, CheckCircle2, PartyPopper, AlertCircle, Calendar } from 'lucide-react';

export default function FocusProjectModal({ project, onClose, updateProject, accounts, availableForProjects, getAccountBalance }) {
    if (!project) return null;

    const formatCurrency = (val) => new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(val);

    const getNextStep = () => {
        if (!project.objectives) return null;
        for (let obj of project.objectives) {
            if (obj.subObjectives && obj.subObjectives.length > 0) {
                const nextSub = obj.subObjectives.find(s => !s.completed);
                if (nextSub) return { type: 'sub', objId: obj.id, item: nextSub, parentTitle: obj.title, siblings: obj.subObjectives };
            } else if (!obj.completed) {
                return { type: 'main', item: obj };
            }
        }
        return null;
    };

    const nextStep = getNextStep();

    const getUpcomingTasks = () => {
        if (!project.objectives) return [];
        let tasks = [];
        let foundCurrent = false;

        project.objectives.forEach(obj => {
            if (obj.completed) return;
            if (obj.subObjectives && obj.subObjectives.length > 0) {
                obj.subObjectives.forEach(sub => {
                    if (!sub.completed) {
                        if (!foundCurrent && nextStep && nextStep.item.id === sub.id) {
                            foundCurrent = true;
                        } else {
                            tasks.push({ id: sub.id, title: sub.title, parent: obj.title, type: 'sub' });
                        }
                    }
                });
            } else {
                if (!foundCurrent && nextStep && nextStep.item.id === obj.id) {
                    foundCurrent = true;
                } else {
                    tasks.push({ id: obj.id, title: obj.title, type: 'main' });
                }
            }
        });
        return tasks;
    };

    const upcomingTasks = getUpcomingTasks();

    const completeNextStep = () => {
        if (!nextStep) return;
        let updatedObjectives = [...project.objectives];
        if (nextStep.type === 'sub') {
            updatedObjectives = updatedObjectives.map(o => {
                if (o.id === nextStep.objId) {
                    return { ...o, subObjectives: o.subObjectives.map(s => s.id === nextStep.item.id ? { ...s, completed: true } : s) };
                }
                return o;
            });
        } else {
            updatedObjectives = updatedObjectives.map(o => o.id === nextStep.item.id ? { ...o, completed: true } : o);
        }

        const calculateProgress = (objectives) => {
            if (!objectives || objectives.length === 0) return 0;
            const totalProgress = objectives.reduce((acc, obj) => {
                if (!obj.subObjectives || obj.subObjectives.length === 0) return acc + (obj.completed ? 100 : 0);
                const completedSubs = obj.subObjectives.filter(sub => sub.completed).length;
                return acc + (completedSubs / obj.subObjectives.length) * 100;
            }, 0);
            return Math.round(totalProgress / objectives.length);
        };

        updateProject({ ...project, objectives: updatedObjectives, progress: calculateProgress(updatedObjectives) });
    };

    const financeInfo = project.cost > 0 ? (() => {
        const balance = project.linkedAccountId ? getAccountBalance(project.linkedAccountId) : availableForProjects;
        const safeBalance = Math.max(0, balance);
        const pct = Math.min(100, (safeBalance / project.cost) * 100);
        const missing = Math.max(0, project.cost - safeBalance);
        return { pct, missing, isFunded: safeBalance >= project.cost };
    })() : null;

    let currentChapterProgress = 0;
    if (nextStep && nextStep.siblings) {
        const done = nextStep.siblings.filter(s => s.completed).length;
        const total = nextStep.siblings.length;
        currentChapterProgress = Math.round((done / total) * 100);
    }

    return (
        <div className="fixed inset-0 z-[60] bg-slate-900/90 backdrop-blur-md flex items-center justify-center p-4 fade-in">
            <div className="bg-white dark:bg-slate-800 w-full max-w-5xl max-h-[90vh] rounded-3xl shadow-2xl overflow-hidden flex flex-col md:flex-row border border-gray-200 dark:border-slate-700">
                <div className="md:w-1/3 bg-gray-50 dark:bg-slate-900 p-8 flex flex-col justify-between border-r border-gray-100 dark:border-slate-700 relative overflow-hidden">
                    <div className="absolute top-0 right-0 p-12 opacity-5 pointer-events-none"><Target size={200} /></div>
                    <div>
                        <button onClick={onClose} className="mb-6 flex items-center gap-2 text-sm text-gray-500 hover:text-gray-800 dark:text-gray-400 dark:hover:text-white transition-colors">
                            <ChevronLeft size={16}/> Retour liste
                        </button>
                        <h2 className="text-3xl font-bold text-gray-800 dark:text-white mb-2 leading-tight">{project.title}</h2>
                        <p className="text-gray-500 dark:text-gray-400 text-sm mb-6 line-clamp-3">{project.description || "Aucune description"}</p>
                        
                        <div className="space-y-4">
                            <div className="bg-white dark:bg-slate-800 p-4 rounded-xl shadow-sm border border-gray-100 dark:border-slate-700">
                                <div className="flex justify-between items-end mb-2">
                                    <span className="text-xs font-bold uppercase text-gray-400 tracking-wider">Progression Globale</span>
                                    <span className="text-2xl font-bold text-blue-600 dark:text-blue-400">{Math.round(project.progress)}%</span>
                                </div>
                                <div className="h-2 bg-gray-100 dark:bg-slate-700 rounded-full overflow-hidden">
                                    <div className="h-full bg-blue-500 transition-all duration-500" style={{ width: `${project.progress}%` }}></div>
                                </div>
                            </div>

                            {financeInfo && (
                                <div className="bg-white dark:bg-slate-800 p-4 rounded-xl shadow-sm border border-gray-100 dark:border-slate-700">
                                    <div className="flex justify-between items-end mb-2">
                                        <span className="text-xs font-bold uppercase text-gray-400 tracking-wider">Budget</span>
                                        <span className={`text-xl font-bold ${financeInfo.isFunded ? 'text-green-500' : 'text-yellow-500'}`}>
                                            {financeInfo.isFunded ? 'OK' : `${Math.round(financeInfo.pct)}%`}
                                        </span>
                                    </div>
                                    <div className="h-2 bg-gray-100 dark:bg-slate-700 rounded-full overflow-hidden">
                                        <div className={`h-full transition-all duration-500 ${financeInfo.isFunded ? 'bg-green-500' : 'bg-yellow-500'}`} style={{ width: `${financeInfo.pct}%` }}></div>
                                    </div>
                                    {!financeInfo.isFunded && <p className="text-[10px] text-gray-400 mt-2 text-right">Manque {formatCurrency(financeInfo.missing)}</p>}
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="mt-8 pt-6 border-t border-gray-200 dark:border-slate-800">
                        <p className="text-xs font-bold text-gray-400 uppercase mb-2">Deadline</p>
                        <div className="flex items-center gap-2 text-gray-700 dark:text-gray-300 font-medium">
                            <Calendar size={18} className="text-orange-500"/>
                            {project.deadline ? new Date(project.deadline).toLocaleDateString('fr-FR', {weekday: 'long', day: 'numeric', month: 'long'}) : "Aucune date"}
                        </div>
                    </div>
                </div>

                <div className="md:w-2/3 p-8 flex flex-col relative bg-white dark:bg-slate-800">
                    <button onClick={onClose} className="absolute top-6 right-6 p-2 text-gray-400 hover:text-gray-800 dark:hover:text-white bg-gray-100 dark:bg-slate-700 rounded-full transition-all hover:rotate-90">
                        <X size={20}/>
                    </button>

                    <div className="flex-1 flex flex-col justify-center items-center text-center max-w-lg mx-auto w-full">
                        <div className="mb-4 px-4 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded-full text-xs font-bold uppercase tracking-widest animate-pulse">
                            Focus Mode Actif
                        </div>
                        
                        {nextStep ? (
                            <div className="w-full animate-in zoom-in-95 duration-300">
                                <div className="relative p-8 md:p-10 bg-white dark:bg-slate-700 rounded-3xl shadow-xl border-2 border-blue-100 dark:border-slate-600 mb-8 transform transition-all hover:scale-[1.01] duration-300 group">
                                    <div className="absolute top-4 right-6 text-6xl font-bold text-gray-100 dark:text-slate-600 opacity-50 select-none">1</div>
                                    <div className="relative z-10 text-left">
                                        {nextStep.parentTitle && (
                                            <div className="flex items-center gap-2 mb-3">
                                                <span className="text-xs font-bold text-indigo-500 uppercase tracking-wide bg-indigo-50 dark:bg-indigo-900/30 px-2 py-1 rounded">Chapitre en cours</span>
                                                <span className="text-sm text-gray-500 dark:text-gray-400 font-medium truncate">{nextStep.parentTitle}</span>
                                            </div>
                                        )}
                                        <h3 className="text-gray-400 dark:text-gray-500 font-medium text-sm mb-2 uppercase tracking-wide">Action immédiate</h3>
                                        <p className="text-2xl md:text-3xl font-bold text-gray-800 dark:text-white leading-snug mb-6">{nextStep.item.title}</p>
                                        {nextStep.type === 'sub' && (
                                            <div className="space-y-1">
                                                <div className="flex justify-between text-[10px] text-gray-400 font-bold uppercase">
                                                    <span>Progression du chapitre</span>
                                                    <span>{currentChapterProgress}%</span>
                                                </div>
                                                <div className="h-1.5 w-full bg-gray-100 dark:bg-slate-800 rounded-full overflow-hidden">
                                                    <div className="h-full bg-indigo-500 transition-all duration-500" style={{ width: `${currentChapterProgress}%` }}></div>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </div>
                                
                                <button onClick={completeNextStep} className="group relative inline-flex items-center justify-center gap-3 px-8 py-4 font-bold text-white transition-all duration-200 bg-blue-600 shadow-lg shadow-blue-600/30 text-lg rounded-xl hover:bg-blue-700 hover:shadow-blue-600/50 hover:-translate-y-1 w-full md:w-auto">
                                    <div className="bg-white/20 p-1 rounded-full"><CheckCircle2 size={24} className="group-hover:scale-110 transition-transform"/></div>
                                    <span>Terminer cette étape</span>
                                </button>
                            </div>
                        ) : (
                            <div className="text-center py-10">
                                <div className="inline-flex items-center justify-center w-24 h-24 bg-green-100 dark:bg-green-900/20 text-green-600 dark:text-green-400 rounded-full mb-6 animate-bounce">
                                    <PartyPopper size={48}/>
                                </div>
                                <h2 className="text-3xl font-bold text-gray-800 dark:text-white mb-2">Toutes les tâches achevées !</h2>
                                {financeInfo && !financeInfo.isFunded && (
                                    <div className="bg-orange-50 dark:bg-orange-900/20 p-4 rounded-xl border border-orange-100 dark:border-orange-800 inline-block text-left mt-4">
                                        <p className="text-orange-600 dark:text-orange-400 font-bold text-sm flex items-center gap-2 justify-center"><AlertCircle size={16}/> Attention : Budget incomplet</p>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                    
                    <div className="mt-auto pt-6 border-t border-gray-100 dark:border-slate-700">
                        <div className="flex justify-between items-end mb-3">
                            <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">File d'attente ({upcomingTasks.length})</p>
                        </div>
                        <div className="flex gap-3 overflow-x-auto pb-4 custom-scrollbar snap-x">
                            {upcomingTasks.slice(0, 6).map((task, idx) => (
                                <div key={task.id} className="snap-start flex-shrink-0 w-64 p-4 bg-gray-50 dark:bg-slate-700/30 rounded-xl border border-gray-200 dark:border-slate-600/50 relative overflow-hidden group hover:border-blue-300 transition-colors">
                                    <div className="absolute left-0 top-0 bottom-0 w-1 bg-gray-300 dark:bg-slate-600 group-hover:bg-blue-400 transition-colors"></div>
                                    <div className="flex items-center justify-between mb-1">
                                        <span className="bg-gray-200 dark:bg-slate-600 px-1.5 py-0.5 rounded text-[10px] font-bold text-gray-600 dark:text-gray-300">#{idx + 2}</span>
                                        {task.parent && <span className="text-[10px] text-indigo-500 font-medium truncate max-w-[120px]">{task.parent}</span>}
                                    </div>
                                    <p className="text-sm font-bold text-gray-700 dark:text-gray-200 line-clamp-2 leading-snug" title={task.title}>{task.title}</p>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}