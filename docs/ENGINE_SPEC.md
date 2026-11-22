# Engine specification

The engine turns structured shooting conditions and the user's camera limits into settings. It is pure TypeScript: no AI, no clock, no network. Same input, same output.

It works for any 35 mm film camera with manual aperture, shutter speed and focus. There is no camera database: the user describes their own camera by its limits (section 1a). The same rules apply to every camera, and they rest on published theory only: no camera's manual.

It works in three layers: a published light value for the conditions, corrections for the light, then an equal-light move for the user's goal, always within the camera's limits. In daylight the light value comes from Kodak's published daylight table (section 3). In evening, night and indoor light it comes from another published table and from estimates (sections 5 and 5a).

## 1. Inputs: `Conditions`

JSON Schema lives in `schema/conditions.schema.json`.

| Field | Type | Required | Notes |
|---|---|---|---|
| `film` | `{ iso: number, type: "color_negative" \| "bw_negative" \| "slide" }` | yes | Only the speed changes the settings. Slide returns `unsupported_film` |
| `light` | `{ kind: "daylight", sky, scene }`, `{ kind: "lowlight", lowlight }` or `{ kind: "indoors", indoor, sky? }` | yes | Enums below |
| `subject` | `portrait` \| `two_people` \| `group` \| `far` \| `landscape` \| `other` | yes | The app names them Portrait, Subject close by, Subject a few steps away, Something further off, Landscape and Other |
| `subjectDistanceM` | number above 0, or `null` | for `other` | Overrides the subject's usual distance |
| `goal` | `blur` \| `sharp` \| `moving` | no | Default: portrait `blur`, every other subject `sharp`. There is no "no preference": every shot gets one of the three |
| `lowSun` | boolean | no | Default `false`. Daylight only |
| `sunBehindSubject` | boolean | no | Default `false` |
| `sunAhead` | boolean | no | Default `false`. Sun ahead of the camera, for the flare warning |
| `support` | `hand` \| `braced` \| `surface` \| `null` | no | `null` means the engine picks the least support that reaches the light. The app always sends the user's own support; `null` remains for tools and tests. `surface` includes a tripod |
| `camera` | Camera limits, section 1a | yes | |

- `sky`: `sun`, `sun_haze`, `sun_behind_clouds`, `overcast`, `storm`
- `scene`: `snow_sand`, `open`, `under_trees`
- `lowlight`: `sun_low`, `sun_just_set`, `dusk`, `street_night`, `home_lamps`, `floodlit`
- `indoor`: `window`, `room`, `lamps`, `office`

The engine takes no month or hour (section 8).

The schema normally stops bad input before it gets here. If it doesn't, camera limits that aren't on the lists in section 1a return `unsupported_camera`, a focal length outside 28–58 mm returns `unsupported_lens`, and subject `other` with no distance returns `missing_distance`.

## 1a. Camera limits

The user reads these off their own camera. The app asks them once.

| Field | Values | Notes |
|---|---|---|
| `widestAperture` | `"1.4"`, `"1.7"`, `"1.8"`, `"2"`, `"2.8"`, `"3.5"`, `"4"`, `"4.5"`, `"5.6"` | As marked on the lens. f/1.7 and f/1.8 are separate choices, and f/4.5 and f/5.6 cover simpler cameras |
| `smallestAperture` | `"11"`, `"16"`, `"22"`, `"32"` | f/11 for simpler cameras |
| `focalLengthMm` | 28 to 58 | v1 covers lenses of about 28 to 58 mm, because the by-hand limit in section 6 assumes one |
| `fastestShutter` | `"1/125"`, `"1/250"`, `"1/500"`, `"1/1000"`, `"1/2000"` | 1/125 for simpler cameras. A camera faster than 1/2000 picks 1/2000: the app never needs the faster speeds |
| `slowestShutter` | `"1"`, `"1/2"`, `"1/4"`, `"1/8"`, `"1/15"`, `"1/30"`, `"1/60"` | The slowest timed speed, before B. With 1/60, braced also stops at 1/60 (section 6) |
| `hasBulb` | boolean | B on the shutter dial |

**Test cameras.** The tests use these limits. They are made up, described only by their limits: `compact` is a 40 mm f/2.8 camera, `fast` a 50 mm f/1.4 one, and `half`, `slow`, `dim` and `box` cover the edges. They live in `testset/engine/cameras.json`. The app never names a camera.

| ID | Apertures | Focal length | Shutter | B |
|---|---|---|---|---|
| `compact` | f/2.8–f/22 | 40 mm | 1/15–1/250 | yes |
| `fast` | f/1.4–f/22 | 50 mm | 1 s–1/1000 | yes |
| `half` | f/1.8–f/22 | 50 mm | 1 s–1/500 | no |
| `slow` | f/3.5–f/16 | 50 mm | 1/30–1/500 | yes |
| `dim` | f/4.5–f/22 | 40 mm | 1/30–1/250 | yes |
| `box` | f/5.6–f/11 | 40 mm | 1/60–1/125 | no |

## 2. Light number

A step doubles or halves the light. The engine works in whole steps and adds two indexes:

