# Rust ルール

## 1. 責務分離

Rust 側は、Command / Application Service / Repository の構造で責務を分離する。

```text
Command
    ↓
Application Service
    ↓
Repository
    ↓
PostgreSQL
```

## 2. Command

Tauri Command は、パラメータ検証・Service 呼び出し・Result 返却に責務を限定する。

## 3. Application Service

アプリケーションロジックおよびオーケストレーションを担当する。

## 4. Repository

DB アクセスのみを担当し、Repository 以外が SQL を直接実行してはならない。

## 5. 命名

- ファイル名は snake_case を使用する
- 関数名は snake_case を使用する
- 例: entity_service.rs, entity_repository.rs, entity_command.rs
