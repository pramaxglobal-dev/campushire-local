import axios, { AxiosError, type AxiosInstance, type AxiosRequestConfig, HttpStatusCode } from "axios";
import { useAuthStore } from "@/lib/store/auth.store";

interface RetryableRequestConfig extends AxiosRequestConfig {
  _retry?: boolean;
}

interface ApiEnvelope<T> {
  success: boolean;
  data: T | null;
  error: string | null;
  meta?: Record<string, unknown>;
}

const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL ?? "http://localhost:4000";

let isRefreshing = false;
let queuedResolvers: Array<(token: string | null) => void> = [];

const resolveQueued = (token: string | null): void => {
  queuedResolvers.forEach((resolver) => resolver(token));
  queuedResolvers = [];
};

export const apiClient: AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
  timeout: 20000,
  headers: {
    "Content-Type": "application/json"
  }
});

const publicClient: AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
  timeout: 20000,
  headers: {
    "Content-Type": "application/json"
  }
});

apiClient.interceptors.request.use((config) => {
  const token = useAuthStore.getState().accessToken;
  if (token) {
    config.headers = config.headers ?? {};
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

apiClient.interceptors.response.use(
  (response) => response,
  async (error: AxiosError<ApiEnvelope<unknown>>) => {
    const originalRequest = error.config as RetryableRequestConfig | undefined;
    if (error.code === "ERR_NETWORK") {
      return Promise.reject(new Error("Unable to reach server. Please check your network."));
    }

    if (!originalRequest) {
      return Promise.reject(error);
    }

    if (
      error.response?.status === HttpStatusCode.Unauthorized &&
      !originalRequest._retry
    ) {
      originalRequest._retry = true;
      const authState = useAuthStore.getState();
      if (!authState.refreshToken) {
        await authState.clearSession();
        return Promise.reject(error);
      }

      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          queuedResolvers.push((token) => {
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
        const refreshResponse = await publicClient.post<
          ApiEnvelope<{ accessToken: string; refreshToken: string }>
        >("/api/auth/refresh", {
          refreshToken: authState.refreshToken
        });
        const payload = refreshResponse.data.data;
        if (!refreshResponse.data.success || !payload) {
          throw new Error(refreshResponse.data.error ?? "Refresh failed.");
        }
        await useAuthStore.getState().setTokens(payload.accessToken, payload.refreshToken);
        resolveQueued(payload.accessToken);

        originalRequest.headers = originalRequest.headers ?? {};
        originalRequest.headers.Authorization = `Bearer ${payload.accessToken}`;
        return apiClient(originalRequest);
      } catch (refreshError) {
        resolveQueued(null);
        await useAuthStore.getState().clearSession();
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }

    return Promise.reject(error);
  }
);

export const unwrapResponse = <T>(response: { data: ApiEnvelope<T> }): T => {
  if (!response.data.success || response.data.data === null) {
    throw new Error(response.data.error ?? "Request failed.");
  }
  return response.data.data;
};

export { API_BASE_URL };