| Aperture | 1.4 | 2 | 2.8 | 4 | 5.6 | 8 | 11 | 16 | 22 | 32 |
|---|---|---|---|---|---|---|---|---|---|---|
| A | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 |

| Shutter | B, 2 s | 1 s or B, 1 s | 1/2 | 1/4 | 1/8 | 1/15 | 1/30 | 1/60 | 1/125 | 1/250 | 1/500 | 1/1000 | 1/2000 |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| S | −1 | 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 |

```
L = A + S        // a higher L lets in less light
```

Two pairs with the same `L` give the same light. A camera can use `A` from its widest to its smallest aperture and timed `S` from its slowest to its fastest shutter. The largest value it can reach is `Lmax = A(smallest) + S(fastest)`: 17 on the `compact` test camera (f/22, 1/250).

**Apertures between whole steps.** A widest aperture between whole steps counts as the next whole step down, on the safe side, so the engine never assumes more light than the lens gives. f/1.7 and f/1.8 count as `A = 2`, f/3.5 as `A = 4`, and f/4.5 as `A = 5`. That's between a third and two-thirds of a step less light than the lens gives. When the result uses that index, it names the lens's own mark, for example "f/1.8", because the lens may have no f/2 mark. The sharp zone uses the real f-number.

f/4.5 follows the same rule, rounded down to f/5.6, not to the nearer f/4: counting it as f/4 would assume a third of a step more light than the lens gives. A widest f/5.6 is a whole step and needs no rounding.

## 3. Layer 1: light for the sky and scene (daylight)

Source: Kodak Ultra Max 400 data sheet, publication E-7023, daylight table, rewritten as light numbers. Kodak gives every row at 1/500 for ISO 400 film.

```
L0 = sky + scene + filmStep
```

| `sky` | `sun` | `sun_haze` | `sun_behind_clouds` | `overcast` | `storm` |
|---|---|---|---|---|---|
| Kodak's row | Bright or hazy sun (distinct shadows) | Weak, hazy sun (soft shadows) | Cloudy bright (no shadows) | Heavy overcast | None. ESTIMATE: one step darker than heavy overcast |
| Value | 8 | 7 | 6 | 5 | 4 |
| Starting shutter `skyS` | 1/250 | 1/125 | 1/60 | 1/30 | 1/15 |

| `scene` | `snow_sand` | `open` | `under_trees` |
|---|---|---|---|
| Kodak's row | Bright/hazy sun on light sand or snow | The sky rows | Open shade: "subject shaded from the sun but lighted by a large area of sky", with the correction in section 4 |
| Value | 7 | 6 | 5 |

At ISO 400 this gives Kodak's own light: open terrain in sun is 16 (f/11 at 1/500), and snow or sand in sun is 17 (f/16 at 1/500). Section 13.2 checks every row.

**Estimates.** Kodak's table has no storm row, and covers snow or sand and open shade only in sun. So these are ESTIMATES, and add `light_estimate`:

- `storm`, under any scene.
- `snow_sand` or `under_trees` under any sky but `sun`. They keep their value: snow or sand 1 step less light than open terrain, under trees 1 step more.

**Film speed.** Plain maths: on the ISO scale, each doubling of film speed needs one step less light. The engine counts from ISO 100, where Kodak's ISO 400 values are 2 steps more light, and rounds to the nearest whole step, so no film is more than half a step from exact:

```
filmStep = round(log2(iso / 100))
```

| ISO | 25 | 50 | 64 | 100 | 125 | 160 | 200 | 250 | 320 | 400 | 500 | 800 | 1600 | 3200 |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| `filmStep` | −2 | −1 | −1 | 0 | 0 | 1 | 1 | 1 | 2 | 2 | 2 | 3 | 4 | 5 |

A whole-number ISO is never exactly halfway between two steps. The same `filmStep` applies in daylight, evening, night and indoors.

**The first step shown.** The reasoning starts with a pair for `L0`: `S = skyS` and `A = L0 − S`. If `A` is past the smallest aperture, use the smallest and a faster shutter. If `A` is past the widest, use the widest and a slower shutter. If the shutter would then be past the camera's limits, the step has no matching setting. The starting shutters are the app's own way of showing the light, not a fact about it: one shutter step slower for each step darker sky, so a scene and film keep the same aperture under every sky. Any pair with the same light number gives the same exposure (section 2).

## 4. Layer 2: corrections for the light (daylight)

| Situation | Extra steps `e` | Source |
|---|---|---|
| `scene = under_trees` and `sky = sun` | 2 | Kodak, open shade |
| `sunBehindSubject`, `sky = sun`, and subject is `portrait` or `two_people` | 2 | Kodak: "Use f/5.6 for backlit close-up subjects" |
| Either of the above with `sky = sun_haze` | 1 | ESTIMATE, so a duller sky never gets less light than a sunny one |
| `lowSun` | 1 | ESTIMATE, labelled in the app |

Shade and backlight do not add together: take the larger. Low sun adds to either.

```
L1 = L0 − e
```

For the reasoning shown to the user, a correction first opens the aperture from the previous step. Past the widest aperture, the shutter then gets slower.

