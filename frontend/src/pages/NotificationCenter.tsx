import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Bell, Check, CheckCheck, Trash2, Clock,
  Briefcase, Calendar, Shield, Megaphone,
  ChevronLeft, ChevronRight, Filter
} from 'lucide-react';
import http from '@/api/http';
import ConfirmDialog from '@/components/ui/ConfirmDialog';

// ====== 通知中心 ======
// 商业级要求：统一通知管理、已读/未读状态、分类筛选

interface NotificationItem {
  id: number;
  type: 'appointment' | 'resume' | 'system' | 'verify';
  title: string;
  content: string;
  related_id: number | null;
  is_read: number;
  created_at: string;
}

const TYPE_CONFIG: Record<string, { label: string; icon: typeof Bell; color: string; bg: string }> = {
  appointment: { label: '预约通知', icon: Calendar, color: 'text-blue-600', bg: 'bg-blue-100' },
  resume: { label: '简历通知', icon: Briefcase, color: 'text-green-600', bg: 'bg-green-100' },
  system: { label: '系统通知', icon: Megaphone, color: 'text-purple-600', bg: 'bg-purple-100' },
  verify: { label: '审核通知', icon: Shield, color: 'text-amber-600', bg: 'bg-amber-100' },
};

export default function NotificationCenter() {
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [readFilter, setReadFilter] = useState<string>('all');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const pageSize = 15;
  const [deleteTarget, setDeleteTarget] = useState<{id: number; name: string} | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  const mockNotifications: NotificationItem[] = [
    { id: 1, type: 'resume', title: '简历投递成功', content: '您已成功投递「前端开发工程师」职位（字节跳动），请等待企业查看。', related_id: 1, is_read: 0, created_at: '2026-04-08 09:30:00' },
    { id: 2, type: 'appointment', title: '预约确认', content: '陈经理已确认您的辅导预约，时间：2026年4月12日 14:00-15:00，请准时参加。', related_id: 1, is_read: 0, created_at: '2026-04-08 08:15:00' },
    { id: 3, type: 'system', title: '平台升级公告', content: '启航平台将于2026年4月10日凌晨2:00-4:00进行系统维护升级，届时部分功能可能暂时不可用，感谢您的理解。', related_id: null, is_read: 0, created_at: '2026-04-07 18:00:00' },
    { id: 4, type: 'verify', title: '企业认证已通过', content: '恭喜！您的企业「创新科技有限公司」认证已通过审核，现在可以发布职位了。', related_id: 4, is_read: 1, created_at: '2026-04-07 14:30:00' },
    { id: 5, type: 'resume', title: '简历被查看', content: '腾讯HR已查看了您投递的「产品经理实习生」简历，请保持手机畅通。', related_id: 2, is_read: 1, created_at: '2026-04-07 11:20:00' },
    { id: 6, type: 'appointment', title: '辅导即将开始', content: '您与张工的辅导将在30分钟后开始，主题：前端技术面试准备。', related_id: 2, is_read: 1, created_at: '2026-04-06 13:30:00' },
    { id: 7, type: 'system', title: '新功能上线', content: '留学申请板块已上线！覆盖全球Top100院校，提供选校评估、背景提升、文书修改等一站式服务。', related_id: null, is_read: 1, created_at: '2026-04-05 10:00:00' },
    { id: 8, type: 'resume', title: '面试邀请', content: '百度邀请您参加「AIGC算法研究员」岗位的面试，时间：2026年4月15日 10:00，地点：北京海淀区百度大厦。', related_id: 3, is_read: 0, created_at: '2026-04-04 16:45:00' },
    { id: 9, type: 'appointment', title: '辅导评价提醒', content: '您与王总监的辅导已完成，请对本次辅导进行评价，帮助导师改进服务质量。', related_id: 3, is_read: 1, created_at: '2026-04-03 20:00:00' },
    { id: 10, type: 'verify', title: '导师认证已驳回', content: '您的导师认证申请已被驳回，原因：无法验证工作经历真实性。请补充材料后重新提交。', related_id: 5, is_read: 1, created_at: '2026-04-02 09:00:00' },
  ];

  useEffect(() => {
    fetchNotifications();
  }, [page, typeFilter, readFilter]);

  async function fetchNotifications() {
    try {
      setLoading(true);
      const res = await http.get('/notifications', {
        params: { page, pageSize, type: typeFilter, is_read: readFilter }
      });
      if (res.data?.code === 200 && res.data.data) {
        setNotifications(res.data.data.list);
        setTotal(res.data.data.total);
      } else {
        applyMock();
      }
    } catch {
      applyMock();
    } finally {
      setLoading(false);
    }
  }

  function applyMock() {
    let filtered = [...mockNotifications];
    if (typeFilter !== 'all') filtered = filtered.filter(n => n.type === typeFilter);
    if (readFilter !== 'all') filtered = filtered.filter(n => n.is_read === Number(readFilter));
    setNotifications(filtered);
    setTotal(filtered.length);
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
    <div className="max-w-4xl mx-auto px-4 sm:px-6">
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
            {['all', 'appointment', 'resume', 'system', 'verify'].map(t => (
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
          <AnimatePresence>
            {notifications.map((notif, i) => {
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
                        <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${typeInfo.bg} ${typeInfo.color}`}>
                          {typeInfo.label}
                        </span>
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
          {notifications.length === 0 && (
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
