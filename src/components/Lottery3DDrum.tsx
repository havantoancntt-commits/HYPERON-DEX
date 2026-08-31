import React, { useRef, useEffect, useState, useCallback } from 'react';
import { soundManager } from '../lib/sound';
import { motion, AnimatePresence } from 'motion/react';
import confetti from 'canvas-confetti';
import {
  Play,
  RotateCw,
  Sparkles,
  Zap,
  Eye,
  Maximize2,
  Volume2,
  VolumeX,
  Radio,
  CheckCircle2,
  RefreshCw,
  ShieldCheck,
} from 'lucide-react';

interface Lottery3DDrumProps {
  isDrawing?: boolean;
  winningNumbers?: number[] | null;
  onDrawComplete?: (numbers: number[]) => void;
  onManualTrigger?: () => void;
  roundId?: number;
  poolName?: string;
  themeColor?: 'gold' | 'cyan' | 'emerald';
}

interface Ball3D {
  id: number;
  digit: number;
  x: number;
  y: number;
  z: number;
  vx: number;
  vy: number;
  vz: number;
  radius: number;
  color: string;
  textColor: string;
  glowColor: string;
}

const BALL_COLORS = [
  { bg: '#EF4444', text: '#FFFFFF', glow: 'rgba(239, 68, 68, 0.6)' }, // 0: Red
  { bg: '#F97316', text: '#FFFFFF', glow: 'rgba(249, 115, 22, 0.6)' }, // 1: Orange
  { bg: '#EAB308', text: '#000000', glow: 'rgba(234, 179, 8, 0.6)' }, // 2: Yellow
  { bg: '#10B981', text: '#FFFFFF', glow: 'rgba(16, 185, 129, 0.6)' }, // 3: Green
  { bg: '#06B6D4', text: '#000000', glow: 'rgba(6, 182, 212, 0.6)' }, // 4: Cyan
  { bg: '#3B82F6', text: '#FFFFFF', glow: 'rgba(59, 130, 246, 0.6)' }, // 5: Blue
  { bg: '#8B5CF6', text: '#FFFFFF', glow: 'rgba(139, 92, 246, 0.6)' }, // 6: Purple
  { bg: '#EC4899', text: '#FFFFFF', glow: 'rgba(236, 72, 153, 0.6)' }, // 7: Pink
  { bg: '#F59E0B', text: '#000000', glow: 'rgba(245, 158, 11, 0.6)' }, // 8: Amber
  { bg: '#14B8A6', text: '#000000', glow: 'rgba(20, 184, 166, 0.6)' }, // 9: Teal
];

