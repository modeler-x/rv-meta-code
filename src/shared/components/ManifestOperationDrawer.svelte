<script lang="ts">
  import Drawer from '@/shared/components/Drawer.svelte';
  import DiagnosticList from '@/shared/components/DiagnosticList.svelte';
  import StatusBadge from '@/shared/components/StatusBadge.svelte';
  import EffectiveFieldTable, { type OverrideRequest } from '@/shared/components/EffectiveFieldTable.svelte';
  import type { ManifestViewModel } from '@/modules/manifest/viewmodels/ManifestViewModel.svelte';
  import { diagnosticsOf, type BindKind } from '@/modules/manifest/services/ManifestService';
  import { shortKey } from '@/modules/manifest/services/EffectiveField';
  import type { ManifestField, OverrideScope } from '@/modules/manifest/types/ManifestField';
  import type { ProfileName } from '@/modules/manifest/types/Manifest';
  import type { MessageKey } from '@/shared/i18n/messages';
  import { translate as t } from '@/shared/i18n/i18n.svelte';

  /**
   * 1 関数の宣言を編集する。
   *
   * 空欄を並べない。全項目に有効値と由来が入っているので、人が設定する項目は 0 でも
   * 成立し、違うところだけ上書きすればよい。項目の一覧は rv_meta.manifest_fields() が
   * 原本なので、画面から到達できない項目は存在しない。
   */
  let {
    viewModel,
    functionKey,
    profile,
    onClose,
    onOpenHelp
  }: {
    viewModel: ManifestViewModel;
    functionKey: string;
    profile: ProfileName;
    onClose: () => void;
    onOpenHelp?: (page: string) => void;
  } = $props();

  const operation = $derived(viewModel.operationOf(functionKey));
  const args = $derived(viewModel.argumentsOf(functionKey));
  const routes = $derived(viewModel.routesOf(functionKey));
  const diagnostics = $derived(diagnosticsOf(viewModel.state.diagnostics, functionKey));
  const fields = $derived(viewModel.operationFields(functionKey, profile));
  const overridden = $derived(fields.filter((row) => row.source === 'own').length);

  // operation の項目は、より上の層へも書ける。階層は上書きのときに選ばせる。
  const scopes: OverrideScope[] = ['own', 'profile', 'defaults'];

  const bindKinds: { value: BindKind; key: MessageKey }[] = [
    { value: 'body', key: 'mf_bind_body' },
    { value: 'path', key: 'mf_bind_path' },
    { value: 'const', key: 'mf_bind_const' },
    { value: 'unbound', key: 'mf_bind_unbound' }
  ];

  function override(request: OverrideRequest): void {
    viewModel.override(request.field, request.value, request.scope, profile, functionKey);
  }
  function clear(field: ManifestField): void {
    viewModel.clearOverride(field, profile, functionKey);
  }
</script>

<Drawer
  title={shortKey(functionKey)}
  testid="operation-drawer"
  dataAttributes={{ 'data-operation': functionKey, 'data-profile': profile }}
  {onClose}
