// The test page lives at its own address, /test, with no link from the real screens.
// Everything else is the real app.
export const isTestPage = (path: string) => /\/test\/?$/.test(path);

/**
 * The test page is for development only: `npm run dev` shows it at /test, and the published
 * app opens there as anywhere else. The build reads `import.meta.env.DEV` as false, and leaves the page out.
 */
export const showsTestPage = (path: string, development: boolean = import.meta.env.DEV) => development && isTestPage(path);