export const Lottery3DDrum: React.FC<Lottery3DDrumProps> = ({
  isDrawing = false,
  winningNumbers = null,
  onDrawComplete,
  onManualTrigger,
  roundId = 142,
  poolName = 'Hyperon Mega 6/45 3D Jackpot',
  themeColor = 'gold',
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  // 3D Engine State
  const [isSpinning, setIsSpinning] = useState<boolean>(false);
  const [spinSpeed, setSpinSpeed] = useState<number>(1);
  const [ejectedBalls, setEjectedBalls] = useState<number[]>([]);
  const [soundEnabled, setSoundEnabled] = useState<boolean>(true);
  const [cameraAngle, setCameraAngle] = useState<'front' | 'iso' | 'top' | 'chute'>('iso');
  const [fullStageMode, setFullStageMode] = useState<boolean>(false);
  const [currentDrawStep, setCurrentDrawStep] = useState<number>(0); // 0 to 6
  const [liveSeedCommitment, setLiveSeedCommitment] = useState<string>('0x8f4d9b23c5e8...VRF2.5');

  // Interactive Drag Rotation
  const rotationRef = useRef<{ rotX: number; rotY: number; isDragging: boolean; lastX: number; lastY: number }>({
    rotX: 0.15,
    rotY: 0,
    isDragging: false,
    lastX: 0,
    lastY: 0,
  });

  const ballsRef = useRef<Ball3D[]>([]);
  const animFrameId = useRef<number | null>(null);

  // Initialize 45 physics balls inside the cage
  useEffect(() => {
    const balls: Ball3D[] = [];
    const CAGE_RADIUS = 135;

    for (let i = 0; i < 45; i++) {
      const digit = i % 10;
      const col = BALL_COLORS[digit];
      
      // Random position inside sphere
      const u = Math.random();
      const v = Math.random();
      const theta = u * 2.0 * Math.PI;
      const phi = Math.acos(2.0 * v - 1.0);
      const r = Math.cbrt(Math.random()) * (CAGE_RADIUS - 24);
      const sinPhi = Math.sin(phi);
      
      const x = r * sinPhi * Math.cos(theta);
      const y = r * sinPhi * Math.sin(theta);
      const z = r * Math.cos(phi);

      balls.push({
        id: i,
        digit,
        x,
        y,
        z,
        vx: (Math.random() - 0.5) * 4,
        vy: (Math.random() - 0.5) * 4,
        vz: (Math.random() - 0.5) * 4,
        radius: 13,
        color: col.bg,
        textColor: col.text,
        glowColor: col.glow,
      });
    }

    ballsRef.current = balls;
  }, []);

  // Theme styling helpers
  const themeStyles = {
    gold: {
      border: 'border-amber-500/40',
      glow: 'shadow-amber-500/20',
      accent: 'text-amber-400',
      cageStroke: 'rgba(245, 158, 11, 0.45)',
      cageHighlight: 'rgba(254, 240, 138, 0.9)',
      badge: 'bg-amber-500/15 border-amber-500/30 text-amber-300',
    },
    cyan: {
      border: 'border-cyan-500/40',
      glow: 'shadow-cyan-500/20',
      accent: 'text-cyan-400',
      cageStroke: 'rgba(6, 182, 212, 0.45)',
      cageHighlight: 'rgba(165, 243, 252, 0.9)',
      badge: 'bg-cyan-500/15 border-cyan-500/30 text-cyan-300',
    },
    emerald: {
      border: 'border-emerald-500/40',
      glow: 'shadow-emerald-500/20',
      accent: 'text-emerald-400',
      cageStroke: 'rgba(16, 185, 129, 0.45)',
      cageHighlight: 'rgba(167, 243, 208, 0.9)',
      badge: 'bg-emerald-500/15 border-emerald-500/30 text-emerald-300',
    },
  }[themeColor];

  // 3D Render Loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let width = (canvas.width = canvas.parentElement?.clientWidth || 600);
    let height = (canvas.height = canvas.parentElement?.clientHeight || 420);

    const handleResize = () => {
      if (!canvas || !canvas.parentElement) return;
      width = canvas.width = canvas.parentElement.clientWidth;
      height = canvas.height = canvas.parentElement.clientHeight;
    };

    window.addEventListener('resize', handleResize);

    const CAGE_RADIUS = 125;
    const FOV = 420;

    const render = () => {
      ctx.clearRect(0, 0, width, height);

      const centerX = width / 2;
      const centerY = height / 2 - 10;

      // Base auto spin
      if (isSpinning) {
        rotationRef.current.rotY += 0.045 * spinSpeed;
        rotationRef.current.rotX += 0.008 * spinSpeed;
      } else {
        rotationRef.current.rotY += 0.005;
      }

      // Camera preset angles
      let targetRotX = rotationRef.current.rotX;
      let targetRotY = rotationRef.current.rotY;

      if (cameraAngle === 'top') targetRotX = 1.1;
      else if (cameraAngle === 'front') targetRotX = 0.02;

      const cosX = Math.cos(targetRotX);
      const sinX = Math.sin(targetRotX);
      const cosY = Math.cos(targetRotY);
      const sinY = Math.sin(targetRotY);

      // 1. Draw Stand & Base Structure
      ctx.save();
      ctx.translate(centerX, centerY);

      // Floor Shadow & Neon Platform
      const gradFloor = ctx.createRadialGradient(0, 160, 20, 0, 160, 220);
      gradFloor.addColorStop(0, 'rgba(245, 158, 11, 0.35)');
      gradFloor.addColorStop(0.5, 'rgba(6, 182, 212, 0.15)');
      gradFloor.addColorStop(1, 'rgba(0, 0, 0, 0)');
      ctx.fillStyle = gradFloor;
      ctx.beginPath();
      ctx.ellipse(0, 160, 180, 50, 0, 0, Math.PI * 2);
      ctx.fill();

      // Pedestal Ring
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.ellipse(0, 160, 150, 40, 0, 0, Math.PI * 2);
      ctx.stroke();

      // Stands (Left & Right Chrome Pillars)
      ctx.strokeStyle = 'rgba(200, 200, 220, 0.7)';
      ctx.lineWidth = 6;
      ctx.lineCap = 'round';
      
      // Left Leg
      ctx.beginPath();
      ctx.moveTo(-CAGE_RADIUS - 22, 0);
      ctx.lineTo(-CAGE_RADIUS - 35, 150);
      ctx.stroke();

      // Right Leg
      ctx.beginPath();
      ctx.moveTo(CAGE_RADIUS + 22, 0);
      ctx.lineTo(CAGE_RADIUS + 35, 150);
      ctx.stroke();

      // Axle Hubs
      ctx.fillStyle = '#E5E7EB';
      ctx.beginPath();
      ctx.arc(-CAGE_RADIUS - 22, 0, 10, 0, Math.PI * 2);
      ctx.arc(CAGE_RADIUS + 22, 0, 10, 0, Math.PI * 2);
      ctx.fill();

      ctx.restore();

      // 2. Physics Update for Balls inside 3D Sphere
      const balls = ballsRef.current;
      const speedMultiplier = isSpinning ? 2.8 * spinSpeed : 1.0;

      balls.forEach((b) => {
        // Air turbulence + centrifugal force
        if (isSpinning) {
          b.vx += (Math.random() - 0.5) * 2.5 * speedMultiplier;
          b.vy += (Math.random() - 0.45) * 2.8 * speedMultiplier; // slightly upward blowing
          b.vz += (Math.random() - 0.5) * 2.5 * speedMultiplier;
        } else {
          // Gentle bounce & gravity
          b.vy += 0.18; // gravity
        }

        b.x += b.vx;
        b.y += b.vy;
        b.z += b.vz;

        // Damping
        b.vx *= 0.985;
        b.vy *= 0.985;
        b.vz *= 0.985;

        // Spherical boundary collision
        const dist = Math.sqrt(b.x * b.x + b.y * b.y + b.z * b.z);
        const maxDist = CAGE_RADIUS - b.radius;
        if (dist > maxDist) {
          const nx = b.x / dist;
          const ny = b.y / dist;
          const nz = b.z / dist;

          // Push back inside
          b.x = nx * maxDist;
          b.y = ny * maxDist;
          b.z = nz * maxDist;

          // Reflect velocity with restitution
          const dot = b.vx * nx + b.vy * ny + b.vz * nz;
          b.vx = (b.vx - 2 * dot * nx) * 0.85;
          b.vy = (b.vy - 2 * dot * ny) * 0.85;
          b.vz = (b.vz - 2 * dot * nz) * 0.85;

          // If spinning fast, add tangential kick
          if (isSpinning) {
            b.vx += -nz * 1.5 * spinSpeed;
            b.vz += nx * 1.5 * spinSpeed;
          }
        }
      });

      // 3. Project 3D Balls to 2D Screen
      interface ProjectedItem {
        type: 'ball' | 'back_cage' | 'front_cage';
        depth: number;
        ball?: Ball3D;
        screenX?: number;
        screenY?: number;
        scale?: number;
      }

      const projectedItems: ProjectedItem[] = [];

      // Add back cage layer
      projectedItems.push({ type: 'back_cage', depth: 200 });

      // Project all balls
      balls.forEach((b) => {
        // Rotate around Y then X
        const x1 = b.x * cosY - b.z * sinY;
        const z1 = b.z * cosY + b.x * sinY;
        const y1 = b.y * cosX - z1 * sinX;
        const z2 = z1 * cosX + b.y * sinX;

        const distance = FOV / (FOV + z2);
        const screenX = centerX + x1 * distance;
        const screenY = centerY + y1 * distance;
        const scale = distance;

        projectedItems.push({
          type: 'ball',
          depth: z2,
          ball: b,
          screenX,
          screenY,
          scale,
        });
      });

      // Add front cage layer
      projectedItems.push({ type: 'front_cage', depth: -200 });

      // Sort by depth (Painter's Algorithm for true 3D z-buffering)
      projectedItems.sort((a, b) => b.depth - a.depth);

      // 4. Draw sorted items
      projectedItems.forEach((item) => {
        if (item.type === 'back_cage' || item.type === 'front_cage') {
          // Draw 3D Cage Rings & Wireframe
          ctx.save();
          ctx.translate(centerX, centerY);

          const isFront = item.type === 'front_cage';
          ctx.lineWidth = isFront ? 2.5 : 1.2;
          ctx.strokeStyle = isFront ? themeStyles.cageHighlight : themeStyles.cageStroke;

          // Latitudinal Rings
          for (let lat = -60; lat <= 60; lat += 30) {
            const rad = (lat * Math.PI) / 180;
            const ringR = CAGE_RADIUS * Math.cos(rad);
            const ringY = CAGE_RADIUS * Math.sin(rad) * cosX;
            const ringH = ringR * Math.abs(sinX) * 0.9;

            ctx.beginPath();
            ctx.ellipse(0, ringY, ringR, Math.max(2, ringH), 0, 0, Math.PI * 2);
            ctx.stroke();
          }

          // Longitudinal Ribs (Rotating with cage)
          for (let lon = 0; lon < 12; lon++) {
            const angle = targetRotY + (lon * Math.PI) / 6;
            const rx = Math.sin(angle) * CAGE_RADIUS;
            const rz = Math.cos(angle) * CAGE_RADIUS;

            // Only draw front ribs in front phase, back ribs in back phase
            if ((isFront && rz < 0) || (!isFront && rz >= 0)) {
              ctx.beginPath();
              ctx.ellipse(rx * 0.4, 0, Math.abs(rx) + 2, CAGE_RADIUS, 0, 0, Math.PI * 2);
              ctx.stroke();
            }
          }

          // Outer Glass Bubble Specular Reflection (only in front)
          if (isFront) {
            const glassGrad = ctx.createRadialGradient(
              -CAGE_RADIUS * 0.35,
              -CAGE_RADIUS * 0.35,
              10,
              0,
              0,
              CAGE_RADIUS
            );
            glassGrad.addColorStop(0, 'rgba(255, 255, 255, 0.4)');
            glassGrad.addColorStop(0.3, 'rgba(255, 255, 255, 0.08)');
            glassGrad.addColorStop(0.85, 'rgba(245, 158, 11, 0.06)');
            glassGrad.addColorStop(1, 'rgba(255, 255, 255, 0.35)');

            ctx.fillStyle = glassGrad;
            ctx.beginPath();
            ctx.arc(0, 0, CAGE_RADIUS, 0, Math.PI * 2);
            ctx.fill();

            // Glass Shine Arc
            ctx.strokeStyle = 'rgba(255, 255, 255, 0.6)';
            ctx.lineWidth = 4;
            ctx.beginPath();
            ctx.arc(0, 0, CAGE_RADIUS - 8, -Math.PI * 0.75, -Math.PI * 0.35);
            ctx.stroke();
          }

          ctx.restore();
        } else if (item.type === 'ball' && item.ball && item.screenX !== undefined && item.screenY !== undefined && item.scale !== undefined) {
          const b = item.ball;
          const r = b.radius * item.scale;

          if (r > 1) {
            ctx.save();
            ctx.translate(item.screenX, item.screenY);

            // Ball Drop Shadow
            ctx.shadowColor = b.glowColor;
            ctx.shadowBlur = 10 * item.scale;

            // 3D Spherical Radial Gradient
            const sphereGrad = ctx.createRadialGradient(-r * 0.35, -r * 0.35, r * 0.1, 0, 0, r);
            sphereGrad.addColorStop(0, '#FFFFFF'); // Specular highlight
            sphereGrad.addColorStop(0.3, b.color);
            sphereGrad.addColorStop(1, '#000000'); // Shadow rim

            ctx.fillStyle = sphereGrad;
            ctx.beginPath();
            ctx.arc(0, 0, r, 0, Math.PI * 2);
            ctx.fill();

            // Ball Number Text with 3D Offset
            if (r >= 7) {
              ctx.shadowBlur = 0;
              ctx.fillStyle = b.textColor;
              ctx.font = `bold ${Math.max(9, Math.floor(r * 1.15))}px monospace`;
              ctx.textAlign = 'center';
              ctx.textBaseline = 'middle';
              ctx.fillText(b.digit.toString(), 0, 0);

              // Sub-digit underline for 6 and 9
              if (b.digit === 6 || b.digit === 9) {
                ctx.fillRect(-r * 0.35, r * 0.45, r * 0.7, 1.5);
              }
            }

            ctx.restore();
          }
        }
      });

      // 5. Pneumatic Vacuum Ejection Tube
      ctx.save();
      ctx.translate(centerX, centerY);

      // Glass Chute at the top right
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.4)';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(CAGE_RADIUS * 0.7, -CAGE_RADIUS * 0.6);
      ctx.bezierCurveTo(CAGE_RADIUS + 30, -CAGE_RADIUS * 0.8, CAGE_RADIUS + 60, -CAGE_RADIUS * 0.4, CAGE_RADIUS + 80, -CAGE_RADIUS * 0.1);
      ctx.stroke();

      ctx.restore();

      animFrameId.current = requestAnimationFrame(render);
    };

    animFrameId.current = requestAnimationFrame(render);

    return () => {
      if (animFrameId.current) cancelAnimationFrame(animFrameId.current);
      window.removeEventListener('resize', handleResize);
    };
  }, [isSpinning, spinSpeed, cameraAngle, themeColor]);

  // Pointer drag for manual 3D cage rotation
  const handlePointerDown = (e: React.PointerEvent) => {
    rotationRef.current.isDragging = true;
    rotationRef.current.lastX = e.clientX;
    rotationRef.current.lastY = e.clientY;
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!rotationRef.current.isDragging) return;
    const deltaX = e.clientX - rotationRef.current.lastX;
    const deltaY = e.clientY - rotationRef.current.lastY;

    rotationRef.current.rotY += deltaX * 0.008;
    rotationRef.current.rotX += deltaY * 0.008;
    rotationRef.current.lastX = e.clientX;
    rotationRef.current.lastY = e.clientY;
  };

  const handlePointerUp = () => {
    rotationRef.current.isDragging = false;
  };

  // Automated VRF Draw Sequence Simulation
  const triggerFullDrawSequence = useCallback(async () => {
    setIsSpinning(true);
    setSpinSpeed(2.5);
    setEjectedBalls([]);
    setCurrentDrawStep(0);

    soundManager.playDrumSpin();
    soundManager.playTick();

    // Determine winning numbers (either provided or derive fresh)
    const targetNumbers = winningNumbers && winningNumbers.length === 6
      ? winningNumbers
      : Array.from({ length: 6 }).map(() => Math.floor(Math.random() * 10));

    // Eject each ball sequentially every 1.6 seconds
    for (let step = 1; step <= 6; step++) {
      await new Promise((resolve) => setTimeout(resolve, 1500));

      const nextBall = targetNumbers[step - 1];
      setEjectedBalls((prev) => [...prev, nextBall]);
      setCurrentDrawStep(step);
      soundManager.playBallEject();

      // Confetti burst for each revealed ball
      confetti({
        particleCount: 25,
        spread: 45,
        origin: { y: 0.7, x: 0.3 + step * 0.07 },
        colors: ['#F59E0B', '#10B981', '#06B6D4', '#EC4899', '#8B5CF6'],
      });
    }

    // Slow down drum
    await new Promise((resolve) => setTimeout(resolve, 800));
    setSpinSpeed(0.5);
    setTimeout(() => {
      setIsSpinning(false);
      setSpinSpeed(1);
    }, 1200);

    // Grand Jackpot fanfare
    soundManager.playJackpot();
    confetti({
      particleCount: 150,
      spread: 90,
      origin: { y: 0.5 },
      colors: ['#FFD700', '#FFA500', '#00FFFF', '#FF1493'],
    });

    if (onDrawComplete) {
      onDrawComplete(targetNumbers);
    }
  }, [winningNumbers, onDrawComplete]);

  // If isDrawing prop changes to true, trigger sequence
  useEffect(() => {
    if (isDrawing) {
      triggerFullDrawSequence();
    }
  }, [isDrawing]);

  return (
    <div
      ref={containerRef}
      className={`relative w-full rounded-3xl overflow-hidden border ${themeStyles.border} bg-gradient-to-b from-[#0F1424] via-[#090C16] to-[#04060B] p-4 sm:p-6 shadow-2xl ${themeStyles.glow} flex flex-col items-center justify-between min-h-[520px] transition-all`}
    >
      {/* Dynamic Background Light Rays */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(245,158,11,0.08)_0%,rgba(0,0,0,0)_70%)] pointer-events-none" />

      {/* Top Header & VRF Badge */}
      <div className="relative z-10 w-full flex flex-col sm:flex-row items-center justify-between gap-3 pb-2 border-b border-white/[0.08]">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-300 shadow-md">
            <Radio className="w-5 h-5 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-sm sm:text-base font-black text-white font-outfit uppercase tracking-wide">
                Lồng Quay Xổ Số 3D VRF 2.5
              </h2>
              <span className={`px-2 py-0.5 rounded-full text-[10px] font-mono font-bold ${themeStyles.badge}`}>
                ROUND #{roundId}
              </span>
            </div>
            <p className="text-[11px] text-slate-400 font-sans">
              Dynamic 3D Physics Ball Cage • On-Chain Provable Seed
            </p>
          </div>
        </div>

        {/* Camera Angles & Sound Controls */}
        <div className="flex items-center gap-1.5 bg-black/60 p-1 rounded-xl border border-white/[0.08] shrink-0">
          <button
            onClick={() => {
              soundManager.playTick();
              setCameraAngle('iso');
            }}
            className={`px-2.5 py-1 rounded-lg text-[11px] font-mono font-semibold transition-all cursor-pointer ${
              cameraAngle === 'iso' ? 'bg-amber-500 text-black font-bold shadow' : 'text-slate-400 hover:text-white'
            }`}
          >
            3D Iso
          </button>
          <button
            onClick={() => {
              soundManager.playTick();
              setCameraAngle('front');
            }}
            className={`px-2.5 py-1 rounded-lg text-[11px] font-mono font-semibold transition-all cursor-pointer ${
              cameraAngle === 'front' ? 'bg-amber-500 text-black font-bold shadow' : 'text-slate-400 hover:text-white'
            }`}
          >
            Front
          </button>
          <button
            onClick={() => {
              soundManager.playTick();
              setCameraAngle('top');
            }}
            className={`px-2.5 py-1 rounded-lg text-[11px] font-mono font-semibold transition-all cursor-pointer ${
              cameraAngle === 'top' ? 'bg-amber-500 text-black font-bold shadow' : 'text-slate-400 hover:text-white'
            }`}
          >
            Top Glass
          </button>
          <button
            onClick={() => {
              const enabled = soundManager.toggleSound();
              setSoundEnabled(enabled);
            }}
            className="p-1.5 text-slate-400 hover:text-amber-300 rounded-lg transition-colors cursor-pointer"
            title="Toggle Sound Effects"
          >
            {soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4 text-slate-600" />}
          </button>
        </div>
      </div>

      {/* Main 3D Canvas Stage */}
      <div
        className="relative w-full flex-1 flex items-center justify-center my-2 cursor-grab active:cursor-grabbing min-h-[300px]"
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerLeave={handlePointerUp}
      >
        <canvas ref={canvasRef} className="w-full h-full max-h-[380px] object-contain select-none" />

        {/* Live Draw Status Overlay */}
        {isSpinning && (
          <div className="absolute top-4 left-4 px-3 py-1.5 rounded-xl bg-black/80 border border-amber-500/50 backdrop-blur-md flex items-center gap-2 animate-pulse">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-400 animate-ping" />
            <span className="text-xs font-mono font-bold text-amber-300">
              {currentDrawStep === 6 ? 'VERIFYING ON-CHAIN SEED...' : `EJECTING BALL #${currentDrawStep + 1}/6`}
            </span>
          </div>
        )}

        {/* Hint text for interaction */}
        {!isSpinning && (
          <div className="absolute bottom-2 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full bg-black/50 border border-white/10 text-[10px] text-slate-400 font-mono pointer-events-none">
            🖱️ Kéo chuột để xoay lồng quay 3D
          </div>
        )}
      </div>

      {/* Bottom Section: Ejected Balls Tube Tray & Controls */}
      <div className="relative z-10 w-full space-y-4 pt-3 border-t border-white/[0.08]">
        {/* Ejected Winning Balls Row */}
        <div className="bg-black/70 p-3 sm:p-4 rounded-2xl border border-white/[0.1] backdrop-blur-md flex flex-col sm:flex-row items-center justify-between gap-3 shadow-inner">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-amber-400 shrink-0" />
            <span className="text-xs font-mono font-bold text-slate-200">
              Kết Quả Trúng Thưởng (VRF Drawn):
            </span>
          </div>

          <div className="flex items-center gap-2 sm:gap-3">
            {[0, 1, 2, 3, 4, 5].map((idx) => {
              const ballVal = ejectedBalls[idx];
              const isRevealed = ballVal !== undefined;
              const col = isRevealed ? BALL_COLORS[ballVal] : null;

              return (
                <motion.div
                  key={idx}
                  initial={false}
                  animate={isRevealed ? { scale: [0.8, 1.25, 1], rotateY: [180, 0] } : {}}
                  transition={{ duration: 0.4 }}
                  className={`w-10 h-10 sm:w-12 sm:h-12 rounded-2xl flex items-center justify-center font-mono font-black text-base sm:text-xl shadow-lg transition-all ${
                    isRevealed
                      ? 'border-2 border-white/80 text-white animate-bounce-subtle'
                      : 'bg-white/[0.04] border border-white/10 text-slate-600'
                  }`}
                  style={
                    isRevealed && col
                      ? {
                          backgroundColor: col.bg,
                          color: col.text,
                          boxShadow: `0 0 16px ${col.glow}`,
                        }
                      : {}
                  }
                >
                  {isRevealed ? ballVal : '?'}
                </motion.div>
              );
            })}
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-xs font-mono text-slate-400">
            <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
            <span className="hidden sm:inline">VRF 2.5 Seed:</span>
            <span className="text-cyan-300 font-semibold truncate max-w-[200px]">
              {liveSeedCommitment}
            </span>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <button
              onClick={() => {
                if (isSpinning) {
                  setIsSpinning(false);
                } else {
                  triggerFullDrawSequence();
                }
              }}
              className="flex-1 sm:flex-initial px-5 py-2.5 bg-gradient-to-r from-amber-500 via-yellow-400 to-amber-500 hover:from-amber-400 hover:to-yellow-300 text-black font-black text-xs sm:text-sm rounded-xl transition-all shadow-lg shadow-amber-500/25 flex items-center justify-center gap-2 cursor-pointer font-outfit uppercase tracking-wider"
            >
              {isSpinning ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Đang Quay Thưởng 3D...</span>
                </>
              ) : (
                <>
                  <Play className="w-4 h-4 fill-current" />
                  <span>Quay Thưởng 3D Ngay</span>
                </>
              )}
            </button>

            <button
              onClick={() => {
                soundManager.playRoll();
                setSpinSpeed((prev) => (prev >= 3 ? 1 : prev + 1));
              }}
              title="Change Spin Velocity"
              className="px-3.5 py-2.5 bg-white/[0.06] hover:bg-white/[0.1] text-slate-200 border border-white/10 rounded-xl text-xs font-mono font-bold flex items-center gap-1.5 cursor-pointer"
            >
              <Zap className="w-3.5 h-3.5 text-cyan-400" />
              <span>{spinSpeed}x Speed</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
