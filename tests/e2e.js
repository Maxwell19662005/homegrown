// End-to-end check of the main flows. Run against a freshly seeded app:
//   rm -rf data && npm run seed && npm run build && npm start   (in one terminal)
//   node tests/e2e.js [screenshot-folder]                       (in another; needs Playwright installed)
const { chromium } = require('playwright');
const B = process.env.BASE_URL || 'http://localhost:3000';
const fs = require('fs');
const os = require('os');
const path = require('path');
// Tiny test images, written to a temp folder.
const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'hg-e2e-'));
const JPG = Buffer.from('/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAMCAgICAgMCAgIDAwMDBAYEBAQEBAgGBgUGCQgKCgkICQkKDA8MCgsOCwkJDRENDg8QEBEQCgwSExIQEw8QEBD/yQALCAABAAEBAREA/8wABgAQEAX/2gAIAQEAAD8A0s8g/9k=', 'base64');
for (let i = 0; i < 7; i++) fs.writeFileSync(path.join(dir, `img${i}.jpg`), JPG);
const shots = process.argv[2];
let step = 0;
async function snap(page, name) { if (shots) await page.screenshot({ path: `${shots}/${String(++step).padStart(2,'0')}-${name}.png`, fullPage: false }); }
async function vis(l) { try { await l.first().waitFor({ state: 'visible', timeout: 8000 }); return true; } catch { return false; } }
async function gone(l) { try { await l.first().waitFor({ state: 'detached', timeout: 8000 }); return true; } catch { return false; } }
function check(cond, msg) { if (!cond) throw new Error('FAILED: ' + msg); console.log('ok -', msg); }

