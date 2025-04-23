import { Statement } from "../../ast/statements.ts";
import { SourceLocation, TokenKind } from "./lexer.ts";
import { LexerLookupStore } from "./parser.ts";

export function skipEmptyStatement(p: LexerLookupStore) {
  while ([TokenKind.SEMI, TokenKind.LINE].includes(p.lexer.current().kind)) {
    p.lexer.next();
  }
}

export function locationFromStatementArray(
  statements: Statement[],
): SourceLocation {
  return {
    start: statements[0].location.start,
    end: statements[statements.length - 1].location.end,
  } as SourceLocation;
}

export function getLast<T>(array: T[]) {
  return array[array.length - 1];
}
