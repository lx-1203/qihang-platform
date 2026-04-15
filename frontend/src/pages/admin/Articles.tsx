import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  Search, FileText, Plus, Edit, Trash2, Eye, EyeOff,
  MoreVertical, Loader2, Save, X, Upload
} from 'lucide-react';
import http from '@/api/http';
import FileUpload from '@/components/ui/FileUpload';
import MarkdownEditor from '@/components/admin/MarkdownEditor';
import { showToast } from '@/components/ui/ToastContainer';

type ArticleItem = {
  id: number;
  title: string;
  summary: string;
  content: string;
  category: string;
  cover: string;
  author: string;
  view_count: number;
  status: 'draft' | 'published';
  created_at: string;
  updated_at: string;
};

const CATEGORIES = ['校招指南', '简历技巧', '面试经验', '政策解读', '全部'];

export default function AdminArticles() {
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('全部');
  const [status, setStatus] = useState('');
  const [actionMenu, setActionMenu] = useState<number | null>(null);
  const [articles, setArticles] = useState<ArticleItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  const [showModal, setShowModal] = useState(false);
  const [editingArticle, setEditingArticle] = useState<ArticleItem | null>(null);
  const [formData, setFormData] = useState({
    title: '',
    summary: '',
    content: '',
    category: '校招指南',
    cover: '',
    author: '管理员',
    status: 'draft' as const,
  });
  const [saving, setSaving] = useState(false);

  const fetchArticles = async (keyword = '', cat = '全部', stat = '') => {
    setLoading(true);
    setError('');
    try {
      const params: any = {};
      if (keyword) params.keyword = keyword;
      if (cat && cat !== '全部') params.category = cat;
      if (stat) params.status = stat;

      const res = await http.get('/admin/articles', { params });
      if (res.data?.code === 200) {
        setArticles(res.data.data.articles || []);
      }
    } catch {
      setError('加载文章失败');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchArticles(search, category, status);
  }, []);

  const handleSearch = () => {
    fetchArticles(search, category, status);
  };

  const openCreateModal = () => {
    setEditingArticle(null);
    setFormData({
      title: '',
      summary: '',
      content: '',
      category: '校招指南',
      cover: '',
      author: '管理员',
      status: 'draft',
    });
    setShowModal(true);
  };

  const openEditModal = (article: ArticleItem) => {
    setEditingArticle(article);
    setFormData({
      title: article.title,
      summary: article.summary || '',
      content: article.content,
      category: article.category,
      cover: article.cover || '',
      author: article.author,
      status: article.status,
    });
    setShowModal(true);
  };

  const handleSave = async () => {
    if (!formData.title || !formData.content) {
      showToast({ type: 'error', title: '请填写标题和内容' });
      return;
    }

    setSaving(true);
    try {
      if (editingArticle) {
        await http.put(`/admin/articles/${editingArticle.id}`, formData);
        showToast({ type: 'success', title: '文章更新成功' });
      } else {
        await http.post('/admin/articles', formData);
        showToast({ type: 'success', title: '文章创建成功' });
      }
      setShowModal(false);
      fetchArticles(search, category, status);
    } catch {
      showToast({ type: 'error', title: '保存失败，请重试' });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('确定要删除这篇文章吗？')) return;
    
    try {
      await http.delete(`/admin/articles/${id}`);
      showToast({ type: 'success', title: '文章删除成功' });
      fetchArticles(search, category, status);
    } catch {
      showToast({ type: 'error', title: '删除失败，请重试' });
    }
    setActionMenu(null);
  };

  const handleToggleStatus = async (article: ArticleItem) => {
    const newStatus = article.status === 'published' ? 'draft' : 'published';
    try {
      await http.put(`/admin/articles/${article.id}`, { status: newStatus });
      showToast({ type: 'success', title: newStatus === 'published' ? '文章已发布' : '文章已下架' });
      fetchArticles(search, category, status);
    } catch {
      showToast({ type: 'error', title: '操作失败，请重试' });
    }
    setActionMenu(null);
  };

  const handleUploadSuccess = (url: string) => {
    setFormData(prev => ({ ...prev, cover: url }));
    showToast({ type: 'success', title: '封面上传成功' });
  };

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">文章管理</h1>
          <p className="text-gray-500 mt-1">发布和管理就业指导相关文章</p>
        </div>
        <button
          onClick={openCreateModal}
          className="inline-flex items-center gap-2 bg-primary-600 hover:bg-primary-700 text-white px-4 py-2.5 rounded-lg font-medium transition-colors"
        >
          <Plus className="w-5 h-5" />
          新建文章
        </button>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
          {error}
          <button onClick={() => setError('')} className="ml-2 text-red-500 hover:text-red-700">×</button>
        </div>
      )}

      <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
        <div className="flex flex-wrap gap-4">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="搜索文章标题、摘要..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
              className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 outline-none"
            />
          </div>
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="px-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 outline-none"
          >
            {CATEGORIES.map(cat => (
              <option key={cat} value={cat}>{cat}</option>
            ))}
          </select>
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            className="px-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 outline-none"
          >
            <option value="">全部状态</option>
            <option value="draft">草稿</option>
            <option value="published">已发布</option>
          </select>
          <button
            onClick={handleSearch}
            className="px-4 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg text-sm font-medium transition-colors"
          >
            搜索
          </button>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-8 h-8 text-primary-500 animate-spin" />
          <span className="ml-3 text-gray-500">加载中...</span>
        </div>
      ) : articles.length === 0 ? (
        <div className="text-center py-20 text-gray-400">
          <FileText className="w-16 h-16 mx-auto mb-4 text-gray-300" />
          <p className="text-lg">暂无文章</p>
          <p className="text-sm mt-1">点击"新建文章"开始发布内容</p>
        </div>
      ) : (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100">
                <th className="text-left px-6 py-3.5 text-xs font-medium text-gray-500 uppercase">文章</th>
                <th className="text-left px-6 py-3.5 text-xs font-medium text-gray-500 uppercase">分类</th>
                <th className="text-left px-6 py-3.5 text-xs font-medium text-gray-500 uppercase">作者</th>
                <th className="text-left px-6 py-3.5 text-xs font-medium text-gray-500 uppercase">浏览</th>
                <th className="text-left px-6 py-3.5 text-xs font-medium text-gray-500 uppercase">状态</th>
                <th className="text-left px-6 py-3.5 text-xs font-medium text-gray-500 uppercase">创建时间</th>
                <th className="text-right px-6 py-3.5 text-xs font-medium text-gray-500 uppercase">操作</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {articles.map((article, i) => (
                <motion.tr
                  key={article.id}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: i * 0.03 }}
                  className="hover:bg-gray-50"
                >
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      {article.cover ? (
                        <img src={article.cover} alt="" className="w-12 h-12 rounded-lg object-cover" />
                      ) : (
                        <div className="w-12 h-12 rounded-lg bg-primary-50 flex items-center justify-center">
                          <FileText className="w-6 h-6 text-primary-300" />
                        </div>
                      )}
                      <div>
                        <p className="text-sm font-medium text-gray-900 truncate max-w-[300px]">{article.title}</p>
                        {article.summary && (
                          <p className="text-xs text-gray-400 truncate max-w-[300px]">{article.summary}</p>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className="px-2 py-0.5 bg-primary-50 text-primary-700 rounded text-xs font-medium">
                      {article.category}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-600">{article.author}</td>
                  <td className="px-6 py-4 text-sm text-gray-500">{article.view_count}</td>
                  <td className="px-6 py-4">
                    <span className={`inline-flex items-center gap-1 text-xs font-medium ${
                      article.status === 'published' ? 'text-green-600' : 'text-gray-400'
                    }`}>
                      {article.status === 'published' ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
                      {article.status === 'published' ? '已发布' : '草稿'}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-500">{formatDate(article.created_at)}</td>
                  <td className="px-6 py-4 text-right relative">
                    <button
                      onClick={() => setActionMenu(actionMenu === article.id ? null : article.id)}
                      className="p-1.5 rounded-lg hover:bg-gray-100"
                    >
                      <MoreVertical className="w-4 h-4 text-gray-400" />
                    </button>
                    {actionMenu === article.id && (
                      <div className="absolute right-6 top-12 w-40 bg-white rounded-lg shadow-lg border py-1 z-10">
                        <button
                          onClick={() => openEditModal(article)}
                          className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2"
                        >
                          <Edit className="w-4 h-4" />
                          编辑
                        </button>
                        <button
                          onClick={() => handleToggleStatus(article)}
                          className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2"
                        >
                          {article.status === 'published' ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                          {article.status === 'published' ? '下架' : '发布'}
                        </button>
                        <button
                          onClick={() => handleDelete(article.id)}
                          className="w-full px-4 py-2 text-left text-sm text-red-600 hover:bg-red-50 flex items-center gap-2"
                        >
                          <Trash2 className="w-4 h-4" />
                          删除
                        </button>
                      </div>
                    )}
                  </td>
                </motion.tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-3xl max-h-[90vh] overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <h2 className="text-xl font-bold text-gray-900">
                {editingArticle ? '编辑文章' : '新建文章'}
              </h2>
              <button
                onClick={() => setShowModal(false)}
                className="p-2 hover:bg-gray-100 rounded-lg"
              >
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>
            <div className="p-6 overflow-y-auto max-h-[calc(90vh-140px)]">
              <div className="space-y-5">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">标题 *</label>
                  <input
                    type="text"
                    value={formData.title}
                    onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                    className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary-500 outline-none"
                    placeholder="请输入文章标题"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">分类</label>
                    <select
                      value={formData.category}
                      onChange={(e) => setFormData(prev => ({ ...prev, category: e.target.value }))}
                      className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary-500 outline-none"
                    >
                      {CATEGORIES.filter(c => c !== '全部').map(cat => (
                        <option key={cat} value={cat}>{cat}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">作者</label>
                    <input
                      type="text"
                      value={formData.author}
                      onChange={(e) => setFormData(prev => ({ ...prev, author: e.target.value }))}
                      className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary-500 outline-none"
                      placeholder="作者名"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">摘要</label>
                  <textarea
                    value={formData.summary}
                    onChange={(e) => setFormData(prev => ({ ...prev, summary: e.target.value }))}
                    rows={2}
                    className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary-500 outline-none resize-none"
                    placeholder="文章简短描述（可选）"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">封面图</label>
                  {formData.cover ? (
                    <div className="relative inline-block">
                      <img src={formData.cover} alt="封面" className="w-40 h-28 object-cover rounded-lg border border-gray-200" />
                      <button
                        onClick={() => setFormData(prev => ({ ...prev, cover: '' }))}
                        className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-0.5 hover:bg-red-600"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  ) : (
                    <FileUpload
                      onUploadSuccess={handleUploadSuccess}
                      category="cover"
                      accept="image/*"
                    />
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">正文 *</label>
                  <MarkdownEditor
                    value={formData.content}
                    onChange={(val) => setFormData(prev => ({ ...prev, content: val }))}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">状态</label>
                  <div className="flex gap-4">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="radio"
                        name="status"
                        value="draft"
                        checked={formData.status === 'draft'}
                        onChange={(e) => setFormData(prev => ({ ...prev, status: e.target.value as 'draft' | 'published' }))}
                        className="w-4 h-4 text-primary-600"
                      />
                      <span className="text-sm text-gray-600">保存为草稿</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="radio"
                        name="status"
                        value="published"
                        checked={formData.status === 'published'}
                        onChange={(e) => setFormData(prev => ({ ...prev, status: e.target.value as 'draft' | 'published' }))}
                        className="w-4 h-4 text-primary-600"
                      />
                      <span className="text-sm text-gray-600">立即发布</span>
                    </label>
                  </div>
                </div>
              </div>
            </div>
            <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-100">
              <button
                onClick={() => setShowModal(false)}
                className="px-4 py-2.5 text-gray-600 hover:bg-gray-100 rounded-lg font-medium transition-colors"
              >
                取消
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="inline-flex items-center gap-2 px-4 py-2.5 bg-primary-600 hover:bg-primary-700 disabled:opacity-50 text-white rounded-lg font-medium transition-colors"
              >
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                {saving ? '保存中...' : '保存'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
