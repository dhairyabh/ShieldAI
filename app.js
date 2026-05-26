// ══════════════════════════════════════════
//  ShieldAI — app.js
// ══════════════════════════════════════════

// ── Particles ──────────────────────────────
(function createParticles() {
  const container = document.getElementById('particles');
  if (!container) return;
  for (let i = 0; i < 35; i++) {
    const p = document.createElement('div');
    p.className = 'particle';
    const size = Math.random() * 3 + 1;
    p.style.cssText = `
      width:${size}px; height:${size}px;
      left:${Math.random() * 100}%;
      animation-duration:${Math.random() * 12 + 8}s;
      animation-delay:${Math.random() * 10}s;
      opacity:${Math.random() * 0.4 + 0.1};
    `;
    container.appendChild(p);
  }
})();

// ── Navbar scroll effect ────────────────────
window.addEventListener('scroll', () => {
  const nav = document.getElementById('navbar');
  if (nav) nav.classList.toggle('scrolled', window.scrollY > 40);
});

// ── Hamburger menu ──────────────────────────
const hamburger = document.getElementById('hamburger');
const mobileMenu = document.getElementById('mobileMenu');
if (hamburger && mobileMenu) {
  hamburger.addEventListener('click', () => {
    mobileMenu.classList.toggle('open');
  });
  mobileMenu.querySelectorAll('a').forEach(a => {
    a.addEventListener('click', () => mobileMenu.classList.remove('open'));
  });
}

// ── Smooth nav links ────────────────────────
document.querySelectorAll('a[href^="#"]').forEach(a => {
  a.addEventListener('click', e => {
    const target = document.querySelector(a.getAttribute('href'));
    if (target) {
      e.preventDefault();
      target.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  });
});

// ── Counter animation ────────────────────────
function animateCounter(el) {
  const target = parseInt(el.dataset.target);
  const duration = 1800;
  const start = performance.now();
  function update(now) {
    const progress = Math.min((now - start) / duration, 1);
    const eased = 1 - Math.pow(1 - progress, 3);
    el.textContent = Math.floor(eased * target).toLocaleString('en-IN');
    if (progress < 1) requestAnimationFrame(update);
  }
  requestAnimationFrame(update);
}

const countersStarted = new Set();
const counterObserver = new IntersectionObserver(entries => {
  entries.forEach(entry => {
    if (entry.isIntersecting && !countersStarted.has(entry.target)) {
      countersStarted.add(entry.target);
      animateCounter(entry.target);
    }
  });
}, { threshold: 0.5 });

document.querySelectorAll('.stat-number[data-target]').forEach(el => counterObserver.observe(el));

// ── Scroll reveal ────────────────────────────
const revealObserver = new IntersectionObserver(entries => {
  entries.forEach((entry, i) => {
    if (entry.isIntersecting) {
      setTimeout(() => entry.target.classList.add('visible'), i * 120);
      revealObserver.unobserve(entry.target);
    }
  });
}, { threshold: 0.15 });

document.querySelectorAll('.step-card').forEach(el => revealObserver.observe(el));

// ── Demo: example messages ───────────────────
const EXAMPLES = {
  upi: `URGENT: Your SBI account will be BLOCKED in 24 hours due to KYC non-compliance. To avoid suspension, immediately transfer ₹500 verification fee to UPI ID: sbi.kyc.verify@paytm. Share OTP 847291 to confirm. — SBI Customer Care`,
  lottery: `Congratulations! You have won ₹25,00,000 in the Jio Lucky Draw. Your number 9876XXXXXX was selected. To claim your prize, pay ₹2,500 processing fee to UPI: jio.lottery.prize@upi and send your Aadhaar number to confirm identity.`,
  kyc: `Dear Customer, your PhonePe KYC is expired. Your wallet will be DEACTIVATED tonight. Call 9999XXXXXX immediately or pay ₹199 reactivation fee at phonepe.kyc.update@ybl. Failure to act will result in permanent account closure.`,
  safe: `Hi! Are you free this weekend? We're planning a small get-together at Rahul's place on Saturday evening. Let me know if you can make it. Will be fun! 😊`
};

document.querySelectorAll('.example-chip').forEach(btn => {
  btn.addEventListener('click', () => {
    const key = btn.dataset.example;
    const textarea = document.getElementById('demoInput');
    if (textarea && EXAMPLES[key]) {
      textarea.value = EXAMPLES[key];
      textarea.style.borderColor = 'var(--cyan)';
      setTimeout(() => textarea.style.borderColor = '', 600);
    }
  });
});

// ── Demo: Analysis Engine (Connected to FastAPI Backend) ──
async function analyzeMessage() {
  const input = document.getElementById('demoInput');
  const btn = document.getElementById('analyzeBtn');
  const resultDiv = document.getElementById('demoResult');
  const text = input?.value?.trim();

  if (!text) {
    input.style.borderColor = 'var(--red)';
    input.placeholder = '⚠️ Please enter a message to analyze...';
    setTimeout(() => { input.style.borderColor = ''; }, 1500);
    return;
  }

  // Show loading
  const btnText = btn.querySelector('.btn-text');
  const btnLoading = btn.querySelector('.btn-loading');
  btnText.style.display = 'none';
  btnLoading.style.display = 'inline';
  btn.disabled = true;
  if (resultDiv) resultDiv.style.display = 'none';

  const startTime = performance.now();

  try {
    const isLocal = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1' || window.location.protocol === 'file:';
    const endpoint = isLocal ? 'http://localhost:8000/api/analyze' : '/api/analyze';
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ text: text })
    });

    if (!response.ok) {
      throw new Error(`Server error: ${response.statusText}`);
    }

    const result = await response.json();
    const elapsed = ((performance.now() - startTime)).toFixed(0);

    btnText.style.display = 'inline';
    btnLoading.style.display = 'none';
    btn.disabled = false;

    displayResult(result, elapsed + 'ms');
    addToActivityFeed(result, text.slice(0, 60) + '...');
  } catch (error) {
    console.error("Analysis Error:", error);
    btnText.style.display = 'inline';
    btnLoading.style.display = 'none';
    btn.disabled = false;
    alert("Failed to connect to ShieldAI API. Make sure the FastAPI backend is running.");
  }
}


