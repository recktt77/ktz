const { normalizeKZ8A } = require('./kz8aAdapter');
const { normalizeTE33A } = require('./te33aAdapter');

function normalize(raw) {
  const model = raw.locomotive_model;
  if (model === 'KZ8A') return normalizeKZ8A(raw);
  if (model === 'TE33A') return normalizeTE33A(raw);
  throw new Error(`Unknown model: ${model}`);
}

module.exports = { normalize };
