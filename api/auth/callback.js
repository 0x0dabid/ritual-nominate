const { getRedis, generateSessionId, setSessionCookie } = require("../_utils");

module.exports = async (req, res) => {
  const { code } = req.query;
  if (!code) {
    return res.status(400).json({ error: "No code provided" });
  }

  try {
    // Exchange code for access token
    const tokenRes = await fetch("https://discord.com/api/oauth2/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: process.env.DISCORD_CLIENT_ID,
        client_secret: process.env.DISCORD_CLIENT_SECRET,
        grant_type: "authorization_code",
        code,
        redirect_uri: process.env.DISCORD_REDIRECT_URI,
      }),
    });

    if (!tokenRes.ok) {
      return res.status(401).json({ error: "Token exchange failed" });
    }

    const tokenData = await tokenRes.json();

    // Get user info from Discord
    const userRes = await fetch("https://discord.com/api/users/@me", {
      headers: { Authorization: `Bearer ${tokenData.access_token}` },
    });

    if (!userRes.ok) {
      return res.status(401).json({ error: "Failed to get user info" });
    }

    const user = await userRes.json();

    // Create session
    const sessionId = generateSessionId();
    const r = getRedis();
    const userData = {
      id: user.id,
      username: user.username,
      discriminator: user.discriminator,
      avatar: user.avatar,
      global_name: user.global_name,
    };

    await r.set(`session:${sessionId}`, userData, { ex: 86400 * 7 });

    // Set cookie and redirect home
    setSessionCookie(res, sessionId);
    res.redirect(302, "/");
  } catch (err) {
    console.error("OAuth callback error:", err);
    res.status(500).json({ error: "Authentication failed" });
  }
};
