import type {
  EffectiveField,
  FieldSource,
  ManifestField,
  OverrideScope
} from '@/modules/manifest/types/ManifestField';
import type {
  ManifestArgument,
  ManifestDocument,
  ManifestFunction,
  ManifestOperation,
  ProfileName,
  PublicRoute
} from '@/modules/manifest/types/Manifest';
import { functionNameOf, parametersFromPath, toCamelCase } from '@/modules/manifest/services/ManifestService';

/**
 * 全項目に「有効値」と「その値がどこから来たか」を与える。
 *
 * 編集画面が空欄を並べないための土台。人が設定する項目は 0 でも成立し、
 * 一覧には宣言できる項目がすべて並ぶので、画面から到達できない項目が存在しない。
 *
 * 優先順位は生成側（rv_meta._get_manifest_operations）と同じにする。
 *   operation > profiles.<profile>.defaults > defaults > 推論
 * ここがずれると、画面が「効いている」と表示した値と、実際に生成される値が食い違う。
 */

/** ドット記法のパスで入れ子の値を取る。無ければ undefined。 */
export function readPath(source: unknown, path: string): unknown {
  return path.split('.').reduce<unknown>((current, key) => {
    if (current == null || typeof current !== 'object') return undefined;
    return (current as Record<string, unknown>)[key];
  }, source);
}

/** ドット記法のパスへ書く。空なら（未指定へ戻すため）キーごと消す。 */
export function writePath(target: Record<string, unknown>, path: string, value: unknown): void {
  const keys = path.split('.');
  const last = keys.pop() as string;
  let node = target;
  for (const key of keys) {
    const next = node[key];
    if (next == null || typeof next !== 'object') node[key] = {};
    node = node[key] as Record<string, unknown>;
  }
  if (value === undefined) {
    delete node[last];
    return;
  }
  node[last] = value;
}

/** 表示用の文字列。配列とオブジェクトは人が読める形へ畳む。 */
export function displayValue(value: unknown, field: ManifestField): string {
  if (value === undefined || value === null) return '';
  if (field.field.endsWith('security') || field.kind === 'choice') {
    if (Array.isArray(value)) return value.length === 0 ? '公開' : '要認証';
  }
  if (Array.isArray(value)) {
    if (field.kind === 'chips') return value.join(', ');
    if (field.kind === 'routes') return `${value.length} ルート`;
    return `${value.length} 件`;
  }
  if (typeof value === 'object') {
    const keys = Object.keys(value as object);
    if (field.kind === 'responses') return keys.map((k) => `${k}`).join(' / ');
    return `${keys.length} 件`;
  }
  return String(value);
}

/** 画面の表示（要認証 / 公開）を宣言の形へ戻す。 */
export function toDeclared(input: string, field: ManifestField): unknown {
  if (input.trim().length === 0) return undefined;
  if (field.field.endsWith('security')) return input === '公開' ? [] : [{ bearerAuth: [] }];
  if (field.kind === 'chips') {
    const items = input.split(',').map((s) => s.trim()).filter((s) => s.length > 0);
    return items.length > 0 ? items : undefined;
  }
  return input;
}

type Context = {
  manifest: ManifestDocument;
  profile: ProfileName;
  functionKey?: string;
  fn?: ManifestFunction;
  schemaName: string;
};

/**
 * 推論値。DB が未宣言のときに導く値を、画面でも同じ規則で示す。
 * ここに出せない項目は「未設定」として出す（嘘の既定値を見せない）。
 */
function inferred(field: ManifestField, context: Context): string | undefined {
  const base = context.schemaName.replace(/^rv_/, '');
  const group = base.replace(/^./, (c) => c.toUpperCase());
  switch (`${field.level}.${field.field}`) {
    case 'operation.operationId':
      return context.functionKey ? toCamelCase(functionNameOf(context.functionKey)) : undefined;
    case 'operation.operationGroup':
      return base;
    case 'operation.description':
      return context.fn?.comment?.trim() || undefined;
    case 'operation.tags':
      return group;
    case 'operation.security':
      // draft_manifest と同じ fail-closed の既定。書き忘れが公開に化けないようにする。
      return '要認証';
    case 'operation.responses':
      return '200: 戻り値の型から推論';
    case 'profile.basePath':
      return base;
    case 'profile.title':
      return `${group} API`;
    case 'profile.version':
      return '1.0.0';
    case 'profile.generationMode':
      return 'entity_and_function';
    case 'profile.operationIdStyle':
      return 'prefixed';
    case 'profile.naming.case.property':
      return 'camel';
    case 'profile.naming.case.resource':
      return 'kebab';
    default:
      return undefined;
  }
}

/** 継承元の宣言を、優先順位の順に探す。 */
function inheritedValue(
  field: ManifestField,
  context: Context,
  operation?: ManifestOperation
): { value: unknown; source: FieldSource } | null {
  for (const level of field.inherits) {
    const found =
      level === 'operation'
        ? readPath(operation, field.field)
        : level === 'profile'
          ? readPath(context.manifest.profiles?.[context.profile], `defaults.${field.field}`)
          : readPath(context.manifest.defaults, field.field);
    if (found !== undefined) {
      // route が operation から受け継いだ場合も、画面には「自分より上の宣言」として出す。
      const source: FieldSource = level === 'operation' ? 'own' : level === 'profile' ? 'profile' : 'defaults';
      return { value: found, source };
    }
  }
  return null;
}

