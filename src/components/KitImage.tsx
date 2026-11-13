import { useState } from 'react';
import { Cross } from 'lucide-react';

interface KitImageProps {
  src: string;
  alt: string;
  code: string;
}

export function KitImage({ src, alt, code }: KitImageProps) {
  const [hasError, setHasError] = useState(false);

  if (hasError) {
    return (
      <div className="w-full h-full bg-gradient-to-br from-slate-100 via-teal-50/60 to-slate-100 flex flex-col items-center justify-center p-4 text-center">
        <div className="w-11 h-11 rounded-xl bg-teal-600/10 text-teal-700 flex items-center justify-center mb-2">
          <Cross className="w-5 h-5" />
        </div>
        <span className="text-xs font-mono font-medium text-slate-600">{code}</span>
      </div>
    );
  }

  return (
    <img
      src={src}
      alt={alt}
      referrerPolicy="no-referrer"
      onError={() => setHasError(true)}
      className="w-full h-full object-cover"
    />
  );
}
