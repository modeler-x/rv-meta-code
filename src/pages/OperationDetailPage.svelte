<script lang="ts">
  import SectionList from '@/shared/components/SectionList.svelte';
  import SectionListRow from '@/shared/components/SectionListRow.svelte';
  import MethodBadge from '@/shared/components/MethodBadge.svelte';
  import type { EntitySummary } from '@/modules/entity/types/EntitySummary';
  import type {
    OpenApiComponents,
    OpenApiHeader,
    OperationResponse,
    OperationSummary
  } from '@/modules/operation/types/OperationSummary';
  import { sdkCallPreview } from '@/modules/operation/sdkNaming';
  import { translate as t } from '@/shared/i18n/i18n.svelte';
  // Entity Operation と Function Operation で共通利用する。entity は Entity 表示時のみ。
  export let entity: EntitySummary | null = null;
  // Function Operation のとき、所属 Operation Group の key（SDK 呼び出しプレビュー導出用）。
  export let groupKey: string | null = null;
  // ヘッダ副題（Function Operation では Operation Group 表示名など）。entity 優先。
  export let subtitle: string = '';
  export let operation: OperationSummary;
  // エンティティのカラム順（ordinal_position 順の column_name）。
  // jsonb はオブジェクトのキー順を正規化して失うため、この順序で表示を並べ替える。
  export let fieldOrder: string[] = [];
  // $ref（共通レスポンス等）を解決するための components。
  export let components: OpenApiComponents = {};

  // 実効 security の Scheme 名（Root 合成後）。securitySource で継承/固有/公開を区別する。
  $: effectiveSchemeNames = (operation.effectiveSecurity ?? []).flatMap((requirement) =>
    Object.keys(requirement)
  );

  function responseColor(code: string): string {
    if (code.startsWith('2')) return '#1a9e4b';
    if (code.startsWith('4') || code.startsWith('5')) return '#e5484d';
    return 'var(--rvc-muted)';
  }

  function paramType(schema: Record<string, unknown> | undefined): string {
    if (!schema) return '';
    return typeof schema.type === 'string' ? schema.type : '';
  }

  // リクエストヘッダー（in='header'）とそれ以外（path/query）を分けて表示する。
  $: parameters = operation.parameters ?? [];
  $: requestHeaders = parameters.filter((parameter) => parameter.in === 'header');
  $: pathQueryParams = parameters.filter((parameter) => parameter.in !== 'header');

  // $ref を components.responses から解決する（未解決なら元のオブジェクトのまま）。
  function resolveResponse(response: OperationResponse): OperationResponse {
    if (typeof response.$ref === 'string') {
      const name = response.$ref.split('/').pop() ?? '';
      return components.responses?.[name] ?? response;
    }
    return response;
  }

  function responseHeaders(response: OperationResponse): [string, OpenApiHeader][] {
    return Object.entries(response.headers ?? {});
  }

  // ステータスコード昇順に並べ、$ref を解決した表示用リストにする。
  $: responses = Object.entries(operation.responses ?? {})
    .sort(([a], [b]) => (Number(a) || 0) - (Number(b) || 0) || a.localeCompare(b))
    .map(([code, response]) => ({ code, response: resolveResponse(response) }));

  type JsonSchema = Record<string, unknown>;
  type BodyProperty = { name: string; type: string; required: boolean };

  // requestBody.content['application/json'].schema を取り出す（他の MIME しか無ければ先頭を採用）。
  function extractBodySchema(requestBody: Record<string, unknown> | null): JsonSchema | null {
    const content = (requestBody?.content ?? null) as Record<string, { schema?: JsonSchema }> | null;
    if (!content) return null;
    const media = content['application/json'] ?? Object.values(content)[0];
    return (media?.schema as JsonSchema | undefined) ?? null;
  }

  // オブジェクトスキーマの properties を、型表記と必須フラグつきの行に整形する。
  // fieldOrder（カラム ordinal 順）が与えられていれば、その順に並べ替えて JSON ソース順を復元する。
  function bodyPropertiesOf(schema: JsonSchema | null, order: string[]): BodyProperty[] {
    const properties = (schema?.properties ?? null) as Record<string, JsonSchema> | null;
    if (!properties) return [];
    const requiredList = Array.isArray(schema?.required) ? (schema?.required as string[]) : [];
    const required = new Set(requiredList);
    const rows = Object.entries(properties).map(([name, definition], index) => ({
      name,
      type: schemaType(definition),
      required: required.has(name),
      index
    }));
    const rank = (name: string): number => {
      const at = order.indexOf(name);
      return at === -1 ? Number.MAX_SAFE_INTEGER : at;
    };
    // order にある要素はその順、無い要素（例: ids）は元の並びを保ったまま末尾へ。
    return rows
      .sort((a, b) => rank(a.name) - rank(b.name) || a.index - b.index)
      .map(({ name, type, required }) => ({ name, type, required }));
  }

  // レスポンスのボディ型（content['application/json'].schema）を表示用文字列にする。無ければ空。
  function responseType(response: OperationResponse | undefined): string {
    const content = (response?.content ?? null) as Record<string, { schema?: JsonSchema }> | null;
    if (!content) return '';
    const media = content['application/json'] ?? Object.values(content)[0];
    return media?.schema ? schemaType(media.schema) : '';
  }

  // JSON Schema を表示用の型文字列にする（array<...> と $ref のコンポーネント名に対応）。
  function schemaType(schema: JsonSchema | undefined): string {
    if (!schema) return '';
    if (typeof schema.$ref === 'string') return schema.$ref.split('/').pop() ?? '';
    const type = typeof schema.type === 'string' ? schema.type : '';
    if (type === 'array') {
      const items = schema.items as JsonSchema | undefined;
      const inner = items ? schemaType(items) : '';
      return inner ? `array<${inner}>` : 'array';
    }
    const format = typeof schema.format === 'string' ? schema.format : '';
    return format ? `${type} · ${format}` : type;
  }

  $: bodyProperties = bodyPropertiesOf(extractBodySchema(operation.requestBody), fieldOrder);
