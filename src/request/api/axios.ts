import axios, { AxiosError, type AxiosRequestConfig, type InternalAxiosRequestConfig } from "axios";
import { message } from "antd";
import NProgress from "@/route/npprogress";

/** 默认系统位置，如果涉及到一些接口需要传特定位置的话，记得更新 */
const defaultPosConfig = {
  posId: 0,
  posOtId: 0,
};

const axiosInstance = axios.create({
  baseURL: '', // baseUrl,
  timeout: 20 * 1000,
});
// 我应该构建一个携带了防抖、或者重复请求可被取消、仅仅普通方式的请求这三种方式。

/** 请求拦截器 */
axiosInstance.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    // 添加header头内容
    let token = getToken();
    config.headers["Authorization"] = `Bearer ${token}`;
    return config;
  },
  (error) => {
    message.error(error.message);
    return Promise.reject(error);
  }
);

/** 响应拦截器 */
axiosInstance.interceptors.response.use(
  (res: any) => {
    checkAuth(res.data.status ? res.data.status : 200, res.data.message);
    return res.data;
  },
  (error: AxiosError) => {
    NProgress.done();
    return Promise.reject(error);
  }
);
const checkAuth = (status: number, msg: string): void => {
  switch (status) {
    case 10201: // 对应后台：拒绝访问（用户认证信息不合法，请检查用户登录情况）
    case 10202: // 对应后台：用户认证失败
    case 10203: // 对应后台：非法的用户认证信息
    case 10204: // 对应后台：用户令牌过期

      break;
    default:
      break;
  }
};


const getToken = () => {
  let token = localStorage.getItem("token");
  return token ? token : null;
};



export default axiosInstance;
