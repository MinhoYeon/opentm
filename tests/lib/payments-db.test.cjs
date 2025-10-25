const path = require('node:path');
const assert = require('node:assert/strict');
const { test, beforeEach, afterEach } = require('node:test');

const { register } = require('../helpers/register-ts.cjs');

register();

const DB_PATH = path.join(process.cwd(), 'src/lib/payments/db.ts');

function loadDbModule() {
  delete require.cache[DB_PATH];
  return require(DB_PATH);
}

function createAdminClientMock(options) {
  return {
    from(table) {
      if (table === 'bank_transfer_confirmations') {
        const filters = {};
        let mode = 'select';
        return {
          update(payload) {
            mode = 'update';
            options.onConfirmationUpdate?.(payload, filters);
            return this;
          },
          select() {
            mode = 'select';
            return this;
          },
          eq(column, value) {
            filters[column] = value;
            return this;
          },
          maybeSingle() {
            if (mode === 'update') {
              const matches =
                options.confirmation?.shouldMatch &&
                filters.id === options.confirmation?.id &&
                filters.intent_id === options.paymentId;
              if (matches) {
                return Promise.resolve({ data: { id: options.confirmation.id }, error: null });
              }
              return Promise.resolve({ data: null, error: null });
            }
            if (mode === 'select') {
              const matches =
                options.confirmation?.shouldMatch && filters.id === options.confirmation?.id;
              if (matches) {
                const review =
                  options.review ?? {
                    id: options.confirmation?.id,
                    intent_id: options.paymentId,
                    status: options.status ?? 'confirmed',
                    note: null,
                    memo: null,
                    metadata: {},
                    requested_at: new Date().toISOString(),
                    processed_at: new Date().toISOString(),
                    processed_by: options.confirmedBy ?? 'admin-1',
                    user_id: 'user-1',
                    intent: {
                      id: options.paymentId,
                      order_id: 'order-1',
                      amount: 1000,
                      currency: 'KRW',
                      status: 'pending_bank_transfer',
                      metadata: {},
                    },
                  };
                return Promise.resolve({ data: review, error: null });
              }
              return Promise.resolve({ data: null, error: null });
            }
            return Promise.resolve({ data: null, error: null });
          },
        };
      }
      if (table === 'payment_intents') {
        const filters = {};
        return {
          update(payload) {
            return {
              eq(column, value) {
                filters[column] = value;
                if (column === 'id' && value === options.paymentId) {
                  options.onPaymentIntentUpdate?.(payload, filters);
                }
                return Promise.resolve({ data: null, error: null });
              },
            };
          },
        };
      }
      throw new Error(`Unexpected table ${table}`);
    },
  };
}

beforeEach(() => {
  global.__MODULE_MOCKS__ = Object.create(null);
});

afterEach(() => {
  delete global.__MODULE_MOCKS__;
  delete require.cache[DB_PATH];
});

test('updateBankTransferReview updates the payment intent when confirmation row matches', async () => {
  let paymentIntentUpdates = 0;
  const adminClient = createAdminClientMock({
    paymentId: 'pay-1',
    confirmation: { shouldMatch: true, id: 101 },
    onPaymentIntentUpdate: () => {
      paymentIntentUpdates += 1;
    },
  });
  global.__MODULE_MOCKS__['@/lib/supabaseAdminClient'] = {
    createAdminClient: () => adminClient,
  };

  const db = loadDbModule();
  const result = await db.updateBankTransferReview({
    confirmationId: 101,
    paymentId: 'pay-1',
    status: 'confirmed',
    confirmedBy: 'admin-1',
    memo: null,
  });

  assert.equal(paymentIntentUpdates, 1);
  assert.ok(result);
  assert.equal(result?.confirmationId, 101);
});

test('updateBankTransferReview skips payment intent update when no confirmation row matches', async () => {
  let paymentIntentUpdates = 0;
  const adminClient = createAdminClientMock({
    paymentId: 'pay-2',
    confirmation: { shouldMatch: false, id: 202 },
    onPaymentIntentUpdate: () => {
      paymentIntentUpdates += 1;
    },
  });
  global.__MODULE_MOCKS__['@/lib/supabaseAdminClient'] = {
    createAdminClient: () => adminClient,
  };

  const db = loadDbModule();
  const result = await db.updateBankTransferReview({
    confirmationId: 202,
    paymentId: 'pay-2',
    status: 'rejected',
    confirmedBy: 'admin-2',
    memo: null,
  });

  assert.equal(result, null);
  assert.equal(paymentIntentUpdates, 0);
});
