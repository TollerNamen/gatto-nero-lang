export type TreeType =
  | "Statement"
  | "GetImport"
  | "Pkg"
  | "TypeStatement"
  | "TypeStatementChild"
  | "TypeStatementFunction"
  | "TypeStatementMethod"
  | "Block"
  | "Definition"
  | "DefinitionNamed"
  | "DefinitionsNamed"
  | "Expression"
  | "EmptyGroup"
  | "Lambda"
  | "LambdaParameter"
  | "Object"
  | "ObjectMember"
  | "Match"
  | "Call"
  | "LetIn"
  | "Ternary"
  | "Binary"
  | "PreUnary"
  | "PostUnary"
  | "Listing"
  | "LiteralIdentifier"
  | "LiteralNumber"
  | "LiteralString"
  | "LiteralCharacter"
  | "Type"
  | "TypeSymbol"
  | "TypeObject"
  | "TypeObjectMember"
  | "TypeArray"
  | "TypeUnion"
  | "TypeFunction";
/*
export interface TreeVisitor<T, P = undefined> {
  visitStatement(statement: Statement, param: P | undefined): T;
  visitGetImport(getImport: GetImportStatement, param: P | undefined): T;
  visitPkgStatement(pks: PkgStatement, param: P | undefined): T;

  visitTypeStmt(typeStmt: TypeStmt, param: P | undefined): T;
  visitTypeStmtChild(typeStmtCild: TypeStmtChild, param: P | undefined): T;
  visitTypeStmtFunction(
    typeStmtFunction: TypeStmtFunction,
    param: P | undefined,
  ): T;
  visitTypeStmtMethod(typeStmtMethod: TypeStmtMethod, param: P | undefined): T;

  visitBlock(block: BlockStatement, param: P | undefined): T;

  visitNamedDefinition(named: NamedDefiniton, param: P | undefined): T;
  visitDefinition(definiton: Definition, param: P | undefined): T;
  visitMemberDefinition(member: MemberDefinition, param: P | undefined): T;

  visitExpression(expression: Expression, param: P | undefined): T;

  visitLambda(lambda: Lambda, param: P | undefined): T;
  visitBlockLambda(blockLambda: BlockLambda, param: P | undefined): T;

  visitMatch(match: Match, param: P | undefined): T;

  visitCall(call: Call, param: P | undefined): T;

  visitLetIn(letIn: LetIn, param: P | undefined): T;

  visitTernary(ternary: Ternary, param: P | undefined): T;
  visitBinary(binary: Binary, param: P | undefined): T;
  visitPostUnary(unary: PostUnary, param: P | undefined): T;
  visitPreUnary(unary: PreUnary, param: P | undefined): T;

  visitListing(listing: Listing, param: P | undefined): T;

  visitIdentifier(identifier: Identifier, param: P | undefined): T;
  visitLiteralValue(literalValue: LiteralValue, param: P | undefined): T;
  visitNumber(num: NumberLiteral, param: P | undefined): T;
  visitString(str: StringLiteral, param: P | undefined): T;
  visitCharacter(character: CharacterLiteral, param: P | undefined): T;

  visitType(type: Type, param: P | undefined): T;
  visitSymbolType(symbol: TypeSymbol, param: P | undefined): T;
  visitArrayType(array: Array, param: P | undefined): T;
  visitFunctionType(fun: Function, param: P | undefined): T;
}

export type Visitable = {
  accept<T, P = undefined>(visitor: TreeVisitor<T, P>, param: P | undefined): T;
};
*/
