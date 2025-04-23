import {
  BindingPower,
  LED_Handler,
  LexerLookupStore,
  NUD_Handler,
} from "./parser.ts";
import { SourcePointer, Token, TokenKind } from "./lexer.ts";
import {
  Binary,
  Call,
  CharacterLiteral,
  EmptyGroup,
  Expression,
  Identifier,
  Lambda,
  Listing,
  Match,
  NumberLiteral,
  ObjectMember,
  PostUnary,
  PreUnary,
  StringLiteral,
} from "../../ast/expressions.ts";
import { SyntacticalError } from "../../error.ts";
import { getLast, skipEmptyStatement } from "./util.ts";
import { parseExpressionStatement } from "./statements.ts";
import { Modifier } from "../../ast/statements.ts";
import { Type } from "../../ast/types.ts";
import { LexerTypeLookupStore, parseType } from "./types.ts";

export function cannotFindNUD_HandlerError(
  token: Token,
  comment: string = "Expression",
) {
  return new SyntacticalError(
    `Could not find a NUD_Handler (${comment}) for the following TokenKind: ${
      TokenKind[token.kind]
    }`,
    token.location,
  );
}

export function parseExpression(
  p: LexerLookupStore,
  bp: BindingPower = BindingPower.DEFAULT,
) {
  let token = p.lexer.current();
  const nud = p.nudLookup[token.kind] as NUD_Handler | undefined;

  if (!nud) {
    throw cannotFindNUD_HandlerError(token).makeError(p.lexer.sourceLines);
  }

  let left = nud(p, bp);

  let led: LED_Handler | undefined;
  let currentBP = p.bpLookup[p.lexer.current().kind] as
    | BindingPower
    | undefined;

  while (currentBP && currentBP > bp) {
    token = p.lexer.current();
    led = p.ledLookup[token.kind];

    if (!led) {
      throw new SyntacticalError(
        "Could not find a LED_Handler for the following TokenKind: " +
          TokenKind[token.kind],
        token.location,
      ).makeError(p.lexer.sourceLines);
    }

    left = led(p, left, currentBP);
    currentBP = p.bpLookup[p.lexer.current().kind];
  }
  return left;
}

export function parseMatch(
  p: LexerLookupStore,
  left: Expression,
  bp: BindingPower,
): Match {
  p.lexer.next();

  const branches: Expression[] = [];

  branches.push(parseExpression(p, bp));

  while (true) {
    branches.push(parseExpression(p, bp));
    if (p.lexer.current().kind === TokenKind.END) {
      break;
    }
    p.expect(p.lexer.next(true)).toBeOneOfKinds([
      TokenKind.LINE,
      TokenKind.COMMA,
    ]);
  }
  p.lexer.next();

  return {
    location: {
      start: left.location.start,
      end: branches[branches.length - 1].location.end,
    },
    left,
    branches,
    treeType: "Match",
  };
}

export function parseBinary(
  p: LexerLookupStore,
  left: Expression,
  bp: BindingPower,
): Binary {
  const op = p.lexer.next().value;
  const right = parseExpression(p, bp);
  return {
    location: { start: left.location.start, end: right.location.end },
    left,
    right,
    op,
    treeType: "Binary",
  };
}

export function parseCall(
  p: LexerLookupStore,
  left: Expression,
  _: BindingPower,
): Call {
  const start = p.lexer.next().location.start;
  let args: Expression = {
    location: {
      start,
      end: p.lexer.current().location.end,
    },
  } as EmptyGroup;
  if (p.lexer.current().kind !== TokenKind.PARY_CLOSE) {
    const array = [parseExpression(p, BindingPower.CALL)];
    while (p.lexer.current().kind === TokenKind.COMMA) {
      p.lexer.next();
      array.push(parseExpression(p, BindingPower.CALL));
    }
    args = {
      location: { start, end: getLast(array).location.end },
      expressions: array,
    } as Listing;
  }
  p.expectCurrent().toBeOfKind(TokenKind.PARY_CLOSE);
  const end = p.lexer.next().location.end;

  return {
    location: { start: left.location.start, end },
    arguments: args,
    target: left,
    treeType: "Call",
  };
}
export function parsePipedCall(
  p: LexerLookupStore,
  left: Expression,
  _: BindingPower,
): Call {
  p.lexer.next();
  const target = parseExpression(p, BindingPower.CALL);
  return {
    location: { start: left.location.start, end: target.location.end },
    arguments: left,
    target,
    treeType: "Call",
  };
}

export function parseCommaListing(
  p: LexerLookupStore,
  left: Expression,
  _: BindingPower,
): Listing {
  const expressions: Expression[] = [];
  while ([TokenKind.COMMA, TokenKind.LINE].includes(p.lexer.current().kind)) {
    skipEmptyStatement(p);
    if (p.lexer.current().kind === TokenKind.COMMA) {
      p.lexer.next();
    }
    expressions.push(parseExpression(p, BindingPower.COMMA));
  }
  return {
    location: {
      start: left.location.start,
      end: expressions[expressions.length - 1].location.end,
    },
    expressions,
    treeType: "Listing",
  };
}

