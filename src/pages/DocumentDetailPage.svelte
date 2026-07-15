<script lang="ts">
  import SectionList from '@/shared/components/SectionList.svelte';
  import SectionListRow from '@/shared/components/SectionListRow.svelte';
  import IconTile from '@/shared/components/IconTile.svelte';
  import MethodBadge from '@/shared/components/MethodBadge.svelte';
  import StatusBadge from '@/shared/components/StatusBadge.svelte';
  import SpecPreviewSheet from '@/shared/components/SpecPreviewSheet.svelte';
  import type { OpenApiDocumentSummary } from '@/modules/document/types/OpenApiDocumentSummary';
  import type { DocumentViewModel } from '@/modules/document/viewmodels/DocumentViewModel.svelte';
  import type { EntityViewModel } from '@/modules/entity/viewmodels/EntityViewModel.svelte';
  import type { OperationGroupViewModel } from '@/modules/operation-group/viewmodels/OperationGroupViewModel.svelte';
  import { translate as t } from '@/shared/i18n/i18n.svelte';
  let { document, documentViewModel, entityViewModel, operationGroupViewModel, onOpenEntity, onOpenGroup, onGenerateSdk, onOpenComponents }: {
    document: OpenApiDocumentSummary;
    documentViewModel: DocumentViewModel;
    entityViewModel: EntityViewModel;
    operationGroupViewModel: OperationGroupViewModel;
    onOpenEntity: (entityId: string) => void;
    onOpenGroup: (groupKey: string) => void;
    onGenerateSdk: () => void;
    onOpenComponents: () => void;
  } = $props();

  const detail = $derived(documentViewModel.detail);
  // @openapi-document 宣言があれば「Schema COMMENT」、無ければ「推論/既定」。
  function sourceOf(field: string): string {
    const declared = detail?.annotation && Object.prototype.hasOwnProperty.call(detail.annotation, field);
    return declared ? $t('src_declared') : $t('src_inferred');
  }
  const serverUrls = $derived((detail?.servers ?? []).map((s) => s.url ?? '').filter(Boolean));
  const rootSchemes = $derived(
    (detail?.rootSecurity ?? []).flatMap((requirement) => Object.keys(requirement))
  );
</script>

<div class="mb-6 flex items-center gap-3">
  <IconTile label="D" color="#399ecc" />
  <div class="min-w-0 flex-1">
    <h2 class="text-xl font-bold">{document.title}</h2>
    <p class="text-xs text-[color:var(--rvc-muted)]">{$t('openapi')} / {document.version} · {document.schemaName}</p>
  </div>
  <button
    class="rounded-md border border-[color:var(--rvc-border)] px-3 py-1.5 text-xs font-semibold disabled:opacity-50"
    disabled={documentViewModel.isValidating}
    onclick={() => documentViewModel.validate(document.schemaName)}
  >{$t('sdk_validation')}</button>
  <button
    class="rounded-md border border-[color:var(--rvc-border)] px-3 py-1.5 text-xs font-semibold"
    onclick={() => onOpenComponents()}
  >{$t('title_components')}</button>
  <button
    class="rounded-md border border-[color:var(--rvc-border)] px-3 py-1.5 text-xs font-semibold"
    onclick={() => documentViewModel.exportSpecs([document.schemaName])}
  >{$t('export_spec')}</button>
  <button
    class="rounded-md bg-[color:var(--rvc-accent)] px-3 py-1.5 text-xs font-semibold text-white"
    onclick={() => onGenerateSdk()}
  >{$t('sdk_generate_button')}</button>
</div>

