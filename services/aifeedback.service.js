const { GoogleGenerativeAI } = require("@google/generative-ai");

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_GEMINI_KEY);
const model = genAI.getGenerativeModel({
  model: "gemini-2.0-flash",
  systemInstruction:
    `
    You are a reviewer of feedbacks given by students to a teacher 
    and will generate a response summarizing what the students have said about the teacher and will make it concise and professional

    `

});



async function generateContent(prompt) {
  console.log("inside gemini generate function")
  const result = await model.generateContent(prompt);
  return result.response.text();
}

module.exports = generateContent;
