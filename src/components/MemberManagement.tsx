"use client";

import { motion, AnimatePresence } from "framer-motion";
import { UserCheck, UserX, Search, ShieldCheck, Mail, ShieldAlert } from "lucide-react";
import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";

export function MemberManagement() {
  const [members, setMembers] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchMembers();
    const sub = supabase.channel('member-updates').on('postgres_changes', { event: '*', schema: 'public', table: 'profiles' }, fetchMembers).subscribe();
    return () => { supabase.removeChannel(sub); };
  }, []);

  const fetchMembers = async () => {
    const { data } = await supabase.from('profiles').select('*').order('name');
    if (data) setMembers(data);
    setIsLoading(false);
  };

  const toggleAccess = async (id: string, currentStatus: boolean) => {
    const { error } = await supabase.from('profiles').update({ is_allowed: !currentStatus }).eq('id', id);
    if (!error) fetchMembers();
  };

  const filteredMembers = members.filter(m => 
    m.name?.toLowerCase().includes(searchTerm.toLowerCase()) || 
    m.team_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    m.email?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div style={{ maxWidth: '1000px', margin: '0 auto' }}>
      <div style={{ marginBottom: '32px', display: 'flex', flexDirection: 'column', gap: '24px' }}>
        <div>
          <h2 style={{ fontSize: '28px', fontFamily: "'Bodoni Moda', serif", color: '#53372b', fontWeight: '900', margin: 0, textTransform: 'uppercase' }}>Client Access Control</h2>
          <p style={{ color: 'rgba(83, 55, 43, 0.4)', fontSize: '14px', marginTop: '4px' }}>Manage platform permissions and login authorization.</p>
        </div>
        <div style={{ position: 'relative', width: '100%', maxWidth: '400px' }}>
          <Search size={18} style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)', color: 'rgba(83, 55, 43, 0.3)' }} />
          <input 
            type="text" 
            placeholder="Search elite members..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{ padding: '14px 20px 14px 48px', borderRadius: '16px', border: '1px solid rgba(198, 198, 198, 0.3)', background: 'var(--hb-cream)', width: '100%', outline: 'none', fontSize: '14px', color: '#53372b' }}
          />
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '16px' }}>
        <AnimatePresence mode="popLayout">
          {filteredMembers.map((member) => (
            <motion.div
              key={member.id}
              layout
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="premium-card"
              style={{ display: 'flex', flexDirection: 'column', gap: '20px', padding: '24px' }}
            >
               <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                    <div style={{ width: '48px', height: '48px', borderRadius: '14px', background: 'rgba(237, 224, 208, 0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px', fontWeight: 'bold', color: '#53372b' }}>
                      {member.name?.[0] || 'U'}
                    </div>
                    <div>
                      <h4 style={{ margin: 0, fontSize: '16px', fontWeight: 'bold', color: '#53372b' }}>{member.name}</h4>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '2px', color: 'rgba(83, 55, 43, 0.4)', fontSize: '10px' }}>
                        <Mail size={10} />
                        {member.email || 'No email synced'}
                      </div>
                    </div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', justifyContent: 'flex-end' }}>
                      {member.is_allowed !== false ? <ShieldCheck size={12} color="#6f8e7c" /> : <ShieldAlert size={12} color="#d27440" />}
                      <span style={{ fontSize: '10px', fontWeight: 'bold', color: member.is_allowed !== false ? '#6f8e7c' : '#d27440', textTransform: 'uppercase' }}>
                        {member.is_allowed !== false ? 'Active' : 'Revoked'}
                      </span>
                    </div>
                  </div>
               </div>

               <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderTop: '1px solid rgba(83, 55, 43, 0.05)', paddingTop: '16px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <span style={{ fontSize: '10px', fontWeight: '900', color: '#9f4022', textTransform: 'uppercase', letterSpacing: '0.1em' }}>{member.team_name || 'Independent'}</span>
                    <span style={{ width: '3px', height: '3px', borderRadius: '50%', background: 'rgba(0,0,0,0.1)' }} />
                    <span style={{ fontSize: '10px', color: 'rgba(83, 55, 43, 0.4)', fontWeight: 'bold' }}>{member.points} PTS</span>
                  </div>
                  
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => toggleAccess(member.id, member.is_allowed !== false)}
                    style={{ 
                      padding: '8px 16px', 
                      borderRadius: '10px', 
                      border: 'none', 
                      backgroundColor: member.is_allowed !== false ? 'rgba(210, 116, 64, 0.1)' : '#6f8e7c',
                      color: member.is_allowed !== false ? '#d27440' : 'white',
                      fontSize: '10px',
                      fontWeight: 'bold',
                      textTransform: 'uppercase',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px'
                    }}
                  >
                    {member.is_allowed !== false ? <UserX size={14} /> : <UserCheck size={14} />}
                    {member.is_allowed !== false ? 'Deactivate' : 'Activate'}
                  </motion.button>
               </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </div>
  );
}
