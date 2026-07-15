import type { ComponentService } from '@/modules/component/services/ComponentService';
import type { ComponentSummary } from '@/modules/component/types/ComponentSummary';
import type { ValidationIssue } from '@/modules/sdk/types/SdkGeneration';

// component 関連の検証規則（$ref 解決・Security Scheme 未定義）だけを画面に出す。
const COMPONENT_RULES = new Set(['ref.unresolved', 'securityScheme.undefined']);

export class ComponentViewModel {
  components: ComponentSummary[] = $state([]);
  isLoading = $state(false);
  issues: ValidationIssue[] = $state([]);

  constructor(private readonly componentService: ComponentService) {}

  async load(schema: string): Promise<void> {
    this.isLoading = true;
    this.components = [];
    this.issues = [];
    const [componentsResult, reportResult] = await Promise.all([
      this.componentService.loadComponents(schema),
      this.componentService.validateOpenApi(schema)
    ]);
    if (componentsResult.success) {
      this.components = componentsResult.data;
    }
    if (reportResult.success) {
      this.issues = [...reportResult.data.errors, ...reportResult.data.warnings].filter((issue) =>
        COMPONENT_RULES.has(issue.rule)
      );
    }
    this.isLoading = false;
  }

  bySection(section: string): ComponentSummary[] {
    return this.components.filter((component) => component.section === section);
  }
}
