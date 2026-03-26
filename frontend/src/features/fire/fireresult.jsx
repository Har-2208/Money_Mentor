function formatINR(value) {
	const amount = Number(value || 0);
	return `INR ${amount.toLocaleString("en-IN", { maximumFractionDigits: 2 })}`;
}

function formatPercent(value) {
	const percentage = Number(value || 0) * 100;
	return `${percentage.toFixed(0)}%`;
}

export default function FireResult({ result }) {
	const plan = result?.fire_plan;

	if (!plan) {
		return (
			<div className="text-sm text-slate-300">
				No FIRE plan data was returned by the server.
			</div>
		);
	}

	const allocationEntries = Object.entries(plan.asset_allocation || {});

	return (
		<div className="space-y-5">
			<h2 className="text-lg md:text-xl font-semibold text-emerald-300">Your FIRE Plan</h2>

			<div className="grid gap-3 md:grid-cols-2">
				<div className="rounded-lg border border-slate-700 bg-slate-900 p-4">
					<p className="text-xs uppercase tracking-wider text-slate-400">Monthly SIP Needed</p>
					<p className="mt-1 text-2xl font-semibold text-white">{formatINR(plan.monthly_sip)}</p>
				</div>

				<div className="rounded-lg border border-slate-700 bg-slate-900 p-4">
					<p className="text-xs uppercase tracking-wider text-slate-400">Target Corpus</p>
					<p className="mt-1 text-2xl font-semibold text-white">{formatINR(plan.target_corpus)}</p>
				</div>

				<div className="rounded-lg border border-slate-700 bg-slate-900 p-4">
					<p className="text-xs uppercase tracking-wider text-slate-400">Years To Retire</p>
					<p className="mt-1 text-2xl font-semibold text-white">{plan.timeline?.years_to_retire ?? "-"}</p>
				</div>

				<div className="rounded-lg border border-slate-700 bg-slate-900 p-4">
					<p className="text-xs uppercase tracking-wider text-slate-400">Insurance Gap</p>
					<p className="mt-1 text-2xl font-semibold text-white">{formatINR(plan.insurance_gap)}</p>
				</div>
			</div>

			<div className="rounded-lg border border-slate-700 bg-slate-900 p-4">
				<p className="text-xs uppercase tracking-wider text-slate-400">Suggested Asset Allocation</p>
				<div className="mt-3 grid gap-2 md:grid-cols-3">
					{allocationEntries.length === 0 && (
						<p className="text-sm text-slate-300">No allocation breakdown available.</p>
					)}
					{allocationEntries.map(([asset, weight]) => (
						<div key={asset} className="rounded-md bg-slate-800 px-3 py-2">
							<p className="text-xs text-slate-400 capitalize">{asset}</p>
							<p className="text-base font-medium text-emerald-300">{formatPercent(weight)}</p>
						</div>
					))}
				</div>
			</div>
		</div>
	);
}