function build(
  field: ManifestField,
  declared: unknown,
  context: Context,
  operation?: ManifestOperation
): EffectiveField {
  if (declared !== undefined) {
    return { definition: field, declared, value: displayValue(declared, field), source: 'own' };
  }
  const inherit = inheritedValue(field, context, operation);
  if (inherit) {
    return {
      definition: field,
      declared: undefined,
      value: displayValue(inherit.value, field),
      source: inherit.source
    };
  }
  const guess = inferred(field, context);
  if (guess !== undefined) {
    return { definition: field, declared: undefined, value: guess, source: 'inferred' };
  }
  return { definition: field, declared: undefined, value: '未設定', source: 'none' };
}

/** operation の全項目。宣言が無い関数でも、推論と継承で埋まった状態を返す。 */
export function operationFields(
  definitions: ManifestField[],
  context: Context,
  operation: ManifestOperation | undefined
): EffectiveField[] {
  return definitions
    .filter((f) => f.level === 'operation')
    .map((f) => build(f, readPath(operation, f.field), context, operation));
}

/** profile の全項目。 */
export function profileFields(
  definitions: ManifestField[],
  context: Context
): EffectiveField[] {
  const profile = context.manifest.profiles?.[context.profile];
  return definitions
    .filter((f) => f.level === 'profile')
    .map((f) => build(f, readPath(profile, f.field), context));
}

/** manifest 直下の defaults。 */
export function defaultsFields(
  definitions: ManifestField[],
  context: Context
): EffectiveField[] {
  return definitions
    .filter((f) => f.level === 'defaults')
    .map((f) => build(f, readPath(context.manifest.defaults, f.field), context));
}

/**
 * ルートの全項目。
 * parameters は path から、bind は関数の引数から導かれるので、由来を auto にする。
 */
export function routeFields(
  definitions: ManifestField[],
  context: Context,
  operation: ManifestOperation | undefined,
  route: PublicRoute,
  args: ManifestArgument[]
): EffectiveField[] {
  return definitions
    .filter((f) => f.level === 'route')
    .map((f) => {
      if (f.field === 'parameters') {
        const names = parametersFromPath(route.path ?? '').map((p) => p.name);
        return {
          definition: f,
          declared: route.parameters,
          value: names.length > 0 ? names.join(', ') : 'なし',
          source: 'auto' as FieldSource
        };
      }
      if (f.field === 'bind') {
        const bound = Object.keys(route.bind ?? {}).length;
        return {
          definition: f,
          declared: route.bind,
          value: `${bound} / ${args.length} 引数`,
          source: 'auto' as FieldSource
        };
      }
      return build(f, readPath(route, f.field), context, operation);
    });
}

/**
 * 上書きを宣言へ書き込む。
 *
 * 適用範囲をその場で選ばせるので、人は defaults と profiles.<profile>.defaults の
 * 階層を先に理解しなくてよい。書く場所の対応はここが一手に引き受ける。
 */
export function applyOverride(
  manifest: ManifestDocument,
  scope: OverrideScope,
  profile: ProfileName,
  functionKey: string | null,
  field: ManifestField,
  value: unknown
): void {
  if (scope === 'defaults') {
    manifest.defaults = manifest.defaults ?? {};
    writePath(manifest.defaults as Record<string, unknown>, field.field, value);
    return;
  }
  if (scope === 'profile') {
    manifest.profiles = manifest.profiles ?? {};
    manifest.profiles[profile] = manifest.profiles[profile] ?? {};
    writePath(manifest.profiles[profile] as Record<string, unknown>, `defaults.${field.field}`, value);
    return;
  }
  if (field.level === 'profile') {
    manifest.profiles = manifest.profiles ?? {};
    manifest.profiles[profile] = manifest.profiles[profile] ?? {};
    writePath(manifest.profiles[profile] as Record<string, unknown>, field.field, value);
    return;
  }
  if (field.level === 'defaults') {
    manifest.defaults = manifest.defaults ?? {};
    writePath(manifest.defaults as Record<string, unknown>, field.field, value);
    return;
  }
  if (!functionKey) return;
  manifest.operations = manifest.operations ?? {};
  const operation = (manifest.operations[functionKey] = manifest.operations[functionKey] ?? {});
  writePath(operation as Record<string, unknown>, field.field, value);
}

/**
 * 関数キーを型だけの表記へ畳む。
 * receive(p_payload jsonb, p_operation text) → receive(jsonb, text)
 *
 * 一覧では引数名まで要らない。型が分かれば同名 overload の区別はつく。
 */
export function shortKey(functionKey: string): string {
  const open = functionKey.indexOf('(');
  if (open < 0) return functionKey;
  const name = functionKey.slice(0, open);
  const inside = functionKey.slice(open + 1, functionKey.lastIndexOf(')'));
  if (inside.trim().length === 0) return `${name}()`;
  const types = inside.split(',').map((part) => {
    const trimmed = part.trim();
    const space = trimmed.indexOf(' ');
    return space < 0 ? trimmed : trimmed.slice(space + 1);
  });
  return `${name}(${types.join(', ')})`;
}
