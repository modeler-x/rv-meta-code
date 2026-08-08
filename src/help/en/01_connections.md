# Connections

Pick a registered server from the bottom of the sidebar. There is exactly one current
connection, and Schemas, Manifest and Operations all read from it.

## Steps

1. Select a connection or add one.
2. Fill in host, port, database and user. The password is stored encrypted.
3. Use "Test connection" to check reachability.
4. Use "Set as current" to switch. Switching reloads the lists.

## Where it is stored

Connections are encrypted in the app data directory; there is no config file to edit by
hand. Running `pnpm dev` starts a browser-only Vite server with no Tauri IPC, so the list
shows up empty. Use `pnpm tauri dev` when you want real data.
