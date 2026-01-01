import { useState, useEffect } from 'react';
import { 
  Settings, Moon, Sun, Type, Download, Upload, 
  RefreshCw, CheckCircle2, AlertTriangle, User 
} from 'lucide-react';

export default function DataSettings({ data, loadExternalData }) {
    // --- ETATS LOCAUX ---
    const [appName, setAppName] = useState(data.customLabels?.appName || 'LocalApp');
    const [userName, setUserName] = useState(data.customLabels?.userName || 'Utilisateur');
    const [isSaved, setIsSaved] = useState(false);
    
    // Pour l'import de fichier
    const [importStatus, setImportStatus] = useState(null); // 'success', 'error', null

    // Synchronisation initiale
    useEffect(() => {
        if (data.customLabels) {
            setAppName(data.customLabels.appName || 'LocalApp');
            setUserName(data.customLabels.userName || 'Utilisateur');
        }
    }, [data.customLabels]);

    // --- ACTIONS ---

    // 1. Sauvegarder les Textes (Titre, Nom)
    const handleSaveProfile = () => {
        const newSettings = {
            ...data,
            customLabels: { ...data.customLabels, appName, userName }
        };
        loadExternalData(newSettings); // Déclenche la sauvegarde Supabase via App.jsx
        
        setIsSaved(true);
        setTimeout(() => setIsSaved(false), 2000);
    };

    // 2. Changer le Thème
    const toggleTheme = (theme) => {
        const newSettings = {
            ...data,
            settings: { ...data.settings, theme }
        };
        loadExternalData(newSettings);
    };

    // 3. EXPORT (Télécharger JSON)
    const handleExport = () => {
        const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(data, null, 2));
        const downloadAnchorNode = document.createElement('a');
        downloadAnchorNode.setAttribute("href", dataStr);
        const date = new Date().toISOString().split('T')[0];
        downloadAnchorNode.setAttribute("download", `backup_localapp_${date}.json`);
        document.body.appendChild(downloadAnchorNode);
        downloadAnchorNode.click();
        downloadAnchorNode.remove();
    };

    // 4. IMPORT (Lire JSON)
    const handleImport = (event) => {
        const fileReader = new FileReader();
        const file = event.target.files[0];

        if (!file) return;

        fileReader.readAsText(file, "UTF-8");
        fileReader.onload = (e) => {
            try {
                const parsedData = JSON.parse(e.target.result);
                // Petite vérification de structure
                if (parsedData.budget && parsedData.projects) {
                    if (window.confirm("Attention : Importer un fichier va écraser les données actuelles de l'interface. Confirmer ?")) {
                        loadExternalData(parsedData);
                        setImportStatus('success');
                        setTimeout(() => setImportStatus(null), 3000);
                    }
                } else {
                    alert("Format de fichier invalide.");
                    setImportStatus('error');
                }
            } catch (error) {
                console.error(error);
                setImportStatus('error');
            }
        };
    };

    return (
        <div className="fade-in p-6 pb-20 max-w-4xl mx-auto space-y-8">
            
            {/* EN-TÊTE */}
            <div className="flex items-center gap-3 mb-2">
                <div className="p-3 bg-slate-200 dark:bg-slate-700 rounded-xl">
                    <Settings size={24} className="text-slate-700 dark:text-white" />
                </div>
                <div>
                    <h2 className="text-2xl font-bold text-slate-800 dark:text-white">Paramètres</h2>
                    <p className="text-slate-500 dark:text-slate-400 text-sm">Personnalisation & Données</p>
                </div>
            </div>

            {/* 1. PERSONNALISATION */}
            <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden">
                <div className="p-6 border-b border-slate-100 dark:border-slate-700">
                    <h3 className="font-bold text-lg text-slate-800 dark:text-white flex items-center gap-2">
                        <Type size={18} className="text-blue-500"/> Apparence & Textes
                    </h3>
                </div>
                
                <div className="p-6 space-y-6">
                    {/* Thème */}
                    <div className="flex items-center justify-between">
                        <span className="text-sm font-medium text-slate-700 dark:text-slate-300">Thème de l'interface</span>
                        <div className="flex bg-slate-100 dark:bg-slate-900 p-1 rounded-lg border border-slate-200 dark:border-slate-700">
                            <button 
                                onClick={() => toggleTheme('light')} 
                                className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium transition-all ${data.settings?.theme !== 'dark' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                            >
                                <Sun size={14}/> Clair
                            </button>
                            <button 
                                onClick={() => toggleTheme('dark')} 
                                className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium transition-all ${data.settings?.theme === 'dark' ? 'bg-slate-700 text-white shadow-sm' : 'text-slate-500 hover:text-slate-300'}`}
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

                    <div className="flex justify-end">
                        <button 
                            onClick={handleSaveProfile} 
                            className={`flex items-center gap-2 px-6 py-2 rounded-xl text-sm font-bold text-white transition-all ${isSaved ? 'bg-green-500' : 'bg-slate-900 hover:bg-black dark:bg-blue-600 dark:hover:bg-blue-500'}`}
                        >
                            {isSaved ? <CheckCircle2 size={16}/> : <RefreshCw size={16}/>}
                            {isSaved ? 'Enregistré !' : 'Mettre à jour'}
                        </button>
                    </div>
                </div>
            </div>

            {/* 2. GESTION DES DONNÉES (IMPORT/EXPORT) */}
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
                            <span className="font-bold text-orange-500 flex items-center gap-1 inline-flex"><AlertTriangle size={10}/> Attention :</span> Ceci remplacera les données actuelles de l'application.
                        </p>
                        
                        <div className="relative">
                            <input 
                                type="file" 
                                accept=".json" 
                                onChange={handleImport}
                                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                            />
                            <div className={`w-full py-2 border border-dashed border-slate-300 dark:border-slate-600 rounded-xl text-sm font-medium text-center transition-colors ${importStatus === 'success' ? 'bg-green-50 text-green-600 border-green-200' : 'text-slate-500 hover:bg-slate-50 dark:text-slate-400 dark:hover:bg-slate-700'}`}>
                                {importStatus === 'success' ? 'Restauration réussie !' : 'Choisir un fichier...'}
                            </div>
                        </div>
                    </div>

                </div>
            </div>

        </div>
    );
}