# 環境セットアップ

すべてのツールチェーンは `sudo` 不要のユーザー空間に配置する。不要になった場合は Homebrew と各隠しフォルダ（`~/.nvm`, `~/.cargo`, `~/.rustup`）の削除で復元できる。

## 1. 必要なツール

| ツール | 用途 | 導入 |
|---|---|---|
| Node.js (>=20) | フロントエンド（Vite / Svelte） | nvm または fnm |
| pnpm (>=9) | パッケージ管理 | Node 同梱 or `npm i -g pnpm` |
| Rust (stable) | Tauri バックエンド | Homebrew + rustup |
| Xcode CLT | リンカ（macOS） | `xcode-select --install` |

## 2. Node / pnpm

```bash
node -v      # v20 以上
pnpm -v      # 9 以上
```

## 3. Rust（Tauri を使う場合のみ）

Homebrew の rustup は keg-only のため、`cargo` は既定 PATH に載らない。

```bash
brew install rustup
rustup-init -y --no-modify-path --default-toolchain stable   # ~/.rustup, ~/.cargo に導入
# もしくは brew の rustup シムを使う場合:
"$(brew --prefix rustup)/bin/rustup" default stable
```

`cargo` を PATH に通す（Tauri のビルド/開発時に必要）:

```bash
export PATH="$(brew --prefix rustup)/bin:$PATH"
cargo --version   # 確認
```

毎回入力を避けるなら `~/.zshrc` に上記 `export` を1行追記する（削除で元に戻る）。

## 4. 依存インストール

```bash
cd rv-meta-code
pnpm install
```

- フロントエンドの依存が `node_modules/` に入る（ユーザー空間・プロジェクト内）。
- Rust の依存は初回ビルド時に `~/.cargo` と `src-tauri/target/` に取得される。

## 5. 確認

```bash
pnpm check    # 型チェック（svelte-check）が 0 エラーであること
```
