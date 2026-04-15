import { motion } from 'framer-motion';
import { User } from 'lucide-react';
import LazyImage from './LazyImage';

type AvatarSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl' | 'company' | 'mentor';

interface AvatarProps {
  src?: string;
  alt: string;
  size?: AvatarSize;
  className?: string;
  fallbackInitials?: string;
  useCDN?: boolean;
}

const sizeMap: Record<AvatarSize, number> = {
  xs: 24,
  sm: 32,
  md: 40,
  lg: 48,
  xl: 64,
  company: 80,
  mentor: 300,
};

export default function Avatar({
  src,
  alt,
  size = 'md',
  className = '',
  fallbackInitials,
  useCDN = true,
}: AvatarProps) {
  const dimension = sizeMap[size];

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.3 }}
      className={`relative inline-flex items-center justify-center overflow-hidden bg-primary-100 rounded-full ${className}`}
      style={{ width: dimension, height: dimension }}
    >
      {src ? (
        <LazyImage
          src={src}
          alt={alt}
          useCDN={useCDN}
          skeletonShape="circle"
          className="w-full h-full object-cover rounded-full"
          containerClassName="w-full h-full"
        />
      ) : fallbackInitials || alt ? (
        <span className="text-primary-700 font-semibold" style={{ fontSize: Math.max(dimension * 0.35, 12) }}>
          {fallbackInitials || getInitials(alt)}
        </span>
      ) : (
        <User className="text-primary-400" style={{ width: dimension * 0.5, height: dimension * 0.5 }} />
      )}
    </motion.div>
  );
}
