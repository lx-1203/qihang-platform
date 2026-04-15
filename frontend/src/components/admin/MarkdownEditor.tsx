import { useState, useCallback, useRef } from 'react';
import { marked } from 'marked';
import DOMPurify from 'dompurify';
import { Eye, EyeOff, Columns, ImagePlus, Bold, Italic, Link as LinkIcon, List, Heading } from 'lucide-react';
import { FileUpload } from '@/components/ui';

// ====== Markdown 编辑器组件 ======
// 分屏编辑 + 实时预览 + 图片上传集成

// 配置 marked（安全模式）
marked.setOptions({
  breaks: true,   // 换行符转 <br>
  gfm: true,      // GitHub 风格 Markdown
});

type ViewMode = 'edit' | 'split' | 'preview';

interface MarkdownEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  minHeight?: string;
  className?: string;
}

export default function MarkdownEditor({
  value,
  onChange,
  placeholder = '支持 Markdown 语法...',
  minHeight = '300px',
  className = '',
}: MarkdownEditorProps) {
  const [viewMode, setViewMode] = useState<ViewMode>('split');
  const [showUpload, setShowUpload] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // 渲染 Markdown → 安全 HTML
  const renderHTML = useCallback(() => {
    try {
      const rawHTML = marked(value || '') as string;
      return DOMPurify.sanitize(rawHTML, {
        ALLOWED_TAGS: [
          'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'p', 'br', 'hr',
          'strong', 'em', 'del', 'code', 'pre', 'blockquote',
          'ul', 'ol', 'li', 'a', 'img', 'table', 'thead', 'tbody',
          'tr', 'th', 'td', 'span', 'div',
        ],
        ALLOWED_ATTR: ['href', 'src', 'alt', 'title', 'class', 'target'],
      });
    } catch {
      return '<p style="color:red">渲染失败</p>';
    }
  }, [value]);

  // 插入 Markdown 语法
  const insertMarkdown = useCallback((prefix: string, suffix: string = '', placeholder_text: string = '') => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selectedText = value.substring(start, end) || placeholder_text;
    const newText = value.substring(0, start) + prefix + selectedText + suffix + value.substring(end);

    onChange(newText);

    // 恢复光标位置
    requestAnimationFrame(() => {
      textarea.focus();
      const cursorPos = start + prefix.length + selectedText.length;
      textarea.setSelectionRange(cursorPos, cursorPos);
    });
  }, [value, onChange]);

  // 图片上传成功回调
  const handleImageUpload = useCallback((result: { url: string }) => {
    const imageMarkdown = `\n![图片](${result.url})\n`;
    onChange(value + imageMarkdown);
    setShowUpload(false);
  }, [value, onChange]);

  return (
    <div className={`border border-gray-200 rounded-xl overflow-hidden bg-white ${className}`}>
      {/* ====== 工具栏 ====== */}
      <div className="flex items-center justify-between px-3 py-2 bg-gray-50 border-b border-gray-200">
        {/* 左侧：格式工具 */}
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => insertMarkdown('**', '**', '粗体文字')}
            className="p-1.5 rounded-md hover:bg-gray-200 text-gray-600 transition-colors"
            title="粗体 (Ctrl+B)"
          >
            <Bold className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => insertMarkdown('*', '*', '斜体文字')}
            className="p-1.5 rounded-md hover:bg-gray-200 text-gray-600 transition-colors"
            title="斜体 (Ctrl+I)"
          >
            <Italic className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => insertMarkdown('## ', '', '标题')}
            className="p-1.5 rounded-md hover:bg-gray-200 text-gray-600 transition-colors"
            title="标题"
          >
            <Heading className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => insertMarkdown('[', '](url)', '链接文字')}
            className="p-1.5 rounded-md hover:bg-gray-200 text-gray-600 transition-colors"
            title="链接"
          >
            <LinkIcon className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => insertMarkdown('- ', '', '列表项')}
            className="p-1.5 rounded-md hover:bg-gray-200 text-gray-600 transition-colors"
            title="列表"
          >
            <List className="w-4 h-4" />
          </button>
          <div className="w-px h-5 bg-gray-300 mx-1" />
          <button
            type="button"
            onClick={() => setShowUpload(!showUpload)}
            className={`p-1.5 rounded-md transition-colors ${
              showUpload ? 'bg-primary-100 text-primary-700' : 'hover:bg-gray-200 text-gray-600'
            }`}
            title="插入图片"
          >
            <ImagePlus className="w-4 h-4" />
          </button>
        </div>

        {/* 右侧：视图切换 */}
        <div className="flex items-center bg-white rounded-lg border border-gray-200 p-0.5">
          <button
            type="button"
            onClick={() => setViewMode('edit')}
            className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors ${
              viewMode === 'edit' ? 'bg-primary-100 text-primary-700' : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            <EyeOff className="w-3.5 h-3.5 inline mr-1" />
            编辑
          </button>
          <button
            type="button"
            onClick={() => setViewMode('split')}
            className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors ${
              viewMode === 'split' ? 'bg-primary-100 text-primary-700' : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            <Columns className="w-3.5 h-3.5 inline mr-1" />
            分屏
          </button>
          <button
            type="button"
            onClick={() => setViewMode('preview')}
            className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors ${
              viewMode === 'preview' ? 'bg-primary-100 text-primary-700' : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            <Eye className="w-3.5 h-3.5 inline mr-1" />
            预览
          </button>
        </div>
      </div>

      {/* ====== 图片上传区（可折叠） ====== */}
      {showUpload && (
        <div className="px-4 py-3 bg-gray-50 border-b border-gray-200">
          <FileUpload
            category="article"
            accept="image/*"
            placeholder="点击或拖拽上传图片 → 自动插入 Markdown 图片标记"
            onSuccess={handleImageUpload}
          />
        </div>
      )}

      {/* ====== 编辑/预览区域 ====== */}
      <div className={`flex ${viewMode === 'split' ? 'divide-x divide-gray-200' : ''}`} style={{ minHeight }}>
        {/* 编辑区 */}
        {(viewMode === 'edit' || viewMode === 'split') && (
          <div className={viewMode === 'split' ? 'w-1/2' : 'w-full'}>
            <textarea
              ref={textareaRef}
              value={value}
              onChange={e => onChange(e.target.value)}
              placeholder={placeholder}
              className="w-full h-full resize-none p-4 text-sm text-gray-800 font-mono leading-relaxed focus:outline-none placeholder-gray-400"
              style={{ minHeight }}
            />
          </div>
        )}

        {/* 预览区 */}
        {(viewMode === 'preview' || viewMode === 'split') && (
          <div className={viewMode === 'split' ? 'w-1/2' : 'w-full'}>
            <div className="p-4 overflow-auto" style={{ minHeight }}>
              {value ? (
                <div
                  className="prose prose-sm max-w-none prose-headings:text-gray-900 prose-p:text-gray-700 prose-a:text-primary-600 prose-img:rounded-lg prose-img:shadow-sm prose-code:bg-gray-100 prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded prose-code:text-sm prose-pre:bg-gray-900 prose-pre:text-gray-100"
                  dangerouslySetInnerHTML={{ __html: renderHTML() }}
                />
              ) : (
                <p className="text-sm text-gray-400 italic">暂无内容，在左侧编辑区输入 Markdown 即可预览</p>
              )}
            </div>
          </div>
        )}
      </div>

      {/* ====== 底部状态栏 ====== */}
      <div className="flex items-center justify-between px-4 py-1.5 bg-gray-50 border-t border-gray-200 text-[10px] text-gray-400">
        <span>支持 Markdown 语法 · GFM</span>
        <span>{value.length} 字符</span>
      </div>
    </div>
  );
}
