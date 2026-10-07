const fs = require('fs');
const path = require('path');
const bcrypt = require('bcryptjs');

const DATA_DIR = path.join(__dirname, '..', 'data');
const USERS_PATH = path.join(DATA_DIR, 'users.json');
const ITEMS_PATH = path.join(DATA_DIR, 'items.json');

function ensureDirectory() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
}

function readJSON(filePath, fallback) {
  if (!fs.existsSync(filePath)) {
    return fallback;
  }

  try {
    const content = fs.readFileSync(filePath, 'utf8');
    return content ? JSON.parse(content) : fallback;
  } catch (error) {
    return fallback;
  }
}

function writeJSON(filePath, data) {
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
}

function generateId(prefix) {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

function seedData() {
  ensureDirectory();

  const users = readJSON(USERS_PATH, []);
  if (users.length === 0) {
    const seededUsers = [
      {
        id: 'user_admin',
        name: 'Returnly Admin',
        email: 'admin@returnly.demo',
        passwordHash: '$2a$10$cBz0gzBEh.9dPBIToQn4K.83DZU4Y5SgaF8T3Nupkns/SR1GKPtgi',
        role: 'admin',
        createdAt: '2026-01-15T09:00:00.000Z',
      },
      {
        id: 'user_alex',
        name: 'Alex Chen',
        email: 'alex@student.demo',
        passwordHash: '$2a$10$lkmWSRwtL20.oAqbchtEF.vBWZ5e8yUI/67g2q/YZLGfzYc4cWwZa',
        role: 'user',
        createdAt: '2026-02-09T14:20:00.000Z',
      },
      {
        id: 'user_maria',
        name: 'Maria Lopez',
        email: 'maria@campus.demo',
        passwordHash: '$2a$10$79lLVIB6ueO4rNBTVxWduOedW58OhwVHft40yw.oynkf56t7YPNCS',
        role: 'user',
        createdAt: '2026-02-14T10:40:00.000Z',
      },
    ];

    writeJSON(USERS_PATH, seededUsers);
  }

  const items = readJSON(ITEMS_PATH, []);
  if (items.length === 0) {
    const seededItems = [
      {
        id: 'item_1',
        type: 'lost',
        title: 'Silver MacBook Pro',
        description: 'Left near the library study pods on Tuesday evening.',
        category: 'Electronics',
        location: 'North Hall',
        date: '2026-05-12',
        imageUrl: '',
        status: 'approved',
        reporterId: 'user_alex',
        createdAt: '2026-05-12T18:45:00.000Z',
      },
      {
        id: 'item_2',
        type: 'found',
        title: 'Leather Wallet',
        description: 'Black leather wallet found beside the campus café register.',
        category: 'Wallets & IDs',
        location: 'Student Center',
        date: '2026-05-11',
        imageUrl: '',
        status: 'approved',
        reporterId: 'user_maria',
        createdAt: '2026-05-11T08:15:00.000Z',
      },
      {
        id: 'item_3',
        type: 'lost',
        title: 'Set of Campus Keys',
        description: 'Keyring with multiple campus building tags was misplaced near the transit hub.',
        category: 'Keys',
        location: 'Transit Hub',
        date: '2026-05-09',
        imageUrl: '',
        status: 'pending',
        reporterId: 'user_alex',
        createdAt: '2026-05-09T12:30:00.000Z',
      },
      {
        id: 'item_4',
        type: 'found',
        title: 'Blue Daypack',
        description: 'A blue hiking backpack left under a table in the student lounge.',
        category: 'Bags',
        location: 'Campus Lounge',
        date: '2026-05-08',
        imageUrl: '',
        status: 'approved',
        reporterId: 'user_maria',
        createdAt: '2026-05-08T16:00:00.000Z',
      },
      {
        id: 'item_5',
        type: 'lost',
        title: 'Navy Zip-Up Jacket',
        description: 'Lost during an afternoon lecture in the east wing auditorium.',
        category: 'Clothing',
        location: 'Lecture Hall A',
        date: '2026-05-10',
        imageUrl: '',
        status: 'pending',
        reporterId: 'user_alex',
        createdAt: '2026-05-10T15:20:00.000Z',
      },
      {
        id: 'item_6',
        type: 'found',
        title: 'Student ID Packet',
        description: 'Folder containing a student ID and enrollment information in the library atrium.',
        category: 'Documents',
        location: 'Library Atrium',
        date: '2026-05-07',
        imageUrl: '',
        status: 'approved',
        reporterId: 'user_maria',
        createdAt: '2026-05-07T09:50:00.000Z',
      },
      {
        id: 'item_7',
        type: 'lost',
        title: 'Black Phone Case',
        description: 'A black phone case with a snapped clasp was left on the bus stop bench.',
        category: 'Electronics',
        location: 'Bus Stop',
        date: '2026-05-06',
        imageUrl: '',
        status: 'resolved',
        reporterId: 'user_alex',
        createdAt: '2026-05-06T07:10:00.000Z',
      },
      {
        id: 'item_8',
        type: 'found',
        title: 'Blue Notebook',
        description: 'Spiral notebook with engineering notes found near the design studio.',
        category: 'Documents',
        location: 'Design Studio',
        date: '2026-05-05',
        imageUrl: '',
        status: 'approved',
        reporterId: 'user_maria',
        createdAt: '2026-05-05T13:40:00.000Z',
      },
    ];

    writeJSON(ITEMS_PATH, seededItems);
  }
}

function getUsers() {
  return readJSON(USERS_PATH, []);
}

function getItems() {
  return readJSON(ITEMS_PATH, []);
}

module.exports = {
  DATA_DIR,
  USERS_PATH,
  ITEMS_PATH,
  ensureDirectory,
  readJSON,
  writeJSON,
  generateId,
  seedData,
  getUsers,
  getItems,
  bcrypt,
};
