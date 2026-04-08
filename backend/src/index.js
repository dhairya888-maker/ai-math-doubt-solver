import express from 'express'
import cors from 'cors'
import fetch from 'node-fetch'
import 'dotenv/config'

const app = express()

app.use(cors())
app.use(express.json())

app.get('/health', (_req, res) => {
  res.json({ ok: true })
})

if (process.env.OPENROUTER_API_KEY) {
  console.log('API KEY PRESENT')
}

function mustString(x) {
  return typeof x === 'string' && x.trim().length > 0 ? x.trim() : null
}

function buildPrompt({ action, question, contextAnswer }) {
  const systemBase =
    'You are a helpful math tutor for K-12 students. Be accurate, friendly, and simple.'

  if (action === 'eli10') {
    return {
      system:
        systemBase +
        ' Explain like the student is 10 years old. Use very simple words, short sentences, and a small number of steps.',
      user:
        `Simplify this solution in an "Explain like I'm 10" way.\n\n` +
        `Student question: ${question}\n\n` +
        (contextAnswer ? `Current solution to simplify:\n${contextAnswer}\n\n` : ''),
    }
  }

  if (action === 'practice') {
    return {
      system:
        systemBase +
        ' Create practice questions. Do NOT include solutions unless asked.',
      user:
        `Generate 2-3 similar practice questions (only the questions, no solutions).\n` +
        `Keep the difficulty very close to the original.\n\n` +
        `Original question: ${question}\n\n` +
        (contextAnswer ? `The student saw this solution already:\n${contextAnswer}\n\n` : ''),
    }
  }

  return {
    system:
      systemBase +
      ' Explain step-by-step in simple language. Use clear numbered steps. If helpful, show small checks. Keep it concise.',
    user: question,
  }
}

async function callOpenAI({ system, user }) {
  const apiKey = mustString(process.env.OPENAI_API_KEY)
  if (!apiKey) throw new Error('Missing OPENAI_API_KEY')

  const model = mustString(process.env.OPENAI_MODEL) ?? 'gpt-4o-mini'
  const baseUrl = (mustString(process.env.OPENAI_BASE_URL) ?? 'https://api.openai.com/v1').replace(/\/+$/, '')
  const httpReferer = mustString(process.env.OPENAI_HTTP_REFERER)
  const appTitle = mustString(process.env.OPENAI_APP_TITLE)

  const headers = {
    Authorization: `Bearer ${apiKey}`,
    'Content-Type': 'application/json',
  }
  // OpenRouter recommends these headers for attribution/limits.
  if (httpReferer) headers['HTTP-Referer'] = httpReferer
  if (appTitle) headers['X-Title'] = appTitle

  const resp = await fetch(`${baseUrl}/chat/completions`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      model,
      temperature: 0.2,
      messages: [
        { role: 'system', content: system },
        { role: 'user', content: user },
      ],
    }),
  })

  if (!resp.ok) {
    const text = await resp.text().catch(() => '')
    throw new Error(`LLM error (${resp.status}): ${text.slice(0, 700)}`)
  }

  const data = await resp.json()
  const out = data?.choices?.[0]?.message?.content
  if (!mustString(out)) throw new Error('OpenAI returned empty output')
  return out.trim()
}

async function callGemini({ system, user }) {
  const apiKey = mustString(process.env.GEMINI_API_KEY)
  if (!apiKey) throw new Error('Missing GEMINI_API_KEY')

  const model = mustString(process.env.GEMINI_MODEL) ?? 'gemini-1.5-flash'
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`

  const resp = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [
        {
          role: 'user',
          parts: [{ text: `${system}\n\n${user}` }],
        },
      ],
      generationConfig: {
        temperature: 0.2,
      },
    }),
  })

  if (!resp.ok) {
    const text = await resp.text().catch(() => '')
    throw new Error(`Gemini error (${resp.status}): ${text.slice(0, 500)}`)
  }

  const data = await resp.json()
  const out = data?.candidates?.[0]?.content?.parts?.map((p) => p.text).filter(Boolean).join('\n')
  if (!mustString(out)) throw new Error('Gemini returned empty output')
  return out.trim()
}

app.post('/ask', async (req, res) => {
  try {
    const { question } = req.body

    if (!question) {
      return res.status(400).json({ error: 'No question provided' })
    }

    console.log('Incoming question:', question)

    if (!process.env.OPENROUTER_API_KEY) {
      return res.status(500).json({ error: 'API key missing in environment variables' })
    }

    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'mistralai/mistral-7b-instruct:free',
        messages: [
          {
            role: 'system',
            content: 'You are a helpful math tutor. Explain step-by-step in simple simple language.',
          },
          {
            role: 'user',
            content: question,
          },
        ],
      }),
    })

    const data = await response.json()

    if (!data || !data.choices) {
      console.error('Invalid API response:', data)
      return res.status(500).json({ error: 'Invalid AI response' })
    }

    const answer = data.choices[0].message.content

    res.json({ answer })
  } catch (error) {
    console.error('AI ERROR:', error)
    res.status(500).json({ error: 'AI request failed' })
  }
})

const port = Number(process.env.PORT || 5000)
app.listen(port, () => {
  console.log('Server running')
})

