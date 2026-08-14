import { spawn } from "node:child_process";
import path from "node:path";

const formatTimeout = 30_000;

let missingDartReported = false;

function virtualDartPath(filepath) {
  const markdownPath = filepath
    ? path.resolve(filepath)
    : path.join(process.cwd(), "stdin.md");
  const extension = path.extname(markdownPath);
  const dartFilename = `${path.basename(markdownPath, extension)}.dart`;

  return path.join(path.dirname(markdownPath), dartFilename);
}

function reportMissingDart(error) {
  if (missingDartReported || error.code !== "ENOENT") {
    return;
  }

  missingDartReported = true;
  console.warn(
    "[prettier-plugin-markdown-dart] `dart` was not found on PATH. Dart code blocks are left unchanged.",
  );
}

function formatDart(source, filepath) {
  const stdinName = virtualDartPath(filepath);

  return new Promise((resolve) => {
    const child = spawn(
      "dart",
      ["format", "--output=show", "--stdin-name", stdinName],
      {
        stdio: ["pipe", "pipe", "pipe"],
        timeout: formatTimeout,
        killSignal: "SIGKILL",
      },
    );

    let stdout = "";
    child.stdout.setEncoding("utf8");
    child.stdout.on("data", (chunk) => {
      stdout += chunk;
    });
    child.stderr.resume();
    child.stdin.on("error", () => {});
    child.on("error", (error) => {
      reportMissingDart(error);
      resolve(undefined);
    });
    // A killed process can leave a descendant holding stdout open, which delays "close"
    // past the timeout. Signal termination discards stdout anyway, so settle on "exit".
    child.on("exit", (_exitCode, signal) => {
      if (signal !== null) {
        resolve(undefined);
      }
    });
    child.on("close", (exitCode) => {
      resolve(exitCode === 0 ? stdout : undefined);
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
