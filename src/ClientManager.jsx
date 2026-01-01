import { useState } from 'react';
import { 
  Users, Plus, Search, Mail, Phone, MapPin, 
  Edit, Trash2, Building2, User 
} from 'lucide-react';

export default function ClientManager({ data, updateData }) {
    // --- ETATS ---
    const [clients, setClients] = useState(data.clients || []);
    const [isEditing, setIsEditing] = useState(false);
    const [showForm, setShowForm] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    
    // Formulaire
    const [formData, setFormData] = useState({
        id: null,
        name: '',
        contact_person: '',
        email: '',
        phone: '',
        address: ''
    });

    // --- ACTIONS ---
    const handleSave = () => {
        if (!formData.name) return alert("Le nom est obligatoire");

        let newClients;
        if (isEditing) {
            newClients = clients.map(c => c.id === formData.id ? { ...formData, status: c.status } : c);
        } else {
            const newClient = { ...formData, id: Date.now(), status: 'Active' };
            newClients = [newClient, ...clients];
        }

        // Mise à jour globale
        updateData({ ...data, clients: newClients });
        resetForm();
    };

    const handleEdit = (client) => {
        setFormData(client);
        setIsEditing(true);
        setShowForm(true);
    };

    const handleDelete = (id) => {
        if (window.confirm("Supprimer ce client ?")) {
            const newClients = clients.filter(c => c.id !== id);
            // On envoie une requête de suppression spécifique pour Supabase
            updateData({ ...data, clients: newClients }, { table: 'clients', id: id });
        }
    };

    const resetForm = () => {
        setFormData({ id: null, name: '', contact_person: '', email: '', phone: '', address: '' });
        setIsEditing(false);
        setShowForm(false);
    };

    // --- FILTRAGE ---
    const filteredClients = clients.filter(c => 
        c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (c.contact_person && c.contact_person.toLowerCase().includes(searchTerm.toLowerCase()))
    );

    return (
        <div className="fade-in p-6 pb-24 max-w-6xl mx-auto space-y-6">
            
            {/* EN-TÊTE */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h2 className="text-2xl font-bold text-slate-800 dark:text-white flex items-center gap-2">
                        <Users className="text-blue-600 dark:text-blue-400"/> Gestion Clients
                    </h2>
                    <p className="text-slate-500 dark:text-slate-400 text-sm">Gérez votre carnet d'adresses professionnel.</p>
                </div>
                <button 
                    onClick={() => { resetForm(); setShowForm(!showForm); }} 
                    className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-xl font-bold flex items-center gap-2 transition-colors shadow-lg shadow-blue-500/20"
                >
                    {showForm ? 'Fermer' : <><Plus size={18}/> Nouveau Client</>}
                </button>
            </div>

            {/* FORMULAIRE */}
            {showForm && (
                <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 animate-in slide-in-from-top-4">
                    <h3 className="font-bold text-slate-800 dark:text-white mb-4 uppercase text-xs tracking-wider">
                        {isEditing ? 'Modifier la fiche' : 'Ajouter un client'}
                    </h3>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                        <div className="space-y-1">
                            <label className="text-xs text-slate-500 font-bold">Nom / Entreprise *</label>
                            <input 
                                type="text" 
                                value={formData.name}
                                onChange={e => setFormData({...formData, name: e.target.value})}
                                placeholder="Ex: Acme Corp"
                                className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:border-blue-500 dark:text-white"
                            />
                        </div>
                        <div className="space-y-1">
                            <label className="text-xs text-slate-500 font-bold">Contact Principal</label>
                            <input 
                                type="text" 
                                value={formData.contact_person}
                                onChange={e => setFormData({...formData, contact_person: e.target.value})}
                                placeholder="Ex: Jean Dupont"
                                className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:border-blue-500 dark:text-white"
                            />
                        </div>
                        <div className="space-y-1">
                            <label className="text-xs text-slate-500 font-bold">Email</label>
                            <input 
                                type="email" 
                                value={formData.email}
                                onChange={e => setFormData({...formData, email: e.target.value})}
                                placeholder="contact@client.com"
                                className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:border-blue-500 dark:text-white"
                            />
                        </div>
                        <div className="space-y-1">
                            <label className="text-xs text-slate-500 font-bold">Téléphone</label>
                            <input 
                                type="tel" 
                                value={formData.phone}
                                onChange={e => setFormData({...formData, phone: e.target.value})}
                                placeholder="06 12 34 56 78"
                                className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:border-blue-500 dark:text-white"
                            />
                        </div>
                        <div className="md:col-span-2 space-y-1">
                            <label className="text-xs text-slate-500 font-bold">Adresse Complète</label>
                            <input 
                                type="text" 
                                value={formData.address}
                                onChange={e => setFormData({...formData, address: e.target.value})}
                                placeholder="10 Rue de la Paix, 75000 Paris"
                                className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:border-blue-500 dark:text-white"
                            />
                        </div>
                    </div>

                    <div className="flex justify-end gap-3">
                        <button onClick={resetForm} className="px-4 py-2 text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-white transition-colors">Annuler</button>
                        <button onClick={handleSave} className="bg-slate-900 dark:bg-white text-white dark:text-slate-900 px-6 py-2 rounded-xl font-bold hover:opacity-90 transition-opacity">
                            {isEditing ? 'Mettre à jour' : 'Enregistrer'}
                        </button>
                    </div>
                </div>
            )}

            {/* RECHERCHE & LISTE */}
            <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden min-h-[400px]">
                
                <div className="p-4 border-b border-slate-100 dark:border-slate-700">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                        <input 
                            type="text" 
                            placeholder="Rechercher un client..." 
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full pl-10 pr-4 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:border-blue-500 dark:text-white"
                        />
                    </div>
                </div>

                <div className="p-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {filteredClients.length === 0 ? (
                        <div className="col-span-full flex flex-col items-center justify-center py-12 text-slate-400 opacity-60">
                            <Users size={48} strokeWidth={1} />
                            <p className="mt-2 text-sm">Aucun client trouvé.</p>
                        </div>
                    ) : (
                        filteredClients.map(client => (
                            <div key={client.id} className="group relative bg-slate-50 dark:bg-slate-700/30 border border-slate-100 dark:border-slate-700 hover:border-blue-400 dark:hover:border-blue-500 p-5 rounded-2xl transition-all">
                                <div className="flex justify-between items-start mb-3">
                                    <div className="w-10 h-10 rounded-full bg-slate-200 dark:bg-slate-600 flex items-center justify-center text-lg font-bold text-slate-600 dark:text-slate-200">
                                        {client.name.charAt(0).toUpperCase()}
                                    </div>
                                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <button onClick={() => handleEdit(client)} className="p-2 text-slate-400 hover:text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg">
                                            <Edit size={16} />
                                        </button>
                                        <button onClick={() => handleDelete(client.id)} className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg">
                                            <Trash2 size={16} />
                                        </button>
                                    </div>
                                </div>

                                <h3 className="font-bold text-slate-800 dark:text-white truncate" title={client.name}>{client.name}</h3>
                                {client.contact_person && (
                                    <p className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1 mb-3">
                                        <User size={12}/> {client.contact_person}
                                    </p>
                                )}

                                <div className="space-y-2 mt-4 pt-3 border-t border-slate-200 dark:border-slate-600/50">
                                    {client.email && (
                                        <div className="flex items-center gap-2 text-xs text-slate-600 dark:text-slate-300">
                                            <Mail size={14} className="text-slate-400"/> 
                                            <a href={`mailto:${client.email}`} className="hover:underline truncate">{client.email}</a>
                                        </div>
                                    )}
                                    {client.phone && (
                                        <div className="flex items-center gap-2 text-xs text-slate-600 dark:text-slate-300">
                                            <Phone size={14} className="text-slate-400"/> 
                                            <a href={`tel:${client.phone}`} className="hover:underline">{client.phone}</a>
                                        </div>
                                    )}
                                    {client.address && (
                                        <div className="flex items-start gap-2 text-xs text-slate-600 dark:text-slate-300">
                                            <MapPin size={14} className="text-slate-400 shrink-0 mt-0.5"/> 
                                            <span className="line-clamp-2">{client.address}</span>
                                        </div>
                                    )}
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>
        </div>
    );
}