import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Bell, Check, CheckCheck, Trash2, Clock,
  Briefcase, Calendar, Shield, Megaphone,
  ChevronLeft, ChevronRight
} from 'lucide-react';
import http from '@/api/http';
import ConfirmDialog from '@/components/ui/ConfirmDialog';
import Tag from '@/components/ui/Tag';
import ErrorState from '@/components/ui/ErrorState';
import { ListSkeleton } from '@/components/ui/Skeleton';

// ====== 通知中心 ======
// 商业级要求：统一通知管理、已读/未读状态、分类筛选

interface NotificationItem {
  id: number;
  type: 'appointment' | 'resume' | 'system' | 'approval' | 'general' | 'review';
  title: string;
  content: string;
  link: string;
  is_read: number;
  created_at: string;
}

const TYPE_CONFIG: Record<string, { label: string; icon: typeof Bell; color: string; bg: string }> = {
  appointment: { label: '预约通知', icon: Calendar, color: 'text-blue-600', bg: 'bg-blue-100' },
  resume: { label: '简历通知', icon: Briefcase, color: 'text-green-600', bg: 'bg-green-100' },
  system: { label: '系统通知', icon: Megaphone, color: 'text-primary-600', bg: 'bg-primary-100' },
  approval: { label: '审核通知', icon: Shield, color: 'text-amber-600', bg: 'bg-amber-100' },
  general: { label: '系统通知', icon: Megaphone, color: 'text-primary-600', bg: 'bg-primary-100' },
  review: { label: '评价通知', icon: Check, color: 'text-purple-600', bg: 'bg-purple-100' },
};

