# テストルール

## 1. テスト戦略

堅牢な回帰テストを自動化するため、以下の 3 つのレイヤーを分離する。

- Frontend: Vitest + Svelte Testing Library
- Backend: Cargo test
- E2E: Playwright

## 2. 実行方針

- Backend のクエリ生成・プロセス制御のロジックは cargo test で検証する
- Frontend の UI 挙動は Vitest で検証する
- E2E は実際のアプリケーションを起動して一連のフローを確認する

## 3. CI とローカルの役割分担

- GitHub Actions では、GUI を持たない環境で cargo test と Vitest を実行する
- ローカル Mac では Playwright を使って最終確認を行う

## 4. テスト対象

- UI の表示変化
- ビジネスロジックの出力
- Tauri IPC のやり取り
- DB 連携の振る舞い
