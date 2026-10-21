# Alexa Caretaker

**Alexa+ track** · optional **AWS Builder** (Amazon Bedrock) · Amazon Developer Hackathon

A simulated Alexa+ **family caretaker** that helps parents track medicines, remind on time, and see who took / missed a dose. The web page is an MCP client. It calls a self-hosted Streamable HTTP server (spec 2025-11-25) on this API.

> Reminder and adherence coaching only — not medical advice, diagnosis, or prescribing.

## What it does

1. Knows today’s medicine schedule for a household member  
2. Alexa asks: “It’s time for Amoxicillin — did you take it?”  
3. Logs taken / missed / skipped  
4. Caretaker asks: “Did Mom take her evening medicines?”  
5. Optional: **Amazon Bedrock** rephrases tool facts into warmer spoken replies  
6. The page discovers tools with MCP `initialize` and `tools/list`, then runs them with `tools/call`  

## Quick start

```bash
cd carecue
npm install
npm install --prefix server
npm install --prefix client
copy .env.example server\.env
npm run dev
```

- API: http://localhost:5050  
- UI: http://localhost:5174  

Leave `MONGO_URI` empty to use in-memory storage.

## MCP (Alexa+ track)

Endpoint: `POST http://localhost:5050/mcp`  
Transport: Streamable HTTP, protocol `2025-11-25`, JSON responses.  
The Vite dev server proxies `/mcp` to that endpoint.

Tools:

- `list_today_doses`
- `mark_taken`
- `mark_missed`
- `caretaker_summary`
- `next_due`
- `add_medicine`

The page chooses a tool from the typed sentence, then the medicine action goes through `tools/call`. Speech stays on the rules engine until Bedrock quota is available. You can also connect [MCP Inspector](https://github.com/modelcontextprotocol/inspector) to `http://localhost:5050/mcp`.

## Amazon Bedrock setup (AWS Builder)

Tools always run locally (schedule truth). Bedrock only rewrites the final Alexa speech.

1. In AWS Console → **Amazon Bedrock** → **Model access**, enable a chat model (e.g. `amazon.nova-lite-v1:0` or Claude Haiku).  
2. Create IAM credentials with `bedrock:InvokeModel` / `bedrock:Converse`.  
3. Put values in `server/.env`:

```env
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=...
AWS_SECRET_ACCESS_KEY=...
BEDROCK_MODEL_ID=amazon.nova-lite-v1:0
```

4. Restart the API. Health check should show `"bedrock": { "configured": true }`.  
5. Chat replies include `speechSource: "bedrock"` when phrasing used Bedrock.

If Bedrock is missing or fails, the app still works with rule-based speech.

## Demo script

1. “What’s due today?”  
2. “Mark Amoxicillin as taken”  
3. “I missed the evening vitamin”  
4. “Did Mom take her medicines?”  

## Stack

- Express + React (Vite)  
- MCP Streamable HTTP (`@modelcontextprotocol/sdk`, spec 2025-11-25)  
- Optional MongoDB  
- Optional Amazon Bedrock (`@aws-sdk/client-bedrock-runtime` Converse API)  

Folder on disk: `carecue` · Product name: **Alexa Caretaker**.
