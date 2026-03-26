/**
 * Generic API response wrapper from Django REST Framework.
 */
export interface ApiResponse<T> {
  data: T;
  message?: string;
}

/**
 * Standardized error shape returned by the backend.
 * DRF uses `detail` for single-message errors and field-keyed arrays for validation errors.
 */
export interface ApiError {
  detail?: string;
  message?: string;
  errors?: Record<string, string[]>;
  non_field_errors?: string[];
  status?: number;
}

/**
 * DRF paginated list response.
 */
export interface PaginatedResponse<T> {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
}
