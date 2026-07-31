const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3000";

export class ApiError extends Error {
  constructor(
    readonly status: number,
    message: string,
  ) {
    super(message);
  }
}

export async function api<T>(
  path: string,
  options: { method?: string; body?: unknown } = {},
): Promise<T> {
  // FormData (subida de archivos): el navegador fija su propio Content-Type
  // con el boundary del multipart; si lo forzamos a JSON, el server no puede
  // parsear el body.
  const isFormData = options.body instanceof FormData;

  const response = await fetch(`${API_URL}${path}`, {
    method: options.method ?? "GET",
    credentials: "include",
    headers: isFormData ? {} : { "Content-Type": "application/json" },
    ...(options.body !== undefined && {
      body: isFormData ? (options.body as FormData) : JSON.stringify(options.body),
    }),
  });

  if (response.status === 204) {
    return undefined as T;
  }

  const data: unknown = await response.json().catch(() => null);

  if (!response.ok) {
    const errorBody =
      data && typeof data === "object" && "error" in data ? (data as { error: unknown }).error : null;
    const message =
      errorBody && typeof errorBody === "object" && "message" in errorBody &&
      typeof (errorBody as { message: unknown }).message === "string"
        ? (errorBody as { message: string }).message
        : `Request failed with status ${response.status}`;
    throw new ApiError(response.status, message);
  }

  return data as T;
}

export interface Paginated<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
}
