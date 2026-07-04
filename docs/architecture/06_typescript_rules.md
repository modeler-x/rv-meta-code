# TypeScript ルール

## 1. 構造化

TypeScript コードは責務ごとに明確に分割し、1 ファイルに多くの責務を詰め込まない。

## 2. 型の利用

- 可能な限り型を明示する
- any の使用は避ける
- DTO と Domain Model を分ける

## 3. Interface と実装

- 実装クラスは Interface を実装する
- 例: IEntityRepository -> EntityRepository

## 4. Result 型

- 例外ではなく Result 型を返す
- 成功・失敗・メタ情報を明示する

## 5. 命名

- 関数は動詞始まり
- Boolean は is / has / can で始める
- private メソッドは private で明示する
