# Aventicore — Company Website

A full website (frontend + backend) for Aventicore, a digital agency offering
software development, website design, Facebook monetization, YouTube channel
automation, and social media marketing.

## Structure

```
aventicore/
├── index.html          # Main page (hero, services, process, pricing, contact)
├── css/style.css        # All styling (dark theme, responsive)
├── js/main.js            # Animations, scroll reveals, contact form logic
├── backend/server.js     # Node.js server (no external dependencies)
└── package.json
```

## Running it

Requires only Node.js (v14+), no npm install needed.

```bash
node backend/server.js
```

Then open **http://localhost:3000**

## Features

- Animated hero with a network/"core" SVG graphic and particle background canvas
- Services section: Software Development, Website Design, Facebook Monetization,
  YouTube Channel Automation, Social Media Marketing, Growth Strategy
- Process timeline, pricing tiers, fully responsive layout
- Working contact form backed by a real API:
  - `POST /api/contact` — validates and stores inquiries to `backend/data/submissions.json`
  - `GET /api/submissions` — view stored inquiries
  - `GET /api/health` — health check

## Customizing

- Colors/fonts: edit CSS variables at the top of `css/style.css`
- Copy/content: edit `index.html` directly
- Email notifications: extend `handleContactSubmit` in `backend/server.js`
  to send emails (e.g. via nodemailer) instead of/in addition to file storage
