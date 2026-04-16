// ====== 客户端图片压缩工具 ======
// 利用 Canvas API 在上传前压缩图片，减少传输时间和服务器存储

interface CompressOptions {
  /** 最大宽度（px），超过则等比缩放 */
  maxWidth?: number;
  /** 最大高度（px），超过则等比缩放 */
  maxHeight?: number;
  /** 压缩质量 (0-1)，仅对 JPEG/WebP 有效 */
  quality?: number;
  /** 输出格式 */
  outputType?: 'image/jpeg' | 'image/webp' | 'image/png';
  /** 文件大小阈值(bytes)，低于此值不压缩 */
  sizeThreshold?: number;
}

const DEFAULT_OPTIONS: Required<CompressOptions> = {
  maxWidth: 1920,
  maxHeight: 1080,
  quality: 0.85,
  outputType: 'image/jpeg',
  sizeThreshold: 5 * 1024 * 1024, // 5MB
};

/**
 * 将 File 对象压缩为更小的图片
 *
 * @example
 * const file = inputRef.current.files[0];
 * const compressed = await compressImage(file, { maxWidth: 800, quality: 0.8 });
 * // compressed 是一个新的 File 对象，可直接上传
 */
export async function compressImage(
  file: File,
  options: CompressOptions = {}
): Promise<File> {
  const opts = { ...DEFAULT_OPTIONS, ...options };

  // 非图片或小于阈值 → 不压缩
  if (!file.type.startsWith('image/') || file.size < opts.sizeThreshold) {
    return file;
  }

  // PNG 不进行有损压缩（保留透明度）
  if (file.type === 'image/png' && opts.outputType !== 'image/png') {
    opts.outputType = 'image/png';
    opts.quality = 1;
  }

  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);

    img.onload = () => {
      URL.revokeObjectURL(url);

      // 计算缩放尺寸（保持比例）
      let { width, height } = img;
      if (width > opts.maxWidth) {
        height = Math.round(height * (opts.maxWidth / width));
        width = opts.maxWidth;
      }
      if (height > opts.maxHeight) {
        width = Math.round(width * (opts.maxHeight / height));
        height = opts.maxHeight;
      }

      // Canvas 绘制
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        resolve(file); // fallback: 返回原文件
        return;
      }

      ctx.drawImage(img, 0, 0, width, height);

      canvas.toBlob(
        (blob) => {
          if (!blob) {
            resolve(file);
            return;
          }

          // 如果压缩后反而更大，返回原文件
          if (blob.size >= file.size) {
            resolve(file);
            return;
          }

          const compressed = new File([blob], file.name, {
            type: opts.outputType,
            lastModified: Date.now(),
          });
          resolve(compressed);
        },
        opts.outputType,
        opts.quality
      );
    };

    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('图片加载失败'));
    };

    img.src = url;
  });
}

/**
 * 检查图片文件是否在允许的类型和大小范围内
 */
export function validateImage(
  file: File,
  options: { maxSize?: number; allowedTypes?: string[] } = {}
): { valid: boolean; error?: string } {
  const { maxSize = 5 * 1024 * 1024, allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'] } = options;

  if (!allowedTypes.includes(file.type)) {
    const allowed = allowedTypes.map(t => t.split('/')[1].toUpperCase()).join('、');
    return { valid: false, error: `不支持的图片格式，请上传 ${allowed} 格式的图片` };
  }

  if (file.size > maxSize) {
    const maxMB = (maxSize / (1024 * 1024)).toFixed(0);
    return { valid: false, error: `图片大小不能超过 ${maxMB}MB` };
  }

  return { valid: true };
}
