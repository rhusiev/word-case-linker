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
	sidebarActive: boolean;

	async getWordCaseBacklinks(): Promise<
		() => {
			[key: string]: [number, string, number, number][];
		}
	> {
		const { vault } = this.app;

		// Get current file name
		const fileName = this.app.workspace.getActiveFile();
		if (fileName?.basename === undefined) {
			return () => {
				return {};
			};
		}
		const currentFileName: string[] = ukrainianStem(fileName.basename);
		const fileContents: string[] = await Promise.all(
			vault.getMarkdownFiles().map((file) => vault.cachedRead(file)),
		);

		return () => {
			return getBacklinks(fileContents, currentFileName, ukrainianStem);
		};
	}

	async activateView() {
		this.sidebarActive = true;
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
		if (!this.sidebarActive) return;
		this.app.workspace
			.getLeavesOfType("word-case-backlink")
			.forEach((leaf) =>
				leaf.setViewState({
					type: "word-case-backlink",
					state: {
						updateName: true,
					},
				}),
			);
	}

	async updateBacklinks() {
		if (!this.sidebarActive) return;
		const backlinks = await this.getWordCaseBacklinks();
		this.app.workspace
			.getLeavesOfType("word-case-backlink")
			.forEach((leaf) =>
				leaf.setViewState({
					type: "word-case-backlink",
					state: {
						backlinks,
						updateName: true,
					},
				}),
			);
	}

	async onload() {
		this.sidebarActive = false;
		await this.loadSettings();

		this.registerView(
			"word-case-backlink",
			(leaf: WorkspaceLeaf) => new SidebarView(leaf, this),
		);

		this.addRibbonIcon("dice", "Word Case Backlink", async () => {
			await this.activateView();
			await this.updateBacklinks();
		});

		if (this.app.workspace.getActiveFile()) {
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
