export interface WorkspaceConfig {
  apiUrl: string;
  sessionToken: string;
  organizationId: string;
  user?: {
    id: string;
    email: string;
    name: string;
    role: string;
  };
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
  const { apiUrl, sessionToken, organizationId } = config;

  if (!apiUrl || !sessionToken || !organizationId) {
    throw new ApiClientError(
      "Contexte d'espace de travail non initialisé. Authentification requise.",
      401
    );
  }

  const url = path.startsWith("http") ? path : `${apiUrl}${path.startsWith("/") ? "" : "/"}${path}`;

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    "Authorization": `Bearer ${sessionToken}`,
    "X-Organization-ID": organizationId,
    ...(options.headers as Record<string, string> || {}),
  };

  let response: Response;
  try {
    response = await fetch(url, {
      ...options,
      headers,
    });
  } catch (err: any) {
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

  // Handle empty 204 No Content
  if (response.status === 204) {
    return {} as T;
  }

  return response.json();
}
