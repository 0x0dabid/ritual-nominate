const { getUser } = require("../_utils");

module.exports = async (req, res) => {
  const user = await getUser(req);
  if (!user) {
    return res.status(401).json({ error: "Not authenticated" });
  }
  res.json({ user });
};
