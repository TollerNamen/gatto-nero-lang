import { Statement } from "../../ast/statements.ts";
import { Expression } from "../../ast/expressions.ts";
import { SyntacticalError } from "../../error.ts";
import { Lexer, Token, TokenKind } from "./lexer.ts";
import {
  parseBlock,
  parseGetImport,
  parseNamedDefinition,
  parsePkgStatement,
  parseTypeKeyword,
} from "./statements.ts";
import {
  parseBinary,
  parseCall,
  parseCommaListing,
  parseGroup,
  parseObject,
  parsePostUnary,
  parsePreUnary,
  parsePrimary,
} from "./expressions.ts";

export class LexerLookupStore {
  private readonly _lexer: Lexer;
  statementLookup = new Map<TokenKind, StatementHandler>();
  nudLookup = new Map<TokenKind, NUD_Handler>();
  ledLookup = new Map<TokenKind, LED_Handler>();
  bpLookup = new Map<TokenKind, BindingPower>();

  private nud(bp: BindingPower, nudHandler: NUD_Handler) {
    return (kinds: TokenKind[]) => {
      kinds.forEach((kind) => {
        this.nudLookup[kind] = nudHandler;
        //this.bpLookup[kind] = bp;
      });
    };
  }

  private led(bp: BindingPower, ledHandler: LED_Handler) {
    return (kinds: TokenKind[]) => {
      kinds.forEach((kind) => {
        this.ledLookup[kind] = ledHandler;
        this.bpLookup[kind] = bp;
      });
    };
  }

  private statement(statementHandler: StatementHandler, kind: TokenKind) {
    this.statementLookup[kind] = statementHandler;
    this.bpLookup[kind] = BindingPower.DEFAULT;
  }

  constructor(lexer: Lexer) {
    this._lexer = lexer;

    this.led(BindingPower.ASSIGNMENT, parseBinary)([
      TokenKind.EQ,
      TokenKind.DEFINE,
    ]);

    this.led(BindingPower.COMMA, parseCommaListing)([TokenKind.COMMA]);

    this.nud(BindingPower.UNARY, parsePreUnary)([
      TokenKind.INCR,
      TokenKind.DECR,
      TokenKind.PLUS,
      TokenKind.MINUS,
      TokenKind.BANG,
    ]);

    this.led(BindingPower.LOGICAL, parseBinary)([
      TokenKind.AND,
      TokenKind.OR,
      TokenKind.DOT_DOT,
    ]);

    this.led(BindingPower.RELATIONAL, parseBinary)([
      TokenKind.EQEQ,
      TokenKind.NOTEQ,
      TokenKind.LT,
      TokenKind.LT_EQ,
      TokenKind.GT,
      TokenKind.GT_EQ,
    ]);

    this.led(BindingPower.ADDITIVE, parseBinary)([
      TokenKind.PLUS,
      TokenKind.MINUS,
    ]);

    this.led(BindingPower.MULTIPLICATIVE, parseBinary)([
      TokenKind.STAR,
      TokenKind.SLASH,
      TokenKind.PERCENT,
    ]);

    this.led(BindingPower.CALL, parseCall)([
      TokenKind.PARY_OPEN,
    ]);

    this.led(BindingPower.MEMBER, parseBinary)([
      TokenKind.DOT,
    ]);

    this.led(BindingPower.LAMBDA, parseBinary)([TokenKind.COLON]);

    //this.led(BindingPower.LAMBDA, parseLambda)([TokenKind.LAMBDA]);
    //this.led(BindingPower.LAMBDA, parseBlockLambda)([TokenKind.BLOCK_LAMBDA]);

    //this.led(BindingPower.LABEL, parseBinary)([TokenKind.COLON]);

    this.nud(BindingPower.PRIMARY, parsePrimary)([
      TokenKind.IDENTIFIER,
      TokenKind.NUMBER,
      TokenKind.STRING,
      TokenKind.CHAR,
    ]);

    this.led(BindingPower.UNARY, parsePostUnary)([
      TokenKind.INCR,
      TokenKind.DECR,
    ]);

    this.nud(BindingPower.DEFAULT, parseGroup)([TokenKind.PARY_OPEN]);

    this.nud(BindingPower.DEFAULT, parseObject)([TokenKind.CURLY_OPEN])

    this.statement(parseNamedDefinition, TokenKind.OUR);
    this.statement(parseNamedDefinition, TokenKind.MY);
    this.statement(parseNamedDefinition, TokenKind.IDENTIFIER);

    this.statement(parseGetImport, TokenKind.IMPORT);

    this.statement(parsePkgStatement, TokenKind.PKG);

    this.statement(parseTypeKeyword, TokenKind.TYPE);
  }

  get lexer() {
    return this._lexer;
  }

  parse(): Statement {
    return parseBlock(this);
  }

  expect(token: Token): TokenKindCheck {
    return new TokenKindCheckImpl(this._lexer, token);
  }
  expectCurrent() {
    return this.expect(this._lexer.current());
  }
}

export interface TokenKindCheck {
  toBeOfKind(kind: TokenKind): void;
  toBeOneOfKinds(kinds: TokenKind[]): void;
}
export class TokenKindCheckImpl implements TokenKindCheck {
  readonly token: Token;
  readonly lexer: Lexer;

  constructor(lexer: Lexer, token: Token) {
    this.lexer = lexer;
    this.token = token;
  }

  toBeOfKind(kind: TokenKind): void {
    if (this.token.kind !== kind) {
      throw new SyntacticalError(
        "Expected TokenKind of Token to be: " + TokenKind[kind],
        this.token.location,
      ).makeError(this.lexer.sourceLines);
    }
  }
  toBeOneOfKinds(kinds: TokenKind[]): void {
    if (!kinds.includes(this.token.kind)) {
      throw new SyntacticalError(
        `Expected TokenKind of Token to be one of: ${
          kinds.map((kind) => '"' + TokenKind[kind] + '"').join(", ")
        }; but received "${TokenKind[this.token.kind]}" instead.`,
        this.token.location,
      ).makeError(this.lexer.sourceLines);
    }
  }
}

export interface StatementHandler {
  (p: LexerLookupStore): Statement;
}
export interface NUD_Handler {
  (p: LexerLookupStore, bp: BindingPower | undefined): Expression;
}
export interface LED_Handler {
  (p: LexerLookupStore, left: Expression, bp: BindingPower): Expression;
}

export enum BindingPower {
  DEFAULT,
  COMMA,
  ASSIGNMENT,
  LAMBDA,
  UNARY,
  TERNARY,
  LOGICAL, // boolean
  RELATIONAL,
  ADDITIVE,
  MULTIPLICATIVE,
  CALL,
  MEMBER,
  LABEL, // label
  PRIMARY,
}
