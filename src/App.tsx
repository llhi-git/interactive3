/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useMemo, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Zap, 
  Settings, 
  Lock, 
  Unlock, 
  Activity, 
  Terminal as TerminalIcon,
  ChevronRight,
  RefreshCw,
  AlertTriangle,
  CheckCircle2
} from 'lucide-react';
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  ResponsiveContainer, 
  ReferenceLine 
} from 'recharts';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// --- Utils ---
const generateSignalData = (type: string, params: any) => {
  const points = [];
  const duration = 2; // seconds
  const step = 0.01;
  const numPoints = duration / step;

  for (let i = 0; i < numPoints; i++) {
    const t = i * step;
    let y = 0;

    switch (type) {
      case 'sinusoid':
        y = (params.amplitude || 1) * Math.sin(2 * Math.PI * (params.frequency || 1) * t);
        break;
      case 'rect':
        const width = params.width || 0.5;
        const center = params.center || 1;
        y = Math.abs(t - center) < width / 2 ? (params.height || 1) : 0;
        break;
      case 'sum_rect':
        const r1 = params.rect1;
        const r2 = params.rect2;
        const y1 = Math.abs(t - r1.center) < r1.width / 2 ? r1.height : 0;
        const y2 = Math.abs(t - r2.center) < r2.width / 2 ? r2.height : 0;
        y = y1 + y2;
        break;
      case 'periodic_rect':
        const T = params.period || 1;
        const pWidth = params.width || 0.4;
        const pHeight = params.height || 2;
        const tInPeriod = t % T;
        y = tInPeriod < pWidth ? pHeight : 0;
        break;
      case 'tri':
        const tWidth = params.width || 1;
        const tCenter = params.center || 1;
        const dist = Math.abs(t - tCenter);
        y = dist < tWidth / 2 ? (params.height || 1) * (1 - (2 * dist) / tWidth) : 0;
        break;
      case 'sinc':
        const x = Math.PI * (t - 1) * (params.bandwidth || 5);
        y = x === 0 ? (params.height || 1) : (params.height || 1) * (Math.sin(x) / x);
        break;
    }
    points.push({ t: t.toFixed(2), y });
  }
  return points;
};

// --- Components ---

