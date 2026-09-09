# Newgen coming soon page

Temporary landing page for newgeneventstudio.com while the full Solution 05 website is built.
Static, single page, no build step. Brand: Crown Pillar lockup, Gold #D5B067 on Teal #024C4F,
tagline "Your vision. Their memory." (locked 02 Sep 2026). No em dashes anywhere.

## Structure

```
newgen-coming-soon/
  public/
    index.html    - the page, fully self-contained (inline SVG lockup, data URI favicon)
    robots.txt
    sitemap.xml
    _headers      - security + cache headers (Cloudflare Pages)
  package.json
  wrangler.toml   - Pages config, output dir = public
  crown-pillar.svg - master lockup source (from I Foundation Phase/SVG/Negen logo.svg)
```

## Deploy

```
npx wrangler pages deploy public --project-name=newgen-coming-soon
```

Cloudflare account: Eswarcreatives@gmail.com (account id b2a26f4e78f04dee2fc554ae9092942a).

## Domain go-live runbook (one time)

1. Cloudflare dashboard: Add site `newgeneventstudio.com` (Free plan)
2. Re-create DNS records in the Cloudflare zone BEFORE switching nameservers:
   - TXT @ google-site-verification=Hj6H... (copy exact value from Namecheap)
   - MX @ SMTP.GOOGLE.COM, priority 1
   - TXT google._domainkey v=DKIM1;k=rsa;p=MIIB... (copy exact value from Namecheap)
3. Namecheap: turn OFF the parking page on .com and .in
4. Namecheap: switch newgeneventstudio.com nameservers to the two Cloudflare NS names shown in the dashboard
5. Cloudflare Pages: newgen-coming-soon > Custom domains > add newgeneventstudio.com and www.newgeneventstudio.com
6. Point newgeneventstudio.in at the .com (Namecheap redirect, or add the zone and use a Cloudflare redirect rule)
7. Verify: page loads on https, email still arrives at studio@/mohan@/deepika@/hello@ (send a test), WhatsApp button opens chat to 9176045045

## Replacement

At Solution 05 launch, the `newgen-website` deployment takes over the custom domain.
This project then retires - keep it, do not delete, until the full site is verified live.
