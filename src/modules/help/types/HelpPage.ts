export type HelpPage = {
  /** ファイル名から起こした ID。画面からの導線はこの値で指す。 */
  id: string;
  /** 一覧の並び順。ファイル名の連番。 */
  order: number;
  title: string;
  /** 見出しの原文。索引に使う。 */
  body: string;
  html: string;
};

/** 検索結果の 1 件。どのページのどこに当たったかを出す。 */
export type HelpSearchHit = {
  page: HelpPage;
  /** 一致した行の前後。強調は画面側で行う。 */
  snippets: string[];
  count: number;
};
