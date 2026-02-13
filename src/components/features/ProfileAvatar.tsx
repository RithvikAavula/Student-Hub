import { useState } from 'react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Dialog, DialogContent, DialogTrigger } from '@/components/ui/dialog';
import { cn } from '@/lib/utils';
import { X, ZoomIn } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface ProfileAvatarProps {
  src?: string | null;
  name: string;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl';
  className?: string;
  fallbackClassName?: string;
  clickable?: boolean;
  showOnlineStatus?: boolean;
  isOnline?: boolean;
  ring?: boolean;
  ringColor?: string;
}

const sizeClasses = {
  xs: 'h-6 w-6 text-[10px]',
  sm: 'h-8 w-8 text-xs',
  md: 'h-10 w-10 text-sm',
  lg: 'h-12 w-12 text-base',
  xl: 'h-16 w-16 text-lg',
  '2xl': 'h-24 w-24 text-2xl',
};

const onlineIndicatorSizes = {
  xs: 'h-1.5 w-1.5 border',
  sm: 'h-2 w-2 border',
  md: 'h-2.5 w-2.5 border-2',
  lg: 'h-3 w-3 border-2',
  xl: 'h-4 w-4 border-2',
  '2xl': 'h-5 w-5 border-2',
};

export default function ProfileAvatar({
  src,
  name,
  size = 'md',
  className,
  fallbackClassName,
  clickable = true,
  showOnlineStatus = false,
  isOnline = false,
  ring = false,
  ringColor = 'ring-primary/50',
}: ProfileAvatarProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [imageError, setImageError] = useState(false);

  const getInitials = (fullName: string) => {
    if (!fullName) return '?';
    const parts = fullName.trim().split(/\s+/);
    if (parts.length === 1) {
      return parts[0].charAt(0).toUpperCase();
    }
    return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
  };

  const avatarContent = (
    <div className="relative">
      <Avatar
        className={cn(
          sizeClasses[size],
          'select-none',
          ring && 'ring-2',
          ring && ringColor,
          clickable && src && !imageError && 'cursor-pointer hover:opacity-90 transition-opacity',
          className
        )}
      >
        {src && !imageError ? (
          <AvatarImage
            src={src}
            alt={name}
            className="object-cover object-center"
            onError={() => setImageError(true)}
          />
        ) : null}
        <AvatarFallback
          className={cn(
            'bg-gradient-to-br from-primary/80 to-primary text-primary-foreground font-semibold',
            fallbackClassName
          )}
        >
          {getInitials(name)}
        </AvatarFallback>
      </Avatar>
      {showOnlineStatus && (
        <span
          className={cn(
            'absolute bottom-0 right-0 rounded-full border-background',
            onlineIndicatorSizes[size],
            isOnline ? 'bg-green-500' : 'bg-gray-400'
          )}
        />
      )}
    </div>
  );

  // If not clickable or no image, just render the avatar
  if (!clickable || !src || imageError) {
    return avatarContent;
  }

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <button
          type="button"
          aria-label={`View ${name}'s profile picture`}
          className="outline-none focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 rounded-full"
        >
          {avatarContent}
        </button>
      </DialogTrigger>
      <DialogContent className="max-w-[95vw] sm:max-w-[90vw] md:max-w-[80vw] lg:max-w-[70vw] p-0 bg-black/95 border-0 overflow-hidden">
        <div className="relative flex items-center justify-center min-h-[50vh] max-h-[90vh]">
          {/* Close button */}
          <Button
            variant="ghost"
            size="icon"
            className="absolute top-2 right-2 z-10 text-white hover:bg-white/20 rounded-full"
            onClick={() => setIsOpen(false)}
          >
            <X className="h-5 w-5" />
          </Button>

          {/* User info */}
          <div className="absolute top-3 left-4 z-10 flex items-center gap-3">
            <Avatar className="h-10 w-10 border-2 border-white/30">
              <AvatarImage src={src} alt={name} className="object-cover" />
              <AvatarFallback className="bg-primary text-primary-foreground text-sm">
                {getInitials(name)}
              </AvatarFallback>
            </Avatar>
            <span className="text-white font-medium text-lg drop-shadow-lg">{name}</span>
          </div>

          {/* Full image */}
          <img
            src={src}
            alt={`${name}'s profile picture`}
            className="max-h-[85vh] max-w-full w-auto h-auto object-contain rounded-lg shadow-2xl"
            style={{ margin: '60px 20px 20px 20px' }}
          />

          {/* Zoom hint */}
          <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 flex items-center gap-2 text-white/60 text-sm">
            <ZoomIn className="h-4 w-4" />
            <span>Click outside to close</span>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
