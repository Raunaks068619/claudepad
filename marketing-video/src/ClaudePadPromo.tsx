import type { CSSProperties, ReactNode } from "react";
import {
  AbsoluteFill,
  Easing,
  Img,
  Sequence,
  interpolate,
  staticFile,
  useCurrentFrame,
} from "remotion";
import { Audio, Video } from "@remotion/media";

export const FPS = 30;

export const SCENES = {
  cold: 90,
  mapper: 165,
  tester: 165,
  focus: 105,
  voice: 240,
  end: 165,
} as const;

export const DURATION_IN_FRAMES = Object.values(SCENES).reduce(
  (sum, duration) => sum + duration,
  0,
);

export const COLOR = {
  aubergine: "#17101f",
  ink: "#24182f",
  inkLight: "#34233f",
  clay: "#e56e50",
  clayBright: "#ff8a68",
  paper: "#f4eee8",
  paperDim: "#d5c9c3",
  cyan: "#77d9e8",
  mint: "#a9efc1",
  muted: "#8e8197",
  black: "#0e0a12",
};

export const FONT = '"Avenir Next", Avenir, "Helvetica Neue", sans-serif';
export const MONO = '"SFMono-Regular", Menlo, Monaco, monospace';

const fit: CSSProperties = {
  width: "100%",
  height: "100%",
};

export const reveal = (
  frame: number,
  from: number,
  duration = 16,
  distance = 46,
) => {
  const progress = interpolate(frame, [from, from + duration], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.out(Easing.exp),
  });
  return {
    opacity: progress,
    transform: `translateY(${(1 - progress) * distance}px)`,
  };
};

