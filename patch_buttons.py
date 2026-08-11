import re

with open('src/ProjectsManager.jsx', 'r', encoding='utf-8') as f:
    content = f.read()

# Locate the action capsule
target = r'''<div className="flex flex-wrap items-center gap-1 bg-white dark:bg-slate-800 p-1\.5 rounded-xl shadow-md border border-gray-100 dark:border-slate-700 ml-auto sm:ml-0 shrink-0">\s*\{/\* MODIF: Bouton Focus intégré ici \*/\}\s*<button'''

replacement = r'''<div className="flex flex-wrap items-center gap-1 bg-white dark:bg-slate-800 p-1.5 rounded-xl shadow-md border border-gray-100 dark:border-slate-700 ml-auto sm:ml-0 shrink-0"> 
                                        {/* SHARE OR LEAVE BUTTON */}
                                        {project.user_id && project.user_id !== data.profile?.id ? (
                                            <button 
                                                onClick={(e) => { e.stopPropagation(); handleLeaveProject(project.id); }} 
                                                className="text-gray-400 dark:text-gray-500 hover:text-red-500 p-2 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                                                title="Quitter le projet partagé"
                                            >
                                                <LogOut size={18} />
                                            </button>
                                        ) : (
                                            <button 
                                                onClick={(e) => { e.stopPropagation(); setSharingProject(project); }} 
                                                className="text-gray-400 dark:text-gray-500 hover:text-blue-500 p-2 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors relative"
                                                title="Partager"
                                            >
                                                <Share2 size={18} />
                                                {(data.project_shares?.filter(s => s.project_id === project.id).length > 0) && (
                                                    <span className="absolute top-1 right-1 w-2 h-2 bg-blue-500 rounded-full"></span>
                                                )}
                                            </button>
                                        )}
                                        <div className="w-px h-6 bg-gray-200 dark:bg-slate-700 mx-1"></div>
                                        {/* MODIF: Bouton Focus intégré ici */}
                                        <button'''

if re.search(target, content):
    content = re.sub(target, replacement, content)
    print("Capsule buttons injected!")
else:
    print("Could not find target for capsule buttons.")

with open('src/ProjectsManager.jsx', 'w', encoding='utf-8') as f:
    f.write(content)
