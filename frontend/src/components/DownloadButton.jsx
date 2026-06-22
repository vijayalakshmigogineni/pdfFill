import { useState } from "react";
import { BACKEND_URL } from "../api/pdfApi";

function DownloadButton({ documentId, beforeDownload }) {
  const [loading, setLoading] = useState(false);

  async function handleDownload() {
    try {
      setLoading(true);
      if (beforeDownload) await beforeDownload();
      // Backend generates the filled PDF on-the-fly from DB data and streams it
      window.open(`${BACKEND_URL}/api/pdf/${documentId}/filled?download=1`, "_blank");
    } catch (error) {
      alert("Failed to save responses before download");
      console.error(error);
    } finally {
      setLoading(false);
    }
  }

  return (
    <button onClick={handleDownload} disabled={loading}>
      {loading ? "Saving..." : "Download Filled PDF"}
    </button>
  );
}

export default DownloadButton;
