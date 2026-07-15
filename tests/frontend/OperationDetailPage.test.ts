import { render } from '@testing-library/svelte';
import { describe, it, expect } from 'vitest';
import OperationDetailPage from '@/pages/OperationDetailPage.svelte';
import type { EntitySummary } from '@/modules/entity/types/EntitySummary';
import type { OperationSummary } from '@/modules/operation/types/OperationSummary';

const entity: EntitySummary = {
  id: 1, tableSchema: 'public', tableName: 'orders', resourceName: 'orders',
  description: null, fieldCount: 3, operationCount: 5, isReadOnly: false
};

function baseOperation(overrides: Partial<OperationSummary>): OperationSummary {
  return {
    id: 1, operationId: 'ordersDeleteMany', ownerKind: 'entity', entityId: 1, operationGroupId: null,
    operation: 'delete_many', method: 'POST', path: '/orders/delete_many',
    tags: ['orders'], security: null,
    summary: null, description: null, parameters: [], requestBody: null,
    responses: { '204': { description: 'No Content' } }, requiredFields: [],
    effectiveSecurity: [], securitySource: 'root',
    functionSchema: null, functionName: null, identityArguments: null,
    ...overrides
  };
}

describe('OperationDetailPage request body', () => {
  it('renders the requestBody schema (delete_many: ids) even when requiredFields is empty', () => {
    const operation = baseOperation({
      requestBody: {
        content: {
          'application/json': {
            schema: {
              type: 'object',
              properties: { ids: { type: 'array', items: { type: 'integer' } } },
              required: ['ids']
            }
          }
        }
      },
      requiredFields: []
    });
    const { container } = render(OperationDetailPage, { props: { entity, operation } });
    const text = container.textContent ?? '';
    expect(text).toContain('ids');
    expect(text).toContain('array<integer>');
  });

  it('orders requestBody fields by fieldOrder (JSON/column order) regardless of jsonb key order', () => {
    const operation = baseOperation({
      operation: 'post', method: 'POST', path: '/orders',
      requestBody: {
        content: {
          'application/json': {
            // jsonb 由来のキー順（id, name, email のように長さ順で崩れた並びを模す）
            schema: { type: 'object', properties: { id: { type: 'integer' }, email: { type: 'string' }, name: { type: 'string' } }, required: ['name'] }
          }
        }
      }
    });
    const { container } = render(OperationDetailPage, {
      props: { entity, operation, fieldOrder: ['name', 'email', 'id'] }
    });
    const names = Array.from(container.querySelectorAll('.font-mono.font-semibold')).map((el) => el.textContent);
    // fieldOrder に従って name → email → id の順に並ぶ
    expect(names).toEqual(['name', 'email', 'id']);
  });

  it('shows the response body type (not only HTTP status) when content is present', () => {
    const operation = baseOperation({
      operation: 'get', method: 'GET', path: '/orders/{id}', requestBody: null,
      responses: {
        '200': { description: 'OK', content: { 'application/json': { schema: { $ref: '#/components/schemas/Order' } } } }
      }
    });
    const { container } = render(OperationDetailPage, { props: { entity, operation } });
    const text = container.textContent ?? '';
    expect(text).toContain('200');
    expect(text).toContain('Order');
  });

  it('resolves $ref error responses via components (404 → NotFound / Error)', () => {
    const operation = baseOperation({
      operation: 'get', method: 'GET', path: '/orders/{id}', requestBody: null,
      responses: {
        '200': { description: 'OK', content: { 'application/json': { schema: { $ref: '#/components/schemas/Order' } } } },
        '404': { $ref: '#/components/responses/NotFound' }
      }
    });
    const components = {
      responses: {
        NotFound: { description: 'Not Found', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } }
      }
    };
    const { container } = render(OperationDetailPage, { props: { entity, operation, components } });
    const text = container.textContent ?? '';
    expect(text).toContain('404');
    expect(text).toContain('Not Found');
    expect(text).toContain('Error');
  });

  it('renders request headers and response headers', () => {
    const operation = baseOperation({
      operation: 'get', method: 'GET', path: '/orders', requestBody: null,
      parameters: [
        { name: 'X-Request-Id', in: 'header', required: false, schema: { type: 'string' } },
        { name: 'limit', in: 'query', required: false, schema: { type: 'integer' } }
      ],
      responses: {
        '200': {
          description: 'OK',
          headers: { 'X-RateLimit-Remaining': { description: 'remaining quota', schema: { type: 'integer' } } }
        }
      }
    });
    const { container } = render(OperationDetailPage, { props: { entity, operation } });
    const text = container.textContent ?? '';
    expect(text).toContain('X-Request-Id');
    expect(text).toContain('X-RateLimit-Remaining');
  });
});
