<script lang="ts">
  import SectionList from '@/shared/components/SectionList.svelte';
  import SectionListRow from '@/shared/components/SectionListRow.svelte';
  import MethodBadge from '@/shared/components/MethodBadge.svelte';
  import type { EntitySummary } from '@/modules/entity/types/EntitySummary';
  import type { OperationSummary } from '@/modules/operation/types/OperationSummary';
  import { translate as t } from '@/shared/i18n/i18n.svelte';
  export let entity: EntitySummary;
  export let operation: OperationSummary;

  function responseColor(code: string): string {
    if (code.startsWith('2')) return '#1a9e4b';
    if (code.startsWith('4') || code.startsWith('5')) return '#e5484d';
    return 'var(--rvc-muted)';
  }

  $: parameters = operation.parameters ?? [];
  $: responses = Object.entries(operation.responses ?? {});
  function paramType(schema: Record<string, unknown> | undefined): string {
    if (!schema) return '';
    return typeof schema.type === 'string' ? schema.type : '';
  }
</script>

<div class="mb-6 flex items-center gap-3">
  <MethodBadge method={operation.method} />
  <div>
    <h2 class="font-mono text-xl font-bold">{operation.path}</h2>
    <p class="text-xs text-[color:var(--rvc-muted)]">{entity.tableName} / {operation.operation}</p>
  </div>
</div>
{#if operation.summary}<p class="mb-2 text-sm">{operation.summary}</p>{/if}
{#if operation.description}<p class="mb-6 text-xs text-[color:var(--rvc-muted)]">{operation.description}</p>{/if}

{#if parameters.length}
  <SectionList title={$t('op_params')}>
    {#each parameters as parameter}
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

{#if operation.requestBody}
  <SectionList title={$t('op_body')} detail={$t('mime_json')}>
    {#each operation.requiredFields as field}
      <SectionListRow><span class="font-mono text-xs">{field}</span></SectionListRow>
    {/each}
  </SectionList>
{/if}

<SectionList title={$t('op_responses')}>
  {#each responses as [code, response]}
    <SectionListRow>
      <span class="w-12 font-mono font-bold" style={`color:${responseColor(code)}`}>{code}</span>
      <span>{response?.description ?? ''}</span>
    </SectionListRow>
  {/each}
</SectionList>
