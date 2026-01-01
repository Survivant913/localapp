import { useState, useEffect } from 'react';
import { supabase } from './supabaseClient'; // Nécessaire pour le nettoyage
import { 
  Settings, Moon, Sun, Type, Download, Upload, 
  RefreshCw, CheckCircle2, AlertTriangle, User, Loader2,
  Building2, Wallet // Nouvelles icônes pour la section entreprise
} from 'lucide-react';

export default function DataSettings({ data, loadExternalData, toggleTheme, darkMode }) {
    // --- ETATS LOCAUX ---
    const [appName, setAppName] = useState(data.customLabels?.appName || 'LocalApp');
    const [userName, setUserName] = useState(data.customLabels?.userName || 'Utilisateur');
    
    // NOUVEAU : Champs Entreprise (Synchronisés avec le profil)
    const [companyData, setCompanyData] = useState({
        company_name: '', siret: '', address: '', email_contact: '', phone_contact: '',
        iban: '', bic: '', tva_number: ''
    });

    const [isSaved, setIsSaved] = useState(false);
    
    // Pour l'import de fichier
    const [importStatus, setImportStatus] = useState(null); // 'success', 'error', 'loading', null

    // Synchronisation initiale
    useEffect(() => {
        if (data.customLabels) {
            setAppName(data.customLabels.appName || 'LocalApp');
            setUserName(data.customLabels.userName || 'Utilisateur');
        }
        // Chargement des données entreprise depuis le profil
        if (data.profile) {
            setCompanyData({
                company_name: data.profile.company_name || '',
                siret: data.profile.siret || '',
                address: data.profile.address || '',
                email_contact: data.profile.email_contact || '',
                phone_contact: data.profile.phone_contact || '',
                iban: data.profile.iban || '',
                bic: data.profile.bic || '',
                tva_number: data.profile.tva_number || ''
            });
        }
    }, [data.customLabels, data.profile]);

    // --- ACTIONS ---

    // 1. Sauvegarder TOUT (Textes + Profil Entreprise)
    const handleSaveProfile = () => {
        const newSettings = {
            ...data,
            customLabels: { ...data.customLabels, appName, userName },
            profile: { ...data.profile, ...companyData } // On sauvegarde les infos entreprise
        };
        loadExternalData(newSettings); 
        
        setIsSaved(true);
        setTimeout(() => setIsSaved(false), 2000);
    };

    // 2. Changer le Thème
    const handleThemeChange = (theme) => {
        if ((theme === 'dark' && !darkMode) || (theme === 'light' && darkMode)) {
            toggleTheme();
        }
    };

    // 3. EXPORT (Télécharger JSON)
    const handleExport = () => {
        const cleanData = JSON.parse(JSON.stringify(data));
        const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(cleanData, null, 2));
        const downloadAnchorNode = document.createElement('a');
        downloadAnchorNode.setAttribute("href", dataStr);
        const date = new Date().toISOString().split('T')[0];
        downloadAnchorNode.setAttribute("download", `backup_localapp_${date}.json`);
        document.body.appendChild(downloadAnchorNode);
        downloadAnchorNode.click();
        downloadAnchorNode.remove();
    };

    // 4. IMPORT INTELLIGENT (Nettoyage + Import)
    const handleImport = async (event) => {
        const fileReader = new FileReader();
        const file = event.target.files[0];

        if (!file) return;

        fileReader.readAsText(file, "UTF-8");
        fileReader.onload = async (e) => {
            try {
                const parsedData = JSON.parse(e.target.result);
                
                // Vérification de structure (On vérifie budget OU clients pour être souple)
                if (parsedData.budget || parsedData.clients) {
                    if (window.confirm("ATTENTION : Cette action va EFFACER toutes les données actuelles pour les remplacer par celles du fichier. Continuer ?")) {
                        setImportStatus('loading');
                        
                        // 1. NETTOYAGE (Grand ménage via Supabase)
                        const { data: { user } } = await supabase.auth.getUser();
                        if (user) {
                            await Promise.all([
                                supabase.from('transactions').delete().eq('user_id', user.id),
                                supabase.from('recurring').delete().eq('user_id', user.id),
                                supabase.from('scheduled').delete().eq('user_id', user.id),
                                supabase.from('planner_items').delete().eq('user_id', user.id),
                                supabase.from('projects').delete().eq('user_id', user.id),
                                supabase.from('notes').delete().eq('user_id', user.id),
                                supabase.from('todos').delete().eq('user_id', user.id),
                                supabase.from('accounts').delete().eq('user_id', user.id),
                                supabase.from('safety_bases').delete().eq('user_id', user.id),
                                supabase.from('clients').delete().eq('user_id', user.id) // Ajouté pour le CRM
                            ]);
                        }

                        // 2. INJECTION DES NOUVELLES DONNÉES
                        setTimeout(() => {
                            loadExternalData(parsedData); 
                            setImportStatus('success');
                            setTimeout(() => setImportStatus(null), 3000);
                            alert("Restauration terminée avec succès !");
                        }, 1500);
                    }
                } else {
                    alert("Format de fichier invalide (structure JSON incorrecte).");
                    setImportStatus('error');
                }
            } catch (error) {
                console.error("Erreur Import:", error);
                setImportStatus('error');
                alert("Erreur lors de la lecture du fichier.");
            }
        };
        // Reset de l'input
        event.target.value = null;
    };

    return (
        <div className="fade-in p-6 pb-24 md:pb-20 max-w-4xl mx-auto space-y-8">
            
            {/* EN-TÊTE */}
            <div className="flex items-center gap-3 mb-2">
                <div className="p-3 bg-slate-200 dark:bg-slate-700 rounded-xl">
                    <Settings size={24} className="text-slate-700 dark:text-white" />
                </div>
                <div>
                    <h2 className="text-2xl font-bold text-slate-800 dark:text-white">Paramètres</h2>
                    <p className="text-slate-500 dark:text-slate-400 text-sm">Mon Entreprise & Données</p>
                </div>
            </div>

            {/* 1. MON ENTREPRISE (NOUVELLE SECTION) */}
            <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden">
                <div className="p-6 border-b border-slate-100 dark:border-slate-700">
                    <h3 className="font-bold text-lg text-slate-800 dark:text-white flex items-center gap-2">
                        <Building2 size={18} className="text-blue-500"/> Mon Entreprise
                    </h3>
                </div>
                <div className="p-6 space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-1">
                            <label className="text-xs font-bold text-slate-500 uppercase">Nom Commercial</label>
                            <input type="text" value={companyData.company_name} onChange={e => setCompanyData({...companyData, company_name: e.target.value})} className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:border-blue-500 dark:text-white transition-colors" placeholder="Ma Société" />
                        </div>
                        <div className="space-y-1">
                            <label className="text-xs font-bold text-slate-500 uppercase">SIRET</label>
                            <input type="text" value={companyData.siret} onChange={e => setCompanyData({...companyData, siret: e.target.value})} className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:border-blue-500 dark:text-white transition-colors" placeholder="123 456 789 00012" />
                        </div>
                        <div className="space-y-1 md:col-span-2">
                            <label className="text-xs font-bold text-slate-500 uppercase">Adresse de facturation</label>
                            <input type="text" value={companyData.address} onChange={e => setCompanyData({...companyData, address: e.target.value})} className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:border-blue-500 dark:text-white transition-colors" placeholder="10 Rue de la Paix, 75000 Paris" />
                        </div>
                        <div className="space-y-1">
                            <label className="text-xs font-bold text-slate-500 uppercase">Email Contact</label>
                            <input type="email" value={companyData.email_contact} onChange={e => setCompanyData({...companyData, email_contact: e.target.value})} className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:border-blue-500 dark:text-white transition-colors" />
                        </div>
                        <div className="space-y-1">
                            <label className="text-xs font-bold text-slate-500 uppercase">Téléphone</label>
                            <input type="tel" value={companyData.phone_contact} onChange={e => setCompanyData({...companyData, phone_contact: e.target.value})} className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:border-blue-500 dark:text-white transition-colors" />
                        </div>
                    </div>

                    <hr className="border-slate-100 dark:border-slate-700"/>
                    <h4 className="font-bold text-sm text-slate-800 dark:text-white flex items-center gap-2"><Wallet size={16} className="text-green-500"/> Coordonnées Bancaires</h4>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-1">
                            <label className="text-xs font-bold text-slate-500 uppercase">IBAN</label>
                            <input type="text" value={companyData.iban} onChange={e => setCompanyData({...companyData, iban: e.target.value})} className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:border-blue-500 dark:text-white font-mono" placeholder="FR76 ..." />
                        </div>
                        <div className="space-y-1">
                            <label className="text-xs font-bold text-slate-500 uppercase">BIC</label>
                            <input type="text" value={companyData.bic} onChange={e => setCompanyData({...companyData, bic: e.target.value})} className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:border-blue-500 dark:text-white font-mono" />
                        </div>
                        <div className="space-y-1">
                            <label className="text-xs font-bold text-slate-500 uppercase">N° TVA Intracommunautaire</label>
                            <input type="text" value={companyData.tva_number} onChange={e => setCompanyData({...companyData, tva_number: e.target.value})} className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:border-blue-500 dark:text-white transition-colors" />
                        </div>
                    </div>
                </div>
            </div>

            {/* 2. PERSONNALISATION APP */}
            <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden">
                <div className="p-6 border-b border-slate-100 dark:border-slate-700">
                    <h3 className="font-bold text-lg text-slate-800 dark:text-white flex items-center gap-2">
                        <Type size={18} className="text-purple-500"/> Apparence & Textes
                    </h3>
                </div>
                
                <div className="p-6 space-y-6">
                    {/* Thème */}
                    <div className="flex items-center justify-between">
                        <span className="text-sm font-medium text-slate-700 dark:text-slate-300">Thème de l'interface</span>
                        <div className="flex bg-slate-100 dark:bg-slate-900 p-1 rounded-lg border border-slate-200 dark:border-slate-700">
                            <button 
                                onClick={() => handleThemeChange('light')} 
                                className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium transition-all ${!darkMode ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                            >
                                <Sun size={14}/> Clair
                            </button>
                            <button 
                                onClick={() => handleThemeChange('dark')} 
                                className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium transition-all ${darkMode ? 'bg-slate-700 text-white shadow-sm' : 'text-slate-500 hover:text-slate-300'}`}
                            >
                                <Moon size={14}/> Sombre
                            </button>
                        </div>
                    </div>

                    <hr className="border-slate-100 dark:border-slate-700"/>

                    {/* Champs Textes */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-2">
                            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1">
                                <Settings size={12}/> Nom de l'application
                            </label>
                            <input 
                                type="text" 
                                value={appName} 
                                onChange={(e) => setAppName(e.target.value)} 
                                className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:border-blue-500 dark:text-white transition-colors"
                                placeholder="LocalApp"
                            />
                            <p className="text-[10px] text-slate-400">S'affiche en haut du menu latéral.</p>
                        </div>

                        <div className="space-y-2">
                            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1">
                                <User size={12}/> Nom d'utilisateur
                            </label>
                            <input 
                                type="text" 
                                value={userName} 
                                onChange={(e) => setUserName(e.target.value)} 
                                className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:border-blue-500 dark:text-white transition-colors"
                                placeholder="Votre prénom"
                            />
                            <p className="text-[10px] text-slate-400">Pour le message d'accueil "Bonjour, ..."</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* BOUTON SAUVEGARDER FLOTTANT ou FIXE */}
            <div className="flex justify-end sticky bottom-6 z-20">
                <button 
                    onClick={handleSaveProfile} 
                    className={`flex items-center gap-2 px-8 py-3 rounded-xl text-sm font-bold text-white transition-all shadow-xl ${isSaved ? 'bg-green-500' : 'bg-blue-600 hover:bg-blue-700'}`}
                >
                    {isSaved ? <CheckCircle2 size={18}/> : <RefreshCw size={18}/>}
                    {isSaved ? 'Enregistré !' : 'Enregistrer les modifications'}
                </button>
            </div>

            {/* 3. GESTION DES DONNÉES (IMPORT/EXPORT) */}
            <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden">
                <div className="p-6 border-b border-slate-100 dark:border-slate-700">
                    <h3 className="font-bold text-lg text-slate-800 dark:text-white flex items-center gap-2">
                        <Download size={18} className="text-green-500"/> Gestion des Données
                    </h3>
                </div>

                <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-8">
                    
                    {/* EXPORT */}
                    <div className="space-y-4">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400 rounded-lg">
                                <Download size={20}/>
                            </div>
                            <div>
                                <h4 className="font-bold text-slate-800 dark:text-white text-sm">Sauvegarde manuelle</h4>
                                <p className="text-xs text-slate-500 dark:text-slate-400">Télécharger une copie JSON.</p>
                            </div>
                        </div>
                        <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                            Utile pour conserver une copie de sécurité sur votre ordinateur ou transférer vos données.
                        </p>
                        <button 
                            onClick={handleExport}
                            className="w-full py-2 border border-slate-300 dark:border-slate-600 rounded-xl text-sm font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
                        >
                            Télécharger mes données
                        </button>
                    </div>

                    {/* IMPORT */}
                    <div className="space-y-4 relative">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-orange-100 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400 rounded-lg">
                                <Upload size={20}/>
                            </div>
                            <div>
                                <h4 className="font-bold text-slate-800 dark:text-white text-sm">Restauration</h4>
                                <p className="text-xs text-slate-500 dark:text-slate-400">Importer un fichier JSON.</p>
                            </div>
                        </div>
                        <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                            <span className="font-bold text-orange-500 flex items-center gap-1 inline-flex"><AlertTriangle size={10}/> Attention :</span> Ceci remplacera TOUTES les données actuelles.
                        </p>
                        
                        <div className="relative">
                            <input 
                                type="file" 
                                accept=".json" 
                                onChange={handleImport}
                                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                                disabled={importStatus === 'loading'}
                            />
                            <div className={`w-full py-2 border border-dashed border-slate-300 dark:border-slate-600 rounded-xl text-sm font-medium text-center transition-colors 
                                ${importStatus === 'success' ? 'bg-green-50 text-green-600 border-green-200' : 
                                  importStatus === 'error' ? 'bg-red-50 text-red-600 border-red-200' :
                                  importStatus === 'loading' ? 'bg-slate-100 text-slate-500 animate-pulse' :
                                  'text-slate-500 hover:bg-slate-50 dark:text-slate-400 dark:hover:bg-slate-700'}`}>
                                {importStatus === 'success' ? 'Restauration réussie !' : 
                                 importStatus === 'loading' ? <span className="flex items-center justify-center gap-2"><Loader2 size={16} className="animate-spin"/> Nettoyage et Importation...</span> : 
                                 importStatus === 'error' ? 'Erreur (voir console)' : 
                                 'Choisir un fichier...'}
                            </div>
                        </div>
                    </div>

                </div>
            </div>

        </div>
    );
}