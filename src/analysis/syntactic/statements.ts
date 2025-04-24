import {
  BaseDefinition,
  BlockStatement,
  Definition,
  GetImportStatement,
  Modifier,
  MultiTypeStatement,
  NamedDefinition,
  NamedDefinitions,
  PkgStatement,
  SimpleTypeStatement,
  Statement,
} from "../../ast/statements.ts";
import { locationFromStatementArray, skipEmptyStatement } from "./util.ts";
import { LexerLookupStore, StatementHandler } from "./parser.ts";
import { LexerTypeLookupStore, parseType } from "./types.ts";
import { parseExpression, parseModifier } from "./expressions.ts";
import { SyntacticalError } from "../../error.ts";
import { SourcePointer, Token, TokenKind } from "./lexer.ts";
import { Type } from "../../ast/types.ts";

/**
 * Parses a block of statements; Does not implement any Handler.
 * @param p the usual Parser reference
 * @param terminatingKinds TokenKinds which terminate the parsing of statements
 * @returns a BlockStatement with an array of all parsed statements
 */
export function parseBlock(
  p: LexerLookupStore,
  terminatingKinds: TokenKind[] = [],
): BlockStatement {
  const statements: Statement[] = [];
  terminatingKinds.push(TokenKind.EOF);

  while (true) {
    skipEmptyStatement(p);
    if (terminatingKinds.includes(p.lexer.current().kind)) {
      break;
    }
    statements.push(parseStatement(p));
  }
  p.lexer.next();

  const location = locationFromStatementArray(statements);

  return {
    location,
    statements,
    treeType: "Block"
  };
}

export function parseStatement(p: LexerLookupStore): Statement {
  const statementHandler = p.statementLookup[p.lexer.current().kind] as
    | StatementHandler
    | undefined;
  if (!statementHandler) {
    throw new SyntacticalError(
      "Not a statement",
      parseExpressionStatement(p).location,
    );
  }
  return statementHandler(p);
}

export function parseExpressionStatement(p: LexerLookupStore): Statement {
  const expression = parseExpression(p);
  // block manages itself
  if (expression.treeType !== "Block") {
    p.expect(p.lexer.next(true)).toBeOneOfKinds([
      TokenKind.SEMI,
      TokenKind.LINE,
    ]);
  }
  return expression;
}

export function parseGetImport(p: LexerLookupStore): Statement {
  const start = p.lexer.next().location.start;
  const from = parseExpression(p);

  p.expect(p.lexer.next()).toBeOfKind(TokenKind.BRACKY_OPEN);
  const targets: string[] = []; //parseExpression(p, BindingPower.COMMA);
  do {
    targets.push(p.lexer.next().value);
  } while (
    p.lexer.current().kind === TokenKind.COMMA && p.lexer.next()
  );
  p.expectCurrent().toBeOfKind(TokenKind.BRACKY_CLOSE);
  p.lexer.next();
  return {
    location: { start, end: from.location.end },
    targets,
    from,
  } as GetImportStatement;
}

export function parseModifiedStatement(p: LexerLookupStore) {
  const modifiers = parseModifier(p);
  return p.lexer.current().kind !== TokenKind.TYPE
    ? parseNamedDefinition(p, modifiers)
    : parseTypeKeyword(p, modifiers);
}

export function parseNamedDefinition(p: LexerLookupStore, modifiers: Modifier[] = []) {
  const start = p.lexer.current().location.start;

  p.expectCurrent().toBeOfKind(TokenKind.IDENTIFIER);
  const name = p.lexer.next().value;

  if (p.lexer.current().kind !== TokenKind.COLON) {
    return parseDefinition(p, modifiers, start, name);
  }

  p.lexer.next();
  const definitions: BaseDefinition[] = [];

  let childModifier: Modifier[];
  let childStart: SourcePointer;
  while (p.lexer.current().kind !== TokenKind.SEMISEMI) {
    childStart = p.lexer.current().location.start;
    childModifier = parseModifier(p);
    definitions.push(parseDefinition(p, childModifier, childStart));
  }

  const end = p.lexer.next().location.end;

  return {
    definitions,
    name,
    location: { start, end },
    treeType: "DefinitionsNamed",
  } as NamedDefinitions;
}

function parseDefinition(
  p: LexerLookupStore,
  modifiers: Modifier[],
  start: SourcePointer,
  name: string = "",
) {
  const type = p.lexer.current().kind !== TokenKind.EQ
    ? parseType(new LexerTypeLookupStore(p.lexer))
    : undefined;

  p.lexer.next(); // get past =

  const value = parseExpressionStatement(p);
  return name === ""
    ? {
      location: { start, end: value.location.end },
      modifiers,
      varType: type,
      value,
      treeType: "Definition",
    } as Definition
    : {
      location: { start, end: value.location.end },
      name,
      modifiers,
      varType: type,
      value,
      treeType: "DefinitionNamed",
    } as NamedDefinition;
}

export function parseTypeKeyword(p: LexerLookupStore, modifiers: Modifier[] = []) {
  const start = p.lexer.next().location.start;
  const name = p.lexer.next().value;
  const typeParser = new LexerTypeLookupStore(p.lexer)

  if (p.lexer.current().kind !== TokenKind.COLON) {
    const type = parseType(typeParser);
    p.expect(p.lexer.next(true)).toBeOneOfKinds([
      TokenKind.SEMI,
      TokenKind.LINE,
    ]);
    return {
      name,
      modifiers,
      onlyType: type,
      location: { start, end: type.location.end },
      treeType: "TypeStatementSimple"
    } as SimpleTypeStatement;
  }

  p.lexer.next();

  const types: Type[] = [];
  do {
    types.push(parseType(typeParser));
    p.expect(p.lexer.next(true)).toBeOneOfKinds([
      TokenKind.SEMI,
      TokenKind.LINE,
    ]);
  } while (p.lexer.current().kind !== TokenKind.SEMISEMI);

  const end = p.lexer.next().location.end;

  return {
    name,
    types,
    modifiers,
    location: { start, end },
    treeType: "TypeStatementComplex"
  } as MultiTypeStatement;
}

export function parsePkgStatement(p: LexerLookupStore) {
  const start = p.lexer.next().location.start;

  const pkg = parseExpression(p);

  return { location: { start, end: pkg.location.end }, pkg } as PkgStatement;
}
