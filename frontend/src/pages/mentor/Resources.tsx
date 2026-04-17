import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  FileText, Upload, Folder, Search, Plus, X, Download,
  Eye, Trash2, File, Image, Video, Link2, Clock,
  BookOpen
} from 'lucide-react';
import { useToast } from '../../components/ui';
import Tag from '@/components/ui/Tag';

// ====== 资料类型 ======
type ResourceType = 'document' | 'video' | 'link' | 'image';

interface Resource {
  id: number;
  title: string;
  description: string;
  type: ResourceType;
  category: string;
  url: string;
  size?: string;
  downloads: number;
  createdAt: string;
}

// Mock 数据（后续对接 API）
const MOCK_RESOURCES: Resource[] = [
  {
    id: 1, title: '前端面试高频题汇总', description: 'React/Vue/JS 核心知识点整理，覆盖 90% 面试场景',
    type: 'document', category: '面试准备', url: '#', size: '2.3 MB', downloads: 156, createdAt: '2026-04-10',
  },
  {
    id: 2, title: '简历撰写模板（技术岗）', description: '适合计算机相关专业学生的简历模板，含填写指南',
    type: 'document', category: '简历指导', url: '#', size: '1.1 MB', downloads: 243, createdAt: '2026-04-08',
  },
  {
    id: 3, title: '系统设计入门讲座', description: '1小时带你了解大厂系统设计面试的核心思路',
    type: 'video', category: '技术提升', url: '#', size: '320 MB', downloads: 89, createdAt: '2026-04-05',
  },
  {
    id: 4, title: 'LeetCode 刷题路线图', description: '按难度和频率排序的刷题计划，附解题思路',
    type: 'link', category: '技术提升', url: 'https://leetcode.cn', downloads: 312, createdAt: '2026-04-01',
  },
  {
    id: 5, title: '职业规划思维导图', description: '帮助学生梳理职业发展路径的思维导图模板',
    type: 'image', category: '职业规划', url: '#', size: '800 KB', downloads: 67, createdAt: '2026-03-28',
  },
];

const CATEGORIES = ['全部', '面试准备', '简历指导', '技术提升', '职业规划', '行业分析'];

const TYPE_ICONS: Record<ResourceType, typeof FileText> = {
  document: FileText,
  video: Video,
  link: Link2,
  image: Image,
};

const TYPE_COLORS: Record<ResourceType, { text: string; bg: string; tagVariant: 'blue' | 'purple' | 'primary' | 'orange' }> = {
  document: { text: 'text-blue-600', bg: 'bg-blue-50', tagVariant: 'blue' },
  video: { text: 'text-purple-600', bg: 'bg-purple-50', tagVariant: 'purple' },
  link: { text: 'text-teal-600', bg: 'bg-teal-50', tagVariant: 'primary' },
  image: { text: 'text-amber-600', bg: 'bg-amber-50', tagVariant: 'orange' },
};

