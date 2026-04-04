"use client";
import { Header } from "@/components/Header";
import { TabController } from "@/components/TabController";
import { AdminLogin } from "@/components/AdminLogin";
import { motion, AnimatePresence } from "framer-motion";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { User } from "@supabase/supabase-js";

const supabaseConfigured =
  typeof process !== 'undefined' &&
  !!process.env.NEXT_PUBLIC_SUPABASE_URL &&
  !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

export default function Home() {
  const [isLoading, setIsLoading] = useState(true);
  const [user, setUser] = useState<User | null>(null);
  const [isAuthorized, setIsAuthorized] = useState(false);

  useEffect(() => {
    console.log("[HB+ DEBUG] App bootstrapping...");
    if (!supabaseConfigured) {
      console.warn("[HB+ DEBUG] Supabase not configured. Keys missing from build/deployment.");
      setIsLoading(false);
      return;
    }

    // Safety timeout — never hang on loading forever
    const timeout = setTimeout(() => {
      console.warn("[HB+ DEBUG] Loading timeout reached (5s). Forcing render.");
      setIsLoading(false);
    }, 5000);

    // Check initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      console.log("[HB+ DEBUG] Session verified:", !!session);
      clearTimeout(timeout);
      validateUser(session?.user ?? null);
      setIsLoading(false);
    }).catch((err) => {
      console.error("[HB+ DEBUG] Auth check failed:", err);
      clearTimeout(timeout);
      setIsLoading(false);
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      validateUser(session?.user ?? null);
    });

    return () => {
      clearTimeout(timeout);
      subscription.unsubscribe();
    };
  }, []);

  const validateUser = async (user: User | null) => {
    if (user) {
      if (user.email?.endsWith("@hbplus.fit")) {
        setUser(user);
        setIsAuthorized(true);
      } else {
        // Sign out unauthorized users immediately
        await supabase.auth.signOut();
        setUser(null);
        setIsAuthorized(false);
        alert("Unauthorized Domain: Access limited to @hbplus.fit accounts.");
      }
    } else {
      setUser(null);
      setIsAuthorized(false);
    }
  };

  // Show env config error banner if Supabase is not configured (e.g. Vercel without env vars)
  if (!supabaseConfigured) {
    return (
      <div style={{ minHeight: '100vh', background: '#fcfaf5', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '40px' }}>
        <div style={{ background: 'white', borderRadius: '24px', padding: '48px', maxWidth: '540px', width: '100%', textAlign: 'center', boxShadow: '0 20px 60px rgba(0,0,0,0.08)', border: '1px solid rgba(159,64,34,0.1)' }}>
          <div style={{ fontSize: '40px', marginBottom: '16px' }}>⚠️</div>
          <h2 style={{ fontFamily: "'Bodoni Moda', serif", fontSize: '24px', color: '#9f4022', margin: '0 0 12px 0', textTransform: 'uppercase' }}>Configuration Required</h2>
          <p style={{ color: '#53372b', opacity: 0.6, fontSize: '14px', lineHeight: '1.6', marginBottom: '24px' }}>
            Supabase environment variables are not set. This admin panel requires database credentials to function.
          </p>
          <div style={{ background: '#fcfaf5', borderRadius: '12px', padding: '20px', textAlign: 'left', fontFamily: 'monospace', fontSize: '12px', color: '#53372b', marginBottom: '24px' }}>
            <p style={{ margin: '0 0 8px 0', fontWeight: 'bold', color: '#9f4022' }}>Add to Vercel → Settings → Environment Variables:</p>
            <p style={{ margin: '4px 0' }}>NEXT_PUBLIC_SUPABASE_URL = your-url</p>
            <p style={{ margin: '4px 0' }}>NEXT_PUBLIC_SUPABASE_ANON_KEY = your-key</p>
          </div>
          <p style={{ fontSize: '11px', color: 'rgba(83,55,43,0.4)', margin: 0, fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '0.2em' }}>HB+ Fit Integrity Systems</p>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="fixed inset-0 z-[200] bg-[#fcfaf5] flex items-center justify-center p-12">
        <div className="text-center">
           <motion.div 
             initial={{ opacity: 0, y: 10 }}
             animate={{ opacity: 1, y: 0 }}
             className="flex flex-col items-center"
           >
             <div className="w-20 h-20 rounded-[32px] bg-white flex items-center justify-center text-[#9f4022] shadow-inner border border-[#EDDEC8]/30 mb-10 overflow-hidden relative">
                <motion.div 
                   animate={{ y: ["100%", "0%", "-100%"] }}
                   transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                   className="absolute inset-0 bg-[#9f4022]/10"
                />
                <span className="text-xl font-editorial font-black italic">HB+</span>
             </div>
             <h2 className="text-[10px] font-black text-[#53372b]/30 uppercase tracking-[0.5em] animate-pulse">Initializing Control Tower</h2>
           </motion.div>
        </div>
      </div>
    );
  }

  return (
    <main className="min-h-screen relative overflow-hidden bg-[#fcfaf5]">
      <AnimatePresence mode="wait">
        {!isAuthorized ? (
          <AdminLogin key="auth" />
        ) : (
          <motion.div 
            key="dashboard"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <Header />
            <TabController />
          </motion.div>
        )}
      </AnimatePresence>
      
      {/* Dynamic Background Pattern */}
      <div className="fixed inset-0 pointer-events-none opacity-[0.03] select-none z-0"
           style={{ 
             backgroundImage: "url(\"data:image/svg+xml,%3Csvg width='100' height='100' viewBox='0 0 100 100' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M11 18c3.866 0 7-3.134 7-7s-3.134-7-7-7-7 3.134-7 7 3.134 7 7 7zm48 25c3.866 0 7-3.134 7-7s-3.134-7-7-7-7 3.134-7 7 3.134 7 7 7zm-43-7c1.657 0 3-1.343 3-3s-1.343-3-3-3-3 1.343-3 3 1.343 3 3 3zm63 31c1.657 0 3-1.343 3-3s-1.343-3-3-3-3 1.343-3 3 1.343 3 3 3zM34 90c1.657 0 3-1.343 3-3s-1.343-3-3-3-3 1.343-3 3 1.343 3 3 3zm56-76c1.657 0 3-1.343 3-3s-1.343-3-3-3-3 1.343-3 3 1.343 3 3 3zM12 86c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm28-65c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm23-11c2.76 0 5-2.24 5-5s-2.24-5-5-5-5 2.24-5 5 2.24 5 5 5zm-6 60c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm29 22c2.76 0 5-2.24 5-5s-2.24-5-5-5-5 2.24-5 5 2.24 5 5 5zM32 35c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm60-21c1.657 0 3-1.343 3-3s-1.343-3-3-3-3 1.343-3 3 1.343 3 3 3zM46 94c1.657 0 3-1.343 3-3s-1.343-3-3-3-3 1.343-3 3 1.343 3 3 3zM60 46c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm36 20c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zM8.5 46c1.105 0 2-.895 2-2s-.895-2-2-2-2 .895-2 2 .895 2 2 2zm37 38c1.105 0 2-.895 2-2s-.895-2-2-2-2 .895-2 2 .895 2 2 2zM90 60c1.657 0 3-1.343 3-3s-1.343-3-3-3-3 1.343-3 3 1.343 3 3 3zM6.5 18c1.105 0 2-.895 2-2s-.895-2-2-2-2 .895-2 2 .895 2 2 2zm31 4c1.657 0 3-1.343 3-3s-1.343-3-3-3-3 1.343-3 3 1.343 3 3 3zm32-13c1.105 0 2-.895 2-2s-.895-2-2-2-2 .895-2 2 .895 2 2 2zM91.5 5c1.105 0 2-.895 2-2s-.895-2-2-2-2 .895-2 2 .895 2 2 2z25 43c1.657 0 3-1.343 3-3s-1.343-3-3-3-3 1.343-3 3 1.343 3 3 3zm-7-26c1.105 0 2-.895 2-2s-.895-2-2-2-2 .895-2 2 .895 2 2 2zM22 6c1.105 0 2-.895 2-2s-.895-2-2-2-2 .895-2 2 .895 2 2 2z' fill='%2353372b' fill-opacity='1' fill-rule='evenodd'/%3E%3C/svg%3E\")",
           }} />
    </main>
  );
}
