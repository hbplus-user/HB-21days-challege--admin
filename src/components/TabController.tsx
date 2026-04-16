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
  const [retryStates, setRetryStates] = useState<{ [id: string]: string }>({});
  const [totals, setTotals] = useState({ approved: 0, retry: 0, rejected: 0 });

  useEffect(() => {
    let timeout: NodeJS.Timeout;
    const debouncedFetch = () => {
        clearTimeout(timeout);
        timeout = setTimeout(fetchSubmissions, 1500);
    };

    fetchSubmissions();
    const channel = supabase.channel('submissions-review').on('postgres_changes', { event: '*', schema: 'public', table: 'submissions' }, debouncedFetch).subscribe();
    return () => { 
        supabase.removeChannel(channel); 
        clearTimeout(timeout);
    };
  }, []);

  const fetchSubmissions = async () => {
    // 1. Fetch real-time totals for each status
    const { count: approvedCount } = await supabase.from('submissions').select('*', { count: 'exact', head: true }).eq('status', 'approved');
    const { count: retryCount } = await supabase.from('submissions').select('*', { count: 'exact', head: true }).eq('status', 'retry');
    const { count: rejectedCount } = await supabase.from('submissions').select('*', { count: 'exact', head: true }).eq('status', 'rejected');

    setTotals({
        approved: approvedCount || 0,
        retry: retryCount || 0,
        rejected: rejectedCount || 0
    });

    // 2. Fetch pending queue
    const { data: pending } = await supabase.from('submissions').select('*, profiles (id, name, team_name), tasks (title, proof_type, points), flashcards (text, points)').eq('status', 'under-review');
    
    // 3. Keep showing recent processed for the visual log (optional)
    const { data: recent } = await supabase.from('submissions').select('*, profiles (id, name, team_name), tasks (title, proof_type, points), flashcards (text, points)').neq('status', 'under-review').order('created_at', { ascending: false }).limit(10);

    if (pending) setSubmissions(pending);
    if (recent) setProcessed(recent);
    setIsLoading(false);
  };

  const handleStatusUpdate = async (sub: any, status: 'approved' | 'retry', comment?: string) => {
    try {
        const subId = sub.id;
        const userId = sub.profiles?.id;
        const pts = sub.tasks?.points || sub.flashcards?.points || 0;

        // GET CURRENT ADMIN
        const { data: { user } } = await supabase.auth.getUser();
        let adminEmail = user?.email || 'Admin';

        const { error: subErr } = await supabase.from('submissions').update({ 
            status, 
            rejection_comment: comment || null,
            approved_by: adminEmail,
            processed_at: new Date().toISOString()
        }).eq('id', subId);
        
        if (subErr) throw subErr;

        if (status === 'approved') {
            // --- IDEMPOTENCY GUARD: Check if points were already awarded for this submission ---
            const { data: existingLedger } = await supabase
                .from('point_ledger')
                .select('id')
                .eq('source_id', subId.toString())
                .eq('user_id', userId)
                .maybeSingle();

            if (existingLedger) {
                // Points already credited for this submission — skip to avoid double-count
                console.warn(`[Approval Guard] Points already awarded for submission ${subId}. Skipping.`);
                alert('⚠️ Note: Points for this submission were already recorded. No duplicate credit applied.');
            } else {
                // 1. Fetch current profile total
                const { data: profile, error: fetchErr } = await supabase.from('profiles').select('points').eq('id', userId).single();
                if (fetchErr) throw new Error(`Could not fetch profile: ${fetchErr.message}`);

                // 2. Update Profile Total (only if not already credited)
                await supabase.from('profiles').update({ points: (profile.points || 0) + pts }).eq('id', userId);

                // 3. CAPTURE IN LEDGER (For backend audit)
                const { error: ledgerErr } = await supabase.from('point_ledger').insert({
                    user_id: userId,
                    points: pts,
                    source_type: sub.tasks ? 'task' : 'flashcard',
                    source_id: subId.toString(),
                    reason: sub.tasks?.title || sub.flashcards?.text || 'Challenge Submission',
                    day: sub.tasks?.day || null,
                    week: sub.tasks?.week || sub.flashcards?.week || null
                });
                if (ledgerErr) {
                    console.error('Ledger Error:', ledgerErr);
                    alert(`Ledger Audit Failed: ${ledgerErr.message}`);
                } else {
                    console.log('Ledger entry created successfully');
                    alert('Success: Ledger Entry Recorded!');
                }
            }
        }

        setRetryStates(prev => { const n = { ...prev }; delete n[subId]; return n; });
        fetchSubmissions();
    } catch (e: any) {
        console.error('Approval Error:', e);
        alert(`Approval Failed: ${e.message}`);
    }
  };

  const stats = {
    pending: submissions.length,
    passed: totals.approved,
    rejected: totals.rejected,
    resubmit: totals.retry,
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
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {retryStates[sub.id] !== undefined ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <textarea
                      autoFocus
                      placeholder="Enter instruction for client..."
                      value={retryStates[sub.id]}
                      onChange={(e) => setRetryStates(prev => ({ ...prev, [sub.id]: e.target.value }))}
                      style={{ width: '100%', padding: '10px', borderRadius: '10px', border: '1px solid rgba(159, 64, 34, 0.2)', fontSize: '12px', resize: 'none', minHeight: '70px', fontFamily: 'inherit', color: '#53372b', boxSizing: 'border-box' }}
                    />
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                      <button
                        onClick={() => setRetryStates(prev => { const n = { ...prev }; delete n[sub.id]; return n; })}
                        style={{ background: '#eee', border: 'none', padding: '8px', borderRadius: '8px', fontSize: '11px', cursor: 'pointer', fontWeight: 'bold' }}
                      >
                        Cancel
                      </button>
                      <button
                        onClick={() => handleStatusUpdate(sub, 'retry', retryStates[sub.id])}
                        disabled={!retryStates[sub.id]?.trim()}
                        style={{ background: retryStates[sub.id]?.trim() ? '#c99d5d' : '#eee', color: retryStates[sub.id]?.trim() ? 'white' : '#aaa', border: 'none', padding: '8px', borderRadius: '8px', fontSize: '11px', fontWeight: 'bold', cursor: retryStates[sub.id]?.trim() ? 'pointer' : 'default' }}
                      >
                        Send
                      </button>
                    </div>
                  </div>
                ) : (
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                    <button 
                      onClick={() => handleStatusUpdate(sub, 'approved')} 
                      style={{ background: '#9f4022', color: 'white', border: 'none', padding: '10px', borderRadius: '8px', fontSize: '11px', fontWeight: 'bold', cursor: 'pointer' }}
                    >
                      ✓ Approve
                    </button>
                    <button 
                      onClick={() => setRetryStates(prev => ({ ...prev, [sub.id]: '' }))}
                      style={{ background: '#eee', border: 'none', padding: '10px', borderRadius: '8px', fontSize: '11px', cursor: 'pointer', fontWeight: 'bold' }}
                    >
                      ↩ Try Again
                    </button>
                  </div>
                )}
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
