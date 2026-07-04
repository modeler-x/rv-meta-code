# Svelte ルール

## 1. UI とロジックの分離

Svelte は UI 描画の責務に限定し、ビジネスロジックを持たない。

## 2. Page の役割

Page は以下に限定する。

- UI 描画
- イベントバインド
- ViewModel の呼び出し

以下は禁止する。

- invoke()
- fetch()
- 業務ロジック
- データ変換

## 3. ViewModel の役割

画面状態を管理する。Loading、Error、Form 状態や Service 呼び出しを担当する。

## 4. Service / Repository の役割

Service はアプリケーションロジックを表現し、UI を知らない。Repository は Tauri IPC をラップし、invoke() を実行する唯一の層とする。

## 5. スタイリング方針

macOS らしい質感を表現するため、Tailwind CSS と DaisyUI を用い、システムフォントや丸みのある UI を取り入れる。
