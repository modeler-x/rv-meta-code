# 実行手順

## Tauri デスクトップアプリ

Rust ツールチェーンが必要（[01_setup.md](./01_setup.md) 参照）。`cargo` を PATH に通してから実行する。

```bash
cd ~/git/modelerx/rv-meta-code
export PATH="$(brew --prefix rustup)/bin:$PATH"   # cargo を PATH へ
pnpm tauri dev
```

- 内部で Vite（`beforeDevCommand`）を起動し、ビルドした Rust バイナリがネイティブウィンドウを開く。
- 初回は Rust の増分ビルドに 20 秒〜数分かかる。以降は高速。
- 停止: 起動ターミナルで `Ctrl+C`。

## ログの確認方法（3レイヤー）
### ① Rustバックエンドのログ（今回追加した接続テストのログ）

リアルタイム: pnpm tauri dev を実行したターミナルに直接出力されます
```bash
connection test start: host=... port=... database=... user=...
connection test failed: host=... error=...(詳細)
```
ファイル（配布版でも残る）:

```bash
tail -f ~/Library/Logs/com.robovill.rvmetacode/*.log
```
### ② フロント / IPC エラーのログ

`pnpm tauri dev` で開いたアプリウィンドウ上で `Cmd + Option + I`（または右クリック→「要素の検証」）でWebView DevToolsを開く。Console タブに、invoke失敗などのJSエラーが出ます。

### ③ 切り分けの見方

①のRustログに `connection test start` が出る → バックエンドまで到達＝あとはDB接続の問題（認証/SSL/host等、前回の対応表で確定）
①に何も出ず②のConsoleにだけエラー → IPC到達前の問題（＝pnpm devで動かしている等の起動方法の問題）
まず pnpm tauri dev で起動し、接続テストを1回実行してください。ターミナルに出る connection test failed: ... error=... の行、または何も出ないかを教えてもらえれば、原因を断定します。


## 補足: ウィンドウ設定

`src-tauri/tauri.conf.json` の `app.windows` でサイズ（既定 1180x760）やタイトルを変更できる。