// ── Display Result ────────────────────────────
function displayResult(result, time) {
  const resultDiv = document.getElementById('demoResult');
  resultDiv.style.display = 'block';

  document.getElementById('resultTime').textContent = `⚡ ${time}`;

  const icons = { NEUTRALIZE: '🚫', MONITOR: '⚠️', ESCALATE: '🔴', SAFE: '✅' };
  document.getElementById('verdictIcon').textContent = icons[result.verdict] || '🔍';

  const badge = document.getElementById('verdictBadge');
  badge.textContent = result.verdict;
  badge.className = `verdict-badge ${result.verdict}`;

  document.getElementById('resultJson').textContent = JSON.stringify({
    verdict: result.verdict,
    threat_type: result.threat_type,
    confidence: result.confidence,
    reason: result.reason,
    action: result.action
  }, null, 2);

  document.getElementById('resultDetails').textContent = `📌 ${result.action}`;

  const indicatorsDiv = document.getElementById('threatIndicators');
  indicatorsDiv.innerHTML = result.threats.map(t => `<span class="threat-tag">⚡ ${t}</span>`).join('');

  resultDiv.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

// ── Activity Feed ─────────────────────────────
const FEED_ITEMS = [
  { verdict: 'NEUTRALIZE', text: 'UPI fraud: fake SBI KYC request blocked', time: '2s ago', type: 'UPI_FRAUD' },
  { verdict: 'NEUTRALIZE', text: 'Deepfake voice call from spoofed number', time: '18s ago', type: 'DEEPFAKE_VOICE' },
  { verdict: 'MONITOR', text: 'WhatsApp message with lottery claim link', time: '45s ago', type: 'LOTTERY_FRAUD' },
  { verdict: 'NEUTRALIZE', text: 'OTP harvesting via fake bank SMS', time: '1m ago', type: 'OTP_THEFT' },
  { verdict: 'SAFE', text: 'Personal message — no threat detected', time: '2m ago', type: 'NONE' },
  { verdict: 'NEUTRALIZE', text: 'Income Tax refund scam intercepted', time: '3m ago', type: 'GOVT_IMPERSONATION' },
  { verdict: 'MONITOR', text: 'Suspicious PayTM link with urgency cues', time: '4m ago', type: 'SUSPICIOUS' },
  { verdict: 'ESCALATE', text: 'Coordinated call + SMS attack pattern', time: '6m ago', type: 'COORDINATED' },
];

const verdictColors = {
  NEUTRALIZE: { bg: 'rgba(239,68,68,0.15)', color: '#ef4444', border: 'rgba(239,68,68,0.3)' },
  MONITOR: { bg: 'rgba(245,158,11,0.15)', color: '#f59e0b', border: 'rgba(245,158,11,0.3)' },
  ESCALATE: { bg: 'rgba(59,130,246,0.15)', color: '#3b82f6', border: 'rgba(59,130,246,0.3)' },
  SAFE: { bg: 'rgba(34,197,94,0.15)', color: '#22c55e', border: 'rgba(34,197,94,0.3)' },
};

function renderFeedItem(item) {
  const c = verdictColors[item.verdict] || verdictColors.MONITOR;
  return `
    <div class="activity-item">
      <span class="activity-verdict" style="background:${c.bg};color:${c.color};border:1px solid ${c.border}">
        ${item.verdict}
      </span>
      <div>
        <div class="activity-text">${item.text}</div>
        <div class="activity-time">${item.time}</div>
      </div>
    </div>`;
}

function initActivityFeed() {
  const list = document.getElementById('activityList');
  if (!list) return;
  list.innerHTML = FEED_ITEMS.map(renderFeedItem).join('');
}

function addToActivityFeed(result, preview) {
  const list = document.getElementById('activityList');
  if (!list) return;
  const item = {
    verdict: result.verdict,
    text: preview,
    time: 'just now',
    type: result.threat_type
  };
  list.insertAdjacentHTML('afterbegin', renderFeedItem(item));
  const items = list.querySelectorAll('.activity-item');
  if (items.length > 10) items[items.length - 1].remove();
}

// Auto-update feed with simulated events
function autoUpdateFeed() {
  const fakeEvents = [
    { verdict: 'NEUTRALIZE', text: 'Fake Aadhaar update scam blocked', time: 'just now', type: 'KYC_FRAUD' },
    { verdict: 'MONITOR', text: 'Suspicious call from unknown number', time: 'just now', type: 'SUSPICIOUS' },
    { verdict: 'SAFE', text: 'Verified bank notification passed', time: 'just now', type: 'NONE' },
    { verdict: 'NEUTRALIZE', text: 'WhatsApp deepfake audio intercepted', time: 'just now', type: 'DEEPFAKE_AUDIO' },
    { verdict: 'ESCALATE', text: 'Multi-vector attack — escalated to team', time: 'just now', type: 'COORDINATED' },
  ];
  setInterval(() => {
    const list = document.getElementById('activityList');
    if (!list) return;
    const item = fakeEvents[Math.floor(Math.random() * fakeEvents.length)];
    list.insertAdjacentHTML('afterbegin', renderFeedItem(item));
    const items = list.querySelectorAll('.activity-item');
    if (items.length > 10) items[items.length - 1].remove();
  }, 5000 + Math.random() * 4000);
}

// ── Demo Tabs ─────────────────────────────────
document.querySelectorAll('.demo-tab').forEach(tab => {
  tab.addEventListener('click', () => {
    document.querySelectorAll('.demo-tab').forEach(t => t.classList.remove('active'));
    tab.classList.add('active');
    const textarea = document.getElementById('demoInput');
    if (tab.dataset.tab === 'call') {
      textarea.placeholder = `Paste a call transcript here...\n\nExample:\nCaller: "Sir, I am calling from RBI. Your account has suspicious activity. Please share your OTP 374821 to verify your identity immediately..."`;
    } else {
      textarea.placeholder = `Paste a suspicious WhatsApp message or SMS here...\n\nExample: 'Congratulations! Your SBI account has been flagged. Send ₹500 on UPI ID: sbi.verify@ybl immediately to avoid account suspension.'`;
    }
  });
});

// ── Live counter update ────────────────────────
function updateLiveCounter() {
  const counterEl = document.querySelector('.hero-badge');
  if (!counterEl) return;
  let count = 847;
  setInterval(() => {
    if (Math.random() > 0.6) {
      count += Math.floor(Math.random() * 3) + 1;
      counterEl.innerHTML = `<span class="badge-dot"></span> ACTIVE PROTECTION &nbsp;·&nbsp; ${count.toLocaleString('en-IN')} SCAMS BLOCKED TODAY`;
    }
  }, 3500);
}

// ── Theme Toggle ───────────────────────────────
function initThemeToggle() {
  const toggleBtn = document.getElementById('themeToggle');
  const mobileToggleBtn = document.getElementById('mobileThemeToggle');
  const sunIcon = toggleBtn?.querySelector('.icon-sun');
  const moonIcon = toggleBtn?.querySelector('.icon-moon');
  
  const currentTheme = localStorage.getItem('theme');
  if (currentTheme === 'light') {
    document.body.classList.add('light-theme');
    if (sunIcon && moonIcon) {
      sunIcon.style.display = 'none';
      moonIcon.style.display = 'inline';
    }
    if (mobileToggleBtn) {
      mobileToggleBtn.innerHTML = '🌙 Dark Mode';
    }
  }

  function toggleTheme() {
    document.body.classList.toggle('light-theme');
    const isLight = document.body.classList.contains('light-theme');
    localStorage.setItem('theme', isLight ? 'light' : 'dark');
    
    if (sunIcon && moonIcon) {
      sunIcon.style.display = isLight ? 'none' : 'inline';
      moonIcon.style.display = isLight ? 'inline' : 'none';
    }
    if (mobileToggleBtn) {
      mobileToggleBtn.innerHTML = isLight ? '🌙 Dark Mode' : '☀️ Light Mode';
    }
  }

  if (toggleBtn) toggleBtn.addEventListener('click', toggleTheme);
  if (mobileToggleBtn) mobileToggleBtn.addEventListener('click', toggleTheme);
}

// ── Init ─────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  initActivityFeed();
  autoUpdateFeed();
  updateLiveCounter();
  initThemeToggle();
});
