import {
  BlockStatement,
  Definition,
  GetImportStatement,
  MemberDefinition,
  Modifier,
  NamedDefiniton,
  PkgStatement,
  Statement,
  TypeStmt,
  TypeStmtChild,
  TypeStmtFunction,
  TypeStmtMethod,
} from "../../ast/statements.ts";
import { locationFromStatementArray, skipEmptyStatement } from "./util.ts";
import { LexerLookupStore, StatementHandler } from "./parser.ts";
import { LexerTypeLookupStore, parseType } from "./types.ts";
import { parseExpression } from "./expressions.ts";
import { SyntacticalError } from "../../error.ts";
import { Token, TokenKind } from "./lexer.ts";
import { Type } from "../../ast/types.ts";
import { TreeType } from "../../ast/ast.ts";

/**
 * Parses a block of statements; Does not implement any Handler.
 * @param p the usual Parser reference
 * @param terminatingKinds TokenKinds which terminate the parsing of statements
 * @returns a BlockStatement with an array of all parsed statements
 */
export function parseBlock(
  p: LexerLookupStore,
  terminatingKinds: TokenKind[] = [],
) {
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

  return { location, statements } as BlockStatement;
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
  if (expression.treeType !== TreeType.BLOCK) {
    p.expect(p.lexer.next(true)).toBeOneOfKinds([
      TokenKind.SEMI,
      TokenKind.LINE,
    ]);
  }
  return expression;
}

export function parseGetImport(p: LexerLookupStore): Statement {
  const start = p.lexer.next().location.start;
  const targets: string[] = []; //parseExpression(p, BindingPower.COMMA);
  do {
    targets.push(p.lexer.next().value);
  } while (
    p.lexer.current().kind === TokenKind.COMMA && p.lexer.next()
  );
  p.expectCurrent().toBeOfKind(TokenKind.FROM);
  p.lexer.next();
  const from = parseExpression(p);
  return {
    location: { start, end: from.location.end },
    targets,
    from,
  } as GetImportStatement;
}

function tokenToAccessModifier(token: Token) {
  switch (token.kind) {
    case TokenKind.OUR:
    case TokenKind.MY:
      return Modifier[TokenKind[token.kind]];
    default:
      return Modifier.ACCESS_NONE;
  }
}

export function parseNamedDefinitionDeclaration(p: LexerLookupStore) {
  const access = p.lexer.next();
  const start = access.location.start;
  const modifier = [tokenToAccessModifier(access)];
  let namedDefiniton: NamedDefiniton;

  const current = p.lexer.current().kind;

  if (current === TokenKind.NATIVE) {
    modifier.push(Modifier.NATIVE);
    p.lexer.next();
  }
  if (current === TokenKind.VAR) {
    namedDefiniton = parseVariableDefinition(p);
  } else {
    namedDefiniton = parseNamedDefinition(p);
  }

  if (modifier.length !== 1 || modifier[0] !== Modifier.ACCESS_NONE) {
    return {
      location: { start, end: namedDefiniton.location.end },
      name: namedDefiniton.name,
      definitions: namedDefiniton.definitions,
      modifier,
    } as NamedDefiniton;
  }
  return namedDefiniton;
}

export function parseVariableDefinition(p: LexerLookupStore) {
  const start = p.lexer.next().location.start;
  p.expectCurrent().toBeOfKind(TokenKind.IDENTIFIER);
  const name = p.lexer.next().value;

  const definition = parseDefinition(p);

  return {
    location: { start, end: definition.location.end },
    name,
    definitions: definition,
    modifier: [Modifier.ACCESS_NONE],
  } as NamedDefiniton;
}

export function parseNamedDefinition(p: LexerLookupStore) {
  const token = p.lexer.next();
  const start = token.location.start;

  if (p.lexer.current().kind !== TokenKind.CURLY_OPEN) {
    const definition = parseDefinition(p);
    return {
      location: { start, end: definition.location.end },
      name: token.value,
      definitions: definition,
      modifier: [Modifier.ACCESS_NONE],
    } as NamedDefiniton;
  }
  p.lexer.next();

  const definitions: MemberDefinition[] = [];
  let access: Token;
  let modifier: Modifier[];
  let definition: Definition;
  while (p.lexer.current().kind !== TokenKind.CURLY_CLOSE) {
    skipEmptyStatement(p);
    access = p.lexer.current();
    modifier = [tokenToAccessModifier(access)];
    if (modifier[0] !== Modifier.ACCESS_NONE) p.lexer.next();
    if (p.lexer.current().kind === TokenKind.NATIVE) {
      p.lexer.next();
      modifier.push(Modifier.NATIVE);
    }

    definition = parseDefinition(p);
    definitions.push({
      location: {
        start: p.lexer.current().location.start,
        end: definition.location.end,
      },
      definition,
      modifier,
    } as MemberDefinition);
  }
  p.lexer.next();
  return {
    location: { start, end: definitions[definitions.length - 1].location.end },
    name: token.value,
    definitions,
    modifier: [Modifier.ACCESS_NONE],
  } as NamedDefiniton;
}

function parseDefinition(p: LexerLookupStore) {
  skipEmptyStatement(p);
  const type = parseType(new LexerTypeLookupStore(p.lexer));

  p.expectCurrent().toBeOfKind(TokenKind.EQ);
  p.lexer.next();
  const value = parseExpressionStatement(p);

  return {
    location: { start: type.location.start, end: value.location.end },
    type,
    value,
  } as Definition;
}

export function parseTypeKeyword(p: LexerLookupStore) {
  const start = p.lexer.next().location.start;
  const name = p.lexer.next().value;
  if (p.lexer.current().kind !== TokenKind.CURLY_OPEN) {
    const type = parseType(new LexerTypeLookupStore(p.lexer));
    p.expect(p.lexer.next(true)).toBeOneOfKinds([
      TokenKind.SEMI,
      TokenKind.LINE,
    ]);
    return {
      location: { start, end: type.location.end },
      name,
      types: [
        { location: type.location, type } as TypeStmtFunction,
      ] as TypeStmtChild[],
    } as TypeStmt;
  }
  p.lexer.next();

  const typeParser = new LexerTypeLookupStore(p.lexer);
  const types: TypeStmtChild[] = [];
  let methodName: string;
  let type: Type;
  while (p.lexer.current().kind !== TokenKind.CURLY_CLOSE) {
    if (
      p.lexer.current().kind === TokenKind.IDENTIFIER
    ) {
      methodName = p.lexer.next().value;
      type = parseType(typeParser);
      types.push(
        {
          location: type.location,
          types: [type],
          name: methodName,
        } as TypeStmtMethod,
      );
    } else {
      type = parseType(typeParser);
      types.push({ location: type.location, type } as TypeStmtFunction);
    }
    p.expect(p.lexer.next(true)).toBeOneOfKinds([
      TokenKind.SEMI,
      TokenKind.LINE,
    ]);
  }
  p.expect(p.lexer.next()).toBeOfKind(TokenKind.CURLY_CLOSE);
  return {
    location: {
      start,
      end: types[types.length - 1].location.end,
    },
    name,
    types,
  } as TypeStmt;
}

export function parsePkgStatement(p: LexerLookupStore) {
  const start = p.lexer.next().location.start;

  const pkg = parseExpression(p);

  return { location: { start, end: pkg.location.end }, pkg } as PkgStatement;
}
