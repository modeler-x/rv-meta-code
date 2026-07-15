// 生成物(相対パス)を用途カテゴリへ分類する。OpenAPI Generator は SDK ソース以外に
// README / API・Model ドキュメント / package manifest / test / build 設定も出力するため、
// UI で件数へ丸めず分類して見せられるようにする。generator(言語)非依存の heuristic。

export type GeneratedFileCategory =
  | 'source'
  | 'apiDocs'
  | 'modelDocs'
  | 'tests'
  | 'metadata'
  | 'build';

// 表示順（上位ほど利用者の関心が高い）。
export const GENERATED_FILE_CATEGORY_ORDER: GeneratedFileCategory[] = [
  'source',
  'apiDocs',
  'modelDocs',
  'tests',
  'metadata',
  'build'
];

export function classifyGeneratedFile(path: string): GeneratedFileCategory {
  const lower = path.replace(/\\/g, '/').toLowerCase();
  const segs = lower.split('/');
  const name = segs[segs.length - 1] ?? lower;

  // テスト
  if (
    segs.some((s) => s === 'test' || s === 'tests' || s === 'spec' || s === '__tests__') ||
    /\.(test|spec)\./.test(name) ||
    /_test\.[a-z0-9]+$/.test(name)
  ) {
    return 'tests';
  }

  // build / generator 設定
  if (
    segs.includes('.openapi-generator') ||
    name === '.openapi-generator-ignore' ||
    name === '.gitignore' ||
    name === '.travis.yml' ||
    name === 'git_push.sh' ||
    name === 'rakefile' ||
    name === 'makefile' ||
    name === 'tox.ini' ||
    name === 'setup.cfg' ||
    /^tsconfig.*\.json$/.test(name)
  ) {
    return 'build';
  }

  // package manifest / メタデータ
  if (
    name === 'package.json' ||
    name === 'readme.md' ||
    name === 'license' ||
    name === '.npmignore' ||
    name.endsWith('.gemspec') ||
    name === 'setup.py' ||
    name === 'pyproject.toml' ||
    name === 'requirements.txt' ||
    name === 'test-requirements.txt' ||
    name === 'gemfile' ||
    name === 'version'
  ) {
    return 'metadata';
  }

  // ドキュメント（docs/ 配下、Api.md は API・その他 .md は Model）
  if (/api\.md$/.test(name)) return 'apiDocs';
  if ((segs.includes('docs') || segs.includes('doc')) && name.endsWith('.md')) {
    return 'modelDocs';
  }

  // それ以外は SDK ソース
  return 'source';
}

export function groupGeneratedFiles(
  files: string[]
): Record<GeneratedFileCategory, string[]> {
  const groups: Record<GeneratedFileCategory, string[]> = {
    source: [],
    apiDocs: [],
    modelDocs: [],
    tests: [],
    metadata: [],
    build: []
  };
  for (const file of files) {
    groups[classifyGeneratedFile(file)].push(file);
  }
  for (const key of GENERATED_FILE_CATEGORY_ORDER) {
    groups[key].sort();
  }
  return groups;
}
