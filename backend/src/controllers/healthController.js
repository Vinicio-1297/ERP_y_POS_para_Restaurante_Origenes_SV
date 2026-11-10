const { checkDatabase } = require('../services/healthService');

async function getHealth(req, res, next) {
  try {
    await checkDatabase();
    res.status(200).json({ status: 'ok', message: 'API y base de datos conectadas' });
  } catch (error) {
    next(error);
  }
}

module.exports = { getHealth };