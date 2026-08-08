/**
 * ヘルプ用の Markdown を HTML へ変換する。
 *
 * 依存を足さずに済ませているのは、扱う記法をこちらで決められるため。
 * ヘルプで使うのは見出し・段落・箇条書き・表・コード・リンク・強調だけで、
 * それ以上の記法はヘルプに書かない（読み手にとっても複雑さは利点にならない）。
 * 入力はリポジトリ内の .md に限られるので、外部入力を解釈する経路ではない。
 * それでも文字参照は必ず通す（本文に <, & が現れるため）。
 */
export function renderMarkdown(source: string): string {
  const lines = source.split('\n');
  const html: string[] = [];
  let index = 0;

  while (index < lines.length) {
    const line = lines[index];

    if (line.trim().length === 0) {
      index += 1;
      continue;
    }

    // コードブロック
    if (line.startsWith('```')) {
      const body: string[] = [];
      index += 1;
      while (index < lines.length && !lines[index].startsWith('```')) {
        body.push(lines[index]);
        index += 1;
      }
      index += 1;
      html.push(`<pre class="rvc-help-pre rvc-value"><code>${escapeHtml(body.join('\n'))}</code></pre>`);
      continue;
    }

    // 見出し
    const heading = /^(#{1,4})\s+(.*)$/.exec(line);
    if (heading) {
      const level = heading[1].length;
      html.push(`<h${level} class="rvc-help-h${level}">${inline(heading[2])}</h${level}>`);
      index += 1;
      continue;
    }

    // 表。区切り行（|---|---|）を伴うものだけを表として扱う。
    if (line.trimStart().startsWith('|') && index + 1 < lines.length && /^\s*\|[\s:|-]+\|\s*$/.test(lines[index + 1])) {
      const header = splitRow(line);
      index += 2;
      const rows: string[][] = [];
      while (index < lines.length && lines[index].trimStart().startsWith('|')) {
        rows.push(splitRow(lines[index]));
        index += 1;
      }
      html.push(
        `<div class="rvc-help-tablewrap"><table class="rvc-help-table"><thead><tr>${header
          .map((cell) => `<th>${inline(cell)}</th>`)
          .join('')}</tr></thead><tbody>${rows
          .map((row) => `<tr>${row.map((cell) => `<td>${inline(cell)}</td>`).join('')}</tr>`)
          .join('')}</tbody></table></div>`
      );
      continue;
    }

    // 箇条書き
    if (/^\s*[-*]\s+/.test(line)) {
      const items: string[] = [];
      while (index < lines.length && /^\s*[-*]\s+/.test(lines[index])) {
        items.push(lines[index].replace(/^\s*[-*]\s+/, ''));
        index += 1;
      }
      html.push(`<ul class="rvc-help-ul">${items.map((item) => `<li>${inline(item)}</li>`).join('')}</ul>`);
      continue;
    }

    // 番号付き
    if (/^\s*\d+\.\s+/.test(line)) {
      const items: string[] = [];
      while (index < lines.length && /^\s*\d+\.\s+/.test(lines[index])) {
        items.push(lines[index].replace(/^\s*\d+\.\s+/, ''));
        index += 1;
      }
      html.push(`<ol class="rvc-help-ol">${items.map((item) => `<li>${inline(item)}</li>`).join('')}</ol>`);
      continue;
    }

    // 段落。空行までを 1 つにまとめる。
    const paragraph: string[] = [];
    while (index < lines.length && lines[index].trim().length > 0 && !isBlockStart(lines[index])) {
      paragraph.push(lines[index]);
      index += 1;
    }
    html.push(`<p class="rvc-help-p">${inline(paragraph.join(' '))}</p>`);
  }

  return html.join('\n');
}

function isBlockStart(line: string): boolean {
  return (
    line.startsWith('```') ||
    /^#{1,4}\s/.test(line) ||
    /^\s*[-*]\s+/.test(line) ||
    /^\s*\d+\.\s+/.test(line) ||
    line.trimStart().startsWith('|')
  );
}

function splitRow(line: string): string[] {
  return line
    .trim()
    .replace(/^\|/, '')
    .replace(/\|$/, '')
    .split('|')
    .map((cell) => cell.trim());
}

/** 行内記法。順序が要る（エスケープ → コード → リンク → 強調）。 */
function inline(source: string): string {
  let text = escapeHtml(source);
  text = text.replace(/`([^`]+)`/g, '<code class="rvc-help-code rvc-value">$1</code>');
  // リンク先が .md ならページ内の移動。data-help-link をページ側が拾う。
  text = text.replace(/\[([^\]]+)\]\(([^)]+)\)/g, (_match, label: string, href: string) =>
    href.endsWith('.md')
      ? `<a href="#" data-help-link="${pageIdOf(href)}">${label}</a>`
      : `<a href="${href}" target="_blank" rel="noreferrer">${label}</a>`
  );
  text = text.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
  return text;
}

function escapeHtml(source: string): string {
  return source
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/**
 * ファイル名からページ ID を作る。
 * 並び順のための連番は落とし、区切りはハイフンに揃える。
 * 例: help/ja/10_manifest_profiles.md → manifest-profiles
 */
export function pageIdOf(path: string): string {
  const file = path.split('/').pop() ?? path;
  return file
    .replace(/\.md$/, '')
    .replace(/^\d+[_-]/, '')
    .replace(/_/g, '-');
}
