-- Migration: Remove deprecated trademark statuses
-- Date: 2025-01-29
--
-- This migration removes 4 deprecated statuses and updates existing records:
-- - draft → submitted
-- - office_action → responding_to_office_action
-- - awaiting_client_response → responding_to_office_action
-- - completed → registered

-- Update trademark_requests table
UPDATE trademark_requests
SET status = 'submitted'
WHERE status = 'draft';

UPDATE trademark_requests
SET status = 'responding_to_office_action'
WHERE status = 'office_action';

UPDATE trademark_requests
SET status = 'responding_to_office_action'
WHERE status = 'awaiting_client_response';

UPDATE trademark_requests
SET status = 'registered'
WHERE status = 'completed';

-- Update trademark_applications table
UPDATE trademark_applications
SET status = 'submitted'
WHERE status = 'draft';

UPDATE trademark_applications
SET status = 'responding_to_office_action'
WHERE status = 'office_action';

UPDATE trademark_applications
SET status = 'responding_to_office_action'
WHERE status = 'awaiting_client_response';

UPDATE trademark_applications
SET status = 'registered'
WHERE status = 'completed';

-- Note: The enum type cannot be altered directly in PostgreSQL without recreating it.
-- Since we're using text fields with check constraints, this migration is sufficient.
-- If you have check constraints on these tables, they would need to be updated separately.
