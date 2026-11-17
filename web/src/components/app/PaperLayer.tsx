// The Archive paper look's paper layer:
// crumples, film grain, a warm light leak and darker edges, over every screen and sheet. Hidden unless the look is
// on, and for people who ask the phone for less transparency or more contrast (index.css). It never catches taps,
// and screen readers skip it. The textures ship with the app, in public/textures, and are saved for offline use.
export function PaperLayer() {
  return (
    <div className="paper-fx" aria-hidden="true">
      <span className="paper-fx__crumple" style={{ backgroundImage: "url(./textures/paper-crumple.jpg)" }} />
      <span className="paper-fx__grain" style={{ backgroundImage: "url(./textures/paper-grain.png)" }} />
      <span className="paper-fx__leak" />
      <span className="paper-fx__vignette" />
    </div>
  );
}