(async () => {
  const browser = await chromium.launch();
  const ctx = () => browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 });

  // 1. Buyer browses and reserves
  const buyer = await (await ctx()).newPage();
  await buyer.goto(B + '/'); await snap(buyer, 'discover');
  check(await vis(buyer.getByText('Heirloom cherry tomatoes')), 'feed shows seeded listing');
  await buyer.getByRole('link', { name: 'Baked' }).click();
  await buyer.waitForURL(/cat=baked/);
  check(await gone(buyer.getByText('Heirloom cherry tomatoes')), 'category filter hides produce');
  await buyer.goto(B + '/?q=honey');
  check(await vis(buyer.getByText('Raw wildflower honey')), 'search finds honey');
  await buyer.goto(B + '/');
  await buyer.getByText('Heirloom cherry tomatoes').click();
  await buyer.waitForURL(/listings\//); await snap(buyer, 'listing');
  check(await vis(buyer.getByText('Exact address shared after you reserve')), 'address hidden before reserving');
  await buyer.getByRole('link', { name: 'Log in to reserve' }).click();
  await buyer.fill('input[name=email]', 'buyer@example.com');
  await buyer.fill('input[name=password]', 'password123');
  await buyer.getByRole('button', { name: 'Log in' }).click();
  await buyer.waitForURL(/listings\//);
  await buyer.getByRole('button', { name: 'Increase quantity' }).click();
  check(await vis(buyer.getByRole('button', { name: /Reserve · \$10\.75/ })), 'total = 2 x $5 + $0.75');
  await buyer.getByRole('button', { name: /Reserve/ }).click();
  await buyer.waitForURL(/orders\/.*new=1/); await snap(buyer, 'confirmation');
  check(await vis(buyer.getByText('You’re all set')), 'confirmation shown');
  const code = (await buyer.locator('.tracking-\\[0\\.12em\\]').innerText()).trim();
  check(/^\d{4}$/.test(code), 'pickup code ' + code);
  check(await vis(buyer.getByText('1B Sample St')), 'address revealed after reserving');
  const orderUrl = buyer.url().split('?')[0];

  // 2. Seller (Rosa) sees order and confirms pickup
  const rosa = await (await ctx()).newPage();
  await rosa.goto(B + '/login?next=/sell');
  await rosa.fill('input[name=email]', 'rosa@example.com');
  await rosa.fill('input[name=password]', 'password123');
  await rosa.getByRole('button', { name: 'Log in' }).click();
  await rosa.waitForURL(u => u.pathname === '/sell'); await snap(rosa, 'seller-dashboard');
  check(await vis(rosa.getByText('For Jordan')), 'seller sees reservation');
  await rosa.fill('input[name=code]', '0000');
  await rosa.getByRole('button', { name: 'Confirm' }).click();
  await rosa.waitForURL(/error=/);
  check(await vis(rosa.getByText('doesn’t match')), 'wrong code rejected');
  await rosa.fill('input[name=code]', code);
  await rosa.getByRole('button', { name: 'Confirm' }).click();
  await rosa.waitForURL(/notice=/);
  check(await vis(rosa.getByText('Pickup confirmed')), 'pickup confirmed');

  // 3. Buyer reviews
  await buyer.goto(orderUrl);
  await buyer.getByRole('button', { name: '5 stars' }).click();
  await buyer.fill('textarea[name=comment]', 'Best tomatoes on the block');
  await buyer.getByRole('button', { name: 'Post review' }).click();
  await buyer.waitForURL(/notice=/);
  check(await vis(buyer.getByText('Thanks for your review')), 'review posted');

  // 4. Buyer reserves bread, then reports a food-safety problem -> listing suspended
  await buyer.goto(B + '/?q=Sourdough');
  await buyer.getByText('Sourdough country loaf').click();
  check(await vis(buyer.getByText('Contains: Wheat')), 'allergens shown on baked item');
  await buyer.getByRole('button', { name: /Reserve/ }).click();
  await buyer.waitForURL(/orders\//);
  const breadOrder = buyer.url().split('?')[0];
  await buyer.getByRole('link', { name: /Report a problem/ }).click();
  await buyer.check('input[value=food_safety]');
  await buyer.fill('textarea[name=details]', 'Found a piece of plastic baked into the loaf.');
  await buyer.getByRole('button', { name: 'Send report' }).click();
  await buyer.waitForURL(/notice=/);
  await buyer.goto(B + '/?q=Sourdough');
  check(await gone(buyer.getByText('Sourdough country loaf')), 'reported listing removed from feed');

  // 5. New grower signs up, sets up, posts a listing with a photo
  const g = await (await ctx()).newPage();
  await g.goto(B + '/signup?next=/sell');
  await g.fill('input[name=name]', 'Ana'); await g.fill('input[name=email]', 'ana@example.com');
  await g.fill('input[name=password]', 'password123'); await g.selectOption('select[name=neighborhood]', 'Ridgewood');
  await g.getByRole('button', { name: 'Create account' }).click();
  await g.waitForURL(/\/sell$/); await snap(g, 'seller-type');
  await g.fill('input[name=display_name]', 'Ana’s Herbs');
  await g.getByRole('button', { name: 'Continue' }).click();
  await g.waitForURL(/sell\/setup/);
  await g.fill('input[name=pickup_address]', '22 Demo Ave'); await g.getByRole('button', { name: 'Save details' }).click();
  await g.waitForURL(/notice=/);
  await g.locator('#phone input[name=value]').fill('7185550199'); await g.locator('#phone button[type=submit]').click(); await g.locator('#phone span.bg-leaf').waitFor({ timeout: 10000 });
  await g.locator('#own input[type=checkbox]').check(); await g.locator('#own button[type=submit]').click(); await g.locator('#own span.bg-leaf').waitFor({ timeout: 10000 });
  await g.locator('#payout button[type=submit]').click(); await g.locator('#payout span.bg-leaf').waitFor({ timeout: 10000 });
  await g.goto(B + '/sell'); await snap(g, 'new-seller-dashboard');
  check(await vis(g.getByRole('link', { name: /Post what’s ready/ })), 'grower auto-approved after setup');
  await g.getByRole('link', { name: /Post what’s ready/ }).click();
  await g.setInputFiles('input[name=photo]', dir + '/img0.jpg');
  await g.fill('input[name=title]', 'Thai basil bunch');
  await g.fill('input[name=price]', '3');
  await snap(g, 'new-listing');
  await g.getByRole('button', { name: 'Post listing' }).click();
  await g.waitForURL(/sell\?notice=/);
  check(await vis(g.getByText('Your listing is live')), 'listing posted');
  await buyer.goto(B + '/?q=basil');
  check(await vis(buyer.getByText('Thai basil bunch')), 'new listing visible to buyers');
  check(await buyer.locator('img[alt="Thai basil bunch"]').count() === 1, 'listing photo shown');

  // 6. New baker: uploads docs, goes to review; admin approves; prohibited item blocked
  const k = await (await ctx()).newPage();
  await k.goto(B + '/signup?next=/sell');
  await k.fill('input[name=name]', 'Bea'); await k.fill('input[name=email]', 'bea@example.com');
  await k.fill('input[name=password]', 'password123'); await k.selectOption('select[name=neighborhood]', 'Ridgewood');
  await k.getByRole('button', { name: 'Create account' }).click();
  await k.waitForURL(/\/sell$/);
  await k.locator('label', { hasText: 'Home baker' }).click();
  await k.fill('input[name=display_name]', 'Bea Bakes');
  await k.getByRole('button', { name: 'Continue' }).click();
  await k.waitForURL(/sell\/setup/);
  await k.fill('input[name=pickup_address]', '5 Demo Pl'); await k.getByRole('button', { name: 'Save details' }).click(); await k.waitForURL(/notice=/);
  await k.locator('#reg input[type=file]').setInputFiles(dir + '/img1.jpg'); await k.locator('#reg button[type=submit]').click(); await k.locator('#reg span.bg-leaf').waitFor({ timeout: 10000 });
  await k.locator('#cert input[type=file]').setInputFiles(dir + '/img2.jpg'); await k.locator('#cert button[type=submit]').click(); await k.locator('#cert span.bg-leaf').waitFor({ timeout: 10000 });
  await k.locator('#photos input[type=file]').setInputFiles([1,2,3,4,5,6].map(i => `${dir}/img${i}.jpg`)); await k.locator('#photos button[type=submit]').click(); await k.locator('#photos span.bg-leaf').waitFor({ timeout: 10000 });
  await k.locator('#self input[name=agree]').check(); await k.locator('#self input[name=value]').fill('Bea Baker'); await k.locator('#self button[type=submit]').click(); await k.locator('#self span.bg-leaf').waitFor({ timeout: 10000 });
  await k.locator('#phone input[name=value]').fill('7185550123'); await k.locator('#phone button[type=submit]').click(); await k.locator('#phone span.bg-leaf').waitFor({ timeout: 10000 });
  await k.locator('#payout button[type=submit]').click(); await k.locator('#payout span.bg-leaf').waitFor({ timeout: 10000 });
  await k.goto(B + '/sell'); await snap(k, 'baker-pending');
  check(await vis(k.getByText('Your kitchen is in review')), 'baker goes to review');
  // private docs are not public
  const anon = await (await ctx()).newPage();
  const docLink = await (await k.goto(B + '/sell/setup'), k.locator('a[href*="/api/files/private/"]').first().getAttribute('href'));
  const res = await anon.goto(B + docLink);
  check(res.status() === 404, 'private documents hidden from strangers');

  const admin = await (await ctx()).newPage();
  await admin.goto(B + '/login?next=/admin');
  await admin.fill('input[name=email]', 'admin@example.com'); await admin.fill('input[name=password]', 'password123');
  await admin.getByRole('button', { name: 'Log in' }).click();
  await admin.waitForURL(u => u.pathname === '/admin'); await snap(admin, 'admin');
  check(await vis(admin.getByText('Found a piece of plastic')), 'admin sees food safety report');
  check(await admin.getByText('Bea Bakes').first().isVisible(), 'admin sees pending baker');
  const res2 = await admin.goto(B + docLink); check(res2.status() === 200, 'admin can open documents');
  await admin.goto(B + '/admin');
  await admin.getByRole('button', { name: 'Approve' }).click();
  await admin.waitForURL(/notice=/);
  await admin.getByRole('button', { name: 'Dismiss & restore' }).click();
  await admin.waitForURL(/notice=/);
  await buyer.goto(B + '/?q=Sourdough');
  check(await vis(buyer.getByText('Sourdough country loaf')), 'dismissed report restores listing');

  await k.goto(B + '/sell/listings/new');
  await k.fill('input[name=title]', 'Strawberry cheesecake'); await k.fill('input[name=price]', '20');
  await k.getByRole('button', { name: 'Post listing' }).click();
  check(await vis(k.getByRole('alert').filter({ hasText: 'Select the allergens' })), 'baked listing requires allergens');
  check((await k.inputValue('input[name=title]')) === 'Strawberry cheesecake', 'form keeps typed values after an error');
  await k.locator('label', { hasText: 'Wheat' }).first().click(); await k.locator('label', { hasText: 'Milk' }).first().click();
  await k.getByRole('button', { name: 'Post listing' }).click();
  check(await vis(k.getByRole('alert').filter({ hasText: 'need refrigeration' })), 'refrigerated item blocked');
  await snap(k, 'blocked-item');
  await k.fill('input[name=title]', 'Brown butter shortbread'); await k.fill('textarea[name=description]', 'Six cookies per bag.');
  await k.getByRole('button', { name: 'Post listing' }).click();
  await k.waitForURL(/sell\?notice=/);
  check(await vis(k.getByText('Brown butter shortbread')), 'approved baker can post');

  // 7. Buyer cancels a reservation -> stock restored
  await buyer.goto(B + '/?q=seedlings'); await buyer.getByText('Pepper & tomato seedlings').click();
  const before = await buyer.getByText(/available$/).innerText();
  await buyer.getByRole('button', { name: /Reserve/ }).click(); await buyer.waitForURL(/orders\//);
  await buyer.getByRole('button', { name: 'Cancel order' }).click(); await buyer.waitForURL(/notice=/);
  await buyer.goto(B + '/?q=seedlings'); await buyer.getByText('Pepper & tomato seedlings').click();
  check((await buyer.getByText(/available$/).innerText()) === before, 'cancel restores stock (' + before + ')');
  await buyer.goto(B + '/orders'); await snap(buyer, 'orders');
  await buyer.goto(B + '/map'); await buyer.waitForTimeout(1500); await snap(buyer, 'map');
  check(await buyer.locator('.leaflet-marker-icon').count() >= 5, 'map shows pins');

  await browser.close();
  console.log('\nALL CHECKS PASSED');
})().catch((e) => { console.error(e.message); process.exit(1); });
