"use client";
import { motion, AnimatePresence } from "framer-motion";
import { Lock, LogIn, ShieldAlert, ChevronRight } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useState } from "react";

export function AdminLogin() {
  const [error, setError] = useState<string | null>(null);
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  const handleGoogleLogin = async () => {
    setIsLoggingIn(true);
    setError(null);
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: window.location.origin,
          queryParams: {
            prompt: 'select_account'
          }
        }
      });
      if (error) throw error;
    } catch (err: any) {
      setError(err.message);
      setIsLoggingIn(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[1000] bg-[#fcfaf5] flex items-center justify-center p-8 overflow-hidden">
        {/* Background Atmosphere */}
        <div className="absolute top-0 left-0 w-full h-full opacity-30 pointer-events-none">
            <div className="absolute top-[-10%] left-[-10%] w-[60%] h-[60%] rounded-full bg-[#9f4022] blur-[120px] opacity-10" />
            <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] rounded-full bg-[#747440] blur-[100px] opacity-10" />
        </div>

        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="max-w-md w-full relative z-10"
        >
          <div className="bg-white rounded-[40px] p-12 shadow-[0_40px_80px_rgba(83,55,43,0.1)] border border-white/50 backdrop-blur-xl relative overflow-hidden">
             
             {/* Icon Header */}
             <div className="w-20 h-20 bg-[#fcfaf5] rounded-3xl flex items-center justify-center mx-auto mb-10 text-[#9f4022] shadow-[inset_0_4px_12px_rgba(0,0,0,0.05)] border border-[#EDDEC8]/30">
               <Lock size={32} />
             </div>

             <div className="text-center mb-12">
               <h1 className="text-3xl font-serif text-[#53372b] mb-4 tracking-tight uppercase font-black italic">Control Tower</h1>
               <p className="text-[#53372b]/50 text-sm font-medium leading-relaxed max-w-[280px] mx-auto">
                 Authorized HB+ Performance Systems Access only.
               </p>
             </div>

             <AnimatePresence mode="wait">
               {error && (
                 <motion.div 
                   initial={{ opacity: 0, height: 0 }}
                   animate={{ opacity: 1, height: 'auto' }}
                   exit={{ opacity: 0, height: 0 }}
                   className="mb-8 p-4 bg-red-50 border border-red-100 rounded-2xl flex items-center gap-3 text-red-600 text-xs font-bold"
                 >
                   <ShieldAlert size={16} />
                   {error}
                 </motion.div>
               )}
             </AnimatePresence>

             <motion.button
               whileHover={{ scale: 1.02 }}
               whileTap={{ scale: 0.98 }}
               onClick={handleGoogleLogin}
               disabled={isLoggingIn}
               className="w-full bg-[#9f4022] text-white flex items-center justify-between pl-8 pr-4 py-5 rounded-2xl text-[11px] tracking-[0.2em] font-black uppercase shadow-[0_20px_40px_rgba(159,64,34,0.2)] disabled:opacity-50 transition-all duration-300"
             >
               {isLoggingIn ? "Authenticating..." : "Sign in with Google"}
               <div className="w-10 h-10 bg-white/10 rounded-xl flex items-center justify-center">
                 <ChevronRight size={18} />
               </div>
             </motion.button>

             <div className="mt-12 pt-12 border-t border-[#fcfaf5]">
                <p className="text-[9px] text-[#53372b]/20 font-black tracking-[0.4em] uppercase text-center">HB+ Fit Integrity Systems</p>
             </div>
          </div>
        </motion.div>
    </div>
  );
}
