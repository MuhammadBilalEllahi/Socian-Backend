import aiService from "../services/ai.service.js";
import aiFeedbackService from "../services/aifeedback.service.js";

export default async function getReview (req, res) {
  const feedback = req.body.feedback;

  if (!feedback) {
    return res.status(400).send("feedback is required");
  }

  const response = await aiFeedbackService(feedback);

  res.send(response);
};

