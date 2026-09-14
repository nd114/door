import React from 'react';
import { Smartphone, Monitor } from 'lucide-react';

interface PhoneChassisProps {
  children: React.ReactNode;
  isFrameEnabled: boolean;
  onToggleFrame: () => void;
  doorState: 'locked' | 'knock' | 'open';
  theme?: 'light' | 'dark';
}

export const PhoneChassis: React.FC<PhoneChassisProps> = ({
  children,
  isFrameEnabled,
  onToggleFrame,
  doorState,
  theme = 'dark',
}) => {
  const isLight = theme === 'light';

  const getGlowColor = () => {
    switch (doorState) {
      case 'locked':
        return isLight ? 'rgba(239, 68, 68, 0.12)' : 'rgba(239, 68, 68, 0.15)';
      case 'knock':
        return isLight ? 'rgba(245, 158, 11, 0.14)' : 'rgba(245, 158, 11, 0.18)';
      case 'open':
        return isLight ? 'rgba(16, 185, 129, 0.14)' : 'rgba(16, 185, 129, 0.18)';
    }
  };

  return (
    <div
      id="app-root-container"
      className={`relative w-full h-screen flex flex-col items-center justify-center overflow-hidden font-sans transition-colors duration-300 ${
        isLight ? 'bg-[#f4f2ee] text-[#1c1917]' : 'bg-[#07080b] text-neutral-100'
      }`}
    >
      {/* Background ambient lighting based on door state */}
      <div
        className="absolute inset-0 pointer-events-none transition-all duration-1000 ease-out"
        style={{
          background: `radial-gradient(circle at 50% 30%, ${getGlowColor()} 0%, ${
            isLight ? 'rgba(244, 242, 238, 0)' : 'rgba(7, 8, 11, 0)'
          } 70%)`,
        }}
      />

      {/* Frame view mode toggle for desktop testing */}
      <div
        className={`hidden md:flex absolute top-3 right-4 z-50 items-center gap-2 backdrop-blur-md px-3 py-1.5 rounded-full border text-xs shadow-xl transition-colors ${
          isLight
            ? 'bg-white/90 border-[#dedad2] text-neutral-600'
            : 'bg-neutral-900/90 border-neutral-800 text-neutral-400'
        }`}
      >
        <span className="text-[11px] font-medium">View Mode:</span>
        <button
          id="toggle-phone-frame-btn"
          onClick={onToggleFrame}
          className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full transition text-[11px] font-semibold ${
            isLight
              ? 'bg-neutral-100 hover:bg-neutral-200 text-neutral-800'
              : 'bg-neutral-800 hover:bg-neutral-700 text-neutral-200'
          }`}
        >
          {isFrameEnabled ? (
            <>
              <Smartphone className="w-3.5 h-3.5 text-emerald-500" />
              <span>iPhone Frame</span>
            </>
          ) : (
            <>
              <Monitor className="w-3.5 h-3.5 text-blue-500" />
              <span>Full Screen</span>
            </>
          )}
        </button>
      </div>

      {isFrameEnabled ? (
        /* Native iPhone Device Chassis */
        <div
          className={`relative w-[400px] h-[844px] max-h-[96vh] rounded-[52px] p-3.5 border-[4px] shadow-[0_25px_70px_rgba(0,0,0,0.35),0_0_0_1px_rgba(255,255,255,0.08)] flex flex-col items-center justify-between transition-all duration-300 ${
            isLight
              ? 'bg-[#e3dfd7] border-[#cdc7bc]'
              : 'bg-neutral-900/95 border-neutral-700/80 shadow-[0_25px_70px_rgba(0,0,0,0.8)]'
          }`}
        >
          {/* Side volume rocker & power button mockups */}
          <div className={`absolute -left-[7px] top-28 w-[3px] h-12 rounded-l-md ${isLight ? 'bg-neutral-400' : 'bg-neutral-700'}`} />
          <div className={`absolute -left-[7px] top-44 w-[3px] h-12 rounded-l-md ${isLight ? 'bg-neutral-400' : 'bg-neutral-700'}`} />
          <div className={`absolute -right-[7px] top-32 w-[3px] h-16 rounded-r-md ${isLight ? 'bg-neutral-400' : 'bg-neutral-700'}`} />

          {/* Device Screen */}
          <div
            className={`relative w-full h-full rounded-[42px] overflow-hidden flex flex-col border transition-colors duration-300 ${
              isLight
                ? 'bg-[#faf9f6] border-[#dedad2]'
                : 'bg-neutral-950 border-neutral-800/60'
            }`}
          >
            {/* Dynamic Island */}
            <div className="absolute top-2.5 left-1/2 -translate-x-1/2 z-40 h-[28px] w-[116px] bg-black rounded-full flex items-center justify-between px-3 border border-neutral-800/40 shadow-sm pointer-events-none">
              <div className="w-2.5 h-2.5 rounded-full bg-neutral-900 border border-neutral-800 flex items-center justify-center">
                <div className="w-1 h-1 rounded-full bg-blue-500/80" />
              </div>
              <div className="w-2.5 h-2.5 rounded-full bg-neutral-900" />
            </div>

            {/* Content Body */}
            <div className="w-full h-full flex flex-col pt-7 pb-4 overflow-hidden">
              {children}
            </div>

            {/* iOS Home Indicator Bar */}
            <div
              className={`absolute bottom-1.5 left-1/2 -translate-x-1/2 w-32 h-1 rounded-full pointer-events-none ${
                isLight ? 'bg-neutral-400/60' : 'bg-neutral-500/50'
              }`}
            />
          </div>
        </div>
      ) : (
        /* Fullscreen View */
        <div
          className={`w-full h-full max-w-md mx-auto flex flex-col overflow-hidden relative shadow-2xl transition-colors duration-300 ${
            isLight ? 'bg-[#faf9f6]' : 'bg-neutral-950'
          }`}
        >
          {children}
        </div>
      )}
    </div>
  );
};