export function parsePostUnary(
  p: LexerLookupStore,
  left: Expression,
  _: BindingPower,
): PostUnary {
  const op = p.lexer.next();
  return {
    location: { start: left.location.start, end: op.location.end },
    left,
    op: op.value,
    treeType: "PostUnary",
  };
}
export function parsePreUnary(p: LexerLookupStore): PreUnary {
  const op = p.lexer.next();
  const right = parseExpression(p, BindingPower.UNARY);
  return {
    location: { start: op.location.start, end: right.location.end },
    right,
    op: op.value,
    treeType: "PreUnary",
  };
}

export function parseObject(p: LexerLookupStore) {
  const start = p.lexer.next().location.start;
  const member: ObjectMember[] = [];

  let name: string;
  let modifiers: Modifier[];
  let memberStart: SourcePointer;
  let memberEnd: SourcePointer;
  let memberType: Type | undefined;
  let value: Expression;
  while (p.lexer.current().kind !== TokenKind.CURLY_CLOSE) {
    memberStart = p.lexer.current().location.start;
    modifiers = parseModifier(p);
    name = p.lexer.next().value;
    memberType = p.lexer.current().kind === TokenKind.EQ
      ? undefined
      : parseType(new LexerTypeLookupStore(p.lexer));
    p.expect(p.lexer.next()).toBeOfKind(TokenKind.EQ);
    value = parseExpressionStatement(p);
    memberEnd = p.lexer.current().location.end;

    member.push({
      modifiers,
      name,
      memberType,
      value,
      location: { start: memberStart, end: memberEnd },
      treeType: "ObjectMember",
    });
  }
}

export function parseModifier(p: LexerLookupStore): Modifier[] {
  const modifiers: Modifier[] = [];

  if (
    p.lexer.current().kind === TokenKind.OUR ||
    p.lexer.current().kind === TokenKind.MY
  ) {
    modifiers.push(Modifier[p.lexer.next().kind.toString()]);
  } else {
    modifiers.push(Modifier.ACCESS_NONE);
  }

  if (p.lexer.current().kind === TokenKind.NATIVE) {
    modifiers.push(Modifier[p.lexer.next().kind.toString()]);
  }
  if (p.lexer.current().kind === TokenKind.FORCE) {
    modifiers.push(Modifier[p.lexer.next().kind.toString()]);
  }

  return modifiers;
}

export function parsePrimary(p: LexerLookupStore) {
  const token = p.lexer.next();
  const location = token.location;
  const value = token.value;
  switch (token.kind) {
    case TokenKind.IDENTIFIER:
      return {
        location,
        symbol: value,
        treeType: "LiteralIdentifier",
      } as Identifier;
    case TokenKind.NUMBER:
      return { location, value, treeType: "LiteralNumber" } as NumberLiteral;
    case TokenKind.STRING:
      return { location, value, treeType: "LiteralString" } as StringLiteral;
    case TokenKind.CHAR:
      return {
        location,
        value,
        treeType: "LiteralCharacter",
      } as CharacterLiteral;
    default:
      throw new SyntacticalError(
        "Unexpected TokenKind: " + TokenKind[token.kind],
        token.location,
      ).makeError(p.lexer.sourceLines);
  }
}
/*
Parser (Lexer) = lexer =>
  wrap lexer [ current, next ]
  our next (TokenKind): Maybe<Token> = kind -> check (next, kind)
  our current (TokenKind): Maybe<Token> = kind -> check (current, kind)
  our parse (): Tree = ...
;;

check (Token, TokenKind): Maybe<Token> = token, kind -> token match
  token.kind === kind -> Maybe (token)
  _ -> Maybe (SyntaxError (SyntaxErrorKind.Expected, token))
end

parseGroup (Parser): Expression = with TokenKind; p -> Mapper p
  .map p -> { p, p.next.location.start }
  .map { p, start } -> p.current match
    OPEN_PAREN -> { p, start, expression EmptyGroup (SoureLocation (start, p.current.location.end)) }
    _ -> { p, start, expression parseExpr (p) }
  end
  .map { p, start, expression } ->
    expression.copy ({ location SourceLocation (start, p.next (CLOSE_PAREN).location.end) })
*/
export function parseGroup(p: LexerLookupStore) {
  const start = p.lexer.next().location.start;
  const token = p.lexer.current();
  if (token.kind === TokenKind.PARY_CLOSE) {
    return {
      location: { start, end: token.location.end },
      treeType: "EmptyGroup",
    } as EmptyGroup;
  }
  const expression = parseExpression(p);
  p.expect(p.lexer.next()).toBeOfKind(TokenKind.PARY_CLOSE);
  expression.location = { start, end: p.lexer.current().location.end };
  return expression;
}
