<script lang="ts">
  export let label: string;
</script>

<label class="flex items-center border-b border-[color:var(--rvc-border)] px-3.5 py-2.5 last:border-b-0">
  <span class="w-32 text-[color:var(--rvc-muted)]">{label}</span>
  <span class="flex-1"><slot /></span>
</label>
