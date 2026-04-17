import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Megaphone, Plus, Edit3, Trash2, Eye, EyeOff, Clock,
  X, Search,
  CheckCircle2, Users
} from 'lucide-react';
import { useToast } from '../../components/ui';
import Tag from '@/components/ui/Tag';
import ConfirmDialog from '@/components/ui/ConfirmDialog';

// ====== 公告类型 ======
type AnnouncementStatus = 'draft' | 'published' | 'scheduled' | 'archived';
type AnnouncementPriority = 'normal' | 'important' | 'urgent';

interface Announcement {
  id: number;
  title: string;
  content: string;
  status: AnnouncementStatus;
  priority: AnnouncementPriority;
  targetRoles: string[]; // 目标角色
  publishAt?: string;
  createdAt: string;
  views: number;
}

// Mock 数据
const MOCK_ANNOUNCEMENTS: Announcement[] = [
  {
    id: 1, title: '平台升级公告：新增留学板块', content: '启航平台已全面升级留学服务板块，包含选校指南、背景提升、Offer 展示等功能。欢迎同学们体验！',
    status: 'published', priority: 'important', targetRoles: ['student', 'mentor'],
    createdAt: '2026-04-12', views: 1256,
  },
  {
    id: 2, title: '企业认证流程优化通知', content: '为提升企业入驻效率，我们优化了企业认证审核流程，审核时间缩短至 1 个工作日。',
    status: 'published', priority: 'normal', targetRoles: ['company'],
    createdAt: '2026-04-10', views: 342,
  },
  {
    id: 3, title: '五一假期服务安排', content: '五一假期期间（5月1日-5月5日），平台正常运行，客服响应时间可能延长，请谅解。',
    status: 'scheduled', priority: 'normal', targetRoles: ['student', 'company', 'mentor'],
    publishAt: '2026-04-28', createdAt: '2026-04-13', views: 0,
  },
  {
    id: 4, title: '导师评价体系升级', content: '新版导师评价体系上线，新增多维度评分和详细评语功能，帮助学生更好地选择导师。',
    status: 'draft', priority: 'normal', targetRoles: ['student', 'mentor'],
    createdAt: '2026-04-14', views: 0,
  },
];

const STATUS_MAP: Record<AnnouncementStatus, { label: string; color: string; bg: string; tagVariant: 'gray' | 'green' | 'blue' }> = {
  draft: { label: '草稿', color: 'text-gray-600', bg: 'bg-gray-100', tagVariant: 'gray' },
  published: { label: '已发布', color: 'text-green-600', bg: 'bg-green-100', tagVariant: 'green' },
  scheduled: { label: '定时发布', color: 'text-blue-600', bg: 'bg-blue-100', tagVariant: 'blue' },
  archived: { label: '已归档', color: 'text-gray-500', bg: 'bg-gray-50', tagVariant: 'gray' },
};

const PRIORITY_MAP: Record<AnnouncementPriority, { label: string; color: string }> = {
  normal: { label: '普通', color: 'text-gray-500' },
  important: { label: '重要', color: 'text-amber-600' },
  urgent: { label: '紧急', color: 'text-red-600' },
};

const ROLE_LABELS: Record<string, string> = {
  student: '学生',
  company: '企业',
  mentor: '导师',
  admin: '管理员',
};