export const fade = (
  frame: number,
  start: number,
  end: number,
  from = 0,
  to = 1,
) =>
  interpolate(frame, [start, end], [from, to], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

const Backdrop = ({ warm = false }: { warm?: boolean }) => {
  const frame = useCurrentFrame();
  const drift = Math.sin(frame / 48) * 24;
  const drift2 = Math.cos(frame / 55) * 30;

  return (
    <AbsoluteFill
      style={{
        background: warm
          ? `radial-gradient(circle at 76% 18%, #5a2937 0%, ${COLOR.ink} 36%, ${COLOR.aubergine} 72%)`
          : `radial-gradient(circle at 20% 18%, #293447 0%, ${COLOR.ink} 32%, ${COLOR.aubergine} 74%)`,
        overflow: "hidden",
      }}
    >
      <div
        style={{
          position: "absolute",
          width: 520,
          height: 520,
          borderRadius: "50%",
          left: -270 + drift,
          top: 1020,
          background: COLOR.clay,
          opacity: 0.09,
          filter: "blur(14px)",
        }}
      />
      <div
        style={{
          position: "absolute",
          width: 440,
          height: 440,
          borderRadius: "50%",
          right: -260 + drift2,
          top: 180,
          background: COLOR.cyan,
          opacity: 0.07,
          filter: "blur(18px)",
        }}
      />
      <AbsoluteFill
        style={{
          opacity: 0.17,
          backgroundImage:
            "repeating-linear-gradient(0deg, transparent, transparent 3px, rgba(255,255,255,0.025) 4px)",
        }}
      />
    </AbsoluteFill>
  );
};

const BrandBug = ({ light = false }: { light?: boolean }) => (
  <div
    style={{
      position: "absolute",
      top: 72,
      left: 74,
      display: "flex",
      alignItems: "center",
      gap: 15,
      fontFamily: FONT,
      color: light ? COLOR.ink : COLOR.paper,
      fontWeight: 700,
      fontSize: 28,
      letterSpacing: -0.5,
      zIndex: 20,
    }}
  >
    <div
      style={{
        width: 42,
        height: 42,
        borderRadius: 13,
        display: "grid",
        placeItems: "center",
        background: `linear-gradient(145deg, ${COLOR.clayBright}, ${COLOR.clay})`,
        boxShadow: "0 10px 32px rgba(229,110,80,0.27)",
        color: COLOR.paper,
        fontSize: 20,
        letterSpacing: -1,
      }}
    >
      CP
    </div>
    ClaudePad
  </div>
);

const SectionLabel = ({
  children,
  color = COLOR.cyan,
}: {
  children: ReactNode;
  color?: string;
}) => (
  <div
    style={{
      display: "flex",
      alignItems: "center",
      gap: 12,
      color,
      fontFamily: MONO,
      fontSize: 25,
      fontWeight: 700,
      letterSpacing: 2.4,
      textTransform: "uppercase",
    }}
  >
    <span
      style={{
        width: 9,
        height: 9,
        borderRadius: "50%",
        background: color,
        boxShadow: `0 0 0 6px ${color}20`,
      }}
    />
    {children}
  </div>
);

const SceneHeader = ({
  label,
  title,
  detail,
  frame,
  compact = false,
}: {
  label: string;
  title: ReactNode;
  detail?: string;
  frame: number;
  compact?: boolean;
}) => (
  <div
    style={{
      position: "absolute",
      top: compact ? 150 : 170,
      left: 74,
      right: 74,
      zIndex: 10,
      ...reveal(frame, 2),
    }}
  >
    <SectionLabel>{label}</SectionLabel>
    <div
      style={{
        marginTop: 25,
        fontFamily: FONT,
        color: COLOR.paper,
        fontSize: compact ? 73 : 84,
        fontWeight: 750,
        letterSpacing: -4.4,
        lineHeight: 0.99,
        maxWidth: 920,
      }}
    >
      {title}
    </div>
    {detail ? (
      <div
        style={{
          marginTop: 25,
          color: COLOR.paperDim,
          fontFamily: FONT,
          fontSize: 31,
          fontWeight: 500,
          lineHeight: 1.35,
          maxWidth: 850,
        }}
      >
        {detail}
      </div>
    ) : null}
  </div>
);

const AppWindow = ({
  children,
  title,
  top = 520,
  height = 1210,
}: {
  children: ReactNode;
  title: string;
  top?: number;
  height?: number;
}) => (
  <div
    style={{
      position: "absolute",
      left: 58,
      right: 58,
      top,
      height,
      borderRadius: 34,
      overflow: "hidden",
      background: "#1f1d24",
      border: "1px solid rgba(255,255,255,0.13)",
      boxShadow: "0 42px 95px rgba(2,0,8,0.42)",
    }}
  >
    <div
      style={{
        height: 73,
        borderBottom: "1px solid rgba(255,255,255,0.1)",
        display: "flex",
        alignItems: "center",
        padding: "0 25px",
        gap: 11,
        background: "#19171d",
      }}
    >
      {["#ff6b66", "#f6bf4f", "#62c75a"].map((color) => (
        <span
          key={color}
          style={{ width: 14, height: 14, borderRadius: "50%", background: color }}
        />
      ))}
      <span
        style={{
          marginLeft: 15,
          fontFamily: FONT,
          fontWeight: 650,
          fontSize: 22,
          color: "#d9d3dd",
        }}
      >
        ClaudePad · {title}
      </span>
      <span
        style={{
          marginLeft: "auto",
          fontFamily: MONO,
          fontSize: 17,
          color: COLOR.mint,
          background: "#193229",
          padding: "7px 12px",
          borderRadius: 20,
        }}
      >
        ● CONNECTED
      </span>
    </div>
    {children}
  </div>
);

const ProgressRail = ({ active }: { active: number }) => (
  <div
    style={{
      position: "absolute",
      right: 35,
      top: 720,
      display: "flex",
      flexDirection: "column",
      gap: 13,
      zIndex: 50,
    }}
  >
    {[0, 1, 2, 3, 4].map((index) => (
      <div
        key={index}
        style={{
          width: index === active ? 7 : 5,
          height: index === active ? 76 : 26,
          borderRadius: 999,
          background:
            index === active ? COLOR.clayBright : "rgba(244,238,232,0.22)",
          boxShadow:
            index === active ? "0 0 22px rgba(255,138,104,0.5)" : "none",
        }}
      />
    ))}
  </div>
);

const MappingRow = ({
  glyph,
  name,
  trigger,
  action,
  highlight,
  index,
  frame,
}: {
  glyph: string;
  name: string;
  trigger: string;
  action: string;
  highlight?: boolean;
  index: number;
  frame: number;
}) => {
  const style = reveal(frame, 20 + index * 13, 14, 30);

  return (
    <div
      style={{
        ...style,
        height: 138,
        display: "grid",
        gridTemplateColumns: "175px 205px 1fr",
        alignItems: "center",
        padding: "0 24px",
        marginBottom: 13,
        borderRadius: 22,
        background: highlight ? "#35202f" : "#29262e",
        border: highlight
          ? "1.5px solid rgba(255,138,104,0.72)"
          : "1px solid rgba(255,255,255,0.08)",
        boxShadow: highlight ? "0 18px 46px rgba(229,110,80,0.17)" : "none",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 15 }}>
        <div
          style={{
            width: 56,
            height: 56,
            borderRadius: "50%",
            display: "grid",
            placeItems: "center",
            fontFamily: FONT,
            fontSize: 25,
            fontWeight: 800,
            color: highlight ? COLOR.paper : "#ddd4df",
            background: highlight ? COLOR.clay : "#403b46",
          }}
        >
          {glyph}
        </div>
        <span
          style={{
            color: COLOR.paper,
            fontFamily: FONT,
            fontSize: 25,
            fontWeight: 700,
          }}
        >
          {name}
        </span>
      </div>
      <span
        style={{
          justifySelf: "start",
          borderRadius: 12,
          background: "#37323d",
          padding: "10px 15px",
          color: COLOR.paperDim,
          fontFamily: MONO,
          fontSize: 19,
        }}
      >
        {trigger}
      </span>
      <div
        style={{
          color: highlight ? COLOR.clayBright : COLOR.paper,
          fontFamily: FONT,
          fontSize: 28,
          fontWeight: 650,
        }}
      >
        {action}
      </div>
    </div>
  );
};

export const Controller = ({
  active,
  leftX = 0,
  leftY = 0,
  rightX = 0,
  rightY = 0,
  style,
}: {
  active?: string;
  leftX?: number;
  leftY?: number;
  rightX?: number;
  rightY?: number;
  style?: CSSProperties;
}) => {
  const idle = "#3b3942";
  const stroke = "#56515d";
  const body = "#27252d";
  const onFill = COLOR.clay;
  const fill = (id: string) => (active === id ? onFill : idle);
  const outline = (id: string) => (active === id ? COLOR.clayBright : stroke);

  return (
    <svg
      viewBox="0 0 460 300"
      style={{ width: "100%", display: "block", ...style }}
      aria-label="DualShock controller"
    >
      <defs>
        <filter id="controllerGlow" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="5" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>
      <path
        d="M110 96 C70 96 44 120 34 168 C24 214 30 250 62 258 C88 264 104 240 118 224 C134 206 156 200 230 200 C304 200 326 206 342 224 C356 240 372 264 398 258 C430 250 436 214 426 168 C416 120 390 96 350 96 C300 96 300 108 230 108 C160 108 160 96 110 96 Z"
        fill={body}
        stroke="#494550"
        strokeWidth={3}
      />
      <rect x="86" y="70" width="70" height="18" rx="9" fill={fill("L1")} stroke={outline("L1")} />
      <rect x="304" y="70" width="70" height="18" rx="9" fill={fill("R1")} stroke={outline("R1")} />
      <rect x="96" y="48" width="52" height="18" rx="6" fill={fill("L2")} stroke={outline("L2")} />
      <rect x="312" y="48" width="52" height="18" rx="6" fill={fill("R2")} stroke={outline("R2")} />
      <g>
        <rect x="94" y="118" width="20" height="20" rx="3" fill={fill("Up")} />
        <rect x="94" y="160" width="20" height="20" rx="3" fill={fill("Down")} />
        <rect x="72" y="140" width="20" height="20" rx="3" fill={fill("Left")} />
        <rect x="116" y="140" width="20" height="20" rx="3" fill={fill("Right")} />
      </g>
      {[
        ["Triangle", 346, 128, "△"],
        ["Circle", 372, 150, "○"],
        ["Cross", 346, 172, "✕"],
        ["Square", 320, 150, "□"],
      ].map(([id, cx, cy, glyph]) => (
        <g key={String(id)} filter={active === id ? "url(#controllerGlow)" : undefined}>
          <circle
            cx={Number(cx)}
            cy={Number(cy)}
            r="13"
            fill={fill(String(id))}
            stroke={outline(String(id))}
            strokeWidth="2"
          />
          <text
            x={Number(cx)}
            y={Number(cy) + 5}
            fontSize="13"
            fontFamily={FONT}
            fontWeight="700"
            fill="#eee8f0"
            textAnchor="middle"
          >
            {glyph}
          </text>
        </g>
      ))}
      <rect x="176" y="118" width="14" height="20" rx="3" fill={fill("Share")} />
      <rect x="270" y="118" width="14" height="20" rx="3" fill={fill("Options")} />
      <rect
        x="196"
        y="116"
        width="68"
        height="40"
        rx="7"
        fill="#302d36"
        stroke="#4f4b56"
      />
      <g filter={active === "PS" ? "url(#controllerGlow)" : undefined}>
        <circle
          cx="230"
          cy="176"
          r="10"
          fill={fill("PS")}
          stroke={outline("PS")}
          strokeWidth="2"
        />
        <text
          x="230"
          y="180"
          fontSize="8"
          fontFamily={FONT}
          fontWeight="800"
          fill="#f7f0f8"
          textAnchor="middle"
        >
          PS
        </text>
      </g>
      <circle cx="176" cy="200" r="24" fill="#1d1b22" stroke="#494550" strokeWidth="2" />
      <circle
        cx={176 + leftX * 12}
        cy={200 + leftY * 12}
        r="17"
        fill={idle}
        stroke={stroke}
        strokeWidth="2"
      />
      <circle cx="284" cy="200" r="24" fill="#1d1b22" stroke="#494550" strokeWidth="2" />
      <circle
        cx={284 + rightX * 12}
        cy={200 + rightY * 12}
        r="17"
        fill={idle}
        stroke={stroke}
        strokeWidth="2"
      />
    </svg>
  );
};

const ColdOpen = () => {
  const frame = useCurrentFrame();
  const titleIn = reveal(frame, 6, 15, 70);
  const flash = fade(frame, 0, 8, 0.42, 0);

  return (
    <AbsoluteFill style={{ background: COLOR.black }}>
      <Video
        src={staticFile("video/ps-press.mp4")}
        muted
        playbackRate={0.55}
        objectFit="cover"
        style={{ ...fit, filter: "contrast(1.1) saturate(0.8) brightness(0.72)" }}
      />
      <AbsoluteFill
        style={{
          background:
            "linear-gradient(180deg, rgba(15,8,20,0.08) 16%, rgba(15,8,20,0.3) 48%, rgba(15,8,20,0.96) 90%)",
        }}
      />
      <AbsoluteFill
        style={{
          opacity: flash,
          background: `radial-gradient(circle at 50% 58%, ${COLOR.clayBright}, transparent 42%)`,
        }}
      />
      <BrandBug />
      <div
        style={{
          position: "absolute",
          left: 74,
          right: 74,
          bottom: 166,
          ...titleIn,
        }}
      >
        <SectionLabel color={COLOR.clayBright}>PS button → voice</SectionLabel>
        <div
          style={{
            marginTop: 24,
            color: COLOR.paper,
            fontFamily: FONT,
            fontSize: 132,
            lineHeight: 0.86,
            letterSpacing: -8,
            fontWeight: 800,
          }}
        >
          VOICE
          <br />
          IN.
        </div>
        <div
          style={{
            marginTop: 32,
            color: COLOR.paperDim,
            fontFamily: FONT,
            fontSize: 34,
            lineHeight: 1.3,
          }}
        >
          Speak instead of type.
        </div>
      </div>
      <div
        style={{
          position: "absolute",
          right: 69,
          bottom: 182,
          display: "flex",
          alignItems: "flex-end",
          gap: 8,
        }}
      >
        {[0.42, 0.7, 1, 0.62, 0.88, 0.5, 0.3].map((level, index) => {
          const wave = 1 + Math.sin(frame / 3 + index * 0.8) * 0.22;
          return (
            <span
              key={index}
              style={{
                width: 8,
                height: 58 * level * wave,
                borderRadius: 9,
                background: index === 2 ? COLOR.clayBright : COLOR.paper,
                opacity: 0.85,
              }}
            />
          );
        })}
      </div>
    </AbsoluteFill>
  );
};

const MapperScene = () => {
  const frame = useCurrentFrame();
  const scale = interpolate(frame, [0, 18], [0.965, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.out(Easing.exp),
  });

  return (
    <AbsoluteFill>
      <Backdrop warm />
      <BrandBug />
      <SceneHeader
        label="01 · Mapper"
        title={
          <>
            Map every
            <br />
            <span style={{ color: COLOR.clayBright }}>control.</span>
          </>
        }
        detail="Button presses, holds, releases, shortcuts, and text."
        frame={frame}
      />
      <div style={{ transform: `scale(${scale})`, transformOrigin: "50% 80%" }}>
        <AppWindow title="Mapper" top={545} height={1190}>
          <div style={{ padding: 30 }}>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                marginBottom: 25,
                color: COLOR.paper,
                fontFamily: FONT,
              }}
            >
              <span style={{ fontSize: 29, fontWeight: 700 }}>Button bindings</span>
              <span
                style={{
                  marginLeft: "auto",
                  color: COLOR.mint,
                  fontFamily: MONO,
                  fontSize: 18,
                  background: "#20362b",
                  padding: "8px 13px",
                  borderRadius: 14,
                }}
              >
                ENABLED
              </span>
            </div>
            <MappingRow
              glyph="✕"
              name="Cross"
              trigger="On press"
              action="Send"
              index={0}
              frame={frame}
            />
            <MappingRow
              glyph="○"
              name="Circle"
              trigger="On press"
              action="Stop"
              index={1}
              frame={frame}
            />
            <MappingRow
              glyph="□"
              name="Square"
              trigger="On press"
              action="New chat"
              index={2}
              frame={frame}
            />
            <MappingRow
              glyph="PS"
              name="PS"
              trigger="Hold"
              action="Dictation shortcut"
              highlight
              index={3}
              frame={frame}
            />
            <div
              style={{
                ...reveal(frame, 75, 18, 22),
                marginTop: 23,
                borderRadius: 20,
                background: "#242129",
                border: "1px solid rgba(255,255,255,0.08)",
                padding: "23px 26px",
                display: "flex",
                alignItems: "center",
                gap: 22,
              }}
            >
              <span
                style={{
                  fontFamily: MONO,
                  color: COLOR.cyan,
                  fontSize: 18,
                  letterSpacing: 1,
                }}
              >
                ANALOG
              </span>
              <span style={{ fontFamily: FONT, color: COLOR.paper, fontSize: 25 }}>
                Left stick → cursor
              </span>
              <span style={{ marginLeft: "auto", color: COLOR.muted, fontSize: 24 }}>
                0.85×
              </span>
            </div>
          </div>
        </AppWindow>
      </div>
      <ProgressRail active={0} />
    </AbsoluteFill>
  );
};

