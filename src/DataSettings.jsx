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
    const [accentColor, setAccentColor] = useState(data.settings?.accentColor || 'blue');
    const [grayShade, setGrayShade] = useState(data.settings?.grayShade || 'slate');

    // VISIBILITÉ SIDEBAR
    const [showClients, setShowClients] = useState(data.settings?.showClients ?? false);
    const [showGoals, setShowGoals] = useState(data.settings?.showGoals ?? false);
    const [showProjects, setShowProjects] = useState(data.settings?.showProjects ?? false);
    const [showHabits, setShowHabits] = useState(data.settings?.showHabits ?? false);
    
    const [showDashboard, setShowDashboard] = useState(data.settings?.showDashboard ?? true);
    const [showWorkspace, setShowWorkspace] = useState(data.settings?.showWorkspace ?? true);
    const [showChat, setShowChat] = useState(data.settings?.showChat ?? true);
    const [showPlanning, setShowPlanning] = useState(data.settings?.showPlanning ?? true);
    const [showCalendar, setShowCalendar] = useState(data.settings?.showCalendar ?? true);
    const [showBudget, setShowBudget] = useState(data.settings?.showBudget ?? true);
    const [showNotesSide, setShowNotesSide] = useState(data.settings?.showNotesSide ?? true);
    const [showJournal, setShowJournal] = useState(data.settings?.showJournal ?? true);
    const [showTodo, setShowTodo] = useState(data.settings?.showTodo ?? true);

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
            setShowPlanning(data.settings.showPlanning ?? true);
            setShowCalendar(data.settings.showCalendar ?? true);
            setShowBudget(data.settings.showBudget ?? true);
            setShowNotesSide(data.settings.showNotesSide ?? true);
            setShowJournal(data.settings.showJournal ?? true);
            setShowTodo(data.settings.showTodo ?? true);
            
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
                accentColor,
                grayShade,
                showClients,
                showGoals,
                showProjects,
                showHabits,
                showDashboard,
                showWorkspace,
                showChat,
                showPlanning,
                showCalendar,
                showBudget,
                showNotesSide,
                showJournal,
                showTodo,
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

    // --- OPTIONS DE COULEURS (FIXÉES EN HEXADÉCIMAL) ---
    const accents = [
        { id: 'blue',    hex: '#2563eb', label: 'Océan' },
        { id: 'violet',  hex: '#7c3aed', label: 'Cosmic' },
        { id: 'emerald', hex: '#059669', label: 'Finance' },
        { id: 'amber',   hex: '#f59e0b', label: 'Energy' },
        { id: 'rose',    hex: '#e11d48', label: 'Passion' },
        { id: 'indigo',  hex: '#4f46e5', label: 'Royal' },
    ];

    return (
        <div className="fade-in p-6 pb-24 md:pb-20 max-w-6xl mx-auto space-y-8">
            
            {/* EN-TÊTE */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className="p-3 bg-slate-200 dark:bg-slate-700 rounded-xl">
                        <Settings size={24} className="text-slate-700 dark:text-white" />
                    </div>
                    <div>
                        <h2 className="text-2xl font-bold text-slate-800 dark:text-white">Paramètres</h2>
                        <p className="text-slate-500 dark:text-slate-400 text-sm">Personnalisation & Identité</p>
                    </div>
                </div>
                
                <button onClick={handleSaveProfile} className={`flex items-center gap-2 px-6 py-2 rounded-xl text-sm font-bold text-white transition-all shadow-md ${isSaved ? 'bg-green-500' : 'bg-blue-600 hover:bg-blue-700'}`}>
                    {isSaved ? <CheckCircle2 size={18}/> : <RefreshCw size={18}/>} {isSaved ? 'Enregistré' : 'Sauvegarder'}
                </button>
            </div>

            {/* --- SECTION APPARENCE & THÈMES --- */}
            <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-lg border border-slate-200 dark:border-slate-700 overflow-hidden">
                <div className="p-6 border-b border-slate-100 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/50">
                    <h3 className="font-bold text-lg text-slate-800 dark:text-white flex items-center gap-2">
                        <Palette size={20} className="text-purple-500"/> Thèmes & Couleurs
                    </h3>
                </div>
                <div className="p-8 space-y-8">
                    
                    {/* Mode Clair / Sombre */}
                    <div className="flex flex-col md:flex-row justify-between items-center gap-4">
                        <div>
                            <h4 className="font-bold text-slate-700 dark:text-slate-200">Mode d'affichage</h4>
                            <p className="text-xs text-slate-500 dark:text-slate-400">Choisissez l'ambiance générale de l'application.</p>
                        </div>
                        <div className="flex bg-slate-100 dark:bg-slate-900 p-1.5 rounded-xl">
                            <button onClick={() => handleThemeChange('light')} className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition-all ${!darkMode ? 'bg-white shadow text-slate-900' : 'text-slate-500 hover:text-slate-700'}`}>
                                <Sun size={16}/> Clair
                            </button>
                            <button onClick={() => handleThemeChange('dark')} className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition-all ${darkMode ? 'bg-slate-700 shadow text-white' : 'text-slate-500 hover:text-slate-700'}`}>
                                <Moon size={16}/> Sombre
                            </button>
                        </div>
                    </div>

                    <hr className="border-slate-100 dark:border-slate-700"/>

                    {/* Couleur d'Accentuation */}
                    <div>
                        <div className="mb-4">
                            <h4 className="font-bold text-slate-700 dark:text-slate-200">Couleur Principale</h4>
                            <p className="text-xs text-slate-500 dark:text-slate-400">Cette couleur s'appliquera aux boutons, graphiques et icônes actifs.</p>
                        </div>
                        <div className="flex flex-wrap gap-4">
                            {accents.map((acc) => (
                                <button 
                                    key={acc.id}
                                    onClick={() => setAccentColor(acc.id)}
                                    className={`
                                        group relative flex flex-col items-center gap-2 p-3 rounded-2xl border-2 transition-all w-24
                                        ${accentColor === acc.id 
                                            ? 'border-slate-800 dark:border-white bg-slate-50 dark:bg-slate-700' 
                                            : 'border-transparent hover:bg-slate-50 dark:hover:bg-slate-700/50'
                                        }
                                    `}
                                >
                                    {/* CORRECTION COULEUR : Style inline pour éviter l'override du thème */}
                                    <div 
                                        className={`w-8 h-8 rounded-full shadow-sm ${accentColor === acc.id ? 'scale-110 ring-2 ring-offset-2 ring-slate-300 dark:ring-slate-600' : ''}`}
                                        style={{ backgroundColor: acc.hex }}
                                    ></div>
                                    <span className={`text-xs font-medium ${accentColor === acc.id ? 'text-slate-900 dark:text-white' : 'text-slate-500'}`}>{acc.label}</span>
                                    {accentColor === acc.id && <div className="absolute top-2 right-2 text-green-500"><CheckCircle2 size={12}/></div>}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Nom de l'App */}
                    <div className="pt-4">
                        <label className="text-xs font-bold text-slate-500 block mb-2">Nom de l'application (Barre latérale)</label>
                        <input type="text" value={appName} onChange={(e) => setAppName(e.target.value)} className="w-full max-w-md px-4 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg outline-none dark:text-white text-sm" />
                    </div>

                    <hr className="border-slate-100 dark:border-slate-700 my-6"/>

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
                                { label: 'Agenda', desc: 'Planning', state: showPlanning, setter: setShowPlanning },
                                { label: 'Calendrier Financier', desc: 'Échéances et deadlines', state: showCalendar, setter: setShowCalendar },
                                { label: 'Mes Projets', desc: 'Gestion de projets', state: showProjects, setter: setShowProjects },
                                { label: 'Objectifs', desc: 'Suivi de vos objectifs', state: showGoals, setter: setShowGoals },
                                { label: 'Suivi Habitudes', desc: 'Créer et suivre vos habitudes', state: showHabits, setter: setShowHabits },
                                { label: 'Budget & Finance', desc: 'Trésorerie globale', state: showBudget, setter: setShowBudget },
                                { label: 'Gestion Client', desc: 'Factures, devis, catalogue', state: showClients, setter: setShowClients },
                                { label: 'Bloc-notes', desc: 'Prise de notes', state: showNotesSide, setter: setShowNotesSide },
                                { label: 'Carnet', desc: 'Journal', state: showJournal, setter: setShowJournal },
                                { label: 'Tâches Rapides', desc: 'To-Do list', state: showTodo, setter: setShowTodo }
                            ].map((mod, i) => (
                                <label key={i} className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl cursor-pointer hover:border-indigo-500/30 transition-all">
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
            <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-lg border border-slate-200 dark:border-slate-700 overflow-hidden mt-8">
                <div className="p-6 border-b border-slate-100 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/50">
                    <h3 className="font-bold text-lg text-slate-800 dark:text-white flex items-center gap-2">
                        <LayoutDashboard size={20} className="text-indigo-500"/> Configuration du Dashboard
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
                            <label key={i} className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl cursor-pointer hover:border-indigo-500/30 transition-all">
                                <div>
                                    <p className="text-sm font-bold text-slate-700 dark:text-slate-200">{mod.label}</p>
                                    <p className="text-xs text-slate-500">{mod.desc}</p>
                                </div>
                                <div className="relative inline-flex items-center">
                                    <input type="checkbox" checked={mod.state} onChange={(e) => mod.setter(e.target.checked)} className="sr-only peer" />
                                    <div className="w-11 h-6 bg-slate-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-500"></div>
                                </div>
                            </label>
                        ))}
                    </div>
                </div>
            </div>

            {/* --- SECTION ENTREPRISE --- */}
            <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-lg border border-slate-200 dark:border-slate-700 overflow-hidden mt-8">
                <div className="p-6 border-b border-slate-100 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/50">
                    <h3 className="font-bold text-lg text-slate-800 dark:text-white flex items-center gap-2">
                        <Building2 size={20} className="text-amber-500"/> Mon Entreprise
                    </h3>
                </div>
                
                <div className="p-8 grid grid-cols-1 lg:grid-cols-2 gap-12">
                    {/* COLONNE GAUCHE */}
                    <div className="space-y-6">
                        <h4 className="text-xs font-bold text-amber-500 uppercase tracking-widest mb-4">Identité & Logo</h4>
                        <div className="p-4 border border-dashed border-slate-300 dark:border-slate-600 rounded-xl bg-slate-50 dark:bg-slate-900/50 flex items-center gap-6 relative group">
                            <div className="w-24 h-24 shrink-0 bg-slate-200 dark:bg-slate-800 rounded-lg flex items-center justify-center overflow-hidden border border-slate-300 dark:border-slate-700 relative">
                                {companyData.logo ? <img src={companyData.logo} alt="Logo" className="w-full h-full object-contain" /> : <ImageIcon size={32} className="text-slate-400" />}
                                {companyData.logo && <button onClick={removeLogo} className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity text-white"><Trash2 size={20}/></button>}
                            </div>
                            <div className="flex-1">
                                <p className="font-bold text-slate-800 dark:text-white mb-1">Votre Logo</p>
                                <p className="text-xs text-slate-500 dark:text-slate-400 mb-3">Apparaîtra sur les factures.</p>
                                <label className="cursor-pointer bg-slate-800 dark:bg-slate-700 hover:bg-slate-700 text-white px-4 py-2 rounded-lg text-xs font-bold transition-colors inline-flex items-center gap-2">
                                    <Upload size={14}/> Choisir
                                    <input type="file" accept="image/*" className="hidden" onChange={handleLogoUpload} />
                                </label>
                            </div>
                        </div>
                        <div className="space-y-4">
                            <div className="space-y-1"><label className="text-xs font-bold text-slate-500 dark:text-slate-400">Nom Complet (Vous)</label><input type="text" value={companyData.user_name} onChange={e => setCompanyData({...companyData, user_name: e.target.value})} className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg outline-none focus:border-amber-500 dark:text-white" placeholder="" /></div>
                            <div className="space-y-1"><label className="text-xs font-bold text-slate-500 dark:text-slate-400">Nom Entreprise</label><input type="text" value={companyData.company_name} onChange={e => setCompanyData({...companyData, company_name: e.target.value})} className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg outline-none focus:border-amber-500 dark:text-white" placeholder="" /></div>
                            <div className="space-y-1"><label className="text-xs font-bold text-slate-500 dark:text-slate-400">SIRET</label><input type="text" value={companyData.siret} onChange={e => setCompanyData({...companyData, siret: e.target.value})} className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg outline-none focus:border-amber-500 dark:text-white font-mono" /></div>
                            <div className="space-y-1"><label className="text-xs font-bold text-slate-500 dark:text-slate-400">N° TVA</label><input type="text" value={companyData.tva_number} onChange={e => setCompanyData({...companyData, tva_number: e.target.value})} className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg outline-none focus:border-amber-500 dark:text-white font-mono" /></div>
                        </div>
                    </div>

                    {/* COLONNE DROITE */}
                    <div className="space-y-6">
                        <h4 className="text-xs font-bold text-amber-500 uppercase tracking-widest mb-4">Coordonnées</h4>
                        <div className="space-y-4">
                            <div className="space-y-1"><label className="text-xs font-bold text-slate-500 dark:text-slate-400">Adresse</label><textarea value={companyData.address} onChange={e => setCompanyData({...companyData, address: e.target.value})} className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg outline-none focus:border-amber-500 dark:text-white min-h-[100px] resize-none" /></div>
                            
                            {/* CORRECTION VARIABLES : on lie à 'email' et 'phone' */}
                            <div className="space-y-1"><label className="text-xs font-bold text-slate-500 dark:text-slate-400">Email</label><input type="email" value={companyData.email} onChange={e => setCompanyData({...companyData, email: e.target.value})} className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg outline-none focus:border-amber-500 dark:text-white" /></div>
                            <div className="space-y-1"><label className="text-xs font-bold text-slate-500 dark:text-slate-400">Téléphone</label><input type="text" value={companyData.phone} onChange={e => setCompanyData({...companyData, phone: e.target.value})} className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg outline-none focus:border-amber-500 dark:text-white" /></div>
                            
                            <hr className="border-slate-100 dark:border-slate-700 my-6"/>
                            <div className="space-y-1"><label className="text-xs font-bold text-slate-500 dark:text-slate-400">IBAN</label><input type="text" value={companyData.iban} onChange={e => setCompanyData({...companyData, iban: e.target.value})} className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg outline-none focus:border-amber-500 dark:text-white font-mono" /></div>
                            <div className="space-y-1"><label className="text-xs font-bold text-slate-500 dark:text-slate-400">BIC</label><input type="text" value={companyData.bic} onChange={e => setCompanyData({...companyData, bic: e.target.value})} className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg outline-none focus:border-amber-500 dark:text-white font-mono" /></div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}