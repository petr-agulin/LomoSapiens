import { describe, expect, it } from "vitest";
import cameraSet from "../../../../testset/engine/cameras.json" with { type: "json" };
import golden from "../../../../testset/engine/golden.json" with { type: "json" };
import { evaluate, filmStep, isRefusal, landscapeFocus, recommend, sharpZone, usualDistanceM } from "./index.ts";
import type { Aperture, Camera, Conditions, WhatIfOptions } from "./index.ts";

type GoldenCase = {
  id: string;
  note?: string;
  camera?: string;
  cameraChanges?: Partial<Camera>;
  input: Partial<Conditions>;
  whatIf?: WhatIfOptions;
  expect: {
    refused?: string;
    firstStep?: { aperture: string | null; shutter: string | null };
    final?: Record<string, unknown>;
    warnings?: Array<Record<string, unknown>>;
    noWarnings?: string[];
    estimate?: boolean;
    estimates?: string[];
    exact?: unknown;
  };
};

const cameras = cameraSet.cameras as Record<string, Camera>;
const cases = golden.cases as unknown as GoldenCase[];
const conditions = (input: Partial<Conditions>, camera: Camera) =>
  ({ ...golden.defaults, camera, ...input }) as Conditions;

describe("golden tests from ENGINE_SPEC section 13.1", () => {
  describe(`${golden.daylightTable.id}: every scene follows Kodak's table, for any film speed`, () => {
    const scenes = ["snow_sand", "open", "under_trees"] as const;
    for (const row of golden.daylightTable.rows) {
      for (const scene of scenes) {
        const want = row[scene];
        it(`ISO ${row.iso}, ${scene}: ${want ? `f/${want}` : "no matching setting"}`, () => {
          const result = recommend(
            conditions(
              {
                film: { iso: row.iso, type: "color_negative" },
                light: { kind: "daylight", sky: "sun", scene },
                subject: "group",
              },
              cameras.compact,
            ),
          );
          if (isRefusal(result)) throw new Error(`refused: ${result.refused}`);
          expect(result.steps[0]).toMatchObject({
            kind: "daylight_value",
            aperture: want,
            shutter: want ? "1/250" : null,
          });
        });
      }
    }
  });

  describe(`${golden.filmSteps.id}: film speed`, () => {
    for (const [iso, step] of golden.filmSteps.rows) {
      it(`counts ISO ${iso} as ${step} steps from ISO 100`, () => expect(filmStep(iso)).toBe(step));
    }
  });

  describe(`${golden.sharpZones.id}: sharp zone`, () => {
    for (const row of golden.sharpZones.rows) {
      it(`${row.camera}: f/${row.aperture} at ${row.distanceM} m is ${row.nearM} to ${row.farM} m`, () => {
        expect(sharpZone(cameras[row.camera], row.aperture as Aperture, row.distanceM)).toEqual({
          nearM: row.nearM,
          farM: row.farM,
        });
      });
    }
  });

  describe(`${golden.landscapeFocus.id}: landscape focus keeps infinity sharp`, () => {
    for (const row of golden.landscapeFocus.rows) {
      const where = row.focusM === null ? "∞" : `${row.focusM} m`;
      it(`${row.camera}: at f/${row.aperture}, focus at ${where}, sharp from ${row.nearM} m`, () => {
        const camera = cameras[row.camera];
        const focusM = landscapeFocus(camera, row.aperture as Aperture);
        expect(focusM).toBe(row.focusM);
        expect(sharpZone(camera, row.aperture as Aperture, focusM)).toEqual({ nearM: row.nearM, farM: null });
      });
    }
  });

  describe(`${golden.usualDistances.id}: usual distances from the lens`, () => {
    const subjects = ["portrait", "two_people", "group", "far"] as const;
    for (const row of golden.usualDistances.rows) {
      for (const subject of subjects) {
        it(`${row.focalLengthMm} mm, ${subject}: ${row[subject]} m`, () => {
          expect(usualDistanceM({ ...cameras.compact, focalLengthMm: row.focalLengthMm }, subject)).toBe(row[subject]);
        });
      }
    }
  });

  describe("scenes", () => {
    for (const { id, note, camera: cameraId, cameraChanges, input, whatIf, expect: want } of cases) {
      it(note ? `${id}: ${note}` : id, () => {
        const camera = { ...cameras[cameraId ?? golden.defaultCamera], ...cameraChanges };
        const shot = conditions(input, camera);

        if (whatIf) {
          expect(evaluate(shot, whatIf)).toEqual({ refused: want.refused });
          return;
        }

        const result = recommend(shot);
        if (want.refused) {
          expect(result).toEqual({ refused: want.refused });
          return;
        }
        if (isRefusal(result)) throw new Error(`refused: ${result.refused}`);

        if (want.exact) expect(result).toEqual(want.exact);
        if (want.firstStep) expect(result.steps[0]).toMatchObject(want.firstStep);
        if (want.final) expect(result.final).toMatchObject(want.final);
        if (want.estimate !== undefined) expect(result.estimate).toBe(want.estimate);
        if (want.estimates) expect(result.estimates).toEqual(want.estimates);
        for (const warning of want.warnings ?? []) expect(result.warnings).toContainEqual(warning);
        const codes = result.warnings.map((warning) => warning.code as string);
        for (const code of want.noWarnings ?? []) expect(codes).not.toContain(code);
      });
    }
  });
});
