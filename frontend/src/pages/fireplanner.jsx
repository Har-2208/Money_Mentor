import { useState } from "react";
import FireForm from "../features/fire/fireform";
import FireResult from "../features/fire/fireresult";
import fireService from "../features/fire/fireservice";

const initialFormData = {};

export default function FirePlanner() {
  const [formData, setFormData] = useState(initialFormData);
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (data) => {
    setFormData(data);
    setLoading(true);
    setError("");
    try {
      const response = await fireService.generateFirePlan(data);
      setResult(response);
    } catch (err) {
      const message =
        err?.message || "Unable to generate FIRE plan. Please try again.";
      setError(message);
      setResult(null);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-white flex items-center justify-center px-4 py-10">
      <div className="w-full max-w-4xl">
        <div className="bg-slate-900/70 border border-slate-800 rounded-2xl shadow-2xl p-6 md:p-10">
          <header className="text-center mb-8">
            <p className="text-xs uppercase tracking-[0.3em] text-emerald-400">
              Plan Your Exit
            </p>
            <h1 className="text-3xl md:text-4xl font-semibold mt-2">
              FIRE Planner
            </h1>
            <p className="text-slate-300 mt-3">
              Estimate your path to financial independence and early retirement.
            </p>
          </header>

          <div className="space-y-6">
            <div className="bg-slate-950/60 border border-slate-800 rounded-xl p-4 md:p-6">
              <FireForm onSubmit={handleSubmit} />
            </div>

            {loading && (
              <div className="flex items-center justify-center gap-3 text-emerald-300">
                <span className="h-3 w-3 rounded-full bg-emerald-400 animate-pulse"></span>
                <span className="text-sm">Calculating your FIRE plan...</span>
              </div>
            )}

            {error && (
              <div className="bg-rose-950/40 border border-rose-800/70 text-rose-200 rounded-xl p-4 text-sm">
                {error}
              </div>
            )}

            {result && !loading && (
              <div className="bg-slate-950/60 border border-slate-800 rounded-xl p-4 md:p-6">
                <FireResult result={result} />
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
