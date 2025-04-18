import { QueryClient, QueryFunction } from "@tanstack/react-query";

async function throwIfResNotOk(res: Response) {
  if (!res.ok) {
    try {
      const data = await res.json();
      throw new Error(data.message || `${res.status}: ${res.statusText}`);
    } catch (e) {
      // Nếu không thể parse JSON, dùng text thô
      const text = await res.text() || res.statusText;
      throw new Error(`${res.status}: ${text}`);
    }
  }
}

// Cải thiện apiRequest với retry và timeout
export async function apiRequest(
  method: string,
  url: string,
  data?: unknown | undefined,
  options: { timeout?: number, retries?: number } = {}
): Promise<Response> {
  const { timeout = 10000, retries = 1 } = options;
  
  // Thiết lập timeout cho các yêu cầu
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);
  
  let lastError: Error | null = null;
  
  // Thực hiện thử lại khi có lỗi kết nối
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const res = await fetch(url, {
        method,
        headers: data ? { "Content-Type": "application/json" } : {},
        body: data ? JSON.stringify(data) : undefined,
        credentials: "include",
        signal: controller.signal,
      });
      
      clearTimeout(timeoutId);
      
      // Xử lý lỗi 429 (Too Many Requests) bằng cách thử lại sau một khoảng thời gian
      if (res.status === 429 && attempt < retries) {
        const retryAfter = res.headers.get('Retry-After');
        const waitTime = retryAfter ? parseInt(retryAfter) * 1000 : Math.min(1000 * 2 ** attempt, 10000);
        await new Promise(resolve => setTimeout(resolve, waitTime));
        continue;
      }

      await throwIfResNotOk(res);
      return res;
    } catch (error: any) {
      lastError = error;
      
      // Không retry nếu là lỗi 4xx
      if (error.message.includes('4') && !error.message.includes('429')) {
        break;
      }
      
      // Không retry nếu yêu cầu bị hủy (abort)
      if (error.name === 'AbortError') {
        break;
      }
      
      // Chờ một khoảng thời gian trước khi thử lại (exponential backoff)
      if (attempt < retries) {
        const delay = Math.min(1000 * 2 ** attempt, 5000);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }
  
  clearTimeout(timeoutId);
  throw lastError || new Error("Lỗi không xác định khi kết nối với máy chủ");
}

type UnauthorizedBehavior = "returnNull" | "throw";
export const getQueryFn: <T>(options: {
  on401: UnauthorizedBehavior;
}) => QueryFunction<T> =
  ({ on401: unauthorizedBehavior }) =>
  async ({ queryKey }) => {
    try {
      // Tạo một bộ đếm thời gian để đo lường hiệu suất
      const startTime = performance.now();
      
      const res = await fetch(queryKey[0] as string, {
        credentials: "include",
        // Thêm cache-control để cải thiện hiệu suất
        cache: "default"
      });
      
      const endTime = performance.now();
      // Log thời gian thực hiện cho các yêu cầu quá chậm (>500ms) để phát hiện vấn đề
      if (endTime - startTime > 500) {
        console.warn(`Slow query (${Math.round(endTime - startTime)}ms): ${queryKey[0]}`);
      }

      if (unauthorizedBehavior === "returnNull" && res.status === 401) {
        return null;
      }

      await throwIfResNotOk(res);
      return await res.json();
    } catch (error) {
      console.error(`Error fetching ${queryKey[0]}:`, error);
      throw error;
    }
  };

// Cấu hình QueryClient với các tùy chọn tối ưu
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      queryFn: getQueryFn({ on401: "throw" }),
      refetchInterval: false,
      refetchOnWindowFocus: false,
      staleTime: 60 * 1000, // 1 phút cho dữ liệu vẫn tươi mới, thay vì Infinity
      retry: 1, // Thử lại 1 lần khi thất bại
      retryDelay: attemptIndex => Math.min(1000 * 2 ** attemptIndex, 5000), // Exponential backoff
    },
    mutations: {
      retry: false,
      onError: (error) => {
        console.error('Mutation error:', error);
      }
    },
  },
});
