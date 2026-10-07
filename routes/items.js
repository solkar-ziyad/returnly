const express = require('express');
const fs = require('fs');
const path = require('path');
const { getItems, writeJSON, generateId, ITEMS_PATH } = require('../lib/store');

const router = express.Router();

function requireAuth(req, res, next) {
  if (!req.session || !req.session.user) {
    req.session.returnTo = req.originalUrl;
    return res.redirect('/login');
  }
  next();
}

function escapeHtml(value = '') {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

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
    <span class="user-pill">${escapeHtml(user.name.split(' ')[0])}</span>
    <form method="post" action="/logout" class="logout-form">
      <button type="submit" class="nav-action">Logout</button>
    </form>
  `;
}

function renderTemplate(fileName, replacements = {}) {
  const filePath = path.join(__dirname, '..', 'views', fileName);
  let html = fs.readFileSync(filePath, 'utf8');

  Object.entries(replacements).forEach(([key, value]) => {
    html = html.replace(new RegExp(`{{${key}}}`, 'g'), value || '');
  });

  return html;
}

function formatDate(dateString) {
  if (!dateString) return 'Unknown date';
  const date = new Date(dateString);
  return isNaN(date.getTime()) ? dateString : date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function getVisibleItems() {
  return [...getItems()].filter((item) => item.status === 'approved').sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
}

function renderItemCard(item) {
  return `
    <article class="item-card">
      <div class="item-card-media">${escapeHtml(item.category.split(' ')[0] || 'Item')}</div>
      <div class="item-card-body">
        <div class="item-meta">
          <span class="badge ${escapeHtml(item.type)}">${item.type === 'lost' ? 'Lost' : 'Found'}</span>
          <span>${escapeHtml(item.category)}</span>
        </div>
        <h3>${escapeHtml(item.title)}</h3>
        <p>${escapeHtml(item.description)}</p>
        <div class="item-foot">
          <span>${escapeHtml(item.location)}</span>
          <span>${formatDate(item.date).replace(/\s+\d{4}$/, '')}</span>
        </div>
        <div class="item-foot">
          <a href="/items/${escapeHtml(item.id)}" class="inline-link">View details</a>
        </div>
      </div>
    </article>
  `;
}

function renderStatusBadge(status) {
  return `<span class="badge ${escapeHtml(status)}">${escapeHtml(status)}</span>`;
}

function buildCategoryOptions(selectedValue) {
  const categories = ['Electronics', 'Wallets & IDs', 'Bags', 'Keys', 'Clothing', 'Documents'];
  return categories
    .map(
      (category) => `<option value="${escapeHtml(category)}" ${selectedValue === category ? 'selected' : ''}>${escapeHtml(category)}</option>`
    )
    .join('');
}

router.get('/browse', (req, res) => {
  const query = (req.query.q || '').trim();
  const selectedType = req.query.type || 'all';
  const selectedCategory = req.query.category || 'All';

  let items = getVisibleItems();

  if (query) {
    const normalized = query.toLowerCase();
    items = items.filter((item) => [item.title, item.description, item.location, item.category].join(' ').toLowerCase().includes(normalized));
  }

  if (selectedType !== 'all') {
    items = items.filter((item) => item.type === selectedType);
  }

  if (selectedCategory !== 'All') {
    items = items.filter((item) => item.category === selectedCategory);
  }

  const categories = ['All', 'Electronics', 'Wallets & IDs', 'Bags', 'Keys', 'Clothing', 'Documents'];
  const categoryOptions = categories
    .map((category) => `<option value="${escapeHtml(category)}" ${selectedCategory === category ? 'selected' : ''}>${escapeHtml(category)}</option>`)
    .join('');

  const itemCards = items.length
    ? items.map((item) => renderItemCard(item)).join('')
    : '<div class="empty-state">No approved items match your current search.</div>';

  const html = renderTemplate('browse.html', {
    NAV: buildNav(req),
    QUERY: escapeHtml(query),
    CATEGORY_OPTIONS: categoryOptions,
    TYPE_ALL: selectedType === 'all' ? 'selected' : '',
    TYPE_LOST: selectedType === 'lost' ? 'selected' : '',
    TYPE_FOUND: selectedType === 'found' ? 'selected' : '',
    ITEM_CARDS: itemCards,
  });

  res.send(html);
});

router.get('/items/:id', (req, res) => {
  const item = getItems().find((entry) => entry.id === req.params.id);

  if (!item) {
    return res.status(404).send('Item not found');
  }

  const html = renderTemplate('item.html', {
    NAV: buildNav(req),
    ITEM_TITLE: escapeHtml(item.title),
    ITEM_TYPE: item.type === 'lost' ? 'Lost' : 'Found',
    ITEM_CATEGORY: escapeHtml(item.category),
    ITEM_LOCATION: escapeHtml(item.location),
    ITEM_DATE: formatDate(item.date),
    ITEM_DESCRIPTION: escapeHtml(item.description),
    ITEM_STATUS: renderStatusBadge(item.status),
    ITEM_ID: escapeHtml(item.id),
  });

  res.send(html);
});

router.get('/report-lost', requireAuth, (req, res) => {
  const html = renderTemplate('report.html', {
    NAV: buildNav(req),
    FORM_ACTION: '/report-lost',
    TYPE_LABEL: 'Lost item',
    TITLE_VALUE: '',
    DESCRIPTION_VALUE: '',
    LOCATION_VALUE: '',
    DATE_VALUE: '',
    CATEGORY_OPTIONS: buildCategoryOptions('Electronics'),
    TITLE_ERROR: '',
    DESCRIPTION_ERROR: '',
    LOCATION_ERROR: '',
    DATE_ERROR: '',
    CATEGORY_ERROR: '',
  });
  res.send(html);
});

router.get('/report-found', requireAuth, (req, res) => {
  const html = renderTemplate('report.html', {
    NAV: buildNav(req),
    FORM_ACTION: '/report-found',
    TYPE_LABEL: 'Found item',
    TITLE_VALUE: '',
    DESCRIPTION_VALUE: '',
    LOCATION_VALUE: '',
    DATE_VALUE: '',
    CATEGORY_OPTIONS: buildCategoryOptions('Electronics'),
    TITLE_ERROR: '',
    DESCRIPTION_ERROR: '',
    LOCATION_ERROR: '',
    DATE_ERROR: '',
    CATEGORY_ERROR: '',
  });
  res.send(html);
});

function handleItemSubmission(req, res, type) {
  const { title, description, category, location, date } = req.body || {};
  const errors = {
    titleError: '',
    descriptionError: '',
    locationError: '',
    dateError: '',
    categoryError: '',
  };

  const cleanTitle = String(title || '').trim();
  const cleanDescription = String(description || '').trim();
  const cleanCategory = String(category || '').trim();
  const cleanLocation = String(location || '').trim();
  const cleanDate = String(date || '').trim();

  if (!cleanTitle) errors.titleError = 'Title is required.';
  if (cleanDescription.length < 10) errors.descriptionError = 'Description must be at least 10 characters.';
  if (!cleanLocation) errors.locationError = 'Location is required.';
  if (!cleanDate) errors.dateError = 'Date is required.';
  if (!cleanCategory) errors.categoryError = 'Please select a category.';

  if (Object.values(errors).some(Boolean)) {
    const html = renderTemplate('report.html', {
      NAV: buildNav(req),
      FORM_ACTION: type === 'lost' ? '/report-lost' : '/report-found',
      TYPE_LABEL: type === 'lost' ? 'Lost item' : 'Found item',
      TITLE_VALUE: escapeHtml(cleanTitle),
      DESCRIPTION_VALUE: escapeHtml(cleanDescription),
      LOCATION_VALUE: escapeHtml(cleanLocation),
      DATE_VALUE: escapeHtml(cleanDate),
      CATEGORY_OPTIONS: buildCategoryOptions(cleanCategory || 'Electronics'),
      TITLE_ERROR: errors.titleError,
      DESCRIPTION_ERROR: errors.descriptionError,
      LOCATION_ERROR: errors.locationError,
      DATE_ERROR: errors.dateError,
      CATEGORY_ERROR: errors.categoryError,
    });
    return res.status(400).send(html);
  }

  const items = getItems();
  const newItem = {
    id: generateId('item'),
    type,
    title: cleanTitle,
    description: cleanDescription,
    category: cleanCategory,
    location: cleanLocation,
    date: cleanDate,
    imageUrl: '',
    status: 'pending',
    reporterId: req.session.user.id,
    createdAt: new Date().toISOString(),
  };

  items.push(newItem);
  writeJSON(ITEMS_PATH, items);

  res.redirect('/my-reports');
}

router.post('/report-lost', requireAuth, (req, res) => {
  handleItemSubmission(req, res, 'lost');
});

router.post('/report-found', requireAuth, (req, res) => {
  handleItemSubmission(req, res, 'found');
});

router.get('/my-reports', requireAuth, (req, res) => {
  const items = [...getItems()].filter((item) => item.reporterId === req.session.user.id).sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

  const itemRows = items.length
    ? items
        .map(
          (item) => `
            <tr>
              <td>${escapeHtml(item.title)}</td>
              <td>${escapeHtml(item.type)}</td>
              <td>${escapeHtml(item.category)}</td>
              <td>${escapeHtml(item.location)}</td>
              <td>${renderStatusBadge(item.status)}</td>
              <td>${formatDate(item.date)}</td>
            </tr>
          `
        )
        .join('')
    : '<tr><td colspan="6"><div class="empty-state">You have not submitted any reports yet.</div></td></tr>';

  const html = renderTemplate('my_reports.html', {
    NAV: buildNav(req),
    REPORT_ROWS: itemRows,
  });

  res.send(html);
});

module.exports = router;
