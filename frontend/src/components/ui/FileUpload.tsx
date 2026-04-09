import { useState, useRef, useCallback } from 'react';
import { Upload, X, FileText, Image, Loader2, CheckCircle2, AlertCircle } from 'lucide-react';
import http from '@/api/http';

// 上传文件类别
type UploadCategory = 'avatar' | 'resume' | 'cover' | 'general';

// 上传结果
interface UploadResult {
  url: string;
  filename: string;
  originalname: string;
  mimetype: string;
  size: number;
}

// 文件项状态
interface FileItem {
  id: string;
  file: File;
  preview?: string;
  status: 'pending' | 'uploading' | 'success' | 'error';
  progress: number;
  result?: UploadResult;
  error?: string;
}

interface FileUploadProps {
  /** 上传类别: avatar / resume / cover / general */
  category?: UploadCategory;
  /** 允许的文件类型 MIME，默认为图片+文档 */
  accept?: string;
  /** 是否允许多文件上传 */
  multiple?: boolean;
  /** 最大文件数量（多文件模式） */
  maxFiles?: number;
  /** 最大文件大小（字节），默认 10MB */
  maxSize?: number;
  /** 上传成功回调 */
  onSuccess?: (result: UploadResult) => void;
  /** 上传成功回调（多文件） */
  onMultiSuccess?: (results: UploadResult[]) => void;
  /** 上传失败回调 */
  onError?: (error: string) => void;
  /** 自定义提示文字 */
  placeholder?: string;
  /** 自定义 className */
  className?: string;
  /** 禁用状态 */
  disabled?: boolean;
}

// 文件类型图标映射
const getFileIcon = (mimetype: string) => {
  if (mimetype.startsWith('image/')) return <Image size={24} className="text-blue-500" />;
  return <FileText size={24} className="text-orange-500" />;
};

// 格式化文件大小
const formatSize = (bytes: number): string => {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
};

// 生成唯一 ID
const generateId = () => Math.random().toString(36).substring(2, 10);

