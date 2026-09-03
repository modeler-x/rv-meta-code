<script lang="ts">
  import { Plus, Trash2 } from 'lucide-svelte';
  import type { FieldDefinition } from '@/modules/workflow-manifest/types/WorkflowManifest';

  let { title, fields, requireSource = false, onChange }: {
    title: string;
    fields: FieldDefinition[];
    requireSource?: boolean;
    onChange: (fields: FieldDefinition[]) => void;
  } = $props();

  const sourceKinds = ['user_input', 'user_selection', 'target_catalog', 'cabinet_file', 'cabinet_file_metadata', 'rv_spec_request', 'workflow_configuration', 'run_request', 'previous_step', 'system'];
  const valueTypes = ['string', 'integer', 'number', 'boolean', 'object', 'array'];

  function update(index: number, patch: Partial<FieldDefinition>): void {
    onChange(fields.map((field, current) => current === index ? { ...field, ...patch } : field));
  }
  function updateSource(index: number, patch: Partial<NonNullable<FieldDefinition['source']>>): void {
    update(index, { source: { kind: fields[index]?.source?.kind ?? '', label: fields[index]?.source?.label ?? '', ...patch } });
  }
  function add(): void {
    onChange([...fields, { key: '', name: '', description: '', value_type: 'string', ...(requireSource ? { source: { kind: 'user_input', label: '' } } : {}) }]);
  }
  function exampleText(field: FieldDefinition): string {
    if (field.example === undefined) return '';
    return typeof field.example === 'object' ? JSON.stringify(field.example) : String(field.example);
  }
  function exampleValue(value: string, valueType: string): unknown {
    if (value === '') return undefined;
    if (valueType === 'integer' || valueType === 'number') {
      const number = Number(value);
      return Number.isNaN(number) ? value : number;
    }
    if (valueType === 'boolean') return value === 'true' ? true : value === 'false' ? false : value;
    if (valueType === 'object' || valueType === 'array') {
      try { return JSON.parse(value); } catch { return value; }
    }
    return value;
  }
  function choicesText(field: FieldDefinition): string {
    return (field.choices ?? []).map((choice) => `${JSON.stringify(choice.value)} = ${choice.label}`).join('\n');
  }
  function choicesValue(value: string): NonNullable<FieldDefinition['choices']> {
    return value.split('\n').map((line) => line.trim()).filter(Boolean).map((line) => {
      const [rawValue, ...label] = line.split('=');
      const text = rawValue?.trim() ?? '';
      let parsed: unknown = text;
      try { parsed = JSON.parse(text); } catch { /* unquoted text is a string choice */ }
      return { value: parsed, label: label.join('=').trim() };
    });
  }
</script>

