// All user-visible text lives here.
import type {
  AnyScene,
  EstimateReason,
  Camera,
  FastestShutter,
  Focus,
  FilmType,
  Goal,
  LowLight,
  RefusalCode,
  ShakeRisk,
  Shutter,
  Sky,
  SlowestShutter,
  SmallestAperture,
  Step,
  StepKind,
  Subject,
  Support,
  Warning,
  WarningCode,
  WidestAperture,
} from "./engine/types.ts";

/** A field's explanation: short paragraphs, each with an optional bold start. */
export type HelpText = { lead?: string; text: string }[];

const steps = (count: number) => `${count} ${count === 1 ? "step" : "steps"}`;
const seconds = (count: number) => `${count} ${count === 1 ? "second" : "seconds"}`;
const extraSteps = (count: number) => `${count} extra ${count === 1 ? "step" : "steps"}`;
/** "1 camera", "2 cameras". */
const count = (number: number, thing: string) => `${number} ${number === 1 ? thing : `${thing}s`}`;

// One set of words for holding the camera, everywhere, the warnings included.
const supportNames: Record<Support, string> = {
  hand: "By hand",
  braced: "Braced",
  surface: "On a surface",
};

const goalNames: Record<Goal, string> = {
  blur: "Blurred background",
  sharp: "Everything sharp",
  moving: "Moving subject",
};

const warningText: Record<WarningCode, (warning: Warning) => string> = {
  least_light_limit: ({ stops = 0 }) =>
    `This is the least light the camera can give, and it still lets in ${steps(stops)} too much.`,
  not_enough_light: ({ stops = 0, suggestSupport }) =>
    suggestSupport
      ? `Not enough light: ${steps(stops)} short. This support would reach it: ${supportNames[suggestSupport].toLowerCase()}.`
      : `Not enough light: ${steps(stops)} short, and no support on this camera would reach it.`,
  dusk_no_value: () =>
    "There is no reliable value for this light, so make test shots or use a light meter.",
  light_estimate: () => "This value is an estimate.",
  flare_risk: () => "Keep the sun out of the frame and shade the lens with your hand.",
  blur_limited: () => "Too bright for much blur. Move into shade or use slower film.",
  motion_blur_risk: () => "Fast movement may blur.",
  focus_critical: () => "Measure the distance carefully.",
  close_focus: () => "Check that your lens focuses this close.",
  people_hold_still: () => "Everyone must hold still.",
  people_not_recommended: () => "Not recommended for people.",
  b_counted_seconds: ({ seconds: count = 1 }) => `Hold the button for ${seconds(count)}.`,
  long_exposure: () => "The exposure may need more time than calculated, so make test shots.",
};

const estimateLabel: Record<EstimateReason, string> = {
  storm: "storm clouds",
  snow_sand_not_sun: "snow or sand, not full sun",
  shade_not_sun: "shade, not full sun",
  indoor: "indoor light",
  evening: "twilight or night light",
  dusk: "dawn or dusk light",
  hazy_backlight: "hazy sun behind your subject",
  storm_outside: "storm clouds outside",
  low_sun: "low sun",
  usual_distance: "usual distance",
};

const estimateWhy: Record<Exclude<EstimateReason, "usual_distance">, string> = {
  storm: "Storm clouds aren't in the published light table, so the app uses its own value.",
  snow_sand_not_sun: "The published table has snow and sand only in full sun, so the app uses its own value.",
  shade_not_sun: "The published table has shade only in full sun, so the app uses its own value.",
  indoor: "Indoor light isn't in the published daylight table, so the app uses a typical value.",
  evening:
    "Twilight and night light varies and the published values are ranges, so the app uses the darker end. They are given for the evening, and the app uses them in the morning too: the light depends on how low the sun is.",
  dusk: "There is no published value for dawn or dusk, so the app uses its own.",
  hazy_backlight: "The published extra light for sun behind your subject is for full sun only, so the app uses its own value.",
  storm_outside: "The extra step for storm clouds outside is the app's own rule, not a published value.",
  low_sun: "The extra step for low sun is the app's own rule, not a published value.",
};

/** The subjects with a usual distance, as the estimate sentence names them. */
const usualSubject = { portrait: "a portrait", two_people: "a subject close by", group: "a subject a few steps away", far: "something further off" } as const;

const stepLabel: Record<StepKind, string> = {
  // Names the source, as Kodak's table gives one step more light than the Sunny 16 rule.
  daylight_value: "Kodak's table for this sky and scene",
  published_value: "Published value for this light (estimate)",
  indoor_estimate: "Estimated light for this room",
  dark_sky: "Storm clouds outside (estimate)",
  dusk_no_value: "No published value, so the widest aperture at the slowest shutter your support allows",
  shade: "In shade",
  backlight: "Sun behind your subject",
  low_sun: "Low sun (estimate)",
  same_light_for_goal: "Same light, adjusted for your goal",
  same_light_for_support: "Same light, at a shutter your support allows",
  blur_extra: "Blurred background",
  least_light_limit: "The least light your camera can give",
  not_enough_light: "The most light your support allows",
};

// The hold times are estimates. On B, holding the button is the exposure itself (ENGINE_SPEC section 9).
const onSurface = "Camera on a surface, hold the button about 1 s after the click (estimate).";
const onBulb = "Camera on a surface. Use a cable release if you have one.";
// With no shake risk (1/250 or faster), there is no advice and the section is hidden.
const handlingByRisk: Record<Exclude<ShakeRisk, "none">, string> = {
  low: "Smooth press, elbows tucked.",
  medium: "Camera to face, half exhale, hold the button about 0.5 s after the click (estimate).",
  high: "Camera to face, half exhale, hold the button about 0.5 s after the click (estimate), and brace.",
  very_high: onSurface,
};

function handling({ shutter, shakeRisk, support }: { shutter: Shutter; shakeRisk: ShakeRisk; support: Support }): string | null {
  if (shutter === "B") return onBulb;
  if (shakeRisk === "none") return null;
  return support === "surface" ? onSurface : handlingByRisk[shakeRisk];
}

