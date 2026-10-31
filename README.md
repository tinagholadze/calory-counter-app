# 🍽️ Plate – AI Calorie Counter

Snap a photo of your meal and Claude estimates its **calories, protein, carbs and fat**.
Save meals to see your daily totals and a log by date, and add the app to your phone's home screen like a real app.

Built in the **Women Build AI** workshop: no coding experience needed.

---

## What it does

- 📷 Upload or take a photo of your meal
- 🔍 Claude lists each food with estimated grams, calories, protein, carbs and fat
- ✅ Shows a confidence level and what it can't see (oil, sauces, hidden ingredients)
- 📊 "Add to today" builds your daily totals
- 📅 A log of your meals, grouped by date, stored privately on your phone
- 💰 Shows the exact cost of every photo (well under 1 cent)

## How it works

```
Your phone  ──photo + password──▶  Vercel (api/analyze.js + your secret key)  ──photo + prompt──▶  Claude
            ◀──────numbers───────                                              ◀───────JSON───────
```

Your API key never reaches the phone or this repository. It lives only in Vercel's settings.

## Files

| File | What it does |
|---|---|
| `api/analyze.js` | Server function: checks the password, adds the API key and the prompt, asks Claude, returns the numbers |
| `public/index.html` | The page you see and tap: upload button, results, daily totals and log |
| `public/manifest.json` | Lets your phone install the page as an app (name, icon, full screen) |
| `public/icon.svg` | The app icon |
| `vercel.json` | Tells Vercel where the page is and allows up to 30 seconds per request |
| `package.json` | Project information for Vercel |

The folder names `api` and `public` must stay exactly as they are.

## Build your own copy

You need free accounts at [platform.claude.com](https://platform.claude.com), [github.com](https://github.com) and [vercel.com](https://vercel.com), plus a few dollars of Claude credit.

1. **Get an API key:** Claude Console → **API keys** → **Create key**. Set a monthly spend limit under Billing.
2. **Copy the files:** create your own GitHub repository and upload these files, keeping the `api` and `public` folders.
3. **Connect Vercel:** Vercel → **Add New** → **Project** → **Import** your repository → Framework Preset **Other**.
4. **Add two Environment Variables** before deploying:

   | Key | Value |
   |---|---|
   | `ANTHROPIC_API_KEY` | your key from the Claude Console |
   | `APP_PASSWORD` | a password you make up |

5. **Deploy**, open your link, enter your password and upload a meal photo.
6. **On your phone:** open the link → Share → **Add to Home Screen**.

Changed an Environment Variable later? Go to **Deployments** → **⋯** → **Redeploy**.

## Costs

The app uses **Claude Haiku 5.5**. One photo is roughly 700 input + 400 output tokens, about **0.03 cents**. Three meals a day for a month costs a few cents.

## Good to know

- Photo estimates are typically **±20–30%**: oil, sauces and portion depth are hard to see in a picture. Use it as a helpful guide, not a strict judge.
- Your meal log is stored only in your phone's browser. Clearing browser data or switching phones starts it fresh.
- **Never put your API key in a file in this repository.** It belongs only in Vercel's Environment Variables.
