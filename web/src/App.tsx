import { lazy, Suspense } from "react";
import LomoApp from "./components/app/LomoApp";
import { PaperLayer } from "./components/app/PaperLayer";
import { showsTestPage } from "./lib/route.ts";
import { strings } from "./lib/strings.ts";

const currentPath = () => (typeof window === "undefined" ? "/" : window.location.pathname);
// The address to open on the phone, as this page was opened; the published one when there is no page.
const currentAddress = () => (typeof window === "undefined" ? "lomosapiens.pages.dev" : window.location.host);

// The test page, for development only, loaded only when opened. In the build the condition
// is false, so neither the page, its AI box nor the AI code behind it is in the published files.
const TestPage = import.meta.env.DEV ? lazy(() => import("./components/TestPage")) : () => null;

/**
 * The real app, or in development the test page at /test. The path can be given, for the tests. The paper layer
 * of the Archive paper look sits after the app, above all of it, sheets included; it shows only when the look is on.
 * On a computer, the app sits in a phone frame with a note beside it (index.css, "device"); on a phone the stage,
 * the frame and the note change nothing, and the note isn't shown.
 */
export default function App({ path = currentPath(), address = currentAddress() }: { path?: string; address?: string }) {
  if (showsTestPage(path)) {
    return (
      <Suspense fallback={null}>
        <TestPage />
      </Suspense>
    );
  }
  const text = strings.app.device;
  return (
    <div className="device-stage">
      <div className="device">
        <LomoApp />
        <PaperLayer />
      </div>
      <aside className="device-hint text-ink">
        <h2 className="m-0 font-display text-[28px] leading-[1.1] font-semibold tracking-[-0.02em]">{text.title}</h2>
        <p className="m-0 text-base leading-[1.5]">{text.line(address)}</p>
        <p className="m-0 text-[15px] leading-[1.5] text-muted">{text.here}</p>
      </aside>
    </div>
  );
}
