<script lang="ts">
  import { CircleHelp, Database, FileText, History, Home, Server, SlidersHorizontal, Table2, UserRound, Workflow } from 'lucide-svelte';
  import type { AppRoute, AppRouteName } from '@/app/router/AppRoute';
  import { translate as t } from '@/shared/i18n/i18n.svelte';
  export let route: AppRoute;
  export let onNavigate: (name: AppRouteName) => void;
  /**
   * 成果物の順に並べる。スキーマ（入力）→ マニフェスト → ドキュメント → SDK。
   * オペレーションは工程ではなくマニフェストの中身なので、字下げして番号を振らない。
   */
  const items = [
    { name: 'welcome', key: 'nav_welcome', icon: Home, step: null, sub: false },
    { name: 'schema', key: 'nav_schemas', icon: Database, step: '1', sub: false },
    { name: 'manifest', key: 'nav_manifest', icon: FileText, step: '2', sub: false },
    { name: 'manifestOperations', key: 'nav_operations', icon: SlidersHorizontal, step: null, sub: true },
    { name: 'documents', key: 'nav_documents', icon: FileText, step: '3', sub: false },
    { name: 'entities', key: 'nav_entities', icon: Table2, step: null, sub: false },
    { name: 'functions', key: 'nav_functions', icon: Workflow, step: null, sub: false },
    { name: 'recent', key: 'nav_recent', icon: History, step: null, sub: false }
  ] as const;
</script>

<aside class="flex min-h-0 flex-col border-r border-[color:var(--rvc-border)] bg-[color:var(--rvc-sidebar)] backdrop-blur-xl">
  <div class="flex h-[52px] shrink-0 items-center gap-2 px-4">
    <span class="flex h-6 w-6 items-center justify-center rounded-md bg-[color:var(--rvc-accent)] text-[11px] font-bold text-white">Rv</span>
    <span class="text-[13px] font-semibold">Rv Meta Code</span>
  </div>
  <nav class="min-h-0 flex-1 space-y-1 overflow-y-auto px-3 py-2">
    {#each items as item}
      {@const isActive = route.name === item.name || (item.name === 'entities' && route.name === 'entityDetail') || (item.name === 'functions' && (route.name === 'operationGroupDetail' || route.name === 'functionOperationDetail'))}
      <button data-testid="nav" data-nav={item.name} data-step={item.step} class={`flex w-full items-center gap-2 rounded-md py-1.5 text-left text-sm ${item.sub ? 'pl-7 pr-2' : 'px-2'} ${isActive ? 'bg-[color:var(--rvc-accent)] text-white' : ''}`} on:click={() => onNavigate(item.name)}>
        {#if item.step}
          <span class={`flex h-[17px] w-[17px] shrink-0 items-center justify-center rounded-full border text-[9.5px] font-bold ${isActive ? 'border-white/60' : 'border-[color:var(--rvc-border)] text-[color:var(--rvc-muted)]'}`}>{item.step}</span>
        {:else}
          <svelte:component this={item.icon} size={16} />
        {/if}
        {$t(item.key)}
      </button>
    {/each}
  </nav>
  <div class="shrink-0 border-t border-[color:var(--rvc-border)] p-3">
    <button data-testid="nav" data-nav="help" class={`flex w-full items-center gap-2 rounded-md px-2 py-2 hover:bg-[color:var(--rvc-hover)] ${route.name === 'help' ? 'bg-[color:var(--rvc-accent)] text-white' : ''}`} on:click={() => onNavigate('help')}><CircleHelp size={18} /> {$t('nav_help')}</button>
    <button data-testid="nav" data-nav="profile" class="mt-1 flex w-full items-center gap-2 rounded-md px-2 py-2 hover:bg-[color:var(--rvc-hover)]" on:click={() => onNavigate('profile')}><UserRound size={18} /> {$t('guest')}</button>
    <button data-testid="nav" data-nav="connections" class="mt-1 flex w-full items-center gap-2 rounded-md px-2 py-2 hover:bg-[color:var(--rvc-hover)]" on:click={() => onNavigate('connections')}><Database size={18} /> {$t('connections')}</button>
    <button data-testid="nav" data-nav="servers" class="mt-1 flex w-full items-center gap-2 rounded-md px-2 py-2 hover:bg-[color:var(--rvc-hover)]" on:click={() => onNavigate('servers')}><Server size={18} /> {$t('sv_servers')}</button>
  </div>
</aside>
