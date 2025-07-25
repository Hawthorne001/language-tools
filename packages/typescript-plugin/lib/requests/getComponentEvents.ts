import { VueVirtualCode } from '@vue/language-core';
import type { RequestContext } from './types';
import { getComponentType, getVariableType } from './utils';

export function getComponentEvents(
	this: RequestContext,
	fileName: string,
	tag: string,
): string[] {
	const { typescript: ts, language, languageService } = this;

	const sourceScript = language.scripts.get(fileName);
	const root = sourceScript?.generated?.root;
	if (!sourceScript?.generated || !(root instanceof VueVirtualCode)) {
		return [];
	}

	const program = languageService.getProgram()!;
	const checker = program.getTypeChecker();
	const components = getVariableType(ts, languageService, root, '__VLS_components');
	if (!components) {
		return [];
	}

	const componentType = getComponentType(ts, languageService, root, components, fileName, tag);
	if (!componentType) {
		return [];
	}

	const result = new Set<string>();

	// for (const sig of componentType.getCallSignatures()) {
	// 	const emitParam = sig.parameters[1];
	// 	if (emitParam) {
	// 		// TODO
	// 	}
	// }

	for (const sig of componentType.getConstructSignatures()) {
		const instanceType = sig.getReturnType();
		const emitSymbol = instanceType.getProperty('$emit');
		if (emitSymbol) {
			const emitType = checker.getTypeOfSymbolAtLocation(emitSymbol, components.node);
			for (const call of emitType.getCallSignatures()) {
				const eventNameParamSymbol = call.parameters[0];
				if (eventNameParamSymbol) {
					const eventNameParamType = checker.getTypeOfSymbolAtLocation(eventNameParamSymbol, components.node);
					if (eventNameParamType.isStringLiteral()) {
						result.add(eventNameParamType.value);
					}
				}
			}
		}
	}

	return [...result];
}
