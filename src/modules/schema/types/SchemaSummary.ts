// 現在接続中DBのスキーマ一覧の1行（pg_catalog 由来）。
export type SchemaSummary = {
  name: string;
  comment: string | null;
  tableCount: number;
  viewCount: number;
};
