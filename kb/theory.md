# Theory

Short reads behind the numbers the app gives you, with a source for every claim or a label for the app's own rules and estimates. The app reads this file as it is: see "How this file is read" at the end.

## A step of light {#step}

Topic: The basics
Teaser: Why f/16 to f/11 doubles the light
Picture: [f/|2.8] [f/|4] [f/|5.6] [f/|8] [f/|11] [f/|16] [f/|22]
Caption: Each mark on the aperture ring is one step. It lets in half the light of the mark to its left.
Read next: aperture, shutter-speed, same-light

Every setting on the camera moves in steps. One step doubles or halves the light that reaches the film.

A step works the same everywhere: one mark on the [aperture](#aperture) ring, one mark on the [shutter speed](#shutter-speed) dial, or a doubling of [film speed](#film-speed), such as ISO 200 to ISO 400. Photographers also call a step a stop.

The marks are rounded to be easy to read. f/5.6 is really f/5.66, and f/11 is really f/11.3, so each mark is still one whole step.

That is why the app counts in steps. When the light drops by one step, you give one step back with the aperture or the shutter, and the photo comes out the same. See [same light, different settings](#same-light).

### In practice {#step-in-practice}

| What | Value |
|---|---|
| One step more light, at 1/250 | f/11 to f/8 |
| Or keep f/11 and slow down | 1/250 to 1/125 |
| ISO 200 to ISO 400 | One step less light needed |

Sources:
- [Wikipedia, "F-number"](https://en.wikipedia.org/wiki/F-number): each full stop halves the light, and the marks are rounded (5.657 is written 5.6, 11.31 is written 11).
- [Wikipedia, "Film speed"](https://en.wikipedia.org/wiki/Film_speed): doubling the number means twice the sensitivity, one stop.
- Plain maths: half the time lets in half the light.

## Aperture {#aperture}

Topic: The basics
Teaser: The opening in the lens
Picture: [f/|2.8|Most light] [f/|5.6] [f/|8] [f/|16|Least light]
Caption: Big number, small opening. f/16 lets in an eighth of the light of f/5.6: three steps.
Read next: sharp-zone, shallow-deep, triangle

The opening in the lens that lets the light through. A small f-number is a big opening: more light, and a shallower sharp zone.

The f-number is the lens's focal length divided by the opening's width. With a 40 mm lens, f/2.8 is an opening about 14 mm wide, and f/22 one about 1.8 mm wide. That is why a bigger number means a smaller opening.

Each mark lets in half the light of the one before. The light depends on the opening's area, and the area halves each time the f-number grows by about 1.4: f/2.8, f/4, f/5.6, f/8. See [a step of light](#step).

The aperture also sets the [sharp zone](#sharp-zone). Wide open, a portrait's background goes soft. Closed down, near and far are both sharp.

### In practice {#aperture-in-practice}

| What | Value |
|---|---|
| 40 mm lens at f/2.8 | An opening of about 14 mm |
| 40 mm lens at f/22 | An opening of about 1.8 mm |
| Everything sharp, the app's choice | f/8 or f/11 |

Sources:
- [Wikipedia, "F-number"](https://en.wikipedia.org/wiki/F-number): the f-number is the focal length divided by the opening's diameter, and the stops go up by about the square root of 2.
- [Wikipedia, "Depth of field"](https://en.wikipedia.org/wiki/Depth_of_field): a smaller opening, a larger f-number, gives a deeper sharp zone.
- Plain maths: 40 ÷ 2.8 is 14.3, and 40 ÷ 22 is 1.8.
- The app's own rule: "Everything sharp" takes the pair closest to f/8 or f/11.

## Shutter speed {#shutter-speed}

Topic: The basics
Teaser: How long the film sees light
Picture: [1/|30|Braced] [1/|60|By hand] [1/|125|Movement] [1/|250]
Caption: Each mark is one step: half the time, half the light. The words under the marks are the app's own limits.
Read next: movement, holding, triangle

How long the shutter stays open. 1/250 is a 250th of a second, and each mark on the dial halves or doubles the time, and so the light.

Fast speeds freeze movement. Slow speeds let in more light, but show blur if the camera or the subject moves while the shutter is open.

For a moving subject the app takes the fastest speed the light allows, and warns when that is slower than 1/125. That limit is the app's own rule.

B keeps the shutter open for as long as you hold the button, for long exposures with the camera on a surface.

How slow you can go depends on how you hold the camera: see [holding the camera still](#holding).

### In practice {#shutter-speed-in-practice}

| What | Value |
|---|---|
| Moving subject | 1/125 or faster |
| By hand | 1/60 or faster |
| Braced | 1/30 or faster |
| On a surface | Any speed, and B |

Sources:
- [Wikipedia, "Shutter speed"](https://en.wikipedia.org/wiki/Shutter_speed): fast speeds freeze moving subjects, slow speeds record movement as blur, and B keeps the shutter open while the release is held.
- The app's own rules: the slowest speed for each way of holding the camera, and the warning below 1/125 for a moving subject <!-- docs/ENGINE_SPEC.md, sections 6 and 10 -->.

## Film speed {#film-speed}

Topic: The basics
Teaser: ISO, and why 400 needs less light
Picture: [ISO|100] [ISO|200] [ISO|400] [ISO|800]
Caption: Each doubling is one step: ISO 800 needs an eighth of the light of ISO 100.
Read next: grain, sunny-16, step

How much light the film needs. ISO 400 needs half the light of ISO 200.

Film speed stays the same for the whole roll, so the app asks for it once, when you load the roll. Older cameras and boxes may say ASA: the number is the same as ISO.

Faster film helps in dim light and with moving subjects, but its pictures are [grainier](#grain).

In bright sun, fast film can run out of settings. At ISO 400, snow in sun already needs f/22 at 1/250, so a camera that stops there has no room left, for example for a [wide aperture](#aperture). Slower film leaves room.

Colour negative film forgives far more error than slide film. See [Sunny 16](#sunny-16) for how the app uses that.

### In practice {#film-speed-in-practice}

| What | Value |
|---|---|
| Sun, open terrain, ISO 100 | f/8 at 1/250 |
| The same light, ISO 400 | f/16 at 1/250 |
| Snow or sand in sun, ISO 400 | f/22 at 1/250 |

Sources:
- [Wikipedia, "Film speed"](https://en.wikipedia.org/wiki/Film_speed): doubling the number doubles the sensitivity, ISO and ASA numbers are the same, and fast films give grainier pictures.
- [Wikipedia, "Exposure latitude"](https://en.wikipedia.org/wiki/Exposure_latitude): colour negative film has considerably more latitude than slide film.
- [Kodak, Ultra Max 400 data sheet, E-7023](https://kodakprofessional.com/sites/default/files/wysiwyg/pro/resources/E7023_max_400.pdf): the daylight values in "In practice", through the app.

## Sunny 16 {#sunny-16}

Topic: Reading the light
Teaser: The classic rule for daylight, and why the app gives one step more
Picture: *[Sun|f/16] [Haze|f/11] [Clouds|f/8] [Overcast|f/5.6] [Storm|f/4]
Caption: The app's aperture for each sky at ISO 400 and 1/250, in open terrain. Storm clouds are the app's own estimate.
Read next: same-light, film-speed

A rule of thumb for daylight without a light meter: in bright sun, set f/16 and a shutter speed of 1 over the film speed. At ISO 400 that is f/16 at 1/500, the nearest mark to 1/400.

Each duller sky takes one more [step of light](#step): f/11 in slight overcast, f/8 when overcast, f/5.6 in heavy overcast, and f/4 in open shade or at sunset. Snow and sand take one step less: f/22.

The app starts from Kodak's daylight table for its ISO 400 colour film instead, and the result names it in its first step. For the same sun the table gives f/11 at 1/500: the same light as f/16 at 1/250, one step more than the rule. Kodak's table gives one step more than the rule in every sky.

Why one step more? Negative film copes with too much light far better than with too little. Kodak's sheet for its ISO 200 colour film gives it room for two steps too little light and three steps too much. So with negative film, colour or black and white, the extra step is the safe side, and the app keeps to the film maker's own numbers. Slide film forgives far less, and the app doesn't offer it.

Room for too much light isn't a reason to give it, though. Kodak's sheet for its professional films warns that a lot of extra light lowers the contrast in the bright parts of the picture, so they look flatter, and makes the negatives harder for the lab to print well. If unsure, one step more is plenty; adding several steps "to be safe" costs quality.

Kodak's table is for average subjects lit from the front, from 2 hours after sunrise to 2 hours before sunset. When the sun is lower, or all day far north in winter, turn on Low sun: the app adds one step. That step is the app's own estimate.

Snow or sand, and shade, under trees or anywhere else, come from Kodak's table too: that is the "Where are you?" question. Kodak's open shade is a subject shaded from the sun but lit by a large area of sky, such as a person in a building's shadow on a sunny day. Kodak gives heavy overcast and open shade the same light, so the app gives both f/5.6 at 1/250 at ISO 400.

### In practice {#sunny-16-in-practice}

| What | Value |
|---|---|
| Sun, ISO 400, the classic rule | f/16 at 1/500 |
| Sun, ISO 400, Kodak's table | f/11 at 1/500 |
| Sun, ISO 400, the app | f/16 at 1/250 |
| Overcast, ISO 400, the app | f/5.6 at 1/250 |
| In the shade in sun, ISO 400, the app | f/5.6 at 1/250 |
| Snow or sand in sun, ISO 400, the app | f/22 at 1/250 |

Sources:
- [Wikipedia, "Sunny 16 rule"](https://en.wikipedia.org/wiki/Sunny_16_rule): the rule, and its apertures for snow and sand, slight overcast, overcast, heavy overcast, and open shade or sunset.
- [Kodak, Ultra Max 400 data sheet, E-7023](https://kodakprofessional.com/sites/default/files/wysiwyg/pro/resources/E7023_max_400.pdf): the daylight table the app follows, f/11 at 1/500 in bright sun at ISO 400, its hours, and heavy overcast and open shade on one row.
- [Kodak, Gold 200 data sheet, E-7022](https://kodakprofessional.com/sites/default/files/wysiwyg/pro/resources/E7022%20Gold%20tech%20sheet.pdf): "wide exposure latitude, from two stops underexposure to three stops overexposure"; its own daylight table is one step more than the rule too.
- [Kodak, Pro Films data sheet, E-182, 1997](https://filmcolors.org/wp-content/uploads/2025/12/KODAK-Pro-Films_E-182.pdf): "Excessive overexposure will reduce highlight contrast and increase printing times"; open shade as subjects "shaded from the sun but lighted by a large area of clear sky".
- [Wikipedia, "Exposure latitude"](https://en.wikipedia.org/wiki/Exposure_latitude): reversal (slide) film has very little latitude, colour negative film considerably more.
- The app's own estimates: storm clouds, and the extra step for low sun <!-- docs/ENGINE_SPEC.md, sections 3 and 4 -->.

## Same light, different settings {#same-light}

Topic: Reading the light
Teaser: f/16 at 1/60, or f/8 at 1/250
Picture: [f/16|1/60] [f/11|1/125] [f/8|1/250] [f/5.6|1/500]
Caption: Sun behind clouds, ISO 400. One step wider and one step faster cancel out: all four let in the same light.
Read next: triangle, creative-exposure, step

Many pairs of aperture and shutter speed let in exactly the same light. The app picks the pair for the photo you want.

The light that reaches the film grows with the time the shutter is open, and shrinks with the square of the f-number. Opening one mark doubles it and a shutter one mark faster halves it, so the two cancel out.

The app chooses the pair from your goal. A moving subject takes the fastest [shutter speed](#shutter-speed). A blurred background takes the fastest shutter and a [wide aperture](#aperture), and when the light allows, the app opens one more step for extra blur. Everything sharp takes the pair closest to f/8 or f/11, for a deep [sharp zone](#sharp-zone) at a shutter still fast enough to hold. These are the app's own rules.

How you hold the camera sets the slowest shutter the app will pick: see [holding the camera still](#holding).

### In practice {#same-light-in-practice}

| What | Value |
|---|---|
| Sun behind clouds, ISO 400, up to 1/500, moving subject | f/5.6 at 1/500 |
| The same, blurred background | f/4 at 1/500 |
| The same, everything sharp | f/8 at 1/250 |

Sources:
- [Wikipedia, "F-number"](https://en.wikipedia.org/wiki/F-number): the light through the lens depends on the opening's area, and each stop halves it.
- Plain maths: the light is proportional to the time divided by the square of the f-number.
- The app's own rules: the pair for each goal, and the extra step for a blurred background <!-- docs/ENGINE_SPEC.md, section 6 -->.

## Into the light {#flare}

Topic: Reading the light
Teaser: Flare, haze, and a face with the sun behind it
Picture: [Sun in view|Flare|turn a little] [Sun just out|Haze|shade the lens] [Bright sky|Smoky|darks, in shade]
Caption: Where the bright light is, and what it does to the picture. The sun needn't be in the picture to spoil it.
Read next: sunny-16, shallow-deep

Flare is light scattered inside the lens. Aimed towards the sun, a lens can show a row of bright rings or circles across the picture, or a haze that washes it out, with less contrast and duller colours.

The sun doesn't have to be in the picture. Shining on the lens from just outside it, the sun shows as a haze. Shade the lens: a lens hood does it, or your hand held between the sun and the lens, just outside the picture; the hand is the app's own advice. A hood can't shade a sun that is in the picture, so turn a little instead: the flare fades as the lens points away from the sun.

In the shade, out of the sun, a bright sky in the picture or just beside it can cause slight flare too. Kodak's sheet for its professional films says it shows as smoky dark tones, and that more light helps against it, though the same sheet warns against a lot more. The app doesn't add any for it: keep the bright sky out of the picture where you can, with a darker background such as a hedge or a wall.

With the sun behind the person, the face you photograph is turned away from it, lit only by the sky. Kodak's table gives a close subject lit from behind, such as a face, two steps more light than one lit from the front: f/5.6 instead of f/11, in bright sun at ISO 400 and 1/500. The app adds those two steps when you turn on Sun behind the person, for a portrait or two people, and the result warns of flare. In hazy sun the app adds one step, and with the sun behind clouds none, as there are no shadows; under an even grey sky it doesn't ask where the sun is. These are the app's own rules.

### In practice {#flare-in-practice}

| What | Value |
|---|---|
| Face in sun, ISO 400, sun behind you | f/16 at 1/250 |
| The same, sun behind them | f/8 at 1/250 |
| Kodak's table, backlit face, ISO 400 | f/5.6 at 1/500 |
| The flare warning, with the sun behind them | Sun, sun in haze, sun behind clouds, sun on the horizon |

Sources:
- [Wikipedia, "Lens flare"](https://en.wikipedia.org/wiki/Lens_flare): light scattered in the lens, most often when it is aimed towards the sun; starbursts, rings or circles in a row across the picture; a haze that washes it out, lowering contrast and colour, when a bright light shines on the lens from outside the picture; avoided by shading the lens with a hood, and fading as the camera points away from the light.
- [Wikipedia, "Lens hood"](https://en.wikipedia.org/wiki/Lens_hood): a hood blocks the sun to prevent flare, and is made not to block the lens's view.
- [Kodak, Ultra Max 400 data sheet, E-7023](https://kodakprofessional.com/sites/default/files/wysiwyg/pro/resources/E7023_max_400.pdf): "Use f/5.6 for backlit close-up subjects", against f/11 at 1/500 in bright sun.
- [Kodak, Pro Films data sheet, E-182, 1997](https://filmcolors.org/wp-content/uploads/2025/12/KODAK-Pro-Films_E-182.pdf): in open shade, a bright sky in or just outside the scene can cause slight lens flare, seen as "smoky" black tones in prints, and more exposure usually overcomes it.
- The app's own rules and advice: shading the lens with your hand, one step for the sun behind the person in hazy sun and none behind clouds, and when the result warns of flare <!-- docs/ENGINE_SPEC.md, sections 4 and 10 -->.

## The exposure triangle {#triangle}

Topic: Exposure triangle
Teaser: How aperture, shutter and film speed share the light
Picture: [Aperture|f/8|Sharp zone] [Shutter|1/250|Movement] [Film speed|400|Grain]
Caption: Sun behind clouds on ISO 400 film: f/8 at 1/250. Each setting lets in light, and each changes the picture in its own way.
Read next: same-light, creative-exposure, step

Three settings decide how much light reaches the film: the aperture, the shutter speed and the film speed. Photographers call them the exposure triangle, because when you change one, you change another to keep the same light.

All three move in [steps of light](#step). Open the [aperture](#aperture) one step, from f/8 to f/5.6, and set the [shutter](#shutter-speed) one step faster, from 1/250 to 1/500: the film gets the same light. See [same light, different settings](#same-light).

Each setting also changes how the picture looks. The aperture sets the [sharp zone](#sharp-zone): wide open, the background goes soft. The shutter speed sets [movement](#movement): fast freezes it, slow blurs it. The [film speed](#film-speed) sets the [grain](#grain): the faster the film, the coarser the grain.

On film, the third side is set when you load the roll, and stays until the roll is finished. So on the day you balance two, the aperture and the shutter, and you pick the film for the light you expect. Slower film needs more light: under the same clouds, ISO 100 needs f/4 at 1/250.

The app does the balancing. It starts from the light and the film you loaded, stays within your camera's limits, and picks the pair from what matters most in your photo: see [creatively correct exposure](#creative-exposure).

### In practice {#triangle-in-practice}

| What | Value |
|---|---|
| Sun behind clouds, ISO 400 | f/8 at 1/250 |
| The same, one step wider | f/5.6 at 1/500 |
| The same, on ISO 100 film | f/4 at 1/250 |

Sources:
- [MPB, "The exposure triangle: aperture, ISO and shutter speed", 2021](https://www.mpb.com/en-us/blog/article/12745/): shutter speed, aperture and the film's sensitivity make up the exposure triangle; changing one means changing one or both of the others; the aperture controls the depth of field, and the shutter speed motion blur.
- [Wikipedia, "Exposure (photography)"](https://en.wikipedia.org/wiki/Exposure_%28photography%29): a longer time needs a reciprocally smaller aperture for the same exposure; a wider aperture decreases the depth of field, and a slower shutter makes motion blur more likely.
- [Wikipedia, "Film grain"](https://en.wikipedia.org/wiki/Film_grain): more sensitive film is visibly grainier.
- [Kodak, Ultra Max 400 data sheet, E-7023](https://kodakprofessional.com/sites/default/files/wysiwyg/pro/resources/E7023_max_400.pdf): the daylight values in "In practice", through the app.
- Plain maths: one step wider and one step faster cancel out, and ISO 100 needs two steps more light than ISO 400.

## Creatively correct exposure {#creative-exposure}

Topic: Exposure triangle
Teaser: Many right settings, and the one for your picture
Picture: [f/4|1/500|Freezes most] [f/5.6|1/250] [f/8|1/125] [f/11|1/60|Deepest zone]
Caption: Overcast, ISO 400: four correct pairs, with the same light in each. Which one is right depends on the picture you want.
Read next: triangle, same-light, shallow-deep

In any light, several pairs of aperture and shutter speed give a correct exposure: the photo comes out equally bright. The creatively correct one is the pair that gives the picture you want: movement frozen or blurred, a soft background or everything sharp.

A correct exposure is the one that gives the effect you intended. So before you set the camera, decide what matters most in the photo, set that first, and let the other setting follow.

A running child or a dog: the fastest shutter speed, to freeze them. A face: the widest aperture, for a soft background; see [shallow or deep](#shallow-deep). A landscape or a group: a middle aperture such as f/8 or f/11, for a deep [sharp zone](#sharp-zone). A waterfall: a slow shutter, with the camera resting on something, for soft water; see [freezing or blurring movement](#movement).

That is the app's question "What matters most in this photo?" on the subject step. Moving subject takes the fastest shutter the light allows. Blurred background takes the fastest shutter and a wide aperture, and when the light allows, one step more light for extra blur, fine for negative film. Everything sharp takes the pair closest to f/8 or f/11. These are the app's own rules. The app has no choice for blurring movement on purpose: for that, trade the steps yourself.

### In practice {#creative-exposure-in-practice}

| What | Value |
|---|---|
| Overcast, ISO 400, up to 1/500, moving subject | f/4 at 1/500 |
| The same, blurred background | f/2.8 at 1/500 |
| The same, everything sharp | f/8 at 1/125 |

Sources:
- [Wikipedia, "Exposure (photography)"](https://en.wikipedia.org/wiki/Exposure_%28photography%29): a correct exposure may be defined as one that achieves the effect the photographer intended.
- [Wikipedia, "Shutter speed"](https://en.wikipedia.org/wiki/Shutter_speed): fast speeds freeze movement, and slow ones record it as blur.
- [Wikipedia, "Shallow focus"](https://en.wikipedia.org/wiki/Shallow_focus) and [Wikipedia, "Deep focus"](https://en.wikipedia.org/wiki/Deep_focus): a large aperture for a small depth of field, a small one for a large depth of field.
- [Kodak, Gold 200 data sheet, E-7022](https://kodakprofessional.com/sites/default/files/wysiwyg/pro/resources/E7022%20Gold%20tech%20sheet.pdf): negative film has room for three steps too much light.
- [Kodak, Ultra Max 400 data sheet, E-7023](https://kodakprofessional.com/sites/default/files/wysiwyg/pro/resources/E7023_max_400.pdf): the daylight values in "In practice", through the app.
- The app's own rules: the pair for each goal, and the extra step for a blurred background <!-- docs/ENGINE_SPEC.md, section 6 -->.

## Film grain {#grain}

Topic: Exposure triangle
Teaser: Why faster film looks grainier
Picture: [ISO|100|Finest] [ISO|200] [ISO|400] [ISO|800|Coarsest]
Caption: The faster the film, the bigger its grains, and the less light it needs.
Read next: film-speed, triangle, step

Grain is the fine, sandy texture of a film photo. Faster film has bigger grains, so ISO 800 looks grainier than ISO 100, but needs an eighth of the light.

A film's picture is made of tiny crystals that the light changes. Bigger crystals catch light more easily, which makes the film faster, but they show as grain. Finer grain keeps more detail, but needs more light.

Grain shows more the more a picture is enlarged: a big print or a close crop shows it most.

Digital cameras have no grain. At a high ISO they show noise instead, a speckle that looks different from grain. Many people find a speckle of light and dark, like grain, less objectionable than coloured speckles, and some photo programs add imitation grain to digital pictures for the look of film.

Slow film, ISO 100 or 200, suits bright days and fine detail. Fast film, ISO 400 or 800, suits dull days, indoors and moving subjects, and anyone who likes the grain. In bright sun, fast film can run out of settings: see [film speed](#film-speed).

### In practice {#grain-in-practice}

| What | Value |
|---|---|
| ISO 800 against ISO 100 | Three steps less light |
| Overcast, ISO 100 | f/2.8 at 1/250 |
| Overcast, ISO 800 | f/8 at 1/250 |

Sources:
- [Wikipedia, "Film grain"](https://en.wikipedia.org/wiki/Film_grain): larger crystals make more sensitive film, visibly grainier; fine grain keeps detail but needs more light; grain is most noticeable in an over-enlarged photo; digital photography has no film grain, its high-ISO noise looks somewhat different, and programs can add grain to a digital image.
- [Wikipedia, "Image noise"](https://en.wikipedia.org/wiki/Image_noise): noise rises with the ISO setting; many people find luminance noise less objectionable to the eye, its texture mimicking film grain.
- [Kodak, Ultra Max 400 data sheet, E-7023](https://kodakprofessional.com/sites/default/files/wysiwyg/pro/resources/E7023_max_400.pdf): the daylight values in "In practice", through the app.
- Plain maths: ISO 100 to ISO 800 is three doublings, three steps.

## Neutral density filters {#nd-filter}

Topic: Exposure triangle
Teaser: Grey glass for slow shutters and wide apertures in bright light
Picture: [No filter|1/8000] [ND2|1/4000] [ND4|1/2000] [ND8|1/1000]
Caption: Sun, ISO 400, wide open at f/2.8 for a soft background: the shutter speed needed with each filter.
Read next: movement, shallow-deep, same-light

A neutral density filter, or ND filter, is a grey glass on the front of the lens. It lets in less light without changing the colours, so you can use a slower shutter or a wider aperture than bright light allows.

Two uses. Soft water and other movement on a bright day, with a slow shutter and the camera resting on something: see [freezing or blurring movement](#movement). And a soft background in sun: at ISO 400, f/2.8 in sun needs 1/8000, which few cameras have, and an ND8 brings it down to 1/1000.

Filters are named by how much light they let through. An ND2 lets through half, one [step](#step) less; an ND4 a quarter, two steps; an ND8 an eighth, three steps; an ND1000 ten steps. Some makers write 0.3, 0.6 and 0.9 for ND2, ND4 and ND8.

Most filters screw into the front of the lens: buy the size written there after the ⌀ sign, such as ⌀55 mm. A graduated filter is dark in one half and clear in the other, for a scene that is bright in one part, such as the sky, and darker in another.

A dark filter makes it hard to see through the lens: frame and focus first, then put it on. Cheap filters can tint the colours, and adjustable ones, made of two turning layers, can lower the picture's quality.

The app doesn't count a filter. With one on, take the app's settings and give back the filter's steps yourself: with an ND8, three steps slower, such as 1/250 to 1/30, or three steps wider, such as f/16 to f/5.6. See [same light, different settings](#same-light). This is the app's own advice.

### In practice {#nd-filter-in-practice}

| What | Value |
|---|---|
| ND2 | One step less light |
| ND8 | Three steps less light |
| ND1000 | Ten steps less light |
| Sun, ISO 400, f/2.8 | 1/8000 |
| The same with an ND8 | 1/1000 |

Sources:
- [Wikipedia, "Neutral-density filter"](https://en.wikipedia.org/wiki/Neutral-density_filter): it cuts all colours equally; for blurring moving water, and for a shallow depth of field in bright light; ND2, ND4, ND8 and ND1000 cut 1, 2, 3 and 10 stops, written 0.3, 0.6 and 0.9 by some makers; cheap filters can cast a colour, and variable ones, two polarising filters, lose image quality.
- [Wikipedia, "Photographic filter"](https://en.wikipedia.org/wiki/Photographic_filter): most screw into the front of the lens, whose filter size is marked with ⌀, such as ⌀55 mm; a graduated filter is clear in one half and denser in the other.
- [Wikipedia, "Long-exposure photography"](https://en.wikipedia.org/wiki/Long-exposure_photography): long exposures in brighter light with ND filters; compose and focus without the filter.
- [Kodak, Ultra Max 400 data sheet, E-7023](https://kodakprofessional.com/sites/default/files/wysiwyg/pro/resources/E7023_max_400.pdf): the daylight values in "In practice", through the app.
- Plain maths: f/2.8 is five steps wider than f/16, so 1/250 becomes 1/8000, and an ND8 gives three of them back; 1,000 is about two to the power of ten.
- The app's own advice: giving back a filter's steps yourself.

## Sharp zone {#sharp-zone}

Topic: Depth of field
Teaser: Depth of field: what's sharp in front and behind
Picture: [f/2.8|2.6–3.6|metres] [f/8|2.1–5.4|metres] [f/16|1.6–27|metres]
Caption: A 40 mm lens focused at 3 m. Smaller apertures give a deeper zone.
Read next: shallow-deep, aperture, focusing

Only one distance is perfectly sharp. The sharp zone, which photographers call depth of field, is how far in front of it and behind it still looks sharp.

A smaller aperture gives a deeper zone, a wider one a shallower zone. Distance counts too: the closer you focus, the shallower the zone. A longer lens gives a shallower zone than a shorter one.

The app works the zone out with the standard formula, counting a blur up to 0.03 mm on the film as sharp, the usual limit for 35 mm film. On the result screen the zone is the coloured band on the distance scale.

Focus at the hyperfocal distance, and everything from half that distance to ∞ is sharp. For a landscape the app picks the nearest usual mark on the lens beyond it, such as 3 m at f/22 with a 40 mm lens. See [focusing by distance](#focusing).

In bright sun a background is hard to blur. At ISO 400, f/2.8 in sun would need 1/8000, which few cameras have, so the result suggests moving into shade or using slower film. A [neutral density filter](#nd-filter) is another way.

### In practice {#sharp-zone-in-practice}

| What | Value |
|---|---|
| 40 mm, portrait at 1 m, f/2.8 | 0.95 to 1.05 m |
| 40 mm, group at 4 m, f/8 | 2.51 to 9.85 m |
| 40 mm, landscape at f/22 | Focus 3 m, sharp from 1.33 m to ∞ |
| 40 mm, landscape at f/8 | Focus 10 m, sharp from 4.01 m to ∞ |

Sources:
- [Wikipedia, "Depth of field"](https://en.wikipedia.org/wiki/Depth_of_field): a smaller aperture gives a deeper zone, and a closer subject or a longer lens a shallower one.
- [Wikipedia, "Hyperfocal distance"](https://en.wikipedia.org/wiki/Hyperfocal_distance): its formula, and focused there, everything from half of it to infinity is sharp.
- [Wikipedia, "Circle of confusion"](https://en.wikipedia.org/wiki/Circle_of_confusion): 0.029 to 0.03 mm is the usual limit for 35 mm film.
- Plain maths: the zones and the 1/8000, five steps faster than f/16 at 1/250 <!-- docs/ENGINE_SPEC.md, section 7 -->.

## Shallow or deep {#shallow-deep}

Topic: Depth of field
Teaser: A soft background, or everything sharp
Picture: [Sharp from|1.8|m] *[Focus|3|m] [Sharp to|8.1|m]
Caption: A 40 mm lens at f/11, focused at 3 m. More of the zone lies behind the focus than in front of it.
Read next: sharp-zone, creative-exposure, focusing

A shallow sharp zone makes your subject stand out against a soft background. A deep one keeps everything sharp from near to far. You choose which, mostly with the aperture.

Shallow, for a face, a flower, or one thing among many: open the [aperture](#aperture) wide, such as f/2.8, and get close. A longer lens helps too. With a 40 mm lens at f/2.8 focused at 2 m, only 1.81 to 2.23 m is sharp.

Deep, for landscapes, streets and groups: close the aperture to f/8 or f/11, or further, and step back or use a wider lens. A small aperture needs more light, so in dull light the shutter gets slow: hold still, or rest the camera on something.

The zone always reaches further behind the point you focus on than in front of it. With a 40 mm lens at f/11 focused at 3 m, it runs from 1.84 to 8.06 m: about 1.2 m in front and 5 m behind.

That makes quick pictures easy: set f/11 and 3 m in advance, and anything from about 1.8 to 8 m away is sharp without focusing again. Some lenses mark the zone for each aperture, on a depth-of-field scale.

In bright sun a soft background is hard to get: see [neutral density filters](#nd-filter). The app's Blurred background and Everything sharp goals choose for you: see [creatively correct exposure](#creative-exposure).

### In practice {#shallow-deep-in-practice}

| What | Value |
|---|---|
| 40 mm, f/2.8, focused at 2 m | 1.81 to 2.23 m |
| 40 mm, f/11, focused at 3 m | 1.84 to 8.06 m |
| Everything sharp, the app's choice | f/8 or f/11 |

Sources:
- [Wikipedia, "Shallow focus"](https://en.wikipedia.org/wiki/Shallow_focus): a small depth of field emphasises one part of the image over another, with a larger aperture, a closer viewpoint or a longer lens.
- [Wikipedia, "Deep focus"](https://en.wikipedia.org/wiki/Deep_focus): near, middle and far all sharp, normally with a small aperture, and a wide lens helps; it needs a well-lit scene or a long exposure.
- [Wikipedia, "Depth of field"](https://en.wikipedia.org/wiki/Depth_of_field): the zone behind the subject is always deeper than the zone in front; some lenses have a depth-of-field scale.
- Plain maths: the zones, with the standard formula and a blur of 0.03 mm counted as sharp, as for the sharp zone.
- The app's own rule: "Everything sharp" takes the pair closest to f/8 or f/11.

## Focusing by distance {#focusing}

Topic: Depth of field
Teaser: Setting the distance, and pacing it out
Picture: [|1|Portrait] [|1.4|Two people] [|4|Group] [|∞|Landscape]
Caption: Usual distances in metres with a 40 mm lens, as on the subject step. For a landscape the app picks a mark that keeps ∞ sharp.
Read next: sharp-zone, aperture

Many film cameras are focused by turning the lens to a distance mark. Get the distance roughly right, and the sharp zone does the rest.

Pace it out: one walking step is about 0.75 m, and two steps about 1.5 m.

The usual distances come from how much a lens takes in. A 35 mm frame is 24 mm tall, so at a distance d a lens of focal length f takes in a height of 24 × d ÷ f. Head and shoulders are about 0.6 m tall, which gives about 1 m with a 40 mm lens. The heights are the app's own estimates, so the result calls a usual distance an estimate. Type your own distance to replace it.

The deeper the [sharp zone](#sharp-zone), the less the guess matters. With a 40 mm lens at f/16 focused at 5 m, everything from about 2 m to ∞ is sharp.

For a landscape, the app picks a distance mark that keeps ∞ sharp. Any mark further away keeps it sharp too.

### In practice {#focusing-in-practice}

| What | Value |
|---|---|
| Two walking steps | About 1.5 m |
| 40 mm, portrait | About 1 m |
| 40 mm, group | About 4 m |
| 40 mm, landscape at f/16 | 5 m |

Sources:
- [Wikipedia, "Pace (unit)"](https://en.wikipedia.org/wiki/Pace_%28unit%29): a walking step is about 0.75 m, and a double step about 1.5 m.
- [Wikipedia, "135 film"](https://en.wikipedia.org/wiki/135_film): each frame is 24 × 36 mm.
- Plain maths: the height a lens takes in, 24 × d ÷ f.
- [Wikipedia, "Hyperfocal distance"](https://en.wikipedia.org/wiki/Hyperfocal_distance): the distance that keeps infinity sharp.
- The app's own estimates: the heights of head and shoulders, two people and a group <!-- docs/ENGINE_SPEC.md, section 7 -->.

## Freezing or blurring movement {#movement}

Topic: Movement
Teaser: Fast for sharp, slow for soft water
Picture: [Freeze|1/500|people moving] [Blur|1/15|on a surface] [Soft water|1/2|or slower]
Caption: Fast speeds freeze movement, slow ones blur it. Slower than 1/60, rest the camera on something, or the whole picture blurs.
Read next: holding, nd-filter, same-light

A fast shutter freezes things that move; a slow one lets them blur, and the blur shows the movement. For soft, misty water, use about half a second or longer, with the camera resting on something.

To freeze people walking or running in everyday scenes, use 1/250 or 1/500. From 1/125 down, movement starts to blur: that is why the app warns below 1/125 for a moving subject.

To show movement, go slower: a river, a crowd or a passing car blurs, while everything that stands still stays sharp, as long as the camera doesn't move. Rest it on a wall, a bag or a tripod, set On a surface in Settings, and press gently. See [holding the camera still](#holding).

Running water at about 1/2 s or slower turns white and misty, like fog: waterfalls, streams and waves.

A slow shutter lets in a lot of light, so the rest must let in little: the smallest [aperture](#aperture), slow [film](#film-speed) and a dull day. On an overcast day with ISO 100 film, f/22 gives 1/4. For longer, add a [neutral density filter](#nd-filter): with an ND8, three steps more, 2 s on B.

Or follow the moving thing with the camera at about 1/30: it stays fairly sharp, and the background streaks. This is called panning.

The app has no goal for blurring movement. Take its settings and trade the steps yourself: see [same light, different settings](#same-light). This is the app's own advice.

### In practice {#movement-in-practice}

| What | Value |
|---|---|
| People moving, everyday | 1/250 or 1/500 |
| Soft running water | 1/2 or slower |
| Overcast, ISO 100, f/22 | 1/4 |
| The same with an ND8 | 2 s, on B |

Sources:
- [Wikipedia, "Shutter speed"](https://en.wikipedia.org/wiki/Shutter_speed): 1/500 and 1/250 for people in motion in everyday scenes, and 1/125 and slower no longer freezing movement; 1/15 and 1/8 for deliberate motion blur; about half a second or longer on running water, with a white look like fog; panning blurs the background, at 1/30 and slower; slow speeds need a tripod or other support.
- [Wikipedia, "Long-exposure photography"](https://en.wikipedia.org/wiki/Long-exposure_photography): still things stay sharp while moving water blurs into a mist; long exposures in brighter light with ND filters.
- [Kodak, Ultra Max 400 data sheet, E-7023](https://kodakprofessional.com/sites/default/files/wysiwyg/pro/resources/E7023_max_400.pdf): the daylight values in "In practice", through the app.
- Plain maths: f/22 is four steps smaller than f/5.6, so 1/60 becomes 1/4, and an ND8 makes 1/4 three steps longer, 2 s.
- The app's own rules and advice: the warning below 1/125 for a moving subject, the slowest speed by hand, and trading the steps yourself <!-- docs/ENGINE_SPEC.md, sections 6 and 10 -->.

## Holding the camera still {#holding}

Topic: Movement
Teaser: Slow shutter speeds and shake
Picture: [By hand|1/60] [Braced|1/30] [On a surface|Any]
Caption: The slowest shutter speed the app picks for each way of holding the camera, set in Settings.
Read next: movement, shutter-speed, step

At slow shutter speeds your hands move during the shot and blur the whole picture. A common rule: by hand, no slower than 1 over the focal length.

With a 50 mm lens the rule gives 1/60. The app keeps to 1/60 by hand for every lens from 28 to 58 mm, which is what the rule gives for the longest of them, on the safe side.

Braced against a wall or a post, the app goes one step slower, to 1/30. On a table, a bag or a tripod, it goes as slow as the dial, and uses B for longer. These are the app's own rules. When the light needs a slower speed than your hold allows, the result says so, and names the hold that would reach it.

From 1/125 down, the result adds how to hold the camera: a smooth press, the camera to your face, elbows in, half a breath out, and staying still for a moment after the click. This is the app's own advice, not from a published source.

People move too. At 1/30 the result asks everyone to hold still, and at 1/15 or slower it advises against photographing people.

### In practice {#holding-in-practice}

| What | Value |
|---|---|
| By hand | 1/60 or faster |
| Braced | 1/30 or faster |
| On a surface | Any speed, and B |

Sources:
- [Wikipedia, "Shutter speed"](https://en.wikipedia.org/wiki/Shutter_speed): by hand, the speed numerically closest to the focal length or faster, and a support such as a tripod below that.
- The app's own rules and advice: the slowest speed for each hold, the holding advice and the warnings about people <!-- docs/ENGINE_SPEC.md, sections 6, 9 and 10 -->.

## How lenses differ {#lenses}

Topic: Lenses
Teaser: Focal length, speed and mount
Picture: [28 mm|65°|Wide] [50 mm|40°|Normal] [85 mm|24°|Portrait] [135 mm|15°|Long]
Caption: How much each lens takes in across the frame. The longer the lens, the narrower the view, and the bigger things look.
Read next: lens-types, zoom, choosing-lens

The focal length, the number in millimetres on the lens, sets how much of the scene fits on the film. A short focal length takes in a wide view. A long one takes in a narrow view, and makes far-off things look bigger.

The frame on 35 mm film is 36 mm wide, so a lens takes in a width of 36 × the distance ÷ the focal length. At 10 m, a 50 mm lens takes in about 7 m across, and a 28 mm lens about 13 m. Focal lengths sort lenses into [wide, normal and long](#lens-types). A lens has one focal length, a prime, or a range of them, a [zoom](#zoom).

The widest [aperture](#aperture) a lens opens to, the smallest f-number on its ring, is called its speed. Wide open, an f/1.4 lens lets in two [steps](#step) more light than an f/2.8 one: it helps in dim places, and blurs a background more. Fast lenses cost and weigh more, except normal lenses near 50 mm: they are the fastest kind, and many are inexpensive.

A lens fits only cameras with the same mount, the fitting that holds it on the camera. Different makers' mounts almost never fit each other: see [before buying a lens](#buying-lens).

The app covers lenses from 28 to 58 mm, the focal lengths it offers when you set up a camera; that range is the app's own. After changing lenses, change the focal length on the camera's page: the [sharp zone](#sharp-zone) and the usual [distances](#focusing) depend on it.

### In practice {#lenses-in-practice}

| What | Value |
|---|---|
| 28 mm, across the frame | About 65° |
| 50 mm, across the frame | About 40° |
| 28 mm, a scene 10 m away | About 13 m across |
| 50 mm, a scene 10 m away | About 7 m across |
| f/1.4 against f/2.8, wide open | Two steps more light |

Sources:
- [Wikipedia, "Angle of view (photography)"](https://en.wikipedia.org/wiki/Angle_of_view_%28photography%29): the angle a lens takes in, from the frame's size and the focal length, and the angles for 35 mm film.
- [Wikipedia, "Lens speed"](https://en.wikipedia.org/wiki/Lens_speed): the widest aperture is the lens's speed; fast lenses help in dim light and with background blur, and cost and weigh more; the fastest are normal lenses near 50 mm, several of them inexpensive.
- [Wikipedia, "Lens mount"](https://en.wikipedia.org/wiki/Lens_mount): the mounts of different makers are almost always incompatible.
- Plain maths: the angle across the frame is 2 × arctan(18 ÷ the focal length); the width taken in is 36 × the distance ÷ the focal length; f/1.4 to f/2 to f/2.8 is two steps.
- The app's own rule: it covers lenses from 28 to 58 mm <!-- web/src/lib/cameraAnswers.ts, FOCAL_LENGTHS -->.

## Wide, normal and long {#lens-types}

Topic: Lenses
Teaser: The common kinds, and how their pictures look
Picture: [Wide|24–35|mm] [Normal|40–58|mm] [Portrait|85–135|mm] [Long|135+|mm]
Caption: The usual focal lengths of each kind on 35 mm film. Below 24 mm a lens is ultra wide, and above 300 mm a long lens is a super telephoto.
Read next: lenses, choosing-lens, holding

Lenses come in three basic kinds: normal, wide-angle and long. A normal lens shows a scene much as you see it, a wide one takes in more and stretches depth, and a long one brings far-off things closer and flattens depth.

A normal lens has a focal length close to the frame's diagonal, 43 mm on 35 mm film: anything from about 40 to 58 mm, most often 50 mm. Its pictures look natural. Other focal lengths seem to bend the perspective when you look at the print from the usual distance.

A wide-angle lens is 35 mm or shorter, such as 35, 28 or 24 mm. It takes in landscapes, buildings and rooms where you can't step back. Near things look very big and far ones small and far away, so something close in front stands out. Tilt it up at a building and the walls lean back more than with a normal lens. Its [sharp zone](#sharp-zone) is deeper, and close to a face it makes the nose look too big.

A long lens is longer than the diagonal. From 85 to 135 mm it is called a portrait lens, and from 135 to 300 mm a medium telephoto. It makes far-off things bigger and seems to squeeze the distance between them, and it blurs a background more easily. It magnifies shake too: by hand, the usual rule is a shutter speed of 1 over the focal length or faster, 1/125 with a 135 mm lens. See [holding the camera still](#holding).

How near and far things look comes from where you stand, not from the lens. From the same spot, a longer lens only takes in less, as if you cut out the middle of the picture. A wide lens stretches depth because it lets you go close, and a long one flattens it because you stand back.

Two special kinds: a fisheye takes in 100 to 180° and bends straight lines into curves, and a macro lens focuses close enough to show a small thing life-size on the film.

### In practice {#lens-types-in-practice}

| What | Value |
|---|---|
| Normal lens, 35 mm film | 40 to 58 mm, most often 50 mm |
| Wide-angle lens | 35 mm or shorter |
| Portrait lens | 85 to 135 mm |
| 135 mm, by hand | 1/125 or faster |

Sources:
- [Wikipedia, "Normal lens"](https://en.wikipedia.org/wiki/Normal_lens): a focal length about equal to the frame's diagonal, 43 mm on 35 mm film; 50 mm the most common, and 40 to 58 mm also normal; other focal lengths seem to distort the perspective at a normal viewing distance.
- [Wikipedia, "Wide-angle lens"](https://en.wikipedia.org/wiki/Wide-angle_lens): 35 mm or less, commonly 35, 28 and 24 mm, ultra wide below 24 mm; for architecture, interiors and landscapes; near things very large; buildings falling backward when tilted up; a greater depth of field.
- [Wikipedia, "Long-focus lens"](https://en.wikipedia.org/wiki/Long-focus_lens): longer than the diagonal; magnifies far-off things, seems to compress the distance between them, blurs the background more, and magnifies camera shake.
- [Wikipedia, "Telephoto lens"](https://en.wikipedia.org/wiki/Telephoto_lens): 85 to 135 mm short telephoto or portrait, 135 to 300 mm medium, over 300 mm super telephoto.
- [Wikipedia, "Perspective distortion"](https://en.wikipedia.org/wiki/Perspective_distortion): perspective comes from distance, not from the lens; close up with a wide lens, the nose looks too large.
- [Wikipedia, "Shutter speed"](https://en.wikipedia.org/wiki/Shutter_speed): by hand, the speed numerically closest to the focal length or faster.
- [Wikipedia, "Fisheye lens"](https://en.wikipedia.org/wiki/Fisheye_lens): usually 100 to 180°, and it bends straight lines.
- [Wikipedia, "Macro photography"](https://en.wikipedia.org/wiki/Macro_photography): life-size or larger on the film.
- Plain maths: the dial speed closest to 1/135 is 1/125.

## Zoom lenses {#zoom}

Topic: Lenses
Teaser: One lens, many focal lengths
Picture: [Wide end|28|mm] [|35|mm] [|50|mm] [Long end|70|mm]
Caption: One 28–70 mm zoom stands in for four primes. The ratio of its ends makes it a 2.5× zoom.
Read next: lenses, lens-types, buying-lens

A zoom lens changes its focal length as you turn or slide a ring, so one lens covers wide, normal and longer views. A lens with one focal length is called a prime.

A zoom is named by its range, such as 28–70 mm, and by the ratio of its ends: 70 ÷ 28 makes it a 2.5× zoom. Zooms past 5× are called superzooms.

The convenience costs something. A prime is often sharper, lighter and smaller, and opens wider: more [speed](#lenses) for dim light and a blurred background. Zooms beyond about 3× generally don't match a prime's picture. Early zoom designs were well behind the fixed lenses of their day; later ones are much better.

Some zooms stay in focus as you zoom. Others, called varifocal, move the focus as you zoom: focus again after each change.

The app takes one focal length for each camera, from 28 to 58 mm. With a zoom, enter the focal length you shoot at most, and change it on the camera's page when you use another. This is the app's own advice.

### In practice {#zoom-in-practice}

| What | Value |
|---|---|
| A 28–70 mm zoom | 2.5× |
| A 35–105 mm zoom | 3× |
| Past 5× | A superzoom |

Sources:
- [Wikipedia, "Zoom lens"](https://en.wikipedia.org/wiki/Zoom_lens): zooms are described by the ratio of their longest to shortest focal lengths; superzooms are typically more than 5×; beyond about 3× they generally can't match a prime's quality; early designs were inferior to fixed lenses, modern ones well corrected; parfocal zooms keep focus, varifocal ones need refocusing.
- [Wikipedia, "Prime lens"](https://en.wikipedia.org/wiki/Prime_lens): a fixed focal length, often of better optical quality, with a wider maximum aperture, lighter and smaller than a zoom.
- Plain maths: 70 ÷ 28 is 2.5, and 105 ÷ 35 is 3.
- The app's own advice: one focal length per camera, changed on the camera's page.

## Which lens for which picture {#choosing-lens}

Topic: Lenses
Teaser: Landscapes, streets, faces and things far off
Picture: [Landscape|28|mm] [Street|35|mm] [Faces|85|mm] [Far off|200|mm]
Caption: One example of each. Any wide lens suits a landscape, and any lens from 85 to 135 mm a face.
Read next: lens-types, lenses, sharp-zone

Pick the lens for what you want to show, then stand where the picture looks right. Wide lenses suit big views and tight spaces, normal ones everyday scenes, and long ones faces and things far away.

Landscapes, buildings and rooms: a wide lens, 35 mm or shorter. Put something interesting close in front, and the wide lens makes it big and the distance behind it deep. Keep the camera level, or buildings lean back.

Streets and everyday life: street photographers have long used wider lenses, such as 35 mm. A normal 50 mm lens shows a scene much as you saw it.

Faces: a portrait lens, from 85 to 135 mm. It keeps a face's proportions from a comfortable distance, and blurs the background more easily. Up close with a wide lens, a nose looks too big.

Sport, animals and other things far off: a long lens. It brings them closer, and seems to stack the background up right behind them. Hold it steady, or rest it on something: it magnifies shake.

Small things, such as flowers: a macro lens, which shows them life-size. Cheaper ways in are a close-up lens on the front of yours, or extension tubes between the lens and the camera. Close up, the [sharp zone](#sharp-zone) is very thin.

For a look of its own, a fisheye bends every straight line into a curve.

### In practice {#choosing-lens-in-practice}

| What | Value |
|---|---|
| Landscape, buildings, rooms | 35 mm or shorter |
| Street | 35 mm, classically |
| Faces | 85 to 135 mm |
| Small things, life-size | A macro lens |

Sources:
- [Wikipedia, "Wide-angle lens"](https://en.wikipedia.org/wiki/Wide-angle_lens): for architecture, interiors and landscapes; foreground objects made more prominent; buildings falling backward when tilted up.
- [Wikipedia, "Street photography"](https://en.wikipedia.org/wiki/Street_photography): classically shot with wider angle lenses, such as 35 mm.
- [Wikipedia, "Perspective distortion"](https://en.wikipedia.org/wiki/Perspective_distortion): 85 to 135 mm are good portrait lenses on 35 mm film; close up with a wide lens, the nose looks too large.
- [Wikipedia, "Long-focus lens"](https://en.wikipedia.org/wiki/Long-focus_lens): used for sport; compresses distance and blurs the background more; often used on a tripod, as it magnifies camera shake.
- [Wikipedia, "Macro photography"](https://en.wikipedia.org/wiki/Macro_photography): life-size or larger; close-up lenses and extension tubes; a very small depth of field close up.
- [Wikipedia, "Fisheye lens"](https://en.wikipedia.org/wiki/Fisheye_lens): it bends straight lines.

## Before buying a lens {#buying-lens}

Topic: Lenses
Teaser: What to check on a used lens
Picture: [Mount|Fits|your camera] [Glass|Clear|by torchlight] [Blades|Even|at each mark] [Focus|Smooth|near to far]
Caption: Four checks, in this order, before you pay.
Read next: lenses, zoom, aperture

Most lenses for film cameras are bought used. Four checks, with a small torch, tell a good lens from one that will spoil your pictures.

Does it fit? A lens fits only cameras with the same mount, and different makers' mounts almost never fit each other. Adapters exist, but one without glass in it works only one way round: the other way, the lens can't focus far away.

The glass: shine a torch through it from the front and from the back. Fungus looks like thin, spidery threads. Haze makes the glass look foggy. Separation shows as tiny bubbles inside the lens, and can't be fixed. A little dust and small scratches are normal on an old lens and seldom show in pictures; a lot of dust, or much separation, will. Fungus and haze lower the contrast: whether to buy depends on how much, and on the price.

The aperture: turn its ring through every mark while looking into the lens. The blades should close and open evenly at each click. Oil on the blades slows them down: on a camera that closes them only as it takes the picture, slow blades let in too much light.

The focus: its ring should turn smoothly from near to far, neither stiff nor loose. A dent anywhere suggests the lens was dropped, which can harm it inside: walk away. Then take a few test pictures before relying on it.

### In practice {#buying-lens-in-practice}

| What | Value |
|---|---|
| Dust, small scratches | Seldom show in pictures |
| Much separation | Shows, and can't be fixed |
| A dent | A sign of a drop: walk away |

Sources:
- [Wikipedia, "Lens mount"](https://en.wikipedia.org/wiki/Lens_mount): the mounts of different makers are almost always incompatible; an adapter without glass can't let a lens focus to infinity the other way round.
- [Japan Camera Hunter, "Classic lens buyers guide", 2014](https://www.japancamerahunter.com/2014/03/classic-lens-buyers-guide/): checking the glass with a torch; fungus like spidery fingers, haze foggy, separation as tiny bubbles that can't be remedied, a little harmless and a lot not; light dust is fine, a lot isn't; smooth focus; a dent of any kind a deal breaker; a test picture.
- [Phillip Reeve, "Defects in manual lenses and lens buying advice", 2015](https://phillipreeve.net/blog/?p=805): scratches seldom a problem, dust rarely, fungus lowers the contrast slightly; oily blades close slowly on film cameras that close them for the shot, overexposing; a focus ring that is stiff or has play.

## How this file is read {#format}

Not shown in the app. Each article is a `##` section with a stable ID in braces. The lines under its heading, up to the first blank line, are its topic, teaser, picture, caption and "Read next". In "Picture", each tile is in square brackets: a small top line, the big value, and a small bottom line, split by `|`; a `*` before a tile highlights it. The first paragraph is the lead, the following ones the body. A link to `#id` opens that article. "In practice" is a table of fixed examples, each checked against the engine by `web/src/lib/kb.test.ts`. "Sources" lists where each claim comes from.