export default function FileUpload({
  category = 'general',
  accept = 'image/jpeg,image/png,image/gif,image/webp,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  multiple = false,
  maxFiles = 5,
  maxSize = 10 * 1024 * 1024,
  onSuccess,
  onMultiSuccess,
  onError,
  placeholder,
  className = '',
  disabled = false,
}: FileUploadProps) {
  const [files, setFiles] = useState<FileItem[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // 默认提示文字
  const defaultPlaceholder = category === 'avatar'
    ? '点击或拖拽上传头像（JPG/PNG，最大5MB）'
    : category === 'resume'
    ? '点击或拖拽上传简历（PDF/DOC，最大10MB）'
    : category === 'cover'
    ? '点击或拖拽上传封面图（JPG/PNG，最大5MB）'
    : '点击或拖拽上传文件';

  // 处理文件选择
  const handleFiles = useCallback((selectedFiles: FileList | null) => {
    if (!selectedFiles || selectedFiles.length === 0) return;

    const newFiles: FileItem[] = [];
    const errors: string[] = [];

    for (let i = 0; i < selectedFiles.length; i++) {
      const file = selectedFiles[i];

      // 检查文件大小
      if (file.size > maxSize) {
        errors.push(`${file.name} 超过大小限制（${formatSize(maxSize)}）`);
        continue;
      }

      // 检查数量限制
      if (!multiple && newFiles.length >= 1) break;
      if (multiple && files.length + newFiles.length >= maxFiles) {
        errors.push(`最多上传 ${maxFiles} 个文件`);
        break;
      }

      // 生成预览（图片类型）
      let preview: string | undefined;
      if (file.type.startsWith('image/')) {
        preview = URL.createObjectURL(file);
      }

      newFiles.push({
        id: generateId(),
        file,
        preview,
        status: 'pending',
        progress: 0,
      });
    }

    if (errors.length > 0) {
      onError?.(errors.join('; '));
    }

    if (newFiles.length > 0) {
      if (multiple) {
        setFiles((prev) => [...prev, ...newFiles]);
      } else {
        // 单文件模式替换
        setFiles(newFiles);
      }

      // 自动开始上传
      newFiles.forEach((f) => uploadFile(f));
    }
  }, [files.length, maxFiles, maxSize, multiple, onError]);

  // 上传单个文件
  const uploadFile = async (fileItem: FileItem) => {
    setFiles((prev) =>
      prev.map((f) => (f.id === fileItem.id ? { ...f, status: 'uploading', progress: 0 } : f))
    );

    try {
      const formData = new FormData();
      formData.append('file', fileItem.file);
      formData.append('category', category);

      const res = await http.post('/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
        onUploadProgress: (progressEvent) => {
          const progress = progressEvent.total
            ? Math.round((progressEvent.loaded / progressEvent.total) * 100)
            : 0;
          setFiles((prev) =>
            prev.map((f) => (f.id === fileItem.id ? { ...f, progress } : f))
          );
        },
      });

      if (res.data?.code === 200) {
        const result = res.data.data as UploadResult;
        setFiles((prev) =>
          prev.map((f) => (f.id === fileItem.id ? { ...f, status: 'success', progress: 100, result } : f))
        );
        onSuccess?.(result);
      } else {
        throw new Error(res.data?.message || '上传失败');
      }
    } catch (err: any) {
      const errorMsg = err?.message || '上传失败，请重试';
      setFiles((prev) =>
        prev.map((f) => (f.id === fileItem.id ? { ...f, status: 'error', error: errorMsg } : f))
      );
      onError?.(errorMsg);
    }
  };

  // 移除文件
  const removeFile = (id: string) => {
    setFiles((prev) => {
      const file = prev.find((f) => f.id === id);
      if (file?.preview) URL.revokeObjectURL(file.preview);
      return prev.filter((f) => f.id !== id);
    });
  };

  // 拖拽事件
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    if (!disabled) setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (!disabled) handleFiles(e.dataTransfer.files);
  };

  return (
    <div className={`space-y-3 ${className}`}>
      {/* 拖拽上传区域 */}
      <div
        onClick={() => !disabled && inputRef.current?.click()}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={`relative border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all
          ${disabled ? 'border-gray-200 bg-gray-50 cursor-not-allowed' : ''}
          ${isDragging ? 'border-primary-500 bg-primary-50' : 'border-gray-300 hover:border-primary-400 hover:bg-gray-50'}
        `}
      >
        <input
          ref={inputRef}
          type="file"
          accept={accept}
          multiple={multiple}
          onChange={(e) => handleFiles(e.target.files)}
          className="hidden"
          disabled={disabled}
        />
        <Upload className={`w-10 h-10 mx-auto mb-3 ${isDragging ? 'text-primary-500' : 'text-gray-400'}`} />
        <p className={`text-sm font-medium ${isDragging ? 'text-primary-700' : 'text-gray-600'}`}>
          {placeholder || defaultPlaceholder}
        </p>
        <p className="text-xs text-gray-400 mt-2">
          支持 JPG、PNG、GIF、WEBP、PDF、DOC、DOCX
        </p>
      </div>

      {/* 文件列表 */}
      {files.length > 0 && (
        <div className="space-y-2">
          {files.map((fileItem) => (
            <div
              key={fileItem.id}
              className={`flex items-center gap-3 p-3 rounded-lg border transition-colors ${
                fileItem.status === 'error' ? 'border-red-200 bg-red-50' :
                fileItem.status === 'success' ? 'border-green-200 bg-green-50' :
                'border-gray-200 bg-white'
              }`}
            >
              {/* 预览/图标 */}
              {fileItem.preview ? (
                <img src={fileItem.preview} alt="" className="w-10 h-10 rounded object-cover flex-shrink-0" />
              ) : (
                <div className="w-10 h-10 rounded bg-gray-100 flex items-center justify-center flex-shrink-0">
                  {getFileIcon(fileItem.file.type)}
                </div>
              )}

              {/* 文件信息 */}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 truncate">{fileItem.file.name}</p>
                <div className="flex items-center gap-2 text-xs text-gray-500 mt-0.5">
                  <span>{formatSize(fileItem.file.size)}</span>
                  {fileItem.status === 'uploading' && <span>{fileItem.progress}%</span>}
                  {fileItem.status === 'error' && (
                    <span className="text-red-500">{fileItem.error}</span>
                  )}
                </div>
                {/* 进度条 */}
                {fileItem.status === 'uploading' && (
                  <div className="w-full h-1 bg-gray-200 rounded-full mt-1.5 overflow-hidden">
                    <div
                      className="h-full bg-primary-500 rounded-full transition-all duration-300"
                      style={{ width: `${fileItem.progress}%` }}
                    />
                  </div>
                )}
              </div>

              {/* 状态图标 */}
              <div className="flex-shrink-0">
                {fileItem.status === 'uploading' && <Loader2 size={18} className="text-primary-500 animate-spin" />}
                {fileItem.status === 'success' && <CheckCircle2 size={18} className="text-green-500" />}
                {fileItem.status === 'error' && <AlertCircle size={18} className="text-red-500" />}
              </div>

              {/* 删除按钮 */}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  removeFile(fileItem.id);
                }}
                className="flex-shrink-0 p-1 rounded hover:bg-gray-200 text-gray-400 hover:text-gray-600 transition-colors"
              >
                <X size={16} />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
