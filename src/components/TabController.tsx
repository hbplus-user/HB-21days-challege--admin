"use client";

import { motion, AnimatePresence } from "framer-motion";
import { Check, X, Clock, Trophy, LayoutGrid, BarChart3, Users2, FileCheck2, Settings2, UserCog } from "lucide-react";
import { useState, useEffect } from "react";
import { DashboardOverview } from "@/components/DashboardOverview";
import { TeamManagement } from "@/components/TeamManagement";
import { TaskManagement } from "@/components/TaskManagement";
import { AnalyticsDashboard } from "@/components/AnalyticsDashboard";
import { MemberManagement } from "@/components/MemberManagement";
import { getAllEntities, TABLES, upsertEntity } from "@/lib/azureDb";

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
    const interval = setInterval(fetchSubmissions, 30000); // Polling every 30s for Azure
    return () => { 
        clearTimeout(timeout);
        clearInterval(interval);
    };
  }, []);

  const fetchSubmissions = async () => {
    try {
      const allSubs = await getAllEntities(TABLES.SUBMISSIONS);
      const allTasks = await getAllEntities(TABLES.TASKS);
      const allFlashcards = await getAllEntities(TABLES.FLASHCARDS);
      const allProfiles = await getAllEntities(TABLES.PROFILES);

      const approvedCount = allSubs.filter(s => s.status === 'approved').length;
      const retryCount = allSubs.filter(s => s.status === 'retry').length;
      const rejectedCount = allSubs.filter(s => s.status === 'rejected').length;

      setTotals({
          approved: approvedCount,
          retry: retryCount,
          rejected: rejectedCount
      });

      const enrich = (sub: any) => {
        const profile = allProfiles.find(p => p.rowKey === sub.user_id);
        const task = allTasks.find(t => t.rowKey === sub.task_id);
        const flashcard = allFlashcards.find(f => f.rowKey === sub.flashcard_id);
        return { ...sub, id: sub.rowKey, profiles: profile ? { ...profile, id: profile.rowKey } : null, tasks: task ? { ...task, id: task.rowKey } : null, flashcards: flashcard ? { ...flashcard, id: flashcard.rowKey } : null };
      };

      const pending = allSubs.filter(s => s.status === 'under-review').map(enrich);
      const recent = allSubs.filter(s => s.status !== 'under-review').sort((a, b) => new Date(b.created_at as string).getTime() - new Date(a.created_at as string).getTime()).slice(0, 10).map(enrich);

      setSubmissions(pending);
      setProcessed(recent);
    } catch (err) {
      console.error("Fetch error:", err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleStatusUpdate = async (sub: any, status: 'approved' | 'retry', comment?: string) => {
    try {
        const subId = sub.rowKey || sub.id;
        const userId = sub.user_id;
        const pts = sub.tasks?.points || sub.flashcards?.points || 0;

        await upsertEntity(TABLES.SUBMISSIONS, {
            partitionKey: "Submission",
            rowKey: subId,
            status, 
            rejection_comment: comment || null,
            approved_by: "Admin",
            processed_at: new Date().toISOString()
        });
        
        if (status === 'approved') {
            // Update profile points in Azure
            const allProfiles = await getAllEntities(TABLES.PROFILES);
            const profile = allProfiles.find(p => p.rowKey === userId);
            if (profile) {
              await upsertEntity(TABLES.PROFILES, {
                ...profile,
                points: (Number(profile.points) || 0) + pts
              });
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
