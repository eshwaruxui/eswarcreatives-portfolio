-- Seed outreach sequences from acquisition handbook.
-- No em dashes anywhere. Variables: {{first_name}}, {{company}}, {{specific_observation}},
-- {{flow}}, {{topic}}, {{unsubscribe_url}}.
-- All email body templates end with the standard footer block.

do $$
declare
  v_seq_a uuid;
  v_seq_b uuid;
  v_seq_li uuid;
  v_footer text;
begin
  v_footer := E'\n\nIf you would rather not hear from me: {{unsubscribe_url}}\nEswar Creatives, Chennai, India';

  -- ── Sequence A: Security / AI ────────────────────────────────────────────
  insert into sequences (name, segment, is_active)
  values ('Email A: Security / AI', 'security_ai', true)
  returning id into v_seq_a;

  insert into sequence_steps (sequence_id, step_number, channel, day_offset, subject_template, body_template, requires_connected, stop_on_reply) values
  (
    v_seq_a, 1, 'email', 0,
    'A UX friction point in {{company}}''s onboarding',
    'Hi {{first_name}}, I lead product design for enterprise SaaS, most recently building the design system for CYGNVS, an AI cybersecurity platform (60+ components, 180+ tokens across web, iOS and Android). I looked at {{company}}''s {{flow}} and spotted {{specific_observation}}. Happy to send a short teardown, no strings. If it is useful, I run a fixed 5-day UX Audit that turns those into a prioritized, conversion-focused action plan. Worth a 20-minute call? Eswar / eswarcreatives.in' || v_footer,
    false, true
  ),
  (
    v_seq_a, 2, 'email', 3,
    'Re: A UX friction point in {{company}}''s onboarding',
    'Hi {{first_name}}, floating this back up. I still have the UX notes for {{company}} ready. Want me to send them across? Eswar' || v_footer,
    false, true
  ),
  (
    v_seq_a, 3, 'email', 6,
    'Quick UX win for {{company}}',
    'Hi {{first_name}}, last one from me. I wrote up the specific issue I spotted in {{company}}''s {{flow}}. Happy to send it over as a 1-pager, no call needed. If timing is not right, no worries. Eswar / eswarcreatives.in' || v_footer,
    false, true
  );

  -- ── Sequence B: SaaS Product ─────────────────────────────────────────────
  insert into sequences (name, segment, is_active)
  values ('Email B: SaaS Product', 'saas_product', true)
  returning id into v_seq_b;

  insert into sequence_steps (sequence_id, step_number, channel, day_offset, subject_template, body_template, requires_connected, stop_on_reply) values
  (
    v_seq_b, 1, 'email', 0,
    '2 quick UX wins for {{company}}',
    'Hi {{first_name}}, quick one. I design UX and design systems for B2B SaaS and noticed {{specific_observation}} in {{company}}''s product. I put together 2 concrete improvements that could lift onboarding completion and time-to-value. Can I send them over? Background: 15+ years in enterprise SaaS, design systems used across web and mobile. Portfolio: eswarcreatives.in Eswar' || v_footer,
    false, true
  ),
  (
    v_seq_b, 2, 'email', 3,
    'Re: 2 quick UX wins for {{company}}',
    'Hi {{first_name}}, floating this back up. Still have the 2 UX notes for {{company}} ready. Want me to send them across? Eswar' || v_footer,
    false, true
  ),
  (
    v_seq_b, 3, 'email', 7,
    'Closing the loop',
    'Hi {{first_name}}, I will stop nudging after this. If the timing ever works, I run a fixed 5-day UX Audit ($750) that gives you a prioritized action plan for one core flow. Portfolio: eswarcreatives.in Eswar' || v_footer,
    false, true
  );

  -- ── Sequence 3: LinkedIn Outreach ────────────────────────────────────────
  insert into sequences (name, segment, is_active)
  values ('LinkedIn Outreach', null, true)
  returning id into v_seq_li;

  insert into sequence_steps (sequence_id, step_number, channel, day_offset, subject_template, body_template, requires_connected, stop_on_reply) values
  (
    v_seq_li, 1, 'linkedin_connect', 0,
    null,
    'Hi {{first_name}}, I design UX and design systems for B2B SaaS. Recently spotted {{specific_observation}} in {{company}}''s product and have a couple of concrete improvements I would be glad to share. Would love to connect.',
    false, true
  ),
  (
    v_seq_li, 2, 'linkedin_dm', 3,
    null,
    'Hi {{first_name}}, thanks for connecting. I noticed {{specific_observation}} in {{company}}''s {{flow}}. Happy to share a quick teardown, 2 concrete improvements, no pitch attached. Want me to send it over?',
    true, true
  ),
  (
    v_seq_li, 3, 'linkedin_dm', 6,
    null,
    'Hi {{first_name}}, just bumping this up. The 2 UX notes for {{company}} are still here if useful. One-liner reply is enough, I will send them right over.',
    true, true
  ),
  (
    v_seq_li, 4, 'linkedin_dm', 11,
    null,
    'Hi {{first_name}}, saw your post on {{topic}}. Good point on that. Separately, still happy to share those UX notes on {{company}}''s {{flow}}. Worth a look?',
    true, true
  );
end;
$$;
