import { createFileRoute, Link } from "@tanstack/react-router";
import { Compass, Eye, FlaskConical, Info, Lightbulb, Accessibility, Rocket, Target } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Reveal } from "@/components/site/Reveal";
import valley from "@/assets/valley.jpg";

export const Route = createFileRoute("/sobre")({
  head: () => ({
    meta: [
      { title: "Sobre Nós — Mars Estate" },
      { name: "description", content: "Conheça a história, a missão e os princípios do Mars Estate, uma experiência digital conceitual sobre Marte." },
      { property: "og:title", content: "Sobre Nós — Mars Estate" },
      { property: "og:description", content: "Curiosidade científica, transparência e imaginação para explorar Marte de uma nova perspectiva." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Sobre,
});

const blocos = [
  { icon: Target, t: "Missão", d: "Transformar a curiosidade sobre Marte em uma experiência digital interativa, acessível e educativa." },
  { icon: Eye, t: "Visão", d: "Inspirar mais pessoas a conhecerem a geografia marciana e imaginarem possibilidades futuras de exploração espacial." },
  { icon: Compass, t: "Propósito", d: "Aproximar ciência, tecnologia e imaginação em uma experiência interessante, compreensível e transparente." },
];

const principios = [
  { icon: FlaskConical, t: "Curiosidade científica", d: "Valorizamos o conhecimento e a exploração responsável." },
  { icon: Info, t: "Transparência", d: "Distinguimos fatos científicos de elementos fictícios da experiência." },
  { icon: Lightbulb, t: "Inovação", d: "Utilizamos tecnologia para criar maneiras interessantes de explorar informações." },
  { icon: Accessibility, t: "Acessibilidade", d: "Buscamos uma experiência intuitiva, responsiva e fácil de utilizar." },
];

const marcos = [
  { ano: "1965", data: "14–15 de julho de 1965", t: "Mariner 4", d: "Primeiro sobrevoo bem-sucedido de Marte, com as primeiras imagens de perto de outro planeta.", url: "https://science.nasa.gov/mission/mariner-4/" },
  { ano: "1976", data: "20 de julho de 1976", t: "Viking 1", d: "Primeiro pouso bem-sucedido dos EUA na superfície marciana, em Chryse Planitia.", url: "https://science.nasa.gov/mission/viking-1/" },
  { ano: "2012", data: "6 de agosto de 2012 (UTC)", t: "Curiosity", d: "O rover pousou na cratera Gale para investigar se Marte já teve condições favoráveis à vida microbiana.", url: "https://science.nasa.gov/mission/msl-curiosity/" },
  { ano: "2021", data: "18 de fevereiro de 2021", t: "Perseverance", d: "O rover pousou na cratera Jezero para buscar sinais de vida antiga e coletar amostras.", url: "https://science.nasa.gov/mission/mars-2020-perseverance/" },
];

function Sobre() {
  return (
    <>
      <section className="relative isolate flex min-h-[85vh] items-end overflow-hidden">
        <img src={valley} alt="Cânion marciano em camadas (ilustração conceitual)" width={1280} height={896} className="absolute inset-0 -z-10 h-full w-full object-cover" />
        <div className="absolute inset-0 -z-10 bg-gradient-to-t from-background via-background/70 to-background/20" />
        <div className="mx-auto w-full max-w-7xl px-5 pb-16 pt-32">
          <p className="eyebrow animate-rise">Nossa história</p>
          <h1 className="mt-3 max-w-3xl animate-rise text-4xl font-bold md:text-6xl">O próximo horizonte começa com a curiosidade.</h1>
          <p className="mt-5 max-w-2xl text-muted-foreground md:text-lg">
            O Mars Estate nasceu de uma pergunta: como seria explorar um mundo além da Terra? Somos uma
            experiência digital conceitual que combina exploração espacial, geografia marciana e imaginação
            para permitir que as pessoas descubram Marte de uma nova perspectiva.
          </p>
          <Button asChild variant="hero" size="lg" className="mt-8"><a href="#visao">Explore nossa visão</a></Button>
        </div>
      </section>

      <section id="visao" className="mx-auto max-w-7xl scroll-mt-24 px-5 py-20">
        <Reveal>
          <p className="eyebrow">Missão, visão e propósito</p>
          <div className="mt-8 grid gap-10 md:grid-cols-3">
            {blocos.map(({ icon: Icon, t, d }) => (
              <div key={t} className="border-t border-primary/50 pt-6">
                <Icon className="h-6 w-6 text-primary" aria-hidden />
                <h2 className="mt-4 text-2xl font-semibold">{t}</h2>
                <p className="mt-2 leading-relaxed text-muted-foreground">{d}</p>
              </div>
            ))}
          </div>
        </Reveal>
      </section>

      <section className="mx-auto max-w-7xl px-5 py-16">
        <Reveal>
          <p className="eyebrow">Nossos princípios</p>
          <h2 className="mt-3 text-3xl font-bold md:text-4xl">O que orienta cada detalhe</h2>
          <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {principios.map(({ icon: Icon, t, d }) => (
              <article key={t} className="rounded-xl border border-border bg-card p-6 transition-all duration-300 hover:-translate-y-1 hover:border-primary/60 motion-reduce:transition-none motion-reduce:hover:translate-y-0">
                <Icon className="h-6 w-6 text-primary" aria-hidden />
                <h3 className="mt-4 text-lg font-semibold">{t}</h3>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{d}</p>
              </article>
            ))}
          </div>
        </Reveal>
      </section>

      <section className="mx-auto max-w-7xl px-5 py-20">
        <Reveal>
          <p className="eyebrow">História real da exploração</p>
          <h2 className="mt-3 text-3xl font-bold md:text-4xl">Marcos da exploração de Marte</h2>
          <p className="mt-4 max-w-2xl text-sm text-muted-foreground">
            Estes marcos pertencem à história real da exploração espacial, conduzida pela NASA. Não são
            atividades realizadas pelo Mars Estate.
          </p>
          <ol className="relative mt-12 space-y-10 border-l border-primary/40 pl-8 md:ml-4">
            {marcos.map((m) => (
              <li key={m.t} className="relative">
                <span className="absolute -left-[2.55rem] top-1 flex h-5 w-5 items-center justify-center rounded-full border border-primary bg-background" aria-hidden>
                  <Rocket className="h-3 w-3 text-primary" />
                </span>
                <p className="text-sm font-semibold text-primary"><time>{m.data}</time></p>
                <h3 className="mt-1 text-xl font-semibold">{m.t}</h3>
                <p className="mt-1 max-w-2xl text-muted-foreground">{m.d}</p>
                <a href={m.url} target="_blank" rel="noreferrer" className="mt-2 inline-block text-sm underline underline-offset-4 hover:text-primary">
                  Fonte: NASA<span className="sr-only"> (abre em nova aba)</span>
                </a>
              </li>
            ))}
          </ol>
        </Reveal>
      </section>

      <section className="mx-auto max-w-7xl px-5 py-20">
        <Reveal>
          <div className="rounded-2xl border border-border bg-card p-8 text-center md:p-14">
            <h2 className="mx-auto max-w-2xl text-3xl font-bold md:text-4xl">Marte está mais perto da sua imaginação.</h2>
            <p className="mx-auto mt-4 max-w-xl text-muted-foreground">
              Explore regiões, descubra características do planeta e conheça nossa simulação conceitual de terrenos marcianos.
            </p>
            <div className="mt-8 flex flex-wrap justify-center gap-3">
              <Button asChild variant="hero" size="lg"><Link to="/terrenos">Explorar Terrenos</Link></Button>
              <Button asChild variant="outline" size="lg"><Link to="/como-funciona">Como Funciona</Link></Button>
            </div>
          </div>
        </Reveal>
      </section>

      <aside aria-label="Aviso de transparência" className="mx-auto max-w-7xl px-5 pb-24">
        <div className="flex gap-3 rounded-lg border border-border p-5 text-sm text-muted-foreground">
          <Info className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden />
          <p>
            O Mars Estate é um projeto conceitual e demonstrativo. Os terrenos, ofertas e preços apresentados
            são fictícios. Não realizamos vendas ou reservas de propriedades em Marte e não afirmamos possuir
            vínculo oficial com a NASA ou outras agências espaciais.
          </p>
        </div>
      </aside>
    </>
  );
}
