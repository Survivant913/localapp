import { useState, useRef, useEffect } from 'react';
import { Coffee, Palette, Eye, EyeOff, LogOut, Save } from 'lucide-react';

export default function ZenMode({ data, updateData, close }) {
    // On récupère le texte sauvegardé dans les settings, ou vide
    const [text, setText] = useState(data.settings?.zenNote || "");
    const [reveal, setReveal] = useState(false);
    const [themeKey, setThemeKey] = useState('minimal');
    const [isSaving, setIsSaving] = useState(false);
    const scrollRef = useRef(null);

    // Thèmes visuels
    const themes = {
        minimal: { name: 'Focus', bg: 'bg-slate-900', text: 'text-slate-300', font: 'font-sans', caret: 'caret-slate-500', border: 'border-slate-700' },
        light: { name: 'Page', bg: 'bg-stone-50', text: 'text-stone-800', font: 'font-serif', caret: 'caret-stone-500', border: 'border-stone-300' },
        hacker: { name: 'Matrix', bg: 'bg-black', text: 'text-green-500', font: 'font-mono', caret: 'caret-green-500', border: 'border-green-900' },
        ocean: { name: 'Océan', bg: 'bg-slate-950', text: 'text-cyan-100/80', font: 'font-sans', caret: 'caret-cyan-500', border: 'border-cyan-900' }
    };

    const currentTheme = themes[themeKey];

    // Sauvegarde Automatique Intelligente (Debounce 1.5s)
    useEffect(() => {
        const timer = setTimeout(() => {
            // On ne sauvegarde que si le texte a changé par rapport à la base de données
            if (text !== (data.settings?.zenNote || "")) {
                setIsSaving(true);
                updateData({ 
                    ...data, 
                    settings: { ...data.settings, zenNote: text } 
                });
                setTimeout(() => setIsSaving(false), 1000);
            }
        }, 1500); // Attend 1.5s après la dernière frappe

        return () => clearTimeout(timer);
    }, [text]);

    // Actions
    const cycleTheme = () => { 
        const keys = Object.keys(themes); 
        setThemeKey(keys[(keys.indexOf(themeKey) + 1) % keys.length]); 
    };

    // Petit algo de cryptage visuel (Décalage de caractères +13)
    const scramble = (str) => {
        return str.split('').map(char => {
            if (char === '\n' || char === ' ') return char;
            return String.fromCharCode(char.charCodeAt(0) + 13);
        }).join('');
    };

    return (
        <div className={`fixed inset-0 z-[100] flex flex-col p-6 md:p-16 animate-in fade-in duration-700 transition-colors ${currentTheme.bg} ${currentTheme.text} ${currentTheme.font}`}>
            
            {/* BARRE D'OUTILS (Visible au survol) */}
            <div className="flex justify-between items-center mb-8 opacity-40 hover:opacity-100 transition-opacity duration-500">
                <div className="flex items-center gap-3">
                    <Coffee size={24} />
                    <span className="text-xs tracking-[0.2em] uppercase font-bold">Mode Zen</span>
                    {isSaving && <span className="ml-4 flex items-center gap-1 text-[10px] animate-pulse"><Save size={10}/> Sauvegarde...</span>}
                </div>
                
                <div className="flex gap-3 items-center">
                    <button onClick={cycleTheme} title="Changer de thème" className={`p-2 border rounded-lg hover:bg-white/10 transition-colors ${currentTheme.border}`}>
                        <Palette size={18}/>
                    </button>
                    <button onClick={() => setReveal(!reveal)} title={reveal ? "Crypter" : "Décrypter"} className={`p-2 border rounded-lg hover:bg-white/10 transition-colors ${currentTheme.border}`}>
                        {reveal ? <Eye size={18}/> : <EyeOff size={18}/>}
                    </button>
                    <div className={`h-6 w-px ${currentTheme.border.replace('border', 'bg')}`}></div>
                    <button onClick={close} title="Quitter" className="p-2 border border-red-500/30 text-red-500 hover:bg-red-500/10 rounded-lg transition-colors">
                        <LogOut size={18}/>
                    </button>
                </div>
            </div>

            {/* ZONE D'ÉCRITURE */}
            <div className={`relative flex-1 w-full max-w-4xl mx-auto border-l-2 pl-4 md:pl-8 ${currentTheme.border}`}>
                
                {/* CALQUE CRYPTÉ (Arrière-plan) */}
                <div 
                    ref={scrollRef} 
                    className={`absolute inset-0 w-full h-full whitespace-pre-wrap break-words text-lg md:text-2xl leading-relaxed pointer-events-none overflow-hidden transition-opacity duration-500 ${reveal ? 'opacity-0' : 'opacity-100 blur-[0.5px]'}`}
                >
                    {scramble(text)}
                </div>

                {/* VRAIE ZONE DE SAISIE (Transparente si crypté) */}
                <textarea 
                    value={text} 
                    onChange={(e) => setText(e.target.value)} 
                    onScroll={(e) => { if(scrollRef.current) scrollRef.current.scrollTop = e.target.scrollTop; }} 
                    autoFocus 
                    className={`relative z-10 w-full h-full bg-transparent resize-none outline-none text-lg md:text-2xl leading-relaxed transition-all duration-300 ${currentTheme.caret} ${reveal ? 'text-current' : 'text-transparent selection:bg-white/10 selection:text-transparent'}`} 
                    spellCheck="false" 
                    placeholder="Écrivez librement..." 
                />
            </div>
        </div>
    );
}