const SignalPlot = ({ data, targetData, color = "#0891b2", targetColor = "#cbd5e1" }: { data: any[], targetData?: any[], color?: string, targetColor?: string }) => (
  <div className="h-full w-full bg-slate-50 border border-slate-200 rounded-lg overflow-hidden relative group shadow-inner">
    <div className="absolute inset-0 bg-[linear-gradient(rgba(0,0,0,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(0,0,0,0.02)_1px,transparent_1px)] bg-[size:20px_20px]" />
    <ResponsiveContainer width="100%" height="100%">
      <LineChart data={data} margin={{ top: 20, right: 20, left: -20, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.05)" />
        <XAxis dataKey="t" hide />
        <YAxis domain={[-3, 3]} hide />
        {targetData && (
          <Line 
            type="monotone" 
            data={targetData} 
            dataKey="y" 
            stroke={targetColor} 
            strokeWidth={1} 
            strokeDasharray="4 4"
            dot={false} 
            isAnimationActive={false}
          />
        )}
        <Line 
          type="monotone" 
          dataKey="y" 
          stroke={color} 
          strokeWidth={3} 
          dot={false} 
          isAnimationActive={false}
          className="drop-shadow-[0_2px_4px_rgba(0,0,0,0.1)]"
        />
      </LineChart>
    </ResponsiveContainer>
  </div>
);

const Terminal = ({ messages }: { messages: string[] }) => {
  return (
    <div className="bg-slate-900 p-4 font-mono text-cyan-400 border border-slate-700 rounded-lg h-40 overflow-y-auto mb-6 shadow-2xl scrollbar-thin">
      {messages.map((msg, i) => (
        <div key={i} className="flex gap-2 mb-1 animate-in fade-in slide-in-from-left-2 transition-all duration-300 text-[10px]">
          <span className="opacity-30">[{new Date().toLocaleTimeString()}]</span>
          <span className="text-slate-500 tracking-tighter italic">SYS:</span>
          <span className="text-cyan-300 uppercase font-bold">{msg}</span>
        </div>
      ))}
    </div>
  );
};

// --- Main App ---

type RoomId = 'intro' | 'sinusoid' | 'summation_rect' | 'energy_rect' | 'energy_tri' | 'power_rect' | 'sinc' | 'escaped';

export default function App() {
  const [room, setRoom] = useState<RoomId>('intro');
  const [messages, setMessages] = useState<string[]>(["Initializing Laboratory Subsystems...", "System Online. Welcome, Technician."]);
  const [unlockedState, setUnlockedState] = useState({ sinusoid: false, summation: false, rect: false, tri: false, power: false, sinc: false });

  // Room 1 State
  const [params1, setParams1] = useState({ amplitude: 1.5, frequency: 2 });
  const targetParams1 = useMemo(() => ({ amplitude: 2.0, frequency: 4 }), []);
  const data1 = useMemo(() => generateSignalData('sinusoid', params1), [params1]);
  const targetData1 = useMemo(() => generateSignalData('sinusoid', targetParams1), [targetParams1]);

  // Room 1.5 State (Summation)
  const [roomSumInput, setRoomSumInput] = useState("");
  const [roomSumError, setRoomSumError] = useState("");
  const summationParams = { 
    rect1: { height: 1.5, width: 0.6, center: 0.8 }, 
    rect2: { height: 1.0, width: 0.6, center: 1.1 } 
  }; // Overlap from t=0.8 to 1.1 ensures a peak of 2.5
  const dataSum = useMemo(() => generateSignalData('sum_rect', summationParams), []);

  // Room 2 State (Rect)
  const [room2Input, setRoom2Input] = useState("");
  const [room2Error, setRoom2Error] = useState("");
  const room2Signal = { height: 2, width: 0.8, type: 'rect' }; 
  const data2 = useMemo(() => generateSignalData('rect', room2Signal), []);

  // Room 2b State (Tri)
  const [room2bInput, setRoom2bInput] = useState("");
  const [room2bError, setRoom2bError] = useState("");
  const room2bSignal = { height: 3, width: 1.0, type: 'tri' }; // E = (3^2 * 1) / 3 = 3
  const data2b = useMemo(() => generateSignalData('tri', room2bSignal), []);

  // Room 2c State (Power)
  const [roomPowerInput, setRoomPowerInput] = useState("");
  const [roomPowerError, setRoomPowerError] = useState("");
  const powerParams = { height: 2, width: 0.4, period: 1.0 }; // P = (H^2 * W) / T = (4 * 0.4) / 1 = 1.6
  const dataPower = useMemo(() => generateSignalData('periodic_rect', powerParams), []);

  // Room 3 State (Sinc)
  const [room3Input, setRoom3Input] = useState("");
  const [room3Error, setRoom3Error] = useState("");
  const sincSignal = { bandwidth: 5, height: 2 };
  const data3 = useMemo(() => generateSignalData('sinc', sincSignal), []);

  const addMessage = (msg: string) => setMessages(prev => [...prev.slice(-10), msg]);

  const checkRoom1 = () => {
    if (Math.abs(params1.amplitude - targetParams1.amplitude) < 0.1 && 
        Math.abs(params1.frequency - targetParams1.frequency) < 0.1) {
      addMessage("OSCILLOSCOPE SYNCED. SEAL 1 DISENGAGED.");
      setUnlockedState(s => ({ ...s, sinusoid: true }));
      setRoom('summation_rect');
    } else {
      addMessage("ERROR: PHASE MISMATCH. CALIBRATE MAGNITUDE AND FREQUENCY.");
    }
  };

  const checkRoomSum = () => {
    const val = parseFloat(roomSumInput);
    if (Math.abs(val - 2.5) < 0.1) {
      addMessage("SUMMATION VERIFIED. INTERCEPTION MODULE UNLOCKED.");
      setUnlockedState(s => ({ ...s, summation: true }));
      setRoom('energy_rect');
    } else {
      setRoomSumError("Incorrect Peak Magnitude.");
      addMessage("INTERFERENCE DETECTED: Summation calculation error.");
    }
  };

  const checkRoom2 = () => {
    const val = parseFloat(room2Input);
    if (Math.abs(val - 3.2) < 0.1) {
      addMessage("RECTANGULAR ENERGY VERIFIED. SUB-GRID A STABILIZED.");
      setUnlockedState(s => ({ ...s, rect: true }));
      setRoom('energy_tri');
    } else {
      setRoom2Error("Incorrect Energy Value.");
      addMessage("GRID BORDER FAILURE: Calculation rejected.");
    }
  };

  const checkRoom2b = () => {
    const val = parseFloat(room2bInput);
    if (Math.abs(val - 3.0) < 0.1) {
      addMessage("TRIANGULAR ENERGY VERIFIED. SUB-GRID B STABILIZED.");
      setUnlockedState(s => ({ ...s, tri: true }));
      setRoom('power_rect');
    } else {
      setRoom2bError("Incorrect Energy Value (Hint: E = H²W/3)");
      addMessage("GRID CORE FAILURE: Triangular wave energy mismatch.");
    }
  };

  const checkRoomPower = () => {
    const val = parseFloat(roomPowerInput);
    if (Math.abs(val - 1.6) < 0.1) {
      addMessage("AVERAGE POWER VERIFIED. UNINTERRUPTIBLE POWER SUPPLY ONLINE.");
      setUnlockedState(s => ({ ...s, power: true }));
      setRoom('sinc');
    } else {
      setRoomPowerError("Incorrect Avg Power (Hint: P = E_period / T)");
      addMessage("POWER DISSIPATION ERR: Average power mismatch.");
    }
  };

  const checkRoom3 = () => {
    if (room3Input.toLowerCase() === "sinc") {
      addMessage("ENCRYPTION BROKEN. FINAL DOOR UNLOCKED.");
      setUnlockedState(s => ({ ...s, sinc: true }));
      setRoom('escaped');
    } else {
      setRoom3Error("Incorrect identification.");
      addMessage("ACCESS DENIED: Pattern recognized as non-standard.");
    }
  };

  const resetGame = () => {
    setRoom('intro');
    setUnlockedState({ sinusoid: false, rect: false, tri: false, sinc: false });
    setMessages(["Rebooting... Welcome back, Technician."]);
  };

  return (
    <div className="min-h-screen bg-[#f8fafc] text-slate-700 font-sans flex flex-col relative border-8 border-slate-200 overflow-hidden selection:bg-cyan-500/10">
      {/* Absolute background accent */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(8,145,178,0.05),transparent)] pointer-events-none"></div>

      <header className="h-16 border-b border-slate-200 flex items-center justify-between px-8 bg-white z-10 shadow-sm">
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 bg-cyan-100 rounded flex items-center justify-center border border-cyan-200">
            <div className="w-4 h-4 bg-cyan-600 rounded-sm animate-pulse"></div>
          </div>
          <h1 className="text-xl font-bold tracking-widest text-cyan-700">
            SIGNAL LAB <span className="text-slate-400">v2.05</span>
          </h1>
        </div>
        <div className="hidden md:flex gap-8 text-[10px] font-mono font-bold">
          <div className="flex flex-col items-end">
            <span className="text-slate-400 uppercase">Status</span>
            <span className="text-cyan-600">CLEANROOM_MODE_ON</span>
          </div>
          <div className="flex flex-col items-end border-l border-slate-200 pl-8">
            <span className="text-slate-400 uppercase">Safety</span>
            <span className="text-slate-900 tracking-tighter italic">HIGH_VISIBILITY_ENABLED</span>
          </div>
        </div>
      </header>

      <main className="flex-1 flex flex-col md:flex-row gap-4 p-4 z-10 overflow-hidden">
        {/* Left Section: Interaction Area */}
        <section className="flex-[2] flex flex-col gap-4 overflow-y-auto pr-1">
          <AnimatePresence mode="wait">
            {room === 'intro' && (
              <motion.div 
                key="intro"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="flex-1 bg-white border border-slate-200 rounded-lg p-10 relative overflow-hidden scanlines flex flex-col items-center justify-center text-center shadow-lg shadow-cyan-900/5 transition-all"
              >
                <div className="p-4 bg-cyan-50 rounded-full border border-cyan-100 mb-6">
                  <Lock className="w-12 h-12 text-cyan-600" />
                </div>
                <h2 className="text-3xl font-bold text-slate-800 mb-4 tracking-tight">Level 0: Calibration Needed</h2>
                <p className="text-sm text-slate-500 mb-8 max-w-md mx-auto leading-relaxed uppercase tracking-wider font-semibold">
                  The signal cleanroom has been locked down due to harmonic drift. Review the high-contrast data feeds and restore balance.
                </p>
                <button 
                  onClick={() => setRoom('sinusoid')}
                  className="px-10 py-4 bg-cyan-600 text-white font-black uppercase tracking-[0.2em] rounded shadow-lg shadow-cyan-500/20 hover:bg-cyan-700 transition-all border border-cyan-600"
                >
                  Enter Lab
                </button>
              </motion.div>
            )}

            {room === 'sinusoid' && (
              <motion.div 
                key="sinusoid"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="flex-1 flex flex-col gap-4"
              >
                <div className="flex-1 bg-white border border-slate-200 rounded-lg p-6 relative overflow-hidden scanlines flex flex-col shadow-sm">
                  <div className="flex justify-between items-start mb-6">
                    <div>
                      <h2 className="text-sm font-mono text-cyan-700 uppercase tracking-widest font-bold">Scope Feed: Sine-Visualizer</h2>
                      <p className="text-[10px] text-slate-400 font-bold">ADJUST GENERATOR TO MATCH MASTER_FEED (DASHED)</p>
                    </div>
                  </div>
                  
                  <div className="flex-1 min-h-[300px]">
                    <SignalPlot data={data1} targetData={targetData1} color="#0891b2" targetColor="#cbd5e1" />
                  </div>

                  <div className="grid grid-cols-2 gap-4 mt-6">
                    <div className="bg-slate-50 border border-slate-100 p-4 rounded-lg">
                      <div className="flex justify-between text-[10px] text-slate-500 uppercase mb-3 font-mono font-bold">
                        <span>Amplitude (A)</span>
                        <span className="text-cyan-700">{params1.amplitude.toFixed(1)}V</span>
                      </div>
                      <input 
                        type="range" min="0.1" max="3" step="0.1" 
                        value={params1.amplitude} 
                        onChange={e => setParams1(p => ({ ...p, amplitude: parseFloat(e.target.value) }))}
                        className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-cyan-600"
                      />
                    </div>
                    <div className="bg-slate-50 border border-slate-100 p-4 rounded-lg">
                      <div className="flex justify-between text-[10px] text-slate-500 uppercase mb-3 font-mono font-bold">
                        <span>Frequency (f)</span>
                        <span className="text-cyan-700">{params1.frequency.toFixed(1)}Hz</span>
                      </div>
                      <input 
                        type="range" min="1" max="10" step="0.1" 
                        value={params1.frequency} 
                        onChange={e => setParams1(p => ({ ...p, frequency: parseFloat(e.target.value) }))}
                        className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-cyan-600"
                      />
                    </div>
                  </div>
                </div>

                <div className="h-32 bg-white border border-slate-200 rounded-lg p-4 flex gap-4 shadow-sm">
                  <div className="flex-1 p-3 bg-slate-50 border border-slate-100 rounded text-xs leading-relaxed text-slate-600 flex items-center gap-4">
                    <div className="w-12 h-12 rounded bg-amber-50 border border-amber-200 flex items-center justify-center shrink-0">
                      <Activity className="w-6 h-6 text-amber-600" />
                    </div>
                    <div>
                      <h4 className="text-[10px] font-bold text-amber-700 uppercase mb-1 tracking-widest italic font-mono">Mission: Harmonic Balance</h4>
                      Students should observe how changing A affects the peaks and f affects the density of waves.
                    </div>
                  </div>
                  <button 
                    onClick={checkRoom1}
                    className="w-48 bg-cyan-50 border border-cyan-600 text-cyan-700 rounded text-xs font-bold uppercase tracking-widest hover:bg-cyan-100 transition-all"
                  >
                    Authorize Sync
                  </button>
                </div>
              </motion.div>
            )}

            {room === 'summation_rect' && (
              <motion.div 
                key="summation"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                className="flex-1 flex flex-col gap-4"
              >
                <div className="flex-1 bg-white border border-slate-200 rounded-lg p-6 relative overflow-hidden scanlines flex flex-col shadow-sm">
                  <div className="flex justify-between items-start mb-6">
                    <div>
                      <h2 className="text-sm font-mono text-cyan-700 uppercase tracking-widest font-bold">Processor: Linear Summation</h2>
                      <p className="text-[10px] text-slate-400 font-bold italic">"Y(T) = X1(T) + X2(T)"</p>
                    </div>
                  </div>
                  
                  <div className="flex-1 min-h-[300px]">
                    <SignalPlot data={dataSum} color="#0891b2" />
                  </div>

                  <div className="grid grid-cols-2 gap-4 mt-6">
                    <div className="bg-slate-50 border border-slate-100 p-4 rounded-lg flex flex-col justify-center">
                      <p className="text-[10px] text-slate-500 uppercase font-mono mb-2 font-bold">Component Waves</p>
                      <div className="space-y-1 text-xs font-mono font-bold">
                        <div className="flex justify-between text-slate-500"><span>Rect 1</span> <span className="text-cyan-700">H:1.5, W:0.6, C:0.8</span></div>
                        <div className="flex justify-between text-slate-500"><span>Rect 2</span> <span className="text-cyan-700">H:1.0, W:0.6, C:1.1</span></div>
                      </div>
                    </div>
                    <div className="bg-white border-2 border-cyan-100 p-4 rounded-lg shadow-inner">
                      <p className="text-[10px] text-slate-500 uppercase font-mono mb-2 font-bold">Peak Combined Magnitude</p>
                      <input 
                        type="number" step="0.1"
                        value={roomSumInput}
                        onChange={e => setRoomSumInput(e.target.value)}
                        placeholder="SUM PEAK..."
                        className="w-full bg-slate-50 border border-slate-200 rounded p-2 text-cyan-800 font-mono text-xl focus:outline-none transition-all"
                      />
                      {roomSumError && <p className="text-red-500 text-[9px] mt-1 font-black">{roomSumError}</p>}
                    </div>
                  </div>
                </div>

                <div className="h-32 bg-white border border-slate-200 rounded-lg p-4 flex gap-4">
                  <div className="flex-1 p-3 bg-slate-50 border border-slate-100 rounded text-xs leading-relaxed text-slate-600 flex items-center gap-4">
                    <div className="w-12 h-12 rounded bg-cyan-50 border border-cyan-200 flex items-center justify-center shrink-0">
                      <Activity className="w-6 h-6 text-cyan-600" />
                    </div>
                    <div>
                      <h4 className="text-[10px] font-bold text-cyan-700 uppercase mb-1 tracking-widest italic font-mono">Mission: Superposition</h4>
                      When two pulses overlap, their magnitudes add linearly. Find the maximum value where both pulses interfere constructively.
                    </div>
                  </div>
                  <button 
                    onClick={checkRoomSum}
                    className="w-48 bg-cyan-600 text-white rounded text-xs font-bold uppercase tracking-widest hover:bg-cyan-700 transition-all shadow-md"
                  >
                    Authorize Sum
                  </button>
                </div>
              </motion.div>
            )}

            {room === 'energy_rect' && (
              <motion.div 
                key="energy_rect"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                className="flex-1 flex flex-col gap-4"
              >
                <div className="flex-1 bg-white border border-slate-200 rounded-lg p-6 relative overflow-hidden scanlines flex flex-col shadow-sm">
                  <div className="flex justify-between items-start mb-6">
                    <div>
                      <h2 className="text-sm font-mono text-amber-700 uppercase tracking-widest font-bold">Energy Lab: Rect-Pulse Analysis</h2>
                      <p className="text-[10px] text-slate-400 font-bold italic">"CALCULATE AREA UNDER X-SQUARED CURVE"</p>
                    </div>
                  </div>
                  
                  <div className="flex-1 min-h-[300px]">
                    <SignalPlot data={data2} color="#d97706" />
                  </div>

                  <div className="grid grid-cols-2 gap-4 mt-6">
                    <div className="bg-slate-50 border border-slate-100 p-4 rounded-lg flex flex-col justify-center">
                      <p className="text-[10px] text-slate-500 uppercase font-mono mb-2 font-bold">Signal Constants</p>
                      <div className="space-y-1 text-xs font-mono font-bold">
                        <div className="flex justify-between text-slate-500"><span>Height (H)</span> <span className="text-amber-600">2.0</span></div>
                        <div className="flex justify-between text-slate-500"><span>Width (W)</span> <span className="text-amber-600">0.8</span></div>
                        <div className="flex justify-between text-slate-500"><span>Pattern</span> <span className="text-slate-700">RECT_APERIODIC</span></div>
                      </div>
                    </div>
                    <div className="bg-white border-2 border-cyan-100 p-4 rounded-lg shadow-inner">
                      <p className="text-[10px] text-slate-500 uppercase font-mono mb-2 font-bold">Total Energy (E)</p>
                      <input 
                        type="number" step="0.1"
                        value={room2Input}
                        onChange={e => setRoom2Input(e.target.value)}
                        placeholder="INPUT CALCULATION..."
                        className="w-full bg-slate-50 border border-slate-200 rounded p-2 text-cyan-800 font-mono text-xl focus:outline-none focus:ring-2 focus:ring-cyan-500/20 transition-all"
                      />
                      {room2Error && <p className="text-red-500 text-[9px] mt-1 uppercase font-black">{room2Error}</p>}
                    </div>
                  </div>
                </div>

                <div className="h-32 bg-white border border-slate-200 rounded-lg p-4 flex gap-4">
                  <div className="flex-1 p-3 bg-slate-50 border border-slate-100 rounded text-xs leading-relaxed text-slate-600 flex items-center gap-4">
                    <div className="w-12 h-12 rounded bg-amber-50 border border-amber-200 flex items-center justify-center shrink-0">
                      <Zap className="w-6 h-6 text-amber-600" />
                    </div>
                    <div>
                      <h4 className="text-[10px] font-bold text-amber-700 uppercase mb-1 tracking-widest italic font-mono">Grid Anomaly: Alpha</h4>
                      Formula for energy of rectangular pulse x(t): E = H² * W.
                    </div>
                  </div>
                  <button 
                    onClick={checkRoom2}
                    className="w-48 bg-amber-600 text-white rounded text-xs font-bold uppercase tracking-widest hover:bg-amber-700 transition-all shadow-md"
                  >
                    Energize
                  </button>
                </div>
              </motion.div>
            )}

            {room === 'energy_tri' && (
              <motion.div 
                key="energy_tri"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                className="flex-1 flex flex-col gap-4"
              >
                <div className="flex-1 bg-white border border-slate-200 rounded-lg p-6 relative overflow-hidden scanlines flex flex-col shadow-sm">
                  <div className="flex justify-between items-start mb-6">
                    <div>
                      <h2 className="text-sm font-mono text-purple-700 uppercase tracking-widest font-bold">Energy Lab: Triangular Transformer</h2>
                      <p className="text-[10px] text-slate-400 font-bold italic">"SLOPES AFFECT POWER DISSIPATION"</p>
                    </div>
                  </div>
                  
                  <div className="flex-1 min-h-[300px]">
                    <SignalPlot data={data2b} color="#9333ea" />
                  </div>

                  <div className="grid grid-cols-2 gap-4 mt-6">
                    <div className="bg-slate-50 border border-slate-100 p-4 rounded-lg flex flex-col justify-center">
                      <p className="text-[10px] text-slate-500 uppercase font-mono mb-2 font-bold">Physical Params</p>
                      <div className="space-y-1 text-xs font-mono font-bold">
                        <div className="flex justify-between text-slate-500"><span>Height (H)</span> <span className="text-purple-600">3.0</span></div>
                        <div className="flex justify-between text-slate-500"><span>Width (W)</span> <span className="text-purple-600">1.0</span></div>
                        <div className="flex justify-between text-slate-500"><span>Pattern</span> <span className="text-slate-700">TRI_APERIODIC</span></div>
                      </div>
                    </div>
                    <div className="bg-white border-2 border-purple-100 p-4 rounded-lg shadow-inner">
                      <p className="text-[10px] text-slate-500 uppercase font-mono mb-2 font-bold">Total Energy (E)</p>
                      <input 
                        type="number" step="0.1"
                        value={room2bInput}
                        onChange={e => setRoom2bInput(e.target.value)}
                        placeholder="INPUT CALCULATION..."
                        className="w-full bg-slate-50 border border-slate-200 rounded p-2 text-purple-800 font-mono text-xl focus:outline-none focus:ring-2 focus:ring-purple-500/20 transition-all"
                      />
                      {room2bError && <p className="text-red-500 text-[9px] mt-1 uppercase font-black">{room2bError}</p>}
                    </div>
                  </div>
                </div>

                <div className="h-32 bg-white border border-slate-200 rounded-lg p-4 flex gap-4">
                  <div className="flex-1 p-3 bg-slate-50 border border-slate-100 rounded text-xs leading-relaxed text-slate-600 flex items-center gap-4">
                    <div className="w-12 h-12 rounded bg-purple-50 border border-purple-200 flex items-center justify-center shrink-0">
                      <Zap className="w-6 h-6 text-purple-600" />
                    </div>
                    <div>
                      <h4 className="text-[10px] font-bold text-purple-700 uppercase mb-1 tracking-widest italic font-mono">Grid Anomaly: Beta</h4>
                      Energy of a triangular pulse is given by E = (H² * W) / 3. Solve to unlock the next chamber.
                    </div>
                  </div>
                  <button 
                    onClick={checkRoom2b}
                    className="w-48 bg-purple-600 text-white rounded text-xs font-bold uppercase tracking-widest hover:bg-purple-700 transition-all shadow-md"
                  >
                    Extract Power
                  </button>
                </div>
              </motion.div>
            )}

            {room === 'power_rect' && (
              <motion.div 
                key="power"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                className="flex-1 flex flex-col gap-4"
              >
                <div className="flex-1 bg-white border border-slate-200 rounded-lg p-6 relative overflow-hidden scanlines flex flex-col shadow-sm">
                  <div className="flex justify-between items-start mb-6">
                    <div>
                      <h2 className="text-sm font-mono text-emerald-700 uppercase tracking-widest font-bold">Regulator: Periodic Power Drain</h2>
                      <p className="text-[10px] text-slate-400 font-bold italic">"AVERAGE POWER OVER ONE PERIOD: P = (1/T) ∫ |x(t)|² dt"</p>
                    </div>
                  </div>
                  
                  <div className="flex-1 min-h-[300px]">
                    <SignalPlot data={dataPower} color="#10b981" />
                  </div>

                  <div className="grid grid-cols-2 gap-4 mt-6">
                    <div className="bg-slate-50 border border-slate-100 p-4 rounded-lg flex flex-col justify-center">
                      <p className="text-[10px] text-slate-500 uppercase font-mono mb-2 font-bold">Periodic Specs</p>
                      <div className="space-y-1 text-xs font-mono font-bold">
                        <div className="flex justify-between text-slate-500"><span>Height (H)</span> <span className="text-emerald-600">2.0</span></div>
                        <div className="flex justify-between text-slate-500"><span>Width (W)</span> <span className="text-emerald-600">0.4</span></div>
                        <div className="flex justify-between text-slate-500"><span>Period (T)</span> <span className="text-slate-900 italic">1.0s</span></div>
                      </div>
                    </div>
                    <div className="bg-white border-2 border-emerald-100 p-4 rounded-lg shadow-inner">
                      <p className="text-[10px] text-slate-500 uppercase font-mono mb-2 font-bold">Average Power (P_avg)</p>
                      <input 
                        type="number" step="0.1"
                        value={roomPowerInput}
                        onChange={e => setRoomPowerInput(e.target.value)}
                        placeholder="P_AVG..."
                        className="w-full bg-slate-50 border border-slate-200 rounded p-2 text-emerald-800 font-mono text-xl focus:outline-none transition-all"
                      />
                      {roomPowerError && <p className="text-red-500 text-[9px] mt-1 uppercase font-black">{roomPowerError}</p>}
                    </div>
                  </div>
                </div>

                <div className="h-32 bg-white border border-slate-200 rounded-lg p-4 flex gap-4">
                  <div className="flex-1 p-3 bg-slate-50 border border-slate-100 rounded text-xs leading-relaxed text-slate-600 flex items-center gap-4">
                    <div className="w-12 h-12 rounded bg-emerald-50 border border-emerald-200 flex items-center justify-center shrink-0">
                      <Zap className="w-6 h-6 text-emerald-600" />
                    </div>
                    <div>
                      <h4 className="text-[10px] font-bold text-emerald-700 uppercase mb-1 tracking-widest italic font-mono">Mission: Load Regulation</h4>
                      Average power for a periodic square wave is (H² * W) / T. Notice how power is always Energy per unit time.
                    </div>
                  </div>
                  <button 
                    onClick={checkRoomPower}
                    className="w-48 bg-emerald-600 text-white rounded text-xs font-bold uppercase tracking-widest hover:bg-emerald-700 transition-all shadow-md"
                  >
                    Stabilize Grid
                  </button>
                </div>
              </motion.div>
            )}

            {room === 'sinc' && (
              <motion.div 
                key="sinc"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                className="flex-1 flex flex-col gap-4"
              >
                <div className="flex-1 bg-white border border-slate-200 rounded-lg p-6 relative overflow-hidden scanlines flex flex-col shadow-sm">
                  <div className="flex justify-between items-start mb-6">
                    <div>
                      <h2 className="text-sm font-mono text-blue-700 uppercase tracking-widest font-bold">Decoder: Sinc-Reconstruction</h2>
                      <p className="text-[10px] text-slate-400 font-bold italic">"THE FUNDAMENTAL LIMIT OF SAMPLING"</p>
                    </div>
                  </div>
                  
                  <div className="flex-1 min-h-[300px]">
                    <SignalPlot data={data3} color="#2563eb" />
                  </div>

                  <div className="mt-6 flex flex-col items-center">
                    <div className="max-w-md w-full">
                      <label className="text-[10px] text-slate-500 uppercase font-mono block mb-2 text-center font-bold">Signal Identity Verification</label>
                      <input 
                        type="text"
                        value={room3Input}
                        onChange={e => setRoom3Input(e.target.value)}
                        placeholder="ENTER SIGNAL NAME..."
                        className="w-full bg-blue-50 border border-blue-200 rounded p-4 text-blue-900 font-mono text-xl text-center focus:outline-none focus:ring-4 focus:ring-blue-500/10 transition-all tracking-[0.3em] font-black"
                      />
                      {room3Error && <p className="text-red-500 text-[10px] mt-2 text-center uppercase font-black">{room3Error}</p>}
                    </div>
                  </div>
                </div>

                <div className="h-32 bg-white border border-slate-200 rounded-lg p-4 flex gap-4 shadow-sm">
                  <div className="flex-1 p-3 bg-slate-50 border border-slate-100 rounded text-xs leading-relaxed text-slate-600 flex items-center gap-4">
                    <div className="w-12 h-12 rounded bg-blue-50 border border-blue-200 flex items-center justify-center shrink-0">
                      <TerminalIcon className="w-6 h-6 text-blue-600" />
                    </div>
                    <div>
                      <h4 className="text-[10px] font-bold text-blue-700 uppercase mb-1 tracking-widest italic font-mono">Pattern Lock: Final</h4>
                      Identify the function sin(πx)/(πx). This function is essential for converting discrete samples back to continuous signals.
                    </div>
                  </div>
                  <button 
                    onClick={checkRoom3}
                    className="w-48 bg-blue-600 text-white rounded text-xs font-bold uppercase tracking-widest hover:bg-blue-700 transition-all font-mono shadow-md"
                  >
                    Decrypt
                  </button>
                </div>
              </motion.div>
            )}

            {room === 'escaped' && (
              <motion.div 
                key="escaped"
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                className="flex-1 flex flex-col items-center justify-center bg-white border border-slate-200 rounded-lg p-10 relative overflow-hidden scanlines text-center shadow-2xl"
              >
                <div className="relative mb-8">
                  <Unlock className="w-24 h-24 text-emerald-600 drop-shadow-xl" />
                  <motion.div 
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ delay: 0.5, type: 'spring' }}
                    className="absolute -top-2 -right-2 bg-emerald-600 text-white p-2 rounded-full border-2 border-white"
                  >
                    <CheckCircle2 className="w-6 h-6" />
                  </motion.div>
                </div>
                <h2 className="text-5xl font-black text-slate-900 mb-2 uppercase tracking-tighter">Exit Unlocked</h2>
                <p className="text-xl text-emerald-600 mb-10 font-bold uppercase tracking-[0.1em] font-mono">All Systems Calibrated • 100% Signal Integrity</p>
                
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-10 text-[10px] font-mono w-full max-w-2xl font-bold">
                  {['SINE_SYNC: OK', 'RECT_ENERGY: OK', 'TRI_POWER: OK', 'SINC_RECON: OK'].map(item => (
                    <div key={item} className="bg-emerald-50 border border-emerald-200 p-3 rounded flex items-center justify-center text-emerald-700 uppercase tracking-tighter">
                      {item}
                    </div>
                  ))}
                </div>

                <button 
                  onClick={resetGame}
                  className="flex items-center gap-2 text-slate-400 hover:text-slate-900 transition-colors uppercase tracking-[0.3em] text-[10px] font-bold py-3 px-6 border border-slate-200 rounded-full bg-slate-50"
                >
                  <RefreshCw className="w-3 h-3" /> System Restart
                </button>
                <p className="mt-8 text-[9px] text-slate-300 font-mono uppercase font-bold">Technician ID: {Math.random().toString(36).substring(7).toUpperCase()}</p>
              </motion.div>
            )}
          </AnimatePresence>
        </section>

        {/* Right Section: Status sidebar */}
        <aside className="w-full md:w-80 flex flex-col gap-4">
          <div className="bg-white border border-slate-200 rounded-lg p-5 shadow-sm">
            <h3 className="text-xs font-bold text-slate-800 uppercase mb-4 flex items-center gap-2">
              <span className={cn(
                "w-2 h-2 rounded-full",
                room === 'escaped' ? "bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]" : "bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.5)]"
              )}></span>
              Lab Dashboard
            </h3>
            <div className="space-y-3">
              <StatusStep 
                num="01" 
                title="Sine Calibration" 
                active={room === 'sinusoid'} 
                cleared={unlockedState.sinusoid} 
                level={unlockedState.sinusoid ? 1 : (room === 'sinusoid' ? 0.5 : 0)} 
              />
              <StatusStep 
                num="02" 
                title="Interference" 
                active={room === 'summation_rect'} 
                cleared={unlockedState.summation} 
                level={unlockedState.summation ? 1 : (room === 'summation_rect' ? 0.5 : 0)} 
              />
              <StatusStep 
                num="03" 
                title="Rect Energy" 
                active={room === 'energy_rect'} 
                cleared={unlockedState.rect}
                level={unlockedState.rect ? 1 : (room === 'energy_rect' ? 0.5 : 0)}
              />
              <StatusStep 
                num="04" 
                title="Tri Energy" 
                active={room === 'energy_tri'} 
                cleared={unlockedState.tri}
                level={unlockedState.tri ? 1 : (room === 'energy_tri' ? 0.5 : 0)}
              />
              <StatusStep 
                num="05" 
                title="Avg Power" 
                active={room === 'power_rect'} 
                cleared={unlockedState.power}
                level={unlockedState.power ? 1 : (room === 'power_rect' ? 0.5 : 0)}
              />
              <StatusStep 
                num="06" 
                title="Functions" 
                active={room === 'sinc'} 
                cleared={unlockedState.sinc}
                level={unlockedState.sinc ? 1 : (room === 'sinc' ? 0.5 : 0)}
              />
            </div>
          </div>

          <div className="flex-1 bg-white border border-slate-200 rounded-lg p-5 flex flex-col shadow-sm">
            <h3 className="text-xs font-bold text-slate-800 uppercase mb-4 border-b border-slate-100 pb-2">Technical Telemetry</h3>
            <Terminal messages={messages} />
            
            <div className="mt-auto space-y-4 pt-4">
              <div className="p-3 bg-cyan-50 border border-cyan-100 rounded shadow-inner">
                <p className="text-[9px] text-cyan-700 mb-2 font-black tracking-widest uppercase italic">Student Reference Material</p>
                <div className="text-[10px] font-mono space-y-2 text-slate-500 leading-tight font-bold">
                  <p>• Sine Wave: <span className="text-cyan-700 italic">peak A, cycle f (Hz)</span></p>
                  <p>• Summation: <span className="text-cyan-700 italic">y(t) = x1(t) + x2(t)</span></p>
                  <p>• Rect Energy: <span className="text-amber-700 italic">H² × W</span></p>
                  <p>• Tri Energy: <span className="text-purple-700 italic">(H² × W) / 3</span></p>
                  <p>• Periodic Power: <span className="text-emerald-700 italic">Energy_period / T</span></p>
                </div>
              </div>
              <div className="bg-slate-50 p-2 rounded text-[9px] font-mono border-l-4 border-cyan-600 flex justify-between items-center text-slate-400 uppercase font-black">
                <span>Core_Visibility:</span>
                <span className="text-emerald-600">HIGH_CONTRAST</span>
              </div>
            </div>
          </div>
        </aside>
      </main>

      <footer className="h-8 border-t border-slate-200 flex items-center px-8 bg-white z-10 justify-between">
        <div className="flex gap-6 text-[9px] font-mono text-slate-400 font-bold">
          <span>X: {Math.floor(Math.random() * 999)}</span>
          <span>Y: {Math.floor(Math.random() * 999)}</span>
          <span>VER: 2.0.5</span>
        </div>
        <div className="text-[9px] font-mono text-slate-400 uppercase tracking-widest font-black">
          SIGNAL_SANCTUARY_EDUCATION • NUS_LABS
        </div>
      </footer>
    </div>
  );
}

