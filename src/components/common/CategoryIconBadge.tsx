import React, { useState } from 'react';
import {
  Globe,
  Video,
  Instagram,
  Youtube,
  Facebook,
  Send,
  Twitter,
  Music,
  Layers,
  Sparkles,
  Share2,
  TrendingUp,
  MessageSquare
} from 'lucide-react';

interface CategoryIconBadgeProps {
  category?: {
    name?: string;
    icon?: string;
    image_url?: string | null;
  } | null;
  categoryName?: string;
  icon?: string;
  imageUrl?: string | null;
  fallbackName?: string;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
}

export const CategoryIconBadge: React.FC<CategoryIconBadgeProps> = ({
  category,
  categoryName,
  icon,
  imageUrl: directImageUrl,
  fallbackName = '',
  size = 'md',
  className = ''
}) => {
  const [imageError, setImageError] = useState(false);

  const rawName = categoryName || category?.name || fallbackName || '';
  const name = rawName.toLowerCase();
  const iconKey = (icon || category?.icon || '').toLowerCase();
  const imageUrl = directImageUrl !== undefined ? directImageUrl : category?.image_url;

  // Size mapping
  const sizeStyles = {
    xs: {
      wrapper: 'w-5 h-5 rounded-md text-[10px]',
      icon: 'w-3 h-3',
      img: 'w-5 h-5 rounded-md'
    },
    sm: {
      wrapper: 'w-6 h-6 rounded-md text-xs',
      icon: 'w-3.5 h-3.5',
      img: 'w-6 h-6 rounded-md'
    },
    md: {
      wrapper: 'w-8 h-8 rounded-lg text-xs',
      icon: 'w-4 h-4',
      img: 'w-8 h-8 rounded-lg'
    },
    lg: {
      wrapper: 'w-10 h-10 rounded-xl text-sm',
      icon: 'w-5 h-5',
      img: 'w-10 h-10 rounded-xl'
    },
    xl: {
      wrapper: 'w-14 h-14 rounded-2xl text-base',
      icon: 'w-7 h-7',
      img: 'w-14 h-14 rounded-2xl'
    }
  };

  const currentSize = sizeStyles[size] || sizeStyles.md;

  // If valid image_url and not failed to load
  if (imageUrl && !imageError) {
    return (
      <div className={`relative shrink-0 overflow-hidden flex items-center justify-center bg-slate-900 border border-slate-700/60 shadow-sm ${currentSize.wrapper} ${className}`}>
        <img
          src={imageUrl}
          alt={category?.name || fallbackName}
          onError={() => setImageError(true)}
          className={`${currentSize.img} object-cover w-full h-full`}
        />
      </div>
    );
  }

  // Brand specific fallback styling
  if (name.includes('tiktok') || iconKey === 'tiktok') {
    return (
      <div className={`shrink-0 flex items-center justify-center bg-[#010101] text-cyan-400 border border-cyan-500/30 shadow-xs shadow-rose-500/10 ${currentSize.wrapper} ${className}`} title={category?.name}>
        <Video className={`${currentSize.icon} text-cyan-300`} />
      </div>
    );
  }

  if (name.includes('instagram') || iconKey === 'instagram') {
    return (
      <div className={`shrink-0 flex items-center justify-center bg-gradient-to-tr from-amber-500 via-rose-500 to-purple-600 text-white shadow-xs ${currentSize.wrapper} ${className}`} title={category?.name}>
        <Instagram className={currentSize.icon} />
      </div>
    );
  }

  if (name.includes('youtube') || iconKey === 'youtube') {
    return (
      <div className={`shrink-0 flex items-center justify-center bg-red-600 text-white shadow-xs shadow-red-600/30 ${currentSize.wrapper} ${className}`} title={category?.name}>
        <Youtube className={currentSize.icon} />
      </div>
    );
  }

  if (name.includes('facebook') || iconKey === 'facebook') {
    return (
      <div className={`shrink-0 flex items-center justify-center bg-[#1877F2] text-white shadow-xs ${currentSize.wrapper} ${className}`} title={category?.name}>
        <Facebook className={currentSize.icon} />
      </div>
    );
  }

  if (name.includes('telegram') || iconKey === 'telegram' || iconKey === 'send') {
    return (
      <div className={`shrink-0 flex items-center justify-center bg-[#229ED9] text-white shadow-xs ${currentSize.wrapper} ${className}`} title={category?.name}>
        <Send className={currentSize.icon} />
      </div>
    );
  }

  if (name.includes('twitter') || name.includes('x') || iconKey === 'twitter') {
    return (
      <div className={`shrink-0 flex items-center justify-center bg-[#111] text-white border border-slate-700 shadow-xs ${currentSize.wrapper} ${className}`} title={category?.name}>
        <Twitter className={currentSize.icon} />
      </div>
    );
  }

  if (name.includes('spotify') || iconKey === 'spotify' || iconKey === 'music') {
    return (
      <div className={`shrink-0 flex items-center justify-center bg-[#1DB954] text-black font-bold shadow-xs ${currentSize.wrapper} ${className}`} title={category?.name}>
        <Music className={currentSize.icon} />
      </div>
    );
  }

  if (name.includes('traffic') || name.includes('website') || iconKey === 'globe') {
    return (
      <div className={`shrink-0 flex items-center justify-center bg-sky-950 text-sky-400 border border-sky-800 shadow-xs ${currentSize.wrapper} ${className}`} title={category?.name}>
        <Globe className={currentSize.icon} />
      </div>
    );
  }

  // Default fallback
  return (
    <div className={`shrink-0 flex items-center justify-center bg-slate-800 text-slate-300 border border-slate-700 shadow-xs ${currentSize.wrapper} ${className}`} title={category?.name}>
      <Layers className={currentSize.icon} />
    </div>
  );
};
