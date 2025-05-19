import express from 'express'
const { Pool } = require('pg');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const { OpenAI } = require('openai');
const { OpenAIEmbeddings } = require('@langchain/openai');
const cors = require('cors');
require('dotenv').config();

const app = express();
app.use(cors());
app.use(express.json({ limit: '50mb' }));

// Database connection
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

// AI Clients
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const openai = new OpenAI();

// PDF Processing
const pdf = require('pdf-parse');

// Routes
app.post('/ingest', async (req, res) => {
  try {
    const { pdfData, fileName } = req.body;
    const dataBuffer = Buffer.from(pdfData, 'base64');
    
    // Extract text from PDF
    const { text } = await pdf(dataBuffer);
    
    // Split into chunks
    const chunks = chunkText(text);
    
    // Store chunks with embeddings
    for (const chunk of chunks) {
      await storeDocument(chunk, fileName);
    }
    
    res.status(200).json({ message: 'Document ingested successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/query', async (req, res) => {
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
    'INSERT INTO documents (content, embedding, source) VALUES ($1, $2, $3)',
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
  
  return rows.map(r => r.content).join('\n\n');
}

async function generateAnswer(question, context) {
  try {
    const model = genAI.getGenerativeModel({ model: 'gemini-pro' });
    const prompt = `Context: ${context}\n\nQuestion: ${question}\nAnswer:`;
    
    const result = await model.generateContent(prompt);
    return await result.response.text();
  } catch (error) {
    // Fallback to OpenAI
    const completion = await openai.chat.completions.create({
      model: 'gpt-3.5-turbo',
      messages: [{
        role: 'user',
        content: `Answer based on context:\n${context}\n\nQuestion: ${question}`
      }]
    });
    return completion.choices[0].message.content;
  }
}

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));