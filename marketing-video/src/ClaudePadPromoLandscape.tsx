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
import { Video } from "@remotion/media";
import {
  COLOR,
  Controller,
  DURATION_IN_FRAMES,
  FONT,
  MONO,
  SCENES,
  Soundtrack,
  fade,
  reveal,
} from "./ClaudePadPromo";

const full: CSSProperties = {
  width: "100%",
  height: "100%",
};

const Backdrop = ({ warm = false }: { warm?: boolean }) => {
  const frame = useCurrentFrame();
  const x1 = Math.sin(frame / 46) * 34;
  const x2 = Math.cos(frame / 52) * 42;

  return (
    <AbsoluteFill
      style={{
        overflow: "hidden",
        background: warm
          ? `radial-gradient(circle at 79% 12%, #613040 0%, ${COLOR.ink} 35%, ${COLOR.aubergine} 72%)`
          : `radial-gradient(circle at 17% 15%, #29394d 0%, ${COLOR.ink} 34%, ${COLOR.aubergine} 72%)`,
      }}
    >
      <div
        style={{
          position: "absolute",
          left: -260 + x1,
          bottom: -390,
          width: 820,
          height: 820,
          borderRadius: "50%",
          background: COLOR.clay,
          opacity: 0.08,
          filter: "blur(20px)",
        }}
      />
      <div
        style={{
          position: "absolute",
          right: -260 + x2,
          top: -300,
          width: 720,
          height: 720,
          borderRadius: "50%",
          background: COLOR.cyan,
          opacity: 0.07,
          filter: "blur(24px)",
        }}
      />
      <AbsoluteFill
        style={{
          opacity: 0.18,
          backgroundImage:
            "repeating-linear-gradient(0deg, transparent, transparent 3px, rgba(255,255,255,0.022) 4px)",
        }}
      />
    </AbsoluteFill>
  );
};

