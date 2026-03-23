export const TOPICS = [
  {
    id: 'climate',
    label: 'Climate policy',
    blurb: 'Carbon pricing, energy transition, international cooperation',
  },
  {
    id: 'ai',
    label: 'AI & society',
    blurb: 'Regulation, work, safety, and access',
  },
  {
    id: 'education',
    label: 'Education',
    blurb: 'Funding, standards, school choice, higher ed',
  },
  {
    id: 'healthcare',
    label: 'Healthcare',
    blurb: 'Coverage, costs, public vs private models',
  },
  {
    id: 'free-speech',
    label: 'Free speech online',
    blurb: 'Moderation, platforms, and the law',
  },
  {
    id: 'housing',
    label: 'Housing & cities',
    blurb: 'Zoning, affordability, development',
  },
];

export const ALLOWED_TOPIC_IDS = new Set(TOPICS.map((t) => t.id));
