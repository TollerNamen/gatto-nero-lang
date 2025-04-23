import {
  BindingPower,
  LED_Handler,
  LexerLookupStore,
  NUD_Handler,
} from "./parser.ts";
import { Token, TokenKind } from "./lexer.ts";
import {
  Binary,
  BlockLambda,
  Call,
  CharacterLiteral,
  EmptyGroup,
  Expression,
  Identifier,
  Lambda,
  Listing,
  Match,
  NumberLiteral,
  PostUnary,
  PreUnary,
  StringLiteral,
} from "../../ast/expressions.ts";
import { SyntacticalError } from "../../error.ts";
import { getLast, skipEmptyStatement } from "./util.ts";
import { parseBlock } from "./statements.ts";

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
) {
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
  } as Match;
}

export function parseBinary(
  p: LexerLookupStore,
  left: Expression,
  bp: BindingPower,
) {
  const op = p.lexer.next().value;
  const right = parseExpression(p, bp);
  return {
    location: { start: left.location.start, end: right.location.end },
    left,
    right,
    op,
  } as Binary;
}

export function parseLambda(
  p: LexerLookupStore,
  left: Expression,
  _: BindingPower,
) {
  p.lexer.next();
  const value = parseExpression(p);
  return {
    location: { start: left.location.start, end: value.location.end },
    arguments: left,
    value,
  } as Lambda;
}

export function parseBlockLambda(
  p: LexerLookupStore,
  left: Expression,
  _: BindingPower,
) {
  const start = p.lexer.next().location.start;

  const block = parseBlock(p, [TokenKind.SEMISEMI]);

  const end = block.location.end;
  return {
    location: { start, end },
    arguments: left,
    statements: block.statements,
  } as BlockLambda;
}

export function parseCall(
  p: LexerLookupStore,
  left: Expression,
  _: BindingPower,
) {
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
  } as Call;
}
export function parsePipedCall(
  p: LexerLookupStore,
  left: Expression,
  _: BindingPower,
) {
  p.lexer.next();
  const target = parseExpression(p, BindingPower.CALL);
  return {
    location: { start: left.location.start, end: target.location.end },
    arguments: left,
    target,
  } as Call;
}

export function parseCommaListing(
  p: LexerLookupStore,
  left: Expression,
  _: BindingPower,
) {
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
  } as Listing;
}

export function parsePostUnary(
  p: LexerLookupStore,
  left: Expression,
  _: BindingPower,
) {
  const op = p.lexer.next();
  return {
    location: { start: left.location.start, end: op.location.end },
    left,
    op: op.value,
  } as PostUnary;
}
export function parsePreUnary(p: LexerLookupStore) {
  const op = p.lexer.next();
  const right = parseExpression(p, BindingPower.UNARY);
  return {
    location: { start: op.location.start, end: right.location.end },
    right,
    op: op.value,
  } as PreUnary;
}
/*
parsePrimary (LexerLookupStore): Maybe<Expression> =
  p -> Maybe (p.next)
    .map (token { value, location } -> token.kind match
      IDENTIFIER -> IdentTree (value, location)
      NUMBER -> NumTree (value, location)
      STRING -> StrTree (value, location)
      CHAR -> CharTree (value, location)
      _ -> assertNotReached ()
    )
*/
export function parsePrimary(p: LexerLookupStore) {
  const token = p.lexer.next();
  const location = token.location;
  const value = token.value;
  switch (token.kind) {
    case TokenKind.IDENTIFIER:
      return { location, symbol: value } as Identifier;
    case TokenKind.NUMBER:
      return { location, value } as NumberLiteral;
    case TokenKind.STRING:
      return { location, value } as StringLiteral;
    case TokenKind.CHAR:
      return { location, value } as CharacterLiteral;
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
    return { location: { start, end: token.location.end } } as EmptyGroup;
  }
  const expression = parseExpression(p);
  p.expect(p.lexer.next()).toBeOfKind(TokenKind.PARY_CLOSE);
  expression.location = { start, end: p.lexer.current().location.end };
  return expression;
}