{#if detail}
  <SectionList title={$t('sec_doc_info')}>
    <SectionListRow>
      <span class="w-40 text-xs text-[color:var(--rvc-muted)]">{$t('doc_title')}</span>
      <span class="flex-1 text-sm">{detail.title}</span>
      <span class="rounded bg-[color:var(--rvc-search)] px-2 py-0.5 text-[10px] text-[color:var(--rvc-muted)]">{sourceOf('title')}</span>
    </SectionListRow>
    <SectionListRow>
      <span class="w-40 text-xs text-[color:var(--rvc-muted)]">{$t('doc_version')}</span>
      <span class="flex-1 font-mono text-sm">{detail.version}</span>
      <span class="rounded bg-[color:var(--rvc-search)] px-2 py-0.5 text-[10px] text-[color:var(--rvc-muted)]">{sourceOf('version')}</span>
    </SectionListRow>
    <SectionListRow>
      <span class="w-40 text-xs text-[color:var(--rvc-muted)]">{$t('doc_generation_mode')}</span>
      <span class="flex-1 font-mono text-sm">{detail.generationMode}</span>
      <span class="rounded bg-[color:var(--rvc-search)] px-2 py-0.5 text-[10px] text-[color:var(--rvc-muted)]">{sourceOf('generationMode')}</span>
    </SectionListRow>
    <SectionListRow>
      <span class="w-40 text-xs text-[color:var(--rvc-muted)]">{$t('doc_last_compiled')}</span>
      <span class="flex-1 font-mono text-xs">{detail.updatedAt}</span>
    </SectionListRow>
    <SectionListRow>
      <span class="w-40 text-xs text-[color:var(--rvc-muted)]">{$t('doc_counts')}</span>
      <span class="flex-1 text-xs">
        {detail.entityOperationCount} {$t('doc_entity_ops')} · {detail.functionOperationCount} {$t('doc_function_ops')} · {detail.operationGroupCount} {$t('sec_operation_groups')} · {detail.componentCount} {$t('doc_components')}
      </span>
    </SectionListRow>
    <SectionListRow>
      <span class="w-40 text-xs text-[color:var(--rvc-muted)]">{$t('doc_servers')}</span>
      <span class="flex-1 font-mono text-xs">{serverUrls.length ? serverUrls.join(', ') : $t('doc_servers_none')}</span>
    </SectionListRow>
    <SectionListRow>
      <span class="w-40 text-xs text-[color:var(--rvc-muted)]">{$t('doc_root_security')}</span>
      <span class="flex-1 font-mono text-xs">{rootSchemes.length ? rootSchemes.join(', ') : $t('op_security_public')}</span>
    </SectionListRow>
  </SectionList>

  {#if documentViewModel.validationReport}
    {@const report = documentViewModel.validationReport}
    <div class="mt-2">
      <SectionList title={$t('sdk_validation')}>
        <SectionListRow>
          <span class="text-sm font-semibold">{report.isValid ? $t('sdk_valid') : $t('sdk_invalid')}</span>
          <span class="flex-1"></span>
          <StatusBadge label={`${report.errors.length} err / ${report.warnings.length} warn`} tone={report.isValid ? 'success' : 'danger'} />
        </SectionListRow>
        {#each report.errors as issue}
          <SectionListRow>
            <span class="rounded bg-[color:var(--rvc-search)] px-1.5 py-0.5 font-mono text-[11px] text-[color:#e5484d]">{issue.rule}</span>
            <span class="text-xs">{issue.message}</span>
          </SectionListRow>
        {/each}
      </SectionList>
    </div>
  {/if}
  <div class="mt-6"></div>
{/if}
{#if document.description}<p class="mb-6 text-sm leading-6">{document.description}</p>{/if}

<SectionList title={`${$t('sec_doc_entities')} / ${entityViewModel.entities.length}`}>
  {#each entityViewModel.entities as entity}
    <SectionListRow isButton on:click={() => onOpenEntity(String(entity.id))}>
      <IconTile label="T" color="#0087aa" />
      <span class="min-w-0 flex-1">
        <span class="block font-mono font-semibold">{entity.tableName}</span>
        <span class="block text-xs text-[color:var(--rvc-muted)]">{entity.description ?? ''}</span>
      </span>
      <span class="text-xs text-[color:var(--rvc-muted)]">{entity.fieldCount} {$t('unit_fields')} / {entity.operationCount} {$t('unit_operations')}</span>
    </SectionListRow>
  {/each}
</SectionList>

{#if operationGroupViewModel.groups.length}
  <div class="mt-6"></div>
  <SectionList title={`${$t('sec_operation_groups')} / ${operationGroupViewModel.groups.length}`}>
    {#each operationGroupViewModel.groups as group}
      <SectionListRow isButton on:click={() => onOpenGroup(group.groupKey)}>
        <IconTile label="G" color="#7a5af5" />
        <span class="min-w-0 flex-1">
          <span class="block font-semibold">{group.displayName}</span>
          <span class="block font-mono text-[11px] text-[color:var(--rvc-muted)]">{group.groupKey}</span>
          {#if group.description}<span class="block text-xs text-[color:var(--rvc-muted)]">{group.description}</span>{/if}
        </span>
        <span class="text-xs text-[color:var(--rvc-muted)]">{group.operationCount} {$t('unit_operations')}</span>
      </SectionListRow>
    {/each}
  </SectionList>
{/if}

<SpecPreviewSheet specs={documentViewModel.previewSpecs} onClose={() => documentViewModel.closePreview()} />
