import { Link } from "@tanstack/react-router";

import { ModeToggle } from "./mode-toggle";
import UserMenu from "./user-menu";

export default function Header() {
	return (
		<div>
			<div className="grid grid-cols-3 items-center px-2 py-1">
				<div className="justify-self-start">
					<ModeToggle />
				</div>
				<Link to="/" className="justify-self-center text-4xl font-semibold">
					Math
				</Link>
				<div className="justify-self-end">
					<UserMenu />
				</div>
			</div>
			<hr />
		</div>
	);
}
