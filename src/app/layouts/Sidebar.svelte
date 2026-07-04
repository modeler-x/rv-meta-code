<script lang="ts">
  import { Database, FileText, History, Home, Table2, UserRound } from 'lucide-svelte';
  import type { AppRoute, AppRouteName } from '@/app/router/AppRoute';
  import { translate as t } from '@/shared/i18n/i18n.svelte';
  export let route: AppRoute;
  export let onNavigate: (name: AppRouteName) => void;
  const items = [
    { name: 'welcome', key: 'nav_welcome', icon: Home },
    { name: 'schema', key: 'nav_schemas', icon: Database },
    { name: 'documents', key: 'nav_documents', icon: FileText },
    { name: 'entities', key: 'nav_entities', icon: Table2 },
    { name: 'recent', key: 'nav_recent', icon: History }
  ] as const;
</script>

<aside class="flex min-h-0 flex-col border-r border-[color:var(--rvc-border)] bg-[color:var(--rvc-sidebar)] backdrop-blur-xl">
  <div class="flex h-[52px] shrink-0 items-center gap-2 px-4">
    <span class="flex h-6 w-6 items-center justify-center rounded-md bg-[color:var(--rvc-accent)] text-[11px] font-bold text-white">Rv</span>
    <span class="text-[13px] font-semibold">Rv Meta Code</span>
  </div>
  <nav class="min-h-0 flex-1 space-y-1 overflow-y-auto px-3 py-2">
    {#each items as item}
      {@const isActive = route.name === item.name || (item.name === 'entities' && route.name === 'entityDetail')}
      <button class={`flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm ${isActive ? 'bg-[color:var(--rvc-accent)] text-white' : ''}`} on:click={() => onNavigate(item.name)}>
        <svelte:component this={item.icon} size={16} /> {$t(item.key)}
      </button>
    {/each}
  </nav>
  <div class="shrink-0 border-t border-[color:var(--rvc-border)] p-3">
    <button class="flex w-full items-center gap-2 rounded-md px-2 py-2 hover:bg-[color:var(--rvc-hover)]" on:click={() => onNavigate('profile')}><UserRound size={18} /> {$t('guest')}</button>
    <button class="mt-1 flex w-full items-center gap-2 rounded-md px-2 py-2 hover:bg-[color:var(--rvc-hover)]" on:click={() => onNavigate('connections')}><Database size={18} /> {$t('connections')}</button>
  </div>
</aside>
