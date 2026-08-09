<script module lang="ts">
  /**
   * 全項目を「有効値 + 由来」で並べ、違うところだけ上書きさせる。
   *
   * 空欄を並べて人に埋めさせる形にしない。値はすべて推論・継承で埋まっているので、
   * 人が設定する項目は 0 でも成立する。一覧には宣言できる項目がすべて並ぶので、
   * 画面から到達できない項目が存在しない（項目の定義は rv_meta.manifest_fields() が原本）。
   */
  export type OverrideRequest = {
    field: ManifestField;
    value: string;
    scope: OverrideScope;
  };
</script>

<script lang="ts">
  import StatusBadge from '@/shared/components/StatusBadge.svelte';
  import type {
    EffectiveField,
    FieldSource,
    ManifestField,
    OverrideScope
  } from '@/modules/manifest/types/ManifestField';
  import type { MessageKey } from '@/shared/i18n/messages';
  import { translate as t } from '@/shared/i18n/i18n.svelte';

  let {
    testid,
    /** 同じ画面に同じ表が複数あるとき（profile ごとなど）に区別する data-*。 */
    data = {},
    rows,
    /** 上書き先を選ばせるか。operation の項目だけ、より上の層へ書ける。 */
    scopes = ['own'],
    onOverride,
    onClear
  }: {
    testid: string;
    data?: Record<string, string>;
    rows: EffectiveField[];
    scopes?: OverrideScope[];
    onOverride: (request: OverrideRequest) => void;
    onClear: (field: ManifestField) => void;
  } = $props();

  // 既定は「触った項目だけ」。全項目は確認したいときに開く。
  let showAll = $state(false);
  let editingField = $state<string | null>(null);
  let draftValue = $state('');
  let draftScope = $state<OverrideScope>('own');

  // responses は「status と参照先」の組を足していく形にする。生の JSON を書かせない。
  const RESPONSE_STATUSES = [
    { code: '422', key: 'mf_res_422' as MessageKey },
    { code: '404', key: 'mf_res_404' as MessageKey },
    { code: '409', key: 'mf_res_409' as MessageKey },
    { code: '500', key: 'mf_res_500' as MessageKey }
  ];
  const responseRefs = [
    { value: 'components', label: 'components/responses の既定' },
    { value: 'Error', label: 'Error スキーマを参照' },
    { value: 'none', label: '説明だけ（本文なし）' }
  ];
  let responseStatus = $state('422');
  let responseRef = $state('components');
  let responseDraft = $state<{ status: string; ref: string }[]>([]);

  function addResponse(): void {
    if (responseDraft.some((entry) => entry.status === responseStatus)) return;
    responseDraft = [...responseDraft, { status: responseStatus, ref: responseRef }];
    // 上書きの値は「status:ref」の並び。宣言への変換は Service が引き受ける。
    draftValue = responseDraft.map((entry) => `${entry.status}:${entry.ref}`).join(',');
  }

  const sourceLabels: Record<FieldSource, string> = {
    own: 'own',
    profile: 'profile',
    defaults: 'defaults',
    inferred: 'inferred',
    auto: 'auto',
    none: 'none'
  };
  const sourceTones: Record<FieldSource, 'success' | 'accent' | 'warning' | 'muted'> = {
    own: 'success',
    profile: 'accent',
    defaults: 'warning',
    inferred: 'muted',
    auto: 'muted',
    none: 'muted'
  };
  const scopeKeys: Record<OverrideScope, MessageKey> = {
    own: 'mf_scope_own',
    profile: 'mf_scope_profile',
    defaults: 'mf_scope_defaults'
  };

  const visible = $derived(
    showAll ? rows : rows.filter((row) => row.source === 'own' || row.source === 'none')
  );

  function startEdit(row: EffectiveField): void {
    editingField = row.definition.field;
    draftValue = row.source === 'none' ? '' : row.value;
    draftScope = 'own';
    responseDraft = [];
  }

  function commit(row: EffectiveField): void {
    onOverride({ field: row.definition, value: draftValue, scope: draftScope });
    editingField = null;
  }
