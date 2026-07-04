export type SchemaSummary = {
  key: string;
  name: string;
  tableCount: number;
  viewCount: number;
  operationCount: number;
  documentId: string | null;
  documentName: string;
  description: string;
  lastGeneratedLabel: string;
};
