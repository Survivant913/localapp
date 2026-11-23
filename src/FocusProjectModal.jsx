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
        <div className="fixed inset-0 z-[60] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 fade-in">
            <div className="bg-white dark:bg-[#111113] w-full max-w-5xl max-h-[90vh] rounded-2xl shadow-2xl overflow-hidden flex flex-col md:flex-row border border-zinc-200 dark:border-zinc-800">
                <div className="md:w-1/3 bg-zinc-50 dark:bg-[#09090b] p-7 flex flex-col justify-between border-r border-zinc-200 dark:border-zinc-800 relative overflow-hidden">
                    <div>
                        <button onClick={onClose} className="mb-6 flex items-center gap-2 text-xs font-mono text-zinc-500 hover:text-zinc-900 dark:hover:text-white transition-colors">
                            <ChevronLeft size={15}/> Retour liste
                        </button>
                        <h2 className="text-2xl font-bold text-zinc-900 dark:text-white mb-2 leading-tight">{project.title}</h2>
                        <p className="text-zinc-500 dark:text-zinc-400 text-sm mb-6 line-clamp-3">{project.description || "Aucune description"}</p>
                        
                        <div className="space-y-3">
                            <div className="bg-white dark:bg-[#111113] p-4 rounded-xl border border-zinc-200 dark:border-zinc-800">
                                <div className="flex justify-between items-end mb-2">
                                    <span className="text-[10px] font-mono uppercase text-zinc-500 tracking-wider">Progression Globale</span>
                                    <span className="text-xl font-mono font-bold text-zinc-900 dark:text-white">{Math.round(project.progress)}%</span>
                                </div>
                                <div className="h-1.5 bg-zinc-200 dark:bg-zinc-800 rounded-full overflow-hidden">
                                    <div className="h-full bg-zinc-900 dark:bg-white transition-all duration-500" style={{ width: `${project.progress}%` }}></div>
                                </div>
                            </div>

                            {financeInfo && (
                                <div className="bg-white dark:bg-[#111113] p-4 rounded-xl border border-zinc-200 dark:border-zinc-800">
                                    <div className="flex justify-between items-end mb-2">
                                        <span className="text-[10px] font-mono uppercase text-zinc-500 tracking-wider">Budget</span>
                                        <span className={`text-lg font-mono font-bold ${financeInfo.isFunded ? 'text-emerald-500' : 'text-zinc-900 dark:text-white'}`}>
                                            {financeInfo.isFunded ? 'OK' : `${Math.round(financeInfo.pct)}%`}
                                        </span>
                                    </div>
                                    <div className="h-1.5 bg-zinc-200 dark:bg-zinc-800 rounded-full overflow-hidden">
                                        <div className={`h-full transition-all duration-500 ${financeInfo.isFunded ? 'bg-emerald-500' : 'bg-zinc-500'}`} style={{ width: `${financeInfo.pct}%` }}></div>
                                    </div>
                                    {!financeInfo.isFunded && <p className="text-[10px] font-mono text-zinc-500 mt-2 text-right">Manque {formatCurrency(financeInfo.missing)}</p>}
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="mt-8 pt-5 border-t border-zinc-200 dark:border-zinc-800">
                        <p className="text-[10px] font-mono text-zinc-500 uppercase mb-1.5">Deadline</p>
                        <div className="flex items-center gap-2 text-zinc-800 dark:text-zinc-200 font-medium text-sm">
                            <Calendar size={16} className="text-zinc-500"/>
                            {project.deadline ? new Date(project.deadline).toLocaleDateString('fr-FR', {weekday: 'long', day: 'numeric', month: 'long'}) : "Aucune date"}
                        </div>
                    </div>
                </div>

                <div className="md:w-2/3 p-7 flex flex-col relative bg-white dark:bg-[#111113]">
                    <button onClick={onClose} className="absolute top-6 right-6 p-2 text-zinc-400 hover:text-zinc-900 dark:hover:text-white bg-zinc-100 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg transition-all">
                        <X size={18}/>
                    </button>

                    <div className="flex-1 flex flex-col justify-center items-center text-center max-w-lg mx-auto w-full">
                        <div className="mb-4 px-3 py-1 bg-zinc-100 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-zinc-900 dark:text-white rounded-full text-[10px] font-mono font-bold uppercase tracking-widest">
                            Focus Mode Actif
                        </div>
                        
                        {nextStep ? (
                            <div className="w-full animate-in zoom-in-95 duration-200">
                                <div className="relative p-7 md:p-8 bg-zinc-50 dark:bg-[#09090b] rounded-2xl border border-zinc-200 dark:border-zinc-800 mb-6 group">
                                    <div className="absolute top-4 right-6 text-5xl font-mono font-bold text-zinc-200 dark:text-zinc-800 select-none">1</div>
                                    <div className="relative z-10 text-left">
                                        {nextStep.parentTitle && (
                                            <div className="flex items-center gap-2 mb-3">
                                                <span className="text-[10px] font-mono font-bold text-zinc-900 dark:text-white uppercase tracking-wide bg-zinc-200 dark:bg-zinc-800 px-2 py-0.5 rounded">Chapitre en cours</span>
                                                <span className="text-xs text-zinc-500 font-medium truncate">{nextStep.parentTitle}</span>
                                            </div>
                                        )}
                                        <h3 className="text-zinc-500 font-mono text-xs mb-1.5 uppercase tracking-wide">Action immédiate</h3>
                                        <p className="text-xl md:text-2xl font-bold text-zinc-900 dark:text-white leading-snug mb-5">{nextStep.item.title}</p>
                                        {nextStep.type === 'sub' && (
                                            <div className="space-y-1.5">
                                                <div className="flex justify-between text-[10px] font-mono text-zinc-500 uppercase">
                                                    <span>Progression du chapitre</span>
                                                    <span>{currentChapterProgress}%</span>
                                                </div>
                                                <div className="h-1.5 w-full bg-zinc-200 dark:bg-zinc-800 rounded-full overflow-hidden">
                                                    <div className="h-full bg-zinc-900 dark:bg-white transition-all duration-500" style={{ width: `${currentChapterProgress}%` }}></div>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </div>
                                
                                <button onClick={completeNextStep} className="group relative inline-flex items-center justify-center gap-3 px-7 py-3.5 font-semibold text-white dark:text-[#09090b] transition-all duration-150 bg-zinc-900 dark:bg-white text-sm rounded-xl hover:opacity-90 w-full md:w-auto">
                                    <CheckCircle2 size={18}/>
                                    <span>Terminer cette étape</span>
                                </button>
                            </div>
                        ) : (
                            <div className="text-center py-10">
                                <div className="inline-flex items-center justify-center w-20 h-20 bg-zinc-100 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-zinc-900 dark:text-white rounded-full mb-5">
                                    <PartyPopper size={36}/>
                                </div>
                                <h2 className="text-2xl font-bold text-zinc-900 dark:text-white mb-2">Toutes les tâches achevées !</h2>
                                {financeInfo && !financeInfo.isFunded && (
                                    <div className="bg-amber-500/10 p-3.5 rounded-xl border border-amber-500/20 inline-block text-left mt-3">
                                        <p className="text-amber-500 font-semibold text-xs flex items-center gap-2 justify-center"><AlertCircle size={15}/> Attention : Budget incomplet</p>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                    
                    <div className="mt-auto pt-5 border-t border-zinc-200 dark:border-zinc-800">
                        <div className="flex justify-between items-end mb-3">
                            <p className="text-[10px] font-mono text-zinc-500 uppercase tracking-wider">File d'attente ({upcomingTasks.length})</p>
                        </div>
                        <div className="flex gap-3 overflow-x-auto pb-2 custom-scrollbar snap-x">
                            {upcomingTasks.slice(0, 6).map((task, idx) => (
                                <div key={task.id} className="snap-start flex-shrink-0 w-60 p-3.5 bg-zinc-50 dark:bg-[#09090b] rounded-xl border border-zinc-200 dark:border-zinc-800 relative overflow-hidden group hover:border-zinc-400 dark:hover:border-zinc-600 transition-colors">
                                    <div className="flex items-center justify-between mb-1">
                                        <span className="bg-zinc-200 dark:bg-zinc-800 px-1.5 py-0.5 rounded text-[10px] font-mono font-bold text-zinc-700 dark:text-zinc-300">#{idx + 2}</span>
                                        {task.parent && <span className="text-[10px] text-zinc-500 font-medium truncate max-w-[120px]">{task.parent}</span>}
                                    </div>
                                    <p className="text-sm font-semibold text-zinc-800 dark:text-zinc-200 line-clamp-2 leading-snug" title={task.title}>{task.title}</p>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}