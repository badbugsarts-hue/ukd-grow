import type React from "react";
import { useEffect, useRef, useState } from "react";
import type { ExperienceLens } from "../../types";
import { getTermDefinition, getTermDescription } from "./termDictionary";

export interface TermTooltipProps {
	term: string;
	children?: React.ReactNode;
	lens?: ExperienceLens;
	showIcon?: boolean;
	customText?: string;
	className?: string;
}

export const TermTooltip: React.FC<TermTooltipProps> = ({
	term,
	children,
	lens = "guided",
	showIcon = false,
	customText,
	className = "",
}) => {
	const termDef = getTermDefinition(term);
	const displayText = children || (termDef ? termDef.acronym : term);
	const tooltipContent = customText || getTermDescription(term, lens);

	const [isOpen, setIsOpen] = useState(false);
	const triggerRef = useRef<HTMLSpanElement>(null);

	useEffect(() => {
		if (!isOpen) return;

		const handleOutsideClick = (e: MouseEvent | TouchEvent) => {
			if (
				triggerRef.current &&
				!triggerRef.current.contains(e.target as Node)
			) {
				setIsOpen(false);
			}
		};

		document.addEventListener("mousedown", handleOutsideClick);
		document.addEventListener("touchstart", handleOutsideClick);
		return () => {
			document.removeEventListener("mousedown", handleOutsideClick);
			document.removeEventListener("touchstart", handleOutsideClick);
		};
	}, [isOpen]);

	const handleKeyDown = (e: React.KeyboardEvent) => {
		if (e.key === "Enter" || e.key === " ") {
			e.preventDefault();
			setIsOpen((prev) => !prev);
		} else if (e.key === "Escape" && isOpen) {
			setIsOpen(false);
		}
	};

	const handleToggle = () => {
		setIsOpen((prev) => !prev);
	};

	return (
		<span
			ref={triggerRef}
			className={`term-tooltip ${className}`.trim()}
			tabIndex={0}
			role="button"
			aria-expanded={isOpen}
			aria-label={`Erklärung für ${termDef?.germanName || term}`}
			onClick={handleToggle}
			onKeyDown={handleKeyDown}
			onMouseEnter={() => setIsOpen(true)}
			onMouseLeave={() => setIsOpen(false)}
		>
			<span className="term-text">{displayText}</span>
			{showIcon && (
				<span className="tooltip-icon" aria-hidden="true">
					{" "}
					ⓘ
				</span>
			)}
			<span
				className="tooltip-text"
				role="tooltip"
				style={{ display: isOpen ? "block" : undefined }}
			>
				{termDef && (
					<strong className="tooltip-header">
						{termDef.germanName} ({termDef.acronym})
						{termDef.unit ? ` · ${termDef.unit}` : ""}
					</strong>
				)}
				<span>{tooltipContent}</span>
			</span>
		</span>
	);
};

export default TermTooltip;
