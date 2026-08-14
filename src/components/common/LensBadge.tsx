import type React from "react";
import type { ExperienceLens } from "../../types";

export interface LensBadgeProps {
	lens: ExperienceLens;
	size?: "sm" | "md" | "lg";
	showIcon?: boolean;
	onClick?: () => void;
	className?: string;
}

const LENS_CONFIG: Record<
	ExperienceLens,
	{
		label: string;
		icon: string;
		styleClass: string;
		colorVar: string;
		dimVar: string;
	}
> = {
	guided: {
		label: "GEFÜHRT",
		icon: "🌱",
		styleClass: "lens-badge-guided",
		colorVar: "var(--blue)",
		dimVar: "var(--blue-dim)",
	},
	advanced: {
		label: "STANDARD",
		icon: "⚡",
		styleClass: "lens-badge-advanced",
		colorVar: "var(--green)",
		dimVar: "var(--green-dim)",
	},
	expert: {
		label: "EXPERTE",
		icon: "🔬",
		styleClass: "lens-badge-expert",
		colorVar: "var(--purple)",
		dimVar: "var(--purple-dim)",
	},
};

export const LensBadge: React.FC<LensBadgeProps> = ({
	lens,
	size = "md",
	showIcon = true,
	onClick,
	className = "",
}) => {
	const config = LENS_CONFIG[lens] || LENS_CONFIG.guided;
	const isInteractive = typeof onClick === "function";

	const sizeStyles: Record<"sm" | "md" | "lg", React.CSSProperties> = {
		sm: { padding: "2px 6px", fontSize: "10px" },
		md: { padding: "4px 10px", fontSize: "11px" },
		lg: { padding: "6px 14px", fontSize: "12px" },
	};

	const badgeStyle: React.CSSProperties = {
		display: "inline-flex",
		alignItems: "center",
		gap: "5px",
		borderRadius: "var(--radius-sm)",
		border: `1px solid ${config.colorVar}`,
		background: config.dimVar,
		color: config.colorVar,
		fontWeight: 800,
		letterSpacing: "0.06em",
		textTransform: "uppercase",
		fontFamily: "var(--font-ui)",
		cursor: isInteractive ? "pointer" : "default",
		userSelect: "none",
		...sizeStyles[size],
	};

	if (isInteractive) {
		return (
			<button
				type="button"
				className={`lens-badge ${config.styleClass} ${className}`.trim()}
				style={badgeStyle}
				onClick={onClick}
				aria-label={`Erfahrungsstufe: ${config.label}`}
			>
				{showIcon && <span aria-hidden="true">{config.icon}</span>}
				<span>{config.label}</span>
			</button>
		);
	}

	return (
		<span
			className={`lens-badge ${config.styleClass} ${className}`.trim()}
			style={badgeStyle}
			role="status"
			aria-label={`Erfahrungsstufe: ${config.label}`}
		>
			{showIcon && <span aria-hidden="true">{config.icon}</span>}
			<span>{config.label}</span>
		</span>
	);
};

export default LensBadge;
