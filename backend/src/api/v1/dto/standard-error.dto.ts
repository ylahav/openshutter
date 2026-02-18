/**
 * Standard error response format for V1 API
 */
export interface StandardErrorResponse {
  error: {
    code: string;
    message: string;
    details?: Record<string, any>;
  };
}

/**
 * Standard success response format for V1 API
 */
export interface StandardSuccessResponse<T = any> {
  data: T;
  meta?: {
    page?: number;
    limit?: number;
    total?: number;
    pages?: number;
  };
}
