import { Plugin, WorkspaceLeaf } from "obsidian";

import ukrainianStem from "stemmers/ukrainianStem";

import { SidebarView } from "components/sidebar";

import getBacklinks from "helpers/getBacklinks";

interface MyPluginSettings {
	mySetting: string;
}

const DEFAULT_SETTINGS: MyPluginSettings = {
	mySetting: "default",
};

export default class MyPlugin extends Plugin {
	settings: MyPluginSettings;

	async getWordCaseBacklinks(): Promise<{
		[key: string]: [number, string, number, number][];
	}> {
		const { vault } = this.app;

		// Get current file name
		const currentFileName: string = ukrainianStem(
			this.app.workspace.getActiveFile()?.basename,
		);
		const fileContents: string[] = await Promise.all(
			vault.getMarkdownFiles().map((file) => vault.cachedRead(file)),
		);

		return getBacklinks(fileContents, currentFileName, ukrainianStem);
	}

	async activateView() {
		this.app.workspace.detachLeavesOfType("word-case-backlink");

		await this.app.workspace.getRightLeaf(false).setViewState({
			type: "word-case-backlink",
			active: true,
		});

		this.app.workspace.revealLeaf(
			this.app.workspace.getLeavesOfType("word-case-backlink")[0],
		);
	}

	async updateView() {
		const backlinks = await this.getWordCaseBacklinks();
		this.app.workspace
			.getLeavesOfType("word-case-backlink")
			.forEach((leaf) =>
				leaf.setViewState({
					type: "word-case-backlink",
					state: {
						backlinks,
					},
				}),
			);
	}

	async onload() {
		await this.loadSettings();

		this.registerView(
			"word-case-backlink",
			(leaf: WorkspaceLeaf) => new SidebarView(leaf),
		);

		if (this.app.workspace.getActiveFile()) {
			await this.activateView();
			await this.updateView();
		}

		this.registerEvent(
			this.app.workspace.on("file-open", async () => {
				await this.updateView();
			}),
		);

		this.registerEvent(
			this.app.vault.on("rename", async (file) => {
				await this.updateView();
			}),
		);
	}

	onunload() {}

	async loadSettings() {
		this.settings = Object.assign(
			{},
			DEFAULT_SETTINGS,
			await this.loadData(),
		);
	}

	async saveSettings() {
		await this.saveData(this.settings);
	}
}
