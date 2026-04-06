'use strict';

// Context-isolated preload. The UI communicates with the backend exclusively
// via HTTP (localhost:8081), so no IPC bridge is needed here.
// This file satisfies Electron's contextIsolation requirement.
