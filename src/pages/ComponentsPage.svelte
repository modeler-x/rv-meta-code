<script lang="ts">
  import SectionList from '@/shared/components/SectionList.svelte';
  import SectionListRow from '@/shared/components/SectionListRow.svelte';
  import IconTile from '@/shared/components/IconTile.svelte';
  import StatusBadge from '@/shared/components/StatusBadge.svelte';
  import BusyOverlay from '@/shared/components/BusyOverlay.svelte';
  import type { ComponentViewModel } from '@/modules/component/viewmodels/ComponentViewModel.svelte';
  import type { ComponentSummary } from '@/modules/component/types/ComponentSummary';
  import { translate as t } from '@/shared/i18n/i18n.svelte';

  let { viewModel, schema }: { viewModel: ComponentViewModel; schema: string } = $props();

  const sections = [
    { key: 'schemas', label: 'Schemas' },
    { key: 'responses', label: 'Common Responses' },
    { key: 'securitySchemes', label: 'Security Schemes' }
  ];

  function scopeTone(scope: string): 'accent' | 'muted' | 'success' {
    if (scope === 'document') return 'accent';
    if (scope === 'generated') return 'success';
    return 'muted';
  }

  // 展開して定義JSONを表示している component のキー。
  let expanded = $state<Set<string>>(new Set());
  function keyOf(component: ComponentSummary): string {
    return `${component.section}/${component.name}`;
  }
  function toggle(component: ComponentSummary): void {
    const key = keyOf(component);
    const next = new Set(expanded);
    if (next.has(key)) next.delete(key);
    else next.add(key);
    expanded = next;
  }

  // 定義の要点（schema=type/$ref、response=description、securityScheme=type/scheme）。
  function summary(component: ComponentSummary): string {
    const def = component.definition;
    if (component.section === 'responses') return String(def.description ?? '');
    if (component.section === 'securitySchemes') {
      return [def.type, def.scheme].filter(Boolean).join(' / ');
    }
    if (typeof def.$ref === 'string') return String(def.$ref);
    if (def.type === 'array') return 'array';
    return String(def.type ?? 'object');
  }
</script>

<div class="mb-6 flex items-center gap-3">
  <IconTile label="C" color="#c2681a" />
  <div>
    <h2 class="text-xl font-bold">{$t('title_components')}</h2>
    <p class="font-mono text-xs text-[color:var(--rvc-muted)]">{schema}</p>
  </div>
</div>

{#if viewModel.issues.length}
  <div class="mb-4">
    <SectionList title={$t('cmp_issues')}>
      {#each viewModel.issues as issue}
        <SectionListRow>
          <span class="rounded bg-[color:var(--rvc-search)] px-1.5 py-0.5 font-mono text-[11px] text-[color:#e5484d]">{issue.rule}</span>
          <span class="font-mono text-[11px] text-[color:var(--rvc-muted)]">{issue.pointer}</span>
          <span class="text-xs">{issue.message}</span>
        </SectionListRow>
      {/each}
    </SectionList>
  </div>
{/if}

{#each sections as section}
  {@const rows = viewModel.bySection(section.key)}
  <div class="mt-4"></div>
  <SectionList title={`${section.label} / ${rows.length}`}>
    {#each rows as component}
      <SectionListRow isButton on:click={() => toggle(component)}>
        <span class="min-w-0 flex-1">
          <span class="flex items-center gap-2">
            <span class="font-mono text-sm font-semibold">{component.name}</span>
            <StatusBadge label={component.scope} tone={scopeTone(component.scope)} />
            {#if !component.emitted}<StatusBadge label={$t('cmp_not_emitted')} tone="warning" />{/if}
          </span>
          <span class="block font-mono text-[11px] text-[color:var(--rvc-muted)]">{summary(component)}</span>
        </span>
        <span class="text-[11px] text-[color:var(--rvc-muted)]">{expanded.has(keyOf(component)) ? '▾' : '▸'}</span>
      </SectionListRow>
      {#if expanded.has(keyOf(component))}
        <SectionListRow>
          <pre class="max-h-80 w-full select-text overflow-auto whitespace-pre-wrap break-words font-mono text-[11px]">{JSON.stringify(component.definition, null, 2)}</pre>
        </SectionListRow>
      {/if}
    {/each}
    {#if rows.length === 0}
      <div class="px-4 py-4 text-sm text-[color:var(--rvc-muted)]">{$t('search_no_match')}</div>
    {/if}
  </SectionList>
{/each}

<BusyOverlay show={viewModel.isLoading} label={$t('busy_working')} />
