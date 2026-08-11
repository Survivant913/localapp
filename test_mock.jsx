
import React, { useState } from 'react';
import { createRoot } from 'react-dom/client';
import Workspace from './src/Workspace';
import { supabase } from './src/supabaseClient';

window.onerror = function(msg, url, lineNo, columnNo, error) {
  console.error('GLOBAL_ERROR:', msg, error?.stack);
  return false;
};

// Mock supabase insert
supabase.from = (table) => {
    return {
        select: () => ({ eq: () => ({ order: () => Promise.resolve({ data: [] }) }) }),
        insert: (data) => ({
            select: () => Promise.resolve({ data: [{ id: Date.now().toString(), venture_id: 'v1', ...data[0], created_at: new Date().toISOString() }] })
        }),
        update: () => ({ eq: () => Promise.resolve({ data: null }) }),
        delete: () => ({ eq: () => Promise.resolve({ data: null }) }),
    }
};
supabase.channel = () => ({
    on: () => ({ subscribe: () => ({}) }),
    send: () => {},
    unsubscribe: () => {}
});
supabase.removeChannel = () => {};
supabase.auth = { getUser: () => Promise.resolve({ data: { user: { id: 'u1', email: 'test@test.com' } } }) };

const root = createRoot(document.getElementById('root'));
function TestApp() {
    return <Workspace workspaceFocus={false} setWorkspaceFocus={() => {}} />;
}

root.render(<TestApp />);
