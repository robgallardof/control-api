/**
 * Home page for deployment smoke checks.
 * @returns A minimal status page.
 */
export default function Home() {
  return (
    <main style={{ fontFamily: "system-ui", padding: 32, lineHeight: 1.5 }}>
      <h1>control-app</h1>
      <p>API is running.</p>
      <pre>POST /api/script/check</pre>
      <pre>POST /api/script/event</pre>
      <pre>POST /api/license/validate</pre>
      <pre>POST /api/licenses/validate</pre>
    </main>
  );
}
