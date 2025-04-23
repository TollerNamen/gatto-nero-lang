import { SourceLocation } from "./analysis/syntactic/lexer.ts";

interface AnalyticError {
  location: SourceLocation;
  message: string;
  kind: string;
  makeError(sourceLines: string[]): Error;
}

abstract class AnalyticErrorImpl implements AnalyticError {
  readonly location: SourceLocation;
  readonly message: string;
  abstract readonly kind: string;

  constructor(message: string, location: SourceLocation) {
    this.message = message;
    this.location = location;
  }

  makeError(sourceLines: string[]): Error {
    const head = `${this.kind}\nMessage: ${this.message}`;

    const sampleLines = sourceLines.filter((_, i) =>
      (this.location.start.line - 1 - 2) <= i &&
      i < (this.location.end.line + 2)
    );

    const startColumn = this.location.start.column;
    const endColumn = this.location.end.column;

    const startLine = this.location.start.line;
    const endLine = this.location.end.line;

    const startCoords = `${startLine}:${startColumn}`;
    const endCoords = `${endLine}:${endColumn}`;

    const coordLength = startCoords.length > endCoords.length
      ? startCoords.length
      : endCoords.length;

    let lineNums = sampleLines.map((_, i) => (startLine - 2 + i) + "");
    lineNums[2] += `:${startColumn}`;
    if (lineNums.length !== 5) {
      lineNums[lineNums.length - 1 - 2] += `:${this.location.end.column}`;
    }
    lineNums = lineNums.map((v, i) =>
      `${v}${" ".repeat(coordLength - v.length)}| ${sampleLines[i]}`
    );

    if (lineNums.length === (2 + 1 + 2)) {
      lineNums[2] += "\n" + " ".repeat(coordLength + startColumn + 1) +
        "^".repeat(Math.max(1, endColumn - startColumn));
      lineNums[2] = `\x1b[37m${lineNums[2]}\x1b[0m`;

      return new Error(
        `${head}\n${lineNums.join("\n")}`,
      );
    }
    const startPointer = " ".repeat(coordLength + startColumn + 1) +
      "^".repeat(Math.max(1, sampleLines[0].length - startColumn));
    const endpointer =
      //  " ".repeat(Math.max(0, coordLength - sampleLines[sampleLines.length - 1].length)) +
      " ".repeat(coordLength + 1) +
      "^".repeat(endColumn);

    function log(s: string) {
      console.log(s);
      return "";
    }

    lineNums = lineNums.map((v, i) =>
      v + `\n` +
      ((startLine + i) === startLine
        ? startPointer
        : (startLine + i) === endLine
        ? endpointer
        : " ".repeat(coordLength + 1) +
          "^".repeat(sampleLines[i].length))
    );

    return new Error(
      `${head}\n` + `${lineNums.join("\n")}`,
    );
  }
}

export class SyntacticalError extends AnalyticErrorImpl {
  override readonly kind = "SyntaxError";
}

export class SemanticError extends AnalyticErrorImpl {
  override readonly kind = "SemanticError";
}
