"use client";

import { motion, AnimatePresence } from "framer-motion";
import { Check, X, Clock, Trophy, LayoutGrid, BarChart3, Users2, FileCheck2, Settings2, UserCog } from "lucide-react";
import { useState, useEffect } from "react";
import { DashboardOverview } from "@/components/DashboardOverview";
import { TeamManagement } from "@/components/TeamManagement";
import { TaskManagement } from "@/components/TaskManagement";
import { AnalyticsDashboard } from "@/components/AnalyticsDashboard";
import { MemberManagement } from "@/components/MemberManagement";
import { supabase } from "@/lib/supabase";

// --- SUB-COMPONENTS ---

function ApprovalsQueue() {
  const [submissions, setSubmissions] = useState<any[]>([]);
  const [processed, setProcessed] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchSubmissions();
    const channel = supabase.channel('submissions-review').on('postgres_changes', { event: '*', schema: 'public', table: 'submissions' }, fetchSubmissions).subscribe();
    return () => { supabase.removeChannel(channel); };
  }, []);

  const fetchSubmissions = async () => {
    const { data: pending } = await supabase.from('submissions').select('*, profiles (id, name, team_name), tasks (title, proof_type, points), flashcards (text, points)').eq('status', 'under-review');
    const { data: recent } = await supabase.from('submissions').select('*, profiles (id, name, team_name), tasks (title, proof_type, points), flashcards (text, points)').neq('status', 'under-review').order('created_at', { ascending: false }).limit(10);
    if (pending) setSubmissions(pending);
    if (recent) setProcessed(recent);
    setIsLoading(false);
  };

  const handleStatusUpdate = async (subId: string, status: 'approved' | 'rejected' | 'retry', userId: string, pts: number = 0) => {
    try {
        let comment = null;
        if (status === 'retry') {
            comment = prompt("Instruction for Re-upload? (e.g. Blurry photo)");
            if (!comment) return;
        } else if (status === 'rejected') {
            if (!confirm("Are you sure? This is a PERMANENT REJECT and they cannot resubmit.")) return;
            comment = prompt("Why was this permanently rejected?");
        }

        const { error: subErr } = await supabase.from('submissions').update({ 
            status, 
            rejection_comment: comment 
        }).eq('id', subId);
        
        if (subErr) throw subErr;

        if (status === 'approved') {
            const { data: profile } = await supabase.from('profiles').select('points').eq('id', userId).single();
            await supabase.from('profiles').update({ points: (profile?.points || 0) + pts }).eq('id', userId);
        }
        fetchSubmissions();
    } catch (e: any) {
        console.error('Approval Error:', e);
        alert(`Approval Failed! Error: ${e.message}`);
    }
  };

  const stats = {
    pending: submissions.length,
    passed: processed.filter(s => s.status === 'approved').length,
    rejected: processed.filter(s => s.status === 'rejected').length,
    resubmit: processed.filter(s => s.status === 'retry').length,
  };

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
      <div className="responsive-grid" style={{ marginBottom: '48px' }}>
         {[
           { label: 'Pending Review', value: stats.pending, color: '#53372b', bg: '#f5f2e9', icon: Clock },
           { label: 'Approved', value: stats.passed, color: '#6f8e7c', bg: 'rgba(111, 142, 124, 0.1)', icon: Check },
           { label: 'Resubmit', value: stats.resubmit, color: '#c99d5d', bg: 'rgba(201, 157, 93, 0.1)', icon: Clock },
           { label: 'Rejected', value: stats.rejected, color: '#d27440', bg: 'rgba(210, 116, 64, 0.1)', icon: X },
         ].map((stat, i) => (
           <motion.div key={i} className="premium-card" style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
              <div style={{ width: '48px', minWidth: '48px', height: '48px', borderRadius: '12px', background: stat.bg, color: stat.color, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><stat.icon size={20} /></div>
              <div><p style={{ margin: 0, fontSize: '10px', color: 'rgba(83, 55, 43, 0.4)', fontWeight: 'bold' }}>{stat.label}</p><p style={{ margin: 0, fontSize: '24px', fontWeight: 'bold' }}>{stat.value}</p></div>
           </motion.div>
         ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '24px', marginBottom: '80px' }}>
        <AnimatePresence mode="popLayout">
          {submissions.map((sub) => (
            <motion.div key={sub.id} layout initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }} className="premium-card">
               <div style={{ height: '240px', background: 'rgba(83, 55, 43, 0.05)', borderRadius: '12px', marginBottom: '24px', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                   {sub.file_url ? (
                      sub.file_url.toLowerCase().match(/\.(mp4|webm|ogg|mov)$/) || sub.tasks?.proof_type === 'video' ? (
                         <video src={sub.file_url} controls style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      ) : (
                         <img 
                           src={sub.file_url} 
                           alt="Proof" 
                           onError={(e) => { (e.target as any).src = 'https://via.placeholder.com/400x300?text=Error+Loading+Image'; }}
                           style={{ width: '100%', height: '100%', objectFit: 'cover' }} 
                         />
                      )
                   ) : (
                      <span style={{ opacity: 0.3, fontSize: '12px' }}>No media uploaded</span>
                   )}
               </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '24px' }}>
                 <div>
                    <p style={{ margin: '0 0 4px 0', fontSize: '10px', fontWeight: 'bold', color: '#9f4022', textTransform: 'uppercase' }}>
                      {sub.tasks?.title || `CHALLENGE: ${sub.flashcards?.text}`}
                    </p>
                    <h4 style={{ margin: 0 }}>{sub.profiles?.name}</h4>
                    <p style={{ margin: 0, fontSize: '11px', color: 'rgba(83, 55, 43, 0.4)' }}>{sub.profiles?.team_name}</p>
                 </div>
                 <div style={{ fontSize: '10px', color: 'rgba(0,0,0,0.3)' }}>{new Date(sub.created_at).toLocaleTimeString()}</div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px' }}>
                   <button 
                    onClick={() => handleStatusUpdate(sub.id, 'approved', sub.profiles?.id, sub.tasks?.points || sub.flashcards?.points || 0)} 
                    style={{ background: '#9f4022', color: 'white', border: 'none', padding: '8px', borderRadius: '8px', fontSize: '11px', fontWeight: 'bold', cursor: 'pointer' }}
                  >
                    Approve
                  </button>
                  <button 
                    onClick={() => handleStatusUpdate(sub.id, 'retry', sub.profiles?.id)} 
                    style={{ background: '#eee', border: 'none', padding: '8px', borderRadius: '8px', fontSize: '11px', cursor: 'pointer' }}
                  >
                    Try Again
                  </button>
                  <button 
                    onClick={() => handleStatusUpdate(sub.id, 'rejected', sub.profiles?.id)} 
                    style={{ background: '#f8d7da', color: '#721c24', border: 'none', padding: '8px', borderRadius: '8px', fontSize: '11px', fontWeight: 'bold', cursor: 'pointer' }}
                  >
                    Reject
                  </button>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </div>
  );
}

// --- MAIN CONTROLLER ---

const tabs = [
  { id: "home", label: "Home", icon: LayoutGrid },
  { id: "approvals", label: "Approvals", icon: FileCheck2 },
  { id: "members", label: "Members", icon: UserCog },
  { id: "teams", label: "Teams", icon: Users2 },
  { id: "tasks", label: "Tasks", icon: Settings2 },
  { id: "analytics", label: "Analytics", icon: BarChart3 },
];

export function TabController() {
  const [activeTab, setActiveTab] = useState("home");

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto', paddingTop: '120px', paddingLeft: '20px', paddingRight: '20px' }}>
      <nav style={{ display: 'flex', justifyContent: 'center', marginBottom: '40px', overflowX: 'auto', paddingBottom: '16px' }}>
        <div style={{ backgroundColor: 'rgba(255, 255, 255, 0.4)', backdropFilter: 'blur(10px)', padding: '6px', borderRadius: '9999px', border: '1px solid rgba(198, 198, 198, 0.2)', display: 'flex', gap: '4px', whiteSpace: 'nowrap' }}>
            {tabs.map((tab) => {
                const Icon = tab.icon;
                return (
                    <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id)}
                        style={{
                            padding: '10px 20px',
                            backgroundColor: activeTab === tab.id ? '#9f4022' : 'transparent',
                            color: activeTab === tab.id ? 'white' : 'rgba(83, 55, 43, 0.6)',
                            borderRadius: '9999px',
                            border: 'none',
                            fontSize: '11px',
                            fontWeight: 'bold',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px'
                        }}
                    >
                        <Icon size={14} />
                        <span className="md:inline hidden">{tab.label}</span>
                        {activeTab === tab.id && <span className="md:hidden inline">{tab.label}</span>}
                    </button>
                );
            })}
        </div>
      </nav>

      <motion.div key={activeTab} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
        {activeTab === "home" && <DashboardOverview />}
        {activeTab === "approvals" && <ApprovalsQueue />}
        {activeTab === "members" && <MemberManagement />}
        {activeTab === "teams" && <TeamManagement />}
        {activeTab === "tasks" && <TaskManagement />}
        {activeTab === "analytics" && <AnalyticsDashboard />}
      </motion.div>
    </div>
  );
}
