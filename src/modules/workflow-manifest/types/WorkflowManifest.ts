export type WorkflowDefinitionType = 'native_workflow' | 'workflow_template';

export type WorkflowFrameStep = {
  key: string;
  kind: string;
  componentKind?: string;
  operation?: string;
  signal?: string;
  branches: WorkflowFrameBranch[];
  steps: WorkflowFrameStep[];
};

export type WorkflowFrameBranch = { key: string; outcome?: string; steps: WorkflowFrameStep[] };
export type WorkflowFrame = { code: string; temporalWorkflowType: string; steps: WorkflowFrameStep[] };

export type WorkerComponentCandidate = {
  id: string;
  directory: string;
  componentCode: string | null;
  manifestPath: string | null;
  sourcePaths: string[];
  manifest: ComponentManifest | null;
  workflows: WorkflowFrame[];
};

export type FieldSource = { kind: string; label: string };
export type FieldChoice = { value: unknown; label: string };
export type FieldDefinition = {
  key: string;
  name: string;
  description: string;
  value_type: string;
  required?: boolean;
  format?: string;
  pattern?: string;
  source?: FieldSource;
  example?: unknown;
  choices?: FieldChoice[];
  visibility?: string;
  sensitive?: boolean;
  fields?: FieldDefinition[];
  items?: FieldDefinition;
};

export type WorkflowPrerequisite = { key: string; name: string; description: string };
export type ArtifactDefinition = { key: string; name: string; description: string; type: string };
export type StepComponent = { kind: string; name: string; operation?: string; signal?: string };
export type WorkflowBranch = {
  key: string;
  name: string;
  description: string;
  outcome?: string;
  steps?: WorkflowStep[];
};
export type WorkflowStep = {
  key: string;
  kind: string;
  name: string;
  description: string;
  prerequisites?: WorkflowPrerequisite[];
  component?: StepComponent;
  uses?: FieldDefinition[];
  reports?: FieldDefinition[];
  artifacts?: ArtifactDefinition[];
  branches?: WorkflowBranch[];
  steps?: WorkflowStep[];
  iteration?: { item_name: string; source: string; description: string };
  completion?: string;
};

export type WorkflowManifest = {
  definition_type: WorkflowDefinitionType;
  code: string;
  name: string;
  description: string;
  owner_system: string;
  version: number;
  runtime: { temporal_workflow_type: string };
  configuration?: FieldDefinition[];
  run_request: FieldDefinition[];
  engine_requirement?: { capability: string; required_operations: string[] };
  steps: WorkflowStep[];
  result: FieldDefinition[];
  result_artifacts?: ArtifactDefinition[];
  required_permissions: string[];
  change_summary: string;
};

export type ComponentManifest = { component: string; workflows: WorkflowManifest[] };
export type ManifestIssue = { path: string; message: string };
export type SaveResult = { path: string; backupPath: string | null };
