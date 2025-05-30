const { app } = require("@azure/functions");
const { google } = require("googleapis");
const { BlobServiceClient } = require("@azure/storage-blob");
const path = require("path");

const credentialsPath = path.join(__dirname, "../credentials.json");
const containerName = "gsc-data";

module.exports = async function (context, myTimer) {
  context.log("🚀 BiweeklyAnalyticsPull started at", new Date().toISOString());

  try {
    const auth = new google.auth.GoogleAuth({
      keyFile: credentialsPath,
      scopes: ["https://www.googleapis.com/auth/webmasters.readonly"],
    });
    const client = await auth.getClient();
    const searchconsole = google.searchconsole({ version: "v1", auth: client });

    const siteUrl = "https://www.dciedge.com/"; // update to your website
    const now = new Date();
    const startDate = new Date(now.getFullYear(), now.getMonth() - 1, 1)
      .toISOString()
      .split("T")[0];
    const endDate = new Date(now.getFullYear(), now.getMonth(), 0)
      .toISOString()
      .split("T")[0];

    const response = await searchconsole.searchanalytics.query({
      siteUrl,
      requestBody: {
        startDate,
        endDate,
        dimensions: ["page"],
      },
    });

    const blobServiceClient = BlobServiceClient.fromConnectionString(
      process.env.AZURE_STORAGE_CONNECTION_STRING
    );
    const containerClient = blobServiceClient.getContainerClient(containerName);
    const timestamp = new Date().toISOString().replace(/[:.]/g, "-") + `-${Date.now()}`;
    const blobName = `report-${timestamp}.json`;
    const blockBlobClient = containerClient.getBlockBlobClient(blobName);
    await blockBlobClient.upload(
      JSON.stringify(response.data.rows),
      Buffer.byteLength(JSON.stringify(response.data.rows))
    );

    context.log(`✅ Successfully uploaded report: ${blobName}`);
  } catch (err) {
    context.log.error("❌ Error in BiweeklyAnalyticsPull:", err);
  }
};
