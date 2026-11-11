import { sql } from "drizzle-orm";
import {
	check,
	index,
	integer,
	sqliteTable,
	text,
} from "drizzle-orm/sqlite-core";
import { user } from "./auth";

export const gameResult = sqliteTable(
	"game_result",
	{
		id: integer("id").primaryKey({ autoIncrement: true }),
		userId: text("user_id")
			.notNull()
			.references(() => user.id, { onDelete: "cascade" }),
		score: integer("score").notNull(),
		playedAt: integer("played_at", { mode: "timestamp_ms" })
			.notNull()
			.$defaultFn(() => new Date()),
		duration: integer("duration").notNull(), // seconds
		opAdd: integer("op_add", { mode: "boolean" }).notNull(),
		opSub: integer("op_sub", { mode: "boolean" }).notNull(),
		opMul: integer("op_mul", { mode: "boolean" }).notNull(),
		opDiv: integer("op_div", { mode: "boolean" }).notNull(),
		addLeftMin: integer("add_left_min").notNull(),
		addLeftMax: integer("add_left_max").notNull(),
		addRightMin: integer("add_right_min").notNull(),
		addRightMax: integer("add_right_max").notNull(),
		mulLeftMin: integer("mul_left_min").notNull(),
		mulLeftMax: integer("mul_left_max").notNull(),
		mulRightMin: integer("mul_right_min").notNull(),
		mulRightMax: integer("mul_right_max").notNull(),
	},
	(t) => [
		index("game_result_user_played_idx").on(t.userId, t.playedAt),
		check("game_result_score_check", sql`${t.score} >= 0`),
		check("game_result_duration_check", sql`${t.duration} > 0`),
		check(
			"game_result_ops_check",
			sql`${t.opAdd} + ${t.opSub} + ${t.opMul} + ${t.opDiv} >= 1`,
		),
		check(
			"game_result_ranges_check",
			sql`${t.addLeftMin} <= ${t.addLeftMax}
				AND ${t.addRightMin} <= ${t.addRightMax}
				AND ${t.mulLeftMin} <= ${t.mulLeftMax}
				AND ${t.mulRightMin} <= ${t.mulRightMax}`,
		),
	],
);

export type GameResult = typeof gameResult.$inferSelect;
export type NewGameResult = typeof gameResult.$inferInsert;
