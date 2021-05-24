import { fs, Sha256 } from "./deps.ts";
import { isURL, readFile } from "./_util.ts";

export class Watcher extends EventTarget {
  hashes: Record<string, string>;
  constructor() {
    super();
    this.hashes = {};
  }
  async watch(filePaths: string[]) {
    const set = filePaths.reduce((set, input) => {
      if (!isURL(input) && fs.existsSync(input)) set.add(input);
      return set;
    }, new Set() as Set<string>);
    const paths: string[] = [...set];

    for (const path of paths) {
      if (!this.hashes[path]) {
        this.hashes[path] = new Sha256().update(await readFile(path))
          .hex();
      }
    }

    const watcher = Deno.watchFs(paths);
    // only reload on first time when watched

    for await (const { kind, paths } of watcher) {
      for (const filePath of paths) {
        const hash = new Sha256().update(await readFile(filePath))
          .hex();
        if (this.hashes[filePath] !== hash) {
          this.hashes[filePath] = hash;
          this.dispatchEvent(new CustomEvent("change", { detail: { paths } }));
        }
      }
    }
  }
}