</script>

<div class="mb-6 flex items-center gap-3">
  <MethodBadge method={operation.method} />
  <div>
    <h2 class="font-mono text-xl font-bold">{operation.path}</h2>
    <p class="text-xs text-[color:var(--rvc-muted)]">{entity?.tableName ?? subtitle} / {operation.operation}</p>
  </div>
</div>
{#if operation.summary}<p class="mb-2 text-sm">{operation.summary}</p>{/if}
{#if operation.description}<p class="mb-6 text-xs text-[color:var(--rvc-muted)]">{operation.description}</p>{/if}

<SectionList title={$t('op_contract')}>
  <SectionListRow>
    <span class="text-xs text-[color:var(--rvc-muted)]">{$t('op_operation_id')}</span>
    <span class="font-mono text-xs text-[color:var(--rvc-accent)]">{operation.operationId}</span>
  </SectionListRow>
  {#if (operation.tags ?? []).length}
    <SectionListRow>
      <span class="text-xs text-[color:var(--rvc-muted)]">{$t('op_tags')}</span>
      <span class="flex flex-wrap gap-1">
        {#each operation.tags as tag}
          <span class="rounded bg-[color:var(--rvc-search)] px-2 py-0.5 text-[11px]">{tag}</span>
        {/each}
      </span>
    </SectionListRow>
  {/if}
  <SectionListRow>
    <span class="text-xs text-[color:var(--rvc-muted)]">{$t('op_security')}</span>
    {#if operation.securitySource === 'public'}
      <span class="text-xs">{$t('op_security_public')}</span>
    {:else}
      <span class="flex flex-wrap items-center gap-1">
        {#each effectiveSchemeNames as scheme}
          <span class="rounded bg-[color:var(--rvc-search)] px-2 py-0.5 font-mono text-[11px]">{scheme}</span>
        {/each}
        {#if operation.securitySource === 'root'}
          <span class="text-[11px] text-[color:var(--rvc-muted)]">{$t('op_security_inherit')}</span>
        {/if}
      </span>
    {/if}
  </SectionListRow>
  {#if groupKey}
    <SectionListRow>
      <span class="text-xs text-[color:var(--rvc-muted)]">{$t('sdk_call')}</span>
      <span class="font-mono text-xs text-[color:var(--rvc-accent)]">{sdkCallPreview(groupKey, operation.operationId)}</span>
    </SectionListRow>
  {/if}
  {#if operation.functionSchema && operation.functionName}
    <SectionListRow>
      <span class="text-xs text-[color:var(--rvc-muted)]">{$t('op_source_function')}</span>
      <span class="font-mono text-xs">{operation.functionSchema}.{operation.functionName}({operation.identityArguments ?? ''})</span>
    </SectionListRow>
  {/if}
</SectionList>

{#if operation.openapiSource}
  {@const marker = operation.openapiSource.indexOf('@openapi')}
  <SectionList title={$t('op_openapi_source')}>
    <SectionListRow>
      <pre class="max-h-72 w-full select-text overflow-auto whitespace-pre-wrap break-words font-mono text-[11px]">{marker >= 0 ? operation.openapiSource.slice(marker) : operation.openapiSource}</pre>
    </SectionListRow>
  </SectionList>
{/if}

{#if pathQueryParams.length}
  <SectionList title={$t('op_params')}>
    {#each pathQueryParams as parameter}
      <SectionListRow>
        <span class="font-mono font-semibold">{parameter.name}</span>
        <span class="rounded bg-[color:var(--rvc-search)] px-2 py-1 text-xs uppercase">{parameter.in}</span>
        <span class="font-mono text-xs text-[color:var(--rvc-muted)]">{paramType(parameter.schema)}</span>
        <span class="flex-1"></span>
        <span class="text-xs text-[color:var(--rvc-muted)]">{parameter.required ? $t('req_required') : $t('req_optional')}</span>
      </SectionListRow>
    {/each}
  </SectionList>
{/if}

{#if requestHeaders.length}
  <SectionList title={$t('op_req_headers')}>
    {#each requestHeaders as header}
      <SectionListRow>
        <span class="font-mono font-semibold">{header.name}</span>
        <span class="font-mono text-xs text-[color:var(--rvc-muted)]">{paramType(header.schema)}</span>
        {#if header.description}<span class="text-xs text-[color:var(--rvc-muted)]">{header.description}</span>{/if}
        <span class="flex-1"></span>
        <span class="text-xs text-[color:var(--rvc-muted)]">{header.required ? $t('req_required') : $t('req_optional')}</span>
      </SectionListRow>
    {/each}
  </SectionList>
{/if}

{#if operation.requestBody}
  <SectionList title={$t('op_body')} detail={$t('mime_json')}>
    {#each bodyProperties as property}
      <SectionListRow>
        <span class="font-mono font-semibold">{property.name}</span>
        <span class="font-mono text-xs text-[color:var(--rvc-muted)]">{property.type}</span>
        <span class="flex-1"></span>
        <span class="text-xs text-[color:var(--rvc-muted)]">{property.required ? $t('req_required') : $t('req_optional')}</span>
      </SectionListRow>
    {/each}
    {#if bodyProperties.length === 0}
      <SectionListRow><span class="text-xs text-[color:var(--rvc-muted)]">{$t('op_body_empty')}</span></SectionListRow>
    {/if}
  </SectionList>
{/if}

<SectionList title={$t('op_responses')}>
  {#each responses as { code, response }}
    {@const bodyType = responseType(response)}
    {@const headers = responseHeaders(response)}
    <SectionListRow>
      <span class="w-12 font-mono font-bold" style={`color:${responseColor(code)}`}>{code}</span>
      <span>{response?.description ?? ''}</span>
      <span class="flex-1"></span>
      {#if bodyType}
        <span class="rounded bg-[color:var(--rvc-search)] px-2 py-1 font-mono text-xs text-[color:var(--rvc-accent)]">{bodyType}</span>
      {/if}
    </SectionListRow>
    {#each headers as [headerName, header]}
      <SectionListRow>
        <span class="w-12"></span>
        <span class="rounded bg-[color:var(--rvc-search)] px-1.5 py-0.5 text-[10px] uppercase text-[color:var(--rvc-muted)]">{$t('op_res_header')}</span>
        <span class="font-mono text-xs font-semibold">{headerName}</span>
        <span class="font-mono text-xs text-[color:var(--rvc-muted)]">{paramType(header.schema)}</span>
        {#if header.description}<span class="text-xs text-[color:var(--rvc-muted)]">{header.description}</span>{/if}
      </SectionListRow>
    {/each}
  {/each}
</SectionList>
