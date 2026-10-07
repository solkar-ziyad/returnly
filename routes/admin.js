const express = require('express');
const fs = require('fs');
const path = require('path');
const bcrypt = require('bcryptjs');
const { getUsers, getItems, writeJSON, USERS_PATH, ITEMS_PATH } = require('../lib/store');

const router = express.Router();

function escapeHtml(value = '') {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function renderAdminTemplate(fileName, values = {}) {
  const filePath = path.join(__dirname, '..', 'views', fileName);
  let html = fs.readFileSync(filePath, 'utf8');

  Object.entries(values).forEach(([key, value]) => {
    html = html.replace(new RegExp(`{{${key}}}`, 'g'), value || '');
  });

  return html;
}

function requireAdmin(req, res, next) {
  if (!req.session || !req.session.user || req.session.user.role !== 'admin') {
    return res.redirect('/admin/login');
  }
  next();
}

function statusBadge(status) {
  const normalized = status || 'pending';
  return `<span class="badge ${escapeHtml(normalized)}">${escapeHtml(normalized)}</span>`;
}

function formatDate(dateString) {
  if (!dateString) return 'Unknown';
  const d = new Date(dateString);
  return isNaN(d.getTime()) ? dateString : d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

router.get('/admin/login', (req, res) => {
  res.send(renderAdminTemplate('admin_login.html', {
    LOGIN_ERROR: '',
    EMAIL_VALUE: '',
  }));
});

router.post('/admin/login', (req, res) => {
  const email = String(req.body.email || '').trim().toLowerCase();
  const password = String(req.body.password || '');
  const users = getUsers();
  const admin = users.find((user) => user.email.toLowerCase() === email && user.role === 'admin');

  if (!admin || !bcrypt.compareSync(password, admin.passwordHash)) {
    return res.status(401).send(renderAdminTemplate('admin_login.html', {
      LOGIN_ERROR: 'Invalid admin credentials.',
      EMAIL_VALUE: escapeHtml(email),
    }));
  }

  req.session.user = {
    id: admin.id,
    name: admin.name,
    email: admin.email,
    role: admin.role,
  };

  res.redirect('/admin');
});

router.get('/admin', requireAdmin, (req, res) => {
  const allItems = getItems();
  const users = getUsers();

  const total = allItems.length;
  const pending = allItems.filter((item) => item.status === 'pending').length;
  const approved = allItems.filter((item) => item.status === 'approved').length;
  const resolved = allItems.filter((item) => item.status === 'resolved').length;

  const pendingRows = allItems
    .filter((item) => item.status === 'pending')
    .map(
      (item) => `
        <tr>
          <td>${escapeHtml(item.title)}</td>
          <td>${escapeHtml(item.type)}</td>
          <td>${escapeHtml(item.category)}</td>
          <td>${escapeHtml(item.location)}</td>
          <td>${statusBadge(item.status)}</td>
          <td>
            <form method="post" action="/admin/items/${escapeHtml(item.id)}/approve" class="inline-form">
              <button type="submit" class="btn btn-accent">Approve</button>
            </form>
          </td>
        </tr>
      `
    )
    .join('');

  const allItemsRows = allItems
    .map(
      (item) => `
        <tr>
          <td>${escapeHtml(item.title)}</td>
          <td>${escapeHtml(item.type)}</td>
          <td>${escapeHtml(item.category)}</td>
          <td>${escapeHtml(item.location)}</td>
          <td>${statusBadge(item.status)}</td>
          <td>${formatDate(item.date)}</td>
          <td>
            <div class="table-actions">
              <form method="post" action="/admin/items/${escapeHtml(item.id)}/approve">
                <button type="submit" class="btn btn-secondary">Approve</button>
              </form>
              <form method="post" action="/admin/items/${escapeHtml(item.id)}/resolve">
                <button type="submit" class="btn btn-accent">Resolve</button>
              </form>
              <form method="post" action="/admin/items/${escapeHtml(item.id)}/delete">
                <button type="submit" class="btn btn-secondary danger">Delete</button>
              </form>
            </div>
          </td>
        </tr>
      `
    )
    .join('');

  const userRows = users
    .map(
      (user) => `
        <tr>
          <td>${escapeHtml(user.name)}</td>
          <td>${escapeHtml(user.email)}</td>
          <td>${escapeHtml(user.role)}</td>
          <td>${formatDate(user.createdAt)}</td>
        </tr>
      `
    )
    .join('');

  const html = renderAdminTemplate('admin_dashboard.html', {
    TOTAL_COUNT: String(total),
    PENDING_COUNT: String(pending),
    APPROVED_COUNT: String(approved),
    RESOLVED_COUNT: String(resolved),
    USERS_COUNT: String(users.length),
    PENDING_ROWS: pendingRows || '<tr><td colspan="6"><div class="empty-state">No pending items</div></td></tr>',
    ALL_ITEMS_ROWS: allItemsRows || '<tr><td colspan="7"><div class="empty-state">No items found</div></td></tr>',
    USERS_ROWS: userRows || '<tr><td colspan="4"><div class="empty-state">No users found</div></td></tr>',
  });

  res.send(html);
});

router.post('/admin/items/:id/approve', requireAdmin, (req, res) => {
  const items = getItems();
  const item = items.find((entry) => entry.id === req.params.id);

  if (item) {
    item.status = 'approved';
    writeJSON(ITEMS_PATH, items);
  }

  res.redirect('/admin');
});

router.post('/admin/items/:id/resolve', requireAdmin, (req, res) => {
  const items = getItems();
  const item = items.find((entry) => entry.id === req.params.id);

  if (item) {
    item.status = 'resolved';
    writeJSON(ITEMS_PATH, items);
  }

  res.redirect('/admin');
});

router.post('/admin/items/:id/delete', requireAdmin, (req, res) => {
  const items = getItems();
  const updatedItems = items.filter((entry) => entry.id !== req.params.id);
  writeJSON(ITEMS_PATH, updatedItems);
  res.redirect('/admin');
});

module.exports = router;
