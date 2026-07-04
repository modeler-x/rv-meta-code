<script lang="ts">
  export let label: string;
  export let tone: 'accent' | 'success' | 'warning' | 'danger' | 'muted' = 'accent';
  const colors = { accent: 'var(--rvc-accent)', success: '#1a9e4b', warning: '#ff9500', danger: '#e5484d', muted: 'var(--rvc-muted)' };
  $: color = colors[tone];
</script>

<span class="rounded px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide" style={`color:${color};background:color-mix(in oklch, ${color}, transparent 86%)`}>
  {label}
</span>
