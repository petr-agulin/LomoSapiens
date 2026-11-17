// ENGINE_SPEC section 11: what happens with settings the user names, on the user's own camera.
import { cameraApertures, cameraShutters } from "./camera.ts";
import { sharpZone } from "./focus.ts";
import { lightNumber } from "./light.ts";
import { isRefusal, recommend } from "./recommend.ts";
import { buildWarnings, shakeRisk } from "./warnings.ts";
import type { Aperture, Camera, Conditions, Focus, Recommendation, Refusal, Shutter, TimedShutter, WhatIf, WhatIfOptions } from "./types.ts";

const BULB_SECONDS_SCANNED = [2, 1];

function isOnCamera(camera: Camera, { aperture, shutter }: WhatIfOptions) {
  const apertureExists = aperture === undefined || cameraApertures(camera).includes(aperture);
  const shutterExists =
    shutter === undefined || (shutter === "B" ? camera.hasBulb : cameraShutters(camera).includes(shutter as TimedShutter));
  return apertureExists && shutterExists;
}

function evaluateAgainst(conditions: Conditions, recommendation: Recommendation, options: WhatIfOptions): WhatIf {
  const { camera } = conditions;
  const { final } = recommendation;
  const aperture = options.aperture ?? final.aperture;
  const shutter: Shutter = options.shutter ?? final.shutter;
  const bulbSeconds = shutter !== "B" ? null : (options.bulbSeconds ?? (options.shutter ? 1 : final.bulbSeconds ?? 1));

  // Focus the user didn't name stays where the recommendation put it.
  const named = options.focusM !== undefined;
  const focus: Focus = named ? { meters: options.focusM as number | null, source: "given" } : final.focus;

  return {
    aperture,
    shutter,
    bulbSeconds,
    support: options.support ?? final.support,
    stepsVsRecommendation:
      lightNumber(final.aperture, final.shutter, final.bulbSeconds) - lightNumber(aperture, shutter, bulbSeconds),
    focus,
    sharpZone: sharpZone(camera, aperture, focus.meters),
    shakeRisk: shakeRisk(shutter),
    warnings: buildWarnings({
      camera,
      conditions,
      aperture,
      shutter,
      bulbSeconds,
      focusM: focus.meters,
    }),
  };
}

export function evaluate(conditions: Conditions, options: WhatIfOptions = {}): WhatIf | Refusal {
  const recommendation = recommend(conditions);
  if (isRefusal(recommendation)) return recommendation;
  if (!isOnCamera(conditions.camera, options)) return { refused: "not_on_camera" };
  return evaluateAgainst(conditions, recommendation, options);
}

export function scanApertures(conditions: Conditions, shutter: Shutter): WhatIf[] | Refusal {
  const recommendation = recommend(conditions);
  if (isRefusal(recommendation)) return recommendation;
  if (!isOnCamera(conditions.camera, { shutter })) return { refused: "not_on_camera" };
  return cameraApertures(conditions.camera).map((aperture) =>
    evaluateAgainst(conditions, recommendation, { aperture, shutter }),
  );
}

export function scanShutters(conditions: Conditions, aperture: Aperture): WhatIf[] | Refusal {
  const recommendation = recommend(conditions);
  if (isRefusal(recommendation)) return recommendation;
  const { camera } = conditions;
  if (!isOnCamera(camera, { aperture })) return { refused: "not_on_camera" };
  return [
    ...(camera.hasBulb ? BULB_SECONDS_SCANNED : []).map((bulbSeconds) =>
      evaluateAgainst(conditions, recommendation, { aperture, shutter: "B", bulbSeconds }),
    ),
    ...cameraShutters(camera).map((shutter) => evaluateAgainst(conditions, recommendation, { aperture, shutter })),
  ];
}
