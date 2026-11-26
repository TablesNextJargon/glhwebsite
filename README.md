# George Hadow Concert Scraper

A Next.js web application that scrapes and displays upcoming concert dates for George Hadow from kuhnfumusic.com.

## Features

- 🎵 Real-time concert data scraping from kuhnfumusic.com/tour-dates
- 📱 Responsive design that works on all devices
- ⚡ Fast Next.js application with server-side rendering
- 🔄 Automatic data fetching and display
- 🎫 Direct links to ticket purchases
- ➕ Manual concert addition and management
- ✏️ Edit and delete manually added concerts
- 💾 Local storage for manual concerts
- 📅 Automatic sorting by date

## Tech Stack

- **Next.js** - React framework for production
- **React** - UI library
- **Axios** - HTTP client for API requests
- **Cheerio** - HTML parsing and scraping
- **Cloudflare Pages** - Hosting and serverless API functions

## Getting Started

### Prerequisites

- Node.js 22.23+ installed
- npm or yarn package manager

### Installation

1. Clone the repository:
```bash
git clone https://github.com/washwalk/GLH-website.git
cd GLH-website
```

2. Install dependencies:
```bash
npm install
```

3. Run the development server:
```bash
npm run dev
```

4. Open [http://localhost:3000](http://localhost:3000) in your browser.

## Project Structure

```
george-hadow-concerts/
├── pages/
│   ├── index.js          # Home page with concert display and manual management
│   └── api/
│       └── gigs.js       # API route for scraping concert data
├── public/               # Static assets
├── package.json          # Dependencies and scripts
├── next.config.js        # Next.js configuration
├── AGENTS.md            # Development guidelines for AI agents
└── README.md            # This file
```

## Manual Concert Management

Manual concerts are managed via a text file in the repository. This approach is simpler and more maintainable than user interface forms.

### Managing Manual Concerts

1. **Edit the `public/concerts.txt` file** in the repository
2. **Format**: `Date|Venue|City|Link` (one concert per line)
3. **Example**:
   ```
   15.12.2024|Blue Note|New York, NY|https://example.com
   20.12.2024|Jazz Cafe|London, UK|https://jazzcafe.com
   ```

### File Format Details

- **Date**: Any text format (DD.MM.YYYY, "December 15", etc.)
- **Venue**: Name of the venue
- **City**: City and optional state/country
- **Link**: Optional ticket purchase URL
- **Comments**: Lines starting with `#` are ignored

### File Location

The `concerts.txt` file must be placed in the `public/` directory to be accessible by the application.

Manual concerts are visually distinguished with a green "MANUAL" badge and yellow background.

## API Endpoints

### GET /api/gigs

Returns upcoming concert information scraped from kuhnfumusic.com/tour-dates.

**Response Format:**
```json
[
  {
    "date": "Jan 15",
    "venue": "The Venue Name",
    "city": "City, ST",
    "link": "https://ticket-link.com"
  }
]
```

## Development

### Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run start` - Start production server
- `npm run lint` - Run ESLint
- `npm run lint:fix` - Auto-fix ESLint issues

### Code Quality

This project follows strict coding standards defined in `AGENTS.md`. Key guidelines:

- TypeScript for type safety
- ESLint for code linting
- Prettier for code formatting
- Functional React components
- Proper error handling

## Deployment

The site is hosted on Cloudflare Pages at https://www.georgehadow.com/.
The apex domain redirects to `www`. Next.js exports static pages to `out/`;
Pages Functions in `functions/api/` provide the live concert API and contact form.
Concert data is cached at the edge for up to 24 hours and refreshed in the browser.
The exported concert page provides initial content before the live refresh.

### Deploy an update

```bash
npm ci
npm run lint
npm run build
npx wrangler pages deploy out --project-name george-hadow --branch main
```

Run the upload from the repository root so the uploader includes `functions/`.
Use `cf` for project and domain management; the Pages directory uploader uses
Wrangler because `cf pages deployments create` only accepts already-uploaded assets.
This project uses Direct Upload; Git pushes do not automatically deploy.

### Turnstile contact form

The native `/contact` form posts name, reply email, enquiry type (Booking,
Collaboration, Press, Other), subject, message, and `cf-turnstile-response` to
`/api/contact`. Pages forwards it through the private `CONTACT_WORKER` service
binding to `george-hadow-contact`. The Worker verifies Turnstile server-side
(success, `contact` action, and an exact production hostname) before awaiting
Cloudflare Email Service delivery. This account allows 1,000 messages/day and
requires a verified recipient destination. The visitor's email becomes Reply-To.
The recipient is `georgehadow@gmail.com`, stored only as a Worker secret; it is
never returned in responses or included in the static site or browser bundle.
SendGrid is no longer used, including by the legacy development scraper.

Production resources:

- Turnstile widget: **George Hadow contact**, managed mode, site key
  `0x4AAAAAAGUlqtc21_lsGG6B`.
- Widget domains: `www.georgehadow.com`, `georgehadow.com`, `localhost`, `127.0.0.1`.
- Worker `TURNSTILE_HOSTNAMES`: `www.georgehadow.com,georgehadow.com`.
  Local hostnames must never be allowed by the production Worker.
- Email sending subdomain: `contact.georgehadow.com`, authenticated through
  Cloudflare's SPF, DKIM, and DMARC records. Existing domain mail routing is preserved.
- Pages production service binding: `CONTACT_WORKER` → `george-hadow-contact`.
  Preview deployments should use a separate test Worker and widget; production
  deliberately rejects preview hostnames.

Worker secrets (Cloudflare dashboard → **Workers & Pages → george-hadow-contact
→ Settings → Variables and Secrets**):

| Secret | Purpose |
| --- | --- |
| `TURNSTILE_SECRET` | Matching secret for the contact widget |
| `CONTACT_TO` | Private destination address, `georgehadow@gmail.com` |
| `CONTACT_FROM` | Authenticated sender, `website@contact.georgehadow.com` |

The Gmail destination is verified in Cloudflare. If the recipient changes,
confirm the new destination using Cloudflare’s verification email before testing.

The static Next.js build requires `NEXT_PUBLIC_TURNSTILE_SITE_KEY`. It is public;
copy `.env.example` to `.env.local` and set the site key above. A missing site key
shows an unavailable message and disables submission. Never put Worker secrets
in `NEXT_PUBLIC_*` variables or in `public/`.

For Worker changes, run:

```bash
npm run check:contact
npm run test:contact
npm run contact:build
npm run contact:deploy
```

`workers/contact/cloudflare.config.ts` declares the Worker and its email binding.
The build uses the Cloudflare Vite adapter. The initial setup stores secrets in
`.contact-secrets.json` (gitignored, permissions 0600). To upload these when creating
or rotating the Worker, run from `workers/contact/`:

```bash
npx cf deploy --secrets-file ../../.contact-secrets.json
```

Keep that file private. Existing Worker secrets are preserved on ordinary deployments.
After changing the public site key, rebuild and upload the static Pages site too.

### Local contact development

Use Node.js 22.23+ and run `npm ci` at the repository root (includes the Worker
workspace). Copy `workers/contact/.dev.vars.example` to
`workers/contact/.dev.vars`, and use Cloudflare's public always-pass **test** site
key `1x00000000000000000000AA` in `.env.local`. These test keys must never be
used in production. Start `npm run contact:dev` in one terminal and `npm run dev`
in another. The Next.js development API proxies to the local Worker on port 8787.
The Worker development hostnames are overridden in `.dev.vars`; email sending
is simulated locally unless remote bindings are explicitly enabled.

The automated contact checks stub Siteverify and email delivery; they do not
send real messages. They cover successful delivery, native redirects, invalid
and expired verification, action/hostname mismatches, malformed/oversized input,
origin checks, missing configuration, provider failures, and the Pages proxy.
A final live check requires a real visitor token: submit once on the production
contact page, confirm receipt in the destination inbox, then verify that reusing
the same token is rejected. Automated tests are not proof of inbox delivery.

## Manual Concert File

The `concerts.txt` file contains manually added concerts that complement the automatically scraped data. This file is loaded at runtime and concerts are merged with the scraped data.

Concert scraping needs no secret. The contact Worker requires the private settings listed above.

## Contributing

1. Follow the coding guidelines in `AGENTS.md`
2. Test your changes locally
3. Run linting before committing
4. Create descriptive commit messages

## License

MIT License - see LICENSE file for details.

## Disclaimer

This application scrapes data from kuhnfumusic.com. Please respect the website's terms of service and robots.txt. This is for informational purposes only.