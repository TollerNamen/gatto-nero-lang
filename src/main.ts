import { Lexer } from "./analysis/syntactic/lexer.ts";
import { LexerLookupStore } from "./analysis/syntactic/parser.ts";

const testSource = `
someFun (): Str = "Hello, World!"

our main ([]Str) = args: someFun | recursiveFun

our native var StdOut Outputstream
our native var StdIn InputStream

my recursiveFun:
  our (Str) = value: recursiveFun (value, 10)
  my (Str, Int) = (value, index) match
    (_, index > 1):
      StdOut.println (value) &
      recursiveFun (value, --index)
    (_, index <= 1): StdOut.println (value)
  end
;;

type Person {
  age (): Int
  name (): Int
}

type multiVariantFun:
  (Str)
  (Int)
;;

our Person:
  our (Str): {} = name -> Person (name, 18)
  our (Str, Int): {} = (name, age): {
    our age (): Str = age # short for (): age
    our name (): Int = name
    our canDrinkBeer (): Bool = age >= 16
  }
;;

my Worker (Person, Str): {} = (person, job): {
  wrap Person [ name, age ]
  our job (): Str = job
}

Workers Dictionary<Worker> = {
  TIM = ("Tim", 20, "Backend Developer")
  TOM = ("Tom", 45, "Product Manager")
  BEN = ("Ben", 36, "Fullstack Developer")
}
.map (
  (key, value): (
    key,
    Person (value[0], value[1])
    | Worker (value[2])
  )
)
.toDict
`;
const ignoredKeys = new Set(["location"]);
export function astToStringJson<T>(key: string, value: T) {
  if (ignoredKeys.has(key)) {
    return;
  }
  return value;
}

const test = `pkg gatto.nero.example

import gatto.nero.lang [ Str ]

type Person {
  name (): Str
  age (): Int
}

our INT_MAX_SIZE Int =  2 147 483 647
our INT_MIN_SIZE Int = -2 147 483 648

Person:
  our (Str): {} = name: Person (name, 18)
  our (Str, Int): {} = (name, age): {
    our name
    our age
    our canDrinkBeer Bool = (): age >= 16
  }
;;

factorial (Int): Int = n:n * factorial (n - 1)
`;

function main() {
  const lexer = new Lexer(test);
  const store = new LexerLookupStore(lexer);
  const tree = store.parse();
  console.dir(JSON.stringify(tree, astToStringJson, "  "));
}

main();

/*
definitions:
  MODIFIERS:
    (my|our) force? native?

  MODIFIERS? NAME TYPE = VALUE
  NAME: (MODIFIERS? TYPE = VALUE)+

types:
  symbol:
    NAME

  function:
    ARGS:
      (type)*

    ( ARGS* )
    ( ARGS* ): RETURN_TYPE

    array:
    []CHILD_TYPE

  object:
    {}

lambda expressions:
  no args:
    (): EXPRESSION
  with args:
    (arg (, arg)*): EXPRESSION
*/
