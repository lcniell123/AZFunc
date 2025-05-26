### Azure Function Project – GA4/GSC Summarization and Question Answering (RAG System)

# Description:
This Azure Function App (Node.js) implements a Retrieval-Augmented Generation (RAG) system that allows users to ask questions or generate summaries from large GA4 or Google Search Console (GSC) datasets. The data is stored in Azure Blob Storage, chunked and embedded, indexed in Qdrant Cloud, and queried using Hugging Face LLMs.

# Components:

chatbotSummary

Accepts a user query via HTTP POST

Loads JSON data (GA4 or GSC) from local file or Azure Blob

Chunks and filters key performance entries

Formats a summarization or question prompt

Sends the prompt to Hugging Face API (e.g., distilbart-cnn-12-6, mistral)

Returns a summary or answer

biweeklyAnalyticsPull

Timer-triggered Azure Function

Pulls GSC data using Google Search Console API

Generates reports for a specific time window

Uploads JSON reports to Azure Blob Storage

Automatically names and stores data by timestamp

# Technologies Used:

Azure Functions (Node.js)

Azure Blob Storage

Hugging Face Inference API (MiniLM, DistilBART, Mistral)

Qdrant Cloud (Vector database for chunk retrieval)

Google Search Console API

Environment Variables:

AZURE_STORAGE_CONNECTION_STRING

HUGGING_FACE_API_KEY

QDRANT_API_KEY

QDRANT_URL

Example local.settings.json:

{
"IsEncrypted": false,
"Values": {
"AzureWebJobsStorage": "<your-azure-blob-conn-string>",
"HUGGING_FACE_API_KEY": "<your-hf-token>",
"QDRANT_API_KEY": "<your-qdrant-key>",
"QDRANT_URL": "https://your-qdrant-instance-url"
}
}

# Installation:

Clone the repository

Run npm install

Add your local.settings.json

Run locally with func start

How to Use:
Send a POST request to the function endpoint with a JSON body:

# Example:
{
"question": "Which pages had the highest CTR last month?"
}

The function will:

Embed the question

Query Qdrant for relevant data chunks

Build a prompt

Send the prompt to Hugging Face

Return the LLM-generated answer

Data Flow:

Data pulled (biweeklyAnalyticsPull)

Stored in Azure Blob

Loaded by chatbotSummary

Chunked and embedded into Qdrant

Query processed via semantic search + LLM

Next Steps:

Automate embedding new blobs into Qdrant

Add support for user-uploaded files

Extend to support layout generation or dashboards

Create a React or static front-end to call the function

