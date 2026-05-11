import { useEffect, useState, useCallback, useRef, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  BookOpen,
  ExternalLink,
  Eye,
  Crown,
  GraduationCap,
  Sparkles,
  Play,
  ArrowRight,
  Lock,
  ChevronLeft,
  ChevronRight,
  X,
  AlertCircle,
  Award,
} from 'lucide-react';
import http from '@/api/http';
import { useAuthStore } from '@/store/auth';
import { useConfigStore } from '@/store/config';
import Breadcrumb from '@/components/ui/Breadcrumb';

// ====== 类型定义 ======

interface CareerGuidanceLink {
  id: number;
  title: string;
  description: string;
  external_url: string;
  platform: string;
  cover_url: string;
  category: string;
}

interface ResourceItem {
  id: number;
  title: string;
  slug: string;
  description: string;
  cover_url: string;
  content_type: string;
  is_vip_only: boolean;
  is_free: boolean;
  view_count: number;
  author_name: string;
  author_type: 'admin' | 'mentor' | 'system';
  review_status: 'draft' | 'pending' | 'approved' | 'rejected';
}

interface PaginationInfo {
  page: number;
  pageSize: number;
  total: number;
}

// ====== 平台标识映射 ======

const PLATFORM_LABELS: Record<string, string> = {
  bilibili: 'Bilibili',
  youtube: 'YouTube',
  douyin: 'Douyin',
  zhihu: 'Zhihu',
  wechat: 'WeChat',
};

const PLATFORM_COLORS: Record<string, string> = {
  bilibili: 'bg-pink-500',
  youtube: 'bg-red-600',
  douyin: 'bg-gray-900',
  zhihu: 'bg-blue-600',
  wechat: 'bg-green-500',
};

// ====== 动画变体 ======

const containerVariants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.1 },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0 },
};

// ====== VIP 升级提示弹窗组件 ======

function VipUpgradeModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  if (!open) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.9, opacity: 0 }}
          transition={{ type: 'spring', stiffness: 400, damping: 25 }}
          className="relative w-full max-w-md mx-4 bg-white rounded-2xl shadow-2xl overflow-hidden"
          onClick={(e) => e.stopPropagation()}
        >
          {/* 顶部装饰 */}
          <div className="bg-gradient-to-r from-amber-400 via-amber-500 to-orange-500 px-6 py-8 text-center text-white">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-white/20 rounded-full mb-4 backdrop-blur-sm">
              <Crown className="w-8 h-8" />
            </div>
            <h3 className="text-xl font-bold">VIP 专享内容</h3>
            <p className="mt-1 text-sm opacity-90">升级 VIP 解锁全部优质资源</p>
          </div>

          {/* 内容区 */}
          <div className="px-6 py-6">
            <div className="space-y-3 text-sm text-gray-600">
              <div className="flex items-start gap-3">
                <Sparkles className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
                <span>解锁全部 VIP 专属图文资料与行业报告</span>
              </div>
              <div className="flex items-start gap-3">
                <BookOpen className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
                <span>获取面试题库、行业认知图谱等深度内容</span>
              </div>
              <div className="flex items-start gap-3">
                <Eye className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
                <span>查看岗位内推码、企业真实面经等独家信息</span>
              </div>
            </div>

            <Link
              to="/vip"
              className="mt-6 block w-full text-center bg-gradient-to-r from-amber-500 to-orange-500 text-white font-semibold py-3 rounded-xl hover:from-amber-600 hover:to-orange-600 transition-all duration-300 shadow-lg shadow-amber-200"
            >
              立即升级 VIP
            </Link>

            <button
              onClick={onClose}
              className="mt-3 block w-full text-center text-sm text-gray-400 hover:text-gray-600 transition-colors py-1"
            >
              暂不升级
            </button>
          </div>

          {/* 关闭按钮 */}
          <button
            onClick={onClose}
            className="absolute top-3 right-3 p-1.5 bg-white/20 rounded-full text-white hover:bg-white/30 transition-colors"
            aria-label="关闭"
          >
            <X className="w-4 h-4" />
          </button>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

// ====== 分页组件 ======