</script>

<!-- 切り替えと一覧は 1 つの塊。テストと自動操作が testid 配下で完結するようにする。 -->
<div data-testid={testid} {...data}>
<div class="mb-2 flex flex-wrap items-center gap-3">
  <div class="flex gap-1 rounded-lg bg-[color:var(--rvc-search)] p-1">
    <button
      data-testid="show-touched"
      class={`rounded-md px-3 py-1 text-xs ${showAll ? '' : 'bg-[color:var(--rvc-accent)] text-white'}`}
      onclick={() => (showAll = false)}
    >{$t('mf_only_touched')}</button>
    <button
      data-testid="show-all"
      class={`rounded-md px-3 py-1 text-xs ${showAll ? 'bg-[color:var(--rvc-accent)] text-white' : ''}`}
      onclick={() => (showAll = true)}
    >{$t('mf_all_fields').replace('{n}', String(rows.length))}</button>
  </div>
  <span class="text-[11px] text-[color:var(--rvc-muted)]">{$t('mf_effective_hint')}</span>
</div>

<div class="overflow-hidden rounded-lg border border-[color:var(--rvc-border)]">
  {#each visible as row (row.definition.field)}
    <div
      data-testid="field-row"
      data-field={row.definition.field}
      data-source={row.source}
      class="border-b border-[color:var(--rvc-border)] px-3 py-2 last:border-b-0"
      style={row.source === 'own' ? 'background:color-mix(in srgb, var(--rvc-accent) 5%, transparent)' : ''}
    >
      <div class="flex flex-wrap items-start gap-3">
        <!-- 何を書けばよいかを常時出す。ツールチップだと、迷っている人ほど気づけない。 -->
        <span class="flex w-52 shrink-0 flex-col gap-0.5">
          <span class="truncate font-mono text-[11px] font-semibold rvc-value">
            {row.definition.field}
            {#if row.definition.isRequired}<span style="color:var(--rvc-danger)">*</span>{/if}
          </span>
          {#if row.definition.note}
            <span data-testid="field-note" class="text-[10.5px] leading-snug text-[color:var(--rvc-muted)]">
              {row.definition.note}
            </span>
          {/if}
        </span>
        <span
          data-testid="field-value"
          class={`min-w-0 flex-1 truncate font-mono text-[11px] rvc-value ${row.source === 'none' ? 'italic text-[color:var(--rvc-muted)]' : ''}`}
        >{row.value}</span>
        <span data-testid="field-source" data-source={row.source} class="shrink-0">
          <StatusBadge label={sourceLabels[row.source]} tone={sourceTones[row.source]} />
        </span>
        <span class="flex shrink-0 gap-2">
          {#if row.definition.kind !== 'auto' && row.definition.kind !== 'routes' && row.definition.kind !== 'bind'}
            <button
              data-testid="field-edit"
              data-field={row.definition.field}
              class="text-xs font-semibold text-[color:var(--rvc-accent)]"
              onclick={() => startEdit(row)}
            >{row.source === 'own' ? $t('mf_fix') : $t('mf_override')}</button>
          {/if}
          {#if row.source === 'own'}
            <button
              data-testid="field-clear"
              data-field={row.definition.field}
              class="text-xs text-[color:var(--rvc-muted)]"
              onclick={() => onClear(row.definition)}
            >{$t('mf_revert_field')}</button>
          {/if}
        </span>
      </div>

      {#if editingField === row.definition.field}
        <div data-testid="field-editor" data-field={row.definition.field} class="mt-2 flex flex-col gap-2">
          {#if row.definition.kind === 'choice'}
            <select
              data-testid="field-input"
              class="rounded-md border border-[color:var(--rvc-border)] bg-[color:var(--rvc-bg)] px-2 py-1 text-xs"
              bind:value={draftValue}
            >
              {#each row.definition.options ?? [] as option}<option value={option}>{option}</option>{/each}
            </select>
          {:else if row.definition.kind === 'textarea'}
            <textarea
              data-testid="field-input"
              class="rounded-md border border-[color:var(--rvc-border)] bg-[color:var(--rvc-bg)] px-2 py-1 text-xs"
              rows="2"
              bind:value={draftValue}
            ></textarea>
          {:else if row.definition.kind === 'responses'}
            <!--
              status と参照先を選ぶだけにする。生の JSON は書かせない。
              200 は戻り値の型から推論されるので、ここで足すのはエラー応答だけ。
            -->
            <div class="flex flex-col gap-2">
              <div class="flex flex-wrap items-center gap-2">
                <select
                  data-testid="response-status"
                  class="rounded-md border border-[color:var(--rvc-border)] bg-[color:var(--rvc-bg)] px-2 py-1 text-xs"
                  bind:value={responseStatus}
                >
                  {#each RESPONSE_STATUSES as status}
                    <option value={status.code}>{status.code} — {$t(status.key)}</option>
                  {/each}
                </select>
                <select
                  data-testid="response-ref"
                  class="rounded-md border border-[color:var(--rvc-border)] bg-[color:var(--rvc-bg)] px-2 py-1 text-xs"
                  bind:value={responseRef}
                >
                  {#each responseRefs as ref}<option value={ref.value}>{ref.label}</option>{/each}
                </select>
                <button
                  data-testid="response-add"
                  class="rounded-md border border-[color:var(--rvc-border)] px-2.5 py-1 text-xs"
                  onclick={addResponse}
                >{$t('mf_res_add')}</button>
              </div>
              {#if responseDraft.length > 0}
                <div class="flex flex-wrap gap-1">
                  {#each responseDraft as entry}
                    <span data-testid="response-entry" data-status={entry.status} class="rounded bg-[color:var(--rvc-search)] px-2 py-0.5 font-mono text-[11px]">
                      {entry.status} → {entry.ref}
                    </span>
                  {/each}
                </div>
              {/if}
              <input data-testid="field-input" type="hidden" bind:value={draftValue} />
              <span class="text-[11px] text-[color:var(--rvc-muted)]">{$t('mf_responses_hint')}</span>
            </div>
          {:else}
            <input
              data-testid="field-input"
              class="rounded-md border border-[color:var(--rvc-border)] bg-[color:var(--rvc-bg)] px-2 py-1 font-mono text-xs"
              bind:value={draftValue}
              placeholder={row.definition.derivedFrom ?? ''}
            />
          {/if}

          {#if row.definition.note}
            <span class="text-[11px] text-[color:var(--rvc-muted)]">{row.definition.note}</span>
          {/if}

          {#if scopes.length > 1}
            <!-- 書く場所をその場で選ばせる。階層を先に理解しなくてよいようにするため。 -->
            <label class="flex flex-col gap-1">
              <span class="text-[10px] font-bold uppercase tracking-wide text-[color:var(--rvc-muted)]">{$t('mf_scope')}</span>
              <select
                data-testid="field-scope"
                class="rounded-md border border-[color:var(--rvc-border)] bg-[color:var(--rvc-bg)] px-2 py-1 text-xs"
                bind:value={draftScope}
              >
                {#each scopes as scope}<option value={scope}>{$t(scopeKeys[scope])}</option>{/each}
              </select>
            </label>
          {/if}

          <div class="flex justify-end gap-2">
            <button class="rounded-md border border-[color:var(--rvc-border)] px-2.5 py-1 text-xs" onclick={() => (editingField = null)}>
              {$t('cancel')}
            </button>
            <button
              data-testid="field-commit"
              class="rounded-md bg-[color:var(--rvc-accent)] px-2.5 py-1 text-xs font-semibold text-white"
              onclick={() => commit(row)}
            >{$t('mf_override')}</button>
          </div>
        </div>
      {/if}
    </div>
  {/each}
  {#if visible.length === 0}
    <div class="px-4 py-6 text-xs text-[color:var(--rvc-muted)]">{$t('mf_nothing_touched')}</div>
  {/if}
</div>
</div>
