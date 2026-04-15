import { useRef, useState } from 'react'
import { Swiper, SwiperSlide } from 'swiper/react'
import { EffectCards } from 'swiper/modules'
import 'swiper/css'
import 'swiper/css/effect-cards'
import { Polaroid } from './Polaroid'

export function PhotoPile({ photos }) {
  const swiperRef = useRef(null);
  const [isBeginning, setIsBeginning] = useState(true);
  const [isEnd, setIsEnd] = useState(photos.length <= 1);

  const updateNav = (swiper) => {
    setIsBeginning(swiper.isBeginning);
    setIsEnd(swiper.isEnd);
  };

  return (
    <div className="w-full max-w-[16rem] md:max-w-sm mx-auto photo-pile-wrap">
      <Swiper
        effect={'cards'}
        grabCursor={true}
        modules={[EffectCards]}
        className="w-full"
        onSwiper={(swiper) => { swiperRef.current = swiper; updateNav(swiper); }}
        onSlideChange={updateNav}
      >
        {photos.map((photo, index) => (
          <SwiperSlide key={index}>
            <Polaroid photo={photo} className="" />
          </SwiperSlide>
        ))}
      </Swiper>
      <div className="photo-pile-nav">
        <button className={`photo-pile-arrow ${isBeginning ? 'photo-pile-arrow-disabled' : ''}`} onClick={() => swiperRef.current?.slidePrev()} disabled={isBeginning} aria-label="Previous photo">
          👈
        </button>
        <button className={`photo-pile-arrow ${isEnd ? 'photo-pile-arrow-disabled' : ''}`} onClick={() => swiperRef.current?.slideNext()} disabled={isEnd} aria-label="Next photo">
          👉
        </button>
      </div>
    </div>
  )
}
