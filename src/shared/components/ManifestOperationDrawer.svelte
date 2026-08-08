<script lang="ts">
  import Drawer from '@/shared/components/Drawer.svelte';
  import DiagnosticList from '@/shared/components/DiagnosticList.svelte';
  import StatusBadge from '@/shared/components/StatusBadge.svelte';
  import SegmentedControl from '@/shared/components/SegmentedControl.svelte';
  import FieldGrid from '@/shared/components/FieldGrid.svelte';
  import type { FieldSpec } from '@/shared/components/Field.svelte';
  import type { ManifestViewModel } from '@/modules/manifest/viewmodels/ManifestViewModel.svelte';
  import {
    diagnosticsOf,
    functionNameOf,
    toCamelCase,
    type BindKind
  } from '@/modules/manifest/services/ManifestService';
  import { HTTP_METHODS, type HttpMethod, type ProfileName } from '@/modules/manifest/types/Manifest';
  import type { MessageKey } from '@/shared/i18n/messages';
  import { translate as t } from '@/shared/i18n/i18n.svelte';

  // 1 関数の宣言を編集する。入力を減らすため、DB から分かることは書かせない。
  //   - 引数の行は pg_proc の並びで出す（bind のキーは DB 上の引数名でなければならない）
  //   - parameters(in=path) は path の {param} から作る
  //   - description の既定は関数の COMMENT
  //   - security は「要認証 / 公開」の二択に畳む（生の JSON を書かせない）
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

  let mode = $state<'form' | 'json'>('form');

  const operation = $derived(viewModel.operationOf(functionKey));
  const args = $derived(viewModel.argumentsOf(functionKey));
  const fn = $derived(viewModel.functionOf(functionKey));
  const routes = $derived(viewModel.routesOf(functionKey));
  const diagnostics = $derived(diagnosticsOf(viewModel.state.diagnostics, functionKey));
  const defaults = $derived(viewModel.state.draft?.defaults ?? {});
  const inferredOperationId = $derived(toCamelCase(functionNameOf(functionKey)));

  /** 既に使われている operationGroup。選ばせれば打ち直さずに済む。 */
  const knownGroups = $derived.by(() => {
    const groups = new Set<string>();
    for (const value of Object.values(viewModel.state.draft?.operations ?? {})) {
      if (value.operationGroup) groups.add(value.operationGroup);
    }
    if (defaults.operationGroup) groups.add(defaults.operationGroup);
    return [...groups].sort();
  });

  const securityValue = $derived(
    operation?.security ? (operation.security.length === 0 ? 'public' : 'bearer') : ''
  );

  const bindKinds: { value: BindKind; key: MessageKey }[] = [
    { value: 'body', key: 'mf_bind_body' },
    { value: 'path', key: 'mf_bind_path' },
    { value: 'const', key: 'mf_bind_const' },
    { value: 'unbound', key: 'mf_bind_unbound' }
  ];

  /** operation 単位の項目。既定は placeholder で見せ、書かせない。 */
  const operationFields = $derived<FieldSpec[]>([
    { name: 'operationId', kind: 'text', value: operation?.operationId ?? '', placeholder: inferredOperationId },
    {
      name: 'operationGroup',
      kind: 'text',
      value: operation?.operationGroup ?? '',
      placeholder: defaults.operationGroup ?? $t('mf_from_defaults'),
      suggestions: knownGroups,
      mono: false
    },
    {
      name: 'tags',
      kind: 'text',
      value: (operation?.tags ?? []).join(', '),
      placeholder: (defaults.tags ?? []).join(', ') || $t('mf_from_defaults'),
      mono: false
    },
    {
      name: 'security',
      kind: 'select',
      value: securityValue,
      options: [
        { value: '', label: $t('mf_from_defaults') },
        { value: 'bearer', label: $t('mf_security_bearer') },
        { value: 'public', label: $t('mf_security_public') }
      ]
    }
  ]);

  function setOperationField(name: string, value: string): void {
    if (name === 'tags') return setTags(value);
    if (name === 'security') return setSecurity(value);
    viewModel.setOperationField(functionKey, name as 'operationId', value);
  }

  /** ルート 1 本分の項目。path を変えると parameters が作り直される。 */
  function routeFields(route: { operationId?: string; method?: string; path?: string; summary?: string }): FieldSpec[] {
    return [
      {
        name: 'operationId',
        kind: 'text',
        value: route.operationId ?? '',
        placeholder: operation?.operationId ?? inferredOperationId
      },
      {
        name: 'method',
        kind: 'select',
        value: route.method ?? 'POST',
        options: HTTP_METHODS.map((method) => ({ value: method, label: method }))
      },
      { name: 'path', kind: 'text', value: route.path ?? '', placeholder: '/{documentType}' },
      { name: 'summary', kind: 'text', value: route.summary ?? '', mono: false }
    ];
  }

  function setRouteField(index: number, name: string, value: string): void {
    viewModel.setRouteField(functionKey, index, name as 'path', value as never);
  }

  function setTags(value: string): void {
    const tags = value.split(',').map((tag) => tag.trim()).filter((tag) => tag.length > 0);
    viewModel.setOperationField(functionKey, 'tags', tags.length > 0 ? tags : undefined);
  }

  function setSecurity(value: string): void {
    viewModel.setOperationField(
      functionKey,
      'security',
      value === 'public' ? [] : value === 'bearer' ? [{ bearerAuth: [] }] : undefined
    );
  }
