-- Sequence step template v2: enforce 4-paragraph structure + /design-systems sign-off.
-- Para 1: Credentials intro.
-- Para 2: "I looked at [Company]'s [flow] and spotted one specific issue: [observation]."
-- Para 3: Teardown offer + audit CTA.
-- Para 4: Eswar\neswarcreatives.in/design-systems
-- Unsubscribe block stays at bottom, separated by blank line.
-- Subject update: Email A step 1 drops "onboarding" -> "product".

do $$
declare
  v_seq_a uuid;
  v_seq_b uuid;
  v_footer text;
begin
  v_footer := E'\n\nIf you would rather not hear from me: {{unsubscribe_url}}\nEswar Creatives, Chennai, India';

  select id into v_seq_a from sequences where name = 'Email A: Security / AI' limit 1;
  select id into v_seq_b from sequences where name = 'Email B: SaaS Product' limit 1;

  -- ── Email A Step 1 ────────────────────────────────────────────────────────
  update sequence_steps set
    subject_template = 'A UX friction point in {{company}}''s product',
    body_template = E'Hi {{first_name}}, I lead product design for enterprise SaaS, most recently building the design system for CYGNVS, an AI cybersecurity platform (60+ components, 180+ tokens across web, iOS and Android).\n\nI looked at {{company}}''s {{flow}} and spotted one specific issue: {{specific_observation}}.\n\nHappy to send a short teardown, no strings. If it is useful, I run a fixed 5-day UX Audit that turns those into a prioritized, conversion-focused action plan. Worth a 20-minute call?\n\nEswar\neswarcreatives.in/design-systems' || v_footer
  where sequence_id = v_seq_a and step_number = 1;

  -- ── Email A Step 2 ────────────────────────────────────────────────────────
  update sequence_steps set
    body_template = E'Hi {{first_name}}, floating this back up. I still have the UX notes for {{company}} ready. Want me to send them across?\n\nEswar\neswarcreatives.in/design-systems' || v_footer
  where sequence_id = v_seq_a and step_number = 2;

  -- ── Email A Step 3 ────────────────────────────────────────────────────────
  update sequence_steps set
    body_template = E'Hi {{first_name}}, last one from me. I wrote up the specific issue I spotted in {{company}}''s {{flow}}. Happy to send it over as a 1-pager, no call needed. If timing is not right, no worries.\n\nEswar\neswarcreatives.in/design-systems' || v_footer
  where sequence_id = v_seq_a and step_number = 3;

  -- ── Email B Step 1 ────────────────────────────────────────────────────────
  update sequence_steps set
    body_template = E'Hi {{first_name}}, quick one. I design UX and design systems for B2B SaaS.\n\nI looked at {{company}}''s product and spotted one specific issue: {{specific_observation}}.\n\nI put together 2 concrete improvements that could lift onboarding completion and time-to-value. Can I send them over? Background: 15+ years in enterprise SaaS, design systems used across web and mobile.\n\nEswar\neswarcreatives.in/design-systems' || v_footer
  where sequence_id = v_seq_b and step_number = 1;

  -- ── Email B Step 2 ────────────────────────────────────────────────────────
  update sequence_steps set
    body_template = E'Hi {{first_name}}, floating this back up. Still have the 2 UX notes for {{company}} ready. Want me to send them across?\n\nEswar\neswarcreatives.in/design-systems' || v_footer
  where sequence_id = v_seq_b and step_number = 2;

  -- ── Email B Step 3 ────────────────────────────────────────────────────────
  update sequence_steps set
    body_template = E'Hi {{first_name}}, I will stop nudging after this. If the timing ever works, I run a fixed 5-day UX Audit ($750) that gives you a prioritized action plan for one core flow.\n\nEswar\neswarcreatives.in/design-systems' || v_footer
  where sequence_id = v_seq_b and step_number = 3;

end;
$$;
