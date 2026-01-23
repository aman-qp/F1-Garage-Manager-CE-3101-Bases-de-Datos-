const express = require('express');
const router = express.Router();
const { poolPromise, sql } = require('./db');

router.post('/', async (req, res) => {
  const { id_circuito, dc_global } = req.body;

  try {
    const pool = await poolPromise;

    const result = await pool.request()
      .input('id_circuito', sql.Int, id_circuito)
      .input('dc_global', sql.Decimal(10,2), dc_global)
      .execute('sp_SimularCarrera');

    res.status(200).json({
      mensaje: 'Simulación ejecutada correctamente',
      resultados: result.recordset
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
