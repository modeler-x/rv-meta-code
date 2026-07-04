# ディレクトリ構成

本プロジェクトは、画面単位ではなく機能単位で構成する。共通部品は shared、アプリケーション全体の構成は app に配置し、個々の機能は modules に集約する。

```text
rv-meta-code/

├── docs/                  # 設計書・アーキテクチャ・ADR
├── src/
│   ├── app/               # アプリケーション全体
│   │   ├── router/
│   │   ├── layouts/
│   │   ├── providers/
│   │   └── bootstrap/
│   ├── pages/             # 画面(Page)
│   ├── modules/           # 機能単位
│   ├── shared/            # 共通コンポーネント・サービス・型
│   └── styles/
├── src-tauri/
│   ├── commands/
│   ├── application/
│   ├── domain/
│   ├── infrastructure/
│   ├── repositories/
│   ├── dto/
│   ├── models/
│   ├── services/
│   ├── errors/
│   └── utils/
├── tests/
│   ├── frontend/
│   ├── backend/
│   └── e2e/
└── scripts/
```

## 1. 役割ごとの配置

### app

アプリケーション全体の構成を管理する。Router、Layout、Bootstrap、Provider などを配置する。

### pages

画面単位の構成。UI を構築し、ViewModel 以外の責務に依存しない。

### modules

機能単位の構成。entity、schema、document、generator、workspace、history などを配置し、ビジネスロジックを収める。

### shared

複数 Module から再利用される部品のみを配置する。安易に置かず、3 箇所以上から利用される場合に限定する。

### src-tauri

Rust 側の構造。Presentation 層を持たず、ビジネスロジック・データアクセス・DB 連携を実装する。
