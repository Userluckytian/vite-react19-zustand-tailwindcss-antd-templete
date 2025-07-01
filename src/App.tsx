import { createContext, Fragment} from 'react'

import './App.css'

import { ConfigProvider } from 'antd';
import '@ant-design/v5-patch-for-react-19';

// 由于 antd 组件的默认文案是英文，所以需要修改为中文
import dayjs from 'dayjs';
import 'dayjs/locale/zh-cn';
import zhCN from 'antd/locale/zh_CN';
dayjs.locale('zh-cn');

// 路由配置项
import { RouterProvider } from 'react-router'
import router from './route'

export const ThemeContext = createContext({}); // 这个要放到组件的外部（并且使用export，为了可以在子组件中拿到它）

function App() {
  return (
    <Fragment>
      <ConfigProvider locale={zhCN}>
        <ThemeContext value={{ name: '123', age: 12 }}>
          
          <RouterProvider router={router} />
        
        </ThemeContext>
      </ConfigProvider>
    </Fragment>
  )
}

export default App
