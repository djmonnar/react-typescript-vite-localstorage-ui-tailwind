import {
  Bomb,
  Cog,
  Crosshair,
  Crown,
  HeartPulse,
  PawPrint,
  Shield,
  Skull,
  Sparkles,
  SquareStack,
  Sword,
  Target,
  Zap,
  type LucideIcon,
} from 'lucide-react';
import type { UnitIconType } from '../types';

const iconMap: Record<UnitIconType, LucideIcon> = {
  sword: Sword,
  bow: Target,
  gun: Zap,
  shield: Shield,
  magic: Sparkles,
  heal: HeartPulse,
  beast: PawPrint,
  machine: Cog,
  hero: Crown,
  skull: Skull,
  tank: SquareStack,
  artillery: Bomb,
};

export function UnitIcon({ className = '', type }: { className?: string; type: UnitIconType }) {
  const Icon = iconMap[type] ?? Crosshair;
  return <Icon aria-hidden="true" className={className} />;
}
