import { BlockStatement, Modifier, Statement } from "./statements.ts";
import { Type } from "./types.ts";

export interface Expression extends Statement {}

export interface LetIn extends Expression {
  readonly block: BlockStatement;

  treeType: "LetIn";
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
  treeType: "EmptyGroup";
}

export interface Lambda extends Expression {
  readonly arguments: Expression;
  readonly value: Expression;

  treeType: "Lambda";
}

export interface TypedParam extends Expression {
  readonly name: string;
  readonly paramType: Type;

  treeType: "LambdaParameter";
}

export interface Object extends Expression {
  readonly members: ObjectMember[];

  treeType: "Object";
}

export interface ObjectMember extends Expression {
  readonly modifiers: Modifier[];
  readonly name: string;
  readonly memberType: Type | undefined;
  readonly value: Expression | undefined;

  treeType: "ObjectMember";
}

export interface Match extends Expression {
  readonly left: Expression;
  readonly branches: Expression[];

  treeType: "Match";
}

export interface Call extends Expression {
  readonly target: Expression;
  readonly arguments: Expression;

  treeType: "Call";
}

export interface Ternary extends Statement {
  readonly condition: Expression;
  readonly success: Expression;
  readonly failure: Expression;

  treeType: "Ternary";
}

export interface Binary extends Expression {
  readonly left: Expression;
  readonly right: Expression;
  readonly op: string;

  treeType: "Binary";
}

export interface PostUnary extends Expression {
  readonly op: string;
  readonly left: Expression;

  treeType: "PostUnary";
}
export interface PreUnary extends Expression {
  readonly op: string;
  readonly right: Expression;

  treeType: "PreUnary";
}

export interface Listing extends Expression {
  readonly expressions: Expression[];

  treeType: "Listing";
}

export interface Identifier extends Expression {
  readonly symbol: string;

  treeType: "LiteralIdentifier";
}
export interface LiteralValue extends Expression {
  readonly value: string;
}
export interface NumberLiteral extends LiteralValue {
  treeType: "LiteralNumber";
}
export interface StringLiteral extends LiteralValue {
  treeType: "LiteralString";
}
export interface CharacterLiteral extends LiteralValue {
  treeType: "LiteralCharacter";
}
