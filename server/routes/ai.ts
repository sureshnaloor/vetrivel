import express from 'express';
import { requireUser } from '../middleware/requireUser';
import OpenAI from 'openai';
import { ObjectId } from 'mongodb';
import clientPromise from '../lib/db';

export const aiRouter = express.Router();
aiRouter.use(requireUser);

const openai = new OpenAI({
  apiKey: process.env.DEEPSEEK_API_KEY || 'dummy_key', // prevent crash on startup if missing
  baseURL: 'https://api.deepseek.com/v1',
});

// POST /api/ai/generate-svg
aiRouter.post('/generate-svg', async (req, res) => {
  try {
    const { listId, prompt } = req.body;
    
    if (!listId || !prompt) {
      return res.status(400).json({ error: 'Missing listId or prompt' });
    }

    const completion = await openai.chat.completions.create({
      model: "deepseek-chat",
      messages: [
        {
          role: "system",
          content: "You are an expert SVG designer. You generate clean, responsive, and minimalist SVGs. Respond ONLY with raw SVG code. Do NOT wrap it in markdown code blocks (e.g. ```svg). Do NOT include any explanations. The SVG should have viewBox=\"0 0 24 24\", use currentColor where appropriate, and be simple."
        },
        {
          role: "user",
          content: `Create an SVG icon for: ${prompt}.`
        }
      ],
      temperature: 0.1,
    });

    let svgCode = completion.choices[0].message.content?.trim();
    if (!svgCode) {
      throw new Error('No SVG generated');
    }
    
    // Clean up potential markdown formatting just in case
    if (svgCode.startsWith('```svg')) {
      svgCode = svgCode.replace(/^```svg\n/, '').replace(/\n```$/, '');
    } else if (svgCode.startsWith('```')) {
      svgCode = svgCode.replace(/^```\n/, '').replace(/\n```$/, '');
    }

    // Save to DB
    const client = await clientPromise;
    const db = client.db();
    
    const result = await db.collection("divyadesam").findOneAndUpdate(
      { _id: new ObjectId(listId) },
      { $set: { iconSvg: svgCode, updatedAt: new Date().toISOString() } },
      { returnDocument: 'after' }
    );

    if (!result) {
      return res.status(404).json({ error: 'List not found' });
    }

    res.json({ iconSvg: svgCode });
  } catch (error) {
    console.error('Error generating SVG:', error);
    res.status(500).json({ error: 'Failed to generate SVG' });
  }
});

// POST /api/ai/temple-estimate
aiRouter.post('/temple-estimate', async (req, res) => {
  try {
    const { templeName } = req.body;
    
    if (!templeName) {
      return res.status(400).json({ error: 'Missing templeName' });
    }

    const completion = await openai.chat.completions.create({
      model: "deepseek-chat",
      messages: [
        {
          role: "system",
          content: "You are an expert travel guide. Given a Hindu temple name, estimate the average time (in minutes) a devotee typically spends inside the temple (including darshan, walking around the prakarams). Respond with ONLY a JSON object: { \"insideTimeMins\": number }. No other text."
        },
        {
          role: "user",
          content: `Temple: ${templeName}`
        }
      ],
      temperature: 0.1,
      response_format: { type: "json_object" }
    });

    const responseText = completion.choices[0].message.content?.trim();
    if (!responseText) {
      throw new Error('No response');
    }
    
    const result = JSON.parse(responseText);
    res.json(result);
  } catch (error) {
    console.error('Error estimating time:', error);
    // Fallback
    res.json({ insideTimeMins: 45 });
  }
});
