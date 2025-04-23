export class Lexer {
  private line = 1;
  private position = 0;
  private column = 0;
  readonly sourceContent: string;
  private _current: Token;
  private before: Token;

  constructor(source: string, initCurrent: boolean = true) {
    this.sourceContent = source;
    if (initCurrent) {
      this._current = this.nextUnwrapped();
      this.before = {
        kind: TokenKind.EOF,
        location: {
          start: { index: -1, line: 0, column: -1 },
          end: { index: -1, line: 0, column: -1 },
        },
        value: "NULL",
      };
    }
  }

  get sourceLines() {
    return this.sourceContent.split(/\n/);
  }

  current() {
    return this._current;
  }

  next(showLine: boolean = false) {
    if (showLine && this.before.kind === TokenKind.LINE) {
      return this.before;
    }
    const notLine = this._current;
    do {
      this.before = this._current; // maybe line
      this._current = this.nextUnwrapped(); // def not line
    } while (this._current.kind === TokenKind.LINE);
    return notLine;
  }

  private nextUnwrapped(): Token {
    if (this.position >= this.sourceContent.length) {
      return {
        kind: TokenKind.EOF,
        value: "EOF",
        location: simpleSourceLocation(
          this.line,
          this.position,
          this.column,
          "",
        ),
      };
    }

    let processor: TokenProcessor;
    let remaining: string = this.sourceContent.substring(this.position);
    let match: string;
    let token: Token | null;
    let regex: RegExp;
    let regexMatch: RegExpExecArray;
    for (let i = 0; i < this.processors.length; i++) {
      processor = this.processors[i];
      /*
      console.log(
        `${this.position}:${this.line}:${this.column}|${i}:${processor.symbol}`,
      );
      */
      if (typeof processor.symbol === "string") {
        if (!remaining.startsWith(processor.symbol)) {
          continue;
        }
        match = remaining.substring(0, processor.symbol.length);
      } else {
        regex = processor.symbol as RegExp;
        if (!regex.test(remaining)) {
          continue;
        }

        regexMatch = regex.exec(remaining) as RegExpExecArray;

        if (regexMatch.index != 0) {
          continue;
        }

        match = regexMatch[0];
      }
      token = processor.handler(match);
      this.position += match.length;
      this.column += match.length;
      if (token) {
        return token;
      }
      i = -1;
      remaining = this.sourceContent.substring(this.position);
      continue;
    }
    console.log(`FATAL:SyntaxError
    Message: Could not tokenize following char: '${remaining[0]}'
    Skipping...`.trim());
    this.position++;
    return this.nextUnwrapped();
  }

  locationCompound() {
    return {
      index: this.position,
      line: this.line,
      column: this.column,
    };
  }

  private defaultHandler(kind: TokenKind): TokenHandler {
    return ((match) => {
      return {
        kind,
        location: simpleLocation(match, this.locationCompound()),
        value: match,
      };
    });
  }

  private readonly identifier: TokenHandler = (match: string) => {
    const location = simpleLocation(match, this.locationCompound());
    const keyword = keywords().find((keyword) => keyword === match);
    if (keyword) {
      return {
        kind: KEYWORD_START + keywords().indexOf(keyword),
        value: keyword,
        location,
      } as Token;
    }
    return {
      kind: TokenKind.IDENTIFIER,
      value: match,
      location,
    };
  };

  private readonly stringChar: TokenHandler = (match: string) => {
    return {
      kind: match[0] == '"' ? TokenKind.STRING : TokenKind.CHAR,
      value: match,
      location: simpleLocation(match, this.locationCompound()),
    };
  };

  private readonly skip: TokenHandler = () => {
    return null;
  };

  private readonly lineHandler = (match: string) => {
    const length = match.length - 1;
    const position = this.position + length;
    const column = this.column + length;
    const token: Token = {
      kind: TokenKind.LINE,
      value: "\\n",
      location: {
        start: { index: position, line: this.line, column: column },
        end: { index: position + 1, line: this.line + 1, column: 0 },
      },
    };
    this.line++;
    this.column = 0;
    return token;
  };

  /**
   * Copies this lexer and returns a new reference.
   * This is useful for lookaheads.
   * @returns a new Lexer
   */
  copy(): Lexer {
    const newLexer = new Lexer(this.sourceContent, false);
    newLexer.position = this.position;
    newLexer.line = this.line;
    newLexer.column = this.column;
    newLexer._current = this._current;
    newLexer.before = this.before;
    return newLexer;
  }

  private readonly processors = [
    {
      handler: this.identifier,
      symbol: /[a-zA-Z_](\w)*/,
    },
    {
      handler: this.lineHandler,
      symbol: /\n/,
    },
    {
      handler: this.skip,
      symbol: /\s+/,
    },
    {
      handler: this.lineHandler,
      symbol: /#.*\n/,
    },
    {
      handler: this.skip,
      symbol: /\/\*(.|\n)*\*\//,
    },
    {
      handler: this.defaultHandler(TokenKind.NUMBER),
      symbol: /\d([^\S\r\n]*\w*)*/,
    },
    {
      handler: this.stringChar,
      symbol: /"((.(?!\n))*)"|'((.(?!\n))*)'/,
    },
    {
      handler: this.defaultHandler(TokenKind.DEFINE),
      symbol: /:\s*=/,
    },
    { handler: this.defaultHandler(TokenKind.DOT_DOT), symbol: ".." },
    { handler: this.defaultHandler(TokenKind.SEMISEMI), symbol: ";;" },
    { handler: this.defaultHandler(TokenKind.LAMBDA), symbol: "->" },
    { handler: this.defaultHandler(TokenKind.BLOCK_LAMBDA), symbol: "=>" },
    { handler: this.defaultHandler(TokenKind.DOT), symbol: "." },
    { handler: this.defaultHandler(TokenKind.COMMA), symbol: "," },
    { handler: this.defaultHandler(TokenKind.SEMI), symbol: ";" },
    { handler: this.defaultHandler(TokenKind.COLON), symbol: ":" },
    { handler: this.defaultHandler(TokenKind.CURLY_OPEN), symbol: "{" },
    { handler: this.defaultHandler(TokenKind.CURLY_CLOSE), symbol: "}" },
    { handler: this.defaultHandler(TokenKind.BRACKY_OPEN), symbol: "[" },
    { handler: this.defaultHandler(TokenKind.BRACKY_CLOSE), symbol: "]" },
    { handler: this.defaultHandler(TokenKind.PARY_OPEN), symbol: "(" },
    { handler: this.defaultHandler(TokenKind.PARY_CLOSE), symbol: ")" },
    { handler: this.defaultHandler(TokenKind.QUESTION_2), symbol: "??" },
    { handler: this.defaultHandler(TokenKind.QUESTION), symbol: "?" },
    { handler: this.defaultHandler(TokenKind.OR), symbol: "||" },
    { handler: this.defaultHandler(TokenKind.AND), symbol: "&&" },
    { handler: this.defaultHandler(TokenKind.HAT), symbol: "^" },
    { handler: this.defaultHandler(TokenKind.BIT_AND), symbol: "&" },
    { handler: this.defaultHandler(TokenKind.EQEQ), symbol: "==" },
    { handler: this.defaultHandler(TokenKind.NOTEQ), symbol: "!=" },
    { handler: this.defaultHandler(TokenKind.LT_EQ), symbol: "<=" },
    { handler: this.defaultHandler(TokenKind.GT_EQ), symbol: ">=" },
    { handler: this.defaultHandler(TokenKind.EQ), symbol: "=" },
    { handler: this.defaultHandler(TokenKind.L_SHIFT), symbol: "<<" },
    { handler: this.defaultHandler(TokenKind.R_SHIFT_3), symbol: ">>>" },
    { handler: this.defaultHandler(TokenKind.R_SHIFT), symbol: ">>" },
    { handler: this.defaultHandler(TokenKind.LT), symbol: "<" },
    { handler: this.defaultHandler(TokenKind.GT), symbol: ">" },
    { handler: this.defaultHandler(TokenKind.INCR), symbol: "++" },
    { handler: this.defaultHandler(TokenKind.DECR), symbol: "--" },
    { handler: this.defaultHandler(TokenKind.MINUS), symbol: "-" },
    { handler: this.defaultHandler(TokenKind.PLUS), symbol: "+" },
    { handler: this.defaultHandler(TokenKind.STAR), symbol: "*" },
    { handler: this.defaultHandler(TokenKind.SLASH), symbol: "/" },
    { handler: this.defaultHandler(TokenKind.PERCENT), symbol: "%" },
    { handler: this.defaultHandler(TokenKind.WAVE), symbol: "~" },
    { handler: this.defaultHandler(TokenKind.BANG), symbol: "!" },
    { handler: this.defaultHandler(TokenKind.DOLLAR), symbol: "$" },
  ] as TokenProcessor[];
}