</script>

<Drawer
  title={functionKey}
  testid="operation-drawer"
  dataAttributes={{ 'data-operation': functionKey, 'data-profile': profile }}
  {onClose}
>
  {#snippet header()}
    <span data-testid="dirty" data-dirty={viewModel.isDirty}>
      {#if viewModel.isDirty}<StatusBadge label={$t('mf_unsaved_draft')} tone="warning" />{/if}
    </span>
    <div class="w-44">
      <SegmentedControl
        options={[{ label: $t('mf_tab_form'), value: 'form' }, { label: 'JSON', value: 'json' }]}
        value={mode}
        onSelect={(value) => (mode = value as 'form' | 'json')}
      />
    </div>
  {/snippet}

  {#if !operation}
    <!-- 宣言が無い関数。既定拒否で非公開になっているだけなので、足すかどうかは人の判断。 -->
    <div class="flex flex-col items-start gap-3 rounded-lg border border-[color:var(--rvc-border)] p-4">
      <p class="text-sm">{$t('mf_undeclared_body')}</p>
      {#if fn?.comment}
        <p class="text-xs text-[color:var(--rvc-muted)] rvc-value">{fn.comment}</p>
      {/if}
      <button
        data-testid="declare-operation"
        class="rounded-md bg-[color:var(--rvc-accent)] px-3 py-1.5 text-xs font-semibold text-white"
        onclick={() => viewModel.declareOperation(functionKey)}
      >{$t('mf_declare')}</button>
    </div>
  {:else if mode === 'json'}
    <pre class="overflow-x-auto rounded-lg border border-[color:var(--rvc-border)] bg-[color:var(--rvc-search)] p-3 font-mono text-[11px] leading-relaxed rvc-value">{JSON.stringify(operation, null, 2)}</pre>
  {:else}
    <div class="flex flex-col gap-4">
      <FieldGrid fields={operationFields} testid="operation-field" onInput={setOperationField} />

      <label class="flex flex-col gap-1">
        <span class="flex items-center gap-2 text-[10px] font-bold uppercase tracking-wide text-[color:var(--rvc-muted)]">
          description
          {#if fn?.comment && fn.comment !== operation.description}
            <button
              data-testid="use-function-comment"
              class="text-[10px] font-semibold normal-case text-[color:var(--rvc-accent)]"
              onclick={() => viewModel.setOperationField(functionKey, 'description', fn.comment ?? '')}
            >{$t('mf_use_comment')}</button>
          {/if}
        </span>
        <textarea
          data-testid="operation-field"
          data-field="description"
          class="rounded-md border border-[color:var(--rvc-border)] bg-[color:var(--rvc-bg)] px-2 py-1 text-xs"
          rows="2"
          value={operation.description ?? ''}
          placeholder={fn?.comment ?? ''}
          oninput={(event) => viewModel.setOperationField(functionKey, 'description', event.currentTarget.value)}
        ></textarea>
      </label>

      {#if profile === 'bff'}
        <div class="flex flex-wrap items-center gap-3 border-t border-[color:var(--rvc-border)] pt-4">
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
          <div data-testid="route" data-route-id={route.operationId ?? ''} data-index={index} class="flex flex-col gap-3 rounded-lg border border-[color:var(--rvc-border)] p-3">
            <FieldGrid
              fields={routeFields(route)}
              testid="route-field"
              data={{ 'data-index': String(index) }}
              onInput={(name, value) => setRouteField(index, name, value)}
            />
            <span class="text-[11px] text-[color:var(--rvc-muted)]">
              {$t('mf_path_hint')}
              {#each route.parameters ?? [] as parameter}
                <span data-testid="route-parameter" data-name={parameter.name} class="ml-1 font-mono">{parameter.name}</span>
              {/each}
            </span>

            <div class="flex flex-col gap-1">
              <span class="text-[10px] font-bold uppercase tracking-wide text-[color:var(--rvc-muted)]">bind</span>
              {#each args as argument}
                {@const kind = viewModel.bindKind(functionKey, index, argument.name)}
                {@const rule = viewModel.bindRule(functionKey, index, argument.name)}
                <div data-testid="bind" data-arg={argument.name} data-kind={kind} data-required={argument.required} class="grid grid-cols-[1fr_auto_1fr] items-center gap-2">
                  <span class="font-mono text-[11px] rvc-value">
                    {argument.name}
                    <span class="text-[color:var(--rvc-muted)]">{argument.type}</span>
                    {#if argument.required}<span style="color:var(--rvc-danger)">*</span>{/if}
                  </span>
                  <select
                    data-testid="bind-kind"
                    data-arg={argument.name}
                    class="rounded-md border border-[color:var(--rvc-border)] bg-[color:var(--rvc-bg)] px-2 py-1 text-[11px]"
                    value={kind}
                    onchange={(event) =>
                      viewModel.setBind(functionKey, index, argument.name, event.currentTarget.value as BindKind, '')}
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
                    oninput={(event) =>
                      viewModel.setBind(functionKey, index, argument.name, kind, event.currentTarget.value)}
                  />
                </div>
              {/each}
              {#if args.length === 0}
                <span class="text-[11px] text-[color:var(--rvc-muted)]">{$t('mf_no_bind')}</span>
              {/if}
            </div>

            <div class="flex gap-2">
              <button
                data-testid="duplicate-route"
                data-index={index}
                class="rounded-md border border-[color:var(--rvc-border)] px-2.5 py-1 text-xs"
                onclick={() => viewModel.duplicateRoute(functionKey, index)}
              >{$t('mf_duplicate_route')}</button>
              <button
                data-testid="remove-route"
                data-index={index}
                class="rounded-md border px-2.5 py-1 text-xs"
                style="border-color:var(--rvc-danger);color:var(--rvc-danger)"
                onclick={() => viewModel.removeRoute(functionKey, index)}
              >{$t('delete')}</button>
            </div>
          </div>
        {/each}
      {/if}

      {#if diagnostics.length > 0}
        <div class="border-t border-[color:var(--rvc-border)] pt-4">
          <DiagnosticList {diagnostics} />
        </div>
      {/if}

      {#if onOpenHelp}
        <p class="text-[11px] text-[color:var(--rvc-muted)]">
          {$t('mf_format_help')}
          <button
            data-testid="open-help"
            data-help-page="manifest-operations"
            class="font-semibold text-[color:var(--rvc-accent)]"
            onclick={() => onOpenHelp('manifest-operations')}
          >{$t('mf_open_help')}</button>
        </p>
      {/if}
    </div>
  {/if}

  {#snippet footer()}
    {#if viewModel.state.errorMessage}
      <span data-testid="save-error" class="min-w-0 flex-1 truncate text-xs rvc-value" style="color:var(--rvc-danger)">
        {viewModel.state.errorMessage}
      </span>
    {:else}
      <span class="min-w-0 flex-1 truncate text-[11px] text-[color:var(--rvc-muted)]">{$t('mf_save_hint')}</span>
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
      disabled={viewModel.state.isSaving || !viewModel.isDirty}
      onclick={() => viewModel.save()}
    >{$t('mf_save')}</button>
  {/snippet}
</Drawer>
