# Hatake 🌱

> **Beta** — this project is under active development. Features and APIs may change, and bugs are expected.

A modern UI for Rancher Desktop on macOS. Tauri v2 (Rust) + React + TypeScript.

Manage containers, images, Kubernetes resources, and Rancher Desktop itself from one window, with a menu bar tray for quick access.

## Download

**[⬇ Download for macOS (latest)](https://github.com/tattsun/hatake/releases/latest/download/Hatake_universal.dmg)** — universal build (Apple Silicon + Intel).

See [all releases](https://github.com/tattsun/hatake/releases) for previous versions.

## Demo

https://github.com/user-attachments/assets/687854b8-1854-43e6-9add-0e61dcf4ce7f

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
