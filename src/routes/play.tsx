import { createFileRoute } from "@tanstack/react-router";
import { VirtualPiano } from "@/components/VirtualPiano";

export const Route = createFileRoute("/play")({
  head: () => ({
    meta: [
      { title: "Grand — Pianino Studiyasi" },
      {
        name: "description",
        content:
          "To'liq 88 klavishli akustik royal pianino. Notalar, mashq rejimi, audio va MIDI yozib olish.",
      },
    ],
  }),
  component: VirtualPiano,
});
