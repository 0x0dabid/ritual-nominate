const { getRedis, getUser } = require("./_utils");

module.exports = async (req, res) => {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const user = await getUser(req);
  if (!user) {
    return res.status(401).json({ error: "Sign in with Discord to vote" });
  }

  const userData = typeof user === "string" ? JSON.parse(user) : user;
  const { nominationId } = req.body;

  if (!nominationId) {
    return res.status(400).json({ error: "Nomination ID required" });
  }

  const r = getRedis();

  // Check nomination exists
  const nom = await r.get(`nomination:${nominationId}`);
  if (!nom) {
    return res.status(404).json({ error: "Nomination not found" });
  }

  const nomination = typeof nom === "string" ? JSON.parse(nom) : nom;

  // Can't vote for own nomination
  if (nomination.nominated_by_id === userData.id) {
    return res.status(400).json({ error: "You can't vote for your own nomination" });
  }

  // Check if user already voted for this role
  const votedKey = `user_voted:${userData.id}:${nomination.role}`;
  const alreadyVoted = await r.get(votedKey);
  if (alreadyVoted) {
    return res.status(400).json({ error: "You already voted for this role" });
  }

  // Record the vote
  await r.sadd(`votes:${nominationId}`, userData.id);
  await r.set(votedKey, nominationId);

  const voteCount = await r.scard(`votes:${nominationId}`);
  return res.json({ success: true, votes: voteCount });
};
