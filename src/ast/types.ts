import { SourceLocation } from "../analysis/syntactic/lexer.ts";
import { TreeType } from "./ast.ts";

export interface Type {
  location: SourceLocation;

  treeType: TreeType;
}

export interface Symbol extends Type {
  symbol: string;

  treeType: "TypeSymbol";
}

export interface Array extends Type {
  size: string | undefined;
  child: Type;

  treeType: "TypeArray";
}

// (): Int or (Int) or (Int): Int or (Int): (Int): Int etc.
// (num Int) or (fun (Str)) or (name Str, age Int)
export interface Function extends Type {
  arguments: Type[];
  returnType: Type | undefined;

  treeType: "TypeFunction";
}

export interface Union extends Type {
  left: Type;
  right: Type;

  treeType: "TypeUnion";
}

export interface ObjectType extends Type {
  memberTypes: ObjectTypeMember[];

  treeType: "TypeObject";
}

export interface ObjectTypeMember extends Type {
  name: string;
  memberType: Type;

  treeType: "TypeObjectMember";
}
