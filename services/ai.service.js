const { GoogleGenerativeAI } = require("@google/generative-ai");

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_GEMINI_KEY);
const model = genAI.getGenerativeModel({ 
    model: "gemini-2.0-flash", 
    systemInstruction:
    `
    You are a comment reviewer who'll approve or disprove a feedback on a teacher on the basis of being appropriate and inappropriate.
    `

});



async function generateContent(prompt) {
  const result = await model.generateContent(prompt);
  return result.response.text();
}

module.exports = generateContent;
