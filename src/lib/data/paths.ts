import path from "node:path";
export function getDataDirectory() {
  return process.env.DATA_DIRECTORY ? path.resolve(/* turbopackIgnore: true */ process.env.DATA_DIRECTORY) : path.join(process.cwd(), "data");
}
