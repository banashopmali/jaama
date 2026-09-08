export interface WorkspaceConfig {
  apiUrl: string;
  organizationId: string;
  organization?: {
    id: string;
    name: string;
    slug?: string;
    status?: string;
  };
  user?: {
    id: string;
    email: string;
    name: string;
    role?: string;
  };
  role?: string;
  permissions?: string[];
}

export class ApiClientError extends Error {
  public statusCode: number;
  public details: any;

  constructor(message: string, statusCode: number, details?: any) {
    super(message);
    this.statusCode = statusCode;
    this.details = details;
    this.name = "ApiClientError";
  }
}

export async function workspaceFetch<T = any>(
  path: string,
  config: WorkspaceConfig,
  options: RequestInit = {}
): Promise<T> {
  const { apiUrl, organizationId } = config;

  if (!apiUrl || !organizationId) {
    throw new ApiClientError(
      "Contexte d'espace de travail non initialisé. Authentification requise.",
      401
    );
  }

  const url = path.startsWith("http") ? path : `${apiUrl}${path.startsWith("/") ? "" : "/"}${path}`;

  const isFormData = typeof FormData !== "undefined" && options.body instanceof FormData;
  const baseHeaders: Record<string, string> = {};
  if (organizationId) {
    baseHeaders["X-Organization-ID"] = organizationId;
  }
  if (!isFormData) {
    baseHeaders["Content-Type"] = "application/json";
  }

  const headers: Record<string, string> = {
    ...baseHeaders,
    ...(options.headers as Record<string, string> || {}),
  };

  let response: Response;
  try {
    response = await fetch(url, {
      ...options,
      credentials: "include",
      headers,
    });
  } catch {
    throw new ApiClientError(
      "Impossible d'atteindre le serveur JAAMA. Vérifiez votre connexion réseau.",
      503
    );
  }

  if (!response.ok) {
    const errorBody = await response.json().catch(() => ({}));
    const message =
      errorBody?.error?.message ||
      errorBody?.message ||
      `Erreur HTTP ${response.status}`;
    throw new ApiClientError(message, response.status, errorBody);
  }

  if (response.status === 204) {
    return {} as T;
  }

  return response.json();
}
