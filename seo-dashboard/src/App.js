import { useEffect, useState } from "react";

function App() {
  const [reports, setReports] = useState([]);

  // SET YOUR STORAGE INFO HERE
  // const containerUrl = "https://yourstorageaccount.blob.core.windows.net/gsc-data";
  // const sasToken = "sv=....&sig=...."; // your real SAS token
  const containerUrl = process.env.REACT_APP_CONTAINER_URL;
  const sasToken = process.env.REACT_APP_SAS_TOKEN;

  useEffect(() => {
    async function fetchReports() {
      try {
        const listUrl = `${containerUrl}?restype=container&comp=list&${sasToken}`;
        const listResponse = await fetch(listUrl);
        const listText = await listResponse.text();

        const parser = new DOMParser();
        const xml = parser.parseFromString(listText, "application/xml");

        const blobs = Array.from(xml.getElementsByTagName("Blob")).map(
          (blob) => blob.getElementsByTagName("Name")[0].textContent
        );

        console.log("Blobs found:", blobs);

        const fetchPromises = blobs.map(async (blobName) => {
          const blobUrl = `${containerUrl}/${blobName}?${sasToken}`;
          const blobResponse = await fetch(blobUrl);
          return blobResponse.json();
        });

        const allData = await Promise.all(fetchPromises);
        console.log("All report data:", allData);
        const flattenedData = allData.flat();

        setReports(flattenedData);
      } catch (error) {
        console.error("Error fetching reports:", error);
      }
    }

    fetchReports();
  }, [containerUrl, sasToken]);
  // Add styles for the table
  const thStyle = {
    padding: "10px",
    backgroundColor: "#f4f4f4",
    borderBottom: "2px solid #ddd",
  };

  const tdStyle = {
    padding: "8px",
    borderBottom: "1px solid #eee",
  };

  return (
    <div style={{ padding: "20px" }}>
      <h1>GSC Reports Overview</h1>

      {reports.length > 0 ? (
        <table
          style={{
            width: "100%",
            borderCollapse: "collapse",
            textAlign: "left",
          }}
        >
          <thead>
            <tr>
              <th style={thStyle}>URL</th>
              <th style={thStyle}>Clicks</th>
              <th style={thStyle}>Impressions</th>
              <th style={thStyle}>CTR (%)</th>
            </tr>
          </thead>
          <tbody>
            {reports.map((row, idx) => (
              <tr key={idx}>
                <td style={tdStyle}>{row.keys[0] || "Unknown"}</td>
                <td style={tdStyle}>{row.clicks ?? 0}</td>
                <td style={tdStyle}>{row.impressions ?? 0}</td>
                <td style={tdStyle}>{row.ctr ?? 0}%</td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : (
        <p>Loading reports...</p>
      )}
    </div>
  );
}

export default App;
