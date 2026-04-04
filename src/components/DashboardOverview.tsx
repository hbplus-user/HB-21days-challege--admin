"use client";

import { motion } from "framer-motion";
import { Check, Clock, Users, Trophy, Award, Calendar, CheckCircle2 } from "lucide-react";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

function AnimatedNumber({ value }: { value: number | string }) {
  const [displayValue, setDisplayValue] = useState(0);
  const numValue = typeof value === 'string' ? 0 : value;

  useEffect(() => {
    if (typeof value === 'string') return;
    let start = 0;
    const duration = 2000;
    const increment = numValue / (duration / 16);
    const timer = setInterval(() => {
      start += increment;
      if (start >= numValue) {
        setDisplayValue(numValue);
        clearInterval(timer);
      } else {
        setDisplayValue(Math.floor(start));
      }
    }, 16);
    return () => clearInterval(timer);
  }, [numValue, value]);

  if (typeof value === 'string') return <span>{value}</span>;
  return <span>{displayValue.toLocaleString()}</span>;
}

export function DashboardOverview() {
  const [stats, setStats] = useState({
    activeChallenge: 1,
    currentDay: 1,
    topTeam: 'Loading...',
    topClient: 'Loading...',
    activeCount: 0,
    pendingCount: 0,
    taskEngagement: [] as any[]
  });

  useEffect(() => {
    fetchStats();
    
    const subChannel = supabase.channel('dashboard-results').on('postgres_changes', { event: '*', schema: 'public', table: 'submissions' }, fetchStats).subscribe();
    const profChannel = supabase.channel('dashboard-profiles').on('postgres_changes', { event: '*', schema: 'public', table: 'profiles' }, fetchStats).subscribe();
    const channel = supabase.channel('dashboard-settings')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'challenge_settings' }, fetchStats)
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
      supabase.removeChannel(subChannel);
      supabase.removeChannel(profChannel);
    };
  }, []);

  const fetchStats = async () => {
    // 1. Fetch Day Settings
    const { data: settings } = await supabase.from('challenge_settings').select('start_date').eq('id', 1).single();
    let currentDay = 1; // Default fallback
    if (settings) {
      const start = new Date(settings.start_date);
      const now = new Date();
      
      const startDateOnly = new Date(start.getFullYear(), start.getMonth(), start.getDate());
      const nowDateOnly = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      
      const diffTime = nowDateOnly.getTime() - startDateOnly.getTime();
      currentDay = Math.max(1, Math.min(21, Math.floor(diffTime / (1000 * 60 * 60 * 24)) + 1));
    }

    // 2. Top Client & Team
    const { data: profiles } = await supabase
      .from('profiles')
      .select('*')
      .order('points', { ascending: false });

    // 3. Active & Pending
    const { data: submissions } = await supabase
      .from('submissions')
      .select('status');

    // 4. Daily Tasks
    const { data: tasks } = await supabase
      .from('tasks')
      .select('*, submissions(status)')
      .eq('day', currentDay); 
    const topClient = profiles?.[0]?.name || 'None';
    
    // Calculate Top Team
    const teamPoints: any = {};
    profiles?.forEach(p => {
        teamPoints[p.team_name] = (teamPoints[p.team_name] || 0) + (p.points || 0);
    });
    const topTeam = Object.keys(teamPoints).reduce((a, b) => teamPoints[a] > teamPoints[b] ? a : b, 'Independent');

    const engagement = tasks?.map(t => ({
        id: t.id,
        title: t.title,
        submissions: t.submissions?.length || 0,
        total: profiles?.length || 1, 
        points: t.points,
        status: t.is_active ? 'active' : 'upcoming'
    })) || [];

    setStats({
      activeChallenge: currentDay,
      currentDay: currentDay,
      topTeam,
      topClient,
      activeCount: profiles?.length || 0,
      pendingCount: submissions?.filter(s => s.status === 'under-review').length || 0,
      taskEngagement: engagement
    });
  };

  const currentWeek = Math.ceil(stats.currentDay / 7);
  const weekTitles = ["Foundation", "Commitment", "Ascension"];

  const metrics = [
    { label: "Active Challenge", value: stats.activeChallenge, suffix: "Season ", icon: Trophy, color: "#9f4022" },
    { label: "Current Day", value: stats.currentDay, suffix: "Day ", icon: Calendar, color: "#747440" },
    { label: "Top Team", value: stats.topTeam, suffix: "🏆 ", icon: Users, color: "#344161" },
    { label: "Top Client", value: stats.topClient, suffix: "⭐ ", icon: Award, color: "#d27440" },
  ];

  // Dynamic Week Days Calculation
  const startDayOfCurrentWeek = (currentWeek - 1) * 7 + 1;
  const weekDays = Array.from({ length: 7 }, (_, i) => {
    const dayNum = startDayOfCurrentWeek + i;
    let status = "future";
    if (dayNum < stats.currentDay) status = "completed";
    else if (dayNum === stats.currentDay) status = "current";
    return { day: dayNum, status };
  });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '48px' }}>
      {/* Calendar Progress Widget */}
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, ease: [0.19, 1, 0.22, 1] }}
        className="premium-card"
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          textAlign: 'center',
          padding: '40px 20px'
        }}
      >
        <p style={{ fontSize: '10px', fontWeight: 'bold', color: '#9f4022', textTransform: 'uppercase', letterSpacing: '0.4em', marginBottom: '16px' }}>CHALLENGE PROGRESS</p>
        <h2 style={{ fontSize: '28px', fontFamily: "'Bodoni Moda', serif", fontWeight: 'bold', color: '#53372b', margin: 0 }}>WEEK {currentWeek} — {weekTitles[currentWeek-1]?.toUpperCase() || 'PUSH THROUGH'}</h2>
        <p style={{ fontSize: '16px', color: '#53372b', marginTop: '8px', marginBottom: '8px', fontFamily: "'Bodoni Moda', serif", fontStyle: 'italic', fontWeight: 'bold' }}>Day {stats.currentDay} of 21</p>
        
        {/* Synchronized Global Date Display */}
        <p style={{ fontSize: '11px', color: '#9f4022', fontWeight: '900', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '32px' }}>
          {new Date().toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' })}
        </p>
        
        <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', flexWrap: 'wrap' }}>
          {weekDays.map((day, idx) => (
            <motion.div
              key={idx}
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: idx * 0.1, duration: 0.5 }}
              style={{
                width: '56px',
                height: '70px',
                borderRadius: '12px',
                backgroundColor: day.status === 'current' ? '#9f4022' : 'var(--hb-beige)',
                border: '1px solid rgba(198, 198, 198, 0.3)',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                boxShadow: day.status === 'current' ? '0 10px 20px rgba(159, 64, 34, 0.2)' : 'none'
              }}
            >
              <span style={{ fontSize: '9px', fontWeight: 'bold', color: day.status === 'current' ? 'white' : 'rgba(83, 55, 43, 0.4)' }}>DAY {day.day}</span>
              <div style={{ color: day.status === 'current' ? 'white' : day.status === 'completed' ? '#9f4022' : 'rgba(83, 55, 43, 0.2)' }}>
                {day.status === 'completed' && <CheckCircle2 size={20} />}
                {day.status === 'current' && <motion.div animate={{ scale: [1, 1.2, 1] }} transition={{ repeat: Infinity, duration: 2 }}><CheckCircle2 size={20} /></motion.div>}
                {day.status === 'future' && <Clock size={20} opacity={0.3} />}
              </div>
            </motion.div>
          ))}
        </div>
      </motion.div>

      {/* Task Engagement Panel */}
      <motion.div 
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2, duration: 0.8 }}
        className="premium-card"
        style={{ padding: '32px' }}
      >
         <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '32px' }}>
            <div>
               <p style={{ fontSize: '10px', fontWeight: 'bold', color: '#9f4022', textTransform: 'uppercase', letterSpacing: '0.4em', marginBottom: '8px' }}>PROTOCOL STATUS</p>
               <h3 style={{ fontSize: '24px', fontFamily: "'Bodoni Moda', serif", color: '#53372b', fontWeight: 'bold', margin: '0 0 12px 0' }}>Daily Task Engagement</h3>
            </div>
            <div style={{ padding: '8px 16px', background: 'rgba(111, 142, 124, 0.1)', borderRadius: '9999px', color: '#6f8e7c', fontSize: '10px', fontWeight: 'bold' }}>
               LIVE SYNC ACTIVE
            </div>
         </div>
         
         <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            {stats.taskEngagement.map((task) => {
               const percentage = (task.submissions / task.total) * 100;
               return (
                  <div key={task.id} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                     <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                           <div style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: task.status === 'upcoming' ? 'rgba(83,55,43,0.1)' : '#9f4022' }} />
                           <span style={{ fontSize: '14px', fontWeight: 'bold', color: '#53372b' }}>{task.title}</span>
                           <span style={{ fontSize: '10px', fontWeight: '900', color: 'rgba(83,55,43,0.3)', textTransform: 'uppercase' }}>{task.points} PTS</span>
                        </div>
                        <div style={{ textAlign: 'right' }}>
                           <span style={{ fontSize: '12px', fontWeight: 'bold', color: '#53372b' }}>{task.submissions}</span>
                           <span style={{ fontSize: '12px', color: 'rgba(83,55,43,0.4)' }}> / {task.total} Submitted</span>
                        </div>
                     </div>
                     <div style={{ width: '100%', height: '8px', backgroundColor: '#fcfaf5', borderRadius: '4px', overflow: 'hidden' }}>
                        <motion.div 
                          initial={{ width: 0 }}
                          animate={{ width: `${percentage}%` }}
                          transition={{ duration: 1, ease: "easeOut" }}
                          style={{ height: '100%', backgroundColor: task.status === 'upcoming' ? 'rgba(83,55,43,0.05)' : '#9f4022', borderRadius: '4px' }}
                        />
                     </div>
                  </div>
               );
            })}
            {stats.taskEngagement.length === 0 && <p style={{ textAlign: 'center', opacity: 0.5 }}>No daily protocols configured.</p>}
         </div>
      </motion.div>

      {/* Metrics Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(1, 1fr)', gap: '32px' }} className="md:grid-cols-2">
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '24px' }}>
          {metrics.map((metric, index) => (
            <motion.div
              key={metric.label}
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.2 + (index * 0.1), ease: [0.19, 1, 0.22, 1] }}
              className="premium-card"
              style={{ 
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                height: '160px'
              }}
              whileHover={{ y: -8, boxShadow: '0 12px 30px rgba(83, 55, 43, 0.1)' }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ width: '40px', height: '40px', backgroundColor: `${metric.color}15`, color: metric.color, borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <metric.icon size={20} style={{ margin: 'auto' }} />
                </div>
                <div style={{ fontSize: '9px', fontWeight: 'bold', color: 'rgba(83, 55, 43, 0.2)', letterSpacing: '0.2em', textTransform: 'uppercase' }}>Live</div>
              </div>
              <div>
                <h3 style={{ fontSize: '10px', fontWeight: 'bold', letterSpacing: '0.2em', color: 'rgba(83, 55, 43, 0.4)', textTransform: 'uppercase', marginBottom: '8px', margin: 0 }}>
                  {metric.label}
                </h3>
                <p style={{ fontSize: '24px', fontFamily: "'Bodoni Moda', serif", fontWeight: 'bold', color: '#53372b', margin: 0, display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span style={{ fontSize: '0.6em', opacity: 0.5, fontWeight: 'normal' }}>{metric.suffix}</span>
                  <AnimatedNumber value={metric.value} />
                </p>
              </div>
            </motion.div>
          ))}
        </div>

        {/* Home Widget Card Extra */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.6, ease: [0.19, 1, 0.22, 1] }}
          style={{ 
            background: 'linear-gradient(135deg, #9f4022 0%, #a9674d 100%)',
            borderRadius: '24px',
            padding: '40px',
            color: 'white',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            position: 'relative',
            overflow: 'hidden'
          }}
        >
           <div style={{ position: 'absolute', top: '-20%', right: '-20%', width: '300px', height: '300px', backgroundColor: 'white', opacity: 0.05, borderRadius: '50%' }} />
           <p style={{ fontSize: '10px', fontWeight: 'bold', color: 'rgba(255,255,255,0.6)', textTransform: 'uppercase', letterSpacing: '0.4em', marginBottom: '16px' }}>SYSTEM VITALITY</p>
           <h3 style={{ fontSize: '32px', fontFamily: "'Bodoni Moda', serif", fontWeight: 'bold', margin: 0, marginBottom: '8px' }}>Global Velocity</h3>
           <p style={{ fontSize: '14px', color: 'rgba(255,255,255,0.7)', lineHeight: '1.6', marginBottom: '24px' }}>Challenge engagement is currently tracking live from the cloud. No critical latency detected in validation queue.</p>
           <div style={{ display: 'flex', gap: '32px' }}>
              <div>
                 <p style={{ fontSize: '9px', fontWeight: 'bold', textTransform: 'uppercase', opacity: 0.6, margin: 0 }}>Active clients</p>
                 <p style={{ fontSize: '24px', fontWeight: 'bold', margin: 0 }}>{stats.activeCount}</p>
              </div>
              <div>
                 <p style={{ fontSize: '9px', fontWeight: 'bold', textTransform: 'uppercase', opacity: 0.6, margin: 0 }}>Pending review</p>
                 <p style={{ fontSize: '24px', fontWeight: 'bold', margin: 0 }}>{stats.pendingCount}</p>
              </div>
           </div>
        </motion.div>
      </div>
    </div>
  );
}
