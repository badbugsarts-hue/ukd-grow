export type DisplayUnitSystem = "si" | "imperial";
export type ConvertibleQuantity =
	| "temperature"
	| "length"
	| "volume"
	| "small-volume"
	| "mass";

const conversions: Record<
	ConvertibleQuantity,
	{
		si: string;
		imperial: string;
		toImperial: (value: number) => number;
		toSi: (value: number) => number;
	}
> = {
	temperature: {
		si: "°C",
		imperial: "°F",
		toImperial: (value) => value * (9 / 5) + 32,
		toSi: (value) => (value - 32) * (5 / 9),
	},
	length: {
		si: "cm",
		imperial: "in",
		toImperial: (value) => value / 2.54,
		toSi: (value) => value * 2.54,
	},
	volume: {
		si: "L",
		imperial: "US gal",
		toImperial: (value) => value / 3.785411784,
		toSi: (value) => value * 3.785411784,
	},
	"small-volume": {
		si: "ml",
		imperial: "fl oz",
		toImperial: (value) => value / 29.5735295625,
		toSi: (value) => value * 29.5735295625,
	},
	mass: {
		si: "g",
		imperial: "oz",
		toImperial: (value) => value / 28.349523125,
		toSi: (value) => value * 28.349523125,
	},
};

export function displayMeasurement(
	valueSi: number,
	quantity: ConvertibleQuantity,
	unitSystem: DisplayUnitSystem,
	locale: "de-DE" | "en-US",
	maximumFractionDigits = 2,
): string {
	const conversion = conversions[quantity];
	const value = unitSystem === "imperial" ? conversion.toImperial(valueSi) : valueSi;
	const unit = unitSystem === "imperial" ? conversion.imperial : conversion.si;
	return `${new Intl.NumberFormat(locale, { maximumFractionDigits }).format(value)} ${unit}`;
}

export function toCanonicalSi(
	value: number,
	quantity: ConvertibleQuantity,
	inputSystem: DisplayUnitSystem,
): number {
	return inputSystem === "imperial" ? conversions[quantity].toSi(value) : value;
}

export function secondaryImperial(
	valueSi: number,
	quantity: ConvertibleQuantity,
	locale: "de-DE" | "en-US",
): string {
	return displayMeasurement(valueSi, quantity, "imperial", locale);
}

export function formatLocalDateTime(
	utcIso: string,
	locale: "de-DE" | "en-US",
	timeZone: string,
): string {
	return new Intl.DateTimeFormat(locale, {
		dateStyle: "medium",
		timeStyle: "short",
		timeZone,
	}).format(new Date(utcIso));
}
