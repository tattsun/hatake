# Hatake 🌱

A modern UI for Rancher Desktop on macOS. Tauri v2 (Rust) + React + TypeScript.

Manage containers, images, Kubernetes resources, and Rancher Desktop itself from one window, with a menu bar tray for quick access.

## Features

- **Dashboard** — status summary for RD, containers, images, Kubernetes, and the engine
- **Projects** — Docker Compose projects with container/service counts; drill into containers
- **Containers** — list, start/stop/restart/remove, live log tail
- **Images** — list, size, remove
- **Kubernetes** — Pods / Deployments / Services / Nodes
- **Settings** — start/stop RD, toggle Kubernetes, manage snapshots, language (EN/JA)

Requires the **moby (dockerd)** container engine (uses `~/.rd/docker.sock`).

## Development

Toolchain is pinned with [mise](https://mise.jdx.dev/) (rust 1.92, node 25).

```sh
mise install
npm install
npm run tauri dev     # run the app
npm run tauri build   # build .app / .dmg
```
