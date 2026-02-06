const assert = require('assert');

const apiBaseUrl = process.env.LETTUS_API_BASE_URL || 'https://api.lettusslettings.localhost';
const allowInsecureTls = process.env.ALLOW_INSECURE_TLS === 'true';

if (allowInsecureTls) {
  process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
}

const requestJson = async (path, options = {}) => {
  const response = await fetch(`${apiBaseUrl}${path}`, {
    headers: { 'Content-Type': 'application/json', ...(options.headers || {}) },
    ...options
  });
  const body = await response.json();
  if (!response.ok) {
    throw new Error(`Request failed (${response.status}): ${JSON.stringify(body)}`);
  }
  return body;
};

const run = async () => {
  console.log(`Lettus API base: ${apiBaseUrl}`);

  const properties = await requestJson('/lettus/properties?status=available&limit=5');
  assert(Array.isArray(properties), 'Expected properties to be an array');
  console.log(`Loaded ${properties.length} properties`);

  if (!properties.length) {
    console.log('No properties available to subscribe. Harness complete.');
    return;
  }

  const property = properties[0];
  assert(property.id, 'Property should include id');
  assert(property.published_at, 'Property should include published_at');

  const tenantId = process.env.LETTUS_TEST_TENANT_ID;
  if (!tenantId) {
    console.log('LETTUS_TEST_TENANT_ID not set, skipping subscription test.');
    return;
  }

  const subscription = await requestJson('/lettus/subscriptions', {
    method: 'POST',
    body: JSON.stringify({ property_id: property.id, tenant_id: tenantId })
  });

  assert(subscription.id, 'Subscription should include id');
  assert(subscription.status, 'Subscription should include status');
  console.log(`Created subscription ${subscription.id} for tenant ${tenantId}`);
};

run().catch((err) => {
  console.error('Test harness failed:', err.message);
  process.exit(1);
});
