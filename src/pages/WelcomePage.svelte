<script lang="ts">
  import { Database, FileText, History, Table2 } from 'lucide-svelte';
  import type { AppRouteName } from '@/app/router/AppRoute';
  import { translate as t } from '@/shared/i18n/i18n.svelte';
  export let onNavigate: (name: AppRouteName) => void;
  const cards = [
    { route: 'schema', titleKey: 'card_schema_t', detailKey: 'card_schema_d', icon: Database, color: '#0090a8' },
    { route: 'entities', titleKey: 'card_entities_t', detailKey: 'card_entities_d', icon: Table2, color: '#0087aa' },
    { route: 'documents', titleKey: 'card_docs_t', detailKey: 'card_docs_d', icon: FileText, color: '#399ecc' },
    { route: 'recent', titleKey: 'card_recent_t', detailKey: 'card_recent_d', icon: History, color: '#69aac6' }
  ] as const;
</script>

<div class="py-6 text-center">
  <div class="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-2xl bg-[color:var(--rvc-accent)] text-3xl font-bold text-white shadow-lg">Rv</div>
  <h2 class="text-2xl font-bold">Rv Meta Code</h2>
  <p class="mx-auto mt-2 max-w-md text-sm leading-6 text-[color:var(--rvc-muted)]">{$t('welcome_desc')}</p>
</div>
<div class="grid grid-cols-2 gap-3">
  {#each cards as card}
    <button class="rounded-xl border border-[color:var(--rvc-border)] bg-[color:var(--rvc-panel)] p-4 text-left shadow-sm hover:border-[color:var(--rvc-accent)]" on:click={() => onNavigate(card.route)}>
      <span class="mb-3 flex h-8 w-8 items-center justify-center rounded-lg text-white" style={`background:${card.color}`}><svelte:component this={card.icon} size={17} /></span>
      <span class="block font-semibold">{$t(card.titleKey)}</span>
      <span class="mt-1 block text-xs leading-5 text-[color:var(--rvc-muted)]">{$t(card.detailKey)}</span>
    </button>
  {/each}
</div>
