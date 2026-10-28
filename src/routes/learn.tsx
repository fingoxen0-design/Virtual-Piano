import { createFileRoute, Link } from "@tanstack/react-router";
import { GraduationCap, Keyboard, Footprints, ArrowRight } from "lucide-react";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/learn")({
  head: () => ({
    meta: [
      { title: "Grand — Pianino O'rganish Qo'llanmasi" },
      {
        name: "description",
        content:
          "Virtual pianinoda kompyuter klaviaturasi bilan chalish, notatsiya qoidalari, akkordlar va MIDI ulash bo'yicha qo'llanma.",
      },
    ],
  }),
  component: LearnPage,
});

function LearnPage() {
  return (
    <div className="flex min-h-screen flex-col bg-background text-foreground transition-colors duration-200 antialiased">
      <Navbar />

      <main className="flex-1 py-12 px-4 sm:px-6">
        <div className="mx-auto max-w-4xl space-y-12">
          {/* Header */}
          <div className="space-y-3 text-center sm:text-left">
            <div className="inline-flex items-center gap-2 rounded-full border border-border bg-secondary px-3 py-1 text-xs text-muted-foreground shadow-sm">
              <GraduationCap className="size-3.5 text-amber-500" />
              <span>Bosqichma-bosqich qo'llanma</span>
            </div>
            <h1 className="font-serif text-3xl font-bold tracking-tight sm:text-5xl text-foreground">
              Pianinoda chalishni o'rganing
            </h1>
            <p className="text-base text-muted-foreground max-w-2xl leading-relaxed">
              Hech qanday maxsus musiqiy ma'lumot yoki qimmatbaho uskunalar shart emas. Oddiy
              noutbuk yoki kompyuter klaviaturangiz yordamida sevimli kuylaringizni ijro eting.
            </p>
          </div>

          {/* Quick Start Cards */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="rounded-xl border border-border bg-card p-6 space-y-3 shadow-sm">
              <div className="grid size-9 place-items-center rounded-lg bg-secondary text-amber-500 border border-border">
                <Keyboard className="size-5" />
              </div>
              <h3 className="font-serif text-lg font-bold text-card-foreground">
                Kompyuter klaviaturasi
              </h3>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Tugmalar chapdan o'ngga qarab pastdan yuqoriga joylashgan. Raqamlar{" "}
                <kbd className="rounded bg-secondary px-1 py-0.5 font-mono text-foreground border border-border">
                  1-0
                </kbd>
                , harflar{" "}
                <kbd className="rounded bg-secondary px-1 py-0.5 font-mono text-foreground border border-border">
                  q-p
                </kbd>
                ,{" "}
                <kbd className="rounded bg-secondary px-1 py-0.5 font-mono text-foreground border border-border">
                  a-l
                </kbd>{" "}
                va{" "}
                <kbd className="rounded bg-secondary px-1 py-0.5 font-mono text-foreground border border-border">
                  z-m
                </kbd>{" "}
                oq klavishlarga mos keladi.
              </p>
            </div>

            <div className="rounded-xl border border-border bg-card p-6 space-y-3 shadow-sm">
              <div className="grid size-9 place-items-center rounded-lg bg-secondary text-amber-500 border border-border">
                <Footprints className="size-5" />
              </div>
              <h3 className="font-serif text-lg font-bold text-card-foreground">
                Sustain pedali (Space)
              </h3>
              <p className="text-xs text-muted-foreground leading-relaxed">
                <kbd className="rounded bg-secondary px-1.5 py-0.5 font-mono text-foreground border border-border">
                  Space
                </kbd>{" "}
                tugmasini bosib tursangiz yoki faollashtirsangiz, notalar barmoqlaringizni
                olganingizdan keyin ham tabiiy jaranglab turadi.
              </p>
            </div>
          </div>

          {/* Section 1: Keyboard Mapping */}
          <div className="space-y-4 rounded-xl border border-border bg-card p-6 sm:p-8 shadow-sm">
            <div className="flex items-center gap-2.5">
              <span className="flex size-6 items-center justify-center rounded-full bg-secondary text-xs font-bold text-amber-500 border border-border">
                1
              </span>
              <h2 className="font-serif text-xl font-bold text-card-foreground">
                Klaviaturani to'g'ri boshqarish
              </h2>
            </div>

            <p className="text-sm text-muted-foreground leading-relaxed">
              Virtual Piano tizimida jami 61 ta asosiy chalinuvchi nota mavjud (C2 dan C7 gacha).
            </p>

            <div className="overflow-x-auto rounded-lg border border-border bg-muted/40 p-4 font-mono text-xs text-foreground">
              <div className="space-y-3 min-w-[500px]">
                <div className="flex items-center gap-3">
                  <span className="w-24 text-muted-foreground font-sans text-xs">Oktava 2:</span>
                  <div className="flex gap-1.5">
                    {["1", "2", "3", "4", "5", "6", "7"].map((k) => (
                      <span
                        key={k}
                        className="flex size-7 items-center justify-center rounded border border-border bg-card font-bold shadow-xs"
                      >
                        {k}
                      </span>
                    ))}
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className="w-24 text-muted-foreground font-sans text-xs">Oktava 3:</span>
                  <div className="flex gap-1.5">
                    {["8", "9", "0", "q", "w", "e", "r"].map((k) => (
                      <span
                        key={k}
                        className="flex size-7 items-center justify-center rounded border border-border bg-card font-bold shadow-xs"
                      >
                        {k}
                      </span>
                    ))}
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className="w-24 text-muted-foreground font-sans text-xs">
                    Oktava 4 (Markaz):
                  </span>
                  <div className="flex gap-1.5">
                    {["t", "y", "u", "i", "o", "p", "a"].map((k) => (
                      <span
                        key={k}
                        className={`flex size-7 items-center justify-center rounded border font-bold shadow-xs ${
                          k === "t"
                            ? "border-amber-500 bg-amber-500/10 text-amber-600 dark:text-amber-400 font-extrabold"
                            : "border-border bg-card"
                        }`}
                      >
                        {k}
                      </span>
                    ))}
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className="w-24 text-muted-foreground font-sans text-xs">
                    Qora klavishlar:
                  </span>
                  <span className="text-muted-foreground font-sans text-xs">
                    <kbd className="rounded border border-border bg-secondary px-1.5 py-0.5 text-foreground">
                      Shift
                    </kbd>{" "}
                    tugmasini bosib turgan holda harflarni bosing (masalan:{" "}
                    <kbd className="rounded border border-border bg-secondary px-1 py-0.5 text-foreground">
                      Shift + t
                    </kbd>{" "}
                    = C#4).
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Section 2: Notation format */}
          <div className="space-y-4 rounded-xl border border-border bg-card p-6 sm:p-8 shadow-sm">
            <div className="flex items-center gap-2.5">
              <span className="flex size-6 items-center justify-center rounded-full bg-secondary text-xs font-bold text-amber-500 border border-border">
                2
              </span>
              <h2 className="font-serif text-xl font-bold text-card-foreground">
                Notatsiya qoidalari va belgilar
              </h2>
            </div>

            <p className="text-sm text-muted-foreground leading-relaxed">
              Saytdagi barcha qo'shiqlar o'rganish oson bo'lgan Virtual Piano formatida yozilgan:
            </p>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 text-xs">
              <div className="rounded-lg border border-border bg-muted/40 p-3.5 space-y-1.5">
                <div className="font-mono font-bold text-amber-500 text-sm">
                  Oddiy harflar: u i o p
                </div>
                <p className="text-muted-foreground">
                  Har bir notani ketma-ket birin-ketin chaling.
                </p>
              </div>

              <div className="rounded-lg border border-border bg-muted/40 p-3.5 space-y-1.5">
                <div className="font-mono font-bold text-amber-500 text-sm">
                  Akkordlar: [eu] yoki [tuy]
                </div>
                <p className="text-muted-foreground">
                  Qavs ichidagi barcha harflarni bir vaqtda bosing.
                </p>
              </div>

              <div className="rounded-lg border border-border bg-muted/40 p-3.5 space-y-1.5">
                <div className="font-mono font-bold text-amber-500 text-sm">
                  Pauzalar: | yoki bo'shliq
                </div>
                <p className="text-muted-foreground">
                  Vertikal chiziq yoki bo'shliqlar takt orasidagi to'xtalishni bildiradi.
                </p>
              </div>

              <div className="rounded-lg border border-border bg-muted/40 p-3.5 space-y-1.5">
                <div className="font-mono font-bold text-amber-500 text-sm">
                  Bosh harflar: E Y I O P
                </div>
                <p className="text-muted-foreground">
                  Shift tugmasi bilan chalinadigan qora klavishlar (diez/bemol).
                </p>
              </div>
            </div>
          </div>

          {/* Section 3: Web MIDI */}
          <div className="space-y-4 rounded-xl border border-border bg-card p-6 sm:p-8 shadow-sm">
            <div className="flex items-center gap-2.5">
              <span className="flex size-6 items-center justify-center rounded-full bg-secondary text-xs font-bold text-amber-500 border border-border">
                3
              </span>
              <h2 className="font-serif text-xl font-bold text-card-foreground">
                MIDI klaviatura va sintezatorni ulash
              </h2>
            </div>

            <p className="text-sm text-muted-foreground leading-relaxed">
              Agar sizda elektron pianino yoki USB-MIDI klaviatura bo'lsa, uni qo'shimcha
              drayverlarsiz to'g'ridan-to'g'ri ishlatishingiz mumkin:
            </p>

            <ul className="space-y-2 text-xs text-muted-foreground list-disc list-inside">
              <li>Klaviaturangizni USB kabeli orqali kompyuteringizga ulang.</li>
              <li>Brauzerda (Chrome, Edge yoki Opera) MIDI ruxsatini tasdiqlang.</li>
              <li>
                Sayt qurilmani avtomatik taniydi va klavishlarning bosilish tezligi (velocity) bilan
                birga ovozni ijro etadi.
              </li>
            </ul>
          </div>

          {/* Bottom CTA */}
          <div className="rounded-2xl border border-border bg-card p-8 text-center space-y-4 shadow-sm">
            <h2 className="font-serif text-2xl font-bold text-card-foreground sm:text-3xl">
              Chalishga tayyormisiz?
            </h2>
            <p className="text-xs sm:text-sm text-muted-foreground max-w-md mx-auto">
              Pianino studiyasini oching, o'zingizga yoqqan kuyni tanlang va interaktiv mashq rejimi
              bilan darhol chalib ko'ring.
            </p>
            <div className="pt-2">
              <Link to="/play">
                <Button className="gap-2 bg-foreground text-background hover:opacity-90 font-medium px-6">
                  Pianino studiyasini ochish
                  <ArrowRight className="size-4" />
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
