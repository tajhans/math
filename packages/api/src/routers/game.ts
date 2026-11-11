import { gameResult } from "@math/db/schema/index";
import { and, count, desc, eq, max } from "drizzle-orm";
import { z } from "zod";

import { protectedProcedure } from "../index";

const range = z
	.object({ min: z.number().int(), max: z.number().int() })
	.refine((r) => r.min <= r.max, { message: "min must be ≤ max" });

const configInput = z.object({
	duration: z.number().int().positive().max(3600),
	ops: z.array(z.enum(["add", "sub", "mul", "div"])).min(1),
	addLeft: range,
	addRight: range,
	mulLeft: range,
	mulRight: range,
});
type Config = z.infer<typeof configInput>;

const saveResultInput = configInput.extend({
	score: z.number().int().min(0),
});

function configToColumns(c: Config) {
	const ops = new Set(c.ops);
	return {
		duration: c.duration,
		opAdd: ops.has("add"),
		opSub: ops.has("sub"),
		opMul: ops.has("mul"),
		opDiv: ops.has("div"),
		addLeftMin: c.addLeft.min,
		addLeftMax: c.addLeft.max,
		addRightMin: c.addRight.min,
		addRightMax: c.addRight.max,
		mulLeftMin: c.mulLeft.min,
		mulLeftMax: c.mulLeft.max,
		mulRightMin: c.mulRight.min,
		mulRightMax: c.mulRight.max,
	};
}

type ConfigColumns = ReturnType<typeof configToColumns>;

function columnsToConfig(r: ConfigColumns): Config {
	const ops: Config["ops"] = [];
	if (r.opAdd) ops.push("add");
	if (r.opSub) ops.push("sub");
	if (r.opMul) ops.push("mul");
	if (r.opDiv) ops.push("div");
	return {
		duration: r.duration,
		ops,
		addLeft: { min: r.addLeftMin, max: r.addLeftMax },
		addRight: { min: r.addRightMin, max: r.addRightMax },
		mulLeft: { min: r.mulLeftMin, max: r.mulLeftMax },
		mulRight: { min: r.mulRightMin, max: r.mulRightMax },
	};
}

const configCols = {
	duration: gameResult.duration,
	opAdd: gameResult.opAdd,
	opSub: gameResult.opSub,
	opMul: gameResult.opMul,
	opDiv: gameResult.opDiv,
	addLeftMin: gameResult.addLeftMin,
	addLeftMax: gameResult.addLeftMax,
	addRightMin: gameResult.addRightMin,
	addRightMax: gameResult.addRightMax,
	mulLeftMin: gameResult.mulLeftMin,
	mulLeftMax: gameResult.mulLeftMax,
	mulRightMin: gameResult.mulRightMin,
	mulRightMax: gameResult.mulRightMax,
};

export const gameRouter = {
	saveResult: protectedProcedure
		.input(saveResultInput)
		.handler(async ({ context, input }) => {
			const { score, ...config } = input;
			const [row] = await context.db
				.insert(gameResult)
				.values({
					userId: context.session.user.id,
					score,
					...configToColumns(config),
				})
				.returning({ id: gameResult.id });
			return row;
		}),

	configs: protectedProcedure.handler(async ({ context }) => {
		const lastPlayed = max(gameResult.playedAt);
		const rows = await context.db
			.select({
				...configCols,
				plays: count(),
				best: max(gameResult.score),
				lastPlayedAt: lastPlayed,
			})
			.from(gameResult)
			.where(eq(gameResult.userId, context.session.user.id))
			.groupBy(...Object.values(configCols))
			.orderBy(desc(lastPlayed));

		return rows.map(({ plays, best, lastPlayedAt, ...cols }) => ({
			config: columnsToConfig(cols),
			plays,
			best: best ?? 0,
			lastPlayedAt,
		}));
	}),

	history: protectedProcedure
		.input(configInput)
		.handler(async ({ context, input }) => {
			const cols = configToColumns(input);
			return context.db
				.select({
					id: gameResult.id,
					score: gameResult.score,
					playedAt: gameResult.playedAt,
				})
				.from(gameResult)
				.where(
					and(
						eq(gameResult.userId, context.session.user.id),
						...Object.entries(cols).map(([k, v]) =>
							eq(configCols[k as keyof ConfigColumns], v),
						),
					),
				)
				.orderBy(gameResult.playedAt);
		}),
};