export default function MentorResources() {
  const toast = useToast();
  const [resources, setResources] = useState<Resource[]>(MOCK_RESOURCES);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState('全部');
  const [showUploadModal, setShowUploadModal] = useState(false);

  // 上传表单
  const [uploadForm, setUploadForm] = useState({
    title: '', description: '', type: 'document' as ResourceType, category: '面试准备', url: '',
  });

  const filtered = resources.filter(r => {
    const matchCategory = activeCategory === '全部' || r.category === activeCategory;
    const matchSearch = !searchQuery ||
      r.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.description.toLowerCase().includes(searchQuery.toLowerCase());
    return matchCategory && matchSearch;
  });

  const handleUpload = () => {
    if (!uploadForm.title.trim()) {
      toast.warning('请填写资料标题');
      return;
    }
    const newResource: Resource = {
      id: Date.now(),
      ...uploadForm,
      downloads: 0,
      createdAt: new Date().toISOString().split('T')[0],
    };
    setResources(prev => [newResource, ...prev]);
    setShowUploadModal(false);
    setUploadForm({ title: '', description: '', type: 'document', category: '面试准备', url: '' });
    toast.success('资料上传成功', '学生可以在你的主页查看该资料');
  };

  const handleDelete = (id: number) => {
    setResources(prev => prev.filter(r => r.id !== id));
    toast.success('资料已删除');
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
          { label: '总下载量', value: resources.reduce((s, r) => s + r.downloads, 0), icon: Download, color: 'text-green-600', bg: 'bg-green-50' },
          { label: '文档类', value: resources.filter(r => r.type === 'document').length, icon: FileText, color: 'text-purple-600', bg: 'bg-purple-50' },
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

      {/* 搜索 + 分类筛选 */}
      <div className="bg-white rounded-xl border border-gray-200 p-4">
        <div className="flex flex-col sm:flex-row gap-3 mb-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="搜索资料标题或描述..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 rounded-lg border border-gray-200 focus:border-primary-500 focus:ring-1 focus:ring-primary-500 outline-none text-sm"
            />
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          {CATEGORIES.map(cat => (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                activeCategory === cat
                  ? 'bg-primary-500 text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* 资料列表 */}
      {filtered.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
          <Folder className="w-16 h-16 text-gray-200 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-700 mb-2">暂无资料</h3>
          <p className="text-sm text-gray-500">点击"上传资料"开始分享你的辅导材料</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((resource, idx) => {
            const TypeIcon = TYPE_ICONS[resource.type];
            const colors = TYPE_COLORS[resource.type];
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
                        <p className="text-sm text-gray-500 mt-1 line-clamp-1">{resource.description}</p>
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        <button className="p-1.5 text-gray-400 hover:text-primary-600 rounded-lg hover:bg-primary-50 transition-colors">
                          <Eye className="w-4 h-4" />
                        </button>
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
                        {resource.category}
                      </Tag>
                      {resource.size && (
                        <span className="flex items-center gap-1">
                          <File className="w-3 h-3" />
                          {resource.size}
                        </span>
                      )}
                      <span className="flex items-center gap-1">
                        <Download className="w-3 h-3" />
                        {resource.downloads} 次下载
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {resource.createdAt}
                      </span>
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
              className="fixed inset-0 bg-black/40 z-50"
              onClick={() => setShowUploadModal(false)}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-lg bg-white rounded-2xl shadow-2xl z-50 p-6"
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

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">描述</label>
                  <textarea
                    value={uploadForm.description}
                    onChange={(e) => setUploadForm(prev => ({ ...prev, description: e.target.value }))}
                    placeholder="简要描述资料内容"
                    rows={2}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-400 resize-none"
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
                      <option value="document">文档</option>
                      <option value="video">视频</option>
                      <option value="link">链接</option>
                      <option value="image">图片</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">分类</label>
                    <select
                      value={uploadForm.category}
                      onChange={(e) => setUploadForm(prev => ({ ...prev, category: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-400"
                    >
                      {CATEGORIES.filter(c => c !== '全部').map(cat => (
                        <option key={cat} value={cat}>{cat}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {uploadForm.type === 'link' ? '链接地址' : '文件上传'}
                  </label>
                  {uploadForm.type === 'link' ? (
                    <input
                      type="url"
                      value={uploadForm.url}
                      onChange={(e) => setUploadForm(prev => ({ ...prev, url: e.target.value }))}
                      placeholder="https://..."
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-400"
                    />
                  ) : (
                    <div className="border-2 border-dashed border-gray-200 rounded-xl p-6 text-center hover:border-primary-400 transition-colors cursor-pointer">
                      <Upload className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                      <p className="text-sm text-gray-500">点击或拖拽文件到此处上传</p>
                      <p className="text-xs text-gray-400 mt-1">支持 PDF、DOC、MP4、PNG 等格式</p>
                    </div>
                  )}
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
                  className="px-5 py-2 bg-primary-500 text-white rounded-lg text-sm font-medium hover:bg-primary-600 transition-colors"
                >
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
