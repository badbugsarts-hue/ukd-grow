import { describe, expect, it } from "vitest";
import { createDefaultRunPackage } from "./run-state";
import {
	createWorkspacePackage,
	resolveRunConfiguration,
	upsertRunTemplate,
	upsertSetupProfile,
} from "./workspace";

describe("workspace inheritance", () => {
	it("resolves canonical → workspace → setup → template without mutating defaults", () => {
		const defaults = createDefaultRunPackage().config;
		const original = structuredClone(defaults);
		const workspace = upsertSetupProfile(createWorkspacePackage("Test"), {
			id: "setup-a",
			name: "Setup A",
			config: { ledMaxW: 180, water: { ...defaults.water, sourceEc: 0.4 } },
			equipmentIds: [],
			nutrientSystemId: null,
			evidenceVersion: "v8",
		});
		const withTemplate = upsertRunTemplate(workspace, {
			id: "template-a",
			name: "Template A",
			setupProfileId: "setup-a",
			configOverrides: { plantCount: 2 },
			taskTemplateIds: [],
			evidenceVersion: "v8",
		});
		const resolved = resolveRunConfiguration(
			defaults,
			{ endDay: 90 },
			withTemplate.setupProfiles[0] ?? null,
			withTemplate.runTemplates[0] ?? null,
		);
		expect(resolved.endDay).toBe(90);
		expect(resolved.ledMaxW).toBe(180);
		expect(resolved.water.sourceEc).toBe(0.4);
		expect(resolved.plantCount).toBe(2);
		expect(defaults).toEqual(original);
	});
});
