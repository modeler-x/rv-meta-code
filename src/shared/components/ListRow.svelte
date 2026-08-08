<script module lang="ts">
  /**
   * 一覧の 1 行。スキーマ・マニフェスト・オペレーションで同じ形にする。
   *
   * 行ごとに手で組むと、選択の当たり判定・data-* の付け方・バッジの並びが
   * ページごとに少しずつ違ってしまい、テストも 3 通り書くことになる。
   * ここに畳んでおけば、行の契約を確かめるテストは 1 本で済む。
   */
  export type RowBadge = {
    testid: string;
    label: string;
    tone?: 'accent' | 'success' | 'warning' | 'danger' | 'muted';
    /** バッジを値で引くための data-*。テストが文言に依存しないようにする。 */
    data?: Record<string, string>;
  };

  export type RowAction = { testid: string; label: string; onClick: () => void; data?: Record<string, string> };
</script>

<script lang="ts">
  import SectionListRow from '@/shared/components/SectionListRow.svelte';
  import IconTile from '@/shared/components/IconTile.svelte';
  import HighlightText from '@/shared/components/HighlightText.svelte';
  import StatusBadge from '@/shared/components/StatusBadge.svelte';

  let {
    testid,
    data = {},
    icon,
    title,
    subtitle = '',
    query = '',
    badges = [],
    action,
    selected,
    onToggle,
    onOpen
  }: {
    testid: string;
    /** 行を特定する data-*。テストと自動操作は名前ではなくこれで引く。 */
    data?: Record<string, string>;
    icon?: { label: string; color: string };
    title: string;
    subtitle?: string;
    /** 検索語。一致箇所を強調する。 */
    query?: string;
    badges?: RowBadge[];
    action?: RowAction;
    /** 選択機構を使わない一覧では省略する。 */
    selected?: boolean;
    onToggle?: () => void;
    onOpen?: () => void;
  } = $props();
</script>

<SectionListRow>
  <span data-testid={testid} {...data} class="contents">
    {#if onToggle}
      <input
        type="checkbox"
        data-testid={`${testid}-select`}
        class="checkbox checkbox-sm"
        checked={selected}
        aria-label={title}
        onchange={onToggle}
      />
    {/if}
    <button class="flex min-w-0 flex-1 items-center gap-3 text-left" onclick={() => (onOpen ?? onToggle)?.()}>
      {#if icon}<IconTile label={icon.label} color={icon.color} />{/if}
      <span class="min-w-0 flex-1">
        <span class="block truncate font-mono text-xs font-semibold rvc-value"><HighlightText text={title} {query} /></span>
        {#if subtitle}
          <span class="block truncate text-xs text-[color:var(--rvc-muted)] rvc-value"><HighlightText text={subtitle} {query} /></span>
        {/if}
      </span>
      <span class="flex shrink-0 items-center gap-1">
        {#each badges as badge}
          <span data-testid={badge.testid} {...badge.data ?? {}}>
            <StatusBadge label={badge.label} tone={badge.tone ?? 'muted'} />
          </span>
        {/each}
      </span>
    </button>
    {#if action}
      <button
        data-testid={action.testid}
        {...action.data ?? {}}
        class="shrink-0 rounded-md border border-[color:var(--rvc-border)] px-2.5 py-1 text-xs"
        onclick={action.onClick}
      >{action.label}</button>
    {/if}
  </span>
</SectionListRow>
