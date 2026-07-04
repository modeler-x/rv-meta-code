# ビルド・デプロイ

## 1. フロントエンドのビルド

```bash
cd rv-meta-code
pnpm build        # vite build → dist/
```

- 出力: `dist/`（`index.html` と `assets/`）。
- Tauri はこの `dist/` を `frontendDist`（`src-tauri/tauri.conf.json`）として取り込む。
- `dist/` はビルド生成物のため `.gitignore` 済み。

## 2. デスクトップアプリのパッケージ（`.app` / `.dmg`）

Rust ツールチェーンが必要。`cargo` を PATH に通してから実行する。

```bash
cd rv-meta-code
export PATH="$(brew --prefix rustup)/bin:$PATH"
pnpm tauri build
```

- 内部で `pnpm build`（`beforeBuildCommand`）→ release 最適化ビルド → バンドルを実行。
- 初回の release ビルドは全依存を最適化コンパイルするため 10〜15 分程度かかる。

### 出力先

```
src-tauri/target/release/bundle/macos/Rv Meta Code.app   # 単体ネイティブアプリ
src-tauri/target/release/bundle/dmg/Rv Meta Code_*.dmg    # 配布用イメージ
```

- **`.app` はランタイム不要**。macOS 内蔵の WebView を使うため、配布先に Node / Rust は不要。
- インストール: `.app` を `/Applications` にコピー、または `open "…/Rv Meta Code.app"`。

### `.dmg` 生成が失敗する場合

`.dmg` の最終工程 `bundle_dmg.sh` は Finder を AppleScript で制御する。SSH / 非対話 / アクセシビリティ未許可の環境ではタイムアウトする。**Finder が動作する通常の GUI ターミナル**から実行すること。`.app` だけで良ければ:

```bash
pnpm tauri build --bundles app
```

## 3. 署名・公証（配布時）

- 未署名ビルドは初回起動時に Gatekeeper が警告する。開発確認は **右クリック →「開く」** で回避。
- 第三者配布には Apple Developer ID による署名 + notarize が必要。`tauri.conf.json` の `bundle` に署名設定を追加する。

## 4. CI / リリース（GitHub Actions + Releases）

設計方針（[../architecture/03_application_architecture.md](../architecture/03_application_architecture.md)、09）に基づく想定フロー:

1. GitHub Actions（GUI 無し環境）で `pnpm check` / `pnpm test` / `cargo test` を実行。
2. タグ push を契機に各 OS ランナーで `pnpm tauri build`。
3. 生成物（`.app`/`.dmg` 等）を GitHub Releases に添付。

- CI では署名鍵をシークレットとして注入する。
- ローカル Mac では Playwright で最終確認（[03_test.md](./03_test.md)）。

## 5. クリーンアップ

```bash
rm -rf dist src-tauri/target node_modules   # 生成物・依存の削除（いずれも .gitignore 済み/再取得可能）
```
