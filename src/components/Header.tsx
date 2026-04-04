import { motion, useScroll, useTransform } from "framer-motion";
import { Bell, LayoutDashboard, LogOut } from "lucide-react";
import { supabase } from "@/lib/supabase";

export function Header() {
  const { scrollY } = useScroll();
  const backgroundY = useTransform(scrollY, [0, 100], ["rgba(255, 255, 255, 0)", "rgba(255, 255, 255, 0.4)"]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
  };

  return (
    <motion.header 
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.8, ease: "easeOut" }}
      style={{ 
        backgroundColor: backgroundY, 
        backdropFilter: 'blur(20px)',
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        zIndex: 100,
        padding: '32px 40px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        borderBottom: '1px solid rgba(198, 198, 198, 0.2)'
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '40px' }}>
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <h1 style={{ 
            fontSize: '24px', 
            fontFamily: "'Bodoni Moda', serif", 
            fontWeight: 'bold', 
            color: '#53372b', 
            display: 'flex', 
            alignItems: 'center', 
            gap: '12px',
            margin: 0,
            letterSpacing: '0.05em'
          }}>
            <span style={{ 
              width: '36px', 
              height: '36px', 
              borderRadius: '12px', 
              backgroundColor: '#9f4022', 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center', 
              color: 'white'
            }}>
              <LayoutDashboard size={20} />
            </span>
            CONTROL TOWER
          </h1>
          <p style={{ 
            fontSize: '11px', 
            fontWeight: 'bold', 
            color: 'rgba(159, 64, 34, 0.6)', 
            letterSpacing: '0.2em', 
            textTransform: 'uppercase', 
            marginTop: '4px',
            paddingLeft: '48px',
            margin: 0
          }}>
            Admin Operations Panel
          </p>
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '32px' }}>
        <motion.button 
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.9 }}
          style={{ 
            width: '44px', 
            height: '44px', 
            borderRadius: '50%', 
            backgroundColor: 'rgba(255, 255, 255, 0.6)', 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center', 
            color: 'rgba(83, 55, 43, 0.6)',
            border: '1px solid rgba(198, 198, 198, 0.3)',
            position: 'relative',
            cursor: 'pointer'
          }}
        >
          <Bell size={20} />
          <span style={{ 
            position: 'absolute', 
            top: '10px', 
            right: '10px', 
            width: '10px', 
            height: '10px', 
            backgroundColor: '#9f4022', 
            borderRadius: '50%', 
            border: '2px solid white' 
          }} />
        </motion.button>
        
        <div style={{ display: 'flex', alignItems: 'center', gap: '20px', paddingLeft: '32px', borderLeft: '1px solid rgba(83, 55, 43, 0.1)' }}>
          <div style={{ textAlign: 'right' }}>
            <p style={{ fontSize: '11px', fontWeight: 'bold', color: '#53372b', textTransform: 'uppercase', margin: 0 }}>Fleet Admiral</p>
            <p style={{ fontSize: '9px', color: 'rgba(159, 64, 34, 0.6)', fontWeight: 'bold', textTransform: 'uppercase', margin: 0, marginTop: '2px' }}>Pradhan R.</p>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <motion.div 
              whileHover={{ scale: 1.05 }}
              style={{ 
                width: '44px', 
                height: '44px', 
                borderRadius: '14px', 
                background: 'linear-gradient(to bottom right, #ede0d0, #ffffff)', 
                padding: '2px', 
                border: '1px solid rgba(198, 198, 198, 0.5)',
                overflow: 'hidden'
              }}
            >
              <img 
                 src="https://api.dicebear.com/7.x/notionists/svg?seed=admin&backgroundColor=ede0d0" 
                 alt="Admin" 
                 style={{ width: '100%', height: '100%', borderRadius: '12px', objectFit: 'cover' }}
              />
            </motion.div>
            <motion.button 
              onClick={handleLogout}
              whileHover={{ scale: 1.1, backgroundColor: 'rgba(210, 116, 64, 0.1)', color: '#d27440' }}
              whileTap={{ scale: 0.9 }}
              style={{ 
                width: '40px', 
                height: '40px', 
                borderRadius: '12px', 
                backgroundColor: 'transparent', 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'center', 
                color: 'rgba(83, 55, 43, 0.4)',
                border: '1px solid rgba(198, 198, 198, 0.3)',
                cursor: 'pointer',
                transition: 'all 0.3s ease'
              }}
            >
               <LogOut size={18} />
            </motion.button>
          </div>
        </div>
      </div>
    </motion.header>
  );
}
