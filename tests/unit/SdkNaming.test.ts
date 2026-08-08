import { describe, it, expect } from 'vitest';
import {
  sdkServiceName,
  sdkMethodName,
  isOperationIdPrefixValid,
  sdkCallPreview
} from '@/modules/operation/sdkNaming';

// Auth 非依存の架空グループ（Example/exampleGetItem -> rv.example.getItem()）で検証する。
describe('sdkNaming', () => {
  it('derives the SDK service from the group key', () => {
    expect(sdkServiceName('example')).toBe('example');
    expect(sdkServiceName('order_management')).toBe('orderManagement');
  });

  it('derives the SDK method by stripping the group prefix', () => {
    expect(sdkMethodName('exampleGetItem', 'example')).toBe('getItem');
    expect(sdkMethodName('authResolveUser', 'auth')).toBe('resolveUser');
    expect(sdkMethodName('orderManagementCreate', 'order_management')).toBe('create');
  });

  it('validates that operationId starts with the group prefix + uppercase method', () => {
    expect(isOperationIdPrefixValid('exampleGetItem', 'example')).toBe(true);
    expect(isOperationIdPrefixValid('itemGet', 'example')).toBe(false);
    expect(isOperationIdPrefixValid('example', 'example')).toBe(false);
  });

  it('previews the SDK call', () => {
    expect(sdkCallPreview('auth', 'authGetUser')).toBe('rv.auth.getUser()');
  });
});