const shutterText = (shutter: string, bulbSeconds?: number | null) =>
  shutter === "B" ? `B for ${bulbSeconds} s` : shutter === "1" ? "1 s" : shutter;

const settings = (aperture: string | null, shutter: string | null, bulbSeconds?: number | null) =>
  aperture && shutter ? `f/${aperture}, ${shutterText(shutter, bulbSeconds)}` : "no matching setting";

function stepLine(step: Step) {
  const addsLight = step.stops !== undefined && step.kind !== "not_enough_light" && step.kind !== "least_light_limit";
  const extra = addsLight ? `, ${extraSteps(step.stops as number)}` : "";
  return `${stepLabel[step.kind]}${extra}: ${settings(step.aperture, step.shutter, step.bulbSeconds)}`;
}

export const strings = {
  appName: "LomoSapiens",
  tagline: "How to set your camera for the shot in front of you.",
  independence: "An independent project, not affiliated with LOMO or Lomography.",

  /** The real app's screens. UK English. */
  app: {
    /** Home's subtitle. */
    tagline: "Set your manual film camera for the best shot",
    heroAlt: "An ape, an early human and a person with a camera, walking in a line",
    /** On a computer, beside the phone frame: the app is made for the phone, and where to open it there. */
    device: {
      title: "Made for your phone",
      line: (address: string) => `Open ${address} on your phone and add it to your home screen. It works offline too.`,
      here: "Here you can try it as it looks there.",
    },
    menu: "Menu",
    back: "Back",
    /** The name an unnamed camera gets: the first, then "Camera 2", "Camera 3". */
    firstCameraName: "My camera",
    cameraName: (number: number) => `Camera ${number}`,
    home: {
      beforeFirstShot: "Before your first shot",
      stepCamera: "Your camera",
      stepCameraText: "Its lens, apertures and shutter speeds. Once per camera.",
      stepFilm: "Your film",
      stepFilmText: "ISO, and colour or black and white. Once per roll.",
      setUp: "Set up camera and film",
      /** The main button, on Home and at the bottom of the result. */
      newShot: "Analyse a new shot",
      /** Home's card: the last frame recorded, on the roll last recorded on. */
      lastFrame: "Last recorded frame",
      /** When that roll is in a camera other than the one in use. */
      lastFrameIn: (camera: string) => `Last recorded frame · ${camera}`,
      /** The card's button, for screen readers: it opens the frame's page. "Last recorded frame: Frame 12 of 36, f/4, 1/250, 1 m". */
      lastFrameSaid: (heading: string, frame: string, settings: string) => `${heading}: ${frame}, ${settings}`,
      /** A roll in the camera in use with nothing recorded on it yet. */
      noFrameYet: "Frames you record appear here.",
      /** Along the top edge of a frame's film strip, as film prints its frame numbers. */
      frameOf: (number: number, frames: number) => `Frame ${number} of ${frames}`,
    },
    /** The menu sheet, on Home and the result. */
    /** The menu: the app's places, the one you're on marked. */
    menuItems: {
      title: "Menu",
      home: "Home",
      cameras: "Cameras",
      inUse: (camera: string) => `In use: ${camera}`,
      rolls: "Rolls",
      theory: "Theory",
      settings: "Settings",
      /** The last place in the menu. */
      about: "About the app",
      closeMenu: "Close menu",
    },
    /** About the app, approved as written. The independence note lives here. */
    about: {
      title: "About LomoSapiens",
      paragraphs: [
        "A manual film camera asks you to choose everything yourself: the aperture, the shutter speed and where to focus. Without a light meter, that means judging how much light there is, and with film you only find out weeks later, when the roll comes back from the lab. For a beginner it's easy to lose a whole roll to frames that are too dark, too light or blurred, and the classic rules and tables take time to learn.",
        "LomoSapiens helps with exactly that moment. Tell it about the light and what you're shooting, and it tells you what to set on your camera, and why. It's completely free, made in the hope that more people will enjoy film photography as an art, and spend their attention on the picture rather than on the sums.",
        "The advice comes from published light tables, such as Kodak's daylight table for its own film, and a few simple, well-known rules of photography, always within the limits of your own camera and lens, which you describe once. An old lens is as welcome as a new one: the app only asks for the numbers marked on it. The tables are made for film, and so is the app: its advice doesn't suit a digital camera. It's approximate on purpose: it never pretends to be more exact than it is, and it says when a value is an estimate. Theory explains the basics behind each number, and Rolls keeps a record of the frames you take, so you can learn from how they turn out. LomoSapiens is a web app: it opens in your browser, can be added to your home screen like any other app, and works without a connection once it has loaded.",
        "Everything you enter stays on your phone: your cameras, rolls, frames, notes and the photos you add. There's no account, no tracking and no advertising, and the app sends nothing you enter anywhere. It never asks where you are, and the photos it keeps are redrawn without the location your phone writes into them. The other side of this: clearing your browser's data deletes your records too. Save a backup from Settings now and then, and keep the file wherever you like.",
        "LomoSapiens isn't professional software. It's an independent project by a film enthusiast, with no company or team behind it, and no support. It isn't affiliated with LOMO or Lomography. Its advice is a starting point and can be wrong, so check what you can and trust your own judgement. The app comes as it is, and its maker doesn't accept complaints about the results.",
        "Enjoy your film, and the wait for every roll. Have a joyful time shooting!",
      ],
    },
    /** The result. */
    result: {
      title: "For this shot",
      estimated: "Values are estimated",
      estimatedSaid: (reasons: string) => `Values are estimated: ${reasons}. Show why`,
      estimateTitle: "Why it's an estimate",
      estimateLight: "Aperture and shutter speed",
      estimateFocus: "Focus distance",
      gotIt: "Got it",
      aperture: "Aperture",
      shutter: "Shutter speed",
      shutterSaid: {
        fraction: (shutter: string) => `${shutter} of a second`,
        seconds: (count: number) => (count === 1 ? "1 second" : `${count} seconds`),
        bulb: (count: number) => (count === 1 ? "B, held for 1 second" : `B, held for ${count} seconds`),
      },
      seconds: "s",
      focusDistance: "Focus distance",
      metres: "m",
      nextMark: "or the next mark beyond it",
      sharpZone: "Sharp zone",
      /** "0.93 – 1.08 m", or "2.01 m – ∞" when the far limit is infinity. */
      sharpRange: (nearM: number, farM: number | null) => (farM === null ? `${nearM} m – ∞` : `${nearM} – ${farM} m`),
      holding: "Holding the camera",
      warning: "Warning",
      yourShot: "Your shot",
      how: "How the app got there",
      cantAdvise: "No settings for this shot",
    },
    /** The pill on Home and the result: a summary of the camera in use, its film and how it's held. */
    pill: {
      colour: (iso: number) => `${iso} colour`,
      blackAndWhite: (iso: number) => `${iso} B&W`,
      noFilm: "No film",
      hold: supportNames,
    },
    /** First setup. */
    setup: {
      stepCamera: "Step 1 of 2 · Camera",
      stepFilm: "Step 2 of 2 · Film",
      cameraTitle: "Your camera",
      cameraLine: "Read these off the camera, once. Not sure is fine too.",
      name: "Name",
      namePlaceholder: "Any name you like",
      lens: "Lens",
      dial: "Shutter speed dial",
      next: "Next: your film",
      filmTitle: "Your film",
      /** How the film step names a camera that has no name yet. */
      thisCamera: "your camera",
      filmLine: (camera: string) => `Which roll is in ${camera}? The speed is on the box and the canister.`,
      filmSpeed: "Film speed (ISO)",
      iso: "ISO",
      /** The speed's row and sheet, as the roll's length. */
      speedHint: "On the box and the canister",
      speedLine: "On the box and the canister. Another speed, such as 125 or 3200, can be typed.",
      otherSpeed: "Other speed",
      otherSpeedPlaceholder: "Such as 125",
      otherSpeedInvalid: "Type a speed above 0, such as 125.",
      colourOrBlackAndWhite: "Colour or black and white",
      colour: "Colour",
      blackAndWhite: "Black and white",
      filmNote: (camera: string) => `This film stays with ${camera} until you load a new roll. Each camera keeps its own film.`,
      /** The roll's length and name. */
      framesOnRoll: "Frames on the roll",
      framesHint: "The number on the box",
      framesLine: "The number on the box. Another number, such as a roll you loaded yourself, can be typed.",
      otherFrames: "Other number",
      otherFramesPlaceholder: "Such as 30",
      otherFramesInvalid: "Type a whole number from 1 to 99.",
      rollName: "Name (optional)",
      rollNamePlaceholder: "Such as what's printed on the box",
      done: "Done",
      /** A second button on the film step, for a camera with no film yet. */
      withoutFilm: "Finish without film",
      close: "Close",
      notSure: "Not sure",
    },
    /** The six camera questions: on the row, then in the sheet that answers it. "Not sure" counts as a value nearly every camera has. */
    questions: {
      widestAperture: {
        label: "Widest aperture",
        hint: "On the lens: 1:2.8 means f/2.8",
        title: "Widest aperture",
        explain: "The smallest f-number on your lens. On the front ring, 1:2.8 means f/2.8.",
        notSure: "Counts as f/4, which almost every lens has",
      },
      smallestAperture: {
        label: "Smallest aperture",
        hint: "The biggest number on the ring",
        title: "Smallest aperture",
        explain: "The biggest number on the aperture ring.",
        notSure: "Counts as f/16, which almost every lens has",
      },
      focalLengthMm: {
        label: "Focal length",
        hint: "On the lens, such as 40 mm",
        title: "Focal length",
        explain: "On the lens, such as 40 mm. Change it after swapping lenses.",
        notSure: "Counts as 50 mm, a common lens",
      },
      fastestShutter: {
        label: "Fastest",
        hint: "The biggest number on the dial",
        title: "Fastest shutter speed",
        explain: "The biggest number on the dial. If yours goes past 1/2000, pick 1/2000.",
        notSure: "Counts as 1/250, which almost every camera has",
      },
      slowestShutter: {
        label: "Slowest, before B",
        hint: "The smallest number before B",
        title: "Slowest, before B",
        explain: "The smallest number on the dial before B.",
        notSure: "Counts as 1/30, which almost every camera has",
      },
      hasBulb: {
        label: "B for long exposures",
        hint: "Holds open while you press",
        title: "B for long exposures",
        explain: "A B on the dial: the shutter stays open while you press.",
        notSure: "",
      },
      yes: "Yes",
      no: "No",
    },
    /** A new shot: the light, then the subject. */
    shot: {
      stepLight: "New shot · Step 1 · Light",
      stepSubject: "New shot · Step 2 · Subject",
      backToHome: "Back to home",
      backToLight: "Back to the light",
      backToSubject: "Back to the subject",
      lightTitle: "What's the light?",
      lightLine: "Pick where you are, then the closest match.",
      groups: {
        day: { title: "Outside, by day", sub: "Daylight in any weather: sun, haze, clouds or overcast" },
        // Morning and evening share one list: the light depends on how low the sun is, not on the hour.
        evening: { title: "Outside, twilight and night", sub: "Around sunrise or sunset, or lit places in the dark" },
        indoors: { title: "Indoors", sub: "Window light, lamps or ceiling lights, day or night" },
      },
      sky: {
        sun: { label: "Sun", sub: "Distinct shadows" },
        sun_haze: { label: "Sun in haze", sub: "Soft shadows" },
        sun_behind_clouds: { label: "Sun behind clouds", sub: "No shadows" },
        overcast: { label: "Overcast", sub: "Heavy cloud, sky evenly grey" },
        storm: { label: "Storm clouds", sub: "Darker than heavy cloud" },
      },
      evening: {
        sun_low: { label: "Sun on the horizon", sub: "Just risen or about to set, long shadows" },
        sun_just_set: { label: "Sun just below the horizon", sub: "Before sunrise or after sunset, sky bright" },
        dusk: { label: "Dawn or dusk", sub: "Sky dark: first light, or light fading" },
        street_night: { label: "Street in the dark", sub: "Lit by street lamps and shop windows" },
        floodlit: { label: "Floodlit building", sub: "Lit by spotlights in the dark" },
      },
      indoors: {
        window: { label: "By a window", sub: "Daylight through the glass, close to the window" },
        room: { label: "Away from a window", sub: "Daylight, middle of the room" },
        lamps: { label: "Lamps only", sub: "Home lamps, no daylight, day or night" },
        office: { label: "Office or shop", sub: "Bright ceiling lights, day or night" },
      },
      thenWhere: "Then: where are you?",
      whereTitle: "Where are you?",
      whereLine: "Snow and sand make the light brighter, trees and shade make it darker.",
      place: {
        snow_sand: { label: "Snow or sand", sub: "Snowy fields, ski slopes, beaches, dunes" },
        open: { label: "Open terrain", sub: "Streets, squares, parks, fields, gardens" },
        under_trees: { label: "Under trees or in the shade", sub: "Forest, building's shadow, porch, pram hood" },
      },
      backToSky: (sky: string) => `Back to the sky: ${sky}`,
      torn: "Torn between two? Pick the darker one.",
      picked: "Picked",
      ifItApplies: "If it applies",
      next: "Next",
      switches: {
        lowSun: {
          label: "Low sun",
          sub: "Winter far north, or long shadows",
          helper:
            "Turn this on when the sun is low in the sky: all day in a northern winter, or early and late in the day, when shadows are long. It counts under clouds too: what matters is how low the sun is, not whether you can see it. If the sun is about to set, choose “Sun about to set” instead.",
        },
        stormOutside: {
          label: "Storm clouds outside",
          sub: "Dark storm sky beyond the window",
          helper: "Turn this on when the sky outside is darker than ordinary heavy cloud, as before a storm.",
        },
        // Kodak's extra light is for any close subject lit from behind, a person or a vase.
        sunBehind: {
          label: "Sun behind your subject",
          sub: "You face the sun; it lights your subject from behind",
          helper: "Turn this on when the sun is behind what you're photographing, so you're facing towards it.",
        },
      },
      fromLastShot: "On from your last shot",
      whatCounts: (label: string) => `What counts as ${label.toLowerCase()}?`,
      helpDone: "Done",
      subjectTitle: "What are you shooting?",
      subjectLine: (mm: number) => `Distances follow your ${mm} mm lens.`,
      youreShooting: "You're shooting",
      // Named by how much fills the picture, which sets the usual distance, so a vase fits as well as a person.
      subjects: {
        portrait: { label: "Portrait", desc: "A person with head and shoulders, or a tight shot of any object" },
        two_people: { label: "Subject close by", desc: "People waist up, a dog, a vase of flowers" },
        group: { label: "Subject a few steps away", desc: "A person head to toe, a group, a whole car, a street door" },
        far: { label: "Something further off", desc: "Small in the picture with a lot around it: a boat at the pier, a building façade" },
        landscape: { label: "Landscape", desc: "Scenery, distant view" },
        other: { label: "Other", desc: "You type the distance" },
      },
      about: (metres: string) => `About ${metres} m`,
      keepsInfinity: "Focus keeps ∞ sharp",
      farInfinity: "Far, ∞ sharp",
      focusDistance: "Focus distance",
      change: "Change",
      setByYou: "Set by you",
      goalQuestion: "What matters most in this photo?",
      goals: {
        blur: { label: "Blurred background", sub: "Sharp person, soft background" },
        sharp: { label: "Everything sharp", sub: "Near and far both in focus" },
        moving: { label: "Moving subject", sub: "Freezes movement: walking people, children, pets" },
      },
      usualForPortrait: "Usual for a portrait",
      usualForSubject: "Usual for this subject",
      distanceTitle: "Distance, in metres",
      distanceLine: "Measure it or pace it out: the focus is set to this distance.",
      metres: "m",
      useUsual: (metres: string) => `Use the usual: about ${metres} m`,
      useUsualInfinity: "Use the usual: focus keeps ∞ sharp",
      distanceDone: "Done",
      showSettings: "Show settings",
      /** A new shot with an empty camera asks for a roll first. */
      rollTitle: "New roll",
      loadRoll: "Load this roll",
    },
    /** Settings: the cameras, how the camera is held, and Theory. */
    /** Cameras: every camera, the one in use inverted, and adding one. */
    cameras: {
      title: "Cameras",
      line: "Tap a camera to change it, or to use it for new shots.",
      inUse: "In use for new shots",
      /** A camera on its card: "40 mm · f/2.8 · 1/15 to 1/250". */
      spec: (focalMm: number, widest: string, slowest: string, fastest: string) => `${focalMm} mm · f/${widest} · ${slowest} to ${fastest}`,
      colour: (iso: number) => `ISO ${iso} colour`,
      blackAndWhite: (iso: number) => `ISO ${iso} black and white`,
      noFilm: "No film loaded",
      addCamera: "Add a camera",
      addCameraLine: "Its lens and shutter, then its film",
    },
    /** Settings: the app's own settings, for now how the camera is held. */
    settings: {
      title: "Settings",
      line: "Changes save as you make them.",
      shooting: "Shooting",
      howYouHold: "How you hold the camera",
      holdTitle: "How do you usually hold it?",
      holdLine: "This sets how slow a shutter speed stays sharp. Change it when you set up differently.",
      holdWays: {
        hand: "Standing, camera in both hands",
        braced: "Leaning on a wall or post, elbows resting",
        surface: "Table, wall top, bag or tripod",
      },
      /** The theme: the phone's own, or Light, Dark or Archive paper picked, by name only. */
      theme: "Theme",
      phoneTheme: "Phone's theme",
      phoneThemeLine: "Light or dark, as the phone is set",
      light: "Light",
      dark: "Dark",
      archive: "Archive paper",
    },
    /** One camera's page in Settings. */
    camera: {
      crumb: "Cameras",
      backToCameras: "Back to Cameras",
      inUse: "In use for new shots",
      notInUse: "Not in use. Switch to it below.",
      filmHeading: "Roll in this camera",
      loadNewRoll: "Load a new roll",
      noFilmLine: "New shots with this camera ask for a roll first.",
      loadRoll: "Load a roll",
      delete: "Delete this camera",
      deleteTitle: (name: string) => `Delete ${name}?`,
      deleteBody: "Its lens and shutter speeds go with it. Its rolls and frames stay in Rolls. This can't be undone.",
      deleteNext: (name: string) => `${name} will be used for new shots.`,
      deleteLast: "It's your only camera, so the app starts again with setting one up.",
      deleteYes: "Delete camera",
      keep: "Keep it",
      note: "Changes save as you make them. After swapping lenses, change Lens here.",
      use: "Use for new shots",
    },
    /** Rolls and their frames. */
    rolls: {
      title: "Rolls",
      line: "Every roll, and the frames you recorded on it.",
      inCameras: "In your cameras",
      finished: "Finished",
      none: "No rolls yet. Load one from a camera's page.",
      loadNew: "Load a new roll",
      loadNewLine: "In one of your cameras",
      whichCamera: "Which camera?",
      whichCameraLine: "The new roll goes in this camera.",
      months: ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"],
      recorded: (count: number, frames: number) => `${count} of ${frames} recorded`,
      ofFrames: (count: number, frames: number) => `${count} of ${frames}`,
      recordedFinished: (count: number) => `${count} recorded`,
      /** The menu's line under Rolls: the roll in the camera in use. */
      inUse: (count: number, frames: number) => `In use: ${count} of ${frames} recorded`,
      loaded: (day: string) => `loaded ${day}`,
      /** The roll page's list. */
      frames: "Recorded frames",
      noFrames: "No recorded frames yet. On the result, tap Record this shot when you take one.",
      noFramesFinished: "No frames were recorded on this roll.",
      /** Adding a frame from the roll's page, on a roll in a camera. */
      addFrame: "Add a frame",
      addFrameLine: "Forgot to record one? Answer the two questions, then record it.",
      details: "Roll details",
      detailsLineIn: (camera: string, recorded: string) => `In ${camera} · ${recorded}`,
      detailsLineFrom: (camera: string, recorded: string) => `From ${camera} · ${recorded}`,
      loadedOn: "Loaded on",
      finishedOn: "Finished on",
      done: "Done",
      finish: "Finish this roll",
      finishLine: "It moves to your finished rolls. The camera is empty until you load another.",
      finishTitle: "Finish this roll?",
      finishBody: (camera: string) => `${camera} will be empty until you load another roll. The roll and its frames stay in Rolls.`,
      finishYes: "Finish roll",
      delete: "Delete this roll",
      deleteLine: "With its frames and their photos",
      deleteTitle: "Delete this roll?",
      deleteBody: (count: number) =>
        count === 0 ? "No frames are recorded on it." : `${count === 1 ? "Its 1 frame goes" : `Its ${count} frames go`} with it, photos included.`,
      deleteEmpties: (camera: string) => `${camera} will be empty until you load another roll.`,
      cantUndo: "This can't be undone.",
      deleteYes: "Delete roll",
      keep: "Keep it",
      newRollLine: (camera: string) => `For ${camera}. Frames you record count from 1.`,
      finishFirstTitle: (camera: string) => `Finish the roll in ${camera}?`,
      finishFirstBody: (roll: string, recorded: string) => `${roll}, ${recorded}. It moves to your finished rolls.`,
      finishFirstYes: "Finish and load a new one",
    },
    /** Recording a shot. */
    record: {
      button: "Record this shot",
      another: "Record another attempt",
      recorded: (number: number) => `Frame ${number} recorded`,
      crumb: "For this shot",
      title: "Record this shot",
      line: "Change anything you set differently from the advice.",
      frame: "Frame",
      frameHint: "As on the camera's counter",
      frameLabel: "Frame number",
      fewer: "One frame back",
      more: "One frame on",
      frameInvalid: "Type a frame number from 1 to 99.",
      frameTaken: (number: number) => `Frame ${number} is already recorded. Both are kept.`,
      aperture: "Aperture",
      shutter: "Shutter speed",
      focus: "Focus distance",
      advised: "Advised",
      advisedValue: (value: string) => `Advised ${value}`,
      asAdvised: "As advised",
      sameLight: "Same light as advised",
      aboutSameLight: "About the same light as advised",
      stepCount: (steps: number) => {
        if (steps === 0.5) return "half a step";
        const whole = Math.floor(steps);
        const shown = steps === whole ? String(whole) : `${whole}½`;
        return steps === 1 ? "1 step" : `${shown} steps`;
      },
      moreLight: (steps: string, about: boolean) => `${about ? "About " : ""}${steps} more light than advised`.replace(/^./, (first) => first.toUpperCase()),
      lessLight: (steps: string, about: boolean) => `${about ? "About " : ""}${steps} less light than advised`.replace(/^./, (first) => first.toUpperCase()),
      apertureLine: "The aperture you set on the lens.",
      shutterLine: "The speed you set on the dial.",
      bulb: (seconds: number) => `B ${seconds} s`,
      seconds: (seconds: number) => `${seconds} s`,
      bulbSeconds: "Seconds you held it open",
      bulbPlaceholder: "Such as 4",
      bulbInvalid: "Type the seconds, such as 4 or 0.5.",
      focusLine: "The distance you set on the lens.",
      otherDistance: "Another distance, in metres",
      distancePlaceholder: "Such as 2.5",
      distanceInvalid: "Type a distance in metres, such as 2.5.",
      infinity: "∞",
      metres: (metres: number) => `${metres} m`,
      done: "Done",
      /** The two notes are named after when they are written. */
      note: "Shot note (optional)",
      notePlaceholder: "Such as Anna by the window",
      save: (number: number | null) => (number === null ? "Save frame" : `Save frame ${number}`),
      discardTitle: "Discard this frame?",
      discardBody: "What you added isn't saved.",
      discard: "Discard",
      keepEditing: "Keep editing",
    },
    /** A roll's frames, and one frame's page. */
    frames: {
      title: (number: number) => `Frame ${number}`,
      /** A frame's settings in the roll's list, for a screen reader. */
      rowSaid: (number: number, settings: string) => `Frame ${number}: ${settings}`,
      youSet: "You set",
      advised: (settings: string) => `Advised ${settings}`,
      yourShot: "Your shot",
      note: "Shot note",
      change: "Change this frame",
      delete: "Delete this frame",
      deleteTitle: (number: number) => `Delete frame ${number}?`,
      deleteBody: "Its settings, note and photo go with it. This can't be undone.",
      deleteYes: "Delete frame",
      keep: "Keep it",
      neighbour: (number: number) => `Frame ${number}`,
      previousSaid: (number: number) => `Previous: frame ${number}`,
      nextSaid: (number: number) => `Next: frame ${number}`,
      saveChanges: "Save changes",
      discardTitle: "Discard your changes?",
      discardBody: "The frame stays as it was.",
      editLine: "Change what was set, the frame number or the note. The advice stays as it was given.",
    },
    /**
     * Marking a frame after developing. The labels describe the
     * picture as the user sees it, printed or scanned. No help sheet: the card explains itself.
     */
    developed: {
      title: "Mark after developing",
      labels: {
        good: "Good",
        bit_dark: "A bit dark",
        too_dark: "Too dark",
        bit_light: "A bit light",
        too_light: "Too light",
        bit_out_of_focus: "A bit out of focus",
        out_of_focus: "Out of focus",
        movement: "Blurred by movement",
        /** A bright patch or streak where the sun shone into the lens. */
        sun_flare: "Sun flare",
        double_exposure: "Double exposure",
        offset_frame: "Offset frame",
        artefacts: "Weird artefacts",
        other: "Other",
      },
      note: "Developing note",
      notePlaceholder: "Such as a light leak at the edge",
    },
    /** The backup file. */
    backup: {
      heading: "Your records",
      save: "Save a backup",
      saveLine: "One file with your cameras, rolls, frames and photos.",
      lastSaved: (day: string) => `Last saved ${day}`,
      saving: "Saving the backup…",
      saved: "Backup saved to Downloads. Keep it somewhere safe, such as Google Drive.",
      saveFailed: "The backup couldn't be saved. Try again.",
      restore: "Restore from a backup",
      restoreLine: "Replaces what's on this phone.",
      restoreTitle: "Restore this backup?",
      restoreBody: (day: string, cameras: number, rolls: number, frames: number) =>
        `From ${day}: ${count(cameras, "camera")}, ${count(rolls, "roll")}, ${count(frames, "frame")}. Everything on this phone now is replaced.`,
      restoreYes: "Restore",
      keep: "Keep it",
      restored: "Backup restored.",
      notBackup: "This file isn't a LomoSapiens backup, so nothing changed.",
      restoreFailed: "The backup couldn't be restored, so nothing changed.",
      offerTitle: "Roll finished",
      offerBody: "Save a backup? Your records live only on this phone, and a backup file keeps a copy.",
      offerYes: "Save a backup",
      offerNo: "Not now",
      offerSavedTitle: "Backup saved",
      done: "Done",
    },
    /** The photo of the scene. */
    photo: {
      add: "Add a photo",
      addLine: "Of the scene, to know the frame later. It stays on this phone.",
      addLater: "Add a photo",
      addLaterLine: "Of the scene, from the camera or your photos. It stays on this phone.",
      retake: "Retake",
      remove: "Remove",
      same: (number: number) => `Same photo as frame ${number}`,
      said: "The scene, as photographed with the phone",
      saidFrame: (number: number) => `Frame ${number}: the scene, as photographed with the phone`,
      failed: "This photo couldn't be kept. Try again, or record the frame without it.",
      failedLater: "This photo couldn't be kept. Try again.",
      keep: "Keep it",
    },
    /** Adding a camera from Settings or the menu: first setup's two steps, with its own words. */
    add: {
      cameraTitle: "Add a camera",
      next: "Next: its film",
      filmTitle: "Its film",
      thisCamera: "the new camera",
      done: "Add camera",
      /** Adding a camera with no film yet. */
      withoutFilm: "Add without film",
    },
    /** Theory: the articles in kb/theory.md, a search, and one article at a time. */
    theory: {
      title: "Theory",
      line: "Short reads behind the numbers the app gives you.",
      search: "Search, such as aperture",
      searchLabel: "Search the articles",
      noMatch: "No article has these words. Try one word, such as light or focus.",
      backTo: (where: string) => `Back to ${where}`,
      inPractice: "In practice",
      readNext: "Read next",
      sources: "Sources",
    },
  },

  engine: {
    /** Where to focus, and how sure the app is of it. */
    focusText: ({ meters, source }: Focus) => {
      const where = meters === null ? "∞" : `${meters} m`;
      if (source === "default") return `${where}, the usual distance for this subject (estimate)`;
      if (source === "landscape" && meters !== null) return `${where} or the next mark beyond it, so ∞ stays sharp`;
      return where;
    },
    /** One line for the user's camera: "f/2.8–f/22, 40 mm, 1/15–1/250, B". */
    cameraSummary: (camera: Camera) =>
      `f/${camera.widestAperture}–f/${camera.smallestAperture}, ${camera.focalLengthMm} mm, ${shutterText(camera.slowestShutter)}–${camera.fastestShutter}${camera.hasBulb ? ", B" : ""}`,
    daylightSays: (aperture: string, shutter: string) => `${stepLabel.daylight_value}: ${settings(aperture, shutter)}`,
    support: supportNames,
    warning: (warning: Warning) => warningText[warning.code](warning),
    /** The not-enough-light warning with the engine's settings for the support that would reach the light. */
    notEnoughLightWith: (stops: number, support: Support, settingsThere: string) =>
      `Not enough light: ${steps(stops)} short. ${supportNames[support]}: ${settingsThere}.`,
    estimate: {
      label: estimateLabel,
      why: estimateWhy,
      usualDistance: (metres: number, subject: keyof typeof usualSubject, lensMm: number) =>
        `${metres} m is the usual distance for ${usualSubject[subject]} with your ${lensMm} mm lens, not measured. Set your own distance to remove this.`,
    },
    refusal: {
      unsupported_film: "Slide film isn't supported in this version.",
      unsupported_camera: "These camera settings aren't ones this version knows.",
      unsupported_lens: "This version covers lenses from 28 to 58 mm.",
      missing_distance: "Enter the distance to the subject.",
      not_on_camera: "The camera doesn't have this setting.",
    } satisfies Record<RefusalCode, string>,
    shutter: shutterText,
    settings,
    stepLine,
    extraSteps,
    handling,
  },
} as const;

