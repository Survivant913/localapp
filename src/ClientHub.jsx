import { useState, useMemo } from 'react';
import { 
  Users, FileText, ShoppingBag, Plus, Search, 
  ChevronRight, CheckCircle2, AlertCircle, X, 
  Printer, Save, Trash2, Wallet, ArrowRight 
} from 'lucide-react';

export default function ClientHub({ data, updateData }) {
    const [activeTab, setActiveTab] = useState('clients'); // clients, quotes, invoices, catalog
    
    // --- DONNÉES ---
    const clients = data.clients || [];
    const catalog = data.catalog || []; // On va ajouter ça dans App.jsx après
    const quotes = data.quotes || [];   // Idem
    const invoices = data.invoices || []; // Idem
    const accounts = data.budget?.accounts || [];

    // --- UTILS ---
    const formatCurrency = (val) => new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(val || 0);
    const formatDate = (d) => new Date(d).toLocaleDateString('fr-FR');
    
    const generateNumber = (type) => {
        const prefix = type === 'quote' ? 'DEV' : 'FACT';
        const list = type === 'quote' ? quotes : invoices;
        const year = new Date().getFullYear();
        const count = list.filter(i => i.date.includes(year.toString())).length + 1;
        return `${prefix}-${year}-${count.toString().padStart(3, '0')}`;
    };

    // --- SOUS-COMPOSANTS (INTERNES) ---

    // 1. GESTION CLIENTS (Simple et efficace)
    const ClientsTab = () => {
        const [form, setForm] = useState(false);
        const [editing, setEditing] = useState(null);
        const [tempClient, setTempClient] = useState({ name: '', email: '', phone: '', address: '', contact_person: '' });

        const saveClient = () => {
            if (!tempClient.name) return alert('Nom requis');
            const newClient = { ...tempClient, id: editing ? editing.id : Date.now(), status: 'Active' };
            
            let newClientsList;
            if (editing) newClientsList = clients.map(c => c.id === editing.id ? newClient : c);
            else newClientsList = [newClient, ...clients];

            updateData({ ...data, clients: newClientsList });
            setForm(false); setEditing(null); setTempClient({ name: '', email: '', phone: '', address: '', contact_person: '' });
        };

        const deleteClient = (id) => {
            if (window.confirm('Supprimer ce client ?')) {
                updateData({ ...data, clients: clients.filter(c => c.id !== id) }, { table: 'clients', id });
            }
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
                            <input type="text" placeholder="Nom Entreprise *" value={tempClient.name} onChange={e => setTempClient({...tempClient, name: e.target.value})} className="p-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg outline-none" />
                            <input type="text" placeholder="Contact (Nom)" value={tempClient.contact_person} onChange={e => setTempClient({...tempClient, contact_person: e.target.value})} className="p-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg outline-none" />
                            <input type="email" placeholder="Email" value={tempClient.email} onChange={e => setTempClient({...tempClient, email: e.target.value})} className="p-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg outline-none" />
                            <input type="text" placeholder="Téléphone" value={tempClient.phone} onChange={e => setTempClient({...tempClient, phone: e.target.value})} className="p-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg outline-none" />
                            <textarea placeholder="Adresse complète" value={tempClient.address} onChange={e => setTempClient({...tempClient, address: e.target.value})} className="md:col-span-2 p-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg outline-none h-20 resize-none" />
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

    // 2. CATALOGUE (Offres)
    const CatalogTab = () => {
        const [newItem, setNewItem] = useState({ name: '', price: '' });

        const addItem = () => {
            if (!newItem.name || !newItem.price) return;
            const item = { ...newItem, id: Date.now(), price: parseFloat(newItem.price) };
            updateData({ ...data, catalog: [...catalog, item] });
            setNewItem({ name: '', price: '' });
        };

        const deleteItem = (id) => {
            updateData({ ...data, catalog: catalog.filter(i => i.id !== id) }, { table: 'catalog_items', id });
        };

        return (
            <div className="space-y-6">
                <div className="bg-white dark:bg-slate-800 p-4 rounded-xl border border-slate-200 dark:border-slate-700 flex flex-col md:flex-row gap-4 items-end">
                    <div className="flex-1 w-full">
                        <label className="text-xs font-bold text-slate-500 uppercase">Service / Produit</label>
                        <input type="text" value={newItem.name} onChange={e => setNewItem({...newItem, name: e.target.value})} className="w-full p-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg outline-none" placeholder="Ex: Création Logo" />
                    </div>
                    <div className="w-32">
                        <label className="text-xs font-bold text-slate-500 uppercase">Prix (€)</label>
                        <input type="number" value={newItem.price} onChange={e => setNewItem({...newItem, price: e.target.value})} className="w-full p-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg outline-none" placeholder="0.00" />
                    </div>
                    <button onClick={addItem} className="w-full md:w-auto px-6 py-2 bg-purple-600 text-white rounded-lg font-bold hover:bg-purple-700 h-[42px]">Ajouter</button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {catalog.map(item => (
                        <div key={item.id} className="flex justify-between items-center p-4 bg-white dark:bg-slate-800 rounded-xl border border-slate-100 dark:border-slate-700">
                            <div>
                                <div className="font-bold text-slate-800 dark:text-white">{item.name}</div>
                                <div className="text-purple-600 font-mono text-sm">{formatCurrency(item.price)}</div>
                            </div>
                            <button onClick={() => deleteItem(item.id)} className="text-slate-400 hover:text-red-500"><Trash2 size={18}/></button>
                        </div>
                    ))}
                </div>
            </div>
        );
    };

    // 3. ÉDITEUR DE DOCUMENTS (Commun Facture & Devis)
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
            items: [{ desc: '', qty: 1, price: 0 }],
            status: 'Draft',
            target_account_id: accounts[0]?.id || '', // Compte par défaut
            notes: isInvoice ? 'Paiement à réception.' : 'Validité 30 jours.'
        });

        const handleClientChange = (e) => {
            const c = clients.find(cl => cl.id.toString() === e.target.value);
            if (c) setDoc({ ...doc, client_id: c.id, client_name: c.name, client_address: c.address || '' });
        };

        const addItem = () => setDoc({ ...doc, items: [...doc.items, { desc: '', qty: 1, price: 0 }] });
        
        const updateItem = (index, field, value) => {
            const newItems = [...doc.items];
            newItems[index][field] = value;
            setDoc({ ...doc, items: newItems });
        };

        const total = doc.items.reduce((acc, i) => acc + (i.qty * i.price), 0);

        const saveDocument = () => {
            if (!doc.client_id) return alert('Veuillez sélectionner un client.');
            
            const finalDoc = { ...doc, total };
            const listName = isInvoice ? 'invoices' : 'quotes';
            const newList = [finalDoc, ...(isInvoice ? invoices : quotes)];
            
            updateData({ ...data, [listName]: newList });
            onClose();
        };

        return (
            <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
                <div className="bg-white dark:bg-slate-900 w-full max-w-4xl h-[90vh] rounded-2xl shadow-2xl overflow-hidden flex flex-col">
                    {/* Header Editor */}
                    <div className="p-4 border-b border-slate-200 dark:border-slate-700 flex justify-between items-center bg-slate-50 dark:bg-slate-800">
                        <h2 className="text-xl font-bold text-slate-800 dark:text-white flex items-center gap-2">
                            {isInvoice ? <FileText className="text-amber-500"/> : <ShoppingBag className="text-blue-500"/>}
                            Nouveau {isInvoice ? 'Facture' : 'Devis'}
                        </h2>
                        <button onClick={onClose} className="p-2 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-full"><X size={20}/></button>
                    </div>

                    <div className="flex-1 overflow-y-auto p-6 space-y-6">
                        {/* Top Config */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            <div>
                                <label className="text-xs font-bold text-slate-500 uppercase block mb-1">Client</label>
                                <select onChange={handleClientChange} className="w-full p-2 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg">
                                    <option value="">-- Sélectionner --</option>
                                    {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                                </select>
                                <textarea value={doc.client_address} readOnly className="w-full mt-2 p-2 bg-transparent text-xs text-slate-500 resize-none" placeholder="Adresse automatique..." />
                            </div>
                            <div>
                                <label className="text-xs font-bold text-slate-500 uppercase block mb-1">Détails</label>
                                <div className="space-y-2">
                                    <div className="flex justify-between items-center"><span className="text-sm">Numéro</span> <span className="font-mono font-bold">{doc.number}</span></div>
                                    <input type="date" value={doc.date} onChange={e => setDoc({...doc, date: e.target.value})} className="w-full p-1 bg-transparent border-b border-slate-200 text-sm" />
                                </div>
                            </div>
                            <div>
                                <label className="text-xs font-bold text-slate-500 uppercase block mb-1">Statut</label>
                                <select value={doc.status} onChange={e => setDoc({...doc, status: e.target.value})} className="w-full p-2 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg font-bold">
                                    <option value="Draft">Brouillon</option>
                                    <option value="Sent">Envoyé</option>
                                    {isInvoice ? <option value="Paid">Payée</option> : <option value="Accepted">Accepté</option>}
                                </select>
                                
                                {isInvoice && (
                                    <div className="mt-4">
                                        <label className="text-[10px] font-bold text-amber-600 uppercase block mb-1">Compte de réception</label>
                                        <select value={doc.target_account_id} onChange={e => setDoc({...doc, target_account_id: e.target.value})} className="w-full p-2 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg text-sm">
                                            {accounts.map(acc => <option key={acc.id} value={acc.id}>{acc.name}</option>)}
                                        </select>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Items */}
                        <div>
                            <table className="w-full text-left text-sm">
                                <thead className="text-slate-500 border-b border-slate-200">
                                    <tr><th className="py-2">Description</th><th className="py-2 w-20">Qté</th><th className="py-2 w-32">Prix</th><th className="py-2 w-10"></th></tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                                    {doc.items.map((item, i) => (
                                        <tr key={i}>
                                            <td className="py-2">
                                                <input type="text" value={item.desc} onChange={e => updateItem(i, 'desc', e.target.value)} className="w-full bg-transparent outline-none" placeholder="Description..." />
                                                {/* Mini catalogue helper */}
                                                <select onChange={e => {
                                                    const catItem = catalog.find(c => c.name === e.target.value);
                                                    if(catItem) { updateItem(i, 'desc', catItem.name); updateItem(i, 'price', catItem.price); }
                                                }} className="w-4 opacity-50"><option></option>{catalog.map(c => <option key={c.id}>{c.name}</option>)}</select>
                                            </td>
                                            <td className="py-2"><input type="number" value={item.qty} onChange={e => updateItem(i, 'qty', Number(e.target.value))} className="w-full bg-transparent outline-none" /></td>
                                            <td className="py-2"><input type="number" value={item.price} onChange={e => updateItem(i, 'price', Number(e.target.value))} className="w-full bg-transparent outline-none" /></td>
                                            <td className="py-2 text-red-500 cursor-pointer" onClick={() => setDoc({...doc, items: doc.items.filter((_, idx) => idx !== i)})}>×</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                            <button onClick={addItem} className="mt-2 text-xs font-bold text-blue-500 hover:underline">+ Ajouter une ligne</button>
                        </div>

                        {/* Total */}
                        <div className="flex justify-end">
                            <div className="text-right">
                                <p className="text-sm text-slate-500">Total HT</p>
                                <p className="text-3xl font-bold text-slate-800 dark:text-white">{formatCurrency(total)}</p>
                            </div>
                        </div>
                    </div>

                    <div className="p-4 border-t border-slate-200 dark:border-slate-700 flex justify-end gap-3 bg-slate-50 dark:bg-slate-800">
                        <button onClick={onClose} className="px-4 py-2 text-slate-500 hover:text-slate-800">Annuler</button>
                        <button onClick={saveDocument} className="px-6 py-2 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 flex items-center gap-2">
                            <Save size={18}/> Enregistrer
                        </button>
                    </div>
                </div>
            </div>
        );
    };

    // 4. LISTE DES DOCUMENTS (Display List)
    const DocumentList = ({ type }) => {
        const list = type === 'quote' ? quotes : invoices;
        const [editorOpen, setEditorOpen] = useState(false);

        // --- PONT LOGIQUE : PAIEMENT ---
        const handleStatusChange = (doc, newStatus) => {
            // 1. Mise à jour du statut
            let updatedList = list.map(d => d.id === doc.id ? { ...d, status: newStatus } : d);
            let updatedBudget = { ...data.budget };

            // 2. Si passage à "Paid" pour une facture -> Création Transaction
            if (type === 'invoice' && newStatus === 'Paid' && doc.status !== 'Paid') {
                if (!doc.target_account_id) return alert("Erreur : Aucun compte bancaire associé à cette facture. Modifiez-la pour choisir un compte.");
                
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
                alert(`Transaction de ${formatCurrency(doc.total)} ajoutée au budget !`);
            }

            // 3. Mise à jour globale
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
                <div className="flex justify-between items-center">
                    <h3 className="text-xl font-bold text-slate-800 dark:text-white capitalize">{type === 'quote' ? 'Devis' : 'Factures'}</h3>
                    <button onClick={() => setEditorOpen(true)} className="bg-amber-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 text-sm font-bold hover:bg-amber-700 transition-colors">
                        <Plus size={16}/> Créer
                    </button>
                </div>

                {editorOpen && <DocumentEditor type={type} onClose={() => setEditorOpen(false)} />}

                <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
                    <table className="w-full text-left text-sm">
                        <thead className="bg-slate-50 dark:bg-slate-900 text-slate-500 uppercase font-bold text-xs">
                            <tr>
                                <th className="p-4">N°</th>
                                <th className="p-4">Client</th>
                                <th className="p-4">Date</th>
                                <th className="p-4">Montant</th>
                                <th className="p-4">Statut</th>
                                <th className="p-4 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                            {list.length === 0 && <tr><td colSpan="6" className="p-8 text-center text-slate-400 italic">Aucun document.</td></tr>}
                            {list.map(doc => (
                                <tr key={doc.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/50">
                                    <td className="p-4 font-mono font-bold text-slate-700 dark:text-slate-300">{doc.number}</td>
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
                                    <td className="p-4 text-right">
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
            {/* Header / Nav */}
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

            {/* Content */}
            <div className="min-h-[500px]">
                {activeTab === 'clients' && <ClientsTab />}
                {activeTab === 'catalog' && <CatalogTab />}
                {activeTab === 'quotes' && <DocumentList type="quote" />}
                {activeTab === 'invoices' && <DocumentList type="invoice" />}
            </div>
        </div>
    );
}