// Serves the public produce feed. Filtering/sorting stays entirely on the
// frontend (filterAndSortMarketplaceProduce is pure, needs no server
// changes) — this endpoint only replaces the raw fetch.
const express = require('express');
const { asyncHandler } = require('../middleware');
const produce = require('./produce');

function buildRouter(db) {
  const router = express.Router();
  router.get(
    '/',
    asyncHandler(async (req, res) => {
      res.json(await produce.listActive(db));
    })
  );
  return router;
}

module.exports = { buildRouter };
