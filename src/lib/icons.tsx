import {
  ShoppingCart, Truck, CalendarCheck, Coffee, Store, Briefcase, Scissors, Stethoscope, GraduationCap, Car, Box,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'

export const ICON_SET: Record<string, LucideIcon> = {
  'shopping-cart': ShoppingCart, truck: Truck, 'calendar-check': CalendarCheck, coffee: Coffee, store: Store,
  briefcase: Briefcase, scissors: Scissors, stethoscope: Stethoscope, 'graduation-cap': GraduationCap, car: Car, box: Box,
}
export const ICON_NAMES = Object.keys(ICON_SET)
export const iconFor = (name?: string | null): LucideIcon => ICON_SET[name ?? ''] ?? Box

export const PALETTE = ['#00BEBA', '#2F6FDE', '#C98A0B', '#1E9E6A', '#D64545', '#7A5AF8', '#091C35', '#E8590C']
export const colorFor = (hex: string | undefined | null, i: number) => hex || PALETTE[i % PALETTE.length]
