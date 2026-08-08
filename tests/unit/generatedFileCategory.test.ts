import { describe, it, expect } from 'vitest';
import {
  classifyGeneratedFile,
  groupGeneratedFiles
} from '@/modules/sdk/generatedFileCategory';

describe('classifyGeneratedFile', () => {
  it('classifies typescript-fetch output', () => {
    expect(classifyGeneratedFile('src/apis/AuthApi.ts')).toBe('source');
    expect(classifyGeneratedFile('src/models/User.ts')).toBe('source');
    expect(classifyGeneratedFile('src/runtime.ts')).toBe('source');
    expect(classifyGeneratedFile('docs/AuthApi.md')).toBe('apiDocs');
    expect(classifyGeneratedFile('docs/User.md')).toBe('modelDocs');
    expect(classifyGeneratedFile('package.json')).toBe('metadata');
    expect(classifyGeneratedFile('README.md')).toBe('metadata');
    expect(classifyGeneratedFile('tsconfig.json')).toBe('build');
    expect(classifyGeneratedFile('.openapi-generator/FILES')).toBe('build');
    expect(classifyGeneratedFile('.gitignore')).toBe('build');
    expect(classifyGeneratedFile('git_push.sh')).toBe('build');
  });

  it('classifies python and ruby manifests and tests', () => {
    expect(classifyGeneratedFile('setup.py')).toBe('metadata');
    expect(classifyGeneratedFile('pyproject.toml')).toBe('metadata');
    expect(classifyGeneratedFile('rv_auth_sdk.gemspec')).toBe('metadata');
    expect(classifyGeneratedFile('test/test_default_api.py')).toBe('tests');
    expect(classifyGeneratedFile('spec/api/default_api_spec.rb')).toBe('tests');
    expect(classifyGeneratedFile('openapi_client/api/default_api.py')).toBe('source');
  });

  it('groups and sorts, dropping empty categories from order use', () => {
    const groups = groupGeneratedFiles([
      'src/index.ts',
      'src/apis/AuthApi.ts',
      'docs/AuthApi.md',
      'package.json',
      'tsconfig.json',
      'test/foo.test.ts'
    ]);
    expect(groups.source).toEqual(['src/apis/AuthApi.ts', 'src/index.ts']);
    expect(groups.apiDocs).toEqual(['docs/AuthApi.md']);
    expect(groups.metadata).toEqual(['package.json']);
    expect(groups.build).toEqual(['tsconfig.json']);
    expect(groups.tests).toEqual(['test/foo.test.ts']);
    expect(groups.modelDocs).toEqual([]);
  });
});
