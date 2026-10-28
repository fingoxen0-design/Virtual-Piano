export type Difficulty = "Easy" | "Medium" | "Hard";
export type Genre =
  "Classical" | "Pop" | "Anime/Game" | "Movie OST" | "Traditional / Folk" | "Custom";
export interface Song {
  id: string;
  title: string;
  artist: string;
  difficulty: Difficulty;
  genre: Genre;
  bpm: number;
  sheet: string;
}

export const SONGS: Song[] = [
  {
    id: "ode",
    title: "Ode to Joy",
    artist: "Beethoven",
    difficulty: "Easy",
    genre: "Classical",
    bpm: 112,
    sheet: "u u i o | o i u y | t t y u | u  y y |\nu u i o | o i u y | t t y u | y  t t",
  },
  {
    id: "twinkle",
    title: "Twinkle Twinkle Little Star",
    artist: "Traditional",
    difficulty: "Easy",
    genre: "Classical",
    bpm: 100,
    sheet:
      "t t o o | p p o  | i i u u | y y t  |\no o i i | u u y  | o o i i | u u y  |\nt t o o | p p o  | i i u u | y y t",
  },
  {
    id: "furelise",
    title: "Für Elise (Opening)",
    artist: "Beethoven",
    difficulty: "Medium",
    genre: "Classical",
    bpm: 124,
    sheet:
      "f D f D f a d s | p  t u p | a  u O a | s  u f D |\nf D f D f a d s | p  t u p | a  u s a | p",
  },
  {
    id: "moonlight",
    title: "Moonlight Sonata (1st Movement)",
    artist: "Beethoven",
    difficulty: "Medium",
    genre: "Classical",
    bpm: 54,
    sheet: `[60] e t 0 e t 0 e t 0 e t 
[50] e t 0 e t 0 e t 0 e t 
[q4] e t q e t [q2] E y q E y 
[30] W y 0 e t [30] e r 9 W r 
[863] 0 e 0 e t 0 e t [u0] e tu
[u30%] r y 0 r y 0 r y [u0] r yu
[u60] e t 0 e t [qi2] e y q e y 
[u50] w t 0 w t [yq5] w r [qo] w r 
[t810] w t 0 w t 0 w t 0 w t 
[81(] w t ( w t ( w t [Y(] w tY
[^Y(] w T ( w T ( w T [Y(] w TY
[Y(%] W t [5(] w t [($] e t [y9] e t 
[y95] w E 9 w E [Y1(] w e [t@8] w e 
[y92] w E 9 w E [y92] Q e 9 Q e 
[w5] E y w E y w r y [wo] r y 
[wO] t Y [w81] t Y [w@(] t Y [wI81] t Y 
[wo5] r y w r y w r y [wo] r y 
[wO] t Y [w81] t Y [w@(] t Y [wI81] t Y 
[wo5] r y w r y [wo3] E T w E T 
[wo!] e u w e u [qi2] e y q e y 
[Y5(] w E ( w E [y9%] q r 9 q r 
[e6] 9 q 6 9 q [e6] 9 0 [e6] * 0 
[962] q e q e y e y i [pe] y ip
[pe6*!] u o e u o e u o [pe] u op
[pe92] y i e y i [WO7] y i [pe6] y i 
[ra3%] y u r y u r y u [ra3%] y u 
[ts63] u p t u p [ra2] y i [pe@] t I 
[O3] W r u W r i W r y W r 
3 W r 0 W r q W r 9 W r 
[83] t u p t u s t u p t u 
3 8 0 e 8 0 t 8 0 e 8 0 
[73] q 9 W q r W y r i y O 
[83] e 0 t e u t p u s p u 
[e3] Y t I Y p I s p D s G 
[y3] O i a O d a g d H g k H d g a d O a i O y i 
[r y W r q W 9 q 7 9 6 9 q]
[3%] 9 0 q 0 9 7 9 q 6 9 q 
[3%] 9 0 q 0 9 7 9 q 6 9 q 
[3%] 9 0 q 0 9 
[64] 8 e 6 8 e [72] 9 q 7 9 q 
[73] 0 W 7 9 W [863] 0 e 0 e t 0 e t 
[u0] e tu[u30%] r y 0 r y 0 r y 
[u0] r yu[u60] e t 0 e t [qi2] e y q e y 
[u50] w t 0 w t [yq5] w r [qo] w r 
[t810] w t w t u w t u [wu] t uu
[wu7] y i w y i w y i [wu] y iu
[wo81] t u w t u [WO7] y u [pe6] t u 
[ra3%] y u r y u [ts63] u p t u p 
[PE2] y i E y i [WO3] y u W y u 
[pe6] t u e t u e T u`,
  },
  {
    id: "canon",
    title: "Canon in D (Theme)",
    artist: "Pachelbel",
    difficulty: "Medium",
    genre: "Classical",
    bpm: 85,
    sheet: "[8f] [5d] [6s] [0a] [4p] [8o] [4p] [5a] |\nf d s a p o p a | s a p o i u i y",
  },
  {
    id: "happy",
    title: "Happy Birthday",
    artist: "Traditional",
    difficulty: "Easy",
    genre: "Pop",
    bpm: 100,
    sheet: "t t y t i u | t t y t o i | t t s p i u y | P P p i o i",
  },
  {
    id: "jingle",
    title: "Jingle Bells",
    artist: "James Lord Pierpont",
    difficulty: "Easy",
    genre: "Pop",
    bpm: 130,
    sheet:
      "u u u  | u u u  | u o t y | u   |\ni i i i | i u u u | u y y u | y  o  |\nu u u  | u u u  | u o t y | u   |\ni i i i | i u u u | o o i y | t",
  },
  {
    id: "zelda",
    title: "Zelda's Lullaby",
    artist: "Koji Kondo",
    difficulty: "Medium",
    genre: "Anime/Game",
    bpm: 75,
    sheet: "u  o  r  | u  o  r | u o s a  o  i o u | e",
  },
  {
    id: "megalovania",
    title: "Megalovania (Intro)",
    artist: "Toby Fox",
    difficulty: "Hard",
    genre: "Anime/Game",
    bpm: 155,
    sheet: "d d l p O o i d i o | s s l p O o i d i o |\na a l p O o i d i o | P P l p O o i d i o",
  },
  {
    id: "pirates",
    title: "He's a Pirate",
    artist: "Klaus Badelt",
    difficulty: "Hard",
    genre: "Movie OST",
    bpm: 140,
    sheet:
      "e t [yd] [yd] | [yd] [uf] [ig] [ig] | [ig] [oh] [uf] [uf] | [yd] [ts] [ts] [yd] |\ne t [yd] [yd] | [yd] [uf] [ig] [ig] | [ig] [oh] [uf] [uf] | [ts] [yd]",
  },
  {
    id: "interstellar",
    title: "Interstellar (First Step)",
    artist: "Hans Zimmer",
    difficulty: "Medium",
    genre: "Movie OST",
    bpm: 70,
    sheet:
      "[ea] a [ea] a [ea] a [ea] a | [0a] a [0a] a [0a] a [0a] a |\n[qs] s [qs] s [qs] s [qs] s | [ws] s [ws] s [ws] s [ws] s",
  },
  {
    id: "riverflows",
    title: "River Flows in You",
    artist: "Yiruma",
    difficulty: "Medium",
    genre: "Classical",
    bpm: 76,
    sheet:
      "[es] a [es] a [es] a [es] a | [0s] a [0s] a [0s] a [0s] a |\n[8s] a [8s] a [8s] a [8s] a | [5s] a [5s] a [5s] a [5s] a",
  },
  {
    id: "nuvole",
    title: "Nuvole Bianche",
    artist: "Ludovico Einaudi",
    difficulty: "Medium",
    genre: "Classical",
    bpm: 72,
    sheet:
      "[6s] f s f [6s] f s f | [4s] f s f [4s] f s f |\n[1s] f s f [1s] f s f | [5s] f s f [5s] f s f",
  },
  {
    id: "tanovar",
    title: "Tanovar",
    artist: "O'zbek xalq kuyi",
    difficulty: "Medium",
    genre: "Traditional / Folk",
    bpm: 84,
    sheet:
      "[60e] u [ep] [ea] [ts] [ea] [ep] [wo] | [ep] [0u] [6e] u [ep] [ea] |\n[ts] [yd] [ts] [ea] [ep] | [0u] [ep] [wo] [0u] [6e] |\n[6ep] [ts] [yd] [uf] [yd] [ts] [ea] | [ep] [0u] [ep] [wo] [6e]",
  },
  {
    id: "bahorvalsi",
    title: "Bahor valsi",
    artist: "Mutal Burhonov",
    difficulty: "Easy",
    genre: "Traditional / Folk",
    bpm: 108,
    sheet:
      "[8w] u o [5w] u o | [8w] o s [5w] o s |\n[8w] [yd] [ts] [5w] [ra] [ep] | [8w] [wo] [0u] [5w] [9y] [8t] |\n[8w] u o [5w] u o | [9w] y o [5w] y o |\n[8w] u t [5w] u t | [8w0]",
  },
  {
    id: "munojot",
    title: "Munojot",
    artist: "O'zbek mumtoz musiqasi",
    difficulty: "Medium",
    genre: "Traditional / Folk",
    bpm: 68,
    sheet:
      "[60] e t u p | [60] p a s a p o |\n[30] u y t r e | [60] e u p |\n[60] p a [ts] a p o | [30] u o p o u y | [60] t e",
  },
  {
    id: "andijon",
    title: "Andijon polkasi",
    artist: "O'zbek xalq kuyi",
    difficulty: "Hard",
    genre: "Traditional / Folk",
    bpm: 132,
    sheet:
      "[8t] u o [8t] u o | [8t] o [ts] [8t] o [ts] |\n[9y] i p [9y] i p | [8t] u o [8t] u o |\n[8ts] [yd] [uf] [8ts] [yd] [uf] | [9yd] [uf] [ig] [8ts] [yd] [uf] |\n[8ts] [ra] [ep] [8wo] [8t]",
  },
  {
    id: "spirited",
    title: "One Summer's Day (Spirited Away)",
    artist: "Joe Hisaishi",
    difficulty: "Medium",
    genre: "Anime/Game",
    bpm: 82,
    sheet:
      "[80w] u o s | [57w] y o a | [60e] u p s | [30w] y u o |\n[48q] t i p | [108] u o s | [249] y i p | [57w] y o a |\n[80w] s d f | [57w] a s d | [60e] p a s | [30w] o u o |\n[48q] p o i | [108] u y t | [249] y u y | [108t]",
  },
  {
    id: "goldenhour",
    title: "Golden Hour",
    artist: "JVKE",
    difficulty: "Medium",
    genre: "Pop",
    bpm: 92,
    sheet:
      "[8t] u o s o u [8t] u o s o u |\n[6e] t u p u t [6e] t u p u t |\n[4e] t i p i t [4e] t i p i t |\n[5w] r y o y r [5w] r y o y r |\n[8ts] u o s [6ep] t u p | [4ei] t i p [5wo] r y o",
  },
  {
    id: "chopinnocturne",
    title: "Nocturne Op. 9 No. 2",
    artist: "Chopin",
    difficulty: "Hard",
    genre: "Classical",
    bpm: 64,
    sheet:
      "[6u] o [ts] a s d [ts] a | [3p] o [yo] i u y [to] |\n[4i] u [yi] p [ts] a [yp] o | [5o] i [tu] y [ru] [et] |\n[6u] o [ts] a s d [ts] a | [3p] o [yo] i u y [to] |\n[4i] u [yi] p [ts] d [ts] a | [1ts]",
  },
];
