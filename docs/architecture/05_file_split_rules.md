# ファイル分割ルール

責務ごとに分割し、「何でも書けるファイル」を作らない。

## 1. Component

- 300 行を超えたら分割する
- 例: EntityTable -> EntityTable.svelte, EntityTableHeader.svelte, EntityTableBody.svelte, EntityTableRow.svelte

## 2. Service

- 200 行を超えたら責務ごとに分割する
- 例: EntityService -> EntitySearchService, EntityUpdateService, EntityImportService

## 3. Repository

- Repository は 1 つの責務のみを持つ
- 複数 Entity を扱う Repository は避ける

## 4. ViewModel

- 画面ごとに 1 つを基本とする
- 巨大化した場合は Composable へ分離する

## 5. Command

- Rust の Command は 1 ファイル 1 Command を基本とする

```text
commands/
entity/
    search.rs
    detail.rs
    update.rs
    delete.rs
```

## 6. DTO

- DTO は通信単位で作成する
- Domain Model と共有しない

## 7. Constants

- 用途ごとに分割する
- 例: routes.ts, ipc.ts, menus.ts, theme.ts
- constants.ts のような巨大なファイルは作らない

## 8. Utils

- Utils を肥大化させない
- 用途ごとに分割する
- 例: date/, json/, string/, number/
- utils.ts のようなファイルは作らない

## 9. Index

- 各フォルダは必要に応じて index.ts を持つ
- 公開 API のみ export する