const Brand = ({
  left = 82,
  top = 54,
}: {
  left?: number;
  top?: number;
}) => (
  <div
    style={{
      position: "absolute",
      left,
      top,
      zIndex: 30,
      display: "flex",
      alignItems: "center",
      gap: 14,
      color: COLOR.paper,
      fontFamily: FONT,
      fontSize: 25,
      fontWeight: 750,
      letterSpacing: -0.5,
    }}
  >
    <div
      style={{
        width: 40,
        height: 40,
        borderRadius: 12,
        display: "grid",
        placeItems: "center",
        background: `linear-gradient(145deg, ${COLOR.clayBright}, ${COLOR.clay})`,
        boxShadow: "0 10px 30px rgba(229,110,80,0.25)",
        color: COLOR.paper,
        fontSize: 18,
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
      fontSize: 22,
      fontWeight: 750,
      letterSpacing: 2.2,
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

const Progress = ({ active }: { active: number }) => (
  <div
    style={{
      position: "absolute",
      right: 80,
      top: 69,
      zIndex: 50,
      display: "flex",
      gap: 9,
    }}
  >
    {[0, 1, 2, 3, 4].map((index) => (
      <span
        key={index}
        style={{
          width: index === active ? 68 : 27,
          height: 6,
          borderRadius: 99,
          background:
            index === active ? COLOR.clayBright : "rgba(244,238,232,0.22)",
          boxShadow:
            index === active ? "0 0 20px rgba(255,138,104,0.42)" : "none",
        }}
      />
    ))}
  </div>
);

const Window = ({
  children,
  title,
  style,
}: {
  children: ReactNode;
  title: string;
  style?: CSSProperties;
}) => (
  <div
    style={{
      position: "absolute",
      overflow: "hidden",
      borderRadius: 32,
      background: "#201e25",
      border: "1px solid rgba(255,255,255,0.13)",
      boxShadow: "0 38px 90px rgba(2,0,8,0.42)",
      ...style,
    }}
  >
    <div
      style={{
        height: 70,
        display: "flex",
        alignItems: "center",
        gap: 10,
        padding: "0 24px",
        borderBottom: "1px solid rgba(255,255,255,0.1)",
        background: "#19171d",
      }}
    >
      {["#ff6b66", "#f6bf4f", "#62c75a"].map((color) => (
        <span
          key={color}
          style={{ width: 13, height: 13, borderRadius: "50%", background: color }}
        />
      ))}
      <span
        style={{
          marginLeft: 12,
          color: "#ddd6df",
          fontFamily: FONT,
          fontSize: 21,
          fontWeight: 650,
        }}
      >
        ClaudePad · {title}
      </span>
      <span
        style={{
          marginLeft: "auto",
          padding: "7px 12px",
          borderRadius: 30,
          background: "#193229",
          color: COLOR.mint,
          fontFamily: MONO,
          fontSize: 15,
        }}
      >
        ● CONNECTED
      </span>
    </div>
    {children}
  </div>
);

const ColdOpen = () => {
  const frame = useCurrentFrame();
  const flash = fade(frame, 0, 8, 0.42, 0);
  const title = reveal(frame, 6, 15, 68);

  return (
    <AbsoluteFill style={{ overflow: "hidden", background: COLOR.black }}>
      <Video
        src={staticFile("video/ps-press.mp4")}
        muted
        playbackRate={0.55}
        objectFit="cover"
        style={{
          ...full,
          transform: "scale(1.16)",
          filter: "blur(38px) contrast(1.1) saturate(0.75) brightness(0.38)",
        }}
      />
      <AbsoluteFill
        style={{
          background:
            "linear-gradient(90deg, rgba(13,8,17,0.58), rgba(13,8,17,0.9) 43%, rgba(13,8,17,0.98))",
        }}
      />
      <AbsoluteFill
        style={{
          opacity: flash,
          background: `radial-gradient(circle at 29% 58%, ${COLOR.clayBright}, transparent 34%)`,
        }}
      />

      <div
        style={{
          position: "absolute",
          left: 76,
          top: 58,
          width: 650,
          height: 964,
          overflow: "hidden",
          borderRadius: 38,
          border: "1px solid rgba(255,255,255,0.2)",
          boxShadow: "0 42px 100px rgba(0,0,0,0.42)",
          ...reveal(frame, 0, 18, 28),
        }}
      >
        <Video
          src={staticFile("video/ps-press.mp4")}
          muted
          playbackRate={0.55}
          objectFit="cover"
          style={{
            ...full,
            objectPosition: "50% 51%",
            filter: "contrast(1.08) saturate(0.82) brightness(0.76)",
          }}
        />
        <div
          style={{
            position: "absolute",
            inset: 0,
            background:
              "linear-gradient(180deg, rgba(14,8,18,0.05), transparent 55%, rgba(14,8,18,0.82))",
          }}
        />
        <div
          style={{
            position: "absolute",
            left: 28,
            bottom: 28,
            padding: "12px 18px",
            borderRadius: 30,
            background: "rgba(23,16,31,0.88)",
            color: COLOR.paper,
            fontFamily: MONO,
            fontSize: 18,
            fontWeight: 750,
            letterSpacing: 1,
          }}
        >
          HOLD PS
        </div>
      </div>

      <Brand left={814} top={64} />
      <div
        style={{
          position: "absolute",
          left: 814,
          right: 86,
          top: 244,
          ...title,
        }}
      >
        <SectionLabel color={COLOR.clayBright}>PS button → voice</SectionLabel>
        <div
          style={{
            marginTop: 31,
            color: COLOR.paper,
            fontFamily: FONT,
            fontSize: 174,
            fontWeight: 820,
            lineHeight: 0.84,
            letterSpacing: -10,
          }}
        >
          VOICE
          <br />
          IN.
        </div>
        <div
          style={{
            marginTop: 38,
            color: COLOR.paperDim,
            fontFamily: FONT,
            fontSize: 36,
            fontWeight: 520,
          }}
        >
          Speak instead of type.
        </div>
      </div>

      <div
        style={{
          position: "absolute",
          left: 818,
          bottom: 114,
          display: "flex",
          alignItems: "center",
          gap: 30,
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "flex-end",
            gap: 9,
            height: 78,
          }}
        >
          {[0.45, 0.7, 1, 0.62, 0.88, 0.54, 0.34, 0.6, 0.42].map(
            (level, index) => {
              const wave = 1 + Math.sin(frame / 3 + index * 0.82) * 0.2;
              return (
                <span
                  key={index}
                  style={{
                    width: 9,
                    height: 68 * level * wave,
                    borderRadius: 9,
                    background:
                      index === 2 || index === 6
                        ? COLOR.clayBright
                        : COLOR.paper,
                    opacity: 0.86,
                  }}
                />
              );
            },
          )}
        </div>
        <span
          style={{
            color: COLOR.muted,
            fontFamily: MONO,
            fontSize: 18,
            letterSpacing: 1.2,
          }}
        >
          LISTENING
        </span>
      </div>
    </AbsoluteFill>
  );
};

const MappingRow = ({
  glyph,
  name,
  trigger,
  action,
  frame,
  index,
  highlight = false,
}: {
  glyph: string;
  name: string;
  trigger: string;
  action: string;
  frame: number;
  index: number;
  highlight?: boolean;
}) => (
  <div
    style={{
      ...reveal(frame, 18 + index * 12, 14, 28),
      height: 126,
      display: "grid",
      gridTemplateColumns: "190px 180px 1fr",
      alignItems: "center",
      padding: "0 24px",
      marginBottom: 12,
      borderRadius: 20,
      background: highlight ? "#35202f" : "#2a272f",
      border: highlight
        ? "1.5px solid rgba(255,138,104,0.72)"
        : "1px solid rgba(255,255,255,0.075)",
      boxShadow: highlight ? "0 18px 42px rgba(229,110,80,0.15)" : "none",
    }}
  >
    <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
      <span
        style={{
          width: 50,
          height: 50,
          borderRadius: "50%",
          display: "grid",
          placeItems: "center",
          flexShrink: 0,
          background: highlight ? COLOR.clay : "#403b46",
          color: COLOR.paper,
          fontFamily: FONT,
          fontSize: glyph === "PS" ? 17 : 23,
          fontWeight: 800,
        }}
      >
        {glyph}
      </span>
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
        padding: "9px 13px",
        borderRadius: 11,
        background: "#3a3540",
        color: COLOR.paperDim,
        fontFamily: MONO,
        fontSize: 17,
      }}
    >
      {trigger}
    </span>
    <span
      style={{
        color: highlight ? COLOR.clayBright : COLOR.paper,
        fontFamily: FONT,
        fontSize: 29,
        fontWeight: 680,
      }}
    >
      {action}
    </span>
  </div>
);

const MapperScene = () => {
  const frame = useCurrentFrame();
  const appScale = interpolate(frame, [0, 18], [0.97, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.out(Easing.exp),
  });

  return (
    <AbsoluteFill>
      <Backdrop warm />
      <Brand />
      <Progress active={0} />

      <div
        style={{
          position: "absolute",
          left: 82,
          top: 205,
          width: 545,
          ...reveal(frame, 2, 16, 44),
        }}
      >
        <SectionLabel>01 · Mapper</SectionLabel>
        <div
          style={{
            marginTop: 28,
            color: COLOR.paper,
            fontFamily: FONT,
            fontSize: 108,
            fontWeight: 800,
            lineHeight: 0.91,
            letterSpacing: -6.5,
          }}
        >
          Map every
          <br />
          <span style={{ color: COLOR.clayBright }}>control.</span>
        </div>
        <div
          style={{
            marginTop: 33,
            maxWidth: 510,
            color: COLOR.paperDim,
            fontFamily: FONT,
            fontSize: 32,
            lineHeight: 1.36,
          }}
        >
          Presses, holds, releases, shortcuts, and text — exactly where you
          want them.
        </div>
        <div
          style={{
            marginTop: 58,
            display: "flex",
            flexWrap: "wrap",
            gap: 11,
            ...reveal(frame, 63, 15, 20),
          }}
        >
          {["BUTTONS", "STICKS", "SHORTCUTS"].map((item) => (
            <span
              key={item}
              style={{
                padding: "11px 15px",
                borderRadius: 30,
                border: "1px solid rgba(255,255,255,0.12)",
                color: COLOR.paperDim,
                fontFamily: MONO,
                fontSize: 15,
                letterSpacing: 0.8,
              }}
            >
              {item}
            </span>
          ))}
        </div>
      </div>

      <div style={{ transform: `scale(${appScale})`, transformOrigin: "75% 55%" }}>
        <Window
          title="Mapper"
          style={{ left: 690, top: 120, width: 1150, height: 855 }}
        >
          <div style={{ padding: 25 }}>
            <div
              style={{
                height: 44,
                display: "flex",
                alignItems: "center",
                marginBottom: 16,
                color: COLOR.paper,
                fontFamily: FONT,
              }}
            >
              <span style={{ fontSize: 25, fontWeight: 700 }}>Button bindings</span>
              <span
                style={{
                  marginLeft: "auto",
                  padding: "7px 12px",
                  borderRadius: 20,
                  background: "#20362b",
                  color: COLOR.mint,
                  fontFamily: MONO,
                  fontSize: 15,
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
              frame={frame}
              index={0}
            />
            <MappingRow
              glyph="○"
              name="Circle"
              trigger="On press"
              action="Stop"
              frame={frame}
              index={1}
            />
            <MappingRow
              glyph="□"
              name="Square"
              trigger="On press"
              action="New chat"
              frame={frame}
              index={2}
            />
            <MappingRow
              glyph="PS"
              name="PS"
              trigger="Hold"
              action="Dictation shortcut"
              frame={frame}
              index={3}
              highlight
            />
            <div
              style={{
                ...reveal(frame, 72, 16, 22),
                height: 83,
                display: "flex",
                alignItems: "center",
                gap: 24,
                padding: "0 23px",
                borderRadius: 18,
                background: "#26232b",
                border: "1px solid rgba(255,255,255,0.08)",
              }}
            >
              <span
                style={{
                  color: COLOR.cyan,
                  fontFamily: MONO,
                  fontSize: 16,
                  letterSpacing: 1,
                }}
              >
                ANALOG
              </span>
              <span style={{ color: COLOR.paper, fontFamily: FONT, fontSize: 23 }}>
                Left stick → cursor
              </span>
              <span
                style={{
                  marginLeft: "auto",
                  color: COLOR.muted,
                  fontFamily: MONO,
                  fontSize: 17,
                }}
              >
                0.85×
              </span>
            </div>
          </div>
        </Window>
      </div>
    </AbsoluteFill>
  );
};

const AxisRow = ({
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
      gridTemplateColumns: "85px 1fr 58px",
      gap: 12,
      alignItems: "center",
      color: COLOR.paperDim,
      fontFamily: MONO,
      fontSize: 15,
    }}
  >
    <span>{label}</span>
    <div
      style={{
        height: 12,
        overflow: "hidden",
        borderRadius: 10,
        background: "#3d3842",
      }}
    >
      <div
        style={{
          width: `${Math.max(7, Math.abs(shaped) * 100)}%`,
          height: "100%",
          borderRadius: 10,
          background: COLOR.clayBright,
        }}
      />
    </div>
    <span style={{ textAlign: "right", color: COLOR.paper }}>
      {value.toFixed(2)}
    </span>
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

  return (
    <AbsoluteFill>
      <Backdrop />
      <Brand />
      <Progress active={1} />

      <div
        style={{
          position: "absolute",
          left: 82,
          top: 205,
          width: 510,
          ...reveal(frame, 2, 16, 44),
        }}
      >
        <SectionLabel>02 · Tester</SectionLabel>
        <div
          style={{
            marginTop: 28,
            color: COLOR.paper,
            fontFamily: FONT,
            fontSize: 102,
            fontWeight: 800,
            lineHeight: 0.92,
            letterSpacing: -6.2,
          }}
        >
          Test every
          <br />
          input <span style={{ color: COLOR.cyan }}>live.</span>
        </div>
        <div
          style={{
            marginTop: 34,
            color: COLOR.paperDim,
            fontFamily: FONT,
            fontSize: 31,
            lineHeight: 1.38,
          }}
        >
          See buttons, sticks, deadzones, and shaped values before output is
          armed.
        </div>
        <div
          style={{
            marginTop: 54,
            display: "flex",
            alignItems: "center",
            gap: 13,
            color: COLOR.mint,
            fontFamily: MONO,
            fontSize: 17,
            ...reveal(frame, 54, 14, 18),
          }}
        >
          <span
            style={{
              width: 13,
              height: 13,
              borderRadius: "50%",
              background: COLOR.mint,
              boxShadow: "0 0 0 7px rgba(169,239,193,0.1)",
            }}
          />
          SAFE TEST MODE
        </div>
      </div>

      <Window
        title="Tester"
        style={{
          left: 645,
          top: 104,
          width: 1195,
          height: 875,
          ...reveal(frame, 7, 17, 34),
        }}
      >
        <div
          style={{
            height: 805,
            display: "grid",
            gridTemplateColumns: "670px 1fr",
            gap: 28,
            padding: "30px 32px",
            boxSizing: "border-box",
          }}
        >
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              minWidth: 0,
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                color: COLOR.paper,
                fontFamily: FONT,
              }}
            >
              <span style={{ fontSize: 25, fontWeight: 700 }}>Live controller</span>
              <span
                style={{
                  marginLeft: "auto",
                  color: active ? COLOR.clayBright : COLOR.muted,
                  fontFamily: MONO,
                  fontSize: 15,
                }}
              >
                {active ? `${active.toUpperCase()} DOWN` : "LISTENING"}
              </span>
            </div>
            <Controller
              active={active}
              leftX={leftX}
              leftY={leftY}
              rightX={rightX}
              rightY={rightY}
              style={{
                marginTop: 20,
                filter: "drop-shadow(0 28px 30px rgba(0,0,0,0.34))",
              }}
            />
            <div
              style={{
                marginTop: 12,
                display: "grid",
                gridTemplateColumns: "repeat(4, 1fr)",
                gap: 9,
              }}
            >
              {["CROSS", "CIRCLE", "SQUARE", "TRIANGLE", "PS", "L2", "R2", "OPTIONS"].map(
                (button) => (
                  <div
                    key={button}
                    style={{
                      padding: "10px 7px",
                      borderRadius: 11,
                      textAlign: "center",
                      background:
                        active?.toUpperCase() === button ? COLOR.clay : "#343039",
                      color:
                        active?.toUpperCase() === button
                          ? COLOR.paper
                          : COLOR.paperDim,
                      fontFamily: MONO,
                      fontSize: 14,
                      fontWeight: 750,
                    }}
                  >
                    {button}
                  </div>
                ),
              )}
            </div>
          </div>

          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: 18,
              minWidth: 0,
            }}
          >
            <div
              style={{
                color: COLOR.paper,
                fontFamily: FONT,
                fontSize: 25,
                fontWeight: 700,
              }}
            >
              Shaped values
            </div>
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: 22,
                padding: "25px 22px",
                borderRadius: 20,
                background: "#29262e",
                border: "1px solid rgba(255,255,255,0.08)",
              }}
            >
              <AxisRow label="LEFT X" value={leftX} shaped={leftX * 0.82} />
              <AxisRow label="LEFT Y" value={leftY} shaped={leftY * 0.82} />
              <AxisRow label="RIGHT X" value={rightX} shaped={rightX * 0.82} />
              <AxisRow label="RIGHT Y" value={rightY} shaped={rightY * 0.82} />
            </div>

            <div
              style={{
                padding: "22px",
                borderRadius: 20,
                background: "#29262e",
                border: "1px solid rgba(255,255,255,0.08)",
              }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  color: COLOR.paperDim,
                  fontFamily: MONO,
                  fontSize: 15,
                }}
              >
                <span>DEADZONE</span>
                <span style={{ color: COLOR.cyan }}>0.12</span>
              </div>
              <div
                style={{
                  height: 12,
                  marginTop: 17,
                  overflow: "hidden",
                  borderRadius: 12,
                  background: "#423d46",
                }}
              >
                <div
                  style={{
                    width: "36%",
                    height: "100%",
                    borderRadius: 12,
                    background: COLOR.cyan,
                  }}
                />
              </div>
            </div>

            <div
              style={{
                marginTop: "auto",
                display: "flex",
                alignItems: "center",
                padding: "21px 22px",
                borderRadius: 20,
                background: "#23332b",
                border: "1px solid rgba(169,239,193,0.16)",
                color: COLOR.paper,
                fontFamily: FONT,
              }}
            >
              <span
                style={{
                  width: 53,
                  height: 29,
                  padding: 4,
                  boxSizing: "border-box",
                  borderRadius: 30,
                  background: "#4a454e",
                  marginRight: 14,
                }}
              >
                <span
                  style={{
                    display: "block",
                    width: 21,
                    height: 21,
                    borderRadius: "50%",
                    background: COLOR.paper,
                  }}
                />
              </span>
              <span style={{ fontSize: 21, fontWeight: 650 }}>Output disarmed</span>
              <span
                style={{
                  marginLeft: "auto",
                  color: COLOR.mint,
                  fontFamily: MONO,
                  fontSize: 14,
                }}
              >
                SAFE
              </span>
            </div>
          </div>
        </div>
      </Window>
    </AbsoluteFill>
  );
};

