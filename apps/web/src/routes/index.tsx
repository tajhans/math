import { Button } from "@math/ui/components/button";
import { Checkbox } from "@math/ui/components/checkbox";
import { Input } from "@math/ui/components/input";
import { Label } from "@math/ui/components/label";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@math/ui/components/select";
import { useMutation } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { authClient } from "@/lib/auth-client";
import { orpc } from "@/utils/orpc";

export const Route = createFileRoute("/")({
	component: HomeComponent,
});

type Op = "add" | "sub" | "mul" | "div";
type Range = { min: number; max: number };
type Settings = {
	ops: Op[];
	addLeft: Range;
	addRight: Range;
	mulLeft: Range;
	mulRight: Range;
	duration: number;
};
type Problem = { text: string; answer: number };

const DEFAULT_FORM = {
	add: true,
	sub: true,
	mul: true,
	div: true,
	add_left_min: "2",
	add_left_max: "100",
	add_right_min: "2",
	add_right_max: "100",
	mul_left_min: "2",
	mul_left_max: "12",
	mul_right_min: "2",
	mul_right_max: "100",
	duration: "120",
};
type FormState = typeof DEFAULT_FORM;
type RangeField = Exclude<keyof FormState, Op | "duration">;

const DURATIONS = ["30", "60", "120", "300", "600"];

function randIn({ min, max }: Range) {
	return min + Math.floor(Math.random() * (max - min + 1));
}

function generate(s: Settings): Problem {
	while (true) {
		const op = s.ops[Math.floor(Math.random() * s.ops.length)];
		if (op === "add") {
			const a = randIn(s.addLeft);
			const b = randIn(s.addRight);
			return { text: `${a} + ${b}`, answer: a + b };
		}
		if (op === "sub") {
			const a = randIn(s.addLeft);
			const b = randIn(s.addRight);
			return { text: `${a + b} – ${a}`, answer: b };
		}
		if (op === "mul") {
			const a = randIn(s.mulLeft);
			const b = randIn(s.mulRight);
			return { text: `${a} × ${b}`, answer: a * b };
		}
		const a = randIn(s.mulLeft);
		const b = randIn(s.mulRight);
		if (a !== 0) return { text: `${a * b} ÷ ${a}`, answer: b };
	}
}

function toSettings(f: FormState): Settings | null {
	const range = (prefix: string): Range | null => {
		const min = Number(f[`${prefix}_min` as RangeField]);
		const max = Number(f[`${prefix}_max` as RangeField]);
		if (!Number.isInteger(min) || !Number.isInteger(max) || min > max)
			return null;
		return { min, max };
	};
	const ops = (["add", "sub", "mul", "div"] as const).filter((op) => f[op]);
	const addLeft = range("add_left");
	const addRight = range("add_right");
	const mulLeft = range("mul_left");
	const mulRight = range("mul_right");
	if (!ops.length || !addLeft || !addRight || !mulLeft || !mulRight)
		return null;
	return {
		ops,
		addLeft,
		addRight,
		mulLeft,
		mulRight,
		duration: Number(f.duration),
	};
}

