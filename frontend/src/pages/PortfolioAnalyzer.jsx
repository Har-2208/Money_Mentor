import { useState } from "react";
import UploadPortfolio from "../features/portfolio/UploadPortfolio";
import PortfolioResult from "../features/portfolio/PortfolioResult";
import portfolioService from "../features/portfolio/portfolioService";

export default function PortfolioAnalyzer() {
  const [file, setFile] = useState(null);
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleFileSelect = (nextFile) => {
    if (!nextFile) {
      setFile(null);
      return;
    }

    const isPdf =
      nextFile.type === "application/pdf" ||
      nextFile.name.toLowerCase().endsWith(".pdf");

    if (!isPdf) {
      setError("Only PDF files are supported for analysis.");
      setFile(null);
      return;
    }

    setError("");
    setFile(nextFile);
  };

  const handleSubmit = async () => {
    if (!file) {
      setError("Please select a CAMS PDF to analyze.");
      return;
    }

    setLoading(true);
    setError("");
    try {
      const response = await portfolioService.uploadPortfolio(file);
      setResult(response);
    } catch (err) {
      const message =
        err?.message ||
        "Unable to analyze your portfolio right now. Please try again.";
      setError(message);
      setResult(null);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="portfolio-page">
      <div className="portfolio-shell">
        <header className="portfolio-hero">
          <div>
            <p className="portfolio-eyebrow">Mutual Fund Health Check</p>
            <h1>📈 Portfolio X-Ray Analyzer</h1>
            <p className="portfolio-subtitle">
              Detect overlap, fees, and performance drag from your CAMS report.
            </p>
          </div>
          <div className="portfolio-hero-stack">
            <div className="portfolio-hero-card">
              <p className="portfolio-hero-label">XIRR Snapshot</p>
              <p className="portfolio-hero-value">See return quality</p>
              <p className="portfolio-hero-meta">
                Annualized performance view.
              </p>
            </div>
            <div className="portfolio-hero-card accent">
              <p className="portfolio-hero-label">Overlap + Fees</p>
              <p className="portfolio-hero-value">Spot redundancy fast</p>
              <p className="portfolio-hero-meta">
                Actionable rebalancing tips.
              </p>
            </div>
          </div>
        </header>

        <div className="portfolio-card">
          <UploadPortfolio
            file={file}
            onFileSelect={handleFileSelect}
            onSubmit={handleSubmit}
            loading={loading}
          />
        </div>

        {loading && (
          <div className="portfolio-status">
            <span className="portfolio-pulse" aria-hidden="true"></span>
            <span>Analyzing your portfolio...</span>
          </div>
        )}

        {error && <div className="portfolio-error">{error}</div>}

        <div
          className={`portfolio-card portfolio-result-shell ${
            result && !loading ? "is-visible" : "is-hidden"
          }`}
        >
          {result && !loading && <PortfolioResult result={result} />}
        </div>
      </div>
    </div>
  );
}
