// backend/utils/ai.js
// AI-based auto-categorization and spam detection
// Uses OpenAI if available, falls back to keyword matching

const CATEGORIES = ['Water', 'WiFi', 'Mess', 'Electricity', 'Maintenance', 'Sanitation', 'Security', 'Other'];

// ── Keyword-based fallback categorizer ───────────────────────
const KEYWORD_MAP = {
  Water: ['water', 'tap', 'leak', 'pipe', 'flood', 'sewage', 'drain', 'plumb'],
  WiFi: ['wifi', 'internet', 'network', 'connection', 'bandwidth', 'router', 'signal', 'slow net'],
  Mess: ['mess', 'food', 'canteen', 'meal', 'lunch', 'dinner', 'breakfast', 'cook', 'kitchen', 'diet'],
  Electricity: ['power', 'electricity', 'light', 'fan', 'ac', 'socket', 'switch', 'voltage', 'outage', 'electric'],
  Maintenance: ['door', 'window', 'lock', 'furniture', 'bed', 'chair', 'table', 'broken', 'repair', 'fix'],
  Sanitation: ['toilet', 'bathroom', 'clean', 'dirty', 'garbage', 'trash', 'dustbin', 'hygienic', 'pest', 'cockroach', 'mosquito'],
  Security: ['security', 'guard', 'cctv', 'camera', 'theft', 'stolen', 'outsider', 'gate', 'lock'],
};

const keywordCategorize = (title, description) => {
  const text = `${title} ${description}`.toLowerCase();
  let bestMatch = { category: 'Other', score: 0 };
  for (const [cat, keywords] of Object.entries(KEYWORD_MAP)) {
    const score = keywords.filter(kw => text.includes(kw)).length;
    if (score > bestMatch.score) bestMatch = { category: cat, score };
  }
  return bestMatch.category;
};

// ── Simple spam detection ─────────────────────────────────────
const SPAM_SIGNALS = [
  { pattern: /(.)\1{4,}/, weight: 0.3 },           // repeated chars
  { pattern: /^.{1,10}$/, weight: 0.2 },            // too short
  { pattern: /https?:\/\//, weight: 0.4 },           // contains URLs
  { pattern: /buy|sell|discount|offer|free/i, weight: 0.5 },
  { pattern: /[A-Z]{10,}/, weight: 0.2 },            // all caps spam
];
const SPAM_KEYWORDS = ['test', 'asdf', 'qwerty', 'aaaaaa', 'blah blah'];

const detectSpam = (title, description) => {
  const text = `${title} ${description}`.toLowerCase();
  let score = 0;

  for (const { pattern, weight } of SPAM_SIGNALS) {
    if (pattern.test(text)) score += weight;
  }
  for (const kw of SPAM_KEYWORDS) {
    if (text.includes(kw)) score += 0.3;
  }
  if (text.split(' ').length < 3) score += 0.3;

  return { isSpam: score >= 0.7, score: Math.min(score, 1) };
};

// ── OpenAI-powered categorizer (optional) ────────────────────
const aiCategorize = async (title, description) => {
  if (!process.env.OPENAI_API_KEY) {
    return { category: keywordCategorize(title, description), source: 'keyword' };
  }
  try {
    const OpenAI = require('openai');
    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    const response = await openai.chat.completions.create({
      model: 'gpt-3.5-turbo',
      max_tokens: 50,
      messages: [
        {
          role: 'system',
          content: `You are a hostel complaint categorizer. Classify complaints into one of these categories: ${CATEGORIES.join(', ')}. Reply with ONLY the category name.`,
        },
        {
          role: 'user',
          content: `Title: ${title}\nDescription: ${description}`,
        },
      ],
    });
    const suggested = response.choices[0]?.message?.content?.trim();
    const category = CATEGORIES.includes(suggested) ? suggested : keywordCategorize(title, description);
    return { category, source: 'ai' };
  } catch (err) {
    console.warn('OpenAI categorization failed, using keyword fallback:', err.message);
    return { category: keywordCategorize(title, description), source: 'keyword' };
  }
};

// ── Estimated resolution hours ───────────────────────────────
const getEstimatedHours = (priority) => {
  return { Low: 168, Medium: 72, High: 24, Urgent: 6 }[priority] || 72;
};

module.exports = { aiCategorize, detectSpam, getEstimatedHours, keywordCategorize };
