const saveSession = (req, res) => {
  req.session.user = req.user;
  req.session.save((err) => {
    if (err) {
      console.error("Session save error:", err);
      return res.status(500).json({ error: "Session save failed" });
    }
    console.log("Session saved successfully");
  });
};

const sessionSaveHandler = async (req, res) => {
  try {
    req.session.user = req.user;
    await new Promise((resolve, reject) => {
      req.session.save((err) => {
        if (err) reject(err);
        else resolve();
      });
    });
    console.log("Session saved successfully");
  } catch (error) {
    console.error("Session save error:", error);
    return res.status(500).json({ error: "Session save failed" });
  }
};

export { sessionSaveHandler, saveSession };