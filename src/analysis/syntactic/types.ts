import { BindingPower, TokenKindCheck, TokenKindCheckImpl } from "./parser.ts";
import { cannotFindNUD_HandlerError } from "./expressions.ts";
import { Parameter, Symbol, Type, Array, Function, } from "../../ast/types.ts";
import { Lexer, Token, TokenKind } from "./lexer.ts";

export class LexerTypeLookupStore {
  readonly ledLookup = new Map<TokenKind, LED_Handler>();
  readonly nudLookup = new Map<TokenKind, NUD_Handler>();
  readonly bpLookup = new Map<TokenKind, BindingPower>();
  private readonly _lexer: Lexer;

  private nud(kind: TokenKind, nud: NUD_Handler, bp: BindingPower) {
    this.nudLookup[kind] = nud;
    this.bpLookup[kind] = bp;
  }
  private led(kind: TokenKind, led: LED_Handler, bp: BindingPower) {
    this.ledLookup[kind] = led;
    this.bpLookup[kind] = bp;
  }

  constructor(lexer: Lexer) {
    this._lexer = lexer;

    this.nud(TokenKind.BRACKY_OPEN, parseArray, BindingPower.DEFAULT);
    this.nud(TokenKind.IDENTIFIER, parseSymbol, BindingPower.PRIMARY);
    this.nud(TokenKind.PARY_OPEN, parseFunction, BindingPower.CALL);
  }

  get lexer() {
    return this._lexer;
  }

  expect(token: Token): TokenKindCheck {
    return new TokenKindCheckImpl(this._lexer, token);
  }
  expectCurrent() {
    return this.expect(this.lexer.current());
  }
}

interface LED_Handler {
  (p: LexerTypeLookupStore, left: Type, bp: BindingPower): Type;
}
interface NUD_Handler {
  (p: LexerTypeLookupStore): Type;
}

function parseSymbol(p: LexerTypeLookupStore) {
  return { location: p.lexer.current().location, symbol: p.lexer.next().value } as Symbol;
}

function parseArray(p: LexerTypeLookupStore) {
  const start = p.lexer.next().location.start;
  let size: string | undefined = undefined;
  if (p.lexer.current().kind === TokenKind.NUMBER) {
    size = p.lexer.next().value;
  }

  p.expectCurrent().toBeOfKind(TokenKind.BRACKY_CLOSE);
  p.lexer.next();
  const child = parseType(p);

  return { location:  { start, end: child.location.end }, size: size, child: child } as Array;
}

const notAtCloseParen = (lexer: Lexer) =>
  lexer.current().kind !== TokenKind.PARY_CLOSE;

function parseFunction(p: LexerTypeLookupStore) {
  const start = p.lexer.next().location.start; // past (

  let args: Parameter[] = [];
  if (notAtCloseParen(p.lexer)) { // one after (
    args = parseFunctionArgument(p);
  }
  p.expectCurrent().toBeOfKind(TokenKind.PARY_CLOSE);
  const closeParenLocation = p.lexer.next().location.end;

  let returnType: Type | undefined = undefined;
  if (p.lexer.current().kind === TokenKind.COLON) {
    p.lexer.next();
    returnType = parseType(p);
  }

  const end = returnType ? returnType.location.end : closeParenLocation;
  return { location: { start, end }, arguments: args, returnType } as Function;
}

function parseFunctionArgument(p: LexerTypeLookupStore) {
  const args: Parameter[] = [];

  while (notAtCloseParen(p.lexer)) {
      const type = parseType(p);
      args.push({ location: type.location, type } as Parameter);
    if (p.lexer.current().kind !== TokenKind.COMMA) {
      break;
    }
    p.lexer.next();
  }

  return args;
}

export function parseType(
  p: LexerTypeLookupStore,
  bp: BindingPower = BindingPower.DEFAULT,
): Type {
  let token = p.lexer.current();
  const nud = p.nudLookup[token.kind] as NUD_Handler | undefined;

  if (!nud) {
    throw cannotFindNUD_HandlerError(token, "Type").makeError(
      p.lexer.sourceLines,
    );
  }

  let left = nud(p);
  /*
  let led: LED_Handler | undefined;
  let currentBP = p.bpLookup[p.lexer.current().kind] as
    | BindingPower
    | undefined;
  console.log(currentBP, bp);
  while (currentBP && currentBP > bp) {
    token = p.lexer.current();
    led = p.ledLookup[token.kind];

    if (!led) {
      throw new SyntacticalError(
        "Could not find a LED Handler (Type) for the following TokenKind: " +
          TokenKind[token.kind],
        token.location,
      ).makeError(p.lexer.sourceLines);
    }

    left = led(p, left, currentBP);
    currentBP = p.bpLookup[p.lexer.current().kind];
  }
  */
  return left;
}
