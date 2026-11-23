import { useState, useEffect } from 'react';
import { 
  Settings, Moon, Sun, Upload, 
  RefreshCw, CheckCircle2, Building2, Image as ImageIcon, Trash2,
  Palette, LayoutDashboard
} from 'lucide-react';

export default function DataSettings({ data, loadExternalData, toggleTheme, darkMode }) {
    // --- ETATS LOCAUX ---
    // MODIFICATION 1 : 'Mon Espace' par défaut ici
    const [appName, setAppName] = useState(data.customLabels?.appName || 'Mon Espace');
    
    // Sécurisation : on s'assure qu'une couleur est toujours définie (défaut 'blue')
    const [grayShade, setGrayShade] = useState(data.settings?.grayShade || 'slate');

    // VISIBILITÉ SIDEBAR
    const [showClients, setShowClients] = useState(data.settings?.showClients ?? false);
    const [showGoals, setShowGoals] = useState(data.settings?.showGoals ?? false);
    const [showProjects, setShowProjects] = useState(data.settings?.showProjects ?? false);
    const [showHabits, setShowHabits] = useState(data.settings?.showHabits ?? false);
    
    const [showDashboard, setShowDashboard] = useState(data.settings?.showDashboard ?? true);
    const [showWorkspace, setShowWorkspace] = useState(data.settings?.showWorkspace ?? true);
    const [showChat, setShowChat] = useState(data.settings?.showChat ?? true);
    const [notificationsEnabled, setNotificationsEnabled] = useState(data.settings?.notifications_enabled ?? true);
    const [showPlanning, setShowPlanning] = useState(data.settings?.showPlanning ?? true);

    const [showBudget, setShowBudget] = useState(data.settings?.showBudget ?? true);
    const [showNotesSide, setShowNotesSide] = useState(data.settings?.showNotesSide ?? true);
    const [showJournal, setShowJournal] = useState(data.settings?.showJournal ?? true);
    const [showTodo, setShowTodo] = useState(data.settings?.showTodo ?? true);
    const [showGlobalSearch, setShowGlobalSearch] = useState(data.settings?.showGlobalSearch ?? true);

    // VISIBILITÉ DASHBOARD
    const [dcSolde, setDcSolde] = useState(data.settings?.dcSolde ?? true);
    const [dcOperations, setDcOperations] = useState(data.settings?.dcOperations ?? true);
    const [dcTimeline, setDcTimeline] = useState(data.settings?.dcTimeline ?? true);
    const [dcRoutines, setDcRoutines] = useState(data.settings?.dcRoutines ?? true);
    const [dcNotes, setDcNotes] = useState(data.settings?.dcNotes ?? true);
    const [dcProjets, setDcProjets] = useState(data.settings?.dcProjets ?? true);
    const [dcPriorites, setDcPriorites] = useState(data.settings?.dcPriorites ?? true);
    const [dcAgenda, setDcAgenda] = useState(data.settings?.dcAgenda ?? true);

    // On utilise des noms de variables génériques pour le formulaire
    const [companyData, setCompanyData] = useState({
        user_name: '', 
        company_name: '', 
        siret: '', 
        tva_number: '',
        address: '', 
        email: '', // On utilise 'email' ici pour l'affichage
        phone: '', // On utilise 'phone' ici pour l'affichage
        iban: '', 
        bic: '', 
        logo: ''
    });

    const [isSaved, setIsSaved] = useState(false);

    // --- SYNCHRONISATION INITIALE (Lecture Polyglotte) ---
    useEffect(() => {
        // MODIFICATION 2 : 'Mon Espace' par défaut ici aussi pour la synchro
        if (data.customLabels) setAppName(data.customLabels.appName || 'Mon Espace');
        if (data.settings) {
            setAccentColor(data.settings.accentColor || 'blue');
            setGrayShade(data.settings.grayShade || 'slate');
            setShowClients(data.settings.showClients ?? false);
            setShowGoals(data.settings.showGoals ?? false);
            setShowProjects(data.settings.showProjects ?? false);
            setShowHabits(data.settings.showHabits ?? false);
            
            setShowDashboard(data.settings.showDashboard ?? true);
            setShowWorkspace(data.settings.showWorkspace ?? true);
            setShowChat(data.settings.showChat ?? true);
            setNotificationsEnabled(data.settings.notifications_enabled ?? true);
            setShowPlanning(data.settings.showPlanning ?? true);

            setShowBudget(data.settings.showBudget ?? true);
            setShowNotesSide(data.settings.showNotesSide ?? true);
            setShowJournal(data.settings.showJournal ?? true);
            setShowTodo(data.settings.showTodo ?? true);
            setShowGlobalSearch(data.settings.showGlobalSearch ?? true);
            
            setDcSolde(data.settings.dcSolde ?? true);
            setDcOperations(data.settings.dcOperations ?? true);
            setDcTimeline(data.settings.dcTimeline ?? true);
            setDcRoutines(data.settings.dcRoutines ?? true);
            setDcNotes(data.settings.dcNotes ?? true);
            setDcProjets(data.settings.dcProjets ?? true);
            setDcPriorites(data.settings.dcPriorites ?? true);
            setDcAgenda(data.settings.dcAgenda ?? true);
        }
        
        if (data.profile) {
            // Ici, on est "intelligent" : on cherche la donnée peu importe comment elle est nommée
            // MODIFICATION 3 : Utilisation de ?? au lieu de || pour éviter le bug du "Zombie" (champ vide qui revient)
            setCompanyData({
                user_name: data.customLabels?.userName || '', 
                company_name: data.profile.company_name ?? data.profile.companyName ?? '',
                siret: data.profile.siret || '',
                tva_number: data.profile.tva_number || '',
                address: data.profile.address || '',
                // On utilise ?? pour que si email_contact est "" (vide), il le garde vide au lieu de chercher le suivant
                email: data.profile.email_contact ?? data.profile.email ?? '',
                // Idem pour le téléphone
                phone: data.profile.phone_contact ?? data.profile.phone ?? '',
                iban: data.profile.iban || '',
                bic: data.profile.bic || '',
                logo: data.profile.logo || ''
            });
        }
    }, [data]);

    const handleLogoUpload = (e) => {
        const file = e.target.files[0];
        if (file) {
            if (file.size > 500000) return alert("Max 500ko");
            const reader = new FileReader();
            reader.onloadend = () => setCompanyData(prev => ({ ...prev, logo: reader.result }));
            reader.readAsDataURL(file);
        }
    };

    const removeLogo = () => setCompanyData(prev => ({ ...prev, logo: '' }));

    // --- SAUVEGARDE (Écriture Polyglotte) ---
    const handleSaveProfile = () => {
        // SÉCURITÉ : On s'assure que les objets existent avec || {} pour éviter les crashs si data est incomplet
        const newSettings = {
            ...data,
            customLabels: { ...(data.customLabels || {}), appName, userName: companyData.user_name },
            settings: { 
                ...(data.settings || {}), 
                accentColor: 'mono',
                grayShade,
                showClients,
                showGoals,
                showProjects,
                showHabits,
                showDashboard,
                showWorkspace,
                showChat,
                notifications_enabled: notificationsEnabled,
                showPlanning,

                showBudget,
                showNotesSide,
                showJournal,
                showTodo,
                showGlobalSearch,
                dcSolde,
                dcOperations,
                dcTimeline,
                dcRoutines,
                dcNotes,
                dcProjets,
                dcPriorites,
                dcAgenda
            },
            profile: { 
                ...(data.profile || {}), 
                // 1. Format Base de Données (Snake Case) - Pour App.jsx et Supabase
                company_name: companyData.company_name,
                email_contact: companyData.email,
                phone_contact: companyData.phone,
                
                // 2. Format ClientHub (Camel Case / Simple) - Pour l'affichage immédiat
                companyName: companyData.company_name, // ClientHub cherche parfois ça
                name: companyData.company_name,        // Ou ça
                email: companyData.email,
                phone: companyData.phone,

                // Champs communs
                siret: companyData.siret,
                tva_number: companyData.tva_number,
                address: companyData.address,
                iban: companyData.iban,
                bic: companyData.bic,
                logo: companyData.logo
            }
        };
        
        loadExternalData(newSettings); 
        setIsSaved(true);
        setTimeout(() => setIsSaved(false), 2000);
    };

    const handleThemeChange = (theme) => {
        if ((theme === 'dark' && !darkMode) || (theme === 'light' && darkMode)) toggleTheme();
    };

    return (
        <div className="fade-in p-6 pb-24 md:pb-20 max-w-6xl mx-auto space-y-8">
            
            {/* EN-TÊTE */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className="p-3 bg-zinc-200 dark:bg-[#111113] border border-zinc-300 dark:border-zinc-800 rounded-xl">
                        <Settings size={22} className="text-zinc-900 dark:text-white" />
                    </div>
                    <div>
                        <h2 className="text-2xl font-bold text-zinc-900 dark:text-white">Paramètres</h2>
                        <p className="text-zinc-500 text-xs font-mono uppercase tracking-wider mt-0.5">Personnalisation & Identité</p>
                    </div>
                </div>
                
                <button onClick={handleSaveProfile} className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold transition-all ${isSaved ? 'bg-emerald-500 text-white' : 'bg-zinc-900 dark:bg-white text-white dark:text-[#09090b] hover:opacity-90'}`}>
                    {isSaved ? <CheckCircle2 size={16}/> : <RefreshCw size={16}/>} {isSaved ? 'Enregistré' : 'Sauvegarder'}
                </button>
            </div>

            {/* --- SECTION APPARENCE & THÈMES --- */}
            <div className="bg-white dark:bg-[#111113] rounded-2xl border border-zinc-200 dark:border-zinc-800 overflow-hidden">
                <div className="p-5 border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-[#09090b]">
                    <h3 className="font-bold text-base text-zinc-900 dark:text-white flex items-center gap-2">
                        <Palette size={18}/> Thèmes & Couleurs
                    </h3>
                </div>
                <div className="p-6 md:p-8 space-y-8">
                    
                    {/* Mode Clair / Sombre */}
                    <div className="flex flex-col md:flex-row justify-between items-center gap-4">
                        <div>
                            <h4 className="font-semibold text-zinc-900 dark:text-zinc-100 text-sm">Mode d'affichage</h4>
                            <p className="text-xs text-zinc-500">Choisissez l'ambiance générale de l'application.</p>
                        </div>
                        <div className="flex bg-zinc-100 dark:bg-[#09090b] border border-zinc-200 dark:border-zinc-800 p-1 rounded-xl">
                            <button onClick={() => handleThemeChange('light')} className={`flex items-center gap-2 px-4 py-1.5 rounded-lg text-xs font-semibold transition-all ${!darkMode ? 'bg-white shadow text-zinc-900' : 'text-zinc-500 hover:text-zinc-200'}`}>
                                <Sun size={14}/> Clair
                            </button>
                            <button onClick={() => handleThemeChange('dark')} className={`flex items-center gap-2 px-4 py-1.5 rounded-lg text-xs font-semibold transition-all ${darkMode ? 'bg-white text-[#09090b]' : 'text-zinc-500 hover:text-zinc-900'}`}>
                                <Moon size={14}/> Sombre
                            </button>
                        </div>
                    </div>

                    <hr className="border-zinc-200 dark:border-zinc-800"/>

                    {/* Nom de l'App */}
                    <div>
                        <label className="text-xs font-bold text-zinc-500 block mb-2">Nom de l'application (Barre latérale)</label>
                        <input type="text" value={appName} onChange={(e) => setAppName(e.target.value)} className="w-full max-w-md px-4 py-2 bg-slate-50 dark:bg-[#09090b] border border-slate-200 dark:border-zinc-800 rounded-lg outline-none dark:text-white text-sm" />
                    </div>

                    <hr className="border-slate-100 dark:border-zinc-800 my-6"/>

                    {/* Visibilité Barre Latérale */}
                    <div>
                        <div className="mb-4">
                            <h4 className="font-bold text-slate-700 dark:text-slate-200">Modules de la Barre Latérale</h4>
                            <p className="text-xs text-slate-500 dark:text-slate-400">Personnalisez votre espace en affichant ou masquant certains modules.</p>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {[
                                { label: 'Tableau de bord', desc: 'Vue principale', state: showDashboard, setter: setShowDashboard },
                                { label: 'Workspace', desc: 'Espaces de travail', state: showWorkspace, setter: setShowWorkspace },
                                { label: 'Messages', desc: 'Chat et discussions', state: showChat, setter: setShowChat },
                                { label: 'Notifications', desc: 'Activer les alertes', state: notificationsEnabled, setter: setNotificationsEnabled },
                                { label: 'Agenda', desc: 'Planning', state: showPlanning, setter: setShowPlanning },

                                { label: 'Mes Projets', desc: 'Gestion de projets', state: showProjects, setter: setShowProjects },
                                { label: 'Objectifs', desc: 'Suivi de vos objectifs', state: showGoals, setter: setShowGoals },
                                { label: 'Suivi Habitudes', desc: 'Créer et suivre vos habitudes', state: showHabits, setter: setShowHabits },
                                { label: 'Budget & Finance', desc: 'Trésorerie globale', state: showBudget, setter: setShowBudget },
                                { label: 'Gestion Client', desc: 'Factures, devis, catalogue', state: showClients, setter: setShowClients },
                                { label: 'Bloc-notes', desc: 'Prise de notes', state: showNotesSide, setter: setShowNotesSide },
                                { label: 'Carnet', desc: 'Journal', state: showJournal, setter: setShowJournal },
                                { label: 'Tâches Rapides', desc: 'To-Do list', state: showTodo, setter: setShowTodo },
                                { label: 'Recherche Globale', desc: 'Omnibar', state: showGlobalSearch, setter: setShowGlobalSearch }
                            ].map((mod, i) => (
                                <label key={i} className="flex items-center justify-between p-3 bg-slate-50 dark:bg-[#09090b] border border-slate-200 dark:border-zinc-800 rounded-xl cursor-pointer hover:border-indigo-500/30 transition-all">
                                    <div>
                                        <p className="text-sm font-bold text-slate-700 dark:text-slate-200">{mod.label}</p>
                                        <p className="text-xs text-slate-500">{mod.desc}</p>
                                    </div>
                                    <div className="relative inline-flex items-center">
                                        <input type="checkbox" checked={mod.state} onChange={(e) => mod.setter(e.target.checked)} className="sr-only peer" />
                                        <div className="w-11 h-6 bg-slate-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-green-500"></div>
                                    </div>
                                </label>
                            ))}
                        </div>
                    </div>
                </div>
            </div>

            {/* --- SECTION DASHBOARD CONFIG --- */}
            <div className="bg-white dark:bg-[#111113] rounded-2xl border border-zinc-200 dark:border-zinc-800 overflow-hidden mt-8">
                <div className="p-5 border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-[#09090b]">
                    <h3 className="font-bold text-base text-zinc-900 dark:text-white flex items-center gap-2">
                        <LayoutDashboard size={18}/> Configuration du Dashboard
                    </h3>
                </div>
                <div className="p-8">
                    <p className="text-sm text-slate-500 dark:text-slate-400 mb-6">Choisissez les modules que vous souhaitez afficher sur votre tableau de bord principal.</p>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {[
                            { label: "Trésorerie Globale", desc: "Solde et graphique d'évolution", state: dcSolde, setter: setDcSolde },
                            { label: "Opérations à venir", desc: "Transactions programmées", state: dcOperations, setter: setDcOperations },
                            { label: "Timeline (Calendrier)", desc: "Vue chronologique des événements", state: dcTimeline, setter: setDcTimeline },
                            { label: "Routines du jour", desc: "Habitudes quotidiennes", state: dcRoutines, setter: setDcRoutines },
                            { label: "Notes Épinglées", desc: "Vos mémos importants", state: dcNotes, setter: setDcNotes },
                            { label: "Projets Actifs", desc: "Suivi des projets en cours", state: dcProjets, setter: setDcProjets },
                            { label: "Agenda", desc: "Vos prochains rendez-vous", state: dcAgenda, setter: setDcAgenda },
                            { label: "Priorités", desc: "Tâches urgentes", state: dcPriorites, setter: setDcPriorites }
                        ].map((mod, i) => (
                            <label key={i} className="flex items-center justify-between p-4 bg-slate-50 dark:bg-[#09090b] border border-slate-200 dark:border-zinc-800 rounded-xl cursor-pointer hover:border-indigo-500/30 transition-all">
                                <div>
                                    <p className="text-sm font-bold text-slate-700 dark:text-slate-200">{mod.label}</p>
                                    <p className="text-xs text-slate-500">{mod.desc}</p>
                                </div>
                                <div className="relative inline-flex items-center">
                                    <input type="checkbox" checked={mod.state} onChange={(e) => mod.setter(e.target.checked)} className="sr-only peer" />
                                    <div className="w-11 h-6 bg-slate-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-zinc-900 dark:peer-checked:bg-white"></div>
                                </div>
                            </label>
                        ))}
                    </div>
                </div>
            </div>

            {/* --- SECTION ENTREPRISE --- */}
            <div className="bg-white dark:bg-[#111113] rounded-2xl border border-zinc-200 dark:border-zinc-800 overflow-hidden mt-8">
                <div className="p-5 border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-[#09090b]">
                    <h3 className="font-bold text-base text-zinc-900 dark:text-white flex items-center gap-2">
                        <Building2 size={18}/> Mon Entreprise
                    </h3>
                </div>
                
                <div className="p-8 grid grid-cols-1 lg:grid-cols-2 gap-12">
                    {/* COLONNE GAUCHE */}
                    <div className="space-y-6">
                        <h4 className="text-xs font-bold text-zinc-900 dark:text-white uppercase tracking-widest mb-4">Identité & Logo</h4>
                        <div className="p-4 border border-dashed border-slate-300 dark:border-zinc-700 rounded-xl bg-slate-50 dark:bg-[#09090b] flex items-center gap-6 relative group">
                            <div className="w-24 h-24 shrink-0 bg-slate-200 dark:bg-[#141416] rounded-lg flex items-center justify-center overflow-hidden border border-slate-300 dark:border-zinc-800 relative">
                                {companyData.logo ? <img src={companyData.logo} alt="Logo" className="w-full h-full object-contain" /> : <ImageIcon size={32} className="text-slate-400" />}
                                {companyData.logo && <button onClick={removeLogo} className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity text-white"><Trash2 size={20}/></button>}
                            </div>
                            <div className="flex-1">
                                <p className="font-bold text-slate-800 dark:text-white mb-1">Votre Logo</p>
                                <p className="text-xs text-slate-500 dark:text-slate-400 mb-3">Apparaîtra sur les factures.</p>
                                <label className="cursor-pointer bg-slate-800 dark:bg-zinc-800 hover:bg-slate-700 text-white px-4 py-2 rounded-lg text-xs font-bold transition-colors inline-flex items-center gap-2">
                                    <Upload size={14}/> Choisir
                                    <input type="file" accept="image/*" className="hidden" onChange={handleLogoUpload} />
                                </label>
                            </div>
                        </div>
                        <div className="space-y-4">
                            <div className="space-y-1"><label className="text-xs font-bold text-slate-500 dark:text-slate-400">Nom Complet (Vous)</label><input type="text" value={companyData.user_name} onChange={e => setCompanyData({...companyData, user_name: e.target.value})} className="w-full px-4 py-3 bg-slate-50 dark:bg-[#09090b] border border-slate-200 dark:border-zinc-800 rounded-lg outline-none focus:border-zinc-500 dark:text-white" placeholder="" /></div>
                            <div className="space-y-1"><label className="text-xs font-bold text-slate-500 dark:text-slate-400">Nom Entreprise</label><input type="text" value={companyData.company_name} onChange={e => setCompanyData({...companyData, company_name: e.target.value})} className="w-full px-4 py-3 bg-slate-50 dark:bg-[#09090b] border border-slate-200 dark:border-zinc-800 rounded-lg outline-none focus:border-zinc-500 dark:text-white" placeholder="" /></div>
                            <div className="space-y-1"><label className="text-xs font-bold text-slate-500 dark:text-slate-400">SIRET</label><input type="text" value={companyData.siret} onChange={e => setCompanyData({...companyData, siret: e.target.value})} className="w-full px-4 py-3 bg-slate-50 dark:bg-[#09090b] border border-slate-200 dark:border-zinc-800 rounded-lg outline-none focus:border-zinc-500 dark:text-white font-mono" /></div>
                            <div className="space-y-1"><label className="text-xs font-bold text-slate-500 dark:text-slate-400">N° TVA</label><input type="text" value={companyData.tva_number} onChange={e => setCompanyData({...companyData, tva_number: e.target.value})} className="w-full px-4 py-3 bg-slate-50 dark:bg-[#09090b] border border-slate-200 dark:border-zinc-800 rounded-lg outline-none focus:border-zinc-500 dark:text-white font-mono" /></div>
                        </div>
                    </div>

                    {/* COLONNE DROITE */}
                    <div className="space-y-6">
                        <h4 className="text-xs font-bold text-zinc-900 dark:text-white uppercase tracking-widest mb-4">Coordonnées</h4>
                        <div className="space-y-4">
                            <div className="space-y-1"><label className="text-xs font-bold text-slate-500 dark:text-slate-400">Adresse</label><textarea value={companyData.address} onChange={e => setCompanyData({...companyData, address: e.target.value})} className="w-full px-4 py-3 bg-slate-50 dark:bg-[#09090b] border border-slate-200 dark:border-zinc-800 rounded-lg outline-none focus:border-zinc-500 dark:text-white min-h-[100px] resize-none" /></div>
                            
                            {/* CORRECTION VARIABLES : on lie à 'email' et 'phone' */}
                            <div className="space-y-1"><label className="text-xs font-bold text-slate-500 dark:text-slate-400">Email</label><input type="email" value={companyData.email} onChange={e => setCompanyData({...companyData, email: e.target.value})} className="w-full px-4 py-3 bg-slate-50 dark:bg-[#09090b] border border-slate-200 dark:border-zinc-800 rounded-lg outline-none focus:border-zinc-500 dark:text-white" /></div>
                            <div className="space-y-1"><label className="text-xs font-bold text-slate-500 dark:text-slate-400">Téléphone</label><input type="text" value={companyData.phone} onChange={e => setCompanyData({...companyData, phone: e.target.value})} className="w-full px-4 py-3 bg-slate-50 dark:bg-[#09090b] border border-slate-200 dark:border-zinc-800 rounded-lg outline-none focus:border-zinc-500 dark:text-white" /></div>
                            
                            <hr className="border-slate-100 dark:border-zinc-800 my-6"/>
                            <div className="space-y-1"><label className="text-xs font-bold text-slate-500 dark:text-slate-400">IBAN</label><input type="text" value={companyData.iban} onChange={e => setCompanyData({...companyData, iban: e.target.value})} className="w-full px-4 py-3 bg-slate-50 dark:bg-[#09090b] border border-slate-200 dark:border-zinc-800 rounded-lg outline-none focus:border-zinc-500 dark:text-white font-mono" /></div>
                            <div className="space-y-1"><label className="text-xs font-bold text-slate-500 dark:text-slate-400">BIC</label><input type="text" value={companyData.bic} onChange={e => setCompanyData({...companyData, bic: e.target.value})} className="w-full px-4 py-3 bg-slate-50 dark:bg-[#09090b] border border-slate-200 dark:border-zinc-800 rounded-lg outline-none focus:border-zinc-500 dark:text-white font-mono" /></div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}