import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ChevronRight, Eye, Clock, User, ArrowLeft, Loader2, FileText, Image, Heart, Share2, Check } from 'lucide-react';
import { motion } from 'framer-motion';
import { marked } from 'marked';
import DOMPurify from 'dompurify';
import http from '@/api/http';
import { useAuthStore } from '@/store/auth';
import { showToast } from '@/components/ui/ToastContainer';

interface ArticleDetail {
  id: number;
  title: string;
  summary: string;
  content: string;
  category: string;
  cover: string;
  author: string;
  view_count: number;
  created_at: string;
}

// 分类颜色映射
const categoryColors: Record<string, string> = {
  '校招指南': 'bg-blue-50 text-blue-700 border-blue-200',
  '简历技巧': 'bg-emerald-50 text-emerald-700 border-emerald-200',
  '面试经验': 'bg-primary-50 text-primary-700 border-primary-200',
  '政策解读': 'bg-amber-50 text-amber-700 border-amber-200',
  '保研资讯': 'bg-orange-50 text-orange-700 border-orange-200',
  '留学指南': 'bg-purple-50 text-purple-700 border-purple-200',
};

export default function GuidanceArticleDetail() {
  const { id } = useParams<{ id: string }>();
  const { isAuthenticated } = useAuthStore();
  const [article, setArticle] = useState<ArticleDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [coverError, setCoverError] = useState(false);
  const [isFavorited, setIsFavorited] = useState(false);
  const [favoriteId, setFavoriteId] = useState<number | null>(null);
  const [favoriteLoading, setFavoriteLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    setError('');
    setCoverError(false);
    http.get(`/articles/${id}`)
      .then(res => {
        if (res.data?.code === 200) {
          setArticle(res.data.data);
        } else {
          setError('文章不存在');
        }
      })
      .catch(() => {
        setError('加载失败，请稍后重试');
      })
      .finally(() => {
        setLoading(false);
      });
  }, [id]);

  // 检查是否已收藏
  useEffect(() => {
    if (!isAuthenticated || !id) return;
    http.get('/student/favorites', { params: { type: 'article' } })
      .then(res => {
        const favorites = res.data?.data?.favorites || res.data?.favorites || [];
        const found = favorites.find((f: { target_type: string; target_id: number; id: number }) =>
          f.target_type === 'article' && f.target_id === Number(id)
        );
        if (found) {
          setIsFavorited(true);
          setFavoriteId(found.id);
        }
      })
      .catch(() => {});
  }, [isAuthenticated, id]);

  // 收藏/取消收藏
  const handleFavorite = async () => {
    if (!isAuthenticated) {
      showToast({ type: 'warning', title: '请先登录', message: '登录后即可收藏文章' });
      return;
    }
    if (favoriteLoading) return;
    setFavoriteLoading(true);
    try {
      if (isFavorited && favoriteId) {
        await http.delete(`/student/favorites/${favoriteId}`);
        setIsFavorited(false);
        setFavoriteId(null);
        showToast({ type: 'success', title: '已取消收藏' });
      } else {
        const res = await http.post('/student/favorites', { target_type: 'article', target_id: Number(id) });
        setIsFavorited(true);
        setFavoriteId(res.data?.data?.id || null);
        showToast({ type: 'success', title: '收藏成功' });
      }
    } catch {
      showToast({ type: 'error', title: '操作失败', message: '请稍后重试' });
    } finally {
      setFavoriteLoading(false);
    }
  };

  // 分享（复制链接）
  const handleShare = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      showToast({ type: 'success', title: '链接已复制', message: '可粘贴发送给好友' });
      setTimeout(() => setCopied(false), 2000);
    } catch {
      showToast({ type: 'error', title: '复制失败', message: '请手动复制地址栏链接' });
    }
  };

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    return `${d.getFullYear()}年${d.getMonth() + 1}月${d.getDate()}日`;
  };

  // Markdown → 安全 HTML（使用 marked + DOMPurify 防 XSS）
  const renderMarkdown = (text: string): string => {
    return DOMPurify.sanitize(marked.parse(text, { async: false }) as string);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-primary-600 animate-spin" />
      </div>
    );
  }

  if (error || !article) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <FileText className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-gray-900 mb-2">{error || '文章不存在'}</h2>
          <Link to="/guidance/articles" className="text-primary-600 hover:underline text-sm">
            返回文章列表
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 pt-8 pb-16">
      <div className="max-w-[900px] mx-auto px-4 sm:px-6">
        {/* 面包屑 */}
        <div className="flex items-center gap-2 text-sm text-gray-500 mb-8">
          <Link to="/guidance" className="hover:text-primary-600 transition-colors">就业指导</Link>
          <ChevronRight className="w-4 h-4" />
          <Link to="/guidance/articles" className="hover:text-primary-600 transition-colors">文章资讯</Link>
          <ChevronRight className="w-4 h-4" />
          <span className="text-gray-900 font-medium truncate max-w-[200px]">{article.title}</span>
        </div>

        <motion.article
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-2xl overflow-hidden border border-gray-100 shadow-sm"
        >
          {/* 封面 */}
          {article.cover && !coverError ? (
            <div className="h-72 sm:h-96 overflow-hidden">
              <img
                src={article.cover}
                alt={article.title}
                className="w-full h-full object-cover"
                onError={() => setCoverError(true)}
              />
            </div>
          ) : (
            <div className="h-48 bg-gradient-to-br from-primary-100 to-primary-50 flex items-center justify-center">
              <Image className="w-16 h-16 text-primary-300" />
            </div>
          )}

          {/* 文章头 */}
          <div className="p-8 sm:p-12">
            {/* 分类标签 */}
            <span className={`inline-block px-4 py-1.5 rounded-lg text-sm font-medium border mb-5 ${
              categoryColors[article.category] || 'bg-gray-50 text-gray-600 border-gray-200'
            }`}>
              {article.category}
            </span>

            <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 leading-snug mb-6">
              {article.title}
            </h1>

            {/* 元信息 */}
            <div className="flex flex-wrap items-center gap-6 text-sm text-gray-500 mb-6 pb-8 border-b border-gray-100">
              <span className="flex items-center gap-2">
                <User className="w-5 h-5" />
                {article.author}
              </span>
              <span className="flex items-center gap-2">
                <Clock className="w-5 h-5" />
                {formatDate(article.created_at)}
              </span>
              <span className="flex items-center gap-2">
                <Eye className="w-5 h-5" />
                {article.view_count} 次阅读
              </span>
            </div>

            {/* 操作按钮 */}
            <div className="flex items-center gap-3 mb-10 pb-8 border-b border-gray-100">
              <button
                onClick={handleFavorite}
                disabled={favoriteLoading}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  isFavorited
                    ? 'bg-red-50 text-red-600 border border-red-200'
                    : 'bg-gray-50 text-gray-600 border border-gray-200 hover:bg-red-50 hover:text-red-600 hover:border-red-200'
                } disabled:opacity-50`}
              >
                <Heart className={`w-4 h-4 ${isFavorited ? 'fill-current' : ''}`} />
                {isFavorited ? '已收藏' : '收藏'}
              </button>
              <button
                onClick={handleShare}
                className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium bg-gray-50 text-gray-600 border border-gray-200 hover:bg-primary-50 hover:text-primary-600 hover:border-primary-200 transition-colors"
              >
                {copied ? <Check className="w-4 h-4" /> : <Share2 className="w-4 h-4" />}
                {copied ? '已复制' : '分享'}
              </button>
            </div>

            {/* 正文 */}
            <div
              className="prose prose-lg max-w-none"
              dangerouslySetInnerHTML={{ __html: renderMarkdown(article.content) }}
            />
          </div>
        </motion.article>

        {/* 返回按钮 */}
        <div className="mt-10 text-center">
          <Link
            to="/guidance/articles"
            className="inline-flex items-center gap-2 text-primary-600 hover:text-primary-700 font-medium text-base transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
            返回文章列表
          </Link>
        </div>
      </div>
    </div>
  );
}
