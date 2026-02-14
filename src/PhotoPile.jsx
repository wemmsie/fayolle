import { Swiper, SwiperSlide } from 'swiper/react'
import { EffectCards } from 'swiper/modules'
import 'swiper/css'
import 'swiper/css/effect-cards'
import { Polaroid } from './Polaroid'

export function PhotoPile({ photos }) {
  return (
    <div className="w-full max-w-sm mx-auto">
      <Swiper
        effect={'cards'}
        grabCursor={true}
        modules={[EffectCards]}
        className="w-full"
      >
        {photos.map((photo, index) => (
          <SwiperSlide key={index}>
            <Polaroid photo={photo} className="" />
          </SwiperSlide>
        ))}
      </Swiper>
    </div>
  )
}
