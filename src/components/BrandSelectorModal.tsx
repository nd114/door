import React from 'react';
import { motion } from 'motion/react';
import { X, Check, Flame, Sparkles, DoorOpen, Radio, Lock } from 'lucide-react';
import { nativeBridge } from '../services/nativeBridge';

export type BrandName = 'Door' | 'Windor' | 'Hot Mic' | 'Knock' | 'Latch';

export interface BrandInfo {
  name: BrandName;
  tagline: string;
  icon: typeof DoorOpen;
  vibe: string;
  pros: string;
  cons: string;
}

export const BRAND_OPTIONS: BrandInfo[] = [
  {
    name: 'Door',
    tagline: 'Instant ambient audio for close relationships',
    icon: DoorOpen,
    vibe: 'Iconic, physical, architectural, high-trust',
    pros: 'Universal physical metaphor (Locked, Cracked, Open, Door Notes). Simple, memorable, verb-friendly ("Door me").',
    cons: 'Common generic noun; requires strong SEO positioning.',
  },
  {
    name: 'Windor',
    tagline: 'A breezy window and door into your friend’s world',
    icon: Sparkles,
    vibe: 'Playful, modern, approachable, distinctive',
    pros: 'Blend of "Window" + "Door". Highly trademarkable, friendly, less rigid than just a closed door.',
    cons: 'Might need brief pronunciation explanation ("Win-door").',
  },
  {
    name: 'Hot Mic',
    tagline: 'Direct audio drop-in with zero calling delay',
    icon: Flame,
    vibe: 'Edgy, broadcast-style, energetic, tech-savvy',
    pros: 'Punchy and instantly conveys live microphone audio.',
    cons: 'In audio jargon, "hot mic" means an accidental or embarrassing open broadcast. Can trigger eavesdropping paranoia and App Store privacy scrutiny.',
  },
  {
    name: 'Knock',
    tagline: 'Permission-first spontaneous voice check-ins',
    icon: Radio,
    vibe: 'Polite, considerate, haptic, warm',
    pros: 'Frames the app around consent and gentle arrival before speaking.',
    cons: 'Implies always waiting for permission rather than instant open flow.',
  },
  {
    name: 'Latch',
    tagline: 'The private audio connection for your closest circle',
    icon: Lock,
    vibe: 'Intimate, tactile, secure, premium',
    pros: 'Feels like hardware for your relationship; emphasizes safety.',
    cons: 'Slightly industrial connotation.',
  },
];

interface BrandSelectorModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedBrand: BrandName;
  onSelectBrand: (brand: BrandName) => void;
}

export const BrandSelectorModal: React.FC<BrandSelectorModalProps> = ({
  isOpen,
  onClose,
  selectedBrand,
  onSelectBrand,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="w-full max-w-md bg-neutral-900 border border-neutral-800 rounded-3xl max-h-[85vh] flex flex-col overflow-hidden shadow-2xl"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-neutral-800 bg-neutral-950/60">
          <div>
            <h3 className="text-sm font-bold text-neutral-100">Brand Identity & Name Choice</h3>
            <p className="text-[11px] text-neutral-400">Preview how different names position the product</p>
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

        {/* Options List */}
        <div className="p-4 overflow-y-auto max-h-[68vh] flex flex-col gap-3 no-scrollbar">
          {BRAND_OPTIONS.map((brand) => {
            const Icon = brand.icon;
            const isSelected = selectedBrand === brand.name;
            return (
              <button
                key={brand.name}
                onClick={() => {
                  nativeBridge.haptic('selection');
                  onSelectBrand(brand.name);
                }}
                className={`p-3.5 rounded-2xl border text-left flex flex-col gap-2 transition-all ${
                  isSelected
                    ? 'bg-neutral-800/90 border-amber-500/80 shadow-[0_0_20px_rgba(245,158,11,0.2)]'
                    : 'bg-neutral-950/70 border-neutral-850 hover:border-neutral-700'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div
                      className={`w-9 h-9 rounded-xl flex items-center justify-center ${
                        isSelected
                          ? 'bg-amber-500/20 text-amber-400 border border-amber-500/40'
                          : 'bg-neutral-900 text-neutral-400 border border-neutral-800'
                      }`}
                    >
                      <Icon className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-sm text-neutral-100">{brand.name}</span>
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-neutral-800 text-neutral-400 font-medium">
                          {brand.vibe.split(',')[0]}
                        </span>
                      </div>
                      <p className="text-[11px] text-neutral-300">{brand.tagline}</p>
                    </div>
                  </div>

                  {isSelected && (
                    <div className="w-6 h-6 rounded-full bg-amber-500 flex items-center justify-center text-neutral-950">
                      <Check className="w-3.5 h-3.5 stroke-[3]" />
                    </div>
                  )}
                </div>

                {/* Pros and Cons Breakdown */}
                <div className="mt-1 pt-2 border-t border-neutral-800/80 grid grid-cols-1 gap-1 text-[11px]">
                  <div className="text-emerald-400 flex items-start gap-1.5">
                    <span className="font-bold shrink-0">Strength:</span>
                    <span className="text-neutral-300">{brand.pros}</span>
                  </div>
                  <div className="text-rose-400 flex items-start gap-1.5">
                    <span className="font-bold shrink-0">Tradeoff:</span>
                    <span className="text-neutral-400">{brand.cons}</span>
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </motion.div>
    </div>
  );
};
