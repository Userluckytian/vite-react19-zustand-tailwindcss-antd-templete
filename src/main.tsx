// import { StrictMode } from 'react'




/* react------------start */
import { createRoot } from 'react-dom/client'
import { createContext } from 'react';
import './styles/main.css';
/* react------------end */

/* tailwindcss------------start */
import './styles/index.css'
import './styles/tailwind.css'
/* tailwindcss------------end */

/* react-router------------start */
import { createBrowserRouter, RouterProvider, HashRouter } from "react-router";
import router from './route'
/* react-router------------end */

/* antd-design------------start */
import '@ant-design/v5-patch-for-react-19'; // 兼容react19的patch
import { App, ConfigProvider, theme } from "antd";
import zhCN from "antd/locale/zh_CN";
/* antd-design------------end */

/* dayjs------------start */
import dayjs from 'dayjs';
import 'dayjs/locale/zh-cn';
dayjs.locale('zh-cn');
/* dayjs------------end */

const configPath = './config.json';

// 构建配置项
const getUserConfig = async (path: string) => {
  const response = await fetch(path + `?temp=${new Date().getTime()}`);
  if (!response.ok) {
    throw new Error('项目启动失败！');
  }
  return await response.json();
}

// raect19新的API之：父传子不再需要写provider字样, 之前需要携带 GlobalContext.provider。
export const GlobalContext = createContext({} as any);
const ThemeContext = createContext({}); // 这个要放到组件的外部（并且使用export，为了可以在子组件中拿到它）

async function bootstrap() {
  try {
    const configData = await getUserConfig(configPath); // 加载配置
    const root = createRoot(document.getElementById('root')!);
    root.render(
      <ConfigProvider
        locale={zhCN}
        theme={{
          token: {
            // token啥作用呀???
            "colorPrimary": "#fe7300",
            "colorInfo": "#fe7300",
            "colorLink": "#fe7300",
          },
          components: {
            // // 修改单个组件的主色而不影响其他的UI组件
            // Radio: {
            //   colorPrimary: "#00b96b",
            // },
            // 滑块条颜色
            Slider: {
              railBg: "#e9e9e9",
            },
          },
          algorithm: theme.defaultAlgorithm, // 默认算法
        }}
      >
        <App>

          {/* 第一步：提供全部配置内容注入到全局上下文 */}
          <ThemeContext value={{ name: '123', age: 12 }}>
            <GlobalContext value={configData}>
              <RouterProvider router={router} />
              {/* <HashRouter>
            </HashRouter> */}
            </GlobalContext>
          </ThemeContext>
        </App>
      </ConfigProvider>
    );
  } catch (error) {
    console.error('启动应用程序失败:', error);
  }
}

bootstrap(); // 调用启动函数




createRoot(document.getElementById('root')!).render(
  // <StrictMode>
  /* 提供全部配置内容注入到全局上下文 */
  <GlobalContext value={{}}>
    <App />
  </GlobalContext>
  // </StrictMode>,
)
