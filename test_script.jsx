import React, { useState } from 'react';
import { createRoot } from 'react-dom/client';
import Workspace from './Workspace';

// Let's create a fake venture and render the whole workspace to see what crashes
const fakeVenture = { id: 'v1', title: 'Test' };

function TestApp() {
    return <Workspace workspaceFocus={false} setWorkspaceFocus={() => {}} />;
}

// ... actually I can just run Vite and check the console.
