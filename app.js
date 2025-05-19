import express from "express";
import {Pool} from "pg";
import { GoogleGenerativeAI } from "@google/generative-ai";
//const { GoogleGenerativeAI } = require("@google/generative-ai");
import { OpenAI } from "openai";
// const { OpenAIEmbeddings } = require("@langchain/openai");
import cors from "cors";
import "dotenv/config";

const app = express();
app.use(cors());
app.use(express.json({ limit: "50mb" }));

// Database connection
const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const initilizeDb = async () => {
  try {
    console.log(`Attempt ${attempt} to connect to database...`);
    const connection = await pool.query("SELECT NOW()");
    console.log("✅ Database connected at:", connection.rows[0].now);

    // Enable PostGIS extension
    await pool.query("CREATE EXTENSION IF NOT EXISTS postgis");
    const postgisCheck = await pool.query("SELECT postgis_version()");
    console.log("✅ PostGIS enabled:", postgisCheck.rows[0].postgis_version);

    console.log("Creating users table");
    await pool.query(`
        CREATE TABLE IF NOT EXISTS  documents(
           id SERIAL PRIMARY KEY,
           content TEXT,
           embedding VECTOR(1536),
           source TEXT
           created_at TIMESTAMP DEFAULT NOW()
        )`);
    console.log("✅ Users table created");
  } catch (error) {
    console.error("Error initializing database:", error);
  }
};

// AI Clients
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const openai = new OpenAI();

// PDF Processing

// Routes
app.post("/ingest", async (req, res) => {
  try {
    const { pdfData, fileName } = req.body;
    console.log("Received PDF data:", pdfData);
    console.log("Received file name:", fileName);
    const dataBuffer = Buffer.from(pdfData, "base64");

    // Debug: log buffer length
    console.log("PDF buffer length:", dataBuffer.length);

    // Dynamically import pdf-parse to avoid ESM import issues
    const pdf = (await import("pdf-parse")).default;
    const text = await pdf(dataBuffer);
console.log("Passed pdf-parse");
    // Split into chunks
    const chunks = chunkText(text.text);

    // Store chunks with embeddings
    for (const chunk of chunks) {
      await storeDocument(chunk, fileName);
    }

    res.status(200).json({ message: "Document ingested successfully" });
  } catch (error) {
    // Debug: log error stack
    console.error("Ingest error:", error);
    res.status(500).json({ error: error.message });
  }
});

app.post("/query", async (req, res) => {
  try {
    const { question } = req.body;

    // Get relevant context
    const context = await getRelevantContext(question);

    // Generate answer
    const answer = await generateAnswer(question, context);

    res.json({ question, answer });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Helper functions
function chunkText(text, chunkSize = 1000) {
  const chunks = [];
  for (let i = 0; i < text.length; i += chunkSize) {
    chunks.push(text.substring(i, i + chunkSize));
  }
  return chunks;
}

async function storeDocument(content, source) {
  const embeddings = new OpenAIEmbeddings();
  const embedding = await embeddings.embedQuery(content);

  await pool.query(
    "INSERT INTO documents (content, embedding, source) VALUES ($1, $2, $3)",
    [content, embedding, source]
  );
}

async function getRelevantContext(question) {
  const embeddings = new OpenAIEmbeddings();
  const queryEmbedding = await embeddings.embedQuery(question);

  const { rows } = await pool.query(
    `SELECT content FROM documents 
     ORDER BY embedding <=> $1::vector 
     LIMIT 3`,
    [JSON.stringify(queryEmbedding)]
  );

  return rows.map((r) => r.content).join("\n\n");
}

async function generateAnswer(question, context) {
  try {
    const model = genAI.getGenerativeModel({ model: "gemini-pro" });
    const prompt = `Context: ${context}\n\nQuestion: ${question}\nAnswer:`;

    const result = await model.generateContent(prompt);
    return await result.response.text();
  } catch (error) {
    // Fallback to OpenAI
    const completion = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [
        {
          role: "user",
          content: `Answer based on context:\n${context}\n\nQuestion: ${question}`,
        },
      ],
    });
    return completion.choices[0].message.content;
  }
}

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
