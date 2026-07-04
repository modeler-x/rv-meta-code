# 依存関係ルール

依存関係は、常に上位レイヤーから下位レイヤーへの一方向とする。これにより、責務の境界が明確になり、変更の影響範囲を小さく保てる。

## 1. 推奨される依存方向

```text
Presentation
    ↓
Application
    ↓
Domain
    ↓
Infrastructure
```

## 2. 禁止事項

- View から Repository を直接呼び出さない
- View から invoke() を直接呼び出さない
- Service が UI を知らないようにする
- Repository に業務ロジックを書かない
- Domain が Infrastructure を参照しない
- 依存方向を逆転させない

## 3. DI 方針

DI Framework は導入せず、Constructor Injection のみを採用する。

```text
Command
↓
Service
↓
Repository
```

依存オブジェクトは起動時に生成する。

## 4. モジュール境界

- 画面単位ではなく機能単位で構成する
- 各 Module は独立した責務を持つ
- 共有が必要なものだけを shared 配下に配置する

## 5. Result 型

例外ではなく Result 型を返す設計とし、TypeScript と Rust で同じような形に揃える。

```ts
Result<T> = {
  success: boolean
  data?: T
  error?: ErrorInfo
}
```
