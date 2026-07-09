import { useMantineTheme } from '@mantine/core'
import type { ButtonId, ControllerState } from '@shared/domain'

/**
 * A stylized DualShock-style controller drawn in SVG. Buttons light up in the
 * theme accent when pressed; the two analog sticks translate with their axis
 * values so you can *see* the deadzone/curve at work. Purely presentational —
 * it just reflects the ControllerState you hand it.
 */

export interface ControllerVisualProps {
  state: ControllerState
  /** Max stick travel in SVG units (visual only). */
  stickTravel?: number
}

export function ControllerVisual({
  state,
  stickTravel = 12
}: ControllerVisualProps): JSX.Element {
  const theme = useMantineTheme()
  const accent = theme.colors.clay[5]
  const accentDim = theme.colors.clay[8]

  const idle = '#3a3d44'
  const idleStroke = '#4c505a'
  const body = '#26282e'
  const bodyStroke = '#3a3d44'
  const label = '#c9ccd3'

  const on = (id: ButtonId): boolean => state.buttons[id]
  const fill = (id: ButtonId): string => (on(id) ? accent : idle)
  const stroke = (id: ButtonId): string => (on(id) ? accent : idleStroke)

  // Stick offsets (clamped for the visual).
  const clamp = (v: number): number =>
    Math.max(-1, Math.min(1, v)) * stickTravel
  const lx = clamp(state.axes.LeftX)
  const ly = clamp(state.axes.LeftY)
  const rx = clamp(state.axes.RightX)
  const ry = clamp(state.axes.RightY)

  return (
    <svg
      viewBox="0 0 460 300"
      width="100%"
      role="img"
      aria-label="Controller state"
      style={{ maxWidth: 460, display: 'block' }}
    >
      {/* ---- Body ---- */}
      <path
        d="M110 96
           C70 96 44 120 34 168
           C24 214 30 250 62 258
           C88 264 104 240 118 224
           C134 206 156 200 230 200
           C304 200 326 206 342 224
           C356 240 372 264 398 258
           C430 250 436 214 426 168
           C416 120 390 96 350 96
           C300 96 300 108 230 108
           C160 108 160 96 110 96 Z"
        fill={body}
        stroke={bodyStroke}
        strokeWidth={2}
      />

      {/* ---- Shoulder buttons (L1/R1) ---- */}
      <rect x="86" y="70" width="70" height="18" rx="9" fill={fill('L1')} stroke={stroke('L1')} strokeWidth={2} />
      <text x="121" y="83" fontSize="11" fill={label} textAnchor="middle">L1</text>
      <rect x="304" y="70" width="70" height="18" rx="9" fill={fill('R1')} stroke={stroke('R1')} strokeWidth={2} />
      <text x="339" y="83" fontSize="11" fill={label} textAnchor="middle">R1</text>

      {/* ---- Triggers (L2/R2) — fill scales with analog value ---- */}
      <rect x="96" y="48" width="52" height="18" rx="6" fill={idle} stroke={idleStroke} strokeWidth={2} />
      <rect
        x="96"
        y="48"
        width={52 * Math.max(0, Math.min(1, state.axes.L2))}
        height="18"
        rx="6"
        fill={accentDim}
      />
      <text x="122" y="61" fontSize="11" fill={label} textAnchor="middle">L2</text>
      <rect x="312" y="48" width="52" height="18" rx="6" fill={idle} stroke={idleStroke} strokeWidth={2} />
      <rect
        x="312"
        y="48"
        width={52 * Math.max(0, Math.min(1, state.axes.R2))}
        height="18"
        rx="6"
        fill={accentDim}
      />
      <text x="338" y="61" fontSize="11" fill={label} textAnchor="middle">R2</text>

      {/* ---- D-pad (left cluster) ---- */}
      <g>
        <rect x="94" y="118" width="20" height="20" rx="3" fill={fill('DpadUp')} stroke={stroke('DpadUp')} strokeWidth={1.5} />
        <rect x="94" y="160" width="20" height="20" rx="3" fill={fill('DpadDown')} stroke={stroke('DpadDown')} strokeWidth={1.5} />
        <rect x="72" y="140" width="20" height="20" rx="3" fill={fill('DpadLeft')} stroke={stroke('DpadLeft')} strokeWidth={1.5} />
        <rect x="116" y="140" width="20" height="20" rx="3" fill={fill('DpadRight')} stroke={stroke('DpadRight')} strokeWidth={1.5} />
      </g>

      {/* ---- Face buttons (right cluster) ---- */}
      <g>
        {/* Triangle (top) */}
        <circle cx="346" cy="128" r="13" fill={fill('Triangle')} stroke={stroke('Triangle')} strokeWidth={2} />
        <text x="346" y="132" fontSize="12" fill={label} textAnchor="middle">△</text>
        {/* Circle (right) */}
        <circle cx="372" cy="150" r="13" fill={fill('Circle')} stroke={stroke('Circle')} strokeWidth={2} />
        <text x="372" y="154" fontSize="12" fill={label} textAnchor="middle">○</text>
        {/* Cross (bottom) */}
        <circle cx="346" cy="172" r="13" fill={fill('Cross')} stroke={stroke('Cross')} strokeWidth={2} />
        <text x="346" y="176" fontSize="12" fill={label} textAnchor="middle">✕</text>
        {/* Square (left) */}
        <circle cx="320" cy="150" r="13" fill={fill('Square')} stroke={stroke('Square')} strokeWidth={2} />
        <text x="320" y="154" fontSize="12" fill={label} textAnchor="middle">□</text>
      </g>

      {/* ---- Center: Share / PS / Options / Touchpad ---- */}
      <rect x="176" y="118" width="14" height="20" rx="3" fill={fill('Share')} stroke={stroke('Share')} strokeWidth={1.5} />
      <rect x="270" y="118" width="14" height="20" rx="3" fill={fill('Options')} stroke={stroke('Options')} strokeWidth={1.5} />
      <rect
        x="196"
        y="116"
        width="68"
        height="40"
        rx="6"
        fill={on('Touchpad') ? accentDim : '#2c2f36'}
        stroke={on('Touchpad') ? accent : bodyStroke}
        strokeWidth={2}
      />
      <circle cx="230" cy="176" r="9" fill={fill('PS')} stroke={stroke('PS')} strokeWidth={1.5} />

      {/* ---- Analog sticks ---- */}
      {/* Left stick */}
      <circle cx="176" cy="200" r="24" fill="#1d1f24" stroke={bodyStroke} strokeWidth={2} />
      <circle
        cx={176 + lx}
        cy={200 + ly}
        r="17"
        fill={on('L3') ? accent : idle}
        stroke={on('L3') ? accent : idleStroke}
        strokeWidth={2}
      />
      {/* Right stick */}
      <circle cx="284" cy="200" r="24" fill="#1d1f24" stroke={bodyStroke} strokeWidth={2} />
      <circle
        cx={284 + rx}
        cy={200 + ry}
        r="17"
        fill={on('R3') ? accent : idle}
        stroke={on('R3') ? accent : idleStroke}
        strokeWidth={2}
      />
    </svg>
  )
}
