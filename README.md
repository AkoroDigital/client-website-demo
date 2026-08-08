# Business Name — Water Damage Restoration

A static marketing site for a local water damage restoration business. Built as a set of plain HTML pages sharing one design system, with no build step or framework.

## Pages

- `index.html` — home
- `about.html` — company story, values, certifications, team
- `services.html` — service breakdown, pricing, process
- `contact.html` — contact form, hours, address, map

## Tech

- Plain HTML/CSS/JS, no framework or bundler
- [GSAP](https://gsap.com/) + ScrollTrigger for scroll reveals and the hero parallax
- [Lenis](https://lenis.darkroom.engineering/) for inertia scrolling
- Google Fonts: Archivo Black (display), Source Sans 3 (body), JetBrains Mono (utility)
- OpenStreetMap embed for the map (no API key required)

## Running locally

Open `index.html` directly in a browser and most of it works, but lazy-loaded images and some scroll behavior need a real HTTP server to function correctly. From the project root:

```bash
python -m http.server 8791
```

Then visit `http://localhost:8791/`.

## Project structure

```
index.html
about.html
services.html
contact.html
design.md              — design system: palette, type, motion, copy rules
assets/
  styles.css            — shared styles for every page
  site.js                — shared behavior: scroll, reveals, skeleton loaders, nav state
  hero.png / hero.mp4    — home hero image/video
  g1.png, g2.png, g3.png — process gallery photos
  crew.png               — crew photo
  about-banner.png        — About page header
  services-banner.png     — Services page header
  contact-banner.png      — Contact page header
```

## Design system

`design.md` is the source of truth for the palette, type, spacing, motion rules, and copy voice. Any future changes to look or content should stay consistent with it.

## Known placeholders

These still need real information before launch:

- Business name (currently "Business Name" throughout)
- Address and hours (marked `TBD` in the footer, booking sections, and map)
- Team member names and headshots on the About page
- Contact form isn't wired to a real backend or inbox yet — it shows a client-side confirmation only

## Deployment

Static site, no build command needed. On Vercel: import the repo and set the output directory to the project root.