## 5. Low light (evening, night)

Source: Wikipedia "Exposure value", Table 2, which warns that these are general guidelines. Where the table gives a range, the engine uses the darkest value. All results are labelled as estimates.

| `lowlight` | Table rows | Range | Value `V` |
|---|---|---|---|
| `sun_low` | Just before sunset; at sunset | 12–14; 12 | 12 |
| `sun_just_set` | Just after sunset | 9–11 | 9 |
| `dusk` | None | None | No value |
| `street_night` | Night street scenes and window displays | 7–8 | 7 |
| `home_lamps` | Home interiors | 5–7 | 5 |
| `floodlit` | Floodlit buildings, monuments and fountains | 3–5 | 3 |

```
L1 = V + filmStep
```

The table's values are for ISO 100, as `filmStep` is (section 3). The first step shows the value as the pair that goal `sharp` would choose.

The table names only the evening. The same values stand for the morning, at the same height of the sun: `sun_low` is also the sun just risen, `sun_just_set` the sky bright before sunrise, `dusk` the first light, and `street_night` and `floodlit` any time it is dark. Source: Wikipedia "Twilight" defines morning and evening twilight by the same angles of the sun below the horizon, and "The lower the Sun is beneath the horizon, the dimmer the sky (other factors such as atmospheric conditions being equal)". An estimate, as all low light is. The engine's names keep the evening's words.

`dusk` has no target. The result is f/2.8, or the widest aperture if the lens can't open that far, at 1/60 by hand, 1/30 braced and 1/15 on a surface, or the camera's slowest speed if it has no 1/15. Never B. Plus `dusk_no_value`. With `support: null`, it uses `hand`. This is the app's own safe choice, the same on every camera, so light with no published value never gets an extreme exposure.

## 5a. Indoors by day

Indoors is a Scene, and the app estimates its light. All results are labelled as estimates.

