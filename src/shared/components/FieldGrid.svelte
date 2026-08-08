<script lang="ts">
  import Field, { type FieldSpec } from '@/shared/components/Field.svelte';

  // 項目の並びを宣言配列で受ける。ページ側は「何を並べるか」だけを持ち、
  // どう描くかは持たない。テストも配列との突き合わせ 1 本で済む。
  let {
    fields,
    columns = 2,
    testid = 'field',
    data = {},
    onInput
  }: {
    fields: FieldSpec[];
    columns?: 1 | 2 | 3;
    testid?: string;
    data?: Record<string, string>;
    onInput: (name: string, value: string) => void;
  } = $props();

  const gridClass = $derived(
    columns === 1 ? 'grid-cols-1' : columns === 3 ? 'grid-cols-1 sm:grid-cols-3' : 'grid-cols-1 sm:grid-cols-2'
  );
</script>

<div class={`grid gap-3 ${gridClass}`}>
  {#each fields as spec}
    <Field {testid} {spec} {data} onInput={(value) => onInput(spec.name, value)} />
  {/each}
</div>
