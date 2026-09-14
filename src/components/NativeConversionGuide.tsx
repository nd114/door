import React, { useState } from 'react';
import { motion } from 'motion/react';
import { X, Terminal, Check, Copy, Layers, Cpu, ShieldCheck, Smartphone } from 'lucide-react';
import { nativeBridge } from '../services/nativeBridge';

interface NativeConversionGuideProps {
  isOpen: boolean;
  onClose: () => void;
}

export const NativeConversionGuide: React.FC<NativeConversionGuideProps> = ({
  isOpen,
  onClose,
}) => {
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);

  if (!isOpen) return null;

  const copyToClipboard = (text: string, index: number) => {
    navigator.clipboard.writeText(text);
    nativeBridge.haptic('success');
    setCopiedIndex(index);
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  const steps = [
    {
      title: 'Step 1: Install Native Capacitor Core',
      command: 'npm install @capacitor/core @capacitor/cli @capacitor/haptics @capacitor/device',
      desc: 'Connects the existing nativeBridge.ts directly to real iOS & Android hardware haptics and audio routers.',
    },
    {
      title: 'Step 2: Generate iOS & Android Native Projects',
      command: 'npx cap add ios && npx cap add android',
      desc: 'Generates ready-to-compile Xcode (.xcodeproj) and Android Studio folders from this codebase in 5 seconds.',
    },
    {
      title: 'Step 3: Apple Push-to-Talk (PTT) Entitlement',
      command: 'com.apple.developer.push-to-talk: true',
      desc: 'In Xcode Signing & Capabilities, enable "Push to Talk". This allows Door to wake iOS in the background without battery penalty.',
    },
    {
      title: 'Step 4: Launch on Physical iPhone / Android',
      command: 'npx cap run ios -l --external',
      desc: 'Builds and deploys directly to your physical phone plugged into your Mac or PC.',
    },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="w-full max-w-lg bg-neutral-900 border border-neutral-800 rounded-3xl max-h-[85vh] flex flex-col overflow-hidden shadow-2xl"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-neutral-800 bg-neutral-950/60">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400">
              <Cpu className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-neutral-100">1-Button Native Mobile Conversion</h3>
              <p className="text-[11px] text-neutral-400">Export architecture pre-configured for App Store & Google Play</p>
            </div>
          </div>

          <button
            onClick={() => {
              nativeBridge.haptic('light');
              onClose();
            }}
            className="w-8 h-8 rounded-full bg-neutral-800 hover:bg-neutral-700 flex items-center justify-center text-neutral-300"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="p-5 overflow-y-auto max-h-[65vh] flex flex-col gap-4 no-scrollbar text-xs">
          {/* Architecture Badge */}
          <div className="p-3.5 rounded-2xl bg-neutral-950 border border-neutral-800 flex items-start gap-3">
            <ShieldCheck className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
            <div>
              <span className="font-semibold text-neutral-200">Pre-built Native Abstraction Layer</span>
              <p className="text-[11px] text-neutral-400 mt-1 leading-relaxed">
                The code has already been built with zero web-delay CSS, safe-area layout insets, Web Audio synthesized acoustic haptics, and a dedicated <code>nativeBridge.ts</code>. You don't have to rewrite any UI code when moving to iOS/Android.
              </p>
            </div>
          </div>

          {/* Steps */}
          <div className="flex flex-col gap-3">
            {steps.map((step, idx) => (
              <div key={idx} className="p-3 rounded-2xl bg-neutral-950/80 border border-neutral-800/90 flex flex-col gap-2">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-xs text-neutral-200 flex items-center gap-1.5">
                    <Smartphone className="w-3.5 h-3.5 text-blue-400" />
                    {step.title}
                  </span>
                  <button
                    onClick={() => copyToClipboard(step.command, idx)}
                    className="flex items-center gap-1 px-2 py-0.5 rounded-md bg-neutral-800 hover:bg-neutral-700 text-[10px] font-mono text-neutral-300 transition"
                  >
                    {copiedIndex === idx ? (
                      <>
                        <Check className="w-3 h-3 text-emerald-400" />
                        <span>Copied!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3 h-3 text-neutral-400" />
                        <span>Copy</span>
                      </>
                    )}
                  </button>
                </div>

                <div className="p-2 rounded-lg bg-black/60 border border-neutral-800 font-mono text-[11px] text-emerald-400 select-all overflow-x-auto">
                  {step.command}
                </div>

                <p className="text-[11px] text-neutral-400 leading-normal">{step.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </motion.div>
    </div>
  );
};
