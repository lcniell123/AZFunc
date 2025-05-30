# 📡 vectorUploader Azure Function

This Azure Function ingests Google Search Console (GSC) data stored in Azure Blob Storage, converts it to text descriptions, embeds the text using a local model via `@xenova/transformers`, and uploads the resulting vectors to a Qdrant Cloud collection (`seo-analytics`) for use in a Retrieval-Augmented Generation (RAG) pipeline.

## ✅ What It Does

1. Downloads `reportTest.json` from the `gsc-data` container in your Azure Blob Storage.
2. Parses GSC rows into readable text (e.g., “URL X had Y clicks, Z CTR, etc.”).
3. Embeds text using `Xenova/all-MiniLM-L6-v2` with mean pooling + normalization.
4. Batches and uploads the vectors to a Qdrant collection (`seo-analytics`).
5. Skips invalid rows and logs meaningful progress or errors.

## 📁 Folder Structure

```
fetchanalyticsfn/
├── host.json
├── local.settings.json
└── vectorUploader/
    ├── index.js
    └── function.json
```

## 🔧 Setup

### 1. Install dependencies

```bash
npm install @xenova/transformers @qdrant/js-client-rest
```

### 2. Configure local settings

Create or update `local.settings.json`:

```json
{
  "IsEncrypted": false,
  "Values": {
    "AzureWebJobsStorage": "<your-storage-connection-string>",
    "QDRANT_URL": "<your-qdrant-url>",
    "QDRANT_API_KEY": "<your-qdrant-api-key>",
    "FUNCTIONS_WORKER_RUNTIME": "node"
  }
}
```

## 🚀 Running Locally

Start the function app:

```bash
func start
```

Then visit:

```
http://localhost:7071/api/vectorUploader
```

Watch the logs for:

- ✅ Embedding progress
- ✅ Upload confirmation
- ❌ Error details (with full trace)

## 🧠 Next Steps

- ✅ Build a `searchGSC.js` function to query Qdrant for top matches to a user prompt
- ✅ Add summarization using Hugging Face’s `distilbart-cnn` or OpenAI
- ✅ Set up scheduled ingestion (e.g., every 3 days)
