/**
 * @description: 配置项
 */
export const WATERMARK_PREFIX = 'admin'; // 水印前缀
export const TOKEN = 'admin_token'; // token名称
export const LANG = 'lang'; // 语言
export const VERSION = 'admin_version'; // 版本
export const EMPTY_VALUE = '-'; // 空值显示
export const THEME_KEY = 'theme_key'; // 主题

// 初始化分页数据
export const INIT_PAGINATION = {
  page: 1,
  pageSize: 20
};

// 日期格式化
export const DATE_FORMAT = 'YYYY-MM-DD';
export const TIME_FORMAT = 'YYYY-MM-DD hh:mm:ss';

// 公共组件默认值
export const FORM_REQUIRED = [{ required: true }]; // 表单必填校验

// 密码规则
export const PASSWORD_RULE = () => ({
  pattern: /^(?=.*\d)(?=.*[a-zA-Z])[\da-zA-Z~!@#$%^&*+\.\_\-*]{6,30}$/,
  message: 'login.passwordRuleMessage'
});

// 环境判断
const ENV = import.meta.env.VITE_ENV as string;
// 生成环境所用的接口
const URL = import.meta.env.VITE_BASE_URL as string;
// 上传地址
export const FILE_API = `${ENV === 'development' ? '/api' : URL}/authority/file/upload-file`;
