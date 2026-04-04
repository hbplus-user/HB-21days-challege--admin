"use client";

import { motion, AnimatePresence } from "framer-motion";
import { Plus, Trash2, Calendar, GripVertical, Award, MessageSquareQuote, FileVideo, FileImage, FileText, LayoutList, Clock, Video } from "lucide-react";
import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";

const protocolTemplates = [
  { title: "Mindful Morning Flow", points: 15, proof: "video" },
  { title: "Daily Hydration Goals", points: 10, proof: "text" },
  { title: "Deep Breathing Protocol", points: 20, proof: "video" },
  { title: "Core Activation Circuit", points: 25, proof: "photo" },
  { title: "Evening Wind-down", points: 15, proof: "text" },
  { title: "Balanced Nutrition Lunch", points: 15, proof: "photo" },
  { title: "HIIT Session", points: 30, proof: "video" },
];

export function TaskManagement() {
  const [activeWeek, setActiveWeek] = useState(1);
  const [activeDay, setActiveDay] = useState(1); 
  const [flashCards, setFlashCards] = useState<any[]>([]);
  const [tasks, setTasks] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Form States
  const [isAddingTask, setIsAddingTask] = useState(false);
  const [newTaskData, setNewTaskData] = useState({ title: '', points: 15, video_url: '' });
  const [taskFile, setTaskFile] = useState<File | null>(null);
  
  const [isAddingCard, setIsAddingCard] = useState(false);
  const [newCardData, setNewCardData] = useState({ text: '', points: 50, video_url: '' });
  const [cardFile, setCardFile] = useState<File | null>(null);

  const [uploadProgress, setUploadProgress] = useState<{ [key: string]: number }>({});
  const [isUploading, setIsUploading] = useState(false);

  useEffect(() => {
    fetchData();
    
    // Real-time synchronization
    const tasksChannel = supabase.channel('tm-tasks').on('postgres_changes', { event: '*', schema: 'public', table: 'tasks' }, fetchData).subscribe();
    const flashcardsChannel = supabase.channel('tm-flash').on('postgres_changes', { event: '*', schema: 'public', table: 'flashcards' }, fetchData).subscribe();

    return () => {
        supabase.removeChannel(tasksChannel);
        supabase.removeChannel(flashcardsChannel);
    };
  }, []);

  const fetchData = async () => {
    // 1. Fetch Day Settings to sync with current progress
    const { data: settings } = await supabase.from('challenge_settings').select('start_date').eq('id', 1).single();
    if (settings) {
      const start = new Date(settings.start_date);
      const now = new Date();
      
      const startDateOnly = new Date(start.getFullYear(), start.getMonth(), start.getDate());
      const nowDateOnly = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      
      const diffTime = nowDateOnly.getTime() - startDateOnly.getTime();
      const currentDay = Math.max(1, Math.min(21, Math.floor(diffTime / (1000 * 60 * 60 * 24)) + 1));
      
      setActiveDay(currentDay);
      setActiveWeek(Math.ceil(currentDay / 7));
    }

    const { data: tasksData } = await supabase.from('tasks').select('*');
    const { data: cardsData } = await supabase.from('flashcards').select('*').order('created_at', { ascending: false });
    
    if (tasksData) setTasks(tasksData);
    if (cardsData) setFlashCards(cardsData);
    setIsLoading(false);
  };

  // ---- File Validation Constants ----
  const MAX_VIDEO_SIZE_KB = 2048; // 2 MB
  const MAX_IMAGE_SIZE_KB = 1024; // 1 MB
  const MAX_VIDEO_DURATION_SEC = 30;

  const validateAndSetFile = (file: File, setter: (f: File | null) => void) => {
    const isVideo = file.type.startsWith('video/');
    const isImage = file.type.startsWith('image/');
    const maxSizeKB = isVideo ? MAX_VIDEO_SIZE_KB : MAX_IMAGE_SIZE_KB;

    // 1. Size check
    if (file.size > maxSizeKB * 1024) {
      alert(`❌ File too large!\n\nMaximum size for ${isVideo ? 'video' : 'image'}: ${maxSizeKB / 1024} MB\nYour file: ${(file.size / (1024 * 1024)).toFixed(2)} MB\n\nPlease compress the file and try again.`);
      return;
    }

    if (isVideo) {
        // 2. Duration check for videos
        const tempUrl = URL.createObjectURL(file);
        const tempVideo = document.createElement('video');
        tempVideo.preload = 'metadata';
        tempVideo.onloadedmetadata = () => {
          URL.revokeObjectURL(tempUrl);
          if (tempVideo.duration > MAX_VIDEO_DURATION_SEC) {
            alert(`❌ Video too long!\n\nMaximum duration: ${MAX_VIDEO_DURATION_SEC} seconds\nYour video: ${Math.round(tempVideo.duration)} seconds\n\nPlease trim the video and try again.`);
            return;
          }
          setter(file);
        };
        tempVideo.onerror = () => {
          URL.revokeObjectURL(tempUrl);
          setter(file);
        };
        tempVideo.src = tempUrl;
    } else {
        setter(file);
    }
  };

  const uploadFile = async (file: File, key: string) => {
    setIsUploading(true);
    setUploadProgress(prev => ({ ...prev, [key]: 10 }));
    
    const formData = new FormData();
    formData.append('file', file);
    formData.append('fileName', `${Date.now()}-${file.name}`);

    try {
      setUploadProgress(prev => ({ ...prev, [key]: 30 }));
      const response = await fetch('/api/upload-video', {
        method: 'POST',
        body: formData,
      });

      setUploadProgress(prev => ({ ...prev, [key]: 80 }));
      const data = await response.json();

      if (!response.ok) throw new Error(data.error || 'Upload failed');

      setUploadProgress(prev => ({ ...prev, [key]: 100 }));
      return data.videoUrl;
    } catch (error: any) {
      alert(`❌ Upload failed: ${error.message}`);
      return null;
    } finally {
      setIsUploading(false);
      setTimeout(() => setUploadProgress(prev => ({ ...prev, [key]: 0 })), 2000);
    }
  };

  const handleResetChallenge = async () => {
    if (!confirm("Are you sure? This will reset the challenge to Day 1, clear all leaderboard points, and remove all current submissions!")) return;
    
    try {
        // 1. Reset Challenge Start Date
        const { error: sE } = await supabase.from('challenge_settings').update({ 
            start_date: new Date().toISOString() 
        }).eq('id', 1);
        if (sE) throw sE;

        // 2. Clear Points for all non-admin users
        const { error: pE } = await supabase.from('profiles').update({ points: 0 }).neq('id', '00000000-0000-0000-0000-000000000000'); // Valid UUID string
        if (pE) throw pE;

        // 3. Clear Submissions (Delete everything)
        const { error: subE } = await supabase.from('submissions').delete().neq('id', '00000000-0000-0000-0000-000000000000');
        if (subE) throw subE;

        alert("Challenge Reset Successful! Batch started at Day 1.");
        window.location.reload();
    } catch (e: any) {
        console.error("Reset Error:", e);
        alert(`Failed to reset: ${e.message || 'Unknown database error'}`);
    }
  };

  const filteredTasks = tasks.filter(t => t.day === activeDay);

  const handleAddFlashCard = async () => {
    if (!newCardData.text.trim()) return;
    
    let videoUrl = newCardData.video_url;
    if (cardFile) {
        const uploadedUrl = await uploadFile(cardFile, 'card');
        if (!uploadedUrl) return; // Stop if upload failed
        videoUrl = uploadedUrl;
    }

    try {
        const { error } = await supabase.from('flashcards').insert([{ 
            text: newCardData.text, 
            points: newCardData.points, 
            video_url: videoUrl,
            type: "challenge" 
        }]);
        
        if (error) {
            console.error('Broadcast Error:', error);
            alert(`Broadcast failed: ${error.message}`);
            return;
        }

        setNewCardData({ text: '', points: 50, video_url: '' }); 
        setCardFile(null);
        setIsAddingCard(false); 
    } catch(e) {
        console.error('System error during broadcast:', e);
    }
  };

  const handleAddTask = async () => {
    if (!newTaskData.title.trim()) return;
    
    let videoUrl = newTaskData.video_url;
    if (taskFile) {
        const uploadedUrl = await uploadFile(taskFile, 'task');
        if (!uploadedUrl) return; // Stop if upload failed
        videoUrl = uploadedUrl;
    }

    const { error } = await supabase.from('tasks').insert([
      { 
        title: newTaskData.title, 
        points: newTaskData.points, 
        video_url: videoUrl,
        proof_type: 'image', 
        week: activeWeek,
        day: activeDay 
      }
    ]);

    if (!error) {
      setNewTaskData({ title: '', points: 15, video_url: '' });
      setTaskFile(null);
      setIsAddingTask(false);
    } else {
        alert(`Failed to save task: ${error.message}`);
    }
  };

  const deleteFlashCard = async (id: string) => {
    if (!confirm("Are you sure? This will remove this broadcast and all client interest data for it!")) return;
    await supabase.from('flashcards').delete().eq('id', id);
  };

  const deleteTask = async (id: string) => {
    if (!confirm("Are you sure? This will remove this protocol and ALL client submissions for it!")) return;
    await supabase.from('tasks').delete().eq('id', id);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '64px' }}>
      
      {/* Supabase Storage Info Badge */}
      <div className="flex flex-col md:flex-row justify-between items-center bg-[var(--hb-cream)] p-6 rounded-[20px] border border-[rgba(159,64,34,0.1)] gap-5">
          <div className="text-center md:text-left">
            <h4 style={{ margin: 0, fontSize: '13px', color: '#9f4022', fontWeight: 900, textTransform: 'uppercase' }}>⚡ Supabase Cloud Storage</h4>
            <p style={{ margin: 0, fontSize: '10px', color: 'rgba(83, 55, 43, 0.5)' }}>Videos and images are stored in Supabase Storage. Limits: <strong>2 MB Video</strong> · <strong>1 MB Image</strong> · 30s Duration.</p>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 18px', background: 'rgba(111, 142, 124, 0.1)', borderRadius: '12px', border: '1px solid rgba(111, 142, 124, 0.3)' }}>
            <Video size={14} style={{ color: '#6f8e7c' }} />
            <span style={{ fontSize: '11px', fontWeight: 'bold', color: '#6f8e7c', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Storage Active</span>
          </div>
      </div>

      {/* Flash Cards Section */}
      <div>
         <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '32px' }}>
            <MessageSquareQuote size={24} color="#9f4022" />
            <h3 style={{ fontSize: '24px', fontFamily: "'Bodoni Moda', serif", color: '#53372b', fontWeight: '900', margin: 0, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Administrative Flash Cards</h3>
         </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '20px' }}>
            <AnimatePresence mode="popLayout">
              {flashCards.map((card, idx) => (
                <motion.div
                  key={card.id}
                  layout
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  transition={{ delay: idx * 0.1 }}
                  className="premium-card"
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '16px',
                    position: 'relative',
                    overflow: 'hidden',
                    padding: '24px'
                  }}
                >
                  <div style={{ position: 'absolute', top: 0, left: 0, width: '4px', height: '100%', backgroundColor: '#9f4022' }} />
                  <div style={{ display: 'flex', alignItems: 'center', gap: '24px' }}>
                    <div style={{ width: '40px', height: '40px', backgroundColor: '#9f402210', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#9f4022' }}>
                        <Award size={20} style={{ margin: 'auto' }} />
                    </div>
                    <div style={{ flex: 1 }}>
                        <p style={{ margin: 0, fontSize: '15px', color: '#53372b', fontWeight: 'bold' }}>"{card.text}"</p>
                        <div style={{ fontSize: '9px', fontWeight: 'bold', color: '#9f4022', textTransform: 'uppercase', marginTop: '6px' }}>{card.points || 50} Points Challenge</div>
                    </div>
                    <button 
                        onClick={() => deleteFlashCard(card.id)}
                        style={{ backgroundColor: 'transparent', border: 'none', color: '#53372b30', cursor: 'pointer' }}
                    >
                        <Trash2 size={16} />
                    </button>
                  </div>
                  {card.video_url && (
                    <div style={{ width: '100%', height: '180px', background: '#000', borderRadius: '8px', overflow: 'hidden' }}>
                        <iframe src={card.video_url.replace('/view', '/preview')} style={{ width: '100%', height: '100%', border: 'none' }} />
                    </div>
                  )}
                </motion.div>
              ))}

              {isAddingCard && (
                <motion.div
                  key="add-card-form"
                  layout
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="premium-card"
                  style={{
                    border: '2px solid #9f4022',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '16px',
                    padding: '24px'
                  }}
                >
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginBottom: '24px' }}>
                    <textarea 
                        autoFocus
                        placeholder="Type challenge broadcast message..."
                        value={newCardData.text}
                        onChange={(e) => setNewCardData({...newCardData, text: e.target.value})}
                        style={{ width: '100%', border: 'none', outline: 'none', fontSize: '15px', color: '#53372b', fontWeight: 'bold', backgroundColor: 'transparent', resize: 'none', minHeight: '60px' }}
                    />
                    
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '20px', alignItems: 'center' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                            <span style={{ fontSize: '10px', fontWeight: 'bold', color: 'rgba(83, 55, 43, 0.3)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Challenge Points</span>
                            <input 
                                type="number" 
                                value={newCardData.points}
                                onChange={(e) => setNewCardData({...newCardData, points: parseInt(e.target.value)})}
                                style={{ width: '60px', padding: '10px', borderRadius: '12px', border: '1px solid rgba(83, 55, 43, 0.05)', textAlign: 'center' }}
                            />
                        </div>
                        
                        <div style={{ flex: 1, minWidth: '200px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                            <div style={{ position: 'relative', flex: 1 }}>
                                <input 
                                    type="file" 
                                    accept="video/*"
                                    onChange={(e) => {
                                      const f = e.target.files?.[0];
                                      if (f) validateAndSetFile(f, setCardFile);
                                      e.target.value = ''; // reset so same file can be re-selected after error
                                    }}
                                    style={{ display: 'none' }}
                                    id="card-video-upload"
                                />
                                <label 
                                    htmlFor="card-video-upload"
                                    style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 16px', borderRadius: '12px', background: cardFile ? '#f0f0f0' : 'rgba(159, 64, 34, 0.05)', color: '#9f4022', fontSize: '11px', fontWeight: 'bold', cursor: 'pointer', border: '1px solid rgba(159, 64, 34, 0.1)' }}
                                >
                                    <Video size={14} /> {cardFile ? cardFile.name : "SELECT BROADCAST VIDEO"}
                                </label>
                            </div>
                            <span style={{ fontSize: '9px', color: 'rgba(83,55,43,0.4)', fontWeight: 'bold', letterSpacing: '0.05em' }}>MAX 30 SEC · VID 2MB · IMG 1MB</span>
                        </div>
                    </div>
                  </div>

                  {uploadProgress['card'] > 0 && (
                      <div style={{ width: '100%', height: '4px', background: '#eee', borderRadius: '2px', overflow: 'hidden' }}>
                          <div style={{ width: `${uploadProgress['card']}%`, height: '100%', background: '#9f4022', transition: 'width 0.3s' }} />
                      </div>
                  )}

                  <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                     <button onClick={() => setIsAddingCard(false)} style={{ fontSize: '10px', fontWeight: 'bold', border: 'none', background: 'transparent', color: 'rgba(83, 55, 43, 0.4)', cursor: 'pointer', padding: '8px' }}>CANCEL</button>
                     <button onClick={handleAddFlashCard} disabled={isUploading} style={{ fontSize: '10px', fontWeight: 'bold', border: 'none', background: '#9f4022', color: 'white', borderRadius: '8px', padding: '8px 16px', cursor: isUploading ? 'not-allowed' : 'pointer', opacity: isUploading ? 0.7 : 1 }}>
                        {isUploading ? 'PREPARING...' : 'BROADCAST CHALLENGE'}
                     </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
            
            {!isAddingCard && (
              <motion.button 
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => setIsAddingCard(true)}
                style={{ 
                  background: 'rgba(159, 64, 34, 0.05)',
                  borderRadius: '16px',
                  padding: '24px',
                  border: '2px dashed #9f402230',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '12px',
                  color: '#9f4022',
                  fontSize: '11px',
                  fontWeight: 'bold',
                  textTransform: 'uppercase',
                  letterSpacing: '0.2em',
                  cursor: 'pointer'
                }}
              >
                 <Plus size={16} /> BROADCAST NEW FLASH CARD
              </motion.button>
            )}
         </div>
      </div>

      {/* Task Stack Section */}
      <div>
         <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between', gap: '32px', marginBottom: '40px', borderBottom: '1px solid rgba(83, 55, 43, 0.05)', paddingBottom: '32px' }}>
            <div>
               <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <LayoutList size={22} color="#9f4022" />
                    <span style={{ fontSize: '10px', fontWeight: 'bold', color: '#9f4022', textTransform: 'uppercase', letterSpacing: '0.4em' }}>HABIT STACK MANAGEMENT</span>
                  </div>
                  <button 
                    onClick={handleResetChallenge}
                    style={{ background: '#f8d7da', color: '#721c24', border: '1px solid #f5c6cb', padding: '10px 20px', borderRadius: '12px', fontWeight: 'bold', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '11px' }}
                  >
                    <Trash2 size={14} /> RESET FOR NEW BATCH
                  </button>
               </div>
               <h3 style={{ fontSize: '32px', fontFamily: "'Bodoni Moda', serif", color: '#53372b', fontWeight: '900', margin: 0, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Protocol Blueprint</h3>
               {/* Fixed date for synchronizing global calendar */}
               <p style={{ fontSize: '12px', color: '#9f4022', fontWeight: '900', textTransform: 'uppercase', letterSpacing: '0.1em', marginTop: '4px' }}>
                 {new Date().toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' })}
               </p>
            </div>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <p style={{ fontSize: '9px', fontWeight: 'bold', color: 'rgba(83, 55, 43, 0.4)', textTransform: 'uppercase', letterSpacing: '0.2em' }}>Jump to specific day in protocol</p>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(11, 1fr)', gap: '8px' }}>
                {Array.from({ length: 21 }, (_, i) => i + 1).map(day => (
                    <button
                        key={day}
                        onClick={() => {
                            setActiveDay(day);
                            setActiveWeek(Math.ceil(day / 7));
                        }}
                        style={{
                            padding: '10px 4px',
                            borderRadius: '8px',
                            border: '1px solid rgba(0,0,0,0.05)',
                            backgroundColor: activeDay === day ? '#53372b' : '#f5f2e9',
                            color: activeDay === day ? 'white' : '#53372b',
                            fontSize: '11px',
                            fontWeight: 'bold',
                            cursor: 'pointer',
                            transition: 'all 0.2s ease',
                            textAlign: 'center'
                        }}
                    >
                        D{day}
                    </button>
                ))}
                </div>
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <AnimatePresence mode="popLayout">
              {filteredTasks.filter(t => t.day === activeDay).map((task, idx) => (
                   <motion.div
                     key={task.id}
                     layout
                     initial={{ opacity: 0, x: -20 }}
                     animate={{ opacity: 1, x: 0 }}
                     exit={{ opacity: 0, x: 20 }}
                     transition={{ delay: idx * 0.1 }}
                     className="premium-card"
                     style={{
                       padding: '20px',
                       display: 'flex',
                       flexDirection: 'column',
                       gap: '16px'
                     }}
                   >
                     <div className="flex flex-col md:flex-row md:items-center gap-6">
                         <div className="flex items-center gap-6 flex-1">
                            <GripVertical size={20} color="rgba(83, 55, 43, 0.15)" />
                            <div>
                               <p style={{ margin: 0, fontSize: '16px', fontWeight: 'bold', color: '#53372b' }}>{task.title}</p>
                               <div style={{ display: 'flex', gap: '16px', marginTop: '8px' }}>
                                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '9px', fontWeight: 'bold', color: 'rgba(83, 55, 43, 0.4)', textTransform: 'uppercase' }}>
                                     <Clock size={12} /> Blueprint Task · Day {task.day}
                                  </div>
                               </div>
                            </div>
                         </div>
                         <div className="flex items-center justify-between md:justify-end gap-8">
                            <div style={{ textAlign: 'right' }}>
                               <p style={{ margin: 0, fontSize: '9px', fontWeight: 'extrabold', color: 'rgba(83, 55, 43, 0.2)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Value</p>
                               <p style={{ margin: 0, fontSize: '18px', fontWeight: 'bold', color: '#9f4022', fontFamily: "'Bodoni Moda', serif" }}>{task.points} PTS</p>
                            </div>
                            <button 
                              onClick={() => deleteTask(task.id)}
                              style={{ backgroundColor: 'transparent', border: 'none', color: '#53372b30', cursor: 'pointer' }}
                            >
                              <Trash2 size={18} />
                            </button>
                         </div>
                     </div>

                    {task.video_url && (
                        <div style={{ width: '100%', height: '180px', background: '#000', borderRadius: '8px', overflow: 'hidden' }}>
                            <iframe src={task.video_url.replace('/view', '/preview')} style={{ width: '100%', height: '100%', border: 'none' }} />
                        </div>
                    )}
                 </motion.div>
              ))}

              {isAddingTask && (
                <motion.div
                  key="add-task-form"
                  layout
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  style={{
                    background: '#fcfaf5',
                    borderRadius: '24px',
                    padding: '32px',
                    border: '2px solid #9f4022',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '24px',
                    boxShadow: '0 20px 40px rgba(159, 64, 34, 0.08)',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                     <h4 style={{ fontSize: '14px', fontWeight: '900', color: '#9f4022', textTransform: 'uppercase', margin: 0 }}>Create Protocol Expansion</h4>
                     <select 
                        onChange={(e) => {
                          const template = protocolTemplates.find(t => t.title === e.target.value);
                          if (template) setNewTaskData({ ...newTaskData, title: template.title, points: template.points });
                        }}
                        style={{ padding: '8px 16px', borderRadius: '8px', border: '1px solid rgba(83, 55, 43, 0.1)', fontSize: '10px', fontWeight: 'bold', cursor: 'pointer' }}
                      >
                        <option value="">-- Apply Template --</option>
                        {protocolTemplates.map(t => <option key={t.title} value={t.title}>{t.title}</option>)}
                      </select>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-[1fr_120px] gap-5">
                     <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        <label style={{ fontSize: '9px', fontWeight: 'bold', color: 'rgba(83, 55, 43, 0.4)', textTransform: 'uppercase' }}>Task Title</label>
                        <input 
                           type="text" 
                           placeholder="Enter task name..." 
                           value={newTaskData.title}
                           onChange={(e) => setNewTaskData({...newTaskData, title: e.target.value})}
                           style={{ padding: '12px', borderRadius: '10px', border: '1px solid rgba(83, 55, 43, 0.1)', fontSize: '14px', color: '#53372b', background: 'var(--hb-cream)' }}
                        />
                     </div>
                     <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                         <label style={{ fontSize: '9px', fontWeight: 'bold', color: 'rgba(83, 55, 43, 0.4)', textTransform: 'uppercase' }}>Points</label>
                         <input 
                            type="number" 
                            value={newTaskData.points}
                            onChange={(e) => setNewTaskData({...newTaskData, points: parseInt(e.target.value)})}
                            style={{ padding: '12px', borderRadius: '10px', border: '1px solid rgba(83, 55, 43, 0.1)', fontSize: '14px', color: '#53372b' }}
                         />
                      </div>
                     <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', gridColumn: '1 / -1' }}>
                        <label style={{ fontSize: '9px', fontWeight: 'bold', color: 'rgba(83, 55, 43, 0.4)', textTransform: 'uppercase' }}>Protocol Video</label>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                            <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                              <input 
                                 type="file" 
                                 accept="video/*"
                                 onChange={(e) => {
                                   const f = e.target.files?.[0];
                                   if (f) validateAndSetFile(f, setTaskFile);
                                   e.target.value = '';
                                 }}
                                 style={{ display: 'none' }}
                                 id="task-video-upload"
                              />
                              <label 
                                 htmlFor="task-video-upload"
                                 style={{ flex: 1, display: 'flex', alignItems: 'center', gap: '8px', padding: '12px', borderRadius: '10px', background: taskFile ? '#e8ecef' : 'white', border: '1px solid rgba(83, 55, 43, 0.1)', fontSize: '14px', color: '#53372b', cursor: 'pointer' }}
                              >
                                  <Video size={16} /> {taskFile ? taskFile.name : "SELECT VIDEO FROM DEVICE"}
                              </label>
                              <div style={{ padding: '12px 20px', background: '#f0f0f0', borderRadius: '10px', display: 'flex', alignItems: 'center', gap: '8px', opacity: 0.5 }}>
                                 <FileImage size={14} /> <span style={{ fontSize: '10px', fontWeight: 'bold' }}>IMAGE PROOF ONLY</span>
                              </div>
                            </div>
                            <span style={{ fontSize: '9px', color: 'rgba(83,55,43,0.4)', fontWeight: 'bold', letterSpacing: '0.05em', paddingLeft: '2px' }}>MAX 30 SECONDS · VID 2MB · IMG 1MB</span>
                         </div>
                        {uploadProgress['task'] > 0 && (
                            <div style={{ width: '100%', height: '4px', background: '#eee', borderRadius: '2px', overflow: 'hidden', marginTop: '8px' }}>
                                <div style={{ width: `${uploadProgress['task']}%`, height: '100%', background: '#9f4022', transition: 'width 0.3s' }} />
                            </div>
                        )}
                     </div>
                  </div>

                  <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
                     <button onClick={() => setIsAddingTask(false)} style={{ fontSize: '11px', fontWeight: 'bold', border: 'none', background: 'transparent', color: 'rgba(83, 55, 43, 0.4)', cursor: 'pointer', padding: '12px 24px' }}>CANCEL</button>
                     <button onClick={handleAddTask} disabled={isUploading} style={{ fontSize: '11px', fontWeight: 'bold', border: 'none', background: '#9f4022', color: 'white', borderRadius: '12px', padding: '12px 32px', cursor: isUploading ? 'not-allowed' : 'pointer', boxShadow: '0 4px 12px rgba(159, 64, 34, 0.2)', opacity: isUploading ? 0.7 : 1 }}>
                        {isUploading ? 'PREPARING...' : `DEPLOY TO WEEK ${activeWeek} DAY ${activeDay}`}
                     </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
            
            {!isAddingTask && (
              <motion.button 
                whileHover={{ scale: 1.01 }}
                whileTap={{ scale: 0.99 }}
                onClick={() => setIsAddingTask(true)}
                style={{ 
                  padding: '24px',
                  borderRadius: '16px',
                  border: '2px dashed rgba(83, 55, 43, 0.1)',
                  backgroundColor: 'transparent',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '12px',
                  color: 'rgba(83, 55, 43, 0.3)',
                  fontSize: '11px',
                  fontWeight: 'bold',
                  textTransform: 'uppercase',
                  letterSpacing: '0.2em',
                  cursor: 'pointer',
                  marginTop: '16px'
                }}
              >
                 <Plus size={16} /> ADD NEW PROTOCOL TASK
              </motion.button>
            )}
         </div>
      </div>
    </div>
  );
}
