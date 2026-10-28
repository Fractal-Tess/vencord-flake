{
  description = "Discord with Vencord and my own plugins, packaged for Nix";

  inputs.nixpkgs.url = "github:NixOS/nixpkgs/nixos-unstable";

  outputs =
    { self, nixpkgs }:
    let
      systems = [
        "x86_64-linux"
        "aarch64-linux"
      ];
      forAllSystems = nixpkgs.lib.genAttrs systems;
      # Discord is unfree, so allow exactly this package rather than
      # asking every consumer to set allowUnfree.
      pkgsFor =
        system:
        import nixpkgs {
          inherit system;
          config.allowUnfreePredicate = pkg: nixpkgs.lib.hasPrefix "discord" (nixpkgs.lib.getName pkg);
          overlays = [ self.overlays.default ];
        };
    in
    {
      packages = forAllSystems (
        system:
        {
          inherit (pkgsFor system) vencord;
          default = if system == "x86_64-linux" then (pkgsFor system).discord else (pkgsFor system).vencord;
        }
        // nixpkgs.lib.optionalAttrs (system == "x86_64-linux") {
          inherit (pkgsFor system) discord;
        }
      );

      # Upstream Discord ships no Linux ARM64 application.
      apps.x86_64-linux.default = {
        type = "app";
        program = nixpkgs.lib.getExe self.packages.x86_64-linux.discord;
        meta.description = "Run Discord with Vencord and the plugins";
      };

      checks = forAllSystems (
        system:
        {
          inherit (self.packages.${system}) vencord;
        }
        // nixpkgs.lib.optionalAttrs (system == "x86_64-linux") {
          inherit (self.packages.${system}) discord;
        }
      );

      formatter = forAllSystems (system: nixpkgs.legacyPackages.${system}.nixfmt);

      overlays.default = final: previous: {
        vencord = final.callPackage ./packages/vencord.nix { inherit (previous) vencord; };
        discord = previous.discord.override {
          withVencord = true;
          vencord = final.vencord;
        };
      };

      nixosModules.default = import ./modules/nixos.nix { flake = self; };
    };
}
