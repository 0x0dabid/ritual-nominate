const { getRedis, getUser } = require("./_utils");
const crypto = require("crypto");

const VALID_ROLES = ["Radiant Ritualist", "Ritualist", "ritty", "bitty"];

// Discord role IDs that are allowed to nominate (comma-separated env var)
function getNominatorRoleIds() {
  const ids = process.env.NOMINATOR_ROLE_IDS || "";
  return ids.split(",").map((s) => s.trim()).filter(Boolean);
}

module.exports = async (req, res) => {
  const r = getRedis();

  // GET — list all nominations
  if (req.method === "GET") {
    const ids = (await r.lrange("nominations", 0, -1)) || [];
    const results = [];

    for (const id of ids) {
      const nom = await r.get(`nomination:${id}`);
      if (nom) {
        const data = typeof nom === "string" ? JSON.parse(nom) : nom;
        const voteCount = await r.scard(`votes:${id}`);
        results.push({ ...data, id, votes: voteCount || 0 });
      }
    }

    return res.json({ nominations: results });
  }

  // POST — submit a new nomination
  if (req.method === "POST") {
    const user = await getUser(req);
    if (!user) {
      return res.status(401).json({ error: "Sign in with Discord to nominate" });
    }

    const userData = typeof user === "string" ? JSON.parse(user) : user;

    // Check if user has an eligible Discord role
    const allowedRoleIds = getNominatorRoleIds();
    if (allowedRoleIds.length > 0) {
      const userRoles = userData.roles || [];
      const hasEligibleRole = userRoles.some((r) => allowedRoleIds.includes(r));
      if (!hasEligibleRole) {
        return res.status(403).json({
          error: "You need one of the eligible roles (Ascendant, bitty, ritty, Ritualist, or Radiant Ritualist) to nominate",
        });
      }
    }

    // Check if user already nominated
    const existing = await r.get(`user_nomination:${userData.id}`);
    if (existing) {
      return res.status(400).json({ error: "You have already submitted a nomination" });
    }

    const { username, discordId, role } = req.body;
    if (!username || !role) {
      return res.status(400).json({ error: "Username and role are required" });
    }

    if (!VALID_ROLES.includes(role)) {
      return res.status(400).json({ error: "Invalid role" });
    }

    const id = crypto.randomBytes(8).toString("hex");
    const nomination = {
      nominee_username: username,
      nominee_discord_id: discordId || null,
      role,
      nominated_by: userData.global_name || userData.username,
      nominated_by_id: userData.id,
      created_at: new Date().toISOString(),
    };

    await r.set(`nomination:${id}`, nomination);
    await r.lpush("nominations", id);
    await r.set(`user_nomination:${userData.id}`, id);

    return res.json({ success: true, id });
  }

  res.status(405).json({ error: "Method not allowed" });
};
