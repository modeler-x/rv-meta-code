import { describe, expect, it } from 'vitest';
import { HelpService } from '@/modules/help/services/HelpService';
import { pageIdOf, renderMarkdown } from '@/modules/help/services/markdown';

/**
 * ヘルプは md をビルド時に取り込む。ページ ID はファイル名から起こすので、
 * 追加はファイルを置くだけで済み、コードもテストも書き換えない。
 */
const service = new HelpService();

describe('HelpService', () => {
  it('言語ごとにページを並べる', () => {
    for (const language of ['ja', 'en'] as const) {
      const pages = service.listPages(language);
      expect(pages.length).toBeGreaterThan(0);
      // 並びはファイル名の連番。目次の順序が実行ごとに変わらないようにする。
      expect(pages.map((p) => p.order)).toEqual([...pages.map((p) => p.order)].sort((a, b) => a - b));
      // タイトルは本文の # から取る。ID とタイトルを二重管理しない。
      expect(pages.every((p) => p.title.length > 0)).toBe(true);
    }
  });

  it('同じ ID が両言語に揃っている', () => {
    // 片方にしか無いページがあると、言語を切り替えたときに導線が切れる。
    const ja = service.listPages('ja').map((p) => p.id).sort();
    const en = service.listPages('en').map((p) => p.id).sort();
    expect(en).toEqual(ja);
  });

  it('本文を横断して探し、当たった件数の多い順に返す', () => {
    const pages = service.listPages('ja');
    const hits = service.search(pages, 'bind');
    expect(hits.length).toBeGreaterThan(0);
    expect(hits.map((h) => h.count)).toEqual([...hits.map((h) => h.count)].sort((a, b) => b - a));
    // 当たった行の抜粋を返す。どこに当たったか分からないと選べない。
    expect(hits[0].snippets.length).toBeGreaterThan(0);
  });

  it('空の検索語では何も返さない', () => {
    expect(service.search(service.listPages('ja'), '   ')).toEqual([]);
  });

  it('編集画面が指すページが実在する', () => {
    // Drawer の「ヘルプを開く」が指す先。ID を変えたらここで気づく。
    const ids = service.listPages('ja').map((p) => p.id);
    expect(ids).toContain('manifest-profiles');
    expect(ids).toContain('manifest-operations');
  });
});

describe('pageIdOf', () => {
  it('連番を落とし、区切りをハイフンに揃える', () => {
    expect(pageIdOf('/src/help/ja/10_manifest_profiles.md')).toBe('manifest-profiles');
    expect(pageIdOf('00_index.md')).toBe('index');
  });
});

describe('renderMarkdown', () => {
  it('見出し・段落・箇条書きを変換する', () => {
    const html = renderMarkdown('# Title\n\nbody text\n\n- one\n- two\n');
    expect(html).toContain('<h1');
    expect(html).toContain('body text');
    expect(html).toContain('<li>one</li>');
  });

  it('表は区切り行を伴うものだけを表にする', () => {
    const html = renderMarkdown('| a | b |\n|---|---|\n| 1 | 2 |\n');
    expect(html).toContain('<th>a</th>');
    expect(html).toContain('<td>1</td>');
    // 横に溢れる表は本文ではなく表の中でスクロールさせる。
    expect(html).toContain('rvc-help-tablewrap');
  });

  it('コードブロックの中身は解釈しない', () => {
    const html = renderMarkdown('```\n# not a heading\n```\n');
    expect(html).toContain('<pre');
    expect(html).toContain('# not a heading');
    expect(html).not.toContain('<h1');
  });

  it('文字参照を通す', () => {
    // 本文に < や & が現れる。素通しにすると表示が壊れる。
    expect(renderMarkdown('a < b & c')).toContain('a &lt; b &amp; c');
  });

  it('md へのリンクはページ移動、それ以外は外部リンクにする', () => {
    const html = renderMarkdown('[x](10_manifest_profiles.md) [y](https://example.com)');
    expect(html).toContain('data-help-link="manifest-profiles"');
    expect(html).toContain('href="https://example.com"');
  });
});
