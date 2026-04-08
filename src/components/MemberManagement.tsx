"use client";

import { motion, AnimatePresence } from "framer-motion";
import { UserCheck, UserX, Search, ShieldCheck, Mail, ShieldAlert, Trash2, Edit2, Check, X, Camera, UploadCloud, Award } from "lucide-react";
import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";

export function MemberManagement() {
  const [members, setMembers] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editFormData, setEditFormData] = useState({ name: '', email: '', avatar_url: '' });
  const [isUploading, setIsUploading] = useState(false);
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

  const deleteMember = async (id: string, name: string) => {
    if (!confirm(`Are you absolutely sure you want to PERMANENTLY DELETE ${name}? This will remove all their submissions and progress.`)) return;
    const { error } = await supabase.from('profiles').delete().eq('id', id);
    if (!error) fetchMembers();
    else alert(`Error: ${error.message}`);
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
                            <button onClick={() => startEditing(member)} style={{ background: 'transparent', border: '1px solid rgba(83, 55, 43, 0.1)', color: '#53372b', padding: '10px', borderRadius: '12px', cursor: 'pointer' }}><Edit2 size={16} /></button>
                            <button onClick={() => deleteMember(member.id, member.name)} style={{ background: 'transparent', border: '1px solid rgba(159, 64, 34, 0.1)', color: '#9f4022', padding: '10px', borderRadius: '12px', cursor: 'pointer' }}><Trash2 size={16} /></button>
                        </>
                    )}
                  </div>
               </div>

               <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderTop: '1px solid rgba(83, 55, 43, 0.05)', paddingTop: '16px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <span style={{ fontSize: '10px', fontWeight: '900', color: isDeactivated ? 'rgba(159, 64, 34, 0.4)' : '#9f4022', textTransform: 'uppercase', letterSpacing: '0.1em' }}>{member.team_name || 'Independent'}</span>
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
    </div>
  );
}
