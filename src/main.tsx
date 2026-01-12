/* tailwindcss------------start */
import './styles/tailwind.css'
import './styles/index.css'
/* tailwindcss------------end */


/* react------------start */
// import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { createContext } from 'react';
import './styles/main.css';
/* react------------end */
/* leaflet------------start */
import 'leaflet/dist/leaflet.css';
/* leaflet------------end */



/* react-router------------start */
import { RouterProvider } from "react-router";
import router from './route'
/* react-router------------end */


/* dayjs------------start */
import dayjs from 'dayjs';
import 'dayjs/locale/zh-cn';
import { setLocalInfo } from './store/session-store/local';
dayjs.locale('zh-cn');
/* dayjs------------end */

/* antd-design------------start */

import { App, ConfigProvider, theme } from "antd";
import zhCN from "antd/locale/zh_CN";
// 兼容react19的方式二选一：优选方式一
/* 解决方案来源：https://github.com/ant-design/ant-design/issues/54312
  下面的代码我都开发环境都可以运行，但是打包后就不行了! 如果你使用方式1打包后运行也是正常的，就不用看方式2了。否则就用方式2把。
  方式1：直接添加这句代码即可： import '@ant-design/v5-patch-for-react-19';
  但本项目中不知道为啥不行！
  方式2：使用unstableSetRender, 这个在本项目中可以！
  代码如下：
  ```javascript
  import { unstableSetRender } from 'antd';
  unstableSetRender((node, container) => {
    // @ts-ignore
    container._reactRoot ||= createRoot(container);
    // @ts-ignore
    const root = container._reactRoot;
    root.render(node);
    return async () => {
      await new Promise((resolve) => setTimeout(resolve, 0));
      root.unmount();
    };
  });
  ```
*/

/* antd-design------------end */



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

async function bootstrap() {
  try {
    const configData = await getUserConfig(configPath); // 加载配置
    // 存储到local中一份，原因： ts文件也可能需要读取
    setLocalInfo('config', configData);
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
          <GlobalContext value={configData}>
            <RouterProvider router={router} />
          </GlobalContext>
        </App>
      </ConfigProvider>
    );
  } catch (error) {
    console.error('启动应用程序失败:', error);
  }
}

bootstrap(); // 调用启动函数