const AxisReadout = ({
  label,
  value,
  shaped,
}: {
  label: string;
  value: number;
  shaped: number;
}) => (
  <div
    style={{
      display: "grid",
      gridTemplateColumns: "100px 1fr 60px 1fr",
      gap: 13,
      alignItems: "center",
      fontFamily: MONO,
      fontSize: 18,
      color: COLOR.paperDim,
    }}
  >
    <span>{label}</span>
    <div
      style={{
        height: 11,
        background: "#3b3740",
        borderRadius: 10,
        overflow: "hidden",
      }}
    >
      <div
        style={{
          width: `${Math.max(6, Math.abs(value) * 100)}%`,
          height: "100%",
          background: "#716a77",
          borderRadius: 10,
        }}
      />
    </div>
    <span style={{ textAlign: "right" }}>{value.toFixed(2)}</span>
    <div
      style={{
        height: 11,
        background: "#3b3740",
        borderRadius: 10,
        overflow: "hidden",
      }}
    >
      <div
        style={{
          width: `${Math.max(6, Math.abs(shaped) * 100)}%`,
          height: "100%",
          background: COLOR.clayBright,
          borderRadius: 10,
        }}
      />
    </div>
  </div>
);

const TesterScene = () => {
  const frame = useCurrentFrame();
  const phase = frame % 118;
  const active =
    phase < 24 ? "Cross" : phase < 50 ? "Square" : phase < 78 ? "PS" : undefined;
  const leftX = Math.sin(frame / 10) * 0.75;
  const leftY = Math.cos(frame / 13) * 0.55;
  const rightX = Math.sin(frame / 14 + 1.5) * 0.62;
  const rightY = Math.cos(frame / 11 + 0.7) * 0.68;
  const safePulse = 0.84 + Math.sin(frame / 8) * 0.1;

  return (
    <AbsoluteFill>
      <Backdrop />
      <BrandBug />
      <SceneHeader
        label="02 · Tester"
        title={
          <>
            Test every input
            <br />
            <span style={{ color: COLOR.cyan }}>live.</span>
          </>
        }
        detail="See buttons, sticks, deadzones, and shaped values before output is armed."
        frame={frame}
        compact
      />
      <AppWindow title="Tester" top={535} height={1200}>
        <div style={{ padding: "31px 32px" }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              color: COLOR.paper,
              fontFamily: FONT,
              marginBottom: 10,
            }}
          >
            <span style={{ fontSize: 28, fontWeight: 700 }}>Live controller</span>
            <span
              style={{
                marginLeft: "auto",
                color: COLOR.mint,
                fontFamily: MONO,
                fontSize: 17,
                borderRadius: 30,
                padding: "9px 14px",
                background: "#20362b",
              }}
            >
              ● CONNECTED
            </span>
          </div>
          <Controller
            active={active}
            leftX={leftX}
            leftY={leftY}
            rightX={rightX}
            rightY={rightY}
            style={{
              height: 500,
              filter: "drop-shadow(0 35px 35px rgba(0,0,0,0.34))",
            }}
          />
          <div
            style={{
              marginTop: -4,
              display: "flex",
              flexWrap: "wrap",
              justifyContent: "center",
              gap: 11,
            }}
          >
            {["CROSS", "CIRCLE", "SQUARE", "TRIANGLE", "PS", "L2", "R2"].map(
              (button) => (
                <div
                  key={button}
                  style={{
                    borderRadius: 12,
                    padding: "11px 16px",
                    minWidth: 112,
                    textAlign: "center",
                    color:
                      active?.toUpperCase() === button ? COLOR.paper : COLOR.paperDim,
                    background:
                      active?.toUpperCase() === button ? COLOR.clay : "#343039",
                    fontFamily: MONO,
                    fontSize: 17,
                    fontWeight: 700,
                  }}
                >
                  {button}
                </div>
              ),
            )}
          </div>
          <div
            style={{
              marginTop: 31,
              borderRadius: 22,
              border: "1px solid rgba(255,255,255,0.09)",
              background: "#26232b",
              padding: "23px 24px",
              display: "flex",
              flexDirection: "column",
              gap: 18,
            }}
          >
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "100px 1fr 60px 1fr",
                gap: 13,
                color: COLOR.muted,
                fontFamily: MONO,
                fontSize: 15,
              }}
            >
              <span />
              <span>RAW</span>
              <span />
              <span style={{ color: COLOR.clayBright }}>SHAPED</span>
            </div>
            <AxisReadout label="LEFT X" value={leftX} shaped={leftX * 0.82} />
            <AxisReadout label="LEFT Y" value={leftY} shaped={leftY * 0.82} />
            <AxisReadout label="RIGHT X" value={rightX} shaped={rightX * 0.82} />
          </div>
          <div
            style={{
              marginTop: 27,
              display: "flex",
              alignItems: "center",
              borderRadius: 20,
              background: "#29262d",
              padding: "20px 24px",
              color: COLOR.paper,
              fontFamily: FONT,
            }}
          >
            <span
              style={{
                width: 55,
                height: 31,
                borderRadius: 30,
                background: "#4a454e",
                marginRight: 17,
                padding: 4,
                boxSizing: "border-box",
              }}
            >
              <span
                style={{
                  display: "block",
                  width: 23,
                  height: 23,
                  borderRadius: "50%",
                  background: COLOR.paper,
                  opacity: safePulse,
                }}
              />
            </span>
            <span style={{ fontSize: 24, fontWeight: 650 }}>Output safely disarmed</span>
            <span
              style={{
                marginLeft: "auto",
                color: COLOR.mint,
                fontFamily: MONO,
                fontSize: 17,
              }}
            >
              TEST MODE
            </span>
          </div>
        </div>
      </AppWindow>
      <ProgressRail active={1} />
    </AbsoluteFill>
  );
};

