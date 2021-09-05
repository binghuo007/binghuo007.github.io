import { Form } from 'ant-design-vue';
import { every, isEqual, isEmpty, cloneDeepWith, isTypedArray } from 'lodash';
import { Ref, computed, reactive, watchEffect, shallowRef } from 'vue';

type Data = Record<string, unknown>;
type Rules = Record<string, unknown>;

const customClone = (value: unknown) => {
  if (isTypedArray(value)) {
    return null;
  }
};

export function useDraftForm<T = Data>(
  model: Ref<T | null>,
  saveFunc: (model: T) => Promise<T | void>,
  rules?: Ref<Rules> | ((modelRef: T) => Rules),
) {
  const origin: Ref<null | T> = shallowRef(null);

  watchEffect(() => {
    origin.value = model.value;
  });

  const modelRef = computed(() => {
    return (model.value ? reactive(cloneDeepWith(model.value as any, customClone)) : {}) as T;
  });

  const { validateInfos, validate } = Form.useForm(
    modelRef,
    typeof rules === 'function' ? computed(() => rules(modelRef.value)) : rules,
  );

  const save = async () => {
    await validate();
    const result = await saveFunc(modelRef.value);
    origin.value = cloneDeepWith(result || model.value, customClone);
  };

  const canSave = computed(() => {
    return (
      !isEmpty(modelRef.value) &&
      every(validateInfos, ({ validateStatus }) =>
        [undefined, 'success'].includes(validateStatus),
      ) &&
      !isEqual(modelRef.value, origin.value)
    );
  });

  return { save, canSave, modelRef, validateInfos };
}
