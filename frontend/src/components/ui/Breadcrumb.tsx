import { Link } from 'react-router-dom';
import { ChevronRight, Home } from 'lucide-react';

/**
 * 面包屑导航组件
 *
 * 用于各板块页面顶部，显示当前位置层级关系。
 * 统一各板块的导航模式，确保用户始终知道自己在哪个板块。
 *
 * @param items - 面包屑路径项，最后一项为当前页面（不可点击）
 *
 * @example
 * <Breadcrumb items={[
 *   { label: '首页', path: '/' },
 *   { label: '能力提升' },
 * ]} />
 */
interface BreadcrumbItem {
  label: string;
  path?: string; // 最后一项不需要 path
}

export default function Breadcrumb({ items }: { items: BreadcrumbItem[] }) {
  return (
    <nav aria-label="面包屑导航" className="flex items-center gap-1.5 text-sm text-gray-500 py-3">
      <Link
        to="/"
        className="flex items-center gap-1 text-gray-400 hover:text-primary-500 transition-colors"
        aria-label="返回首页"
      >
        <Home className="w-3.5 h-3.5" />
      </Link>
      {items.map((item, idx) => {
        const isLast = idx === items.length - 1;
        return (
          <span key={idx} className="flex items-center gap-1.5">
            <ChevronRight className="w-3.5 h-3.5 text-gray-300" />
            {isLast || !item.path ? (
              <span className="text-primary-600 font-medium" aria-current="page">
                {item.label}
              </span>
            ) : (
              <Link
                to={item.path}
                className="text-gray-400 hover:text-primary-500 transition-colors"
              >
                {item.label}
              </Link>
            )}
          </span>
        );
      })}
    </nav>
  );
}
