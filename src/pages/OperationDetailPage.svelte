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
    if (code.startsWith('4')) return '#e5484d';
    return 'var(--rvc-muted)';
  }
</script>

<div class="mb-6 flex items-center gap-3"><MethodBadge method={operation.method} /><div><h2 class="font-mono text-xl font-bold">{operation.path}</h2><p class="text-xs text-[color:var(--rvc-muted)]">{entity.name} / {operation.id}</p></div></div>
<p class="mb-6 text-sm">{operation.summary}</p>
{#if operation.parameters.length}
  <SectionList title={$t('op_params')}>
    {#each operation.parameters as parameter}
      <SectionListRow><span class="font-mono font-semibold">{parameter.name}</span><span class="rounded bg-[color:var(--rvc-search)] px-2 py-1 text-xs uppercase">{parameter.location}</span><span class="font-mono text-xs text-[color:var(--rvc-muted)]">{parameter.type}</span><span class="flex-1"></span><span class="text-xs text-[color:var(--rvc-muted)]">{parameter.required ? $t('req_required') : $t('req_optional')}</span></SectionListRow>
    {/each}
  </SectionList>
{/if}
{#if operation.hasRequestBody}
  <SectionList title={$t('op_body')} detail={$t('mime_json')}>
    {#each operation.requiredFields as field}
      <SectionListRow><span class="font-mono text-xs">{field}</span></SectionListRow>
    {/each}
  </SectionList>
{/if}
<SectionList title={$t('op_responses')}>
  {#each operation.responses as response}
    <SectionListRow><span class="w-12 font-mono font-bold" style={`color:${responseColor(response.code)}`}>{response.code}</span><span>{response.description}</span></SectionListRow>
  {/each}
</SectionList>
