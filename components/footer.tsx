'use client';

import { motion } from 'motion/react';
import { Heart, Code, ShieldCheck } from 'lucide-react';

export function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="mt-auto py-8 px-4 sm:px-6 lg:px-8 border-t border-slate-200 bg-white/50 backdrop-blur-sm print:hidden">
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-col md:flex-row items-center justify-between gap-6">
          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-col items-center md:items-start gap-2"
          >
            <div className="flex items-center gap-2 text-slate-900 font-bold text-lg">
              <Code className="h-5 w-5 text-indigo-600" />
              <span>برمجة وتطوير : الاستاذ ايهاب جمال فزال</span>
            </div>
            <p className="text-slate-500 text-sm flex items-center gap-1">
              صنع بكل <Heart className="h-3 w-3 text-red-500 fill-red-500" /> لخدمة التعليم الرقمي
            </p>
          </motion.div>

          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="flex flex-col items-center md:items-end gap-2"
          >
            <div className="flex items-center gap-2 text-slate-700 font-medium">
              <ShieldCheck className="h-5 w-5 text-emerald-600" />
              <span>جميع الحقوق محفوظة © {currentYear}</span>
            </div>
            <div className="flex items-center gap-4 text-xs text-slate-400">
              <span className="hover:text-indigo-600 cursor-pointer transition-colors">سياسة الخصوصية</span>
              <span className="h-1 w-1 rounded-full bg-slate-300" />
              <span className="hover:text-indigo-600 cursor-pointer transition-colors">شروط الاستخدام</span>
              <span className="h-1 w-1 rounded-full bg-slate-300" />
              <span className="hover:text-indigo-600 cursor-pointer transition-colors">الدعم الفني</span>
            </div>
          </motion.div>
        </div>
        
        <div className="mt-8 pt-8 border-t border-slate-100 text-center">
          <p className="text-slate-400 text-[10px] uppercase tracking-widest">
            Digital School Management System • Version 2.0.0
          </p>
        </div>
      </div>
    </footer>
  );
}
