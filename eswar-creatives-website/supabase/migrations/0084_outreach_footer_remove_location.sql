-- Remove "Eswar Creatives, Chennai, India" from the outreach email footer.
-- Positions the brand as international/enterprise-focused; location line is
-- dropped, the {{unsubscribe_url}} line becomes the last line of the footer.
-- HTML link rendering for the design-systems and unsubscribe URLs happens in
-- send-outreach-email at send time, not in this template text.

update sequence_steps
set body_template = replace(body_template, E'\nEswar Creatives, Chennai, India', '')
where body_template like '%Eswar Creatives, Chennai, India%';
