const express = require('express');
const path = require('path');
const fs = require('fs');
const session = require('express-session');
const { seedData, getItems } = require('./lib/store');

seedData();

const app = express();
const PORT = 3000;

function buildNav(req) {
  const user = req.session && req.session.user;

  if (!user) {
    return `
      <a href="/browse">Browse</a>
      <a href="/report-lost">Report Lost</a>
      <a href="/report-found">Report Found</a>
      <a href="/login">Login</a>
      <a href="/register" class="nav-action primary">Join</a>
    `;
  }

  return `
    <a href="/browse">Browse</a>
    <a href="/report-lost">Report Lost</a>
    <a href="/report-found">Report Found</a>
    <a href="/my-reports">My Reports</a>
    <span class="user-pill">${user.name.split(' ')[0]}</span>
    <form method="post" action="/logout" class="logout-form">
      <button type="submit" class="nav-action">Logout</button>
    </form>
  `;
}

app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(
  session({
    secret: 'returnly-demo-secret',
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      sameSite: 'lax',
      secure: false,
      maxAge: 1000 * 60 * 60 * 8,
    },
  })
);

app.use('/css', express.static(path.join(__dirname, 'public', 'css')));
app.use('/js', express.static(path.join(__dirname, 'public', 'js')));

app.use((req, res, next) => {
  res.locals.user = req.session && req.session.user ? req.session.user : null;
  next();
});

const authRoutes = require('./routes/auth');
const itemRoutes = require('./routes/items');
const adminRoutes = require('./routes/admin');

app.use('/', authRoutes);
app.use('/', itemRoutes);
app.use('/', adminRoutes);

app.get('/', (req, res) => {
  const recentItems = getItems()
    .filter((item) => item.status === 'approved')
    .slice(0, 3)
    .map((item) => ({
      ...item,
      typeLabel: item.type === 'lost' ? 'Lost' : 'Found',
    }));

  const templatePath = path.join(__dirname, 'views', 'index.html');
  let html = fs.readFileSync(templatePath, 'utf8');

  const itemMarkup = recentItems.length
    ? recentItems
        .map(
          (item) => `
            <article class="item-card">
              <div class="item-card-media">${item.category.split(' ')[0] || 'Item'}</div>
              <div class="item-card-body">
                <div class="item-meta">
                  <span class="badge ${item.type}">${item.typeLabel}</span>
                  <span>${item.category}</span>
                </div>
                <h3>${item.title}</h3>
                <p>${item.description}</p>
                <div class="item-foot">
                  <span>${item.location}</span>
                  <span>${new Date(item.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>
                </div>
              </div>
            </article>
          `
        )
        .join('')
    : '<div class="empty-state">No approved items yet.</div>';

  html = html.replace('<!-- NAV -->', buildNav(req));
  html = html.replace('<!-- ITEMS_PLACEHOLDER -->', itemMarkup);
  res.send(html);
});

app.get('/favicon.svg', (req, res) => {
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" role="img" aria-label="Returnly icon">
      <rect width="64" height="64" rx="14" fill="#0F2A43"/>
      <path d="M16 18h12.5c7.3 0 11.5 4 11.5 10.5 0 6.3-4.1 10.5-11.3 10.5H21.8v12.5H16V18zm12.1 14.5c4.2 0 6.6-1.9 6.6-5.6 0-3.7-2.4-5.6-6.7-5.6H21.8v11.2h6.3z" fill="#FFFFFF"/>
      <circle cx="48" cy="19" r="8" fill="#0E7C86"/>
    </svg>
  `;
  res.type('image/svg+xml').send(svg);
});

app.use((req, res) => {
  res.status(404).sendFile(path.join(__dirname, 'views', '404.html'));
});

app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).sendFile(path.join(__dirname, 'views', '500.html'));
});

app.listen(PORT, () => {
  console.log(`Returnly demo running on http://localhost:${PORT}`);
});
