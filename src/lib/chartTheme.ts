/** Цвета графиков Recharts — только через CSS-токены (светлая/тёмная тема переключается сама). */
export const CHART = {
  grid: 'var(--chart-grid)',
  axis: 'var(--chart-axis)',
  c1: 'var(--chart-1)',
  c2: 'var(--chart-2)',
  c3: 'var(--chart-3)',
  negative: 'var(--chart-negative)',
  cursor: 'var(--mist)',
} as const

export const CHART_TICK = { fontSize: 12, fill: CHART.axis } as const
export const CHART_TOOLTIP_STYLE = {
  background: 'var(--chart-tooltip-bg)',
  border: '1px solid var(--chart-tooltip-border)',
  borderRadius: 12,
  color: 'var(--text)',
} as const