export default function AdminAnnouncements() {
  const toast = useToast();
  const [announcements, setAnnouncements] = useState<Announcement[]>(MOCK_ANNOUNCEMENTS);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<AnnouncementStatus | 'all'>('all');
  const [showEditor, setShowEditor] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);

  // 删除确认对话框
  const [deleteDialog, setDeleteDialog] = useState<{ open: boolean; announcementId: number | null }>({ open: false, announcementId: null });

  // 编辑表单
  const [form, setForm] = useState({
    title: '',
    content: '',
    priority: 'normal' as AnnouncementPriority,
    targetRoles: ['student', 'company', 'mentor'] as string[],
    publishAt: '',
  });

  const filtered = announcements.filter(a => {
    const matchStatus = filterStatus === 'all' || a.status === filterStatus;
    const matchSearch = !searchQuery ||
      a.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      a.content.toLowerCase().includes(searchQuery.toLowerCase());
    return matchStatus && matchSearch;
  });

  const openEditor = (announcement?: Announcement) => {
    if (announcement) {
      setEditingId(announcement.id);
      setForm({
        title: announcement.title,
        content: announcement.content,
        priority: announcement.priority,
        targetRoles: announcement.targetRoles,
        publishAt: announcement.publishAt || '',
      });
    } else {
      setEditingId(null);
      setForm({ title: '', content: '', priority: 'normal', targetRoles: ['student', 'company', 'mentor'], publishAt: '' });
    }
    setShowEditor(true);
  };

  const handleSave = (publish: boolean) => {
    if (!form.title.trim()) {
      toast.warning('请填写公告标题');
      return;
    }
    if (!form.content.trim()) {
      toast.warning('请填写公告内容');
      return;
    }

    const status: AnnouncementStatus = publish
      ? (form.publishAt ? 'scheduled' : 'published')
      : 'draft';

    if (editingId) {
      setAnnouncements(prev => prev.map(a =>
        a.id === editingId
          ? { ...a, title: form.title, content: form.content, priority: form.priority, targetRoles: form.targetRoles, status, publishAt: form.publishAt || undefined }
          : a
      ));
      toast.success('公告已更新');
    } else {
      const newAnnouncement: Announcement = {
        id: Date.now(),
        title: form.title,
        content: form.content,
        status,
        priority: form.priority,
        targetRoles: form.targetRoles,
        publishAt: form.publishAt || undefined,
        createdAt: new Date().toISOString().split('T')[0],
        views: 0,
      };
      setAnnouncements(prev => [newAnnouncement, ...prev]);
      toast.success(publish ? '公告已发布' : '草稿已保存');
    }
    setShowEditor(false);
  };

  const handleDelete = (id: number) => {
    // 打开确认对话框
    setDeleteDialog({ open: true, announcementId: id });
  };

  // 确认删除
  const confirmDelete = () => {
    if (deleteDialog.announcementId === null) return;
    setAnnouncements(prev => prev.filter(a => a.id !== deleteDialog.announcementId));
    toast.success('公告已删除');
    setDeleteDialog({ open: false, announcementId: null });
  };

  const togglePublish = (id: number) => {
    setAnnouncements(prev => prev.map(a => {
      if (a.id !== id) return a;
      const newStatus = a.status === 'published' ? 'archived' : 'published';
      return { ...a, status: newStatus };
    }));
  };

  const toggleRole = (role: string) => {
    setForm(prev => ({
      ...prev,
      targetRoles: prev.targetRoles.includes(role)
        ? prev.targetRoles.filter(r => r !== role)
        : [...prev.targetRoles, role],
    }));
  };

  return (
    <div className="space-y-6">
      {/* 页头 */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Megaphone className="w-6 h-6 text-primary-500" />
            公告管理
          </h1>
          <p className="text-sm text-gray-500 mt-1">发布和管理平台公告，支持定时发布和角色定向推送</p>
        </div>
        <button
          onClick={() => openEditor()}
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-primary-500 text-white rounded-xl hover:bg-primary-600 transition-colors text-sm font-medium"
        >
          <Plus className="w-4 h-4" />
          新建公告
        </button>
      </div>

      {/* 统计 */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: '已发布', value: announcements.filter(a => a.status === 'published').length, color: 'text-green-600', bg: 'bg-green-50', icon: CheckCircle2 },
          { label: '草稿', value: announcements.filter(a => a.status === 'draft').length, color: 'text-gray-600', bg: 'bg-gray-50', icon: Edit3 },
          { label: '定时发布', value: announcements.filter(a => a.status === 'scheduled').length, color: 'text-blue-600', bg: 'bg-blue-50', icon: Clock },
          { label: '总浏览量', value: announcements.reduce((s, a) => s + a.views, 0), color: 'text-purple-600', bg: 'bg-purple-50', icon: Eye },
        ].map(stat => (
          <div key={stat.label} className="bg-white rounded-xl border border-gray-200 p-4">
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${stat.bg}`}>
                <stat.icon className={`w-5 h-5 ${stat.color}`} />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">{stat.value}</p>
                <p className="text-xs text-gray-500">{stat.label}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* 搜索 + 筛选 */}
      <div className="bg-white rounded-xl border border-gray-200 p-4 flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="搜索公告标题或内容..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 rounded-lg border border-gray-200 focus:border-primary-500 focus:ring-1 focus:ring-primary-500 outline-none text-sm"
          />
        </div>
        <div className="flex gap-2">
          {(['all', 'published', 'draft', 'scheduled', 'archived'] as const).map(status => (
            <button
              key={status}
              onClick={() => setFilterStatus(status)}
              className={`px-3 py-2 rounded-lg text-xs font-medium transition-colors ${
                filterStatus === status
                  ? 'bg-primary-500 text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {status === 'all' ? '全部' : STATUS_MAP[status].label}
            </button>
          ))}
        </div>
      </div>

      {/* 公告列表 */}
      {filtered.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
          <Megaphone className="w-16 h-16 text-gray-200 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-700 mb-2">暂无公告</h3>
          <p className="text-sm text-gray-500">点击"新建公告"发布第一条平台公告</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((announcement, idx) => {
            const statusInfo = STATUS_MAP[announcement.status];
            const priorityInfo = PRIORITY_MAP[announcement.priority];
            return (
              <motion.div
                key={announcement.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.03 }}
                className="bg-white rounded-xl border border-gray-200 p-5 hover:shadow-md transition-all"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-2 flex-wrap">
                      <h3 className="text-base font-bold text-gray-900">{announcement.title}</h3>
                      <Tag variant={statusInfo.tagVariant} size="sm">
                        {statusInfo.label}
                      </Tag>
                      {announcement.priority !== 'normal' && (
                        <span className={`text-xs font-medium ${priorityInfo.color}`}>
                          {announcement.priority === 'urgent' ? '🔴' : '🟡'} {priorityInfo.label}
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-gray-600 line-clamp-2 mb-3">{announcement.content}</p>
                    <div className="flex flex-wrap items-center gap-3 text-xs text-gray-400">
                      <span className="flex items-center gap-1">
                        <Users className="w-3 h-3" />
                        {announcement.targetRoles.map(r => ROLE_LABELS[r]).join('、')}
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {announcement.createdAt}
                      </span>
                      {announcement.publishAt && (
                        <span className="flex items-center gap-1 text-blue-500">
                          <Clock className="w-3 h-3" />
                          定时: {announcement.publishAt}
                        </span>
                      )}
                      <span className="flex items-center gap-1">
                        <Eye className="w-3 h-3" />
                        {announcement.views} 次浏览
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      onClick={() => togglePublish(announcement.id)}
                      className="p-1.5 text-gray-400 hover:text-primary-600 rounded-lg hover:bg-primary-50 transition-colors"
                      title={announcement.status === 'published' ? '归档' : '发布'}
                    >
                      {announcement.status === 'published' ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                    <button
                      onClick={() => openEditor(announcement)}
                      className="p-1.5 text-gray-400 hover:text-blue-600 rounded-lg hover:bg-blue-50 transition-colors"
                    >
                      <Edit3 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDelete(announcement.id)}
                      className="p-1.5 text-gray-400 hover:text-red-600 rounded-lg hover:bg-red-50 transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}

      {/* 编辑弹窗 */}
      <AnimatePresence>
        {showEditor && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/40 z-50"
              onClick={() => setShowEditor(false)}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-2xl bg-white rounded-2xl shadow-2xl z-50 p-6 max-h-[85vh] overflow-y-auto"
            >
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-lg font-bold text-gray-900">
                  {editingId ? '编辑公告' : '新建公告'}
                </h2>
                <button onClick={() => setShowEditor(false)} className="p-1 text-gray-400 hover:text-gray-600">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">公告标题 *</label>
                  <input
                    type="text"
                    value={form.title}
                    onChange={(e) => setForm(prev => ({ ...prev, title: e.target.value }))}
                    placeholder="输入公告标题"
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-400"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">公告内容 *</label>
                  <textarea
                    value={form.content}
                    onChange={(e) => setForm(prev => ({ ...prev, content: e.target.value }))}
                    placeholder="输入公告内容..."
                    rows={5}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-400 resize-none"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">优先级</label>
                    <select
                      value={form.priority}
                      onChange={(e) => setForm(prev => ({ ...prev, priority: e.target.value as AnnouncementPriority }))}
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-400"
                    >
                      <option value="normal">普通</option>
                      <option value="important">重要</option>
                      <option value="urgent">紧急</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">定时发布（可选）</label>
                    <input
                      type="date"
                      value={form.publishAt}
                      onChange={(e) => setForm(prev => ({ ...prev, publishAt: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-400"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">推送目标角色</label>
                  <div className="flex flex-wrap gap-2">
                    {Object.entries(ROLE_LABELS).map(([role, label]) => (
                      <button
                        key={role}
                        onClick={() => toggleRole(role)}
                        className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
                          form.targetRoles.includes(role)
                            ? 'border-primary-500 bg-primary-50 text-primary-700'
                            : 'border-gray-200 text-gray-500 hover:border-gray-300'
                        }`}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-gray-100">
                <button
                  onClick={() => setShowEditor(false)}
                  className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800 transition-colors"
                >
                  取消
                </button>
                <button
                  onClick={() => handleSave(false)}
                  className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors"
                >
                  保存草稿
                </button>
                <button
                  onClick={() => handleSave(true)}
                  className="px-5 py-2 bg-primary-500 text-white rounded-lg text-sm font-medium hover:bg-primary-600 transition-colors"
                >
                  {form.publishAt ? '定时发布' : '立即发布'}
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* 删除确认对话框 */}
      <ConfirmDialog
        open={deleteDialog.open}
        title="确定要删除这条公告吗？"
        description="删除后无法恢复，请谨慎操作。"
        variant="danger"
        confirmText="确认删除"
        onConfirm={confirmDelete}
        onCancel={() => setDeleteDialog({ open: false, announcementId: null })}
      />
    </div>
  );
}
