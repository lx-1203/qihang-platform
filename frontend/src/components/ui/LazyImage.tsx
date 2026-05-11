import { useState, useRef, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';

/**
 * 图片变体预设（尺寸规范）
 * - avatar: 圆形头像（企业Logo 80×80 / 导师头像 300×300）
 * - cover: 16:9 封面图（课程封面 400×225）
 * - banner: 全宽横幅（首页Banner 1920×600）
 * - default: 自适应（跟随父容器）
 */
type ImageVariant = 'avatar' | 'cover' | 'banner' | 'default';

const VARIANT_STYLES: Record<ImageVariant, string> = {
  avatar: 'rounded-full aspect-square',
  cover: 'rounded-xl aspect-video',
  banner: 'rounded-none w-full',
  default: '',
};

/** 默认占位图路径 */
const PLACEHOLDER_COVER = '/placeholder-cover.svg';

/** 最大重试次数 */
const MAX_RETRY = 1;

/** 重试延迟（毫秒） */
const RETRY_DELAY = 3000;

interface LazyImageProps extends React.ImgHTMLAttributes<HTMLImageElement> {
  src: string;
  alt: string;
  placeholder?: string;
  /** 容器样式 */
  containerClassName?: string;
  /** 是否使用 CDN（自动拼接 VITE_CDN_URL） */
  useCDN?: boolean;
  /** 骨架屏形状（已弃用，请使用 variant） */
  skeletonShape?: 'rectangle' | 'circle';
  /** 图片变体预设：avatar(圆形) / cover(16:9) / banner(全宽) / default(自适应) */
  variant?: ImageVariant;
}

/**
 * 懒加载图片组件
 * 使用 IntersectionObserver 监听元素进入视口，再加载图片
 * 可降低初始页面加载带宽消耗 40-60%
 * 带有灰色骨架屏和错误占位图
 * 失败后自动重试一次（3秒延迟）
 */
export default function LazyImage({
  src,
  alt,
  placeholder,
  containerClassName,
  className,
  useCDN = true,
  skeletonShape,
  variant = 'default',
  ...props
}: LazyImageProps) {
  const [imageSrc, setImageSrc] = useState<string | undefined>(undefined);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState(false);
  const [placeholderError, setPlaceholderError] = useState(false);
  const imgRef = useRef<HTMLImageElement>(null);
  const retryCountRef = useRef(0);
  const retryTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // 兼容旧版 skeletonShape prop
  const isCircle = variant === 'avatar' || skeletonShape === 'circle';
  const variantClass = VARIANT_STYLES[variant];
  const imageFitClass =
    variant === 'avatar' ? 'object-cover object-center' : variant === 'cover' ? 'object-cover' : '';

  // 拼接 CDN URL
  const getFullUrl = (url: string): string => {
    if (!useCDN) return url;
    const cdnUrl = import.meta.env.VITE_CDN_URL;
    if (!cdnUrl || cdnUrl.trim() === '') return url;
    if (url.startsWith('http://') || url.startsWith('https://')) return url;
    const cleanUrl = url.startsWith('/') ? url.slice(1) : url;
    return `${cdnUrl.replace(/\/$/, '')}/${cleanUrl}`;
  };

  /** 清除重试定时器并重置计数器 */
  const clearRetryTimer = useCallback(() => {
    if (retryTimerRef.current) {
      clearTimeout(retryTimerRef.current);
      retryTimerRef.current = null;
    }
    retryCountRef.current = 0;
  }, []);

  // src 变化时重置所有状态
  useEffect(() => {
    setError(false);
    setLoaded(false);
    setImageSrc(undefined);
    setPlaceholderError(false);
    clearRetryTimer();
  }, [src, clearRetryTimer]);

  // 组件卸载时清除定时器
  useEffect(() => {
    return () => {
      if (retryTimerRef.current) clearTimeout(retryTimerRef.current);
    };
  }, []);

  useEffect(() => {
    if (!imgRef.current) return;

    if (!window.IntersectionObserver) {
      setImageSrc(src);
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setImageSrc(src);
            observer.unobserve(entry.target);
          }
        });
      },
      {
        rootMargin: '200px 0px',
        threshold: 0.01,
      }
    );

    observer.observe(imgRef.current);
    return () => observer.disconnect();
  }, [src]);

  /** 图片加载错误处理：触发重试或标记为永久错误 */
  const handleError = useCallback(() => {
    const done = () => {
      setError(true);
      props.onError?.({} as React.SyntheticEvent<HTMLImageElement, Event>);
    };

    if (retryCountRef.current >= MAX_RETRY) {
      done();
      return;
    }

    retryCountRef.current++;
    retryTimerRef.current = setTimeout(() => {
      // 通过修改 imageSrc 触发重新加载
      const retryUrl = `${src}${src.includes('?') ? '&' : '?'}_retry=${retryCountRef.current}`;
      setImageSrc(retryUrl);
    }, RETRY_DELAY);
  }, [src, props.onError]);

  const showPlaceholder = !loaded && !error;

  return (
    <div className={`relative overflow-hidden ${variantClass} ${containerClassName ?? ''}`}>
      {/* 灰色骨架屏 pulse 动画 */}
      {showPlaceholder && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className={`absolute inset-0 bg-gray-200 ${
            isCircle ? 'rounded-full' : 'rounded-lg'
          }`}
          style={{
            animation: 'pulse-bg 2s ease-in-out infinite',
          }}
        >
          {placeholder ? (
            <img src={placeholder} alt="" className="w-8 h-8 opacity-40 m-auto absolute inset-0" />
          ) : null}
        </motion.div>
      )}

      {/* 错误占位图：使用 placeholder-cover.svg */}
      {error && !placeholderError && (
        <motion.img
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          src={PLACEHOLDER_COVER}
          alt="图片加载失败"
          className={`absolute inset-0 w-full h-full object-cover ${isCircle ? 'rounded-full' : ''}`}
          onError={() => setPlaceholderError(true)}
        />
      )}

      <motion.img
        ref={imgRef}
        src={imageSrc ? getFullUrl(imageSrc) : undefined}
        alt={alt}
        className={`${loaded ? 'opacity-100' : 'opacity-0'} ${variantClass} ${imageFitClass} ${className ?? ''}`}
        initial={{ opacity: 0, scale: 1.05 }}
        animate={{ opacity: loaded ? 1 : 0, scale: loaded ? 1 : 1.05 }}
        transition={{ duration: 0.4, ease: 'easeOut' }}
        onLoad={() => setLoaded(true)}
        onError={handleError}
        {...props}
      />
    </div>
  );
}
