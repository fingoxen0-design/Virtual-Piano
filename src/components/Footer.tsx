import { Link } from "@tanstack/react-router";
import { Music2 } from "lucide-react";

export function Footer() {
  return (
    <footer className="border-t border-white/[0.06] bg-[#09090b] py-10 text-neutral-400">
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        <div className="grid grid-cols-1 gap-8 md:grid-cols-4">
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <span className="grid size-7 place-items-center rounded bg-neutral-800 text-neutral-200">
                <Music2 className="size-3.5 text-amber-400" />
              </span>
              <span className="font-serif text-lg font-bold text-neutral-100">Grand Piano</span>
            </div>
            <p className="text-xs text-neutral-400 leading-relaxed max-w-xs">
              Brauzeringizda to'liq 88 klavishli akustik royal tajribasi. Yuqori sifatli ovoz,
              notalar to'plami va qulay boshqaruv.
            </p>
          </div>

          <div>
            <h4 className="text-xs font-semibold uppercase tracking-wider text-neutral-300">
              Bo'limlar
            </h4>
            <ul className="mt-3 space-y-2 text-xs">
              <li>
                <Link to="/" className="hover:text-neutral-200 transition-colors">
                  Bosh sahifa
                </Link>
              </li>
              <li>
                <Link to="/play" className="hover:text-neutral-200 transition-colors">
                  Pianino studiyasi
                </Link>
              </li>
              <li>
                <Link to="/songs" className="hover:text-neutral-200 transition-colors">
                  Notalar katalogi
                </Link>
              </li>
              <li>
                <Link to="/learn" className="hover:text-neutral-200 transition-colors">
                  Qo'llanma va o'rganish
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <h4 className="text-xs font-semibold uppercase tracking-wider text-neutral-300">
              Imkoniyatlar
            </h4>
            <ul className="mt-3 space-y-2 text-xs text-neutral-400">
              <li>88 klavishli Concert Grand audio</li>
              <li>Web MIDI kontroller integratsiyasi</li>
              <li>WAV & MIDI yozib olish</li>
              <li>Virtual Piano harfiy notatsiyasi</li>
            </ul>
          </div>

          <div>
            <h4 className="text-xs font-semibold uppercase tracking-wider text-neutral-300">
              Tezkor tugmalar
            </h4>
            <div className="mt-3 space-y-1.5 text-xs text-neutral-400">
              <p>
                <kbd className="rounded border border-neutral-700 bg-neutral-800 px-1 py-0.5 font-mono text-[10px]">
                  1-m
                </kbd>{" "}
                Oq klavishlar
              </p>
              <p>
                <kbd className="rounded border border-neutral-700 bg-neutral-800 px-1 py-0.5 font-mono text-[10px]">
                  Shift
                </kbd>{" "}
                Qora klavishlar
              </p>
              <p>
                <kbd className="rounded border border-neutral-700 bg-neutral-800 px-1 py-0.5 font-mono text-[10px]">
                  Space
                </kbd>{" "}
                Sustain pedali
              </p>
            </div>
          </div>
        </div>

        <div className="mt-8 border-t border-white/[0.04] pt-6 flex flex-col sm:flex-row items-center justify-between text-[11px] text-neutral-400 gap-2">
          <span>
            &copy; {new Date().getFullYear()} Grand Virtual Piano. Barcha huquqlar himoyalangan.
          </span>
          <span>Sof, yengil va qotmaydigan veb-arxitektura.</span>
        </div>
      </div>
    </footer>
  );
}
