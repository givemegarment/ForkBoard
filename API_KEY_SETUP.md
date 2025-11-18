# Where to Paste Your Polymarket API Key

## 📍 File Location

**File:** `.env.local`  
**Location:** `/Users/samlebovsky/Desktop/projects/Forkboard/.env.local`

## 🔑 What to Add

Open the `.env.local` file and replace `your_api_key_here` with your actual Polymarket API key from Builder Codes:

```bash
POLYMARKET_API_KEY=your_actual_api_key_here
```

## 📝 Example

If your API key is `abc123xyz789`, it should look like:

```bash
POLYMARKET_API_KEY=abc123xyz789
```

## ✅ After Adding Your Key

1. **Save the file**
2. **Restart your dev server:**
   ```bash
   npm run dev
   ```
3. **Check the console** - the scanner should now use your API key for authenticated requests

## 🔒 Security Note

- The `.env.local` file is already in `.gitignore` - it won't be committed to git
- Never share your API key publicly
- This API key is for **read-only scanning** (no trading)

## 🎯 What This Does

Your API key will be automatically included in all Polymarket API requests for:
- Fetching market data
- Getting orderbook information
- Scanning for opportunities

The scanner will work without the API key (public access), but having it may provide:
- Higher rate limits
- Access to additional data
- Better reliability

