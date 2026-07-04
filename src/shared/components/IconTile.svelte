<script lang="ts">
  export let label: string;
  export let color = '#0090a8';
</script>

<span class="flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-xs font-bold text-white" style={`background:${color}`}>
  {label}
</span>
