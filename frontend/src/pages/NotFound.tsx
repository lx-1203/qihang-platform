import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Search, Home, ArrowLeft } from 'lucide-react';

/**
 * 404 页面 - 路由未匹配时显示
 */
export default function NotFound() {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-lg w-full text-center"
      >
        {/* 大号 404 */}
        <div className="relative mb-8">
          <h1 className="text-[120px] sm:text-[160px] font-black text-gray-100 leading-none select-none">
            404
          </h1>
          <div className="absolute inset-0 flex items-center justify-center">
            <Search className="w-16 h-16 text-primary-300" />
          </div>
        </div>

        <h2 className="text-2xl font-bold text-gray-900 mb-3">页面未找到</h2>
        <p className="text-gray-500 mb-8 max-w-sm mx-auto">
          抱歉，你访问的页面不存在或已被移除。请检查网址是否正确，或返回首页继续浏览。
        </p>

        <div className="flex gap-4 justify-center">
          <button
            onClick={() => window.history.back()}
            className="flex items-center gap-2 px-5 py-2.5 bg-gray-100 text-gray-700 rounded-lg font-medium hover:bg-gray-200 transition-colors"
          >
            <ArrowLeft size={16} />
            返回上页
          </button>
          <Link
            to="/"
            className="flex items-center gap-2 px-5 py-2.5 bg-primary-600 text-white rounded-lg font-medium hover:bg-primary-700 transition-colors"
          >
            <Home size={16} />
            回到首页
          </Link>
        </div>
      </motion.div>
    </div>
  );
}
