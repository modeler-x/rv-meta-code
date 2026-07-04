import type { EntityColumn, EntitySummary } from '@/modules/entity/types/EntitySummary';
import type { OperationSummary } from '@/modules/operation/types/OperationSummary';

export class OperationService {
  loadOperations(entity: EntitySummary): OperationSummary[] {
    const base = `/${entity.name}`;
    const singularName = entity.name.replace(/s$/, '');
    const requiredFields = entity.columns.filter((column) => this.isRequiredField(column)).map((column) => column.name);
    const idParameter = { name: 'id', location: 'path', type: 'integer', required: true } as const;
    const operations: OperationSummary[] = [
      { id: 'list', method: 'GET', path: base, summary: `List ${entity.name}`, parameters: [{ name: 'limit', location: 'query', type: 'integer', required: false }, { name: 'offset', location: 'query', type: 'integer', required: false }], hasRequestBody: false, requiredFields: [], responses: [{ code: '200', description: `A page of ${entity.name}` }] },
      { id: 'get', method: 'GET', path: `${base}/{id}`, summary: `Fetch a single ${singularName}`, parameters: [idParameter], hasRequestBody: false, requiredFields: [], responses: [{ code: '200', description: `The requested ${singularName}` }, { code: '404', description: 'Not found' }] }
    ];
    if (entity.kind === 'Table') {
      operations.push({ id: 'create', method: 'POST', path: base, summary: `Create a ${singularName}`, parameters: [], hasRequestBody: true, requiredFields, responses: [{ code: '201', description: 'Created' }, { code: '422', description: 'Validation error' }] });
      operations.push({ id: 'update', method: 'PATCH', path: `${base}/{id}`, summary: `Update a ${singularName}`, parameters: [idParameter], hasRequestBody: true, requiredFields: [], responses: [{ code: '200', description: 'Updated' }, { code: '404', description: 'Not found' }] });
      operations.push({ id: 'delete', method: 'DELETE', path: `${base}/{id}`, summary: `Delete a ${singularName}`, parameters: [idParameter], hasRequestBody: false, requiredFields: [], responses: [{ code: '204', description: 'Deleted' }, { code: '404', description: 'Not found' }] });
    }
    return operations;
  }

  private isRequiredField(column: EntityColumn): boolean {
    if (column.nullable || column.badge === 'PK') return false;
    const meta = `${column.type} ${column.extra ?? ''}`.toLowerCase();
    return !/serial|now\(\)/.test(meta);
  }
}
