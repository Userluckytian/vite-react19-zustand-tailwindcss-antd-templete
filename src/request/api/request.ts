import axios from 'axios';
import type {
  AxiosResponse,
  AxiosInstance,
  InternalAxiosRequestConfig,
  AxiosRequestConfig
} from 'axios';
import type {
  RequestInterceptors,
  CreateRequestConfig,
  ServerResult
} from './types';
const DEFAULT_DEBOUNCETIME = 300;

interface NewAxiosRequestConfig<D = any> extends AxiosRequestConfig<D> {
  _mapKey?: string; // 存储请求唯一值的
  _debounce?: boolean; // 是否防抖
  _debounceTime?: number; // 防抖时间
}

class AxiosRequest {
  // axios 实例
  instance: AxiosInstance;
  // 拦截器对象
  interceptorsObj?: RequestInterceptors<AxiosResponse>;
  // 存放取消请求控制器Map
  abortControllerMap: Map<string, AbortController>;

  // 添加防抖相关的Map
  debounceMap: Map<string, NodeJS.Timeout> = new Map();

  constructor(config: CreateRequestConfig) {
    this.instance = axios.create(config);
    // 初始化存放取消请求控制器Map
    this.abortControllerMap = new Map();
    this.interceptorsObj = config.interceptors;
    // 拦截器执行顺序 接口请求 -> 实例请求 -> 全局请求 -> 实例响应 -> 全局响应 -> 接口响应(看这个代码，说明我们可以写多个this.instance.interceptors.request.use去多次拦截，每个拦截做独立的一件事)
    this.instance.interceptors.request.use(
      (res: InternalAxiosRequestConfig) => {
        const controller = new AbortController();
        res.signal = controller.signal;

        const mapKey = this.generateMapKey(res);
        // 保存key到请求配置中，供响应拦截器使用
        (res as NewAxiosRequestConfig)._mapKey = mapKey;

        // 如果存在则删除该请求
        if (this.abortControllerMap.get(mapKey)) {
          console.warn('取消重复请求：', mapKey);
          this.cancelRequest(mapKey);
        } else {
          this.abortControllerMap.set(mapKey, controller);
        }

        return res;
      },
      (err: object) => err,
    );

    // 使用实例拦截器
    this.instance.interceptors.request.use(
      this.interceptorsObj?.requestInterceptors,
      this.interceptorsObj?.requestInterceptorsCatch,
    );
    this.instance.interceptors.response.use(
      this.interceptorsObj?.responseInterceptors,
      this.interceptorsObj?.responseInterceptorsCatch,
    );
    // 全局响应拦截器保证最后执行
    this.instance.interceptors.response.use(
      // 因为我们接口的数据都在res.data下，所以我们直接返回res.data
      (res: AxiosResponse) => {
        // 从请求配置中获取之前保存的key
        const mapKey = (res.config as NewAxiosRequestConfig)._mapKey || '';
        this.abortControllerMap.delete(mapKey);
        return res.data;
      },
      (err: object) => err,
    );
  }
  /**
   * 取消全部请求
   */
  cancelAllRequest() {
    for (const [, controller] of this.abortControllerMap) {
      controller.abort();
    }
    this.abortControllerMap.clear();
  }
  /**
   * 取消指定的请求
   * @param url - 待取消的请求URL
   */
  cancelRequest(url: string | string[]) {
    const urlList = Array.isArray(url) ? url : [url];
    for (const _url of urlList) {
      this.abortControllerMap.get(_url)?.abort();
      this.abortControllerMap.delete(_url);
    }
  }
  /**
   * get请求  
   * @param url - 链接
   * @param options - 参数
   */
  get<T = object>(url: string, config?: NewAxiosRequestConfig<object>) {
    const requestAPI = this.instance.get(url, config) as Promise<ServerResult<T>>;
    return config?._debounce ? this.debounceRequest(url, requestAPI, config?._debounceTime || DEFAULT_DEBOUNCETIME) : requestAPI;
  }
  /**
   * post请求
   * @param url - 链接
   * @param options - 参数
   */
  post<T = object>(url: string, options: object = {}, config?: NewAxiosRequestConfig<object>) {
    const requestAPI = this.instance.post(url, options, config) as Promise<ServerResult<T>>;
    return config?._debounce ? this.debounceRequest(url, requestAPI, config?._debounceTime || DEFAULT_DEBOUNCETIME) : requestAPI;
  }
  /**
   * put请求
   * @param url - 链接
   * @param options - 参数
   */
  put<T = object>(url: string, options: object = {}, config?: NewAxiosRequestConfig<object>) {
    const requestAPI = this.instance.put(url, options, config) as Promise<ServerResult<T>>;
    return config?._debounce ? this.debounceRequest(url, requestAPI, config?._debounceTime || DEFAULT_DEBOUNCETIME) : requestAPI;
  }
  /**
   * delete请求
   * @param url - 链接
   * @param options - 参数
   */
  delete<T = object>(url: string, config?: NewAxiosRequestConfig<object>) {
    const requestAPI = this.instance.delete(url, config) as Promise<ServerResult<T>>;
    return config?._debounce ? this.debounceRequest(url, requestAPI, config?._debounceTime || DEFAULT_DEBOUNCETIME) : requestAPI;
  }

  /**
   * 生成请求的唯一key（考虑参数）
   */
  private generateMapKey(requestConfig: any) {
    let url = requestConfig.method || '';
    if (requestConfig.url) url += `^${requestConfig.url}`;
    // 如果存在参数
    if (requestConfig.params) {
      for (const key in requestConfig.params) {
        url += `&${key}=${requestConfig.params[key]}`;
      }
    }
    // 如果存在post数据
    if (requestConfig.data && requestConfig.data?.[0] === '{' && requestConfig.data?.[requestConfig.data?.length - 1] === '}') {
      const obj = JSON.parse(requestConfig.data);
      for (const key in obj) {
        url += `#${key}=${obj[key]}`;
      }
    }
    return url;
  }

  /**
   * 防抖请求实现(这种呢，虽然防抖了，但是防抖事件一结束，你再次点击，会再次发起请求。应该是合理的，只是不得劲，后续得再看看。)
   */
  private debounceRequest(
    mapKey: string,
    requertAPI: Promise<ServerResult<any>>,
    wait: number = 300,
  ): Promise<any> {

    // 检验是否之前已经存在一个了，若存在，则清理之前的定时器
    if (this.debounceMap.has(mapKey)) {
      clearTimeout(this.debounceMap.get(mapKey));
      console.log(`取消前一个防抖请求: ${mapKey}`);
    }
    return new Promise((resolve, reject) => {
      const timeoutId = setTimeout(() => {
        const request = requertAPI;
        request.then(resolve).catch(reject);
        this.debounceMap.delete(mapKey);
      }, wait);
      this.debounceMap.set(mapKey, timeoutId);
    });
  }
}
export default AxiosRequest;