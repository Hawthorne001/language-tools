import type { Code } from '../../types';
import { codeFeatures } from '../codeFeatures';
import { generateStyleModules } from '../style/modules';
import { generateStyleScopedClasses } from '../style/scopedClasses';
import { createTemplateCodegenContext, type TemplateCodegenContext } from '../template/context';
import { generateInterpolation } from '../template/interpolation';
import { generateStyleScopedClassReferences } from '../template/styleScopedClasses';
import { endOfLine, generateSfcBlockSection, newLine } from '../utils';
import { generateSpreadMerge } from '../utils/merge';
import type { ScriptCodegenContext } from './context';
import type { ScriptCodegenOptions } from './index';

export function* generateTemplate(
	options: ScriptCodegenOptions,
	ctx: ScriptCodegenContext,
): Generator<Code, TemplateCodegenContext> {
	ctx.generatedTemplate = true;

	const templateCodegenCtx = createTemplateCodegenContext({
		scriptSetupBindingNames: new Set(),
	});
	yield* generateTemplateCtx(options);
	yield* generateTemplateElements();
	yield* generateTemplateComponents(options);
	yield* generateTemplateDirectives(options);
	yield* generateTemplateBody(options, templateCodegenCtx);
	return templateCodegenCtx;
}

function* generateTemplateCtx(options: ScriptCodegenOptions): Generator<Code> {
	const exps = [];

	exps.push(`{} as InstanceType<__VLS_PickNotAny<typeof __VLS_self, new () => {}>>`);

	if (options.vueCompilerOptions.petiteVueExtensions.some(ext => options.fileName.endsWith(ext))) {
		exps.push(`globalThis`);
	}
	if (options.sfc.styles.some(style => style.module)) {
		exps.push(`{} as __VLS_StyleModules`);
	}

	yield `const __VLS_ctx = `;
	yield* generateSpreadMerge(exps);
	yield endOfLine;
}

function* generateTemplateElements(): Generator<Code> {
	yield `let __VLS_elements!: __VLS_IntrinsicElements${endOfLine}`;
}

function* generateTemplateComponents(options: ScriptCodegenOptions): Generator<Code> {
	const types: string[] = [`typeof __VLS_ctx`];

	if (options.sfc.script && options.scriptRanges?.exportDefault?.componentsOption) {
		const { componentsOption } = options.scriptRanges.exportDefault;
		yield `const __VLS_componentsOption = `;
		yield generateSfcBlockSection(
			options.sfc.script,
			componentsOption.start,
			componentsOption.end,
			codeFeatures.navigation,
		);
		yield endOfLine;
		types.push(`typeof __VLS_componentsOption`);
	}

	yield `type __VLS_LocalComponents = ${types.join(` & `)}${endOfLine}`;
	yield `let __VLS_components!: __VLS_LocalComponents & __VLS_GlobalComponents${endOfLine}`;
}

export function* generateTemplateDirectives(options: ScriptCodegenOptions): Generator<Code> {
	const types: string[] = [`typeof __VLS_ctx`];

	if (options.sfc.script && options.scriptRanges?.exportDefault?.directivesOption) {
		const { directivesOption } = options.scriptRanges.exportDefault;
		yield `const __VLS_directivesOption = `;
		yield generateSfcBlockSection(
			options.sfc.script,
			directivesOption.start,
			directivesOption.end,
			codeFeatures.navigation,
		);
		yield endOfLine;
		types.push(`__VLS_ResolveDirectives<typeof __VLS_directivesOption>`);
	}

	yield `type __VLS_LocalDirectives = ${types.join(` & `)}${endOfLine}`;
	yield `let __VLS_directives!: __VLS_LocalDirectives & __VLS_GlobalDirectives${endOfLine}`;
}

function* generateTemplateBody(
	options: ScriptCodegenOptions,
	templateCodegenCtx: TemplateCodegenContext,
): Generator<Code> {
	yield* generateStyleScopedClasses(options, templateCodegenCtx);
	yield* generateStyleScopedClassReferences(templateCodegenCtx, true);
	yield* generateStyleModules(options);
	yield* generateCssVars(options, templateCodegenCtx);

	if (options.templateCodegen) {
		yield* options.templateCodegen.codes;
	}
	else {
		if (!options.scriptSetupRanges?.defineSlots) {
			yield `type __VLS_Slots = {}${endOfLine}`;
		}
		yield `type __VLS_InheritedAttrs = {}${endOfLine}`;
		yield `type __VLS_TemplateRefs = {}${endOfLine}`;
		yield `type __VLS_RootEl = any${endOfLine}`;
	}
}

function* generateCssVars(options: ScriptCodegenOptions, ctx: TemplateCodegenContext): Generator<Code> {
	if (!options.sfc.styles.length) {
		return;
	}
	yield `// CSS variable injection ${newLine}`;
	for (const style of options.sfc.styles) {
		for (const binding of style.bindings) {
			yield* generateInterpolation(
				options,
				ctx,
				style.name,
				codeFeatures.all,
				binding.text,
				binding.offset,
			);
			yield endOfLine;
		}
	}
	yield `// CSS variable injection end ${newLine}`;
}
