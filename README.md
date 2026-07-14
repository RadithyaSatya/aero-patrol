# Tauri + React

This template should help get you started developing with Tauri and React in Vite.

## Environment Setup

Create a local env file before running the app:

```bash
cp .env.example .env
```

Main variables used by the app:

- `VITE_API_BASE_URL`: base HTTP API for login, missions, history, notifications, and telemetry REST calls.
- `VITE_WS_BASE_URL`: base WebSocket URL for realtime telemetry, gimbal, and camera events.
- `VITE_DRONE_STREAM_URL`: drone live stream source.
- `VITE_DOCK_CCTV_STREAM_URL`: dock camera stream source.
- `VITE_STREAM_AUTH_USER`, `VITE_STREAM_AUTH_PASS`: optional stream authentication values for the WebRTC stream server.
- `VITE_PORTAL_URL`: external portal URL used by "Back to Portal" and as the default SSO logout landing page.
- `VITE_SSO_LOGOUT_URL`: SSO provider logout endpoint.
- `VITE_SSO_LOGOUT_REDIRECT_URL`: page to open after logout finishes. Recommended to point to the portal, not the local login page.
- `VITE_SSO_LOGOUT_ALL`: if `true`, logs out all SSO sessions/tokens for the user.
- `VITE_MISSION_NOW_OFFSET_MINUTES`: offset for "run now" mission scheduling.
- `VITE_GEOFENCE_JSON_ENABLED`: enable or disable GeoJSON geofence overlay rendering.
- `VITE_GEOFENCE_FILE`: selects which geofence file is loaded. Supported by default:
  - `kopasuss.json`
  - `sample_geofences.json`
  - `wo-08.json`

If you need more geofence options, add more `.json` files under `src/services/geofences/`, then set `VITE_GEOFENCE_FILE` to the file name you want to activate.

## Recommended IDE Setup

- [VS Code](https://code.visualstudio.com/) + [Tauri](https://marketplace.visualstudio.com/items?itemName=tauri-apps.tauri-vscode) + [rust-analyzer](https://marketplace.visualstudio.com/items?itemName=rust-lang.rust-analyzer)
