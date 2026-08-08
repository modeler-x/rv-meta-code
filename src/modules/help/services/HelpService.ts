import { pageIdOf, renderMarkdown } from '@/modules/help/services/markdown';
import type { HelpPage, HelpSearchHit } from '@/modules/help/types/HelpPage';
import type { LanguageCode } from '@/shared/i18n/messages';

/**
 * ヘルプの本文は src/help/<lang>/*.md。
 *
 * md をビルド時に取り込むのは、ヘルプがアプリと一緒に配られる必要があるため。
 * 実行時に読むとインストール先のファイル構成に依存し、壊れたときに気づけない。
 * 追加はファイルを置くだけで済み、コードは触らない。
 */
const sources = import.meta.glob('/src/help/*/*.md', { query: '?raw', import: 'default', eager: true }) as Record<
  string,
  string
>;

export class HelpService {
  /** その言語のページ。無い言語は ja へ落とす（未訳で空にするより読めるほうがよい）。 */
  listPages(language: LanguageCode): HelpPage[] {
    const pages = this.pagesOf(language);
    return pages.length > 0 ? pages : this.pagesOf('ja');
  }

  private pagesOf(language: LanguageCode): HelpPage[] {
    return Object.entries(sources)
      .filter(([path]) => path.includes(`/help/${language}/`))
      .map(([path, body]) => {
        const file = path.split('/').pop() ?? path;
        return {
          id: pageIdOf(path),
          order: Number(/^(\d+)/.exec(file)?.[1] ?? '999'),
          title: /^#\s+(.*)$/m.exec(body)?.[1]?.trim() ?? pageIdOf(path),
          body,
          html: renderMarkdown(body)
        };
      })
      .sort((a, b) => a.order - b.order);
  }

  /**
   * 全ページの本文を横断して探す。
   *
   * 索引を持たないのは、ヘルプが数十 KB で、毎回走査しても体感に出ないため。
   * 索引を持てば更新のたびに作り直す必要が出て、壊れる余地が増える。
   */
  search(pages: HelpPage[], query: string): HelpSearchHit[] {
    const needle = query.trim().toLowerCase();
    if (needle.length === 0) return [];

    return pages
      .map((page) => {
        const lines = page.body.split('\n');
        const matched = lines.filter((line) => line.toLowerCase().includes(needle));
        return {
          page,
          snippets: matched.slice(0, 3).map((line) => line.replace(/^[#>\-*|\s]+/, '').trim()),
          count: matched.length
        };
      })
      .filter((hit) => hit.count > 0)
      .sort((a, b) => b.count - a.count);
  }
}
