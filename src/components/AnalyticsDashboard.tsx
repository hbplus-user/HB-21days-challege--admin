"use client";

import { motion } from "framer-motion";
import { BarChart3, TrendingUp, Users, CheckCircle2, Award, Zap, Activity } from "lucide-react";
import { Line, Bar, Doughnut } from "react-chartjs-2";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  Filler
} from 'chart.js';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

const chartOptions = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: { display: false },
    tooltip: {
      backgroundColor: '#53372b',
      titleColor: '#ede0d0',
      bodyColor: '#ede0d0',
      borderRadius: 12,
      padding: 16,
      usePointStyle: true,
      displayColors: false
    }
  },
  scales: {
    y: { display: false },
    x: { grid: { display: false }, ticks: { color: 'rgba(83, 55, 43, 0.4)', font: { size: 10, weight: 'bold' } } }
  }
};

const submissionData = {
  labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
  datasets: [{
    label: 'Uploads',
    data: [720, 840, 680, 920, 1100, 1240, 1050],
    borderColor: '#9f4022',
    backgroundColor: 'rgba(159, 64, 34, 0.1)',
    fill: true,
    tension: 0.4,
    pointRadius: 6,
    pointBackgroundColor: '#9f4022',
    pointBorderColor: '#white',
    pointBorderWidth: 2
  }]
};

const completionData = {
  labels: ['Week 1', 'Week 2', 'Week 3'],
  datasets: [{
    data: [94, 78, 0],
    backgroundColor: ['#9f4022', '#747440', '#ede0d0'],
    borderWidth: 0,
    borderRadius: 8
  }]
};

export function AnalyticsDashboard() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '48px' }}>
      
      {/* Header Summary */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '16px', borderBottom: '1px solid rgba(83, 55, 43, 0.05)', paddingBottom: '32px' }}>
         <BarChart3 size={32} color="#9f4022" />
         <div>
            <h3 style={{ fontSize: '30px', fontFamily: "'Bodoni Moda', serif", color: '#53372b', fontWeight: '900', margin: 0, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Performance Oversight</h3>
            <p style={{ color: 'rgba(83, 55, 43, 0.4)', fontSize: '14px', marginTop: '4px', margin: 0 }}>Strategic analysis of challenge engagement and behavioral cascades.</p>
         </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: '32px' }}>
        
        {/* Submissions Trend */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          style={{
            background: 'white',
            borderRadius: '24px',
            padding: '32px',
            border: '1px solid rgba(198, 198, 198, 0.3)',
            boxShadow: '0 4px 20px rgba(83, 55, 43, 0.05)',
            height: '400px',
            display: 'flex',
            flexDirection: 'column'
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '32px' }}>
             <div>
               <p style={{ fontSize: '10px', fontWeight: 'bold', color: '#9f4022', textTransform: 'uppercase', letterSpacing: '0.3em', margin: 0, marginBottom: '4px' }}>ENGAGEMENT PROTOCOL</p>
               <h4 style={{ fontSize: '20px', fontFamily: "'Bodoni Moda', serif", color: '#53372b', fontWeight: 'bold', margin: 0 }}>Evidence Upload Trends</h4>
             </div>
             <div style={{ textAlign: 'right' }}>
               <TrendingUp size={24} color="#6f8e7c" />
               <p style={{ fontSize: '14px', fontWeight: 'bold', color: '#6f8e7c', margin: 0 }}>+12.4%</p>
             </div>
          </div>
          <div style={{ flex: 1 }}>
             <Line data={submissionData} options={chartOptions as any} />
          </div>
        </motion.div>

        {/* Comparison Stats Cards Container */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(1, 1fr)', gap: '24px' }}>
           <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '24px' }}>
             <div style={{ background: '#f5f2e9', borderRadius: '16px', padding: '24px', border: '1px solid rgba(198, 198, 198, 0.2)' }}>
                <Activity size={20} color="#9f4022" style={{ marginBottom: '16px' }} />
                <p style={{ fontSize: '10px', fontWeight: 'bold', color: 'rgba(83, 55, 43, 0.4)', textTransform: 'uppercase', letterSpacing: '0.1em', margin: 0 }}>Participation</p>
                <p style={{ fontSize: '24px', fontWeight: 'bold', color: '#53372b', margin: 0 }}>89.2%</p>
             </div>
             <div style={{ background: '#f5f2e9', borderRadius: '16px', padding: '24px', border: '1px solid rgba(198, 198, 198, 0.2)' }}>
                <CheckCircle2 size={20} color="#747440" style={{ marginBottom: '16px' }} />
                <p style={{ fontSize: '10px', fontWeight: 'bold', color: 'rgba(83, 55, 43, 0.4)', textTransform: 'uppercase', letterSpacing: '0.1em', margin: 0 }}>Retention</p>
                <p style={{ fontSize: '24px', fontWeight: 'bold', color: '#53372b', margin: 0 }}>94.1%</p>
             </div>
           </div>
           
           <div style={{ flex: 1, background: '#53372b', borderRadius: '24px', padding: '40px', color: '#ede0d0', position: 'relative', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ position: 'absolute', top: '-10%', right: '-10%', width: '200px', height: '200px', backgroundColor: 'white', opacity: 0.05, borderRadius: '50%' }} />
              <div>
                 <Zap size={32} color="#c99d5d" style={{ marginBottom: '16px' }} />
                 <h4 style={{ fontSize: '24px', fontFamily: "'Bodoni Moda', serif", fontWeight: 'bold', margin: 0, marginBottom: '8px' }}>Velocity Protocol</h4>
                 <p style={{ fontSize: '13px', opacity: 0.6, margin: 0 }}>Average submission interval: **2.4 hours** post-unlock.</p>
              </div>
              <div style={{ textAlign: 'right' }}>
                 <p style={{ fontSize: '48px', fontWeight: 'bold', margin: 0, fontFamily: "'Bodoni Moda', serif" }}>A+</p>
                 <p style={{ fontSize: '8px', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '0.2em', opacity: 0.4, margin: 0 }}>STATUS SCORE</p>
              </div>
           </div>
        </div>

      </div>
    </div>
  );
}
