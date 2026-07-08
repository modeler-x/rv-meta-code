export type RecentActivityKind = 'entity' | 'document' | 'schema' | 'operation';

// 実際に利用したページの記録。at(ISO) から相対時刻を整形して表示する。
export type RecentActivity = {
  id: string; // kind + 対象で一意化（重複は最新へ更新）
  kind: RecentActivityKind;
  title: string;
  subtitle: string;
  at: string; // ISO8601
  targetId?: string; // entityId / documentId / operationId / schema名
  entityId?: string; // operation 再オープン用
  schemaName?: string; // 再オープン前の一覧再読込用
};