function simpleLocation(match: string | number, location: {
  index: number;
  line: number;
  column: number;
}) {
  return simpleSourceLocation(
    location.line,
    location.index,
    location.column,
    match,
  );
}

function processors(setup: {
  identifier: TokenHandler;
  lineHandler: TokenHandler;
  skip: TokenHandler;
  stringChar: TokenHandler;
  defaultHandler(kind: TokenKind): TokenHandler;
}) {
  return;
}

export interface Token {
  kind: TokenKind;
  value: string;
  location: SourceLocation;
}

interface TokenHandler {
  (match: string): Token | null;
}

interface TokenProcessor {
  handler: TokenHandler;
  symbol: string | RegExp;
}

const KEYWORD_START = 100;

export enum TokenKind {
  LINE,

  // values
  IDENTIFIER,
  KEYWORD,
  NUMBER,
  STRING,
  CHAR,

  // symbols
  SEMISEMI,
  DOT,
  COMMA,
  SEMI,
  COLON,
  LAMBDA,
  BLOCK_LAMBDA,

  CURLY_OPEN,
  CURLY_CLOSE,
  BRACKY_OPEN,
  BRACKY_CLOSE,
  PARY_OPEN,
  PARY_CLOSE,

  QUESTION,
  QUESTION_2,
  OR,
  AND,
  DOT_DOT,
  PIPE,
  HAT,
  BIT_AND,
  EQEQ,
  NOTEQ,
  GT_EQ,
  LT_EQ,
  EQ,
  DEFINE, // : = or :=
  LT,
  GT,
  L_SHIFT,
  R_SHIFT,
  R_SHIFT_3,
  INCR,
  DECR,
  PLUS,
  MINUS,
  STAR,
  SLASH,
  PERCENT,
  WAVE, // (period) ~
  BANG,
  DOLLAR,

