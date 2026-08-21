import type React from "react";

export type IconName =
	| "plant"
	| "calendar"
	| "warning"
	| "water"
	| "light"
	| "settings"
	| "droplet"
	| "sun"
	| "check"
	| "activity"
	| "beaker"
	| "globe";

export interface IconProps extends React.SVGProps<SVGSVGElement> {
	name: IconName;
	size?: number;
	animate?: "spin" | "pulse" | "float" | "grow" | "none";
}

const ICONS: Record<IconName, React.ReactNode> = {
	plant: (
		<>
			<path d="M11 20A7 7 0 0 1 4 13v-5a2 2 0 0 1 2-2h0a2 2 0 0 1 2 2v5" />
			<path d="M13 20a7 7 0 0 0 7-7v-5a2 2 0 0 0-2-2h0a2 2 0 0 0-2 2v5" />
			<path d="M12 22V9" />
		</>
	),
	calendar: (
		<>
			<rect width="18" height="18" x="3" y="4" rx="2" ry="2" />
			<line x1="16" x2="16" y1="2" y2="6" />
			<line x1="8" x2="8" y1="2" y2="6" />
			<line x1="3" x2="21" y1="10" y2="10" />
			<path d="M8 14h.01" />
			<path d="M12 14h.01" />
			<path d="M16 14h.01" />
			<path d="M8 18h.01" />
			<path d="M12 18h.01" />
			<path d="M16 18h.01" />
		</>
	),
	warning: (
		<>
			<path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z" />
			<line x1="12" x2="12" y1="9" y2="13" />
			<line x1="12" x2="12.01" y1="17" y2="17" />
		</>
	),
	water: (
		<>
			<path d="M12 22a5 5 0 0 0 5-5c0-2-5-10-5-10S7 15 7 17a5 5 0 0 0 5 5z" />
		</>
	),
	light: (
		<>
			<circle cx="12" cy="12" r="4" />
			<path d="M12 2v2" />
			<path d="M12 20v2" />
			<path d="m4.93 4.93 1.41 1.41" />
			<path d="m17.66 17.66 1.41 1.41" />
			<path d="M2 12h2" />
			<path d="M20 12h2" />
			<path d="m6.34 17.66-1.41 1.41" />
			<path d="m19.07 4.93-1.41 1.41" />
		</>
	),
	settings: (
		<>
			<path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z" />
			<circle cx="12" cy="12" r="3" />
		</>
	),
	droplet: (
		<>
			<path d="M12 22a5 5 0 0 0 5-5c0-2-5-10-5-10S7 15 7 17a5 5 0 0 0 5 5z" />
		</>
	),
	sun: (
		<>
			<circle cx="12" cy="12" r="4" />
			<path d="M12 2v2" />
			<path d="M12 20v2" />
			<path d="m4.93 4.93 1.41 1.41" />
			<path d="m17.66 17.66 1.41 1.41" />
			<path d="M2 12h2" />
			<path d="M20 12h2" />
			<path d="m6.34 17.66-1.41 1.41" />
			<path d="m19.07 4.93-1.41 1.41" />
		</>
	),
	check: (
		<>
			<polyline points="20 6 9 17 4 12" />
		</>
	),
	activity: (
		<>
			<path d="M22 12h-4l-3 9L9 3l-3 9H2" />
		</>
	),
	beaker: (
		<>
			<path d="M4.5 3h15" />
			<path d="M6 3v16a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2V3" />
			<path d="M6 14h12" />
		</>
	),
	globe: (
		<>
			<circle cx="12" cy="12" r="10" />
			<line x1="2" x2="22" y1="12" y2="12" />
			<path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
		</>
	)
};

export function Icon({
	name,
	size = 20,
	animate = "none",
	className = "",
	...props
}: IconProps) {
	const animClass = animate !== "none" ? `icon-anim-${animate}` : "";

	return (
		<svg
			aria-hidden="true"
			focusable="false"
			xmlns="http://www.w3.org/2000/svg"
			width={size}
			height={size}
			viewBox="0 0 24 24"
			fill="none"
			stroke="currentColor"
			strokeWidth="2"
			strokeLinecap="round"
			strokeLinejoin="round"
			className={`lucide lucide-${name} ${animClass} ${className}`}
			{...props}
		>
			{ICONS[name]}
		</svg>
	);
}
