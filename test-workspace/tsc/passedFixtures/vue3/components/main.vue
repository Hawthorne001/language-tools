<script lang="ts">
import { exactType } from '../../shared';
import { defineComponent, ref } from 'vue';
import ScriptSetup from './script-setup.vue';
import ScriptSetupExpose from './script-setup-expose.vue';
import ScriptSetupTypeOnly from './script-setup-type-only.vue';
import ScriptSetupDefaultProps from './script-setup-default-props.vue';
import ScriptSetupGeneric from './script-setup-generic.vue';

// https://vuejs.org/api/sfc-script-setup.html#defineprops-defineemits
const ScriptSetupExact = defineComponent({
	props: {
		foo: String,
	},
	emits: {
		change(..._payload: any[]) { },
		delete(..._payload: any[]) { },
	},
});
// https://vuejs.org/api/sfc-script-setup.html#defineexpose
const ScriptSetupExposeExact = defineComponent({
	setup() {
		const a = 1;
		const b = ref(2);
		return {
			a,
			b
		};
	},
});
// https://vuejs.org/api/sfc-script-setup.html#typescript-only-features
const ScriptSetupTypeOnlyExact = defineComponent({
	__typeProps: {} as {
		foo: string,
		bar?: number;
	},
	__typeEmits: {} as {
		(e: 'change', id: number): void;
		(e: 'update', value: string): void;
	},
});
// https://vuejs.org/api/sfc-script-setup.html#default-props-values-when-using-type-declaration
const ScriptSetupDefaultPropsExact = defineComponent({
	__typeProps: {} as {
		msg?: string;
		labels?: string[];
	},
	__defaults: {
		msg: 'hello',
		labels: () => ['one', 'two']
	},
});
// vue 3.3 generic
declare const ScriptSetupGenericExact: <T, >(
	_props: NonNullable<Awaited<typeof _setup>>['props'],
	_ctx?: Pick<NonNullable<Awaited<typeof _setup>>, 'attrs' | 'emit' | 'slots'>,
	_expose?: NonNullable<Awaited<typeof _setup>>['expose'],
	_setup?: Promise<{
		props: {
			readonly onBar?: ((data: T) => any) | undefined;
			foo: T;
		} & import('vue').VNodeProps & import('vue').AllowedComponentProps & import('vue').ComponentCustomProps,
		attrs: any,
		slots: { default?: (props: T) => any; },
		emit: { (e: 'bar', data: T): void; },
		expose(_exposed: import('vue').ShallowUnwrapRef<{ baz: T; buz: import('vue').Ref<1>; }>): void,
	}>
) => import('vue').VNode & { __ctx?: Awaited<typeof _setup>; };

exactType(ScriptSetup, ScriptSetupExact);
exactType(ScriptSetupExpose, ScriptSetupExposeExact);
exactType(ScriptSetupTypeOnly, ScriptSetupTypeOnlyExact);
exactType(ScriptSetupDefaultProps, ScriptSetupDefaultPropsExact);
exactType(ScriptSetupGeneric, ScriptSetupGenericExact);
</script>
