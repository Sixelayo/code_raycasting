# compile

run vs code tasks
require Cmake and MSVC

# control

> keybinds for an azerty keyboard !

`zqsd` move current focus

set focus :
`c` - camera
`x` - light
via UI - anything

`,` - lock camera rot
`n` - look at (0,0,0)

# todo

## mandatory

- avoir un set up qui force les scene, (default et version plate avec un checker)

- Constructive solid geometry
- antialiasing


## optionel

- lafortune brdf !

## bug

- on commit prooved bug 849f23f : dans le block else qui gère les soft shadow du code jamais exécuté casse tout. L aversion commenter ou la version avec la boucle for fait strictement la même chose mais résultat différent. Ca vient probablement du nombre trop élevé de parameter marque `out`
Si le block else qui gère les soft shadow tout est cassé, même lorsque le code n'est pas appelé.
En particulier si 2 fonction nearest sont appelé ça cassse.. Déclafier numcalls en uniform permet d'empêcher le compilateur de déroulé la boucle for.

