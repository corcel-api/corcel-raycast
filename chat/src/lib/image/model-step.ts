import { inLerp, lerp } from "../math";
import { ImageGenerationModel } from "./types";

type Range = [number, number];

const CLIIENT_RANGE: Range = [1, 7];

const ENGINE_TO_RANGE_MAP: Record<ImageGenerationModel, Range> = {
  dreamshaper: [6, 12],
  proteus: [6, 12],
  playground: [25, 51],
};

export const fromClientRangeToModelRange = (clientRangeValue: number, model: ImageGenerationModel) => {
  const engineRange = ENGINE_TO_RANGE_MAP[model];
  return Math.round(
    lerp(
      engineRange[0],
      engineRange[1],
      inLerp(
        CLIIENT_RANGE[0],
        CLIIENT_RANGE[1],
        Math.max(Math.min(clientRangeValue, CLIIENT_RANGE[1]), CLIIENT_RANGE[0]), // Clamps value
      ),
    ),
  );
};

export const toClientRangeFromModelRange = (modelRangeValue: number, model: ImageGenerationModel) => {
  const engineRange = ENGINE_TO_RANGE_MAP[model];
  return Math.round(
    lerp(
      CLIIENT_RANGE[0],
      CLIIENT_RANGE[1],
      inLerp(engineRange[0], engineRange[1], Math.max(Math.min(modelRangeValue, engineRange[1]), engineRange[0])), // Clamps value
    ),
  );
};
