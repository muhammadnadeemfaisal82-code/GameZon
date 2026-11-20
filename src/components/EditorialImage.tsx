import { useState } from 'react';
import { Newspaper } from 'lucide-react';

interface EditorialImageProps {
  src?: string;
  alt: string;
  className?: string;
  aspectClassName?: string;
}

export function EditorialImage({
  src,
  alt,
  className = '',
  aspectClassName = 'aspect-[4/3]',
}: EditorialImageProps) {
  const [hasError, setHasError] = useState(false);

  if (!src || hasError) {
    return (
      <div
        className={`relative overflow-hidden bg-neutral-100 border border-neutral-200 flex flex-col items-center justify-center p-6 text-center ${aspectClassName} ${className}`}
        role="img"
        aria-label={alt}
      >
        <Newspaper className="w-7 h-7 text-neutral-400 mb-2" strokeWidth={1.5} />
        <p className="text-xs font-medium text-neutral-500 max-w-[22ch] line-clamp-2">
          {alt}
        </p>
      </div>
    );
  }

  return (
    <div className={`relative overflow-hidden bg-neutral-100 ${aspectClassName} ${className}`}>
      <img
        src={src}
        alt={alt}
        referrerPolicy="no-referrer"
        onError={() => setHasError(true)}
        className="w-full h-full object-cover transition-transform duration-300 ease-out group-hover:scale-[1.015]"
      />
    </div>
  );
}
