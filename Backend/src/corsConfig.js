// src/corsConfig.js
// One place that decides which browser origins may call this API.
//
// Allowed origins come from FRONTEND_URLS (comma-separated) and FRONTEND_URL.
// For every listed origin we ALSO allow its www / non-www twin, because
// careal.org and www.careal.org are the same site to users but different
// origins to the browser. (This is what silently broke calls when only one
// of them was listed.)
//
// A request from an origin that is not allowed simply gets no CORS headers
// (the browser blocks it) and a one-line warning is logged naming the origin,
// instead of the old behaviour of throwing, which produced an HTML 500 page.

function twins(origin) {
  try {
    const u = new URL(origin);
    const out = [u.origin];
    const host = u.hostname;
    const port = u.port ? `:${u.port}` : '';
    if (host.startsWith('www.')) {
      out.push(`${u.protocol}//${host.slice(4)}${port}`);
    } else if (host.split('.').length === 2) {
      out.push(`${u.protocol}//www.${host}${port}`);
    }
    return out;
  } catch {
    return [];
  }
}

export function buildAllowedOrigins(env = process.env) {
  const listed = [
    ...(env.FRONTEND_URLS ? env.FRONTEND_URLS.split(',') : []),
    ...(env.FRONTEND_URL ? [env.FRONTEND_URL] : []),
  ]
    .map((s) => s.trim())
    .filter(Boolean);

  const dev = env.NODE_ENV === 'production' ? [] : ['http://localhost:5173', 'http://localhost:3000'];
  return new Set([...listed, ...dev].flatMap(twins));
}

const warned = new Set();

export function corsOptionsDelegate(env = process.env) {
  const allowed = buildAllowedOrigins(env);
  return (req, callback) => {
    const origin = req.headers.origin;
    let ok = !origin; // curl, Postman, server-to-server (webhooks) send no Origin
    if (origin) {
      ok = allowed.has(origin);
      if (!ok) {
        // Same-origin requests (single-host deployment) are always fine.
        try { ok = new URL(origin).host === req.headers.host; } catch { ok = false; }
      }
      if (!ok && !warned.has(origin)) {
        warned.add(origin);
        console.warn(`[cors] blocked origin ${origin}. If this is your frontend, add it to FRONTEND_URLS.`);
      }
    }
    callback(null, { origin: ok, credentials: true });
  };
}
