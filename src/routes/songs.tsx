import { useState, useMemo } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { Search, Play, Copy, Check, Plus, Music2, BookOpen } from "lucide-react";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { SONGS, type Song, type Difficulty, type Genre } from "@/lib/songs";

export const Route = createFileRoute("/songs")({
  head: () => ({
    meta: [
      { title: "Grand — Notalar Kutubxonasi" },
      {
        name: "description",
        content:
          "Virtual Piano notalari: klassik musiqa, pop qo'shiqlar, kino saundtreklari va o'yin musiqalari.",
      },
    ],
  }),
  component: SongsPage,
});

function SongsPage() {
  const [search, setSearch] = useState("");
  const [selectedGenre, setSelectedGenre] = useState<string>("All");
  const [selectedDiff, setSelectedDiff] = useState<string>("All");
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Custom user sheets from local storage
  const [customSongs, setCustomSongs] = useState<Song[]>(() => {
    if (typeof window === "undefined") return [];
    try {
      const saved = localStorage.getItem("vp:sheets");
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const [newTitle, setNewTitle] = useState("");
  const [newSheet, setNewSheet] = useState("");

  const allSongs = useMemo(() => [...customSongs, ...SONGS], [customSongs]);

  const filteredSongs = useMemo(() => {
    return allSongs.filter((song) => {
      const matchSearch =
        song.title.toLowerCase().includes(search.toLowerCase()) ||
        song.artist.toLowerCase().includes(search.toLowerCase()) ||
        song.sheet.toLowerCase().includes(search.toLowerCase());

      const matchGenre = selectedGenre === "All" || song.genre === selectedGenre;
      const matchDiff = selectedDiff === "All" || song.difficulty === selectedDiff;

      return matchSearch && matchGenre && matchDiff;
    });
  }, [allSongs, search, selectedGenre, selectedDiff]);

  const handleCopy = (id: string, sheet: string) => {
    navigator.clipboard.writeText(sheet);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleAddCustom = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim() || !newSheet.trim()) return;

    const newSong: Song = {
      id: "custom-" + Date.now(),
      title: newTitle.trim(),
      artist: "Mening notam",
      difficulty: "Medium",
      genre: "Custom",
      bpm: 120,
      sheet: newSheet.trim(),
    };

    const updated = [newSong, ...customSongs];
    setCustomSongs(updated);
    localStorage.setItem("vp:sheets", JSON.stringify(updated));
    setNewTitle("");
    setNewSheet("");
  };

  const genres: (Genre | "All")[] = [
    "All",
    "Traditional / Folk",
    "Classical",
    "Pop",
    "Anime/Game",
    "Movie OST",
    "Custom",
  ];
  const diffs: (Difficulty | "All")[] = ["All", "Easy", "Medium", "Hard"];

  return (
    <div className="flex min-h-screen flex-col bg-background text-foreground transition-colors duration-200 antialiased">
      <Navbar />

      <main className="flex-1 py-10 px-4 sm:px-6">
        <div className="mx-auto max-w-7xl">
          {/* Header */}
          <div className="mb-8 space-y-2">
            <div className="flex items-center gap-2">
              <span className="grid size-6 place-items-center rounded bg-secondary text-amber-500 border border-border">
                <BookOpen className="size-3.5" />
              </span>
              <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Musiqa katalogi
              </span>
            </div>
            <h1 className="font-serif text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
              Notalar kutubxonasi
            </h1>
            <p className="text-sm text-muted-foreground max-w-xl">
              Virtual Piano formati uchun moslashtirilgan klassik va zamonaviy qo'shiqlar to'plami.
              Bir bosishda chalishni boshlang.
            </p>
          </div>

          {/* Filters & Search */}
          <div className="mb-8 space-y-4 rounded-xl border border-border bg-card p-4 sm:p-5 shadow-sm">
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
              <input
                type="text"
                placeholder="Qo'shiq nomi, bastakor yoki nota harflarini qidiring..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full rounded-lg border border-input bg-background py-2.5 pl-10 pr-4 text-sm text-foreground placeholder:text-muted-foreground focus:border-ring focus:outline-none focus:ring-1 focus:ring-ring"
              />
            </div>

            {/* Filter tags */}
            <div className="flex flex-wrap items-center justify-between gap-4 pt-1">
              {/* Genres */}
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="mr-1 text-xs text-muted-foreground">Janr:</span>
                {genres.map((g) => (
                  <button
                    key={g}
                    onClick={() => setSelectedGenre(g)}
                    className={`rounded-md px-3 py-1 text-xs font-medium transition-colors ${
                      selectedGenre === g
                        ? "bg-foreground text-background font-semibold shadow-sm"
                        : "bg-secondary text-secondary-foreground hover:bg-secondary/80"
                    }`}
                  >
                    {g === "All" ? "Barchasi" : g}
                  </button>
                ))}
              </div>

              {/* Difficulties */}
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="mr-1 text-xs text-muted-foreground">Daraja:</span>
                {diffs.map((d) => (
                  <button
                    key={d}
                    onClick={() => setSelectedDiff(d)}
                    className={`rounded-md px-3 py-1 text-xs font-medium transition-colors ${
                      selectedDiff === d
                        ? "bg-foreground text-background font-semibold shadow-sm"
                        : "bg-secondary text-secondary-foreground hover:bg-secondary/80"
                    }`}
                  >
                    {d === "All"
                      ? "Barchasi"
                      : d === "Easy"
                        ? "Oson"
                        : d === "Medium"
                          ? "O'rtacha"
                          : "Qiyin"}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Songs Grid */}
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
            {filteredSongs.map((song) => (
              <div
                key={song.id}
                className="flex flex-col justify-between rounded-xl border border-border bg-card p-5 transition-all hover:border-foreground/30 shadow-sm"
              >
                <div>
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <h3 className="font-serif text-lg font-bold text-card-foreground leading-snug">
                        {song.title}
                      </h3>
                      <p className="text-xs text-muted-foreground">{song.artist}</p>
                    </div>

                    <span
                      className={`rounded px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider ${
                        song.difficulty === "Easy"
                          ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20"
                          : song.difficulty === "Medium"
                            ? "bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20"
                            : "bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20"
                      }`}
                    >
                      {song.difficulty}
                    </span>
                  </div>

                  <div className="mt-3 flex items-center gap-2 text-[11px] text-muted-foreground">
                    <span className="rounded bg-secondary px-1.5 py-0.5 font-medium">
                      {song.genre}
                    </span>
                    <span>{song.bpm} BPM</span>
                  </div>

                  {/* Sheet snippet */}
                  <div className="mt-3 rounded-lg border border-border bg-muted/50 p-3">
                    <div className="line-clamp-2 font-mono text-xs text-foreground/90 leading-relaxed">
                      {song.sheet}
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <div className="mt-5 flex items-center gap-2 border-t border-border pt-4">
                  <Link to="/play" search={{ song: song.id }} className="flex-1">
                    <Button
                      size="sm"
                      className="w-full gap-1.5 bg-foreground text-background hover:opacity-90 text-xs font-medium"
                    >
                      <Play className="size-3 fill-current" />
                      Chalish
                    </Button>
                  </Link>

                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleCopy(song.id, song.sheet)}
                    className="text-xs gap-1"
                    title="Notani nusxalash"
                  >
                    {copiedId === song.id ? (
                      <Check className="size-3 text-emerald-500" />
                    ) : (
                      <Copy className="size-3" />
                    )}
                    <span>{copiedId === song.id ? "Olingan" : "Nusxa"}</span>
                  </Button>
                </div>
              </div>
            ))}
          </div>

          {filteredSongs.length === 0 && (
            <div className="py-16 text-center text-muted-foreground">
              <Music2 className="mx-auto size-10 opacity-30 mb-3" />
              <p className="text-base font-medium text-foreground">Hech qanday nota topilmadi</p>
              <p className="text-xs text-muted-foreground mt-1">
                Qidiruv so'zini yoki filtrlarni o'zgartirib ko'ring.
              </p>
            </div>
          )}

          {/* Add custom sheet section */}
          <div className="mt-12 rounded-xl border border-border bg-card p-6 shadow-sm">
            <div className="flex items-center gap-2 mb-2">
              <Plus className="size-4 text-amber-500" />
              <h2 className="font-serif text-lg font-bold text-card-foreground">
                O'z notangizni qo'shing
              </h2>
            </div>
            <p className="text-xs text-muted-foreground mb-4 max-w-xl">
              Virtual Piano formati bo'yicha yozilgan ixtiyoriy matnli notani kiriting va
              brauzeringizda darhol ijro eting.
            </p>

            <form onSubmit={handleAddCustom} className="space-y-3">
              <div>
                <input
                  type="text"
                  placeholder="Kuy nomi (masalan: Yangi kuy)"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  className="w-full rounded-lg border border-input bg-background px-3.5 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:border-ring focus:outline-none"
                />
              </div>

              <div>
                <textarea
                  rows={3}
                  placeholder="Nota matni (masalan: [eu] o | p [ya] o i u)"
                  value={newSheet}
                  onChange={(e) => setNewSheet(e.target.value)}
                  className="w-full rounded-lg border border-input bg-background p-3 font-mono text-xs text-foreground placeholder:text-muted-foreground focus:border-ring focus:outline-none"
                />
              </div>

              <Button
                type="submit"
                disabled={!newTitle.trim() || !newSheet.trim()}
                className="bg-foreground text-background hover:opacity-90 text-xs font-medium"
              >
                Kutubxonaga saqlash
              </Button>
            </form>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
