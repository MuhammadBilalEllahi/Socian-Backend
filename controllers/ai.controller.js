aiService = require("../services/ai.service");
aiFeedbackService = require("../services/aifeedback.service");

module.exports.getReview = async (req, res) => {
  const feedback = req.body.feedback;

  if (!feedback) {
    return res.status(400).send("feedback is required");
  }

  const response = await aiFeedbackService(feedback);

  res.send(response);
};
