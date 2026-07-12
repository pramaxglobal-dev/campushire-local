import axios, {
  AxiosError,
  type AxiosInstance,
  type InternalAxiosRequestConfig,
  type AxiosRequestConfig,
  type AxiosResponse,
  HttpStatusCode
} from "axios";
import type { PaginatedResponse, PaginatedResponseMeta } from "@campushire/types";
import { ROUTES } from "@/lib/utils/routes";
import { useAuthStore } from "@/lib/store/auth.store";
import { env } from "@/lib/env";

interface RetryableRequestConfig extends AxiosRequestConfig {
  _retry?: boolean;
}

export interface ApiEnvelope<T> {
  success: boolean;
  data: T | null;
  error: string | null;
  meta?: Record<string, unknown>;
}

const API_BASE_URL = env.apiUrl;

let isRefreshing = false;
let pendingResolvers: Array<(token: string | null) => void> = [];

const notifyPending = (token: string | null): void => {
  pendingResolvers.forEach((resolver) => resolver(token));
  pendingResolvers = [];
};

export const apiClient: AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
  timeout: 15000,
  withCredentials: true,
  headers: {
    "Content-Type": "application/json"
  }
});

export const publicApiClient: AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
  timeout: 15000,
  withCredentials: true,
  headers: {
    "Content-Type": "application/json"
  }
});

const readCookie = (name: string): string | null => {
  if (typeof document === "undefined") return null;
  const item = document.cookie.split("; ").find((cookie) => cookie.startsWith(`${name}=`));
  return item ? decodeURIComponent(item.slice(name.length + 1)) : null;
};

const attachCsrfToken = (config: InternalAxiosRequestConfig): InternalAxiosRequestConfig => {
  const method = config.method?.toUpperCase() ?? "GET";
  if (!["GET", "HEAD", "OPTIONS"].includes(method)) {
    const csrfToken = readCookie("campushire_csrf_token");
    if (csrfToken) {
      config.headers["x-csrf-token"] = csrfToken;
    }
  }
  return config;
};

publicApiClient.interceptors.request.use(attachCsrfToken);

apiClient.interceptors.request.use((config) => {
  attachCsrfToken(config);
  const token = useAuthStore.getState().accessToken;
  if (token) {
    config.headers = config.headers ?? {};
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

apiClient.interceptors.response.use(
  (response: AxiosResponse) => response,
  async (error: AxiosError<ApiEnvelope<unknown>>) => {
    const originalRequest = error.config as RetryableRequestConfig | undefined;

    if (error.code === "ERR_NETWORK") {
      return Promise.reject(new Error("Unable to reach the server. Check your connection."));
    }

    if (!originalRequest) {
      return Promise.reject(error);
    }

    const status = error.response?.status;

    if (status === HttpStatusCode.Unauthorized && !originalRequest._retry) {
      originalRequest._retry = true;
      const store = useAuthStore.getState();

      if (!store.refreshToken) {
        store.clearSession();
        if (typeof window !== "undefined") {
          window.location.href = ROUTES.LOGIN;
        }
        return Promise.reject(error);
      }

      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          pendingResolvers.push((token) => {
            if (!token) {
              reject(error);
              return;
            }

            originalRequest.headers = originalRequest.headers ?? {};
            originalRequest.headers.Authorization = `Bearer ${token}`;
            resolve(apiClient(originalRequest));
          });
        });
      }

      isRefreshing = true;

      try {
        const refreshResponse = await publicApiClient.post<
          ApiEnvelope<{ accessToken: string; refreshToken: string }>
        >("/api/auth/refresh", {
          refreshToken: store.refreshToken
        });

        const refreshed = refreshResponse.data.data;

        if (!refreshResponse.data.success || !refreshed) {
          throw new Error(refreshResponse.data.error ?? "Session refresh failed");
        }

        useAuthStore.getState().setTokens(refreshed.accessToken, refreshed.refreshToken);
        notifyPending(refreshed.accessToken);

        originalRequest.headers = originalRequest.headers ?? {};
        originalRequest.headers.Authorization = `Bearer ${refreshed.accessToken}`;

        return apiClient(originalRequest);
      } catch (refreshError) {
        notifyPending(null);
        useAuthStore.getState().clearSession();
        if (typeof window !== "undefined") {
          window.location.href = ROUTES.LOGIN;
        }
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }

    return Promise.reject(error);
  }
);

export const unwrapResponse = <T>(response: AxiosResponse<ApiEnvelope<T>>): T => {
  if (!response.data.success || response.data.data === null) {
    throw new Error(response.data.error ?? "Request failed");
  }

  return response.data.data;
};

export const unwrapVoidResponse = (response: AxiosResponse<ApiEnvelope<unknown>>): void => {
  if (!response.data.success) {
    throw new Error(response.data.error ?? "Request failed");
  }
};

export const unwrapPaginatedResponse = <T>(
  response: AxiosResponse<ApiEnvelope<T[]>>
): PaginatedResponse<T[]> => {
  if (!response.data.success || !Array.isArray(response.data.data)) {
    throw new Error(response.data.error ?? "Request failed");
  }

  const meta = response.data.meta ?? {};
  const total = typeof meta.total === "number" ? meta.total : response.data.data.length;
  const page = typeof meta.page === "number" ? meta.page : 1;
  const limit = typeof meta.limit === "number" ? meta.limit : response.data.data.length;
  const totalPages =
    typeof meta.totalPages === "number" ? meta.totalPages : Math.max(1, Math.ceil(total / Math.max(limit, 1)));

  const normalizedMeta: PaginatedResponseMeta = {
    total,
    page,
    limit,
    totalPages
  };

  return {
    success: true,
    data: response.data.data,
    error: null,
    meta: normalizedMeta
  };
};

export { API_BASE_URL };
