import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ChevronRight, Eye, Clock, User, ArrowLeft, Loader2, FileText } from 'lucide-react';
import { motion } from 'framer-motion';
import { marked } from 'marked';
import DOMPurify from 'dompurify';
import http from '@/api/http';

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
};

export default function GuidanceArticleDetail() {
  const { id } = useParams<{ id: string }>();
  const [article, setArticle] = useState<ArticleDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    setError('');
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
          {article.cover && (
            <div className="h-72 sm:h-96 overflow-hidden">
              <img
                src={article.cover}
                alt={article.title}
                className="w-full h-full object-cover"
              />
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
            <div className="flex flex-wrap items-center gap-6 text-sm text-gray-500 mb-10 pb-8 border-b border-gray-100">
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
