// 1ドキュメント分の OpenAPI 仕様（schema 名 + 完全な OpenAPI JSON）。
// servers[] には登録済みサーバが内包される。SDK generator の入力に用いる。
export type OpenApiSpec = {
  schemaName: string;
  /** どの契約面から出したか。生成される SDK は契約面ごとに別物になる。 */
  profile: string;
  spec: Record<string, unknown>;
};
