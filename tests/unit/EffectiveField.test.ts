import { describe, expect, it } from 'vitest';
import {
  applyOverride,
  defaultsFields,
  displayValue,
  operationFields,
  profileFields,
  readPath,
  routeFields,
  shortKey,
  toDeclared,
  writePath
} from '@/modules/manifest/services/EffectiveField';
import type { ManifestField } from '@/modules/manifest/types/ManifestField';
import type { ManifestDocument } from '@/modules/manifest/types/Manifest';
import { fixture, functionOf, operationWithMostRoutes, schemaWithMostRoutes } from '../fixtures';

/**
 * 編集画面の土台。確かめるのは 2 点だけ。
 *
 *   1. 有効値の優先順位が生成側と同じか（operation > profile.defaults > defaults > 推論）
 *      ずれると、画面が「効いている」と出した値と実際に生成される値が食い違う
 *   2. 上書きが選んだ範囲へ正しく書かれるか
 *      人が階層を理解しなくて済むよう、書く場所はここが一手に引き受ける
 *
 * 項目の定義は rv_meta.manifest_fields() が原本なので、フィクスチャから読む。
 */
const SCHEMA = schemaWithMostRoutes();
const TARGET = operationWithMostRoutes(SCHEMA);
const FIELDS = fixture.fields as ManifestField[];

const fieldOf = (level: string, name: string): ManifestField =>
  FIELDS.find((f) => f.level === level && f.field === name)!;

function context(manifest: ManifestDocument, functionKey?: string) {
  return {
    manifest,
    profile: 'bff' as const,
    functionKey,
    fn: functionKey ? functionOf(SCHEMA, functionKey) : undefined,
    schemaName: SCHEMA
  };
}

function emptyManifest(): ManifestDocument {
  return { schema: SCHEMA, profiles: { postgrest: {}, bff: {} }, operations: {} };
}

describe('項目定義', () => {
  it('4 つの階層すべてに項目がある', () => {
    // 画面はこの定義を描くだけ。階層が欠けると、その階層の項目に到達できない。
    for (const level of ['profile', 'defaults', 'operation', 'route']) {
      expect(FIELDS.filter((f) => f.level === level).length).toBeGreaterThan(0);
    }
  });

  it('人が必ず打つのは外部 URI の 2 項目だけ', () => {
    // 必須かつ継承も推論も無いもの。増えるほど入力が重くなる。
    const manual = FIELDS.filter((f) => f.isRequired && !f.derivedFrom && f.inherits.length === 0)
      .map((f) => `${f.level}.${f.field}`)
      .sort();
    expect(manual).toEqual(['route.method', 'route.path']);
  });
});

