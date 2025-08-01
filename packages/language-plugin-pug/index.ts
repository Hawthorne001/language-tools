import { SourceMap } from '@volar/source-map';
import type * as CompilerDOM from '@vue/compiler-dom';
import type { VueLanguagePlugin } from '@vue/language-core';
import * as pug from 'volar-service-pug/lib/languageService';

const classRegex = /^class\s*=/;

const plugin: VueLanguagePlugin = ({ modules }) => {
	return {
		name: require('./package.json').name,

		version: 2.2,

		getEmbeddedCodes(_fileName, sfc) {
			if (sfc.template?.lang === 'pug') {
				return [{
					id: 'template',
					lang: sfc.template.lang,
				}];
			}
			return [];
		},

		resolveEmbeddedCode(_fileName, sfc, embeddedFile) {
			if (embeddedFile.id === 'template' && sfc.template?.lang === 'pug') {
				const minIndent = calculateMinIndent(sfc.template.content);
				if (minIndent !== 0) {
					embeddedFile.content.push(`template\n`);
				}
				embeddedFile.content.push([
					sfc.template.content,
					sfc.template.name,
					0,
					{
						verification: true,
						completion: true,
						semantic: true,
						navigation: true,
						structure: true,
						format: true,
					},
				]);
			}
		},

		compileSFCTemplate(lang, template, options) {
			if (lang === 'pug') {
				let pugFile: ReturnType<typeof pug.baseParse>;
				let baseOffset = 0;

				const minIndent = calculateMinIndent(template);
				if (minIndent === 0) {
					pugFile = pug?.baseParse(template);
				}
				else {
					pugFile = pug?.baseParse(`template\n${template}`);
					baseOffset = 'template\n'.length;
					pugFile.htmlCode = ' '.repeat('<template>'.length)
						+ pugFile.htmlCode.slice('<template>'.length, -'</template>'.length)
						+ ' '.repeat('</template>'.length);
				}

				if (pugFile) {
					const map = new SourceMap(pugFile.mappings);
					const compiler = modules['@vue/compiler-dom'];
					const completed = compiler.compile(pugFile.htmlCode, {
						...options,
						comments: true,
						onWarn(warning) {
							options?.onWarn?.(createProxyObject(warning));
						},
						onError(error) {
							// #5099
							if (
								error.code === 2 satisfies CompilerDOM.ErrorCodes.DUPLICATE_ATTRIBUTE
								&& classRegex.test(pugFile.htmlCode.slice(error.loc?.start.offset))
							) {
								return;
							}
							options?.onError?.(createProxyObject(error));
						},
					});

					return createProxyObject(completed);

					function createProxyObject(target: any) {
						const proxys = new WeakMap();
						return new Proxy(target, {
							get(target, prop, receiver) {
								if (prop === 'getClassOffset') {
									// div.foo#baz.bar
									//     ^^^     ^^^
									// class=" foo bar"
									//         ^^^ ^^^
									// NOTE: we need to expose source offset getter
									return function(startOffset: number) {
										return getOffset(target.offset + startOffset);
									};
								}
								if (prop === 'offset') {
									return getOffset(target.offset);
								}
								const value = Reflect.get(target, prop, receiver);
								if (typeof value === 'object' && value !== null) {
									let proxyed = proxys.get(value);
									if (proxyed) {
										return proxyed;
									}
									proxyed = createProxyObject(value);
									proxys.set(value, proxyed);
									return proxyed;
								}
								return value;
							},
						});
					}

					function getOffset(offset: number) {
						const htmlOffset = offset;
						const nums: number[] = [];
						for (const mapped of map.toSourceLocation(htmlOffset)) {
							nums.push(mapped[0] - baseOffset);
						}
						return Math.max(-1, ...nums);
					}
				}
			}
		},
	};
};
export = plugin;

function calculateMinIndent(s: string) {
	const lines = s.split('\n');
	const minIndent = lines.reduce(function(minIndent, line) {
		if (line.trim() === '') {
			return minIndent;
		}
		const indent = line.match(/^\s*/)?.[0]?.length || 0;
		return Math.min(indent, minIndent);
	}, Infinity);
	return minIndent;
}
