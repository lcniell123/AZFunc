const { BlobServiceClient } = require('@azure/storage-blob');
const { v4: uuidv4 } = require('uuid');
const { QdrantClient } = require('@qdrant/js-client-rest');

module.exports = async function (context, req) {
  const qdrantUrl = process.env.QDRANT_URL;
  const qdrantApiKey = process.env.QDRANT_API_KEY;
  const storageConnStr = process.env.AzureWebJobsStorage;

  const containerName = 'gsc-data';
  const blobName = 'reportTest.json';
  const collectionName = 'gsc-chunks';

  try {
    // 1. Load JSON data from Azure Blob
    const blobServiceClient = BlobServiceClient.fromConnectionString(storageConnStr);
    const containerClient = blobServiceClient.getContainerClient(containerName);
    const blobClient = containerClient.getBlobClient(blobName);
    const downloadResponse = await blobClient.download();
    const downloaded = await streamToText(downloadResponse.readableStreamBody);
    const data = JSON.parse(downloaded);

    if (!Array.isArray(data)) throw new Error('Data must be an array');

    // 2. Load embedding pipeline using Xenova
    const { pipeline } = await import('@xenova/transformers');
    const extractor = await pipeline('feature-extraction', 'Xenova/all-MiniLM-L6-v2');
    context.log("🚀 Embedding model initialized");

    const vectors = [];

    for (let i = 0; i < data.length; i++) {
      const row = data[i];
      const url = row.keys?.[0] || 'unknown';
      const text = `URL: ${url}, Clicks: ${row.clicks}, Impressions: ${row.impressions}, CTR: ${(row.ctr * 100).toFixed(2)}%, Position: ${row.position?.toFixed(1)}`;

      if (!text || typeof text !== 'string' || text.trim().length < 10 || text.split(' ').length < 3) {
        context.log(`⚠️ Skipping row ${i} - invalid or too short text: "${text}"`);
        continue;
      }

      const output = await extractor(text, {
        pooling: 'mean',
        normalize: true
      });

      if (!output?.data?.length || output.data.some(val => typeof val !== 'number')) {
        context.log(`❌ Invalid embedding returned for row ${i}`);
        continue;
      }

      vectors.push({
        id: uuidv4(),
        vector: Array.from(output.data),
        payload: {
          ...row,
          url,
          source: 'gsc',
          timestamp: new Date().toISOString()
        }
      });
    }

    if (!vectors.length) throw new Error('No valid embeddings generated. Aborting upload.');

    // 3. Upload to Qdrant using SDK
    const client = new QdrantClient({
      url: qdrantUrl,
      apiKey: qdrantApiKey
    });

    // Optional: check if collection exists
    try {
      await client.getCollection(collectionName);
    } catch {
      throw new Error(`Qdrant collection '${collectionName}' does not exist.`);
    }

    const batchSize = 50;
    context.log(`📦 Uploading ${vectors.length} vectors in batches of ${batchSize}...`);
    context.log("🧪 First point to upload:", JSON.stringify(vectors[0], null, 2));

    for (let i = 0; i < vectors.length; i += batchSize) {
      const batch = vectors.slice(i, i + batchSize);
      const result = await client.upsert(collectionName, {
        points: batch.map(v => ({
          id: v.id,
          vector: v.vector,
          payload: v.payload
        }))
      });
      context.log(`✅ Uploaded batch ${i}–${i + batch.length - 1}: status ${result.status}`);
    }

    context.res = {
      status: 200,
      body: `✅ Uploaded ${vectors.length} embeddings to Qdrant collection '${collectionName}'.`
    };

  } catch (err) {
    context.log("❌ Full error object:", err);
    const detailed = err?.response?.data?.status?.error || err.message || 'Unknown error';
    context.res = {
      status: 500,
      body: `❌ Upload failed: ${detailed}`
    };
  }
};

async function streamToText(readable) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    readable.on("data", (chunk) => chunks.push(chunk));
    readable.on("end", () => resolve(Buffer.concat(chunks).toString("utf8")));
    readable.on("error", reject);
  });
}
