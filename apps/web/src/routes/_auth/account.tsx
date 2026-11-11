import type { AppRouterClient } from "@math/api/routers/index";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@math/ui/components/select";
import { skipToken, useQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import {
	CartesianGrid,
	Line,
	LineChart,
	ResponsiveContainer,
	Tooltip,
	XAxis,
	YAxis,
} from "recharts";

import { orpc } from "@/utils/orpc";

export const Route = createFileRoute("/_auth/account")({
	component: RouteComponent,
});

type Summary = Awaited<ReturnType<AppRouterClient["game"]["configs"]>>[number];
type Config = Summary["config"];

const OP_SYMBOL = { add: "+", sub: "−", mul: "×", div: "÷" } as const;

function describe(c: Config) {
	const r = (x: { min: number; max: number }) => `${x.min}–${x.max}`;
	const parts = [c.ops.map((o) => OP_SYMBOL[o]).join(" "), `${c.duration}s`];
	if (c.ops.includes("add") || c.ops.includes("sub"))
		parts.push(`(${r(c.addLeft)}) + (${r(c.addRight)})`);
	if (c.ops.includes("mul") || c.ops.includes("div"))
		parts.push(`(${r(c.mulLeft)}) × (${r(c.mulRight)})`);
	return parts.join(" · ");
}

const fmtDate = (t: number) =>
	new Date(t).toLocaleDateString(undefined, { month: "short", day: "numeric" });

function RouteComponent() {
	const configs = useQuery(orpc.game.configs.queryOptions());
	const [selected, setSelected] = useState("0");

	const summary = configs.data?.[Number(selected)];
	const history = useQuery(
		orpc.game.history.queryOptions({ input: summary?.config ?? skipToken }),
	);

	if (configs.isPending) {
		return <Page>Loading…</Page>;
	}
	if (configs.isError) {
		return <Page>Couldn't load your results.</Page>;
	}
	if (!configs.data.length) {
		return <Page>No games yet. Finish one and it'll show up here.</Page>;
	}

	const items = configs.data.map((s, i) => ({
		value: String(i),
		label: describe(s.config),
	}));
	const points =
		history.data?.map((r) => ({ t: r.playedAt.getTime(), score: r.score })) ??
		[];

	return (
		<Page>
			<div className="grid gap-6">
				<div className="flex flex-wrap items-center gap-2 text-sm">
					Settings:
					<Select
						items={items}
						value={selected}
						onValueChange={(v) => {
							if (v !== null) setSelected(v);
						}}
					>
						<SelectTrigger className="min-w-72">
							<SelectValue />
						</SelectTrigger>
						<SelectContent>
							{items.map((item) => (
								<SelectItem key={item.value} value={item.value}>
									{item.label}
								</SelectItem>
							))}
						</SelectContent>
					</Select>
				</div>

				{summary && (
					<div className="text-muted-foreground flex gap-6 text-sm">
						<span>Games: {summary.plays}</span>
						<span>Best: {summary.best}</span>
					</div>
				)}

				<div className="h-72 w-full">
					{history.isPending ? (
						<p className="text-muted-foreground text-sm">Loading…</p>
					) : (
						<ResponsiveContainer width="100%" height="100%">
							<LineChart
								data={points}
								margin={{ top: 8, right: 16, left: -16 }}
							>
								<CartesianGrid stroke="var(--border)" strokeDasharray="3 3" />
								<XAxis
									dataKey="t"
									type="number"
									scale="time"
									domain={["dataMin", "dataMax"]}
									tickFormatter={fmtDate}
									stroke="var(--muted-foreground)"
									fontSize={12}
								/>
								<YAxis
									allowDecimals={false}
									stroke="var(--muted-foreground)"
									fontSize={12}
								/>
								<Tooltip
									labelFormatter={(t) => new Date(t as number).toLocaleString()}
									contentStyle={{
										background: "var(--popover)",
										border: "1px solid var(--border)",
										borderRadius: 8,
										color: "var(--popover-foreground)",
									}}
								/>
								<Line
									type="monotone"
									dataKey="score"
									stroke="var(--primary)"
									strokeWidth={2}
									dot={{ r: 3 }}
								/>
							</LineChart>
						</ResponsiveContainer>
					)}
				</div>
			</div>
		</Page>
	);
}

function Page({ children }: { children: React.ReactNode }) {
	return (
		<div className="container mx-auto max-w-3xl px-4 py-8">
			<h1 className="mb-6 text-xl font-semibold">Your results</h1>
			{children}
		</div>
	);
}
