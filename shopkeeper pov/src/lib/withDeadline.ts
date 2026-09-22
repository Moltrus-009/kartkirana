export async function withDeadline<T>(operation: Promise<T>, message: string, milliseconds = 25000): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([operation, new Promise<never>((_, reject) => {
      timer = setTimeout(() => reject(new Error(message)), milliseconds);
    })]);
  } finally {
    if (timer) clearTimeout(timer);
  }
}
