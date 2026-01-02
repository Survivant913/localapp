import { useState } from 'react';
import { 
  Users, FileText, ShoppingBag, Plus, Search, 
  ChevronRight, CheckCircle2, AlertCircle, X, 
  Printer, Save, Trash2, Wallet, ArrowRight,
  ZoomIn, ZoomOut, Download, Sparkles,
  ArrowRightLeft, TrendingUp, Clock, Check
} from 'lucide-react';

export default function ClientHub({ data, updateData }) {
    const [activeTab, setActiveTab] = useState('invoices'); 
    
    // --- DONNÉES ---
    const clients = data.clients || [];
    const catalog = data.catalog || [];
    const quotes = data.quotes || [];
    const invoices = data.invoices || [];
    const accounts = data.budget?.accounts || [];
    const profile = data.profile || {}; 

    // --- UTILS ---
    const formatCurrency = (val) => new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(val || 0);
    const formatDate = (d) => new Date(d).toLocaleDateString('fr-FR');
    
    const generateNumber = (type) => {
        const prefix = type === 'quote' ? 'DEV' : 'FACT';
        const list = type === 'quote' ? quotes : invoices;
        const year = new Date().getFullYear();
        const count = list.length + 1; 
        return `${prefix}-${year}-${count.toString().padStart(3, '0')}`;
    };

    // --- 0. COMPOSANT : RÉSUMÉ FINANCIER (Haut de page) ---
    const FinancialSummary = () => {
        // Calculs
        const pendingPayment = invoices
            .filter(i => i.status === 'Sent')
            .reduce((sum, i) => sum + (i.total || 0), 0);
        
        const acceptedQuotes = quotes
            .filter(q => q.status === 'Accepted')
            .reduce((sum, q) => sum + (q.total || 0), 0);

        const paidInvoices = invoices
            .filter(i => i.status === 'Paid')
            .reduce((sum, i) => sum + (i.total || 0), 0);

        return (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6 animate-in slide-in-from-top-4">
                <div className="bg-white dark:bg-slate-800 p-4 rounded-xl border border-orange-100 dark:border-slate-700 shadow-sm flex items-center gap-4">
                    <div className="p-3 rounded-full bg-orange-100 text-orange-600"><Clock size={24}/></div>
                    <div>
                        <p className="text-xs font-bold text-slate-500 uppercase">Paiements en attente</p>
                        <p className="text-2xl font-bold text-slate-800 dark:text-white">{formatCurrency(pendingPayment)}</p>
                    </div>
                </div>
                <div className="bg-white dark:bg-slate-800 p-4 rounded-xl border border-blue-100 dark:border-slate-700 shadow-sm flex items-center gap-4">
                    <div className="p-3 rounded-full bg-blue-100 text-blue-600"><FileText size={24}/></div>
                    <div>
                        <p className="text-xs font-bold text-slate-500 uppercase">Devis à facturer</p>
                        <p className="text-2xl font-bold text-slate-800 dark:text-white">{formatCurrency(acceptedQuotes)}</p>
                    </div>
                </div>
                <div className="bg-white dark:bg-slate-800 p-4 rounded-xl border border-emerald-100 dark:border-slate-700 shadow-sm flex items-center gap-4">
                    <div className="p-3 rounded-full bg-emerald-100 text-emerald-600"><CheckCircle2 size={24}/></div>
                    <div>
                        <p className="text-xs font-bold text-slate-500 uppercase">Encaissé (Total)</p>
                        <p className="text-2xl font-bold text-slate-800 dark:text-white">{formatCurrency(paidInvoices)}</p>
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

        return (
            <div className="space-y-6">
                <div className="flex justify-between items-center">
                    <h3 className="text-xl font-bold text-slate-800 dark:text-white">Carnet d'adresses</h3>
                    <button onClick={() => { setEditing(null); setTempClient({ name: '' }); setForm(true); }} className="bg-blue-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 text-sm font-bold hover:bg-blue-700 transition-colors">
                        <Plus size={16}/> Nouveau Client
                    </button>
                </div>
                {form && (
                    <div className="bg-white dark:bg-slate-800 p-6 rounded-xl border border-blue-100 dark:border-slate-700 shadow-lg animate-in slide-in-from-top-2">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                            <input type="text" placeholder="Nom Entreprise *" value={tempClient.name} onChange={e => setTempClient({...tempClient, name: e.target.value})} className="p-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg outline-none text-slate-800 dark:text-white" />
                            <input type="text" placeholder="Contact (Nom)" value={tempClient.contact_person} onChange={e => setTempClient({...tempClient, contact_person: e.target.value})} className="p-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg outline-none text-slate-800 dark:text-white" />
                            <input type="email" placeholder="Email" value={tempClient.email} onChange={e => setTempClient({...tempClient, email: e.target.value})} className="p-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg outline-none text-slate-800 dark:text-white" />
                            <input type="text" placeholder="Téléphone" value={tempClient.phone} onChange={e => setTempClient({...tempClient, phone: e.target.value})} className="p-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg outline-none text-slate-800 dark:text-white" />
                            <textarea placeholder="Adresse complète" value={tempClient.address} onChange={e => setTempClient({...tempClient, address: e.target.value})} className="md:col-span-2 p-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg outline-none h-20 resize-none text-slate-800 dark:text-white" />
                        </div>
                        <div className="flex justify-end gap-2">
                            <button onClick={() => setForm(false)} className="px-4 py-2 text-slate-500 hover:text-slate-800">Annuler</button>
                            <button onClick={saveClient} className="px-6 py-2 bg-blue-600 text-white rounded-lg font-bold hover:bg-blue-700">Enregistrer</button>
                        </div>
                    </div>
                )}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {clients.map(client => (
                        <div key={client.id} className="bg-white dark:bg-slate-800 p-5 rounded-xl border border-slate-100 dark:border-slate-700 shadow-sm hover:border-blue-300 transition-all group">
                            <div className="flex justify-between items-start mb-2">
                                <div className="font-bold text-lg text-slate-800 dark:text-white truncate pr-2">{client.name}</div>
                                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <button onClick={() => { setEditing(client); setTempClient(client); setForm(true); }} className="p-1.5 text-slate-400 hover:text-blue-500 bg-slate-100 dark:bg-slate-700 rounded"><Users size={14}/></button>
                                    <button onClick={() => deleteClient(client.id)} className="p-1.5 text-slate-400 hover:text-red-500 bg-slate-100 dark:bg-slate-700 rounded"><Trash2 size={14}/></button>
                                </div>
                            </div>
                            <div className="text-sm text-slate-500 dark:text-slate-400 space-y-1">
                                {client.contact_person && <p>👤 {client.contact_person}</p>}
                                {client.email && <p>✉️ {client.email}</p>}
                                {client.phone && <p>📞 {client.phone}</p>}
                            </div>
                        </div>
                    ))}
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
                <div className="bg-white dark:bg-slate-800 p-4 rounded-xl border border-slate-200 dark:border-slate-700 flex flex-col md:flex-row gap-4 items-end">
                    <div className="flex-1 w-full">
                        <label className="text-xs font-bold text-slate-500 uppercase">Service / Produit</label>
                        <input type="text" value={newItem.name} onChange={e => setNewItem({...newItem, name: e.target.value})} className="w-full p-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg outline-none text-slate-800 dark:text-white" placeholder="Ex: Création Logo" />
                    </div>
                    <div className="w-32">
                        <label className="text-xs font-bold text-slate-500 uppercase">Prix (€)</label>
                        <input type="number" value={newItem.price} onChange={e => setNewItem({...newItem, price: e.target.value})} className="w-full p-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg outline-none text-slate-800 dark:text-white" placeholder="0.00" />
                    </div>
                    <button onClick={addItem} className="w-full md:w-auto px-6 py-2 bg-purple-600 text-white rounded-lg font-bold hover:bg-purple-700 h-[42px]">Ajouter</button>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {catalog.map(item => (
                        <div key={item.id} className="flex justify-between items-center p-4 bg-white dark:bg-slate-800 rounded-xl border border-slate-100 dark:border-slate-700">
                            <div><div className="font-bold text-slate-800 dark:text-white">{item.name}</div><div className="text-purple-600 font-mono text-sm">{formatCurrency(item.price)}</div></div>
                            <button onClick={() => deleteItem(item.id)} className="text-slate-400 hover:text-red-500"><Trash2 size={18}/></button>
                        </div>
                    ))}
                </div>
            </div>
        );
    };

    // --- 3. ÉDITEUR FACTURE / DEVIS (AMÉLIORÉ) ---
    const DocumentEditor = ({ type, onClose }) => {
        const isInvoice = type === 'invoice';
        
        const [doc, setDoc] = useState({
            id: Date.now(),
            number: generateNumber(type),
            date: new Date().toISOString().split('T')[0],
            dueDate: new Date(Date.now() + 30*24*60*60*1000).toISOString().split('T')[0],
            client_id: '',
            client_name: '',
            client_address: '',
            items: [{ desc: 'Prestation', qty: 1, price: 0 }],
            status: 'Draft',
            target_account_id: accounts[0]?.id || '',
            notes: isInvoice ? 'Paiement à réception.' : 'Validité du devis : 30 jours.',
            taxRate: 20
        });
        const [zoom, setZoom] = useState(0.65);

        const toggleAutoEntrepreneur = () => {
            const mention = 'TVA non applicable, art. 293 B du CGI.';
            setDoc(prev => {
                const isAE = prev.taxRate === 0 && prev.notes.includes(mention);
                if (isAE) {
                    return { ...prev, taxRate: 20, notes: prev.notes.replace(mention, '').replace(/\n\n$/, '').trim() };
                } else {
                    return { ...prev, taxRate: 0, notes: prev.notes.includes(mention) ? prev.notes : (prev.notes ? prev.notes + '\n\n' + mention : mention) };
                }
            });
        };

        const handleClientChange = (e) => {
            const c = clients.find(cl => cl.id.toString() === e.target.value);
            if (c) setDoc({ ...doc, client_id: c.id, client_name: c.name, client_address: (c.address || '') + (c.email ? '\n' + c.email : '') });
        };

        const addItem = () => setDoc({ ...doc, items: [...doc.items, { desc: '', qty: 1, price: 0 }] });
        
        const updateItem = (index, field, value) => {
            const newItems = [...doc.items];
            newItems[index][field] = value;
            setDoc({ ...doc, items: newItems });
        };

        // --- CALCULS AUTOMATIQUES ---
        const subTotal = doc.items.reduce((acc, i) => acc + (i.qty * i.price), 0);
        const taxAmount = subTotal * (doc.taxRate / 100);
        const total = subTotal + taxAmount;

        const saveDocument = () => {
            if (!doc.client_id) return alert('Veuillez sélectionner un client.');
            
            const finalDoc = { ...doc, subTotal, total };
            const listName = isInvoice ? 'invoices' : 'quotes';
            const newList = [finalDoc, ...(isInvoice ? invoices : quotes)];
            
            updateData({ ...data, [listName]: newList });
            onClose();
        };

        const handlePrint = () => window.print();

        return (
            <div className="fixed inset-0 bg-black/80 z-[100] flex flex-col overflow-hidden">
                {/* Toolbar */}
                <div className="bg-slate-900 p-4 border-b border-slate-700 flex justify-between items-center text-white no-print">
                    <h2 className="text-xl font-bold flex items-center gap-2">
                        {isInvoice ? <FileText className="text-amber-500"/> : <ShoppingBag className="text-blue-500"/>}
                        Nouveau {isInvoice ? 'Facture' : 'Devis'}
                    </h2>
                    <div className="flex items-center gap-4">
                        <div className="flex items-center gap-2 bg-slate-800 rounded-lg px-2 py-1 border border-slate-700">
                            <button onClick={() => setZoom(Math.max(0.4, zoom - 0.1))} className="p-1 hover:text-white text-slate-400"><ZoomOut size={16}/></button>
                            <span className="text-xs font-mono w-10 text-center">{Math.round(zoom * 100)}%</span>
                            <button onClick={() => setZoom(Math.min(1.5, zoom + 0.1))} className="p-1 hover:text-white text-slate-400"><ZoomIn size={16}/></button>
                        </div>
                        <button onClick={handlePrint} className="bg-white text-black px-4 py-2 rounded-lg font-bold text-sm hover:bg-slate-200 flex items-center gap-2">
                            <Printer size={16}/> Imprimer
                        </button>
                        <button onClick={saveDocument} className="bg-blue-600 text-white px-6 py-2 rounded-lg font-bold text-sm hover:bg-blue-700 flex items-center gap-2">
                            <Save size={16}/> Enregistrer
                        </button>
                        <button onClick={onClose} className="p-2 hover:bg-slate-800 rounded-full text-slate-400 hover:text-white"><X size={24}/></button>
                    </div>
                </div>

                <div className="flex flex-1 overflow-hidden">
                    {/* GAUCHE: ÉDITEUR */}
                    <div className="w-1/3 bg-slate-50 dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 overflow-y-auto p-6 space-y-6 no-print">
                        <div className="space-y-4">
                            <div>
                                <label className="text-xs font-bold text-slate-500 uppercase block mb-1">Client</label>
                                <select onChange={handleClientChange} className="w-full p-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm text-slate-800 dark:text-white outline-none">
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
                                    <select 
                                        value={doc.target_account_id} 
                                        onChange={e => setDoc({...doc, target_account_id: e.target.value})} 
                                        className="w-full p-2 bg-white dark:bg-slate-800 border border-amber-200 dark:border-amber-800 rounded-lg text-sm text-slate-800 dark:text-white outline-none"
                                    >
                                        <option value="">-- Choisir un compte --</option>
                                        {accounts.length > 0 ? (
                                            accounts.map(acc => <option key={acc.id} value={acc.id}>{acc.name}</option>)
                                        ) : (
                                            <option disabled>Aucun compte créé dans Budget</option>
                                        )}
                                    </select>
                                    <p className="text-[10px] text-amber-600/70 mt-1 italic">Le montant ira sur ce compte une fois la facture "Payée".</p>
                                </div>
                            )}

                            {/* BOUTON MODE AE */}
                            <div className="p-4 rounded-lg border border-slate-200 dark:border-slate-700">
                                <label className="text-xs font-bold text-slate-500 uppercase block mb-2">Options fiscales</label>
                                <button 
                                    onClick={toggleAutoEntrepreneur}
                                    className={`w-full py-2 px-3 rounded-lg text-xs font-bold flex items-center justify-center gap-2 transition-all border ${
                                        doc.taxRate === 0 && doc.notes.includes('293 B')
                                        ? 'bg-emerald-100 text-emerald-700 border-emerald-300 dark:bg-emerald-900/30 dark:text-emerald-400'
                                        : 'bg-slate-100 text-slate-600 border-slate-200 dark:bg-slate-800 dark:text-slate-400'
                                    }`}
                                >
                                    <Sparkles size={14}/>
                                    {doc.taxRate === 0 && doc.notes.includes('293 B') ? 'Mode AE Activé (TVA 0%)' : 'Activer Mode AE (TVA 0%)'}
                                </button>
                                {doc.taxRate !== 0 && (
                                    <div className="mt-2">
                                        <label className="text-[10px] text-slate-400">Taux TVA (%)</label>
                                        <input type="number" value={doc.taxRate} onChange={e => setDoc({...doc, taxRate: Number(e.target.value)})} className="w-full mt-1 p-1 bg-white dark:bg-slate-800 border rounded text-sm text-center"/>
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
                                                <select onChange={e => {
                                                    const catItem = catalog.find(c => c.name === e.target.value);
                                                    if(catItem) { updateItem(i, 'desc', catItem.name); updateItem(i, 'price', catItem.price); }
                                                }} className="w-full text-xs p-1 bg-slate-100 dark:bg-slate-700 rounded border-none outline-none text-slate-500">
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
                                    <button onClick={addItem} className="w-full py-2 border border-dashed border-slate-300 dark:border-slate-600 rounded text-xs font-bold text-slate-500 hover:text-blue-500 hover:border-blue-500">+ Ajouter ligne</button>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* DROITE: APERÇU A4 */}
                    <div className="flex-1 bg-slate-200/50 dark:bg-black/50 overflow-auto flex justify-center p-8 relative">
                        <div 
                            id="invoice-paper" 
                            style={{ 
                                width: '210mm', 
                                minHeight: '297mm', 
                                transform: `scale(${zoom})`, 
                                transformOrigin: 'top center',
                                boxShadow: '0 0 20px rgba(0,0,0,0.1)' 
                            }}
                            className="bg-white text-black p-12 flex flex-col shrink-0 transition-transform duration-200"
                        >
                            {/* EN-TÊTE FACTURE */}
                            <div className="flex justify-between items-start mb-12">
                                <div>
                                    {profile.logo ? (
                                        <img src={profile.logo} className="h-16 w-auto object-contain mb-4" alt="Logo"/> 
                                    ) : (
                                        <div className="text-2xl font-bold text-slate-800 mb-2">{profile.companyName || "Votre Entreprise"}</div>
                                    )}
                                    <div className="text-xs text-slate-500 leading-relaxed">
                                        {profile.name}<br/>
                                        {profile.address}<br/>
                                        {profile.email_contact}<br/>
                                        SIRET: {profile.siret}
                                    </div>
                                </div>
                                <div className="text-right">
                                    <h1 className="text-4xl font-light text-slate-800 uppercase mb-2">{isInvoice ? 'Facture' : 'Devis'}</h1>
                                    <p className="font-mono text-lg font-bold text-slate-600">N° {doc.number}</p>
                                    <p className="text-sm text-slate-500 mt-1">Date : {formatDate(doc.date)}</p>
                                </div>
                            </div>

                            {/* DESTINATAIRE */}
                            <div className="flex justify-end mb-16">
                                <div className="w-1/3 text-left">
                                    <p className="text-xs font-bold text-slate-400 uppercase mb-1">Client</p>
                                    <p className="text-lg font-bold text-slate-800">{doc.client_name || "Nom du client"}</p>
                                    <p className="text-sm text-slate-500 whitespace-pre-line">{doc.client_address}</p>
                                </div>
                            </div>

                            {/* TABLEAU */}
                            <table className="w-full mb-8">
                                <thead className="border-b-2 border-slate-100">
                                    <tr>
                                        <th className="text-left py-3 text-xs font-bold text-slate-500 uppercase">Description</th>
                                        <th className="text-right py-3 text-xs font-bold text-slate-500 uppercase">Qté</th>
                                        <th className="text-right py-3 text-xs font-bold text-slate-500 uppercase">Prix Unit.</th>
                                        <th className="text-right py-3 text-xs font-bold text-slate-500 uppercase">Total</th>
                                    </tr>
                                </thead>
                                <tbody className="text-sm text-slate-700">
                                    {doc.items.map((item, i) => (
                                        <tr key={i} className="border-b border-slate-50">
                                            <td className="py-4 font-medium">{item.desc}</td>
                                            <td className="py-4 text-right">{item.qty}</td>
                                            <td className="py-4 text-right">{formatCurrency(item.price)}</td>
                                            <td className="py-4 text-right font-bold">{formatCurrency(item.qty * item.price)}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>

                            {/* TOTALS */}
                            <div className="flex justify-end mb-12">
                                <div className="w-1/3 text-right space-y-2">
                                    <div className="flex justify-between text-sm text-slate-500">
                                        <span>Total HT</span>
                                        <span>{formatCurrency(subTotal)}</span>
                                    </div>
                                    <div className="flex justify-between text-sm text-slate-500">
                                        <span>TVA ({doc.taxRate}%)</span>
                                        <span>{formatCurrency(taxAmount)}</span>
                                    </div>
                                    <div className="flex justify-between text-lg font-bold text-slate-800 pt-4 border-t border-slate-100">
                                        <span>Total TTC</span>
                                        <span>{formatCurrency(total)}</span>
                                    </div>
                                    {doc.taxRate === 0 && (
                                        <p className="text-[10px] text-slate-400 italic">TVA non applicable</p>
                                    )}
                                </div>
                            </div>

                            {/* FOOTER */}
                            <div className="mt-auto pt-8 border-t border-slate-100 text-xs text-slate-500">
                                <div className="grid grid-cols-2 gap-8">
                                    <div>
                                        <p className="font-bold text-slate-700 mb-1">Informations de paiement</p>
                                        <p>IBAN : {profile.iban || "---"}</p>
                                        <p>BIC : {profile.bic || "---"}</p>
                                    </div>
                                    <div className="text-right">
                                        <p className="font-bold text-slate-700 mb-1">Note</p>
                                        <p className="whitespace-pre-wrap">{doc.notes}</p>
                                    </div>
                                </div>
                                <div className="mt-8 text-center text-[10px] text-slate-300">
                                    {profile.companyName} - SIRET {profile.siret}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* CSS PRINT */}
                <style>{`
                    @media print {
                        body * { visibility: hidden; }
                        #invoice-paper, #invoice-paper * { visibility: visible; }
                        #invoice-paper {
                            position: fixed; left: 0; top: 0; width: 100%; height: 100%; margin: 0; padding: 40px;
                            transform: none !important; box-shadow: none !important;
                        }
                    }
                `}</style>
            </div>
        );
    };

    // --- 4. LISTE DES DOCUMENTS (TABLEAU DE BORD) ---
    const DocumentList = ({ type }) => {
        const list = type === 'quote' ? quotes : invoices;
        const [editorOpen, setEditorOpen] = useState(false);

        // --- CONVERTIR DEVIS -> FACTURE (NOUVEAU) ---
        const convertToInvoice = (quote) => {
            if(!window.confirm("Créer une facture à partir de ce devis ?")) return;
            
            // On calcule le prochain numéro de facture
            const year = new Date().getFullYear();
            const count = invoices.length + 1;
            const newInvoiceNumber = `FACT-${year}-${count.toString().padStart(3, '0')}`;
            
            const newInvoice = {
                ...quote,
                id: Date.now(), // Nouvel ID
                number: newInvoiceNumber,
                status: 'Draft',
                date: new Date().toISOString(),
                type: 'invoice' // On change le type, le reste (items, client) est conservé
            };

            updateData({ ...data, invoices: [newInvoice, ...invoices] });
            alert(`Facture brouillon ${newInvoiceNumber} créée !`);
        };

        const handleStatusChange = (doc, newStatus) => {
            let updatedList = list.map(d => d.id === doc.id ? { ...d, status: newStatus } : d);
            let updatedBudget = { ...data.budget };

            if (type === 'invoice' && newStatus === 'Paid' && doc.status !== 'Paid') {
                if (!doc.target_account_id) return alert("Erreur : Aucun compte bancaire associé. Modifiez la facture pour en choisir un.");
                
                const newTransaction = {
                    id: Date.now(),
                    date: new Date().toISOString(),
                    amount: doc.total, 
                    type: 'income',
                    description: `Facture ${doc.number} - ${doc.client_name}`,
                    accountId: doc.target_account_id,
                    archived: false
                };

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

        return (
            <div className="space-y-6">
                <FinancialSummary />

                <div className="flex justify-between items-center">
                    <h3 className="text-xl font-bold text-slate-800 dark:text-white capitalize">{type === 'quote' ? 'Devis' : 'Factures'}</h3>
                    <button onClick={() => setEditorOpen(true)} className="bg-amber-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 text-sm font-bold hover:bg-amber-700 transition-colors">
                        <Plus size={16}/> Créer
                    </button>
                </div>

                {editorOpen && <DocumentEditor type={type} onClose={() => setEditorOpen(false)} />}

                <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
                    <table className="w-full text-left text-sm text-slate-700 dark:text-slate-300">
                        <thead className="bg-slate-50 dark:bg-slate-900 text-slate-500 uppercase font-bold text-xs">
                            <tr>
                                <th className="p-4">N°</th>
                                <th className="p-4">Client</th>
                                <th className="p-4">Date</th>
                                <th className="p-4">Montant TTC</th>
                                <th className="p-4">Statut</th>
                                <th className="p-4 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                            {list.length === 0 && <tr><td colSpan="6" className="p-8 text-center text-slate-400 italic">Aucun document.</td></tr>}
                            {list.map(doc => (
                                <tr key={doc.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/50">
                                    <td className="p-4 font-mono font-bold">{doc.number}</td>
                                    <td className="p-4 font-medium">{doc.client_name}</td>
                                    <td className="p-4 text-slate-500">{formatDate(doc.date)}</td>
                                    <td className="p-4 font-bold">{formatCurrency(doc.total)}</td>
                                    <td className="p-4">
                                        <select 
                                            value={doc.status} 
                                            onChange={(e) => handleStatusChange(doc, e.target.value)}
                                            className={`text-xs font-bold px-2 py-1 rounded border outline-none cursor-pointer ${
                                                doc.status === 'Paid' || doc.status === 'Accepted' ? 'bg-green-100 text-green-700 border-green-200' :
                                                doc.status === 'Sent' ? 'bg-blue-100 text-blue-700 border-blue-200' :
                                                'bg-slate-100 text-slate-600 border-slate-200'
                                            }`}
                                        >
                                            <option value="Draft">Brouillon</option>
                                            <option value="Sent">Envoyé</option>
                                            {type === 'invoice' ? <option value="Paid">Payée</option> : <option value="Accepted">Accepté</option>}
                                            {type === 'quote' && <option value="Rejected">Refusé</option>}
                                        </select>
                                    </td>
                                    <td className="p-4 text-right flex justify-end gap-2">
                                        {/* BOUTON CONVERTIR (Seulement pour les devis) */}
                                        {type === 'quote' && (
                                            <button onClick={() => convertToInvoice(doc)} title="Convertir en Facture" className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded">
                                                <ArrowRightLeft size={16}/>
                                            </button>
                                        )}
                                        <button onClick={() => deleteDoc(doc.id)} className="text-slate-400 hover:text-red-500 p-2"><Trash2 size={16}/></button>
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
                <h2 className="text-3xl font-bold text-slate-800 dark:text-white font-serif">Espace Client</h2>
                <div className="flex bg-slate-200 dark:bg-slate-800 p-1 rounded-xl">
                    {['clients', 'quotes', 'invoices', 'catalog'].map(tab => (
                        <button
                            key={tab}
                            onClick={() => setActiveTab(tab)}
                            className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${activeTab === tab ? 'bg-white dark:bg-slate-600 text-slate-800 dark:text-white shadow-sm' : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}
                        >
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