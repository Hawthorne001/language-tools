import { SourceMap } from '@volar/language-core';
import type { SFCBlock } from '@vue/compiler-sfc';
import { type Segment, toString } from 'muggle-string';
import type { VueLanguagePlugin } from '../types';
import { buildMappings } from '../utils/buildMappings';
import { parse } from '../utils/parseSfc';

const frontmatterReg = /^---[\s\S]*?\n---(?:\r?\n|$)/;
const codeblockReg = /(`{3,})[\s\S]+?\1/g;
const inlineCodeblockReg = /`[^\n`]+?`/g;
const latexBlockReg = /(\${2,})[\s\S]+?\1/g;
const scriptSetupReg = /\\<[\s\S]+?>\n?/g;
const angleBracketReg = /<\S*:\S*>/g;
const linkReg = /\[[\s\S]*?\]\([\s\S]*?\)/g;
const sfcBlockReg = /<(script|style)\b[\s\S]*?>([\s\S]*?)<\/\1>/g;
const codeSnippetImportReg = /^\s*<<<\s*.+/gm;

const plugin: VueLanguagePlugin = ({ vueCompilerOptions }) => {
	return {
		version: 2.2,

		getLanguageId(fileName) {
			if (vueCompilerOptions.vitePressExtensions.some(ext => fileName.endsWith(ext))) {
				return 'markdown';
			}
		},

		isValidFile(_fileName, languageId) {
			return languageId === 'markdown';
		},

		parseSFC2(_fileName, languageId, content) {
			if (languageId !== 'markdown') {
				return;
			}

			content = content
				// frontmatter
				.replace(frontmatterReg, match => ' '.repeat(match.length))
				// code block
				.replace(codeblockReg, (match, quotes) => quotes + ' '.repeat(match.length - quotes.length * 2) + quotes)
				// inline code block
				.replace(inlineCodeblockReg, match => `\`${' '.repeat(match.length - 2)}\``)
				// latex block
				.replace(latexBlockReg, (match, quotes) => quotes + ' '.repeat(match.length - quotes.length * 2) + quotes)
				// # \<script setup>
				.replace(scriptSetupReg, match => ' '.repeat(match.length))
				// <<< https://vitepress.dev/guide/markdown#import-code-snippets
				.replace(codeSnippetImportReg, match => ' '.repeat(match.length))
				// angle bracket: <http://foo.com>
				.replace(angleBracketReg, match => ' '.repeat(match.length))
				// [foo](http://foo.com)
				.replace(linkReg, match => ' '.repeat(match.length));

			const codes: Segment[] = [];

			for (const match of content.matchAll(sfcBlockReg)) {
				const matchText = match[0];
				codes.push([matchText, undefined, match.index]);
				codes.push('\n\n');
				content = content.slice(0, match.index) + ' '.repeat(matchText.length)
					+ content.slice(match.index + matchText.length);
			}

			codes.push('<template>\n');
			codes.push([content, undefined, 0]);
			codes.push('\n</template>');

			const mappings = buildMappings(codes);
			const mapper = new SourceMap(mappings);
			const sfc = parse(toString(codes));

			for (
				const block of [
					sfc.descriptor.template,
					sfc.descriptor.script,
					sfc.descriptor.scriptSetup,
					...sfc.descriptor.styles,
					...sfc.descriptor.customBlocks,
				]
			) {
				if (block) {
					transformRange(block);
				}
			}

			return sfc;

			function transformRange(block: SFCBlock) {
				const { start, end } = block.loc;
				const startOffset = start.offset;
				const endOffset = end.offset;
				start.offset = -1;
				end.offset = -1;
				for (const [offset] of mapper.toSourceLocation(startOffset)) {
					start.offset = offset;
					break;
				}
				for (const [offset] of mapper.toSourceLocation(endOffset)) {
					end.offset = offset;
					break;
				}
			}
		},
	};
};

export default plugin;
