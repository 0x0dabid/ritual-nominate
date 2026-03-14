const { Redis } = require("@upstash/redis");
const crypto = require("crypto");

let redis;
function getRedis() {
  if (!redis) {
    redis = new Redis({
      url: process.env.UPSTASH_REDIS_REST_URL,
      token: process.env.UPSTASH_REDIS_REST_TOKEN,
    });
  }
  return redis;
}

function parseCookies(cookieHeader) {
  const cookies = {};
  if (!cookieHeader) return cookies;
  cookieHeader.split(";").forEach((cookie) => {
    const [name, ...rest] = cookie.trim().split("=");
    cookies[name] = decodeURIComponent(rest.join("="));
  });
  return cookies;
}

async function getUser(req) {
  const cookies = parseCookies(req.headers.cookie);
  const sessionId = cookies.session;
  if (!sessionId) return null;
  const r = getRedis();
  const user = await r.get(`session:${sessionId}`);
  return user || null;
}

function generateSessionId() {
  return crypto.randomBytes(32).toString("hex");
}

function setSessionCookie(res, sessionId) {
  const maxAge = 86400 * 7;
  const secure = process.env.NODE_ENV === "production" ? "; Secure" : "";
  res.setHeader(
    "Set-Cookie",
    `session=${sessionId}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${maxAge}${secure}`
  );
}

module.exports = { getRedis, getUser, generateSessionId, parseCookies, setSessionCookie };
