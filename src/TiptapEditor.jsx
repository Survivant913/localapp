import React, { useEffect, useState, useRef } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Collaboration from '@tiptap/extension-collaboration';
import CollaborationCaret from '@tiptap/extension-collaboration-caret';
import * as Y from 'yjs';
import { SupabaseBroadcastProvider } from './SupabaseBroadcastProvider';
import { supabase } from './supabaseClient';
import { 
    Bold, Italic, Strikethrough, List, CheckSquare, 
    Heading, Pilcrow, Quote, Maximize2, Minimize2, Printer
} from 'lucide-react';

const colors = ['#958DF1', '#F98181', '#FBBC88', '#FAF594', '#70CFF8', '#94FADB', '#B9F18D'];

export default function TiptapEditor(props) {
    const ydocRef = useRef(null);
    const providerRef = useRef(null);

    // Initialize synchronously to avoid null or flicker
    if (!ydocRef.current) {
        ydocRef.current = new Y.Doc();
        providerRef.current = new SupabaseBroadcastProvider(ydocRef.current, supabase, `journal-${props.pageId}`);
    }

    useEffect(() => {
        return () => {
            if (providerRef.current) providerRef.current.destroy();
            if (ydocRef.current) ydocRef.current.destroy();
            // CRITICAL: clear refs so they are re-created on Strict Mode remount
            ydocRef.current = null;
            providerRef.current = null;
        };
    }, [props.pageId]);

    // Safety check just in case
    if (!ydocRef.current || !providerRef.current) {
        return null;
    }

    return <TiptapEditorCore {...props} ydoc={ydocRef.current} provider={providerRef.current} />;
}