function HomeComponent() {
	const [form, setForm] = useState(DEFAULT_FORM);
	const [settings, setSettings] = useState<Settings | null>(null);
	const [error, setError] = useState("");

	if (settings) {
		return <Game settings={settings} onRestart={() => setSettings(null)} />;
	}

	const rangeInput = (name: RangeField) => (
		<Input
			className="inline-block h-8 w-16"
			value={form[name]}
			onChange={(e) => setForm({ ...form, [name]: e.target.value })}
		/>
	);

	const opCheckbox = (op: Op, label: string) => (
		<div className="flex items-center gap-2">
			<Checkbox
				id={op}
				checked={form[op]}
				onCheckedChange={(c) => setForm({ ...form, [op]: c })}
			/>
			<Label htmlFor={op}>{label}</Label>
		</div>
	);

	return (
		<div className="container mx-auto max-w-2xl px-4 py-8">
			<form
				className="mx-auto grid w-fit gap-4"
				onSubmit={(e) => {
					e.preventDefault();
					const s = toSettings(form);
					if (!s) {
						setError(
							"Pick at least one operation and use whole-number ranges (min ≤ max).",
						);
						return;
					}
					setError("");
					setSettings(s);
				}}
			>
				<div className="grid gap-2">
					{opCheckbox("add", "Addition")}
					<div className="ml-6 flex flex-wrap items-center gap-1 text-sm">
						Range: ({rangeInput("add_left_min")} to {rangeInput("add_left_max")}
						) + ({rangeInput("add_right_min")} to {rangeInput("add_right_max")})
					</div>
				</div>

				<div className="grid gap-2">
					{opCheckbox("sub", "Subtraction")}
					<p className="text-muted-foreground ml-6 text-sm">
						Addition problems in reverse.
					</p>
				</div>

				<div className="grid gap-2">
					{opCheckbox("mul", "Multiplication")}
					<div className="ml-6 flex flex-wrap items-center gap-1 text-sm">
						Range: ({rangeInput("mul_left_min")} to {rangeInput("mul_left_max")}
						) × ({rangeInput("mul_right_min")} to {rangeInput("mul_right_max")})
					</div>
				</div>

				<div className="grid gap-2">
					{opCheckbox("div", "Division")}
					<p className="text-muted-foreground ml-6 text-sm">
						Multiplication problems in reverse.
					</p>
				</div>

				<div className="flex items-center gap-2 text-sm">
					Duration:
					<Select
						value={form.duration}
						onValueChange={(v) => {
							if (v !== null) setForm({ ...form, duration: v });
						}}
					>
						<SelectTrigger className="w-40">
							<SelectValue />
						</SelectTrigger>
						<SelectContent>
							{DURATIONS.map((d) => (
								<SelectItem key={d} value={d}>
									{d} seconds
								</SelectItem>
							))}
						</SelectContent>
					</Select>
				</div>

				{error && <p className="text-destructive text-sm">{error}</p>}

				<div>
					<Button type="submit">Start</Button>
				</div>
			</form>
		</div>
	);
}

function Game({
	settings,
	onRestart,
}: {
	settings: Settings;
	onRestart: () => void;
}) {
	const [problem, setProblem] = useState(() => generate(settings));
	const [value, setValue] = useState("");
	const [score, setScore] = useState(0);
	const [timeLeft, setTimeLeft] = useState(settings.duration);
	const done = timeLeft <= 0;

	const { data: session, isPending: sessionPending } = authClient.useSession();
	const saveResult = useMutation(orpc.game.saveResult.mutationOptions());
	const { mutate } = saveResult;
	const savedRef = useRef(false);

	useEffect(() => {
		const start = Date.now();
		const id = setInterval(() => {
			const left = settings.duration - Math.floor((Date.now() - start) / 1000);
			setTimeLeft(Math.max(left, 0));
			if (left <= 0) clearInterval(id);
		}, 1000);
		return () => clearInterval(id);
	}, [settings.duration]);

	useEffect(() => {
		if (!done || !session || savedRef.current) return;
		savedRef.current = true;
		mutate({ ...settings, score });
	}, [done, session, settings, score, mutate]);

	function handleChange(next: string) {
		if (next.trim() === String(problem.answer)) {
			setScore((s) => s + 1);
			setProblem(generate(settings));
			setValue("");
		} else {
			setValue(next);
		}
	}

	return (
		<div className="container mx-auto max-w-2xl px-4 py-8">
			{!done && (
				<div className="mb-8 flex items-center justify-between rounded-lg border px-4 py-2 text-sm">
					<span>Seconds left: {timeLeft}</span>
					<span>Score: {score}</span>
				</div>
			)}

			{done ? (
				<div className="grid justify-items-center gap-4 text-center">
					<p className="text-lg">Your final score is {score}.</p>

					<div className="text-muted-foreground text-sm">
						{session ? (
							saveResult.isPending ? (
								"Saving result…"
							) : saveResult.isError ? (
								<span className="text-destructive">
									Couldn't save your result.{" "}
									<button
										type="button"
										className="underline"
										onClick={() => mutate({ ...settings, score })}
									>
										Retry
									</button>
								</span>
							) : saveResult.isSuccess ? (
								"Result saved."
							) : null
						) : (
							!sessionPending && (
								<>
									<Link to="/login" className="underline">
										Log in
									</Link>{" "}
									to save your results.
								</>
							)
						)}
					</div>

					<Button onClick={onRestart}>Try again</Button>
				</div>
			) : (
				<div className="flex items-center justify-center gap-4 text-3xl">
					<span>{problem.text} =</span>
					<Input
						autoFocus
						inputMode="numeric"
						autoComplete="off"
						className="h-14 w-40 text-center text-3xl md:text-3xl"
						value={value}
						onChange={(e) => handleChange(e.target.value)}
					/>
				</div>
			)}
		</div>
	);
}
