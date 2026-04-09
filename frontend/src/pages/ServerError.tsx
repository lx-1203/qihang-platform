import { motion } from 'framer-motion';
import { ServerCrash, RefreshCcw, Home } from 'lucide-react';

/**
 * 500 服务器错误页面
 */
export default function ServerError() {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-lg w-full text-center"
      >
        {/* 大号 500 */}
        <div className="relative mb-8">
          <h1 className="text-[120px] sm:text-[160px] font-black text-gray-100 leading-none select-none">
            500
          </h1>
          <div className="absolute inset-0 flex items-center justify-center">
            <ServerCrash className="w-16 h-16 text-red-300" />
          </div>
        </div>

        <h2 className="text-2xl font-bold text-gray-900 mb-3">服务器开小差了</h2>
        <p className="text-gray-500 mb-8 max-w-sm mx-auto">
          抱歉，服务器遇到了内部错误。我们的技术团队正在紧急处理，请稍后再试。
        </p>

        <div className="flex gap-4 justify-center">
          <button
            onClick={() => window.location.reload()}
            className="flex items-center gap-2 px-5 py-2.5 bg-primary-600 text-white rounded-lg font-medium hover:bg-primary-700 transition-colors"
          >
            <RefreshCcw size={16} />
            刷新页面
          </button>
          <a
            href="/"
            className="flex items-center gap-2 px-5 py-2.5 bg-gray-100 text-gray-700 rounded-lg font-medium hover:bg-gray-200 transition-colors"
          >
            <Home size={16} />
            回到首页
          </a>
        </div>
      </motion.div>
    </div>
  );
}