describe('有効値の優先順位', () => {
  it('宣言があれば、その operation 自身が由来になる', () => {
    const manifest = emptyManifest();
    manifest.operations = { [TARGET.key]: { operationId: 'declared' } };
    const rows = operationFields(FIELDS, context(manifest, TARGET.key), manifest.operations[TARGET.key]);
    const row = rows.find((r) => r.definition.field === 'operationId')!;
    expect(row.value).toBe('declared');
    expect(row.source).toBe('own');
  });

  it('未宣言なら契約面の既定、無ければ全体の既定を使う', () => {
    // profile は信頼境界。内部と公開で security が変わるので、profile 側が先。
    const manifest = emptyManifest();
    manifest.defaults = { security: [{ bearerAuth: [] }] };
    manifest.profiles!.bff = { defaults: { security: [] } };
    manifest.operations = { [TARGET.key]: {} };

    const rows = operationFields(FIELDS, context(manifest, TARGET.key), manifest.operations[TARGET.key]);
    const row = rows.find((r) => r.definition.field === 'security')!;
    expect(row.value).toBe('公開');
    expect(row.source).toBe('profile');

    delete manifest.profiles!.bff!.defaults;
    const fallback = operationFields(FIELDS, context(manifest, TARGET.key), manifest.operations[TARGET.key])
      .find((r) => r.definition.field === 'security')!;
    expect(fallback.value).toBe('要認証');
    expect(fallback.source).toBe('defaults');
  });

  it('どこにも宣言が無ければ推論を出す', () => {
    const manifest = emptyManifest();
    const rows = operationFields(FIELDS, context(manifest, TARGET.key), undefined);
    const row = rows.find((r) => r.definition.field === 'operationId')!;
    expect(row.source).toBe('inferred');
    expect(row.value.length).toBeGreaterThan(0);
  });

  it('説明の推論は関数の COMMENT', () => {
    // 説明を二重管理させない。
    const withComment = fixture.functions[SCHEMA].find((f) => (f.comment ?? '').trim().length > 0);
    if (!withComment) return;
    const manifest = emptyManifest();
    const rows = operationFields(FIELDS, context(manifest, withComment.functionKey), undefined);
    const row = rows.find((r) => r.definition.field === 'description')!;
    expect(row.value).toBe(withComment.comment?.trim());
    expect(row.source).toBe('inferred');
  });

  it('推論できない項目は「未設定」として出す（嘘の既定値を見せない）', () => {
    const manifest = emptyManifest();
    const rows = profileFields(FIELDS, context(manifest));
    const row = rows.find((r) => r.definition.field === 'naming.stripPrefix.table')!;
    expect(row.source).toBe('none');
  });

  it('宣言が無い関数でも全項目が埋まる（人の入力 0 で成立する）', () => {
    const manifest = emptyManifest();
    const rows = operationFields(FIELDS, context(manifest, TARGET.key), undefined);
    expect(rows).toHaveLength(FIELDS.filter((f) => f.level === 'operation').length);
    expect(rows.every((r) => r.value.length > 0)).toBe(true);
  });
});

describe('ルートの導出項目', () => {
  it('parameters は path から作り、由来は自動になる', () => {
    // 二重に書かせると path_parameters_mismatch を人が踏むだけ。
    const manifest = emptyManifest();
    const rows = routeFields(
      FIELDS,
      context(manifest, TARGET.key),
      undefined,
      { path: '/{alpha}/{beta}' },
      []
    );
    const row = rows.find((r) => r.definition.field === 'parameters')!;
    expect(row.value).toBe('alpha, beta');
    expect(row.source).toBe('auto');
  });

  it('bind は引数の総数に対する割り当て数で出す', () => {
    const args = functionOf(SCHEMA, TARGET.key)!.arguments;
    const manifest = emptyManifest();
    const rows = routeFields(
      FIELDS,
      context(manifest, TARGET.key),
      undefined,
      { path: '/', bind: { [args[0]?.name ?? 'x']: { from: 'body' } } },
      args
    );
    const row = rows.find((r) => r.definition.field === 'bind')!;
    expect(row.value).toBe(`1 / ${args.length} 引数`);
  });
});

describe('上書きの書き込み先', () => {
  it('この operation だけ', () => {
    const manifest = emptyManifest();
    applyOverride(manifest, 'own', 'bff', TARGET.key, fieldOf('operation', 'tags'), ['X']);
    expect(manifest.operations![TARGET.key].tags).toEqual(['X']);
  });

  it('この契約面の全 operation（profiles.<profile>.defaults）', () => {
    const manifest = emptyManifest();
    applyOverride(manifest, 'profile', 'bff', TARGET.key, fieldOf('operation', 'tags'), ['X']);
    expect(manifest.profiles!.bff!.defaults!.tags).toEqual(['X']);
    // operation 側は触らない。範囲を選んだ意味が無くなる。
    expect(manifest.operations![TARGET.key]).toBeUndefined();
  });

  it('全体（defaults）', () => {
    const manifest = emptyManifest();
    applyOverride(manifest, 'defaults', 'bff', TARGET.key, fieldOf('operation', 'tags'), ['X']);
    expect(manifest.defaults!.tags).toEqual(['X']);
  });

  it('profile の項目は入れ子のパスへ書く', () => {
    const manifest = emptyManifest();
    applyOverride(manifest, 'own', 'bff', null, fieldOf('profile', 'naming.stripPrefix.arg'), 'p_');
    expect(manifest.profiles!.bff!.naming!.stripPrefix!.arg).toBe('p_');
  });

  it('undefined を書くとキーごと消えて継承へ戻る', () => {
    const manifest = emptyManifest();
    applyOverride(manifest, 'own', 'bff', TARGET.key, fieldOf('operation', 'tags'), ['X']);
    applyOverride(manifest, 'own', 'bff', TARGET.key, fieldOf('operation', 'tags'), undefined);
    expect(manifest.operations![TARGET.key]).not.toHaveProperty('tags');
  });
});

