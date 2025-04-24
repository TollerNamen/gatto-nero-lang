import { Lexer } from "./analysis/syntactic/lexer.ts";
import { LexerLookupStore } from "./analysis/syntactic/parser.ts";
import { Program } from "./ast/statements.ts";

export class CompilationUnit {
  private tree: Program;
  private readonly path: string;

  constructor(path: string) {
    this.path = path;
  }

  async parse() {
    const text = await Deno.readTextFile(this.path);
    const lexer = new Lexer(text);
    this.tree = new LexerLookupStore(lexer).parse();
  }
}
