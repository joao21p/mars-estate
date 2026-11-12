// Curated public references. The model selects IDs, never URLs.
export const fontesMarte = [
  {
    id: "mars-facts",
    titulo: "NASA — Fatos sobre Marte",
    url: "https://science.nasa.gov/mars/facts/",
    contexto:
      "Marte é um planeta rochoso, frio e desértico. Tem atmosfera fina, principalmente de dióxido de carbono, com nuvens e tempestades de poeira. Um dia solar dura cerca de 24,6 horas terrestres. Há evidências de rios e lagos no passado e gelo de água hoje. Evidência de água não comprova vida. A cor avermelhada vem da oxidação de minerais de ferro. Suas luas são Phobos e Deimos. Olympus Mons é um grande vulcão e Valles Marineris um vasto sistema de cânions. Marte tem estações devido à inclinação de seu eixo. Não tem um campo magnético global como o terrestre.",
  },
  {
    id: "humans-mars",
    titulo: "NASA — Exploração humana de Marte",
    url: "https://www.nasa.gov/humans-in-space/humans-to-mars/",
    contexto:
      "A exploração humana de Marte exige tecnologias de suporte à vida, proteção e transporte. A atmosfera marciana não é respirável por humanos. Habitats, colônias e serviços do catálogo Mars Estate são ficção; não comprovam habitabilidade nem ocupação real.",
  },
] as const;
export type FonteMarte = Pick<(typeof fontesMarte)[number], "id" | "titulo" | "url">;