describe('表示と宣言の変換', () => {
  it('security は二択に畳む', () => {
    const field = fieldOf('operation', 'security');
    expect(displayValue([], field)).toBe('公開');
    expect(displayValue([{ bearerAuth: [] }], field)).toBe('要認証');
    expect(toDeclared('公開', field)).toEqual([]);
    expect(toDeclared('要認証', field)).toEqual([{ bearerAuth: [] }]);
  });

  it('tags はカンマ区切りで往復する', () => {
    const field = fieldOf('operation', 'tags');
    expect(displayValue(['A', 'B'], field)).toBe('A, B');
    expect(toDeclared('A, B', field)).toEqual(['A', 'B']);
  });

  it('空入力は undefined になる（継承へ戻すため）', () => {
    expect(toDeclared('  ', fieldOf('operation', 'tags'))).toBeUndefined();
  });
});

describe('パス操作', () => {
  it('入れ子を読み書きできる', () => {
    const target: Record<string, unknown> = {};
    writePath(target, 'naming.stripPrefix.arg', 'p_');
    expect(readPath(target, 'naming.stripPrefix.arg')).toBe('p_');
  });

  it('途中が object でなければ作り直す', () => {
    const target: Record<string, unknown> = { naming: 'broken' };
    writePath(target, 'naming.case.property', 'camel');
    expect(readPath(target, 'naming.case.property')).toBe('camel');
  });
});

describe('関数キーの短縮', () => {
  it('引数名を落として型だけにする', () => {
    // 一覧では引数名まで要らない。型が分かれば overload の区別はつく。
    expect(shortKey('receive(p_payload jsonb, p_operation text)')).toBe('receive(jsonb, text)');
    expect(shortKey('resolve_current_user()')).toBe('resolve_current_user()');
    expect(shortKey('publish(p_at timestamp with time zone)')).toBe('publish(timestamp with time zone)');
  });

  it('フィクスチャの全関数で壊れない', () => {
    for (const fn of fixture.functions[SCHEMA]) {
      expect(shortKey(fn.functionKey)).toMatch(/^[a-z_]+\(/);
    }
  });
});

describe('responses の宣言', () => {
  it('status と参照先の組を OpenAPI の形へ直す（人に $ref を書かせない）', () => {
    const field = fieldOf('operation', 'responses');
    const declared = toDeclared('422:components,404:Error', field) as Record<string, unknown>;

    // 数字のキーは JS が昇順に並べ替える。並びではなく中身を見る。
    expect(Object.keys(declared).sort()).toEqual(['404', '422']);
    expect(declared['422']).toEqual({ $ref: '#/components/responses/UnprocessableEntity' });
    expect(declared['404']).toMatchObject({
      content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } }
    });
  });

  it('本文なしを選べる（説明だけの応答）', () => {
    const field = fieldOf('operation', 'responses');
    expect(toDeclared('500:none', field)).toEqual({ '500': { description: 'Error' } });
  });

  it('空なら未指定へ戻る（200 は戻り値の型から推論される）', () => {
    expect(toDeclared('', fieldOf('operation', 'responses'))).toBeUndefined();
  });
});
