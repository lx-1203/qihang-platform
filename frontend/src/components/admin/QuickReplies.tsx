import { useState } from 'react';
import { MessageSquare, Plus, X, Edit2, Check, Trash2 } from 'lucide-react';

// ====== 快捷回复模板管理组件 ======
// 管理员聊天时可一键使用预设回复模板

interface QuickRepliesProps {
  /** 当选择模板时的回调 */
  onSelect: (text: string) => void;
}

const DEFAULT_TEMPLATES = [
  '您好！我是启航平台客服，很高兴为您服务，请问有什么可以帮助您的？',
  '您的问题我已收到，正在为您查询中，请稍等片刻~',
  '感谢您的反馈，我们会尽快处理，如有其他问题请随时联系我们。',
  '关于岗位投递，您可以在「找工作」页面搜索并筛选合适的岗位，点击「投递简历」即可。',
  '导师预约请前往「导师」页面，选择心仪导师后点击「预约咨询」。',
  '如需修改个人信息，请前往「个人中心」→「我的资料」进行编辑。',
  '您的账号出现异常，请尝试重新登录。如问题持续，请联系管理员。',
  '感谢使用启航平台！祝您求职顺利！如有任何问题，随时联系我们。',
  '非常抱歉给您带来不便，我们会尽快解决此问题。',
  '该功能目前正在开发中，预计近期上线，敬请期待！',
];

const STORAGE_KEY = 'qihang-quick-replies';

function loadTemplates(): string[] {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) return JSON.parse(saved);
  } catch { /* ignore */ }
  return DEFAULT_TEMPLATES;
}

function saveTemplates(templates: string[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(templates));
}

export default function QuickReplies({ onSelect }: QuickRepliesProps) {
  const [templates, setTemplates] = useState<string[]>(loadTemplates);
  const [isAdding, setIsAdding] = useState(false);
  const [newText, setNewText] = useState('');
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [editText, setEditText] = useState('');

  const handleAdd = () => {
    if (!newText.trim()) return;
    const updated = [...templates, newText.trim()];
    setTemplates(updated);
    saveTemplates(updated);
    setNewText('');
    setIsAdding(false);
  };

  const handleDelete = (index: number) => {
    const updated = templates.filter((_, i) => i !== index);
    setTemplates(updated);
    saveTemplates(updated);
  };

  const handleEdit = (index: number) => {
    setEditingIndex(index);
    setEditText(templates[index]);
  };

  const handleSaveEdit = () => {
    if (editingIndex === null || !editText.trim()) return;
    const updated = [...templates];
    updated[editingIndex] = editText.trim();
    setTemplates(updated);
    saveTemplates(updated);
    setEditingIndex(null);
  };

  return (
    <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 bg-gray-50/50">
        <div className="flex items-center gap-2">
          <MessageSquare className="w-4 h-4 text-primary-500" />
          <h3 className="text-sm font-semibold text-gray-800">快捷回复</h3>
          <span className="text-xs text-gray-400">{templates.length} 条</span>
        </div>
        <button
          onClick={() => setIsAdding(!isAdding)}
          className="flex items-center gap-1 text-xs text-primary-600 hover:text-primary-700 transition-colors"
        >
          {isAdding ? <X className="w-3.5 h-3.5" /> : <Plus className="w-3.5 h-3.5" />}
          {isAdding ? '取消' : '新增'}
        </button>
      </div>

      <div className="max-h-[400px] overflow-y-auto">
        {/* 新增模板输入 */}
        {isAdding && (
          <div className="p-3 border-b border-gray-100 bg-primary-50/30">
            <textarea
              value={newText}
              onChange={(e) => setNewText(e.target.value)}
              placeholder="输入新的快捷回复模板..."
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm resize-none focus:ring-2 focus:ring-primary-500/30 focus:border-primary-400 outline-none"
              rows={2}
            />
            <div className="flex justify-end mt-2">
              <button
                onClick={handleAdd}
                disabled={!newText.trim()}
                className="px-3 py-1.5 bg-primary-500 text-white text-xs rounded-lg hover:bg-primary-600 disabled:opacity-50 transition-colors"
              >
                添加
              </button>
            </div>
          </div>
        )}

        {/* 模板列表 */}
        {templates.map((text, i) => (
          <div key={i} className="group relative">
            {editingIndex === i ? (
              <div className="p-3 border-b border-gray-50 bg-yellow-50/30">
                <textarea
                  value={editText}
                  onChange={(e) => setEditText(e.target.value)}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm resize-none focus:ring-2 focus:ring-primary-500/30 outline-none"
                  rows={2}
                />
                <div className="flex justify-end gap-2 mt-2">
                  <button onClick={() => setEditingIndex(null)} className="px-2 py-1 text-xs text-gray-500 hover:text-gray-700">取消</button>
                  <button onClick={handleSaveEdit} className="px-3 py-1 bg-primary-500 text-white text-xs rounded-lg hover:bg-primary-600">保存</button>
                </div>
              </div>
            ) : (
              <button
                onClick={() => onSelect(text)}
                className="w-full text-left px-4 py-3 text-sm text-gray-700 hover:bg-primary-50/50 transition-colors border-b border-gray-50 leading-relaxed"
              >
                <span className="line-clamp-2">{text}</span>
                {/* Hover actions */}
                <span className="absolute right-2 top-1/2 -translate-y-1/2 hidden group-hover:flex items-center gap-1">
                  <span
                    role="button"
                    onClick={(e) => { e.stopPropagation(); handleEdit(i); }}
                    className="p-1 rounded hover:bg-gray-100"
                  >
                    <Edit2 className="w-3 h-3 text-gray-400" />
                  </span>
                  <span
                    role="button"
                    onClick={(e) => { e.stopPropagation(); handleDelete(i); }}
                    className="p-1 rounded hover:bg-red-50"
                  >
                    <Trash2 className="w-3 h-3 text-red-400" />
                  </span>
                </span>
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
