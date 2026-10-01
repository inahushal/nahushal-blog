# Nahushal blog (Hugo)

## Write a new article
    hugo new posts/my-article.md
Open `content/posts/my-article.md`, write in Dhivehi below the `---` block,
and change `draft: true` to `draft: false` when ready.

## Preview locally
    hugo server
Open http://localhost:1313

## Build
    hugo --minify
Upload the contents of the `public/` folder to your hosting.

## Cloudflare Pages / Netlify
Build command: `hugo --minify`   Output directory: `public`
Environment variable: `HUGO_VERSION` = 0.167.0

Use short Latin-letter file names (my-article.md) so URLs stay clean.
