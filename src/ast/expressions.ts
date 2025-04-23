import { TokenKind } from "../analysis/syntactic/lexer.ts";
import { TreeType } from "./ast.ts";
import { BlockStatement, Statement } from "./statements.ts";

export interface Expression extends Statement {}

export interface LetIn extends Expression {
  readonly block: BlockStatement;

  treeType: TreeType.LET_IN;
}

/*
export interface Modifier extends Expression {
  readonly left: Expression;
}
export interface Access extends Modifier {
  readonly kind: TokenKind;
}
*/

export interface EmptyGroup extends Expression {
  treeType: TreeType.EMPTY_GROUP;
}

export interface Lambda extends Expression {
  readonly arguments: Expression;
  readonly value: Expression;

  treeType: TreeType.LAMBDA;
}
export interface BlockLambda extends Expression {
  readonly arguments: Expression;
  readonly statements: Statement[];

  treeType: TreeType.LAMBDA_BLOCK;
}

export interface Match extends Expression {
  readonly left: Expression;
  readonly branches: Expression[];

  treeType: TreeType.MATCH;
}

export interface Call extends Expression {
  readonly target: Expression;
  readonly arguments: Expression;

  treeType: TreeType.CALL;
}

export interface Ternary extends Statement {
  readonly condition: Expression;
  readonly success: Expression;
  readonly failure: Expression;

  treeType: TreeType.TERNARY;
}

export interface Binary extends Expression {
  readonly left: Expression;
  readonly right: Expression;
  readonly op: string;

  treeType: TreeType.BINARY;
}

export interface PostUnary extends Expression {
  readonly op: string;
  readonly left: Expression;

  treeType: TreeType.UNARY_POST;
}
export interface PreUnary extends Expression {
  readonly op: string;
  readonly right: Expression;

  treeType: TreeType.UNARY_PRE;
}

export interface Listing extends Expression {
  readonly expressions: Expression[];

  treeType: TreeType.LISTING;
}

export interface Identifier extends Expression {
  readonly symbol: string;

  treeType: TreeType.LITERAL_IDENTIFIER;
}
export interface LiteralValue extends Expression {
  readonly value: string;
}
export interface NumberLiteral extends LiteralValue {
  treeType: TreeType.LITERAL_NUMBER;
}
export interface StringLiteral extends LiteralValue {
  treeType: TreeType.LITERAL_STRING;
}
export interface CharacterLiteral extends LiteralValue {
  treeType: TreeType.LITERAL_CHAR;
}