const FocusScene = () => {
  const frame = useCurrentFrame();
  const zoom = interpolate(frame, [0, SCENES.focus], [1.02, 1.08], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  return (
    <AbsoluteFill style={{ overflow: "hidden", background: COLOR.black }}>
      <Video
        src={staticFile("video/controller-focus.mp4")}
        muted
        objectFit="cover"
        style={{
          ...full,
          transform: "scale(1.2)",
          filter: "blur(34px) contrast(1.05) saturate(0.68) brightness(0.42)",
        }}
      />
      <AbsoluteFill
        style={{
          background:
            "linear-gradient(90deg, rgba(14,8,18,0.98) 0%, rgba(14,8,18,0.9) 45%, rgba(14,8,18,0.28) 72%, rgba(14,8,18,0.68) 100%)",
        }}
      />
      <Brand />
      <Progress active={2} />

      <div
        style={{
          position: "absolute",
          left: 1140,
          top: 50,
          width: 650,
          height: 980,
          overflow: "hidden",
          borderRadius: 40,
          border: "1px solid rgba(255,255,255,0.2)",
          boxShadow: "0 42px 100px rgba(0,0,0,0.44)",
          ...reveal(frame, 0, 18, 34),
        }}
      >
        <Video
          src={staticFile("video/controller-focus.mp4")}
          muted
          objectFit="cover"
          style={{
            ...full,
            objectPosition: "50% 50%",
            transform: `scale(${zoom})`,
            filter: "contrast(1.08) saturate(0.78) brightness(0.75)",
          }}
        />
        <div
          style={{
            position: "absolute",
            inset: 0,
            background:
              "linear-gradient(180deg, rgba(15,9,20,0.06), transparent 58%, rgba(15,9,20,0.65))",
          }}
        />
      </div>

      <div
        style={{
          position: "absolute",
          left: 94,
          top: 240,
          width: 900,
          ...reveal(frame, 5, 15, 58),
        }}
      >
        <SectionLabel>03 · Background control</SectionLabel>
        <div
          style={{
            marginTop: 31,
            color: COLOR.paper,
            fontFamily: FONT,
            fontSize: 120,
            fontWeight: 820,
            lineHeight: 0.9,
            letterSpacing: -7.3,
          }}
        >
          Claude stays
          <br />
          <span style={{ color: COLOR.clayBright }}>focused.</span>
        </div>
        <div
          style={{
            marginTop: 37,
            maxWidth: 760,
            color: COLOR.paperDim,
            fontFamily: FONT,
            fontSize: 35,
            lineHeight: 1.35,
          }}
        >
          ClaudePad keeps listening in the background.
        </div>
        <div
          style={{
            marginTop: 58,
            display: "inline-flex",
            alignItems: "center",
            gap: 15,
            padding: "15px 20px",
            borderRadius: 30,
            background: "rgba(36,24,47,0.82)",
            border: "1px solid rgba(255,255,255,0.1)",
            color: COLOR.mint,
            fontFamily: MONO,
            fontSize: 17,
          }}
        >
          <span
            style={{
              width: 11,
              height: 11,
              borderRadius: "50%",
              background: COLOR.mint,
              boxShadow: "0 0 18px rgba(169,239,193,0.56)",
            }}
          />
          INPUT ACTIVE · CLAUDE IN FRONT
        </div>
      </div>
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
  const sendPunch = interpolate(frame, [162, 168, 180], [0, 1, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  return (
    <AbsoluteFill>
      <Backdrop warm />
      <Brand />
      <Progress active={3} />

      <div
        style={{
          position: "absolute",
          left: 82,
          top: 145,
          right: 82,
          ...reveal(frame, 0, 15, 38),
        }}
      >
        <SectionLabel color={COLOR.clayBright}>04 · Voice control</SectionLabel>
        <div
          style={{
            marginTop: 22,
            color: COLOR.paper,
            fontFamily: FONT,
            fontSize: 83,
            fontWeight: 810,
            lineHeight: 0.96,
            letterSpacing: -5.2,
          }}
        >
          PS button. <span style={{ color: COLOR.clayBright }}>Speak.</span>{" "}
          Cross to send.
        </div>
      </div>

      <div
        style={{
          position: "absolute",
          left: 80,
          top: 330,
          width: 850,
          height: 475,
          overflow: "hidden",
          borderRadius: 30,
          background: "#ece9e5",
          border: "1px solid rgba(255,255,255,0.2)",
          boxShadow: "0 34px 78px rgba(0,0,0,0.31)",
          ...reveal(frame, 10, 17, 38),
        }}
      >
        <Video
          src={staticFile("video/vordi-dictation.mp4")}
          muted
          playbackRate={0.55}
          objectFit="cover"
          style={{
            ...full,
            objectPosition: "50% 48%",
            filter: "contrast(1.03) saturate(0.93)",
          }}
        />
        <div
          style={{
            position: "absolute",
            left: 22,
            top: 22,
            display: "flex",
            gap: 9,
          }}
        >
          {["VORDI", "WISPR FLOW"].map((name, index) => (
            <span
              key={name}
              style={{
                padding: "9px 14px",
                borderRadius: 30,
                background: index === 0 ? COLOR.ink : "rgba(244,238,232,0.92)",
                color: index === 0 ? COLOR.paper : COLOR.ink,
                fontFamily: MONO,
                fontSize: 15,
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
            height: 95,
            background:
              "linear-gradient(180deg, transparent, rgba(20,13,25,0.67))",
          }}
        />
      </div>

      <div
        style={{
          position: "absolute",
          left: 970,
          top: 330,
          width: 870,
          height: 475,
          overflow: "hidden",
          borderRadius: 30,
          background: "#242129",
          border: sent
            ? `2px solid ${COLOR.mint}`
            : "1px solid rgba(255,255,255,0.12)",
          boxShadow: sent
            ? "0 28px 74px rgba(87,213,139,0.14)"
            : "0 28px 74px rgba(0,0,0,0.28)",
          ...reveal(frame, 31, 17, 38),
        }}
      >
        <div
          style={{
            height: 70,
            display: "flex",
            alignItems: "center",
            padding: "0 25px",
            borderBottom: "1px solid rgba(255,255,255,0.08)",
            color: COLOR.paperDim,
            fontFamily: FONT,
            fontSize: 21,
          }}
        >
          <span style={{ color: COLOR.clayBright, fontSize: 30, marginRight: 12 }}>
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
            padding: "34px 34px",
            minHeight: 210,
            color: COLOR.paper,
            fontFamily: FONT,
            fontSize: 38,
            lineHeight: 1.38,
          }}
        >
          {typedText.slice(0, typedCount)}
          {!sent ? (
            <span
              style={{
                display: "inline-block",
                width: 3,
                height: 40,
                marginLeft: 5,
                verticalAlign: "-6px",
                background: COLOR.clayBright,
                opacity: Math.floor(frame / 10) % 2 ? 0.24 : 1,
              }}
            />
          ) : null}
        </div>
        <div
          style={{
            position: "absolute",
            left: 30,
            bottom: 24,
            display: "flex",
            alignItems: "center",
            gap: 11,
            color: COLOR.muted,
            fontFamily: MONO,
            fontSize: 15,
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
            bottom: 20,
            padding: "13px 20px",
            borderRadius: 16,
            background: sent ? COLOR.mint : COLOR.clay,
            color: COLOR.ink,
            fontFamily: MONO,
            fontSize: 18,
            fontWeight: 800,
            transform: `scale(${1 + sendPunch * 0.13})`,
          }}
        >
          ✕ {sent ? "SENT" : "SEND"}
        </div>
      </div>

      <div
        style={{
          position: "absolute",
          left: 80,
          right: 80,
          top: 842,
          height: 158,
          display: "grid",
          gridTemplateColumns: "500px 1fr 360px",
          alignItems: "center",
          gap: 35,
          padding: "0 32px",
          boxSizing: "border-box",
          borderRadius: 28,
          background: "rgba(31,28,36,0.78)",
          border: "1px solid rgba(255,255,255,0.09)",
          ...reveal(frame, 49, 17, 28),
        }}
      >
        <div>
          <div
            style={{
              color: sent ? COLOR.mint : COLOR.paper,
              fontFamily: FONT,
              fontSize: 46,
              fontWeight: 790,
              letterSpacing: -2.5,
              lineHeight: 1,
            }}
          >
            {sent ? "CONTROLLER OUT." : "NO KEYBOARD."}
          </div>
          <div
            style={{
              marginTop: 12,
              color: COLOR.paperDim,
              fontFamily: FONT,
              fontSize: 20,
            }}
          >
            Set your dictation shortcut once.
          </div>
        </div>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 15,
            color: COLOR.paperDim,
            fontFamily: MONO,
            fontSize: 16,
            whiteSpace: "nowrap",
          }}
        >
          <span style={{ color: COLOR.clayBright }}>PS HOLD</span>
          <span>→</span>
          <span>DICTATE</span>
          <span>→</span>
          <span style={{ color: sent ? COLOR.mint : COLOR.paper }}>CROSS SEND</span>
        </div>
        <Controller
          active={psActive ? "PS" : "Cross"}
          style={{
            maxHeight: 145,
            filter: `drop-shadow(0 16px 28px rgba(229,110,80,${
              psActive ? 0.32 : 0.19
            }))`,
          }}
        />
      </div>
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
        left: 780,
        top: 190,
        width: 1060,
        height: 610,
        overflow: "hidden",
        borderRadius: 32,
        background: "#17151a",
        border: "1px solid rgba(255,255,255,0.12)",
        boxShadow: "0 42px 95px rgba(0,0,0,0.36)",
        ...reveal(frame, 4, 18, 44),
      }}
    >
      <div
        style={{
          height: 72,
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
          padding: "54px 48px",
          color: COLOR.paper,
          fontFamily: MONO,
          fontSize: 34,
          lineHeight: 1.55,
        }}
      >
        <span style={{ color: COLOR.mint }}>~</span>{" "}
        <span style={{ color: COLOR.clayBright }}>›</span>{" "}
        {command.slice(0, count)}
        {!ready ? (
          <span
            style={{
              display: "inline-block",
              width: 15,
              height: 35,
              marginLeft: 5,
              verticalAlign: "-5px",
              background: COLOR.paper,
              opacity: Math.floor(frame / 9) % 2 ? 0.25 : 1,
            }}
          />
        ) : null}
        {ready ? (
          <div
            style={{
              marginTop: 50,
              color: COLOR.mint,
              fontSize: 28,
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
  const iconScale = interpolate(frame, [91, 113], [0.84, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.out(Easing.exp),
  });

  return (
    <AbsoluteFill>
      <Backdrop warm />
      <Brand />
      <Progress active={4} />

      <div style={{ opacity: terminalOut }}>
        <div
          style={{
            position: "absolute",
            left: 84,
            top: 235,
            width: 600,
            ...reveal(frame, 2, 16, 44),
          }}
        >
          <SectionLabel>05 · Easy start</SectionLabel>
          <div
            style={{
              marginTop: 30,
              color: COLOR.paper,
              fontFamily: FONT,
              fontSize: 108,
              fontWeight: 810,
              lineHeight: 0.91,
              letterSpacing: -6.7,
            }}
          >
            One
            <br />
            command.
            <br />
            <span style={{ color: COLOR.mint }}>That’s it.</span>
          </div>
          <div
            style={{
              marginTop: 34,
              color: COLOR.paperDim,
              fontFamily: FONT,
              fontSize: 31,
            }}
          >
            Run, connect, map, and control.
          </div>
        </div>
        <Terminal frame={frame} />
      </div>

      <AbsoluteFill
        style={{
          opacity: card,
          background:
            "radial-gradient(circle at 25% 50%, rgba(229,110,80,0.18), transparent 34%)",
        }}
      >
        <div
          style={{
            position: "absolute",
            left: 216,
            top: 304,
            width: 310,
            height: 310,
            transform: `scale(${iconScale})`,
          }}
        >
          <Img
            src={staticFile("image/claudepad-icon.png")}
            style={{
              ...full,
              borderRadius: 66,
              boxShadow: "0 44px 90px rgba(0,0,0,0.36)",
            }}
          />
        </div>
        <div
          style={{
            position: "absolute",
            left: 650,
            top: 280,
            right: 120,
            ...reveal(frame, 94, 18, 38),
          }}
        >
          <div
            style={{
              color: COLOR.paper,
              fontFamily: FONT,
              fontSize: 135,
              fontWeight: 830,
              letterSpacing: -8,
              lineHeight: 1,
            }}
          >
            ClaudePad
          </div>
          <div
            style={{
              marginTop: 25,
              color: COLOR.clayBright,
              fontFamily: FONT,
              fontSize: 58,
              fontWeight: 740,
              letterSpacing: -2.2,
            }}
          >
            Voice in. Controller out.
          </div>
          <div
            style={{
              marginTop: 44,
              display: "inline-flex",
              alignItems: "center",
              gap: 17,
              color: COLOR.paperDim,
              fontFamily: MONO,
              fontSize: 23,
              letterSpacing: 0.7,
            }}
          >
            <span>macOS</span>
            <span style={{ color: COLOR.clay }}>•</span>
            <span>MIT open source</span>
          </div>
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

export const ClaudePadPromoLandscape = () => {
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
        overflow: "hidden",
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

export { DURATION_IN_FRAMES };
