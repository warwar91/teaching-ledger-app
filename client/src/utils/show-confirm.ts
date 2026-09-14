export async function showConfirm(message: string): Promise<boolean> {
  return window.confirm(message);
}
