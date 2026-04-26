import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  FileText, Upload, Folder, Search, Plus, X, Download,
  Eye, Trash2, File, Image, Video, Link2, Clock,
  BookOpen, Loader2, AlertTriangle
} from 'lucide-react';
import { useToast } from '../../components/ui';
import Tag from '@/components/ui/Tag';
import FileUpload from '@/components/ui/FileUpload';
import http from '@/api/http';

// ====== 资料类型（与后端 ENUM 对应） ======
type ResourceType = 'pdf' | 'doc' | 'video' | 'image' | 'other';

// 前端展示分类映射
type DisplayType = 'document' | 'video' | 'link' | 'image';

interface Resource {
  id: number;
  mentor_id: number;
  title: string;
  type: ResourceType;
  url: string;
  size_bytes: number;
  download_count: number;
  is_public: number;
  created_at: string;
}

// 后端类型 → 前端展示类型
const toDisplayType = (type: ResourceType): DisplayType => {
  if (type === 'pdf' || type === 'doc' || type === 'other') return 'document';
  if (type === 'video') return 'video';
  if (type === 'image') return 'image';
  return 'document';
};

// 格式化文件大小
const formatSize = (bytes: number): string => {
  if (!bytes || bytes === 0) return '';
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
};

const TYPE_FILTER_OPTIONS: { label: string; value: string }[] = [
  { label: '全部', value: '' },
  { label: '文档', value: 'pdf' },
  { label: 'DOC', value: 'doc' },
  { label: '视频', value: 'video' },
  { label: '图片', value: 'image' },
  { label: '其他', value: 'other' },
];

const TYPE_ICONS: Record<DisplayType, typeof FileText> = {
  document: FileText,
  video: Video,
  link: Link2,
  image: Image,
};

const TYPE_COLORS: Record<DisplayType, { text: string; bg: string; tagVariant: 'blue' | 'primary' | 'orange' }> = {
  document: { text: 'text-blue-600', bg: 'bg-blue-50', tagVariant: 'blue' },
  video: { text: 'text-primary-600', bg: 'bg-primary-50', tagVariant: 'primary' },
  link: { text: 'text-primary-600', bg: 'bg-primary-50', tagVariant: 'primary' },
  image: { text: 'text-amber-600', bg: 'bg-amber-50', tagVariant: 'orange' },
};