<section class="space-y-2" data-testid="field-editor">
  <div class="flex items-center justify-between"><h3 class="text-sm font-semibold">{title}</h3><button class="flex items-center gap-1 rounded-md border border-[color:var(--rvc-border)] px-2 py-1 text-xs" onclick={add}><Plus size={13} />追加</button></div>
  {#each fields as field, index}
    <div class="rounded-lg border border-[color:var(--rvc-border)] bg-[color:var(--rvc-panel)] p-3">
      <div class="grid grid-cols-[1fr_1fr_110px_auto] gap-2">
        <label class="text-[11px] text-[color:var(--rvc-muted)]">key<input class="mt-1 w-full rounded border border-[color:var(--rvc-border)] bg-transparent px-2 py-1.5 font-mono text-xs" value={field.key} oninput={(e) => update(index, { key: e.currentTarget.value })} /></label>
        <label class="text-[11px] text-[color:var(--rvc-muted)]">表示名<input class="mt-1 w-full rounded border border-[color:var(--rvc-border)] bg-transparent px-2 py-1.5 text-xs" value={field.name} oninput={(e) => update(index, { name: e.currentTarget.value })} /></label>
        <label class="text-[11px] text-[color:var(--rvc-muted)]">型<select class="mt-1 w-full rounded border border-[color:var(--rvc-border)] bg-transparent px-2 py-1.5 text-xs" value={field.value_type} onchange={(e) => update(index, { value_type: e.currentTarget.value })}>{#each valueTypes as type}<option value={type}>{type}</option>{/each}</select></label>
        <button class="mt-5 text-[color:var(--rvc-danger)]" aria-label="項目を削除" onclick={() => onChange(fields.filter((_, current) => current !== index))}><Trash2 size={15} /></button>
      </div>
      <label class="mt-2 block text-[11px] text-[color:var(--rvc-muted)]">説明<textarea class="mt-1 min-h-14 w-full rounded border border-[color:var(--rvc-border)] bg-transparent px-2 py-1.5 text-xs" value={field.description} oninput={(e) => update(index, { description: e.currentTarget.value })}></textarea></label>
      <div class="mt-2 grid grid-cols-[auto_1fr_1fr_1fr] items-end gap-2">
        <label class="flex items-center gap-1 pb-2 text-xs"><input type="checkbox" checked={field.required ?? false} onchange={(e) => update(index, { required: e.currentTarget.checked })} />必須</label>
        {#if requireSource}<label class="text-[11px] text-[color:var(--rvc-muted)]">入手方法<select class="mt-1 w-full rounded border border-[color:var(--rvc-border)] bg-transparent px-2 py-1.5 text-xs" value={field.source?.kind ?? ''} onchange={(e) => updateSource(index, { kind: e.currentTarget.value })}><option value="">選択してください</option>{#each sourceKinds as kind}<option value={kind}>{kind}</option>{/each}</select></label><label class="text-[11px] text-[color:var(--rvc-muted)]">入手方法の説明<input class="mt-1 w-full rounded border border-[color:var(--rvc-border)] bg-transparent px-2 py-1.5 text-xs" value={field.source?.label ?? ''} oninput={(e) => updateSource(index, { label: e.currentTarget.value })} /></label>{/if}
        <label class="text-[11px] text-[color:var(--rvc-muted)]">入力例<input class="mt-1 w-full rounded border border-[color:var(--rvc-border)] bg-transparent px-2 py-1.5 text-xs" value={exampleText(field)} oninput={(e) => update(index, { example: exampleValue(e.currentTarget.value, field.value_type) })} /></label>
      </div>
      <details class="mt-2 rounded border border-[color:var(--rvc-border)] px-2 py-1.5">
        <summary class="cursor-pointer text-[11px] font-semibold">詳細制約{field.format || field.pattern || field.visibility || field.sensitive || field.choices?.length ? ' ・ 設定あり' : ''}</summary>
        <div class="mt-2 grid grid-cols-3 gap-2">
          <label class="text-[11px] text-[color:var(--rvc-muted)]">format<input class="mt-1 w-full rounded border border-[color:var(--rvc-border)] bg-transparent px-2 py-1.5 text-xs" value={field.format ?? ''} oninput={(e) => update(index, { format: e.currentTarget.value || undefined })} /></label>
          <label class="text-[11px] text-[color:var(--rvc-muted)]">pattern<input class="mt-1 w-full rounded border border-[color:var(--rvc-border)] bg-transparent px-2 py-1.5 text-xs" value={field.pattern ?? ''} oninput={(e) => update(index, { pattern: e.currentTarget.value || undefined })} /></label>
          <label class="text-[11px] text-[color:var(--rvc-muted)]">visibility<input class="mt-1 w-full rounded border border-[color:var(--rvc-border)] bg-transparent px-2 py-1.5 text-xs" value={field.visibility ?? ''} oninput={(e) => update(index, { visibility: e.currentTarget.value || undefined })} /></label>
          <label class="col-span-3 flex items-center gap-1 text-xs"><input type="checkbox" checked={field.sensitive ?? false} onchange={(e) => update(index, { sensitive: e.currentTarget.checked })} />機密値として扱う</label>
          <label class="col-span-3 text-[11px] text-[color:var(--rvc-muted)]">選択肢（1行に JSON値 = 表示名）<textarea class="mt-1 min-h-16 w-full rounded border border-[color:var(--rvc-border)] bg-transparent px-2 py-1.5 font-mono text-xs" value={choicesText(field)} oninput={(e) => update(index, { choices: choicesValue(e.currentTarget.value) })}></textarea></label>
        </div>
      </details>
    </div>
  {/each}
  {#if fields.length === 0}<p class="rounded-lg border border-dashed border-[color:var(--rvc-border)] px-3 py-4 text-xs text-[color:var(--rvc-muted)]">項目はまだありません。</p>{/if}
</section>
