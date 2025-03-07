aiService = require("../services/ai.service");

module.exports.getReview = async (req, res) => {
  const feedback = req.body.feedback;

  if (!feedback) {
    return res.status(400).send("feedback is required");
  }

  const response = await aiService(feedback);

  res.send(response);
};
