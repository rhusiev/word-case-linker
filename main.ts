import { Notice, Plugin, WorkspaceLeaf, ItemView } from "obsidian";

import { stemSentence } from "tree_stem";

// js-levenshtein
const levenshtein = require("js-levenshtein");

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
		const currentFileName = stemSentence(
			this.app.workspace.getActiveFile()?.basename,
		);
		const currentFileNameWordCount = currentFileName.length;

		const fileContents: string[] = await Promise.all(
			vault.getMarkdownFiles().map((file) => vault.cachedRead(file)),
		);

		const backlinks: { [key: string]: [number, string, number, number][] } =
			{};
		fileContents.forEach((fileContent, fileIndex) => {
			const lines = fileContent.split("\n");
			lines.forEach((line, lineIndex) => {
				const stemmedLine = stemSentence(line);
				const firstNameWord = currentFileName[0];
				for (
					let wordIndex = 0;
					wordIndex < stemmedLine.length - currentFileNameWordCount + 1;
					wordIndex++
				) {
					const word = stemmedLine[wordIndex];
					const distance = levenshtein(word, firstNameWord);
					if (distance > 2) continue;


					let isMatch = true;

					for (
						let nextWordIndex = wordIndex;
						nextWordIndex < wordIndex + currentFileNameWordCount;
						nextWordIndex++
					) {
						const nextWord = stemmedLine[nextWordIndex];
						const currentWord =
							currentFileName[nextWordIndex - wordIndex];
						const distance = levenshtein(nextWord, currentWord);
						if (distance > 2) {
							isMatch = false;
							break;
						}
					}

					if (!isMatch) continue;

					let charIndex = 0;
					const words = line.split(/\s/);
					const spaces = line.split(/\S/);
					// Remove empty strings
					let i = 0;
					while (i < words.length) {
						if (words[i] === "") {
							words.splice(i, 1);
						} else {
							i++;
						}
					}
					i = 0;
					while (i < spaces.length) {
						if (spaces[i] === "") {
							spaces.splice(i, 1);
						} else {
							i++;
						}
					}
					for (let i = 0; i < wordIndex; i++) {
						charIndex += words[i].length + spaces[i].length;
					}
					let endCharIndex = charIndex;
					for (
						let i = wordIndex;
						i < wordIndex + currentFileNameWordCount;
						i++
					) {
						const words = line.split(/\s/);
						const spaces = line.split(/\S/);
						// Add the length of the word and the amount of whitespace after
						endCharIndex += words[i].length + spaces[i].length;
					}

					// Extend to the end of the word
					let endWordCharIndex = endCharIndex;
					while (
						endWordCharIndex < line.length &&
						!line[endWordCharIndex].match(/\s/)
					) {
						endWordCharIndex++;
					}
					if (charIndex === undefined) continue;
					if (!backlinks[fileIndex]) {
						backlinks[fileIndex] = [];
					}
					backlinks[fileIndex].push([
						lineIndex + 1,
						line,
						charIndex,
						endWordCharIndex,
					]);
				}
			});
		});

		return backlinks;
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
			(leaf: WorkspaceLeaf) => new BacklinkView(leaf),
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

class BacklinkView extends ItemView {
	constructor(leaf: WorkspaceLeaf) {
		super(leaf);
	}

	getViewType(): string {
		return "word-case-backlink";
	}

	getDisplayText(): string {
		return "Word Case Backlink";
	}

	async onOpen(): Promise<void> {
		const container = this.containerEl.children[1];
		container.empty();

		container.createEl("h2", { text: "Word Case Backlinks" });
	}

	async onClose(): Promise<void> {
		const container = this.containerEl.children[1];
		container.empty();
	}

	async setState(state: any): Promise<void> {
		if (!state || !state.backlinks) return;

		const container = this.containerEl.children[1];
		container.empty();
		container.createEl("h2", { text: "Word Case Backlinks" });

		const currentFile = container.createEl("span", {
			text: this.app.workspace.getActiveFile()?.basename,
			cls: "filename",
		});
		currentFile.style.marginBottom = "0.5rem";
		currentFile.style.fontSize = "1.25rem";
		currentFile.style.marginRight = "0.5rem";

		// Add a line separator
		const separator = container.createEl("hr");
		separator.style.marginTop = "0.5rem";
		separator.style.marginBottom = "0.5rem";

		const list = container.createEl("div");
		for (const [fileIndex, backlink] of Object.entries(state.backlinks)) {
			const file = this.app.vault.getMarkdownFiles()[fileIndex];
			const listItem = list.createEl("div", {
				cls: "backlink-list-item",
			});
			listItem.style.padding = "0.5rem";
			listItem.style.borderRadius = "0.5rem";
			listItem.style.marginBottom = "0.5rem";
			listItem.addEventListener("mouseenter", () => {
				listItem.style.backgroundColor =
					"var(--background-secondary-alt)";
			});
			listItem.addEventListener("mouseleave", () => {
				listItem.style.backgroundColor = "var(--background-secondary)";
			});
			listItem.addEventListener("click", () => {
				this.app.workspace.openLinkText(file.basename, file.path);
			});
			const filename = listItem.createEl("span", {
				text: file.basename,
				cls: "filename",
			});
			filename.style.fontSize = "1.15rem";

			const backlinkList = listItem.createEl("div", {
				cls: "backlink-list",
			});
			for (const [lineIndex, line, charIndex, endCharIndex] of backlink) {
				const backlinkListItem = backlinkList.createEl("p", {
					cls: "backlink-list-item",
				});
				backlinkListItem.style.marginTop = "0.5rem";
				backlinkListItem.style.marginBottom = "0.5rem";
				backlinkListItem.style.marginLeft = "1rem";
				backlinkListItem.style.display = "flex";
				backlinkListItem.style.alignItems = "center";
				const lineNumber = backlinkListItem.createEl("span", {
					text: lineIndex.toString() + ": ",
					cls: "line-number",
				});
				lineNumber.style.width = "1rem";

				const threashold = 30;
				let updatedCharIndex = charIndex;
				let updatedEndCharIndex = endCharIndex;
				let lineText = line;
				if (updatedCharIndex > threashold) {
					lineText =
						"..." + line.slice(charIndex - threashold, line.length);
					updatedCharIndex = threashold + 3;
					updatedEndCharIndex =
						endCharIndex - charIndex + updatedCharIndex;
				}
				if (lineText.length - updatedEndCharIndex > threashold) {
					lineText =
						lineText.slice(0, updatedEndCharIndex + threashold) +
						"...";
				}
				const backlinkText = backlinkListItem.createEl("div", {
					cls: "backlink-text",
				});
				backlinkText.style.fontSize = "0.75rem";
				backlinkText.style.backgroundColor =
					"var(--background-primary)";
				backlinkText.style.padding = "0.25rem";
				backlinkText.style.borderRadius = "0.25rem";
				backlinkText.style.display = "inline-block";
				backlinkText.style.width = "100%";
				const preText = lineText.slice(0, updatedCharIndex);
				backlinkText.createEl("span", {
					text: preText,
				});
				const highlightText = lineText.slice(
					updatedCharIndex,
					updatedEndCharIndex,
				);
				const highlight = backlinkText.createEl("span", {
					text: highlightText,
					cls: "highlight",
				});
				highlight.style.backgroundColor = "var(--text-highlight-bg)";
				backlinkText.createEl("span", {
					text: lineText.slice(updatedEndCharIndex),
				});
			}
		}
	}
}
