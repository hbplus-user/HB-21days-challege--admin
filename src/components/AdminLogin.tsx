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
    <div style={{ 
      position: 'fixed', 
      inset: 0, 
      zIndex: 1000, 
      backgroundColor: '#fcfaf5', 
      display: 'flex', 
      alignItems: 'center', 
      justifyContent: 'center', 
      padding: '32px', 
      overflow: 'hidden',
      fontFamily: "'Outfit', sans-serif"
    }}>
        {/* Background Atmosphere - Premium mesh and blobs */}
        <div style={{ position: 'absolute', inset: 0, opacity: 0.4, pointerEvents: 'none' }}>
            <div style={{ position: 'absolute', top: '-10%', left: '-10%', width: '70%', height: '70%', borderRadius: '50%', background: 'radial-gradient(circle, rgba(159,64,34,0.15) 0%, transparent 70%)', filter: 'blur(80px)' }} />
            <div style={{ position: 'absolute', bottom: '-10%', right: '-10%', width: '60%', height: '60%', borderRadius: '50%', background: 'radial-gradient(circle, rgba(116,116,64,0.1) 0%, transparent 70%)', filter: 'blur(100px)' }} />
            <div style={{ position: 'absolute', inset: 0, backgroundImage: 'url("data:image/svg+xml,%3Csvg width=\'60\' height=\'60\' viewBox=\'0 0 60 60\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cg fill=\'none\' fill-rule=\'evenodd\'%3E%3Cg fill=\'%239f4022\' fill-opacity=\'0.03\'%3E%3Cpath d=\'M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2v-4h4v-2h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2v-4h4v-2H6z\'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")', opacity: 0.5 }} />
        </div>

        <motion.div 
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ duration: 1, ease: [0.19, 1, 0.22, 1] }}
          style={{ 
            maxWidth: '480px', 
            width: '100%', 
            position: 'relative', 
            zIndex: 10 
          }}
        >
          <div style={{ 
            backgroundColor: 'rgba(255, 255, 255, 0.8)', 
            borderRadius: '48px', 
            padding: '60px 48px', 
            boxShadow: '0 40px 100px rgba(83,55,43,0.12)', 
            border: '1px solid rgba(255,255,255,0.7)', 
            backdropFilter: 'blur(20px)',
            position: 'relative',
            overflow: 'hidden'
          }}>
             {/* Subtle Inner Glow */}
             <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '1px', background: 'linear-gradient(90deg, transparent, rgba(159,64,34,0.2), transparent)' }} />
             
             {/* Icon Header with floating animation */}
             <motion.div 
               animate={{ y: [0, -10, 0] }}
               transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
               style={{ 
                 width: '88px', 
                 height: '88px', 
                 backgroundColor: '#fcfaf5', 
                 borderRadius: '32px', 
                 display: 'flex', 
                 alignItems: 'center', 
                 justifyContent: 'center', 
                 margin: '0 auto 48px auto', 
                 color: '#9f4022', 
                 boxShadow: 'inset 0 4px 12px rgba(83,55,43,0.05)', 
                 border: '1px solid rgba(159,64,34,0.1)' 
               }}
             >
               <Lock size={36} strokeWidth={1.5} />
             </motion.div>

             <div style={{ textAlign: 'center', marginBottom: '48px' }}>
                <motion.h1 
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3 }}
                  style={{ 
                    fontSize: '36px', 
                    fontFamily: "'Bodoni Moda', serif", 
                    color: '#53372b', 
                    marginBottom: '12px', 
                    letterSpacing: '-0.02em', 
                    textTransform: 'uppercase', 
                    fontWeight: 900, 
                    fontStyle: 'italic' 
                  }}
                >
                  Control Tower
                </motion.h1>
                <motion.p 
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.5 }}
                  style={{ 
                    color: 'rgba(83,55,43,0.5)', 
                    fontSize: '14px', 
                    fontWeight: 500, 
                    letterSpacing: '0.01em', 
                    lineHeight: '1.6', 
                    maxWidth: '280px', 
                    margin: '0 auto' 
                  }}
                >
                  Secure gateway for authorized HB+ Fitness Performance Systems.
                </motion.p>
             </div>

             <AnimatePresence mode="wait">
               {error && (
                 <motion.div 
                   initial={{ opacity: 0, height: 0, y: -10 }}
                   animate={{ opacity: 1, height: 'auto', y: 0 }}
                   exit={{ opacity: 0, height: 0 }}
                   style={{ 
                     marginBottom: '32px', 
                     padding: '20px', 
                     backgroundColor: 'rgba(159,64,34,0.05)', 
                     borderRadius: '20px', 
                     display: 'flex', 
                     alignItems: 'center', 
                     gap: '12px', 
                     color: '#9f4022', 
                     fontSize: '12px', 
                     fontWeight: 700,
                     border: '1px solid rgba(159,64,34,0.1)'
                   }}
                 >
                   <ShieldAlert size={18} />
                   {error}
                 </motion.div>
               )}
             </AnimatePresence>

             <motion.button
               whileHover={{ scale: 1.02, backgroundColor: '#8a351a' }}
               whileTap={{ scale: 0.98 }}
               onClick={handleGoogleLogin}
               disabled={isLoggingIn}
               style={{ 
                 width: '100%', 
                 backgroundColor: '#9f4022', 
                 color: 'white', 
                 display: 'flex', 
                 alignItems: 'center', 
                 justifyContent: 'center', 
                 gap: '16px',
                 padding: '20px 32px', 
                 borderRadius: '24px', 
                 fontSize: '12px', 
                 letterSpacing: '0.25em', 
                 fontWeight: 900, 
                 textTransform: 'uppercase', 
                 border: 'none', 
                 cursor: 'pointer',
                 boxShadow: '0 20px 40px rgba(159,64,34,0.25)', 
                 transition: 'all 0.4s cubic-bezier(0.19, 1, 0.22, 1)' 
               }}
             >
               {isLoggingIn ? (
                 <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1, ease: 'linear' }}>
                    <div style={{ width: '16px', height: '16px', border: '2px solid white', borderTopColor: 'transparent', borderRadius: '50%' }} />
                 </motion.div>
               ) : (
                 <>
                   <span>Initiate Authentication</span>
                   <ChevronRight size={18} />
                 </>
               )}
             </motion.button>

             <div style={{ marginTop: '60px', paddingTop: '32px', borderTop: '1px solid rgba(83,55,43,0.05)', textAlign: 'center' }}>
                <p style={{ 
                  fontSize: '9px', 
                  color: 'rgba(83,55,43,0.3)', 
                  fontWeight: 900, 
                  textTransform: 'uppercase', 
                  letterSpacing: '0.4em' 
                }}>
                  HB+ Fit Integrity Systems
                </p>
             </div>
          </div>
        </motion.div>
    </div>
  );
}
