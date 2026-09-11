import type { Page } from '@playwright/test';
// Chromium accepts Secure cookies on loopback HTTP; APIRequestContext does not.
// Exercise the real browser cookie behavior used by the application.
export async function browserRequest(page: Page, url: string, options: {method?: string; data?: unknown; headers?: Record<string,string>} = {}) {
  const response = await page.evaluate(async ({url, options}) => {
    const result = await fetch(url, {method:options.method ?? 'GET',headers:{'Content-Type':'application/json',...options.headers},body:options.data === undefined ? undefined : JSON.stringify(options.data)});
    return {status:result.status,body:await result.json()};
  }, {url, options});
  return {status:()=>response.status,json:async()=>response.body};
}
