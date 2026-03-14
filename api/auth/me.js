const { getUser } = require("../_utils");

module.exports = async (req, res) => {
  const user = await getUser(req);
  if (!user) {
    return res.status(401).json({ error: "Not authenticated" });
  }

  const userData = typeof user === "string" ? JSON.parse(user) : user;

  // Check if user has an eligible nominator role
  const allowedRoleIds = (process.env.NOMINATOR_ROLE_IDS || "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);

  const canNominate =
    allowedRoleIds.length === 0 ||
    (userData.roles || []).some((r) => allowedRoleIds.includes(r));

  // Don't expose role IDs to the frontend
  const { roles, ...safeUser } = userData;
  res.json({ user: safeUser, canNominate });
};
