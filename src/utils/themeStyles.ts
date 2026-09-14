import { AccentColor } from '../types';

export interface ThemeColors {
  name: string;
  badge: string;
  bgGlow: string;
  pillActive: string;
  pillBorder: string;
  btnPrimary: string;
  iconColor: string;
  ringColor: string;
  hex: string;
  lightBg: string;
  lightBorder: string;
  lightText: string;
  darkBg: string;
  darkBorder: string;
  darkText: string;
}

export const THEME_PALETTES: Record<AccentColor, ThemeColors> = {
  emerald: {
    name: 'Emerald Communicator',
    badge: 'bg-emerald-500',
    bgGlow: 'bg-emerald-500/20',
    pillActive: 'bg-emerald-500 text-neutral-950 font-bold',
    pillBorder: 'border-emerald-500/40',
    btnPrimary: 'bg-emerald-600 hover:bg-emerald-500 text-white',
    iconColor: 'text-emerald-500',
    ringColor: 'ring-emerald-400',
    hex: '#10b981',
    lightBg: 'bg-emerald-50',
    lightBorder: 'border-emerald-300',
    lightText: 'text-emerald-900',
    darkBg: 'bg-emerald-950/40',
    darkBorder: 'border-emerald-500/30',
    darkText: 'text-emerald-300',
  },
  blue: {
    name: 'Ocean Frequency',
    badge: 'bg-blue-500',
    bgGlow: 'bg-blue-500/20',
    pillActive: 'bg-blue-500 text-white font-bold',
    pillBorder: 'border-blue-500/40',
    btnPrimary: 'bg-blue-600 hover:bg-blue-500 text-white',
    iconColor: 'text-blue-500',
    ringColor: 'ring-blue-400',
    hex: '#3b82f6',
    lightBg: 'bg-blue-50',
    lightBorder: 'border-blue-300',
    lightText: 'text-blue-900',
    darkBg: 'bg-blue-950/40',
    darkBorder: 'border-blue-500/30',
    darkText: 'text-blue-300',
  },
  purple: {
    name: 'Velvet Twilight',
    badge: 'bg-purple-500',
    bgGlow: 'bg-purple-500/20',
    pillActive: 'bg-purple-500 text-white font-bold',
    pillBorder: 'border-purple-500/40',
    btnPrimary: 'bg-purple-600 hover:bg-purple-500 text-white',
    iconColor: 'text-purple-500',
    ringColor: 'ring-purple-400',
    hex: '#a855f7',
    lightBg: 'bg-purple-50',
    lightBorder: 'border-purple-300',
    lightText: 'text-purple-900',
    darkBg: 'bg-purple-950/40',
    darkBorder: 'border-purple-500/30',
    darkText: 'text-purple-300',
  },
};
