/** 对象转表单(是否可以弃用？ 原因： axios依赖库中也有这个方法了！) */
export function toFormData(option: any) {
    let formData = new FormData();
    for (let key in option) {
        formData.append(key, option[key]);
    }
    return formData;
};