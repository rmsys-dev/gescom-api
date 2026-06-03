export type ApiPagination = {
  total: number;
  limit: number;
  offset: number;
};

export type ApiSuccessResponse<T = unknown> = {
  success: true;
  message: string;
  data: T | null;
  pagination?: ApiPagination;
};

type CreateApiSuccessResponseInput<T> = {
  message: string;
  data?: T | null;
  pagination?: ApiPagination;
};

export const createApiSuccessResponse = <T>({
  message,
  data = null,
  pagination,
}: CreateApiSuccessResponseInput<T>): ApiSuccessResponse<T> => {
  if (pagination) {
    return {
      success: true,
      message,
      data: data ?? null,
      pagination,
    };
  }

  return {
    success: true,
    message,
    data: data ?? null,
  };
};

export type PaginatedServiceResult<T> = {
  items: T[];
  total: number;
  limit: number;
  offset: number;
};
