-- Phase 3 / 0026 — proposal_documents (Migration C)
-- Metadata for files attached to a proposal. Bytes live in the
-- 'proposal-documents' storage bucket; storage_path points at them.
-- New table, no 0011 conflict. Admin manages; clients read their own.

create table if not exists public.proposal_documents (
  id           uuid primary key default gen_random_uuid(),
  proposal_id  uuid not null references public.proposals(id) on delete cascade,
  file_name    text not null,
  file_size    integer,
  file_type    text,
  storage_path text,
  uploaded_at  timestamptz default now()
);

alter table public.proposal_documents enable row level security;

create policy "Admin manages proposal documents" on public.proposal_documents
  for all using (public.is_admin()) with check (public.is_admin());

create policy "Client views own proposal documents" on public.proposal_documents
  for select using (
    proposal_id in (
      select id from public.proposals
      where client_id in (select id from public.clients where profile_id = auth.uid())
    )
  );