| `indoor` | Value `V` | Source |
|---|---|---|
| `window` | 7 | ESTIMATE. A well-lit room gets 2–5% of the light outdoors under an overcast sky (daylight factor, BS 8206-2 as credited by [this page](https://greenbuilding.ft.ugm.ac.id/?p=744)). Heavy overcast is 12 (Wikipedia "Exposure value", Table 2). 5% is 4.3 steps less, which gives 7.7, rounded down |
| `room` | 6 | ESTIMATE. The same sum: 2% is 5.6 steps less, which gives 6.4, rounded down |
| `lamps` | 5 | Table 2, "Home interiors", 5–7, darkest value |
| `office` | 7 | Table 2, "Offices and work areas", 7–8, darkest value |

```
L1 = V − dark − lowSun + filmStep
```

`dark` is 1 with `sky = storm`, otherwise 0. `lowSun` is 1 if ticked. Both are ESTIMATES and apply only to `window` and `room`. Sun to overcast give the same light, because open shade in clear sun and heavy overcast are both 12 in Table 2.

The pair is chosen as in section 6.

Curtains, window size and direction can change a room's light by several steps. These values are starting points.

## 6. Layer 3: choosing the pair

**Support limits.** `floorS` is the slowest shutter allowed: `hand` 6 (1/60), `braced` 5 (1/30), `surface` the camera's slowest timed speed. By hand or braced it is never slower than the camera's slowest timed speed, so a dial that stops at 1/60 keeps braced at 1/60 (G66). B is allowed only on `surface`, and only if the camera has it. The by-hand and braced limits assume a lens of 28 to 58 mm.

**Too much light.** If `L1 > Lmax`, the result is the smallest aperture at the fastest shutter, and `least_light_limit` reports the difference in steps. With goal `blur`, also add `blur_limited`.

**Otherwise,** look for a pair with `A + S = L1`, `A` within the camera's apertures and `S` from `floorS` to the fastest shutter:

| Goal | Rule |
|---|---|
| `blur` | `S` = the fastest shutter, `A = L1 − S`. If `A` is smaller than the widest, open one more step (`blurExtra`, 1 extra step). If `A` is past the widest, use the widest and a slower shutter. Add `blur_limited` if the final aperture is f/8 or smaller |
| `sharp` | Among valid pairs, take the one closest to f/8–f/11. On a tie, take the faster shutter. The usual goal for every subject but a portrait |
| `moving` | `S` = the fastest shutter, `A = L1 − S`. If `A` is past the widest, use the widest and a slower shutter. Add `motion_blur_risk` if the final shutter is slower than 1/125 |

**The step before the final settings.** If the final pair differs from the last step shown, the reasoning adds one more step. It reads "Same light, at a shutter your support allows" when the final shutter is the slowest the support allows, or B, because the support decided it. Otherwise it reads "Same light, adjusted for your goal".

**Not enough light.** If no valid pair exists:

- `support = null`: try `hand`, then `braced`, then `surface`, then B. Use the first that reaches `L1` and report it as `final.support`. If none does, use `surface` as below.
- `support = surface`: use B if the camera has it. A surface with B always reaches `L1`.
- `support = hand` or `braced`, or `surface` on a camera without B: use the widest aperture at `floorS`, and add `not_enough_light` with the steps short and the least support that would reach `L1`. If no support would, leave out `suggestSupport`.

**B.** Whole seconds only. Use the widest aperture that gives `S ≤ 0`, so the time is `2^(−S)` seconds. Add `b_counted_seconds`. If the time is over 1 second, add `long_exposure`, because Kodak's Ultra Max sheet needs no adjustment from 1/10,000 s to 1 s and says longer exposures may need compensation.

## 7. Focus and sharp zone

**Usual distance by subject.** Plain maths from the camera's focal length `f`: a 35 mm frame is 24 mm tall, so at distance `d` it takes in a height of about `24 × d / f`. To frame a height `h`:

```
d = f × h / 24        // rounded to 0.1 m, halves up
```

The heights are ESTIMATES, so `final.focus.source` is `default` and the app labels the distance as one:

| Subject | Height `h` | 28 mm | 35 mm | 40 mm | 50 mm | 58 mm |
|---|---|---|---|---|---|---|
| `portrait` | 0.6 m: head and shoulders | 0.7 m | 0.9 m | 1 m | 1.3 m | 1.5 m |
| `two_people` | 0.85 m | 1 m | 1.2 m | 1.4 m | 1.8 m | 2.1 m |
| `group` | 2.4 m: people standing | 2.8 m | 3.5 m | 4 m | 5 m | 5.8 m |
| `far` | 4.8 m: something small in the picture with a lot around it | 5.6 m | 7 m | 8 m | 10 m | 11.6 m |
| `landscape` | See below | | | | | |

`subjectDistanceM` overrides the usual distance, and `source` is `given`.

**Close focus.** Below 1 m, add `close_focus`, because the app doesn't know how close the lens can focus. This applies to a usual distance too, such as a portrait with a 28 mm lens.

**Landscape focus.** Infinity stays sharp. Focus at the first round distance at or beyond the hyperfocal distance `H` for the final aperture: 1, 1.5, 2, 3, 5 or 10 m, or ∞ if `H` is beyond 10 m. Focus rings can be set between their marks, so any lens can reach these. `source` is `landscape`. With a 40 mm lens:

| Final aperture | f/2.8 | f/4 | f/5.6 | f/8 | f/11 | f/16 | f/22 |
|---|---|---|---|---|---|---|---|
| `H` (m) | 18.90 | 13.37 | 9.47 | 6.71 | 4.76 | 3.37 | 2.40 |
| Focus | ∞ | ∞ | 10 m | 10 m | 5 m | 5 m | 3 m |

**Sharp zone.** Plain maths, using the real f-number (1.414, 1.7, 1.8, 2, 2.828, 3.5, 4, 4.5, 5.657, 8, 11.31, 16, 22.63, 32), the camera's focal length `f` and circle of confusion `c = 0.03 mm`:

```
H    = f² / (N · c) + f
near = s · (H − f) / (H + s − 2f)
far  = s < H ? s · (H − f) / (H − s) : ∞
```

When focus is at ∞, `near = H` and `far = ∞`.

Add `focus_critical` if `(far − near) / 2 < 0.10 m`.

## 8. Time of day

Kodak's daylight table is meant "for average frontlit subjects from 2 hours after sunrise to 2 hours before sunset". The engine doesn't check this. A real check needs sunrise and sunset, which need a location the app never collects. The user's own choices stand for it: twilight and night, with what the light looks like, and "Low sun" for long shadows.

## 9. Handling advice

| Shutter | Shake risk | Advice |
|---|---|---|
| 1/250 or faster | None | No advice: the section is hidden, whatever the support |
| 1/125 | Low | Smooth press, elbows tucked |
| 1/60 | Medium | Camera to face, half exhale, hold the button 0.5 s after the click |
| 1/30 | High | As above, plus brace |
| 1/15 or slower | Very high | Camera on a surface, hold the button 1 s after the click |
| B | Very high | Camera on a surface; use a cable release if you have one |

On a surface (`final.support = surface`) at any timed speed from 1/125 down, the advice is the "1/15 or slower" row, because "camera to face" no longer applies. On B, holding the button is the exposure itself, so no extra hold time is given.

With no shake risk, at 1/250 or faster, there is no advice at all: "Smooth press" asked for nothing a photographer wouldn't do anyway, and hiding it makes the advice stand out when it matters. The longest advice is the 1/30 row, 95 characters: "Camera to face, half exhale, hold the button about 0.5 s after the click (estimate), and brace."

The hold times are ESTIMATES. The rest of the advice is the app's own, and the theory article "Holding the camera still" says so: only photography websites and camera manuals describe it, and no camera manual is a source. The by-hand limit rests on Wikipedia's rule of "1 over the focal length": 1/60 is what it gives for the longest lens the app covers, 58 mm.

## 10. Warnings

Warning text lives in `strings.ts`. Warnings never add facts beyond this spec and the knowledge base.

| Code | When | What the user is told |
|---|---|---|
| `least_light_limit` | `L1 > Lmax` | This is the least light the camera can give, and how many extra steps it lets in |
| `not_enough_light` | The chosen support can't reach `L1` | How many steps short, and the settings for the support that would reach it, if any |
| `dusk_no_value` | `dusk` | No reliable value: make test shots or use a light meter |
| `light_estimate` | Storm clouds, snow or sand or under trees outside sun (section 3), a 1-step hazy-sun correction (section 4), `lowSun`, low light, or indoors | This value is an estimate |
| `flare_risk` | `sunAhead` or `sunBehindSubject`, and the sun can be seen: sky `sun`, `sun_haze` or `sun_behind_clouds`, or low light `sun_low` | Keep the sun out of the frame and shade the lens with your hand |
| `blur_limited` | See section 6 | Too bright for much blur: move into shade or use slower film |
| `motion_blur_risk` | See section 6 | Fast movement may blur |
| `focus_critical` | See section 7 | Measure the distance carefully |
| `close_focus` | Focus below 1 m (section 7) | Check that your lens focuses this close |
| `people_hold_still` | Subject is `portrait`, `two_people`, `group` or `far`, at 1/30, or at 1/60 in `street_night` | Everyone must hold still |
| `people_not_recommended` | Subject is `portrait`, `two_people`, `group` or `far`, at 1/15 or slower, or on B | Not recommended for people |
| `b_counted_seconds` | B is used | Hold the button for this many seconds |
| `long_exposure` | B over 1 second | The exposure may need more time than calculated, so make test shots |

## 11. What-if evaluator

`evaluate(conditions, { aperture?, shutter?, bulbSeconds?, focusM?, support? })` returns, for any pair and focus the user names:

- steps of light compared with the recommendation (positive means more light)
- sharp zone
- shake risk
- warnings that apply

Anything not named keeps the recommendation's value. `shutter: "B"` uses `bulbSeconds`, default 1. `focusM: null` means ∞. A setting outside the camera's limits returns `not_on_camera`.

`scanApertures(conditions, shutter)` and `scanShutters(conditions, aperture)` return full tables over the camera's own settings for the answer agent. The shutter table includes B at 1 and 2 seconds if the camera has B.

## 12. Output: `Recommendation`

JSON Schema in `schema/recommendation.schema.json`. A worked example, on the `compact` test camera:

```json
{
  "steps": [
    { "kind": "daylight_value", "aperture": "16", "shutter": "1/60" },
    { "kind": "low_sun", "stops": 1, "aperture": "11", "shutter": "1/60" },
    { "kind": "same_light_for_goal", "aperture": "5.6", "shutter": "1/250" },
    { "kind": "blur_extra", "stops": 1, "aperture": "4", "shutter": "1/250" }
  ],
  "final": {
    "aperture": "4",
    "shutter": "1/250",
    "bulbSeconds": null,
    "support": "hand",
    "focus": { "meters": 1, "source": "default" },
    "sharpZone": { "nearM": 0.93, "farM": 1.08 },
    "shakeRisk": "none"
  },
  "estimate": true,
  "estimates": ["low_sun", "usual_distance"],
  "warnings": [
    { "code": "light_estimate" },
    { "code": "focus_critical" }
  ],
  "facts": [
    { "id": "f1", "text": "Kodak's table for this sky and scene: f/16, 1/60", "kb": [] }
  ]
}
```

The fact's wording names Kodak's table, as the result's first step does.

`facts` are short statements the answer agent may quote, each linked to knowledge-base section IDs. Those IDs arrive with the theory articles, so `kb` may be empty before then.

- **Infinity:** `final.focus.meters` and `sharpZone.farM` are `null` when the value is ∞.
- **B:** `shutter` is `"B"`, and `bulbSeconds` gives the time.
- **Focus source:** `default` (the subject's usual distance, an estimate), `given` (the user's distance) or `landscape`.
- **Warning details:** `stops` on `least_light_limit` and `not_enough_light`, `suggestSupport` on `not_enough_light` when a support would reach the light, `seconds` on `b_counted_seconds`.
- **Step kinds:** `daylight_value`, `published_value`, `indoor_estimate`, `dark_sky`, `dusk_no_value`, `shade`, `backlight`, `low_sun`, `same_light_for_goal`, `same_light_for_support`, `blur_extra`, `least_light_limit`, `not_enough_light`. A step's aperture and shutter are `null` if that pair doesn't exist on the camera, which can happen part-way through the reasoning.

Warnings appear in the order of the table in section 10.

## 12a. Estimate reasons

`estimates` lists why the result is an estimate, so the app can show one "Values are estimated" link with its reasons. It is empty when nothing is estimated. Each reason appears once, in this order:

1. **The light**, from the published value the reasoning starts with (section 3, 5 or 5a):
   - `storm`: storm clouds by day, whatever the scene. Kodak's table has no storm row.
   - `snow_sand_not_sun`: snow or sand under any sky but sun or storm.
   - `shade_not_sun`: under trees under any sky but sun or storm. This covers the 1-step shade correction in hazy sun too.
   - `indoor`: any indoor light.
   - `evening`: any evening or night light but dusk.
   - `dusk`: dusk.
2. **The corrections** that were applied, in the order of the reasoning steps:
   - `hazy_backlight`: the 1-step correction for sun behind the subject in hazy sun (section 4).
   - `storm_outside`: storm clouds outside a window or a room (section 5a).
   - `low_sun`: low sun, by day or indoors (sections 4 and 5a).
3. **The focus:** `usual_distance` when `final.focus.source` is `default` (section 7).

A switch the engine doesn't apply, such as `lowSun` with lamps, gives no reason. `estimate` stays as it is: true exactly when `estimates` holds a reason other than `usual_distance`.

The words for each reason live in `strings.ts`. They say why, in plain words: not in the published table, a range of published values, the app's own rule, or a distance that wasn't measured.

## 13. Tests

### 13.1 Golden tests (exact)

Unless stated: ISO 400 colour negative, the `compact` test camera, `support: null`, no optional conditions.

**On the `compact` test camera:**

| ID | Input | Expected |
|---|---|---|
| G1 | Each scene in sun, `group`, at ISO 32, 64, 100, 125, 160, 200, 250, 320, 400, 500, 800 | First step at 1/250. Snow or sand: f/5.6, 8, 11, 11, 16, 16, 16, 22, 22, 22, then no matching setting. Open: f/4, 5.6, 8, 8, 11, 11, 11, 16, 16, 16, 22. Under trees: f/2.8, 4, 5.6, 5.6, 8, 8, 8, 11, 11, 11, 16 |
| G2 | Open, sun, `group`, ISO 125; ISO 160 | f/8, 1/250; f/11, 1/250 |
| G3 | `filmStep` for ISO 10, 16, 25, 32, 50, 64, 100, 125, 160, 200, 250, 320, 400, 500, 800, 1000, 1600, 3200 | −3, −3, −2, −2, −1, −1, 0, 0, 1, 1, 1, 2, 2, 2, 3, 3, 4, 5 |
| G4 | Slide film; ISO 10 | `unsupported_film`; ISO 10 gets advice: f/5.6, 1/60 |
| G5 | Open, each sky, `group` | First step f/16 with 1/250, 1/125, 1/60, 1/30, 1/15 |
| G6 | Snow or sand, sun, `group` | f/22, 1/250, no `light_estimate` |
| G7 | Under trees, sun, `group` | First step f/11, 1/250. Final f/8, 1/125 |
| G8 | Open, sun, `portrait`, goal `sharp`, `sunBehindSubject` | First step f/16, 1/250. Final f/8, 1/250, `flare_risk` |
| G9 | Open, sun behind clouds, `portrait`, `lowSun` | The JSON in section 12 |
| G10 | Open, storm, `group`, `support: hand` | First step f/16, 1/15. Final f/8, 1/60, `light_estimate` |
| G11 | Open, overcast, `group`, `support: hand` | First step f/16, 1/30. Final f/8, 1/125 |
| G12 | Open, sun, `portrait` | Final f/11, 1/250, 1 extra step, `blur_limited`, sharp zone 0.83–1.26 m |
| G13 | Open, overcast, `landscape` | Final f/8, 1/125, focus 10 m, sharp zone 4.01 m–∞ |
| G14 | Open, sun in haze, `group`, goal `moving` | Final f/11, 1/250 |
| G15 | Snow or sand, sun, `group`, ISO 800 | First step has no matching setting. Final f/22, 1/250, `least_light_limit` of 1 step |
| G16 | Snow or sand, overcast, `group`, `support: hand` | Final f/8, 1/250, `light_estimate` |
| G17 | Under trees, sun, `group`, `lowSun` | Final f/8, 1/60 |
| G18 | `sun_low`, `group` | f/8, 1/250, hand |
| G19 | `sun_just_set`, `group` | f/5.6, 1/60, hand |
| G20 | `street_night`, `group` | f/2.8, 1/60, hand |
| G21 | `home_lamps`, `group` | f/2.8, 1/15, surface |
| G22 | `floodlit`, `group` | f/5.6, B 1 s, surface, `b_counted_seconds` |
| G23 | `dusk`, `group`, with `support` `hand`, `braced`, `surface` | f/2.8 with 1/60, 1/30, 1/15, plus `dusk_no_value` |
| G24 | `home_lamps`, `group`, `support: hand` | f/2.8, 1/60, `not_enough_light` of 2 steps, suggesting surface |
| G25 | `street_night`, `group`, ISO 100; then ISO 200 | f/2.8, 1/15, surface; then f/2.8, 1/30, braced |
| G26 | `floodlit`, `group`, ISO 100 | f/2.8, B 1 s, surface |
| G27 | Sharp zone at 40 mm: f/8 at 3 m; f/2.8 at 1.2 m; f/8 at 5 m; f/4 at 1 m | 2.08–5.40; 1.13–1.28; 2.87–19.53; 0.93–1.08 m |
| G28 | Not used | |
| G29 | `portrait` with distance 0.7 m; with no distance; `other` at 1 m | Focus 0.7 m, `given`, `close_focus`; focus 1 m, `default`, no `close_focus`; focus 1 m, `given`, no `close_focus` |
| G30 | Under trees, sun in haze, `group` | First step f/11, 1/125. Final f/8, 1/125 |
| G31 | Open, sun in haze, `portrait`, goal `sharp`, `sunBehindSubject` | First step f/16, 1/125. Final f/8, 1/250, `flare_risk` |
| G32 | Open, overcast, `landscape`, no distance given, ISO 25, 50, 100, 200, 1600, 3200, 6400, which give each final aperture from f/2.8 to f/22 | Focus ∞, ∞, 10, 10, 5, 5, 3 m. Sharp from 18.90, 13.37, 4.86, 4.01, 2.44, 2.01, 1.33 m, all to ∞ |
| G33 | `home_lamps`, `group`; `floodlit`, `group`; `street_night`, `group`, ISO 200; `home_lamps`, `landscape` | `people_not_recommended`; `people_not_recommended`; `people_hold_still`; neither warning |
| G34 | `floodlit`, `landscape`, `support: surface`; then `support: hand` | f/5.6, B 1 s, surface, `b_counted_seconds`, no `not_enough_light`; then f/2.8, 1/60, `not_enough_light` of 4 steps, suggesting surface |
| G35 | Under trees, sun in haze, `group`; open, sun in haze, `portrait`, goal `sharp`, `sunBehindSubject`; open, sun in haze, `group`, `sunBehindSubject`; under trees, sun, `group` | `light_estimate` and `estimate: true` on the first two; neither on the last two |
| G36 | `sunBehindSubject`, each sky, open, `portrait`, goal `sharp`; `sunAhead`, `sun_low`, `sun_just_set`, `home_lamps`, `group` | `flare_risk` with sun, sun in haze, sun behind clouds, and `sun_low`; not with overcast, storm, `sun_just_set` or `home_lamps` |
| G37 | `street_night`, `group`; `street_night`, `landscape`; `sun_just_set`, `group` | `people_hold_still`; neither people warning; neither people warning |
| G38 | `window`, `room`, `lamps`, `office`, `group` | f/2.8 with 1/60 by hand, 1/30 braced, 1/15 on a surface, 1/60 by hand. All `light_estimate`, `estimate: true` |
| G39 | `window`, `group`: overcast; storm; sun with `lowSun`; storm with `lowSun`. Then `lamps` and `office` with storm and `lowSun` | f/2.8 with 1/60; 1/30; 1/30; 1/15. Then unchanged: 1/15 and 1/60 |
| G40 | `window`, `group`, ISO 100; ISO 1600. `room`, `group`, ISO 200 | f/2.8, 1/15, surface; f/5.6, 1/60, hand. f/2.8, 1/15, surface |
| G41 | `window` with `sunAhead` and `sunBehindSubject` | No `flare_risk` |
| G42 | `window`, `portrait` | f/2.8, 1/60, sharp zone 0.95–1.05 m, `focus_critical`, no `blur_limited` |
| G43 | Open, sun, `group`, ISO 1600; ISO 3200 | f/22, 1/250 with `least_light_limit` of 1 step; of 2 steps |

**Other cameras:**

| ID | Camera | Input | Expected |
|---|---|---|---|
| G44 | `fast` | Snow or sand, sun, `group`, ISO 800 | f/16, 1/1000, no `least_light_limit` |
| G45 | `fast` | Open, sun, `portrait` | f/5.6, 1/1000, 1 extra step, no `blur_limited`, focus 1.3 m, `default` |
| G46 | `fast` | `floodlit`, `group`, `support: surface` | f/5.6, 1 s, no `b_counted_seconds`, `people_not_recommended` |
| G47 | `fast` | `street_night`, `group`, ISO 100, `support: hand` | f/1.4, 1/60, `people_hold_still` |
| G48 | `half` | `street_night`, `group`, ISO 100, `support: hand` | f/1.8, 1/60, `not_enough_light` of 1 step, suggesting braced |
| G49 | `half` | `floodlit`, `group`, ISO 25, `support: surface` | f/1.8, 1 s, `not_enough_light` of 1 step, no `suggestSupport` |
| G50 | `slow` | `window`, `group`, `support: hand`; then `support: surface` | f/3.5, 1/60, `not_enough_light` of 1 step, suggesting braced; then f/3.5, 1/30, surface |
| G51 | `slow` | `home_lamps`, `group`, `support: surface` | f/11, B 1 s, `b_counted_seconds` |
| G52 | `slow` | `dusk`, `group`, with `support` `hand` and `surface` | f/3.5 with 1/60 and 1/30, plus `dusk_no_value` |
| G53 | `fast` | Sharp zone at 50 mm: f/8 at 3 m; f/1.4 at 1 m; f/16 at 5 m | 2.34–4.19; 0.98–1.02; 2.56–100.81 m |
| G54 | `fast` | `landscape`, no distance given, at final apertures f/8, f/11, f/16 | Focus ∞, 10 m, 10 m. Sharp from 10.47, 4.25, 3.44 m, all to ∞ |
| G55 | Any | Focal length 24 mm; 85 mm | `unsupported_lens` |
| G56 | `fast` | What-if f/32 | `not_on_camera` |

**More cases:**

| ID | Camera | Input | Expected |
|---|---|---|---|
| G57 | `compact` with each focal length | Usual distance at 28, 35, 40, 50, 58 mm, for `portrait`, `two_people`, `group`, `far` | The table in section 7 |
| G58 | `compact` at 28 mm; at 35 mm | `portrait`, no distance; `two_people`, no distance | Focus 0.7 m, `default`, `close_focus`; focus 1.2 m, `default`, no `close_focus` |
| G59 | `compact` | `group`: open, storm; snow or sand, sun in haze; snow or sand, overcast; under trees, sun behind clouds; under trees, overcast. Then open with sun, sun in haze, sun behind clouds and overcast | `light_estimate` and `estimate: true` on the first five; neither on the last four |
| G60 | `compact` | `street_night`, `group`, ISO 160; ISO 320 | f/2.8, 1/30, braced; f/2.8, 1/60, hand |
| G61 | `half` with an f/1.7 lens | `street_night`, `group`, ISO 100, `support: hand` | f/1.7, 1/60, `not_enough_light` of 1 step, suggesting braced: the same light as G48, named as marked on the lens |
| G62 | `dim` (f/4.5 lens) | `overcast`, `open`, `portrait` | f/4.5, 1/250: fully open for a blurred background, counted as f/5.6 |
| G63 | `compact` with an f/5.6 lens | `overcast`, `open`, `portrait` | f/5.6, 1/250: fully open for a blurred background |
| G64 | `box` | `sun`, `open`, `landscape` | f/11, 1/125, `least_light_limit` of 2 steps: the least light this camera gives |
| G65 | `box` | `overcast`, `open`, `portrait` | f/5.6, 1/125: the fastest shutter, so a blurred background opens the lens there |
| G66 | `box` | `street_night`, `group`, `support: braced` | f/5.6, 1/60, `not_enough_light` of 2 steps, no `suggestSupport`: braced stops at the dial's slowest, 1/60, and there is no B |
| G67 | `compact` | `sun`, `open`, `landscape`; `sun_behind_clouds`, `open`, `portrait`, `lowSun` | `estimates` empty; `low_sun`, `usual_distance` |
| G68 | `compact` | `portrait`, `sunBehindSubject`, `lowSun`, with `snow_sand` in `sun_haze`; then `storm` with `under_trees` and `snow_sand`, `group` | `snow_sand_not_sun`, `hazy_backlight`, `low_sun`, `usual_distance`; `storm`, `usual_distance` for both |
| G69 | `compact` | `under_trees` in `sun_haze`, `portrait` at 2 m; `under_trees` in `sun`, `group` | `shade_not_sun` only; `usual_distance` only: Kodak covers open shade in sun |
| G70 | `compact` | `window` with storm clouds outside and `lowSun`, `other` at 2 m; `lamps` with `lowSun`, `group`; `street_night`, `landscape`; `dusk`, `portrait` | `indoor`, `storm_outside`, `low_sun`; `indoor`, `usual_distance`; `evening`; `dusk`, `usual_distance` |
| G71 | `compact` | `far`, open, overcast, no distance; `far`, `home_lamps`; `far`, open, sun, `sunBehindSubject` | Focus 8 m, `default`, `usual_distance`, f/8, 1/125: everything sharp, its usual goal; `people_not_recommended`; f/16, 1/250, the same as without the sun behind, as the extra light is for close subjects only, with `flare_risk` |

### 13.2 Kodak cross-check

Ultra Max 400 (publication E-7023). At ISO 400, the light value `L1` must match each row exactly:

| Kodak's condition | Kodak's setting | Light number |
|---|---|---|
| Bright/hazy sun on light sand or snow | 1/500, f/16 | 17 (`snow_sand`) |
| Bright or hazy sun, distinct shadows | 1/500, f/11 | 16 |
| Weak, hazy sun, soft shadows | 1/500, f/8 | 15 |
| Cloudy bright, no shadows | 1/500, f/5.6 | 14 |
| Heavy overcast | 1/500, f/4 | 13 |
| Open shade | 1/500, f/4 | 13 (after the shade correction) |
| Backlit close-up subjects, in bright sun | 1/500, f/5.6 | 14 (after the backlight correction) |

On a test camera with 1/500, Kodak's own setting is one of the valid pairs.

### 13.3 Common-sense checks

Run over all combinations of inputs, on every test camera.

- A portrait never focuses at infinity, or beyond 1.5 m unless the user gave a distance.
- A landscape always keeps infinity sharp, unless the user gave a distance.
- A result for people at 1/30 or slower always carries a warning.
- Every result uses an aperture and shutter within the camera's limits, and B only on a camera that has it.
- By hand, the shutter is never slower than 1/60. If the light falls short, a warning says so.
- The final result never gives less light than the light value for the conditions, unless a warning says so.
- With goal `sharp`, the result uses f/8 or f/11 whenever the light, the camera and the support allow a pair there.
- A faster film never gets more light in the final result.
- A darker sky never gets less light in the final result.
- A camera with a wider widest aperture never falls further short of the light.
- Results are identical across 100 runs with the same input.
- `estimates` holds each reason once, in the order of section 12a. `usual_distance` is there exactly when the focus is the usual distance, and `estimate` is true exactly when another reason is there.
