<script lang="ts">
  import { ChevronLeft } from 'lucide-svelte';
  import type { AppRoute } from '@/app/router/AppRoute';
  import { translate as t } from '@/shared/i18n/i18n.svelte';
  export let route: AppRoute;
  export let title: string;
  export let onBack: () => void;
</script>

<header class="flex h-[52px] shrink-0 items-center gap-3 border-b border-[color:var(--rvc-border)] bg-[color:var(--rvc-panel)] px-5 py-4">
  {#if route.backRoute}
    <button class="flex items-center gap-1 rounded-md px-1.5 py-1 text-[color:var(--rvc-accent)] hover:bg-[color:var(--rvc-hover)]" on:click={onBack}><ChevronLeft size={16} />{$t('back')}</button>
  {/if}
  <h1 class="text-[15px] font-semibold">{title}</h1>
  <div class="flex-1"></div>
  <div class="rounded-full border border-[color:var(--rvc-border)] bg-[color:var(--rvc-search)] px-3 py-1 text-xs text-[color:var(--rvc-muted)]">shopdb / localhost</div>
</header>