export default function MentorResources() {
  const toast = useToast();
  const [resources, setResources] = useState<Resource[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeType, setActiveType] = useState('');
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // 记录哪些资料的文件不存在（key: resource id, value: boolean）
  const [brokenFiles, setBrokenFiles] = useState<Record<number, boolean>>({});

  // 上传表单
  const [uploadForm, setUploadForm] = useState({
    title: '',
    type: 'pdf' as ResourceType,
    is_public: 1,
  });
  // 文件上传结果
  const [uploadedFile, setUploadedFile] = useState<{ url: string; size: number } | null>(null);

  // 加载资料列表
  const fetchResources = useCallback(async () => {
    try {
      setLoading(true);
      const params: Record<string, string> = {};
      if (activeType) params.type = activeType;
      if (searchQuery) params.keyword = searchQuery;
      const res = await http.get('/mentor/resources', { params });
      if (res.data?.code === 200) {
        const list = res.data.data.resources || [];
        setResources(list);

        // 批量检查文件是否存在
        if (list.length > 0) {
          try {
            const ids = list.map((r: Resource) => r.id);
            const checkRes = await http.post('/mentor/resources/check', { ids });
            if (checkRes.data?.code === 200) {
              const results: Record<string, { exists: boolean; url: string }> = checkRes.data.data.results || {};
              const broken: Record<number, boolean> = {};
              for (const [id, info] of Object.entries(results)) {
                if (!info.exists) broken[Number(id)] = true;
              }
              setBrokenFiles(broken);
            }
          } catch {
            // 检查失败不影响列表展示
          }
        }
      }
    } catch (err) {
      console.error('获取资料列表失败:', err);
      toast.error('获取资料列表失败');
    } finally {
      setLoading(false);
    }
  }, [activeType, searchQuery, toast]);

  useEffect(() => {
    fetchResources();
  }, [fetchResources]);

  // 上传确认：先上传文件，再创建资料记录
  const handleUpload = async () => {
    if (!uploadForm.title.trim()) {
      toast.warning('请填写资料标题');
      return;
    }
    if (!uploadedFile) {
      toast.warning('请先上传文件');
      return;
    }

    try {
      setSubmitting(true);
      const res = await http.post('/mentor/resources', {
        title: uploadForm.title,
        type: uploadForm.type,
        url: uploadedFile.url,
        size_bytes: uploadedFile.size,
        is_public: uploadForm.is_public,
      });
      if (res.data?.code === 201) {
        toast.success('资料上传成功', '学生可以在你的主页查看该资料');
        setShowUploadModal(false);
        setUploadForm({ title: '', type: 'pdf', is_public: 1 });
        setUploadedFile(null);
        fetchResources();
      }
    } catch (err) {
      console.error('创建资料记录失败:', err);
      toast.error('上传失败，请重试');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: number) => {
    try {
      const res = await http.delete(`/mentor/resources/${id}`);
      if (res.data?.code === 200) {
        setResources(prev => prev.filter(r => r.id !== id));
        toast.success('资料已删除');
      }
    } catch (err) {
      console.error('删除资料失败:', err);
      toast.error('删除失败');
    }
  };

  return (
    <div className="space-y-6">
      {/* 页头 */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <BookOpen className="w-6 h-6 text-primary-500" />
            资料库
          </h1>
          <p className="text-sm text-gray-500 mt-1">管理和分享你的辅导资料，帮助学生更好地成长</p>
        </div>
        <button
          onClick={() => setShowUploadModal(true)}
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-primary-500 text-white rounded-xl hover:bg-primary-600 transition-colors text-sm font-medium shadow-lg shadow-primary-500/20"
        >
          <Plus className="w-4 h-4" />
          上传资料
        </button>
      </div>

      {/* 统计卡片 */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: '总资料数', value: resources.length, icon: Folder, color: 'text-blue-600', bg: 'bg-blue-50' },
          { label: '总下载量', value: resources.reduce((s, r) => s + r.download_count, 0), icon: Download, color: 'text-green-600', bg: 'bg-green-50' },
          { label: '文档类', value: resources.filter(r => r.type === 'pdf' || r.type === 'doc').length, icon: FileText, color: 'text-primary-600', bg: 'bg-primary-50' },
          { label: '视频类', value: resources.filter(r => r.type === 'video').length, icon: Video, color: 'text-amber-600', bg: 'bg-amber-50' },
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

      {/* 搜索 + 类型筛选 */}
      <div className="bg-white rounded-xl border border-gray-200 p-4">
        <div className="flex flex-col sm:flex-row gap-3 mb-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="搜索资料标题..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 rounded-lg border border-gray-200 focus:border-primary-500 focus:ring-1 focus:ring-primary-500 outline-none text-sm"
            />
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          {TYPE_FILTER_OPTIONS.map(opt => (
            <button
              key={opt.value}
              onClick={() => setActiveType(opt.value)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                activeType === opt.value
                  ? 'bg-primary-500 text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* 资料列表 */}
      {loading ? (
        <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
          <Loader2 className="w-10 h-10 text-primary-500 animate-spin mx-auto mb-3" />
          <p className="text-sm text-gray-500">加载中...</p>
        </div>
      ) : resources.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
          <Folder className="w-16 h-16 text-gray-200 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-700 mb-2">暂无资料</h3>
          <p className="text-sm text-gray-500">点击"上传资料"开始分享你的辅导材料</p>
        </div>
      ) : (
        <div className="space-y-3">
          {resources.map((resource, idx) => {
            const displayType = toDisplayType(resource.type);
            const TypeIcon = TYPE_ICONS[displayType];
            const colors = TYPE_COLORS[displayType];
            return (
              <motion.div
                key={resource.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.03 }}
                className="bg-white rounded-xl border border-gray-200 p-5 hover:shadow-md hover:border-primary-200 transition-all"
              >
                <div className="flex items-start gap-4">
                  <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 ${colors.bg}`}>
                    <TypeIcon className={`w-6 h-6 ${colors.text}`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <h3 className="text-base font-bold text-gray-900">{resource.title}</h3>
                        <p className="text-sm text-gray-500 mt-1 line-clamp-1">
                          {resource.is_public ? '公开资料' : '私密资料'}
                        </p>
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        {brokenFiles[resource.id] ? (
                          <span className="p-1.5 text-amber-500" title="文件不存在或已被移除">
                            <AlertTriangle className="w-4 h-4" />
                          </span>
                        ) : (
                          <a
                            href={`/api/mentor/resources/${resource.id}/download`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="p-1.5 text-gray-400 hover:text-primary-600 rounded-lg hover:bg-primary-50 transition-colors"
                            title="预览/下载"
                          >
                            <Eye className="w-4 h-4" />
                          </a>
                        )}
                        <button
                          onClick={() => handleDelete(resource.id)}
                          className="p-1.5 text-gray-400 hover:text-red-600 rounded-lg hover:bg-red-50 transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                    <div className="flex flex-wrap items-center gap-3 mt-3 text-xs text-gray-400">
                      <Tag variant={colors.tagVariant} size="sm">
                        {resource.type.toUpperCase()}
                      </Tag>
                      {resource.size_bytes > 0 && (
                        <span className="flex items-center gap-1">
                          <File className="w-3 h-3" />
                          {formatSize(resource.size_bytes)}
                        </span>
                      )}
                      <span className="flex items-center gap-1">
                        <Download className="w-3 h-3" />
                        {resource.download_count} 次下载
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {resource.created_at?.split('T')[0]}
                      </span>
                      {brokenFiles[resource.id] && (
                        <span className="flex items-center gap-1 text-amber-500 font-medium">
                          <AlertTriangle className="w-3 h-3" />
                          文件不存在
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}

      {/* 上传弹窗 */}
      <AnimatePresence>
        {showUploadModal && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/40 z-[60]"
              onClick={() => setShowUploadModal(false)}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-lg bg-white rounded-2xl shadow-2xl z-[60] p-6"
            >
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-lg font-bold text-gray-900">上传资料</h2>
                <button onClick={() => setShowUploadModal(false)} className="p-1 text-gray-400 hover:text-gray-600">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">资料标题 *</label>
                  <input
                    type="text"
                    value={uploadForm.title}
                    onChange={(e) => setUploadForm(prev => ({ ...prev, title: e.target.value }))}
                    placeholder="输入资料标题"
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-400"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">类型</label>
                    <select
                      value={uploadForm.type}
                      onChange={(e) => setUploadForm(prev => ({ ...prev, type: e.target.value as ResourceType }))}
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-400"
                    >
                      <option value="pdf">PDF 文档</option>
                      <option value="doc">DOC 文档</option>
                      <option value="video">视频</option>
                      <option value="image">图片</option>
                      <option value="other">其他</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">可见性</label>
                    <select
                      value={uploadForm.is_public}
                      onChange={(e) => setUploadForm(prev => ({ ...prev, is_public: Number(e.target.value) }))}
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-400"
                    >
                      <option value={1}>公开</option>
                      <option value={0}>私密</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">文件上传 *</label>
                  <FileUpload
                    category="general"
                    accept="image/jpeg,image/png,image/gif,image/webp,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,video/mp4,video/webm"
                    onSuccess={(result) => {
                      setUploadedFile({ url: result.url, size: result.size });
                      toast.success('文件上传成功');
                    }}
                    onError={(error) => {
                      toast.error(error);
                    }}
                    placeholder="点击或拖拽文件到此处上传（支持 PDF、DOC、MP4、PNG 等格式）"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-gray-100">
                <button
                  onClick={() => setShowUploadModal(false)}
                  className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800 transition-colors"
                >
                  取消
                </button>
                <button
                  onClick={handleUpload}
                  disabled={submitting}
                  className="px-5 py-2 bg-primary-500 text-white rounded-lg text-sm font-medium hover:bg-primary-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed inline-flex items-center gap-2"
                >
                  {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
                  确认上传
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