function StatusStep({ num, title, active, cleared, level }: { num: string, title: string, active: boolean, cleared: boolean, level: number }) {
  return (
    <div className={cn("flex items-center gap-3 transition-opacity", !active && !cleared && "opacity-30")}>
      <div className={cn(
        "w-6 h-6 rounded border flex items-center justify-center text-[10px] font-mono transition-colors font-bold",
        cleared ? "bg-emerald-100 border-emerald-500 text-emerald-700" : (active ? "bg-cyan-100 border-cyan-500 text-cyan-700" : "bg-slate-50 border-slate-200 text-slate-400")
      )}>
        {cleared ? "✓" : num}
      </div>
      <div className="flex-1">
        <p className={cn("text-xs font-bold uppercase tracking-tighter transition-colors", cleared ? "text-emerald-700" : (active ? "text-cyan-700" : "text-slate-400"))}>
          {cleared ? "CLEARED" : title}
        </p>
        <div className="w-full h-1 bg-slate-100 mt-1 relative overflow-hidden rounded-full border border-slate-200">
          <motion.div 
            initial={{ width: 0 }}
            animate={{ width: `${level * 100}%` }}
            className={cn("h-full", cleared ? "bg-emerald-500" : "bg-cyan-500")} 
          />
        </div>
      </div>
      {cleared && <span className="text-[9px] text-emerald-600 italic font-mono uppercase tracking-tighter font-black">Verified</span>}
      {active && !cleared && <span className="text-[9px] text-cyan-600 animate-pulse font-mono uppercase font-black">Decoding...</span>}
    </div>
  );
}

