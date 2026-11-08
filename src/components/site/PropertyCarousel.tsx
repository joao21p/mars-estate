import type { Terreno } from '@/data/terrenos';
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from '@/components/ui/carousel';
import { TerrenoCard } from './TerrenoCard';

export function PropertyCarousel({ terrenos }: { terrenos: Terreno[] }) {
  return (
    <Carousel opts={{ align: 'start', loop: false }} aria-label="Terrenos selecionados" className="pb-14">
      <CarouselContent>
        {terrenos.map((t, i) => (
          <CarouselItem key={t.id} className="basis-[88%] sm:basis-[64%] lg:basis-[42%]" aria-label={`${i + 1} de ${terrenos.length}`}>
            <TerrenoCard terreno={t} />
          </CarouselItem>
        ))}
      </CarouselContent>
      <CarouselPrevious className="bottom-0 left-auto right-12 top-auto translate-y-0" aria-label="Terreno anterior" title="Terreno anterior" />
      <CarouselNext className="bottom-0 right-0 top-auto translate-y-0" aria-label="Próximo terreno" title="Próximo terreno" />
    </Carousel>
  );
}