/**
 * The test page's words, kept apart from the app's so the published app leaves them out with
 * the page itself, which is for development only.
 */
export const testPageStrings = {
  note: "A plain test page for questioning the advice. Change anything and the result updates at once.",
  ai: {
    heading: "Describe the shot",
    note: "Type the scene in your own words and the AI fills in the controls below. This needs your own AI key. The controls below work without it.",
    description: "Your description",
    placeholder:
      "Winter in Sweden, sun slightly behind clouds, outdoor portrait, blurred background, UltraMax 400",
    baseUrl: "Provider address",
    model: "Model",
    key: "API key",
    keyNote:
      "Your key stays in this browser tab and goes only to the provider you name, along with your description. Closing the tab forgets the key.",
    forgetKey: "Forget key",
    understand: "Understand",
    asking: "Asking the AI…",
    understood: "The controls below now show what the AI understood. You can change any of them.",
    assumedHeading: "What the AI assumed",
    assumedGeneric: "Assumed",
    assumedField: {
      film: "Film",
      "film.iso": "Film speed",
      iso: "Film speed",
      "film.type": "Film type",
      type: "Film type",
      light: "Light",
      "light.kind": "Light",
      "light.lowlight": "Light",
      lowlight: "Light",
      "light.sky": "Sky",
      sky: "Sky",
      "light.scene": "Scene",
      scene: "Scene",
      subject: "Subject",
      subjectDistanceM: "Distance",
      goal: "Goal",
      lowSun: "Low sun",
      sunBehindSubject: "Sun behind the subject",
      sunAhead: "Sun ahead of the camera",
      support: "Camera support",
    } as Record<string, string | undefined>,
    notSaidHeading: "Not in your description",
    notSaid: {
      light: "Light: left as it was",
      sky: "Sky: left as it was",
      scene: "Scene: left as it was",
      subject: "Subject: left as it was",
      iso: "Film speed: left as it was",
      goal: "Goal: the usual one for this subject",
      distance: "Distance: the usual one for this subject",
      support: "Camera support: by hand",
    },
    notice: {
      // The answer when the knowledge base doesn't cover a question.
      out_of_scope: "My knowledge base has no answer to this. I can help with exposure, focus, film and handling the camera.",
      follow_up: "Follow-up questions come in a later version. For now, describe a shot.",
    },
    needs: (names: string[]) => `To ask the AI, this page still needs ${names.join(", ")}.`,
    settingName: { key: "your API key", baseUrl: "the provider address", model: "the model name" },
    failure: {
      settings: "The provider address, the model or the key is missing.",
      key: "The provider did not accept your key.",
      limit: "Your provider's request limit is used up. Wait a minute and try again, or check your plan with the provider.",
      busy: "The provider is overloaded right now. Try again in a few minutes.",
      timeout: "The provider did not answer within 10 seconds. Try again.",
      network: "Could not reach the provider. Check your internet connection and the provider address.",
      reply: "The AI's answer could not be understood. Try again.",
      other: "The provider returned an error. Check your key, the provider address and the model.",
    },
    stillWork: "The controls below still work.",
  },
  shotHeading: "The shot",
  adviceHeading: "The advice",
  cameraHeading: "Your camera",
  cameraNote: "Read these off your camera, once. Not sure uses a value nearly every manual camera has.",
  cameraLabels: {
    widestAperture: "Widest aperture",
    smallestAperture: "Smallest aperture",
    focalLengthMm: "Focal length",
    fastestShutter: "Fastest shutter",
    slowestShutter: "Slowest shutter, before B",
    hasBulb: "B on the shutter dial",
  },
  cameraHints: {
    widestAperture: "On the front of the lens: 1:2 means f/2.",
    focalLengthMm: "On the front of the lens, such as 50 mm.",
  },
  cameraOptions: {
    widestAperture: {
      "1.4": "f/1.4",
      "1.7": "f/1.7",
      "1.8": "f/1.8",
      "2": "f/2",
      "2.8": "f/2.8",
      "3.5": "f/3.5",
      "4": "f/4",
      "4.5": "f/4.5",
      "5.6": "f/5.6",
    } satisfies Record<WidestAperture, string>,
    smallestAperture: { "11": "f/11", "16": "f/16", "22": "f/22", "32": "f/32" } satisfies Record<SmallestAperture, string>,
    focalLengthMm: (mm: number) => `${mm} mm`,
    fastestShutter: {
      "1/125": "1/125",
      "1/250": "1/250",
      "1/500": "1/500",
      "1/1000": "1/1000",
      "1/2000": "1/2000",
    } satisfies Record<FastestShutter, string>,
    slowestShutter: {
      "1": "1 s",
      "1/2": "1/2",
      "1/4": "1/4",
      "1/8": "1/8",
      "1/15": "1/15",
      "1/30": "1/30",
      "1/60": "1/60",
    } satisfies Record<SlowestShutter, string>,
    hasBulb: { yes: "Yes", no: "No" },
    notSure: (counted: string) => `Not sure (counts as ${counted})`,
  },
  labels: {
    lightKind: "Time of day",
    sky: "Sky",
    scene: "Scene",
    lowlight: "What the light looks like",
    subject: "Subject",
    distance: "Distance in metres",
    goal: "Goal",
    iso: "Film speed (ISO)",
    filmType: "Film type",
    support: "Camera support",
    lowSun: "Low sun (winter far north, or long shadows)",
    sunBehindSubject: "Sun behind the subject",
    sunAhead: "Sun ahead of the camera",
  },
  distanceHint: (other: string, rest: string[]) =>
    `Needed when Subject is "${other}". For ${rest.slice(0, -1).join(", ")} or ${rest.at(-1)}, it's optional and replaces the usual focus distance.`,
  fieldsNote: "If you're torn between two scenes, pick the darker one.",
  lightKindOption: (name: string, meaning: string) => `${name} - ${meaning}`,
  // Kodak's own words on when its daylight table applies (Ultra Max 400 data sheet, E-7023; ENGINE_SPEC section 8).
  lightKindHelp: [
    {
      lead: "Why this question?",
      text: "Daylight and twilight come from different published tables. Kodak's daylight table is meant for about 2 hours after sunrise to 2 hours before sunset.",
    },
    {
      lead: "Daytime:",
      text: "the app starts from the daylight table. Sky and Scene together give the light, then the app adds simple corrections such as shade or low sun. Indoors it uses estimated light levels. Indoors after dark, choose Twilight or night.",
    },
    {
      lead: "Twilight or night:",
      text: "the daylight table doesn't cover this light, morning or evening. You pick what the light looks like, and the app uses typical light levels from a published table. These are estimates. Expect a wider aperture, a slower shutter, and more often a steady surface.",
    },
  ] satisfies HelpText,
  explainField: (field: string) => `Explain ${field}`,
  // The shutter is the slowest the support allows on the user's camera, read from the engine.
  supportOption: (name: string, limit: string) => `${name} - ${limit}`,
  supportLimit: {
    hand: (shutter: string) => `${shutter} or faster`,
    braced: (shutter: string) => `Down to ${shutter}`,
    surface: (shutter: string, hasBulb: boolean) => `Down to ${shutter}${hasBulb ? ", or B" : ""}`,
  } satisfies Record<Support, (shutter: string, hasBulb: boolean) => string>,
  subjectOption: (name: string, meaning: string, focus: string) => `${name} - ${meaning} - ${focus}`,
  skyOption: (name: string, looks: string) => `${name} - ${looks}`,
  sceneOption: (name: string, places: string) => `${name} - ${places}`,
  technicalDetails: "Technical details, to paste when you question a result",
  options: {
    lightKind: { daylight: "Daytime", lowlight: "Twilight or night" },
    // Neither depends on seeing the sun: clouds hide it, but don't make it evening.
    lightKindMeaning: { daylight: "Daylight in any weather, or indoors", lowlight: "Daylight fading or not yet full, or dark" },
    sky: {
      sun: "Sun",
      sun_haze: "Sun in haze",
      sun_behind_clouds: "Sun behind clouds",
      overcast: "Overcast",
      storm: "Storm clouds",
    } satisfies Record<Sky, string>,
    // Kodak's descriptions of its daylight rows. Kodak has no storm row: that value is an estimate.
    skyLooks: {
      sun: "Distinct shadows",
      sun_haze: "Soft shadows",
      sun_behind_clouds: "No shadows",
      overcast: "Heavy cloud",
      storm: "Darker than heavy cloud",
    } satisfies Record<Sky, string>,
    scene: {
      snow_sand: "Snow or sand",
      open: "Open terrain",
      under_trees: "Under trees or in the shade",
      indoor_window: "Indoors by a window",
      indoor_room: "Indoors away from a window",
      indoor_lamps: "Indoors with lamps",
      indoor_office: "Office or shop",
    } satisfies Record<AnyScene, string>,
    scenePlaces: {
      snow_sand: "Snowy fields, ski slopes, beaches, dunes",
      open: "Streets, squares, parks, fields, gardens",
      under_trees: "Forest, building's shadow, porch, pram hood",
      indoor_window: "Apartment, cafe, next to the glass",
      indoor_room: "Apartment, middle of a room",
      indoor_lamps: "No daylight, lamps only",
      indoor_office: "School, bright ceiling lights",
    } satisfies Record<AnyScene, string>,
    lowlight: {
      sun_low: "Sun on the horizon, just risen or about to set",
      sun_just_set: "Sun just below the horizon, sky bright",
      dusk: "Dawn or dusk, sky dark",
      street_night: "Street in the dark, lit",
      home_lamps: "Home interior, lamps",
      floodlit: "Floodlit building",
    } satisfies Record<LowLight, string>,
    subject: {
      portrait: "Portrait",
      two_people: "Subject close by",
      group: "Subject a few steps away",
      far: "Something further off",
      landscape: "Landscape",
      other: "Other",
    } satisfies Record<Subject, string>,
    // The framing each usual distance is worked out for (ENGINE_SPEC section 7).
    subjectMeaning: {
      portrait: "A person with head and shoulders, or a tight shot of any object",
      two_people: "People waist up, a dog, a vase of flowers",
      group: "A person head to toe, a group, a whole car, a street door",
      far: "Small in the picture with a lot around it",
      landscape: "Scenery, distant view",
      other: "Anything else",
    } satisfies Record<Subject, string>,
    // The usual distances are estimates worked out from the user's lens, so they say "About".
    subjectFocus: (meters: number) => `About ${meters} m`,
    landscapeFocus: "Focus keeps ∞ sharp",
    otherFocus: "Enter the distance below",
    goal: goalNames,
    goalUsual: (name: string) => `${name} (usual for selected subject)`,
    filmType: {
      color_negative: "Colour",
      bw_negative: "Black and white",
      slide: "Slide",
    } satisfies Record<FilmType, string>,
  },
  result: {
    forCamera: (summary: string) => `For your camera: ${summary}`,
    steps: "How the app got there",
    final: "Final settings",
    estimate: "Estimate",
    aperture: "Aperture",
    shutter: "Shutter",
    focus: "Focus",
    sharpZone: "Sharp zone",
    sharpZoneValue: (nearM: number, farM: number | null) =>
      farM === null ? `${nearM} m to ∞` : `${nearM}–${farM} m`,
    support: "Support",
    handling: "Handling",
    warnings: "Warnings",
    noWarnings: "None.",
  },
} as const;
