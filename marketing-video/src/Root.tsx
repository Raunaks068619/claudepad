import { Composition } from "remotion";
import {
  ClaudePadPromo,
  DURATION_IN_FRAMES,
  FPS,
} from "./ClaudePadPromo";
import { ClaudePadPromoLandscape } from "./ClaudePadPromoLandscape";

export const RemotionRoot = () => {
  return (
    <>
      <Composition
        id="ClaudePadPromo"
        component={ClaudePadPromo}
        durationInFrames={DURATION_IN_FRAMES}
        fps={FPS}
        width={1080}
        height={1920}
      />
      <Composition
        id="ClaudePadPromoLandscape"
        component={ClaudePadPromoLandscape}
        durationInFrames={DURATION_IN_FRAMES}
        fps={FPS}
        width={1920}
        height={1080}
      />
    </>
  );
};
