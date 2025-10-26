const path = require('node:path');
const assert = require('node:assert/strict');
const { test, beforeEach, afterEach } = require('node:test');

const { register } = require('../helpers/register-ts.cjs');

register();

const ROUTE_PATH = path.join(
  process.cwd(),
  'src/app/api/payments/bank/route.ts',
);

function loadRouteModule() {
  delete require.cache[ROUTE_PATH];
  return require(ROUTE_PATH);
}

beforeEach(() => {
  global.__MODULE_MOCKS__ = Object.create(null);
});

afterEach(() => {
  delete require.cache[ROUTE_PATH];
  delete global.__MODULE_MOCKS__;
});

function createResponseRecorder(response) {
  return {
    status: response.status,
    json: async () => {
      const bodyText = await response.text();
      try {
        return JSON.parse(bodyText);
      } catch {
        return bodyText;
      }
    },
  };
}

test('creates a bank transfer confirmation request for a customer', async () => {
  const notifications = [];
  const createCalls = [];

  global.__MODULE_MOCKS__['@/lib/api/auth'] = {
    requireAuthenticatedSession: async () => ({
      user: {
        id: 'user-1',
        email: 'user@example.com',
        user_metadata: { name: '홍길동' },
      },
    }),
  };

  global.__MODULE_MOCKS__['@/lib/payments/db'] = {
    createBankConfirmationRequest: async (payload) => {
      createCalls.push(payload);
      return {
        confirmationId: 42,
        orderId: payload.orderId,
        amount: 120000,
        bankAccount: { bankName: '국민은행', accountNumber: '123-456', accountHolder: '오픈팀' },
        depositorName: payload.depositorName,
        scheduledDate: payload.scheduledDate,
        note: payload.note ?? null,
      };
    },
    listBankTransferReviews: async () => [],
    updateBankTransferReview: async () => {
      throw new Error('not used');
    },
  };

  global.__MODULE_MOCKS__['@/lib/payments/notifications'] = {
    notifyDepositReview: async (payload) => {
      notifications.push(payload);
    },
  };

  const { PATCH } = loadRouteModule();

  const body = {
    orderId: 'order-123',
    depositorName: '홍길동',
    scheduledDate: '2025-01-10',
    note: '빠른 확인 부탁드립니다.',
  };

  const response = await PATCH({ json: async () => body });
  const recorder = createResponseRecorder(response);
  const data = await recorder.json();

  assert.equal(recorder.status, 200);
  assert.deepEqual(createCalls[0], {
    orderId: 'order-123',
    depositorName: '홍길동',
    scheduledDate: '2025-01-10',
    note: '빠른 확인 부탁드립니다.',
    userId: 'user-1',
  });
  assert.equal(notifications.length, 1);
  assert.equal(data.ok, true);
  assert.equal(data.confirmationId, 42);
});

test('rejects unauthorized admin attempts with 403', async () => {
  global.__MODULE_MOCKS__['@/lib/api/auth'] = {
    requireAdminContext: async () => {
      throw new (require('@/lib/api/errors').ApiError)('권한 없음', { status: 403 });
    },
  };

  global.__MODULE_MOCKS__['@/lib/payments/db'] = {
    createBankConfirmationRequest: async () => {
      throw new Error('not used');
    },
    listBankTransferReviews: async () => [],
    updateBankTransferReview: async () => {
      throw new Error('not used');
    },
  };

  const { PATCH } = loadRouteModule();

  const response = await PATCH({ json: async () => ({ paymentId: 'pay-1', status: 'confirmed' }) });
  assert.equal(response.status, 403);
});

test('returns 404 when pending confirmation is missing', async () => {
  global.__MODULE_MOCKS__['@/lib/api/auth'] = {
    requireAdminContext: async () => ({
      session: { user: { id: 'admin-1' } },
    }),
  };

  global.__MODULE_MOCKS__['@/lib/payments/db'] = {
    listBankTransferReviews: async () => [],
    createBankConfirmationRequest: async () => {
      throw new Error('not used');
    },
    updateBankTransferReview: async () => {
      throw new Error('not used');
    },
  };

  const { PATCH } = loadRouteModule();

  const response = await PATCH({ json: async () => ({ paymentId: 'pay-404', status: 'confirmed' }) });
  assert.equal(response.status, 404);
});

test('updates bank transfer review and suppresses customer notification for admin', async () => {
  const updateCalls = [];
  const notifications = [];

  global.__MODULE_MOCKS__['@/lib/api/auth'] = {
    requireAdminContext: async () => ({
      session: { user: { id: 'admin-1' } },
    }),
  };

  global.__MODULE_MOCKS__['@/lib/payments/db'] = {
    listBankTransferReviews: async () => [
      {
        confirmationId: 77,
        paymentId: 'pay-2',
      },
    ],
    createBankConfirmationRequest: async () => {
      throw new Error('not used');
    },
    updateBankTransferReview: async (payload) => {
      updateCalls.push(payload);
      return {
        confirmationId: payload.confirmationId,
        paymentId: payload.paymentId,
        orderId: 'order-xyz',
        amount: 12300,
        currency: 'KRW',
        status: payload.status,
        paymentStatus: 'pending_bank_transfer',
        requestedAt: new Date().toISOString(),
        processedAt: new Date().toISOString(),
        processedBy: 'admin-1',
        memo: payload.memo ?? null,
        note: null,
        depositorName: '홍길동',
        scheduledDate: null,
        bankAccount: { bankName: '국민은행', accountNumber: '123-456', accountHolder: '오픈팀' },
        requestedBy: 'user-1',
      };
    },
  };

  global.__MODULE_MOCKS__['@/lib/payments/notifications'] = {
    notifyDepositReview: async (payload) => {
      notifications.push(payload);
    },
  };

  const { PATCH } = loadRouteModule();

  const body = { paymentId: 'pay-2', status: 'confirmed', memo: '확인 완료' };

  const response = await PATCH({ json: async () => body });
  const recorder = createResponseRecorder(response);
  const data = await recorder.json();

  assert.equal(recorder.status, 200);
  assert.equal(updateCalls.length, 1);
  assert.deepEqual(updateCalls[0], {
    confirmationId: 77,
    paymentId: 'pay-2',
    status: 'confirmed',
    memo: '확인 완료',
    confirmedBy: 'admin-1',
  });
  assert.equal(notifications.length, 0);
  assert.equal(data.ok, true);
  assert.equal(data.review.paymentId, 'pay-2');
});
