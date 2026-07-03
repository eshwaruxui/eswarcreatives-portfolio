-- 0067_payment_proofs.sql
-- Add proof_url to invoice_payments and create the payment_proofs storage bucket.

----------------------------------------------------------------------
-- 1. proof_url column on invoice_payments.
----------------------------------------------------------------------
alter table public.invoice_payments
  add column if not exists proof_url text;

----------------------------------------------------------------------
-- 2. payment_proofs storage bucket (private).
--    Path convention: {invoice_id}/{timestamp}-{filename}
--    Signed URLs generated on demand; no public URL.
----------------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'payment_proofs',
  'payment_proofs',
  false,
  5242880,
  array['image/jpeg','image/png','image/webp','application/pdf']
)
on conflict (id) do nothing;

----------------------------------------------------------------------
-- 3. Storage RLS.
--    Admin: full management via is_admin() SECURITY DEFINER.
--    Client: SELECT only, scoped to invoices belonging to their client row.
----------------------------------------------------------------------
create policy "admin_all_payment_proofs" on storage.objects
  for all
  using      (bucket_id = 'payment_proofs' and public.is_admin())
  with check (bucket_id = 'payment_proofs' and public.is_admin());

create policy "client_read_own_payment_proofs" on storage.objects
  for select
  using (
    bucket_id = 'payment_proofs'
    and (storage.foldername(name))[1] in (
      select i.id::text
        from public.invoices i
        join public.clients  c on c.id = i.client_id
       where c.profile_id = auth.uid()
    )
  );
