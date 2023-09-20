import { ItemView, WorkspaceLeaf } from "obsidian";

export class SidebarView extends ItemView {
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
