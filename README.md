# Hatake 🌱

macOS 向け Rancher Desktop のモダン UI ツール。Tauri v2 (Rust) + React + TypeScript。

メニューバー常駐 + ウィンドウ構成で、コンテナ・イメージ・Kubernetes・Rancher Desktop 本体を一画面から操作できる。

## 機能

- **ダッシュボード** — RD 状態 / コンテナ / イメージ / k8s / エンジンのサマリ
- **コンテナ** — 一覧・起動 / 停止 / 再起動 / 削除・ログ表示
- **イメージ** — 一覧・サイズ・削除
- **Kubernetes** — Pods / Deployments / Services / Nodes（namespace 絞り込み）
- **設定** — RD 起動 / シャットダウン、Kubernetes の有効化切替、スナップショット管理、`list-settings` の表示
- **メニューバー常駐** — トレイから状態確認・RD 起動停止・ウィンドウ復帰

## アーキテクチャ

| レイヤ | 技術 | 役割 |
| --- | --- | --- |
| バックエンド | Rust + [bollard](https://crates.io/crates/bollard) | Docker API（`~/.rd/docker.sock`）でコンテナ / イメージ操作 |
| | Rust + [kube-rs](https://crates.io/crates/kube) | `~/.kube/config` 経由で Kubernetes リソース取得 |
| | `rdctl` 呼び出し | RD 制御・設定・スナップショット |
| フロント | React 19 + TypeScript + Vite | サイドバーナビ + ダッシュボード UI |

Rancher Desktop のコンテナエンジンは **moby (dockerd)** を前提（containerd 利用時は docker.sock が無いため要調整）。

## 開発

ツールチェーンは [mise](https://mise.jdx.dev/) で固定（`mise.toml`: rust 1.92.0 / node 25.8.2）。

```sh
mise install        # 初回のみ
npm install         # 依存取得（npm レジストリは別途設定が必要、下記参照）
npm run tauri dev   # 開発起動（ウィンドウ + トレイ）
npm run tauri build # 配布ビルド (.app / .dmg)
```

### npm レジストリ

このプロジェクトは Takumi Guard レジストリを使用する。

```sh
npm config set registry https://npm.flatt.tech/
```

## ディレクトリ

```
src/                   フロントエンド (React)
  api.ts               Tauri command ラッパー
  types.ts             Rust DTO に対応する型
  components/ui.tsx    共通 UI 部品 (Pill / Modal / Toast 等)
  lib/                 useFetch フック・フォーマッタ
  views/               画面 (Dashboard / Containers / Images / Kubernetes / Settings)
src-tauri/src/
  docker.rs            bollard ラッパー
  k8s.rs               kube-rs ラッパー
  rd.rs                rdctl ラッパー
  commands.rs          Tauri command 定義
  error.rs             共通エラー型
  lib.rs               エントリ + トレイ設定
```
