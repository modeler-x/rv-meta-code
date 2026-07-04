export type OperationParameter = {
  name: string;
  location: 'path' | 'query';
  type: string;
  required: boolean;
};

export type OperationResponse = {
  code: string;
  description: string;
};

export type OperationSummary = {
  id: string;
  method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  path: string;
  summary: string;
  parameters: OperationParameter[];
  hasRequestBody: boolean;
  requiredFields: string[];
  responses: OperationResponse[];
};
