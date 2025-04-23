import { SourceLocation } from "../analysis/syntactic/lexer.ts";
import { TreeType } from "./ast.ts";
import { Expression } from "./expressions.ts";
import { Type } from "./types.ts";

export interface Statement {
  treeType: TreeType;
  location: SourceLocation;
}

export interface GetImportStatement extends Statement {
  readonly targets: string[];
  readonly from: Expression;

  treeType: TreeType.GET_IMPORT;
}

export interface PkgStatement extends Statement {
  readonly pkg: Expression;

  treeType: TreeType.PKG;
}

export interface BlockStatement extends Statement {
  readonly statements: Statement[];
  readonly with_: Expression[];

  treeType: TreeType.BLOCK;
}

export enum Modifier {
  OUR,
  ACCESS_NONE,
  MY,
  NATIVE,
  FORCE,
}

export interface HasModifier extends Statement {
  readonly modifier: Modifier[];
}

export interface NamedDefiniton extends HasModifier {
  readonly name: string;
  readonly definitions: MemberDefinition[] | Definition;

  treeType: TreeType.DEFINITION_NAMED;
}

export interface MemberDefinition extends HasModifier {
  readonly definition: Definition;

  treeType: TreeType.DEFINITION_MEMBER;
}

export interface Definition extends Statement {
  readonly type: Type;
  readonly value: Expression;

  treeType: TreeType.DEFINITION;
}

export interface TypeStmtChild extends Statement {
}
export interface TypeStmtFunction extends TypeStmtChild {
  readonly type: Type;

  treeType: TreeType.TYPE_STATEMENT_FUNCTION;
}
export interface TypeStmtMethod extends TypeStmtChild {
  readonly types: Type[];
  readonly name: string;

  treeType: TreeType.TYPE_STATEMENT_METHOD;
}

export interface TypeStmt extends Statement {
  readonly name: string;
  readonly types: TypeStmtChild[];

  treeType: TreeType.TYPE_STATEMENT;
}
