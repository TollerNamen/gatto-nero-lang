import { SourceLocation } from "../analysis/syntactic/lexer.ts";
import { TreeType } from "./ast.ts";

export interface Type {
  location: SourceLocation;

  treeType: TreeType;
}

export interface Symbol extends Type {
  symbol: string;

  treeType: TreeType.TYPE_SYMBOL;
}

export interface Array extends Type {
  size: string | undefined;
  child: Type;

  treeType: TreeType.TYPE_ARRAY;
}

// (): Int or (Int) or (Int): Int or (Int): (Int): Int etc.
// (num Int) or (fun (Str)) or (name Str, age Int)
export interface Function extends Type {
  arguments: Parameter[];
  returnType: Type | undefined;

  treeType: TreeType.TYPE_FUNCTION;
}
export interface Parameter extends Type {
  type: Type;

  treeType: TreeType.TYPE_FUNCTION;
}

export interface Union extends Type {
  left: Type;
  right: Type;

  treeType: TreeType.TYPE_UNION;
}
