import levenshtein from "js-levenshtein";

export default function getBacklinks(
	fileContents: string[],
	currentFileName: string,
	stem: CallableFunction,
): { [key: string]: [number, string, number, number][] } {
	const currentFileNameWordCount = currentFileName.length;
	const backlinks: { [key: string]: [number, string, number, number][] } = {};
	fileContents.forEach((fileContent, fileIndex) => {
		const lines = fileContent.split("\n");
		lines.forEach((line, lineIndex) => {
			const stemmedLine = stem(line);
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
