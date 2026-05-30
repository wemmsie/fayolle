import { useRef, useMemo, useState } from 'react'
import { Swiper, SwiperSlide } from 'swiper/react'
import { EffectCards } from 'swiper/modules'
import 'swiper/css'
import 'swiper/css/effect-cards'

// Deterministic "random" rotation per image index — stable across renders
function pseudoRot(i) {
  const s = Math.sin(i * 127.1 + 311.7) * 43758.5453;
  return (s - Math.floor(s) - 0.5) * 9; // −4.5° to +4.5°
}

export function OutfitPile({ images }) {
  const swiperRef = useRef(null);
  const rotations = useMemo(() => images.map((_, i) => pseudoRot(i)), []);
  const [isBeginning, setIsBeginning] = useState(true);
  const [isEnd, setIsEnd] = useState(false);

  const syncEdges = (swiper) => {
    setIsBeginning(swiper.isBeginning);
    setIsEnd(swiper.isEnd);
  };

  return (
    <div className='outfit-pile-wrap'>
      <Swiper
        effect='cards'
        grabCursor={true}
        modules={[EffectCards]}
        cardsEffect={{
          perSlideRotate: 3,
          perSlideOffset: 7,
          slideShadows: false,
        }}
        onSwiper={(swiper) => { swiperRef.current = swiper; syncEdges(swiper); }}
        onSlideChange={syncEdges}
        className='outfit-pile-swiper'
      >
        {images.map((img, i) => (
          <SwiperSlide key={i} className='overflow-visible!'>
            <div className='outfit-print' style={{ transform: `rotate(${rotations[i]}deg)` }}>
              <img src={img} alt='' />
            </div>
          </SwiperSlide>
        ))}
      </Swiper>
      <div className='outfit-pile-nav'>
        <button className='outfit-arrow' onClick={() => swiperRef.current?.slidePrev()} aria-label='Previous' disabled={isBeginning}>👈</button>
        <button className='outfit-arrow' onClick={() => swiperRef.current?.slideNext()} aria-label='Next' disabled={isEnd}>👉</button>
      </div>
    </div>
  );
}
