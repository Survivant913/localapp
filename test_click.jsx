import React, { useState, useEffect } from 'react';
import { createRoot } from 'react-dom/client';
import Workspace from './src/Workspace.jsx';
import { supabase } from './src/supabaseClient.js';

// Mock Supabase
supabase.auth.getSession = async () => ({ data: { session: { user: { id: '123' } } }, error: null });
supabase.auth.getUser = async () => ({ data: { user: { id: '123' } }, error: null });
supabase.auth.onAuthStateChange = () => ({ data: { subscription: { unsubscribe: () => {} } } });
supabase.channel = () => ({
    on: function() { return this; },
    subscribe: function() { return this; },
    send: function() { return Promise.resolve('ok'); },
    unsubscribe: function() {}
});

supabase.from = (table) => ({
    select: () => ({
        eq: () => ({
            order: () => Promise.resolve({ data: table === 'ventures' ? [{id: 1, title: 'Test Venture'}] : [] })
        })
    }),
    insert: (items) => ({
        select: () => Promise.resolve({ data: [{ id: 99, ...items[0] }] })
    })
});

const root = createRoot(document.getElementById('root'));
root.render(<Workspace />);

window.triggerClick = () => {
    setTimeout(() => {
        const btns = Array.from(document.querySelectorAll('button'));
        const newPageBtn = btns.find(b => b.title === 'Nouvelle page');
        if (newPageBtn) {
            console.log("Clicking Nouvelle page");
            newPageBtn.click();
        } else {
            console.log("Button not found");
        }
    }, 1000);
};

window.triggerChartClick = () => {
    setTimeout(() => {
        const btns = Array.from(document.querySelectorAll('button'));
        const newChartBtn = btns.find(b => b.title === 'Nouvelle analyse');
        if (newChartBtn) {
            console.log("Clicking Nouvelle analyse");
            newChartBtn.click();
        } else {
            console.log("Chart button not found");
        }
    }, 1000);
};
