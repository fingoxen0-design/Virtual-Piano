import { useState, useCallback } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import {
  Play,
  BookOpen,
  GraduationCap,
  Sparkles,
  Volume2,
  Mic,
  Usb,
  ShieldCheck,
  ArrowRight,
  Music2,
} from "lucide-react";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { PianoVisualizerDemo } from "@/components/PianoVisualizerDemo";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/components/ui/carousel";
import { SONGS } from "@/lib/songs";
import { initAudio, noteOn, noteOff } from "@/lib/piano";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Grand — Mukammal va Sof Virtual Pianino" },
      {
        name: "description",
        content:
          "Brauzerda to'liq 88 klavishli akustik royal pianino. Notalar kutubxonasi, mashq rejimi, audio va MIDI yozib olish, qotmaydigan yengil platforma.",
      },
    ],
  }),
  component: HomePage,
});

// Demo mini piano octave (C4 to C5)
const DEMO_KEYS = [
  { midi: 60, name: "C4", char: "t", black: false },
  { midi: 61, name: "C#4", char: "T", black: true },
  { midi: 62, name: "D4", char: "y", black: false },
  { midi: 63, name: "D#4", char: "Y", black: true },
  { midi: 64, name: "E4", char: "u", black: false },
  { midi: 65, name: "F4", char: "i", black: false },
  { midi: 66, name: "F#4", char: "I", black: true },
  { midi: 67, name: "G4", char: "o", black: false },
  { midi: 68, name: "G#4", char: "O", black: true },
  { midi: 69, name: "A4", char: "p", black: false },
  { midi: 70, name: "A#4", char: "P", black: true },
  { midi: 71, name: "B4", char: "a", black: false },
  { midi: 72, name: "C5", char: "s", black: false },
];

