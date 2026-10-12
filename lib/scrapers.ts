import * as cheerio from 'cheerio';

const UA = { 'User-Agent': 'Mozilla/5.0 (compatible; pop-tracker)' };
const getHtml = async (url: string) => {
  const r = await fetch(url, { headers: UA });
  if (!r.ok) throw new Error(`${url} -> ${r.status}`);
  return r.text();
};
const firstInt = (s: string) => {
  const m = s.match(/\d[\d,]*/);
  if (!m) throw new Error('no number found');
  return Number(m[0].replace(/,/g, ''));
};

// Official GraphQL endpoint: the most reliable of the five.
export async function leetcode(handle: string) {
  const r = await fetch('https://leetcode.com/graphql', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...UA },
    body: JSON.stringify({
      query: `query($u:String!){matchedUser(username:$u){submitStats{acSubmissionNum{difficulty count}}}}`,
      variables: { u: handle },
    }),
  });
  const j = await r.json();
  return j.data.matchedUser.submitStats.acSubmissionNum.find((x: any) => x.difficulty === 'All').count as number;
}

export async function codechef(handle: string) {
  const $ = cheerio.load(await getHtml(`https://www.codechef.com/users/${handle}`));
  const h3 = $('h3').filter((_, e) => /Total Problems Solved/i.test($(e).text())).first().text();
  return firstInt(h3);
}

export async function gfg(handle: string) {
  const $ = cheerio.load(await getHtml(`https://www.geeksforgeeks.org/user/${handle}/`));
  const data = JSON.parse($('#__NEXT_DATA__').html() || '{}');
  const n = data?.props?.pageProps?.userInfo?.total_problems_solved;
  if (n == null) throw new Error('GFG: field not found, inspect __NEXT_DATA__');
  return Number(n);
}

// These two render client-side, so use a headless browser.
// URLs/selectors are best guesses: open the profile, inspect, and adjust.
async function rendered(url: string, selector: string) {
  const { chromium } = await import('playwright');
  const browser = await chromium.launch();
  try {
    const page = await browser.newPage();
    await page.goto(url, { waitUntil: 'networkidle' });
    return await page.locator(selector).first().innerText();
  } finally {
    await browser.close();
  }
}
export const codingninjas = async (h: string) =>
  firstInt(await rendered(`https://www.naukri.com/code360/profile/${h}`, 'text=/problems solved/i'));
export const tuf = async (h: string) =>
  firstInt(await rendered(`https://takeuforward.org/plus/profile/${h}`, 'text=/problems solved/i'));

export const SCRAPERS: Record<string, (h: string) => Promise<number>> = {
  leetcode, codechef, gfg, codingninjas, tuf,
};
