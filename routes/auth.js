const express = require('express');
const fs = require('fs');
const path = require('path');
const bcrypt = require('bcryptjs');
const { getUsers, writeJSON, USERS_PATH, generateId } = require('../lib/store');
const router = express.Router();

function renderAuthView(fileName, values = {}) {
  const filePath = path.join(__dirname, '..', 'views', fileName);
  let html = fs.readFileSync(filePath, 'utf8');

  Object.entries(values).forEach(([key, value]) => {
    html = html.replace(new RegExp(`{{${key}}}`, 'g'), value || '');
  });

  return html;
}

router.get('/login', (req, res) => {
  res.send(renderAuthView('auth.html', {
    email: '',
    emailError: '',
    passwordError: '',
  }));
});

router.post('/login', (req, res) => {
  const { email, password } = req.body || {};
  const cleanedEmail = String(email || '').trim().toLowerCase();
  const errors = {
    emailError: '',
    passwordError: '',
  };

  if (!cleanedEmail) {
    errors.emailError = 'Email is required.';
  }
  if (!password || password.length < 6) {
    errors.passwordError = 'Password must be at least 6 characters.';
  }

  if (errors.emailError || errors.passwordError) {
    return res.status(400).send(renderAuthView('auth.html', {
      email: cleanedEmail,
      ...errors,
    }));
  }

  const users = getUsers();
  const user = users.find((entry) => entry.email.toLowerCase() === cleanedEmail);

  if (!user || !bcrypt.compareSync(password, user.passwordHash)) {
    return res.status(401).send(renderAuthView('auth.html', {
      email: cleanedEmail,
      emailError: 'Invalid email or password.',
      passwordError: 'Invalid email or password.',
    }));
  }

  req.session.user = {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
  };

  const redirectTo = req.session.returnTo || '/';
  delete req.session.returnTo;
  res.redirect(redirectTo);
});

router.get('/register', (req, res) => {
  res.send(renderAuthView('register.html', {
    name: '',
    email: '',
    nameError: '',
    emailError: '',
    passwordError: '',
  }));
});

router.post('/register', (req, res) => {
  const { name, email, password } = req.body || {};
  const trimmedName = String(name || '').trim();
  const cleanedEmail = String(email || '').trim().toLowerCase();
  const errors = {
    nameError: '',
    emailError: '',
    passwordError: '',
  };

  if (!trimmedName) {
    errors.nameError = 'Name is required.';
  }
  if (!cleanedEmail) {
    errors.emailError = 'Email is required.';
  }
  if (!password || password.length < 6) {
    errors.passwordError = 'Password must be at least 6 characters.';
  }

  const users = getUsers();
  if (cleanedEmail && users.some((entry) => entry.email.toLowerCase() === cleanedEmail)) {
    errors.emailError = 'An account with that email already exists.';
  }

  if (errors.nameError || errors.emailError || errors.passwordError) {
    return res.status(400).send(renderAuthView('register.html', {
      name: trimmedName,
      email: cleanedEmail,
      ...errors,
    }));
  }

  const newUser = {
    id: generateId('user'),
    name: trimmedName,
    email: cleanedEmail,
    passwordHash: bcrypt.hashSync(password, 10),
    role: 'user',
    createdAt: new Date().toISOString(),
  };

  users.push(newUser);
  writeJSON(USERS_PATH, users);

  req.session.user = {
    id: newUser.id,
    name: newUser.name,
    email: newUser.email,
    role: newUser.role,
  };

  res.redirect('/');
});

router.post('/logout', (req, res) => {
  req.session.destroy(() => {
    res.redirect('/');
  });
});

module.exports = router;
