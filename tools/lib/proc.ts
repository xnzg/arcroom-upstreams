// Subprocess helpers. One failure policy: a nonzero exit throws (so callers'
// try/finally cleanup runs), and every command echoes `$ cmd` first so the CI
// log shows exactly what produced the artifact.

export async function run(
  command: string[],
  cwd?: string,
  env?: Record<string, string>,
): Promise<void> {
  console.log(`$ ${command.join(' ')}`)
  const status = await new Deno.Command(command[0]!, {
    args: command.slice(1),
    cwd,
    env,
    stdin: 'inherit',
    stdout: 'inherit',
    stderr: 'inherit',
  }).spawn().status
  if (!status.success) {
    throw new Error(`command failed (${status.code}): ${command.join(' ')}`)
  }
}

export async function output(command: string[], cwd?: string): Promise<string> {
  console.log(`$ ${command.join(' ')}`)
  const result = await new Deno.Command(command[0]!, {
    args: command.slice(1),
    cwd,
    stderr: 'inherit',
    stdout: 'piped',
  }).output()
  if (!result.success) {
    throw new Error(`command failed (${result.code}): ${command.join(' ')}`)
  }
  return new TextDecoder().decode(result.stdout)
}

// `output` without the echo, for the hundreds of small inspection calls a
// verification pass makes.
export async function capture(command: string[]): Promise<string> {
  const result = await new Deno.Command(command[0]!, {
    args: command.slice(1),
    stderr: 'inherit',
    stdout: 'piped',
  }).output()
  if (!result.success) {
    throw new Error(`command failed (${result.code}): ${command.join(' ')}`)
  }
  return new TextDecoder().decode(result.stdout)
}
