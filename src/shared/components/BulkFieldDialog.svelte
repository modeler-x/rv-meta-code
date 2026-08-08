<script lang="ts">
  import type { ManifestViewModel } from '@/modules/manifest/viewmodels/ManifestViewModel.svelte';
  import type { ManifestField, OverrideScope } from '@/modules/manifest/types/ManifestField';
  import type { ProfileName } from '@/modules/manifest/types/Manifest';
  import type { MessageKey } from '@/shared/i18n/messages';
  import { translate as t } from '@/shared/i18n/i18n.svelte';

  /**
   * 選んだ operation へ同じ値をまとめて書く。
   *
   * 1500 件を 1 件ずつ開くのは現実的ではない。加えて、適用範囲に「全体」を選べば
   * operation 側の宣言が増えず、あとから一括で変えられる。
   */
  let {
    viewModel,
    profile,
    functionKeys,
    onClose
  }: {
    viewModel: ManifestViewModel;
    profile: ProfileName;
    functionKeys: string[];
    onClose: () => void;
  } = $props();

  // まとめて設定できるのは operation の項目のうち、値が 1 つに定まるものだけ。
  // publicRoutes のように operation ごとに中身が違うものは対象にしない。
  const fields = $derived(
    viewModel.state.fields.filter(
      (field) =>
        field.level === 'operation' && !['routes', 'bind', 'auto', 'responses'].includes(field.kind)
    )
  );

  let selectedField = $state<ManifestField | null>(null);
  let value = $state('');
  let scope = $state<OverrideScope>('own');

  const current = $derived(selectedField ?? fields[0] ?? null);
  const scopeKeys: Record<OverrideScope, MessageKey> = {
    own: 'mf_scope_own',
    profile: 'mf_scope_profile',
    defaults: 'mf_scope_defaults'
  };

  function apply(): void {
    if (!current) return;
    viewModel.overrideMany(functionKeys, current, value, scope, profile);
    onClose();
  }

  function onKeydown(event: KeyboardEvent): void {
    if (event.key === 'Escape') onClose();
  }
</script>

<svelte:window on:keydown={onKeydown} />

<!-- svelte-ignore a11y_click_events_have_key_events, a11y_no_static_element_interactions -->
<div class="fixed inset-0 z-40 bg-black/35" onclick={onClose}></div>

<div
  data-testid="bulk-dialog"
  data-count={functionKeys.length}
  class="fixed left-1/2 top-1/2 z-50 flex w-[min(470px,92vw)] -translate-x-1/2 -translate-y-1/2 flex-col gap-3 rounded-xl border border-[color:var(--rvc-border)] bg-[color:var(--rvc-panel)] p-5 shadow-2xl"
  role="dialog"
  aria-modal="true"
>
  <h3 class="text-sm font-semibold">{$t('mf_bulk_title').replace('{n}', String(functionKeys.length))}</h3>

  <label class="flex flex-col gap-1">
    <span class="text-[10px] font-bold uppercase tracking-wide text-[color:var(--rvc-muted)]">{$t('mf_bulk_field')}</span>
    <select
      data-testid="bulk-field"
      class="rounded-md border border-[color:var(--rvc-border)] bg-[color:var(--rvc-bg)] px-2 py-1 font-mono text-xs"
      value={current?.field ?? ''}
      onchange={(event) => {
        selectedField = fields.find((f) => f.field === event.currentTarget.value) ?? null;
        value = '';
      }}
    >
      {#each fields as field}<option value={field.field}>{field.field}</option>{/each}
    </select>
  </label>

  <label class="flex flex-col gap-1">
    <span class="text-[10px] font-bold uppercase tracking-wide text-[color:var(--rvc-muted)]">{$t('mf_bulk_value')}</span>
    {#if current?.kind === 'choice'}
      <select
        data-testid="bulk-value"
        class="rounded-md border border-[color:var(--rvc-border)] bg-[color:var(--rvc-bg)] px-2 py-1 text-xs"
        bind:value
      >
        {#each current.options ?? [] as option}<option value={option}>{option}</option>{/each}
      </select>
    {:else}
      <input
        data-testid="bulk-value"
        class="rounded-md border border-[color:var(--rvc-border)] bg-[color:var(--rvc-bg)] px-2 py-1 font-mono text-xs"
        bind:value
      />
    {/if}
  </label>

  <label class="flex flex-col gap-1">
    <span class="text-[10px] font-bold uppercase tracking-wide text-[color:var(--rvc-muted)]">{$t('mf_scope')}</span>
    <select
      data-testid="bulk-scope"
      class="rounded-md border border-[color:var(--rvc-border)] bg-[color:var(--rvc-bg)] px-2 py-1 text-xs"
      bind:value={scope}
    >
      {#each ['own', 'profile', 'defaults'] as const as option}
        <option value={option}>{$t(scopeKeys[option])}</option>
      {/each}
    </select>
  </label>

  <p class="text-[11px] text-[color:var(--rvc-muted)]">{$t('mf_bulk_hint')}</p>

  <div class="flex justify-end gap-2">
    <button class="rounded-md border border-[color:var(--rvc-border)] px-3 py-1.5 text-xs" onclick={onClose}>
      {$t('cancel')}
    </button>
    <button
      data-testid="bulk-apply"
      class="rounded-md bg-[color:var(--rvc-accent)] px-3 py-1.5 text-xs font-semibold text-white"
      onclick={apply}
    >{$t('mf_override')}</button>
  </div>
</div>
