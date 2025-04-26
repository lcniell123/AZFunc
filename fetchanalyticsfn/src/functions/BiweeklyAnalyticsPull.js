const { app } = require("@azure/functions");
const { google } = require("googleapis");
const { BlobServiceClient } = require("@azure/storage-blob");
const path = require("path");

const credentialsPath = path.join(__dirname, "../../credentials.json");
const containerName = "gsc-data";

app.timer("BiweeklyAnalyticsPull", {
  schedule: "0 */1 * * * *", // every 5 mins
  handler: async (myTimer, context) => {
    context.log("🚀 GSC pull started:", new Date().toISOString());

    try {
      // Authenticate with GSC
      const auth = new google.auth.GoogleAuth({
        keyFile: credentialsPath,
        scopes: ["https://www.googleapis.com/auth/webmasters.readonly"],
      });
      const client = await auth.getClient();
      const searchconsole = google.searchconsole({
        version: "v1",
        auth: client,
      });

      const siteUrl = "https://www.dciedge.com"; // 👈 Replace with your actual verified domain
      const today = new Date();
      const lastWeek = new Date();
      lastWeek.setDate(today.getDate() - 7);

      const startDate = lastWeek.toISOString().split("T")[0];
      const endDate = today.toISOString().split("T")[0];

      const request = {
        siteUrl,
        requestBody: {
          startDate,
          endDate,
          dimensions: ["query", "page"],
          rowLimit: 25000,
        },
      };

      const response = await searchconsole.searchanalytics.query(request);
      const rows = response.data.rows || [];
      context.log(`📊 GSC returned ${rows.length} rows`);

      // Upload to Azure Blob
      const blobServiceClient = BlobServiceClient.fromConnectionString(
        process.env.AzureWebJobsStorage
      );
      const containerClient =
        blobServiceClient.getContainerClient(containerName);

      if (!(await containerClient.exists())) {
        await containerClient.create();
        context.log(`🪣 Created container: ${containerName}`);
      }

      const filename = `gsc-report-${endDate}.json`;
      const blobClient = containerClient.getBlockBlobClient(filename);
      const content = JSON.stringify(rows, null, 2);

      await blobClient.upload(content, Buffer.byteLength(content));
      context.log(`✅ Uploaded GSC data to blob: ${filename}`);
    } catch (err) {
      context.log("❌ ERROR pulling GSC data:", err.message);
    }
  },
});
