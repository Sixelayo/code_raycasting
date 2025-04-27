> Code was somewhat decent until I came back after 3 week and now its an absolute mess :/

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

## bug

- on peut pas repasser de la scene 2 vers la 1 (materiaux détruit)
- on commit prooved bug 849f23f : dans le block else qui gère les soft shadow du code jamais exécuté casse tout. L aversion commenter ou la version avec la boucle for fait strictement la même chose mais résultat différent. Ca vient probablement du nombre trop élevé de parameter marque `out`
Si le block else qui gère les soft shadow tout est cassé, même lorsque le code n'est pas appelé.
En particulier si 2 fonction nearest sont appelé ça cassse.. Déclafier numcalls en uniform permet d'empêcher le compilateur de déroulé la boucle for.Bug réaparu par la suite : certaines sphere s'affiche au dessu d'autre dans l'ordre d'affichage (wtf) : on peut voir la 7 à travers la 5 ?? vraiment un bug compilateur ? -> à priori c'était les nested out


