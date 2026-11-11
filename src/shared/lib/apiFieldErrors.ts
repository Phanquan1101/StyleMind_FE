/**
 * Field-level validation errors returned by the backend in a 400 problem+json body:
 *   { "code": "INVALID_REQUEST", "errors": [ { "field": "name", "code": "REQUIRED", "message": "..." } ] }
 * `message` is already written in Vietnamese and meant to be shown under the matching input.
 */
export interface ApiFieldError {
  field: string
  code?: string
  message: string
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

export function fieldErrorsFromProblem(problem: unknown): ApiFieldError[] {
  if (!isRecord(problem) || !Array.isArray(problem.errors)) return []
  return problem.errors.flatMap(item => {
    if (!isRecord(item) || typeof item.field !== 'string' || typeof item.message !== 'string') return []
    return [{ field: item.field, code: typeof item.code === 'string' ? item.code : undefined, message: item.message }]
  })
}

/** Pulls the problem body out of the different API error classes used in the app. */
export function problemOf(error: unknown): unknown {
  if (!isRecord(error)) return undefined
  return error.problem ?? error.body ?? error.payload ?? undefined
}

/**
 * Maps server field names (snake_case API names) to form keys.
 * Errors whose field has no mapping are returned in `unmapped` so the caller can show them in a banner.
 */
export function mapFieldErrors<K extends string>(
  errors: ApiFieldError[],
  map: Record<string, K>,
): { fields: Partial<Record<K, string>>; unmapped: ApiFieldError[] } {
  const fields: Partial<Record<K, string>> = {}
  const unmapped: ApiFieldError[] = []
  for (const error of errors) {
    const key = map[error.field]
    if (key) { if (!fields[key]) fields[key] = error.message } else unmapped.push(error)
  }
  return { fields, unmapped }
}

/** Moves focus to the first invalid control inside `root` (elements marked aria-invalid). */
export function focusFirstInvalid(root: ParentNode | null | undefined) {
  const target = root?.querySelector<HTMLElement>('[aria-invalid="true"]')
  target?.focus()
}
