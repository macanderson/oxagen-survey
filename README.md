# Oxagen agent survey

A two-minute, nine-question survey on how teams run AI agents. Every completed survey is one entry in a drawing for a $100 OpenRouter API credit package.

```
public/index.html   the survey (questions are the Q array at the top of its script)
public/terms.html   the drawing rules
api/submit.js       POST: saves a response, enters the email once
api/export.js       GET ?token=: every response as CSV (or &format=json)
api/draw.js         GET ?token=: preview; POST ?token=&confirm=1: draw and record a winner; GET &history=1
api/_lib.js         shared helpers
```

Hosted on Vercel; responses live in a private Vercel Blob store (`responses/`, `entries/`, `draws/`). Two environment variables: `BLOB_READ_WRITE_TOKEN` (set by `vercel blob create-store`) and `ADMIN_TOKEN` (protects export and draw).

## Run the drawing

```sh
TOKEN=$(vercel env pull /dev/stdout 2>/dev/null | sed -n 's/^ADMIN_TOKEN="\(.*\)"/\1/p')   # or read it in the Vercel dashboard
curl -s "https://<host>/api/draw?token=$TOKEN"                        # how many entries
curl -s -X POST "https://<host>/api/draw?token=$TOKEN&confirm=1"      # draws one winner, records it
curl -s "https://<host>/api/export?token=$TOKEN" -o responses.csv     # all answers
```

A drawn winner is excluded from later draws (for a redraw when a winner does not reply). Every draw is recorded with its time, the entry count, the index and a nonce.

## Change the questions

Edit the `Q` array in `public/index.html`: `radio` (one), `check` (many, optional `max`), or `text`. Answer keys are the `id`s and become CSV columns. Deploy with `vercel deploy --prod`.
