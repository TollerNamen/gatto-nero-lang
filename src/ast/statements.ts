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
/*
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
*/

/*
Person:
  (Str): ...
  (Int): ...
;;
foo (Int): Int
bar {} = { ... }

*/
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
