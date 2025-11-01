const LRU = require('lru-cache');
const fs = require('fs');

const mem = new LRU({ max: 100 });

function get(key) { return mem.get(key); }
function set(key, val) { mem.set(key, val); }

function diskRead(file) { if (!fs.existsSync(file)) return null; return JSON.parse(fs.readFileSync(file, 'utf-8')); }
function diskWrite(file, data) { fs.writeFileSync(file, JSON.stringify(data, null, 2)); }

module.exports = { get, set, diskRead, diskWrite };