import { spawn } from "node:child_process";
import path from "node:path";

const maximumOutputLength = 10 * 1024 * 1024;

function virtualDartPath(filepath) {
  const markdownPath = filepath
    ? path.resolve(filepath)
    : path.join(process.cwd(), "stdin.md");
  const extension = path.extname(markdownPath);
  const dartFilename = `${path.basename(markdownPath, extension)}.dart`;

  return path.join(path.dirname(markdownPath), dartFilename);
}

function formatDart(source, filepath) {
  return new Promise((resolve) => {
    let child;

    try {
      child = spawn(
        "dart",
        ["format", "--output=show", "--stdin-name", virtualDartPath(filepath)],
        {
          stdio: ["pipe", "pipe", "pipe"],
        },
      );
    } catch {
      resolve(undefined);
      return;
    }

    let stdout = "";
    let outputExceededLimit = false;
    child.stdout.setEncoding("utf8");
    child.stdout.on("data", (chunk) => {
      if (stdout.length + chunk.length > maximumOutputLength) {
        outputExceededLimit = true;
        return;
      }

      stdout += chunk;
    });
    child.stderr.resume();
    child.stdin.on("error", () => {});
    child.on("error", () => resolve(undefined));
    child.on("close", (exitCode) => {
      resolve(exitCode === 0 && !outputExceededLimit ? stdout : undefined);
    });
    child.stdin.end(source);
  });
}

export const languages = [
  { name: "Dart", aliases: ["dart"], parsers: ["dart"] },
];

export const parsers = {
  dart: {
    async parse(text, options) {
      return {
        type: "dart",
        value: (await formatDart(text, options.filepath)) ?? text,
      };
    },
    astFormat: "dart-ast",
    locStart: () => 0,
    locEnd: (node) => node.value.length,
  },
};

export const printers = {
  "dart-ast": {
    print(path) {
      return path.node.value;
    },
  },
};