const FocusScene = () => {
  const frame = useCurrentFrame();
  const titleStyle = reveal(frame, 5, 14, 54);
  const zoom = interpolate(frame, [0, SCENES.focus], [1.03, 1.1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  return (
    <AbsoluteFill style={{ background: COLOR.black, overflow: "hidden" }}>
      <Video
        src={staticFile("video/controller-focus.mp4")}
        muted
        objectFit="cover"
        style={{
          ...fit,
          transform: `scale(${zoom})`,
          filter: "contrast(1.08) saturate(0.76) brightness(0.69)",
        }}
      />
      <AbsoluteFill
        style={{
          background:
            "linear-gradient(180deg, rgba(11,5,16,0.18), rgba(11,5,16,0.12) 35%, rgba(11,5,16,0.92) 92%)",
        }}
      />
      <BrandBug />
      <div
        style={{
          position: "absolute",
          left: 72,
          right: 72,
          bottom: 150,
          ...titleStyle,
        }}
      >
        <SectionLabel>03 · Background control</SectionLabel>
        <div
          style={{
            marginTop: 23,
            color: COLOR.paper,
            fontFamily: FONT,
            fontSize: 76,
            fontWeight: 780,
            lineHeight: 1.02,
            letterSpacing: -4.2,
          }}
        >
          Claude stays
          <br />
          <span style={{ color: COLOR.clayBright }}>focused.</span>
        </div>
        <div
          style={{
            marginTop: 24,
            color: COLOR.paperDim,
            fontFamily: FONT,
            fontSize: 31,
            lineHeight: 1.32,
          }}
        >
          ClaudePad keeps listening in the background.
        </div>
      </div>
      <ProgressRail active={2} />
    </AbsoluteFill>
  );
};

const VoiceScene = () => {
  const frame = useCurrentFrame();
  const typedText = "Plan a focused three-day launch for ClaudePad.";
  const typedCount = Math.floor(
    interpolate(frame, [55, 150], [0, typedText.length], {
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
    }),
  );
  const sent = frame >= 166;
  const psActive = frame < 156;
  const titleOpacity = fade(frame, 0, 15);
  const sendPunch = interpolate(frame, [162, 168, 180], [0, 1, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  return (
    <AbsoluteFill>
      <Backdrop warm />
      <BrandBug />
      <div
        style={{
          position: "absolute",
          top: 152,
          left: 72,
          right: 72,
          opacity: titleOpacity,
        }}
      >
        <SectionLabel color={COLOR.clayBright}>04 · Voice control</SectionLabel>
        <div
          style={{
            marginTop: 24,
            color: COLOR.paper,
            fontFamily: FONT,
            fontSize: 78,
            fontWeight: 780,
            letterSpacing: -4.6,
            lineHeight: 0.98,
          }}
        >
          PS button.
          <br />
          <span style={{ color: COLOR.clayBright }}>Speak.</span> Cross to send.
        </div>
      </div>

      <div
        style={{
          position: "absolute",
          left: 57,
          right: 57,
          top: 460,
          height: 575,
          overflow: "hidden",
          borderRadius: 32,
          background: "#ece9e5",
          border: "1px solid rgba(255,255,255,0.22)",
          boxShadow: "0 36px 80px rgba(0,0,0,0.3)",
          ...reveal(frame, 10, 18, 40),
        }}
      >
        <Video
          src={staticFile("video/vordi-dictation.mp4")}
          muted
          playbackRate={0.55}
          objectFit="cover"
          style={{
            width: "100%",
            height: "100%",
            objectPosition: "50% 34%",
            filter: "contrast(1.03) saturate(0.92)",
          }}
        />
        <div
          style={{
            position: "absolute",
            left: 24,
            top: 24,
            display: "flex",
            gap: 10,
          }}
        >
          {["VORDI", "WISPR FLOW"].map((name, index) => (
            <span
              key={name}
              style={{
                padding: "9px 14px",
                borderRadius: 30,
                color: index === 0 ? COLOR.paper : COLOR.ink,
                background: index === 0 ? COLOR.ink : "rgba(244,238,232,0.9)",
                fontFamily: MONO,
                fontSize: 16,
                fontWeight: 750,
                letterSpacing: 0.5,
              }}
            >
              {name}
            </span>
          ))}
        </div>
        <div
          style={{
            position: "absolute",
            left: 0,
            right: 0,
            bottom: 0,
            height: 100,
            background:
              "linear-gradient(180deg, transparent, rgba(20,13,25,0.68))",
          }}
        />
      </div>

      <div
        style={{
          position: "absolute",
          left: 57,
          right: 57,
          top: 1080,
          height: 420,
          borderRadius: 30,
          background: "#242129",
          border: sent
            ? `2px solid ${COLOR.mint}`
            : "1px solid rgba(255,255,255,0.12)",
          boxShadow: sent
            ? "0 26px 70px rgba(87,213,139,0.14)"
            : "0 26px 70px rgba(0,0,0,0.26)",
          overflow: "hidden",
          ...reveal(frame, 33, 18, 40),
        }}
      >
        <div
          style={{
            height: 72,
            display: "flex",
            alignItems: "center",
            borderBottom: "1px solid rgba(255,255,255,0.08)",
            padding: "0 25px",
            fontFamily: FONT,
            color: COLOR.paperDim,
            fontSize: 21,
          }}
        >
          <span style={{ color: COLOR.clayBright, fontSize: 31, marginRight: 12 }}>
            ✦
          </span>
          Claude
          <span
            style={{
              marginLeft: "auto",
              color: sent ? COLOR.mint : COLOR.cyan,
              fontFamily: MONO,
              fontSize: 15,
            }}
          >
            {sent ? "SENT" : "LISTENING"}
          </span>
        </div>
        <div
          style={{
            padding: "31px 32px",
            color: COLOR.paper,
            fontFamily: FONT,
            fontSize: 36,
            lineHeight: 1.38,
            minHeight: 190,
          }}
        >
          {typedText.slice(0, typedCount)}
          {!sent ? (
            <span
              style={{
                display: "inline-block",
                width: 3,
                height: 39,
                marginLeft: 4,
                verticalAlign: "-6px",
                background: COLOR.clayBright,
                opacity: Math.floor(frame / 10) % 2 ? 0.25 : 1,
              }}
            />
          ) : null}
        </div>
        <div
          style={{
            position: "absolute",
            left: 28,
            bottom: 24,
            display: "flex",
            alignItems: "center",
            gap: 12,
            color: COLOR.muted,
            fontFamily: MONO,
            fontSize: 16,
          }}
        >
          <span
            style={{
              width: 9,
              height: 9,
              borderRadius: "50%",
              background: sent ? COLOR.mint : COLOR.clayBright,
            }}
          />
          Shortcut-driven voice input
        </div>
        <div
          style={{
            position: "absolute",
            right: 24,
            bottom: 21,
            borderRadius: 17,
            background: sent ? COLOR.mint : COLOR.clay,
            color: COLOR.ink,
            padding: "13px 20px",
            fontFamily: MONO,
            fontWeight: 800,
            fontSize: 18,
            transform: `scale(${1 + sendPunch * 0.13})`,
          }}
        >
          ✕ {sent ? "SENT" : "SEND"}
        </div>
      </div>

      <div
        style={{
          position: "absolute",
          left: 73,
          right: 73,
          bottom: 86,
          display: "grid",
          gridTemplateColumns: "1fr 300px",
          alignItems: "center",
          gap: 12,
        }}
      >
        <div>
          <div
            style={{
              color: sent ? COLOR.mint : COLOR.paper,
              fontFamily: FONT,
              fontSize: 57,
              fontWeight: 780,
              letterSpacing: -2.8,
              lineHeight: 1,
            }}
          >
            {sent ? "CONTROLLER OUT." : "NO KEYBOARD."}
          </div>
          <div
            style={{
              marginTop: 17,
              color: COLOR.paperDim,
              fontFamily: FONT,
              fontSize: 23,
            }}
          >
            Set your dictation shortcut once.
          </div>
        </div>
        <Controller
          active={psActive ? "PS" : "Cross"}
          style={{
            filter: `drop-shadow(0 18px 32px rgba(229,110,80,${
              psActive ? 0.35 : 0.2
            }))`,
          }}
        />
      </div>
      <ProgressRail active={3} />
    </AbsoluteFill>
  );
};

const Terminal = ({ frame }: { frame: number }) => {
  const command = "npx github:Raunaks068619/claudepad";
  const count = Math.floor(
    interpolate(frame, [12, 74], [0, command.length], {
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
    }),
  );
  const ready = frame > 80;

  return (
    <div
      style={{
        position: "absolute",
        left: 61,
        right: 61,
        top: 490,
        height: 470,
        borderRadius: 31,
        overflow: "hidden",
        background: "#17151a",
        border: "1px solid rgba(255,255,255,0.12)",
        boxShadow: "0 42px 90px rgba(0,0,0,0.34)",
        ...reveal(frame, 4, 18, 45),
      }}
    >
      <div
        style={{
          height: 70,
          display: "flex",
          alignItems: "center",
          gap: 10,
          padding: "0 25px",
          background: "#211e24",
          borderBottom: "1px solid rgba(255,255,255,0.08)",
        }}
      >
        {["#ff6b66", "#f6bf4f", "#62c75a"].map((color) => (
          <span
            key={color}
            style={{ width: 14, height: 14, borderRadius: "50%", background: color }}
          />
        ))}
        <span
          style={{
            marginLeft: 13,
            color: COLOR.paperDim,
            fontFamily: MONO,
            fontSize: 17,
          }}
        >
          Terminal
        </span>
      </div>
      <div
        style={{
          padding: "38px 35px",
          fontFamily: MONO,
          fontSize: 29,
          lineHeight: 1.55,
          color: COLOR.paper,
        }}
      >
        <span style={{ color: COLOR.mint }}>~</span>{" "}
        <span style={{ color: COLOR.clayBright }}>›</span>{" "}
        {command.slice(0, count)}
        {!ready ? (
          <span
            style={{
              display: "inline-block",
              width: 14,
              height: 31,
              marginLeft: 4,
              verticalAlign: "-5px",
              background: COLOR.paper,
              opacity: Math.floor(frame / 9) % 2 ? 0.25 : 1,
            }}
          />
        ) : null}
        {ready ? (
          <div
            style={{
              marginTop: 36,
              color: COLOR.mint,
              fontSize: 24,
              ...reveal(frame, 79, 12, 18),
            }}
          >
            ✓ ClaudePad is ready
          </div>
        ) : null}
      </div>
    </div>
  );
};

const EndScene = () => {
  const frame = useCurrentFrame();
  const card = fade(frame, 86, 105);
  const terminalOut = fade(frame, 82, 106, 1, 0);
  const iconScale = interpolate(frame, [91, 113], [0.82, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.out(Easing.exp),
  });

  return (
    <AbsoluteFill>
      <Backdrop warm />
      <BrandBug />
      <div style={{ opacity: terminalOut }}>
        <SceneHeader
          label="05 · Easy start"
          title={
            <>
              One command.
              <br />
              <span style={{ color: COLOR.mint }}>That’s it.</span>
            </>
          }
          detail="Run, connect, map, and control."
          frame={frame}
        />
        <Terminal frame={frame} />
      </div>

      <AbsoluteFill
        style={{
          opacity: card,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          textAlign: "center",
          background:
            "radial-gradient(circle at 50% 39%, rgba(229,110,80,0.15), transparent 35%)",
        }}
      >
        <div style={{ transform: `scale(${iconScale})` }}>
          <Img
            src={staticFile("image/claudepad-icon.png")}
            style={{
              width: 240,
              height: 240,
              borderRadius: 54,
              boxShadow: "0 42px 80px rgba(0,0,0,0.34)",
            }}
          />
          <div
            style={{
              marginTop: 39,
              color: COLOR.paper,
              fontFamily: FONT,
              fontSize: 89,
              fontWeight: 800,
              letterSpacing: -5.5,
            }}
          >
            ClaudePad
          </div>
          <div
            style={{
              marginTop: 15,
              color: COLOR.clayBright,
              fontFamily: FONT,
              fontSize: 41,
              fontWeight: 700,
              letterSpacing: -1.2,
            }}
          >
            Voice in. Controller out.
          </div>
          <div
            style={{
              marginTop: 35,
              display: "inline-flex",
              alignItems: "center",
              gap: 14,
              color: COLOR.paperDim,
              fontFamily: MONO,
              fontSize: 21,
              letterSpacing: 0.6,
            }}
          >
            <span>macOS</span>
            <span style={{ color: COLOR.clay }}>•</span>
            <span>MIT open source</span>
          </div>
        </div>
      </AbsoluteFill>
      <ProgressRail active={4} />
    </AbsoluteFill>
  );
};

const VOICEOVER_TRACKS = [
  { file: "01-intro.m4a", from: 4, duration: 86 },
  { file: "02-mapper.m4a", from: 99, duration: 111 },
  { file: "03-tester.m4a", from: 262, duration: 150 },
  { file: "04-focus.m4a", from: 425, duration: 85 },
  { file: "05-dictate.m4a", from: 549, duration: 102 },
  { file: "06-send.m4a", from: 688, duration: 34 },
  { file: "07-command.m4a", from: 776, duration: 38 },
  { file: "08-tagline.m4a", from: 857, duration: 62 },
] as const;

const duckForVoiceover = (frame: number): number => {
  const ramp = 8;
  return Math.min(
    ...VOICEOVER_TRACKS.map(({ from, duration }) =>
      interpolate(
        frame,
        [from - ramp, from, from + duration, from + duration + ramp],
        [1, 0.3, 0.3, 1],
        {
          extrapolateLeft: "clamp",
          extrapolateRight: "clamp",
        },
      ),
    ),
  );
};

export const Soundtrack = () => (
  <>
    <Audio
      src={staticFile("sound/ambient.m4a")}
      volume={(frame) => 0.78 * duckForVoiceover(frame)}
    />
    {VOICEOVER_TRACKS.map(({ file, from, duration }) => (
      <Sequence
        key={file}
        from={from}
        durationInFrames={duration}
        layout="none"
      >
        <Audio
          src={staticFile(`voiceover/${file}`)}
          volume={(frame) =>
            interpolate(frame, [0, 2, duration - 2, duration], [0, 1, 1, 0], {
              extrapolateLeft: "clamp",
              extrapolateRight: "clamp",
            })
          }
        />
      </Sequence>
    ))}
    {[12, 90, 255, 420, 525, 765, 856].map((at) => (
      <Sequence key={`click-${at}`} from={at} layout="none">
        <Audio
          src={staticFile("sound/click.wav")}
          volume={at === 765 ? 0.85 : at === 856 ? 0.65 : 0.5}
        />
      </Sequence>
    ))}
    {[84, 249, 414, 519, 753].map((at) => (
      <Sequence key={`whoosh-${at}`} from={at} layout="none">
        <Audio src={staticFile("sound/whoosh.wav")} volume={0.27} />
      </Sequence>
    ))}
  </>
);

export const ClaudePadPromo = () => {
  let cursor = 0;
  const coldStart = cursor;
  cursor += SCENES.cold;
  const mapperStart = cursor;
  cursor += SCENES.mapper;
  const testerStart = cursor;
  cursor += SCENES.tester;
  const focusStart = cursor;
  cursor += SCENES.focus;
  const voiceStart = cursor;
  cursor += SCENES.voice;
  const endStart = cursor;

  return (
    <AbsoluteFill
      style={{
        background: COLOR.aubergine,
        fontFamily: FONT,
      }}
    >
      <Soundtrack />
      <Sequence from={coldStart} durationInFrames={SCENES.cold}>
        <ColdOpen />
      </Sequence>
      <Sequence from={mapperStart} durationInFrames={SCENES.mapper}>
        <MapperScene />
      </Sequence>
      <Sequence from={testerStart} durationInFrames={SCENES.tester}>
        <TesterScene />
      </Sequence>
      <Sequence from={focusStart} durationInFrames={SCENES.focus}>
        <FocusScene />
      </Sequence>
      <Sequence from={voiceStart} durationInFrames={SCENES.voice}>
        <VoiceScene />
      </Sequence>
      <Sequence from={endStart} durationInFrames={SCENES.end}>
        <EndScene />
      </Sequence>
    </AbsoluteFill>
  );
};
