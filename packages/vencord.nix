{ vencord }:
# Vencord picks up anything under src/userplugins at build time.
vencord.overrideAttrs (previous: {
  preBuild = (previous.preBuild or "") + ''
    mkdir -p src/userplugins
    cp -r ${../plugins}/. src/userplugins/
    chmod -R u+w src/userplugins
  '';
})
