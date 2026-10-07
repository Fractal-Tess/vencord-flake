{ flake }:
{
  config,
  lib,
  pkgs,
  ...
}:
{
  options.programs.discord-vencord.enable = lib.mkEnableOption "Discord with Vencord and the plugins from this flake";

  config = lib.mkIf config.programs.discord-vencord.enable {
    # Replaces pkgs.discord, so a host that already lists it gets this one.
    nixpkgs.overlays = [ flake.overlays.default ];
    environment.systemPackages = [ pkgs.discord ];
  };
}
