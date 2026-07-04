export type EntityKind = 'Table' | 'View';

export type EntityColumn = {
  name: string;
  type: string;
  nullable: boolean;
  badge?: 'PK' | 'FK' | 'UQ' | '';
  extra?: string;
};

export type EntityRelation = {
  kind: 'FK' | 'REF BY' | 'SRC';
  text: string;
  rule: string;
};

export type EntitySummary = {
  id: string;
  name: string;
  kind: EntityKind;
  schema: string;
  rowCountLabel: string;
  description: string;
  summary: string;
  columns: EntityColumn[];
  relations: EntityRelation[];
};
