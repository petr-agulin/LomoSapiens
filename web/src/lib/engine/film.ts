// ENGINE_SPEC section 3, "Film speed". Plain maths: on the ISO scale, each doubling of film speed needs one step
// less light. Counted from ISO 100 and rounded to the nearest whole step, so no film is more than half a step from
// exact. The same rule applies in daylight, evening, night and indoors.

/** Steps of light less than ISO 100 film needs: ISO 125 is 0, ISO 160 is 1, ISO 400 is 2. */
export function filmStep(iso: number) {
  const step = Math.round(Math.log2(iso / 100));
  // Math.round gives -0 just below ISO 100; the engine counts it as 0.
  return step === 0 ? 0 : step;
}
