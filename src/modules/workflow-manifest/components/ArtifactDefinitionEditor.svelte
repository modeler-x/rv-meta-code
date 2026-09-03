<script lang="ts">
  import { Plus, Trash2 } from 'lucide-svelte';
  import type { ArtifactDefinition } from '@/modules/workflow-manifest/types/WorkflowManifest';

  let { title, artifacts, onChange }: {
    title: string;
    artifacts: ArtifactDefinition[];
    onChange: (artifacts: ArtifactDefinition[]) => void;
  } = $props();

  function update(index: number, patch: Partial<ArtifactDefinition>): void {
    onChange(artifacts.map((artifact, current) => current === index ? { ...artifact, ...patch } : artifact));
  }
</script>

<section class="space-y-2">
  <div class="flex items-center justify-between">
    <h3 class="text-sm font-semibold">{title}</h3>
    <button class="flex items-center gap-1 rounded-md border border-[color:var(--rvc-border)] px-2 py-1 text-xs" onclick={() => onChange([...artifacts, { key: '', name: '', description: '', type: 'file' }])}>
      <Plus size={13} />追加
    </button>
  </div>
  {#each artifacts as artifact, index}
    <div class="rounded-lg border border-[color:var(--rvc-border)] bg-[color:var(--rvc-panel)] p-3">
      <div class="grid grid-cols-[1fr_1fr_110px_auto] gap-2">
        <label class="text-[11px] text-[color:var(--rvc-muted)]">key<input class="mt-1 w-full rounded border border-[color:var(--rvc-border)] bg-transparent px-2 py-1.5 font-mono text-xs" value={artifact.key} oninput={(event) => update(index, { key: event.currentTarget.value })} /></label>
        <label class="text-[11px] text-[color:var(--rvc-muted)]">表示名<input class="mt-1 w-full rounded border border-[color:var(--rvc-border)] bg-transparent px-2 py-1.5 text-xs" value={artifact.name} oninput={(event) => update(index, { name: event.currentTarget.value })} /></label>
        <label class="text-[11px] text-[color:var(--rvc-muted)]">種別<input class="mt-1 w-full rounded border border-[color:var(--rvc-border)] bg-transparent px-2 py-1.5 text-xs" value={artifact.type} oninput={(event) => update(index, { type: event.currentTarget.value })} /></label>
        <button class="mt-5 text-[color:var(--rvc-danger)]" aria-label="成果物を削除" onclick={() => onChange(artifacts.filter((_, current) => current !== index))}><Trash2 size={15} /></button>
      </div>
      <label class="mt-2 block text-[11px] text-[color:var(--rvc-muted)]">説明<textarea class="mt-1 min-h-14 w-full rounded border border-[color:var(--rvc-border)] bg-transparent px-2 py-1.5 text-xs" value={artifact.description} oninput={(event) => update(index, { description: event.currentTarget.value })}></textarea></label>
    </div>
  {/each}
  {#if artifacts.length === 0}<p class="rounded-lg border border-dashed border-[color:var(--rvc-border)] px-3 py-4 text-xs text-[color:var(--rvc-muted)]">成果物はまだありません。</p>{/if}
</section>
