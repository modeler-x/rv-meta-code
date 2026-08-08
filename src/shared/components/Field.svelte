<script module lang="ts">
  /**
   * 編集フォームの 1 項目。
   *
   * 入力欄を画面ごとに手で組むと、ラベル・data-*・空文字の扱いが少しずつ違ってしまう。
   * ここに畳んで、値の反映と data-* の出し方を 1 箇所に固定する。
   *
   * 空文字は「未指定」として扱い、呼び出し側が undefined としてキーごと消せるようにする。
   * 既定の推論を働かせたい項目（basePath / title / version など）で意味を持つ。
   */
  export type FieldKind = 'text' | 'select' | 'textarea' | 'chips';

  export type FieldSpec = {
    /** data-field。テストと自動操作はこの値で引く。 */
    name: string;
    kind: FieldKind;
    label?: string;
    value: string;
    placeholder?: string;
    /** select の選択肢。空値は「未指定」として先頭に置く。 */
    options?: { value: string; label: string }[];
    /** text で使う入力候補。打ち直しを減らす。 */
    suggestions?: string[];
    mono?: boolean;
    rows?: number;
  };
</script>

<script lang="ts">
  let {
    testid = 'field',
    spec,
    data = {},
    onInput
  }: {
    /** 同じ画面に複数の集まりがあるとき（profile ごとなど）に分けるための名前。 */
    testid?: string;
    spec: FieldSpec;
    /** どの集まりの項目かを示す data-*。 */
    data?: Record<string, string>;
    onInput: (value: string) => void;
  } = $props();

  const listId = $derived(spec.suggestions?.length ? `rvc-list-${spec.name}` : undefined);
  const monoClass = $derived(spec.mono === false ? '' : ' font-mono');
</script>

<label class="flex flex-col gap-1">
  <span class="text-[10px] font-bold uppercase tracking-wide text-[color:var(--rvc-muted)]">
    {spec.label ?? spec.name}
  </span>

  {#if spec.kind === 'select'}
    <select
      data-testid={testid}
      data-field={spec.name}
      {...data}
      class="rounded-md border border-[color:var(--rvc-border)] bg-[color:var(--rvc-bg)] px-2 py-1 text-xs"
      value={spec.value}
      onchange={(event) => onInput(event.currentTarget.value)}
    >
      {#each spec.options ?? [] as option}
        <option value={option.value}>{option.label}</option>
      {/each}
    </select>
  {:else if spec.kind === 'textarea'}
    <textarea
      data-testid={testid}
      data-field={spec.name}
      {...data}
      class="rounded-md border border-[color:var(--rvc-border)] bg-[color:var(--rvc-bg)] px-2 py-1 text-xs"
      rows={spec.rows ?? 2}
      value={spec.value}
      placeholder={spec.placeholder ?? ''}
      oninput={(event) => onInput(event.currentTarget.value)}
    ></textarea>
  {:else}
    <input
      data-testid={testid}
      data-field={spec.name}
      {...data}
      list={listId}
      class={`rounded-md border border-[color:var(--rvc-border)] bg-[color:var(--rvc-bg)] px-2 py-1 text-xs${monoClass}`}
      value={spec.value}
      placeholder={spec.placeholder ?? ''}
      oninput={(event) => onInput(event.currentTarget.value)}
    />
    {#if listId}
      <datalist id={listId}>
        {#each spec.suggestions ?? [] as suggestion}<option value={suggestion}></option>{/each}
      </datalist>
    {/if}
  {/if}
</label>
