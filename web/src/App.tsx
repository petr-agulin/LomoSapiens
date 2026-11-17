import { lazy, Suspense } from "react";
import LomoApp from "./components/app/LomoApp";
import { PaperLayer } from "./components/app/PaperLayer";
import { showsTestPage } from "./lib/route.ts";

const currentPath = () => (typeof window === "undefined" ? "/" : window.location.pathname);

// The test page, for development only, loaded only when opened. In the build the condition
// is false, so neither the page, its AI box nor the AI code behind it is in the published files.
const TestPage = import.meta.env.DEV ? lazy(() => import("./components/TestPage")) : () => null;

/**
 * The real app, or in development the test page at /test. The path can be given, for the tests. The paper layer
 * of the Archive paper look sits after the app, above all of it, sheets included; it shows only when the look is on.
 */
export default function App({ path = currentPath() }: { path?: string }) {
  if (showsTestPage(path)) {
    return (
      <Suspense fallback={null}>
        <TestPage />
      </Suspense>
    );
  }
  return (
    <>
      <LomoApp />
      <PaperLayer />
    </>
  );
}
