// Update your .env file with the new key:
// DEEPSEEK_API_KEY=sk-d6ea02a1e3bc47a9a739d91fae1a5d59

// Note: DeepSeek still does not provide public embeddings as of now.
// If embeddings become available, update the model name and endpoint accordingly.
// For chat/completions, use the following function:

import axios from 'axios';

export async function createDeepSeekChatCompletion(messages, model = "deepseek-chat") {
  try {
    const response = await axios.post(
      'https://api.deepseek.com/v1/chat/completions',
      {
        model,
        messages
      },
      {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.DEEPSEEK_API_KEY}`
        }
      }
    );
    return response.data;
  } catch (error) {
    throw new Error(`Chat completion failed: ${error.response?.data?.message || error.message}`);
  }
}