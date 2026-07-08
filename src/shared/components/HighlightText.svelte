<script lang="ts">
  // text 内の query 一致部分（大文字小文字を無視）を <mark> で強調する。
  // 正規表現は使わず部分文字列一致で走査するため、記号を含む入力でも安全。
  let { text, query }: { text: string; query: string } = $props();

  type Segment = { text: string; match: boolean };

  function buildSegments(source: string, rawQuery: string): Segment[] {
    const needle = (rawQuery ?? '').trim();
    if (needle.length === 0 || source.length === 0) return [{ text: source, match: false }];
    const lowerSource = source.toLowerCase();
    const lowerNeedle = needle.toLowerCase();
    const segments: Segment[] = [];
    let index = 0;
    while (index < source.length) {
      const found = lowerSource.indexOf(lowerNeedle, index);
      if (found === -1) {
        segments.push({ text: source.slice(index), match: false });
        break;
      }
      if (found > index) segments.push({ text: source.slice(index, found), match: false });
      segments.push({ text: source.slice(found, found + needle.length), match: true });
      index = found + needle.length;
    }
    return segments;
  }

  const segments = $derived(buildSegments(text ?? '', query));
</script>

{#each segments as segment}{#if segment.match}<mark class="rvc-mark">{segment.text}</mark>{:else}{segment.text}{/if}{/each}
