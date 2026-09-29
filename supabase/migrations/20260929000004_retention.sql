-- Data retention (privacy policy: keep booking data for 12 months after the
-- last appointment). Deletes patients with no appointment in that window;
-- their appointments go with them (ON DELETE CASCADE).
-- Run daily with pg_cron, see README ("Data retention").
create function public.purge_expired_patients(p_months int default 12) returns int
language sql
set search_path = public
as $$
  with gone as (
    delete from public.patients p
     where p.created_at < now() - make_interval(months => p_months)
       and not exists (
         select 1 from public.appointments a
          where a.patient_id = p.id
            and a.date >= public.clinic_today() - make_interval(months => p_months)
       )
    returning 1
  )
  select count(*)::int from gone;
$$;

revoke execute on function public.purge_expired_patients from public, anon, authenticated;
grant execute on function public.purge_expired_patients to service_role;
