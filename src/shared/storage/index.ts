import fs from "fs-extra";
import path from "path";

const OUTPUTS_DIR = path.resolve(process.cwd(), "outputs");

export async function ensureOutputsDir(): Promise<void> {
  await fs.ensureDir(path.join(OUTPUTS_DIR, "research"));
}

export async function writeOutput(
  subdir: string,
  filename: string,
  content: string | object
): Promise<string> {
  const dir = path.join(OUTPUTS_DIR, subdir);
  await fs.ensureDir(dir);
  const filePath = path.join(dir, filename);
  const data = typeof content === "string" ? content : JSON.stringify(content, null, 2);
  await fs.writeFile(filePath, data, "utf-8");
  return filePath;
}

export async function readOutput(subdir: string, filename: string): Promise<string | null> {
  const filePath = path.join(OUTPUTS_DIR, subdir, filename);
  if (!(await fs.pathExists(filePath))) return null;
  return fs.readFile(filePath, "utf-8");
}

export async function outputExists(subdir: string, filename: string): Promise<boolean> {
  return fs.pathExists(path.join(OUTPUTS_DIR, subdir, filename));
}
