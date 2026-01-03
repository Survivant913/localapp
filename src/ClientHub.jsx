import { useState } from 'react';
import { 
  Users, FileText, ShoppingBag, Plus, Search, 
  ChevronRight, CheckCircle2, AlertCircle, X, 
  Printer, Save, Trash2, Wallet, ArrowRight,
  ZoomIn, ZoomOut, Download, Sparkles,
  ArrowRightLeft, TrendingUp, Clock, Pencil,
  MapPin, Mail, Phone, Package
} from 'lucide-react';

export default function ClientHub({ data, updateData }) {
    const [activeTab, setActiveTab] = useState('clients'); 
    
    // --- DONNÉES ---
    const clients = data.clients || [];
    const catalog = data.catalog || [];
    const quotes = data.quotes || [];
    const invoices = data.invoices || [];
    const accounts = data.budget?.accounts || [];
    const profile = data.profile || {}; 

    // --- CORRECTION NOM ENTREPRISE ---
    // On cherche d'abord 'company_name' (format DataSettings), sinon le nom utilisateur, sinon le défaut.
    const companyDisplayName = profile.company_name || profile.companyName || profile.name || "Votre Entreprise";

    // --- UTILS ---
    const formatCurrency = (val) => new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(val || 0);
    const formatDate = (d) => new Date(d).toLocaleDateString('fr-FR');
    
    // --- NUMÉROTATION SÉCURISÉE (ANTIDOUBLON) ---
    const generateNumber = (type) => {
        const prefix = type === 'quote' ? 'DEV' : 'FACT';
        const list = type === 'quote' ? quotes : invoices;
        const year = new Date().getFullYear();
        
        let nextNumber = 1;
        let isUnique = false;
        let finalString = "";

        while (!isUnique) {
            const candidate = `${prefix}-${year}-${nextNumber.toString().padStart(3, '0')}`;
            const exists = list.some(doc => doc.number === candidate);
            
            if (!exists) {
                finalString = candidate;
                isUnique = true;
            } else {
                nextNumber++;
            }
        }
        return finalString;
    };

    const getInitials = (name) => name ? name.substring(0, 2).toUpperCase() : '??';

    // --- 0. COMPOSANT : RÉSUMÉ FINANCIER ---
    const FinancialSummary = () => {
        const pendingPayment = invoices
            .filter(i => i.status === 'Sent')
            .reduce((sum, i) => sum + (i.total || 0), 0);
        
        const acceptedQuotes = quotes
            .filter(q => q.status === 'Accepted')
            .reduce((sum, q) => sum + (q.total || 0), 0);

        return (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8 animate-in slide-in-from-top-4">
                <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm flex items-center justify-between group hover:border-orange-200 dark:hover:border-orange-900/50 transition-colors">
                    <div>
                        <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">En attente de paiement</p>
                        <p className="text-3xl font-bold text-slate-800 dark:text-white">{formatCurrency(pendingPayment)}</p>
                    </div>
                    <div className="p-4 bg-orange-50 dark:bg-orange-900/20 text-orange-500 rounded-full">
                        <Clock size={24}/>
                    </div>
                </div>

                <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm flex items-center justify-between group hover:border-blue-200 dark:hover:border-blue-900/50 transition-colors">
                    <div>
                        <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Devis à facturer</p>
                        <p className="text-3xl font-bold text-slate-800 dark:text-white">{formatCurrency(acceptedQuotes)}</p>
                    </div>
                    <div className="p-4 bg-blue-50 dark:bg-blue-900/20 text-blue-500 rounded-full">
                        <FileText size={24}/>
                    </div>
                </div>
            </div>
        );
    };

    // --- 1. GESTION CLIENTS ---
    const ClientsTab = () => {
        const [form, setForm] = useState(false);
        const [editing, setEditing] = useState(null);
        const [tempClient, setTempClient] = useState({ name: '', email: '', phone: '', address: '', contact_person: '' });
        const [searchTerm, setSearchTerm] = useState('');

        const saveClient = () => {
            if (!tempClient.name) return alert('Nom requis');
            const newClient = { ...tempClient, id: editing ? editing.id : Date.now(), status: 'Active' };
            let newClientsList = editing ? clients.map(c => c.id === editing.id ? newClient : c) : [newClient, ...clients];
            updateData({ ...data, clients: newClientsList });
            setForm(false); setEditing(null); setTempClient({ name: '', email: '', phone: '', address: '', contact_person: '' });
        };

        const deleteClient = (id) => {
            if (window.confirm('Supprimer ce client ?')) updateData({ ...data, clients: clients.filter(c => c.id !== id) }, { table: 'clients', id });
        };

        const filteredClients = clients.filter(c => c.name.toLowerCase().includes(searchTerm.toLowerCase()));

        return (
            <div className="space-y-6">
                <div className="flex flex-col md:flex-row justify-between items-center gap-4">
                    <div className="relative w-full md:w-96">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                        <input 
                            type="text" 
                            placeholder="Rechercher un client..." 
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full pl-10 pr-4 py-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:border-blue-500 text-sm text-slate-800 dark:text-white shadow-sm"
                        />
                    </div>
                    <button onClick={() => { setEditing(null); setTempClient({ name: '' }); setForm(true); }} className="bg-amber-600 text-white px-6 py-2.5 rounded-xl flex items-center gap-2 text-sm font-bold hover:bg-amber-700 transition-colors shadow-lg shadow-amber-600/20">
                        <Plus size={18}/> Nouveau Client
                    </button>
                </div>

                {form && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
                        <div className="bg-white dark:bg-slate-900 w-full max-w-2xl p-8 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xl animate-in zoom-in-95">
                            <div className="flex justify-between items-center mb-6">
                                <h4 className="font-bold text-xl text-slate-800 dark:text-white font-serif">{editing ? 'Modifier le client' : 'Nouveau Client'}</h4>
                                <button onClick={() => setForm(false)} className="text-slate-400 hover:text-white"><X size={24}/></button>
                            </div>
                            
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                                <div className="space-y-4">
                                    <div>
                                        <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Entreprise / Nom</label>
                                        <input type="text" value={tempClient.name} onChange={e => setTempClient({...tempClient, name: e.target.value})} className="w-full mt-1 p-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:border-amber-500 dark:text-white" placeholder="ex: Startup Nation" />
                                    </div>
                                    <div>
                                        <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Contact Principal</label>
                                        <input type="text" value={tempClient.contact_person} onChange={e => setTempClient({...tempClient, contact_person: e.target.value})} className="w-full mt-1 p-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:border-amber-500 dark:text-white" placeholder="ex: CEO" />
                                    </div>
                                </div>
                                <div className="space-y-4">
                                    <div>
                                        <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Email</label>
                                        <input type="email" value={tempClient.email} onChange={e => setTempClient({...tempClient, email: e.target.value})} className="w-full mt-1 p-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:border-amber-500 dark:text-white" />
                                    </div>
                                    <div>
                                        <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Téléphone</label>
                                        <input type="text" value={tempClient.phone} onChange={e => setTempClient({...tempClient, phone: e.target.value})} className="w-full mt-1 p-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:border-amber-500 dark:text-white" />
                                    </div>
                                </div>
                                <div className="md:col-span-2">
                                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Adresse Complète</label>
                                    <input type="text" value={tempClient.address} onChange={e => setTempClient({...tempClient, address: e.target.value})} className="w-full mt-1 p-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:border-amber-500 dark:text-white" placeholder="10 Rue de la Tech, Paris" />
                                </div>
                            </div>
                            <div className="flex justify-end gap-3">
                                <button onClick={() => setForm(false)} className="px-6 py-3 rounded-xl text-sm font-bold text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800">Annuler</button>
                                <button onClick={saveClient} className="px-8 py-3 rounded-xl text-sm font-bold bg-amber-600 text-white hover:bg-amber-700 shadow-lg shadow-amber-600/20">Enregistrer</button>
                            </div>
                        </div>
                    </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {filteredClients.map(client => (
                        <div key={client.id} className="bg-white dark:bg-[#1E1E1E] rounded-2xl border border-slate-200 dark:border-slate-800 p-6 hover:border-amber-500/50 transition-all group relative shadow-sm">
                            <div className="absolute top-4 right-4 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                <button onClick={() => { setEditing(client); setTempClient(client); setForm(true); }} className="p-2 bg-slate-100 dark:bg-slate-800 text-slate-500 hover:text-amber-500 rounded-lg"><Pencil size={14}/></button>
                                <button onClick={() => deleteClient(client.id)} className="p-2 bg-slate-100 dark:bg-slate-800 text-slate-500 hover:text-red-500 rounded-lg"><Trash2 size={14}/></button>
                            </div>
                            <div className="flex items-center gap-4 mb-6">
                                <div className="w-14 h-14 rounded-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center text-slate-600 dark:text-white font-serif font-bold text-xl">
                                    {getInitials(client.name)}
                                </div>
                                <div>
                                    <h4 className="font-bold text-slate-900 dark:text-white text-lg">{client.name}</h4>
                                    <p className="text-sm text-slate-500 dark:text-slate-400 font-medium">{client.contact_person || 'Pas de contact'}</p>
                                </div>
                            </div>
                            <hr className="border-slate-100 dark:border-slate-800 mb-6" />
                            <div className="space-y-3">
                                <div className="flex items-center gap-3 text-sm text-slate-600 dark:text-slate-400">
                                    <Mail size={16} className="text-slate-400 dark:text-slate-600"/>
                                    <span>{client.email || '---'}</span>
                                </div>
                                <div className="flex items-center gap-3 text-sm text-slate-600 dark:text-slate-400">
                                    <Phone size={16} className="text-slate-400 dark:text-slate-600"/>
                                    <span>{client.phone || '---'}</span>
                                </div>
                                <div className="pt-2 flex items-start gap-3 text-xs text-slate-400 dark:text-slate-500 italic">
                                    <MapPin size={14} className="shrink-0 mt-0.5"/>
                                    <span>{client.address || 'Aucune adresse renseignée'}</span>
                                </div>
                            </div>
                        </div>
                    ))}
                    {filteredClients.length === 0 && !searchTerm && (
                        <button onClick={() => { setEditing(null); setTempClient({ name: '' }); setForm(true); }} className="border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-2xl p-6 flex flex-col items-center justify-center gap-4 text-slate-400 hover:text-amber-500 hover:border-amber-500/30 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-all group min-h-[240px]">
                            <div className="w-14 h-14 rounded-full bg-slate-100 dark:bg-slate-800 group-hover:bg-amber-100 dark:group-hover:bg-amber-900/20 group-hover:text-amber-600 flex items-center justify-center transition-colors">
                                <Plus size={24}/>
                            </div>
                            <span className="font-medium">Ajouter un premier client</span>
                        </button>
                    )}
                </div>
            </div>
        );
    };

    // --- 2. CATALOGUE ---
    const CatalogTab = () => {
        const [newItem, setNewItem] = useState({ name: '', price: '' });
        
        const addItem = () => {
            if (!newItem.name || !newItem.price) return;
            const item = { ...newItem, id: Date.now(), price: parseFloat(newItem.price) };
            updateData({ ...data, catalog: [...catalog, item] });
            setNewItem({ name: '', price: '' });
        };
        const deleteItem = (id) => updateData({ ...data, catalog: catalog.filter(i => i.id !== id) }, { table: 'catalog_items', id });

        return (
            <div className="space-y-6">
                <div className="bg-white dark:bg-slate-800 p-2 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm flex flex-col md:flex-row gap-2 items-center">
                    <div className="p-3 bg-slate-100 dark:bg-slate-700 text-slate-500 rounded-lg ml-2 hidden md:block">
                        <Package size={20}/>
                    </div>
                    <input type="text" value={newItem.name} onChange={e => setNewItem({...newItem, name: e.target.value})} className="flex-1 p-3 bg-transparent outline-none text-slate-800 dark:text-white placeholder:text-slate-400 text-sm" placeholder="Nom du service ou produit..." />
                    <div className="h-8 w-[1px] bg-slate-200 dark:bg-slate-700 hidden md:block"></div>
                    <div className="flex items-center gap-2 w-full md:w-auto px-2">
                        <span className="text-slate-400 font-bold text-sm">€</span>
                        <input type="number" value={newItem.price} onChange={e => setNewItem({...newItem, price: e.target.value})} className="w-24 p-3 bg-transparent outline-none text-slate-800 dark:text-white placeholder:text-slate-400 font-mono text-sm" placeholder="0.00" />
                    </div>
                    <button onClick={addItem} className="w-full md:w-auto px-6 py-3 bg-slate-900 dark:bg-white text-white dark:text-black rounded-lg font-bold hover:opacity-90 transition-opacity">Ajouter</button>
                </div>
                <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden shadow-sm">
                    <table className="w-full text-left">
                        <thead className="bg-slate-50 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-700">
                            <tr>
                                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Désignation</th>
                                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider text-right">Prix Unitaire</th>
                                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider text-right w-20">Action</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-slate-700 text-sm">
                            {catalog.length === 0 && (
                                <tr>
                                    <td colSpan="3" className="p-12 text-center text-slate-400">Votre catalogue est vide.</td>
                                </tr>
                            )}
                            {catalog.map(item => (
                                <tr key={item.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors group">
                                    <td className="px-6 py-4 font-medium text-slate-800 dark:text-white">{item.name}</td>
                                    <td className="px-6 py-4 text-right font-mono text-slate-600 dark:text-slate-300">{formatCurrency(item.price)}</td>
                                    <td className="px-6 py-4 text-right">
                                        <button onClick={() => deleteItem(item.id)} className="p-2 text-slate-300 hover:text-red-500 hover:bg-red-50 dark:hover:bg-slate-700 rounded-lg transition-colors"><Trash2 size={16}/></button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        );
    };

    // --- 3. ÉDITEUR FACTURE / DEVIS ---
    const DocumentEditor = ({ type, onClose, initialDoc }) => {
        const isInvoice = type === 'invoice';
        const [doc, setDoc] = useState(initialDoc || {
            id: Date.now(), number: generateNumber(type), date: new Date().toISOString().split('T')[0], dueDate: new Date(Date.now() + 30*24*60*60*1000).toISOString().split('T')[0],
            client_id: '', client_name: '', client_address: '', items: [{ desc: 'Prestation', qty: 1, price: 0 }], status: 'Draft', target_account_id: accounts[0]?.id || '', notes: isInvoice ? 'Paiement à réception.' : 'Validité du devis : 30 jours.', taxRate: 20
        });
        const [zoom, setZoom] = useState(0.65);

        const toggleAutoEntrepreneur = () => {
            const mention = 'TVA non applicable, art. 293 B du CGI.';
            setDoc(prev => {
                const isAE = prev.taxRate === 0 && prev.notes.includes(mention);
                return isAE ? { ...prev, taxRate: 20, notes: prev.notes.replace(mention, '').replace(/\n\n$/, '').trim() } : { ...prev, taxRate: 0, notes: prev.notes.includes(mention) ? prev.notes : (prev.notes ? prev.notes + '\n\n' + mention : mention) };
            });
        };

        const handleClientChange = (e) => {
            const c = clients.find(cl => cl.id.toString() === e.target.value);
            if (c) setDoc({ ...doc, client_id: c.id, client_name: c.name, client_address: (c.address || '') + (c.email ? '\n' + c.email : '') });
        };

        const addItem = () => setDoc({ ...doc, items: [...doc.items, { desc: '', qty: 1, price: 0 }] });
        const updateItem = (index, field, value) => { const newItems = [...doc.items]; newItems[index][field] = value; setDoc({ ...doc, items: newItems }); };
        const subTotal = doc.items.reduce((acc, i) => acc + (i.qty * i.price), 0);
        const taxAmount = subTotal * (doc.taxRate / 100);
        const total = subTotal + taxAmount;

        const saveDocument = () => {
            if (!doc.client_id) return alert('Veuillez sélectionner un client.');
            const finalDoc = { ...doc, subTotal, total };
            const listName = isInvoice ? 'invoices' : 'quotes';
            const list = isInvoice ? invoices : quotes;
            const isEditing = !!initialDoc;
            const newList = isEditing ? list.map(d => d.id === finalDoc.id ? finalDoc : d) : [finalDoc, ...list];
            updateData({ ...data, [listName]: newList });
            onClose();
        };

        const handlePrint = () => {
            const content = document.getElementById('invoice-paper');
            if (!content) return;

            const printWindow = window.open('', '_blank');
            if (!printWindow) return alert("Veuillez autoriser les pop-ups pour imprimer.");

            printWindow.document.write(`
                <!DOCTYPE html>
                <html>
                <head>
                    <title>Impression ${doc.number}</title>
                    <script src="https://cdn.tailwindcss.com"></script>
                    <style>
                        @page { size: A4; margin: 0; }
                        body { margin: 0; padding: 0; background: white; -webkit-print-color-adjust: exact; print-color-adjust: exact; font-family: sans-serif; }
                        /* Conteneur principal A4 avec Flexbox */
                        .print-container { 
                            width: 210mm; 
                            height: 297mm; 
                            margin: 0 auto; 
                            background: white; 
                            padding: 40px; 
                            box-sizing: border-box; 
                            display: flex; 
                            flex-direction: column; 
                            justify-content: space-between; 
                        }
                        /* Contenu principal qui pousse le reste */
                        .print-content {
                            flex-grow: 1;
                        }
                        /* Footer collé en bas */
                        .invoice-footer {
                            width: 100%;
                            border-top: 1px solid #e2e8f0;
                            padding-top: 20px;
                            background: white;
                        }
                    </style>
                </head>
                <body>
                    <div class="print-container">
                        ${content.innerHTML}
                    </div>
                    <script>
                        window.onload = function() {
                            setTimeout(function() {
                                window.print();
                                window.close();
                            }, 600);
                        }
                    </script>
                </body>
                </html>
            `);
            printWindow.document.close();
        };

        return (
            <div className="fixed inset-0 bg-black/80 z-[100] flex flex-col overflow-hidden backdrop-blur-sm">
                <div className="bg-slate-900 p-4 border-b border-slate-700 flex justify-between items-center text-white no-print shadow-xl">
                    <h2 className="text-xl font-bold flex items-center gap-2">
                        {isInvoice ? <FileText className="text-amber-500"/> : <ShoppingBag className="text-blue-500"/>}
                        {initialDoc ? 'Modifier' : 'Nouveau'} {isInvoice ? 'Facture' : 'Devis'}
                    </h2>
                    <div className="flex items-center gap-4">
                        <div className="flex items-center gap-2 bg-slate-800 rounded-lg px-2 py-1 border border-slate-700">
                            <button onClick={() => setZoom(Math.max(0.4, zoom - 0.1))} className="p-1 hover:text-white text-slate-400"><ZoomOut size={16}/></button>
                            <span className="text-xs font-mono w-10 text-center">{Math.round(zoom * 100)}%</span>
                            <button onClick={() => setZoom(Math.min(1.5, zoom + 0.1))} className="p-1 hover:text-white text-slate-400"><ZoomIn size={16}/></button>
                        </div>
                        <button onClick={handlePrint} className="bg-white text-black px-4 py-2 rounded-lg font-bold text-sm hover:bg-slate-200 flex items-center gap-2"><Printer size={16}/> Imprimer</button>
                        <button onClick={saveDocument} className="bg-blue-600 text-white px-6 py-2 rounded-lg font-bold text-sm hover:bg-blue-700 flex items-center gap-2"><Save size={16}/> Enregistrer</button>
                        <button onClick={onClose} className="p-2 hover:bg-slate-800 rounded-full text-slate-400 hover:text-white"><X size={24}/></button>
                    </div>
                </div>

                <div className="flex flex-1 overflow-hidden">
                    <div className="w-1/3 bg-slate-50 dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 overflow-y-auto p-6 space-y-6 no-print">
                        <div className="space-y-4">
                            <div>
                                <label className="text-xs font-bold text-slate-500 uppercase block mb-1">Client</label>
                                <select value={doc.client_id} onChange={handleClientChange} className="w-full p-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm text-slate-800 dark:text-white outline-none focus:border-blue-500">
                                    <option value="">-- Sélectionner un client --</option>
                                    {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                                </select>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="text-xs font-bold text-slate-500 uppercase block mb-1">Date</label>
                                    <input type="date" value={doc.date} onChange={e => setDoc({...doc, date: e.target.value})} className="w-full p-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm text-slate-800 dark:text-white" />
                                </div>
                                <div>
                                    <label className="text-xs font-bold text-slate-500 uppercase block mb-1">Échéance</label>
                                    <input type="date" value={doc.dueDate} onChange={e => setDoc({...doc, dueDate: e.target.value})} className="w-full p-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm text-slate-800 dark:text-white" />
                                </div>
                            </div>
                            {isInvoice && (
                                <div className="bg-amber-50 dark:bg-amber-900/10 p-4 rounded-lg border border-amber-100 dark:border-amber-800/30">
                                    <label className="text-xs font-bold text-amber-600 uppercase block mb-1 flex items-center gap-2"><Wallet size={12}/> Compte de réception</label>
                                    <select value={doc.target_account_id} onChange={e => setDoc({...doc, target_account_id: e.target.value})} className="w-full p-2 bg-white dark:bg-slate-800 border border-amber-200 dark:border-amber-800 rounded-lg text-sm text-slate-800 dark:text-white outline-none">
                                        <option value="">-- Choisir un compte --</option>
                                        {accounts.length > 0 ? accounts.map(acc => <option key={acc.id} value={acc.id}>{acc.name}</option>) : <option disabled>Aucun compte créé dans Budget</option>}
                                    </select>
                                </div>
                            )}
                            <div className="p-4 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800">
                                <label className="text-xs font-bold text-slate-500 uppercase block mb-2">Options fiscales</label>
                                <button onClick={toggleAutoEntrepreneur} className={`w-full py-2 px-3 rounded-lg text-xs font-bold flex items-center justify-center gap-2 transition-all border ${doc.taxRate === 0 && doc.notes.includes('293 B') ? 'bg-emerald-100 text-emerald-700 border-emerald-300 dark:bg-emerald-900/30 dark:text-emerald-400' : 'bg-slate-100 text-slate-600 border-slate-200 dark:bg-slate-700 dark:text-slate-300'}`}>
                                    <Sparkles size={14}/> {doc.taxRate === 0 && doc.notes.includes('293 B') ? 'Mode AE Activé (TVA 0%)' : 'Activer Mode AE (TVA 0%)'}
                                </button>
                                {doc.taxRate !== 0 && (
                                    <div className="mt-3">
                                        <label className="text-[10px] text-slate-400">Taux TVA (%)</label>
                                        <input type="number" value={doc.taxRate} onChange={e => setDoc({...doc, taxRate: Number(e.target.value)})} className="w-full mt-1 p-2 bg-slate-50 dark:bg-slate-900 border dark:border-slate-600 rounded text-sm text-center dark:text-white"/>
                                    </div>
                                )}
                            </div>
                            <div>
                                <label className="text-xs font-bold text-slate-500 uppercase block mb-1">Lignes</label>
                                <div className="space-y-2">
                                    {doc.items.map((item, i) => (
                                        <div key={i} className="flex gap-2 items-start bg-white dark:bg-slate-800 p-2 rounded border border-slate-200 dark:border-slate-700">
                                            <div className="flex-1 space-y-1">
                                                <input type="text" value={item.desc} onChange={e => updateItem(i, 'desc', e.target.value)} className="w-full text-sm bg-transparent outline-none font-medium text-slate-800 dark:text-white" placeholder="Description" />
                                                <select onChange={e => { const catItem = catalog.find(c => c.name === e.target.value); if(catItem) { updateItem(i, 'desc', catItem.name); updateItem(i, 'price', catItem.price); } }} className="w-full text-xs p-1 bg-slate-100 dark:bg-slate-700 rounded border-none outline-none text-slate-500 cursor-pointer">
                                                    <option value="">Insérer un produit...</option>
                                                    {catalog.map(c => <option key={c.id} value={c.name}>{c.name} - {c.price}€</option>)}
                                                </select>
                                                <div className="flex gap-2 pt-1">
                                                    <input type="number" value={item.qty} onChange={e => updateItem(i, 'qty', Number(e.target.value))} className="w-16 p-1 bg-slate-100 dark:bg-slate-700 rounded text-xs text-center outline-none text-slate-800 dark:text-white" placeholder="Qté" />
                                                    <input type="number" value={item.price} onChange={e => updateItem(i, 'price', Number(e.target.value))} className="w-24 p-1 bg-slate-100 dark:bg-slate-700 rounded text-xs text-right outline-none text-slate-800 dark:text-white" placeholder="Prix" />
                                                </div>
                                            </div>
                                            <button onClick={() => setDoc({...doc, items: doc.items.filter((_, idx) => idx !== i)})} className="text-slate-400 hover:text-red-500"><X size={16}/></button>
                                        </div>
                                    ))}
                                    <button onClick={addItem} className="w-full py-2 border border-dashed border-slate-300 dark:border-slate-600 rounded text-xs font-bold text-slate-500 hover:text-blue-500 hover:border-blue-500 transition-colors">+ Ajouter ligne</button>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="flex-1 bg-slate-200/50 dark:bg-black/50 overflow-auto flex justify-center p-8 relative">
                        {/* CONTENEUR APERÇU ÉCRAN 
                            Utilise aussi Flexbox pour simuler l'aspect papier (hauteur et espacement)
                        */}
                        <div id="invoice-paper" style={{ width: '210mm', minHeight: '297mm', transform: `scale(${zoom})`, transformOrigin: 'top center', boxShadow: '0 0 40px rgba(0,0,0,0.1)', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }} className="bg-white text-black p-12 flex flex-col shrink-0 transition-transform duration-200">
                            
                            {/* --- CONTENU DU HAUT (Prend toute la place disponible) --- */}
                            <div className="print-content">
                                {/* --- EN-TÊTE --- */}
                                <div className="flex justify-between items-start mb-12">
                                    <div>
                                        {profile.logo && (
                                            <img src={profile.logo} className="h-16 w-auto object-contain mb-3" alt="Logo"/>
                                        )}
                                        
                                        {/* LOGIQUE CORRIGÉE : Nom en gros si pas de logo, petit si logo */}
                                        <div className={`${profile.logo ? 'text-xl font-bold' : 'text-3xl font-bold uppercase tracking-tight'} text-slate-900 mb-2`}>
                                            {companyDisplayName}
                                        </div>

                                        <div className="text-xs text-slate-500 leading-relaxed">
                                            {profile.address && <div>{profile.address}</div>}
                                            {profile.email_contact && <div>{profile.email_contact}</div>}
                                            {profile.phone && <div>{profile.phone}</div>}
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <h1 className="text-4xl font-light text-slate-800 uppercase mb-2 tracking-wide">{isInvoice ? 'Facture' : 'Devis'}</h1>
                                        <p className="font-mono text-lg font-bold text-slate-600">N° {doc.number}</p>
                                        <p className="text-sm text-slate-500 mt-1">Date : {formatDate(doc.date)}</p>
                                    </div>
                                </div>
                                
                                {/* --- DESTINATAIRE --- */}
                                <div className="flex justify-end mb-16">
                                    <div className="w-1/3 text-left pl-4 border-l-4 border-slate-900">
                                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">{isInvoice ? 'Facturé à' : 'Adressé à'}</p>
                                        <p className="text-lg font-bold text-slate-900 leading-tight mb-1">{doc.client_name || "Nom du client"}</p>
                                        <p className="text-sm text-slate-600 whitespace-pre-line leading-relaxed">{doc.client_address}</p>
                                    </div>
                                </div>

                                {/* --- TABLEAU --- */}
                                <table className="w-full mb-12">
                                    <thead>
                                        <tr>
                                            <th className="text-left py-3 text-[10px] font-bold text-slate-400 uppercase tracking-widest border-b border-slate-200">Description</th>
                                            <th className="text-right py-3 text-[10px] font-bold text-slate-400 uppercase tracking-widest border-b border-slate-200">Qté</th>
                                            <th className="text-right py-3 text-[10px] font-bold text-slate-400 uppercase tracking-widest border-b border-slate-200">Prix Unit.</th>
                                            <th className="text-right py-3 text-[10px] font-bold text-slate-400 uppercase tracking-widest border-b border-slate-200">Total</th>
                                        </tr>
                                    </thead>
                                    <tbody className="text-sm text-slate-700">
                                        {doc.items.map((item, i) => (
                                            <tr key={i} className="border-b border-slate-50 last:border-b-0">
                                                <td className="py-4 font-medium">{item.desc}</td>
                                                <td className="py-4 text-right">{item.qty}</td>
                                                <td className="py-4 text-right">{formatCurrency(item.price)}</td>
                                                <td className="py-4 text-right font-bold text-slate-900">{formatCurrency(item.qty * item.price)}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>

                                {/* --- TOTAUX --- */}
                                <div className="flex justify-end mb-12">
                                    <div className="w-1/3 text-right space-y-3">
                                        <div className="flex justify-between text-xs text-slate-500">
                                            <span>Total HT</span><span>{formatCurrency(subTotal)}</span>
                                        </div>
                                        <div className="flex justify-between text-xs text-slate-500">
                                            <span>TVA ({doc.taxRate}%)</span><span>{formatCurrency(taxAmount)}</span>
                                        </div>
                                        <div className="flex justify-between text-xl font-bold text-slate-900 pt-4 border-t border-slate-900">
                                            <span>Total TTC</span><span>{formatCurrency(total)}</span>
                                        </div>
                                        {doc.taxRate === 0 && <p className="text-[10px] text-slate-400 italic">TVA non applicable</p>}
                                    </div>
                                </div>
                            </div>

                            {/* --- PIED DE PAGE FIXE --- */}
                            <div className="invoice-footer border-t border-slate-100 pt-8">
                                <div className="grid grid-cols-2 gap-12 items-end">
                                    <div className="text-left">
                                        <p className="font-bold text-slate-800 mb-2 uppercase tracking-wide text-[10px]">Informations de paiement</p>
                                        <div className="text-[11px] text-slate-500 space-y-1">
                                            <p>IBAN : <span className="font-mono text-slate-700 font-bold">{profile.iban || "---"}</span></p>
                                            <p>BIC : <span className="font-mono text-slate-700 font-bold">{profile.bic || "---"}</span></p>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <p className="font-bold text-slate-800 mb-2 uppercase tracking-wide text-[10px]">Note</p>
                                        <p className="text-[11px] text-slate-500 whitespace-pre-wrap leading-relaxed italic">{doc.notes}</p>
                                    </div>
                                </div>
                                <div className="mt-8 text-center text-[10px] text-slate-300 font-medium tracking-widest uppercase">
                                    {companyDisplayName} - SIRET {profile.siret}
                                </div>
                            </div>

                        </div>
                    </div>
                </div>
            </div>
        );
    };

    // --- 4. LISTE DES DOCUMENTS ---
    const DocumentList = ({ type }) => {
        const list = type === 'quote' ? quotes : invoices;
        const [docToEdit, setDocToEdit] = useState(null);
        const [isCreating, setIsCreating] = useState(false);
        const [filterStatus, setFilterStatus] = useState('all');

        const openEditor = (doc = null) => { setDocToEdit(doc); setIsCreating(true); };
        const closeEditor = () => { setDocToEdit(null); setIsCreating(false); };

        const convertToInvoice = (quote) => {
            if(!window.confirm("Créer une facture à partir de ce devis ?")) return;
            const year = new Date().getFullYear();
            const count = invoices.length + 1;
            const newInvoiceNumber = `FACT-${year}-${count.toString().padStart(3, '0')}`;
            const newInvoice = { ...quote, id: Date.now(), number: newInvoiceNumber, status: 'Draft', date: new Date().toISOString(), type: 'invoice' };
            updateData({ ...data, invoices: [newInvoice, ...invoices] });
            alert(`Facture brouillon ${newInvoiceNumber} créée !`);
        };

        const handleStatusChange = (doc, newStatus) => {
            let updatedList = list.map(d => d.id === doc.id ? { ...d, status: newStatus } : d);
            let updatedBudget = { ...data.budget };
            if (type === 'invoice' && newStatus === 'Paid' && doc.status !== 'Paid') {
                if (!doc.target_account_id) return alert("Erreur : Aucun compte bancaire associé.");
                const newTransaction = { id: Date.now(), date: new Date().toISOString(), amount: doc.total, type: 'income', description: `Facture ${doc.number} - ${doc.client_name}`, accountId: doc.target_account_id, archived: false };
                updatedBudget.transactions = [newTransaction, ...updatedBudget.transactions];
                alert(`✅ Transaction de ${formatCurrency(doc.total)} ajoutée au compte !`);
            }
            const listName = type === 'quote' ? 'quotes' : 'invoices';
            updateData({ ...data, [listName]: updatedList, budget: updatedBudget });
        };

        const deleteDoc = (id) => {
            if (window.confirm("Supprimer ce document ?")) {
                const listName = type === 'quote' ? 'quotes' : 'invoices';
                const table = type === 'quote' ? 'quotes' : 'invoices';
                updateData({ ...data, [listName]: list.filter(d => d.id !== id) }, { table, id });
            }
        };

        const getStatusBadge = (status) => {
            const styles = {
                Draft: 'bg-slate-100 text-slate-600 border-slate-200 dark:bg-slate-700 dark:text-slate-300 dark:border-slate-600',
                Sent: 'bg-blue-50 text-blue-600 border-blue-100 dark:bg-blue-900/20 dark:text-blue-400 dark:border-blue-900/50',
                Paid: 'bg-emerald-50 text-emerald-600 border-emerald-100 dark:bg-emerald-900/20 dark:text-emerald-400 dark:border-emerald-900/50',
                Accepted: 'bg-purple-50 text-purple-600 border-purple-100 dark:bg-purple-900/20 dark:text-purple-400 dark:border-purple-900/50',
                Rejected: 'bg-red-50 text-red-600 border-red-100 dark:bg-red-900/20 dark:text-red-400 dark:border-red-900/50',
            };
            const labels = { Draft: 'Brouillon', Sent: 'Envoyé', Paid: 'Payée', Accepted: 'Accepté', Rejected: 'Refusé' };
            return (
                <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold border ${styles[status] || styles.Draft}`}>
                    {labels[status] || status}
                </span>
            );
        };

        const filteredList = list.filter(d => filterStatus === 'all' || d.status === filterStatus);

        return (
            <div className="space-y-6">
                <FinancialSummary />
                <div className="flex justify-between items-center bg-white dark:bg-slate-800 p-4 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm">
                    <div className="flex items-center gap-4">
                        <h3 className="text-xl font-bold text-slate-800 dark:text-white capitalize flex items-center gap-2">
                            {type === 'quote' ? <FileText className="text-blue-500"/> : <Wallet className="text-emerald-500"/>}
                            {type === 'quote' ? 'Mes Devis' : 'Mes Factures'}
                        </h3>
                        <div className="h-6 w-[1px] bg-slate-200 dark:bg-slate-700"></div>
                        <div className="flex gap-2">
                            {['all', 'Draft', 'Sent', type === 'invoice' ? 'Paid' : 'Accepted'].map(s => (
                                <button key={s} onClick={() => setFilterStatus(s)} className={`px-3 py-1 rounded-lg text-xs font-bold transition-colors ${filterStatus === s ? 'bg-slate-900 text-white dark:bg-white dark:text-black' : 'text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-700'}`}>{s === 'all' ? 'Tout' : s}</button>
                            ))}
                        </div>
                    </div>
                    <button onClick={() => openEditor(null)} className="bg-amber-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 text-sm font-bold hover:bg-amber-700 transition-colors shadow-lg shadow-amber-600/20"><Plus size={16}/> Créer</button>
                </div>
                {isCreating && <DocumentEditor type={type} initialDoc={docToEdit} onClose={closeEditor} />}
                <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden shadow-sm">
                    <table className="w-full text-left text-sm text-slate-700 dark:text-slate-300">
                        <thead className="bg-slate-50 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-700 text-slate-500 uppercase font-bold text-xs">
                            <tr>
                                <th className="p-4">Numéro</th>
                                <th className="p-4">Client</th>
                                <th className="p-4">Date</th>
                                <th className="p-4 text-right">Montant TTC</th>
                                <th className="p-4 text-center">Statut</th>
                                <th className="p-4 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                            {filteredList.length === 0 && <tr><td colSpan="6" className="p-12 text-center text-slate-400 italic">Aucun document trouvé.</td></tr>}
                            {filteredList.map(doc => (
                                <tr key={doc.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors group">
                                    <td className="p-4 font-mono font-bold text-slate-700 dark:text-slate-200">{doc.number}</td>
                                    <td className="p-4 font-medium text-slate-900 dark:text-white">{doc.client_name}</td>
                                    <td className="p-4 text-slate-500">{formatDate(doc.date)}</td>
                                    <td className="p-4 text-right font-bold text-slate-900 dark:text-white">{formatCurrency(doc.total)}</td>
                                    <td className="p-4 text-center">
                                        <div className="relative group/status inline-block">
                                            {getStatusBadge(doc.status)}
                                            <select value={doc.status} onChange={(e) => handleStatusChange(doc, e.target.value)} className="absolute inset-0 opacity-0 cursor-pointer">
                                                <option value="Draft" className="text-slate-800 dark:text-slate-200 dark:bg-slate-800">Brouillon</option>
                                                <option value="Sent" className="text-slate-800 dark:text-slate-200 dark:bg-slate-800">Envoyé</option>
                                                {type === 'invoice' ? <option value="Paid" className="text-slate-800 dark:text-slate-200 dark:bg-slate-800">Payée</option> : <option value="Accepted" className="text-slate-800 dark:text-slate-200 dark:bg-slate-800">Accepté</option>}
                                                {type === 'quote' && <option value="Rejected" className="text-slate-800 dark:text-slate-200 dark:bg-slate-800">Refusé</option>}
                                            </select>
                                        </div>
                                    </td>
                                    <td className="p-4 text-right flex justify-end gap-2 opacity-60 group-hover:opacity-100 transition-opacity">
                                        <button onClick={() => openEditor(doc)} title="Modifier / Imprimer" className="p-2 text-slate-400 hover:text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-900/20 rounded-lg transition-colors"><Pencil size={16}/></button>
                                        {type === 'quote' && <button onClick={() => convertToInvoice(doc)} title="Convertir en Facture" className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors"><ArrowRightLeft size={16}/></button>}
                                        <button onClick={() => deleteDoc(doc.id)} className="text-slate-400 hover:text-red-500 p-2 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"><Trash2 size={16}/></button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        );
    };

    return (
        <div className="fade-in p-6 pb-24 max-w-7xl mx-auto space-y-8">
            <div className="flex flex-col md:flex-row justify-between items-center gap-4">
                <h2 className="text-3xl font-bold text-slate-800 dark:text-white font-serif tracking-tight">Espace Client</h2>
                <div className="flex bg-white dark:bg-slate-800 p-1.5 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm">
                    {['clients', 'quotes', 'invoices', 'catalog'].map(tab => (
                        <button key={tab} onClick={() => setActiveTab(tab)} className={`px-5 py-2 rounded-lg text-sm font-bold transition-all ${activeTab === tab ? 'bg-slate-900 text-white dark:bg-white dark:text-black shadow-md' : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'}`}>
                            {tab === 'clients' && 'Clients'}
                            {tab === 'quotes' && 'Devis'}
                            {tab === 'invoices' && 'Factures'}
                            {tab === 'catalog' && 'Offres'}
                        </button>
                    ))}
                </div>
            </div>
            <div className="min-h-[500px]">
                {activeTab === 'clients' && <ClientsTab />}
                {activeTab === 'catalog' && <CatalogTab />}
                {activeTab === 'quotes' && <DocumentList type="quote" />}
                {activeTab === 'invoices' && <DocumentList type="invoice" />}
            </div>
        </div>
    );
}