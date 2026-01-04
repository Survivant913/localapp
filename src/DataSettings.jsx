import { useState, useEffect } from 'react';
import { supabase } from './supabaseClient';
import { 
  Settings, Moon, Sun, Type, Download, Upload, 
  RefreshCw, CheckCircle2, AlertTriangle, User, Loader2,
  Building2, Wallet, Image as ImageIcon, Trash2
} from 'lucide-react';

export default function DataSettings({ data, loadExternalData, toggleTheme, darkMode }) {
    // --- ETATS LOCAUX ---
    // MODIFICATION ICI : 'Freelance Cockpit' par défaut
    const [appName, setAppName] = useState(data.customLabels?.appName || 'Freelance Cockpit');
    
    // Données combinées (Profil + Entreprise)
    const [companyData, setCompanyData] = useState({
        user_name: '', // Correspond à "Nom Complet (Vous)"
        company_name: '', 
        siret: '', 
        tva_number: '',
        address: '', 
        email_contact: '', 
        iban: '', 
        bic: '',
        logo: '' // Pour stocker l'image en Base64
    });

    const [isSaved, setIsSaved] = useState(false);
    const [importStatus, setImportStatus] = useState(null);

    // Synchronisation initiale
    useEffect(() => {
        if (data.customLabels) {
            // MODIFICATION ICI : Fallback sur 'Freelance Cockpit'
            setAppName(data.customLabels.appName || 'Freelance Cockpit');
        }
        if (data.profile) {
            setCompanyData({
                user_name: data.customLabels?.userName || '', 
                company_name: data.profile.company_name || '',
                siret: data.profile.siret || '',
                tva_number: data.profile.tva_number || '',
                address: data.profile.address || '',
                email_contact: data.profile.email_contact || '',
                iban: data.profile.iban || '',
                bic: data.profile.bic || '',
                logo: data.profile.logo || ''
            });
        }
    }, [data]);

    // --- GESTION DU LOGO ---
    const handleLogoUpload = (e) => {
        const file = e.target.files[0];
        if (file) {
            if (file.size > 500000) { // Limite 500ko
                alert("L'image est trop lourde (Max 500ko)");
                return;
            }
            const reader = new FileReader();
            reader.onloadend = () => {
                setCompanyData(prev => ({ ...prev, logo: reader.result }));
            };
            reader.readAsDataURL(file);
        }
    };

    const removeLogo = () => {
        setCompanyData(prev => ({ ...prev, logo: '' }));
    };

    // --- SAUVEGARDE ---
    const handleSaveProfile = () => {
        const newSettings = {
            ...data,
            customLabels: { 
                ...data.customLabels, 
                appName, 
                userName: companyData.user_name 
            },
            profile: { 
                ...data.profile, 
                company_name: companyData.company_name,
                siret: companyData.siret,
                tva_number: companyData.tva_number,
                address: companyData.address,
                email_contact: companyData.email_contact,
                iban: companyData.iban,
                bic: companyData.bic,
                logo: companyData.logo
            }
        };
        loadExternalData(newSettings); 
        
        setIsSaved(true);
        setTimeout(() => setIsSaved(false), 2000);
    };

    // --- IMPORT / EXPORT / THEME ---
    const handleThemeChange = (theme) => {
        if ((theme === 'dark' && !darkMode) || (theme === 'light' && darkMode)) toggleTheme();
    };

    const handleExport = () => {
        const cleanData = JSON.parse(JSON.stringify(data));
        const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(cleanData, null, 2));
        const downloadAnchorNode = document.createElement('a');
        downloadAnchorNode.setAttribute("href", dataStr);
        downloadAnchorNode.setAttribute("download", `backup_freelance_cockpit_${new Date().toISOString().split('T')[0]}.json`);
        document.body.appendChild(downloadAnchorNode);
        downloadAnchorNode.click();
        downloadAnchorNode.remove();
    };

    const handleImport = async (event) => {
        const fileReader = new FileReader();
        const file = event.target.files[0];
        if (!file) return;
        fileReader.readAsText(file, "UTF-8");
        fileReader.onload = async (e) => {
            try {
                const parsedData = JSON.parse(e.target.result);
                if (parsedData.budget || parsedData.clients) {
                    if (window.confirm("ATTENTION : Cette action va EFFACER toutes les données actuelles. Continuer ?")) {
                        setImportStatus('loading');
                        const { data: { user } } = await supabase.auth.getUser();
                        if (user) {
                            const tables = ['transactions', 'recurring', 'scheduled', 'planner_items', 'projects', 'notes', 'todos', 'accounts', 'safety_bases', 'clients', 'quotes', 'invoices', 'catalog_items'];
                            await Promise.all(tables.map(t => supabase.from(t).delete().eq('user_id', user.id)));
                        }
                        setTimeout(() => {
                            loadExternalData(parsedData); 
                            setImportStatus('success');
                            setTimeout(() => setImportStatus(null), 3000);
                        }, 1500);
                    }
                } else {
                    setImportStatus('error');
                    alert("Format invalide.");
                }
            } catch (error) {
                console.error(error);
                setImportStatus('error');
            }
        };
        event.target.value = null;
    };

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
                        <p className="text-slate-500 dark:text-slate-400 text-sm">Identité, Banque & Apparence</p>
                    </div>
                </div>
                
                <button 
                    onClick={handleSaveProfile} 
                    className={`flex items-center gap-2 px-6 py-2 rounded-xl text-sm font-bold text-white transition-all shadow-md ${isSaved ? 'bg-green-500' : 'bg-blue-600 hover:bg-blue-700'}`}
                >
                    {isSaved ? <CheckCircle2 size={18}/> : <RefreshCw size={18}/>}
                    {isSaved ? 'Enregistré' : 'Sauvegarder'}
                </button>
            </div>

            {/* --- SECTION PRINCIPALE : MON ENTREPRISE --- */}
            <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-lg border border-slate-200 dark:border-slate-700 overflow-hidden">
                <div className="p-6 border-b border-slate-100 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/50">
                    <h3 className="font-bold text-lg text-slate-800 dark:text-white flex items-center gap-2">
                        <Building2 size={20} className="text-amber-500"/> Mon Entreprise
                    </h3>
                </div>
                
                <div className="p-8 grid grid-cols-1 lg:grid-cols-2 gap-12">
                    
                    {/* COLONNE GAUCHE : IDENTITÉ & LOGO */}
                    <div className="space-y-6">
                        <h4 className="text-xs font-bold text-amber-500 uppercase tracking-widest mb-4">Identité & Logo</h4>

                        {/* UPLOAD LOGO */}
                        <div className="p-4 border border-dashed border-slate-300 dark:border-slate-600 rounded-xl bg-slate-50 dark:bg-slate-900/50 flex items-center gap-6 relative group">
                            <div className="w-24 h-24 shrink-0 bg-slate-200 dark:bg-slate-800 rounded-lg flex items-center justify-center overflow-hidden border border-slate-300 dark:border-slate-700 relative">
                                {companyData.logo ? (
                                    <img src={companyData.logo} alt="Logo" className="w-full h-full object-contain" />
                                ) : (
                                    <ImageIcon size={32} className="text-slate-400" />
                                )}
                                {companyData.logo && (
                                    <button onClick={removeLogo} className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity text-white">
                                        <Trash2 size={20}/>
                                    </button>
                                )}
                            </div>
                            <div className="flex-1">
                                <p className="font-bold text-slate-800 dark:text-white mb-1">Votre Logo</p>
                                <p className="text-xs text-slate-500 dark:text-slate-400 mb-3">Apparaîtra sur les factures. Max 500ko.</p>
                                <label className="cursor-pointer bg-slate-800 dark:bg-slate-700 hover:bg-slate-700 text-white px-4 py-2 rounded-lg text-xs font-bold transition-colors inline-flex items-center gap-2">
                                    <Upload size={14}/> Choisir une image
                                    <input type="file" accept="image/*" className="hidden" onChange={handleLogoUpload} />
                                </label>
                            </div>
                        </div>

                        {/* CHAMPS IDENTITÉ */}
                        <div className="space-y-4">
                            <div className="space-y-1">
                                <label className="text-xs font-bold text-slate-500 dark:text-slate-400">Nom Complet (Vous)</label>
                                <input type="text" value={companyData.user_name} onChange={e => setCompanyData({...companyData, user_name: e.target.value})} className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg outline-none focus:border-amber-500 dark:text-white transition-colors" placeholder="Jean Dupont" />
                            </div>
                            <div className="space-y-1">
                                <label className="text-xs font-bold text-slate-500 dark:text-slate-400">Nom Commercial / Entreprise</label>
                                <input type="text" value={companyData.company_name} onChange={e => setCompanyData({...companyData, company_name: e.target.value})} className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg outline-none focus:border-amber-500 dark:text-white transition-colors" placeholder="JD Studio" />
                            </div>
                            <div className="space-y-1">
                                <label className="text-xs font-bold text-slate-500 dark:text-slate-400">SIRET / SIREN (Obligatoire)</label>
                                <input type="text" value={companyData.siret} onChange={e => setCompanyData({...companyData, siret: e.target.value})} className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg outline-none focus:border-amber-500 dark:text-white transition-colors font-mono" placeholder="123 456 789 00012" />
                            </div>
                            <div className="space-y-1">
                                <label className="text-xs font-bold text-slate-500 dark:text-slate-400">N° TVA Intracom (Si applicable)</label>
                                <input type="text" value={companyData.tva_number} onChange={e => setCompanyData({...companyData, tva_number: e.target.value})} className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg outline-none focus:border-amber-500 dark:text-white transition-colors font-mono" placeholder="FR 12 34567890" />
                            </div>
                        </div>
                    </div>

                    {/* COLONNE DROITE : COORDONNÉES & BANQUE */}
                    <div className="space-y-6">
                        <h4 className="text-xs font-bold text-amber-500 uppercase tracking-widest mb-4">Coordonnées & Banque</h4>
                        
                        <div className="space-y-4">
                            <div className="space-y-1">
                                <label className="text-xs font-bold text-slate-500 dark:text-slate-400">Adresse Complète</label>
                                <textarea value={companyData.address} onChange={e => setCompanyData({...companyData, address: e.target.value})} className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg outline-none focus:border-amber-500 dark:text-white transition-colors min-h-[100px] resize-none" placeholder="12 Rue de la Paix, 75000 Paris" />
                            </div>
                            <div className="space-y-1">
                                <label className="text-xs font-bold text-slate-500 dark:text-slate-400">Email de contact</label>
                                <input type="email" value={companyData.email_contact} onChange={e => setCompanyData({...companyData, email_contact: e.target.value})} className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg outline-none focus:border-amber-500 dark:text-white transition-colors" placeholder="contact@jdstudio.com" />
                            </div>
                            
                            <hr className="border-slate-100 dark:border-slate-700 my-6"/>

                            <div className="space-y-1">
                                <label className="text-xs font-bold text-slate-500 dark:text-slate-400">IBAN (pour les virements)</label>
                                <input type="text" value={companyData.iban} onChange={e => setCompanyData({...companyData, iban: e.target.value})} className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg outline-none focus:border-amber-500 dark:text-white transition-colors font-mono" placeholder="FR76 ...." />
                            </div>
                            <div className="space-y-1">
                                <label className="text-xs font-bold text-slate-500 dark:text-slate-400">BIC / SWIFT</label>
                                <input type="text" value={companyData.bic} onChange={e => setCompanyData({...companyData, bic: e.target.value})} className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg outline-none focus:border-amber-500 dark:text-white transition-colors font-mono" />
                            </div>
                        </div>
                    </div>

                </div>
            </div>

            {/* --- SECTION SECONDAIRE : APP & DONNÉES --- */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                
                {/* APPARENCE */}
                <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden">
                    <div className="p-4 border-b border-slate-100 dark:border-slate-700">
                        <h3 className="font-bold text-sm text-slate-800 dark:text-white flex items-center gap-2">
                            <Type size={16} className="text-purple-500"/> Apparence
                        </h3>
                    </div>
                    <div className="p-6 space-y-4">
                        <div className="flex items-center justify-between">
                            <span className="text-sm font-medium text-slate-700 dark:text-slate-300">Thème</span>
                            <div className="flex bg-slate-100 dark:bg-slate-900 p-1 rounded-lg">
                                <button onClick={() => handleThemeChange('light')} className={`px-3 py-1.5 rounded-md text-xs font-bold ${!darkMode ? 'bg-white shadow text-slate-900' : 'text-slate-500'}`}><Sun size={14}/></button>
                                <button onClick={() => handleThemeChange('dark')} className={`px-3 py-1.5 rounded-md text-xs font-bold ${darkMode ? 'bg-slate-700 shadow text-white' : 'text-slate-500'}`}><Moon size={14}/></button>
                            </div>
                        </div>
                        <div className="space-y-1">
                            <label className="text-xs font-bold text-slate-500">Nom de l'app</label>
                            <input type="text" value={appName} onChange={(e) => setAppName(e.target.value)} className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg outline-none dark:text-white text-sm" />
                        </div>
                    </div>
                </div>

                {/* DONNÉES */}
                <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden">
                    <div className="p-4 border-b border-slate-100 dark:border-slate-700">
                        <h3 className="font-bold text-sm text-slate-800 dark:text-white flex items-center gap-2">
                            <Download size={16} className="text-green-500"/> Données
                        </h3>
                    </div>
                    <div className="p-6 space-y-4">
                        <button onClick={handleExport} className="w-full py-2 border border-slate-300 dark:border-slate-600 rounded-lg text-sm font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700">
                            Sauvegarde manuelle (JSON)
                        </button>
                        <div className="relative">
                            <input type="file" accept=".json" onChange={handleImport} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" disabled={importStatus === 'loading'}/>
                            <div className={`w-full py-2 border border-dashed border-slate-300 dark:border-slate-600 rounded-lg text-sm font-bold text-center ${importStatus === 'loading' ? 'bg-slate-100 text-slate-400' : 'text-orange-500 hover:bg-orange-50 dark:hover:bg-orange-900/20'}`}>
                                {importStatus === 'loading' ? 'Restauration...' : 'Importer une sauvegarde'}
                            </div>
                        </div>
                    </div>
                </div>
            </div>

        </div>
    );
}