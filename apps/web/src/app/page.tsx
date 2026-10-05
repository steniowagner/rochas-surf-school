import { Button } from "@/components/ui/button";
import { Chip } from "@/components/ui/chip";

// Temporary preview of the design system until the real screens exist.
const brandColors = [
  { name: "Sol", className: "bg-sun" },
  { name: "Uva", className: "bg-grape" },
  { name: "Lagoa", className: "bg-lagoon" },
  { name: "Areia escura", className: "bg-tan" },
  { name: "Céu", className: "bg-sky" },
];

export default function Home() {
  return (
    <main className="mx-auto flex w-full max-w-md flex-col gap-[22px] px-5 py-10">
      <header>
        <p className="ds-text-section-label text-ink-2">Rocha&apos;s Surf School</p>
        <h1 className="ds-text-screen-title mt-1">Sistema de design</h1>
        <p className="ds-text-body mt-2 text-ink-2">
          Tokens partilhados entre a web e a app móvel.
        </p>
      </header>

      <section className="flex flex-col gap-3">
        <h2 className="ds-text-section-label text-ink-2">Cor</h2>
        <div className="grid grid-cols-5 gap-2">
          {brandColors.map((color) => (
            <div key={color.name} className="flex flex-col items-center gap-1.5">
              <div className={`h-12 w-full rounded-control ${color.className}`} />
              <span className="ds-text-list-subtitle text-center text-ink-2">{color.name}</span>
            </div>
          ))}
        </div>
      </section>

      <section className="flex flex-col gap-2.5">
        <h2 className="ds-text-section-label text-ink-2">Botões</h2>
        <Button>Primário</Button>
        <Button variant="dark">Escuro</Button>
        <Button variant="outline">Contorno</Button>
        <Button variant="subtle">Discreto</Button>
        <Button variant="danger">Perigo</Button>
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="ds-text-section-label text-ink-2">Chips</h2>
        <div className="flex flex-wrap gap-2">
          <Chip tone="surf">Surf</Chip>
          <Chip tone="skate">Skate</Chip>
          <Chip tone="info">Iniciante</Chip>
          <Chip tone="sun">Já a seguir</Chip>
          <Chip tone="warn">Pendente</Chip>
          <Chip tone="ok">Aprovado</Chip>
          <Chip tone="bad">Cancelada</Chip>
        </div>
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="ds-text-section-label text-ink-2">Próxima aula</h2>
        <article className="rounded-card bg-grape p-3.5 text-on-color shadow-card">
          <div className="flex gap-2">
            <Chip tone="surf">Surf</Chip>
            <Chip tone="onHighlight">Iniciante</Chip>
          </div>
          <p className="ds-text-lesson-time mt-2.5">09:00 – 10:30</p>
          <p className="ds-text-list-subtitle mt-2 opacity-85">Praia do Guincho · 5/8 vagas</p>
        </article>
      </section>
    </main>
  );
}
