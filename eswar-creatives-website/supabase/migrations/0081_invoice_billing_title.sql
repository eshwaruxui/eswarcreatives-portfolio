-- Billing for / Billing title on invoices.
-- invoices.project_id already existed live (invoices_project_id_fkey -> projects.id);
-- this migration only adds billing_title.
ALTER TABLE public.invoices ADD COLUMN billing_title text;
