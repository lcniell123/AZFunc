const { BlobServiceClient } = require("@azure/storage-blob");
const fetch = require("node-fetch");

const connectionString = process.env.AZURE_STORAGE_CONNECTION_STRING;
const containerName = "gsc-data";

module.exports = async function (context, req) {
  const question = req.body?.question || "";

  const blobServiceClient =
    BlobServiceClient.fromConnectionString(connectionString);
  const containerClient = blobServiceClient.getContainerClient(containerName);

  let relevantText = [];

  for await (const blob of containerClient.listBlobsFlat()) {
    const blobClient = containerClient.getBlobClient(blob.name);
    const download = await blobClient.downloadToBuffer();
    const content = download.toString();

    if (content.toLowerCase().includes(question.toLowerCase())) {
      relevantText.push(content);
    }
  }

  // Prepare prompt for LLM (keep it short)
  const prompt = `Answer this question: "${question}" using this GSC data: ${relevantText
    .slice(0, 1)
    .join("\n")
    .slice(0, 3000)}`;

  // OPTIONAL: Call a small LLM (Azure OpenAI or Huggingface)
  const response = await fetch(
    "https://api-inference.huggingface.co/models/google/flan-t5-small",
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.HUGGINGFACE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ inputs: prompt }),
    }
  );

  const result = await response.json();

  context.res = {
    body: { answer: result[0]?.generated_text || "No answer found." },
  };
};
