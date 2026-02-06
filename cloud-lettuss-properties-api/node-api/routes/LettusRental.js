const express = require('express');
const router = express.Router();
const { poolCloudRiskPortal } = require('../config/db');

const DEFAULT_LIMIT = 50;

const buildPropertyFilters = (query) => {
  const where = [];
  const values = [];

  if (query.status) {
    values.push(query.status);
    where.push(`status = $${values.length}`);
  }

  if (query.city) {
    values.push(query.city);
    where.push(`city = $${values.length}`);
  }

  if (query.propertyType) {
    values.push(query.propertyType);
    where.push(`property_type = $${values.length}`);
  }

  if (query.minRent) {
    values.push(Number(query.minRent));
    where.push(`monthly_rent >= $${values.length}`);
  }

  if (query.maxRent) {
    values.push(Number(query.maxRent));
    where.push(`monthly_rent <= $${values.length}`);
  }

  if (query.q) {
    values.push(`%${query.q}%`);
    where.push(
      `(title ILIKE $${values.length}
        OR description ILIKE $${values.length}
        OR address_line1 ILIKE $${values.length}
        OR city ILIKE $${values.length})`
    );
  }

  return { where, values };
};

router.get('/properties', async (req, res) => {
  let connection;
  try {
    const { where, values } = buildPropertyFilters(req.query);
    const limit = Math.min(Number(req.query.limit) || DEFAULT_LIMIT, 200);
    values.push(limit);

    const query = `
      SELECT id, title, description, property_type, address_line1, city, country,
             postal_code, bedrooms, bathrooms, monthly_rent, deposit_amount,
             available_from, status, published_at
      FROM "${process.env.DB_NAME_PORTAL}".rental_properties
      ${where.length ? `WHERE ${where.join(' AND ')}` : ''}
      ORDER BY published_at DESC, id DESC
      LIMIT $${values.length}
    `;

    connection = await poolCloudRiskPortal.connect();
    const result = await connection.query(query, values);
    res.status(200).json(result.rows);
  } catch (err) {
    console.error('Failed to list properties:', err);
    res.status(500).json({ error: 'Failed to retrieve properties' });
  } finally {
    if (connection) {
      connection.release();
    }
  }
});

router.get('/properties/:id', async (req, res) => {
  let connection;
  try {
    connection = await poolCloudRiskPortal.connect();
    const result = await connection.query(
      `SELECT * FROM "${process.env.DB_NAME_PORTAL}".rental_properties WHERE id = $1`,
      [req.params.id]
    );

    if (!result.rows.length) {
      return res.status(404).json({ error: 'Property not found' });
    }

    res.status(200).json(result.rows[0]);
  } catch (err) {
    console.error('Failed to fetch property:', err);
    res.status(500).json({ error: 'Failed to retrieve property' });
  } finally {
    if (connection) {
      connection.release();
    }
  }
});

router.post('/properties', async (req, res) => {
  let connection;
  try {
    const {
      landlord_id,
      title,
      description,
      property_type,
      address_line1,
      city,
      country,
      postal_code,
      bedrooms,
      bathrooms,
      monthly_rent,
      deposit_amount,
      available_from,
      status,
      published_at
    } = req.body;

    connection = await poolCloudRiskPortal.connect();
    const result = await connection.query(
      `INSERT INTO "${process.env.DB_NAME_PORTAL}".rental_properties
       (landlord_id, title, description, property_type, address_line1, city, country,
        postal_code, bedrooms, bathrooms, monthly_rent, deposit_amount,
        available_from, status, published_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15)
       RETURNING *`,
      [
        landlord_id || null,
        title,
        description || null,
        property_type || null,
        address_line1 || null,
        city || null,
        country || null,
        postal_code || null,
        bedrooms || null,
        bathrooms || null,
        monthly_rent,
        deposit_amount || null,
        available_from || null,
        status || 'available',
        published_at || null
      ]
    );

    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error('Failed to create property:', err);
    res.status(500).json({ error: 'Failed to create property' });
  } finally {
    if (connection) {
      connection.release();
    }
  }
});

