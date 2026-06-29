import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL;

export { API_BASE_URL };

if (!API_BASE_URL) {
    throw new Error('VITE_API_URL não definida no build');
}

const api = axios.create({
    baseURL: API_BASE_URL.replace(/\/?$/, '/'),
    timeout: 60000, // Aumentado para 60s para testes de simulação lenta
    headers: {
        'Content-Type': 'application/json',
    },
});

// Request Interceptor: Attach Token
api.interceptors.request.use(
    (config) => {
        // Break circular dependency: Read localStorage directly
        const userStr = localStorage.getItem('user');
        if (userStr) {
            const user = JSON.parse(userStr);
            if (user && user.token) {
                // Formatting log to be less spammy
                // console.log("[API] Attaching Token:", user.token.substring(0, 10) + "...");
                config.headers['Authorization'] = 'Bearer ' + user.token;
            }
        }
        return config;
    },
    (error) => {
        return Promise.reject(error);
    }
);

// Queue for refreshing 401s
let isRefreshing = false;
let failedQueue: Array<{
    resolve: (token: string) => void;
    reject: (error: any) => void;
}> = [];

const processQueue = (error: any, token: string | null = null) => {
    failedQueue.forEach(prom => {
        if (error) {
            prom.reject(error);
        } else {
            prom.resolve(token as string);
        }
    });
    failedQueue = [];
};

// Reusable Refresh Logic
const performRefreshToken = async (): Promise<string> => {
    try {
        console.log("[API] Refreshing token...");
        const refreshResponse = await api.post('/auth/refresh');
        const newUserFields = refreshResponse.data;

        const userStr = localStorage.getItem('user');
        const oldUser = userStr ? JSON.parse(userStr) : {};

        // Merge updated fields (token, roles, features, etc.)
        const updatedUser = { ...oldUser, ...newUserFields };

        localStorage.setItem('user', JSON.stringify(updatedUser));
        console.log("[API] Token refreshed successfully!");

        // Update defaults
        api.defaults.headers.common['Authorization'] = 'Bearer ' + updatedUser.token;
        return updatedUser.token;
    } catch (error) {
        console.error("[API] Failed to refresh token", error);
        localStorage.removeItem('user');
        window.location.href = '/login';
        throw error;
    }
};

// Response Interceptor: Handle 401 (Unauthorized), 429 (Rate Limit) and 403 (Forbidden)
api.interceptors.response.use(
    async (response) => {
        // Proactive Refresh on Write Operations (POST/PUT/PATCH/DELETE)
        // This prevents 401s on subsequent fetches because the write likely bumped the tenant version
        if (response.config &&
            ['post', 'put', 'patch', 'delete'].includes(response.config.method?.toLowerCase() || '') &&
            !response.config.url?.includes('/auth/') &&
            response.status >= 200 && response.status < 300) {

            try {
                // We perform the refresh and wait for it to complete BEFORE returning the response
                // This ensures that the calling code (e.g. React Query invalidateQueries) 
                // will execute AFTER we have the new token.
                if (!isRefreshing) {
                    isRefreshing = true;
                    try {
                        const newToken = await performRefreshToken();
                        processQueue(null, newToken);
                    } catch (e) {
                        processQueue(e, null);
                    } finally {
                        isRefreshing = false;
                    }
                } else {
                    // If already refreshing, wait for it
                    await new Promise((resolve, reject) => {
                        failedQueue.push({ resolve, reject });
                    });
                }
            } catch (e) {
                // If proactive refresh fails, we still return the original success response.
                // The next request will likely fail with 401 and trigger the standard refresh logic.
                console.warn("[API] Proactive refresh failed, continuing...", e);
            }
        }
        return response;
    },
    async (error) => {
        const originalRequest = error.config;

        if (error.response) {
            // Check for specific Auth Version Mismatch
            if (error.response.status === 401 && !originalRequest._retry && !originalRequest.url?.endsWith('/auth/login') && !originalRequest.url?.endsWith('/auth/refresh')) {
                const errorMsg = error.response.data?.error || "";

                if (errorMsg.includes("Plano/status alterado") || errorMsg.includes("Permissões alteradas")) {

                    if (isRefreshing) {
                        return new Promise(function (resolve, reject) {
                            failedQueue.push({ resolve, reject });
                        }).then(token => {
                            originalRequest.headers['Authorization'] = 'Bearer ' + token;
                            return api(originalRequest);
                        }).catch(err => {
                            return Promise.reject(err);
                        });
                    }

                    originalRequest._retry = true;
                    isRefreshing = true;

                    try {
                        console.log("[API] Auth Version Mismatch detected. Attempting Auto-Refresh...");
                        const newToken = await performRefreshToken();

                        processQueue(null, newToken);

                        originalRequest.headers['Authorization'] = 'Bearer ' + newToken;
                        return api(originalRequest);

                    } catch (refreshError) {
                        processQueue(refreshError, null);
                        return Promise.reject(refreshError);
                    } finally {
                        isRefreshing = false;
                    }
                }
            }

            if (error.response.status === 401) {
                if (!originalRequest._retry && !originalRequest.url?.endsWith('/auth/refresh')) {
                    console.warn("[API] 401 Unauthorized - Token inválido ou expirado.");
                    // Only redirect if "Auto-Refresh" logic didn't catch it
                    // Double check if we are not already refreshing
                    if (!isRefreshing) {
                        localStorage.removeItem('user');
                        window.location.href = '/login';
                    }
                }
            } else if (error.response.status === 429) {
                console.error("Muitas tentativas de login. Por favor, aguarde 15 minutos e tente novamente.");
            } else if (error.response.status === 403) {
                console.warn("Acesso Negado (403):", error.config.url);
            }
        }
        return Promise.reject(error);
    }
);

export default api;
