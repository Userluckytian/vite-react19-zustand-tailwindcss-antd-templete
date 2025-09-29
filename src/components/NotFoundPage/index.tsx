
import { motion } from 'motion/react';
import { useNavigate } from 'react-router';

export default function NotFoundPage() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="bg-white rounded-2xl shadow-xl overflow-hidden max-w-md w-full"
      >
        <div className="p-8 text-center">
          <div className="relative h-40">
            <motion.div
              animate={{
                x: [-20, 20, -20],
                rotate: [-5, 5, -5],
              }}
              transition={{
                repeat: Infinity,
                duration: 3,
                ease: "easeInOut",
              }}
              className="absolute inset-0 flex items-center justify-center"
            >
              <svg
                className="w-32 h-32 text-indigo-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
            </motion.div>
          </div>

          <h1 className="text-5xl font-bold text-gray-800 mt-6">404</h1>
          <h2 className="text-2xl font-semibold text-gray-700 mt-4">
            页面未找到
          </h2>
          <p className="text-gray-500 mt-2">
            您访问的页面不存在或已被移除
          </p>

          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => navigate('/layout')}
            className="mt-8 px-6 py-3 bg-indigo-600 text-white rounded-lg font-medium shadow-md hover:bg-indigo-700 transition-colors"
          >
            返回首页
          </motion.button>
        </div>

        <div className="bg-gray-50 px-8 py-4 text-center">
          <p className="text-sm text-gray-500">
            需要帮助？{' '}
            <a href="/contact" className="text-indigo-600 hover:underline">
              联系我们
            </a>
          </p>
        </div>
      </motion.div>
    </div>
  );
}