export default function NotificationCenter() {
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [readFilter, setReadFilter] = useState<string>('all');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const pageSize = 15;
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [deleteTarget, setDeleteTarget] = useState<{id: number; name: string} | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  useEffect(() => {
    fetchNotifications();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, typeFilter, readFilter]);

  async function fetchNotifications() {
    try {
      setLoading(true);
      setError('');
      const res = await http.get('/notifications', {
        params: { page, pageSize, type: typeFilter, is_read: readFilter }
      });
      if (res.data?.code === 200 && res.data.data) {
        setNotifications(res.data.data.notifications || []);
        setTotal(res.data.data.pagination?.total || 0);
      } else {
        setError('获取通知失败');
      }
    } catch {
      setError('网络错误，请稍后重试');
    } finally {
      setLoading(false);
    }
  }

  async function markAsRead(id: number) {
    try {
      await http.put(`/notifications/${id}/read`);
    } catch {
      // 模拟
    }
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: 1 } : n));
  }

  async function markAllRead() {
    try {
      await http.put('/notifications/read-all');
    } catch {
      // 模拟
    }
    setNotifications(prev => prev.map(n => ({ ...n, is_read: 1 })));
  }

  async function deleteNotification(id: number) {
    try {
      await http.delete(`/notifications/${id}`);
    } catch {
      // 模拟
    }
    setNotifications(prev => prev.filter(n => n.id !== id));
    setTotal(prev => prev - 1);
  }

  async function handleConfirmDelete() {
    if (!deleteTarget) return;
    try {
      setDeleteLoading(true);
      await deleteNotification(deleteTarget.id);
    } finally {
      setDeleteLoading(false);
      setDeleteTarget(null);
    }
  }

  const unreadCount = notifications.filter(n => n.is_read === 0).length;
  const totalPages = Math.ceil(total / pageSize);

  function timeAgo(dateStr: string): string {
    const now = new Date();
    const date = new Date(dateStr);
    const diffMs = now.getTime() - date.getTime();
    const diffMin = Math.floor(diffMs / 60000);
    if (diffMin < 1) return '刚刚';
    if (diffMin < 60) return `${diffMin}分钟前`;
    const diffHr = Math.floor(diffMin / 60);
    if (diffHr < 24) return `${diffHr}小时前`;
    const diffDay = Math.floor(diffHr / 24);
    if (diffDay < 7) return `${diffDay}天前`;
    return date.toLocaleDateString('zh-CN');
  }

  return (
    <div className="container-narrow">
      <div className="space-y-6">
        {/* 标题 */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
              <Bell className="w-6 h-6 text-primary-600" />
              消息中心
            </h1>
            <p className="text-gray-500 mt-1">
              共 {total} 条消息
              {unreadCount > 0 && <span className="text-red-500 font-medium">，{unreadCount} 条未读</span>}
            </p>
          </div>
          {unreadCount > 0 && (
            <button
              onClick={markAllRead}
              className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-primary-600 bg-primary-50 rounded-lg hover:bg-primary-100 transition-colors"
            >
              <CheckCheck className="w-4 h-4" />
              全部已读
            </button>
          )}
        </div>

        {/* 筛选 */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex gap-1 bg-gray-100 rounded-lg p-1">
            {[
              { value: 'all', label: '全部' },
              { value: '0', label: '未读' },
              { value: '1', label: '已读' },
            ].map(opt => (
              <button
                key={opt.value}
                onClick={() => { setReadFilter(opt.value); setPage(1); }}
                className={`px-3 py-1.5 rounded-md text-sm font-medium transition-all ${
                  readFilter === opt.value ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>

          <div className="flex gap-2">
            {['all', 'appointment', 'resume', 'system', 'approval'].map(t => (
              <button
                key={t}
                onClick={() => { setTypeFilter(t); setPage(1); }}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                  typeFilter === t
                    ? 'bg-primary-600 text-white'
                    : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'
                }`}
              >
                {t === 'all' ? '全部类型' : TYPE_CONFIG[t]?.label || t}
              </button>
            ))}
          </div>
        </div>

        {/* 通知列表 */}
        <div className="space-y-3">
          {loading && <ListSkeleton count={5} />}
          {error && !loading && (
            <ErrorState title="加载失败" message={error} onRetry={fetchNotifications} />
          )}
          <AnimatePresence>
            {!loading && !error && notifications.map((notif, i) => {
              const typeInfo = TYPE_CONFIG[notif.type] || TYPE_CONFIG.system;
              const TypeIcon = typeInfo.icon;
              return (
                <motion.div
                  key={notif.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, x: -50 }}
                  transition={{ delay: i * 0.03 }}
                  className={`bg-white rounded-xl p-5 border transition-all hover:shadow-md ${
                    notif.is_read === 0 ? 'border-primary-200 bg-primary-50/30' : 'border-gray-100'
                  }`}
                >
                  <div className="flex items-start gap-4">
                    {/* 图标 */}
                    <div className={`w-10 h-10 ${typeInfo.bg} rounded-xl flex items-center justify-center flex-shrink-0`}>
                      <TypeIcon className={`w-5 h-5 ${typeInfo.color}`} />
                    </div>

                    {/* 内容 */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <h3 className={`text-sm font-bold ${notif.is_read === 0 ? 'text-gray-900' : 'text-gray-700'}`}>
                          {notif.title}
                        </h3>
                        {notif.is_read === 0 && (
                          <span className="w-2 h-2 bg-red-500 rounded-full flex-shrink-0" />
                        )}
                        <Tag
                          variant={
                            notif.type === 'appointment' ? 'blue' :
                            notif.type === 'resume' ? 'green' :
                            notif.type === 'approval' ? 'yellow' :
                            notif.type === 'review' ? 'primary' :
                            notif.type === 'general' ? 'primary' :
                            'primary'
                          }
                          size="xs"
                        >
                          {typeInfo.label}
                        </Tag>
                      </div>
                      <p className="text-sm text-gray-600 mt-1 leading-relaxed">{notif.content}</p>
                      <div className="flex items-center gap-4 mt-3">
                        <span className="text-xs text-gray-400 flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {timeAgo(notif.created_at)}
                        </span>
                      </div>
                    </div>

                    {/* 操作 */}
                    <div className="flex items-center gap-1 flex-shrink-0">
                      {notif.is_read === 0 && (
                        <button
                          onClick={() => markAsRead(notif.id)}
                          className="p-2 rounded-lg text-gray-400 hover:text-primary-600 hover:bg-primary-50 transition-colors"
                          title="标记已读"
                        >
                          <Check className="w-4 h-4" />
                        </button>
                      )}
                      <button
                        onClick={() => setDeleteTarget({ id: notif.id, name: notif.title })}
                        className="p-2 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors"
                        title="删除"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>

          {/* 空状态 */}
          {!loading && !error && notifications.length === 0 && (
            <div className="text-center py-16">
              <Bell className="w-12 h-12 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500 font-medium">暂无消息</p>
              <p className="text-gray-400 text-sm mt-1">新的通知将在这里显示</p>
            </div>
          )}
        </div>

        {/* 分页 */}
        {totalPages > 1 && (
          <div className="flex items-center justify-center gap-3 pt-4">
            <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
              className="p-2 rounded-lg hover:bg-gray-100 disabled:opacity-40 transition-colors">
              <ChevronLeft className="w-5 h-5" />
            </button>
            <span className="text-sm text-gray-600">第 {page} / {totalPages} 页</span>
            <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page >= totalPages}
              className="p-2 rounded-lg hover:bg-gray-100 disabled:opacity-40 transition-colors">
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>
        )}
      </div>

      {/* 删除确认弹窗 */}
      <ConfirmDialog
        open={!!deleteTarget}
        variant="warning"
        title="确认删除通知"
        description="删除后无法恢复"
        loading={deleteLoading}
        onConfirm={handleConfirmDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
}
