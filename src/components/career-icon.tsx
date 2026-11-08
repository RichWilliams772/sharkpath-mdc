"use client";

import {
  Briefcase,
  ChefHat,
  Code,
  DraftingCompass,
  FlaskConical,
  GraduationCap,
  HardHat,
  HeartHandshake,
  HeartPulse,
  Palette,
  ShieldCheck,
  Siren,
  Wrench,
  type LucideProps,
} from "lucide-react";
import { useCareer } from "@/lib/careers/registry";
import type { MetaMajorId } from "@/types/roadmap";

const CAREER_ICONS: Record<string, React.ComponentType<LucideProps>> = {
  architect: DraftingCompass,
  "civil-engineer": HardHat,
  "cybersecurity-analyst": ShieldCheck,
  chef: ChefHat,
  "software-developer": Code,
};

export const META_ICONS: Record<MetaMajorId, React.ComponentType<LucideProps>> = {
  arts: Palette,
  business: Briefcase,
  education: GraduationCap,
  health: HeartPulse,
  industry: Wrench,
  "public-safety": Siren,
  stem: FlaskConical,
  social: HeartHandshake,
};

export function CareerIcon({ id, ...props }: { id: string } & LucideProps) {
  const career = useCareer(id);
  const Icon = CAREER_ICONS[career.id] ?? META_ICONS[career.metaMajor] ?? Briefcase;
  return <Icon {...props} />;
}
