export class RequestError extends Error {
  readonly status = 400;
}

export async function jsonObject(request: Request): Promise<Record<string, unknown>> {
  let value: unknown;
  try {
    value = await request.json();
  } catch {
    throw new RequestError('Send a valid JSON object.');
  }
  if (value === null || typeof value !== 'object' || Array.isArray(value)) {
    throw new RequestError('Send a valid JSON object.');
  }
  return value as Record<string, unknown>;
}

export async function formData(request: Request): Promise<FormData> {
  try {
    return await request.formData();
  } catch {
    throw new RequestError('Send a valid form with the entry details.');
  }
}
