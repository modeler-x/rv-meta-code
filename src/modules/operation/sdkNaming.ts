// SDK Facade の命名導出（backend の utils::naming / Facade Adapter と一致させる）。
// x-rv-operation-group.key と operationId から SDK Service / Method を導く。

export function lowerCamel(text: string): string {
  const words = text.split(/[^A-Za-z0-9]+/).filter(Boolean);
  return words
    .map((word, index) =>
      index === 0
        ? word.toLowerCase()
        : word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
    )
    .join('');
}

function firstLower(text: string): string {
  return text.length === 0 ? '' : text.charAt(0).toLowerCase() + text.slice(1);
}

/** SDK Service 名（group key を lowerCamelCase）。例: auth -> auth, order_management -> orderManagement。 */
export function sdkServiceName(groupKey: string): string {
  return lowerCamel(groupKey);
}

/** SDK Method 名（operationId から group prefix を除去して先頭小文字）。例: authGetUser / auth -> getUser。 */
export function sdkMethodName(operationId: string, groupKey: string): string {
  const prefix = lowerCamel(groupKey);
  return operationId.startsWith(prefix) && operationId.length > prefix.length
    ? firstLower(operationId.slice(prefix.length))
    : firstLower(operationId);
}

/** operationId が `<lowerCamel(groupKey)>` + 大文字始まり method で始まるか（命名規則）。 */
export function isOperationIdPrefixValid(operationId: string, groupKey: string): boolean {
  const prefix = lowerCamel(groupKey);
  if (!operationId.startsWith(prefix) || operationId.length <= prefix.length) return false;
  const next = operationId.charAt(prefix.length);
  return next >= 'A' && next <= 'Z';
}

/** 呼び出し表記のプレビュー。例: rv.auth.getUser()。 */
export function sdkCallPreview(groupKey: string, operationId: string): string {
  return `rv.${sdkServiceName(groupKey)}.${sdkMethodName(operationId, groupKey)}()`;
}