>
  {#snippet header()}
    <span data-testid="dirty" data-dirty={viewModel.isDirty}>
      {#if viewModel.isDirty}<StatusBadge label={$t('mf_unsaved_draft')} tone="warning" />{/if}
    </span>
  {/snippet}

  {#if !operation}
    <!-- 宣言が無い関数。下の有効値がそのまま入る。人の入力は 0 件でよい。 -->
    <div class="mb-3 rounded-lg border-y border-r border-l-[3px] border-[color:var(--rvc-border)] border-l-[color:var(--rvc-accent)] px-3.5 py-2.5 text-xs">
      <span class="block font-semibold">{$t('mf_undeclared_body')}</span>
      <span class="block text-[color:var(--rvc-muted)]">{$t('mf_seeded_hint')}</span>
    </div>
  {/if}

  <EffectiveFieldTable
    testid="operation-fields"
    rows={fields}
    {scopes}
    onOverride={override}
    onClear={clear}
  />

  {#if profile === 'bff'}
    <div class="mt-4 flex flex-wrap items-center gap-3 border-t border-[color:var(--rvc-border)] pt-4">
      <span class="text-sm font-semibold">{$t('mf_publish_bff')}</span>
      <span data-testid="publish-state" data-public={routes.length > 0} data-routes={routes.length}>
        <StatusBadge
          label={routes.length > 0 ? `${routes.length}` : $t('mf_not_public')}
          tone={routes.length > 0 ? 'success' : 'muted'}
        />
      </span>
      <span class="min-w-0 flex-1 text-xs text-[color:var(--rvc-muted)]">
        {routes.length > 0 ? $t('mf_publish_on_hint') : $t('mf_publish_off_hint')}
      </span>
      <button
        data-testid="add-route"
        class="rounded-md border border-[color:var(--rvc-border)] px-2.5 py-1 text-xs"
        onclick={() => viewModel.publish(functionKey)}
      >{$t('mf_add_route')}</button>
      {#if routes.length > 0}
        <button
          data-testid="unpublish"
          class="rounded-md border px-2.5 py-1 text-xs"
          style="border-color:var(--rvc-danger);color:var(--rvc-danger)"
          onclick={() => viewModel.unpublish(functionKey)}
        >{$t('mf_unpublish')}</button>
      {/if}
    </div>

    {#each routes as route, index}
      <div data-testid="route" data-route-id={route.operationId ?? ''} data-index={index} class="mt-3 flex flex-col gap-3 rounded-lg border border-[color:var(--rvc-border)] p-3">
        <div class="flex flex-wrap items-center gap-2">
          <span class="font-mono text-xs font-semibold rvc-value">{route.operationId ?? ''}</span>
          <StatusBadge label={route.method ?? 'POST'} tone="accent" />
          <span class="min-w-0 flex-1 truncate font-mono text-xs text-[color:var(--rvc-muted)] rvc-value">{route.path ?? ''}</span>
          <button data-testid="duplicate-route" data-index={index} class="rounded-md border border-[color:var(--rvc-border)] px-2.5 py-1 text-xs"
            onclick={() => viewModel.duplicateRoute(functionKey, index)}>{$t('mf_duplicate_route')}</button>
          <button data-testid="remove-route" data-index={index} class="rounded-md border px-2.5 py-1 text-xs"
            style="border-color:var(--rvc-danger);color:var(--rvc-danger)"
            onclick={() => viewModel.removeRoute(functionKey, index)}>{$t('delete')}</button>
        </div>

        <EffectiveFieldTable
          testid="route-fields"
          rows={viewModel.routeFieldsOf(functionKey, index, profile)}
          onOverride={(request) =>
            viewModel.setRouteField(functionKey, index, request.field.field as 'path', request.value as never)}
          onClear={(field) =>
            viewModel.setRouteField(functionKey, index, field.field as 'summary', undefined as never)}
        />

        <!-- bind の行は関数の引数から並ぶ。引数名を人に打たせない。 -->
        <div class="flex flex-col gap-1">
          <span class="text-[10px] font-bold uppercase tracking-wide text-[color:var(--rvc-muted)]">bind</span>
          {#each args as argument}
            {@const kind = viewModel.bindKind(functionKey, index, argument.name)}
            {@const rule = viewModel.bindRule(functionKey, index, argument.name)}
            <div data-testid="bind" data-arg={argument.name} data-kind={kind} data-required={argument.required} class="grid grid-cols-[1fr_auto_1fr] items-center gap-2">
              <span class="font-mono text-[11px] rvc-value">
                {argument.name} <span class="text-[color:var(--rvc-muted)]">{argument.type}</span>
                {#if argument.required}<span style="color:var(--rvc-danger)">*</span>{/if}
              </span>
              <select
                data-testid="bind-kind"
                data-arg={argument.name}
                class="rounded-md border border-[color:var(--rvc-border)] bg-[color:var(--rvc-bg)] px-2 py-1 text-[11px]"
                value={kind}
                onchange={(event) => viewModel.setBind(functionKey, index, argument.name, event.currentTarget.value as BindKind, '')}
              >
                {#each bindKinds as option}<option value={option.value}>{$t(option.key)}</option>{/each}
              </select>
              <input
                data-testid="bind-value"
                data-arg={argument.name}
                class="rounded-md border border-[color:var(--rvc-border)] bg-[color:var(--rvc-bg)] px-2 py-1 font-mono text-[11px] disabled:opacity-40"
                disabled={kind === 'unbound'}
                value={rule?.const !== undefined ? String(rule.const) : (rule?.name ?? '')}
                placeholder={kind === 'const' ? $t('mf_bind_const_placeholder') : argument.name}
                oninput={(event) => viewModel.setBind(functionKey, index, argument.name, kind, event.currentTarget.value)}
              />
            </div>
          {/each}
          {#if args.length === 0}
            <span class="text-[11px] text-[color:var(--rvc-muted)]">{$t('mf_no_bind')}</span>
          {/if}
        </div>
      </div>
    {/each}
  {/if}

  {#if diagnostics.length > 0}
    <div class="mt-4 border-t border-[color:var(--rvc-border)] pt-4">
      <DiagnosticList {diagnostics} />
    </div>
  {/if}

  {#if onOpenHelp}
    <p class="mt-3 text-[11px] text-[color:var(--rvc-muted)]">
      {$t('mf_format_help')}
      <button
        data-testid="open-help"
        data-help-page="manifest-operations"
        class="font-semibold text-[color:var(--rvc-accent)]"
        onclick={() => onOpenHelp('manifest-operations')}
      >{$t('mf_open_help')}</button>
    </p>
  {/if}

  {#snippet footer()}
    {#if viewModel.state.errorMessage}
      <span data-testid="save-error" class="min-w-0 flex-1 truncate text-xs rvc-value" style="color:var(--rvc-danger)">
        {viewModel.state.errorMessage}
      </span>
    {:else}
      <span data-testid="override-count" data-count={overridden} class="min-w-0 flex-1 truncate text-[11px] text-[color:var(--rvc-muted)]">
        {$t('mf_override_count').replace('{n}', String(overridden)).replace('{total}', String(fields.length))}
      </span>
    {/if}
    <button
      data-testid="revert-manifest"
      class="rounded-md border border-[color:var(--rvc-border)] px-3 py-1.5 text-xs disabled:opacity-40"
      disabled={!viewModel.isDirty}
      onclick={() => viewModel.revert()}
    >{$t('mf_revert')}</button>
    <button
      data-testid="save-manifest"
      class="rounded-md bg-[color:var(--rvc-accent)] px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-40"
      disabled={viewModel.state.isSaving}
      onclick={() => (operation ? viewModel.save() : viewModel.declareOperation(functionKey))}
    >{operation ? $t('mf_save') : $t('mf_declare_with_values')}</button>
  {/snippet}
</Drawer>
