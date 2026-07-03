-- 0066_backfill_newgen_advance_payments.sql
-- BACKFILL ONLY — preview SQL. Run manually in Supabase SQL Editor.
-- Do NOT apply via migration runner (it contains DML for a specific real invoice).
--
-- Context: Mohan / Newgen Event Makers, "Foundation Phase - Advance Payment"
-- invoice was corrupted to show reduced balance instead of true total Rs 53,725
-- with Rs 38,000 received across 3 payments (1000 + 2000 + 35000).
-- This script restores the true total and creates the structured payment rows.

----------------------------------------------------------------------
-- Step 0: Identify the target invoice (run this SELECT first to confirm).
----------------------------------------------------------------------
SELECT
  i.id,
  i.invoice_number,
  i.label,
  i.amount,
  i.status,
  i.paid_date,
  c.company_name
FROM public.invoices i
JOIN public.clients  c ON c.id = i.client_id
WHERE c.company_name ILIKE '%newgen%'
  AND i.label        ILIKE '%advance%'
ORDER BY i.created_at DESC
LIMIT 5;

-- Copy the `id` value from the result above and replace <INVOICE_ID> below.

----------------------------------------------------------------------
-- Step 1: Restore the true invoice total.
----------------------------------------------------------------------
UPDATE public.invoices
   SET amount = 53725
 WHERE id = '<INVOICE_ID>'
   AND amount <> 53725;   -- guard: only run if not already corrected

----------------------------------------------------------------------
-- Step 2: Insert the three partial payments.
--   Payment 1: Rs 1,000 on 2026-05-02 (UPI)
--   Payment 2: Rs 2,000 on 2026-06-09 (UPI)
--   Payment 3: Rs 35,000 on 2026-06-10 (UPI)
-- Total paid: Rs 38,000. Balance due: Rs 15,725.
----------------------------------------------------------------------
INSERT INTO public.invoice_payments (invoice_id, amount, paid_on, method, reference_note)
VALUES
  ('<INVOICE_ID>', 1000,  '2026-05-02', 'UPI', 'Advance instalment 1'),
  ('<INVOICE_ID>', 2000,  '2026-06-09', 'UPI', 'Advance instalment 2'),
  ('<INVOICE_ID>', 35000, '2026-06-10', 'UPI', 'Advance instalment 3');

----------------------------------------------------------------------
-- Step 3: Set status to partially_paid (balance Rs 15,725 remains).
----------------------------------------------------------------------
UPDATE public.invoices
   SET status    = 'partially_paid',
       paid_date = NULL
 WHERE id = '<INVOICE_ID>';

----------------------------------------------------------------------
-- Step 4: Verify result.
----------------------------------------------------------------------
SELECT
  i.id,
  i.invoice_number,
  i.label,
  i.amount,
  i.status,
  sum(p.amount)            AS amount_paid,
  i.amount - sum(p.amount) AS balance_due
FROM public.invoices        i
JOIN public.invoice_payments p ON p.invoice_id = i.id
WHERE i.id = '<INVOICE_ID>'
GROUP BY i.id, i.invoice_number, i.label, i.amount, i.status;
