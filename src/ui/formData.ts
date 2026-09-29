/** Text value of a form field ('' when missing; FormData values can also be files). */
export function getText(formData: FormData, name: string): string {
  const value = formData.get(name);
  return typeof value === 'string' ? value : '';
}
