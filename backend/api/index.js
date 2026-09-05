// Loading src/app requires the db module (better-sqlite3, a native addon,
// plus filesystem access for the sqlite file). If that throws at module
// load — e.g. a native binary that doesn't match the Lambda runtime, or a
// read-only path — Vercel reports an opaque FUNCTION_INVOCATION_FAILED with
// no body. Catch it here and return the real error instead, for every
// route, so a broken deploy is diagnosable from the HTTP response alone.
module.exports = (req, res) => {
  let app;
  try {
    app = require('../src/app');
  } catch (err) {
    console.error('Failed to load backend app', err);
    res.statusCode = 500;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({ error: 'راه‌اندازی سرور با خطا مواجه شد', message: err.message }));
    return;
  }
  return app(req, res);
};
