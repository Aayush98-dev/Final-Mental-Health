import { LucideIcon } from 'lucide-react';
import { cn } from '../lib/utils';
import { motion } from 'motion/react';

interface Category {
  label: string;
  icon: LucideIcon;
  emotion: string;
}

interface CategoryTabsProps {
  categories: Category[];
  activeTab: string;
  onTabChange: (label: string) => void;
}

export default function CategoryTabs({ categories, activeTab, onTabChange }: CategoryTabsProps) {
  return (
    <div className="relative group">
      <div className="flex gap-2 md:gap-4 overflow-x-auto pb-4 scrollbar-hide -mx-4 px-4 custom-scrollbar snap-x snap-mandatory">
        {categories.map((cat) => (
          <button 
            key={cat.label} 
            onClick={() => onTabChange(cat.label)}
            className={cn(
              "flex items-center gap-2.5 px-5 md:px-7 py-2.5 md:py-3.5 rounded-2xl transition-all whitespace-nowrap border relative group/tab snap-start",
              activeTab === cat.label 
                ? "text-brand-dark border-white shadow-lg scale-105 z-10" 
                : "bg-white/5 border-white/5 text-slate-500 hover:border-white/10 hover:bg-white/[0.07]"
            )}
          >
            {activeTab === cat.label && (
              <motion.div 
                layoutId="tabBackground"
                className="absolute inset-0 bg-white rounded-2xl -z-10"
                transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
              />
            )}
            <cat.icon className={cn(
              "w-4 h-4 md:w-5 md:h-5 transition-all duration-500",
              activeTab === cat.label ? "text-brand-dark scale-110" : "text-slate-600 group-hover/tab:scale-110 group-hover/tab:text-slate-400"
            )} />
            <span className={cn(
              "text-[9px] md:text-[10px] font-black uppercase tracking-[0.2em] relative z-10 transition-colors duration-500",
              activeTab === cat.label ? "text-brand-dark" : "text-slate-500"
            )}>
              {cat.label}
            </span>
          </button>
        ))}
      </div>
      
      {/* Scroll Indicators for mobile */}
      <div className="absolute right-0 top-0 bottom-4 w-12 bg-gradient-to-l from-brand-dark to-transparent pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity hidden md:block" />
    </div>
  );
}
