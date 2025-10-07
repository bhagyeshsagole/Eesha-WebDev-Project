/*
File: app.js
Purpose: Front-end behavior and demo data (no backend).
Boot: Adds body 'ready' class, current year, mobile nav toggle, scroll reveal.

Modules / Responsibilities:
  1) Quick Quote (Home):
     - Form: #miniQuote → estimatePrice(kg, zone) → #miniQuoteOut (aria-live)
  2) Quick Track (Home):
     - Form: #miniTrack → fakeTracking(tn) → renderTimeline() into #miniTrackOut
  3) Booking Page:
     - #bookingForm input → live #quote update (kg/zone/service)
     - Submit → confirmation message with makeRef()
  4) Tracking Page:
     - #trackForm submit → progress bar (#trackProgress) + timeline (#trackResult)
  5) Supplies Store:
     - PRODUCTS[] constant
     - renderProducts() → product cards with “Add to cart”
     - Cart in localStorage: getCart/setCart/addToCart/changeQty/renderCart
     - #checkoutBtn → clears cart and shows #cartMsg (demo)
  6) Auth Tabs:
     - switchTab(name) toggles tab buttons and panels
     - #loginForm/#signupForm show inline success messages (demo)

Utilities:
  - qs/qsa/byId (selectors), fmt (currency), msg (inline toast), makeRef (SS########)
  - estimatePrice() – simple zone/service pricing heuristic
  - fakeTracking() – generates sample timeline + progress
  - renderTimeline() – builds timeline HTML

Integration TODOs:
  - Replace fakeTracking/estimatePrice with real endpoints.
  - Persist bookings to backend; secure auth; real checkout flow.
*/

/* Boot */
document.addEventListener('DOMContentLoaded', () => {
  document.body.classList.add('ready');
  byId('y')?.append(new Date().getFullYear());

  // Nav toggle (mobile)
  const navToggle = byId('navToggle');
  const nav = qs('[data-nav]');
  navToggle?.addEventListener('click', () => {
    nav?.classList.toggle('open');
  });

  // Scroll reveal
  const obs = new IntersectionObserver((entries) => {
    entries.forEach(e => { if (e.isIntersecting) e.target.classList.add('reveal-in'); });
  }, { threshold: 0.14 });
  qsa('.reveal').forEach(el => obs.observe(el));

  // Mini quote on home
  byId('miniQuote')?.addEventListener('submit', (e) => {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const out = byId('miniQuoteOut');
    const price = estimatePrice(Number(f.get('kg')), f.get('zone'));
    out.textContent = `Estimated: ${fmt(price)} • No card required`;
  });

  // Mini track on home
  byId('miniTrack')?.addEventListener('submit', (e) => {
    e.preventDefault();
    const tn = new FormData(e.currentTarget).get('tn');
    const out = byId('miniTrackOut');
    out.innerHTML = renderTimeline(fakeTracking(String(tn)));
  });

  // Full booking page
  const bookingForm = byId('bookingForm');
  if (bookingForm) {
    const quote = byId('quote');
    bookingForm.addEventListener('input', () => {
      const f = new FormData(bookingForm);
      const kg = Number(f.get('kg') || 0);
      const zone = f.get('zone');
      quote.textContent = kg > 0 ? fmt(estimatePrice(kg, zone)) : '—';
    });
    bookingForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const f = Object.fromEntries(new FormData(bookingForm).entries());
      byId('bookOut').textContent = `Booked! Pickup ${f.date} at ${f.time}. Ref: ${makeRef()}`;
      bookingForm.reset();
      quote.textContent = '—';
    });
  }

  // Tracking page
  const trackForm = byId('trackForm');
  if (trackForm) {
    trackForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const tn = byId('trackingNumber').value.trim();
      const res = byId('trackResult');
      const bar = byId('trackProgress');
      const data = fakeTracking(tn);
      res.innerHTML = renderTimeline(data);
      bar.style.width = `${data.progress}%`;
    });
  }

  // Supplies page
  if (location.pathname.endsWith('supplies.html')) {
    renderProducts();
    renderCart();
    byId('checkoutBtn')?.addEventListener('click', () => {
      const items = getCart();
      if (!items.length) { msg('cartMsg', 'Your cart is empty.'); return; }
      setCart([]); renderCart(); msg('cartMsg', 'Order placed! Confirmation sent to your email.');
    });
  }

  // Auth tabs
  qsa('.tab').forEach(btn => btn.addEventListener('click', () => switchTab(btn.dataset.tab)));
  byId('loginForm')?.addEventListener('submit', (e) => { e.preventDefault(); msg('loginMsg', 'Welcome back! 🎉'); });
  byId('signupForm')?.addEventListener('submit', (e) => { e.preventDefault(); msg('signupMsg', 'Account created. You can now log in.'); });
});

/* Utils */
const qs = (s, el=document) => el.querySelector(s);
const qsa = (s, el=document) => Array.from(el.querySelectorAll(s));
const byId = (id) => document.getElementById(id);
const fmt = (n) => n.toLocaleString(undefined, { style:'currency', currency:'USD' });
const msg = (id, text) => { const el = byId(id); if (el) { el.textContent = text; setTimeout(()=> el.textContent='', 3500);} }
const makeRef = () => 'SS' + Math.floor(1e8 + Math.random()*9e8);

