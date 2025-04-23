{ pkgs ? import <nixpkgs> {} }:
pkgs.mkShell {
  buildInputs = with pkgs; [
    deno
    nodejs_23
    typescript-language-server
  ];
}