  EOF,

  // placeholder
  MODULE_PRIVATE,

  // keywords
  OUR = KEYWORD_START,
  MY = KEYWORD_START + 1,
  LET = KEYWORD_START + 2,

  VAR = KEYWORD_START + 3,

  NATIVE = KEYWORD_START + 4,
  FORCE = KEYWORD_START + 5,

  PKG = KEYWORD_START + 6,

  IMPORT = KEYWORD_START + 7,

  TYPE = KEYWORD_START + 8,

  MATCH = KEYWORD_START + 9,
  END = KEYWORD_START + 10,
}

function keywords() {
  let keywords: string[] = [];
  function collect(i: number, keywords: string[]) {
    keywords.push(TokenKind[i]);
    return TokenKind[i + 1] ? collect(i + 1, keywords) : keywords;
  }
  keywords = collect(KEYWORD_START, keywords);
  keywords = keywords.map((keyword) => keyword.toLowerCase());
  return keywords;
}

export interface SourcePointer {
  index: number;
  line: number;
  column: number;
}

export interface SourceLocation {
  start: SourcePointer;
  end: SourcePointer;
}

function simpleSourceLocation(
  line: number,
  index: number,
  column: number,
  match: string | number,
): SourceLocation {
  const length = typeof match === "string" ? match.length : match;
  return {
    start: {
      index,
      line,
      column,
    },
    end: {
      index: index + length,
      line,
      column: column + length,
    },
  };
}
