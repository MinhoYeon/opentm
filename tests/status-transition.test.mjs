import test from 'node:test';
import assert from 'node:assert/strict';
import { createClient } from '@supabase/supabase-js';

const requiredEnv = ['SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY'];
const missingEnv = requiredEnv.filter((key) => !process.env[key]);

if (missingEnv.length > 0) {
  const message = [
    'Skipping Supabase status transition integration test because the following environment variable(s) are not set:',
    missingEnv.join(', '),
    'Provide these values or run "npm run test:status-transitions" with the required configuration to execute this test.',
  ].join(' ');

  console.warn(message);

  test('trademark status transitions record logs and succeed (skipped - missing Supabase env)', {
    skip: true,
  }, () => {});
} else {
  const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false },
  });

  const TRANSITION_PATH = [
    'draft',
    'awaiting_documents',
    'awaiting_client_signature',
    'filed',
    'awaiting_registration_fee',
    'completed',
  ];

  let applicationRecord;

  test('trademark status transitions record logs and succeed', async () => {
    const brandName = `Integration ${new Date().toISOString()}`;
    const { data: inserted, error: insertError } = await supabase
      .from('trademark_applications')
      .insert([
        {
          brand_name: brandName,
          trademark_type: 'word',
          product_classes: ['35'],
          status: TRANSITION_PATH[0],
          status_updated_at: new Date().toISOString(),
        },
      ])
      .select('id, status')
      .single();

    assert.ifError(insertError);
    assert.ok(inserted?.id, 'application id should be returned');
    applicationRecord = inserted;

    let previousStatus = inserted.status;

    for (const nextStatus of TRANSITION_PATH.slice(1)) {
      const updateTimestamp = new Date().toISOString();
      const { data: updated, error: updateError } = await supabase
        .from('trademark_applications')
        .update({ status: nextStatus, status_updated_at: updateTimestamp })
        .eq('id', inserted.id)
        .select('status')
        .single();

      assert.ifError(updateError);
      assert.equal(updated?.status, nextStatus, 'status should advance to next step');

      const { data: logRow, error: logError } = await supabase
        .from('trademark_status_logs')
        .insert([
          {
            application_id: inserted.id,
            from_status: previousStatus,
            to_status: nextStatus,
            note: 'integration-test',
          },
        ])
        .select('id')
        .single();

      assert.ifError(logError);
      assert.ok(logRow?.id, 'status log insert should return an id');

      previousStatus = nextStatus;
    }
  });

  test.after(async () => {
    if (applicationRecord?.id) {
      await supabase.from('trademark_status_logs').delete().eq('application_id', applicationRecord.id);
      await supabase.from('trademark_applications').delete().eq('id', applicationRecord.id);
    }
  });
}
