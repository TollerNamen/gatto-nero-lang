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

  treeType: "GetImport";
}

export interface PkgStatement extends Statement {
  readonly pkg: Expression;

  treeType: "Pkg";
}

export interface BlockStatement extends Statement {
  readonly statements: Statement[];
  readonly with: Expression[];

  treeType: "Block";
}

export enum Modifier {
  OUR,
  ACCESS_NONE,
  MY,
  NATIVE,
  FORCE,
}

interface HasName {
  readonly name: string;
}

interface HasModifiers {
  readonly modifiers: Modifier[];
}

export interface NamedDefinitions extends Statement, HasName, HasModifiers {
  readonly definitions: Definition[];

  treeType: "DefinitionsNamed";
}

export interface NamedDefinition extends BaseDefinition, HasName {
  treeType: "DefinitionNamed";
}

export interface BaseDefinition extends Statement, HasModifiers {
  readonly varType: Type | undefined;
  readonly value: Expression;

  treeType: "Definition" | "DefinitionNamed";
}

export interface Definition extends BaseDefinition {
  treeType: "Definition";
}

export interface TypeStmtChild extends Statement {
}
export interface TypeStmtFunction extends TypeStmtChild {
  readonly type: Type;

  treeType: "TypeStatementFunction";
}
export interface TypeStmtMethod extends TypeStmtChild {
  readonly types: Type[];
  readonly name: string;

  treeType: "TypeStatementMethod";
}

export interface TypeStmt extends Statement {
  readonly name: string;
  readonly types: TypeStmtChild[];

  treeType: "TypeStatement";
}
