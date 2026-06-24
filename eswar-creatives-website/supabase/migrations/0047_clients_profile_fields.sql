-- Phase 5 / 0047 — clients extended profile fields
-- founder_name and whatsapp_number are surfaced (and inline-editable) in the
-- admin "Manage client" right-side panel. Both nullable; existing rows keep null.
alter table public.clients
  add column if not exists founder_name text,
  add column if not exists whatsapp_number text;
