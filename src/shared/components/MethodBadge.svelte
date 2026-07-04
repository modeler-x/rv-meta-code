<script lang="ts">
  export let method: string;
  const colors: Record<string, string> = { GET: '#0090a8', POST: '#1a9e4b', PUT: '#b26a00', PATCH: '#b26a00', DELETE: '#e5484d' };
  $: color = colors[method] ?? 'var(--rvc-muted)';
</script>

<span class="min-w-[58px] rounded px-2 py-1 text-center font-mono text-[10px] font-bold" style={`color:${color};background:color-mix(in oklch, ${color}, transparent 86%)`}>
  {method}
</span>
