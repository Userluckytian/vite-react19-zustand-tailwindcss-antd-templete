import type {
  AxiosResponse,
  InternalAxiosRequestConfig,
  CreateAxiosDefaults,
  Cancel,
} from 'axios';

export interface RequestCancel extends Cancel {
  data: object;
  response: {
    status: number;
    data: {
      code?: number;
      message?: string;
    }
  }
}

export interface RequestInterceptors<T> {
  // 请求拦截
  requestInterceptors?: (
    config: InternalAxiosRequestConfig,
  ) => InternalAxiosRequestConfig
  requestInterceptorsCatch?: (err: RequestCancel) => void
  // 响应拦截
  responseInterceptors?: (config: T) => T
  responseInterceptorsCatch?: (err: RequestCancel) => void
}

// 自定义传入的参数
export interface CreateRequestConfig<T = AxiosResponse>
  extends CreateAxiosDefaults {
  interceptors?: RequestInterceptors<T>, // 接口请求拦截器
  debounce?: boolean; // 是否开启防抖动
  debounceTime?: number; // 防抖动时间
  throttle?: boolean; // 是否开启节流
  throttleTime?: number; // 节流时间
  canAbort?: boolean; // 是否可以取消请求
}

// 接口响应数据
export interface ServerResult<T = unknown> {
  status: number;
  message?: string;
  data: T,
  timestamp: string
}