/* Pricing Engine (simple, feel-good numbers) */
function estimatePrice(kg=1, zone='local', service='standard'){
  const zoneBase = { local:6, regional:12, national:22, international:48 }[zone] ?? 12;
  const perKg = { local:1.2, regional:1.8, national:2.4, international:4.5 }[zone] ?? 1.8;
  const svc = { express:1.35, standard:1.0, economy:0.85 }[service] ?? 1.0;
  const price = (zoneBase + perKg * Math.max(0.5, kg)) * svc;
  return Math.max(5, Math.round(price * 100) / 100);
}

/* Fake tracking generator (demo) */
function fakeTracking(tn){
  const ok = /^SS\d{6,}$/.test(tn);
  const steps = ok ? [
    { t: '- 1d 6h', title:'Order created', desc:`Label generated for ${tn}` },
    { t: '- 1d 4h', title:'Picked up', desc:'Courier collected the package' },
    { t: '- 16h',  title:'At facility', desc:'Sorted at hub' },
    { t: '- 6h',   title:'In transit', desc:'Departed regional center' },
    { t: 'ETA',    title:'Out for delivery', desc:'Courier is on the way' },
  ] : [
    { t: '—', title:'Not found', desc:'Check the number and try again (format SS########)' }
  ];
  const progress = ok ? 82 : 0;
  return { steps, progress };
}

/* Render timeline HTML */
function renderTimeline(data){
  return data.steps.map(s => `
    <div class="timeline-item">
      <div class="timeline-dot"></div>
      <div class="timeline-text">
        <strong>${s.title}</strong><br/>
        <small>${s.t}</small><div>${s.desc}</div>
      </div>
    </div>
  `).join('');
}

/* Products + Cart */
const PRODUCTS = [
  { id:'bx-s', name:'Shipping Box (Small)', price:1.99, desc:'25 × 20 × 15 cm, corrugated' },
  { id:'bx-m', name:'Shipping Box (Medium)', price:2.99, desc:'35 × 25 × 20 cm, corrugated' },
  { id:'bx-l', name:'Shipping Box (Large)', price:4.49, desc:'45 × 35 × 30 cm, corrugated' },
  { id:'tap',  name:'Packing Tape', price:2.49, desc:'48mm x 50m, clear' },
  { id:'bub',  name:'Bubble Wrap', price:3.99, desc:'30cm x 5m' },
  { id:'lbl',  name:'Printed Labels (10x)', price:1.49, desc:'Thermal, adhesive' },
];

function renderProducts(){
  const wrap = byId('products');
  if (!wrap) return;
  wrap.innerHTML = PRODUCTS.map(p => `
    <article class="card hover-raise">
      <h3>${p.name}</h3>
      <p class="muted">${p.desc}</p>
      <div class="quote-bar">
        <div class="quote-amount">${fmt(p.price)}</div>
        <button class="btn btn-primary" data-add="${p.id}" type="button">Add to cart</button>
      </div>
    </article>
  `).join('');
  qsa('[data-add]').forEach(btn => btn.addEventListener('click', () => {
    addToCart(btn.dataset.add); renderCart();
  }));
}

function getCart(){ return JSON.parse(localStorage.getItem('cart') || '[]'); }
function setCart(items){ localStorage.setItem('cart', JSON.stringify(items)); }
function addToCart(id){
  const cart = getCart();
  const item = cart.find(x => x.id === id);
  if (item) item.qty += 1; else cart.push({ id, qty:1 });
  setCart(cart);
}

function renderCart(){
  const box = byId('cartItems'); const total = byId('cartTotal');
  if (!box || !total) return;
  const cart = getCart();
  if (!cart.length){ box.innerHTML = '<p class="muted">Your cart is empty.</p>'; total.textContent = fmt(0); return; }
  const rows = cart.map(it => {
    const p = PRODUCTS.find(x => x.id === it.id);
    return `
      <div class="cart-item">
        <div><strong>${p.name}</strong><div class="muted">${fmt(p.price)} each</div></div>
        <div class="qty">
          <button type="button" data-dec="${it.id}">−</button>
          <span>${it.qty}</span>
          <button type="button" data-inc="${it.id}">+</button>
        </div>
        <div><strong>${fmt(p.price * it.qty)}</strong></div>
      </div>
    `;
  }).join('');
  box.innerHTML = rows;
  const sum = cart.reduce((s, it) => {
    const p = PRODUCTS.find(x => x.id === it.id); return s + p.price * it.qty;
  }, 0);
  total.textContent = fmt(sum);

  qsa('[data-inc]').forEach(b => b.addEventListener('click', () => { changeQty(b.dataset.inc, +1); }));
  qsa('[data-dec]').forEach(b => b.addEventListener('click', () => { changeQty(b.dataset.dec, -1); }));
}
function changeQty(id, d){
  const cart = getCart().map(it => it.id===id? {...it, qty: Math.max(0, it.qty + d)}: it).filter(it => it.qty>0);
  setCart(cart); renderCart();
}

/* Auth tabs */
function switchTab(name){
  qsa('.tab').forEach(t => t.classList.toggle('active', t.dataset.tab===name));
  qsa('.tabpanel').forEach(p => p.classList.toggle('hidden', p.dataset.panel!==name));
}
