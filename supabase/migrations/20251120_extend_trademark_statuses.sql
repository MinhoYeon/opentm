-- Extend the trademark_application_status enum with new workflow stages
set check_function_bodies = off;

do $$
begin
  if not exists (
    select 1
    from pg_enum e
    join pg_type t on t.oid = e.enumtypid
    where t.typname = 'trademark_application_status'
      and e.enumlabel = 'awaiting_documents'
  ) then
    alter type public.trademark_application_status add value 'awaiting_documents';
  end if;
end;
$$;

do $$
begin
  if not exists (
    select 1
    from pg_enum e
    join pg_type t on t.oid = e.enumtypid
    where t.typname = 'trademark_application_status'
      and e.enumlabel = 'awaiting_client_signature'
  ) then
    alter type public.trademark_application_status add value 'awaiting_client_signature';
  end if;
end;
$$;

do $$
begin
  if not exists (
    select 1
    from pg_enum e
    join pg_type t on t.oid = e.enumtypid
    where t.typname = 'trademark_application_status'
      and e.enumlabel = 'awaiting_client_response'
  ) then
    alter type public.trademark_application_status add value 'awaiting_client_response';
  end if;
end;
$$;

do $$
begin
  if not exists (
    select 1
    from pg_enum e
    join pg_type t on t.oid = e.enumtypid
    where t.typname = 'trademark_application_status'
      and e.enumlabel = 'awaiting_registration_fee'
  ) then
    alter type public.trademark_application_status add value 'awaiting_registration_fee';
  end if;
end;
$$;

-- Trigger helper to notify the status edge function whenever a log entry is inserted
create or replace function public.emit_trademark_status_event()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_application record;
  v_payload jsonb;
begin
  select
    id,
    request_id,
    user_id,
    management_number,
    brand_name,
    status,
    status_detail,
    status_updated_at
  into v_application
  from public.trademark_applications
  where id = new.application_id;

  if not found then
    return new;
  end if;

  v_payload := jsonb_build_object(
    'logId', new.id,
    'applicationId', new.application_id,
    'fromStatus', new.from_status,
    'toStatus', new.to_status,
    'note', new.note,
    'metadata', coalesce(new.metadata, '{}'::jsonb),
    'changedBy', new.changed_by,
    'changedAt', new.changed_at,
    'application', jsonb_build_object(
      'id', v_application.id,
      'requestId', v_application.request_id,
      'userId', v_application.user_id,
      'managementNumber', v_application.management_number,
      'brandName', v_application.brand_name,
      'status', v_application.status,
      'statusDetail', v_application.status_detail,
      'statusUpdatedAt', v_application.status_updated_at
    )
  );

  begin
    perform supabase_functions.http_request(
      'status-notifier',
      jsonb_build_object(
        'method', 'POST',
        'headers', jsonb_build_object('content-type', 'application/json'),
        'body', v_payload,
        'timeout_ms', 8000
      )
    );
  exception
    when others then
      raise warning 'status notifier call failed for application %: %', new.application_id, sqlerrm;
  end;

  return new;
end;
$$;

comment on function public.emit_trademark_status_event() is 'Invoked after inserting a status log entry to fan-out notifications to the status-notifier edge function.';

grant execute on function public.emit_trademark_status_event() to authenticated, service_role;

drop trigger if exists notify_trademark_status_event on public.trademark_status_logs;

create trigger notify_trademark_status_event
  after insert on public.trademark_status_logs
  for each row
  execute function public.emit_trademark_status_event();