router.put('/properties/:id', async (req, res) => {
  let connection;
  try {
    const {
      title,
      description,
      property_type,
      address_line1,
      city,
      country,
      postal_code,
      bedrooms,
      bathrooms,
      monthly_rent,
      deposit_amount,
      available_from,
      status
    } = req.body;

    connection = await poolCloudRiskPortal.connect();
    const result = await connection.query(
      `UPDATE "${process.env.DB_NAME_PORTAL}".rental_properties
       SET title = $1,
           description = $2,
           property_type = $3,
           address_line1 = $4,
           city = $5,
           country = $6,
           postal_code = $7,
           bedrooms = $8,
           bathrooms = $9,
           monthly_rent = $10,
           deposit_amount = $11,
           available_from = $12,
           status = $13,
           updated_at = NOW()
       WHERE id = $14
       RETURNING *`,
      [
        title,
        description,
        property_type,
        address_line1,
        city,
        country,
        postal_code,
        bedrooms,
        bathrooms,
        monthly_rent,
        deposit_amount,
        available_from,
        status,
        req.params.id
      ]
    );

    if (!result.rows.length) {
      return res.status(404).json({ error: 'Property not found' });
    }

    res.status(200).json(result.rows[0]);
  } catch (err) {
    console.error('Failed to update property:', err);
    res.status(500).json({ error: 'Failed to update property' });
  } finally {
    if (connection) {
      connection.release();
    }
  }
});

router.post('/subscriptions', async (req, res) => {
  let connection;
  try {
  const { property_id, tenant_id, start_date, score_value, score_band } = req.body;

    connection = await poolCloudRiskPortal.connect();
    const result = await connection.query(
      `INSERT INTO "${process.env.DB_NAME_PORTAL}".rental_subscriptions
       (property_id, tenant_id, start_date, status, score_value, score_band, scored_at)
       VALUES ($1, $2, COALESCE($3, CURRENT_DATE), 'active', $4, $5, CASE WHEN $4 IS NULL THEN NULL ELSE NOW() END)
       RETURNING *`,
      [property_id, tenant_id, start_date || null, score_value || null, score_band || null]
    );

    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error('Failed to create subscription:', err);
    res.status(500).json({ error: 'Failed to create subscription' });
  } finally {
    if (connection) {
      connection.release();
    }
  }
});

router.get('/subscriptions/tenant/:tenantId', async (req, res) => {
  let connection;
  try {
    connection = await poolCloudRiskPortal.connect();
    const result = await connection.query(
      `SELECT s.*, p.title, p.city, p.monthly_rent, p.status AS property_status
       FROM "${process.env.DB_NAME_PORTAL}".rental_subscriptions s
       JOIN "${process.env.DB_NAME_PORTAL}".rental_properties p ON p.id = s.property_id
       WHERE s.tenant_id = $1
       ORDER BY s.created_at DESC`,
      [req.params.tenantId]
    );

    res.status(200).json(result.rows);
  } catch (err) {
    console.error('Failed to list subscriptions:', err);
    res.status(500).json({ error: 'Failed to retrieve subscriptions' });
  } finally {
    if (connection) {
      connection.release();
    }
  }
});

router.get('/subscriptions/property/:propertyId', async (req, res) => {
  let connection;
  try {
    connection = await poolCloudRiskPortal.connect();
    const result = await connection.query(
      `SELECT * FROM "${process.env.DB_NAME_PORTAL}".rental_subscriptions
       WHERE property_id = $1
       ORDER BY created_at DESC`,
      [req.params.propertyId]
    );

    res.status(200).json(result.rows);
  } catch (err) {
    console.error('Failed to list property subscriptions:', err);
    res.status(500).json({ error: 'Failed to retrieve subscriptions' });
  } finally {
    if (connection) {
      connection.release();
    }
  }
});

router.patch('/subscriptions/:id/cancel', async (req, res) => {
  let connection;
  try {
    connection = await poolCloudRiskPortal.connect();
    const result = await connection.query(
      `UPDATE "${process.env.DB_NAME_PORTAL}".rental_subscriptions
       SET status = 'cancelled', updated_at = NOW()
       WHERE id = $1
       RETURNING *`,
      [req.params.id]
    );

    if (!result.rows.length) {
      return res.status(404).json({ error: 'Subscription not found' });
    }

    res.status(200).json(result.rows[0]);
  } catch (err) {
    console.error('Failed to cancel subscription:', err);
    res.status(500).json({ error: 'Failed to cancel subscription' });
  } finally {
    if (connection) {
      connection.release();
    }
  }
});

router.patch('/subscriptions/:id/score', async (req, res) => {
  let connection;
  try {
    const { score_value, score_band } = req.body;

    connection = await poolCloudRiskPortal.connect();
    const result = await connection.query(
      `UPDATE "${process.env.DB_NAME_PORTAL}".rental_subscriptions
       SET score_value = $1,
           score_band = $2,
           scored_at = NOW(),
           updated_at = NOW()
       WHERE id = $3
       RETURNING *`,
      [score_value || null, score_band || null, req.params.id]
    );

    if (!result.rows.length) {
      return res.status(404).json({ error: 'Subscription not found' });
    }

    res.status(200).json(result.rows[0]);
  } catch (err) {
    console.error('Failed to score subscription:', err);
    res.status(500).json({ error: 'Failed to score subscription' });
  } finally {
    if (connection) {
      connection.release();
    }
  }
});

module.exports = router;
