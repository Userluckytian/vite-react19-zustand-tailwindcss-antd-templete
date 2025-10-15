
import { request, type ServerResult } from '@/request/api';
import { getLocalInfo } from '@/store/session-store/local';
import { toFormData } from 'axios';
// 数据类型
export type BaseFormData = Record<string, unknown>
export interface PaginationData {
  page?: number;
  pageSize?: number;
}


enum API {
  LOGINAPI = '/auth/login',
  URL = '/content/article',
}

/**
 * 获取分页数据
 * @param data - 请求数据
 */
export function login(data: Partial<BaseFormData>) {
  return request.post<ServerResult<BaseFormData[]>>(
    getLocalInfo('config').ssoServerUrl + API.LOGINAPI,
    toFormData(data)
  );
}

/**
 * 获取分页数据
 * @param data - 请求数据
 */
export function getArticlePage(data: Partial<BaseFormData> & PaginationData) {
  return request.get<ServerResult<BaseFormData[]>>(
    `${API.URL}/page`,
    { params: data }
  );
}

/**
 * 根据ID获取数据
 * @param id - ID
 */
export function getArticleById(id: string) {
  return request.get<BaseFormData>(`${API.URL}/detail?id=${id}`);
}


/**
 * 修改数据
 * @param id - 修改id值
 * @param data - 请求数据
 */
export function updateArticle(id: string, data: BaseFormData) {
  return request.put(`${API.URL}/${id}`, data);
}

/**
 * 忘记密码
 * @param data - 请求数据
 */
export function forgetPassword(data: object) {
  return request.post('/forget-password', data);
}

/**
 * 删除
 * @param id - 删除id值
 */
export function deleteArticle(id: string) {
  return request.delete(`${API.URL}/${id}`);
}