function TiptapEditorCore({ pageId, initialTitle, initialContent, onUpdate, currentUserEmail, isZenMode, onToggleZenMode, onPrint, header, ydoc, provider }) {
    const [status, setStatus] = useState('connecting');
    const titleRef = useRef(null);

    useEffect(() => {
        if (titleRef.current) titleRef.current.value = initialTitle || 'Sans titre';

        const handleStatus = (args) => {
            if (Array.isArray(args)) {
                setStatus(args[0]?.status || 'connecting');
            } else if (args && args.status) {
                setStatus(args.status);
            }
        };

        provider.on('status', handleStatus);
        
        return () => {
            // cleanup if needed
        };
    }, [provider, initialTitle]);

    useEffect(() => {
        if (!editor || !initialContent) return;
        
        // Wait to see if we receive state from other users via broadcast
        const timer = setTimeout(() => {
            const fragment = ydoc.getXmlFragment('default');
            // If the document is still completely empty (no nodes at all), it means
            // we are the first user to open it, so we load the DB content.
            if (fragment.firstChild === null) {
                editor.commands.setContent(initialContent, false);
            }
        }, 600);
        
        return () => clearTimeout(timer);
    }, [editor, initialContent, ydoc]);

    const editor = useEditor({
        extensions: [
            StarterKit.configure({
                history: false,
            }),
            Collaboration.configure({
                document: ydoc,
            }),
            CollaborationCaret.configure({
                provider: provider,
                user: {
                    name: currentUserEmail?.split('@')[0] || 'Anonyme',
                    color: colors[Math.floor(Math.random() * colors.length)],
                },
            }),
        ],
        onUpdate: ({ editor }) => {
            const html = editor.getHTML();
            onUpdate(titleRef.current?.value || 'Sans titre', html);
        },
    }, [pageId]);

    const ToolbarButton = ({ onClick, isActive, icon: Icon, title }) => (
        <button 
            onClick={(e) => { e.preventDefault(); onClick(); }}
            className={`p-2 rounded transition-colors ${isActive ? 'bg-indigo-100 text-indigo-600 dark:bg-indigo-900/40 dark:text-indigo-400' : 'text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800'}`}
            title={title}
        >
            <Icon size={18}/>
        </button>
    );

    return (
        <div className="flex flex-col h-full w-full relative">
            {!isZenMode && editor && (
                <div className="border-b border-slate-200 dark:border-slate-800 flex flex-wrap items-center gap-2 p-2 bg-white dark:bg-black z-20 sticky top-0 min-h-[3.5rem] shadow-sm">
                    <ToolbarButton onClick={() => editor.chain().focus().setParagraph().run()} isActive={editor.isActive('paragraph')} icon={Pilcrow} title="Texte Normal" />
                    <div className="w-px h-6 bg-slate-200 dark:bg-slate-700 mx-1"></div>
                    <ToolbarButton onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()} isActive={editor.isActive('heading', { level: 2 })} icon={Heading} title="Titre 2" />
                    <ToolbarButton onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()} isActive={editor.isActive('heading', { level: 3 })} icon={Heading} title="Titre 3" />
                    <ToolbarButton onClick={() => editor.chain().focus().toggleBlockquote().run()} isActive={editor.isActive('blockquote')} icon={Quote} title="Citation" />
                    <div className="w-px h-6 bg-slate-200 dark:bg-slate-700 mx-1"></div>
                    <ToolbarButton onClick={() => editor.chain().focus().toggleBold().run()} isActive={editor.isActive('bold')} icon={Bold} title="Gras" />
                    <ToolbarButton onClick={() => editor.chain().focus().toggleItalic().run()} isActive={editor.isActive('italic')} icon={Italic} title="Italique" />
                    <ToolbarButton onClick={() => editor.chain().focus().toggleStrike().run()} isActive={editor.isActive('strike')} icon={Strikethrough} title="Barré" />
                    <div className="w-px h-6 bg-slate-200 dark:bg-slate-700 mx-1"></div>
                    <ToolbarButton onClick={() => editor.chain().focus().toggleBulletList().run()} isActive={editor.isActive('bulletList')} icon={List} title="Liste à puces" />
                    <ToolbarButton onClick={() => editor.chain().focus().toggleOrderedList().run()} isActive={editor.isActive('orderedList')} icon={CheckSquare} title="Liste numérotée" />
                    <div className="flex-1"></div>
                    <div className="flex items-center gap-2">
                        <button onClick={onToggleZenMode} className="p-2 text-slate-400 hover:text-indigo-500 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 rounded-lg transition-all" title="Mode Zen (Focus)"><Maximize2 size={18}/></button>
                        <button onClick={onPrint} className="p-2 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg text-slate-600 dark:text-slate-300 transition-colors" title="Imprimer"><Printer size={18}/></button>
                        <div className="flex items-center gap-2 text-xs font-mono ml-2">
                            <span className={`w-2 h-2 rounded-full ${status === 'connected' ? 'bg-green-500' : 'bg-amber-500'}`}></span>
                            <span className="text-slate-400">{status === 'connected' ? 'Connecté' : 'Connexion...'}</span>
                        </div>
                    </div>
                </div>
            )}
            {isZenMode && (
                <div className="absolute top-6 right-10 z-50 animate-in fade-in slide-in-from-top-4 duration-500">
                    <button 
                        onClick={onToggleZenMode}
                        className="flex items-center gap-2 px-4 py-2 bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-300 rounded-full text-xs font-bold hover:bg-slate-200 dark:hover:bg-slate-700 transition-all shadow-lg border border-slate-200 dark:border-slate-700"
                    >
                        <Minimize2 size={14}/> Quitter le mode Focus
                    </button>
                </div>
            )}
            
            <div className={`flex-1 overflow-y-auto ${isZenMode ? 'custom-scrollbar-none' : ''}`}>
                <div className={`mx-auto py-12 ${isZenMode ? 'w-full max-w-7xl px-8' : 'w-full px-4 md:px-12 max-w-4xl'}`}>
                    <div className="bg-white dark:bg-black shadow-xl border border-slate-200 dark:border-slate-800 rounded-lg min-h-[1122px] px-12 py-16 flex flex-col relative">
                        {header}
                        <input 
                            ref={titleRef} 
                            type="text" 
                            defaultValue={initialTitle}
                            onChange={() => onUpdate(titleRef.current?.value || 'Sans titre', editor?.getHTML() || initialContent)}
                            className={`w-full ${isZenMode ? 'text-5xl' : 'text-4xl'} font-black bg-transparent outline-none mb-10 text-slate-900 dark:text-white placeholder:text-slate-200 dark:placeholder:text-slate-800 leading-tight`} 
                            placeholder="Titre du document..."
                        />
                        <div className={`prose dark:prose-invert max-w-none flex-1 outline-none ${isZenMode ? 'text-xl' : 'text-lg'} leading-loose`}>
                            {editor ? <EditorContent editor={editor} className="outline-none h-full min-h-[500px]" /> : <div className="animate-pulse h-full bg-slate-100 dark:bg-slate-800 rounded"></div>}
                        </div>
                    </div>
                </div>
            </div>

            <style>{`
                .ProseMirror { outline: none !important; min-height: 500px; }
                .ProseMirror p.is-editor-empty:first-child::before {
                    content: attr(data-placeholder);
                    float: left;
                    color: #adb5bd;
                    pointer-events: none;
                    height: 0;
                }
                .collaboration-cursor__caret {
                    border-left: 1px solid #0D0D0D;
                    border-right: 1px solid #0D0D0D;
                    margin-left: -1px;
                    margin-right: -1px;
                    pointer-events: none;
                    position: relative;
                    word-break: normal;
                }
                .collaboration-cursor__label {
                    border-radius: 3px 3px 3px 0;
                    color: #0D0D0D;
                    font-size: 12px;
                    font-style: normal;
                    font-weight: 600;
                    left: -1px;
                    line-height: normal;
                    padding: 0.1rem 0.3rem;
                    position: absolute;
                    top: -1.4em;
                    user-select: none;
                    white-space: nowrap;
                }
            `}</style>
        </div>
    );
}
