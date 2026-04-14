"use client";

import { motion, AnimatePresence } from "framer-motion";
import { UserCheck, UserX, Search, ShieldCheck, Mail, ShieldAlert, Trash2, Edit2, Check, X, Camera, UploadCloud, Award, FileText, Clock, History } from "lucide-react";
import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";

export function MemberManagement() {
  const [members, setMembers] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editFormData, setEditFormData] = useState({ name: '', email: '', avatar_url: '' });
  const [isUploading, setIsUploading] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedMemberLogs, setSelectedMemberLogs] = useState<any>(null);
  const [memberHistory, setMemberHistory] = useState<any[]>([]);
  const [isHistoryLoading, setIsHistoryLoading] = useState(false);

  useEffect(() => {
    fetchMembers();
    const sub = supabase.channel('member-updates').on('postgres_changes', { event: '*', schema: 'public', table: 'profiles' }, fetchMembers).subscribe();
    const interval = setInterval(fetchMembers, 20000); // 20s backup
    return () => { 
        supabase.removeChannel(sub); 
        clearInterval(interval);
    };
  }, []);

  const fetchMembers = async () => {
    const { data } = await supabase.from('profiles').select('*').order('name');
    if (data) setMembers(data);
    setIsLoading(false);
  };

  const fetchMemberHistory = async (member: any) => {
    setIsHistoryLoading(true);
    setSelectedMemberLogs(member);
    
    // Fetch both submissions and manual awards
    const { data: subs } = await supabase
        .from('submissions')
        .select('*, tasks(title, points), flashcards(text, points)')
        .eq('user_id', member.id)
        .order('created_at', { ascending: false });
    
    const { data: awards } = await supabase
        .from('manual_awards')
        .select('*')
        .eq('user_id', member.id)
        .order('created_at', { ascending: false });

    // Combine and sort by date
    const combined = [
        ...(subs || []).map(s => ({ ...s, logType: 'submission' })),
        ...(awards || []).map(a => ({ ...a, logType: 'award' }))
    ].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

    setMemberHistory(combined);
    setIsHistoryLoading(false);
  };

  const toggleAccess = async (id: string, currentStatus: boolean) => {
    const { error } = await supabase.from('profiles').update({ is_allowed: !currentStatus }).eq('id', id);
    if (!error) fetchMembers();
  };

  const deleteMember = async (id: string, name: string) => {
    if (!confirm(`Are you absolutely sure you want to PERMANENTLY DELETE ${name}? This will remove their Account, Submissions, Manual Awards, and all progress.`)) return;
    
    // Call the "Super Function" we just created in SQL
    // This will delete them from Auth, which then cascades to everything else.
    const { error } = await supabase.rpc('admin_delete_user', { target_user_id: id });

    if (!error) {
        alert("Operation Successful: User and all associated data have been permanently erased.");
        fetchMembers();
    } else {
        console.error("Delete error:", error);
        alert(`Error: ${error.message}. Make sure you have run the SQL script for 'admin_delete_user' in Supabase.`);
    }
  };

  const startEditing = (member: any) => {
    setEditingId(member.id);
    setEditFormData({
        name: member.name || '',
        email: member.email || '',
        avatar_url: member.avatar_url || ''
    });
  };

  const saveEdit = async () => {
    if (!editingId) return;
    const { error } = await supabase.from('profiles').update({
        name: editFormData.name,
        email: editFormData.email,
        avatar_url: editFormData.avatar_url
    }).eq('id', editingId);

    if (!error) {
        setEditingId(null);
        fetchMembers();
    } else {
        alert(`Failed to update: ${error.message}`);
    }
  };

  const makeCaptain = async (member: any) => {
    if (!member.team_name || member.team_name === 'Independent') {
        alert("Member must be in a team to become a captain.");
        return;
    }
    
    // First, remove captain role from everyone else in this team
    await supabase.from('profiles').update({ role: 'member' }).eq('team_name', member.team_name);
    // Then set this user as captain
    const { error } = await supabase.from('profiles').update({ role: 'captain' }).eq('id', member.id);
    if (!error) {
        alert(`${member.name} is now the Captain of ${member.team_name}`);
        fetchMembers();
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !editingId) return;

    setIsUploading(true);
    try {
        const fileExt = file.name.split('.').pop();
        const fileName = `${editingId}-${Date.now()}.${fileExt}`;
        const filePath = `avatars/${fileName}`;

        // 1. Upload to Supabase Storage (Using the new 'avatars' bucket)
        const { error: uploadError } = await supabase.storage
            .from('avatars')
            .upload(filePath, file);

        if (uploadError) throw uploadError;

        // 2. Get Public URL
        const { data: { publicUrl } } = supabase.storage
            .from('avatars')
            .getPublicUrl(filePath);

        setEditFormData(prev => ({ ...prev, avatar_url: publicUrl }));
        alert("Photo Uploaded Successfully! Click the checkmark to save change.");
    } catch (err: any) {
        alert(`Upload Failed: ${err.message}`);
    } finally {
        setIsUploading(false);
    }
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
          {filteredMembers.map((member) => {
            const isEditing = editingId === member.id;
            const isDeactivated = member.is_allowed === false;

            return (
            <motion.div
              key={member.id}
              layout
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="premium-card"
              style={{ 
                display: 'flex', 
                flexDirection: 'column', 
                gap: '20px', 
                padding: '24px',
                border: isDeactivated ? '1px solid rgba(210, 116, 64, 0.4)' : '1px solid rgba(198, 198, 198, 0.2)',
                background: isDeactivated ? 'rgba(210, 116, 64, 0.02)' : 'white'
              }}
            >
               <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flex: 1 }}>
                    <div style={{ 
                        width: '56px', 
                        height: '56px', 
                        borderRadius: '16px', 
                        background: 'rgba(237, 224, 208, 0.5)', 
                        display: 'flex', 
                        alignItems: 'center', 
                        justifyContent: 'center', 
                        fontSize: '20px', 
                        fontWeight: 'bold', 
                        color: '#53372b',
                        border: '2px solid white',
                        boxShadow: '0 4px 10px rgba(0,0,0,0.05)',
                        overflow: 'hidden',
                        position: 'relative'
                    }}>
                      {member.avatar_url ? (
                          <img 
                            src={member.avatar_url} 
                            alt={member.name} 
                            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                            onError={(e) => {
                                (e.target as HTMLImageElement).style.display = 'none';
                                e.currentTarget.parentElement!.innerHTML = member.name?.[0] || 'U';
                            }}
                          />
                      ) : (member.name?.[0] || 'U')}
                    </div>
                    
                    {isEditing ? (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', flex: 1 }}>
                            <input 
                                value={editFormData.name} 
                                onChange={(e) => setEditFormData({...editFormData, name: e.target.value})}
                                style={{ padding: '8px 12px', borderRadius: '8px', border: '1px solid #9f4022', fontSize: '14px', width: '100%' }}
                                placeholder="Full Name"
                            />
                            <input 
                                value={editFormData.email} 
                                onChange={(e) => setEditFormData({...editFormData, email: e.target.value})}
                                style={{ padding: '8px 12px', borderRadius: '8px', border: '1px solid #ddd', fontSize: '12px', width: '100%' }}
                                placeholder="Email Address"
                            />
                            <div style={{ position: 'relative' }}>
                                <input 
                                    type="file" 
                                    id="avatar-upload"
                                    onChange={handleFileUpload}
                                    style={{ display: 'none' }}
                                    accept="image/*"
                                />
                                <label 
                                    htmlFor="avatar-upload"
                                    style={{ 
                                        display: 'flex', 
                                        alignItems: 'center', 
                                        gap: '8px', 
                                        padding: '10px 16px', 
                                        borderRadius: '8px', 
                                        border: '1px dashed #c99d5d', 
                                        background: 'rgba(201, 157, 93, 0.05)', 
                                        cursor: 'pointer',
                                        fontSize: '11px',
                                        fontWeight: 'bold',
                                        color: '#53372b',
                                        transition: 'all 0.2s'
                                    }}
                                >
                                    {isUploading ? <UploadCloud size={14} className="animate-pulse" /> : <Camera size={14} />}
                                    {isUploading ? 'Uploading...' : 'Choose Photo from Device'}
                                </label>
                            </div>
                        </div>
                    ) : (
                        <div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                             <h4 style={{ margin: 0, fontSize: '16px', fontWeight: 'bold', color: isDeactivated ? 'rgba(83, 55, 43, 0.5)' : '#53372b', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                {member.name}
                                {member.role === 'captain' && <Award size={14} color="#9f4022" />}
                             </h4>
                             {isDeactivated && (
                                <span style={{ background: '#d27440', color: 'white', fontSize: '8px', fontWeight: '900', padding: '2px 6px', borderRadius: '4px', textTransform: 'uppercase' }}>DISQUALIFIED</span>
                             )}
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '2px', color: 'rgba(83, 55, 43, 0.4)', fontSize: '11px' }}>
                            <Mail size={11} />
                            {member.email || 'No email synced'}
                          </div>
                        </div>
                    )}
                  </div>
                  
                    <div style={{ display: 'flex', gap: '8px' }}>
                    {isEditing ? (
                        <>
                            <button onClick={saveEdit} style={{ background: '#6f8e7c', border: 'none', color: 'white', padding: '10px', borderRadius: '12px', cursor: 'pointer' }}><Check size={16} /></button>
                            <button onClick={() => setEditingId(null)} style={{ background: '#d27440', border: 'none', color: 'white', padding: '10px', borderRadius: '12px', cursor: 'pointer' }}><X size={16} /></button>
                        </>
                    ) : (
                        <>
                            <button 
                                onClick={() => fetchMemberHistory(member)} 
                                title="View Logs"
                                style={{ background: 'rgba(83, 55, 43, 0.05)', border: '1px solid rgba(83, 55, 43, 0.1)', color: '#53372b', padding: '10px', borderRadius: '12px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}
                            >
                                <FileText size={16} />
                                <span style={{ fontSize: '10px', fontWeight: 'bold' }}>LOGS</span>
                            </button>
                            <button onClick={() => startEditing(member)} style={{ background: 'transparent', border: '1px solid rgba(83, 55, 43, 0.1)', color: '#53372b', padding: '10px', borderRadius: '12px', cursor: 'pointer' }}><Edit2 size={16} /></button>
                            <button onClick={() => deleteMember(member.id, member.name)} style={{ background: 'transparent', border: '1px solid rgba(159, 64, 34, 0.1)', color: '#9f4022', padding: '10px', borderRadius: '12px', cursor: 'pointer' }}><Trash2 size={16} /></button>
                        </>
                    )}
                  </div>
               </div>

               <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderTop: '1px solid rgba(83, 55, 43, 0.05)', paddingTop: '16px' }}>
                   <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                        <span style={{ fontSize: '10px', fontWeight: '900', color: isDeactivated ? 'rgba(159, 64, 34, 0.4)' : '#9f4022', textTransform: 'uppercase', letterSpacing: '0.1em' }}>{member.team_name || 'Independent'}</span>
                        {member.team_name && member.team_name !== 'Independent' && member.role !== 'captain' && !isDeactivated && (
                            <button 
                                onClick={() => makeCaptain(member)}
                                style={{ 
                                    background: 'rgba(111, 142, 124, 0.1)', 
                                    border: 'none', 
                                    color: '#6f8e7c', 
                                    cursor: 'pointer', 
                                    padding: '4px 8px',
                                    borderRadius: '6px',
                                    fontSize: '9px',
                                    fontWeight: 'bold',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '4px'
                                }}
                            >
                                <Award size={10} /> PROMOTE TO CAPTAIN
                            </button>
                        )}
                    </div>
                    <span style={{ width: '3px', height: '3px', borderRadius: '50%', background: 'rgba(0,0,0,0.1)' }} />
                    <span style={{ fontSize: '10px', color: 'rgba(83, 55, 43, 0.4)', fontWeight: 'bold' }}>{member.points} PTS</span>
                  </div>
                  
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => toggleAccess(member.id, !isDeactivated)}
                    style={{ 
                      padding: '10px 20px', 
                      borderRadius: '12px', 
                      border: 'none', 
                      backgroundColor: !isDeactivated ? 'rgba(210, 116, 64, 0.1)' : '#6f8e7c',
                      color: !isDeactivated ? '#d27440' : 'white',
                      fontSize: '11px',
                      fontWeight: '900',
                      textTransform: 'uppercase',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '10px',
                      boxShadow: '0 4px 12px rgba(0,0,0,0.02)'
                    }}
                  >
                    {!isDeactivated ? <UserX size={14} /> : <UserCheck size={14} />}
                    {!isDeactivated ? 'Deactivate Account' : 'Reactivate Account'}
                  </motion.button>
               </div>
            </motion.div>
          );
          })}
        </AnimatePresence>
      </div>

      {/* MEMBER LOGS OVERLAY */}
      <AnimatePresence>
          {selectedMemberLogs && (
              <div 
                style={{ position: 'fixed', inset: 0, background: 'rgba(83, 55, 43, 0.4)', backdropFilter: 'blur(8px)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}
                onClick={() => setSelectedMemberLogs(null)}
              >
                  <motion.div 
                    initial={{ opacity: 0, scale: 0.9, y: 20 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.9, y: 20 }}
                    onClick={(e) => e.stopPropagation()}
                    style={{ background: 'white', width: '100%', maxWidth: '800px', maxHeight: '90vh', borderRadius: '32px', overflow: 'hidden', display: 'flex', flexDirection: 'column', boxShadow: '0 40px 100px rgba(0,0,0,0.3)' }}
                  >
                      {/* Header */}
                      <div style={{ padding: '32px', background: '#fcfaf5', borderBottom: '1px solid rgba(83, 55, 43, 0.05)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <div>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#9f4022', marginBottom: '4px' }}>
                                <History size={14} />
                                <span style={{ fontSize: '10px', fontWeight: '900', textTransform: 'uppercase', letterSpacing: '0.2em' }}>Audit Log</span>
                              </div>
                              <h3 style={{ margin: 0, fontSize: '24px', fontFamily: "'Bodoni Moda', serif", color: '#53372b' }}>{selectedMemberLogs.name}'s History</h3>
                          </div>
                          <button 
                            onClick={() => setSelectedMemberLogs(null)}
                            style={{ background: 'white', border: '1px solid rgba(83, 55, 43, 0.1)', padding: '12px', borderRadius: '16px', cursor: 'pointer', color: '#53372b' }}
                          >
                            <X size={20} />
                          </button>
                      </div>

                      {/* Content */}
                      <div style={{ flex: 1, overflowY: 'auto', padding: '32px' }}>
                          {isHistoryLoading ? (
                              <div style={{ textAlign: 'center', padding: '40px', color: 'rgba(83, 55, 43, 0.4)' }}>
                                  <div className="animate-spin" style={{ marginBottom: '12px' }}>⌛</div>
                                  <p style={{ fontSize: '12px', fontWeight: 'bold' }}>Retrieving secure logs...</p>
                              </div>
                          ) : memberHistory.length === 0 ? (
                              <div style={{ textAlign: 'center', padding: '60px', borderRadius: '24px', border: '2px dashed rgba(83, 55, 43, 0.05)', color: 'rgba(83, 55, 43, 0.3)' }}>
                                  <p style={{ fontSize: '14px' }}>No points or submissions recorded yet.</p>
                              </div>
                          ) : (
                              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                                  {memberHistory.map((log, idx) => (
                                      <div key={idx} style={{ padding: '20px', borderRadius: '20px', background: '#fcfaf5', border: '1px solid rgba(83, 55, 43, 0.03)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                          <div style={{ display: 'flex', gap: '20px', alignItems: 'center' }}>
                                              <div style={{ 
                                                  width: '40px', height: '40px', borderRadius: '12px', 
                                                  background: log.logType === 'submission' ? 'rgba(111, 142, 124, 0.1)' : 'rgba(201, 157, 93, 0.1)',
                                                  color: log.logType === 'submission' ? '#6f8e7c' : '#c99d5d',
                                                  display: 'flex', alignItems: 'center', justifyContent: 'center'
                                              }}>
                                                  {log.logType === 'submission' ? <Camera size={18} /> : <Award size={18} />}
                                              </div>
                                              <div>
                                                  <div style={{ fontSize: '13px', fontWeight: 'bold', color: '#53372b' }}>
                                                      {log.logType === 'submission' 
                                                        ? (log.tasks?.title || log.flashcards?.text || 'Submission')
                                                        : (log.reason || 'Manual Points Award')}
                                                  </div>
                                                  <div style={{ fontSize: '10px', color: 'rgba(83, 55, 43, 0.4)', marginTop: '2px' }}>
                                                      {new Date(log.created_at).toLocaleString()} 
                                                      {log.logType === 'submission' && ` • Status: ${log.status}`}
                                                  </div>
                                                  {log.approved_by && (
                                                      <div style={{ fontSize: '9px', color: '#9f4022', fontWeight: '900', textTransform: 'uppercase', marginTop: '4px' }}>
                                                          Audited By: {log.approved_by}
                                                      </div>
                                                  )}
                                              </div>
                                          </div>
                                          <div style={{ textAlign: 'right' }}>
                                              <div style={{ fontSize: '16px', fontWeight: '900', color: log.logType === 'submission' && log.status !== 'approved' ? 'rgba(83, 55, 43, 0.2)' : '#9f4022' }}>
                                                  +{log.points || (log.tasks?.points || log.flashcards?.points || 0)}
                                              </div>
                                              <div style={{ fontSize: '9px', color: 'rgba(83, 55, 43, 0.4)', fontWeight: 'bold' }}>POINTS</div>
                                          </div>
                                      </div>
                                  ))}
                              </div>
                          )}
                      </div>
                      
                      {/* Footer */}
                      <div style={{ padding: '24px 32px', background: '#fcfaf5', borderTop: '1px solid rgba(83, 55, 43, 0.05)', textAlign: 'center' }}>
                          <p style={{ margin: 0, fontSize: '11px', color: 'rgba(83, 55, 43, 0.4)', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
                            Restricted Access • Control Tower Internal Log
                          </p>
                      </div>
                  </motion.div>
              </div>
          )}
      </AnimatePresence>
    </div>
  );
}
