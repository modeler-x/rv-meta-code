# 命名規則

命名は「役割が分かる具体的な名前」を優先し、抽象的・曖昧な名前は避ける。

## 1. ディレクトリ

- すべて小文字を使用する
- 例: entity, schema, generator, history

## 2. コンポーネント

- PascalCase を使用する
- 例: EntityTable.svelte, EntityCard.svelte, DocumentTree.svelte

## 3. ViewModel

- 末尾に ViewModel を付ける
- 例: EntityViewModel.ts

## 4. Service

- 末尾に Service を付ける
- 例: EntityService.ts
- 責務が増えた場合は、具体的な名前に分割する
- 例: EntitySearchService.ts, EntityCloneService.ts

## 5. Repository

- 末尾に Repository を付ける
- 例: EntityRepository.ts

## 6. Interface

- 先頭に I を付ける
- 例: IEntityRepository, IEntityService

## 7. DTO / Type / Enum

- DTO: EntityDto.ts, EntityDetailDto.ts
- Type: EntityType.ts
- Enum: EntityKind.ts, DocumentStatus.ts

## 8. Rust

- snake_case を使用する
- 例: entity_service.rs, entity_repository.rs, entity_command.rs

## 9. 関数

- 動詞で始める
- 例: loadEntities(), cloneSchema(), generateOpenApi(), exportSdk()

## 10. Boolean

- is / has / can で始める
- 例: isLoading, hasError, canDelete

## 11. Event

- 過去形で命名する
- 例: SchemaCloned, EntityLoaded, DocumentGenerated

## 12. 定数

- UPPER_SNAKE_CASE を使用する
- 例: DEFAULT_PAGE_SIZE, MAX_HISTORY_COUNT

## 13. 禁止事項

以下のような抽象名は避ける。

```text
temp
data
list
info
manager
helper
common
misc
util
utils
```

## 14. Import

- 相対パスは使用しない
- 必ずエイリアスを使用する

```ts
import { ... } from '@/modules/entity'
import { ... } from '@/shared/components'
import { ... } from '@/shared/constants'
```
