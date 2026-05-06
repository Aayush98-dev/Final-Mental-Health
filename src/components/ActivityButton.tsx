import { PlayCircle } from 'lucide-react';
import { cn } from '../lib/utils';

interface ActivityButtonProps {
  onClick: () => void;
  className?: string;
  label?: string;
}

export default function ActivityButton({ onClick, className, label = "Do Activity" }: ActivityButtonProps) {
  return (
    <button 
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        onClick();
      }}
      className={cn(
        "flex items-center gap-2 px-6 py-3 bg-brand-dark text-white rounded-xl font-bold hover:bg-brand-dark/90 transition-all active:scale-95 shadow-lg hover:shadow-brand-dark/20",
        className
      )}
    >
      <PlayCircle className="w-5 h-5" />
      {label}
    </button>
  );
}