function Pagination({
  current,
  total,
  pageSize,
  onChange,
}: {
  current: number;
  total: number;
  pageSize: number;
  onChange: (page: number) => void;
}) {
  const totalPages = Math.ceil(total / pageSize);

  if (totalPages <= 1) return null;

  return (
    <div className="flex items-center justify-center gap-2 mt-8">
      <button
        onClick={() => onChange(current - 1)}
        disabled={current <= 1}
        className="p-2 rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        aria-label="上一页"
      >
        <ChevronLeft className="w-5 h-5" />
      </button>

      {Array.from({ length: totalPages }, (_, i) => i + 1)
        .filter((page) => {
          // 显示前2页、后2页和当前页附近的页码
          return page <= 2 || page >= totalPages - 1 || Math.abs(page - current) <= 1;
        })
        .map((page, idx, arr) => {
          // 省略号
          const prevPage = arr[idx - 1];
          if (prevPage && page - prevPage > 1) {
            return (
              <span key={`ellipsis-${page}`} className="px-2 text-gray-400">
                ...
              </span>
            );
          }
          return (
            <button
              key={page}
              onClick={() => onChange(page)}
              className={`min-w-[36px] h-9 rounded-lg text-sm font-medium transition-colors ${
                page === current
                  ? 'bg-primary-500 text-white shadow-sm'
                  : 'border border-gray-200 text-gray-600 hover:bg-gray-50'
              }`}
            >
              {page}
            </button>
          );
        })}

      <button
        onClick={() => onChange(current + 1)}
        disabled={current >= totalPages}
        className="p-2 rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        aria-label="下一页"
      >
        <ChevronRight className="w-5 h-5" />
      </button>
    </div>
  );
}

// ====== 主页面组件 ======

