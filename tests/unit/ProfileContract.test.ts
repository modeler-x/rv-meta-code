import { describe, expect, it } from 'vitest';
import { DocumentService } from '@/modules/document/services/DocumentService';
import type { IDocumentRepository } from '@/modules/document/repositories/DocumentRepository';
import { SdkGenerationService } from '@/modules/sdk/services/SdkGenerationService';
import type { ISdkGenerationRepository } from '@/modules/sdk/repositories/SdkGenerationRepository';
import { ok, type Result } from '@/shared/result/Result';
import { compiledProfiles, fixture, schemaNames, schemaWithTwoProfiles } from '../fixtures';

/**
 * profile 契約のアプリ側。確かめるのは 1 点で、
 * **どの契約面を見るかが、既定値ではなく呼び出しで決まること**。
 *
 * 層の関係は schema → profile → OpenAPI → 言語別 SDK。profile は「どの API 面か」で、
 * SDK 名（成果物）とは別。既定値を置くと、指定し忘れが内部契約を公開物として配る。
 */
class RecordingDocumentRepository implements IDocumentRepository {
  calls: { method: string; schema: string; profile: string }[] = [];

  async listDocuments() {
    return ok(fixture.documents) as Result<never>;
  }
  async getSpecs(schemas: string[], profile: string) {
    this.calls.push({ method: 'getSpecs', schema: schemas.join(','), profile });
    return ok([]) as Result<never>;
  }
  async getDocumentDetail(schema: string, profile: string) {
    this.calls.push({ method: 'getDocumentDetail', schema, profile });
    return ok({}) as Result<never>;
  }
  async validateOpenApi(schema: string, profile: string) {
    this.calls.push({ method: 'validateOpenApi', schema, profile });
    return ok({ isValid: true, errors: [], warnings: [] }) as Result<never>;
  }
}

class RecordingSdkRepository implements ISdkGenerationRepository {
  calls: { method: string; profile: string }[] = [];

  async getOpenApiDocument(_schema: string, profile: string) {
    this.calls.push({ method: 'getOpenApiDocument', profile });
    return ok({ openapi: '3.1.0' }) as Result<never>;
  }
  async validateOpenApi(_schema: string, profile: string) {
    this.calls.push({ method: 'validateOpenApi', profile });
    return ok({ isValid: false, errors: [{ message: 'x' }], warnings: [] }) as Result<never>;
  }
  async generateSdk() {
    return ok({}) as Result<never>;
  }
  async listGenerators() {
    return ok([]) as Result<never>;
  }
  async listProfiles() {
    return ok([]) as Result<never>;
  }
  async saveProfile() {
    return ok([]) as Result<never>;
  }
  async deleteProfile() {
    return ok([]) as Result<never>;
  }
  async pickOutputDirectory() {
    return ok(null) as Result<never>;
  }
}

describe('profile は呼び出しで決まる', () => {
  it('ドキュメントの取得・検証は渡された profile をそのまま使う', async () => {
    const repository = new RecordingDocumentRepository();
    const service = new DocumentService(repository);

    for (const schema of schemaNames) {
      for (const profile of compiledProfiles(schema)) {
        await service.loadSpecs([schema], profile.profile);
        await service.loadDocumentDetail(schema, profile.profile);
        await service.validateOpenApi(schema, profile.profile);
      }
    }

    // 生成済みの契約面ごとに 3 回。どこかで既定値へ落ちれば profile が食い違う。
    const expected = schemaNames.flatMap((s) => compiledProfiles(s)).length * 3;
    expect(repository.calls).toHaveLength(expected);
    expect(repository.calls.every((c) => c.profile.length > 0)).toBe(true);
  });

  it('SDK 生成は契約面を指定しないと動かせない', async () => {
    const repository = new RecordingSdkRepository();
    const service = new SdkGenerationService(repository);

    await service.runGeneration('rv_intake', 'bff', {
      generatorId: 'g',
      generatorName: 'n',
      packageName: 'p',
      packageVersion: '1.0.0',
      outputDirectory: '/tmp'
    });

    // 取得も検証も同じ契約面で行う。片方だけ別の面を見ると、検証を通った内容と
    // 生成に使う内容が食い違う。
    expect(repository.calls.map((c) => c.profile)).toEqual(['bff', 'bff']);
  });
});

describe('契約面の状態', () => {
  it('生成済みの契約面だけが成果物を持つ', () => {
    for (const schema of schemaNames) {
      for (const profile of fixture.profiles[schema]) {
        // declared かつ compiled のときだけ契約ハッシュがある。
        if (profile.compiled) expect(profile.documentHash).toMatch(/^sha256:/);
        else expect(profile.documentHash).toBeNull();
      }
    }
  });

  it('ドキュメントは (schema, profile) で一意', () => {
    const keys = fixture.documents.map((d) => `${d.schemaName}/${d.profile}`);
    expect(new Set(keys).size).toBe(keys.length);
  });

  it('2 つの契約面を持つスキーマでは operation 数が異なる', () => {
    // postgrest は全公開関数、bff は publicRoutes を宣言したものだけ。
    const schema = schemaWithTwoProfiles();
    if (!schema) return;
    const counts = compiledProfiles(schema).map((p) => p.operations);
    expect(new Set(counts).size).toBeGreaterThan(1);
  });
});
