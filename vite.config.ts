import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react-swc'
import viteCompression from 'vite-plugin-compression';
import tailwindcss from '@tailwindcss/vite'
import webConfig from './public/config.json'
/**
 * JS模块分包
 * @param id - 标识符
 */
function splitJSModules(id: string) {
  // pnpm兼容
  const pnpmName = id.includes('.pnpm') ? '.pnpm/' : '';
  const fileName = `node_modules/${pnpmName}`;

  const result = id
    .split(fileName)[1]
    .split('/')[0]
    .toString();

  return result;
}


// https://vite.dev/config/
export default defineConfig({
  base: './',
  build: {
    chunkSizeWarningLimit: 1000, // 大于1000k才警告
    sourcemap: process.env.NODE_ENV !== 'production', // 非生产环境开启
    minify: 'terser',
    terserOptions: {
      compress: {
        // 生产环境时移除console和debugger
        drop_console: true,
        drop_debugger: true,
      },
    },
    rollupOptions: {
      output: {
        chunkFileNames: 'assets/js/[name].[hash].js',
        entryFileNames: 'assets/js/[name].[hash].js',
        assetFileNames: 'assets/[ext]/[name].[hash].[ext]',
        manualChunks(id) {
          // JS模块
          if (id.includes('node_modules')) {
            return splitJSModules(id);
          }
        }
      }
    },
  },
  resolve: {
    alias: {
      '@': '/src',
    },
  },
  plugins: [
    react(),
    viteCompression({
      // 压缩选项
      verbose: true, // 是否在控制台输出压缩结果
      disable: false, // 禁用压缩
      deleteOriginFile: false, // 删除源文件
      threshold: 10240, // 体积大于 threshold 的文件会被压缩，单位是字节（byte）
      algorithm: 'gzip', // 使用 gzip 压缩
      ext: '.gz', // 生成的压缩包后缀
    }),
    tailwindcss(),
  ],
  // 优化构建性能
  optimizeDeps: {
    include: [
      'react',
      'react-dom',
      'antd',
      'leaflet',
      'dayjs',
      'axios',
      'crypto-js',
      'zustand',
      'react-router'
    ],
  },
  css: {
    preprocessorOptions: {
      scss: {
        api: "modern-compiler", // 修改api调用方式
        silenceDeprecations: ["legacy-js-api"], // 静默警告
        additionalData: `@use "@/styles/global.scss";`, // 添加全局变量, 需要加分号隔断, 不然会报错
      }
    }
  },
  define: {
    webConfig: JSON.stringify(webConfig)
  },
  server: {
    host: true,
    port: 3000,
    proxy: {
      '/api/chat': {
        target: 'http://10.16.20.52:11434',
        changeOrigin: true,
        secure: false, // 如果是http，可以设为false
        configure: (proxy, _options) => {
          proxy.on('proxyReq', (proxyReq, req, _res) => {
            // 移除或修改可能引起问题的headers
            proxyReq.removeHeader('Origin');
            proxyReq.setHeader('referer', 'http://10.16.20.52:11434');
            proxyReq.setHeader('host', '10.16.20.52:11434');

            // from deepseek
            // 你的解决方案有效是因为：
            // 1. removeHeader('Origin') - 绕过CORS检查
            // 2. 设置后端能接受的 referer 和 host

          });
        },
        rewrite: (path) => {
          console.log('代理路径:', path); // 查看实际代理的路径
          return path;
        },
        // rewrite: (path) => path,
      }
    }
  }
})
