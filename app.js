import express from "express";
import { Pool } from "pg";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { OpenAI } from "openai";
import { OpenAIEmbeddings } from "@langchain/openai";
import cors from "cors";
import "dotenv/config";
import PDFParser from "pdf2json";
<<<<<<< HEAD

=======
>>>>>>> aa7300e73d7ef5203bf7dba4f6026160df462212

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
// funct to extract text from pdf
// funct to extract text from pdf
async function extractTextFromPDF(dataBuffer) {
  return new Promise((resolve, reject) => {
    const pdfParser = new PDFParser();
    let text = "";

    pdfParser.on("pdfParser_dataError", (err) => reject(err));
    pdfParser.on("pdfParser_dataReady", () => resolve(text));

    pdfParser.on("pdfParser_data", (data) => {
      try {
        text = data.Pages.map((page) =>
          page.Texts.map((text) =>
            text.R.map((r) => decodeURIComponent(r.T)).join(" ")
          ).join("\n")
        ).join("\n");

        // text clean up
        text = text
          .replace(/\s+/g, " ") // Collapse whitespace
          .replace(/([a-z])([A-Z])/g, "$1 $2") // Fix missing spaces between words
          .replace(/ /g, "") // Remove replacement characters
          .trim();
      } catch (error) {
        reject(error);
      }
    }); 

    pdfParser.parseBuffer(dataBuffer);
  });
}

// funct to extract text from pdf
async function extractTextFromPDF(dataBuffer) {
  return new Promise((resolve, reject) => {
    const pdfParser = new PDFParser();
    let text = "";

    pdfParser.on("pdfParser_dataError", (err) => reject(err));
    pdfParser.on("pdfParser_dataReady", () => resolve(text));

    pdfParser.on("pdfParser_data", (data) => {
      try {
        text = data.Pages.map((page) =>
          page.Texts.map((text) =>
            text.R.map((r) => decodeURIComponent(r.T)).join(" ")
          ).join("\n")
        ).join("\n");

        // text clean up
        text = text
          .replace(/\s+/g, " ") // Collapse whitespace
          .replace(/([a-z])([A-Z])/g, "$1 $2") // Fix missing spaces between words
          .replace(/�/g, "") // Remove replacement characters
          .trim();
      } catch (error) {
        reject(error);
      }
    }); 

    pdfParser.parseBuffer(dataBuffer);
  });
}

// Routes
app.post("/ingest", async (req, res) => {
  try {
    const { pdfData, fileName } = req.body;
    console.log("Received PDF data:", pdfData);
    console.log("Received file name:", fileName);
    const dataBuffer = Buffer.from(pdfData, "base64");

    // Debug: log buffer length
    console.log("PDF buffer length:", dataBuffer.length);

<<<<<<< HEAD
    // Use extractTextFromPDF instead of pdf-parse
    const text = await extractTextFromPDF(dataBuffer);
    console.log("Extracted text from PDF");

=======
    // Dynamically import pdf-parse to avoid ESM import issues
    const text = await extractTextFromPDF(dataBuffer);
    console.log("Passed pdf-parse");
>>>>>>> aa7300e73d7ef5203bf7dba4f6026160df462212
    // Split into chunks
    const chunks = chunkText(text);

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

<<<<<<< HEAD
const storeDocumentChunk = async (content, source) => {
  try {
    const embedding = await createDeepSeekEmbedding(content);
    
    await pool.query(
      'INSERT INTO documents (content, embedding, source) VALUES ($1, $2, $3)',
      [content, embedding, source]
    );
  } catch (error) {
    console.error('Storage error:', error);
    throw error;
  }
};

async function getRelevantContext(question) {
  const embeddings = new DeepSeekEmbeddings();
=======
async function storeDocument(content, source) {
  
// replace this
  const embeddings = new OpenAIEmbeddings();

//   with this
  const embedding = await embeddings.embedQuery(content);

  await pool.query(
    "INSERT INTO documents (content, embedding, source) VALUES ($1, $2, $3)",
    [content, embedding, source]
  );
}

async function getRelevantContext(question) {

//   with this
  const embeddings = new createDeepSeekEmbedding ();

>>>>>>> aa7300e73d7ef5203bf7dba4f6026160df462212
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
