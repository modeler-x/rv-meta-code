// OpenAPI 検証結果（backend validation_dto と対応）。
export type ValidationIssue = {
  pointer: string;
  rule: string;
  message: string;
};

export type ValidationReport = {
  isValid: boolean;
  errors: ValidationIssue[];
  warnings: ValidationIssue[];
};

// SDK 生成結果（backend sdk_dto と対応）。
export type GenerateSdkResult = {
  generatorId: string;
  outputDirectory: string;
  generatedFiles: string[];
  warnings: string[];
  durationMs: number;
};

// 生成へ渡す OpenAPI JSON（不透明な JSON Snapshot）。
export type OpenApiDocument = Record<string, unknown>;

// 画面の入力値。
export type SdkGenerationForm = {
  generatorId: string;
  generatorName: string;
  packageName: string;
  packageVersion: string;
  outputDirectory: string;
};

// generate_sdk コマンドへ渡す要求。
export type GenerateSdkRequest = {
  generatorId: string;
  schemaName: string;
  openapiDocument: OpenApiDocument;
  generatorName: string;
  packageName: string;
  packageVersion: string | null;
  outputDirectory: string;
  additionalProperties: Record<string, string>;
};

// Registry が返す Adapter 記述子（backend GeneratorDescriptor と対応）。
export type GeneratorTargetDescriptor = {
  name: string;
  displayName: string;
  family: string;
  packageProperty: string;
  versionProperty: string;
};

export type GeneratorDescriptor = {
  id: string;
  displayName: string;
  isAvailable: boolean;
  version: string | null;
  targets: GeneratorTargetDescriptor[];
};

// SDK Generation Profile（backend sdk_profile_dto と対応）。
export type SdkGenerationProfile = {
  name: string;
  schemaName: string | null;
  generatorId: string;
  generatorName: string;
  packageName: string;
  packageVersion: string | null;
  outputDirectory: string;
};

// 生成フローの結果。検証不合格なら生成しない。
export type SdkGenerationOutcome =
  | { kind: 'invalid'; report: ValidationReport }
  | { kind: 'generated'; report: ValidationReport; result: GenerateSdkResult };

export type SdkGenerationPhase = 'idle' | 'running' | 'invalid' | 'done' | 'error';
