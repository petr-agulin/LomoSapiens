import { describe, expect, it } from "vitest";
import cameraSet from "../../../../testset/engine/cameras.json" with { type: "json" };
import kodak from "../../../../testset/engine/kodak.json" with { type: "json" };
import { lightNumber, recommend } from "./index.ts";
import type { Aperture, Camera, Conditions, Recommendation, Shutter } from "./index.ts";

// ENGINE_SPEC section 13.2: the same light as Kodak's own table, within what each camera can reach.
const cameras = cameraSet.cameras as Record<string, Camera>;
type Row = (typeof kodak.rows)[number];

function advise(row: Row, camera: Camera) {
  return recommend({
    film: { iso: 400, type: "color_negative" },
    light: row.light,
    subject: row.subject,
    goal: "sharp",
    sunBehindSubject: row.sunBehindSubject ?? false,
    support: "surface",
    camera,
  } as Conditions) as Recommendation;
}

const lightOf = ({ final }: Recommendation) => lightNumber(final.aperture, final.shutter, final.bulbSeconds);

describe("Kodak cross-check, Ultra Max 400", () => {
  for (const row of kodak.rows as Row[]) {
    it(`on the compact test camera, ${row.kodak}: light number ${row.lightNumber}`, () => {
      expect(lightOf(advise(row, cameras.compact))).toBe(row.lightNumber);
    });

    it(`on the next camera, ${row.kodak}: the same light as Kodak's f/${row.kodakAperture}, ${row.kodakShutter}`, () => {
      const kodakLight = lightNumber(row.kodakAperture as Aperture, row.kodakShutter as Shutter);
      expect(lightOf(advise(row, cameras.fast))).toBe(kodakLight);
    });
  }
});
