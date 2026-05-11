import { useEffect, useState } from 'react';
import { ArrowLeft, CalendarDays, FileText, Lock, Crown, ExternalLink } from 'lucide-react';
import { Link, useParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import http from '@/api/http';
import { useAuthStore } from '@/store/auth';

// ====== 类型定义 ======

interface ResourceDetail {
  id: number;
  title: string;
  description: string;
  content: string[] | null;
  is_free: boolean;
  is_vip_only: boolean;
  slug: string;
  view_count: number;
  created_at: string;
  content_type: string;
  external_url: string | null;
  cover_url: string | null;
  author_name: string;
  author_type: 'admin' | 'mentor' | 'system';
  review_status: 'draft' | 'pending' | 'approved' | 'rejected';
}

// ====== VIP 升级提示弹窗 ======

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
          <div className="bg-gradient-to-r from-amber-400 via-amber-500 to-orange-500 px-6 py-8 text-center text-white">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-white/20 rounded-full mb-4 backdrop-blur-sm">
              <Crown className="w-8 h-8" />
            </div>
            <h3 className="text-xl font-bold">VIP 专享内容</h3>
            <p className="mt-1 text-sm opacity-90">升级 VIP 解锁全部优质资源</p>
          </div>
          <div className="px-6 py-6">
            <p className="text-sm text-gray-600 text-center">
              该资料为 VIP 专享内容，升级 VIP 后即可查看完整内容。
            </p>
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
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

// ====== 主页面组件 ======

export default function SkillEnhancementResourceDetail() {
  const { slug } = useParams<{ slug: string }>();
  const [resource, setResource] = useState<ResourceDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [showVipModal, setShowVipModal] = useState(false);

  // 用户认证状态
  const { user } = useAuthStore();
  const isVip = user?.role === 'admin' || user?.is_vip === true;

  useEffect(() => {
    if (!slug) return;
    setLoading(true);
    http.get(`/resource-library/${slug}`)
      .then((res) => {
        const data = res.data?.data;
        if (data) {
          // VIP 内容权限检查
          if (data.is_vip_only && !isVip) {
            setShowVipModal(true);
            setResource(data);
          } else {
            setResource(data);
          }
        } else {
          setNotFound(true);
        }
      })
      .catch(() => setNotFound(true))
      .finally(() => setLoading(false));
  }, [slug, isVip]);

  if (loading) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-10">
        <div className="animate-pulse rounded-3xl border border-neutral-200 bg-white p-8 shadow-sm">
          <div className="h-4 w-32 rounded bg-neutral-200" />
          <div className="mt-4 h-8 w-2/3 rounded bg-neutral-200" />
          <div className="mt-4 h-4 w-full rounded bg-neutral-100" />
          <div className="mt-2 h-4 w-3/4 rounded bg-neutral-100" />
        </div>
      </div>
    );
  }

  if (notFound || !resource) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-10">
        <div className="rounded-3xl border border-neutral-200 bg-white p-8 shadow-sm">
          <h1 className="text-2xl font-semibold text-neutral-900">资料暂不可用</h1>
          <p className="mt-3 text-sm leading-6 text-neutral-500">
            未找到匹配的资源内容，请确认链接是否正确。
          </p>
          <Link
            to="/skill-enhancement"
            className="mt-6 inline-flex items-center gap-2 text-sm font-medium text-neutral-900 transition hover:text-neutral-600"
          >
            <ArrowLeft className="h-4 w-4" />
            返回能力提升
          </Link>
        </div>
      </div>
    );
  }

  // VIP 专享内容但用户非 VIP
  if (resource.is_vip_only && !isVip) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-10">
        <div className="rounded-3xl border border-amber-200 bg-amber-50 p-8 shadow-sm">
          <div className="flex items-center gap-2 text-lg font-semibold text-amber-900">
            <Lock className="h-5 w-5" />
            VIP 专享资料
          </div>
          <p className="mt-3 text-sm leading-6 text-amber-800">
            该资料为 VIP 专享内容，请开通 VIP 后查看。
          </p>
          <Link
            to="/skill-enhancement"
            className="mt-6 inline-flex items-center gap-2 text-sm font-medium text-amber-900 transition hover:text-amber-700"
          >
            <ArrowLeft className="h-4 w-4" />
            返回能力提升
          </Link>
        </div>

        {/* VIP 升级弹窗 */}
        <VipUpgradeModal open={showVipModal} onClose={() => setShowVipModal(false)} />
      </div>
    );
  }

  // 内容类型标签映射
  const contentTypeLabels: Record<string, string> = {
    article: '图文资料',
    video_link: '视频链接',
    document: '文档资料',
  };

  return (
    <div className="mx-auto max-w-4xl px-4 py-10">
      <div className="rounded-3xl border border-neutral-200 bg-white p-8 shadow-sm">
        {/* 面包屑导航 */}
        <div className="mb-4">
          <Link
            to="/skill-enhancement"
            className="inline-flex items-center gap-1.5 text-sm text-neutral-500 hover:text-neutral-700 transition-colors"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            能力提升
          </Link>
        </div>

        {/* 标签区 */}
        <div className="flex flex-wrap items-center gap-3 text-xs text-neutral-500">
          <span className="rounded-full bg-primary-50 px-3 py-1 font-medium text-primary-700">
            {contentTypeLabels[resource.content_type] || '图文资料'}
          </span>
          {resource.is_vip_only ? (
            <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-3 py-1 font-medium text-amber-700">
              <Crown className="w-3 h-3" />
              VIP 专享
            </span>
          ) : (
            <span className="rounded-full bg-green-50 px-3 py-1 font-medium text-green-700">免费开放</span>
          )}
          <span className="inline-flex items-center gap-1">
            <CalendarDays className="h-3.5 w-3.5" />
            {resource.created_at?.slice(0, 10)}
          </span>
        </div>

        {/* 标题 */}
        <h1 className="mt-4 text-3xl font-semibold text-neutral-900">{resource.title}</h1>

        {/* 描述 */}
        <p className="mt-4 text-sm leading-7 text-neutral-500">{resource.description}</p>

        {/* 外部链接（video_link 类型） */}
        {resource.content_type === 'video_link' && resource.external_url && (
          <div className="mt-6 rounded-xl bg-primary-50 p-4">
            <a
              href={resource.external_url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 text-sm font-medium text-primary-700 hover:text-primary-800 transition-colors"
            >
              <ExternalLink className="w-4 h-4" />
              前往观看视频
            </a>
          </div>
        )}

        {/* 图文内容 */}
        {resource.content && resource.content.length > 0 && (
          <div className="mt-8 rounded-2xl bg-neutral-50 p-6">
            <div className="flex items-center gap-2 text-sm font-medium text-neutral-900">
              <FileText className="h-4 w-4" />
              图文内容
            </div>
            <div className="mt-4 space-y-4 text-sm leading-7 text-neutral-600">
              {resource.content.map((paragraph, idx) => (
                <p key={idx}>{paragraph}</p>
              ))}
            </div>
          </div>
        )}

        {/* 浏览量 */}
        <div className="mt-4 text-xs text-neutral-400">
          浏览 {resource.view_count} 次
        </div>

        {/* 返回链接 */}
        <Link
          to="/skill-enhancement"
          className="mt-8 inline-flex items-center gap-2 text-sm font-medium text-neutral-900 transition hover:text-neutral-600"
        >
          <ArrowLeft className="h-4 w-4" />
          返回能力提升
        </Link>
      </div>
    </div>
  );
}