function HomePage() {
  const [activeMidi, setActiveMidi] = useState<number | null>(null);

  const playDemoNote = useCallback(async (midi: number) => {
    await initAudio();
    noteOn(midi, 0.85);
    setActiveMidi(midi);
    setTimeout(() => {
      noteOff(midi);
      setActiveMidi((cur) => (cur === midi ? null : cur));
    }, 450);
  }, []);

  return (
    <div className="flex min-h-screen flex-col bg-background text-foreground transition-colors duration-200 antialiased selection:bg-amber-500/20 selection:text-amber-500">
      <Navbar />

      <main className="flex-1">
        {/* Hero Section */}
        <section className="relative overflow-hidden border-b border-border pt-14 pb-16 sm:pt-20 sm:pb-24">
          <div className="relative mx-auto max-w-5xl px-4 sm:px-6 text-center space-y-7">
            {/* Minimal Badge */}
            <div className="inline-flex items-center gap-2 rounded-full border border-border bg-secondary/80 px-3.5 py-1 text-xs text-foreground/80 shadow-sm">
              <span className="size-1.5 rounded-full bg-amber-500" />
              <span>88 klavishli to'liq konsert royali</span>
            </div>

            {/* Headline */}
            <div className="space-y-4">
              <h1 className="font-serif text-4xl font-bold tracking-tight text-foreground sm:text-6xl md:text-7xl leading-[1.1]">
                Brauzeringizda mukammal va <span className="italic text-amber-500">sof</span>{" "}
                akustik pianino.
              </h1>
              <p className="mx-auto max-w-2xl text-sm sm:text-base text-muted-foreground leading-relaxed font-light">
                Chalg'ituvchi ranglar va og'ir kutubxonalarsiz, eng yengil va qotmaydigan studiya.
                O'rganish oson bo'lgan harfiy notalar, real vaqtda audio va MIDI kontroller
                integratsiyasi.
              </p>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
              <Link to="/play">
                <Button className="h-11 px-7 gap-2 bg-foreground text-background hover:opacity-90 font-medium text-sm shadow-md transition-transform active:scale-95">
                  <Play className="size-4 fill-current" />
                  Pianinoni ochish
                </Button>
              </Link>

              <Link to="/songs">
                <Button
                  variant="outline"
                  className="h-11 px-6 gap-2 border-border bg-card text-foreground hover:bg-secondary text-sm"
                >
                  <BookOpen className="size-4" />
                  Notalar kutubxonasi
                </Button>
              </Link>

              <Link to="/learn">
                <Button
                  variant="ghost"
                  className="h-11 px-5 gap-1.5 text-muted-foreground hover:text-foreground text-sm"
                >
                  <GraduationCap className="size-4" />
                  Qo'llanma
                </Button>
              </Link>
            </div>

            {/* Live Visualizer Demo */}
            <div className="pt-6">
              <div className="mb-2 text-xs text-muted-foreground flex items-center justify-center gap-1.5">
                <Sparkles className="size-3.5 text-amber-500" />
                <span>Jonli interaktiv namoyish:</span>
              </div>
              <PianoVisualizerDemo />
            </div>

            {/* Quick Interactive Sound Tester */}
            <div className="mx-auto max-w-md pt-6">
              <p className="mb-3 text-xs text-muted-foreground flex items-center justify-center gap-1.5">
                <Volume2 className="size-3.5 text-amber-500" />
                <span>Tezkor tovush tekshiruvi (klavishlarni bosing):</span>
              </p>

              <div className="relative mx-auto h-32 w-full max-w-[380px] rounded-b-md rounded-t-sm border border-border bg-card p-1 shadow-xl">
                {/* Red felt strip */}
                <div className="h-2 w-full bg-gradient-to-r from-red-950 via-red-700 to-red-950 rounded-t-sm shadow-inner" />

                {/* Keys container */}
                <div className="relative h-[110px] flex">
                  {/* White keys */}
                  {DEMO_KEYS.filter((k) => !k.black).map((k) => {
                    const isPressed = activeMidi === k.midi;
                    return (
                      <button
                        key={k.midi}
                        onClick={() => playDemoNote(k.midi)}
                        className={`key-white flex-1 relative flex flex-col justify-end items-center pb-2.5 select-none ${
                          isPressed ? "key-active" : ""
                        }`}
                      >
                        <span className="font-mono text-xs font-black text-neutral-800">
                          {k.name}
                        </span>
                      </button>
                    );
                  })}

                  {/* Black keys overlay */}
                  <div className="absolute inset-0 pointer-events-none">
                    {DEMO_KEYS.filter((k) => k.black).map((k) => {
                      const whiteIndex = DEMO_KEYS.filter((w) => !w.black).findIndex(
                        (w) => w.midi > k.midi,
                      );
                      const isPressed = activeMidi === k.midi;
                      const leftPercent = (whiteIndex / 8) * 100;
                      return (
                        <button
                          key={k.midi}
                          onClick={() => playDemoNote(k.midi)}
                          className={`key-black pointer-events-auto absolute top-0 w-[9%] h-[60%] -translate-x-1/2 flex flex-col justify-end items-center pb-2 select-none ${
                            isPressed ? "key-active" : ""
                          }`}
                          style={{ left: `${leftPercent}%` }}
                        >
                          <span className="font-mono text-xs font-black text-white">{k.char}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Featured Songs Swiper (Carousel) Section */}
        <section className="py-20 border-b border-border bg-secondary/30">
          <div className="mx-auto max-w-7xl px-4 sm:px-6">
            <div className="flex flex-col sm:flex-row sm:items-end justify-between mb-8 gap-4">
              <div>
                <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Interaktiv Svipper
                </span>
                <h2 className="font-serif text-2xl font-bold text-foreground sm:text-3xl mt-1">
                  Mashhur kuylar karuseli
                </h2>
              </div>
              <Link
                to="/songs"
                className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
              >
                Barcha {SONGS.length} ta notani ko'rish <ArrowRight className="size-3.5" />
              </Link>
            </div>

            {/* Embla Swiper Carousel */}
            <div className="relative px-2 sm:px-8">
              <Carousel opts={{ align: "start", loop: true }} className="w-full">
                <CarouselContent className="-ml-3 sm:-ml-4">
                  {SONGS.map((song) => (
                    <CarouselItem
                      key={song.id}
                      className="pl-3 sm:pl-4 basis-full sm:basis-1/2 md:basis-1/3 lg:basis-1/4"
                    >
                      <div className="rounded-xl border border-border bg-card p-5 h-full flex flex-col justify-between hover:border-foreground/30 transition-all duration-200 hover:-translate-y-1 shadow-sm">
                        <div className="space-y-2">
                          <div className="flex items-center justify-between">
                            <span
                              className={`rounded px-2 py-0.5 text-[10px] uppercase font-bold tracking-wider ${
                                song.difficulty === "Easy"
                                  ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20"
                                  : song.difficulty === "Medium"
                                    ? "bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20"
                                    : "bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20"
                              }`}
                            >
                              {song.difficulty}
                            </span>
                            <span className="text-[10px] text-muted-foreground font-mono">
                              {song.bpm} BPM
                            </span>
                          </div>

                          <h3 className="font-serif text-lg font-bold text-foreground leading-snug">
                            {song.title}
                          </h3>
                          <p className="text-xs text-muted-foreground">{song.artist}</p>

                          <div className="mt-3 rounded-lg bg-secondary/80 p-2.5 font-mono text-[11px] text-muted-foreground truncate border border-border/50">
                            {song.sheet}
                          </div>
                        </div>

                        <div className="pt-4 mt-3 border-t border-border/40">
                          <Link to="/play" search={{ song: song.id }} className="block">
                            <Button
                              size="sm"
                              className="w-full gap-1.5 bg-foreground text-background hover:opacity-90 text-xs font-medium"
                            >
                              <Play className="size-3 fill-current" />
                              Chalish
                            </Button>
                          </Link>
                        </div>
                      </div>
                    </CarouselItem>
                  ))}
                </CarouselContent>
                <CarouselPrevious className="hidden sm:flex -left-4 bg-card border-border hover:bg-secondary text-foreground" />
                <CarouselNext className="hidden sm:flex -right-4 bg-card border-border hover:bg-secondary text-foreground" />
              </Carousel>
            </div>
          </div>
        </section>

        {/* Features Section */}
        <section className="py-20 border-b border-border bg-background">
          <div className="mx-auto max-w-7xl px-4 sm:px-6">
            <div className="text-center space-y-3 mb-14">
              <h2 className="font-serif text-2xl font-bold text-foreground sm:text-4xl">
                Qotmaydigan, toza va mukammal arxitektura
              </h2>
              <p className="text-sm text-muted-foreground max-w-xl mx-auto">
                Barcha imkoniyatlar musiqachilar va boshlang'ich o'rganuvchilar uchun qulaylik
                yaratish maqsadida yaratilgan.
              </p>
            </div>

            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
              <div className="rounded-xl border border-border bg-card p-6 space-y-3">
                <div className="grid size-10 place-items-center rounded-lg bg-secondary text-amber-500">
                  <Volume2 className="size-5" />
                </div>
                <h3 className="font-serif text-lg font-bold text-foreground">
                  Konsert royali ovozi
                </h3>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Har bir nota haqiqiy akustik royaldan yozib olingan yuqori sifatli audio
                  namunalardan iborat. Ovoz kechikishisiz (low-latency) jaranglaydi.
                </p>
              </div>

              <div className="rounded-xl border border-border bg-card p-6 space-y-3">
                <div className="grid size-10 place-items-center rounded-lg bg-secondary text-amber-500">
                  <Sparkles className="size-5" />
                </div>
                <h3 className="font-serif text-lg font-bold text-foreground">
                  Interaktiv mashq rejimi
                </h3>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Notalarni bosqichma-bosqich o'rganing. Tizim siz to'g'ri klavishni bosguningizcha
                  kutadi va keyingi taktga silliq o'tadi.
                </p>
              </div>

              <div className="rounded-xl border border-border bg-card p-6 space-y-3">
                <div className="grid size-10 place-items-center rounded-lg bg-secondary text-amber-500">
                  <Mic className="size-5" />
                </div>
                <h3 className="font-serif text-lg font-bold text-foreground">
                  Audio & MIDI yozib olish
                </h3>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  O'z ijrolaringizni to'g'ridan-to'g'ri brauzerda yozib oling, eshiting va standart
                  WAV audio yoki MIDI fayl ko'rinishida yuklab oling.
                </p>
              </div>

              <div className="rounded-xl border border-border bg-card p-6 space-y-3">
                <div className="grid size-10 place-items-center rounded-lg bg-secondary text-amber-500">
                  <Usb className="size-5" />
                </div>
                <h3 className="font-serif text-lg font-bold text-foreground">
                  Web MIDI integratsiyasi
                </h3>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Elektron sintezator yoki MIDI klaviaturangizni USB orqali ulang. Tizim bosish
                  tezligini (velocity) to'liq sezadi.
                </p>
              </div>

              <div className="rounded-xl border border-border bg-card p-6 space-y-3">
                <div className="grid size-10 place-items-center rounded-lg bg-secondary text-amber-500">
                  <BookOpen className="size-5" />
                </div>
                <h3 className="font-serif text-lg font-bold text-foreground">
                  Boy notalar kutubxonasi
                </h3>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Bethoven, Motsart, mashhur kinofilmlar va zamonaviy qo'shiqlar notalari mavjud.
                  O'z notalaringizni ham kiritishingiz mumkin.
                </p>
              </div>

              <div className="rounded-xl border border-border bg-card p-6 space-y-3">
                <div className="grid size-10 place-items-center rounded-lg bg-secondary text-amber-500">
                  <ShieldCheck className="size-5" />
                </div>
                <h3 className="font-serif text-lg font-bold text-foreground">
                  Sof va chalg'ituvchi unsurlarsiz
                </h3>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Hech qanday keraksiz RGB ranglar, xalaqit beruvchi reklamalar yoki
                  sekinlashtiruvchi skriptlar yo'q. Faqat musiqa va siz.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Quick Instructions / How to play */}
        <section className="py-20 bg-secondary/20">
          <div className="mx-auto max-w-4xl px-4 sm:px-6 text-center space-y-10">
            <div className="space-y-3">
              <h2 className="font-serif text-2xl font-bold text-foreground sm:text-3xl">
                3 ta oddiy qadamda boshlang
              </h2>
              <p className="text-xs sm:text-sm text-muted-foreground max-w-md mx-auto">
                Hech qanday sozlash shart emas, brauzeringizda pianino darhol tayyor bo'ladi.
              </p>
            </div>

            <div className="grid grid-cols-1 gap-6 sm:grid-cols-3 text-left">
              <div className="rounded-xl border border-border bg-card p-5 space-y-2.5 shadow-sm">
                <span className="font-mono text-xs font-bold text-amber-500">01</span>
                <h3 className="font-serif text-base font-bold text-foreground">Studiyani oching</h3>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  "Pianinoni ochish" tugmasini bosing va 88 klavishli to'liq royal interfeysiga
                  o'ting.
                </p>
              </div>

              <div className="rounded-xl border border-border bg-card p-5 space-y-2.5 shadow-sm">
                <span className="font-mono text-xs font-bold text-amber-500">02</span>
                <h3 className="font-serif text-base font-bold text-foreground">
                  Klaviaturadan chaling
                </h3>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Oddiy harflarni bosing. Qora klavishlar uchun Shift, pedal uchun esa Space
                  tugmasidan foydalaning.
                </p>
              </div>

              <div className="rounded-xl border border-border bg-card p-5 space-y-2.5 shadow-sm">
                <span className="font-mono text-xs font-bold text-amber-500">03</span>
                <h3 className="font-serif text-base font-bold text-foreground">
                  Kuy tanlab mashq qiling
                </h3>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Kutubxonadan mashhur kuyni tanlang va yongan klavishlarni bosib o'rganing.
                </p>
              </div>
            </div>

            <div className="pt-4">
              <Link to="/play">
                <Button className="h-11 px-8 gap-2 bg-foreground text-background hover:opacity-90 font-medium text-sm shadow-md">
                  Hoziroq chalib ko'rish
                  <ArrowRight className="size-4" />
                </Button>
              </Link>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
