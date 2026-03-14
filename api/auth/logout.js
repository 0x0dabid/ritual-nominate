const { getRedis, parseCookies } = require("../_utils");

module.exports = async (req, res) => {
  const cookies = parseCookies(req.headers.cookie);
  const sessionId = cookies.session;
  if (sessionId) {
    const r = getRedis();
    await r.del(`session:${sessionId}`);
  }
  res.setHeader(
    "Set-Cookie",
    "session=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0"
  );
  res.redirect(302, "/");
};