export default function SkillEnhancement() {
  // 职业指导外链状态
  const [links, setLinks] = useState<CareerGuidanceLink[]>([]);
  // 资源库状态
  const [resources, setResources] = useState<ResourceItem[]>([]);
  const [pagination, setPagination] = useState<PaginationInfo>({
    page: 1,
    pageSize: 9,
    total: 0,
  });
  // 加载状态
  const [linksLoading, setLinksLoading] = useState(true);
  const [resourcesLoading, setResourcesLoading] = useState(true);
  // VIP 升级弹窗
  const [showVipModal, setShowVipModal] = useState(false);

  // 用户认证状态
  const { isAuthenticated, user } = useAuthStore();
  const isVip = user?.role === 'admin' || user?.is_vip === true;

  // 从配置中心读取职业指导链接
  // 使用 useMemo 稳定 fallback 引用，避免每次渲染创建新数组导致 Zustand selector
  // 判定值变化 → 触发重渲染 → 触发 useEffect → 无限循环
  const skillConfigFallback = useMemo<CareerGuidanceLink[]>(() => [], []);
  const skillConfig = useConfigStore((s) => s.getJson<CareerGuidanceLink[]>('skill_enhancement_config', skillConfigFallback));

  // 获取职业指导外链
  // 使用 ref 存储 skillConfig，避免其引用变化时重复触发请求
  const skillConfigRef = useRef(skillConfig);
  skillConfigRef.current = skillConfig;

  // 使用 ref 标记是否已成功获取过数据，防止 API 失败后无限重试
  const linksFetchedRef = useRef(false);

  useEffect(() => {
    // 若已成功获取过数据，不再重复请求
    if (linksFetchedRef.current) return;

    let cancelled = false;

    async function fetchLinks() {
      try {
        setLinksLoading(true);
        const res = await http.get('/career-guidance-links');
        if (cancelled) return;
        const apiLinks = res.data?.data?.list || [];
        // 优先使用 API 数据，若为空则使用配置中心数据
        if (apiLinks.length > 0) {
          setLinks(apiLinks);
          linksFetchedRef.current = true;
        } else if (skillConfigRef.current.length > 0) {
          setLinks(skillConfigRef.current);
          linksFetchedRef.current = true;
        }
      } catch (err) {
        if (cancelled) return;
        console.error('获取职业指导外链失败:', err);
        // API 失败时尝试使用配置中心数据
        if (skillConfigRef.current.length > 0) {
          setLinks(skillConfigRef.current);
          linksFetchedRef.current = true;
        }
      } finally {
        if (!cancelled) {
          setLinksLoading(false);
        }
      }
    }
    fetchLinks();

    return () => { cancelled = true; };
  }, []);

  // 获取资源库列表（支持分页）
  // 使用 ref 保存 pageSize，避免 useCallback 因依赖 pagination 对象而重新创建
  // useCallback 重新创建 → useEffect 重新触发 → setPagination → 重渲染 → 无限循环
  const pageSizeRef = useRef(pagination.pageSize);
  pageSizeRef.current = pagination.pageSize;

  // 使用 ref 标记是否正在请求，防止并发请求和无限重试
  const resourcesFetchingRef = useRef(false);

  const fetchResources = useCallback(async (page: number) => {
    // 防止并发请求
    if (resourcesFetchingRef.current) return;
    resourcesFetchingRef.current = true;

    try {
      setResourcesLoading(true);
      const res = await http.get('/resource-library', {
        params: {
          page,
          pageSize: pageSizeRef.current,
        },
      });
      const data = res.data?.data;
      if (data) {
        setResources(data.items || data.list || []);
        setPagination((prev) => ({
          ...prev,
          page: data.pagination?.page || data.page || page,
          total: data.pagination?.total || data.total || 0,
        }));
      }
    } catch (err) {
      console.error('获取资源列表失败:', err);
    } finally {
      setResourcesLoading(false);
      resourcesFetchingRef.current = false;
    }
  }, []);

  useEffect(() => {
    fetchResources(1);
  }, [fetchResources]);

  // 处理资源卡片点击（VIP 权限控制）
  const handleResourceClick = (e: React.MouseEvent, item: ResourceItem) => {
    if (item.is_vip_only && !isVip) {
      e.preventDefault();
      setShowVipModal(true);
    }
  };

  // 处理分页切换
  const handlePageChange = (page: number) => {
    fetchResources(page);
    // 滚动到资源库区域
    document.getElementById('resource-library')?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* 面包屑导航 */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <Breadcrumb items={[{ label: '首页', path: '/' }, { label: '能力提升' }]} />
      </div>

      {/* ====== 顶部标题区 ====== */}
      <section className="relative bg-gradient-to-br from-primary-600 via-primary-500 to-teal-400 text-white overflow-hidden">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-10 left-10 w-72 h-72 bg-white rounded-full blur-3xl" />
          <div className="absolute bottom-10 right-10 w-96 h-96 bg-white rounded-full blur-3xl" />
        </div>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 relative z-10">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="text-center"
          >
            <div className="flex items-center justify-center gap-3 mb-4">
              <Sparkles className="w-8 h-8" />
              <span className="text-sm font-medium tracking-wider uppercase opacity-80">
                能力提升
              </span>
            </div>
            <h1 className="text-4xl md:text-5xl font-bold mb-4">
              提升自我，赢在职场
            </h1>
            <p className="text-lg md:text-xl opacity-90 max-w-2xl mx-auto">
              汇聚优质职业指导视频与图文资源，助你在求职路上不断精进，成为更具竞争力的职场人
            </p>
          </motion.div>
        </div>
      </section>

      {/* ====== 职业指导区域（外部链接卡片） ====== */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
        >
          <div className="flex items-center gap-3 mb-8">
            <div className="p-2 bg-primary-100 rounded-lg">
              <Play className="w-6 h-6 text-primary-600" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900">职业指导</h2>
            <span className="text-sm text-gray-400 ml-1">精选外部视频资源</span>
          </div>
        </motion.div>

        {linksLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3].map((i) => (
              <div key={i} className="bg-white rounded-xl shadow-sm p-4 animate-pulse">
                <div className="aspect-video bg-gray-200 rounded-lg mb-4" />
                <div className="h-4 bg-gray-200 rounded w-3/4 mb-2" />
                <div className="h-3 bg-gray-200 rounded w-1/2" />
              </div>
            ))}
          </div>
        ) : links.length === 0 ? (
          <div className="text-center py-12 text-gray-400">
            <Play className="w-12 h-12 mx-auto mb-3 opacity-50" />
            <p>暂无职业指导链接</p>
            <p className="text-sm mt-1">管理员可在后台配置外链资源</p>
          </div>
        ) : (
          <motion.div
            variants={containerVariants}
            initial="hidden"
            whileInView="show"
            viewport={{ once: true }}
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
          >
            {links.map((link) => (
              <motion.a
                key={link.id}
                variants={itemVariants}
                href={link.external_url}
                target="_blank"
                rel="noopener noreferrer"
                className="group bg-white rounded-xl shadow-sm hover:shadow-lg transition-all duration-300 overflow-hidden border border-gray-100"
                whileHover={{ y: -4 }}
              >
                {/* 封面区域 */}
                <div className="aspect-video bg-gray-100 overflow-hidden relative">
                  {link.cover_url ? (
                    <img
                      src={link.cover_url}
                      alt={link.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      loading="lazy"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-primary-50 to-primary-100">
                      <Play className="w-12 h-12 text-primary-400" />
                    </div>
                  )}
                  {/* 平台标识 */}
                  <div className="absolute top-3 left-3">
                    <span
                      className={`inline-flex items-center gap-1 px-2.5 py-1 ${
                        PLATFORM_COLORS[link.platform] || 'bg-gray-700'
                      } text-white text-xs font-medium rounded-md backdrop-blur-sm`}
                    >
                      <ExternalLink className="w-3 h-3" />
                      {PLATFORM_LABELS[link.platform] || link.platform}
                    </span>
                  </div>
                  {/* 播放按钮悬浮 */}
                  <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300 bg-black/20">
                    <div className="w-14 h-14 bg-white/90 rounded-full flex items-center justify-center shadow-lg">
                      <Play className="w-6 h-6 text-primary-600 ml-0.5" />
                    </div>
                  </div>
                </div>
                {/* 信息区域 */}
                <div className="p-4">
                  <h3 className="font-semibold text-gray-900 group-hover:text-primary-600 transition-colors line-clamp-2 mb-2">
                    {link.title}
                  </h3>
                  {link.description && (
                    <p className="text-sm text-gray-500 line-clamp-2">
                      {link.description}
                    </p>
                  )}
                  {/* 外部链接按钮 */}
                  <div className="mt-3 flex items-center text-xs text-primary-500 font-medium">
                    <span>前往观看</span>
                    <ArrowRight className="w-3.5 h-3.5 ml-1 group-hover:translate-x-1 transition-transform" />
                  </div>
                </div>
              </motion.a>
            ))}
          </motion.div>
        )}
      </section>

      {/* ====== 资源库区域（图文资源，支持分页） ====== */}
      <section id="resource-library" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-16">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
        >
          <div className="flex items-center gap-3 mb-8">
            <div className="p-2 bg-primary-100 rounded-lg">
              <BookOpen className="w-6 h-6 text-primary-600" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900">图文资源库</h2>
            <span className="text-sm text-gray-400 ml-1">
              共 {pagination.total} 份资源
            </span>
          </div>
        </motion.div>

        {resourcesLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i} className="bg-white rounded-xl shadow-sm overflow-hidden animate-pulse">
                <div className="aspect-[16/10] bg-gray-200" />
                <div className="p-4">
                  <div className="h-4 bg-gray-200 rounded w-3/4 mb-2" />
                  <div className="h-3 bg-gray-200 rounded w-full mb-1" />
                  <div className="h-3 bg-gray-200 rounded w-2/3" />
                </div>
              </div>
            ))}
          </div>
        ) : resources.length === 0 ? (
          <div className="text-center py-12 text-gray-400">
            <BookOpen className="w-12 h-12 mx-auto mb-3 opacity-50" />
            <p>暂无图文资源</p>
          </div>
        ) : (
          <>
            <motion.div
              variants={containerVariants}
              initial="hidden"
              whileInView="show"
              viewport={{ once: true }}
              className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
            >
              {resources.map((item) => (
                <motion.div
                  key={item.id}
                  variants={itemVariants}
                  whileHover={{ y: -4 }}
                >
                  <Link
                    to={`/skill-enhancement/resource/${item.slug}`}
                    onClick={(e) => handleResourceClick(e, item)}
                    className="block bg-white rounded-xl shadow-sm hover:shadow-lg transition-all duration-300 overflow-hidden border border-gray-100 relative"
                  >
                    {/* VIP 锁定遮罩 */}
                    {item.is_vip_only && !isVip && (
                      <div className="absolute inset-0 z-10 bg-white/60 backdrop-blur-[2px] rounded-xl flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity duration-300 cursor-pointer">
                        <div className="flex flex-col items-center gap-2 text-amber-600">
                          <Lock className="w-8 h-8" />
                          <span className="text-sm font-medium">VIP 专享</span>
                          <span className="text-xs text-amber-500">点击升级</span>
                        </div>
                      </div>
                    )}

                    {/* 封面图 */}
                    <div className="aspect-[16/10] bg-gray-100 overflow-hidden relative">
                      {item.cover_url ? (
                        <img
                          src={item.cover_url}
                          alt={item.title}
                          className="w-full h-full object-cover hover:scale-105 transition-transform duration-300"
                          loading="lazy"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-primary-50 to-teal-50">
                          <BookOpen className="w-10 h-10 text-primary-300" />
                        </div>
                      )}
                      {/* VIP/免费标识 */}
                      <div className="absolute top-3 left-3 flex gap-2">
                        {item.is_vip_only ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-amber-500 text-white text-xs font-medium rounded-md shadow-sm">
                            <Crown className="w-3 h-3" />
                            VIP
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2.5 py-1 bg-green-500 text-white text-xs font-medium rounded-md shadow-sm">
                            免费
                          </span>
                        )}
                      </div>
                    </div>

                    {/* 信息区域 */}
                    <div className="p-4">
                      <h3 className="font-semibold text-gray-900 hover:text-primary-600 transition-colors line-clamp-2 mb-2">
                        {item.is_vip_only && !isVip && (
                          <Lock className="w-3.5 h-3.5 inline mr-1 text-amber-500" />
                        )}
                        {item.title}
                      </h3>
                      {item.description && (
                        <p className="text-sm text-gray-500 line-clamp-2 mb-3">
                          {item.description}
                        </p>
                      )}
                      <div className="flex items-center justify-between text-xs text-gray-400">
                        <span className="flex items-center gap-1">
                          <Eye className="w-3.5 h-3.5" />
                          {item.view_count} 次浏览
                        </span>
                        {item.author_name && (
                          <span>{item.author_name}</span>
                        )}
                      </div>
                    </div>
                  </Link>
                </motion.div>
              ))}
            </motion.div>

            {/* 分页 */}
            <Pagination
              current={pagination.page}
              total={pagination.total}
              pageSize={pagination.pageSize}
              onChange={handlePageChange}
            />
          </>
        )}
      </section>

      {/* ====== 成功案例统一入口 ====== */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-16">
        <Link
          to="/success-cases"
          className="block bg-gradient-to-r from-primary-50 to-teal-50 rounded-2xl border border-primary-100 p-8 text-center hover:shadow-lg hover:border-primary-200 transition-all duration-300 group"
        >
          <div className="inline-flex items-center justify-center w-16 h-16 bg-primary-100 rounded-2xl mb-4 group-hover:scale-110 transition-transform">
            <Award className="w-8 h-8 text-primary-600" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">成功案例</h2>
          <p className="text-gray-500 max-w-lg mx-auto">
            看看其他同学如何通过平台资源实现职业目标
          </p>
          <span className="inline-flex items-center gap-1 mt-4 text-primary-600 font-medium text-sm group-hover:gap-2 transition-all">
            浏览全部案例
            <ArrowRight className="w-4 h-4" />
          </span>
        </Link>
      </section>

      {/* ====== VIP 升级提示弹窗 ====== */}
      <VipUpgradeModal open={showVipModal} onClose={() => setShowVipModal(false)} />
    </div>
  );
}
