// Groq AI client configuration

const Groq = require("groq-sdk");

const groqApiKey = process.env.GROQ_API_KEY;

if (!groqApiKey) {
  console.warn("⚠️  Groq API key not set — AI recommendations disabled");
}

const groq = groqApiKey ? new Groq({ apiKey: groqApiKey }) : null;

module.exports = groq;
