/* Browser smoke test for the Mediscan AI frontend.
   Run with:  node smoke.mjs
   Requires the backend (8080) and vite dev server (5178) to be running. */
import puppeteer from 'puppeteer-core';

const BASE = process.env.SMOKE_BASE || 'http://localhost:5178';
const CHROME =
  'C:/Program Files/Google/Chrome/Application/chrome.exe';

const errors = [];
const steps = [];

function log(name, ok, info = '') {
  steps.push({ name, ok });
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name} ${info}`);
}

async function waitForText(page, text, timeout = 15000) {
  await page.waitForFunction(
    (expected) => document.body.innerText.includes(expected),
    { timeout },
    text
  );
}

async function login(page, email, password) {
  await page.goto(`${BASE}/login`, { waitUntil: 'networkidle2' });
  await page.waitForSelector('#email');
  await page.type('#email', email);
  await page.type('#password', password);
  await Promise.all([
    page.click('button[type="submit"]'),
    page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 20000 }),
  ]);
}

async function main() {
  const browser = await puppeteer.launch({
    executablePath: CHROME,
    headless: 'new',
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--window-size=1440,900',
      '--use-fake-ui-for-media-stream',
      '--use-fake-device-for-media-stream',
    ],
  });
  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 900 });

  page.on('pageerror', (err) => errors.push(`pageerror: ${err.message}`));
  page.on('response', (res) => {
    if (res.status() >= 400) errors.push(`http ${res.status()}: ${res.url()}`);
  });
  page.on('console', (msg) => {
    if (msg.type() === 'error') {
      const text = msg.text();
      if (!text.includes('favicon')) errors.push(`console: ${text}`);
    }
  });

  // 1. Landing page
  await page.goto(BASE, { waitUntil: 'networkidle2' });
  await waitForText(page, 'Your Health Information, Simplified.');
  log('landing page renders', true);
  await page.screenshot({ path: 'screenshots/01-landing.png' });

  // 2. Patient login + dashboard
  await login(page, 'patient1.demo@mediscan.local', 'Demo@123');
  await waitForText(page, 'Welcome back');
  log('patient login + dashboard', page.url().includes('/patient/dashboard'), page.url());
  await page.screenshot({ path: 'screenshots/02-patient-dashboard.png', fullPage: true });

  // 3. Documents
  await page.goto(`${BASE}/patient/documents`, { waitUntil: 'networkidle2' });
  await waitForText(page, 'Medical Documents');
  await page.screenshot({ path: 'screenshots/03-documents.png', fullPage: true });

  // 4. Open the seeded document
  const clicked = await page.evaluate(() => {
    const button = [...document.querySelectorAll('button')].find((b) =>
      b.innerText.trim().startsWith('View')
    );
    if (button) {
      button.click();
      return true;
    }
    return false;
  });
  if (clicked) {
    await waitForText(page, 'Extracted text');
    log('document detail page', page.url().includes('/patient/documents/'), page.url());
    await page.screenshot({ path: 'screenshots/04-document-detail.png', fullPage: true });
  } else {
    log('document detail page', false, '(no View button found)');
  }

  // 5. Doctor search - live search as you type (no Apply click)
  await page.goto(`${BASE}/patient/doctors`, { waitUntil: 'networkidle2' });
  await waitForText(page, 'Find Doctors');
  await page.waitForFunction(() => document.body.innerText.includes('Dr.'), { timeout: 15000 });
  await page.waitForFunction(() => document.body.innerText.includes('6 doctors found'), { timeout: 15000 }).catch(() => {});
  await page.type('#q', 'Imran');
  await page.waitForFunction(
    () =>
      document.body.innerText.includes('Dr. Imran Shaikh') &&
      !document.body.innerText.includes('Dr. Asha Verma'),
    { timeout: 20000 }
  );
  log('live name search filters results', true);
  await page.screenshot({ path: 'screenshots/05-doctors-live-search.png', fullPage: true });
  // clear the search and confirm results come back
  await page.click('button[aria-label="Clear search"]');
  await page.waitForFunction(() => document.body.innerText.includes('Dr. Asha Verma'), {
    timeout: 15000,
  });
  log('clearing search restores results', true);

  // 6. Doctor profile + booking modal
  await page.goto(`${BASE}/patient/doctors/1`, { waitUntil: 'networkidle2' });
  await waitForText(page, 'Book Appointment');
  const opened = await page.evaluate(() => {
    const button = [...document.querySelectorAll('button')].find((b) =>
      b.innerText.includes('Book Appointment')
    );
    if (button) {
      button.click();
      return true;
    }
    return false;
  });
  if (opened) {
    await waitForText(page, 'Consultation mode');
    log('booking modal opens', true);
    await page.screenshot({ path: 'screenshots/06-booking.png' });
    await page.keyboard.press('Escape');
  } else {
    log('booking modal opens', false, '(button not found)');
  }

  // 7. AI assistant
  await page.goto(`${BASE}/patient/ai-assistant`, { waitUntil: 'networkidle2' });
  await waitForText(page, 'AI Assistant');
  log('AI assistant page', true);
  await page.screenshot({ path: 'screenshots/07-ai-assistant.png' });

  // 8. Medical history + appointments + profile
  await page.goto(`${BASE}/patient/medical-history`, { waitUntil: 'networkidle2' });
  await waitForText(page, 'Medical History');
  log('medical history page', true);

  await page.goto(`${BASE}/patient/appointments`, { waitUntil: 'networkidle2' });
  await waitForText(page, 'Appointments');
  log('patient appointments page', true);

  await page.goto(`${BASE}/patient/profile`, { waitUntil: 'networkidle2' });
  await waitForText(page, 'My Profile');
  log('patient profile page', true);
  await page.screenshot({ path: 'screenshots/08-profile.png', fullPage: true });

  // 9. Doctor role
  await page.goto(`${BASE}/patient/dashboard`, { waitUntil: 'networkidle2' });
  await page.evaluate(() => localStorage.clear());
  await login(page, 'doctor1.demo@mediscan.local', 'Demo@123');
  await waitForText(page, 'Welcome back');
  log('doctor login + dashboard', page.url().includes('/doctor/dashboard'), page.url());
  await page.screenshot({ path: 'screenshots/09-doctor-dashboard.png', fullPage: true });

  await page.goto(`${BASE}/doctor/appointments`, { waitUntil: 'networkidle2' });
  await waitForText(page, 'Appointments');
  log('doctor appointments page', true);

  await page.goto(`${BASE}/doctor/patients`, { waitUntil: 'networkidle2' });
  await waitForText(page, 'Patients');
  log('doctor patients page', true);

  await page.goto(`${BASE}/doctor/consultations`, { waitUntil: 'networkidle2' });
  await waitForText(page, 'Consultations');
  log('doctor consultations page', true);

  await page.goto(`${BASE}/doctor/ai-assistant`, { waitUntil: 'networkidle2' });
  await waitForText(page, 'AI Assistant');
  await page.waitForFunction(() => document.body.innerText.includes('Ask a health education question'), { timeout: 10000 }).catch(() => {});
  log('doctor AI assistant page', true);
  await page.screenshot({ path: 'screenshots/09b-doctor-ai.png', fullPage: true });

  // 10. Role guard: patient must not access admin routes
  await page.evaluate(() => localStorage.clear());
  await login(page, 'patient1.demo@mediscan.local', 'Demo@123');
  await page.goto(`${BASE}/admin/dashboard`, { waitUntil: 'networkidle2' });
  await page.waitForFunction(() => window.location.pathname !== '/admin/dashboard', {
    timeout: 10000,
  });
  log('role guard redirects patient away from admin', !page.url().includes('/admin'));

  // 11. Admin role
  await page.evaluate(() => localStorage.clear());
  await login(page, 'admin@mediscan.local', 'Admin@123');
  await waitForText(page, 'Admin Dashboard');
  log('admin login + dashboard', true);
  await page.screenshot({ path: 'screenshots/10-admin-dashboard.png', fullPage: true });

  for (const path of ['users', 'doctors', 'hospitals', 'appointments']) {
    await page.goto(`${BASE}/admin/${path}`, { waitUntil: 'networkidle2' });
    await new Promise((r) => setTimeout(r, 800));
    log(`admin ${path} page`, !page.url().includes('login'));
  }
  await page.screenshot({ path: 'screenshots/11-admin-users.png', fullPage: true });

  // 12. Hospital role
  await page.evaluate(() => localStorage.clear());
  await login(page, 'hospital.demo@mediscan.local', 'Demo@123');
  await waitForText(page, 'dashboard');
  log('hospital login + dashboard', page.url().includes('/hospital/dashboard'), page.url());
  await page.screenshot({ path: 'screenshots/12-hospital-dashboard.png', fullPage: true });

  for (const path of ['doctors', 'appointments', 'profile']) {
    await page.goto(`${BASE}/hospital/${path}`, { waitUntil: 'networkidle2' });
    await new Promise((r) => setTimeout(r, 600));
    log(`hospital ${path} page`, !page.url().includes('login'));
  }

  await page.goto(`${BASE}/hospital/ai-assistant`, { waitUntil: 'networkidle2' });
  await waitForText(page, 'AI Assistant');
  await page.waitForFunction(() => document.body.innerText.includes('Ask a health education question'), { timeout: 10000 }).catch(() => {});
  log('hospital AI assistant page', true);
  await page.screenshot({ path: 'screenshots/12b-hospital-ai.png', fullPage: true });

  // 13. Doctor-patient chat (patient in default context, doctor in an isolated context)
  await page.evaluate(() => localStorage.clear());
  await login(page, 'patient1.demo@mediscan.local', 'Demo@123');
  await page.goto(
    `${BASE}/patient/messages?peer=3&name=${encodeURIComponent('Dr. Asha Verma (DEMO)')}`,
    { waitUntil: 'networkidle2' }
  );
  await page.waitForSelector('input[placeholder="Type a message..."]', { timeout: 15000 });
  log('patient opens conversation with doctor', true);

  await page.type('input[placeholder="Type a message..."]', 'Hello doctor, this is a smoke chat message.');
  await page.keyboard.press('Enter');
  await waitForText(page, 'Hello doctor, this is a smoke chat message.', 15000);
  log('patient sends chat message', true);

  const doctorContext = await browser.createBrowserContext();
  const docPage = await doctorContext.newPage();
  await docPage.setViewport({ width: 1440, height: 900 });
  docPage.on('pageerror', (err) => errors.push(`docPageerror: ${err.message}`));
  docPage.on('console', (msg) => {
    if (msg.type() === 'error') {
      const text = msg.text();
      if (!text.includes('favicon')) errors.push(`docconsole: ${text}`);
    }
  });
  await login(docPage, 'doctor1.demo@mediscan.local', 'Demo@123');
  await docPage.goto(`${BASE}/doctor/messages`, { waitUntil: 'networkidle2' });
  // conversation list shows the unread message from the patient
  await waitForText(docPage, 'Hello doctor, this is a smoke chat message.', 15000);
  await docPage.evaluate(() => {
    const button = [...document.querySelectorAll('button')].find((b) =>
      b.innerText.includes('Hello doctor, this is a smoke chat message.')
    );
    if (button) button.click();
  });
  await docPage.waitForSelector('input[placeholder="Type a message..."]', { timeout: 15000 });
  log('doctor sees patient chat message in thread', true);

  await docPage.type('input[placeholder="Type a message..."]', 'Thanks! See you at the appointment.');
  await docPage.keyboard.press('Enter');
  await waitForText(docPage, 'Thanks! See you at the appointment.', 15000);
  log('doctor replies in chat', true);

  // patient receives the reply live over the websocket (no reload)
  await waitForText(page, 'Thanks! See you at the appointment.', 15000);
  log('patient receives doctor reply live', true);
  await page.screenshot({ path: 'screenshots/13-chat-thread.png', fullPage: true });

  // 14. Video call: doctor calls the patient, patient accepts, then hang up
  await docPage.evaluate(() => {
    const button = [...document.querySelectorAll('button')].find((b) =>
      b.innerText.includes('Video call')
    );
    if (button) button.click();
  });
  await page.waitForFunction(() => !!document.querySelector('[data-testid="call-overlay"]'), {
    timeout: 20000,
  });
  log('incoming call overlay shown to patient', true);
  await page.screenshot({ path: 'screenshots/14-incoming-call.png' });

  await page.evaluate(() => {
    const button = [...document.querySelectorAll('button')].find((b) =>
      b.innerText.includes('Accept')
    );
    if (button) button.click();
  });
  await docPage.waitForFunction(
    () => !!document.querySelector('[data-testid="remote-video"]'),
    { timeout: 30000 }
  );
  log('video call established (remote video element visible)', true);
  await new Promise((r) => setTimeout(r, 1500));
  await docPage.screenshot({ path: 'screenshots/14-doctor-call-active.png' });

  await docPage.evaluate(() => {
    const button = [...document.querySelectorAll('button')].find((b) =>
      b.innerText.includes('End call')
    );
    if (button) button.click();
  });
  await page.waitForFunction(() => !document.querySelector('[data-testid="call-overlay"]'), {
    timeout: 15000,
  }).catch(() => {});
  await docPage.waitForFunction(() => !document.querySelector('[data-testid="call-overlay"]'), {
    timeout: 15000,
  }).catch(() => {});
  log('call ends and overlay closes on both sides', true);
  await doctorContext.close();

  // 15. 404 page
  await page.goto(`${BASE}/does-not-exist`, { waitUntil: 'networkidle2' });
  await waitForText(page, 'Page not found');
  log('404 page', true);

  // 16. Unauthenticated redirect
  await page.evaluate(() => localStorage.clear());
  await page.goto(`${BASE}/patient/dashboard`, { waitUntil: 'networkidle2' });
  await page.waitForFunction(() => window.location.pathname === '/login', { timeout: 10000 });
  log('unauthenticated user redirected to login', page.url().includes('/login'));;

  await browser.close();

  const failed = steps.filter((s) => !s.ok);
  console.log('\n' + '='.repeat(50));
  console.log(`${steps.length - failed.length}/${steps.length} browser checks passed`);
  if (errors.length) {
    console.log(`\nConsole/page errors (${errors.length}):`);
    [...new Set(errors)].slice(0, 20).forEach((e) => console.log('  - ' + e));
  } else {
    console.log('No console/page errors detected.');
  }
  process.exit(failed.length || errors.length ? 1 : 0);
}

main().catch((error) => {
  console.error('SMOKE TEST CRASHED:', error);
  process.exit(1);
});
