import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { createServer } from 'node:http';
import { readFile, writeFile } from 'node:fs/promises';
import { extname, resolve, sep } from 'node:path';

const root = process.cwd();
const output = resolve('.scratchpad/equipments');
const live = process.argv[2];
const mime = {'.html':'text/html', '.css':'text/css', '.js':'text/javascript', '.jpg':'image/jpeg', '.png':'image/png', '.webp':'image/webp'};
const server = createServer(async (request, response) => {
  const path = decodeURIComponent(new URL(request.url, 'http://localhost').pathname);
  const file = resolve(root, '.' + (path.endsWith('/') ? path + 'index.html' : path));
  if (!file.startsWith(root + sep)) return response.writeHead(404).end();
  try {
    const content = await readFile(file);
    response.setHeader('Content-Type', mime[extname(file)] || 'application/octet-stream');
    response.end(content);
  } catch {
    response.writeHead(404).end();
  }
});
if (!live) await new Promise(ready => server.listen(0, '127.0.0.1', ready));
const site = live || 'http://127.0.0.1:' + server.address().port;

const chrome = spawn('/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', [
  '--headless', '--disable-gpu', '--no-first-run', '--disable-background-networking',
  '--remote-debugging-pipe', '--user-data-dir=' + resolve(output, 'navigation-profile'),
], {stdio: ['ignore', 'ignore', 'ignore', 'pipe', 'pipe']});
const pending = new Map();
let nextId = 0;
let buffer = '';
chrome.stdio[4].setEncoding('utf8');
chrome.stdio[4].on('data', chunk => {
  buffer += chunk;
  let delimiter;
  while ((delimiter = buffer.indexOf('\0')) !== -1) {
    const message = JSON.parse(buffer.slice(0, delimiter));
    buffer = buffer.slice(delimiter + 1);
    const entry = pending.get(message.id);
    if (entry) {
      pending.delete(message.id);
      if (message.error) entry.reject(new Error(JSON.stringify(message.error)));
      else entry.resolve(message.result);
    }
  }
});
function call(method, params = {}, sessionId) {
  const id = ++nextId;
  return new Promise((resolve, reject) => {
    pending.set(id, {resolve, reject});
    chrome.stdio[3].write(JSON.stringify({id, method, params, sessionId}) + '\0');
  });
}
const timeout = setTimeout(() => {
  console.error('Browser navigation test timed out');
  chrome.kill();
  process.exit(1);
}, 40000);
try {
  const {targetId} = await call('Target.createTarget', {url:'about:blank'});
  const {sessionId} = await call('Target.attachToTarget', {targetId, flatten:true});
  const send = (method, params) => call(method, params, sessionId);
  async function evaluate(expression) {
    const result = await send('Runtime.evaluate', {expression, returnByValue:true});
    return result.result.value;
  }
  async function waitFor(expression) {
    for (let attempt = 0; attempt < 60; attempt++) {
      if (await evaluate(expression)) return;
      await new Promise(ready => setTimeout(ready, 150));
    }
    throw new Error('Timed out waiting for ' + expression);
  }
  for (const width of [1280, 390]) {
    await send('Emulation.setDeviceMetricsOverride', {width, height:850, deviceScaleFactor:1, mobile:width < 500});
    await send('Page.navigate', {url:site + '/'});
    await waitFor('document.readyState === "complete" && location.pathname === "/"');
    const nav = 'document.querySelector("a[href$=\\"equipments.html\\"]")';
    if (width < 500) {
      await evaluate('document.querySelector(".navbar-toggler").click()');
      await waitFor(nav + '.getBoundingClientRect().height > 0');
    }
    await evaluate(nav + '.click()');
    await waitFor('document.readyState === "complete" && location.pathname === "/equipments.html"');
    assert.equal(await evaluate('document.querySelector("h1").textContent'), 'Equipments Guides and Protocols');
    assert.equal(await evaluate('document.title'), 'Equipments Guides and Protocols | HCIED LAB');
    await waitFor('document.querySelector(".omtech-polar-photo").naturalWidth === 1800');
    assert.equal(await evaluate('window.innerWidth'), width);
    assert.equal(await evaluate('document.documentElement.scrollWidth'), width);
    if (width < 500) {
      const {data} = await send('Page.captureScreenshot', {format:'png'});
      await writeFile(resolve(output, 'verified-mobile-equipment.png'), Buffer.from(data, 'base64'));
    }
    await evaluate('document.querySelector(".equipment-card").click()');
    await waitFor('document.readyState === "complete" && location.pathname === "/laser/"');
    const back = 'Array.from(document.querySelectorAll(".hero a")).find(link => link.textContent.includes("Back to HCIED"))';
    assert.ok(await evaluate(back + '.getBoundingClientRect().width > 0'));
    assert.ok(await evaluate(back + '.nextElementSibling.id === "hero-title"'));
    assert.ok(await evaluate('document.querySelector(".hero .eyebrow") === null'));
    await evaluate(back + '.click()');
    await waitFor('document.readyState === "complete" && location.pathname === "/equipments.html"');
    assert.ok(await evaluate('document.querySelector(".equipment-card") !== null'));
    console.log(width + 'px: homepage → Equipments → laser guide → Equipments');
  }
} finally {
  clearTimeout(timeout);
  chrome.kill();
  server.close();
}
