import { readFile, writeFile } from 'node:fs/promises';

const WRITING_FILE = new URL('../writing.json', import.meta.url);
const MEDIUM_PROFILE_URL = 'https://medium.com/@hirebencampbell';
const MEDIUM_FEED_URL = 'https://medium.com/feed/@hirebencampbell';
const MAX_STORIES = 6;

function stripCdata(value = '') {
  return value.replace(/^<!\[CDATA\[([\s\S]*?)\]\]>$/i, '$1').trim();
}

function decodeXml(value = '') {
  return stripCdata(value)
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&#39;/g, "'")
    .replace(/&#(\d+);/g, (_, code) => String.fromCharCode(Number(code)))
    .replace(/&#x([0-9a-f]+);/gi, (_, code) => String.fromCharCode(parseInt(code, 16)));
}

function extractTag(block, tagName) {
  const escapedTag = tagName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const match = block.match(new RegExp(`<${escapedTag}(?:\\s[^>]*)?>([\\s\\S]*?)<\\/${escapedTag}>`, 'i'));
  return match ? decodeXml(match[1]) : '';
}

function slugify(value) {
  return value
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 54) || 'story';
}

function formatDate(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Medium';
  return `Medium · ${new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    timeZone: 'UTC'
  }).format(date)}`;
}

function parseFeed(xml) {
  const blocks = [...xml.matchAll(/<item>([\s\S]*?)<\/item>/gi)].map(match => match[1]);

  return blocks
    .map((block) => {
      const title = extractTag(block, 'title');
      const url = extractTag(block, 'link');
      const published = extractTag(block, 'pubDate');

      if (!title || !url) return null;

      const dateKey = Number.isNaN(new Date(published).getTime())
        ? 'latest'
        : new Date(published).toISOString().slice(0, 10);

      return {
        id: `medium-story-${dateKey}-${slugify(title)}`,
        category: 'medium',
        title,
        client: formatDate(published),
        url,
        featured: false
      };
    })
    .filter(Boolean)
    .slice(0, MAX_STORIES);
}

async function main() {
  const writing = JSON.parse(await readFile(WRITING_FILE, 'utf8'));

  const response = await fetch(MEDIUM_FEED_URL, {
    headers: {
      Accept: 'application/rss+xml, application/xml;q=0.9, text/xml;q=0.8',
      'User-Agent': 'Ben Campbell Portfolio Medium Sync/1.0'
    }
  });

  if (!response.ok) {
    throw new Error(`Medium feed request failed: ${response.status} ${response.statusText}`);
  }

  const stories = parseFeed(await response.text());
  if (!stories.length) throw new Error('Medium feed returned no stories.');

  const categories = (writing.categories || []).filter(category => category.id !== 'medium');
  categories.push({ id: 'medium', label: 'Medium' });

  const curatedItems = (writing.items || []).filter(item =>
    item.id !== 'medium-profile' && !String(item.id || '').startsWith('medium-story-')
  );

  const profileCard = {
    id: 'medium-profile',
    category: 'medium',
    title: 'More Writing on Medium',
    client: 'Ben Campbell',
    url: MEDIUM_PROFILE_URL,
    featured: true
  };

  const nextWriting = {
    ...writing,
    categories,
    items: [...curatedItems, ...stories, profileCard]
  };

  await writeFile(WRITING_FILE, `${JSON.stringify(nextWriting, null, 2)}\n`);
  console.log(`Synced ${stories.length} Medium stories into writing.json.`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
