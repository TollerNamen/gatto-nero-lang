# gatto nero language

A declarative object/functional programming language (not *Object Oriented*!)

## Preview

```python
pkg gatto.nero.lang

import gatto.nero.lang [ Str, Int ]

# an interface
our type Person {
  name (): Str
  age (): Int
}

# a function returning an object which implements Person (modern duck typing)
our Person:
  (Str): {} = name: Person (name, 18)
  (Str, Int): {} = (name, age): {
    our name (): Str = (): name
    our age (): Int = (): age
  }
;;

# an interface subtyping Person
our type Worker {

  # lets the compiler create wrapper functions
  # avoids composition boilerplate
  # while not having to take responsibility for all methods like in inheritance
  wrap Person [ name, age ]

  job (): Str
}

my Worker (Person, Str): {} = (person, job): {
  wrap Person [ name, age ]
  our job (): Str = job
}

# creates a static object with the members 'TIM', 'TOM', 'BEN'
# acts like an enum
our Workers Dictionary<Worker> = {

  # Type is infered
  # The parenthesis and their contents resemble a truple
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

# main function, program starts executing here
# Piping
our main ([]Str) = args: "Hello, World!" | println

```

## Basic Concepts
### Variables and Functions
#### Structure
```
MODIFIER NAME TYPE = VALUE
```
#### Example
```python
IntegerMaxValue Int = 2 147 483 647

# some function:
printHello () = (): println ("Hello")

# some function with a variety of descriptor
add:
  (Int, Int): Int = (a, b): a + b
  (Float, Float): Float = (a, b): a + b
;;
```

### Objects
#### An object Expression
```python
{
  # Only methods are allowed
  our name (): Str = (): "Oscar"
  our age (): Int = (): 47
}
```
Objects cannot be modified and when you want to have a different state,
you construct them using a function:
```python
(name Str, age Int): {
  our name (): Str = (): name
  our age (): Int = (): age
}
```
Now to use this function to instantiate custom objects, you assign it to a variable:
```python
# Type is inferred
Person (Str, Int): {} = (name, age): {
  our name (): Str = (): name
  our age (): Int = (): age
}
```
The `(Str, Int): {}` here means:

| Symbol     | Meaning                           |
| ---------- | --------------------------------- |
| `()`       | a function returning nothing/void |
| `(): TYPE` | a function returning `TYPE`       |
| `(Str)`    | a function taking `Str` as parameter |
| `{}`       | an object                         |
| `(Str, Int): {}` | a function taking the parameter of type `Str` and `Int` and returning an object |

## Project State
Some features still need to be implemented into the parser and semantics are missing entirely.
Stay tuned.

## Contributing
You may refrain from contributing to the awful typescript codebase;
Later there will be a bytecode interpreter written in Rust
and the source code compiler will be rewritten in gatto nero language